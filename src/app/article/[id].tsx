import { router, Stack, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { CourtArt } from "@/components/court-art";
import { Empty, TeamBadge } from "@/components/ui";
import { useStandings } from "@/data/api";
import { newsById } from "@/data/news";
import { useFavorites } from "@/data/prefs";
import { colors, fonts, space } from "@/theme";

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const favs = useFavorites();
  const { data } = useStandings();
  const n = newsById(id);
  if (!n) return <Empty>Artikel nicht gefunden.</Empty>;

  return (
    <>
      <Stack.Screen options={{ title: n.tag }} />
      <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
        <CourtArt teams={n.teams} />
        <View style={s.body}>
          <Text style={s.kicker}>{n.tag}</Text>
          <Text style={s.title}>{n.title}</Text>
          <Text style={s.src}>{n.source}</Text>
          <Text style={s.p}>{n.body}</Text>
          <Text style={s.mention}>Erwähnte Teams</Text>
          {n.teams.map((tid) => {
            const t = data?.rows.find((r) => r.team.code === tid)?.team ?? {
              code: tid,
              abbr: tid,
              name: tid,
              shortName: tid,
            };
            return (
              <Pressable
                key={tid}
                accessibilityRole="link"
                onPress={() =>
                  router.push({ pathname: "/team/[id]", params: { id: tid } })
                }
                style={s.team}
              >
                <TeamBadge team={t} />
                <Text style={s.teamName}>{t.name}</Text>
                {favs.includes(tid) ? <Text style={s.star}>★</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  body: { padding: space.lg, gap: 6 },
  kicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.ball,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 31,
    color: colors.text,
  },
  src: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  p: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 24,
    color: "#d4d7ea",
    marginTop: space.md,
  },
  mention: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: space.lg,
  },
  team: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  teamName: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.text,
  },
  star: { color: colors.ball },
});
