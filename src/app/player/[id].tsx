import type { ApiPlayerGame, ApiPlayerProfile } from "@shared/api";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
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
  STAT_COLUMNS,
  StatLegend,
  StatTable,
  statCells,
} from "@/components/stat-table";
import { Empty, Num, SectionHeader, TeamBadge } from "@/components/ui";
import { usePlayer } from "@/data/api";
import { clubColors } from "@/data/clubs";
import { formatDay } from "@/lib/format";
import { colors, fonts, radius, space } from "@/theme";

function age(birth: string | null): number | null {
  if (!birth) return null;
  const b = new Date(birth);
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  if (
    now.getMonth() < b.getMonth() ||
    (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())
  )
    a--;
  return a;
}

const one = (n: number) => n.toFixed(1).replace(".", ",");
const pct = (n: number | null) => (n == null ? "–" : `${one(n)} %`);

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, refresh } = usePlayer(id);
  if (!data) return <LoadState error={error} onRetry={refresh} />;
  const p = data;
  const [c1, c2] = clubColors(p.team?.code ?? "");

  return (
    <>
      <Stack.Screen options={{ title: p.name }} />
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
        <View style={[s.hero, { backgroundColor: c1 }]}>
          <View style={[s.heroHalf, { backgroundColor: c2 }]} />
          <View style={s.heroShade} />
          <View style={s.heroText}>
            {p.number ? <Num style={s.heroNo}>#{p.number}</Num> : null}
            <Text style={s.heroName}>{p.name}</Text>
            <Text style={s.heroSub}>{p.position || "Spieler"}</Text>
            {p.team ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Teamseite ${p.team.name}`}
                onPress={() =>
                  router.push({
                    pathname: "/team/[id]",
                    params: { id: p.team!.code },
                  })
                }
                style={s.heroTeam}
              >
                <TeamBadge team={p.team} size={22} />
                <Text style={s.heroTeamName}>{p.team.shortName}</Text>
              </Pressable>
            ) : null}
          </View>
          {p.photo ? (
            <Image
              source={{ uri: p.photo }}
              style={s.photo}
              contentFit="cover"
              contentPosition="top"
              cachePolicy="memory-disk"
              accessibilityIgnoresInvertColors
            />
          ) : null}
        </View>

        <Bio p={p} />

        <SectionHeader
          title="Saison 2026/27"
          right={
            p.season
              ? `${p.season.games} Spiele · ${p.season.starts} Starts`
              : undefined
          }
        />
        {p.season ? (
          <Season season={p.season} />
        ) : (
          <Empty>Noch keine Einsätze in dieser Saison.</Empty>
        )}

        {p.games.length > 0 && (
          <>
            <SectionHeader title="Letzte 5 Spiele" />
            <View style={s.form}>
              {p.games.slice(0, 5).map((g) => (
                <FormGame key={g.code} g={g} />
              ))}
            </View>
            <SectionHeader title="Alle Spiele" right="neueste zuerst" />
            <GameLog p={p} />
          </>
        )}
      </ScrollView>
    </>
  );
}

function Bio({ p }: { p: ApiPlayerProfile }) {
  const a = age(p.birthDate);
  const items: [string, string | null][] = [
    ["Größe", p.heightCm ? `${p.heightCm} cm` : null],
    ["Gewicht", p.weightKg ? `${p.weightKg} kg` : null],
    [
      "Alter",
      a != null && p.birthDate
        ? `${a} (${p.birthDate.split("-").reverse().join(".")})`
        : null,
    ],
    ["Nation", p.country],
    ["Vorher", p.lastTeam],
  ];
  return (
    <View style={s.bio}>
      {items
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <View key={k} style={s.bioItem}>
            <Text style={s.bioKey}>{k}</Text>
            <Text style={s.bioVal} numberOfLines={1}>
              {v}
            </Text>
          </View>
        ))}
    </View>
  );
}

function Season({
  season,
}: {
  season: NonNullable<ApiPlayerProfile["season"]>;
}) {
  const a = season.averages;
  const big: [string, string][] = [
    [one(a.points), "Punkte"],
    [one(a.rebounds), "Rebounds"],
    [one(a.assists), "Assists"],
    [one(a.pir), "PIR"],
  ];
  const small: [string, string][] = [
    [season.minutes, "Minuten"],
    [pct(season.pct.twos), "Zweier"],
    [pct(season.pct.threes), "Dreier"],
    [pct(season.pct.freeThrows), "Freiwürfe"],
    [one(a.steals), "Steals"],
    [one(a.blocks), "Blocks"],
    [one(a.turnovers), "Ballverluste"],
    [one(a.fouls), "Fouls"],
  ];
  return (
    <View style={{ paddingHorizontal: space.lg, gap: space.sm }}>
      <View style={s.tiles}>
        {big.map(([v, l]) => (
          <View key={l} style={s.tile}>
            <Num style={s.tileVal}>{v}</Num>
            <Text style={s.tileLbl}>{l}</Text>
          </View>
        ))}
      </View>
      <View style={s.grid}>
        {small.map(([v, l]) => (
          <View key={l} style={s.gridItem}>
            <Num style={s.gridVal}>{v}</Num>
            <Text style={s.tileLbl}>{l}</Text>
          </View>
        ))}
      </View>
      <Text style={s.perGame}>Durchschnitt pro Spiel</Text>
    </View>
  );
}

const openGame = (code: number) =>
  router.push({ pathname: "/game/[id]", params: { id: String(code) } });

function FormGame({ g }: { g: ApiPlayerGame }) {
  return (
    <Pressable
      onPress={() => openGame(g.code)}
      accessibilityRole="link"
      accessibilityLabel={`Spiel gegen ${g.opponent.name}`}
      style={s.formItem}
    >
      <TeamBadge team={g.opponent} size={26} />
      <Text style={[s.formRes, { color: g.won ? colors.win : colors.live }]}>
        {g.won ? "S" : "N"}
      </Text>
      <Num style={s.formPts}>{g.stats.points}</Num>
      <Text style={s.tileLbl}>PKT</Text>
    </Pressable>
  );
}

function GameLog({ p }: { p: ApiPlayerProfile }) {
  const columns = [{ label: "MIN", width: 44 }, ...STAT_COLUMNS];
  return (
    <View style={{ paddingHorizontal: space.lg }}>
      <StatTable
        leftWidth={136}
        columns={columns}
        sections={[
          {
            title: "Gegner",
            rows: p.games.map((g) => ({
              key: String(g.code),
              onPress: () => openGame(g.code),
              accessibilityLabel: `Spiel gegen ${g.opponent.name}`,
              left: (
                <View style={s.logLeft}>
                  <TeamBadge team={g.opponent} size={20} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.logOpp} numberOfLines={1}>
                      {g.atHome ? "vs" : "@"} {g.opponent.abbr}
                    </Text>
                    <Text style={s.logDate}>{formatDay(g.startUtc)}</Text>
                  </View>
                  <Num
                    style={[
                      s.logRes,
                      { color: g.won ? colors.win : colors.live },
                    ]}
                  >
                    {g.score[0]}:{g.score[1]}
                  </Num>
                </View>
              ),
              cells: [g.minutes, ...statCells(g.stats)],
            })),
          },
        ]}
        footer={[
          ...(p.season
            ? [
                {
                  key: "avg",
                  style: "total" as const,
                  left: <Text style={s.logAvg}>Schnitt</Text>,
                  cells: [p.season.minutes, ...statCells(p.season.averages, 1)],
                },
              ]
            : []),
        ]}
      />
      <Text style={s.hint}>
        Seitlich wischen für alle Werte, Spiel antippen für den Boxscore.
      </Text>
      <StatLegend />
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    flexDirection: "row",
    alignItems: "flex-end",
    minHeight: 190,
    paddingLeft: space.lg,
    overflow: "hidden",
  },
  heroHalf: {
    position: "absolute",
    top: -80,
    bottom: -80,
    right: -60,
    width: "55%",
    transform: [{ rotate: "20deg" }],
  },
  heroShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(13,16,32,0.35)",
  },
  heroText: { flex: 1, paddingVertical: 20, minWidth: 0 },
  heroNo: {
    fontFamily: fonts.displayHeavy,
    fontSize: 22,
    color: "rgba(255,255,255,0.75)",
  },
  heroName: {
    fontFamily: fonts.displayHeavy,
    fontSize: 32,
    lineHeight: 32,
    color: "#fff",
    textTransform: "uppercase",
  },
  heroSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
  },
  heroTeam: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingLeft: 5,
    paddingRight: 12,
  },
  heroTeamName: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#fff" },
  photo: { width: 150, height: 180 },
  bio: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    padding: space.lg,
    paddingBottom: 0,
  },
  bioItem: {
    flexGrow: 1,
    minWidth: "30%",
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 10,
  },
  bioKey: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  bioVal: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.text,
    marginTop: 2,
  },
  tiles: { flexDirection: "row", gap: space.sm },
  tile: {
    flex: 1,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    paddingVertical: space.md,
    alignItems: "center",
  },
  tileVal: { fontFamily: fonts.display, fontSize: 28, lineHeight: 30 },
  tileLbl: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    paddingVertical: space.sm,
  },
  gridItem: { width: "25%", alignItems: "center", paddingVertical: 8 },
  gridVal: { fontFamily: fonts.bodyBold, fontSize: 15 },
  perGame: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    textAlign: "right",
  },
  form: { flexDirection: "row", gap: space.sm, paddingHorizontal: space.lg },
  formItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    paddingVertical: space.md,
  },
  formRes: { fontFamily: fonts.bodyBold, fontSize: 11 },
  formPts: { fontFamily: fonts.display, fontSize: 22, lineHeight: 24 },
  logLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 8,
    paddingRight: 6,
  },
  logOpp: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.text },
  logDate: { fontFamily: fonts.body, fontSize: 10, color: colors.muted },
  logRes: { fontFamily: fonts.bodyBold, fontSize: 12 },
  logAvg: {
    paddingLeft: 10,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.text,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    marginTop: 10,
  },
});
