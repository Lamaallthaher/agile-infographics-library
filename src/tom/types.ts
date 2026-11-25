import type { IconKey } from "../shared/icons";

/**
 * Plain, JSON-serialisable TOM data. This is what users edit and what is saved
 * to Local Storage — no React nodes, no rendering details.
 */
export interface TomFact {
  label: string;
  value: string;
}

export interface TomComponent {
  /** Stable unique id (never shown). */
  id: string;
  /** Component name — shown on the wheel, in the list and as the details title. */
  name: string;
  /** Key into the icon registry (see icons.tsx). */
  icon: IconKey;
  /** Short description shown under the title. */
  description: string;
  /** Longer explanatory text (optional). */
  details: string;
  /** Label / value facts, e.g. Accountable: Executive leadership. */
  facts: TomFact[];
  /** Checklist of what the component covers. */
  checklist: string[];
}

export interface TomWheelData {
  /** Schema version, so stored data can be migrated later. */
  version: 1;
  /** Wheel title shown in the centre hub. Line breaks start a new line. */
  title: string;
  /** Optional small line under the title in the hub. */
  subtitle: string;
  /** Icon shown in the hub. */
  centerIcon: IconKey;
  components: TomComponent[];
}

/** Rules that keep the wheel valid and readable. */
export interface TomLimits {
  minComponents: number;
  maxComponents: number;
  maxNameLength: number;
  maxTitleLength: number;
}

export const DEFAULT_LIMITS: TomLimits = {
  minComponents: 3,
  maxComponents: 12,
  maxNameLength: 60,
  maxTitleLength: 80,
};
