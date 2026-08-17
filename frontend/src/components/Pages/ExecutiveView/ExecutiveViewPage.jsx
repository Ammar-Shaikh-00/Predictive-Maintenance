import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import safeApi from "../../../api/safeApi";
import ProvenanceBadge from "../OperationsCenter/components/ProvenanceBadge";

const COMPANY_ID = "default";
const POLL_MS = 30000;

const PLANT_STATUS_DE = {
  PRODUCTION: "PRODUKTION",
  READY: "BEREIT",
  HEATING: "AUFHEIZEN",
  COOLING: "ABKÜHLEN",
  FAULT: "STÖRUNG",
  STOPPED: "GESTOPPT",
  UNKNOWN: "UNBEKANNT",
};

const KIND_DE = {
  alarm: "Alarm",
  ticket: "Ticket",
};

const SEVERITY_DE = {
  critical: "Kritisch",
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
  warning: "Warnung",
};

/** Frontend DE labels — always win over stale English API payloads. */
const KPI_LABEL_DE = {
  produced_today: "Heute produziert",
  utilization: "Auslastung",
  scrap: "Ausschuss heute",
  availability: "Verfügbarkeit",
  energy: "Energie",
  downtime: "Stillstand",
};

const KPI_HINT_DE = {
  produced_today: "Keine Ist-Menge aus Produktionslauf für heute",
  utilization:
    "Erfordert Schichtkalender / Laufzeithistorie — wird nicht aus einem einzelnen Anlagenstatus erfunden.",
  scrap: "Keine Qualitäts-Ausschussimporte für heute",
  availability:
    "Erfordert Schichtkalender / Laufzeithistorie — wird nicht aus einem einzelnen Anlagenstatus erfunden.",
  energy: "Energiedaten verbinden / Messwerte importieren",
  downtime: "Erfordert Stillstands-Ereignishistorie — wird nicht erfunden.",
};

const UNIT_DE = {
  pcs: "Stk",
  Stk: "Stk",
};

const TEXT_DE = {
  "produced today": "Heute produziert",
  utilization: "Auslastung",
  "scrap today": "Ausschuss heute",
  availability: "Verfügbarkeit",
  energy: "Energie",
  downtime: "Stillstand",
  "prediction readiness": "Vorhersagebereitschaft",
  "roi of ai": "ROI der KI",
  "energy vs baseline period": "Energie vs. Basislinienzeitraum",
  "no production run actual qty for today":
    "Keine Ist-Menge aus Produktionslauf für heute",
  "needs shift calendar / runtime history — not invented from a single plant state.":
    "Erfordert Schichtkalender / Laufzeithistorie — wird nicht aus einem einzelnen Anlagenstatus erfunden.",
  "no quality scrap imports for today":
    "Keine Qualitäts-Ausschussimporte für heute",
  "connect energy_data / import readings":
    "Energiedaten verbinden / Messwerte importieren",
  "needs downtime event history — not invented.":
    "Erfordert Stillstands-Ereignishistorie — wird nicht erfunden.",
  "not model accuracy — readiness from connected sources.":
    "Keine Modellgenauigkeit — Bereitschaft aus verbundenen Quellen.",
  "shown only after validated model outcomes and cost baseline — never invented.":
    "Nur nach validierten Modellergebnissen und Kostenbasislinie — wird nie erfunden.",
};

function localizeText(text) {
  if (text == null || text === "") return text;
  const mapped = TEXT_DE[String(text).trim().toLowerCase()];
  return mapped || text;
}

function kpiLabel(kpi) {
  return KPI_LABEL_DE[kpi?.key] || localizeText(kpi?.label) || kpi?.label || "—";
}

function kpiHint(kpi) {
  if (KPI_HINT_DE[kpi?.key]) return KPI_HINT_DE[kpi.key];
  return localizeText(kpi?.hint);
}

function kpiUnit(kpi) {
  const unit = kpi?.unit || "";
  return UNIT_DE[unit] || unit;
}

function fmt(v, digits = 1) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return Number(v).toLocaleString("de-DE", { maximumFractionDigits: digits });
}

function money(v, currency = "EUR") {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  const symbol = currency === "EUR" ? "€" : `${currency} `;
  return `${symbol}${fmt(v, 2)}`;
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PRODUCTION") return "text-emerald-300";
  if (s === "FAULT") return "text-rose-300";
  if (s === "HEATING" || s === "COOLING" || s === "READY") return "text-amber-300";
  return "text-slate-400";
}

function plantStatusLabel(status) {
  const key = String(status || "").toUpperCase();
  return PLANT_STATUS_DE[key] || status || "—";
}

function kindLabel(kind) {
  const key = String(kind || "").toLowerCase();
  return KIND_DE[key] || kind || "";
}

function severityLabel(severity) {
  if (!severity) return "";
  const key = String(severity).toLowerCase();
  return SEVERITY_DE[key] || severity;
}

/**
 * Modul 20 — Management-Ansicht (produktionsreif).
 * High-level KPIs. Erfindet nie ROI / Genauigkeit / Auslastung %.
 */
export default function ExecutiveViewPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async ({ soft = false } = {}) => {
    if (!soft) setLoading(true);
    setError(null);
    try {
      const res = await safeApi.get(
        `/executive-view/overview?company_id=${COMPANY_ID}`
      );
      if (res?.fallback) {
        setError(res.error || "Management-Ansicht konnte nicht geladen werden");
        if (!soft) setData(null);
      } else {
        setData(res?.data || null);
      }
    } catch (err) {
      setError(err?.message || "Laden fehlgeschlagen");
      if (!soft) setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load({ soft: false });
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => load({ soft: true }), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const progress = data?.progress || {};
  const aiBenefit = data?.ai_benefit || {};
  const aiRoi = data?.ai_roi || {};
  const currency = data?.energy_cost?.currency || "EUR";

  return (
    <div className="oc-skin min-h-[calc(100vh-5rem)] px-3 sm:px-4 pb-8 text-slate-100">
      <header className="mb-5 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/90">
              ZITTA · Modul 20
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-50">
              Management-Ansicht
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              High-Level-KPIs für das Management — produziert, Ausschuss, Energie,
              Probleme, Bereitschaft. Kein erfundener ROI oder Genauigkeitswert.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              ← Betriebszentrale
            </Link>
            <Link
              to="/energy"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              Energie
            </Link>
            <button
              type="button"
              onClick={() => load({ soft: true })}
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

      {loading && !data ? (
        <p className="py-10 text-center text-sm text-slate-500">Wird geladen…</p>
      ) : null}

      {data ? (
        <>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-white/10 bg-[#141820] px-4 py-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Anlagenstatus · {data.as_of_day}
              </p>
              <p
                className={`mt-1 text-2xl font-semibold tracking-tight ${statusTone(
                  data.plant_status
                )}`}
              >
                {plantStatusLabel(data.plant_status)}
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-slate-400">
              <span>
                Maschinen{" "}
                <strong className="text-slate-200">
                  {progress.connected_machines ?? 0}/{progress.total_machines ?? 0}
                </strong>
              </span>
              <span>
                Alarme{" "}
                <strong className="text-amber-300">{progress.open_alarms ?? 0}</strong>
              </span>
              <span>
                Tickets{" "}
                <strong className="text-sky-300">{progress.open_tickets ?? 0}</strong>
              </span>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {(data.kpis || []).map((k) => (
              <div
                key={k.key}
                className="rounded-xl border border-white/10 bg-[#141820] px-3 py-3"
              >
                <div className="mb-1 flex items-center justify-between gap-1">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    {kpiLabel(k)}
                  </p>
                  {k.available ? (
                    <ProvenanceBadge source={k.value_source} />
                  ) : null}
                </div>
                <p className="text-xl font-semibold text-emerald-300">
                  {k.available ? (
                    <>
                      {fmt(k.value, k.unit === "%" ? 0 : 1)}
                      {kpiUnit(k) ? (
                        <span className="ml-1 text-sm font-normal text-slate-500">
                          {kpiUnit(k)}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    "—"
                  )}
                </p>
                {!k.available && kpiHint(k) ? (
                  <p className="mt-1 text-[10px] leading-snug text-slate-600">
                    {kpiHint(k)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            {[
              ["Digitalisierung", progress.digitalization_progress, "DERIVED"],
              ["Vorhersagebereitschaft", progress.prediction_readiness, "DERIVED"],
              ["Datenqualität", progress.data_quality_score, "DERIVED"],
            ].map(([label, value, source]) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-[#141820] px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    {label}
                  </p>
                  <ProvenanceBadge source={source} />
                </div>
                <p className="mt-1 text-lg font-semibold text-slate-100">
                  {value != null ? `${fmt(value, 0)}%` : "—"}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-[#141820] p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">
                Top-Probleme
              </h2>
              {(data.top_problems || []).length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  Keine offenen Alarme oder kritischen Tickets
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.top_problems.map((p) => (
                    <li
                      key={`${p.kind}-${p.id}`}
                      className="rounded-xl border border-white/5 px-3 py-2"
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <ProvenanceBadge source={p.value_source || "LIVE"} />
                        <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] uppercase text-slate-400">
                          {kindLabel(p.kind)}
                          {p.severity ? ` · ${severityLabel(p.severity)}` : ""}
                        </span>
                      </div>
                      <p className="text-sm text-slate-200">{p.text}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex gap-2 text-xs">
                <Link to="/ticket" className="text-emerald-300 hover:underline">
                  Tickets →
                </Link>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#141820] p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">
                Top-Einsparungen
              </h2>
              {(data.top_savings || []).length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  Legen Sie unter Energiezentrum → Einstellungen eine
                  Energie-Basislinie fest, um Einsparpotenzial anzuzeigen.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.top_savings.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-xl border border-white/5 px-3 py-3"
                    >
                      <div className="mb-1">
                        <ProvenanceBadge source={s.value_source || "DERIVED"} />
                      </div>
                      <p className="text-sm text-slate-200">
                        {localizeText(s.title)}
                      </p>
                      <p className="mt-1 text-xl font-semibold text-emerald-300">
                        {fmt(s.value, 1)} {s.unit}
                      </p>
                      <p className="text-xs text-slate-500">
                        Kosten: {money(s.cost, s.currency || currency)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                to="/energy?tab=settings"
                className="mt-3 inline-block text-xs text-emerald-300 hover:underline"
              >
                Energieeinstellungen →
              </Link>
            </section>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-[#141820] p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  KI-Nutzen
                </h2>
                {aiBenefit.available ? (
                  <ProvenanceBadge source={aiBenefit.value_source || "DERIVED"} />
                ) : null}
              </div>
              <p className="text-xs text-slate-500">
                {localizeText(aiBenefit.label) || "Vorhersagebereitschaft"}
              </p>
              <p className="mt-1 text-3xl font-semibold text-emerald-300">
                {aiBenefit.available ? `${fmt(aiBenefit.value, 0)}%` : "—"}
              </p>
              <p className="mt-2 text-[11px] text-slate-600">
                {localizeText(aiBenefit.hint)}
              </p>
            </section>

            <section className="rounded-2xl border border-dashed border-white/10 bg-[#141820] p-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
                {localizeText(aiRoi.label) || "ROI der KI"}
              </h2>
              <p className="text-3xl font-semibold text-slate-500">—</p>
              <p className="mt-2 text-[11px] text-slate-600">
                {localizeText(aiRoi.hint)}
              </p>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
