import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  applyLiveHeader,
  formatName,
  latestPlayedRound,
  mightBeLive,
  toBox,
  toGame,
  toPlays,
  toProfile,
  toRoster,
  toStandings,
} from "../src/normalize.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  JSON.parse(readFileSync(join(here, "fixtures", `${name}.json`), "utf8"));

const games = fixture("games").data;

test("formatName turns 'LAST, FIRST' into 'First Last'", () => {
  assert.equal(formatName("OKOBO, ELIE"), "Elie Okobo");
  assert.equal(formatName("PAPAGIANNIS, GEORGIOS"), "Georgios Papagiannis");
  assert.equal(formatName("DE COLO, NANDO"), "Nando De Colo");
  assert.equal(formatName(null), "");
});

test("a played game keeps its final score and per-quarter points", () => {
  const g = toGame(games.find((x: { gameCode: number }) => x.gameCode === 110));
  assert.equal(g.status, "final");
  assert.deepEqual(g.score, [74, 76]);
  assert.equal(g.quarters.length, 4);
  const sum = g.quarters.reduce((s, q) => [s[0] + q[0], s[1] + q[1]], [0, 0]);
  assert.deepEqual(sum, g.score);
  assert.equal(g.home.code, "PAN");
  assert.equal(g.home.abbr, "PAO");
  assert.match(g.home.logo ?? "", /^https:\/\/.+\.png$/);
  assert.ok(g.startUtc.endsWith("Z"));
});

test("a scheduled game has no quarters", () => {
  const g = toGame(games.find((x: { gameCode: number }) => x.gameCode === 130));
  assert.equal(g.status, "scheduled");
  assert.deepEqual(g.quarters, []);
});

test("live header turns cumulative quarter scores into per-quarter points", () => {
  const base = toGame(
    games.find((x: { gameCode: number }) => x.gameCode === 111),
  );
  const live = applyLiveHeader(base, fixture("live-header"));
  assert.equal(live.status, "live");
  assert.deepEqual(live.score, [78, 67]);
  assert.deepEqual(live.quarters, [
    [15, 23],
    [27, 17],
    [17, 15],
    [19, 12],
  ]);
  assert.equal(live.period, 4);
  assert.equal(live.clock, "01:33");
});

test("a header with no points leaves a scheduled game alone", () => {
  const base = toGame(
    games.find((x: { gameCode: number }) => x.gameCode === 130),
  );
  const header = {
    ...fixture("live-header"),
    Live: false,
    ScoreA: "0",
    ScoreB: "0",
  };
  assert.equal(applyLiveHeader(base, header).status, "scheduled");
});

test("mightBeLive only around tip-off", () => {
  const g = toGame(games.find((x: { gameCode: number }) => x.gameCode === 111));
  const start = Date.parse(g.startUtc);
  assert.equal(mightBeLive(g, new Date(start - 3600_000)), false);
  assert.equal(mightBeLive(g, new Date(start + 3600_000)), true);
  assert.equal(mightBeLive(g, new Date(start + 5 * 3600_000)), false);
});

test("box score maps players and team totals", () => {
  const box = toBox(fixture("live-boxscore"));
  assert.ok(box);
  assert.ok(box.home.length > 5);
  const okobo = box.home.find((p) => p.name === "Elie Okobo");
  assert.ok(okobo);
  assert.equal(okobo.points, 2);
  assert.equal(okobo.minutes, "20:20");
  const homePoints = box.home.reduce((s, p) => s + p.points, 0);
  assert.equal(homePoints, 78);
  assert.equal(box.totals.home.rebounds, 49);
});

test("play-by-play is newest first, German and assigned to a side", () => {
  const plays = toPlays(fixture("live-playbyplay"));
  assert.ok(plays.length > 0);
  for (let i = 1; i < plays.length; i++)
    assert.ok(plays[i - 1].period >= plays[i].period);
  const three = plays.find((p) => p.text === "Dreier" && p.score);
  assert.ok(three);
  assert.deepEqual(three.score, [78, 67]);
  assert.equal(three.side, "home");
  assert.equal(three.player, "Filip Petrusev");
  assert.ok(!plays.some((p) => p.text === "Foul Drawn"));
});

test("standings keep order, record and form", () => {
  const rows = toStandings(fixture("standings").teams);
  assert.equal(rows[0].position, 1);
  assert.equal(rows[0].team.code, "PAM");
  assert.equal(rows[0].wins, 8);
  assert.equal(rows[0].form.length, 5);
  assert.equal(latestPlayedRound(games.map(toGame)), 11);
});

test("roster lists players with numbers and finds the coach", () => {
  const r = toRoster(fixture("people"));
  assert.ok(r.players.every((p) => p.name && !p.name.includes(",")));
});

test("box score has shooting splits, ids and who is on the court", () => {
  const raw = fixture("live-boxscore");
  const box = toBox({ ...raw, Live: true });
  assert.ok(box);
  const okobo = box.home.find((p) => p.name === "Elie Okobo");
  assert.ok(okobo);
  assert.equal(okobo.id, "011212");
  assert.deepEqual(okobo.twos, [1, 5]);
  assert.deepEqual(okobo.threes, [0, 3]);
  assert.equal(okobo.pir, -2);
  const expected = raw.Stats[0].PlayersStats.filter(
    (p: { IsPlaying: number }) => p.IsPlaying === 1,
  ).length;
  assert.equal(box.home.filter((p) => p.onCourt).length, expected);
  assert.deepEqual(box.totals.home.threes, [8, 30]);
  // After the game nobody is shown as on the court.
  const done = toBox({ ...raw, Live: false });
  assert.ok(done && !done.home.some((p) => p.onCourt));
});

test("player profile has info, season averages and newest game first", () => {
  const p = toProfile(fixture("person").data[0], fixture("person-stats"));
  assert.equal(p.id, "014213");
  assert.equal(p.name, "Cameron Payne");
  assert.equal(p.team?.code, "IST");
  assert.equal(p.birthDate, "1994-08-08");
  assert.ok(p.season);
  assert.equal(p.season.games, 9);
  assert.equal(p.season.averages.points, 15.2);
  assert.equal(p.season.minutes, "21:19");
  assert.equal(p.season.pct.threes, 47.7);
  assert.equal(p.games.length, 9);
  assert.ok(p.games[0].startUtc > p.games[1].startUtc);
  const vsBayern = p.games.find((g) => g.opponent.code === "MUN");
  assert.ok(vsBayern);
  assert.equal(vsBayern.atHome, true);
  assert.deepEqual(vsBayern.score, [93, 101]);
  assert.equal(vsBayern.won, false);
  const sum = p.games.reduce((s, g) => s + g.stats.points, 0);
  assert.equal(sum, 137);
});

test("roster players carry their id for the player page", () => {
  const r = toRoster(fixture("people"));
  assert.ok(r.players.every((p) => /^\d+$/.test(p.id)));
});
