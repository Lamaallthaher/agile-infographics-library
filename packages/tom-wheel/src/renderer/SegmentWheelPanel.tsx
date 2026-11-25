import { useId, useState } from "react";
import { SegmentWheel } from "./SegmentWheel";
import { DEFAULT_LABELS, resolveTheme, themeToCssVars } from "./theme";
import type { WheelConfig, WheelPanelLabels, WheelSegment } from "./types";

export interface SegmentWheelPanelProps {
  config: WheelConfig;
  labels?: Partial<WheelPanelLabels>;
  /**
   * Segment selected on first render. Omit to select the first available segment;
   * pass `null` to start with nothing selected.
   */
  initialSelectedId?: string | null;
  /** Fires when an available segment is selected. */
  onSelectionChange?: (segment: WheelSegment) => void;
  /** Hide the numbered list (wheel + details only). */
  showList?: boolean;
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

function Rating({ rating }: { rating: NonNullable<WheelSegment["rating"]> }) {
  const max = Math.max(1, Math.round(rating.max));
  const value = Math.max(0, Math.min(max, rating.value));
  return (
    <div className="sw-rating">
      <div className="sw-rating-head">
        <span className="sw-rating-label">{rating.label}</span>
        <span className="sw-rating-value">
          {rating.caption ? `${rating.caption} · ` : ""}
          {value}/{max}
        </span>
      </div>
      <div
        className="sw-rating-bar"
        role="meter"
        aria-label={rating.label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value} of ${max}${rating.caption ? `, ${rating.caption}` : ""}`}
      >
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={i < value ? "is-on" : ""} />
        ))}
      </div>
    </div>
  );
}

/**
 * Wheel + details panel + synchronized numbered list + live status.
 * Hover/focus only highlights; click, Enter or Space selects. The details panel
 * always shows the selected segment (or an unavailable one the user just tried).
 */
export function SegmentWheelPanel({
  config,
  labels,
  initialSelectedId,
  onSelectionChange,
  showList = true,
  className = "",
}: SegmentWheelPanelProps) {
  const L = { ...DEFAULT_LABELS, ...labels };
  const theme = resolveTheme(config.theme);
  const { segments } = config;
  const detailsId = useId();

  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    initialSelectedId !== undefined ? initialSelectedId : (segments.find((s) => !s.disabled)?.id ?? null),
  );
  const [noticeId, setNoticeId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const shownId = noticeId ?? selectedId;
  const shownIndex = segments.findIndex((s) => s.id === shownId);
  const shown = shownIndex >= 0 ? segments[shownIndex] : null;
  const hovered = hoverId && hoverId !== shownId ? segments.find((s) => s.id === hoverId) : undefined;

  function select(segment: WheelSegment) {
    if (segment.disabled) {
      setNoticeId(segment.id);
      setAnnouncement(`${segment.title}: ${segment.status ?? L.unavailable}`);
      return;
    }
    setNoticeId(null);
    setSelectedId(segment.id);
    setAnnouncement(`${segment.title} ${L.selected.toLowerCase()}`);
    onSelectionChange?.(segment);
  }

  /** Previous/next through available segments, wrapping around. */
  function step(direction: 1 | -1) {
    const n = segments.length;
    const from = shownIndex >= 0 ? shownIndex : direction === 1 ? -1 : 0;
    for (let i = 1; i <= n; i++) {
      const candidate = segments[(((from + direction * i) % n) + n) % n];
      if (!candidate.disabled) {
        select(candidate);
        return;
      }
    }
  }

  return (
    <div className={`sw-panel ${className}`.trim()} style={themeToCssVars(theme)} data-wheel={config.id}>
      <div className="sw-layout">
        <div className="sw-stage">
          <SegmentWheel
            segments={segments}
            center={config.center}
            geometry={config.geometry}
            ariaLabel={config.ariaLabel}
            hoveredId={hoverId}
            selectedId={shownId}
            onHoverChange={setHoverId}
            onSelect={select}
            unavailableLabel={L.unavailable.toLowerCase()}
          />
          <p className={`sw-status ${hovered ? "is-hover" : ""}`} aria-hidden="true">
            {hovered ? (
              <>
                <span className="sw-status-name">{hovered.title}</span>
                <span className="sw-status-state">{hovered.disabled ? (hovered.status ?? L.unavailable) : L.hoverHint}</span>
              </>
            ) : shown ? (
              <>
                <span className="sw-status-dot" />
                <span className="sw-status-name">{shown.title}</span>
                <span className="sw-status-state">{shown.disabled ? (shown.status ?? L.unavailable) : L.selected}</span>
              </>
            ) : (
              <span className="sw-status-hint">{L.hint}</span>
            )}
          </p>
          <p className="sw-visually-hidden" role="status" aria-live="polite">
            {announcement}
          </p>
        </div>

        <div className="sw-side">
          <section id={detailsId} className={`sw-details ${shown?.disabled ? "is-disabled" : ""}`} aria-label="Details">
            {shown ? (
              <>
                <header className="sw-details-head">
                  {(shown.icon || shown.iconUrl) && (
                    <span className="sw-details-icon" aria-hidden="true">
                      {shown.iconUrl ? (
                        <img src={shown.iconUrl} alt="" />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                          {shown.icon}
                        </svg>
                      )}
                    </span>
                  )}
                  <div className="sw-details-heading">
                    <span className="sw-details-no">
                      {pad(shownIndex + 1)} / {pad(segments.length)}
                      {(shown.disabled || shown.status) && (
                        <span className={`sw-badge ${shown.disabled ? "is-disabled" : ""}`}>
                          {shown.status ?? L.unavailable}
                        </span>
                      )}
                    </span>
                    <h3 className="sw-details-title">{shown.title}</h3>
                  </div>
                </header>

                {shown.summary && <p className="sw-details-summary">{shown.summary}</p>}

                {shown.meta && shown.meta.length > 0 && (
                  <dl className="sw-meta">
                    {shown.meta.map((m) => (
                      <div key={m.label}>
                        <dt>{m.label}</dt>
                        <dd>{m.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {shown.rating && <Rating rating={shown.rating} />}

                {shown.points && shown.points.length > 0 && (
                  <>
                    <h4 className="sw-details-sub">{L.keyPoints}</h4>
                    <ul className="sw-details-points">
                      {shown.points.map((point) => (
                        <li key={point}>
                          <svg viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                          </svg>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {shown.tags && shown.tags.length > 0 && (
                  <ul className="sw-tags" aria-label="Tags">
                    {shown.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="sw-details-empty">{L.emptyDetails}</p>
            )}

            {segments.length > 1 && (
              <nav className="sw-stepper" aria-label="Step through segments">
                <button type="button" className="sw-step" onClick={() => step(-1)}>
                  <span aria-hidden="true">←</span> {L.previous}
                </button>
                <span className="sw-dots" aria-hidden="true">
                  {segments.map((s) => (
                    <span key={s.id} className={s.id === shownId ? "is-on" : s.disabled ? "is-disabled" : ""} />
                  ))}
                </span>
                <button type="button" className="sw-step" onClick={() => step(1)}>
                  {L.next} <span aria-hidden="true">→</span>
                </button>
              </nav>
            )}
          </section>

          {showList && (
            <ol className="sw-list" aria-label={L.listTitle}>
              {segments.map((segment, index) => {
                const isHovered = segment.id === hoverId;
                const isSelected = segment.id === shownId;
                return (
                  <li key={segment.id}>
                    <button
                      type="button"
                      className={[
                        "sw-list-row",
                        isHovered && "is-hovered",
                        isSelected && "is-selected",
                        segment.disabled && "is-disabled",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-pressed={segment.disabled ? undefined : isSelected}
                      aria-disabled={segment.disabled || undefined}
                      aria-controls={detailsId}
                      onClick={() => select(segment)}
                      onMouseEnter={() => setHoverId(segment.id)}
                      onMouseLeave={() => setHoverId(null)}
                      onFocus={() => setHoverId(segment.id)}
                      onBlur={() => setHoverId(null)}
                    >
                      <span className="sw-list-no">{pad(index + 1)}</span>
                      <span className="sw-list-name">{segment.title}</span>
                      <span className="sw-list-state">
                        {segment.disabled ? (
                          (segment.status ?? L.unavailable)
                        ) : isSelected ? (
                          <svg viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                          </svg>
                        ) : (
                          <span aria-hidden="true">→</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
