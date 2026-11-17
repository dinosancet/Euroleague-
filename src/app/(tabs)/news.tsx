import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { CourtArt } from "@/components/court-art";
import { Chip, Empty } from "@/components/ui";
import { allNews, useFavorites } from "@/data/store";
import { colors, fonts, radius, space } from "@/theme";

type Filter = "all" | "mine";

export default function NewsScreen() {
  const [filter, setFilter] = useState<Filter>("all");
  const favs = useFavorites();
  const items = allNews().filter(
    (n) => filter === "all" || n.teams.some((t) => favs.includes(t)),
  );
  const [first, ...rest] = items;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chips}
      >
        <Chip
          label="Für dich"
          active={filter === "all"}
          onPress={() => setFilter("all")}
        />
        <Chip
          label="Meine Teams"
          active={filter === "mine"}
          onPress={() => setFilter("mine")}
        />
      </ScrollView>

      {!first ? (
        <Empty>Zu deinen Teams gibt es gerade keine Artikel.</Empty>
      ) : (
        <>
          <Pressable
            accessibilityRole="link"
            onPress={() =>
              router.push({
                pathname: "/article/[id]",
                params: { id: first.id },
              })
            }
            style={s.hero}
          >
            <CourtArt teams={first.teams} />
            <View style={s.heroBody}>
              <Text style={s.kicker}>{first.tag}</Text>
              <Text style={s.heroTitle}>{first.title}</Text>
              <Text style={s.src}>{first.source}</Text>
            </View>
          </Pressable>
          <View style={s.list}>
            {rest.map((n) => (
              <Pressable
                key={n.id}
                accessibilityRole="link"
                onPress={() =>
                  router.push({
                    pathname: "/article/[id]",
                    params: { id: n.id },
                  })
                }
                style={s.item}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={s.kicker}>{n.tag}</Text>
                  <Text style={s.itemTitle}>{n.title}</Text>
                  <Text style={s.src}>{n.source}</Text>
                </View>
                <CourtArt teams={n.teams} style={s.thumb} />
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  chips: { gap: 6, paddingHorizontal: space.lg, paddingTop: space.md },
  hero: {
    margin: space.lg,
    marginBottom: space.sm,
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.panel,
  },
  heroBody: { padding: 14, gap: 4 },
  kicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.ball,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 27,
    color: colors.text,
  },
  src: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  list: { paddingHorizontal: space.lg },
  item: {
    flexDirection: "row",
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  itemTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  thumb: { width: 92, aspectRatio: 1, borderRadius: radius.md },
});
