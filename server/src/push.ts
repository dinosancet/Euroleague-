/**
 * Push notifications for favourite teams: which game events are due and what
 * the message says. Pure functions, so they can be tested without Cloudflare.
 * Storage and sending live in push-store.ts.
 */
import type { ApiGame, ApiPushRegistration } from "../../shared/api";

/** Minutes before tip-off the "Spielbeginn" push goes out. */
export const TIP_OFF_LEAD_MIN = 15;
/** A final score older than this is not pushed any more (e.g. after an outage). */
const FINAL_MAX_AGE_H = 5;

export type PushKind = "tipOff" | "finalScore";

export interface PushEvent {
  /** Unique per game and kind, so each push goes out once. */
  key: string;
  kind: PushKind;
  game: ApiGame;
}

/** Game events that should be pushed now (if not sent before). */
export function dueEvents(games: ApiGame[], now: Date): PushEvent[] {
  const t = now.getTime();
  const out: PushEvent[] = [];
  for (const game of games) {
    const start = Date.parse(game.startUtc);
    if (
      game.status !== "final" &&
      t >= start - TIP_OFF_LEAD_MIN * 60_000 &&
      t < start + 5 * 60_000
    )
      out.push({ key: `tip:${game.code}`, kind: "tipOff", game });
    if (
      game.status === "final" &&
      t - start < FINAL_MAX_AGE_H * 3600_000 &&
      t > start &&
      // Guard against a feed that briefly reports "not live" mid-game.
      game.quarters.length >= 4 &&
      game.score[0] !== game.score[1]
    )
      out.push({ key: `final:${game.code}`, kind: "finalScore", game });
  }
  return out;
}

export interface PushMessage {
  title: string;
  body: string;
}

function clock(iso: string, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

export function messageFor(ev: PushEvent, timeZone: string): PushMessage {
  const { home, away, score, quarters, startUtc } = ev.game;
  if (ev.kind === "tipOff") {
    const at = clock(startUtc, timeZone);
    return {
      title: "Gleich geht's los 🏀",
      body: `${home.shortName} gegen ${away.shortName}${at ? `, Tip-off um ${at} Uhr` : ""}.`,
    };
  }
  const winner = score[0] > score[1] ? home : away;
  const ot = quarters.length > 4 ? " nach Verlängerung" : "";
  return {
    title: `Endstand: ${home.shortName} ${score[0]}:${score[1]} ${away.shortName}`,
    body: `Sieg für ${winner.shortName}${ot}. Tippe für den Boxscore.`,
  };
}

export const TEST_MESSAGE: PushMessage = {
  title: "Hoopline 🏀",
  body: "Test geklappt! So kommen Spielbeginn und Endstand deiner Teams an.",
};

const TOKEN = /^Expo(nent)?PushToken\[[A-Za-z0-9_\-:.]{10,200}\]$/;

export const isPushToken = (t: unknown): t is string =>
  typeof t === "string" && TOKEN.test(t);

/** Checks and cleans a registration from the app; null if it is not valid. */
export function parseRegistration(body: unknown): ApiPushRegistration | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (!isPushToken(b.token)) return null;
  const teams = Array.isArray(b.teams)
    ? [
        ...new Set(
          b.teams.filter(
            (t): t is string =>
              typeof t === "string" && /^[A-Z0-9]{2,4}$/.test(t),
          ),
        ),
      ].slice(0, 40)
    : [];
  let timeZone = typeof b.timeZone === "string" ? b.timeZone : "Europe/Berlin";
  if (
    timeZone.length > 64 ||
    clock(new Date().toISOString(), timeZone) === null
  )
    timeZone = "Europe/Berlin";
  return {
    token: b.token,
    teams,
    tipOff: b.tipOff === true,
    finalScore: b.finalScore === true,
    timeZone,
  };
}

/** Expo's answer for one message. */
export interface ExpoTicket {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

/** Tokens Expo says belong to uninstalled apps or revoked permissions. */
export function deadTokens(tokens: string[], tickets: ExpoTicket[]): string[] {
  return tokens.filter(
    (_, i) =>
      tickets[i]?.status === "error" &&
      tickets[i]?.details?.error === "DeviceNotRegistered",
  );
}
