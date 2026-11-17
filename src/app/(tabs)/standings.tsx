import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Num, SectionHeader, TeamBadge } from "@/components/ui";
import { standings, useFavorites } from "@/data/store";
import { colors, fonts, space } from "@/theme";

export default function StandingsScreen() {
  const favs = useFavorites();
  const table = standings();

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
      <SectionHeader title="Hauptrunde 2026/27" right="nach 12 Spielen" />
      <View style={s.table}>
        <View style={[s.row, s.head]}>
          <Text style={[s.th, s.rank]} />
          <Text style={[s.th, s.team]}>Team</Text>
          <Text style={[s.th, s.col]}>S</Text>
          <Text style={[s.th, s.col]}>N</Text>
          <Text style={[s.th, s.diff]}>+/-</Text>
          <Text style={[s.th, s.form]}>Form</Text>
        </View>
        {table.map((t, i) => {
          const zone =
            i < 6 ? colors.win : i < 10 ? colors.ball : "transparent";
          const diff = t.pointsFor - t.pointsAgainst;
          return (
            <Pressable
              key={t.id}
              accessibilityRole="link"
              onPress={() =>
                router.push({ pathname: "/team/[id]", params: { id: t.id } })
              }
              style={[
                s.row,
                favs.includes(t.id) && { backgroundColor: colors.ballSoft },
              ]}
            >
              <Num style={[s.rank, s.rankText, { borderLeftColor: zone }]}>
                {i + 1}
              </Num>
              <View style={[s.team, s.teamCell]}>
                <TeamBadge team={t} />
                <Text numberOfLines={1} style={s.teamName}>
                  {t.name}
                </Text>
              </View>
              <Num style={[s.col, s.td]}>{t.wins}</Num>
              <Num style={[s.col, s.td]}>{t.losses}</Num>
              <Num style={[s.diff, s.td]}>{diff > 0 ? `+${diff}` : diff}</Num>
              <View style={[s.form, s.formBars]}>
                {t.form.map((w, k) => (
                  <View
                    key={k}
                    style={[
                      s.formBar,
                      { backgroundColor: w ? colors.win : colors.line },
                    ]}
                  />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={s.legend}>
        <Legend color={colors.win} label="Playoffs (1–6)" />
        <Legend color={colors.ball} label="Play-In (7–10)" />
      </View>
    </ScrollView>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 2,
          backgroundColor: color,
        }}
      />
      <Text style={s.legendText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  table: { paddingHorizontal: space.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 46,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  head: { minHeight: 32 },
  th: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.muted,
    textAlign: "right",
  },
  rank: { width: 30, textAlign: "center" },
  rankText: {
    fontFamily: fonts.bodyBold,
    color: colors.muted,
    borderLeftWidth: 3,
    alignSelf: "stretch",
    textAlignVertical: "center",
    lineHeight: 46,
  },
  team: { flex: 1, textAlign: "left", minWidth: 0 },
  teamCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 4,
  },
  teamName: {
    flexShrink: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.text,
  },
  col: { width: 26 },
  diff: { width: 40 },
  form: { width: 50 },
  td: { fontFamily: fonts.body, fontSize: 13, textAlign: "right" },
  formBars: {
    flexDirection: "row",
    gap: 2,
    justifyContent: "flex-end",
    paddingRight: 6,
  },
  formBar: { width: 6, height: 14, borderRadius: 2 },
  legend: { flexDirection: "row", gap: space.lg, padding: space.lg },
  legendText: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
});
