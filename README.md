# Agile Infographics Library

One repository of **reusable, editable, data-driven infographic components**,
built with React, TypeScript and plain CSS. Each component is its **own npm
package**: a client project installs only the component it needs, and never
bundles the others or the development gallery.

| # | Component | Package | What it shows |
|---|---|---|---|
| 01 | **TOM Wheel** | [`@agile-infographics/tom-wheel`](packages/tom-wheel/README.md) | A circular Target Operating Model wheel with any number of components (3–12), a details panel and a component list. |
| 02 | **Methodology Flow & Assessment Wheel** | [`@agile-infographics/methodology-flow`](packages/methodology-flow/README.md) | A connected sequence of methodology steps (2–8) leading to a circular set of assessment dimensions (3–12). |
| 03 | **Ecosystem & Interfaces Map** | [`@agile-infographics/ecosystem-map`](packages/ecosystem-map/README.md) | A central entity connected to any number of surrounding groups (1–12), each with its own items (0–20). It has a display-only mode and an editor. |
| 04 | **Process Architecture Map** | [`@agile-infographics/process-architecture`](packages/process-architecture/README.md) | A four-level process hierarchy: value chains (L0), process groups (L1), processes (L2) and activities (L3), with drill-down navigation. |
| — | Shared building blocks | [`@agile-infographics/core`](packages/core/README.md) | Theme generator, contrast helpers, icon registry, inline-editing primitives, storage helpers. Installed automatically with any component, which re-exports what clients need. |

Every component shares the same principles:

- **One interface:** everything is edited in place, with no separate view or
  edit mode.
- **Dynamic structure:** items can be added, removed and reordered, and the
  layout recalculates immediately.
- **Smart theming:** one base colour generates a complete, readable palette
  (shared generator).
- **Local persistence:** changes are saved in the browser under versioned keys,
  validated on load, and fall back to defaults when data is invalid.

> Status: **prototype for review.** The packages build and install
> independently, but are not yet published to a registry (see
> [Distribution](#distribution)). All example content is generic and fictional.

---

## Run it

Requirements: Node.js 20+ and npm.

```bash
npm install      # first time only
npm run dev      # → http://localhost:5173
```

| URL | Page |
|---|---|
| http://localhost:5173/#/tom-wheel | 01 · TOM Wheel (default) |
| http://localhost:5173/#/methodology-flow | 02 · Methodology Flow & Assessment Wheel |
| http://localhost:5173/#/ecosystem-map | 03 · Ecosystem & Interfaces Map (examples: `/it-quality`, `/digital-transformation`, `/operating-model`) |
| http://localhost:5173/#/process-architecture | 04 · Process Architecture Map |

| Command | What it does |
|---|---|
| `npm run dev` | Gallery development server with hot reload. Edits in any package reload instantly; no package build needed. |
| `npm run typecheck` | TypeScript check of every package and the gallery |
| `npm run build:packages` | Build each package into its own `packages/<name>/dist/` (JS, `style.css`, type declarations) |
| `npm run build` | Type-check, build every package, then build the gallery into `apps/gallery/dist/` |
| `npm run preview` | Serve the gallery's production build (http://localhost:4173) |
| `npm test` | Build the gallery, then run all browser test suites (needs Edge, Chrome or Chromium; see [tests/browser](tests/browser/README.md)) |
| `npm run test:browser` | Run the browser test suites against the existing gallery build |
| `npm run build -w @agile-infographics/methodology-flow` | Build one package only (build `core` first) |

---

## Project structure

An npm workspaces monorepo: one repository, one dev server, separately buildable packages.

```text
agile-infographics-library/
├── package.json                     # private root: workspaces + scripts (never published)
├── tsconfig.base.json, tsconfig.json
├── vite.lib.ts                      # shared library-build config used by every package
├── scripts/strip-css-imports.mjs    # build helper for type declarations
├── tests/browser/                   # end-to-end browser suites + runner (npm test)
├── packages/
│   ├── core/                        # @agile-infographics/core: generic, knows no component
│   │   └── src/
│   │       ├── theme/               # one colour → readable palette, OKLCH, contrast, ramps, presets
│   │       ├── icons.tsx            # icon registry (data stores icon keys)
│   │       ├── editing/             # EditableText, IconPicker, ThemeColorControl, editing.css
│   │       ├── storage.ts           # safe Local Storage helpers
│   │       └── useThemeColor.ts     # persisted theme colour + generated palette
│   ├── tom-wheel/                   # @agile-infographics/tom-wheel: component 01
│   │   └── src/
│   │       ├── renderer/            # SVG segment wheel, geometry, theme mapping (read-only)
│   │       ├── editor/              # data model, defaults, storage, state hook, TomWheelEditor
│   │       └── index.ts             # public entry
│   ├── methodology-flow/            # @agile-infographics/methodology-flow: component 02
│   │   └── src/
│   │       ├── renderer/            # layout engine, theme mapping, MethodologyFlow (read-only)
│   │       ├── editor/              # data model, defaults, storage, hooks, editor, appearance panel
│   │       └── index.ts             # public entry
│   ├── ecosystem-map/               # @agile-infographics/ecosystem-map: component 03
│   │   └── src/
│   │       ├── renderer/            # data model + validation, layout engine, theme, EcosystemMap (display)
│   │       ├── editor/              # state hooks, editor, group inspector, appearance and data panels
│   │       └── index.ts             # public entry
│   └── process-architecture/        # @agile-infographics/process-architecture: component 04
│       └── src/
│           ├── renderer/            # four-level data model + validation, hierarchy helpers, theme, ProcessArchitecture
│           ├── editor/              # state hooks, editor, inspector, appearance and data panels
│           └── index.ts             # public entry
└── apps/
    └── gallery/                     # private development gallery (never published)
```

**Dependency rules**

- A component package depends only on `@agile-infographics/core` (and on React
  as a peer dependency), never on another component.
- `core` depends on nothing in the library and contains no component names,
  classes or CSS variables.
- Only the gallery depends on every package.
- Inside a component, `renderer/` never imports `editor/`.

Each package exposes only these entry points (`exports` in its `package.json`):

| Import path | Contents |
|---|---|
| `@agile-infographics/<component>` | Editor, renderer, data model, defaults and storage helpers |
| `@agile-infographics/<component>/renderer` | Read-only renderer only; no editor code is bundled |
| `@agile-infographics/<component>/style.css` | The package's CSS. It loads automatically; an explicit import is optional. |

---

## Using a component in a client project

A client installs **only** the component it needs. `core` comes with it
automatically; the other components and the gallery are never installed.

```bash
npm install @agile-infographics/methodology-flow     # npm  (or @agile-infographics/tom-wheel)
pnpm add @agile-infographics/methodology-flow        # pnpm
```

```tsx
import { MethodologyFlowEditor, DEFAULT_METHODOLOGY } from "@agile-infographics/methodology-flow";

<MethodologyFlowEditor defaultData={DEFAULT_METHODOLOGY} storageKey="client-x.methodology" />
```

- **Import only from the component package you installed.** Each component
  re-exports the core utilities its clients need (`generatePalette`,
  `THEME_PRESETS`, `DEFAULT_PRIMARY`, `ICON_KEYS`, `isIconKey` and their
  types). Don't import `@agile-infographics/core` unless you add it to your own
  dependencies: pnpm and Yarn PnP don't let a project reach a dependency of a
  dependency.

- Requirements: React 19 and a bundler that handles CSS imports (Vite, webpack,
  Next.js and so on). Styles load automatically with the component.
- Each package's README documents its full API:
  [tom-wheel](packages/tom-wheel/README.md),
  [methodology-flow](packages/methodology-flow/README.md),
  [ecosystem-map](packages/ecosystem-map/README.md),
  [process-architecture](packages/process-architecture/README.md),
  [core](packages/core/README.md).

### Distribution

The packages are not on a registry yet. Until a channel is chosen, a client can
install a packed build:

```bash
npm run build:packages
npm pack -w @agile-infographics/core -w @agile-infographics/methodology-flow   # → *.tgz files
# in the client project:
npm install ./agile-infographics-core-0.1.0.tgz ./agile-infographics-methodology-flow-0.1.0.tgz
```

Options for later: GitHub Packages (a private npm registry tied to this
repository), tarballs attached to GitHub Releases, or public npm. A plain
`npm install github:…` does not work, because npm cannot install one folder of
a repository.

---

## Component 01 — TOM Wheel

The page opens with a generic seven-component TOM. Everything happens on that
one screen:

| To… | Do this |
|---|---|
| Select a component | Click its segment on the wheel or its row in the list. You can also use **Previous / Next**, or press <kbd>Tab</kbd> into the wheel, then <kbd>←</kbd> <kbd>→</kbd> and <kbd>Enter</kbd>. |
| Edit the wheel title / subtitle | Click the text in the **Wheel centre** card, or click the hub. Press <kbd>Enter</kbd> in the title to start a new line. |
| Rename a component | Click the component's title in the details card. |
| Edit description, detail, facts, checklist | Click the text in the details card. <kbd>Enter</kbd> in a checklist item adds the next item; <kbd>Backspace</kbd> in an empty item removes it. |
| Change the icon | Click the icon tile in the details card. |
| Add / delete / reorder | **+ Add component**; the bin button (with **Undo**); ↑ / ↓ or <kbd>Alt</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> on a list row. |
| Change the theme colour | **Theme colour** in the Wheel centre card: the swatch or a HEX value. |
| Start over | **Reset to default** (click twice). It restores the default content and theme. |

**Rules:**
- 3 to 12 components.
- Names are limited to 60 characters and the title to 80.
- An empty name or title is restored when you leave the field.

**How it adapts to any count:**
- Segments each span `360° / n`, starting at 12 o'clock.
- Labels are measured with the real font and fitted to each segment's actual
  space: 2 lines, or 3 if that segment has room, with one shared font size.
- A name that still doesn't fit ends with "…". The full name stays in the list,
  in the details and in the tooltip.

### Data model and reuse

```ts
interface TomWheelData {
  version: 1;
  title: string;          // hub title; "\n" starts a new line
  subtitle: string;
  centerIcon: IconKey;
  components: { id; name; icon: IconKey; description; details; facts: { label; value }[]; checklist: string[] }[];
}
```

```tsx
<TomWheelEditor
  defaultData={projectA}
  storageKey="project-a.tom-wheel"
  theme={paletteToWheelTheme(generatePalette("#2e9d4f"))}
/>
```

**Storage:**
- content: `agile-infographics.tom-wheel.v1`
- theme colour: `agile-infographics.tom-wheel.theme.v1`

---

## Component 02 — Methodology Flow & Assessment Wheel

A heading, then a horizontal flow of connected steps leading by an arrow to a
circular assessment wheel, plus a legend of the dimensions.

- **Steps:** each has an icon node, a numbered label ("01 · Discover"), a
  title, an optional description, bullet points and an optional highlighted
  takeaway.
- **Wheel:** dimension nodes are spaced evenly around a centre showing a value
  (the dimension count by default) and a label. A result title and description
  sit under the wheel.

### Editing (all in place)

| To… | Do this |
|---|---|
| Edit any text | Click it: heading, subtitle, step label, title, description, points, takeaway, centre value and label, result, dimension label and description. Empty optional fields appear when you hover a step. |
| Points | <kbd>Enter</kbd> in a point adds the next one; <kbd>Backspace</kbd> in an empty point removes it; **+ Add point** under a step. |
| Steps | Hover a step: **‹ ›** move earlier / later, **+** insert after, bin to delete (**Undo** offered). **+ Add step** in the toolbar. |
| Step icon | Click the step's node and pick an icon. |
| Dimensions | Hover a legend row: colour swatch (custom colour, × for automatic), ↑ ↓ move, bin to delete (**Undo**). Click the round badge to change the icon. **+ Add dimension** in the toolbar or under the legend. |
| Select a dimension | Click its node on the wheel or its legend row. Both highlight. |
| Appearance | The **Appearance** panel: presets, custom base colour, advanced colours, text size, heading weight, alignment, text position, numbers or icons on the nodes. |
| Start over | **Reset to default** (click twice). It restores the example content and the default theme. **Reset appearance** resets only the look. |

**Limits:**
- 2–8 steps, 3–12 dimensions, up to 8 points per step.
- Each field has a maximum length.
- Required titles are restored if left empty.

### Layout engine

`packages/methodology-flow/src/renderer/layout.ts` is pure. It takes the measured width, the
number of steps and the typography, and picks a mode:

| Mode | When | Layout |
|---|---|---|
| `row` | Everything fits side by side | Flow left, wheel right, connector ends in an arrow pointing at the wheel. |
| `stacked` | The flow fits, the wheel does not | Flow full width, wheel centred below. |
| `vertical` | Narrow screens or many steps | Vertical timeline; wheel below. |

- **Step text** alternates above and below the connector. Above-only and
  below-only are also available.
- **Overhang:** left-aligned alternating text may extend into the next step's
  empty slot, so text gets twice the width.
- **Long text:** rows grow with their content, so long text never overlaps.
- **Wheel nodes:** sized from the chord between neighbours, so 3 or 12
  dimensions never touch each other or the centre.

### Data model and reuse

```ts
interface MethodologyFlowData {
  version: 1;
  title: string;
  subtitle: string;
  steps: { id; kicker; title; description; bullets: string[]; takeaway; icon: IconKey }[];
  wheel: {
    centerValue: string;          // "" = number of dimensions
    centerLabel: string;
    resultTitle: string;
    resultDescription: string;
    dimensions: { id; label; description; icon: IconKey; color: string | null }[];
  };
}

interface MethodologyAppearance {   // stored separately from the content
  version: 1;
  base: string;                     // base colour → generated palette
  preset: string | null;
  overrides: Partial<Record<"background" | "panel" | "heading" | "text" | "kicker" | "connector"
                          | "stepFrom" | "stepTo" | "dimFrom" | "dimTo", string>>;
  typography: { scale: 0.9 | 1 | 1.1 | 1.2; titleWeight: 600 | 700 | 800; align: "left" | "center" };
  placement: "alternate" | "above" | "below";
  dimensionContent: "number" | "icon";
}
```

```tsx
// Editable, with its own content and storage:
<MethodologyFlowEditor defaultData={myMethodology} storageKey="project-b.methodology" />

// Read-only renderer (any icon set, any theme):
<MethodologyFlow
  model={{ title, subtitle, steps, wheel }}           // icons are React nodes
  theme={paletteToMethodologyTheme(generatePalette("#0f766e"))}
  placement="alternate"
/>
```

The renderer takes optional **slots** (`Text`, `stepIcon`, `stepToolbar`,
`stepFooter`, `dimensionBadge`, `dimensionToolbar`, `legendFooter`). The editor
uses them to make text editable and add controls. Without slots, the
infographic is read-only.

**Storage:**
- content: `agile-infographics.methodology-flow.v1`
- appearance: `agile-infographics.methodology-flow.v1.appearance`

---

## Component 03 — Ecosystem & Interfaces Map

A central entity in the middle of the groups around it, such as functions,
teams, stakeholders, partners or interfaces. Each group lists its own items and
is joined to the centre by a connector.

- **No built-in wording.** All content comes from data, so the same component
  serves IT governance, digital transformation, operating models, stakeholder
  maps, product ecosystems and so on.
- **Gallery examples:** three contexts (IT Quality, Digital Transformation,
  Operating Model), each with a different number of groups and a different
  theme.

**Data:**
- **Centre:** id, title, subtitle, icon and style.
- **Groups:** id, title, description, icon, colour, preferred side, visibility
  and items.
- **Items:** id, label, description, icon, link and tag.
- **Connections:** source and target, label, visibility, line style and arrow
  direction.
- **Validation:** `normalizeEcosystem()` / `validateEcosystem()` complete
  optional fields and report errors and corrections.

**Layout:** the pure `layout.ts` picks a mode from the measured width:
- **radial:** groups on four sides of the centre
- **columns:** two columns joined by a spine
- **stack:** one column

Groups are placed clockwise from 12 o'clock with balanced sides, and a group
can be pinned to a side. Cards are laid out by CSS grid, so they never overlap.
Connectors are drawn from measured positions and routed through the gaps
between cards.

**Display and editing:**
- **Display:** `EcosystemMap` (`/renderer`) has no editing controls. Viewers
  can hover, select (keyboard too), expand long groups and open links.
- **Editing:** `EcosystemMapEditor` edits text in place, and adds, deletes
  (with Undo) and reorders groups and items. A **Selected group** panel holds
  the position, colour, visibility and connection settings plus item links,
  tags and icons. It also has an **Appearance** panel and JSON
  import / export.
- **`readOnly`:** turns the editor into the display-only map for viewers who
  may not edit.

```tsx
import { EcosystemMapEditor, EcosystemMap, DEFAULT_ECOSYSTEM } from "@agile-infographics/ecosystem-map";

<EcosystemMapEditor defaultData={myEcosystem} storageKey="project-c.ecosystem" defaultAppearance={{ base: "#0f766e", scheme: "light" }} />
<EcosystemMap data={myEcosystem} appearance={{ connector: "elbow", cardStyle: "outline" }} />
```

**Storage** (gallery):
- content: `agile-infographics.ecosystem-map.<example>.v1`
- appearance: `agile-infographics.ecosystem-map.<example>.v1.appearance`

See the [package README](packages/ecosystem-map/README.md) for the full data
model, props and appearance options.

---

## Component 04 — Process Architecture Map

A four-level process hierarchy as a consulting-style infographic:

| Level | Name | Shown as |
|---|---|---|
| L0 | Value chain | A banner with owner, status, tags and totals. Several value chains appear as tabs. |
| L1 | Process group | A "process house": management groups on top, core groups as a left-to-right chevron flow, support groups below. |
| L2 | Process | Cards for the selected group. |
| L3 | Activity | A numbered flow (or timeline) for the selected process. |

- **Content:** all content comes from data, at every level: title,
  description, owner or responsible role, status, tags, code and a validated
  link. Groups also have a category, icon and colour. Numbers (1, 1.2, 1.2.3)
  are generated automatically.
- **Navigation:**
  - Select a group, then a process, to drill down. A breadcrumb, **Up one
    level** and <kbd>Esc</kbd> lead back, and arrow keys move between items of
    a level.
  - The selected path's levels are shown one under another, or one level at a
    time.
  - Groups expand to list their processes on the overview, and process cards
    expand to preview their activities.
- **Display and editing:**
  - `ProcessArchitecture` (`/renderer`) is display only.
  - `ProcessArchitectureEditor` edits every level in place: add, insert,
    reorder, and delete with Undo. It also has an inspector for the selected
    node, an Appearance panel, JSON import / export and a `readOnly` mode.
- **Gallery:** a fictional IT service organisation with two value chains
  (8 + 3 groups, 20 processes, 55 activities), with an Edit / Display toggle.

```tsx
import { ProcessArchitectureEditor, ProcessArchitecture } from "@agile-infographics/process-architecture";

<ProcessArchitectureEditor defaultData={myArchitecture} storageKey="project-d.process-architecture" />
<ProcessArchitecture data={myArchitecture} appearance={{ scheme: "light", navigation: "focus" }} />
```

**Storage** (gallery):
- content: `agile-infographics.process-architecture.v1`
- appearance: `agile-infographics.process-architecture.v1.appearance`

See the [package README](packages/process-architecture/README.md) for the
full data model, props and appearance options.

---

## Smart theme customisation (shared)

`packages/core/src/theme/` turns one base colour into a complete, semantic
palette that any component can map onto its own CSS variables.

1. **Analyse the colour.** The base colour is converted to OKLCH, a
   perceptually even colour space, to read its hue and colourfulness.
2. **Keep the structure.** Each role keeps a designed lightness: dark canvas and
   panels, mid-tone fills, light text, analogous accents. It takes the base hue,
   with colourfulness scaled to the base. Grey gives a neutral theme.
3. **Ensure readability.** Every text colour is checked with WCAG contrast and
   lightened or darkened until it passes:
   - body text 7:1
   - secondary and accent text 4.5:1
   - icons and graphics 3:1
4. **Build sequences.** `colorRamp()` creates progressive shades for sequences,
   such as step nodes and dimension nodes. Each item's text or icon colour is
   chosen automatically by `readableOn()`.
5. **Map to the component.** Each component has an adapter:
   `paletteToWheelTheme()` (component 01), `paletteToMethodologyTheme()`
   (component 02), `paletteToEcosystemTheme()` (component 03) and
   `paletteToProcessTheme()` (component 04); the last two add a secondary
   colour and dark or light schemes. Components contain no theme colours.

### Methodology Flow appearance

- **Presets:** Navy, Ocean, Teal, Emerald, Indigo, Plum, Crimson, Amber,
  Graphite. These are base colours, so they go through the same generator.
- **Custom base colour:** a colour picker or a HEX field.
- **Advanced colours:** override background, panel, headings, body text, accent
  text, connector, the first and last step colour, and the first and last
  dimension colour.
  - Text you don't override is re-checked automatically. For example, a light
    panel automatically gets dark text.
  - A contrast report flags any pair that falls below AA after manual overrides.
- **Typography and layout:** text size (S/M/L/XL), heading weight, step text
  alignment, text position, numbers or icons on dimension nodes.

---

## Adding another component to the library

1. **Package.** Create `packages/<component>/` with the same shape as an
   existing component:
   - `package.json`: name `@agile-infographics/<component>`; the same
     `exports`, `sideEffects` and `peerDependencies`; a dependency on
     `@agile-infographics/core` only
   - `vite.config.ts` (`libraryConfig` from `vite.lib.ts`),
     `tsconfig.build.json` and `README.md`
   - add it to `workspaces` and `build:packages` in the root `package.json`
2. **Renderer** (`src/renderer/`):
   - a pure layout or geometry module
   - a renderer that takes the content as props (with optional slots for
     editing)
   - a `theme.ts` with a `paletteTo<Component>Theme(palette, overrides?)`
     adapter
   - CSS that reads only its own CSS variables, imported by the component file
     that needs it (not by an `index.ts`)
3. **Editor** (`src/editor/`):
   - a plain-JSON data model with a `version` field and a generic default
     example
   - `parse…` validation, with core's `loadJson` / `saveJson` under
     versioned keys
   - a state hook with validated actions
   - an editor built from core's `EditableText`, `IconPicker`,
     `ThemeColorControl` and `icons`. Its root gets the class `ed-scope` and
     sets the `--ed-*` colour variables.
4. **Entry points.** `src/index.ts` re-exports `./editor` and `./renderer`.
5. **Gallery.**
   - add the package to `apps/gallery/package.json`
   - register it in `COMPONENTS` in `apps/gallery/src/Gallery.tsx` and add
     its page; it gets its own `#/<slug>` URL
6. **Theme.** Reuse `generatePalette`, `colorRamp`, `readableOn`,
   `ensureReadable` and `THEME_PRESETS` from core. Don't hardcode colours in
   the component, and never import another component.
7. **Client exports.** Re-export from `src/renderer/index.ts` the core
   utilities a client needs for this component (at least `generatePalette`,
   `THEME_PRESETS`, `DEFAULT_PRIMARY`, `ICON_KEYS`, `isIconKey` and their
   types), so clients never import core directly.
8. **Tests.** Add `tests/browser/suites/<component>.html` (see
   [tests/browser](tests/browser/README.md)); `npm test` picks it up
   automatically.

---

## Known limitations (prototype v0.7)

- Data lives only in the browser where it was edited. There is no sharing
  between people or devices. Only the Ecosystem Map has JSON import / export
  (and an `onChange` callback a host can use to save elsewhere).
- TOM Wheel:
  - At 11–12 components the labels get small.
  - Wheel labels on the muted segments keep the approved design's contrast,
    about 3:1.
- Methodology Flow:
  - With many steps and large text it switches to the stacked or vertical
    layout rather than shrinking text.
  - The dimension legend shows icons while editing, whatever the node display
    setting.
  - Very long centre labels are clamped to 3 lines in read-only mode.
- Ecosystem & Interfaces Map:
  - Connections run between the centre and the groups only, not from one
    group to another. Connections between two groups are reported and ignored
    on import.
  - Connector labels in the wide layout are short pills. Longer text is
    shortened with "…", and the full text is in the tooltip. In the two
    narrow layouts the label appears inside the card.
  - The centre title is limited to 60 characters, and its text gets smaller
    for long titles. In read-only mode it is clamped to 5 lines.
  - The automatic group colour ramp is subtle when the primary and secondary
    hues are close. Choose a secondary colour or per-group colours for more
    contrast between groups.
- Process Architecture Map:
  - Up to 6 value chains, 16 groups per chain, 24 processes per group and 30
    activities per process.
  - Processes and activities belong to exactly one parent. Links between
    processes (hand-offs across groups) are not drawn.
  - Activities are shown as an ordered sequence, not as a branching
    flowchart.
- Some manual colour overrides can reduce contrast. They are flagged in the
  Appearance panel, not blocked.
- The browser test suites (`npm test`) run locally and need an installed
  Chromium-based browser. They don't run automatically on GitHub yet.
- The packages build and install, but are not yet published to a registry and
  have no licence field yet.
