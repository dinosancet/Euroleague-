/**
 * News on the Home tab. Headlines come from public RSS feeds via the Hoopline
 * server (/v1/news); only headline, teaser, picture and link are shown, the
 * full article opens on the publisher's site.
 */
import type { ApiNewsItem } from "@shared/api";

import { useApi } from "./api";

export type NewsArticle = ApiNewsItem;

/** Feeds change slowly; the server refreshes them every 15 minutes. */
export const useNews = () => useApi<NewsArticle[]>("/v1/news", 600_000);

export function ageLabel(iso: string, now = Date.now()) {
  const min = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (min < 1) return "gerade eben";
  if (min < 60) return min === 1 ? "vor 1 Minute" : `vor ${min} Minuten`;
  const h = Math.round(min / 60);
  if (h < 24) return h === 1 ? "vor 1 Stunde" : `vor ${h} Stunden`;
  const d = Math.round(h / 24);
  return d === 1 ? "gestern" : `vor ${d} Tagen`;
}
