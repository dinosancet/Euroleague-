import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text } from "react-native";

import { GameStrip } from "@/components/game-strip";
import { NewsCard } from "@/components/news-card";
import { Chip, Empty } from "@/components/ui";
import { load } from "@/data/api";
import { NEWS } from "@/data/news";
import { useFavorites, useLeague } from "@/data/prefs";
import { colors, fonts, space } from "@/theme";

type Feed = "foryou" | "top" | "transfers";

const FEEDS: [Feed, string][] = [
  ["foryou", "Für dich"],
  ["top", "Top News"],
  ["transfers", "Transfers"],
];

export default function HomeScreen() {
  const [feed, setFeed] = useState<Feed>("foryou");
  const [refreshing, setRefreshing] = useState(false);
  const favs = useFavorites();
  const league = useLeague();

  const inLeague = NEWS.filter((n) => n.league === league);
  const mine = (n: (typeof NEWS)[number]) =>
    n.teams.some((t) => favs.includes(t));
  const items =
    feed === "top"
      ? inLeague.filter((n) => n.top)
      : feed === "transfers"
        ? inLeague.filter((n) => n.kind === "transfer")
        : // "Für dich": your teams first, then everything else, newest first within each.
          [...inLeague].sort(
            (a, b) => Number(mine(b)) - Number(mine(a)) || a.ageMin - b.ageMin,
          );

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([load("/v1/games"), load("/v1/standings")]);
    setRefreshing(false);
  };

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: space.xl, gap: space.md }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={colors.ball}
        />
      }
    >
      <GameStrip />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chips}
      >
        {FEEDS.map(([k, label]) => (
          <Chip
            key={k}
            label={label}
            active={feed === k}
            onPress={() => setFeed(k)}
            large
          />
        ))}
      </ScrollView>
      {items.length === 0 ? (
        <Empty>Hier gibt es gerade nichts Neues.</Empty>
      ) : (
        items.map((n) => <NewsCard key={n.id} article={n} />)
      )}
      <Text style={s.notice}>
        Beispielartikel, bis eine Nachrichtenquelle angebunden ist.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  chips: { gap: 8, paddingHorizontal: space.lg },
  notice: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
    paddingHorizontal: space.lg,
  },
});
