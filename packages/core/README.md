# @agile-infographics/core

Generic building blocks shared by the Agile Infographics components. You
normally get it automatically as a dependency of a component package, but it
can also be used on its own.

It contains no component-specific code, class names or CSS variables.

| Area | Exports |
|---|---|
| Theme generation | `generatePalette(baseHex)` returns a semantic `ThemePalette`; also `DEFAULT_PRIMARY`, `DEFAULT_PALETTE`, `THEME_PRESETS` |
| Colour maths | `hexToOklch`, `oklchToHex`, `normalizeHex`, `contrast`, `ensureContrast`, `colorRamp`, `mixOklch`, `readableOn`, `ensureReadable`, `isLightColor`, `withAlpha` |
| Icons | `icons`, `ICON_KEYS`, `ICON_NAMES`, `isIconKey`, type `IconKey` |
| Inline editing | `EditableText`, `IconPicker`, `ThemeColorControl` |
| Persistence | `loadJson`, `saveJson`, `removeKey`, `newId`, and `useThemeColor(storageKey)` (a persisted theme colour plus its palette) |

```ts
import { generatePalette, contrast } from "@agile-infographics/core";

const palette = generatePalette("#0f766e");
contrast(palette.onCanvas, palette.canvas); // WCAG contrast ratio (4.5 or more passes AA for body text)
```

The editing primitives read their colours from `--ed-*` CSS variables set by
the host component on an element with the class `ed-scope`:
`--ed-border`, `--ed-accent`, `--ed-surface`, `--ed-surface-raised`,
`--ed-text`, `--ed-text-muted`, `--ed-focus`, `--ed-selected-bg` and
`--ed-selected-fg`.
