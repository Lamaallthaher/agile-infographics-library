# Agile Infographics Library — TOM Wheel prototype

An interactive, fully editable **Target Operating Model (TOM) wheel** built with
React, TypeScript and plain CSS. It is the first asset of the Agile Infographics
Library.

- A circular wheel with equal segments, white separators, a dark outer ring and
  a white centre hub with the wheel title.
- **Any number of components (3–12).** Add, delete, rename and reorder
  components; the wheel recalculates its geometry immediately.
- **Everything is edited in place, in one interface.** There is no separate
  view or edit mode: click any text to change it.
- **Theme colour:** pick any primary colour. A complete, readable theme is
  generated from it automatically.
- Changes are kept in the browser (Local Storage) and survive a page refresh.

> Status: **prototype for review.** It is not yet packaged or published as a
> library. All example content is generic and fictional.

---

## Run it

Requirements: Node.js 20+ and npm.

```bash
npm install      # first time only
npm run dev      # start the dev server → http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload (http://localhost:5173) |
| `npm run typecheck` | TypeScript check, no output files |
| `npm run build` | Type-check + production build into `dist/` |
| `npm run preview` | Serve the production build (http://localhost:4173) |

Stop the dev server with **Ctrl + C**.

---

## Using the prototype

The page opens with a generic seven-component TOM. Everything happens on that
one screen:

| To… | Do this |
|---|---|
| Select a component | Click its segment on the wheel or its row in the list. You can also use **Previous / Next**, or press <kbd>Tab</kbd> into the wheel, then <kbd>←</kbd> <kbd>→</kbd> and <kbd>Enter</kbd>. |
| Edit the wheel title / subtitle | Click the text in the **Wheel centre** card under the wheel, or click the hub. Press <kbd>Enter</kbd> in the title to start a new line. |
| Rename a component | Click the component's title in the details card. |
| Edit description, detail, facts, checklist | Click the text in the details card. <kbd>Enter</kbd> in a checklist item adds the next item; <kbd>Backspace</kbd> in an empty item removes it. Use **+ Add fact** and **+ Add item**, and the **×** buttons to remove. |
| Change the icon | Click the icon tile in the details card and pick an icon. |
| Add a component | **+ Add component** under the list. It is inserted after the selected component and its name is ready to type. |
| Delete a component | The bin button on the list row (or <kbd>Delete</kbd> on the row). **Undo** is offered for a few seconds. |
| Reorder | The ↑ / ↓ buttons on the list row, or <kbd>Alt</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> on the row. |
| Change the theme colour | **Theme colour** in the Wheel centre card: click the swatch for the colour picker, or type a HEX value (`#ff7a00`, or `f80` when you leave the field). **Default colour** restores the approved navy theme only. |
| Start over | **Reset to default** in the Wheel centre card (click twice to confirm). It restores the default content and the default theme. |

Hovering a segment or list row highlights it without changing the selection.
The details card always shows the selected component.

### Rules that keep the wheel valid

- 3 to 12 components. Add and Delete are disabled at the limits, so the wheel
  can never be empty.
- Component names are limited to 60 characters and the title to 80. An empty
  name or title is restored to its previous value when you leave the field.
- Stored data is validated on load. Corrupt or invalid data falls back to the
  default configuration.

---

## How dynamic component counts work

The geometry lives in `src/library/segment-wheel/geometry.ts`. It is pure and
deterministic, and nothing in it assumes a particular number of segments.

1. **Segments:** each one spans `360° / n`. The first starts at 12 o'clock and
   the rest run clockwise. Separators sit on every boundary.
2. **Sizes:** the icon and label sizes follow a step table by count.
   - 5 or fewer: 15 px text with 46 px icons.
   - 12: 12 px text with 30 px icons.
3. **Label fitting:** labels are measured with the real font (canvas
   `measureText`) and wrapped to the space actually available in their own
   segment.
   - Each label box is tested against both separators, the hub and the outer
     ring.
   - A label uses 2 lines, or 3 if that segment has room.
4. **Long names:** all labels share one font size. It shrinks at most ~18%, so
   a single long name cannot make every label tiny. A name that still does not
   fit gets an ellipsis on the wheel. The full name is always shown in the list
   and the details card, and as a tooltip on the segment.
5. **Hub title:** keeps the lines you typed and shrinks to fit the circle. It
   wraps automatically only if shrinking is not enough.

---

## Theme colour generation

`src/library/theme-generator/` turns one primary colour into a full palette.
It is dependency-free and not tied to the wheel, so other infographics can use
it.

1. **Analyse the colour.** The primary is converted to OKLCH, a colour space
   where equal lightness steps look equal across hues. The generator reads its
   hue, and its chroma (how colourful it is).
2. **Keep the approved structure.** Every colour role keeps the lightness of the
   approved design: dark stage and panels, a dark ring, mid-tone muted segments,
   light text and a white hub. Each role takes the primary's hue, with chroma
   scaled by how colourful the primary is.
   - A grey primary gives a neutral theme.
   - A vivid primary gives a richer theme.
   - Accents use a neighbouring hue, 20° away, as in the original design.
3. **Check readability.** Every foreground is measured against its background
   with WCAG contrast, and lightened or darkened until it passes:

   | Pair | Minimum contrast |
   |---|---|
   | Body and editor text on panels | 7:1 |
   | Secondary text and accents | 4.5:1 |
   | Wheel ring and markers | 3:1 |
   | Hub title | 7:1 |
   | Labels on muted segments | ≈3:1 (the approved design's own level) |

4. **The selected segment keeps your exact colour whenever possible.** Its
   label turns white or dark, whichever is readable at AA 4.5:1.
   - Vivid light colours such as orange, yellow and cyan keep their colour and
     get dark labels.
   - A mid-tone colour that would be unreadable with either label colour, or
     that would look like the normal or hover segments, is darkened slightly.
5. **Map to the wheel.** `paletteToWheelTheme()` maps the palette onto the
   wheel's `--sw-*` CSS variables. The stage background uses `--gl-stage-*`.
   No component contains theme colours.

The approved navy (`#1f4670`) returns the original palette verbatim, so the
default theme is identical to the approved design.

```ts
import { generatePalette } from "./library/theme-generator";
import { paletteToWheelTheme } from "./library/segment-wheel";

const palette = generatePalette("#7b2cbf");          // full semantic palette
<TomWheelEditor theme={paletteToWheelTheme(palette)} … />
```

The theme colour is stored separately from the content, under
`agile-infographics.tom-wheel.theme.v1`, as `{ "version": 1, "primary": "#rrggbb" }`.

---

## Project structure

```text
src/
├── main.tsx, App.tsx              # entry → renders the gallery page
├── library/segment-wheel/         # RENDERING — reusable, no TOM content
│   ├── geometry.ts                # pure maths: segments, separators, label + hub fitting
│   ├── SegmentWheel.tsx           # controlled SVG wheel (hover, selection, keyboard)
│   ├── SegmentWheelPanel.tsx      # read-only wheel + list + details (not used by the TOM page)
│   ├── theme.ts, types.ts         # theme → CSS variables, public types
│   ├── segment-wheel.css
│   └── index.ts                   # public API
├── library/theme-generator/       # THEMING — one colour → full readable palette (reusable)
│   ├── color.ts                   # HEX ⇄ OKLCH, gamut mapping, WCAG contrast
│   ├── generatePalette.ts         # palette generation + approved default palette
│   └── index.ts
├── tom/                           # TOM WHEEL — data, state, editing UI
│   ├── types.ts                   # TomWheelData / TomComponent (plain JSON) + limits
│   ├── default-tom.ts             # initial 7-component configuration
│   ├── icons.tsx                  # icon registry (data stores icon keys)
│   ├── storage.ts                 # Local Storage load / validate / save
│   ├── useTomWheel.ts             # state + validated edit actions + persistence
│   ├── TomWheelEditor.tsx         # the single editable interface
│   ├── EditableText.tsx           # always-editable text field
│   ├── IconPicker.tsx
│   ├── ThemeColorControl.tsx      # colour picker + HEX field
│   ├── useThemeColor.ts           # theme colour state + persistence
│   ├── tom-editor.css
│   └── index.ts
└── gallery/                       # page shell (header, intro, stage)
    ├── Gallery.tsx
    └── gallery.css
```

Dependency direction is one-way: `gallery → tom → library`. The rendering
library never imports TOM content.

### Configuration and data

The wheel's content is plain, JSON-serialisable data:

```ts
interface TomWheelData {
  version: 1;
  title: string;        // hub title; "\n" starts a new line
  subtitle: string;     // optional small line in the hub
  centerIcon: IconKey;
  components: TomComponent[];
}

interface TomComponent {
  id: string;
  name: string;
  icon: IconKey;        // e.g. "compass", "people", "database" (see tom/icons.tsx)
  description: string;
  details: string;
  facts: { label: string; value: string }[];
  checklist: string[];
}
```

### Reusing the wheel for another project

There's no need to change component code. Pass different default data and a
different storage key:

```tsx
import { TomWheelEditor, type TomWheelData } from "./tom";

const projectA: TomWheelData = {
  version: 1,
  title: "Project A\nOperating Model",
  subtitle: "",
  centerIcon: "tomMonitor",
  components: [
    { id: "s", name: "Strategy", icon: "compass", description: "…", details: "", facts: [], checklist: [] },
    // … any number of components (3–12)
  ],
};

<TomWheelEditor defaultData={projectA} storageKey="project-a.tom-wheel" />;
```

Optional props:
- `limits`: minimum and maximum components, name length.
- `theme`: colours and font, e.g. `paletteToWheelTheme(generatePalette("#2e9d4f"))`.
- `themeColor` and `onReset`: show the Theme colour control, and reset the
  theme along with the content.
- `geometry`: radii, separator width, start angle.

### Data persistence

- Every change is saved immediately to `localStorage` under the given
  `storageKey`. The prototype uses `agile-infographics.tom-wheel.v1`.
- Data is stored per browser and per device. Clearing site data, or **Reset to
  default**, returns to `default-tom.ts`.
- If the browser blocks storage (for example some private modes), the page still
  works and shows "Changes cannot be saved in this browser".
- There is no backend or database at this stage.

---

## Known limitations (prototype v0.5)

- Data lives only in the browser where it was edited. It is not shared between
  people or devices, and there is no import or export yet.
- At 11–12 components the labels get small, and a long single word may end with
  "…" on the wheel. Up to about 9 components gives the best presentation
  quality.
- Labels inside the wheel are small on phones. The list and details card stay
  fully readable.
- Wheel labels on the muted segments keep the approved design's contrast,
  about 3:1. That is AA for large text and graphics, not 4.5:1. All other
  important text meets AA 4.5:1 or more.
- Some mid-tone primaries, such as medium green or teal, are darkened slightly
  so white labels stay readable, so the selected segment can be a little deeper
  than the colour picked.
- The colour applies to the wheel and its stage. The page header outside the
  stage keeps the library's own branding.
- No automated test suite is committed yet. The prototype was verified with
  scripted browser checks during development.
- Not yet packaged as an npm library. The TOM code is consumed by copying the
  `src/library` and `src/tom` folders.
