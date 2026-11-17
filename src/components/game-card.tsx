import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { teamById, useFavorites } from "@/data/store";
import { totals } from "@/data/mock";
import type { Game, Team } from "@/data/types";
import { colors, fonts, radius, space } from "@/theme";

import { LivePill, Num, TeamBadge } from "./ui";

export function GameCard({ game }: { game: Game }) {
  const favs = useFavorites();
  const home = teamById(game.home);
  const away = teamById(game.away);
  const [hs, as] = totals(game);
  const done = game.status === "final";
  const showScore = game.status !== "scheduled";

  const row = (t: Team, score: number, lost: boolean) => (
    <View style={s.row}>
      <TeamBadge team={t} />
      <Text numberOfLines={1} style={[s.name, lost && s.dim]}>
        {t.name}
        {favs.includes(t.id) ? <Text style={s.star}> ★</Text> : null}
      </Text>
      {showScore ? <Num style={[s.score, lost && s.dim]}>{score}</Num> : null}
    </View>
  );

  return (
    <Pressable
      accessibilityRole="link"
      onPress={() =>
        router.push({ pathname: "/game/[id]", params: { id: game.id } })
      }
      accessibilityLabel={`${home.name} gegen ${away.name}`}
      style={({ pressed }) => [
        s.card,
        pressed && { backgroundColor: colors.panel2 },
      ]}
    >
      <View style={s.teams}>
        {row(home, hs, done && hs < as)}
        {row(away, as, done && as < hs)}
      </View>
      <View style={s.meta}>
        {game.status === "live" ? (
          <>
            <LivePill />
            <Num style={s.metaBig}>Q{game.period}</Num>
            <Num style={s.metaSmall}>{game.clock}</Num>
          </>
        ) : done ? (
          <>
            <Text style={s.metaBig}>Ende</Text>
            <Text style={s.metaSmall}>Runde {game.round}</Text>
          </>
        ) : (
          <>
            <Num style={s.metaBig}>{game.tipOff}</Num>
            <Text style={s.metaSmall}>Runde {game.round}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    paddingVertical: space.md,
    paddingHorizontal: 14,
    gap: space.md,
  },
  teams: { flex: 1, gap: 8, minWidth: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  name: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  star: { color: colors.ball, fontSize: 12 },
  score: {
    fontFamily: fonts.display,
    fontSize: 22,
    minWidth: 38,
    textAlign: "right",
  },
  dim: { color: colors.muted },
  meta: {
    borderLeftWidth: 1,
    borderLeftColor: colors.line,
    paddingLeft: space.md,
    minWidth: 74,
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 2,
  },
  metaBig: { fontFamily: fonts.display, fontSize: 18, color: colors.text },
  metaSmall: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
});
