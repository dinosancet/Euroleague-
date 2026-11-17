import type { ApiGame } from "@shared/api";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useGames, useStandings } from "@/data/api";
import { useFavorites } from "@/data/prefs";
import { WEEKDAYS, formatTime, localDayKey } from "@/lib/format";
import { colors, fonts, radius, space } from "@/theme";

import { Num, TeamBadge } from "./ui";

/** Picks the games worth showing on Home: today's, else the next match day's. */
export function stripGames(
  games: ApiGame[],
  favs: string[],
  now = new Date(),
): ApiGame[] {
  const today = localDayKey(now);
  let pick = games.filter(
    (g) => g.status === "live" || localDayKey(new Date(g.startUtc)) === today,
  );
  if (!pick.length) {
    const next = games.find(
      (g) => g.status === "scheduled" && Date.parse(g.startUtc) > now.getTime(),
    );
    if (next) {
      const day = localDayKey(new Date(next.startUtc));
      pick = games.filter((g) => localDayKey(new Date(g.startUtc)) === day);
    }
  }
  const isFav = (g: ApiGame) =>
    favs.includes(g.home.code) || favs.includes(g.away.code);
  const rank = (g: ApiGame) =>
    (g.status === "live" ? 0 : 1) + (isFav(g) ? 0 : 2);
  return [...pick].sort(
    (a, b) => rank(a) - rank(b) || a.startUtc.localeCompare(b.startUtc),
  );
}

function statusLine(g: ApiGame, now: Date): [string, string] {
  if (g.status === "live")
    return [
      `${g.score[0]} - ${g.score[1]}`,
      g.period ? `Live · ${g.period > 4 ? "OT" : `Q${g.period}`}` : "Live",
    ];
  if (g.status === "final") return [`${g.score[0]} - ${g.score[1]}`, "Ende"];
  const d = new Date(g.startUtc);
  const day =
    localDayKey(d) === localDayKey(now) ? "Heute" : WEEKDAYS[d.getDay()];
  return [day, formatTime(g.startUtc)];
}

/** Horizontal row at the top of Home: your team first, then the day's games. */
export function GameStrip() {
  const favs = useFavorites();
  const { data } = useGames();
  const standings = useStandings();
  const now = new Date();
  const games = stripGames(data ?? [], favs, now);
  const favTeam = standings.data?.rows.find(
    (r) => r.team.code === favs[0],
  )?.team;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.row}
    >
      {favTeam && (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Teamseite ${favTeam.name}`}
          onPress={() =>
            router.push({
              pathname: "/team/[id]",
              params: { id: favTeam.code },
            })
          }
          style={s.fav}
        >
          <View style={s.ring}>
            <TeamBadge team={favTeam} size={64} />
          </View>
          <Text numberOfLines={1} style={s.favName}>
            {favTeam.shortName}
          </Text>
        </Pressable>
      )}
      {games.map((g) => {
        const [top, bottom] = statusLine(g, now);
        const live = g.status === "live";
        return (
          <Pressable
            key={g.code}
            accessibilityRole="link"
            accessibilityLabel={`${g.home.name} gegen ${g.away.name}`}
            onPress={() =>
              router.push({
                pathname: "/game/[id]",
                params: { id: String(g.code) },
              })
            }
            style={({ pressed }) => [
              s.card,
              live && s.cardLive,
              pressed && { backgroundColor: colors.panel2 },
            ]}
          >
            <View style={s.badges}>
              <TeamBadge team={g.home} size={34} />
              <TeamBadge team={g.away} size={34} />
            </View>
            <Num style={s.top}>{top}</Num>
            <Text style={[s.bottom, live && { color: colors.live }]}>
              {bottom}
            </Text>
          </Pressable>
        );
      })}
      {data && games.length === 0 && (
        <View style={[s.card, { justifyContent: "center" }]}>
          <Text style={s.bottom}>Keine Spiele geplant</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row: {
    gap: 10,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    alignItems: "stretch",
  },
  fav: { width: 92, alignItems: "center", gap: 6 },
  ring: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    borderColor: colors.ball,
    alignItems: "center",
    justifyContent: "center",
  },
  favName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.text,
    maxWidth: 92,
  },
  card: {
    width: 116,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    gap: 4,
  },
  cardLive: { borderColor: "rgba(255,61,90,0.5)" },
  badges: { flexDirection: "row", gap: 8, marginBottom: 4 },
  top: { fontFamily: fonts.bodyBold, fontSize: 15 },
  bottom: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
});
