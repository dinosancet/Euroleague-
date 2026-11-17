/**
 * Hoopline API: a small Cloudflare Worker that sits between the app and the
 * Euroleague data feeds. It normalises the data (see normalize.ts) and caches
 * it, so the upstream is called once per interval no matter how many phones
 * are open.
 *
 * Routes (all GET, JSON):
 *   /v1/games              season schedule with live scores
 *   /v1/games/:code        one game with box score and play-by-play
 *   /v1/standings          table after the latest played round
 *   /v1/teams/:code        roster of one club
 */
import type {
  ApiGame,
  ApiGameDetail,
  ApiRoster,
  ApiStandings,
} from "../../shared/api";
import {
  applyLiveHeader,
  latestPlayedRound,
  mightBeLive,
  toBox,
  toGame,
  toPlays,
  toRoster,
  toStandings,
  toTeam,
  type ElBoxscore,
  type ElClub,
  type ElGame,
  type ElLiveHeader,
  type ElPerson,
  type ElPlayByPlay,
  type ElStandingRow,
} from "./normalize";

export interface Env {
  /** Season code, e.g. "E2026". */
  SEASON: string;
  /** Competition code: "E" = EuroLeague. */
  COMPETITION: string;
}

const API = "https://api-live.euroleague.net";
const LIVE = "https://live.euroleague.net/api";

/** Seconds each kind of data is cached for. */
const TTL = {
  live: 15,
  schedule: 60,
  final: 6 * 3600,
  standings: 300,
  roster: 12 * 3600,
};

/* ---------- caching ---------- */

const memory = new Map<string, { until: number; value: unknown }>();

/**
 * Two layers: an in-memory map for this worker instance and the Cloudflare
 * edge cache shared by instances in the same location.
 */
async function cached<T>(
  key: string,
  ttl: number,
  load: () => Promise<T>,
): Promise<T> {
  const hit = memory.get(key);
  if (hit && hit.until > Date.now()) return hit.value as T;

  const cache =
    typeof caches !== "undefined"
      ? (caches as unknown as { default: Cache }).default
      : null;
  const cacheKey = new Request(`https://cache.hoopline/${key}`);
  if (cache) {
    const res = await cache.match(cacheKey);
    if (res) {
      const value = (await res.json()) as T;
      memory.set(key, { until: Date.now() + ttl * 1000, value });
      return value;
    }
  }

  const value = await load();
  memory.set(key, { until: Date.now() + ttl * 1000, value });
  if (cache) {
    await cache.put(
      cacheKey,
      new Response(JSON.stringify(value), {
        headers: { "cache-control": `max-age=${ttl}` },
      }),
    );
  }
  return value;
}

async function getJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { accept: "application/json" } });
  } catch (e) {
    throw new Upstream(
      `network error for ${new URL(url).pathname}: ${String(e)}`,
    );
  }
  if (!res.ok)
    throw new Upstream(`${res.status} from ${new URL(url).pathname}`);
  const text = await res.text();
  if (!text.trim())
    throw new Upstream(`empty response from ${new URL(url).pathname}`);
  return JSON.parse(text) as T;
}

class Upstream extends Error {}

/* ---------- data loaders ---------- */

function seasonPath(env: Env) {
  return `competitions/${env.COMPETITION}/seasons/${env.SEASON}`;
}

async function liveHeader(
  env: Env,
  code: number,
): Promise<ElLiveHeader | null> {
  try {
    return await getJson<ElLiveHeader>(
      `${LIVE}/Header?gamecode=${code}&seasoncode=${env.SEASON}`,
    );
  } catch {
    return null;
  }
}

async function games(env: Env): Promise<ApiGame[]> {
  const list = await cached(`games:${env.SEASON}`, TTL.schedule, async () => {
    const res = await getJson<{ data: ElGame[] }>(
      `${API}/v2/${seasonPath(env)}/games`,
    );
    return res.data
      .map(toGame)
      .sort((a, b) => a.startUtc.localeCompare(b.startUtc) || a.code - b.code);
  });
  const now = new Date();
  return Promise.all(
    list.map(async (g) => {
      if (!mightBeLive(g, now)) return g;
      const h = await cached(`header:${env.SEASON}:${g.code}`, TTL.live, () =>
        liveHeader(env, g.code),
      );
      return h ? applyLiveHeader(g, h) : g;
    }),
  );
}

async function gameDetail(
  env: Env,
  code: number,
): Promise<ApiGameDetail | null> {
  const game = (await games(env)).find((g) => g.code === code);
  if (!game) return null;
  if (game.status === "scheduled") return { game, box: null, plays: [] };
  const ttl = game.status === "live" ? TTL.live : TTL.final;
  const [box, plays] = await Promise.all([
    cached(`box:${env.SEASON}:${code}:${game.status}`, ttl, async () =>
      toBox(
        await getJson<ElBoxscore>(
          `${LIVE}/Boxscore?gamecode=${code}&seasoncode=${env.SEASON}`,
        ),
      ),
    ).catch(() => null),
    cached(`pbp:${env.SEASON}:${code}:${game.status}`, ttl, async () =>
      toPlays(
        await getJson<ElPlayByPlay>(
          `${LIVE}/PlaybyPlay?gamecode=${code}&seasoncode=${env.SEASON}`,
        ),
      ),
    ).catch(() => []),
  ]);
  return { game, box, plays };
}

async function standings(env: Env): Promise<ApiStandings> {
  const round = latestPlayedRound(await games(env));
  return cached(`standings:${env.SEASON}:${round}`, TTL.standings, async () => {
    const res = await getJson<{ teams: ElStandingRow[] }>(
      `${API}/v3/${seasonPath(env)}/rounds/${round}/basicstandings`,
    );
    return { round, rows: toStandings(res.teams) };
  });
}

async function roster(env: Env, code: string): Promise<ApiRoster | null> {
  return cached(`roster:${env.SEASON}:${code}`, TTL.roster, async () => {
    const club = await getJson<ElClub>(
      `${API}/v2/${seasonPath(env)}/clubs/${code}`,
    ).catch(() => null);
    if (!club) return null;
    const people = await getJson<ElPerson[]>(
      `${API}/v2/${seasonPath(env)}/clubs/${code}/people`,
    );
    return { team: toTeam(club), ...toRoster(people) };
  });
}

/* ---------- routing ---------- */

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200, maxAge = 10): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": `max-age=${maxAge}`,
      ...CORS,
    },
  });
}

export async function handle(req: Request, env: Env): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "GET")
    return json({ error: "Nur GET wird unterstützt." }, 405);

  const path = new URL(req.url).pathname.replace(/\/+$/, "");
  try {
    if (path === "/v1/games") return json(await games(env));
    let m = path.match(/^\/v1\/games\/(\d+)$/);
    if (m) {
      const detail = await gameDetail(env, Number(m[1]));
      return detail
        ? json(detail)
        : json({ error: "Spiel nicht gefunden." }, 404);
    }
    if (path === "/v1/standings") return json(await standings(env), 200, 60);
    m = path.match(/^\/v1\/teams\/([A-Z0-9]{2,4})$/);
    if (m) {
      const r = await roster(env, m[1]);
      return r
        ? json(r, 200, 3600)
        : json({ error: "Team nicht gefunden." }, 404);
    }
    if (path === "" || path === "/")
      return json({ name: "Hoopline API", season: env.SEASON });
    return json({ error: "Unbekannte Adresse." }, 404);
  } catch (e) {
    const upstream = e instanceof Upstream;
    return json(
      {
        error: upstream
          ? "Die Euroleague-Daten sind gerade nicht erreichbar."
          : "Interner Fehler.",
      },
      upstream ? 502 : 500,
      0,
    );
  }
}

export default { fetch: handle };
