import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { GameCard } from "@/components/game-card";
import { LoadState } from "@/components/load-state";
import { Empty, Num, SectionHeader, TeamBadge } from "@/components/ui";
import { useGames, useRoster, useStandings } from "@/data/api";
import { clubColors } from "@/data/clubs";
import { toggleFavorite, useFavorites } from "@/data/prefs";
import { colors, fonts, radius, space } from "@/theme";

export default function TeamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const favs = useFavorites();
  const roster = useRoster(id);
  const standings = useStandings();
  const games = useGames();

  const row = standings.data?.rows.find((r) => r.team.code === id);
  const team = roster.data?.team ?? row?.team;
  if (!team)
    return (
      <LoadState
        error={roster.error ?? standings.error}
        onRetry={roster.refresh}
      />
    );

  const following = favs.includes(team.code);
  const [c1, c2] = clubColors(team.code);
  const teamGames = (games.data ?? []).filter(
    (g) => g.home.code === team.code || g.away.code === team.code,
  );
  const lastIdx = teamGames
    .map((g) => g.status !== "scheduled")
    .lastIndexOf(true);
  const recent = teamGames.slice(Math.max(0, lastIdx - 1), lastIdx + 1);
  const upcoming = teamGames.slice(lastIdx + 1, lastIdx + 4);
  const played = row ? row.wins + row.losses : 0;

  return (
    <>
      <Stack.Screen options={{ title: team.shortName }} />
      <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
        <View style={[s.hero, { backgroundColor: c1 }]}>
          <View style={[s.heroHalf, { backgroundColor: c2 }]} />
          <View style={s.heroShade} />
          <TeamBadge team={team} size={72} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.heroName}>{team.shortName}</Text>
            <Num style={s.heroSub}>
              {row
                ? `${row.wins}–${row.losses} · Platz ${row.position}`
                : team.name}
            </Num>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: following }}
            onPress={() => toggleFavorite(team.code)}
            style={[s.follow, following && s.followOn]}
          >
            <Text style={[s.followText, following && { color: "#111" }]}>
              {following ? "Folge ich" : "Folgen"}
            </Text>
          </Pressable>
        </View>

        {row && played > 0 && (
          <View style={s.stats}>
            <Stat
              value={(row.pointsFor / played).toFixed(1)}
              label="Punkte/Spiel"
            />
            <Stat
              value={(row.pointsAgainst / played).toFixed(1)}
              label="Gegner/Spiel"
            />
            <Stat
              value={`${row.form.filter(Boolean).length}/${row.form.length}`}
              label="Letzte 5"
            />
          </View>
        )}

        {recent.length > 0 && (
          <>
            <SectionHeader title="Letzte Spiele" />
            <View style={s.games}>
              {recent.map((g) => (
                <GameCard key={g.code} game={g} />
              ))}
            </View>
          </>
        )}
        {upcoming.length > 0 && (
          <>
            <SectionHeader title="Nächste Spiele" />
            <View style={s.games}>
              {upcoming.map((g) => (
                <GameCard key={g.code} game={g} />
              ))}
            </View>
          </>
        )}

        <SectionHeader
          title="Kader"
          right={
            roster.data?.coach ? `Trainer: ${roster.data.coach}` : undefined
          }
        />
        <View style={s.list}>
          {!roster.data ? (
            roster.error ? (
              <Empty>{roster.error}</Empty>
            ) : (
              <Empty>Kader wird geladen …</Empty>
            )
          ) : (
            roster.data.players.map((p) => (
              <Pressable
                key={`${p.number}-${p.name}`}
                style={s.player}
                accessibilityRole="link"
                accessibilityLabel={`Spielerseite ${p.name}`}
                onPress={() =>
                  router.push({
                    pathname: "/player/[id]",
                    params: { id: p.id },
                  })
                }
              >
                {p.photo ? (
                  <Image
                    source={{ uri: p.photo }}
                    style={s.photo}
                    contentFit="cover"
                    contentPosition="top"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <Num style={s.jersey}>{p.number}</Num>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.pName}>{p.name}</Text>
                  <Text style={s.pSub}>
                    {[
                      p.position,
                      p.heightCm ? `${p.heightCm} cm` : null,
                      p.country,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
                <Num style={s.pNo}>{p.number}</Num>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.muted}
                />
              </Pressable>
            ))
          )}
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
  photo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.panel2,
  },
  pNo: { fontFamily: fonts.display, fontSize: 18, color: colors.muted },
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
});
