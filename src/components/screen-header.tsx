import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useStandings } from "@/data/api";
import { useFavorites } from "@/data/prefs";
import { colors, fonts } from "@/theme";

import { LeaguePicker } from "./league-picker";
import { TeamBadge } from "./ui";

/**
 * Header for the main tabs: profile button (opens "Meine Teams"), big title
 * and the league picker on the right.
 */
export function ScreenHeader({
  title,
  right,
}: {
  title: string;
  right?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const favs = useFavorites();
  const favTeam = useStandings().data?.rows.find(
    (r) => r.team.code === favs[0],
  )?.team;
  return (
    <View style={[s.wrap, { paddingTop: insets.top + 10 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Meine Teams und Einstellungen"
        onPress={() => router.push("/my-teams")}
        style={s.avatar}
      >
        {favs[0] ? (
          <TeamBadge
            team={favTeam ?? { code: favs[0], abbr: favs[0] }}
            size={40}
          />
        ) : (
          <Ionicons name="person" size={22} color={colors.onBall} />
        )}
      </Pressable>
      <Text style={s.title} numberOfLines={1}>
        {title}
      </Text>
      {right}
      <LeaguePicker />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.ink,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.ball,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.ball,
  },
  title: {
    flex: 1,
    fontFamily: fonts.displayHeavy,
    fontSize: 30,
    color: colors.text,
    letterSpacing: 0.3,
  },
});
