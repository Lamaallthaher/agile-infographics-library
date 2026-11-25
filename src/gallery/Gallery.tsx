import { useEffect, useState, type CSSProperties } from "react";
import { paletteToWheelTheme } from "../library/segment-wheel";
import { DEFAULT_METHODOLOGY, MethodologyFlowEditor } from "../methodology";
import { DEFAULT_TOM, TomWheelEditor, useThemeColor } from "../tom";
import "./gallery.css";

/** Local Storage key for the prototype's TOM wheel. Use a different key per project. */
const STORAGE_KEY = "agile-infographics.tom-wheel.v1";
/** The theme colour is stored separately from the wheel content. */
const THEME_KEY = "agile-infographics.tom-wheel.theme.v1";
/** Local Storage key for the Methodology Flow content (appearance: `${key}.appearance`). */
const METHODOLOGY_KEY = "agile-infographics.methodology-flow.v1";

/** The library's components. Each has its own page: #/<slug>. */
const COMPONENTS = [
  { slug: "tom-wheel", label: "TOM Wheel", asset: "01" },
  { slug: "methodology-flow", label: "Methodology Flow", asset: "02" },
] as const;
type Slug = (typeof COMPONENTS)[number]["slug"];

function readSlug(): Slug {
  const s = window.location.hash.replace(/^#\/?/, "");
  return COMPONENTS.find((c) => c.slug === s)?.slug ?? "tom-wheel";
}

function useHashSlug() {
  const [slug, setSlug] = useState<Slug>(readSlug);
  useEffect(() => {
    const onChange = () => setSlug(readSlug());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return slug;
}

function Logo() {
  return (
    <svg className="gl-logo" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="#2b2a6e" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path
          key={i}
          d="M16 4.5a11.5 11.5 0 0 1 9.96 5.75L19 14.27A4 4 0 0 0 16 12Z"
          fill={i % 2 ? "#c9c4ff" : "#8f86ff"}
          transform={`rotate(${i * 60} 16 16)`}
        />
      ))}
      <circle cx="16" cy="16" r="3.4" fill="#fff" />
    </svg>
  );
}

export function Gallery() {
  const slug = useHashSlug();
  useEffect(() => {
    document.title = `${COMPONENTS.find((c) => c.slug === slug)!.label} · Agile Infographics Library`;
  }, [slug]);

  return (
    <div className="gl">
      <header className="gl-header">
        <div className="gl-header-inner">
          <a className="gl-brand" href="#/tom-wheel">
            <Logo />
            <span>
              <span className="gl-brand-org">Agile</span>
              <span className="gl-brand-name">Infographics Library</span>
            </span>
          </a>
          <nav className="gl-nav" aria-label="Components">
            {COMPONENTS.map((c) => (
              <a key={c.slug} href={`#/${c.slug}`} className="gl-nav-link" aria-current={c.slug === slug ? "page" : undefined}>
                <span className="gl-nav-no">{c.asset}</span>
                {c.label}
              </a>
            ))}
          </nav>
          <span className="gl-version">Prototype v0.6</span>
        </div>
      </header>

      <main className="gl-main">{slug === "methodology-flow" ? <MethodologyPage /> : <TomPage />}</main>

      <footer className="gl-footer">
        All example content is fictional and for demonstration only. Independent Agile asset.
      </footer>
    </div>
  );
}

function MethodologyPage() {
  return (
    <>
      <section className="gl-intro">
        <p className="gl-kicker">Asset 02</p>
        <h1 className="gl-title">Methodology Flow &amp; Assessment Wheel</h1>
        <p className="gl-lede">
          A connected sequence of methodology steps leading to a circular set of assessment dimensions. Any number of
          steps and dimensions, any content, and a theme generated from one colour.
        </p>
      </section>
      <MethodologyFlowEditor defaultData={DEFAULT_METHODOLOGY} storageKey={METHODOLOGY_KEY} />
      <ul className="gl-tips" aria-label="How to interact">
        <li><kbd>Click</kbd> any text or icon to edit it</li>
        <li>Hover a step or dimension for <kbd>move</kbd> / <kbd>add</kbd> / <kbd>delete</kbd></li>
        <li><kbd>Enter</kbd> in a point adds the next point</li>
        <li>Change colours, type and layout under <kbd>Appearance</kbd></li>
      </ul>
    </>
  );
}

/** The TOM wheel page (unchanged content). */
function TomPage() {
  const theme = useThemeColor(THEME_KEY);
  const { palette } = theme;
  // The stage around the wheel follows the generated palette too.
  const stageStyle = {
    "--gl-stage-from": palette.canvas,
    "--gl-stage-to": palette.canvasAlt,
    "--gl-stage-text": palette.onCanvas,
  } as CSSProperties;

  return (
    <>
        <section className="gl-intro">
          <p className="gl-kicker">Asset 01</p>
          <h1 className="gl-title">Target Operating Model Wheel</h1>
          <p className="gl-lede">
            An interactive, fully editable wheel for presenting the components of a Target Operating Model. Use any
            number of components — the wheel re-arranges itself automatically.
          </p>
        </section>

        <section className="gl-stage is-dark" style={stageStyle} aria-labelledby="gl-stage-title">
          <header className="gl-stage-head">
            <p className="gl-stage-kicker">Operating-model design</p>
            <h2 id="gl-stage-title" className="gl-stage-title">
              Generic TOM
            </h2>
            <p className="gl-stage-desc">
              Click any text to edit it. Add, remove and reorder components in the list, and pick a theme colour
              under the wheel. Changes are saved in this browser.
            </p>
          </header>
          <TomWheelEditor
            defaultData={DEFAULT_TOM}
            storageKey={STORAGE_KEY}
            theme={paletteToWheelTheme(palette)}
            themeColor={{ value: theme.color, onChange: theme.setColor, onReset: theme.reset, isDefault: theme.isDefault }}
            onReset={theme.reset}
          />
        </section>

        <ul className="gl-tips" aria-label="How to interact">
          <li><kbd>Click</kbd> a segment or list item to select it</li>
          <li><kbd>Click</kbd> any text or the icon to edit it</li>
          <li><kbd>Tab</kbd> into the wheel, then <kbd>←</kbd> <kbd>→</kbd> to move, <kbd>Enter</kbd> to select</li>
          <li><kbd>Alt</kbd> + <kbd>↑</kbd> <kbd>↓</kbd> on a list item to reorder</li>
        </ul>
    </>
  );
}
