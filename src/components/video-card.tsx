import Ionicons from "@expo/vector-icons/Ionicons";
import type { ApiGame, ApiTeam } from "@shared/api";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";

import { ageLabel } from "@/data/news";
import { playVideo, type Video, viewsLabel } from "@/data/videos";
import { colors, fonts, radius, space } from "@/theme";

import { Num, TeamBadge } from "./ui";

/** 16:9 thumbnail with a play button; tapping plays the video on YouTube. */
export function VideoThumb({
  video,
  big,
  style,
}: {
  video: Video;
  big?: boolean;
  style?: object;
}) {
  const views = viewsLabel(video.views);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Video abspielen: ${video.title}`}
      onPress={() => playVideo(video)}
      style={({ pressed }) => [
        s.thumbWrap,
        style,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Image
        source={video.thumbnail}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={150}
        accessibilityIgnoresInvertColors
      />
      <View style={s.shade} />
      <View style={[s.play, big && s.playBig]}>
        <Ionicons name="play" size={big ? 26 : 18} color={colors.onBall} />
      </View>
      <View style={s.tagPill}>
        <Text style={s.tagPillText}>{video.tag}</Text>
      </View>
      {views ? (
        <View style={s.viewsPill}>
          <Ionicons name="eye-outline" size={12} color={colors.text} />
          <Text style={s.viewsText}>{views}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * One video as a card: thumbnail, headline, channel and age. Game highlights
 * also show the result, which opens the game.
 */
export function VideoCard({
  video,
  game,
  teams,
  big,
}: {
  video: Video;
  game?: ApiGame;
  /** Known clubs by code, for badges when the game isn't linked. */
  teams?: Map<string, ApiTeam>;
  big?: boolean;
}) {
  const share = () =>
    Share.share({ message: `${video.title}\n${video.url}` }).catch(() => {});
  const meta = `${video.channel} · ${ageLabel(video.publishedUtc)}`;
  return (
    <View style={s.card}>
      <VideoThumb video={video} big={big} />
      <View style={s.body}>
        <Pressable accessibilityRole="button" onPress={() => playVideo(video)}>
          <Text style={[s.headline, big && s.headlineBig]} numberOfLines={3}>
            {video.headline}
          </Text>
        </Pressable>
        {game ? (
          <GameRow game={game} />
        ) : video.teams.length > 0 && teams ? (
          <View style={s.teams}>
            {video.teams.slice(0, 4).map((c) => (
              <TeamBadge
                key={c}
                team={teams.get(c) ?? { code: c, abbr: c }}
                size={20}
              />
            ))}
          </View>
        ) : null}
        <View style={s.footer}>
          <View style={s.srcIcon}>
            <Ionicons name="logo-youtube" size={13} color="#fff" />
          </View>
          <Text style={s.meta} numberOfLines={1}>
            {meta}
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
      </View>
    </View>
  );
}

/** "MUN 84–79 ULK · Runde 4", opens the game. */
function GameRow({ game }: { game: ApiGame }) {
  const [h, a] = game.score;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Zum Spiel ${game.home.name} gegen ${game.away.name}`}
      onPress={() =>
        router.push({ pathname: "/game/[id]", params: { id: game.code } })
      }
      style={({ pressed }) => [s.game, pressed && { opacity: 0.8 }]}
    >
      <TeamBadge team={game.home} size={22} />
      <Text style={s.gameAbbr}>{game.home.abbr}</Text>
      <Num style={s.gameScore}>
        {h}–{a}
      </Num>
      <Text style={s.gameAbbr}>{game.away.abbr}</Text>
      <TeamBadge team={game.away} size={22} />
      <Text style={s.gameRound} numberOfLines={1}>
        Runde {game.round}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

/** Vertical tile for YouTube Shorts in a horizontal row. */
export function ShortTile({ video }: { video: Video }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Short abspielen: ${video.title}`}
      onPress={() => playVideo(video)}
      style={({ pressed }) => [s.short, pressed && { opacity: 0.85 }]}
    >
      <Image
        source={video.thumbnail}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={150}
        accessibilityIgnoresInvertColors
      />
      <View style={s.shortShade} />
      <Ionicons
        name="play"
        size={16}
        color="#fff"
        style={{ position: "absolute", top: 10, right: 10 }}
      />
      <Text style={s.shortTitle} numberOfLines={3}>
        {video.title.replace(/\s*#\S+/g, "")}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  thumbWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: colors.panel2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  shade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(13,16,32,0.18)",
  },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.ball,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 3,
  },
  playBig: { width: 62, height: 62, borderRadius: 31 },
  tagPill: {
    position: "absolute",
    left: 10,
    bottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: "rgba(13,16,32,0.82)",
  },
  tagPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.text,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  viewsPill: {
    position: "absolute",
    right: 10,
    bottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: "rgba(13,16,32,0.82)",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewsText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.text },
  body: { padding: space.lg, gap: space.md },
  headline: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    lineHeight: 23,
    color: colors.text,
  },
  headlineBig: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 30,
  },
  teams: { flexDirection: "row", gap: 6 },
  game: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    backgroundColor: colors.panel2,
  },
  gameAbbr: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  gameScore: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  gameRound: {
    flex: 1,
    textAlign: "right",
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  footer: { flexDirection: "row", alignItems: "center", gap: 8 },
  srcIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#e62117",
    alignItems: "center",
    justifyContent: "center",
  },
  meta: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  share: {
    width: 36,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  short: {
    width: 128,
    aspectRatio: 9 / 16,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.panel2,
    justifyContent: "flex-end",
  },
  shortShade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(13,16,32,0.35)",
  },
  shortTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    lineHeight: 16,
    color: "#fff",
    padding: 10,
  },
});
