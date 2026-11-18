/** Favourite teams and notification settings, saved on the device. */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

export interface PushSettings {
  tipOff: boolean;
  finalScore: boolean;
  news: boolean;
}

interface Prefs {
  /** Club codes, e.g. "MUN". */
  favorites: string[];
  push: PushSettings;
  /** League shown on Home, Spiele and Tabelle. */
  league: string;
}

let prefs: Prefs = {
  favorites: ["MUN", "PAN"],
  push: { tipOff: true, finalScore: true, news: false },
  league: "euroleague",
};
const listeners = new Set<() => void>();
const set = (next: Prefs) => {
  prefs = next;
  listeners.forEach((l) => l());
  AsyncStorage.setItem(KEY, JSON.stringify(prefs)).catch(() => {});
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const KEY = "hoopline.prefs.v2";
/** Resolves once the saved settings are loaded (or there are none). */
export const prefsReady: Promise<void> = AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<Prefs>;
    prefs = {
      favorites: saved.favorites ?? prefs.favorites,
      push: { ...prefs.push, ...saved.push },
      league: saved.league ?? prefs.league,
    };
    listeners.forEach((l) => l());
  })
  .catch(() => {});

/** Current settings outside React, and a way to hear about changes. */
export const getPrefs = () => prefs;
export const onPrefsChange = subscribe;

export const useFavorites = () =>
  useSyncExternalStore(subscribe, () => prefs.favorites);
export const usePush = () => useSyncExternalStore(subscribe, () => prefs.push);

export const useLeague = () =>
  useSyncExternalStore(subscribe, () => prefs.league);
export const setLeague = (league: string) => set({ ...prefs, league });

export function toggleFavorite(code: string) {
  const favorites = prefs.favorites.includes(code)
    ? prefs.favorites.filter((f) => f !== code)
    : [...prefs.favorites, code];
  set({ ...prefs, favorites });
}

export function togglePush(key: keyof PushSettings) {
  set({ ...prefs, push: { ...prefs.push, [key]: !prefs.push[key] } });
}
