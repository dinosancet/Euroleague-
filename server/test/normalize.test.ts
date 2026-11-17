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
