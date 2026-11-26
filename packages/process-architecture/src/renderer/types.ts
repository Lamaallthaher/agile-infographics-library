import type { ReactNode } from "react";
import type { IconKey } from "@agile-infographics/core";

/**
 * Data model of the Process Architecture Map: a four-level hierarchy.
 *
 *   L0  Value chain     the architecture scope (one or more per map)
 *   L1  Process group   related processes within a value chain
 *   L2  Process         an individual business process
 *   L3  Activity        a step of a process
 *
 * Plain, JSON-serialisable data with no built-in wording. Two shapes exist:
 * - `ProcessArchitectureInput`: what a client writes (optional fields may be left out).
 * - `ProcessArchitectureData`: the complete form after `normalizeProcessArchitecture()`.
 */

export type ProcessLevel = 0 | 1 | 2 | 3;
/** Lifecycle status of any node. "" = no status shown. */
export type ProcessStatus = "" | "active" | "planned" | "in-review" | "retired";
/**
 * Role of a process group in its value chain: management processes steer,
 * core processes create value (shown as the main flow), support processes enable.
 */
export type GroupCategory = "management" | "core" | "support";

/** Fields every level shares. */
export interface NodeInput {
  id: string;
  title: string;
  description?: string;
  /** Owner or responsible role (for example "Head of Service Management"). */
  owner?: string;
  status?: ProcessStatus;
  /** Short labels, at most 8. */
  tags?: string[];
  /** Optional reference code shown instead of the automatic number (for example "SM-02"). */
  code?: string;
  /** Optional link: http(s), mailto, an absolute path or a #fragment. Other values are dropped. */
  href?: string;
}

export interface ActivityInput extends NodeInput {}

export interface ProcessInput extends NodeInput {
  activities?: ActivityInput[];
}

export interface ProcessGroupInput extends NodeInput {
  /** Default "core". */
  category?: GroupCategory;
  icon?: IconKey | null;
  /** Custom colour (#rrggbb); null = the theme's colour for the category. */
  color?: string | null;
  processes?: ProcessInput[];
}

export interface ValueChainInput extends NodeInput {
  groups?: ProcessGroupInput[];
}

export interface ProcessArchitectureInput {
  version?: 1;
  title?: string;
  subtitle?: string;
  valueChains: ValueChainInput[];
}

/* ---- Complete forms ---- */
export type NodeData = Required<NodeInput>;
export type Activity = NodeData;
export type Process = NodeData & { activities: Activity[] };
export type ProcessGroup = NodeData & { category: GroupCategory; icon: IconKey | null; color: string | null; processes: Process[] };
export type ValueChain = NodeData & { groups: ProcessGroup[] };

export interface ProcessArchitectureData {
  version: 1;
  title: string;
  subtitle: string;
  valueChains: ValueChain[];
}

export interface ProcessArchitectureLimits {
  minValueChains: number;
  maxValueChains: number;
  maxGroups: number;
  maxProcesses: number;
  maxActivities: number;
  maxTags: number;
  maxLength: {
    title: number;
    subtitle: number;
    nodeTitle: number;
    description: number;
    owner: number;
    tag: number;
    code: number;
    href: number;
  };
}

/** Where the viewer is in the hierarchy. Each id is null when that level is not selected. */
export interface ProcessPath {
  valueChainId: string | null;
  groupId: string | null;
  processId: string | null;
  activityId: string | null;
}

/* ---------------------------------------------------------------------------
 * Appearance
 * ------------------------------------------------------------------------- */

export type ColorScheme = "dark" | "light";
/** "cascade": the selected path's levels are shown one under another. "focus": one level at a time. */
export type NavigationMode = "cascade" | "focus";
export type GroupShape = "chevron" | "block";
export type CardStyle = "accent" | "filled" | "outline";
export type CornerRadius = "square" | "soft" | "round";
export type Density = "compact" | "comfortable" | "spacious";
/** Whether process groups on the overview start with their processes listed. */
export type ExpandDefault = "collapsed" | "expanded";
/** How activities (L3) are laid out. */
export type ActivityLayout = "flow" | "list";

export type ProcessOverrideKey = "background" | "panel" | "surface" | "heading" | "text" | "accent" | "valueChain" | "coreFrom" | "coreTo" | "management" | "support";
export type ProcessOverrides = Partial<Record<ProcessOverrideKey, string>>;

export interface ProcessAppearance {
  version: 1;
  base: string;
  preset: string | null;
  secondary: string | null;
  scheme: ColorScheme;
  overrides: ProcessOverrides;
  typography: { scale: number; titleWeight: number };
  navigation: NavigationMode;
  groupShape: GroupShape;
  cardStyle: CardStyle;
  radius: CornerRadius;
  density: Density;
  expandDefault: ExpandDefault;
  activityLayout: ActivityLayout;
  /** Show hierarchical numbers (1, 1.2, 1.2.3) where a node has no code of its own. */
  numbering: boolean;
}

/** Every colour used by the component; each field becomes an --pa-* CSS variable. */
export interface ProcessTheme {
  background: string;
  headingOnBackground: string;
  subtitleOnBackground: string;
  panel: string;
  panelBorder: string;
  surface: string;
  surfaceBorder: string;
  heading: string;
  text: string;
  textMuted: string;
  accent: string;
  /** L0 value-chain banner. */
  valueChain: string;
  valueChainText: string;
  valueChainMuted: string;
  /** L1 core groups run from coreFrom to coreTo; management and support groups use their own tones. */
  coreFrom: string;
  coreTo: string;
  management: string;
  support: string;
  /** L3 step markers. */
  step: string;
  stepText: string;
  connector: string;
  selected: string;
  focus: string;
  fontFamily: string;
}

/* ---------------------------------------------------------------------------
 * Render slots (editing). Without slots the map is read-only.
 * ------------------------------------------------------------------------- */

export type FieldRef =
  | { kind: "title" | "subtitle" }
  | { kind: "nodeTitle" | "nodeDescription"; level: ProcessLevel; id: string };

export interface TextSlotProps {
  field: FieldRef;
  value: string;
  className: string;
  as: "h2" | "h3" | "h4" | "p" | "span" | "div";
  placeholder: string;
  multiline?: boolean;
}

export interface ProcessSlots {
  Text?: (props: TextSlotProps) => ReactNode;
  /** Controls shown on a node (move, add after, delete…). */
  nodeToolbar?: (level: ProcessLevel, id: string, index: number, count: number) => ReactNode;
  /** "Add" control at the end of a level's list. `parentId` is null for value chains. */
  addButton?: (level: ProcessLevel, parentId: string | null, category?: GroupCategory) => ReactNode;
  /** Replaces a process group's icon badge. */
  groupIcon?: (group: ProcessGroup, icon: ReactNode) => ReactNode;
}
