import { DEFAULT_PRIMARY } from "./generatePalette";

/** Ready-made base colours. Each goes through `generatePalette`, like a custom colour. */
export interface ThemePreset {
  id: string;
  name: string;
  base: string;
}

export const THEME_PRESETS: readonly ThemePreset[] = [
  { id: "navy", name: "Navy", base: DEFAULT_PRIMARY },
  { id: "ocean", name: "Ocean", base: "#0b6fa4" },
  { id: "teal", name: "Teal", base: "#0f766e" },
  { id: "emerald", name: "Emerald", base: "#2e7d4f" },
  { id: "indigo", name: "Indigo", base: "#4338ca" },
  { id: "plum", name: "Plum", base: "#7b2cbf" },
  { id: "crimson", name: "Crimson", base: "#b91c1c" },
  { id: "amber", name: "Amber", base: "#d97706" },
  { id: "graphite", name: "Graphite", base: "#4b5563" },
];
