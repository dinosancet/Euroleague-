import { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GameCard } from "@/components/game-card";
import { LoadState } from "@/components/load-state";
import { Empty, SectionHeader } from "@/components/ui";
import { useGames } from "@/data/api";
import { useFavorites } from "@/data/prefs";
import { MONTHS, WEEKDAYS, localDayKey } from "@/lib/format";
import { colors, fonts, radius, space } from "@/theme";

const OFFSETS = [-3, -2, -1, 0, 1, 2, 3];

export default function GamesScreen() {
  const [day, setDay] = useState(0);
  const { data, error, loading, refresh } = useGames();
  const favs = useFavorites();

  const days = useMemo(
    () =>
      OFFSETS.map((off) => {
        const d = new Date();
        d.setDate(d.getDate() + off);
        return { off, date: d, key: localDayKey(d) };
      }),
    [],
  );
  const selected = days.find((d) => d.off === day)!;
  const games = (data ?? []).filter(
    (g) => localDayKey(new Date(g.startUtc)) === selected.key,
  );
  const daysWithGames = new Set(
    (data ?? []).map((g) => localDayKey(new Date(g.startUtc))),
  );
  const mine = games.filter(
    (g) => favs.includes(g.home.code) || favs.includes(g.away.code),
  );
  const rest = games.filter((g) => !mine.includes(g));
  const next = (data ?? []).find(
    (g) =>
      g.status !== "final" && localDayKey(new Date(g.startUtc)) > selected.key,
  );

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: space.xl }}
      refreshControl={
        <RefreshControl
          refreshing={loading && !!data}
          onRefresh={refresh}
          tintColor={colors.ball}
        />
      }
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.dates}
      >
        {days.map(({ off, date, key }) => {
          const active = off === day;
          return (
            <Pressable
              key={off}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setDay(off)}
              style={[s.date, active && s.dateActive]}
            >
              <Text style={[s.dateSmall, active && s.onBall]}>
                {off === 0 ? "Heute" : WEEKDAYS[date.getDay()]}
              </Text>
              <Text style={[s.dateBig, active && s.onBall]}>
                {date.getDate()}
              </Text>
              <Text style={[s.dateSmall, active && s.onBall]}>
                {MONTHS[date.getMonth()]}
              </Text>
              <View
                style={[
                  s.dot,
                  daysWithGames.has(key) && {
                    backgroundColor: active ? colors.onBall : colors.ball,
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      {!data ? (
        <LoadState error={error} onRetry={refresh} />
      ) : games.length === 0 ? (
        <Empty>
          Kein Euroleague-Spiel an diesem Tag.
          {next
            ? `\nNächstes Spiel: ${next.home.shortName} – ${next.away.shortName}`
            : ""}
        </Empty>
      ) : (
        <>
          {mine.length > 0 && (
            <>
              <SectionHeader title="Meine Teams" />
              <View style={s.list}>
                {mine.map((g) => (
                  <GameCard key={g.code} game={g} />
                ))}
              </View>
            </>
          )}
          {rest.length > 0 && (
            <>
              <SectionHeader
                title={`Euroleague · Runde ${games[0].round}`}
                right={`${rest.length} Spiele`}
              />
              <View style={s.list}>
                {rest.map((g) => (
                  <GameCard key={g.code} game={g} />
                ))}
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  dates: { gap: 6, paddingHorizontal: space.lg, paddingVertical: space.md },
  date: {
    width: 52,
    paddingTop: 7,
    paddingBottom: 6,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
    alignItems: "center",
  },
  dateActive: { backgroundColor: colors.ball },
  dateSmall: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  dateBig: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  onBall: { color: colors.onBall },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
    backgroundColor: "transparent",
  },
  list: { gap: space.sm, paddingHorizontal: space.lg },
});
