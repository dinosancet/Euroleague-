import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  findTeams,
  mergeNews,
  newsId,
  parseRss,
  SOURCES,
  teaser,
  toNews,
} from "../src/news.ts";

const here = dirname(fileURLToPath(import.meta.url));
const xml = (name: string) =>
  readFileSync(join(here, "fixtures", `${name}.xml`), "utf8");

const [eurohoops, sportando] = SOURCES;
const eh = toNews(eurohoops, parseRss(xml("eurohoops")));
const sp = toNews(sportando, parseRss(xml("sportando")));

test("RSS items keep headline, link, date, picture and categories", () => {
  const items = parseRss(xml("eurohoops"));
  assert.equal(items.length, 4);
  assert.equal(
    items[0].title,
    "Carsen Edwards’ late surge sends Zalgiris into the record books",
  );
  assert.equal(
    items[0].image,
    "https://images.eurohoops.net/2026/11/edwards.jpg",
  );
  assert.deepEqual(items[0].categories, ["Euroleague", "Bayern Munich"]);
});

test("only a short teaser is kept, never the full article", () => {
  const first = eh[0];
  assert.equal(
    first.teaser,
    "Zalgiris beat Bayern in overtime behind a huge fourth quarter.",
  );
  assert.ok(!JSON.stringify(eh).includes("FULL ARTICLE TEXT"));
  const long = teaser(`<p>${"word ".repeat(200)}</p>`);
  assert.ok(long.length <= 241 && long.endsWith("…"));
});

test("items without a link are dropped", () => {
  assert.equal(eh.length, 3);
  assert.ok(eh.every((n) => n.url.startsWith("https://")));
});

test("clubs are found in headline, teaser and categories", () => {
  assert.deepEqual(eh[0].teams, ["MUN", "ZAL"]);
  assert.deepEqual(eh[1].teams, ["BAS", "TEL", "ULK"]);
  assert.deepEqual(findTeams("Oly wins instant classic, Virtus upsets PAO"), [
    "OLY",
    "PAN",
    "VIR",
  ]);
  // Word boundaries: "Olympic" is not Olympiacos, "Barcelonas" is not a club name.
  assert.deepEqual(findTeams("Olympic Games in Los Angeles"), []);
  assert.deepEqual(findTeams("Hapoel Tel Aviv beat Maccabi"), ["HTA", "TEL"]);
});

test("transfers and tags are detected from the headline", () => {
  assert.equal(eh[0].kind, "news");
  const tagFor = (title: string) =>
    toNews(eurohoops, [
      {
        title,
        link: "https://x.example/a",
        pubDate: "Tue, 17 Nov 2026 20:00:00 +0000",
        description: "",
        categories: [],
        image: null,
      },
    ])[0].tag;
  assert.equal(tagFor("Olympiacos stuns Maccabi in overtime"), "Spielbericht");
  assert.equal(
    tagFor("Bayern star out for six weeks with knee injury"),
    "Verletzung",
  );
  assert.equal(tagFor("Barcelona reportedly eyeing Partizan guard"), "Gerücht");
  assert.equal(tagFor("Fenerbahce extends contract of its captain"), "Vertrag");
  assert.equal(eh[1].kind, "transfer");
  assert.equal(eh[1].tag, "Transfer");
  assert.equal(eh[2].tag, "Auszeichnung");
});

test("Sportando keeps EuroLeague stories and moves of EuroLeague clubs only", () => {
  assert.deepEqual(
    sp.map((n) => n.title),
    [
      "Panathinaikos alleges racist abuse by one Virtus Bologna fan",
      "Real Madrid signs veteran center until the end of the season",
      "Carsen Edwards' late surge sends Zalgiris into the record books",
    ],
  );
  assert.equal(sp[1].kind, "transfer");
  assert.deepEqual(sp[1].teams, ["MAD"]);
});

test("merging sorts newest first, removes duplicates and marks top stories", () => {
  const all = mergeNews([eh, sp]);
  assert.equal(all.length, 5);
  const dates = all.map((n) => n.publishedUtc);
  assert.deepEqual(dates, [...dates].sort().reverse());
  // The same headline from two publishers appears once.
  assert.equal(all.filter((n) => /Carsen Edwards/.test(n.title)).length, 1);
  // Top: a news story (not a transfer) with a picture and a club.
  assert.deepEqual(
    all.filter((n) => n.top).map((n) => n.source),
    ["Eurohoops"],
  );
});

test("ids are stable and differ per link", () => {
  assert.equal(newsId("https://a.example/1"), newsId("https://a.example/1"));
  assert.notEqual(newsId("https://a.example/1"), newsId("https://a.example/2"));
});
