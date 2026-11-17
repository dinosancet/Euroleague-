import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router/js-tabs";
import { StyleSheet, type ColorValue } from "react-native";

import { ScreenHeader } from "@/components/screen-header";
import { colors, fonts } from "@/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const icon =
  (outline: IconName, filled: IconName) =>
  ({
    color,
    size,
    focused,
  }: {
    color: ColorValue;
    size: number;
    focused: boolean;
  }) => (
    <Ionicons
      name={focused ? filled : outline}
      color={color as string}
      size={size}
    />
  );

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        header: ({ options }) => <ScreenHeader title={options.title ?? ""} />,
        tabBarStyle: {
          backgroundColor: colors.ink,
          borderTopColor: colors.line,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.ink },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: icon("home-outline", "home") }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: "Spiele",
          tabBarIcon: icon("basketball-outline", "basketball"),
        }}
      />
      <Tabs.Screen
        name="standings"
        options={{
          title: "Tabelle",
          tabBarIcon: icon("podium-outline", "podium"),
        }}
      />
      <Tabs.Screen
        name="highlights"
        options={{
          title: "Highlights",
          tabBarIcon: icon("play-circle-outline", "play-circle"),
        }}
      />
      <Tabs.Screen
        name="tips"
        options={{
          title: "Tipps",
          tabBarIcon: icon("trophy-outline", "trophy"),
        }}
      />
    </Tabs>
  );
}
