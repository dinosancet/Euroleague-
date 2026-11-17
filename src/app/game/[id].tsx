import type {
  ApiGame,
  ApiGameDetail,
  ApiPlayerLine,
  ApiStanding,
  ApiTeam,
} from "@shared/api";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
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
  Empty,
  LivePill,
  Num,
  SectionHeader,
  Segmented,
  TeamBadge,
} from "@/components/ui";
import { useGameDetail, useStandings } from "@/data/api";
import { formatDay, formatTime } from "@/lib/format";
import { colors, fonts, radius, space } from "@/theme";

type Tab = "overview" | "box" | "pbp";

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, refresh } = useGameDetail(id);
  const [tab, setTab] = useState<Tab>("overview");

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
        {game.status === "scheduled" ? (
          <Preview game={game} />
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

const topScorer = (lines: ApiPlayerLine[]) =>
  lines.reduce<ApiPlayerLine | null>(
    (m, r) => (!m || r.points > m.points ? r : m),
    null,
  );

function Overview({ game, box }: { game: ApiGame; box: ApiGameDetail["box"] }) {
  if (!box)
    return <Empty>Für dieses Spiel gibt es noch keine Statistiken.</Empty>;
  const { home, away } = box.totals;
  const tops: [ApiPlayerLine | null, ApiTeam][] = [
    [topScorer(box.home), game.home],
    [topScorer(box.away), game.away],
  ];
  return (
    <>
      {game.status === "live" && <OnCourt game={game} box={box} />}
      <SectionHeader title="Teamvergleich" />
      <View style={s.cmp}>
        <CompareRow
          label="Rebounds"
          home={home.rebounds}
          away={away.rebounds}
        />
        <CompareRow label="Assists" home={home.assists} away={away.assists} />
        <CompareRow
          label="Zweier getroffen"
          home={home.twos[0]}
          away={away.twos[0]}
        />
        <CompareRow
          label="Dreier getroffen"
          home={home.threes[0]}
          away={away.threes[0]}
        />
        <CompareRow
          label="Freiwürfe getroffen"
          home={home.freeThrows[0]}
          away={away.freeThrows[0]}
        />
        <CompareRow label="Blocks" home={home.blocks} away={away.blocks} />
        <CompareRow label="Steals" home={home.steals} away={away.steals} />
        <CompareRow
          label="Ballverluste"
          home={home.turnovers}
          away={away.turnovers}
          lowerIsBetter
        />
      </View>
      <SectionHeader title="Beste Werfer" />
      <View style={s.list}>
        {tops.map(([r, t]) =>
          r ? (
            <Pressable
              key={t.code}
              style={s.player}
              accessibilityRole="link"
              onPress={() => openPlayer(r.id)}
            >
              <Num style={s.jersey}>{r.number}</Num>
              <View style={{ flex: 1 }}>
                <Text style={s.pName}>{r.name}</Text>
                <Text style={s.pSub}>
                  {t.shortName} · {r.rebounds} Reb · {r.assists} Ast
                </Text>
              </View>
              <Num style={s.pPts}>
                {r.points}
                <Text style={s.pSub}> PKT</Text>
              </Num>
            </Pressable>
          ) : null,
        )}
      </View>
    </>
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

function Plays({
  game,
  plays,
}: {
  game: ApiGame;
  plays: ApiGameDetail["plays"];
}) {
  if (!plays.length) return <Empty>Noch keine Spielzüge.</Empty>;
  return (
    <View style={s.pbp}>
      {plays.slice(0, 80).map((p) => (
        <View key={p.id} style={s.play}>
          <Num style={s.playTime}>
            {p.period > 4 ? "OT" : `Q${p.period}`}
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
  );
}

function Preview({ game }: { game: ApiGame }) {
  const { data } = useStandings();
  const row = (code: string): ApiStanding | undefined =>
    data?.rows.find((r) => r.team.code === code);
  const h = row(game.home.code);
  const a = row(game.away.code);
  const perGame = (r: ApiStanding, v: number) =>
    +(v / Math.max(1, r.wins + r.losses)).toFixed(1);
  return (
    <>
      <SectionHeader title="Saisonbilanz" />
      {h && a ? (
        <View style={s.cmp}>
          <CompareRow label="Siege" home={h.wins} away={a.wins} />
          <CompareRow
            label="Punkte pro Spiel"
            home={perGame(h, h.pointsFor)}
            away={perGame(a, a.pointsFor)}
          />
          <CompareRow
            label="Gegnerpunkte pro Spiel"
            home={perGame(h, h.pointsAgainst)}
            away={perGame(a, a.pointsAgainst)}
            lowerIsBetter
          />
          <CompareRow
            label="Tabellenplatz"
            home={h.position}
            away={a.position}
            lowerIsBetter
          />
        </View>
      ) : (
        <Empty>Die Bilanz wird geladen.</Empty>
      )}
      <Text style={s.note}>
        Live-Spielstand, Boxscore und Play-by-Play erscheinen hier, sobald das
        Spiel beginnt.
      </Text>
    </>
  );
}

const s = StyleSheet.create({
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
