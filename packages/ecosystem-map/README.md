# @agile-infographics/ecosystem-map

**Ecosystem & Interfaces Map**: a React infographic that places a central entity
in the middle of the groups around it, such as functions, teams, stakeholders,
partners or interfaces. Each group lists its own items and is joined to the
centre by a connector.

- **Content comes entirely from data.** The component has no built-in wording.
  One component can show IT governance, a transformation programme, an
  operating model, a stakeholder map or a product ecosystem.
- **Any size:** 1–12 groups and 0–20 items per group (configurable). The layout
  adapts automatically to the number of groups and to the available width.
- **Two experiences:** a display-only map, and an editor where everything is
  edited in place.
- **Theming:** a complete, readable theme is generated from one colour. You can
  add a secondary colour, choose a dark or light scheme, set card, connector
  and centre styles, corner radius, spacing and typography, and override
  individual colours.

This package is independent of every other component in the Agile Infographics
Library. Its only library dependency is `@agile-infographics/core`, which is
installed automatically. It never imports or installs the TOM Wheel, the
Methodology Flow or the gallery. Everything a client needs is exported from
this package, including the theme generator (`generatePalette`,
`THEME_PRESETS`) and the icon keys.

> **Import only from `@agile-infographics/ecosystem-map`.** Don't import
> `@agile-infographics/core` directly. It is a dependency of this package, not
> of your project, so a strict package manager (pnpm, Yarn PnP) won't let your
> code reach it.

## Install

```bash
npm install @agile-infographics/ecosystem-map     # npm
pnpm add @agile-infographics/ecosystem-map        # pnpm
```

- **Peer dependencies:** `react` and `react-dom` 19.
- **Bundler:** you need one that handles CSS imports, such as Vite, webpack or
  Next.js. Styles load automatically when you import the component.
- **Before the package is on a registry:** install the packed tarballs instead
  (see the repository README, "Distribution").

| Import path | Contents |
|---|---|
| `@agile-infographics/ecosystem-map` | Everything: editor, renderer, data model, validation, theme |
| `@agile-infographics/ecosystem-map/renderer` | Display only: `EcosystemMap`, data model, validation, layout and theme helpers. No editor code is bundled. |
| `@agile-infographics/ecosystem-map/style.css` | The package's CSS. It loads automatically, so an explicit import is optional. |

## Display a map

```tsx
import { EcosystemMap, type EcosystemMapInput } from "@agile-infographics/ecosystem-map/renderer";

const data: EcosystemMapInput = {
  title: "Product ecosystem",
  center: { title: "Payments platform", subtitle: "Core product", icon: "coins" },
  groups: [
    { id: "merchants", title: "Merchants", icon: "people", items: [{ id: "m1", label: "Online shops" }, { id: "m2", label: "Marketplaces" }] },
    { id: "banks", title: "Banking partners", icon: "balance", items: [{ id: "b1", label: "Acquiring bank", tag: "Contract" }] },
    { id: "risk", title: "Risk & compliance", icon: "shield", items: [{ id: "r1", label: "Fraud monitoring", href: "https://example.com/fraud" }] },
  ],
  connections: [{ source: "center", target: "banks", label: "Settlement", direction: "both" }],
};

export function EcosystemPage() {
  return <EcosystemMap data={data} appearance={{ base: "#0b6fa4", scheme: "light", connector: "elbow" }} />;
}
```

| Prop | Type | |
|---|---|---|
| `data` | `EcosystemMapInput` | The content. Optional fields may be left out. The data is validated and completed with `normalizeEcosystem()`. If it can't be used, an accessible error message is shown instead. |
| `appearance?` | `Partial<EcosystemAppearance>` | Look and layout (see [Customisation](#customisation)). Anything left out uses `DEFAULT_ECOSYSTEM_APPEARANCE`. |
| `theme?` | `Partial<EcosystemTheme>` | Final colour overrides on top of the generated theme. |
| `limits?` | `EcosystemLimits` | Group and item counts and field lengths. Default: `DEFAULT_ECOSYSTEM_LIMITS`. |
| `selectedGroupId?` / `onSelectGroup?` | `string \| null` / `(id) => void` | Controlled selection. Omit both to let the map manage it. |
| `expandedGroupIds?` / `onToggleExpanded?` | `string[]` / `(id, expanded) => void` | Controlled expansion of collapsed groups. |

What a viewer can do in display mode:
- **Select** a group with a click, a tap, <kbd>Enter</kbd> or <kbd>Space</kbd>.
  The group, its items, its connector and its segment of the centre ring stay
  highlighted, and the other groups are dimmed. Clicking another group
  switches the selection. Click the selected group again, click an empty
  area of the map, or press <kbd>Esc</kbd> to clear it.
- Selection never follows the mouse pointer: hovering changes nothing.
- **Move between groups** with <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd>
  <kbd>↓</kbd> <kbd>Home</kbd> <kbd>End</kbd>.
- **Expand a long group** with "Show all N items".
- **Open item links.** External links open in a new tab with `noopener`.

Display mode never shows editing controls. Hidden groups are left out.

## Editable map

```tsx
import { EcosystemMapEditor, DEFAULT_ECOSYSTEM } from "@agile-infographics/ecosystem-map";

<EcosystemMapEditor defaultData={DEFAULT_ECOSYSTEM} storageKey="client-x.ecosystem" />

// Same component for viewers who may not edit (no editing controls at all):
<EcosystemMapEditor defaultData={DEFAULT_ECOSYSTEM} storageKey="client-x.ecosystem" readOnly={!user.canEdit} />
```

| Prop | Type | |
|---|---|---|
| `defaultData` | `EcosystemMapInput` | Initial content, also used by "Reset to default". |
| `storageKey` | `string` | Local Storage key for the content. The appearance is stored under `${storageKey}.appearance`. Use one key per project. |
| `defaultAppearance?` | `Partial<EcosystemAppearance>` | Initial look and layout. |
| `limits?` | `EcosystemLimits` | Counts and field lengths. |
| `readOnly?` | `boolean` | Display only: the stored map with no controls. |
| `onChange?` | `(data: EcosystemMapData) => void` | Called after every content change, for example to save it on a server. |
| `onAppearanceChange?` | `(appearance: EcosystemAppearance) => void` | Called after every appearance change. |

Everything happens on one screen:

| To… | Do this |
|---|---|
| Edit any text | Click it on the map: title, subtitle, centre title and subtitle, group title and description, item label and detail. Empty optional fields appear when you hover. |
| Items | <kbd>Enter</kbd> in an item adds the next one. <kbd>Backspace</kbd> in an empty item removes it. Use **+ Add item**. Hover an item for ↑ ↓ and × (delete, with **Undo**). <kbd>Alt</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> also reorders. |
| Groups | **+ Add group** in the toolbar. Hover a group for ‹ › (move anticlockwise or clockwise), **+** (insert after) and the bin (delete, with **Undo**). <kbd>Alt</kbd> + <kbd>←</kbd> / <kbd>→</kbd> also moves a group. |
| Icons | Click a group's badge or the centre icon. |
| Group settings | Select a group (click it or any of its text). The **Selected group** panel holds its position (automatic, top, right, bottom or left), colour, visibility in display mode, and icon. It also holds the connection settings: show or hide, solid, dashed or dotted, arrowheads (to group, to centre, both ways) and a relationship text. The relationship text isn't drawn on the map; it is kept in the data and read out by screen readers. In the editor, clicking a group selects it and clicking an empty area of the map clears the selection. |
| Item settings | Click an item. The panel adds its link (validated), a short tag and an icon. |
| Appearance | The **Appearance** panel (see below). |
| Reuse the data | **Data (JSON import / export)**: copy the content as JSON, or paste JSON to import it. Imported data is validated: errors block the import and corrections are listed. |
| Start over | **Reset to default** (click twice). **Reset appearance** resets only the look. |

## Data model

```ts
interface EcosystemMapInput {
  version?: 1;
  title?: string;
  subtitle?: string;
  center: { id?: string; title: string; subtitle?: string; icon?: IconKey | null; style?: "rings" | "solid" | "outline" };
  groups: {
    id: string;
    title: string;
    description?: string;
    icon?: IconKey | null;
    color?: string | null;                    // "#rrggbb"; null = theme colour
    side?: "auto" | "left" | "right" | "top" | "bottom";
    hidden?: boolean;                         // left out of display mode
    items?: { id: string; label: string; description?: string; icon?: IconKey | null; href?: string; tag?: string }[];
  }[];
  connections?: {                             // one per group; missing ones are added (visible, solid, no arrows)
    id?: string;
    source: string;                           // the centre's id or a group id; one end must be the centre
    target: string;
    label?: string;                           // relationship text: kept in the data and read by screen readers, not drawn
    visible?: boolean;
    style?: "solid" | "dashed" | "dotted";
    direction?: "none" | "forward" | "backward" | "both";   // forward = arrow at the target
  }[];
}
```

- **Complete form:** `EcosystemMapData` is the same shape with every field
  present. `normalizeEcosystem()` produces it, and the editor stores and
  exports it.
- **Icons:** keys from the shared registry (`ICON_KEYS`, checked with
  `isIconKey`).
- **Links:** only `http(s)://`, `mailto:`, `/path` and `#anchor` are kept.
  Anything else, such as `javascript:`, is dropped.
- **Limits:** `DEFAULT_ECOSYSTEM_LIMITS` allows 1–12 groups and up to 20 items
  per group, plus a maximum length for every field.

### Validation

```ts
import { normalizeEcosystem, validateEcosystem } from "@agile-infographics/ecosystem-map/renderer";

const issues = validateEcosystem(json);          // [{ level: "error" | "warning", path: "groups[2].items[0].href", message }]
const { data, issues } = normalizeEcosystem(json);   // data: EcosystemMapData | null
```

- **Errors** make the data unusable. They cover:
  - a missing centre
  - groups that aren't a list
  - a group count or item count outside the limits
- **Warnings** report a correction:
  - duplicate or missing ids
  - text that was too long and has been shortened
  - an unknown icon, colour or side
  - an unsafe link
  - a connection to an unknown id
  - a duplicate connection

## Layout

The layout engine (`src/renderer/layout.ts`) is pure, so it can be tested on
its own. It picks a mode from the measured width:

| Mode | When | Layout |
|---|---|---|
| `radial` | Wide (≥ 880 px at normal text size) | Groups on four sides of the centre: left and right columns, plus top and bottom rows. |
| `columns` | Medium (≥ 600 px) | Centre on top, groups in two columns joined by a central spine. |
| `stack` | Narrow (phones) | Centre on top, groups in one column joined by a spine on the left. |

- **Placement:** groups are placed **clockwise from 12 o'clock**, so reordering
  the data moves a group to the next position around the centre.
  - The sides stay balanced: 1–3 groups per column first, then the top and
    bottom rows (`sideTargets`).
  - A group's `side` pins it to a side while that side has room. Rows hold up
    to 4 groups and columns up to 6.
- **No overlaps:** cards are laid out by CSS grid and flexbox, so they never
  overlap. Long titles and labels wrap, and long single words are never broken
  in the middle.
- **Connectors stay attached.** They are drawn from the measured position of
  the centre and of every card, and re-measured on any size change. Their
  routes stay in the gaps between cards:
  - left and right groups: within the gutter
  - top and bottom groups: along a bus in the row gap
  - narrow modes: along the spine
- **Clean connectors:** thin lines with no text on them. Each one ends in a
  small open-circle port on the card's edge. Arrowheads are off by default;
  turn them on with `connectorArrows` ("Direction arrows" in the editor). The
  direction is always kept in the data and read out by screen readers.
- **Segmented centre ring:** the default centre has one ring segment per
  visible group (`ringSegments`).
  - The ring rotates so that each segment faces its group, and each connector
    leaves from the middle of its group's segment.
  - In the two narrow layouts the segments follow the group order, clockwise
    from 12 o'clock.
  - The selected group's segment is highlighted.
- **Layout preference:** `appearance.layout` can force `radial`, `columns` or
  `stack`. A preferred mode that doesn't fit falls back to the next narrower
  one, so nothing is ever clipped.

## Customisation

```ts
interface EcosystemAppearance {
  version: 1;
  base: string;                    // primary colour → generated palette
  preset: string | null;           // id from THEME_PRESETS
  secondary: string | null;        // accents, connectors, last group colour; null = derived
  scheme: "dark" | "light";
  overrides: Partial<Record<"background" | "panel" | "surface" | "heading" | "text" | "accent"
                          | "connector" | "centerFill" | "groupFrom" | "groupTo", string>>;
  typography: { scale: 0.9 | 1 | 1.1 | 1.2; titleWeight: 600 | 700 | 800 };
  layout: "auto" | "radial" | "columns" | "stack";
  connector: "curved" | "elbow" | "straight";
  cardStyle: "accent" | "filled" | "outline";
  radius: "square" | "soft" | "round";
  density: "compact" | "comfortable" | "spacious";
  centerSize: "s" | "m" | "l";
  groupColoring: "uniform" | "ramp";       // one colour, or progressive shades per group
  collapseAfter: 0 | 4 | 6 | 8;            // 0 = never collapse
  itemDetails: "always" | "selected";      // item descriptions always, or for the selected group only
  connectorArrows: boolean;                // draw arrowheads for directed connections (default false)
}
```

- **Theme generation:** `paletteToEcosystemTheme(generatePalette(base), { secondary, scheme, overrides })`.
  - It maps the shared palette onto the map's CSS variables (`--em-*`).
  - Text you haven't overridden is re-checked for WCAG contrast. For example, a
    light card colour automatically gets dark text.
  - `checkEcosystemContrast()` lists the key text pairs, and the editor shows a
    warning when a manual override falls below 4.5:1.
- **Centre style:** the centre's style belongs to the content
  (`center.style`), because it is part of what the map says.
  - `rings`: the segmented ring around a bordered disc; the default, shown in
    the editor as "Segmented ring"
  - `solid`: a plain filled disc
  - `outline`: an outlined disc
- **Ring colours:** the segments use the theme's `ringSegment` colour
  (`--em-ring-segment`), and the selected segment uses `connectorActive`.
  Both are generated from the primary and secondary colours in either scheme.

## Using it without the other components

The package has these dependencies:
- `dependencies`: `@agile-infographics/core` only
- `peerDependencies`: `react` and `react-dom`

Installing it doesn't install the TOM Wheel, the Methodology Flow or the
gallery. It was checked from packed tarballs in a client that installed only
this package, using:
- the npm default layout
- a strict, pnpm-like layout (`npm --install-strategy=linked`)

Results:
- Both layouts type-check and build the editor and the display-only entry.
- The display-only bundle contains no editor code.
- Neither bundle contains code from another component.

## Development

- **Preview:** run `npm run dev` at the repository root, then open
  http://localhost:5173/#/ecosystem-map. The gallery has three examples (IT
  Quality, Digital Transformation, Operating Model) and an Edit / Display
  toggle.
- **Build:** run `npm run build -w @agile-infographics/ecosystem-map` (build
  core first).
- **Tests:** `npm test` runs the browser suites `ecosystem-map` and
  `ecosystem-map-theme` together with the other components' suites.
