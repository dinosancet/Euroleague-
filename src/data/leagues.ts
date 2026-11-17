/**
 * Leagues the app can show. Only the Euroleague has a data source so far;
 * the others appear in the picker as "bald" so the structure is ready.
 */
export interface League {
  id: string;
  name: string;
  short: string;
  available: boolean;
}

export const LEAGUES: League[] = [
  { id: "euroleague", name: "EuroLeague", short: "EL", available: true },
  { id: "eurocup", name: "EuroCup", short: "EC", available: false },
  { id: "nba", name: "NBA", short: "NBA", available: false },
  { id: "bbl", name: "Basketball-Bundesliga", short: "BBL", available: false },
];

export const leagueById = (id: string) =>
  LEAGUES.find((l) => l.id === id) ?? LEAGUES[0];
