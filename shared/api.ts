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

export interface ApiGameDetail {
  game: ApiGame;
  box: {
    home: ApiPlayerLine[];
    away: ApiPlayerLine[];
    totals: { home: ApiTeamTotals; away: ApiTeamTotals };
  } | null;
  /** Newest first. */
  plays: ApiPlay[];
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
