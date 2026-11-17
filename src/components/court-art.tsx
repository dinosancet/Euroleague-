import { StyleSheet, View, type ViewStyle } from "react-native";

import { clubColors } from "@/data/clubs";
import { colors } from "@/theme";

/**
 * Placeholder artwork for news cards: a half-court sketch in the clubs' colours.
 * Replaced by real photos once a licensed news/photo source is connected.
 */
export function CourtArt({
  teams,
  style,
}: {
  teams: string[];
  style?: ViewStyle;
}) {
  const a = clubColors(teams[0]);
  const b = teams[1] ? clubColors(teams[1]) : a;
  return (
    <View style={[st.wrap, { backgroundColor: a[0] }, style]}>
      <View style={[st.half, { backgroundColor: b[1] }]} />
      <View style={st.shade} />
      <View style={st.midline} />
      <View style={st.circle} />
      <View style={[st.key, { left: -1 }]} />
      <View style={[st.key, { right: -1 }]} />
      <View style={st.ball} />
    </View>
  );
}

const line = "rgba(255,255,255,0.28)";
const st = StyleSheet.create({
  wrap: { overflow: "hidden", aspectRatio: 16 / 9, position: "relative" },
  half: { position: "absolute", top: 0, bottom: 0, right: 0, width: "50%" },
  shade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.ink,
    opacity: 0.4,
  },
  midline: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 1.5,
    backgroundColor: line,
  },
  circle: {
    position: "absolute",
    top: "32%",
    left: "40%",
    width: "20%",
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: line,
  },
  key: {
    position: "absolute",
    top: "34%",
    height: "32%",
    width: "19%",
    borderWidth: 1.5,
    borderColor: line,
  },
  ball: {
    position: "absolute",
    top: "30%",
    left: "30%",
    width: "11%",
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: colors.ball,
  },
});
