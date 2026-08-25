import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import safeApi from "../../../api/safeApi";

const COMPANY_POLL_MS = 15000;

const FIELD_ORDER = [
  ["material", "Material"],
  ["customer", "Kundenauftrag"],
  ["tool", "Werkzeug / Form"],
  ["machine", "Maschine"],
  ["product", "Produkt"],
  ["batch", "Charge"],
  ["status", "Status"],
  ["target", "Sollmenge"],
  ["actual", "Istmenge"],
  ["progress", "Fortschritt %"],
  ["eta", "ETA"],
  ["elapsed", "Verstrichen (Min)"],
  ["started", "Gestartet"],
];

const SOURCE_STYLE = {
  LIVE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  DERIVED: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  MANUAL: "border-slate-500/30 bg-slate-500/10 text-slate-400",
};

const SOURCE_LABEL_DE = {
  LIVE: "Live",
  DERIVED: "Abgeleitet",
  MANUAL: "Manuell",
  RULE_BASED: "Regelbasiert",
  SIMULATED: "Demo",
};

const STATUS_DE = {
  RUNNING: "Läuft",
  COMPLETED: "Abgeschlossen",
  STOPPED: "Gestoppt",
  PAUSED: "Pausiert",
  CANCELLED: "Abgebrochen",
  FAILED: "Fehlgeschlagen",
  PLANNED: "Geplant",
};

const HINT_DE = {
  "material not set on run": "Material im Lauf nicht gesetzt",
  "customer order not set": "Kundenauftrag nicht gesetzt",
  "tool / mold not connected": "Werkzeug / Form nicht verbunden",
  "product not set": "Produkt nicht gesetzt",
  "batch not set": "Charge nicht gesetzt",
  "target qty not connected (erp/mes)": "Sollmenge nicht verbunden (ERP/MES)",
  "actual qty not connected": "Istmenge nicht verbunden",
  "progress needs target/actual or progress_pct":
    "Fortschritt benötigt Soll- und Istmenge.",
  "eta not connected — will not invent from ml":
    "ETA nicht verbunden",
  "not connected yet": "Noch nicht verbunden",
  "no production run found — create a run or connect mes/erp order data":
    "Kein Produktionslauf gefunden — Lauf anlegen oder MES/ERP-Auftragsdaten verbinden",
};

function localizeHint(hint) {
  if (!hint) return hint;
  return HINT_DE[String(hint).trim().toLowerCase()] || hint;
}

function localizeStatus(value) {
  if (value == null || value === "" || value === "—") return value ?? "—";
  const key = String(value).toUpperCase();
  return STATUS_DE[key] || value;
}

function localizeSource(src) {
  return SOURCE_LABEL_DE[src] || src;
}

function formatStarted(value) {
  if (!value || value === "—") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function displayCell(key, cell) {
  if (!cell?.available) return "—";
  if (key === "status") return localizeStatus(cell.display ?? cell.value);
  if (key === "started") return formatStarted(cell.display ?? cell.value);
  if (key === "progress") return `${cell.display}%`;
  return cell.display ?? "—";
}

/**
 * Module 8 — Current Order cockpit (production-ready, non-AI).
 * Uses GET /production-run/order-board
 */
export default function CurrentOrderPage() {
  const [searchParams] = useSearchParams();
  const runId = searchParams.get("runId");
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = runId
        ? `/production-run/order-board?run_id=${encodeURIComponent(runId)}`
        : "/production-run/order-board";
      const res = await safeApi.get(q);
      if (res?.fallback || !res?.data) {
        setError(res?.error || "Auftragsübersicht nicht verfügbar");
        setBoard(null);
      } else {
        setBoard(res.data);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Laden fehlgeschlagen");
      setBoard(null);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    load();
    const id = setInterval(load, COMPANY_POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const fields = board?.fields || {};
  const run = board?.run;

  return (
    <div className="oc-skin min-h-[calc(100vh-5rem)] px-3 sm:px-4 pb-8 text-slate-100">
      <header className="mb-5 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/90">
              ZITTA · Modul 8
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-50">
              Aktueller Auftrag
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Material · Kunde · Werkzeug · Maschine · Soll/Ist · Fortschritt · ETA
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              ← Betriebszentrale
            </Link>
            {run?.id ? (
              <Link
                to={`/production-run/detail?runId=${run.id}`}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
              >
                Analystenansicht
              </Link>
            ) : null}
            <Link
              to="/historical-runs"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              Historie
            </Link>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Aktualisieren
            </button>
          </div>
        </div>
        {error ? <p className="mt-3 text-xs text-amber-200">{error}</p> : null}
      </header>

      {board?.empty || !run ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#141820] px-4 py-10 text-center">
          <p className="text-sm text-slate-300">
            {localizeHint(board?.message) || "Kein aktiver Produktionslauf"}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Erstellen Sie einen Lauf über die Seitenleiste oder verbinden Sie MES/ERP-Auftragsfelder.
          </p>
          <Link
            to="/production-run/detail?create=1"
            className="mt-4 inline-block text-xs text-emerald-300 underline"
          >
            Formular zum Anlegen öffnen
          </Link>
        </div>
      ) : (
        <>
          <section className="mb-4 rounded-2xl border border-emerald-500/20 bg-[#141820] p-4 sm:p-5">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500">
                Lauf #{run.id}
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-50">
                {fields.product?.display || "—"} ·{" "}
                {fields.machine?.display || board.machine_name || "—"}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Status:{" "}
                <span className="text-emerald-300">
                  {localizeStatus(fields.status?.display || fields.status?.value || "—")}
                </span>
                {fields.elapsed?.available
                  ? ` · ${fields.elapsed.display} Min. verstrichen`
                  : ""}
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {FIELD_ORDER.map(([key, label]) => {
              const cell = fields[key] || {};
              const src = cell.value_source || "MANUAL";
              return (
                <div
                  key={key}
                  className="rounded-2xl border border-white/10 bg-[#141820] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">
                      {label}
                    </p>
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10px] ${
                        SOURCE_STYLE[src] || SOURCE_STYLE.MANUAL
                      }`}
                    >
                      {localizeSource(src)}
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-semibold text-slate-50">
                    {displayCell(key, cell)}
                  </p>
                  {!cell.available && cell.hint ? (
                    <p className="mt-1 text-[11px] text-slate-500">
                      {localizeHint(cell.hint)}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
