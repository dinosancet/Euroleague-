import { useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { SectionHeader, TeamBadge } from "@/components/ui";
import { LoadState } from "@/components/load-state";
import { useStandings } from "@/data/api";
import {
  toggleFavorite,
  togglePush,
  useFavorites,
  usePush,
  type PushSettings,
} from "@/data/prefs";
import { sendTestPush, syncPush, usePushStatus } from "@/data/push";
import { colors, fonts, radius, space } from "@/theme";

const PUSH: [keyof PushSettings, string, string][] = [
  ["tipOff", "Spielbeginn", "15 Minuten vor Tip-off deiner Teams"],
  ["finalScore", "Endstand", "Ergebnis direkt nach der Schlusssirene"],
  ["news", "Top-News", "Transfers und Verletzungen deiner Teams (kommt bald)"],
];

export default function MyTeamsScreen() {
  const favs = useFavorites();
  const push = usePush();
  const { data, error, refresh } = useStandings();
  const teams = (data?.rows ?? [])
    .map((r) => r.team)
    .sort((a, b) => a.shortName.localeCompare(b.shortName));

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
      <SectionHeader
        title="Teams, denen du folgst"
        right={`${favs.length} gewählt`}
      />
      {!data && <LoadState error={error} onRetry={refresh} />}
      <View style={s.grid}>
        {teams.map((t) => {
          const on = favs.includes(t.code);
          return (
            <Pressable
              key={t.code}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggleFavorite(t.code)}
              style={[s.team, on && s.teamOn]}
            >
              <TeamBadge team={t} />
              <Text numberOfLines={1} style={s.teamName}>
                {t.shortName}
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
      <PushPanel teams={favs.length} />
    </ScrollView>
  );
}

function PushPanel({ teams }: { teams: number }) {
  const status = usePushStatus();
  const [test, setTest] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const runTest = async () => {
    setBusy(true);
    const err = await sendTestPush();
    setBusy(false);
    setTest(
      err ??
        "Test-Nachricht ist unterwegs. Sie kommt in ein paar Sekunden, auch wenn die App geschlossen ist.",
    );
  };

  let text: string;
  let action: { label: string; onPress: () => void } | null = null;
  let ok = false;
  switch (status.kind) {
    case "checking":
      text = "Prüfe Benachrichtigungen …";
      break;
    case "unsupported":
      text = "Push-Nachrichten gibt es nur in der App auf dem Handy.";
      break;
    case "ask":
      text =
        "Erlaube Benachrichtigungen, damit du Spielbeginn und Endstand deiner Teams bekommst.";
      action = {
        label: "Benachrichtigungen erlauben",
        onPress: () => syncPush(true),
      };
      break;
    case "denied":
      text =
        "Benachrichtigungen sind in den Einstellungen deines Handys ausgeschaltet.";
      action = {
        label: "Einstellungen öffnen",
        onPress: () => Linking.openSettings(),
      };
      break;
    case "off":
      text =
        teams === 0
          ? "Wähle oben mindestens ein Team, dann bekommst du Nachrichten zu seinen Spielen."
          : "Schalte Spielbeginn oder Endstand ein, um Nachrichten zu bekommen.";
      break;
    case "push":
      ok = true;
      text = `Push ist aktiv für ${teams} ${teams === 1 ? "Team" : "Teams"}. Die Nachrichten kommen auch, wenn die App geschlossen ist.`;
      action = { label: "Test-Nachricht senden", onPress: runTest };
      break;
    case "local":
      text = `${status.reason} ${status.reminders} ${status.reminders === 1 ? "Erinnerung" : "Erinnerungen"} für die nächsten zwei Wochen geplant.`;
      action = { label: "Test-Nachricht senden", onPress: runTest };
      break;
  }

  return (
    <View style={[s.note, ok && s.noteOk]}>
      <Text style={s.noteText}>{text}</Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={action.onPress}
          style={({ pressed }) => [
            s.button,
            (pressed || busy) && { opacity: 0.6 },
          ]}
        >
          <Text style={s.buttonText}>{action.label}</Text>
        </Pressable>
      ) : null}
      {test ? <Text style={s.noteText}>{test}</Text> : null}
    </View>
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
    gap: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.line,
  },
  noteOk: { borderStyle: "solid", borderColor: colors.win },
  noteText: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
  button: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.ball,
  },
  buttonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.onBall,
  },
});
