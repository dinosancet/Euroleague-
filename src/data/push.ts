/**
 * Push notifications for favourite teams.
 *
 * The normal way: the phone gets an Expo push token and tells the Hoopline
 * server which teams it follows (POST /v1/push/register). The server checks the
 * schedule every minute and pushes tip-off and final score through Expo's free
 * push service, even when the app is closed.
 *
 * When that is not possible (no Expo project ID yet, or Expo Go on Android),
 * the app falls back to local reminders: it schedules a "Gleich geht's los"
 * notification 15 minutes before each upcoming game of the favourite teams.
 * The final score needs the server, so it only comes with real push.
 */
import type { ApiGame, ApiPushData, ApiPushRegistration } from "@shared/api";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useSyncExternalStore } from "react";
import { AppState, Platform } from "react-native";

import { API_URL } from "@/data/api";
import { getPrefs, onPrefsChange, prefsReady } from "@/data/prefs";

export type PushStatus =
  /** Not checked yet. */
  | { kind: "checking" }
  /** Web or another platform without notifications. */
  | { kind: "unsupported" }
  /** The phone has not been asked for permission yet. */
  | { kind: "ask" }
  /** The user said no; only the phone's settings can change that. */
  | { kind: "denied" }
  /** Real push from the server is active. */
  | { kind: "push"; token: string }
  /** Only local tip-off reminders, with the reason real push is missing. */
  | { kind: "local"; reason: string; reminders: number }
  /** Teams or switches are off, so nothing is sent. */
  | { kind: "off" };

let status: PushStatus = { kind: "checking" };
const listeners = new Set<() => void>();
function setStatus(next: PushStatus) {
  status = next;
  listeners.forEach((l) => l());
}

export const usePushStatus = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
  );

const TIP_OFF_LEAD_MIN = 15;
const ANDROID_CHANNEL = "games";

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function projectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId
  );
}

/** Why real push cannot work here, or null if it can. */
function remoteBlocker(): string | null {
  if (Platform.OS === "android" && isExpoGo)
    return "Expo Go auf Android kann keine Push-Nachrichten empfangen. Dafür braucht es eine eigene App-Version (Development Build).";
  if (!projectId())
    return "Für echte Push-Nachrichten fehlt noch die Expo-Projekt-ID. Bis dahin erinnert dich die App lokal an den Spielbeginn.";
  return null;
}

/* ---------- foreground display and taps ---------- */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Opens the game when a Hoopline notification is tapped. */
export function useOpenGameFromNotification(ready: boolean) {
  useEffect(() => {
    if (!ready || Platform.OS === "web") return;
    const open = (response: Notifications.NotificationResponse | null) => {
      const data = response?.notification.request.content.data as
        | ApiPushData
        | undefined;
      if (typeof data?.gameCode !== "number") return;
      Notifications.clearLastNotificationResponse();
      router.push({
        pathname: "/game/[id]",
        params: { id: String(data.gameCode) },
      });
    };
    // A tap that opened the app from closed, then taps while it runs.
    open(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [ready]);
}

/* ---------- registration ---------- */

let running: Promise<void> | null = null;
let again = false;

/**
 * Brings the phone in line with the settings in "Meine Teams". `ask` shows the
 * permission prompt if the user has not answered it yet.
 */
export function syncPush(ask = false): Promise<void> {
  if (running) {
    again = true;
    return ask ? running.then(() => syncPush(true)) : running;
  }
  running = doSync(ask)
    .catch((e: unknown) => {
      setStatus({
        kind: "local",
        reason: `Anmeldung fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`,
        reminders: 0,
      });
    })
    .finally(() => {
      running = null;
      if (again) {
        again = false;
        syncPush();
      }
    });
  return running;
}

async function doSync(ask: boolean) {
  if (Platform.OS === "web") return setStatus({ kind: "unsupported" });
  await prefsReady;

  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: "Spiele deiner Teams",
      importance: Notifications.AndroidImportance.HIGH,
    });

  let perm = await Notifications.getPermissionsAsync();
  if (!perm.granted && ask && perm.canAskAgain)
    perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted)
    return setStatus({ kind: perm.canAskAgain ? "ask" : "denied" });

  const { favorites, push } = getPrefs();
  const wanted = favorites.length > 0 && (push.tipOff || push.finalScore);
  const blocker = remoteBlocker();

  if (!blocker) {
    const token = (
      await Notifications.getExpoPushTokenAsync({ projectId: projectId() })
    ).data;
    const body: ApiPushRegistration = {
      token,
      teams: favorites,
      tipOff: push.tipOff,
      finalScore: push.finalScore,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    const res = await fetch(`${API_URL}/v1/push/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Server antwortet mit ${res.status}`);
    // The server sends the tip-off push, so no local reminders on top.
    await Notifications.cancelAllScheduledNotificationsAsync();
    return setStatus(wanted ? { kind: "push", token } : { kind: "off" });
  }

  const reminders = await scheduleLocalReminders(push.tipOff ? favorites : []);
  setStatus(
    wanted ? { kind: "local", reason: blocker, reminders } : { kind: "off" },
  );
}

/** Local "Gleich geht's los" reminders for the next two weeks. */
async function scheduleLocalReminders(teams: string[]): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!teams.length) return 0;
  const res = await fetch(`${API_URL}/v1/games`);
  if (!res.ok) throw new Error(`Spielplan nicht erreichbar (${res.status})`);
  const games = (await res.json()) as ApiGame[];
  const now = Date.now();
  const upcoming = games
    .filter(
      (g) =>
        g.status === "scheduled" &&
        (teams.includes(g.home.code) || teams.includes(g.away.code)),
    )
    .map((g) => ({
      g,
      at: Date.parse(g.startUtc) - TIP_OFF_LEAD_MIN * 60_000,
    }))
    .filter(({ at }) => at > now + 30_000 && at < now + 14 * 86400_000)
    // iOS keeps at most 64 scheduled notifications per app.
    .slice(0, 40);
  for (const { g, at } of upcoming) {
    const time = new Date(g.startUtc).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
    await Notifications.scheduleNotificationAsync({
      identifier: `tip-${g.code}`,
      content: {
        title: "Gleich geht's los 🏀",
        body: `${g.home.shortName} gegen ${g.away.shortName}, Tip-off um ${time} Uhr.`,
        data: { gameCode: g.code } satisfies ApiPushData,
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(at),
        channelId: ANDROID_CHANNEL,
      },
    });
  }
  return upcoming.length;
}

/** Sends a test push from the server to this phone. Returns an error text or null. */
export async function sendTestPush(): Promise<string | null> {
  if (status.kind === "local") {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Hoopline 🏀",
        body: "Lokale Erinnerung klappt. Echte Push-Nachrichten kommen, sobald die Expo-Projekt-ID eingetragen ist.",
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3,
        channelId: ANDROID_CHANNEL,
      },
    });
    return null;
  }
  if (status.kind !== "push") return "Push ist noch nicht aktiv.";
  try {
    const res = await fetch(`${API_URL}/v1/push/test`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: status.token }),
    });
    if (res.ok) return null;
    const body = await res.json().catch(() => null);
    return body?.error ?? `Fehler ${res.status}`;
  } catch {
    return "Keine Verbindung zum Server.";
  }
}

/**
 * Keeps the registration in sync: at start, when the app comes back to the
 * foreground (refreshes local reminders) and shortly after settings change.
 * Never shows the permission prompt by itself; "Meine Teams" does that.
 */
export function usePushSync() {
  useEffect(() => {
    if (Platform.OS === "web") {
      setStatus({ kind: "unsupported" });
      return;
    }
    syncPush();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = onPrefsChange(() => {
      clearTimeout(timer);
      timer = setTimeout(() => syncPush(), 800);
    });
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") syncPush();
    });
    return () => {
      clearTimeout(timer);
      off();
      sub.remove();
    };
  }, []);
}
