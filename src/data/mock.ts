/**
 * Sample data for development. Teams are real club names (text only, no logos);
 * every score, player and article is made up.
 *
 * The rest of the app only talks to `DataSource` (see source.ts), so this file
 * can be swapped for a licensed data provider later without touching screens.
 */
import type {
  BoxScoreLine,
  Game,
  NewsArticle,
  Play,
  Player,
  Team,
} from "./types";

let seed = 20261117;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const ri = (a: number, b: number) => Math.floor(rnd() * (b - a + 1)) + a;
const pick = <T>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];

const CLUBS: [string, string, string, string, string][] = [
  ["RMB", "Real Madrid", "Madrid", "#e9e9ef", "#4b2d86"],
  ["BAR", "FC Barcelona", "Barcelona", "#a50044", "#004d98"],
  ["OLY", "Olympiacos", "Piräus", "#d0102a", "#7a0a19"],
  ["PAN", "Panathinaikos", "Athen", "#007a3d", "#004a25"],
  ["FEN", "Fenerbahçe", "Istanbul", "#13284f", "#f2c200"],
  ["EFS", "Anadolu Efes", "Istanbul", "#1b3d8f", "#0d2152"],
  ["MON", "AS Monaco", "Monaco", "#d4001f", "#7d0012"],
  ["BAY", "FC Bayern München", "München", "#dc052d", "#0066b2"],
  ["PAR", "Paris Basketball", "Paris", "#151515", "#e4002b"],
  ["ZAL", "Žalgiris", "Kaunas", "#00653a", "#00391f"],
  ["PTZ", "Partizan", "Belgrad", "#222222", "#666666"],
  ["CZV", "Crvena zvezda", "Belgrad", "#c8102e", "#1d1d1d"],
  ["MTA", "Maccabi Tel Aviv", "Tel Aviv", "#f6c700", "#0038a8"],
  ["HTA", "Hapoel Tel Aviv", "Tel Aviv", "#d50000", "#7f0000"],
  ["DUB", "Dubai Basketball", "Dubai", "#111111", "#b8945b"],
  ["MIL", "Olimpia Milano", "Mailand", "#e30613", "#8a0410"],
  ["VIR", "Virtus Bologna", "Bologna", "#1a1a1a", "#555555"],
  ["BKN", "Baskonia", "Vitoria", "#0d2d6c", "#b0122b"],
  ["VAL", "Valencia Basket", "Valencia", "#ef7d00", "#1b1b1b"],
  ["ASV", "ASVEL", "Lyon-Villeurbanne", "#00205b", "#6a0019"],
];

const FIRST = [
  "Luka",
  "Nikos",
  "Marko",
  "Jordan",
  "Mateo",
  "Andrés",
  "Kostas",
  "Tomas",
  "Elijah",
  "Dario",
  "Isaiah",
  "Mikel",
  "Jonas",
  "Filip",
  "Kevin",
  "Sasha",
  "Malik",
  "Ognjen",
  "Lorenzo",
  "Hugo",
  "Theo",
  "Bastien",
  "Emre",
  "Yam",
  "Rokas",
  "Leon",
  "Niels",
  "Darius",
];
const LAST = [
  "Petrović",
  "Mendez",
  "Kalaitzis",
  "Brooks",
  "Varga",
  "Okafor",
  "Lindqvist",
  "Sanz",
  "Dumont",
  "Rossi",
  "Hayes",
  "Yilmaz",
  "Novak",
  "Barros",
  "Kuzmić",
  "Weber",
  "Ferrand",
  "Adeyemi",
  "Ortiz",
  "Papas",
  "Jankauskas",
  "Levi",
  "Morales",
  "Kovač",
  "Bianchi",
  "Grant",
  "Mahler",
  "Stavros",
];
const POS: Player["position"][] = ["PG", "SG", "SF", "PF", "C"];

export const TEAMS: Team[] = CLUBS.map(([id, name, city, c1, c2]) => {
  const used = new Set<number>();
  const roster: Player[] = Array.from({ length: 10 }, (_, i) => {
    let n: number;
    do n = ri(0, 55);
    while (used.has(n));
    used.add(n);
    const starter = i < 5;
    return {
      number: n,
      name: `${pick(FIRST)} ${pick(LAST)}`,
      position: POS[i % 5],
      heightCm: ri(185, 214),
      pointsPerGame: +(rnd() * (starter ? 12 : 6) + (starter ? 6 : 2)).toFixed(
        1,
      ),
    };
  }).sort((a, b) => b.pointsPerGame - a.pointsPerGame);
  const wins = ri(3, 10);
  return {
    id,
    abbr: id,
    name,
    city,
    colors: [c1, c2],
    roster,
    wins,
    losses: 12 - wins,
    pointsFor: ri(940, 1060),
    pointsAgainst: ri(940, 1060),
    form: Array.from({ length: 5 }, () => rnd() > 0.45),
  };
});

const TIPS = ["18:00", "19:00", "20:00", "20:30", "20:45"];
const GAME_DAYS = [-3, -2, 0, 1, 3];

export const GAMES: Game[] = [];
for (const day of GAME_DAYS) {
  const pool = [...TEAMS].sort(() => rnd() - 0.5);
  for (let k = 0; k < 5; k++) {
    const home = pool[k * 2];
    const away = pool[k * 2 + 1];
    const g: Game = {
      id: `${day + 3}-${k}`,
      dayOffset: day,
      round: 13 + Math.floor((day + 3) / 3),
      home: home.id,
      away: away.id,
      tipOff: TIPS[k],
      arena: `${home.city} Arena`,
      status: "scheduled",
      quarters: [],
    };
    const fullGame = () =>
      [0, 1, 2, 3].map(() => [ri(14, 28), ri(14, 28)] as [number, number]);
    if (day < 0 || (day === 0 && k === 2)) {
      g.status = "final";
      g.quarters = fullGame();
      const [h, a] = totals(g);
      if (h === a) g.quarters[3][0] += 2;
    } else if (day === 0 && k < 2) {
      g.status = "live";
      g.period = k === 0 ? 3 : 2;
      g.clock = k === 0 ? "04:21" : "08:05";
      g.quarters = Array.from({ length: g.period }, (_, p) =>
        p < g.period! - 1
          ? ([ri(15, 27), ri(15, 27)] as [number, number])
          : ([ri(6, 14), ri(6, 14)] as [number, number]),
      );
    }
    GAMES.push(g);
  }
}

export function totals(g: Game): [number, number] {
  return g.quarters.reduce<[number, number]>(
    (s, q) => [s[0] + q[0], s[1] + q[1]],
    [0, 0],
  );
}

/** Box score scaled so that the players' points add up to the team total. */
export function makeBoxScore(
  team: Team,
  target: number,
  salt: number,
): BoxScoreLine[] {
  let s = salt * 7919 + target;
  const r = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  const rows = team.roster.slice(0, 9).map((player, i) => ({
    player,
    weight: player.pointsPerGame + r() * 4,
    minutes: i < 5 ? 24 + Math.floor(r() * 9) : 8 + Math.floor(r() * 13),
    rebounds: Math.floor(r() * (i > 3 ? 10 : 6)) + (i < 5 ? 2 : 0),
    assists: Math.floor(r() * (i < 2 ? 8 : 4)),
  }));
  const sum = rows.reduce((x, row) => x + row.weight, 0);
  let left = target;
  return rows.map((row, i) => {
    const points =
      i === rows.length - 1
        ? Math.max(0, left)
        : Math.round((row.weight / sum) * target);
    left -= points;
    return {
      player: row.player,
      minutes: row.minutes,
      rebounds: row.rebounds,
      assists: row.assists,
      points,
    };
  });
}

export const ACTIONS: [string, number][] = [
  ["Dreier", 3],
  ["Korbleger", 2],
  ["Mitteldistanz", 2],
  ["Dunk", 2],
  ["2 Freiwürfe", 2],
  ["Floater", 2],
];

export function surname(p: Player) {
  return p.name.split(" ").slice(1).join(" ");
}

/** Builds a plausible play-by-play log that matches the quarter scores. Newest first. */
export function makePlays(g: Game, teamOf: (id: string) => Team): Play[] {
  const plays: Play[] = [];
  const score: [number, number] = [0, 0];
  g.quarters.forEach((q, idx) => {
    const need: [number, number] = [q[0], q[1]];
    let minutes = 10;
    const step = 10 / Math.max(1, (q[0] + q[1]) / 2.2);
    while (need[0] > 0 || need[1] > 0) {
      const side: 0 | 1 =
        need[0] <= 0 ? 1 : need[1] <= 0 ? 0 : rnd() > 0.5 ? 1 : 0;
      let [what, pts] = pick(ACTIONS);
      if (pts > need[side]) {
        what = need[side] === 1 ? "Freiwurf" : "Korbleger";
        pts = need[side];
      }
      need[side] -= pts;
      score[side] += pts;
      minutes = Math.max(0, minutes - step);
      const team = teamOf(side === 0 ? g.home : g.away);
      plays.push({
        period: idx + 1,
        clock: formatClock(minutes * 60),
        side,
        text: `${surname(pick(team.roster.slice(0, 7)))} · ${what}`,
        score: [score[0], score[1]],
      });
    }
  });
  return plays.reverse();
}

export function formatClock(totalSeconds: number) {
  const t = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export { rnd, ri, pick };

export const NEWS: NewsArticle[] = [
  {
    id: "n1",
    tag: "Spielbericht",
    teams: ["OLY", "RMB"],
    title:
      "Piräus bebt: Olympiacos dreht 14-Punkte-Rückstand im Schlussviertel",
    source: "Hoopline Redaktion · vor 2 Std.",
  },
  {
    id: "n2",
    tag: "Transfer",
    teams: ["BAY"],
    title: "Bayern holt erfahrenen Center für die zweite Saisonhälfte",
    source: "Hoopline Redaktion · vor 4 Std.",
  },
  {
    id: "n3",
    tag: "Analyse",
    teams: ["PAN", "FEN"],
    title:
      "Warum die Defensive über den Titel entscheidet: drei Teams im Vergleich",
    source: "Hoopline Analyse · vor 6 Std.",
  },
  {
    id: "n4",
    tag: "Verletzung",
    teams: ["BAR"],
    title: "Barça-Spielmacher fällt zwei Wochen mit Knöchelverletzung aus",
    source: "Hoopline Redaktion · gestern",
  },
  {
    id: "n5",
    tag: "Spieltag",
    teams: ["ZAL", "MON", "PAR"],
    title: "Vorschau Runde 14: Fünf Spiele, auf die du achten solltest",
    source: "Hoopline Redaktion · gestern",
  },
  {
    id: "n6",
    tag: "Interview",
    teams: ["MTA"],
    title:
      "„Die Halle ist unser sechster Mann“: Coach über das Heimspiel-Comeback",
    source: "Hoopline Redaktion · vor 2 Tagen",
  },
  {
    id: "n7",
    tag: "Statistik",
    teams: ["EFS", "DUB"],
    title: "Die effizientesten Werfer der Saison in einer Grafik",
    source: "Hoopline Analyse · vor 3 Tagen",
  },
].map((n) => ({
  ...n,
  body:
    "Hier steht später der vollständige Artikel aus einer lizenzierten Nachrichtenquelle. " +
    "In der Entwicklungsversion zeigt dieser Bildschirm, wie eine Nachricht aufgebaut ist: Titel, Quelle, Bild und darunter die erwähnten Teams.",
}));
