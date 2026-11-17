import { Stack, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { GameCard } from "@/components/game-card";
import { Empty, Num, SectionHeader, TeamBadge } from "@/components/ui";
import {
  allTeams,
  standings,
  toggleFavorite,
  useFavorites,
  useGames,
} from "@/data/store";
import { colors, fonts, radius, space } from "@/theme";

export default function TeamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const favs = useFavorites();
  const games = useGames().filter((g) => g.home === id || g.away === id);
  const team = allTeams().find((t) => t.id === id);
  if (!team) return <Empty>Team nicht gefunden.</Empty>;
  const rank = standings().indexOf(team) + 1;
  const following = favs.includes(team.id);

  return (
    <>
      <Stack.Screen options={{ title: team.name }} />
      <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
        <View style={[s.hero, { backgroundColor: team.colors[0] }]}>
          <View style={[s.heroHalf, { backgroundColor: team.colors[1] }]} />
          <View style={s.heroShade} />
          <TeamBadge team={team} size={72} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.heroName}>{team.name}</Text>
            <Num style={s.heroSub}>
              {team.wins}–{team.losses} · Platz {rank} · {team.city}
            </Num>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: following }}
            onPress={() => toggleFavorite(team.id)}
            style={[s.follow, following && s.followOn]}
          >
            <Text style={[s.followText, following && { color: "#111" }]}>
              {following ? "Folge ich" : "Folgen"}
            </Text>
          </Pressable>
        </View>

        <View style={s.stats}>
          <Stat value={(team.pointsFor / 12).toFixed(1)} label="Punkte/Spiel" />
          <Stat
            value={(team.pointsAgainst / 12).toFixed(1)}
            label="Gegner/Spiel"
          />
          <Stat
            value={`${team.form.filter(Boolean).length}/5`}
            label="Letzte 5"
          />
        </View>

        <SectionHeader title="Spiele" />
        <View style={s.games}>
          {games.length ? (
            games.map((g) => <GameCard key={g.id} game={g} />)
          ) : (
            <Empty>Diese Woche spielfrei.</Empty>
          )}
        </View>

        <SectionHeader title="Kader" right="PPG" />
        <View style={s.list}>
          {team.roster.map((p) => (
            <View key={p.number} style={s.player}>
              <Num style={s.jersey}>{p.number}</Num>
              <View style={{ flex: 1 }}>
                <Text style={s.pName}>{p.name}</Text>
                <Text style={s.pSub}>
                  {p.position} · {p.heightCm} cm
                </Text>
              </View>
              <Num style={s.pPts}>{p.pointsPerGame}</Num>
            </View>
          ))}
        </View>
      </ScrollView>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.stat}>
      <Num style={s.statVal}>{value}</Num>
      <Text style={s.statLbl}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
    padding: space.lg,
    paddingVertical: 22,
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
  heroName: {
    fontFamily: fonts.displayHeavy,
    fontSize: 30,
    lineHeight: 30,
    color: "#fff",
    textTransform: "uppercase",
  },
  heroSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
  },
  follow: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  followOn: { backgroundColor: "#fff" },
  followText: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#fff" },
  stats: {
    flexDirection: "row",
    gap: space.sm,
    padding: space.lg,
    paddingBottom: 0,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    padding: space.md,
  },
  statVal: { fontFamily: fonts.display, fontSize: 24 },
  statLbl: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  games: { gap: space.sm, paddingHorizontal: space.lg },
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
});
