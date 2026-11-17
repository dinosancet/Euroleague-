import { Image } from "expo-image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextProps,
  type ViewStyle,
} from "react-native";

import type { ApiTeam } from "@shared/api";
import { clubColors } from "@/data/clubs";
import { colors, fonts, radius, space } from "@/theme";

/**
 * Club crest from the data feed; falls back to a monogram in club colours when
 * there is no logo or it fails to load.
 */
export function TeamBadge({
  team,
  size = 28,
}: {
  team: Pick<ApiTeam, "code" | "abbr"> & { logo?: string | null };
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (team.logo && !failed) {
    return (
      <Image
        source={{ uri: team.logo }}
        style={{ width: size, height: size }}
        contentFit="contain"
        cachePolicy="memory-disk"
        transition={150}
        onError={() => setFailed(true)}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    );
  }
  return <Monogram team={team} size={size} />;
}

function Monogram({
  team,
  size,
}: {
  team: Pick<ApiTeam, "code" | "abbr">;
  size: number;
}) {
  const [c1, c2] = clubColors(team.code);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: c1,
        },
      ]}
    >
      <View
        style={[
          styles.badgeDiag,
          {
            backgroundColor: c2,
            width: size * 1.42,
            height: size * 1.42,
            left: size * 0.29,
            top: size * 0.29,
          },
        ]}
      />
      <Text style={[styles.badgeText, { fontSize: size * 0.4 }]}>
        {team.abbr}
      </Text>
    </View>
  );
}

export function SectionHeader({
  title,
  right,
}: {
  title: string;
  right?: string;
}) {
  return (
    <View style={styles.sectionH}>
      <Text style={styles.sectionHText}>{title}</Text>
      {right ? <Text style={styles.sectionHText}>{right}</Text> : null}
    </View>
  );
}

export function LivePill({ label = "Live" }: { label?: string }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.25,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={styles.livePill}>
      <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
      <Text style={styles.livePillText}>{label}</Text>
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  large,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  /** Bigger pill used for the feed filters on Home. */
  large?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={[
        styles.chip,
        large && styles.chipLarge,
        active && styles.chipActive,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          large && styles.chipTextLarge,
          active && styles.chipTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Segmented<K extends string>({
  options,
  value,
  onChange,
}: {
  options: [K, string][];
  value: K;
  onChange: (k: K) => void;
}) {
  return (
    <View style={styles.seg}>
      {options.map(([k, label]) => (
        <Pressable
          key={k}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === k }}
          onPress={() => onChange(k)}
          style={[styles.segBtn, value === k && styles.segBtnActive]}
        >
          <Text style={[styles.segText, value === k && styles.segTextActive]}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Head-to-head bar; the better side is highlighted in orange. */
export function CompareRow({
  label,
  home,
  away,
  lowerIsBetter,
}: {
  label: string;
  home: number;
  away: number;
  lowerIsBetter?: boolean;
}) {
  const total = home + away || 1;
  const homeBetter = lowerIsBetter ? home < away : home > away;
  return (
    <View style={{ gap: 5 }}>
      <View style={styles.cmpLbl}>
        <Num style={styles.cmpVal}>{home}</Num>
        <Text style={styles.cmpLabel}>{label}</Text>
        <Num style={styles.cmpVal}>{away}</Num>
      </View>
      <View style={styles.bars}>
        <View
          style={[
            styles.bar,
            {
              flex: home / total,
              backgroundColor: homeBetter ? colors.ball : colors.line,
            },
          ]}
        />
        <View
          style={[
            styles.bar,
            {
              flex: away / total,
              backgroundColor: !homeBetter ? colors.ball : colors.line,
            },
          ]}
        />
      </View>
    </View>
  );
}

/** Text with tabular digits so scores line up. */
export function Num({ style, ...props }: TextProps) {
  return (
    <Text
      {...props}
      style={[{ fontVariant: ["tabular-nums"], color: colors.text }, style]}
    />
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <Text style={styles.empty}>{children}</Text>;
}

export const styles = StyleSheet.create({
  badge: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  badgeDiag: { position: "absolute", transform: [{ rotate: "45deg" }] },
  badgeText: {
    fontFamily: fonts.displayHeavy,
    color: "#fff",
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sectionH: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingTop: 14,
    paddingBottom: space.sm,
  },
  sectionHText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.muted,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.liveSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: "flex-end",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.live,
  },
  livePillText: {
    color: colors.live,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.panel,
  },
  chipLarge: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: { backgroundColor: colors.text, borderColor: colors.text },
  chipTextLarge: { fontSize: 14 },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.muted },
  chipTextActive: { color: colors.ink },
  seg: {
    flexDirection: "row",
    gap: 4,
    marginHorizontal: space.lg,
    padding: 4,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: "center",
  },
  segBtnActive: { backgroundColor: colors.panel2 },
  segText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.muted },
  segTextActive: { color: colors.text },
  cmpLbl: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cmpVal: { fontFamily: fonts.bodyBold, fontSize: 13 },
  cmpLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  bars: { flexDirection: "row", gap: 4, height: 6 },
  bar: { borderRadius: 3 },
  card: { backgroundColor: colors.panel, borderRadius: radius.lg },
  empty: {
    color: colors.muted,
    textAlign: "center",
    padding: space.xl,
    fontFamily: fonts.body,
  },
});
