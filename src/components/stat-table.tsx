import type { ApiShots, ApiStatLine } from "@shared/api";
import type { ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import { Num } from "@/components/ui";
import { colors, fonts, radius } from "@/theme";

export interface StatColumn {
  label: string;
  width?: number;
}

export interface StatRow {
  key: string;
  /** Content of the fixed left column (name, opponent, …). */
  left: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** One entry per column. null leaves the cell empty. */
  cells: (string | number | null)[];
  /** Indexes of cells to show in orange. */
  highlight?: number[];
  /** Text shown across all columns instead of cells, e.g. "nicht eingesetzt". */
  note?: string;
  style?: "total";
}

/**
 * Table with a fixed first column and the numbers scrolling sideways, so a
 * full box score fits on a phone.
 */
export function StatTable({
  columns,
  rows,
  leftLabel,
  leftWidth = 150,
}: {
  columns: StatColumn[];
  rows: StatRow[];
  leftLabel: string;
  leftWidth?: number;
}) {
  const rowStyle = (r?: StatRow): ViewStyle[] =>
    [s.row, r?.style === "total" ? s.totalRow : null].filter(
      Boolean,
    ) as ViewStyle[];
  return (
    <View style={s.wrap}>
      <View style={{ width: leftWidth }}>
        <View style={rowStyle()}>
          <Text style={[s.head, s.leftHead]}>{leftLabel}</Text>
        </View>
        {rows.map((r) =>
          r.onPress ? (
            <Pressable
              key={r.key}
              onPress={r.onPress}
              accessibilityRole="link"
              accessibilityLabel={r.accessibilityLabel}
              style={({ pressed }) => [
                ...rowStyle(r),
                pressed && { opacity: 0.6 },
              ]}
            >
              {r.left}
            </Pressable>
          ) : (
            <View key={r.key} style={rowStyle(r)}>
              {r.left}
            </View>
          ),
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={rowStyle()}>
            {columns.map((c) => (
              <Text
                key={c.label}
                style={[s.head, s.cell, { width: c.width ?? 38 }]}
              >
                {c.label}
              </Text>
            ))}
          </View>
          {rows.map((r) => (
            <View key={r.key} style={rowStyle(r)}>
              {r.note ? (
                <Text style={[s.cell, s.note]}>{r.note}</Text>
              ) : (
                columns.map((c, i) => (
                  <Num
                    key={c.label}
                    style={[
                      s.cell,
                      { width: c.width ?? 38 },
                      r.style === "total" && s.bold,
                      r.highlight?.includes(i) && s.hi,
                    ]}
                  >
                    {r.cells[i] ?? ""}
                  </Num>
                ))
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

/** "3/7" */
export const shots = ([m, a]: ApiShots, decimals = 0) =>
  `${dec(m, decimals)}/${dec(a, decimals)}`;

/** German decimal comma. */
const dec = (v: number, decimals: number) =>
  v.toFixed(decimals).replace(".", ",");

export const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/** Columns shared by the box score and the player's game log. */
export const STAT_COLUMNS: StatColumn[] = [
  { label: "PKT", width: 36 },
  { label: "2P", width: 58 },
  { label: "3P", width: 58 },
  { label: "FW", width: 58 },
  { label: "OR" },
  { label: "DR" },
  { label: "REB", width: 40 },
  { label: "AST", width: 40 },
  { label: "ST" },
  { label: "BV" },
  { label: "BLK", width: 40 },
  { label: "FO" },
  { label: "+/-", width: 40 },
  { label: "PIR", width: 40 },
];

export function statCells(l: ApiStatLine, decimals = 0) {
  const n = (v: number) => (decimals ? dec(v, decimals) : v);
  return [
    n(l.points),
    shots(l.twos, decimals),
    shots(l.threes, decimals),
    shots(l.freeThrows, decimals),
    n(l.offRebounds),
    n(l.defRebounds),
    n(l.rebounds),
    n(l.assists),
    n(l.steals),
    n(l.turnovers),
    n(l.blocks),
    n(l.fouls),
    decimals ? n(l.plusMinus) : signed(l.plusMinus),
    n(l.pir),
  ];
}

export function StatLegend() {
  return (
    <Text style={s.legend}>
      PKT Punkte · 2P/3P Zweier/Dreier (Treffer/Versuche) · FW Freiwürfe · OR/DR
      Offensiv-/Defensivrebounds · AST Assists · ST Steals · BV Ballverluste ·
      BLK Blocks · FO Fouls · +/- Plus-Minus · PIR Effizienzwert
    </Text>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  row: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  totalRow: { backgroundColor: colors.panel2 },
  head: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.muted },
  leftHead: { paddingLeft: 10 },
  cell: {
    width: 38,
    textAlign: "center",
    fontFamily: fonts.body,
    fontSize: 13,
  },
  bold: { fontFamily: fonts.bodyBold },
  hi: { color: colors.ball, fontFamily: fonts.bodyBold },
  note: {
    width: 260,
    textAlign: "left",
    paddingLeft: 8,
    color: colors.muted,
    fontSize: 12,
  },
  legend: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
    marginTop: 10,
  },
});
