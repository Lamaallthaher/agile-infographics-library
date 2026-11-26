import { useId, useState } from "react";
import { normalizeEcosystem, type EcosystemIssue, type EcosystemLimits, type EcosystemMapData } from "../renderer";

export interface EcosystemDataPanelProps {
  data: EcosystemMapData;
  limits: EcosystemLimits;
  onImport: (data: EcosystemMapData) => void;
}

/**
 * Export the content as JSON (to reuse it in code or another project) and
 * import JSON. Imported data is validated; errors block the import and
 * corrections are listed.
 */
export function EcosystemDataPanel({ data, limits, onImport }: EcosystemDataPanelProps) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string; issues: EcosystemIssue[] } | null>(null);
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  function apply() {
    let raw: unknown;
    try {
      raw = JSON.parse(draft);
    } catch (e) {
      setResult({ ok: false, message: `Not valid JSON: ${(e as Error).message}`, issues: [] });
      return;
    }
    const { data: next, issues } = normalizeEcosystem(raw, limits);
    if (!next) {
      setResult({ ok: false, message: "The data was not imported:", issues: issues.filter((i) => i.level === "error") });
      return;
    }
    onImport(next);
    const warnings = issues.filter((i) => i.level === "warning");
    setResult({
      ok: true,
      message: `Imported ${next.groups.length} groups${warnings.length ? ` with ${warnings.length} correction${warnings.length === 1 ? "" : "s"}:` : "."}`,
      issues: warnings,
    });
    setDraft("");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      (document.getElementById(`${id}-export`) as HTMLTextAreaElement | null)?.select();
    }
  }

  return (
    <details className="eme-data">
      <summary>Data (JSON import / export)</summary>
      <div className="eme-data-grid">
        <div className="eme-field">
          <label className="eme-field-label" htmlFor={`${id}-export`}>
            Current content
          </label>
          <textarea id={`${id}-export`} className="eme-code" readOnly rows={10} value={json} />
          <div className="eme-inline">
            <button type="button" className="eme-btn" onClick={copy}>
              {copied ? "Copied" : "Copy JSON"}
            </button>
          </div>
        </div>
        <div className="eme-field">
          <label className="eme-field-label" htmlFor={`${id}-import`}>
            Import (replaces the current content)
          </label>
          <textarea
            id={`${id}-import`}
            className="eme-code"
            rows={10}
            spellCheck={false}
            placeholder='{ "center": { "title": "…" }, "groups": [ … ] }'
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="eme-inline">
            <button type="button" className="eme-btn" data-action="import" onClick={apply} disabled={!draft.trim()}>
              Validate and import
            </button>
          </div>
        </div>
      </div>
      <div className={`eme-import-result ${result ? (result.ok ? "is-ok" : "is-error") : ""}`} role="status" aria-live="polite">
        {result && (
          <>
            <p>{result.message}</p>
            {result.issues.length > 0 && (
              <ul>
                {result.issues.slice(0, 12).map((i, n) => (
                  <li key={n}>
                    {i.path && <code>{i.path}</code>} {i.message}
                  </li>
                ))}
                {result.issues.length > 12 && <li>… and {result.issues.length - 12} more</li>}
              </ul>
            )}
          </>
        )}
      </div>
    </details>
  );
}
