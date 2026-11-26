# Browser tests

End-to-end checks that run against the production build of the development
gallery (`apps/gallery/dist`) in a real headless browser. They drive the
components the way a user does: typing, clicking, keyboard, resizing,
reloading. They then check the rendered result: layout geometry, colours and
contrast, Local Storage contents and console errors.

```bash
npm test                                      # build the gallery, then run every suite
npm run test:browser                          # run every suite against the existing build
npm run test:browser -- methodology-flow      # run selected suites
npm run test:browser -- --verbose             # also list every passing check
```

- **Requirements:** Node.js 20+ and an installed Chromium-based browser (Edge,
  Chrome or Chromium). The runner finds it automatically; set
  `BROWSER=/path/to/browser` to choose one.
- **No test dependencies:** nothing is installed for testing.
- **Exit codes:** `0` all passed, `1` a check failed or a test browser was
  left running, `2` the run could not start (no build or no browser).

| Suite | Component | Checks | What it covers |
|---|---|---|---|
| `tom-wheel-editing` | TOM Wheel | 131 | Default wheel; selection by wheel, list and keyboard; in-place editing of hub, names, descriptions, facts and checklist; icon picker; add, delete (with Undo) and reorder at 3–12 components; label fitting, even segments, no overlaps; Reset; persistence after reload; invalid stored data |
| `tom-wheel-theme` | TOM Wheel | 69 | Theme colour control (HEX field and native picker); generated palettes for several base colours; hover and selected states; WCAG contrast of 13 text/icon pairs; geometry unchanged by theming; reset and persistence |
| `methodology-flow` | Methodology Flow | 150 | Default example; editing every main text field; points (Enter / Backspace); icons; dimension colours; selection; move, delete and Undo; 2–8 step and 3–12 dimension limits; responsive row, stacked and vertical layouts; placement, typography and node content; presets, custom colours, overrides and contrast warnings; persistence after reload; Reset; invalid, corrupt or unavailable storage; gallery navigation; no console errors |
| `methodology-flow-extra` | Methodology Flow | 31 | Subtitle, step and dimension descriptions, result text; insert step after; both "Add dimension" buttons; automatic centre count; Undo expiry; native colour picker and invalid HEX; "Reset appearance" keeps content; persistence of all of the above after refresh; editing at 390 px; no console errors |
| `ecosystem-map` | Ecosystem Map | 152 | Example data and normalised storage; clockwise, balanced side placement; connectors start on the centre ring and end on a port at their card; no text on connectors (relationship kept in data and accessible text); segmented ring with one segment per group, each connector leaving from its own segment; click / tap selection (highlighted group, connector, port and segment; others dimmed; switch, toggle off, clear by clicking an empty area or the centre; hover changes nothing) in display and editor modes; in-place editing (Enter / Backspace for items, required titles); reorder by buttons and Alt + arrows; delete with Undo; 1–12 groups and 0–20 items; JSON import validation (invalid JSON, limits, duplicate ids, unsafe links, unknown icons, colours, sides and connections, missing optional fields); maximum-length text at 1400, 800 and 390 px; inspector (side, connector visibility, style, arrows, label, group colour, hidden groups, icons, item link, tag and icon); display mode (no controls, hidden groups left out, safe links, collapse / expand, keyboard, accessible names); radial, columns and stack layouts; persistence, separate keys per example, invalid and corrupt storage; no console errors |
| `ecosystem-map-theme` | Ecosystem Map | 48 | Default theme; WCAG AA for 9 text pairs across 9 presets × dark/light schemes with geometry unchanged; light scheme; custom primary HEX and invalid HEX; secondary colour; card styles, corner radius, spacing, text size, heading weight; centre style and size (connectors re-attach); curved, elbow and straight connectors; uniform and progressive group colours; layout preference and fallback; colour overrides with automatic text contrast and warnings; persistence; Reset appearance keeps content; collapse threshold; item details for the selected group; no console errors |

## How it works

`run.mjs` starts a local server on a free port, which serves:

- the gallery build at `/`
- the suites at `/suites/<name>.html`
- a small wrapper page at `/__run/<name>`

It opens the wrapper in a headless browser with a fresh temporary profile, so
Local Storage starts empty. The wrapper loads the suite, which loads the
gallery in an iframe and runs its checks. When the suite writes
`SUMMARY x/y passed` into its `<pre id="out">`, the wrapper posts that text back
to the runner. The runner then closes the browser and prints the result.

**Closing the browser:** the runner stops every process whose command line
contains that suite's unique profile folder, not just the process it started.
Edge on Windows can relaunch itself under a new process ID, so stopping by
process ID alone would leave it running. The same cleanup runs when a suite
fails, times out, or the runner is interrupted (Ctrl+C) or crashes. At the end,
the runner reports how many test browser processes are still running (expected
`0`) and fails if any are.

Each suite is a self-contained HTML page with no build step. Open one in a
browser on the same origin as a gallery build to watch it run. For example,
serve `apps/gallery/dist` together with this folder, then open
`/suites/methodology-flow.html`.

## Adding a suite for a new component

1. Add `suites/<component>.html`. Load the gallery route in an iframe
   (`/index.html#/<slug>`), record results with
   `ok(name, condition, detail)`, and finish by writing
   `SUMMARY <passed>/<total> passed` followed by the `PASS` / `FAIL` lines into
   `<pre id="out">`. Copying an existing suite's helpers is the quickest start.
2. Run `npm test`. The runner picks up every `.html` file in `suites/`
   automatically.
