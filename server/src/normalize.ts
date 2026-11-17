/**
 * Pure functions that turn Euroleague API responses into the app's contract
 * (shared/api.ts). No network access here, so everything is testable with
 * saved responses (see server/test).
 */
import type {
  ApiGame,
  ApiGameDetail,
  ApiPlay,
  ApiPlayer,
  ApiPlayerLine,
  ApiStanding,
  ApiTeam,
  ApiTeamTotals,
} from "../../shared/api";

/* ---------- upstream shapes (only the fields we read) ---------- */

export interface ElClub {
  code: string;
  tvCode: string;
  name: string;
  abbreviatedName: string;
  images?: { crest?: string | null } | null;
}

export interface ElPartials {
  partials1: number;
  partials2: number;
  partials3: number;
  partials4: number;
  extraPeriods?: Record<string, number>;
}

export interface ElGame {
  gameCode: number;
  round: number;
  played: boolean;
  utcDate: string;
  local: { club: ElClub; score: number; partials: ElPartials };
  road: { club: ElClub; score: number; partials: ElPartials };
  venue?: { name?: string } | null;
}

export interface ElLiveHeader {
  Live: boolean;
  ScoreA: string;
  ScoreB: string;
  Quarter: string;
  RemainingPartialTime: string;
  CodeTeamA: string;
  CodeTeamB: string;
  [key: string]: unknown;
}

export interface ElBoxPlayer {
  IsStarter: number;
  Dorsal: string;
  Player: string;
  Minutes: string;
  Points: number;
  TotalRebounds: number;
  Assistances: number;
  Plusminus: number;
}

export interface ElBoxTotals {
  TotalRebounds: number;
  Assistances: number;
  FieldGoalsMade3: number;
  Turnovers: number;
  Steals: number;
}

export interface ElBoxscore {
  ByQuarter: Record<string, string | number>[];
  Stats: { Team: string; PlayersStats: ElBoxPlayer[]; totr: ElBoxTotals }[];
}

export interface ElPlay {
  NUMBEROFPLAY: number;
  CODETEAM: string;
  PLAYER: string | null;
  PLAYTYPE: string;
  MARKERTIME: string;
  POINTS_A: number | null;
  POINTS_B: number | null;
  PLAYINFO: string;
}

export interface ElPlayByPlay {
  CodeTeamA: string;
  CodeTeamB: string;
  FirstQuarter: ElPlay[];
  SecondQuarter: ElPlay[];
  ThirdQuarter: ElPlay[];
  ForthQuarter: ElPlay[];
  ExtraTime: ElPlay[];
}

export interface ElStandingRow {
  position: number;
  gamesWon: number;
  gamesLost: number;
  pointsFor: number;
  pointsAgainst: number;
  last5Form: string[];
  club: ElClub;
}

export interface ElPerson {
  type: string;
  dorsal: string | null;
  positionName: string | null;
  person: {
    name: string;
    height: number | null;
    country?: { name: string } | null;
  };
}

/* ---------- helpers ---------- */

/** "OKOBO, ELIE" -> "Elie Okobo" */
export function formatName(raw: string | null | undefined): string {
  if (!raw) return "";
  const [last, first] = raw.split(",").map((s) => s.trim());
  const title = (s: string) =>
    s
      .toLowerCase()
      .replace(
        /(^|[\s'-])(\p{L})/gu,
        (_, sep: string, ch: string) => sep + ch.toUpperCase(),
      );
  return first ? `${title(first)} ${title(last)}` : title(last);
}

export function toTeam(c: ElClub): ApiTeam {
  return {
    code: c.code,
    abbr: c.tvCode.slice(0, 3),
    name: c.name,
    shortName: c.abbreviatedName,
    logo: c.images?.crest || null,
  };
}

function partialsToQuarters(
  home: ElPartials,
  away: ElPartials,
): [number, number][] {
  const q: [number, number][] = [
    [home.partials1, away.partials1],
    [home.partials2, away.partials2],
    [home.partials3, away.partials3],
    [home.partials4, away.partials4],
  ];
  const extraKeys = Object.keys(home.extraPeriods ?? {}).sort();
  for (const k of extraKeys)
    q.push([home.extraPeriods?.[k] ?? 0, away.extraPeriods?.[k] ?? 0]);
  // Drop trailing periods nobody has scored in yet.
  while (q.length && q[q.length - 1][0] === 0 && q[q.length - 1][1] === 0)
    q.pop();
  return q;
}

/* ---------- games ---------- */

export function toGame(g: ElGame): ApiGame {
  const score: [number, number] = [g.local.score, g.road.score];
  return {
    code: g.gameCode,
    round: g.round,
    startUtc: g.utcDate.endsWith("Z") ? g.utcDate : `${g.utcDate}Z`,
    status: g.played ? "final" : "scheduled",
    home: toTeam(g.local.club),
    away: toTeam(g.road.club),
    score,
    quarters: g.played
      ? partialsToQuarters(g.local.partials, g.road.partials)
      : [],
    venue: g.venue?.name ?? undefined,
  };
}

/**
 * The main API only updates scores after a game. While a game might be running
 * we overlay the live feed's header.
 */
export function applyLiveHeader(game: ApiGame, h: ElLiveHeader): ApiGame {
  const home = Number(h.ScoreA) || 0;
  const away = Number(h.ScoreB) || 0;
  const started = home + away > 0 || h.Live;
  if (!started) return game;
  const quarters: [number, number][] = [];
  let prev: [number, number] = [0, 0];
  for (const n of [1, 2, 3, 4]) {
    const a = Number(h[`ScoreQuarter${n}A`] ?? 0);
    const b = Number(h[`ScoreQuarter${n}B`] ?? 0);
    // The header carries cumulative scores per quarter end; turn them into per-quarter points.
    if (n > Number(h.Quarter || 0)) break;
    quarters.push([a - prev[0], b - prev[1]]);
    prev = [a, b];
  }
  const extraA = Number(h.ScoreExtraTimeA ?? 0);
  const extraB = Number(h.ScoreExtraTimeB ?? 0);
  if (extraA || extraB) quarters.push([extraA, extraB]);
  return {
    ...game,
    status: h.Live ? "live" : "final",
    score: [home, away],
    quarters: quarters.length ? quarters : game.quarters,
    period: h.Live ? Number(h.Quarter) || undefined : undefined,
    clock: h.Live ? h.RemainingPartialTime || undefined : undefined,
  };
}

/** Whether a not-yet-final game is close enough to its start to be worth checking live. */
export function mightBeLive(game: ApiGame, now: Date): boolean {
  if (game.status === "final") return false;
  const start = Date.parse(game.startUtc);
  return (
    now.getTime() >= start - 10 * 60_000 &&
    now.getTime() <= start + 4 * 3600_000
  );
}

/* ---------- box score ---------- */

function toLine(p: ElBoxPlayer): ApiPlayerLine {
  const played = /^\d+:\d+$/.test(p.Minutes ?? "");
  return {
    number: p.Dorsal,
    name: formatName(p.Player),
    starter: p.IsStarter === 1,
    minutes: played ? p.Minutes : "",
    points: p.Points ?? 0,
    rebounds: p.TotalRebounds ?? 0,
    assists: p.Assistances ?? 0,
    plusMinus: p.Plusminus ?? 0,
  };
}

function toTotals(t: ElBoxTotals): ApiTeamTotals {
  return {
    rebounds: t.TotalRebounds ?? 0,
    assists: t.Assistances ?? 0,
    threesMade: t.FieldGoalsMade3 ?? 0,
    turnovers: t.Turnovers ?? 0,
    steals: t.Steals ?? 0,
  };
}

export function toBox(b: ElBoxscore): ApiGameDetail["box"] {
  if (!b?.Stats || b.Stats.length < 2) return null;
  const [home, away] = b.Stats;
  return {
    home: home.PlayersStats.map(toLine),
    away: away.PlayersStats.map(toLine),
    totals: { home: toTotals(home.totr), away: toTotals(away.totr) },
  };
}

/* ---------- play-by-play ---------- */

const PLAY_TEXT: Record<string, string> = {
  "2FGM": "Zweier",
  "3FGM": "Dreier",
  FTM: "Freiwurf",
  "2FGA": "Zweier daneben",
  "3FGA": "Dreier daneben",
  FTA: "Freiwurf daneben",
  D: "Defensivrebound",
  O: "Offensivrebound",
  AS: "Assist",
  TO: "Ballverlust",
  ST: "Steal",
  FV: "Block",
  CM: "Foul",
  CMU: "Unsportliches Foul",
  CMT: "Technisches Foul",
  CMD: "Disqualifizierendes Foul",
  TOUT: "Auszeit",
  TOUT_TV: "TV-Auszeit",
  BP: "Viertel beginnt",
  EP: "Viertel endet",
  EG: "Spielende",
  JB: "Sprungball",
};

/** Plays that add noise rather than information in a feed. */
const SKIP = new Set(["IN", "OUT", "RV", "AG", "C", "B"]);

export function toPlays(p: ElPlayByPlay): ApiPlay[] {
  const homeCode = p.CodeTeamA?.trim();
  const periods: ElPlay[][] = [
    p.FirstQuarter,
    p.SecondQuarter,
    p.ThirdQuarter,
    p.ForthQuarter,
    p.ExtraTime,
  ];
  const plays: ApiPlay[] = [];
  periods.forEach((list, idx) => {
    for (const e of list ?? []) {
      const type = e.PLAYTYPE?.trim();
      if (!type || SKIP.has(type)) continue;
      const team = e.CODETEAM?.trim();
      const scored = e.POINTS_A != null && e.POINTS_B != null;
      plays.push({
        id: e.NUMBEROFPLAY,
        period: idx + 1,
        clock: e.MARKERTIME?.trim() ?? "",
        side: team ? (team === homeCode ? "home" : "away") : null,
        player: e.PLAYER ? formatName(e.PLAYER) : null,
        text:
          PLAY_TEXT[type] ?? e.PLAYINFO?.replace(/\s*\(.*\)\s*$/, "") ?? type,
        score: scored
          ? [e.POINTS_A as number, e.POINTS_B as number]
          : undefined,
      });
    }
  });
  return plays.reverse();
}

/* ---------- standings and rosters ---------- */

export function toStandings(rows: ElStandingRow[]): ApiStanding[] {
  return rows.map((r) => ({
    position: r.position,
    team: toTeam(r.club),
    wins: r.gamesWon,
    losses: r.gamesLost,
    pointsFor: r.pointsFor,
    pointsAgainst: r.pointsAgainst,
    form: (r.last5Form ?? []).map((f) => f === "W"),
  }));
}

/** Latest round in which at least one game has been played. */
export function latestPlayedRound(games: ApiGame[]): number {
  return games
    .filter((g) => g.status === "final")
    .reduce((m, g) => Math.max(m, g.round), 1);
}

export function toRoster(people: ElPerson[]): {
  coach: string | null;
  players: ApiPlayer[];
} {
  const coach = people.find((p) => p.type === "E");
  const players = people
    .filter((p) => p.type === "J")
    .map((p) => ({
      number: p.dorsal ?? "",
      name: formatName(p.person.name),
      position: p.positionName ?? "",
      heightCm: p.person.height || null,
      country: p.person.country?.name ?? null,
    }))
    .sort((a, b) => Number(a.number) - Number(b.number));
  return { coach: coach ? formatName(coach.person.name) : null, players };
}
