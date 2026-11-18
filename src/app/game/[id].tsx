import type {
  ApiGame,
  ApiGameDetail,
  ApiLeader,
  ApiPlayerLine,
  ApiShots,
  ApiStanding,
  ApiTeam,
  ApiTeamSeason,
} from "@shared/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { LoadState } from "@/components/load-state";
import {
  col,
  STAT_COLUMNS,
  StatLegend,
  StatTable,
  statCells,
} from "@/components/stat-table";
import {
  Chip,
  CompareRow,
  decimal,
  Empty,
  LivePill,
  Num,
  SectionHeader,
  Segmented,
  TeamBadge,
} from "@/components/ui";
import { useGameDetail, useGames, useStandings } from "@/data/api";
import { playVideo, useVideos, type Video } from "@/data/videos";
import { formatDay, formatTime } from "@/lib/format";
import { colors, fonts, radius, space } from "@/theme";

type Tab = "overview" | "box" | "pbp";

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, refresh } = useGameDetail(id);
  const [tab, setTab] = useState<Tab>("overview");
  const videos = useVideos();

  if (!data) return <LoadState error={error} onRetry={refresh} />;
  const { game, box, plays } = data;

  return (
    <>
      <Stack.Screen
        options={{ title: `${game.home.abbr} – ${game.away.abbr}` }}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: space.xl }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={colors.ball}
          />
        }
      >
        <Header game={game} />
        <HighlightsBanner
          video={videos.data?.find((v) => v.gameCode === game.code)}
        />
        {game.status === "scheduled" ? (
          <Preview game={game} preview={data.preview ?? null} />
        ) : (
          <>
            <Segmented<Tab>
              value={tab}
              onChange={setTab}
              options={[
                ["overview", "Überblick"],
                ["box", "Boxscore"],
                ["pbp", "Play-by-Play"],
              ]}
            />
            {tab === "overview" && <Overview game={game} box={box} />}
            {tab === "box" && <Box game={game} box={box} />}
            {tab === "pbp" && <Plays game={game} plays={plays} />}
          </>
        )}
      </ScrollView>
    </>
  );
}

/** Shown once the league has posted highlights of this game. */
function HighlightsBanner({ video }: { video?: Video }) {
  if (!video) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Highlights ansehen: ${video.title}`}
      onPress={() => playVideo(video)}
      style={({ pressed }) => [s.hl, pressed && { opacity: 0.85 }]}
    >
      <View style={s.hlThumb}>
        <Image
          source={video.thumbnail}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
        <View style={s.hlPlay}>
          <Ionicons name="play" size={14} color={colors.onBall} />
        </View>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.hlKicker}>Highlights ansehen</Text>
        <Text style={s.hlTitle} numberOfLines={2}>
          {video.headline}
        </Text>
      </View>
      <Ionicons name="logo-youtube" size={20} color={colors.muted} />
    </Pressable>
  );
}

function Header({ game }: { game: ApiGame }) {
  const [hs, as] = game.score;
  const side = (t: ApiTeam) => (
    <Pressable
      style={s.side}
      accessibilityRole="link"
      accessibilityLabel={`Teamseite ${t.name}`}
      onPress={() =>
        router.push({ pathname: "/team/[id]", params: { id: t.code } })
      }
    >
      <TeamBadge team={t} size={56} />
      <Text numberOfLines={1} style={s.sideName}>
        {t.shortName}
      </Text>
    </Pressable>
  );
  const periods = Math.max(4, game.quarters.length);
  return (
    <View style={s.header}>
      <View style={s.scoreRow}>
        {side(game.home)}
        <View style={s.mid}>
          <Num style={s.big}>
            {game.status === "scheduled" ? "VS" : `${hs}–${as}`}
          </Num>
          {game.status === "live" ? (
            <LivePill
              label={
                !game.period
                  ? "Live · Pause"
                  : `Live · ${game.period > 4 ? "OT" : `Q${game.period}`} ${game.clock ?? ""}`
              }
            />
          ) : (
            <Text style={s.midSmall}>
              {game.status === "final"
                ? `Endstand · Runde ${game.round}`
                : `${formatDay(game.startUtc)} · ${formatTime(game.startUtc)} Uhr`}
            </Text>
          )}
        </View>
        {side(game.away)}
      </View>
      {game.quarters.length > 0 && (
        <View style={s.qtable}>
          {[null, game.home, game.away].map((t, r) => (
            <View key={r} style={s.qrow}>
              <Text style={[s.qcell, s.qfirst, r === 0 && s.qhead]}>
                {t ? t.abbr : ""}
              </Text>
              {Array.from({ length: periods }, (_, q) => (
                <Num key={q} style={[s.qcell, r === 0 && s.qhead]}>
                  {r === 0
                    ? q < 4
                      ? `Q${q + 1}`
                      : "OT"
                    : (game.quarters[q]?.[r - 1] ?? "–")}
                </Num>
              ))}
              <Num style={[s.qcell, r === 0 ? s.qhead : s.qtotal]}>
                {r === 0 ? "Ges." : r === 1 ? hs : as}
              </Num>
            </View>
          ))}
        </View>
      )}
      {game.venue ? <Text style={s.venue}>{game.venue}</Text> : null}
    </View>
  );
}

const openPlayer = (id: string) => {
  if (id) router.push({ pathname: "/player/[id]", params: { id } });
};

/** Shooting percentage, one decimal; 0 when nothing was attempted. */
const rate = ([made, att]: ApiShots) =>
  att ? Math.round((made / att) * 1000) / 10 : 0;

type Category = "points" | "rebounds" | "assists";
const CATEGORIES: [Category, string][] = [
  ["points", "Punkte"],
  ["rebounds", "Rebounds"],
  ["assists", "Assists"],
];

const gameLeader = (
  lines: ApiPlayerLine[],
  key: Category,
): ApiLeader | null => {
  const best = lines.reduce<ApiPlayerLine | null>(
    (m, r) => (r.minutes && (!m || r[key] > m[key]) ? r : m),
    null,
  );
  return best && best[key] > 0
    ? { id: best.id, name: best.name, value: best[key] }
    : null;
};

function Overview({ game, box }: { game: ApiGame; box: ApiGameDetail["box"] }) {
  if (!box)
    return <Empty>Für dieses Spiel gibt es noch keine Statistiken.</Empty>;
  const { home, away } = box.totals;
  return (
    <>
      {game.status === "live" && <OnCourt game={game} box={box} />}
      <SectionHeader
        title={game.status === "live" ? "Topwerte" : "Topwerte des Spiels"}
      />
      <Leaders
        game={game}
        rows={CATEGORIES.map(([key, label]) => [
          label,
          gameLeader(box.home, key),
          gameLeader(box.away, key),
        ])}
      />
      <SectionHeader title="Teamvergleich" />
      <View style={s.cmp}>
        <CompareRow
          label={`Zweier ${home.twos.join("/")} · ${away.twos.join("/")}`}
          home={rate(home.twos)}
          away={rate(away.twos)}
          suffix=" %"
        />
        <CompareRow
          label={`Dreier ${home.threes.join("/")} · ${away.threes.join("/")}`}
          home={rate(home.threes)}
          away={rate(away.threes)}
          suffix=" %"
        />
        <CompareRow
          label={`Freiwürfe ${home.freeThrows.join("/")} · ${away.freeThrows.join("/")}`}
          home={rate(home.freeThrows)}
          away={rate(away.freeThrows)}
          suffix=" %"
        />
        <CompareRow
          label="Rebounds"
          home={home.rebounds}
          away={away.rebounds}
        />
        <CompareRow
          label="Offensiv-Rebounds"
          home={home.offRebounds}
          away={away.offRebounds}
        />
        <CompareRow label="Assists" home={home.assists} away={away.assists} />
        <CompareRow label="Steals" home={home.steals} away={away.steals} />
        <CompareRow label="Blocks" home={home.blocks} away={away.blocks} />
        <CompareRow
          label="Ballverluste"
          home={home.turnovers}
          away={away.turnovers}
          lowerIsBetter
        />
        <CompareRow
          label="Fouls"
          home={home.fouls}
          away={away.fouls}
          lowerIsBetter
        />
      </View>
    </>
  );
}

/** Best player of each team per category, home left and away right. */
function Leaders({
  game,
  rows,
  unit,
}: {
  game: ApiGame;
  rows: [string, ApiLeader | null, ApiLeader | null][];
  /** Shown under the number, e.g. "pro Spiel". */
  unit?: string;
}) {
  const cell = (l: ApiLeader | null, align: "left" | "right") => (
    <Pressable
      style={[s.leader, align === "right" && s.leaderRight]}
      disabled={!l?.id}
      accessibilityRole="link"
      accessibilityLabel={l ? `Spielerseite ${l.name}` : undefined}
      onPress={() => l && openPlayer(l.id)}
    >
      <Num style={[s.leaderVal, { textAlign: align }]}>
        {l ? decimal(l.value) : "–"}
      </Num>
      <Text numberOfLines={1} style={[s.leaderName, { textAlign: align }]}>
        {l ? shortName(l.name) : ""}
      </Text>
    </Pressable>
  );
  return (
    <View style={s.leaders}>
      <View style={s.leaderHead}>
        <TeamBadge team={game.home} size={22} />
        <Text style={s.leaderUnit}>{unit ?? ""}</Text>
        <TeamBadge team={game.away} size={22} />
      </View>
      {rows.map(([label, h, a]) => (
        <View key={label} style={s.leaderRow}>
          {cell(h, "left")}
          <Text style={s.leaderLabel}>{label}</Text>
          {cell(a, "right")}
        </View>
      ))}
    </View>
  );
}

function OnCourt({
  game,
  box,
}: {
  game: ApiGame;
  box: NonNullable<ApiGameDetail["box"]>;
}) {
  const sides: [ApiTeam, ApiPlayerLine[]][] = [
    [game.home, box.home.filter((p) => p.onCourt)],
    [game.away, box.away.filter((p) => p.onCourt)],
  ];
  if (!sides.some(([, l]) => l.length)) return null;
  return (
    <>
      <SectionHeader title="Auf dem Feld" />
      <View style={s.court}>
        {sides.map(([t, lines]) => (
          <View key={t.code} style={s.courtSide}>
            <View style={s.courtTeam}>
              <TeamBadge team={t} size={20} />
              <Text style={s.courtTeamName}>{t.abbr}</Text>
            </View>
            {lines.map((p) => (
              <Pressable
                key={p.id || p.name}
                onPress={() => openPlayer(p.id)}
                accessibilityRole="link"
                style={s.courtPlayer}
              >
                <Num style={s.courtNo}>{p.number}</Num>
                <Text numberOfLines={1} style={s.courtName}>
                  {p.name.split(" ").slice(-1)[0]}
                </Text>
                <Num style={s.courtPts}>{p.points}</Num>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </>
  );
}

/** "Sterling Brown" -> "S. Brown" */
const shortName = (name: string) => {
  const parts = name.split(" ");
  return parts.length > 1
    ? `${parts[0][0]}. ${parts.slice(1).join(" ")}`
    : name;
};

function Box({ game, box }: { game: ApiGame; box: ApiGameDetail["box"] }) {
  const [side, setSide] = useState<"home" | "away">("home");
  if (!box) return <Empty>Der Boxscore ist noch nicht verfügbar.</Empty>;
  const lines = box[side];
  const live = game.status === "live";
  const columns = [{ label: "MIN", width: 52 }, ...STAT_COLUMNS];
  const topPts = Math.max(...lines.map((l) => l.points), 1);

  const row = (r: ApiPlayerLine) => ({
    key: `${r.id}-${r.number}-${r.name}`,
    onPress: r.id ? () => openPlayer(r.id) : undefined,
    accessibilityLabel: `Spielerseite ${r.name}`,
    left: (
      <View style={s.boxLeft}>
        <Text numberOfLines={1} style={[s.boxName, !r.minutes && s.dnp]}>
          {shortName(r.name)}
          {r.position ? <Text style={s.boxPos}> {r.position}</Text> : null}
        </Text>
        {live && r.onCourt ? <View style={s.onDot} /> : null}
      </View>
    ),
    cells: [r.minutes, ...statCells(r)],
    highlight: r.points === topPts ? [col("PKT", 1)] : [],
    note: r.minutes ? undefined : "nicht eingesetzt",
  });

  return (
    <>
      <View style={{ marginTop: space.md }}>
        <Segmented
          value={side}
          onChange={setSide}
          options={[
            ["home", game.home.shortName],
            ["away", game.away.shortName],
          ]}
        />
      </View>
      <View style={{ marginTop: space.md }}>
        <StatTable
          flush
          leftWidth={158}
          columns={columns}
          sections={[
            { title: "Starter", rows: lines.filter((l) => l.starter).map(row) },
            { title: "Bank", rows: lines.filter((l) => !l.starter).map(row) },
          ]}
          footer={[
            {
              key: "total",
              style: "total",
              left: <Text style={s.boxTotal}>GESAMT</Text>,
              // Plus-minus makes no sense for a team total.
              cells: ["", ...statCells(box.totals[side])].map((c, i) =>
                i === col("+/-", 1) ? "" : c,
              ),
            },
          ]}
        />
      </View>
      <View style={{ paddingHorizontal: space.lg }}>
        <Text style={s.boxHint}>
          {live ? "● = gerade auf dem Feld · " : ""}Seitlich wischen für alle
          Werte, Spieler antippen für die Spielerseite.
        </Text>
        <StatLegend />
      </View>
    </>
  );
}

const periodLabel = (p: number) =>
  p > 4 ? `OT${p > 5 ? p - 4 : ""}` : `Q${p}`;

function Plays({
  game,
  plays,
}: {
  game: ApiGame;
  plays: ApiGameDetail["plays"];
}) {
  const periods = useMemo(
    () => [...new Set(plays.map((p) => p.period))].sort((a, b) => a - b),
    [plays],
  );
  // null = all quarters; scoring = only plays that changed the score.
  const [period, setPeriod] = useState<number | null>(null);
  const [scoring, setScoring] = useState(false);
  if (!plays.length) return <Empty>Noch keine Spielzüge.</Empty>;
  const shown = plays.filter(
    (p) => (period === null || p.period === period) && (!scoring || p.score),
  );
  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chips}
      >
        <Chip
          label="Alle"
          active={period === null}
          onPress={() => setPeriod(null)}
        />
        {periods.map((p) => (
          <Chip
            key={p}
            label={periodLabel(p)}
            active={period === p}
            onPress={() => setPeriod(p)}
          />
        ))}
        <View style={s.chipGap} />
        <Chip
          label="Nur Punkte"
          active={scoring}
          onPress={() => setScoring((v) => !v)}
        />
      </ScrollView>
      <View style={s.pbp}>
        {shown.length === 0 && <Empty>Keine passenden Spielzüge.</Empty>}
        {shown.slice(0, period === null ? 120 : 400).map((p) => (
          <View key={p.id} style={s.play}>
            <Num style={s.playTime}>
              {periodLabel(p.period)}
              {"\n"}
              {p.clock}
            </Num>
            <View style={s.playMid}>
              {p.side ? (
                <TeamBadge team={p.side === "home" ? game.home : game.away} />
              ) : (
                <View style={{ width: 28 }} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[s.playText, p.score && s.playScored]}>
                  {p.text}
                </Text>
                {p.player ? <Text style={s.pSub}>{p.player}</Text> : null}
              </View>
            </View>
            {p.score ? (
              <Num style={s.playScore}>
                {p.score[0]}–{p.score[1]}
              </Num>
            ) : null}
          </View>
        ))}
      </View>
    </>
  );
}

/** Last finished games of a team before `before`, newest first. */
const lastGames = (all: ApiGame[], code: string, before: string, n: number) =>
  all
    .filter(
      (g) =>
        g.status === "final" &&
        g.startUtc < before &&
        (g.home.code === code || g.away.code === code),
    )
    .slice(-n)
    .reverse();

const wonBy = (g: ApiGame, code: string) =>
  g.home.code === code ? g.score[0] > g.score[1] : g.score[1] > g.score[0];

function Form({ games, team }: { games: ApiGame[]; team: ApiTeam }) {
  return (
    <View style={s.formRow}>
      <TeamBadge team={team} size={22} />
      <Text numberOfLines={1} style={s.formTeam}>
        {team.shortName}
      </Text>
      <View style={s.formChips}>
        {games.length === 0 && <Text style={s.pSub}>noch keine Spiele</Text>}
        {[...games].reverse().map((g) => {
          const won = wonBy(g, team.code);
          const home = g.home.code === team.code;
          const opp = home ? g.away : g.home;
          return (
            <Pressable
              key={g.code}
              accessibilityRole="link"
              accessibilityLabel={`${won ? "Sieg" : "Niederlage"} gegen ${opp.shortName}`}
              onPress={() =>
                router.push({
                  pathname: "/game/[id]",
                  params: { id: String(g.code) },
                })
              }
              style={[s.formChip, won ? s.formWin : s.formLoss]}
            >
              <Text style={[s.formLetter, !won && s.formLetterLoss]}>
                {won ? "S" : "N"}
              </Text>
              <Text style={s.formOpp}>{opp.abbr}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Preview({
  game,
  preview,
}: {
  game: ApiGame;
  preview: ApiGameDetail["preview"];
}) {
  const { data } = useStandings();
  const games = useGames().data ?? [];
  const row = (code: string): ApiStanding | undefined =>
    data?.rows.find((r) => r.team.code === code);
  const h = row(game.home.code);
  const a = row(game.away.code);
  const hs: ApiTeamSeason | null = preview?.home ?? null;
  const as: ApiTeamSeason | null = preview?.away ?? null;
  const meetings = games
    .filter(
      (g) =>
        g.code !== game.code &&
        g.status === "final" &&
        ((g.home.code === game.home.code && g.away.code === game.away.code) ||
          (g.home.code === game.away.code && g.away.code === game.home.code)),
    )
    .reverse();
  const formHome = lastGames(games, game.home.code, game.startUtc, 5);
  const formAway = lastGames(games, game.away.code, game.startUtc, 5);
  const leaderRows: [string, ApiLeader | null, ApiLeader | null][] =
    hs && as
      ? [
          ["Punkte", hs.leaders.points, as.leaders.points],
          ["Rebounds", hs.leaders.rebounds, as.leaders.rebounds],
          ["Assists", hs.leaders.assists, as.leaders.assists],
          ["Effizienz (PIR)", hs.leaders.pir, as.leaders.pir],
        ]
      : [];

  return (
    <>
      {games.length > 0 && (
        <>
          <SectionHeader title="Form" right="letzte 5 Spiele" />
          <View style={s.form}>
            <Form games={formHome} team={game.home} />
            <Form games={formAway} team={game.away} />
          </View>
        </>
      )}

      <SectionHeader title="Saisonbilanz" />
      {h && a ? (
        <View style={s.cmp}>
          <CompareRow
            label={`Bilanz ${h.wins}–${h.losses} · ${a.wins}–${a.losses}`}
            home={h.wins}
            away={a.wins}
          />
          <CompareRow
            label="Tabellenplatz"
            home={h.position}
            away={a.position}
            lowerIsBetter
          />
          {hs && as ? (
            <>
              <CompareRow
                label="Punkte pro Spiel"
                home={hs.averages.points}
                away={as.averages.points}
              />
              <CompareRow
                label="Gegnerpunkte pro Spiel"
                home={
                  +(h.pointsAgainst / Math.max(1, h.wins + h.losses)).toFixed(1)
                }
                away={
                  +(a.pointsAgainst / Math.max(1, a.wins + a.losses)).toFixed(1)
                }
                lowerIsBetter
              />
              <CompareRow
                label="Dreierquote"
                home={hs.pct.threes ?? 0}
                away={as.pct.threes ?? 0}
                suffix=" %"
              />
              <CompareRow
                label="Rebounds pro Spiel"
                home={hs.averages.rebounds}
                away={as.averages.rebounds}
              />
              <CompareRow
                label="Assists pro Spiel"
                home={hs.averages.assists}
                away={as.averages.assists}
              />
              <CompareRow
                label="Ballverluste pro Spiel"
                home={hs.averages.turnovers}
                away={as.averages.turnovers}
                lowerIsBetter
              />
            </>
          ) : null}
        </View>
      ) : (
        <Empty>Die Bilanz wird geladen.</Empty>
      )}

      {leaderRows.length > 0 && (
        <>
          <SectionHeader title="Beste Spieler" right="pro Spiel" />
          <Leaders game={game} rows={leaderRows} />
        </>
      )}

      {meetings.length > 0 && (
        <>
          <SectionHeader title="Direkte Duelle" right="diese Saison" />
          <View style={s.list}>
            {meetings.map((g) => (
              <Pressable
                key={g.code}
                accessibilityRole="link"
                onPress={() =>
                  router.push({
                    pathname: "/game/[id]",
                    params: { id: String(g.code) },
                  })
                }
                style={s.meeting}
              >
                <Text style={s.pSub}>
                  {formatDay(g.startUtc)} · Runde {g.round}
                </Text>
                <View style={s.meetingRow}>
                  <TeamBadge team={g.home} size={22} />
                  <Num style={s.meetingScore}>
                    {g.score[0]}–{g.score[1]}
                  </Num>
                  <TeamBadge team={g.away} size={22} />
                </View>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Text style={s.note}>
        Live-Spielstand, Boxscore und Play-by-Play erscheinen hier, sobald das
        Spiel beginnt.
      </Text>
    </>
  );
}

const s = StyleSheet.create({
  hl: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginHorizontal: space.lg,
    marginBottom: space.md,
    padding: space.sm,
    paddingRight: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
  },
  hlThumb: {
    width: 96,
    aspectRatio: 16 / 9,
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: colors.panel2,
    alignItems: "center",
    justifyContent: "center",
  },
  hlPlay: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.ball,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 2,
  },
  hlKicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.ball,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  hlTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    lineHeight: 19,
    color: colors.text,
  },
  header: {
    padding: space.lg,
    paddingTop: 18,
    backgroundColor: colors.panel,
    marginBottom: space.md,
  },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  side: { flex: 1, alignItems: "center", gap: 6, minWidth: 0 },
  sideName: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.muted },
  mid: { alignItems: "center", gap: 6 },
  big: {
    fontFamily: fonts.displayHeavy,
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: 1,
  },
  midSmall: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
  },
  qtable: { marginTop: space.lg },
  qrow: { flexDirection: "row", paddingVertical: 5 },
  qcell: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text,
  },
  qfirst: { textAlign: "left" },
  qhead: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.muted },
  qtotal: { fontFamily: fonts.bodyBold },
  venue: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
    marginTop: space.sm,
  },
  cmp: { paddingHorizontal: space.lg, gap: space.md },
  list: { paddingHorizontal: space.lg },
  player: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  jersey: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.panel,
    textAlign: "center",
    lineHeight: 36,
    fontFamily: fonts.display,
    fontSize: 16,
    overflow: "hidden",
  },
  pName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  pSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  pPts: { fontFamily: fonts.display, fontSize: 18 },
  chips: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  chipGap: { width: space.sm },
  leaders: {
    marginHorizontal: space.lg,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  leaderHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 6,
  },
  leaderUnit: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  leader: { flex: 1, minWidth: 0 },
  leaderRight: { alignItems: "flex-end" },
  leaderVal: { fontFamily: fonts.display, fontSize: 22, lineHeight: 24 },
  leaderName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.text,
  },
  leaderLabel: {
    width: 92,
    textAlign: "center",
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
  },
  form: { paddingHorizontal: space.lg, gap: 10 },
  formRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  formTeam: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text,
  },
  formChips: { flexDirection: "row", gap: 5 },
  formChip: {
    width: 34,
    paddingVertical: 4,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  formWin: { backgroundColor: "rgba(61,220,151,0.16)" },
  formLoss: { backgroundColor: colors.liveSoft },
  formLetter: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.win },
  formLetterLoss: { color: colors.live },
  formOpp: { fontFamily: fonts.body, fontSize: 9, color: colors.muted },
  meeting: {
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  meetingRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  meetingScore: { fontFamily: fonts.display, fontSize: 20 },
  boxLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: space.lg,
    paddingRight: 6,
  },
  boxName: {
    flexShrink: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
  boxPos: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  boxTotal: {
    paddingLeft: space.lg,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: colors.text,
  },
  boxHint: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    marginTop: 10,
  },
  onDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.win,
  },
  court: {
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  courtSide: {
    flex: 1,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    padding: 10,
    gap: 2,
  },
  courtTeam: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  courtTeamName: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.muted,
  },
  courtPlayer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
  },
  courtNo: {
    width: 20,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.win,
  },
  courtName: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text,
  },
  courtPts: { fontFamily: fonts.bodyBold, fontSize: 13 },
  dnp: { color: colors.muted },
  pbp: { paddingHorizontal: space.lg, paddingTop: space.sm },
  play: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  playTime: {
    width: 44,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  playMid: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  playText: { fontFamily: fonts.body, fontSize: 13, color: colors.text },
  playScored: { fontFamily: fonts.bodyBold },
  playScore: { fontFamily: fonts.display, fontSize: 16 },
  note: {
    margin: space.lg,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.line,
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
});
