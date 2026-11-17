import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors, fonts, radius, space } from "@/theme";

/**
 * Shown while a screen has no data yet: a spinner while loading, otherwise
 * the error with a retry button.
 */
export function LoadState({
  error,
  onRetry,
}: {
  error?: string;
  onRetry: () => void;
}) {
  return (
    <View style={s.wrap}>
      {error ? (
        <>
          <Text style={s.title}>Daten konnten nicht geladen werden</Text>
          <Text style={s.text}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={onRetry} style={s.btn}>
            <Text style={s.btnText}>Erneut versuchen</Text>
          </Pressable>
        </>
      ) : (
        <ActivityIndicator color={colors.ball} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    padding: space.xl,
    alignItems: "center",
    gap: space.sm,
    paddingTop: 48,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.text,
    textAlign: "center",
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
  btn: {
    marginTop: space.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.ball,
  },
  btnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.onBall },
});
