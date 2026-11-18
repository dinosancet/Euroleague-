import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { CourtArt } from "@/components/court-art";
import { LoadState } from "@/components/load-state";
import { Empty, TeamBadge } from "@/components/ui";
import { useStandings } from "@/data/api";
import { ageLabel, useNews } from "@/data/news";
import { useFavorites } from "@/data/prefs";
import { colors, fonts, radius, space } from "@/theme";

/**
 * Preview of one story: picture, headline and teaser from the feed. The full
 * article opens on the publisher's site, so the text is never copied.
 */
export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const favs = useFavorites();
  const { data } = useStandings();
  const news = useNews();
  const n = news.data?.find((x) => x.id === id);
  if (!n) {
    if (!news.data)
      return <LoadState error={news.error} onRetry={news.refresh} />;
    return <Empty>Diesen Artikel gibt es nicht mehr.</Empty>;
  }

  const open = () =>
    WebBrowser.openBrowserAsync(n.url, {
      toolbarColor: colors.ink,
      controlsColor: colors.ball,
    }).catch(() => {});

  return (
    <>
      <Stack.Screen options={{ title: n.tag }} />
      <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
        {n.image ? (
          <Image
            source={n.image}
            style={s.hero}
            contentFit="cover"
            transition={150}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <CourtArt teams={n.teams} />
        )}
        <View style={s.body}>
          <Text
            style={[s.kicker, n.kind === "transfer" && { color: colors.win }]}
          >
            {n.tag}
          </Text>
          <Text style={s.title}>{n.title}</Text>
          <Text style={s.src}>
            {n.source} · {ageLabel(n.publishedUtc)}
          </Text>
          {n.teaser ? <Text style={s.p}>{n.teaser}</Text> : null}
          <Pressable
            accessibilityRole="link"
            onPress={open}
            style={({ pressed }) => [s.read, pressed && { opacity: 0.85 }]}
          >
            <Text style={s.readText}>Ganzen Artikel bei {n.source} lesen</Text>
            <Ionicons name="open-outline" size={16} color={colors.onBall} />
          </Pressable>
          {n.teams.length > 0 ? (
            <Text style={s.mention}>Erwähnte Teams</Text>
          ) : null}
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
  hero: { width: "100%", aspectRatio: 16 / 9, backgroundColor: colors.panel2 },
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
  read: {
    marginTop: space.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: radius.pill,
    backgroundColor: colors.ball,
  },
  readText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.onBall },
  mention: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: space.xl,
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
