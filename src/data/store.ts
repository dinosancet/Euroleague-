/**
 * Tiny app store. Screens read data through the hooks at the bottom, so swapping
 * the sample data for a real provider only changes this file and mock.ts.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

import {
  ACTIONS,
  GAMES,
  NEWS,
  TEAMS,
  formatClock,
  makeBoxScore,
  makePlays,
  pick,
  rnd,
  surname,
  totals,
} from "./mock";
import type { Game, Play, Team } from "./types";

export interface PushSettings {
  tipOff: boolean;
  finalScore: boolean;
  news: boolean;
}

interface State {
  games: Game[];
  plays: Record<string, Play[]>;
  favorites: string[];
  push: PushSettings;
}

let state: State = {
  games: GAMES,
  plays: {},
  favorites: ["BAY", "PAN"],
  push: { tipOff: true, finalScore: true, news: false },
};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  emit();
};

export const teamById = (id: string): Team => {
  const t = TEAMS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown team ${id}`);
  return t;
};

/* ---------- persistence for favorites and push settings ---------- */
const STORAGE_KEY = "hoopline.prefs.v1";
AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<Pick<State, "favorites" | "push">>;
    set({
      favorites: saved.favorites ?? state.favorites,
      push: { ...state.push, ...saved.push },
    });
  })
  .catch(() => {});
const persist = () =>
  AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ favorites: state.favorites, push: state.push }),
  ).catch(() => {});

export function toggleFavorite(id: string) {
  const favorites = state.favorites.includes(id)
    ? state.favorites.filter((f) => f !== id)
    : [...state.favorites, id];
  set({ favorites });
  persist();
}
export function togglePush(key: keyof PushSettings) {
  set({ push: { ...state.push, [key]: !state.push[key] } });
  persist();
}

/* ---------- play-by-play ---------- */
function playsFor(g: Game): Play[] {
  if (!state.plays[g.id])
    state.plays = { ...state.plays, [g.id]: makePlays(g, teamById) };
  return state.plays[g.id];
}

/* ---------- live simulation: the first live game keeps scoring ---------- */
setInterval(() => {
  const idx = state.games.findIndex((g) => g.status === "live");
  if (idx < 0) return;
  const g = {
    ...state.games[idx],
    quarters: state.games[idx].quarters.map((q) => [...q] as [number, number]),
  };
  const plays = playsFor(state.games[idx]);
  const side: 0 | 1 = rnd() > 0.5 ? 1 : 0;
  const [what, pts] = pick(ACTIONS);
  g.quarters[g.period! - 1][side] += pts;
  const [m, s] = (g.clock ?? "10:00").split(":").map(Number);
  let secs = m * 60 + s - (15 + Math.floor(rnd() * 25));
  if (secs <= 0) {
    if (g.period! < 4) {
      g.period = g.period! + 1;
      g.quarters.push([0, 0]);
      secs = 600;
    } else {
      secs = 0;
      g.status = "final";
    }
  }
  g.clock = formatClock(secs);
  const team = teamById(side === 0 ? g.home : g.away);
  const play: Play = {
    period: g.period!,
    clock: g.clock,
    side,
    text: `${surname(pick(team.roster.slice(0, 7)))} · ${what}`,
    score: totals(g),
  };
  const games = [...state.games];
  games[idx] = g;
  set({ games, plays: { ...state.plays, [g.id]: [play, ...plays] } });
}, 6000);

/* ---------- hooks ---------- */
const useStore = <T>(select: (s: State) => T) =>
  useSyncExternalStore(subscribe, () => select(state));

export const useGames = () => useStore((s) => s.games);
export const useGame = (id: string) =>
  useStore((s) => s.games.find((g) => g.id === id));
export const useFavorites = () => useStore((s) => s.favorites);
export const usePush = () => useStore((s) => s.push);
const NO_PLAYS: Play[] = [];
export const usePlays = (g: Game | undefined) =>
  useStore((s) => (g ? (s.plays[g.id] ?? playsFor(g)) : NO_PLAYS));

export function boxScore(g: Game, side: 0 | 1) {
  const team = teamById(side === 0 ? g.home : g.away);
  return makeBoxScore(team, totals(g)[side], g.id.charCodeAt(0) + side * 31);
}

export function standings(): Team[] {
  return [...TEAMS].sort(
    (a, b) =>
      b.wins - a.wins ||
      b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst),
  );
}

export const allTeams = () => TEAMS;
export const allNews = () => NEWS;
export const newsById = (id: string) => NEWS.find((n) => n.id === id);

/** The sample season's "today": Thursday 19 November 2026. */
export const SAMPLE_TODAY = new Date(2026, 10, 19);
