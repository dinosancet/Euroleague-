/**
 * Talks to the Hoopline server (see server/). Screens use the hooks at the
 * bottom; each hook keeps its data fresh by polling while it is on screen.
 */
import type {
  ApiGame,
  ApiGameDetail,
  ApiPlayerProfile,
  ApiRoster,
  ApiStandings,
} from "@shared/api";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { AppState } from "react-native";

/**
 * The published Hoopline server on Cloudflare. To test against a local server
 * (`npm run dev` in server/), set EXPO_PUBLIC_API_URL=http://localhost:8787.
 */
const DEFAULT_API_URL = "https://hoopline-api.94-dino.workers.dev";

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL
).replace(/\/+$/, "");

interface Entry<T> {
  data?: T;
  error?: string;
  loading: boolean;
  fetchedAt?: number;
}

/* ---------- a tiny shared cache so switching screens shows data instantly ---------- */

const entries = new Map<string, Entry<unknown>>();
const listeners = new Map<string, Set<() => void>>();
const inflight = new Map<string, Promise<void>>();
const EMPTY: Entry<never> = { loading: true };

function setEntry(path: string, patch: Partial<Entry<unknown>>) {
  entries.set(path, { ...(entries.get(path) ?? EMPTY), ...patch });
  listeners.get(path)?.forEach((l) => l());
}

export function load(path: string): Promise<void> {
  const running = inflight.get(path);
  if (running) return running;
  setEntry(path, { loading: true });
  const p = fetch(`${API_URL}${path}`)
    .then(async (res) => {
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Fehler ${res.status}`);
      setEntry(path, {
        data: body,
        error: undefined,
        loading: false,
        fetchedAt: Date.now(),
      });
    })
    .catch((e: unknown) => {
      const message =
        e instanceof TypeError
          ? "Keine Verbindung zum Server."
          : e instanceof Error
            ? e.message
            : String(e);
      setEntry(path, { error: message, loading: false });
    })
    .finally(() => inflight.delete(path));
  inflight.set(path, p);
  return p;
}

/**
 * Subscribes to one API path. `refreshMs` polls while the screen is mounted
 * and the app is in the foreground; pass a function to pick the interval from
 * the latest data (e.g. faster while a game is live).
 */
export function useApi<T>(
  path: string | null,
  refreshMs?: number | ((data: T | undefined) => number | undefined),
) {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (!path) return () => {};
      const set = listeners.get(path) ?? new Set();
      set.add(cb);
      listeners.set(path, set);
      return () => set.delete(cb);
    },
    [path],
  );
  const entry = useSyncExternalStore(subscribe, () =>
    path ? (entries.get(path) ?? EMPTY) : EMPTY,
  ) as Entry<T>;

  const intervalRef = useRef(refreshMs);
  intervalRef.current = refreshMs;

  useEffect(() => {
    if (!path) return;
    const cur = entries.get(path);
    if (!cur?.fetchedAt || Date.now() - cur.fetchedAt > 5000) load(path);

    let timer: ReturnType<typeof setTimeout> | undefined;
    let active = AppState.currentState === "active";
    const schedule = () => {
      clearTimeout(timer);
      const r = intervalRef.current;
      const ms =
        typeof r === "function"
          ? r(entries.get(path)?.data as T | undefined)
          : r;
      if (!ms || !active) return;
      timer = setTimeout(() => load(path).finally(schedule), ms);
    };
    schedule();
    const sub = AppState.addEventListener("change", (s) => {
      active = s === "active";
      if (active) load(path).finally(schedule);
      else clearTimeout(timer);
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [path]);

  const refresh = useCallback(
    () => (path ? load(path) : Promise.resolve()),
    [path],
  );
  return { ...entry, refresh };
}

/* ---------- typed hooks ---------- */

const anyLive = (games?: ApiGame[]) => games?.some((g) => g.status === "live");

export const useGames = () =>
  useApi<ApiGame[]>("/v1/games", (g) => (anyLive(g) ? 20_000 : 120_000));

export const useGameDetail = (code: string | number) =>
  useApi<ApiGameDetail>(`/v1/games/${code}`, (d) =>
    d?.game.status === "live" ? 15_000 : undefined,
  );

export const useStandings = () =>
  useApi<ApiStandings>("/v1/standings", 300_000);

export const useRoster = (code: string) =>
  useApi<ApiRoster>(`/v1/teams/${code}`);

export const usePlayer = (code: string) =>
  useApi<ApiPlayerProfile>(`/v1/players/${code}`);
