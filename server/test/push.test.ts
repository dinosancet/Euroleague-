import assert from "node:assert/strict";
import { test } from "node:test";

import type { ApiGame } from "../../shared/api.ts";
import {
  deadTokens,
  dueEvents,
  messageFor,
  parseRegistration,
} from "../src/push.ts";

const team = (code: string, shortName: string) => ({
  code,
  abbr: code,
  name: shortName,
  shortName,
  logo: null,
});

const game = (patch: Partial<ApiGame>): ApiGame => ({
  code: 101,
  round: 12,
  startUtc: "2026-11-20T19:30:00Z",
  status: "scheduled",
  home: team("MUN", "Bayern"),
  away: team("PAN", "Panathinaikos"),
  score: [0, 0],
  quarters: [],
  ...patch,
});

const at = (iso: string) => new Date(iso);

test("tip-off push is due from 15 minutes before the start", () => {
  const g = game({});
  assert.deepEqual(dueEvents([g], at("2026-11-20T19:14:00Z")), []);
  const due = dueEvents([g], at("2026-11-20T19:15:00Z"));
  assert.equal(due.length, 1);
  assert.equal(due[0].key, "tip:101");
  assert.equal(dueEvents([g], at("2026-11-20T19:36:00Z")).length, 0);
});

test("final score push only for finished games of the last hours", () => {
  const g = game({
    status: "final",
    score: [85, 79],
    quarters: [
      [20, 18],
      [22, 20],
      [21, 21],
      [22, 20],
    ],
  });
  const due = dueEvents([g], at("2026-11-20T21:20:00Z"));
  assert.deepEqual(
    due.map((e) => e.key),
    ["final:101"],
  );
  assert.equal(dueEvents([g], at("2026-11-21T03:00:00Z")).length, 0);
  // A feed glitch mid-game (only two quarters) is not a final score.
  const half = {
    ...g,
    quarters: g.quarters.slice(0, 2),
    score: [42, 38] as [number, number],
  };
  assert.equal(dueEvents([half], at("2026-11-20T20:30:00Z")).length, 0);
});

test("messages are German and use the phone's time zone", () => {
  const g = game({});
  const tip = messageFor(
    { key: "tip:101", kind: "tipOff", game: g },
    "Europe/Berlin",
  );
  assert.equal(tip.body, "Bayern gegen Panathinaikos, Tip-off um 20:30 Uhr.");
  const fin = messageFor(
    {
      key: "final:101",
      kind: "finalScore",
      game: game({
        status: "final",
        score: [90, 92],
        quarters: [
          [1, 1],
          [1, 1],
          [1, 1],
          [1, 1],
          [9, 11],
        ],
      }),
    },
    "Europe/Berlin",
  );
  assert.equal(fin.title, "Endstand: Bayern 90:92 Panathinaikos");
  assert.match(fin.body, /^Sieg für Panathinaikos nach Verlängerung\./);
});

test("registration is validated and cleaned", () => {
  assert.equal(parseRegistration({ token: "nope", teams: ["MUN"] }), null);
  const r = parseRegistration({
    token: "ExponentPushToken[abcdefghijk123]",
    teams: ["MUN", "MUN", "bad team", 5],
    tipOff: true,
    finalScore: "yes",
    timeZone: "Not/AZone",
  });
  assert.deepEqual(r, {
    token: "ExponentPushToken[abcdefghijk123]",
    teams: ["MUN"],
    tipOff: true,
    finalScore: false,
    timeZone: "Europe/Berlin",
  });
});

test("tokens of uninstalled apps are found in Expo's answer", () => {
  assert.deepEqual(
    deadTokens(
      ["a", "b", "c"],
      [
        { status: "ok" },
        { status: "error", details: { error: "DeviceNotRegistered" } },
        { status: "error", details: { error: "MessageRateExceeded" } },
      ],
    ),
    ["b"],
  );
});
