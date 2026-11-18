/**
 * Turns public RSS feeds into the app's news shape (ApiNewsItem).
 *
 * Only the headline, a short teaser, the feed picture and the link are kept.
 * The full article text is never copied: tapping a story opens it on the
 * publisher's own site.
 */
import type { ApiNewsItem, ApiNewsKind } from "../../shared/api";

export interface NewsSource {
  /** Publisher name shown in the app. */
  name: string;
  url: string;
  /**
   * Whether an item belongs in the EuroLeague feed. Defaults to everything,
   * for feeds that are already EuroLeague only.
   */
  keep?: (item: RssItem, teams: string[], kind: ApiNewsKind) => boolean;
}

export const SOURCES: NewsSource[] = [
  {
    name: "Eurohoops",
    url: "https://www.eurohoops.net/en/euroleague/feed/",
  },
  {
    // General basketball feed: keep EuroLeague stories and moves of EuroLeague clubs.
    name: "Sportando",
    url: "https://sportando.basketball/en/feed/",
    keep: (item, teams, kind) =>
      item.categories.some((c) => /euroleague/i.test(c)) ||
      (kind === "transfer" && teams.length > 0),
  },
];

/* ---------- RSS parsing ---------- */

export interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  categories: string[];
  image: string | null;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n =
        e[1] === "x" || e[1] === "X"
          ? parseInt(e.slice(2), 16)
          : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Text content of a tag: unwraps CDATA, otherwise decodes XML entities. */
function text(raw: string): string {
  const cdata = raw.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return cdata ? cdata[1] : decodeEntities(raw);
}

function tag(xml: string, name: string): string {
  const m = xml.match(
    new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"),
  );
  return m ? text(m[1]).trim() : "";
}

function tags(xml: string, name: string): string[] {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "gi");
  return [...xml.matchAll(re)].map((m) => text(m[1]).trim()).filter(Boolean);
}

function attr(el: string, name: string): string | null {
  const m = el.match(new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return m ? decodeEntities(m[2]) : null;
}

function itemImage(xml: string): string | null {
  for (const el of xml.match(/<(?:enclosure|media:content)\b[^>]*>/gi) ?? []) {
    const type = attr(el, "type") ?? attr(el, "medium") ?? "";
    const url = attr(el, "url");
    if (url && /^https:\/\//.test(url) && /image/i.test(type)) return url;
  }
  const thumb = xml.match(/<media:thumbnail\b[^>]*>/i);
  const url = thumb && attr(thumb[0], "url");
  return url && /^https:\/\//.test(url) ? url : null;
}

export function parseRss(xml: string): RssItem[] {
  return (xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? []).map((it) => ({
    title: decodeEntities(stripHtml(tag(it, "title"))),
    link: tag(it, "link"),
    pubDate: tag(it, "pubDate"),
    description: tag(it, "description"),
    categories: tags(it, "category"),
    image: itemImage(it),
  }));
}

/* ---------- cleaning ---------- */

export function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/p>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/** A short plain-text teaser without WordPress' "The post … appeared first on …" line. */
export function teaser(description: string, max = 240): string {
  let t = stripHtml(description)
    .replace(/\s*The post .* appeared first on .*$/i, "")
    .replace(/\s*\[(?:…|\.\.\.)\]\s*$/, "…")
    .trim();
  if (t.length > max) {
    const cut = t.slice(0, max);
    t = `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).trimEnd()}…`;
  }
  return t;
}

/* ---------- classification ---------- */

/**
 * How each club is named in English headlines. Codes are the data feed's
 * club codes (see src/data/clubs.ts). Patterns are matched case-insensitively
 * on word boundaries.
 */
const CLUB_NAMES: Record<string, string[]> = {
  ASV: ["ASVEL", "LDLC ASVEL", "Villeurbanne"],
  BAR: ["Barcelona", "Barça", "Barca"],
  BAS: ["Baskonia", "Vitoria"],
  BES: ["Besiktas", "Beşiktaş"],
  DUB: ["Dubai Basketball", "Dubai"],
  HTA: ["Hapoel Tel Aviv", "Hapoel"],
  IST: ["Anadolu Efes", "Efes"],
  MAD: ["Real Madrid", "Madrid"],
  MIL: ["Olimpia Milano", "Olimpia Milan", "Milano", "Armani", "Milan"],
  MUN: ["Bayern", "Munich", "München"],
  OLY: ["Olympiacos", "Olympiakos", "Oly"],
  PAM: ["Valencia Basket", "Valencia"],
  PAN: ["Panathinaikos", "PAO"],
  PAR: ["Partizan"],
  PRS: ["Paris Basketball", "Paris"],
  RED: ["Crvena Zvezda", "Red Star", "Zvezda"],
  TEL: ["Maccabi Tel Aviv", "Maccabi"],
  ULK: ["Fenerbahce", "Fenerbahçe", "Fener"],
  VIR: ["Virtus Bologna", "Virtus"],
  ZAL: ["Zalgiris", "Žalgiris", "Kaunas"],
};

const CLUB_PATTERNS = Object.entries(CLUB_NAMES).map(
  ([code, names]) =>
    [
      code,
      new RegExp(
        `(?<![\\p{L}\\p{N}])(?:${names
          .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("|")})(?![\\p{L}\\p{N}])`,
        "iu",
      ),
    ] as const,
);

/** Club codes mentioned in the text, in the order of the club list. */
export function findTeams(...texts: string[]): string[] {
  const all = texts.join(" \n ");
  return CLUB_PATTERNS.filter(([, re]) => re.test(all)).map(([c]) => c);
}

const TRANSFER =
  /\b(sign(?:s|ed|ing)?|re-?signs?|joins?|joined|deal|contract|agreement|agrees?|extension|extends?|trial|parts? ways|release[sd]?|waive[sd]?|buyout|loan(?:ed)?|acquires?|acquired|transfer|moves? to|moved to|set to join|eyeing|interest(?:ed)? in|rumou?rs?|free agen\w*)\b/i;
const TRANSFER_TAGS = /transfer|signing|free agen|rumou?r/i;

export function kindOf(item: RssItem): ApiNewsKind {
  return TRANSFER.test(item.title) ||
    item.categories.some((c) => TRANSFER_TAGS.test(c))
    ? "transfer"
    : "news";
}

/** A short German label for the card, picked from the headline. */
export function tagOf(item: RssItem, kind: ApiNewsKind): string {
  const t = item.title;
  if (kind === "transfer") {
    if (
      /\b(rumou?r|target|eyes?|eyeing|interest|reportedly|could|may)\b/i.test(t)
    )
      return "Gerücht";
    if (/\b(extension|extends?|re-?signs?)\b/i.test(t)) return "Vertrag";
    return "Transfer";
  }
  if (/\binjur|\bout for\b|\bsidelined\b|\bsurgery\b/i.test(t))
    return "Verletzung";
  if (/\bMVP\b|award|named/i.test(t)) return "Auszeichnung";
  if (
    /round ?up|recap|\bbeats?\b|\bwins?\b|victory|defeat|\bdowns?\b|overtime|\bstuns?\b|\d{2,3}-\d{2,3}/i.test(
      t,
    )
  )
    return "Spielbericht";
  if (/preview|\bahead of\b/i.test(t)) return "Vorschau";
  if (/coach|head coach/i.test(t)) return "Trainer";
  if (/["“”']|\binterview\b|\bsays\b|\bon\b .*:/i.test(t)) return "Interview";
  return "News";
}

/** Short stable id from the article link (FNV-1a, base 36). */
export function newsId(link: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < link.length; i++) {
    h ^= link.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function toIso(pubDate: string): string | null {
  const t = Date.parse(pubDate);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/** RSS items of one source to news items; drops items without a link or date. */
export function toNews(source: NewsSource, items: RssItem[]): ApiNewsItem[] {
  const out: ApiNewsItem[] = [];
  for (const it of items) {
    const url = it.link;
    const publishedUtc = toIso(it.pubDate);
    if (!it.title || !/^https:\/\//.test(url) || !publishedUtc) continue;
    const plain = teaser(it.description);
    const teams = findTeams(it.title, plain, it.categories.join(" "));
    const kind = kindOf(it);
    if (source.keep && !source.keep(it, teams, kind)) continue;
    out.push({
      id: newsId(url),
      league: "euroleague",
      kind,
      top: false,
      tag: tagOf(it, kind),
      title: it.title,
      teaser: plain,
      url,
      source: source.name,
      publishedUtc,
      image: it.image,
      teams,
    });
  }
  return out;
}

/** How many of the freshest stories make the "Top News" filter. */
const TOP_COUNT = 8;

/**
 * Merges the sources: newest first, duplicates (same link or same headline)
 * removed, at most `limit` items. "Top News" are the newest stories that come
 * with a picture and name at least one club, since those are the main stories
 * of the day rather than short notes.
 */
export function mergeNews(lists: ApiNewsItem[][], limit = 60): ApiNewsItem[] {
  // Same link or same headline from two publishers: keep one, preferring the
  // copy that comes with a picture.
  const byKey = new Map<string, ApiNewsItem>();
  const kept: ApiNewsItem[] = [];
  for (const n of lists
    .flat()
    .sort((a, b) => b.publishedUtc.localeCompare(a.publishedUtc))) {
    const keys = [n.id, n.title.toLowerCase().replace(/\W+/g, "")];
    const dup = keys.map((k) => byKey.get(k)).find(Boolean);
    if (dup) {
      if (!dup.image && n.image) kept[kept.indexOf(dup)] = n;
      else continue;
    } else kept.push(n);
    for (const k of keys) byKey.set(k, n);
  }
  const all = kept
    .sort((a, b) => b.publishedUtc.localeCompare(a.publishedUtc))
    .slice(0, limit);
  let top = 0;
  return all.map((n) => {
    const isTop =
      top < TOP_COUNT &&
      n.kind === "news" &&
      n.image !== null &&
      n.teams.length > 0;
    if (isTop) top++;
    return { ...n, top: isTop };
  });
}
