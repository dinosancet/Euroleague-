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
import { colors, fonts, radius, space } from "@/theme";

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

export interface StatSection {
  /** Shown in the header row above the section, e.g. "Starter". */
  title: string;
  rows: StatRow[];
}

type Item =
  | { kind: "head"; key: string; title: string }
  | (StatRow & { kind: "row" });

/**
 * Table with a fixed first column and the numbers scrolling sideways, so a
 * full box score fits on a phone. Each section gets its own header row with
 * the column labels; footer rows (totals) come last.
 */
export function StatTable({
  columns,
  sections,
  footer = [],
  leftWidth = 150,
  flush,
}: {
  columns: StatColumn[];
  sections: StatSection[];
  footer?: StatRow[];
  leftWidth?: number;
  /** Edge to edge instead of a rounded card. */
  flush?: boolean;
}) {
  const items: Item[] = [
    ...sections.flatMap((sec): Item[] => [
      { kind: "head", key: `h-${sec.title}`, title: sec.title },
      ...sec.rows.map((r) => ({ ...r, kind: "row" as const })),
    ]),
    ...footer.map((r) => ({ ...r, kind: "row" as const })),
  ];
  const rowStyle = (it: Item): ViewStyle[] =>
    [
      s.row,
      it.kind === "head" && s.headRow,
      it.kind === "row" && it.style === "total" && s.totalRow,
    ].filter(Boolean) as ViewStyle[];
  const width = (c: StatColumn) => ({ width: c.width ?? 38 });

  return (
    <View style={[s.wrap, flush ? s.flush : s.card]}>
      <View style={[{ width: leftWidth }, s.leftCol]}>
        {items.map((it) =>
          it.kind === "head" ? (
            <View key={it.key} style={rowStyle(it)}>
              <Text style={[s.head, s.leftHead]}>{it.title}</Text>
            </View>
          ) : it.onPress ? (
            <Pressable
              key={it.key}
              onPress={it.onPress}
              accessibilityRole="link"
              accessibilityLabel={it.accessibilityLabel}
              style={({ pressed }) => [
                ...rowStyle(it),
                pressed && { opacity: 0.6 },
              ]}
            >
              {it.left}
            </Pressable>
          ) : (
            <View key={it.key} style={rowStyle(it)}>
              {it.left}
            </View>
          ),
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {items.map((it) => (
            <View key={it.key} style={rowStyle(it)}>
              {it.kind === "head" ? (
                columns.map((c) => (
                  <Text key={c.label} style={[s.head, s.cell, width(c)]}>
                    {c.label}
                  </Text>
                ))
              ) : it.note ? (
                <Text style={[s.cell, s.note]}>{it.note}</Text>
              ) : (
                columns.map((c, i) => (
                  <Num
                    key={c.label}
                    style={[
                      s.cell,
                      width(c),
                      it.style === "total" && s.bold,
                      it.highlight?.includes(i) && s.hi,
                    ]}
                  >
                    {it.cells[i] ?? ""}
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
  { label: "PKT", width: 40 },
  { label: "REB", width: 42 },
  { label: "AST", width: 42 },
  { label: "ST" },
  { label: "BLK", width: 40 },
  { label: "2P", width: 58 },
  { label: "3P", width: 58 },
  { label: "FW", width: 58 },
  { label: "OR" },
  { label: "DR" },
  { label: "BV" },
  { label: "FO" },
  { label: "+/-", width: 42 },
  { label: "PIR", width: 42 },
];

/** Cell values in the order of STAT_COLUMNS. */
export function statCells(l: ApiStatLine, decimals = 0) {
  const n = (v: number) => (decimals ? dec(v, decimals) : v);
  return [
    n(l.points),
    n(l.rebounds),
    n(l.assists),
    n(l.steals),
    n(l.blocks),
    shots(l.twos, decimals),
    shots(l.threes, decimals),
    shots(l.freeThrows, decimals),
    n(l.offRebounds),
    n(l.defRebounds),
    n(l.turnovers),
    n(l.fouls),
    decimals ? n(l.plusMinus) : signed(l.plusMinus),
    n(l.pir),
  ];
}

/** Index of a column in STAT_COLUMNS, shifted by columns placed before it. */
export const col = (label: string, offset = 0) =>
  STAT_COLUMNS.findIndex((c) => c.label === label) + offset;

export function StatLegend() {
  return (
    <Text style={s.legend}>
      PKT Punkte · REB Rebounds · AST Assists · ST Steals · BLK Blocks · 2P/3P
      Zweier/Dreier (Treffer/Versuche) · FW Freiwürfe · OR/DR Offensiv-/
      Defensivrebounds · BV Ballverluste · FO Fouls · +/- Plus-Minus · PIR
      Effizienzwert
    </Text>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: "row", overflow: "hidden" },
  card: { backgroundColor: colors.panel, borderRadius: radius.md },
  flush: {
    backgroundColor: colors.panel,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  leftCol: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.line,
  },
  row: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  headRow: { height: 40, backgroundColor: colors.ink },
  totalRow: { backgroundColor: colors.ink, height: 48 },
  head: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.text,
    letterSpacing: 0.5,
  },
  leftHead: { paddingLeft: space.lg, textTransform: "uppercase" },
  cell: {
    width: 38,
    textAlign: "center",
    fontFamily: fonts.body,
    fontSize: 14,
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
