import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router/js-tabs";
import { StyleSheet, Text, View, type ColorValue } from "react-native";

import { colors, fonts } from "@/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function HeaderTitle({ children }: { children: string }) {
  return (
    <View style={s.titleRow}>
      <View style={s.logo}>
        <Ionicons name="basketball" size={30} color={colors.ball} />
      </View>
      <Text style={s.title}>{children}</Text>
    </View>
  );
}

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color as string} size={size} />
  );

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.ink,
          borderBottomColor: colors.line,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
        headerTitleAlign: "left",
        headerTitle: ({ children }) => <HeaderTitle>{children}</HeaderTitle>,
        tabBarStyle: {
          backgroundColor: colors.ink,
          borderTopColor: colors.line,
        },
        tabBarActiveTintColor: colors.ball,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.ink },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Scores", tabBarIcon: icon("basketball-outline") }}
      />
      <Tabs.Screen
        name="news"
        options={{ title: "News", tabBarIcon: icon("newspaper-outline") }}
      />
      <Tabs.Screen
        name="standings"
        options={{ title: "Tabelle", tabBarIcon: icon("podium-outline") }}
      />
      <Tabs.Screen
        name="my-teams"
        options={{ title: "Meine Teams", tabBarIcon: icon("star-outline") }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.displayHeavy,
    fontSize: 26,
    color: colors.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
