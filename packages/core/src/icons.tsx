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
  book: (
    <>
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5Z" />
      <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3M9 7h6" />
    </>
  ),
  clipboardCheck: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M9 4a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1" />
      <path d="m8.8 13 2.2 2.2 4.2-4.5" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.2 1.2" />
      <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.2-1.2" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 5 5" />
    </>
  ),
  document: (
    <>
      <path d="M6 3h8l4 4v14H6Z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </>
  ),
  puzzle: (
    <path d="M9 4h3.5a1.75 1.75 0 1 1 3.5 0H19v4.5a1.75 1.75 0 1 0 0 3.5V16h-3.5a1.75 1.75 0 1 0-3.5 0H9v-3.5a1.75 1.75 0 1 1 0-3.5Z" />
  ),
  rocket: (
    <>
      <path d="M12 3c3.5 2 5 5.5 5 9.5l-2.5 3.5h-5L7 12.5C7 8.5 8.5 5 12 3Z" />
      <circle cx="12" cy="10" r="1.6" />
      <path d="M9.5 16 7 20l3-1.2M14.5 16 17 20l-3-1.2M7 12.5 4.5 15l2.5.5M17 12.5l2.5 2.5-2.5.5" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="5.5" />
      <path d="m9 13.8-1.5 7 4.5-2.3 4.5 2.3-1.5-7" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8.5 3v4M15.5 3v4M8 14h2M14 14h2" />
    </>
  ),
  server: (
    <>
      <rect x="4" y="4" width="16" height="7" rx="1.5" />
      <rect x="4" y="13" width="16" height="7" rx="1.5" />
      <path d="M7.5 7.5h.01M7.5 16.5h.01M11 7.5h5M11 16.5h5" />
    </>
  ),
  cloud: <path d="M7 18.5h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 9.5 4.5 4.5 0 0 0 7 18.5Z" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.3 2.8 2.7L16.2 9.5" />
    </>
  ),
  barChart: <path d="M4 20h16M7 20v-6M12 20V6M17 20v-9" />,
  gauge: (
    <>
      <path d="M3.5 17a9 9 0 1 1 17 0" />
      <path d="m12 14 4-5" />
      <circle cx="12" cy="14" r="1.4" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8" />
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
  book: "Reference",
  clipboardCheck: "Requirements",
  link: "Connect",
  search: "Research",
  document: "Document",
  puzzle: "Integration",
  rocket: "Launch",
  award: "Excellence",
  calendar: "Schedule",
  server: "Infrastructure",
  cloud: "Cloud",
  eye: "Oversight",
  checkCircle: "Compliance",
  barChart: "Metrics",
  gauge: "Maturity",
  route: "Journey",
};

export const ICON_KEYS = Object.keys(icons) as IconKey[];

export function isIconKey(value: unknown): value is IconKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(icons, value);
}
