import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GameCalendar } from "@/components/game-calendar";
import { GameCard } from "@/components/game-card";
import { LoadState } from "@/components/load-state";
import { Empty, SectionHeader } from "@/components/ui";
import { useGames } from "@/data/api";
import { useFavorites } from "@/data/prefs";
import {
  MONTHS,
  MONTHS_LONG,
  WEEKDAYS,
  addDays,
  dayFromKey,
  formatDay,
  localDayKey,
  weekOf,
} from "@/lib/format";
import { colors, fonts, radius, space } from "@/theme";

export default function GamesScreen() {
  const today = localDayKey(new Date());
  const [selectedKey, setSelectedKey] = useState(today);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { data, error, loading, refresh } = useGames();
  const favs = useFavorites();

  const week = weekOf(selectedKey);
  const games = (data ?? []).filter(
    (g) => localDayKey(new Date(g.startUtc)) === selectedKey,
  );
  const gameDays = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of data ?? []) {
      const k = localDayKey(new Date(g.startUtc));
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [data]);
  const mine = games.filter(
    (g) => favs.includes(g.home.code) || favs.includes(g.away.code),
  );
  const rest = games.filter((g) => !mine.includes(g));
  const next = (data ?? []).find(
    (g) => localDayKey(new Date(g.startUtc)) > selectedKey,
  );
  const nextKey = next && localDayKey(new Date(next.startUtc));
  const sel = dayFromKey(selectedKey);

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: space.xl }}
      refreshControl={
        <RefreshControl
          refreshing={loading && !!data}
          onRefresh={refresh}
          tintColor={colors.ball}
        />
      }
    >
      <View style={s.bar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kalender öffnen"
          onPress={() => setCalendarOpen(true)}
          style={({ pressed }) => [
            s.monthBtn,
            pressed && { backgroundColor: colors.panel2 },
          ]}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.ball} />
          <Text style={s.monthText}>
            {MONTHS_LONG[sel.getMonth()]} {sel.getFullYear()}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.muted} />
        </Pressable>
        {selectedKey !== today && (
          <Pressable
            accessibilityRole="button"
            onPress={() => setSelectedKey(today)}
            style={({ pressed }) => [
              s.todayBtn,
              pressed && { backgroundColor: colors.panel2 },
            ]}
          >
            <Text style={s.todayText}>Heute</Text>
          </Pressable>
        )}
      </View>

      <View style={s.dates}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Vorige Woche"
          onPress={() => setSelectedKey(addDays(selectedKey, -7))}
          hitSlop={6}
          style={s.weekArrow}
        >
          <Ionicons name="chevron-back" size={18} color={colors.muted} />
        </Pressable>
        {week.map((key) => {
          const date = dayFromKey(key);
          const active = key === selectedKey;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setSelectedKey(key)}
              style={[s.date, active && s.dateActive]}
            >
              <Text style={[s.dateSmall, active && s.onBall]}>
                {key === today ? "Heute" : WEEKDAYS[date.getDay()]}
              </Text>
              <Text style={[s.dateBig, active && s.onBall]}>
                {date.getDate()}
              </Text>
              <Text style={[s.dateSmall, active && s.onBall]}>
                {MONTHS[date.getMonth()]}
              </Text>
              <View
                style={[
                  s.dot,
                  gameDays.has(key) && {
                    backgroundColor: active ? colors.onBall : colors.ball,
                  },
                ]}
              />
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nächste Woche"
          onPress={() => setSelectedKey(addDays(selectedKey, 7))}
          hitSlop={6}
          style={s.weekArrow}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      </View>

      <GameCalendar
        open={calendarOpen}
        selected={selectedKey}
        gameDays={gameDays}
        onPick={setSelectedKey}
        onClose={() => setCalendarOpen(false)}
      />

      {!data ? (
        <LoadState error={error} onRetry={refresh} />
      ) : games.length === 0 ? (
        <>
          <Empty>Kein Euroleague-Spiel an diesem Tag.</Empty>
          {next && nextKey && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelectedKey(nextKey)}
              style={({ pressed }) => [
                s.nextBtn,
                pressed && { backgroundColor: colors.panel2 },
              ]}
            >
              <Text style={s.nextText}>
                Nächster Spieltag: {formatDay(next.startUtc)}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={colors.ball} />
            </Pressable>
          )}
        </>
      ) : (
        <>
          {mine.length > 0 && (
            <>
              <SectionHeader title="Meine Teams" />
              <View style={s.list}>
                {mine.map((g) => (
                  <GameCard key={g.code} game={g} />
                ))}
              </View>
            </>
          )}
          {rest.length > 0 && (
            <>
              <SectionHeader
                title={`Euroleague · Runde ${games[0].round}`}
                right={rest.length === 1 ? "1 Spiel" : `${rest.length} Spiele`}
              />
              <View style={s.list}>
                {rest.map((g) => (
                  <GameCard key={g.code} game={g} />
                ))}
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  monthBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
  },
  monthText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  todayBtn: {
    height: 36,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.ballSoft,
  },
  todayText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ball },
  dates: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: space.md,
  },
  weekArrow: { width: 22, alignItems: "center" },
  date: {
    flex: 1,
    paddingTop: 7,
    paddingBottom: 6,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
    alignItems: "center",
  },
  dateActive: { backgroundColor: colors.ball },
  dateSmall: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  dateBig: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  onBall: { color: colors.onBall },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
    backgroundColor: "transparent",
  },
  list: { gap: space.sm, paddingHorizontal: space.lg },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "center",
    marginTop: space.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
  },
  nextText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
});
