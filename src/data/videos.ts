/**
 * Highlights from the official EuroLeague YouTube channel, via the Hoopline
 * server (/v1/videos). The app shows the thumbnail and opens the video on
 * YouTube, so nothing is copied or re-hosted.
 */
import type { ApiVideo } from "@shared/api";
import { Linking } from "react-native";

import { useApi } from "./api";

export type Video = ApiVideo;

/** The server refreshes the channel feed every 15 minutes. */
export const useVideos = () => useApi<Video[]>("/v1/videos", 600_000);

/** Opens the video in the YouTube app, or the browser if it isn't installed. */
export const playVideo = (v: Video) => Linking.openURL(v.url).catch(() => {});

/** 48211 -> "48 Tsd.". */
export function viewsLabel(views: number | null): string | null {
  if (views === null) return null;
  if (views < 1000) return String(views);
  if (views < 1_000_000) return `${Math.round(views / 1000)} Tsd.`;
  return `${(views / 1_000_000).toFixed(1).replace(".", ",")} Mio.`;
}
