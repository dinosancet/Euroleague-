import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { MONTHS_LONG, dayFromKey, localDayKey, monthGrid } from "@/lib/format";
import { colors, fonts, radius, space } from "@/theme";

const HEAD = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/**
 * Bottom sheet with a month calendar. Game days get an orange dot, today a
 * ring, the picked day is filled. Arrows switch months; tapping a day picks it.
 */
export function GameCalendar({
  open,
  selected,
  gameDays,
  onPick,
  onClose,
}: {
  open: boolean;
  selected: string;
  gameDays: Map<string, number>;
  onPick: (key: string) => void;
  onClose: () => void;
}) {
  const sel = dayFromKey(selected);
  const [view, setView] = useState({ y: sel.getFullYear(), m: sel.getMonth() });

  // Each time the sheet opens, start at the month of the picked day.
  useEffect(() => {
    if (open) setView({ y: sel.getFullYear(), m: sel.getMonth() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const move = (delta: number) =>
    setView(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const today = localDayKey(new Date());
  const rows = monthGrid(view.y, view.m);
  const prefix = `${view.y}-${String(view.m + 1).padStart(2, "0")}-`;
  const inMonth = [...gameDays.keys()].filter((k) => k.startsWith(prefix));
  const gamesInMonth = inMonth.reduce((n, k) => n + gameDays.get(k)!, 0);

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={s.backdrop}
        onPress={onClose}
        accessibilityLabel="Kalender schließen"
      />
      <View style={s.sheet}>
        <View style={s.head}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voriger Monat"
            onPress={() => move(-1)}
            hitSlop={8}
            style={s.arrow}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <View style={{ alignItems: "center" }}>
            <Text style={s.title}>
              {MONTHS_LONG[view.m]} {view.y}
            </Text>
            <Text style={s.sub}>
              {inMonth.length
                ? `${inMonth.length} Spieltage · ${gamesInMonth} Spiele`
                : "Keine Spiele in diesem Monat"}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nächster Monat"
            onPress={() => move(1)}
            hitSlop={8}
            style={s.arrow}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </View>

        <View style={s.row}>
          {HEAD.map((h) => (
            <Text key={h} style={[s.cell, s.weekday]}>
              {h}
            </Text>
          ))}
        </View>

        {rows.map((row, i) => (
          <View key={i} style={s.row}>
            {row.map((key, j) => {
              if (!key) return <View key={j} style={s.cell} />;
              const count = gameDays.get(key) ?? 0;
              const active = key === selected;
              const isToday = key === today;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${dayFromKey(key).getDate()}. ${
                    MONTHS_LONG[view.m]
                  }${count ? `, ${count} Spiele` : ""}`}
                  onPress={() => {
                    onPick(key);
                    onClose();
                  }}
                  style={s.cell}
                >
                  <View
                    style={[
                      s.day,
                      count > 0 && s.dayGames,
                      isToday && s.dayToday,
                      active && s.dayActive,
                    ]}
                  >
                    <Text
                      style={[
                        s.dayText,
                        count > 0 && s.dayTextGames,
                        active && { color: colors.onBall },
                      ]}
                    >
                      {dayFromKey(key).getDate()}
                    </Text>
                  </View>
                  <View
                    style={[
                      s.dot,
                      count > 0 && !active && { backgroundColor: colors.ball },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        ))}

        <View style={s.foot}>
          <View style={s.legend}>
            <View style={[s.dot, { backgroundColor: colors.ball }]} />
            <Text style={s.sub}>Spieltag</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onPick(today);
              onClose();
            }}
            style={({ pressed }) => [
              s.todayBtn,
              pressed && { backgroundColor: colors.line },
            ]}
          >
            <Text style={s.todayText}>Heute</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
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
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.md,
  },
  arrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.panel2,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: fonts.displayHeavy, fontSize: 22, color: colors.text },
  sub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  row: { flexDirection: "row" },
  cell: { flex: 1, alignItems: "center", paddingVertical: 3 },
  weekday: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    textAlign: "center",
    paddingBottom: 6,
  },
  day: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  dayGames: { backgroundColor: colors.ballSoft },
  dayToday: { borderWidth: 1.5, borderColor: colors.text },
  dayActive: { backgroundColor: colors.ball, borderColor: colors.ball },
  dayText: { fontFamily: fonts.body, fontSize: 15, color: colors.muted },
  dayTextGames: { fontFamily: fonts.bodyBold, color: colors.text },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
    backgroundColor: "transparent",
  },
  foot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.md,
  },
  legend: { flexDirection: "row", alignItems: "center", gap: 6 },
  todayBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.panel2,
  },
  todayText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
});
