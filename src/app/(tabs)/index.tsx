import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { GameCard } from "@/components/game-card";
import { Empty, SectionHeader } from "@/components/ui";
import { SAMPLE_TODAY, useFavorites, useGames } from "@/data/store";
import { colors, fonts, radius, space } from "@/theme";

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const OFFSETS = [-3, -2, -1, 0, 1, 2, 3];

export default function ScoresScreen() {
  const [day, setDay] = useState(0);
  const games = useGames().filter((g) => g.dayOffset === day);
  const favs = useFavorites();
  const mine = games.filter(
    (g) => favs.includes(g.home) || favs.includes(g.away),
  );
  const rest = games.filter((g) => !mine.includes(g));

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.dates}
      >
        {OFFSETS.map((off) => {
          const d = new Date(SAMPLE_TODAY);
          d.setDate(d.getDate() + off);
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
                {off === 0 ? "Heute" : WEEKDAYS[d.getDay()]}
              </Text>
              <Text style={[s.dateBig, active && s.onBall]}>{d.getDate()}</Text>
              <Text style={[s.dateSmall, active && s.onBall]}>Nov</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {games.length === 0 ? (
        <Empty>Kein Spiel an diesem Tag.</Empty>
      ) : (
        <>
          {mine.length > 0 && (
            <>
              <SectionHeader title="Meine Teams" />
              <View style={s.list}>
                {mine.map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </View>
            </>
          )}
          <SectionHeader
            title={`Euroleague · Runde ${games[0].round}`}
            right={`${rest.length} Spiele`}
          />
          <View style={s.list}>
            {rest.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  dates: { gap: 6, paddingHorizontal: space.lg, paddingVertical: space.md },
  date: {
    width: 52,
    paddingVertical: 7,
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
  list: { gap: space.sm, paddingHorizontal: space.lg },
});
