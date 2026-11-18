/**
 * Turns the official EuroLeague YouTube channel's public feed into the app's
 * video shape (ApiVideo).
 *
 * Only title, thumbnail and link are kept. The videos are never downloaded or
 * re-hosted: tapping one opens it on YouTube, so views, ads and rights stay
 * with the league.
 */
import type { ApiGame, ApiVideo, ApiVideoKind } from "../../shared/api";
import { decodeEntities, findTeams } from "./news.ts";

export interface VideoSource {
  /** Channel name shown in the app. */
  name: string;
  url: string;
}

/** Official channel "EUROLEAGUE BASKETBALL" (youtube.com/@euroleague). */
export const VIDEO_SOURCES: VideoSource[] = [
  {
    name: "EuroLeague",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCGr3nR_XH9r6E5b09ZJAT9w",
  },
];

/* ---------- Atom parsing ---------- */

export interface FeedEntry {
  id: string;
  title: string;
  link: string;
  published: string;
  thumbnail: string | null;
  views: number | null;
}

function tag(xml: string, name: string): string {
  const m = xml.match(
    new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"),
  );
  if (!m) return "";
  const cdata = m[1].match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return (cdata ? cdata[1] : decodeEntities(m[1])).trim();
}

function attr(el: string, name: string): string | null {
  const m = el.match(new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return m ? decodeEntities(m[2]) : null;
}

export function parseFeed(xml: string): FeedEntry[] {
  return (xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? []).map((e) => {
    const linkEl =
      e.match(/<link\b[^>]*rel=["']alternate["'][^>]*>/i)?.[0] ??
      e.match(/<link\b[^>]*>/i)?.[0] ??
      "";
    const thumbEl = e.match(/<media:thumbnail\b[^>]*>/i)?.[0];
    const statsEl = e.match(/<media:statistics\b[^>]*>/i)?.[0];
    const views = statsEl ? Number(attr(statsEl, "views")) : NaN;
    return {
      id: tag(e, "yt:videoId"),
      title: tag(e, "title"),
      link: attr(linkEl, "href") ?? "",
      published: tag(e, "published"),
      thumbnail: thumbEl ? attr(thumbEl, "url") : null,
      views: Number.isFinite(views) ? views : null,
    };
  });
}

/* ---------- reading the title ---------- */

/**
 * The channel's titles are pipe-separated, e.g.
 *   "Desert Storm | Fenerbahce - Dubai | R4 BASKETBALL HIGHLIGHTS 2025-26"
 *   "Top 10 Plays | RS Round 3 That HAD IT ALL | EUROLEAGUE BASKETBALL 2025-26"
 */
export interface TitleParts {
  kind: ApiVideoKind;
  teams: string[];
  round: number | null;
  headline: string;
  top: number | null;
}

const MATCHUP = /^(.+?)\s+(?:[-–—]|vs\.?|v)\s+(.+)$/i;
const ROUND = /\b(?:round\s*|r)(\d{1,2})\b/i;
const PLAYS = /\btop\s*(\d+)\b|\bplays? of the\b|\bbest plays\b/i;
const NOISE =
  /^(?:.*\bhighlights?\b.*|.*\beuroleague\b.*|.*\d{4}-\d{2}.*|top\s*\d+\s*plays?|(?:rs\s*)?round\s*\d+|r\d+)$/i;

/** "SALVATION LATE" -> "Salvation Late"; mixed-case text is kept. */
function tidyCase(s: string): string {
  if (/[a-zß-ÿ]/.test(s)) return s;
  return s
    .toLowerCase()
    .replace(
      /(^|[\s(-])(\p{L})/gu,
      (_, a: string, b: string) => a + b.toUpperCase(),
    );
}

export function readTitle(title: string): TitleParts {
  const parts = title
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);

  let teams: string[] = [];
  let matchup = -1;
  parts.forEach((p, i) => {
    if (matchup >= 0) return;
    const m = p.match(MATCHUP);
    if (!m) return;
    const [home] = findTeams(m[1]);
    const [away] = findTeams(m[2]);
    if (home && away && home !== away) {
      teams = [home, away];
      matchup = i;
    }
  });

  const roundMatch = title.match(ROUND);
  const round = roundMatch ? Number(roundMatch[1]) : null;
  const playsMatch = title.match(PLAYS);
  const top = playsMatch?.[1] ? Number(playsMatch[1]) : null;

  const kind: ApiVideoKind =
    matchup >= 0 && /highlight/i.test(title)
      ? "game"
      : playsMatch
        ? "plays"
        : "other";

  if (!teams.length) teams = findTeams(title);

  // What is left once team names, round and season labels are taken out.
  const rest = parts
    .filter((p, i) => i !== matchup && !NOISE.test(p))
    .map((p) =>
      p
        .replace(/^(?:rs\s*)?round\s*\d+\s*/i, "")
        .replace(/\btop\s*\d+\s*plays?\b/i, "")
        .trim(),
    )
    .filter(Boolean);
  const headline = rest.length
    ? tidyCase(rest.join(" · "))
    : kind === "game" && matchup >= 0
      ? parts[matchup]
      : title;

  return { kind, teams, round, headline, top };
}

export function videoTag(p: TitleParts, title: string, short: boolean): string {
  if (p.kind === "game") return "Spiel-Highlights";
  if (p.kind === "plays") return p.top ? `Top ${p.top}` : "Top-Plays";
  if (/mini.?movie/i.test(title)) return "Mini-Movie";
  if (/\bmvp\b|award|team of the/i.test(title)) return "Auszeichnung";
  if (
    /interview|press conference|presser|post-?game|\bsays\b|\bmic/i.test(title)
  )
    return "Interview";
  if (short) return "Short";
  return "Video";
}

/* ---------- linking to the schedule ---------- */

/**
 * The game a highlight video belongs to: same home and away team, already
 * started before the video went up. The round from the title decides when
 * the teams meet twice; otherwise the most recent meeting wins.
 */
export function findGame(
  teams: string[],
  round: number | null,
  publishedUtc: string,
  games: ApiGame[],
): number | null {
  if (teams.length !== 2) return null;
  const [a, b] = teams;
  const published = Date.parse(publishedUtc);
  const played = games.filter(
    (g) =>
      g.status !== "scheduled" &&
      Date.parse(g.startUtc) <= published + 3600_000 &&
      ((g.home.code === a && g.away.code === b) ||
        (g.home.code === b && g.away.code === a)),
  );
  const inRound = round ? played.filter((g) => g.round === round) : [];
  const pick = (inRound.length ? inRound : played).sort((x, y) =>
    y.startUtc.localeCompare(x.startUtc),
  )[0];
  return pick?.code ?? null;
}

/* ---------- building the list ---------- */

export function toVideos(
  source: VideoSource,
  entries: FeedEntry[],
  games: ApiGame[],
): ApiVideo[] {
  const out: ApiVideo[] = [];
  for (const e of entries) {
    const t = Date.parse(e.published);
    if (!/^[\w-]{6,20}$/.test(e.id) || !e.title || !Number.isFinite(t))
      continue;
    const publishedUtc = new Date(t).toISOString();
    const short = /\/shorts\//.test(e.link);
    const p = readTitle(e.title);
    const thumb =
      e.thumbnail && /^https:\/\/i\d?\.ytimg\.com\//.test(e.thumbnail)
        ? e.thumbnail
        : `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`;
    out.push({
      id: e.id,
      league: "euroleague",
      kind: p.kind,
      tag: videoTag(p, e.title, short),
      title: e.title,
      headline: p.headline,
      url: short
        ? `https://www.youtube.com/shorts/${e.id}`
        : `https://www.youtube.com/watch?v=${e.id}`,
      thumbnail: thumb,
      channel: source.name,
      publishedUtc,
      short,
      round: p.round,
      teams: p.teams,
      gameCode:
        p.kind === "game"
          ? findGame(p.teams, p.round, publishedUtc, games)
          : null,
      views: e.views,
    });
  }
  return out;
}

/**
 * Newest first, one entry per video. Newer copies of a video (fresh view
 * counts) replace older ones, so the archive and the live feed can be merged.
 */
export function mergeVideos(lists: ApiVideo[][], limit = 150): ApiVideo[] {
  const byId = new Map<string, ApiVideo>();
  for (const v of lists.flat()) if (!byId.has(v.id)) byId.set(v.id, v);
  return [...byId.values()]
    .sort((a, b) => b.publishedUtc.localeCompare(a.publishedUtc))
    .slice(0, limit);
}
