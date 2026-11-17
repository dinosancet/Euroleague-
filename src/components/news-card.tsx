import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";

import { ageLabel, type NewsArticle } from "@/data/news";
import { colors, fonts, radius, space } from "@/theme";

import { CourtArt } from "./court-art";

export function NewsCard({ article }: { article: NewsArticle }) {
  const share = () => Share.share({ message: article.title }).catch(() => {});
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() =>
        router.push({ pathname: "/article/[id]", params: { id: article.id } })
      }
      style={({ pressed }) => [
        s.card,
        pressed && { backgroundColor: colors.panel2 },
      ]}
    >
      <View style={s.top}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text
            style={[
              s.kicker,
              article.kind === "transfer" && { color: colors.win },
            ]}
          >
            {article.tag}
          </Text>
          <Text style={s.title} numberOfLines={4}>
            {article.title}
          </Text>
        </View>
        <CourtArt teams={article.teams} style={s.thumb} />
      </View>
      <View style={s.footer}>
        <View style={s.srcIcon}>
          <Ionicons name="basketball" size={14} color={colors.onBall} />
        </View>
        <Text style={s.src} numberOfLines={1}>
          {article.source} · {ageLabel(article.ageMin)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Teilen"
          onPress={share}
          hitSlop={8}
          style={s.share}
        >
          <Ionicons name="share-outline" size={18} color={colors.text} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: space.lg,
    padding: space.lg,
    gap: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
  },
  top: { flexDirection: "row", gap: space.md },
  kicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.ball,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    lineHeight: 23,
    color: colors.text,
  },
  thumb: { width: 108, aspectRatio: 4 / 3, borderRadius: radius.sm },
  footer: { flexDirection: "row", alignItems: "center", gap: 8 },
  srcIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.ball,
    alignItems: "center",
    justifyContent: "center",
  },
  src: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  share: {
    width: 36,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
});
