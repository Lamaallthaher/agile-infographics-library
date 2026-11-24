import type { ReactNode } from "react";

/**
 * Original, generic line icons. Each is the content of a 24×24 stroke SVG; the
 * wheel supplies the <svg> wrapper, stroke width and colour (currentColor).
 * Data refers to icons by key, so it can be stored as plain JSON.
 */
export const icons = {
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.6 8.4 13.4 13.4 8.4 15.6 10.6 10.6Z" />
    </>
  ),
  orgChart: (
    <>
      <rect x="9" y="3" width="6" height="5" rx="1" />
      <rect x="3" y="16" width="6" height="5" rx="1" />
      <rect x="15" y="16" width="6" height="5" rx="1" />
      <path d="M12 8v4M6 16v-2.5A1.5 1.5 0 0 1 7.5 12h9a1.5 1.5 0 0 1 1.5 1.5V16" />
    </>
  ),
  workflow: (
    <>
      <circle cx="5" cy="6" r="2" />
      <circle cx="19" cy="18" r="2" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
      <path d="M7 6h3a2 2 0 0 1 2 2v1.5M12 14.5V16a2 2 0 0 0 2 2h3" />
    </>
  ),
  balance: (
    <path d="M12 3v17M7 20h10M5 7h14M5 7 2 14M5 7l3 7M2 14q3 4 6 0M19 7l-3 7M19 7l3 7M16 14q3 4 6 0" />
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" />
      <path d="M16 4.6a3.2 3.2 0 0 1 0 6.3M18 14.2a5 5 0 0 1 3 4.8v1" />
    </>
  ),
  trendChart: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 3 3 5-6" />
      <path d="M15 8h4v4" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" />
      <path d="m8.8 12 2.3 2.3 4.2-4.6" />
    </>
  ),
  cog: (
    <>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </>
  ),
  chat: (
    <>
      <path d="M4 4.5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8.5L7 20.5v-4H4a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z" />
      <path d="M8 9h8M8 12h5" />
    </>
  ),
  network: (
    <>
      <circle cx="12" cy="5" r="2.2" />
      <circle cx="5" cy="18" r="2.2" />
      <circle cx="19" cy="18" r="2.2" />
      <path d="M10.9 6.9 6.1 16M13.1 6.9l4.8 9.1M7.2 18h9.6" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3 21 8l-9 5-9-5 9-5Z" />
      <path d="m3 12.5 9 5 9-5M3 17l9 5 9-5" />
    </>
  ),
  lightbulb: (
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3Z" />
  ),
  flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  coins: (
    <>
      <ellipse cx="8" cy="6" rx="5" ry="2.2" />
      <path d="M3 6v8c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2V6M3 10c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2" />
      <path d="M14 20l3.5-3.5 2 2L22 16M18.8 16H22v3.2" />
    </>
  ),
  checklist: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="m7.5 8 1.5 1.5 2.5-2.5M7.5 14l1.5 1.5 2.5-2.5M14 8.5h3M14 14.5h3" />
    </>
  ),
  /** Hub illustration: a monitor showing a small operating-model dashboard. */
  tomMonitor: (
    <>
      <rect x="2.5" y="3" width="19" height="13" rx="1.2" />
      <path d="M9 20.5h6M12 16v4.5" />
      <path d="M5.5 13V10.5M8 13V8.5M10.5 13V6.5" />
      <path d="M13 12.5 15.3 9.6l1.8 1.5L19 7.5" />
      <path d="M17.4 7.5H19v1.6" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconKey = keyof typeof icons;

/** Human-readable names for the icon picker. */
export const ICON_NAMES: Record<IconKey, string> = {
  compass: "Compass",
  orgChart: "Organisation",
  workflow: "Workflow",
  balance: "Governance",
  people: "People",
  trendChart: "Performance",
  database: "Data",
  target: "Target",
  shield: "Quality / risk",
  cog: "Operations",
  chat: "Communication",
  network: "Ecosystem",
  layers: "Architecture",
  lightbulb: "Innovation",
  flag: "Milestones",
  coins: "Finance",
  checklist: "Standards",
  tomMonitor: "Dashboard",
};

export const ICON_KEYS = Object.keys(icons) as IconKey[];

export function isIconKey(value: unknown): value is IconKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(icons, value);
}
