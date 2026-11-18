/**
 * Contract between the Hoopline server (server/) and the app (src/).
 * The server turns the upstream data source into these shapes, so the app
 * never depends on a specific provider.
 */

export interface ApiTeam {
  /** Stable club code from the data source, e.g. "MUN". */
  code: string;
  /** Three-letter label shown on the badge, e.g. "BAY". */
  abbr: string;
  name: string;
  shortName: string;
  /** Club crest image URL from the data source, if any. */
  logo: string | null;
}

export type ApiGameStatus = "scheduled" | "live" | "final";

export interface ApiGame {
  code: number;
  round: number;
  /** ISO timestamp in UTC. */
  startUtc: string;
  status: ApiGameStatus;
  home: ApiTeam;
  away: ApiTeam;
  /** [home, away] */
  score: [number, number];
  /** Points scored in each period, [home, away]. Overtime is appended. */
  quarters: [number, number][];
  /** Current period while live. */
  period?: number;
  /** Time left in the current period while live, "mm:ss". */
  clock?: string;
  venue?: string;
}

/** Made and attempted shots. */
export type ApiShots = [made: number, attempted: number];

/**
 * One set of basketball numbers. Used for a player in a game, a team in a game
 * and, with decimals, for season averages.
 */
export interface ApiStatLine {
  points: number;
  twos: ApiShots;
  threes: ApiShots;
  freeThrows: ApiShots;
  offRebounds: number;
  defRebounds: number;
  rebounds: number;
  assists: number;
  steals: number;
  turnovers: number;
  blocks: number;
  fouls: number;
  /** Performance Index Rating, the Euroleague's efficiency value. */
  pir: number;
  plusMinus: number;
}

export interface ApiPlayerLine extends ApiStatLine {
  /** Person code from the data source, used for /v1/players/:id. */
  id: string;
  number: string;
  name: string;
  starter: boolean;
  /** Short position from the roster: "G", "F" or "C"; empty if unknown. */
  position: string;
  /** On the court right now (only meaningful while the game is live). */
  onCourt: boolean;
  /** "mm:ss", empty when the player did not play. */
  minutes: string;
}

export type ApiTeamTotals = ApiStatLine;

export interface ApiPlay {
  id: number;
  period: number;
  clock: string;
  /** "home", "away" or null for neutral events like the end of a period. */
  side: "home" | "away" | null;
  player: string | null;
  text: string;
  /** Score after this play, only set when points were scored. */
  score?: [number, number];
}

/** One player's season average in one category, e.g. 16.2 points per game. */
export interface ApiLeader {
  id: string;
  name: string;
  value: number;
}

/** A team's season so far, used in the preview of an upcoming game. */
export interface ApiTeamSeason {
  games: number;
  /** Team averages per game, one decimal. */
  averages: ApiStatLine;
  /** Shooting percentages over the season, e.g. 36.7. */
  pct: {
    twos: number | null;
    threes: number | null;
    freeThrows: number | null;
  };
  /** Best player per category among those who played at least half the games. */
  leaders: {
    points: ApiLeader | null;
    rebounds: ApiLeader | null;
    assists: ApiLeader | null;
    pir: ApiLeader | null;
  };
}

export interface ApiGameDetail {
  game: ApiGame;
  box: {
    home: ApiPlayerLine[];
    away: ApiPlayerLine[];
    totals: { home: ApiTeamTotals; away: ApiTeamTotals };
  } | null;
  /** Newest first. */
  plays: ApiPlay[];
  /** Season numbers of both teams; only for games that have not started. */
  preview?: { home: ApiTeamSeason | null; away: ApiTeamSeason | null } | null;
}

export interface ApiStanding {
  position: number;
  team: ApiTeam;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  /** Last five results, oldest first. true = win. */
  form: boolean[];
}

export interface ApiStandings {
  round: number;
  rows: ApiStanding[];
}

export interface ApiPlayer {
  id: string;
  number: string;
  name: string;
  position: string;
  heightCm: number | null;
  country: string | null;
  photo: string | null;
}

export interface ApiRoster {
  team: ApiTeam;
  coach: string | null;
  players: ApiPlayer[];
}

export interface ApiPlayerGame {
  code: number;
  round: number;
  startUtc: string;
  opponent: ApiTeam;
  atHome: boolean;
  /** [player's team, opponent] */
  score: [number, number];
  won: boolean;
  started: boolean;
  /** "mm:ss" */
  minutes: string;
  stats: ApiStatLine;
}

export interface ApiPlayerProfile {
  id: string;
  name: string;
  number: string;
  position: string;
  team: ApiTeam | null;
  photo: string | null;
  heightCm: number | null;
  weightKg: number | null;
  /** "YYYY-MM-DD" */
  birthDate: string | null;
  country: string | null;
  /** Previous club before this season, if known. */
  lastTeam: string | null;
  season: {
    games: number;
    starts: number;
    /** Average minutes per game, "mm:ss". */
    minutes: string;
    /** Per-game averages, one decimal. */
    averages: ApiStatLine;
    /** Shooting percentages over the season, e.g. 47.7. */
    pct: {
      twos: number | null;
      threes: number | null;
      freeThrows: number | null;
    };
  } | null;
  /** Newest first. */
  games: ApiPlayerGame[];
}

export type ApiNewsKind = "news" | "transfer";

/**
 * One headline from a public news feed. Only the headline, a short teaser and
 * the link are passed on; the full article stays on the publisher's site.
 */
export interface ApiNewsItem {
  /** Stable id derived from the article link. */
  id: string;
  league: string;
  kind: ApiNewsKind;
  /** Shown in the "Top News" filter. */
  top: boolean;
  /** Short label above the headline, e.g. "Transfer" or "Spielbericht". */
  tag: string;
  title: string;
  /** Plain text, at most a few sentences. */
  teaser: string;
  /** Link to the full article on the publisher's site. */
  url: string;
  /** Publisher name, e.g. "Eurohoops". */
  source: string;
  /** ISO timestamp in UTC. */
  publishedUtc: string;
  /** Picture the publisher ships with the feed, if any. */
  image: string | null;
  /** Club codes as used by the data feed, e.g. ["MUN", "ZAL"]. */
  teams: string[];
}

/**
 * "game": highlights of one game. "plays": round compilations such as the
 * Top 10. "other": interviews, features, mini-movies.
 */
export type ApiVideoKind = "game" | "plays" | "other";

/**
 * One video from the league's official YouTube channel. The video itself is
 * never copied: the app shows the thumbnail and opens the video on YouTube.
 */
export interface ApiVideo {
  /** YouTube video id. */
  id: string;
  league: string;
  kind: ApiVideoKind;
  /** Short German label, e.g. "Spiel-Highlights" or "Top 10". */
  tag: string;
  /** Full title as published. */
  title: string;
  /**
   * The catchy part of the title without team names, round and season,
   * e.g. "Desert Storm". Equals the title when it can't be split.
   */
  headline: string;
  /** Link to the video on YouTube. */
  url: string;
  /** Thumbnail picture from YouTube. */
  thumbnail: string;
  /** Channel name, e.g. "EUROLEAGUE BASKETBALL". */
  channel: string;
  /** ISO timestamp in UTC. */
  publishedUtc: string;
  /** YouTube Short (vertical clip). */
  short: boolean;
  /** Round the video is about, if the title names one. */
  round: number | null;
  /** Club codes as used by the data feed, home team first for game highlights. */
  teams: string[];
  /** The game the highlights belong to, for /v1/games/:code. */
  gameCode: number | null;
  views: number | null;
}
