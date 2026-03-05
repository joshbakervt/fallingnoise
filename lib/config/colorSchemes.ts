import type { ColorSchemeName, ColorSchemeValue } from "../types";

export const COLOR_SCHEMES: Record<ColorSchemeName, string[]> = {
  coolBlues: [
    "#4FC3F7",
    "#29B6F6",
    "#0288D1",
    "#0277BD",
    "#81D4FA",
    "#B3E5FC",
    "#039BE5",
    "#00ACC1",
  ],
  forestGreens: [
    "#66BB6A",
    "#43A047",
    "#2E7D32",
    "#81C784",
    "#A5D6A7",
    "#1B5E20",
    "#388E3C",
    "#4CAF50",
  ],
  mutedTones: [
    "#B0BEC5",
    "#90A4AE",
    "#78909C",
    "#9E9E9E",
    "#BDBDBD",
    "#8D6E63",
    "#A1887F",
    "#BCAAA4",
  ],
  grays: [
    "#E0E0E0",
    "#BDBDBD",
    "#9E9E9E",
    "#757575",
    "#616161",
    "#F5F5F5",
    "#EEEEEE",
    "#424242",
  ],
  warmSunset: [
    "#FF7043",
    "#FF5722",
    "#F4511E",
    "#FFAB40",
    "#FF9100",
    "#FFD54F",
    "#FF6D00",
    "#FF8A65",
  ],
  neonCyber: [
    "#E040FB",
    "#7C4DFF",
    "#40C4FF",
    "#64FFDA",
    "#69F0AE",
    "#EEFF41",
    "#FF4081",
    "#00E5FF",
  ],
  earthen: [
    "#8D6E63",
    "#795548",
    "#6D4C41",
    "#A1887F",
    "#BCAAA4",
    "#D7CCC8",
    "#5D4037",
    "#BF8650",
  ],
};

export function resolveColorScheme(scheme: ColorSchemeValue): string[] {
  if (Array.isArray(scheme)) {
    return scheme;
  }
  return COLOR_SCHEMES[scheme] ?? COLOR_SCHEMES.coolBlues;
}
