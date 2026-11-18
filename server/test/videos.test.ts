import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import type { ApiGame, ApiTeam } from "../../shared/api.ts";
import {
  findGame,
  mergeVideos,
  parseFeed,
  readTitle,
  toVideos,
  VIDEO_SOURCES,
} from "../src/videos.ts";

const here = dirname(fileURLToPath(import.meta.url));
const xml = readFileSync(join(here, "fixtures", "youtube.xml"), "utf8");

const team = (code: string): ApiTeam => ({
  code,
  abbr: code,
  name: code,
  shortName: code,
  logo: null,
});
const game = (
  code: number,
  round: number,
  home: string,
  away: string,
  startUtc: string,
  status: ApiGame["status"] = "final",
): ApiGame => ({
  code,
  round,
  startUtc,
  status,
  home: team(home),
  away: team(away),
  score: [80, 75],
  quarters: [],
});

const schedule = [
  game(31, 4, "ULK", "DUB", "2026-10-09T17:45:00Z"),
  game(25, 3, "MIL", "MUN", "2026-10-03T18:30:00Z"),
  game(140, 17, "DUB", "ULK", "2027-01-10T18:00:00Z", "scheduled"),
];

test("feed entries keep id, title, link, date, thumbnail and views", () => {
  const e = parseFeed(xml);
  assert.equal(e.length, 6);
  assert.deepEqual(e[0], {
    id: "aaaaaaaaaa1",
    title:
      "Desert Storm | Fenerbahce - Dubai | R4 BASKETBALL HIGHLIGHTS 2026-27",
    link: "https://www.youtube.com/watch?v=aaaaaaaaaa1",
    published: "2026-10-10T08:00:12+00:00",
    thumbnail: "https://i2.ytimg.com/vi/aaaaaaaaaa1/hqdefault.jpg",
    views: 48211,
  });
  assert.equal(
    e[4].title,
    "Real Madrid & Sergio Scariolo talk after the win | Press Conference",
  );
  assert.equal(e[4].views, null);
});

test("titles: game highlights give teams in order, round and a headline", () => {
  assert.deepEqual(
    readTitle(
      "Desert Storm | Fenerbahce - Dubai | R4 BASKETBALL HIGHLIGHTS 2025-26",
    ),
    {
      kind: "game",
      teams: ["ULK", "DUB"],
      round: 4,
      headline: "Desert Storm",
      top: null,
    },
  );
  const p = readTitle(
    "Late Run Changed Everything | Fenerbahçe - Olympiacos | R20 BASKETBALL HIGHLIGHTS 2025-26",
  );
  assert.deepEqual([p.kind, p.teams, p.round], ["game", ["ULK", "OLY"], 20]);
  // No hook: the match-up becomes the headline.
  assert.equal(
    readTitle("Real Madrid - Barcelona | R9 BASKETBALL HIGHLIGHTS 2026-27")
      .headline,
    "Real Madrid - Barcelona",
  );
});

test("titles: Top 10 compilations", () => {
  const a = readTitle(
    "Top 10 Plays | SALVATION LATE AND THUNDER AT THE FINISH | ROUND 26 | EuroLeague Basketball 2025-26",
  );
  assert.deepEqual(a, {
    kind: "plays",
    teams: [],
    round: 26,
    headline: "Salvation Late And Thunder At The Finish",
    top: 10,
  });
  const b = readTitle(
    "Top 10 Plays | RS Round 3 That HAD IT ALL | EUROLEAGUE BASKETBALL 2025-26",
  );
  assert.equal(b.headline, "That HAD IT ALL");
  assert.equal(b.round, 3);
  assert.equal(
    readTitle(
      "TOP 10 Plays | | The Round of GIANTS | RS Round 5 | EUROLEAGUE BASKETBALL 2025-26",
    ).headline,
    "The Round of GIANTS",
  );
});

test("games are found by teams and round, never a future game", () => {
  assert.equal(
    findGame(["ULK", "DUB"], 4, "2026-10-10T08:00:00Z", schedule),
    31,
  );
  // Teams swapped in the title still match.
  assert.equal(
    findGame(["DUB", "ULK"], null, "2026-10-10T08:00:00Z", schedule),
    31,
  );
  // The return game has not been played yet.
  assert.equal(
    findGame(["DUB", "ULK"], 17, "2026-10-10T08:00:00Z", schedule),
    31,
  );
  assert.equal(
    findGame(["MAD", "BAR"], 4, "2026-10-10T08:00:00Z", schedule),
    null,
  );
  assert.equal(findGame(["MAD"], 4, "2026-10-10T08:00:00Z", schedule), null);
});

test("feed to videos: kinds, tags, links, shorts and game links", () => {
  const v = toVideos(VIDEO_SOURCES[0], parseFeed(xml), schedule);
  assert.equal(v.length, 5, "entry without id is dropped");
  const [desert, top10, short, milan, presser] = v;

  assert.equal(desert.kind, "game");
  assert.equal(desert.tag, "Spiel-Highlights");
  assert.equal(desert.headline, "Desert Storm");
  assert.equal(desert.gameCode, 31);
  assert.equal(desert.url, "https://www.youtube.com/watch?v=aaaaaaaaaa1");
  assert.equal(desert.publishedUtc, "2026-10-10T08:00:12.000Z");
  assert.equal(desert.channel, "EuroLeague");

  assert.equal(top10.kind, "plays");
  assert.equal(top10.tag, "Top 10");
  assert.equal(top10.gameCode, null);

  assert.equal(short.short, true);
  assert.equal(short.tag, "Short");
  assert.equal(short.url, "https://www.youtube.com/shorts/cccccccccc3");

  assert.deepEqual(milan.teams, ["MIL", "MUN"]);
  assert.equal(milan.gameCode, 25);

  assert.equal(presser.tag, "Interview");
  assert.deepEqual(presser.teams, ["MAD"]);
  assert.equal(
    presser.thumbnail,
    "https://i.ytimg.com/vi/eeeeeeeeee5/hqdefault.jpg",
    "missing thumbnail is built from the id",
  );
});

test("merging keeps the newest copy of each video, newest first", () => {
  const v = toVideos(VIDEO_SOURCES[0], parseFeed(xml), schedule);
  const older = v.map((x) => ({ ...x, views: 1 }));
  const merged = mergeVideos([v, older]);
  assert.equal(merged.length, 5);
  assert.equal(merged[0].id, "cccccccccc3");
  assert.equal(merged.find((x) => x.id === "aaaaaaaaaa1")?.views, 48211);
});
