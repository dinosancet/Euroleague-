/**
 * Keeps the phones that want pushes and sends them through Expo's free push
 * service (https://docs.expo.dev/push-notifications/sending-notifications/).
 *
 * One SQLite-backed Durable Object (free on the Cloudflare Workers Free plan)
 * holds two tables: the registered phones and the pushes already sent, so a
 * game never triggers the same push twice.
 */
import { DurableObject } from "cloudflare:workers";

import type { ApiPushData, ApiPushRegistration } from "../../shared/api";
import {
  deadTokens,
  messageFor,
  TEST_MESSAGE,
  type ExpoTicket,
  type PushEvent,
  type PushMessage,
} from "./push";

const EXPO_SEND = "https://exp.host/--/api/v2/push/send";
/** Expo accepts at most 100 messages per request. */
const BATCH = 100;

interface ExpoMessage extends PushMessage {
  to: string;
  sound: "default";
  data: ApiPushData;
  channelId?: string;
}

export class PushStore extends DurableObject {
  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.sql.exec(`CREATE TABLE IF NOT EXISTS devices (
        token TEXT PRIMARY KEY,
        teams TEXT NOT NULL,
        tip INTEGER NOT NULL,
        final INTEGER NOT NULL,
        tz TEXT NOT NULL,
        updated INTEGER NOT NULL,
        last_test INTEGER NOT NULL DEFAULT 0
      )`);
      this.sql.exec(`CREATE TABLE IF NOT EXISTS sent (
        key TEXT PRIMARY KEY,
        at INTEGER NOT NULL
      )`);
    });
  }

  private get sql() {
    return this.ctx.storage.sql;
  }

  /** Saves what one phone wants; with no teams or nothing switched on it is removed. */
  register(r: ApiPushRegistration): { active: boolean } {
    if (!r.teams.length || (!r.tipOff && !r.finalScore)) {
      this.unregister(r.token);
      return { active: false };
    }
    this.sql.exec(
      `INSERT INTO devices (token, teams, tip, final, tz, updated)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(token) DO UPDATE SET teams = excluded.teams,
         tip = excluded.tip, final = excluded.final, tz = excluded.tz,
         updated = excluded.updated`,
      r.token,
      `,${r.teams.join(",")},`,
      r.tipOff ? 1 : 0,
      r.finalScore ? 1 : 0,
      r.timeZone,
      Date.now(),
    );
    return { active: true };
  }

  unregister(token: string) {
    this.sql.exec("DELETE FROM devices WHERE token = ?", token);
  }

  hasDevices(): boolean {
    return this.sql.exec("SELECT 1 FROM devices LIMIT 1").toArray().length > 0;
  }

  /** Sends a test push to one phone, at most once a minute. */
  async test(token: string): Promise<"sent" | "wait" | "failed"> {
    const row = this.sql
      .exec<{
        last_test: number;
      }>("SELECT last_test FROM devices WHERE token = ?", token)
      .toArray()[0];
    if (row && Date.now() - row.last_test < 60_000) return "wait";
    if (row)
      this.sql.exec(
        "UPDATE devices SET last_test = ? WHERE token = ?",
        Date.now(),
        token,
      );
    const [ticket] = await this.send([
      { to: token, sound: "default", data: {}, ...TEST_MESSAGE },
    ]);
    return ticket?.status === "ok" ? "sent" : "failed";
  }

  /** Pushes every due event that has not gone out yet; returns how many pushes were sent. */
  async notify(events: PushEvent[]): Promise<number> {
    const now = Date.now();
    this.sql.exec("DELETE FROM sent WHERE at < ?", now - 3 * 86400_000);
    const messages: ExpoMessage[] = [];
    for (const ev of events) {
      // Mark first: a crash later means one missed push, never a duplicate.
      const fresh = this.sql
        .exec(
          "INSERT INTO sent (key, at) VALUES (?, ?) ON CONFLICT(key) DO NOTHING RETURNING key",
          ev.key,
          now,
        )
        .toArray();
      if (!fresh.length) continue;
      const column = ev.kind === "tipOff" ? "tip" : "final";
      const rows = this.sql
        .exec<{ token: string; tz: string }>(
          `SELECT token, tz FROM devices WHERE ${column} = 1
           AND (teams LIKE ? OR teams LIKE ?)`,
          `%,${ev.game.home.code},%`,
          `%,${ev.game.away.code},%`,
        )
        .toArray();
      for (const { token, tz } of rows)
        messages.push({
          to: token,
          sound: "default",
          data: { gameCode: ev.game.code },
          ...messageFor(ev, tz),
        });
    }
    if (messages.length) await this.send(messages);
    return messages.length;
  }

  private async send(messages: ExpoMessage[]): Promise<ExpoTicket[]> {
    const tickets: ExpoTicket[] = [];
    for (let i = 0; i < messages.length; i += BATCH) {
      const batch = messages.slice(i, i + BATCH);
      let got: ExpoTicket[] = [];
      try {
        const res = await fetch(EXPO_SEND, {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify(batch),
        });
        const body = (await res.json().catch(() => null)) as {
          data?: ExpoTicket[];
        } | null;
        got = body?.data ?? [];
      } catch {
        got = [];
      }
      for (const t of deadTokens(
        batch.map((m) => m.to),
        got,
      ))
        this.unregister(t);
      tickets.push(
        ...batch.map((_, j) => got[j] ?? { status: "error" as const }),
      );
    }
    return tickets;
  }
}
