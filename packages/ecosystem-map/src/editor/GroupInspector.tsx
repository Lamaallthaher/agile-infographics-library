import { useEffect, useId, useState } from "react";
import { IconPicker } from "@agile-infographics/core";
import {
  isSafeHref,
  type ConnectionDirection,
  type EcosystemConnection,
  type EcosystemGroup,
  type EcosystemItem,
  type EcosystemLimits,
  type GroupSide,
} from "../renderer";
import { Segmented } from "./AppearancePanel";
import type { useEcosystemMap } from "./useEcosystemMap";

type Actions = ReturnType<typeof useEcosystemMap>["actions"];
type Toward = "none" | "group" | "center" | "both";

/** Arrow direction expressed relative to the group, whichever end is the connection's source. */
function towardOf(c: EcosystemConnection, centerId: string): Toward {
  if (c.direction === "none" || c.direction === "both") return c.direction;
  const pointsAtTarget = c.direction === "forward";
  return pointsAtTarget === (c.source === centerId) ? "group" : "center";
}

function directionFor(toward: Toward, c: EcosystemConnection, centerId: string): ConnectionDirection {
  if (toward === "none" || toward === "both") return toward;
  const sourceIsCenter = c.source === centerId;
  return (toward === "group") === sourceIsCenter ? "forward" : "backward";
}

/** A text input that commits on every keystroke but validates links before saving them. */
function LinkField({ value, max, onCommit }: { value: string; max: number; onCommit: (v: string) => void }) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const invalid = draft.trim() !== "" && !isSafeHref(draft);
  return (
    <div className="eme-field">
      <label className="eme-field-label" htmlFor={id}>
        Link (optional)
      </label>
      <input
        id={id}
        className={`eme-input ${invalid ? "is-invalid" : ""}`}
        type="url"
        inputMode="url"
        maxLength={max}
        placeholder="https://…"
        value={draft}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-err` : undefined}
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          if (!v.trim()) onCommit("");
          else if (isSafeHref(v)) onCommit(v.trim());
        }}
      />
      {invalid && (
        <p id={`${id}-err`} className="te-hint te-hint-error">
          Use an https://, http:// or mailto: link, a /path or a #anchor.
        </p>
      )}
    </div>
  );
}

export interface GroupInspectorProps {
  group: EcosystemGroup;
  index: number;
  count: number;
  connection: EcosystemConnection;
  centerId: string;
  /** The selected item of this group, if any. */
  item: EcosystemItem | null;
  /** The colour the group currently uses (custom or from the theme). */
  currentColor: string;
  limits: EcosystemLimits;
  actions: Actions;
}

/** Structured settings of the selected group, its connection and its selected item. */
export function GroupInspector({ group: g, index, count, connection: c, centerId, item, currentColor, limits, actions }: GroupInspectorProps) {
  const id = useId();
  const L = limits.maxLength;
  return (
    <section className="eme-inspector" aria-labelledby={`${id}-h`} data-inspector={g.id}>
      <div className="eme-panel-head">
        <h3 id={`${id}-h`}>
          Selected group: <span className="eme-inspector-name">{g.title || "Untitled"}</span>
        </h3>
        <span className="eme-muted">
          Group {index + 1} of {count}
        </span>
      </div>

      <div className="eme-grid">
        <Segmented<GroupSide>
          label="Position (wide layout)"
          value={g.side}
          options={[
            { value: "auto", label: "Automatic" },
            { value: "top", label: "Top" },
            { value: "right", label: "Right" },
            { value: "bottom", label: "Bottom" },
            { value: "left", label: "Left" },
          ]}
          onChange={(side) => actions.updateGroup(g.id, { side })}
        />

        <div className="eme-field">
          <span className="eme-field-label">Group colour</span>
          <div className="eme-inline">
            <label className="eme-color" title="Group colour">
              <span className="eme-color-swatch" style={{ background: currentColor }} />
              <input type="color" aria-label="Group colour" value={currentColor} onChange={(e) => actions.updateGroup(g.id, { color: e.target.value })} />
            </label>
            {g.color ? (
              <button type="button" className="te-link" onClick={() => actions.updateGroup(g.id, { color: null })}>
                Theme colour
              </button>
            ) : (
              <span className="eme-auto">theme colour</span>
            )}
          </div>
        </div>

        <div className="eme-field">
          <span className="eme-field-label">Visibility and icon</span>
          <label className="eme-check">
            <input type="checkbox" checked={!g.hidden} onChange={(e) => actions.updateGroup(g.id, { hidden: !e.target.checked })} />
            Show in display mode
          </label>
          <label className="eme-check">
            <input type="checkbox" checked={g.icon !== null} onChange={(e) => actions.updateGroup(g.id, { icon: e.target.checked ? "network" : null })} />
            Show group icon
          </label>
        </div>
      </div>

      <fieldset className="eme-fieldset">
        <legend>Connection to the centre</legend>
        <div className="eme-grid">
          <div className="eme-field">
            <span className="eme-field-label">Connector</span>
            <label className="eme-check">
              <input type="checkbox" checked={c.visible} onChange={(e) => actions.updateConnection(g.id, { visible: e.target.checked })} />
              Show connector
            </label>
          </div>
          <Segmented
            label="Line style"
            value={c.style}
            options={[
              { value: "solid", label: "Solid" },
              { value: "dashed", label: "Dashed" },
              { value: "dotted", label: "Dotted" },
            ]}
            onChange={(style) => actions.updateConnection(g.id, { style })}
          />
          <Segmented<Toward>
            label="Arrows"
            value={towardOf(c, centerId)}
            options={[
              { value: "none", label: "None" },
              { value: "group", label: "To group" },
              { value: "center", label: "To centre" },
              { value: "both", label: "Both ways" },
            ]}
            onChange={(t) => actions.updateConnection(g.id, { direction: directionFor(t, c, centerId) })}
          />
          <div className="eme-field">
            <label className="eme-field-label" htmlFor={`${id}-label`}>
              Connector label (optional)
            </label>
            <input
              id={`${id}-label`}
              className="eme-input"
              type="text"
              maxLength={L.connectionLabel}
              placeholder="For example: Reports to"
              value={c.label}
              onChange={(e) => actions.updateConnection(g.id, { label: e.target.value })}
            />
          </div>
        </div>
      </fieldset>

      {item ? (
        <fieldset className="eme-fieldset" data-item-inspector={item.id}>
          <legend>
            Selected item: <span className="eme-inspector-name">{item.label || "Untitled item"}</span>
          </legend>
          <div className="eme-grid">
            <LinkField key={item.id} value={item.href} max={L.itemHref} onCommit={(href) => actions.updateItem(g.id, item.id, { href })} />
            <div className="eme-field">
              <label className="eme-field-label" htmlFor={`${id}-tag`}>
                Tag (optional)
              </label>
              <input
                id={`${id}-tag`}
                className="eme-input"
                type="text"
                maxLength={L.itemTag}
                placeholder="For example: Weekly"
                value={item.tag}
                onChange={(e) => actions.updateItem(g.id, item.id, { tag: e.target.value })}
              />
            </div>
            <div className="eme-field">
              <span className="eme-field-label">Item icon</span>
              <div className="eme-inline">
                <span className={`eme-item-icon-wrap ${item.icon ? "" : "is-empty"}`}>
                  <IconPicker
                    value={item.icon ?? "target"}
                    componentName={`item ${item.label || "Untitled"}`}
                    buttonClassName="eme-icon-button"
                    badge={false}
                    onChange={(icon) => actions.updateItem(g.id, item.id, { icon })}
                  />
                </span>
                {item.icon ? (
                  <button type="button" className="te-link" onClick={() => actions.updateItem(g.id, item.id, { icon: null })}>
                    No icon
                  </button>
                ) : (
                  <span className="eme-auto">none (a dot is shown)</span>
                )}
              </div>
            </div>
          </div>
          <p className="te-hint">The item's label and detail are edited directly on the map.</p>
        </fieldset>
      ) : (
        <p className="te-hint">Click an item in this group to add a link, a tag or an icon.</p>
      )}
    </section>
  );
}
