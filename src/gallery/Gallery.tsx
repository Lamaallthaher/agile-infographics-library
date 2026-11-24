import { DEFAULT_TOM, TomWheelEditor } from "../tom";
import "./gallery.css";

/** Local Storage key for the prototype's TOM wheel. Use a different key per project. */
const STORAGE_KEY = "agile-infographics.tom-wheel.v1";

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
  return (
    <div className="gl">
      <header className="gl-header">
        <div className="gl-header-inner">
          <a className="gl-brand" href="#">
            <Logo />
            <span>
              <span className="gl-brand-org">Agile</span>
              <span className="gl-brand-name">Infographics Library</span>
            </span>
          </a>
          <span className="gl-version">Prototype v0.4</span>
        </div>
      </header>

      <main className="gl-main">
        <section className="gl-intro">
          <p className="gl-kicker">Asset 01</p>
          <h1 className="gl-title">Target Operating Model Wheel</h1>
          <p className="gl-lede">
            An interactive, fully editable wheel for presenting the components of a Target Operating Model. Use any
            number of components — the wheel re-arranges itself automatically.
          </p>
        </section>

        <section className="gl-stage is-dark" aria-labelledby="gl-stage-title">
          <header className="gl-stage-head">
            <p className="gl-stage-kicker">Operating-model design</p>
            <h2 id="gl-stage-title" className="gl-stage-title">
              Generic TOM
            </h2>
            <p className="gl-stage-desc">
              Click any text to edit it. Add, remove and reorder components in the list. Changes are saved in this
              browser.
            </p>
          </header>
          <TomWheelEditor defaultData={DEFAULT_TOM} storageKey={STORAGE_KEY} />
        </section>

        <ul className="gl-tips" aria-label="How to interact">
          <li><kbd>Click</kbd> a segment or list item to select it</li>
          <li><kbd>Click</kbd> any text or the icon to edit it</li>
          <li><kbd>Tab</kbd> into the wheel, then <kbd>←</kbd> <kbd>→</kbd> to move, <kbd>Enter</kbd> to select</li>
          <li><kbd>Alt</kbd> + <kbd>↑</kbd> <kbd>↓</kbd> on a list item to reorder</li>
        </ul>
      </main>

      <footer className="gl-footer">
        All example content is fictional and for demonstration only. Independent Agile asset.
      </footer>
    </div>
  );
}
