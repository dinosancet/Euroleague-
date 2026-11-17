import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { SectionHeader, TeamBadge } from "@/components/ui";
import {
  allTeams,
  toggleFavorite,
  togglePush,
  useFavorites,
  usePush,
  type PushSettings,
} from "@/data/store";
import { colors, fonts, radius, space } from "@/theme";

const PUSH: [keyof PushSettings, string, string][] = [
  ["tipOff", "Spielbeginn", "15 Minuten vor Tip-off deiner Teams"],
  ["finalScore", "Endstand", "Ergebnis direkt nach der Schlusssirene"],
  ["news", "Top-News", "Transfers und Verletzungen deiner Teams"],
];

export default function MyTeamsScreen() {
  const favs = useFavorites();
  const push = usePush();

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
      <SectionHeader
        title="Teams, denen du folgst"
        right={`${favs.length} gewählt`}
      />
      <View style={s.grid}>
        {allTeams().map((t) => {
          const on = favs.includes(t.id);
          return (
            <Pressable
              key={t.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggleFavorite(t.id)}
              style={[s.team, on && s.teamOn]}
            >
              <TeamBadge team={t} />
              <Text numberOfLines={1} style={s.teamName}>
                {t.name}
              </Text>
              <View style={[s.check, on && s.checkOn]}>
                {on ? <Text style={s.checkMark}>✓</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="Benachrichtigungen" />
      {PUSH.map(([key, label, desc]) => (
        <View key={key} style={s.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.toggleLabel}>{label}</Text>
            <Text style={s.toggleDesc}>{desc}</Text>
          </View>
          <Switch
            accessibilityLabel={label}
            value={push[key]}
            onValueChange={() => togglePush(key)}
            trackColor={{ false: colors.panel2, true: colors.ball }}
            thumbColor="#fff"
          />
        </View>
      ))}
      <Text style={s.note}>
        Push-Nachrichten werden angebunden, sobald ein Live-Datenanbieter
        feststeht.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  team: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: "transparent",
  },
  teamOn: { borderColor: colors.ball, backgroundColor: colors.ballSoft },
  teamName: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.text,
  },
  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { borderColor: colors.ball, backgroundColor: colors.ball },
  checkMark: { fontSize: 11, color: colors.onBall, fontFamily: fonts.bodyBold },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  toggleLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  toggleDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  note: {
    margin: space.lg,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.line,
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
});
