import Ionicons from "@expo/vector-icons/Ionicons";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius, space } from "@/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

/** Placeholder for a tab that is planned but not built yet. */
export function ComingSoon({
  icon,
  title,
  text,
  points,
}: {
  icon: IconName;
  title: string;
  text: string;
  points: string[];
}) {
  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <View style={s.icon}>
        <Ionicons name={icon} size={40} color={colors.ball} />
      </View>
      <Text style={s.badge}>Kommt bald</Text>
      <Text style={s.title}>{title}</Text>
      <Text style={s.text}>{text}</Text>
      <View style={s.list}>
        {points.map((p) => (
          <View key={p} style={s.point}>
            <Ionicons name="checkmark-circle" size={18} color={colors.ball} />
            <Text style={s.pointText}>{p}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: {
    padding: space.xl,
    alignItems: "center",
    gap: space.md,
    paddingTop: 48,
  },
  icon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.ballSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.ball,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fonts.displayHeavy,
    fontSize: 30,
    color: colors.text,
    textAlign: "center",
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 340,
  },
  list: {
    alignSelf: "stretch",
    gap: space.sm,
    marginTop: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
  },
  point: { flexDirection: "row", gap: 10, alignItems: "center" },
  pointText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
});
