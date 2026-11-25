# @agile-infographics/methodology-flow

**Methodology Flow & Assessment Wheel**: an editable React infographic. A
connected sequence of methodology steps (2–8) leads to a circular set of
assessment dimensions (3–12).

- Everything is edited in place: no separate edit mode.
- Steps and dimensions can be added, removed and reordered.
- The layout adapts to the width: flow and wheel side by side, stacked, or a
  vertical timeline.
- A complete, readable theme is generated from one colour, with presets and
  per-role overrides.
- Content and appearance are saved in the browser (Local Storage).

This package is independent of every other component in the Agile Infographics
Library. Its only library dependency is `@agile-infographics/core`, which is
installed automatically. Everything a client needs, including the theme
generator (`generatePalette`, `THEME_PRESETS`) and the icon keys, is exported
from `@agile-infographics/methodology-flow` itself.

> **Import only from `@agile-infographics/methodology-flow`.** Don't import
> `@agile-infographics/core` directly: it is a dependency of this package, not
> of your project, so a strict package manager (pnpm, Yarn PnP) won't let your
> code reach it. If you do want core's other utilities, install it yourself
> (`npm install @agile-infographics/core`) with the same version range this
> package uses.

## Install

```bash
npm install @agile-infographics/methodology-flow     # npm
pnpm add @agile-infographics/methodology-flow        # pnpm
```

- Peer dependencies: `react` and `react-dom` 19.
- You need a bundler that handles CSS imports (Vite, webpack, Next.js and so
  on). Styles load automatically when you import the component.
- Until the package is published to a registry, install the packed tarballs
  instead (see the repository README, "Distribution").

## Editable infographic

```tsx
import { MethodologyFlowEditor, DEFAULT_METHODOLOGY } from "@agile-infographics/methodology-flow";

export function AssessmentPage() {
  return <MethodologyFlowEditor defaultData={DEFAULT_METHODOLOGY} storageKey="client-x.methodology" />;
}
```

| Prop | Type | |
|---|---|---|
| `defaultData` | `MethodologyFlowData` | Initial content, also used by "Reset to default". |
| `storageKey` | `string` | Local Storage key for the content. The appearance is stored under `${storageKey}.appearance`. Use one key per project. |
| `defaultAppearance?` | `MethodologyAppearance` | Initial theme, typography and layout (default: `DEFAULT_APPEARANCE`). |
| `limits?` | `MethodologyLimits` | Item counts and field lengths (default: `DEFAULT_METHODOLOGY_LIMITS`). |

### Your own content

```ts
import type { MethodologyFlowData } from "@agile-infographics/methodology-flow";

const clientMethodology: MethodologyFlowData = {
  version: 1,
  title: "Building an assessment model",
  subtitle: "How reference material becomes a structured set of dimensions.",
  steps: [
    { id: "s1", kicker: "Discover", title: "Gather reference material", description: "",
      bullets: ["Industry frameworks", "Policy requirements"], takeaway: "", icon: "search" },
    // … 2–8 steps
  ],
  wheel: {
    centerValue: "",                 // "" shows the number of dimensions
    centerLabel: "Assessment dimensions",
    resultTitle: "A balanced assessment",
    resultDescription: "",
    dimensions: [
      { id: "d1", label: "Governance", description: "", icon: "shield", color: null },
      // … 3–12 dimensions; color: "#rrggbb" or null for the theme's colour
    ],
  },
};
```

`icon` values are icon keys (`ICON_KEYS`, exported from this package, lists
them; type `IconKey`). Stored data is validated on load. Missing, corrupt or out-of-range data
falls back to `defaultData`.

## Read-only infographic

Import from `/renderer` to display the infographic without any editing code
(the editor, appearance panel and hooks are not bundled):

```tsx
import { MethodologyFlow, generatePalette, paletteToMethodologyTheme, type FlowModel } from "@agile-infographics/methodology-flow/renderer";

const model: FlowModel = { title, subtitle, steps, wheel };   // icons are optional React nodes

<MethodologyFlow
  model={model}
  theme={paletteToMethodologyTheme(generatePalette("#0f766e"))}
  placement="alternate"            // "alternate" | "above" | "below"
  dimensionContent="number"        // "number" | "icon"
/>;
```

## Theming

- `paletteToMethodologyTheme(palette, overrides?)` maps a palette from
  `generatePalette(baseColour)` (exported from this package) onto this
  component's theme.
- `overrides` can set `background`, `panel`, `heading`, `text`, `kicker`,
  `connector`, `stepFrom`, `stepTo`, `dimFrom` and `dimTo`. Text you don't
  override is re-checked for contrast automatically.
- `checkThemeContrast(theme)` reports every text/background pair against WCAG AA.
- Presets are in `THEME_PRESETS` (exported from this package).

## Main exports

| Export | From | |
|---|---|---|
| `MethodologyFlowEditor` | `.` | Complete editable infographic |
| `DEFAULT_METHODOLOGY`, `DEFAULT_APPEARANCE` | `.` | Generic example content and default appearance |
| `useMethodologyFlow`, `useMethodologyAppearance` | `.` | State hooks, if you build your own editor UI |
| `parseMethodology`, `parseAppearance` | `.` | Validate stored or imported JSON |
| `MethodologyFlow` | `.` and `/renderer` | Renderer (read-only without slots) |
| `computeFlowLayout`, `computeWheelLayout`, `chooseFlowMode` | `.` and `/renderer` | Pure layout engine |
| `paletteToMethodologyTheme`, `methodologyThemeToCssVars`, `checkThemeContrast` | `.` and `/renderer` | Theming |
| `generatePalette`, `THEME_PRESETS`, `DEFAULT_PRIMARY`, `ICON_KEYS`, `isIconKey` | `.` and `/renderer` | Re-exported from core, so you never import core directly |
| Types: `MethodologyFlowData`, `MethodologyAppearance`, `FlowModel`, `MethodologyTheme`, `ThemePalette`, `IconKey`, … | `.` | |

## Development

This package lives in the
[agile-infographics-library](https://github.com/Lamaallthaher/agile-infographics-library)
monorepo:

- **Preview:** run `npm run dev` at the repository root, then open
  http://localhost:5173/#/methodology-flow.
- **Build:** run `npm run build -w @agile-infographics/methodology-flow` (build
  `@agile-infographics/core` first). The output goes to `dist/`: ES modules,
  `style.css` and type declarations.
