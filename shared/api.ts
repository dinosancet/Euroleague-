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

export interface ApiPlayerLine {
  number: string;
  name: string;
  starter: boolean;
  /** "mm:ss", empty when the player did not play. */
  minutes: string;
  points: number;
  rebounds: number;
  assists: number;
  plusMinus: number;
}

export interface ApiTeamTotals {
  rebounds: number;
  assists: number;
  threesMade: number;
  turnovers: number;
  steals: number;
}

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
  number: string;
  name: string;
  position: string;
  heightCm: number | null;
  country: string | null;
}

export interface ApiRoster {
  team: ApiTeam;
  coach: string | null;
  players: ApiPlayer[];
}
