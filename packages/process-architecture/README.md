# @agile-infographics/process-architecture

**Process Architecture Map**: an editable React infographic for a four-level
process hierarchy, in three views chosen with a numbered tab bar:

1. **Structure & levels.** The levels as a pyramid:
   - an apex triangle (L0), trapezoids (L1, L2) and a wider dark base (L3);
   - each level with a dashed label pill, an arrow and a description (key
     phrases in bold);
   - levels grouped into **scope bands**. The first band has a dashed accent
     outline, later bands are shaded, and each band has a callout card.
2. **Process groups by stage.** The value chain and its process house, with
   drill-down to processes and activities.
3. **Full architecture.** Every group with all its processes and activities
   at once, numbered.

| Level | Name | Shown as |
|---|---|---|
| L0 | Value chain | A banner with owner, status, tags and totals. Several value chains appear as tabs. |
| L1 | Process group | A "process house": management groups on top, core groups as a left-to-right chevron flow, support groups below. |
| L2 | Process | Cards for the selected group. |
| L3 | Activity | A numbered flow (or timeline) for the selected process. |

- **Content comes entirely from data.** The component has no built-in wording,
  so it can show an IT service value chain, an enterprise operating model, a
  manufacturing process model or any other process architecture.
- **Views:** in the structure view, selecting a level's shape opens the view
  for that level. In the full view, selecting a process drills into it.
- **Navigation:** viewers drill down by selecting a group, then a process.
  - A breadcrumb, **Up one level** and <kbd>Esc</kbd> lead back.
  - The selected path's levels are shown one under another ("All levels"), or
    one level at a time.
- **Two experiences:** a display-only renderer, and an editor where every
  level is edited in place.

This package is independent of every other component in the Agile Infographics
Library. Its only library dependency is `@agile-infographics/core`, which is
installed automatically. It never imports or installs the TOM Wheel,
Methodology Flow, Ecosystem Map or the gallery. Everything a client needs is
exported from this package, including the theme generator (`generatePalette`,
`THEME_PRESETS`) and the icon keys.

> **Import only from `@agile-infographics/process-architecture`.** Don't
> import `@agile-infographics/core` directly. It is a dependency of this
> package, not of your project, so a strict package manager (pnpm, Yarn PnP)
> won't let your code reach it.

## Install

```bash
npm install @agile-infographics/process-architecture     # npm
pnpm add @agile-infographics/process-architecture        # pnpm
```

- **Peer dependencies:** `react` and `react-dom` 19.
- **Bundler:** you need one that handles CSS imports (Vite, webpack, Next.js
  and so on). Styles load automatically.
- **Before the package is on a registry:** install the packed tarballs (see
  the repository README, "Distribution").

| Import path | Contents |
|---|---|
| `@agile-infographics/process-architecture` | Everything: editor, renderer, data model, validation, theme |
| `@agile-infographics/process-architecture/renderer` | Display only: `ProcessArchitecture`, data model, validation, hierarchy helpers and theme. No editor code is bundled. |
| `@agile-infographics/process-architecture/style.css` | The package's CSS. It loads automatically, so an explicit import is optional. |

## Display a process architecture

```tsx
import { ProcessArchitecture, type ProcessArchitectureInput } from "@agile-infographics/process-architecture/renderer";

const data: ProcessArchitectureInput = {
  title: "Order to cash",
  valueChains: [
    {
      id: "o2c",
      title: "Order to cash",
      owner: "COO",
      groups: [
        { id: "steer", title: "Commercial steering", category: "management", processes: [] },
        {
          id: "sell",
          title: "Sell",
          category: "core",
          icon: "coins",
          processes: [
            { id: "quote", title: "Quote", owner: "Sales", status: "active", activities: [{ id: "q1", title: "Price the offer" }, { id: "q2", title: "Approve discount", owner: "Sales manager" }] },
          ],
        },
        { id: "fulfil", title: "Fulfil", category: "core", processes: [{ id: "ship", title: "Ship", activities: [] }] },
        { id: "finance", title: "Finance", category: "support", processes: [] },
      ],
    },
  ],
};

export function ProcessPage() {
  return <ProcessArchitecture data={data} appearance={{ base: "#0f766e", scheme: "light" }} />;
}
```

| Prop | Type | |
|---|---|---|
| `data` | `ProcessArchitectureInput` | The content. It is validated and completed with `normalizeProcessArchitecture()`. If it can't be used, an accessible error message is shown instead. |
| `appearance?` | `Partial<ProcessAppearance>` | Look and layout (see [Customisation](#customisation)). |
| `theme?` | `Partial<ProcessTheme>` | Final colour overrides on top of the generated theme. |
| `limits?` | `ProcessArchitectureLimits` | Counts and field lengths. Default: `DEFAULT_PROCESS_LIMITS`. |
| `path?` / `onNavigate?` | `Partial<ProcessPath>` / `(path) => void` | Controlled navigation (`valueChainId`, `groupId`, `processId`, `activityId`). Omit both to let the map manage it. |
| `view?` / `onViewChange?` | `"structure" \| "groups" \| "full"` / `(view) => void` | Controlled view. Omit both to let the map manage it; the first view is `appearance.defaultView`. |
| `expandedIds?` / `onToggleExpanded?` | `string[]` / `(id, expanded) => void` | Controlled expansion of groups and processes. |

What a viewer can do:
- **Select** a group (click, tap, <kbd>Enter</kbd> or <kbd>Space</kbd>) to
  see its processes. Select a process to see its activities, and select an
  activity to highlight it. Clicking the selected group again closes it.
- **Expand** a group (**+**) to list its processes inside the overview, then
  jump straight to one. Expand a process card ("Show activities") to preview
  its activities.
- **Move around:** <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd>,
  <kbd>Home</kbd> and <kbd>End</kbd> move between items of the same level
  (and between value-chain tabs). <kbd>Esc</kbd> goes up one level; so do the
  breadcrumb and **Up one level**.
- **Open links:** external links open in a new tab with `noopener`.
- **Screen readers:** each level is a labelled section, the breadcrumb marks
  the current location, and navigation is announced in a live region.

## Editable map

```tsx
import { ProcessArchitectureEditor, DEFAULT_PROCESS_ARCHITECTURE } from "@agile-infographics/process-architecture";

<ProcessArchitectureEditor defaultData={DEFAULT_PROCESS_ARCHITECTURE} storageKey="client-x.process-architecture" />

// Same component for viewers who may not edit (no editing controls at all):
<ProcessArchitectureEditor defaultData={myData} storageKey="client-x.process-architecture" readOnly={!user.canEdit} />
```

| Prop | Type | |
|---|---|---|
| `defaultData` | `ProcessArchitectureInput` | Initial content, also used by "Reset to default". |
| `storageKey` | `string` | Local Storage key for the content. The appearance uses `${storageKey}.appearance`. |
| `defaultAppearance?` | `Partial<ProcessAppearance>` | Initial look and layout. |
| `limits?` | `ProcessArchitectureLimits` | Counts and field lengths. |
| `readOnly?` | `boolean` | Display only: the stored map with no controls. |
| `onChange?` / `onAppearanceChange?` | callbacks | Called after every change, for example to save on a server. |

| To… | Do this |
|---|---|
| Edit a title or description | Click it on the map, at any level. Required titles are restored if left empty. |
| Edit the structure view | In **Structure & levels**, click the kicker, a level's name (in its shape), label (pill) or description, or a scope callout's title or description. Wrap key phrases in `**double asterisks**` to show them in bold. |
| Select a node | Click it. The **inspector** below the map edits its owner, status, tags, code (replaces the automatic number) and link (validated). For a group it also edits the category, colour and icon. |
| Add | **Add value chain** next to the tabs, **Add management / core / support group** at the end of each row, **Add process**, **Add activity**. Hover a node for **+** to insert after it. New nodes are selected and their title is ready for typing. |
| Reorder | Hover a node for ‹ › (groups move within their own row). |
| Delete | Hover a node for the bin. **Undo** brings it back in place, with everything beneath it. |
| Reuse the data | **Data (JSON import / export)**. Imported data is validated: errors block the import and corrections are listed. |
| Start over | **Reset to default** (click twice); **Reset appearance** resets only the look. |

## Data model

```ts
interface NodeInput {                    // shared by every level
  id: string;
  title: string;
  description?: string;
  owner?: string;                        // owner or responsible role
  status?: "" | "active" | "planned" | "in-review" | "retired";
  tags?: string[];                       // up to 8
  code?: string;                         // shown instead of the automatic number
  href?: string;                         // http(s), mailto, /path or #anchor only
}

interface ProcessArchitectureInput {
  version?: 1;
  kicker?: string;                       // small uppercase line above the view tabs
  title?: string;
  subtitle?: string;                     // description under "title | view"
  levels?: {                             // L0–L3 (index = level); missing fields use generic defaults
    label?: string;                      // dashed pill, e.g. "Level Zero"
    name?: string;                       // inside the pyramid shape, e.g. "Value chain"
    description?: string;                // **double asterisks** mark bold key phrases
  }[];
  scopes?: {                             // up to 3 bands; omitted = generic defaults, [] = no callouts
    title: string;                       // callout chip
    description?: string;
    levels: number[];                    // levels 0–3 in this band (each level in at most one scope)
  }[];
  valueChains: (NodeInput & {                                    // L0, 1–6
    groups?: (NodeInput & {                                      // L1, up to 16 per chain
      category?: "management" | "core" | "support";              // default "core"
      icon?: IconKey | null;
      color?: string | null;                                     // "#rrggbb"; null = theme colour
      processes?: (NodeInput & {                                 // L2, up to 24 per group
        activities?: NodeInput[];                                // L3, up to 30 per process
      })[];
    })[];
  })[];
}
```

- **Complete form:** `ProcessArchitectureData` is the same shape with every
  field present. `normalizeProcessArchitecture()` produces it, and the editor
  stores and exports it.
- **Validation:** `validateProcessArchitecture()` returns the issues only.
  - **Errors** make the data unusable: wrong types, or counts outside the
    limits.
  - **Warnings** report a correction: missing or duplicate ids (made unique
    across all levels), text that was too long and has been shortened, an
    unknown status, category or icon, an unsafe link, or invalid tags.
- **Structure view data:** a level used by two scopes, or a number that is not
  a level, is reported and ignored. More than 3 scopes is an error. Levels in
  no scope form a band without a callout. `DEFAULT_LEVELS` and
  `DEFAULT_SCOPES` hold the generic defaults, and `structureBands(data)` returns
  the bands in display order.
- **Hierarchy helpers:** `findNode(data, id)` (level, path and position),
  `resolvePath(data, path)`, `numberingFor(chain)` (1, 1.2, 1.2.3) and
  `countNodes(chain)`.

## Customisation

```ts
interface ProcessAppearance {
  version: 1;
  base: string;                          // primary colour → generated palette
  preset: string | null;
  secondary: string | null;              // accents, activity numbers, last core group; null = derived
  scheme: "dark" | "light";
  overrides: Partial<Record<"background" | "panel" | "surface" | "heading" | "text" | "accent"
                          | "valueChain" | "coreFrom" | "coreTo" | "management" | "support" | "scope", string>>;
  typography: { scale: 0.9 | 1 | 1.1 | 1.2; titleWeight: 600 | 700 | 800 };
  navigation: "cascade" | "focus";       // all levels of the selected path, or one level at a time
  groupShape: "chevron" | "block";       // shape of core groups
  cardStyle: "accent" | "filled" | "outline";
  radius: "square" | "soft" | "round";
  density: "compact" | "comfortable" | "spacious";
  expandDefault: "collapsed" | "expanded";   // groups list their processes on the overview
  activityLayout: "flow" | "list";       // numbered flow or vertical timeline
  numbering: boolean;                    // automatic 1 / 1.2 / 1.2.3 numbers
  defaultView: "structure" | "groups" | "full";   // the view shown first
}
```

- **Theme generation:** `paletteToProcessTheme(generatePalette(base), { secondary, scheme, overrides })`
  maps the shared palette onto `--pa-*` CSS variables.
  - Text you haven't overridden is re-checked for contrast.
  - Theme-generated group and step colours are darkened just enough for their
    labels to reach 4.5:1 (`groupNodeColors`).
  - The pyramid shapes (`level0`–`level3`) use light-to-dark tones of the
    primary hue.
  - The first scope band uses a warm `scope` accent opposite the primary hue
    (overridable as "Scope highlight"); later bands use `detailBand`.
  - Shape labels and callout chips always get a readable label colour.
  - `checkProcessContrast()` lists the key pairs, and the editor shows a
    warning when a manual override falls below 4.5:1.
- **Responsive:** the layout uses container queries, so it adapts to the
  width it is given. In narrow containers the core flow turns into stacked
  downward arrows and all rows stack.

## Using it without the other components

The package has these dependencies:
- `dependencies`: `@agile-infographics/core` only
- `peerDependencies`: `react` and `react-dom`

It was checked from packed tarballs in a client that installed only this
package, using:
- the npm default layout
- a strict, pnpm-like layout (`npm --install-strategy=linked`)

Results:
- Both layouts type-check and build the editor and the display-only entry.
- The display-only bundle contains no editor code.
- Neither bundle contains code from another component.

## Development

- **Preview:** run `npm run dev` at the repository root, then open
  http://localhost:5173/#/process-architecture. The page has an Edit /
  Display toggle.
- **Build:** run `npm run build -w @agile-infographics/process-architecture`
  (build core first).
- **Tests:** `npm test` runs the browser suites `process-architecture` and
  `process-architecture-theme` along with the other components' suites.
