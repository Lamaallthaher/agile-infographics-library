# @agile-infographics/tom-wheel

**TOM Wheel**: an editable React infographic for presenting the components of a
Target Operating Model.

- A circular wheel with any number of components (3–12), a details panel and a
  component list.
- Everything is edited in place. The wheel re-arranges itself automatically.
- Content is saved in the browser (Local Storage).

This package is independent of every other component in the Agile Infographics
Library. Its only library dependency is `@agile-infographics/core`, which is
installed automatically. Everything a client needs, including the theme
generator (`generatePalette`, `useThemeColor`, `THEME_PRESETS`) and the icon
keys, is exported from `@agile-infographics/tom-wheel` itself.

> **Import only from `@agile-infographics/tom-wheel`.** Don't import
> `@agile-infographics/core` directly: it is a dependency of this package, not
> of your project, so a strict package manager (pnpm, Yarn PnP) won't let your
> code reach it. If you do want core's other utilities, install it yourself
> (`npm install @agile-infographics/core`) with the same version range this
> package uses.

## Install

```bash
npm install @agile-infographics/tom-wheel     # npm
pnpm add @agile-infographics/tom-wheel        # pnpm
```

- Peer dependencies: `react` and `react-dom` 19.
- You need a bundler that handles CSS imports. Styles load automatically.

## Editable wheel

```tsx
import { TomWheelEditor, DEFAULT_TOM, generatePalette, paletteToWheelTheme, useThemeColor } from "@agile-infographics/tom-wheel";

// Fixed theme:
<TomWheelEditor defaultData={DEFAULT_TOM} storageKey="client-y.tom" theme={paletteToWheelTheme(generatePalette("#2e9d4f"))} />;

// With the built-in theme colour control (colour persisted under its own key):
function TomWithTheme() {
  const t = useThemeColor("client-y.tom.theme");
  return (
    <TomWheelEditor
      defaultData={DEFAULT_TOM}
      storageKey="client-y.tom"
      theme={paletteToWheelTheme(t.palette)}
      themeColor={{ value: t.color, onChange: t.setColor, onReset: t.reset, isDefault: t.isDefault }}
      onReset={t.reset}
    />
  );
}
```

| Prop | Type | |
|---|---|---|
| `defaultData` | `TomWheelData` | Initial content, also used by "Reset to default". |
| `storageKey` | `string` | Local Storage key. Use one key per project. |
| `theme?` | `Partial<WheelTheme>` | Colours (usually `paletteToWheelTheme(generatePalette(colour))`). |
| `geometry?` | `Partial<WheelGeometry>` | Wheel proportions. |
| `limits?` | `TomLimits` | Component count (3–12) and text lengths. |
| `themeColor?` | `ThemeColorControlProps` | Shows the theme colour control. The host owns the theme state. |
| `onReset?` | `() => void` | Called by "Reset to default" as well (for example to reset the theme). |

```ts
interface TomWheelData {
  version: 1;
  title: string;          // hub title; "\n" starts a new line
  subtitle: string;
  centerIcon: IconKey;
  components: { id; name; icon: IconKey; description; details; facts: { label; value }[]; checklist: string[] }[];
}
```

## Read-only wheel

```tsx
import { SegmentWheelPanel } from "@agile-infographics/tom-wheel/renderer";
```

The `/renderer` entry contains only the SVG wheel, geometry and theme mapping;
no editor code is bundled.

## Development

- **Preview:** run `npm run dev` at the repository root, then open
  http://localhost:5173/#/tom-wheel.
- **Build:** run `npm run build -w @agile-infographics/tom-wheel` (build core
  first).
