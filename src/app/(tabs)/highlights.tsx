import type { ApiGame, ApiTeam } from "@shared/api";
import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text } from "react-native";

import { LoadState } from "@/components/load-state";
import { Chip, Empty, SectionHeader } from "@/components/ui";
import { ShortTile, VideoCard } from "@/components/video-card";
import { load, useGames } from "@/data/api";
import { useFavorites, useLeague } from "@/data/prefs";
import { useVideos, type Video } from "@/data/videos";
import { colors, fonts, space } from "@/theme";

type Filter = "all" | "mine" | "games" | "plays";

const FILTERS: [Filter, string][] = [
  ["all", "Alle"],
  ["mine", "Meine Teams"],
  ["games", "Spiele"],
  ["plays", "Top-Plays"],
];

export default function HighlightsScreen() {
  const [filter, setFilter] = useState<Filter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const favs = useFavorites();
  const league = useLeague();
  const videos = useVideos();
  const games = useGames();

  const gameByCode = useMemo(
    () => new Map((games.data ?? []).map((g) => [g.code, g] as const)),
    [games.data],
  );
  const teams = useMemo(() => {
    const m = new Map<string, ApiTeam>();
    for (const g of games.data ?? []) {
      m.set(g.home.code, g.home);
      m.set(g.away.code, g.away);
    }
    return m;
  }, [games.data]);
  const gameOf = (v: Video): ApiGame | undefined =>
    v.gameCode !== null ? gameByCode.get(v.gameCode) : undefined;

  const inLeague = (videos.data ?? []).filter((v) => v.league === league);
  const mine = (v: Video) => v.teams.some((t) => favs.includes(t));
  const shorts = inLeague.filter((v) => v.short);
  const long = inLeague.filter((v) => !v.short);
  const list =
    filter === "mine"
      ? inLeague.filter(mine)
      : filter === "games"
        ? long.filter((v) => v.kind === "game")
        : filter === "plays"
          ? long.filter((v) => v.kind === "plays")
          : long;

  // "Alle": the newest highlight video big on top, Shorts in a row after it.
  const [hero, ...rest] = list;
  const showShorts = filter === "all" && shorts.length > 0;

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([load("/v1/videos"), load("/v1/games")]);
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chips}
      >
        {FILTERS.map(([k, label]) => (
          <Chip
            key={k}
            label={label}
            active={filter === k}
            onPress={() => setFilter(k)}
            large
          />
        ))}
      </ScrollView>
      {!videos.data ? (
        <LoadState error={videos.error} onRetry={videos.refresh} />
      ) : !hero ? (
        <Empty>
          {filter === "mine"
            ? favs.length
              ? "Zu deinen Teams gibt es gerade keine Videos."
              : "Wähle oben rechts deine Teams, dann siehst du hier ihre Videos."
            : "Hier gibt es gerade keine Videos."}
        </Empty>
      ) : (
        <>
          <VideoCard video={hero} game={gameOf(hero)} teams={teams} big />
          {showShorts ? (
            <>
              <SectionHeader title="Shorts" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.shorts}
              >
                {shorts.map((v) => (
                  <ShortTile key={v.id} video={v} />
                ))}
              </ScrollView>
              {rest.length ? <SectionHeader title="Mehr Videos" /> : null}
            </>
          ) : null}
          {rest.map((v) => (
            <VideoCard key={v.id} video={v} game={gameOf(v)} teams={teams} />
          ))}
        </>
      )}
      {videos.data ? (
        <Text style={s.notice}>
          Videos vom offiziellen YouTube-Kanal der EuroLeague. Sie öffnen sich
          auf YouTube.
        </Text>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  chips: { gap: 8, paddingHorizontal: space.lg, paddingTop: space.md },
  shorts: { gap: 10, paddingHorizontal: space.lg },
  notice: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
    paddingHorizontal: space.lg,
  },
});
