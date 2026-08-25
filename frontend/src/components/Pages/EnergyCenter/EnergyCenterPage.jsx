import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import safeApi from "../../../api/safeApi";
import ProvenanceBadge from "../OperationsCenter/components/ProvenanceBadge";

const COMPANY_ID = "default";
const TABS = [
  ["overview", "Übersicht"],
  ["machines", "Nach Maschine"],
  ["materials", "Nach Material"],
  ["readings", "Messwerte"],
  ["settings", "Einstellungen"],
];

const inputClass =
  "w-full rounded-lg border border-white/10 bg-[#0f1218] px-3 py-2 text-sm text-slate-100";

function fmt(v, digits = 2) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return Number(v).toLocaleString("de-DE", {
    maximumFractionDigits: digits,
  });
}

function money(v, currency = "EUR") {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  const symbol = currency === "EUR" ? "€" : `${currency} `;
  return `${symbol}${fmt(v, 2)}`;
}

/**
 * Module 19 — Energy Center (production-ready).
 * Consumption, cost, per machine/material, CO₂, savings potential.
 * Never invents CO₂ or savings — requires configured factors / baseline.
 */
export default function EnergyCenterPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const setTab = (next) => {
    const p = new URLSearchParams(searchParams);
    p.set("tab", next);
    setSearchParams(p, { replace: true });
  };

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settingsForm, setSettingsForm] = useState({
    co2_kg_per_kwh: "",
    euro_per_kwh: "",
    baseline_period_kwh: "",
    currency: "EUR",
  });

  const load = useCallback(async ({ soft = false } = {}) => {
    if (!soft) setLoading(true);
    setError(null);
    try {
      const res = await safeApi.get(
        `/energy-center/overview?company_id=${COMPANY_ID}`
      );
      if (res?.fallback) {
        setError(res.error || "Energiezentrum konnte nicht geladen werden");
        if (!soft) setData(null);
      } else {
        const payload = res?.data || null;
        setData(payload);
        const s = payload?.settings || {};
        setSettingsForm({
          co2_kg_per_kwh:
            s.co2_kg_per_kwh != null ? String(s.co2_kg_per_kwh) : "",
          euro_per_kwh: s.euro_per_kwh != null ? String(s.euro_per_kwh) : "",
          baseline_period_kwh:
            s.baseline_period_kwh != null ? String(s.baseline_period_kwh) : "",
          currency: s.currency || "EUR",
        });
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

  const saveSettings = useMutation({
    mutationFn: (body) => safeApi.put("/energy-center/settings", body),
    onSuccess: async (res) => {
      if (res?.fallback) {
        toast.error(res.error || "Speichern fehlgeschlagen");
        return;
      }
      toast.success("Energieeinstellungen gespeichert");
      await load({ soft: true });
    },
    onError: (err) =>
      toast.error(err?.response?.data?.detail || err?.message || "Speichern fehlgeschlagen"),
  });

  const kpis = data?.kpis || {};
  const savings = data?.savings_potential || {};
  const currency = kpis.currency || "EUR";

  const parseOpt = (raw) => {
    const s = String(raw ?? "").trim();
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  return (
    <div className="oc-skin min-h-[calc(100vh-5rem)] px-3 sm:px-4 pb-8 text-slate-100">
      <header className="mb-5 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/90">
              ZITTA · Modul 19
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-50">
              Energiezentrum
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Verbrauch, Kosten, nach Maschine / Material, CO₂ und Einsparpotenzial.
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
              to="/energy-history"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              Klassische Historie
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

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          ["kWh", fmt(kpis.kwh, 1), kpis.kwh_source || "LIVE"],
          ["Kosten", money(kpis.cost, currency), kpis.cost_source || "—"],
          ["CO₂ (kg)", fmt(kpis.co2_kg, 1), kpis.co2_source || "—"],
          [
            "Einsparung kWh",
            savings.available ? fmt(savings.savings_kwh, 1) : "—",
            savings.available ? "DERIVED" : "—",
          ],
          ["Messwerte", kpis.readings ?? 0, "LIVE"],
        ].map(([label, value, source]) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-[#141820] px-3 py-2"
          >
            <div className="flex items-center justify-between gap-1">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                {label}
              </p>
              {source && source !== "—" ? (
                <ProvenanceBadge source={source === "MIXED" ? "DERIVED" : source} />
              ) : null}
            </div>
            <p className="mt-1 text-lg font-semibold text-emerald-300">{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-1">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-xl px-3 py-1.5 text-xs ${
              tab === id
                ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/40"
                : "text-slate-400 hover:bg-white/5"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <p className="py-10 text-center text-sm text-slate-500">Wird geladen…</p>
      ) : null}

      {tab === "overview" && data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-[#141820] p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">
              Einsparpotenzial
            </h2>
            {savings.available ? (
              <div className="space-y-2 text-sm">
                <p className="text-slate-400">
                  Basislinienzeitraum:{" "}
                  <span className="text-slate-200">
                    {fmt(savings.baseline_kwh, 1)} kWh
                  </span>
                </p>
                <p className="text-slate-400">
                  Ist (importiert):{" "}
                  <span className="text-slate-200">
                    {fmt(savings.actual_kwh, 1)} kWh
                  </span>
                </p>
                <p className="text-2xl font-semibold text-emerald-300">
                  {fmt(savings.savings_kwh, 1)} kWh
                </p>
                <p className="text-slate-400">
                  Kosteneinsparung: {money(savings.savings_cost, currency)}
                </p>
                <ProvenanceBadge source="DERIVED" />
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                {savings.hint ||
                  "Legen Sie unter Einstellungen einen Basislinienzeitraum in kWh fest, um Einsparungen zu berechnen."}
              </p>
            )}
          </section>
          <section className="rounded-2xl border border-white/10 bg-[#141820] p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">
              Konfigurationsstatus
            </h2>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                Netz-CO₂-Faktor:{" "}
                <span className="text-slate-200">
                  {data.settings?.co2_configured
                    ? `${fmt(data.settings.co2_kg_per_kwh, 3)} kg/kWh`
                    : "— (CO₂ bleibt leer)"}
                </span>
              </li>
              <li>
                Tarif:{" "}
                <span className="text-slate-200">
                  {data.settings?.tariff_configured
                    ? `${money(data.settings.euro_per_kwh, currency)}/kWh`
                    : "— (Differenzkosten nicht abgeleitet)"}
                </span>
              </li>
              <li>
                Basislinie:{" "}
                <span className="text-slate-200">
                  {data.settings?.baseline_configured
                    ? `${fmt(data.settings.baseline_period_kwh, 1)} kWh`
                    : "—"}
                </span>
              </li>
            </ul>
          </section>
        </div>
      ) : null}

      {tab === "machines" && data ? (
        <BreakdownTable
          title="Verbrauch nach Maschine"
          rows={data.by_machine || []}
          currency={currency}
          empty="Keine maschinenbezogenen Energiemesswerte"
        />
      ) : null}

      {tab === "materials" && data ? (
        <BreakdownTable
          title="Verbrauch nach Material"
          rows={data.by_material || []}
          currency={currency}
          empty="Keine Materialschlüssel bei Energieimporten (material_batch / material_id)"
        />
      ) : null}

      {tab === "readings" && data ? (
        <section className="rounded-2xl border border-white/10 bg-[#141820] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Aktuelle Messwerte
            </h2>
            <ProvenanceBadge source="LIVE" />
          </div>
          {(data.readings || []).length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Keine importierten Energiemesswerte — energy_data im Setup-Assistenten verbinden
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="py-2 text-left">Wann</th>
                    <th className="py-2 text-left">Maschine</th>
                    <th className="py-2 text-left">Material</th>
                    <th className="py-2 text-right">kWh</th>
                    <th className="py-2 text-right">Kosten</th>
                  </tr>
                </thead>
                <tbody>
                  {data.readings.map((r) => (
                    <tr key={r.id} className="border-b border-white/5">
                      <td className="py-2 text-slate-400">
                        {r.event_at || r.created_at || "—"}
                      </td>
                      <td className="py-2 text-slate-200">
                        {r.machine_id || "—"}
                      </td>
                      <td className="py-2 text-slate-300">
                        {r.material || "—"}
                      </td>
                      <td className="py-2 text-right tabular-nums text-emerald-300">
                        {fmt(r.kwh, 2)}
                      </td>
                      <td className="py-2 text-right tabular-nums text-slate-300">
                        {money(r.cost, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {tab === "settings" ? (
        <section className="max-w-xl rounded-2xl border border-white/10 bg-[#141820] p-4">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-slate-300">
            Energiefaktoren
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            Felder leer lassen, damit CO₂ / Differenzkosten / Einsparungen als — bleiben.
            Nur manuelle Herkunft.
          </p>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              saveSettings.mutate({
                company_id: COMPANY_ID,
                co2_kg_per_kwh: parseOpt(settingsForm.co2_kg_per_kwh),
                euro_per_kwh: parseOpt(settingsForm.euro_per_kwh),
                baseline_period_kwh: parseOpt(settingsForm.baseline_period_kwh),
                currency: settingsForm.currency || "EUR",
              });
            }}
          >
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                CO₂-Faktor (kg / kWh)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                className={inputClass}
                value={settingsForm.co2_kg_per_kwh}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    co2_kg_per_kwh: e.target.value,
                  })
                }
                placeholder="z. B. 0.366"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Tarif (€ / kWh)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                className={inputClass}
                value={settingsForm.euro_per_kwh}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    euro_per_kwh: e.target.value,
                  })
                }
                placeholder="z. B. 0.22"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Basislinienzeitraum (kWh)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                className={inputClass}
                value={settingsForm.baseline_period_kwh}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    baseline_period_kwh: e.target.value,
                  })
                }
                placeholder="Referenzverbrauch für Einsparungen"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Währung</label>
              <input
                className={inputClass}
                value={settingsForm.currency}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    currency: e.target.value,
                  })
                }
              />
            </div>
            <button
              type="submit"
              disabled={saveSettings.isPending}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {saveSettings.isPending ? "Wird gespeichert…" : "Einstellungen speichern"}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}

function BreakdownTable({ title, rows, currency, empty }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#141820] p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="py-2 text-left">Name</th>
                <th className="py-2 text-right">Messwerte</th>
                <th className="py-2 text-right">kWh</th>
                <th className="py-2 text-right">Kosten</th>
                <th className="py-2 text-right">CO₂ kg</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-white/5">
                  <td className="py-2 text-slate-200">{r.label}</td>
                  <td className="py-2 text-right text-slate-400">{r.readings}</td>
                  <td className="py-2 text-right tabular-nums text-emerald-300">
                    {fmt(r.kwh, 2)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-slate-300">
                    {money(r.cost, currency)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-slate-300">
                    {fmt(r.co2_kg, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
