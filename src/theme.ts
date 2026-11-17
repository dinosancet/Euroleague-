/** Hoopline design tokens: deep night-court blue with basketball-leather orange. */
export const colors = {
  ink: "#0d1020",
  panel: "#161a30",
  panel2: "#1f2442",
  line: "#2a3052",
  text: "#eef0fa",
  muted: "#9097b8",
  ball: "#ff7a29",
  ballSoft: "rgba(255,122,41,0.14)",
  onBall: "#2a1100",
  live: "#ff3d5a",
  liveSoft: "rgba(255,61,90,0.15)",
  win: "#3ddc97",
} as const;

export const fonts = {
  display: "BarlowCondensed_700Bold",
  displayHeavy: "BarlowCondensed_800ExtraBold",
  body: "Archivo_400Regular",
  bodyMedium: "Archivo_500Medium",
  bodyBold: "Archivo_600SemiBold",
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 8, md: 12, lg: 14, xl: 18, pill: 999 } as const;
