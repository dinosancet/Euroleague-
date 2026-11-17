import type { ApiGame, ApiTeam } from "@shared/api";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useFavorites } from "@/data/prefs";
import { formatTime } from "@/lib/format";
import { colors, fonts, radius, space } from "@/theme";

import { LivePill, Num, TeamBadge } from "./ui";

export function GameCard({ game }: { game: ApiGame }) {
  const favs = useFavorites();
  const [hs, as] = game.score;
  const done = game.status === "final";
  const showScore = game.status !== "scheduled";

  const row = (t: ApiTeam, score: number, lost: boolean) => (
    <View style={s.row}>
      <TeamBadge team={t} />
      <Text numberOfLines={1} style={[s.name, lost && s.dim]}>
        {t.shortName}
        {favs.includes(t.code) ? <Text style={s.star}> ★</Text> : null}
      </Text>
      {showScore ? <Num style={[s.score, lost && s.dim]}>{score}</Num> : null}
    </View>
  );

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${game.home.name} gegen ${game.away.name}`}
      onPress={() =>
        router.push({
          pathname: "/game/[id]",
          params: { id: String(game.code) },
        })
      }
      style={({ pressed }) => [
        s.card,
        pressed && { backgroundColor: colors.panel2 },
      ]}
    >
      <View style={s.teams}>
        {row(game.home, hs, done && hs < as)}
        {row(game.away, as, done && as < hs)}
      </View>
      <View style={s.meta}>
        {game.status === "live" ? (
          <>
            <LivePill />
            <Num style={s.metaPeriod}>
              {game.period ? (game.period > 4 ? "OT" : `Q${game.period}`) : "–"}
            </Num>
            <Num style={s.metaSmall}>{game.clock ?? ""}</Num>
          </>
        ) : done ? (
          <>
            <Text style={s.metaBig}>Ende</Text>
            <Text style={s.metaSmall}>Runde {game.round}</Text>
          </>
        ) : (
          <>
            <Num style={s.metaBig}>{formatTime(game.startUtc)}</Num>
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
  metaPeriod: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  metaSmall: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
});
