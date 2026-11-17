/**
 * Badge colours per club code (as used by the Euroleague data feed).
 * Plain colour pairs only, no logos, until image rights are cleared.
 */
const COLORS: Record<string, [string, string]> = {
  ASV: ["#00205b", "#6a0019"],
  BAR: ["#a50044", "#004d98"],
  BAS: ["#0d2d6c", "#b0122b"],
  BES: ["#111111", "#e5e5e5"],
  DUB: ["#111111", "#b8945b"],
  HTA: ["#d50000", "#7f0000"],
  IST: ["#1b3d8f", "#0d2152"],
  MAD: ["#e9e9ef", "#4b2d86"],
  MIL: ["#e30613", "#8a0410"],
  MUN: ["#dc052d", "#0066b2"],
  OLY: ["#d0102a", "#7a0a19"],
  PAM: ["#ef7d00", "#1b1b1b"],
  PAN: ["#007a3d", "#004a25"],
  PAR: ["#222222", "#666666"],
  PRS: ["#151515", "#e4002b"],
  RED: ["#c8102e", "#1d1d1d"],
  TEL: ["#f6c700", "#0038a8"],
  ULK: ["#13284f", "#f2c200"],
  VIR: ["#1a1a1a", "#555555"],
  ZAL: ["#00653a", "#00391f"],
};

/** Stable fallback for clubs we have no colours for yet. */
function hashColor(code: string, salt: number) {
  let h = salt;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h}, 55%, ${salt ? 28 : 42}%)`;
}

export function clubColors(code: string): [string, string] {
  return COLORS[code] ?? [hashColor(code, 0), hashColor(code, 7)];
}
