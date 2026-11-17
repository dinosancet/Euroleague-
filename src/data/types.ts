export type TeamId = string;

export interface Player {
  number: number;
  name: string;
  position: "PG" | "SG" | "SF" | "PF" | "C";
  heightCm: number;
  pointsPerGame: number;
}

export interface Team {
  id: TeamId;
  abbr: string;
  name: string;
  city: string;
  /** Two brand-neutral colours used for the monogram badge (no club logos until licensed). */
  colors: [string, string];
  roster: Player[];
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  /** Last five results, oldest first. true = win. */
  form: boolean[];
}

export type GameStatus = "scheduled" | "live" | "final";

export interface Game {
  id: string;
  /** Day offset relative to "today" in the sample data. */
  dayOffset: number;
  round: number;
  home: TeamId;
  away: TeamId;
  tipOff: string;
  arena: string;
  status: GameStatus;
  period?: number;
  clock?: string;
  /** Points per quarter: [home, away]. */
  quarters: [number, number][];
}

export interface BoxScoreLine {
  player: Player;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
}

export interface Play {
  period: number;
  clock: string;
  side: 0 | 1;
  text: string;
  score: [number, number];
}

export interface NewsArticle {
  id: string;
  tag: string;
  title: string;
  source: string;
  teams: TeamId[];
  body: string;
}
