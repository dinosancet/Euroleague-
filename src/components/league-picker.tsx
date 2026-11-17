import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { LEAGUES, leagueById } from "@/data/leagues";
import { setLeague, useLeague } from "@/data/prefs";
import { colors, fonts, radius, space } from "@/theme";

/** Pill in the header that opens a sheet to switch the league. */
export function LeaguePicker() {
  const [open, setOpen] = useState(false);
  const league = leagueById(useLeague());

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Liga wählen, aktuell ${league.name}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          s.pill,
          pressed && { backgroundColor: colors.panel2 },
        ]}
      >
        <View style={s.dot}>
          <Text style={s.dotText}>{league.short}</Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={colors.text} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={s.backdrop}
          onPress={() => setOpen(false)}
          accessibilityLabel="Schließen"
        />
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>Liga wählen</Text>
          {LEAGUES.map((l) => {
            const active = l.id === league.id;
            return (
              <Pressable
                key={l.id}
                accessibilityRole="button"
                accessibilityState={{
                  selected: active,
                  disabled: !l.available,
                }}
                disabled={!l.available}
                onPress={() => {
                  setLeague(l.id);
                  setOpen(false);
                }}
                style={[s.row, active && s.rowActive]}
              >
                <View
                  style={[s.dot, s.dotLg, !l.available && { opacity: 0.4 }]}
                >
                  <Text style={s.dotText}>{l.short}</Text>
                </View>
                <Text style={[s.rowText, !l.available && s.muted]}>
                  {l.name}
                </Text>
                {l.available ? (
                  active ? (
                    <Ionicons name="checkmark" size={20} color={colors.ball} />
                  ) : null
                ) : (
                  <Text style={s.soon}>bald</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 5,
    paddingRight: 10,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
  },
  dot: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 4,
    borderRadius: 15,
    backgroundColor: colors.ball,
    alignItems: "center",
    justifyContent: "center",
  },
  dotLg: { minWidth: 36, height: 36, borderRadius: 18 },
  dotText: {
    fontFamily: fonts.displayHeavy,
    fontSize: 13,
    color: colors.onBall,
  },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.panel,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.lg,
    paddingBottom: space.xl + 12,
    gap: 4,
  },
  sheetTitle: {
    fontFamily: fonts.displayHeavy,
    fontSize: 22,
    color: colors.text,
    marginBottom: space.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
  },
  rowActive: { backgroundColor: colors.panel2 },
  rowText: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.text,
  },
  muted: { color: colors.muted },
  soon: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});
