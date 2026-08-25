/**
 * Bottom footer — current order (Ereignisverlauf is a separate bar).
 */
export default function CurrentRunBar({
  run = null,
  dataCurrent = null,
}) {
  const material =
    displayText(run?.material) ||
    displayText(run?.order_label) ||
    (run?.id != null ? `Lauf #${run.id}` : "—");
  const progress = asPct(run?.progress);
  const remaining =
    displayText(run?.remaining) ||
    displayText(run?.runtime) ||
    "—";

  return (
    <div className="oc-footer-bar">
      <div className="oc-footer-bar__inner">
        <div className="oc-footer-order">
          <span className="oc-footer-title">Aktueller Auftrag</span>
          <div className="oc-footer-field">
            <span className="oc-footer-field__label">Material</span>
            <span className="oc-footer-field__value">{material}</span>
          </div>
          <div className="oc-footer-field oc-footer-field--progress">
            <span className="oc-footer-field__label">Fortschritt</span>
            <div className="oc-footer-progress">
              <div
                className="oc-footer-progress__fill"
                style={{ width: `${progress ?? 0}%` }}
              />
            </div>
            <span className="oc-footer-field__value tabular-nums">
              {progress != null ? `${progress}%` : "—"}
            </span>
          </div>
          <div className="oc-footer-field">
            <span className="oc-footer-field__label">Restzeit</span>
            <span className="oc-footer-field__value tabular-nums">
              {remaining}
            </span>
          </div>
        </div>

        {dataCurrent ? (
          <span className="oc-footer-tick" title="Daten aktuell">
            {dataCurrent.toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function displayText(v) {
  if (v == null || v === "") return null;
  if (typeof v === "object") return null;
  return String(v);
}

function asPct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}
