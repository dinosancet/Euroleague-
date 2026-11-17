import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

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
import { totals } from "@/data/mock";
import { boxScore, teamById, useGame, usePlays } from "@/data/store";
import type { Game, Team } from "@/data/types";
import { colors, fonts, radius, space } from "@/theme";

type Tab = "overview" | "box" | "pbp";

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const game = useGame(id);
  const [tab, setTab] = useState<Tab>("overview");
  const plays = usePlays(game);

  if (!game) return <Empty>Spiel nicht gefunden.</Empty>;
  const home = teamById(game.home);
  const away = teamById(game.away);

  return (
    <>
      <Stack.Screen options={{ title: `${home.abbr} – ${away.abbr}` }} />
      <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
        <Header game={game} home={home} away={away} />
        {game.status === "scheduled" ? (
          <Preview home={home} away={away} />
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
            {tab === "overview" && (
              <Overview game={game} home={home} away={away} />
            )}
            {tab === "box" && <Box game={game} home={home} away={away} />}
            {tab === "pbp" && (
              <View style={s.pbp}>
                {plays.slice(0, 40).map((p, i) => (
                  <View key={`${plays.length - i}`} style={s.play}>
                    <Num style={s.playTime}>
                      Q{p.period}
                      {"\n"}
                      {p.clock}
                    </Num>
                    <View style={s.playMid}>
                      <TeamBadge team={p.side === 0 ? home : away} />
                      <Text style={s.playText}>{p.text}</Text>
                    </View>
                    <Num style={s.playScore}>
                      {p.score[0]}–{p.score[1]}
                    </Num>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

function Header({ game, home, away }: { game: Game; home: Team; away: Team }) {
  const [hs, as] = totals(game);
  const side = (t: Team) => (
    <Pressable
      accessibilityRole="link"
      onPress={() =>
        router.push({ pathname: "/team/[id]", params: { id: t.id } })
      }
      style={s.side}
      accessibilityLabel={`Teamseite ${t.name}`}
    >
      <TeamBadge team={t} size={56} />
      <Text numberOfLines={1} style={s.sideName}>
        {t.name}
      </Text>
    </Pressable>
  );
  return (
    <View style={s.header}>
      <View style={s.scoreRow}>
        {side(home)}
        <View style={s.mid}>
          <Num style={s.big}>
            {game.status === "scheduled" ? "VS" : `${hs}–${as}`}
          </Num>
          {game.status === "live" ? (
            <LivePill label={`Live · Q${game.period} ${game.clock}`} />
          ) : (
            <Text style={s.midSmall}>
              {game.status === "final"
                ? `Endstand · Runde ${game.round}`
                : `${game.tipOff} Uhr · ${game.arena}`}
            </Text>
          )}
        </View>
        {side(away)}
      </View>
      {game.quarters.length > 0 && (
        <View style={s.qtable}>
          {[null, home, away].map((t, r) => (
            <View key={r} style={s.qrow}>
              <Text style={[s.qcell, s.qfirst, r === 0 && s.qhead]}>
                {t ? t.abbr : ""}
              </Text>
              {[0, 1, 2, 3].map((q) => (
                <Num key={q} style={[s.qcell, r === 0 && s.qhead]}>
                  {r === 0 ? `Q${q + 1}` : (game.quarters[q]?.[r - 1] ?? "–")}
                </Num>
              ))}
              <Num style={[s.qcell, r === 0 ? s.qhead : s.qtotal]}>
                {r === 0 ? "Ges." : r === 1 ? hs : as}
              </Num>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Overview({
  game,
  home,
  away,
}: {
  game: Game;
  home: Team;
  away: Team;
}) {
  const b0 = boxScore(game, 0);
  const b1 = boxScore(game, 1);
  const sum = (b: typeof b0, k: "rebounds" | "assists") =>
    b.reduce((x, r) => x + r[k], 0);
  const top = (b: typeof b0) =>
    b.reduce((m, r) => (r.points > m.points ? r : m), b[0]);
  return (
    <>
      <SectionHeader title="Teamvergleich" />
      <View style={s.cmp}>
        <CompareRow
          label="Rebounds"
          home={sum(b0, "rebounds")}
          away={sum(b1, "rebounds")}
        />
        <CompareRow
          label="Assists"
          home={sum(b0, "assists")}
          away={sum(b1, "assists")}
        />
      </View>
      <SectionHeader title="Beste Werfer" />
      <View style={s.list}>
        {(
          [
            [top(b0), home],
            [top(b1), away],
          ] as const
        ).map(([r, t]) => (
          <View key={t.id} style={s.player}>
            <Num style={s.jersey}>{r.player.number}</Num>
            <View style={{ flex: 1 }}>
              <Text style={s.pName}>{r.player.name}</Text>
              <Text style={s.pSub}>
                {t.name} · {r.rebounds} Reb · {r.assists} Ast
              </Text>
            </View>
            <Num style={s.pPts}>
              {r.points}
              <Text style={s.pSub}> PKT</Text>
            </Num>
          </View>
        ))}
      </View>
    </>
  );
}

function Box({ game, home, away }: { game: Game; home: Team; away: Team }) {
  const [side, setSide] = useState<0 | 1>(0);
  const rows = boxScore(game, side);
  const max = Math.max(...rows.map((r) => r.points));
  const cols = ["MIN", "PKT", "REB", "AST"];
  return (
    <>
      <View style={s.chips}>
        <Chip
          label={home.name}
          active={side === 0}
          onPress={() => setSide(0)}
        />
        <Chip
          label={away.name}
          active={side === 1}
          onPress={() => setSide(1)}
        />
      </View>
      <View style={s.box}>
        <View style={s.boxRow}>
          <Text style={[s.boxName, s.boxHead]}>Spieler</Text>
          {cols.map((c) => (
            <Text key={c} style={[s.boxCell, s.boxHead]}>
              {c}
            </Text>
          ))}
        </View>
        {rows.map((r) => (
          <View key={r.player.number} style={s.boxRow}>
            <Text numberOfLines={1} style={s.boxName}>
              {r.player.number} {r.player.name}
            </Text>
            <Num style={s.boxCell}>{r.minutes}</Num>
            <Num style={[s.boxCell, r.points === max && s.hi]}>{r.points}</Num>
            <Num style={s.boxCell}>{r.rebounds}</Num>
            <Num style={s.boxCell}>{r.assists}</Num>
          </View>
        ))}
      </View>
    </>
  );
}

function Preview({ home, away }: { home: Team; away: Team }) {
  return (
    <>
      <SectionHeader title="Saisonbilanz" />
      <View style={s.cmp}>
        <CompareRow label="Siege" home={home.wins} away={away.wins} />
        <CompareRow
          label="Punkte pro Spiel"
          home={+(home.pointsFor / 12).toFixed(1)}
          away={+(away.pointsFor / 12).toFixed(1)}
        />
        <CompareRow
          label="Gegnerpunkte pro Spiel"
          home={+(home.pointsAgainst / 12).toFixed(1)}
          away={+(away.pointsAgainst / 12).toFixed(1)}
          lowerIsBetter
        />
      </View>
      <SectionHeader title="Topscorer" />
      <View style={s.list}>
        {[home, away].map((t) => (
          <View key={t.id} style={s.player}>
            <Num style={s.jersey}>{t.roster[0].number}</Num>
            <View style={{ flex: 1 }}>
              <Text style={s.pName}>{t.roster[0].name}</Text>
              <Text style={s.pSub}>
                {t.name} · {t.roster[0].position}
              </Text>
            </View>
            <Num style={s.pPts}>
              {t.roster[0].pointsPerGame}
              <Text style={s.pSub}> PPG</Text>
            </Num>
          </View>
        ))}
      </View>
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
  box: {
    marginHorizontal: space.lg,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    paddingHorizontal: space.sm,
  },
  boxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  boxName: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text,
    paddingRight: 6,
  },
  boxCell: {
    width: 40,
    textAlign: "right",
    fontFamily: fonts.body,
    fontSize: 13,
  },
  boxHead: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.muted },
  hi: { color: colors.ball, fontFamily: fonts.bodyBold },
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
  playText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text,
  },
  playScore: { fontFamily: fonts.display, fontSize: 16 },
});
