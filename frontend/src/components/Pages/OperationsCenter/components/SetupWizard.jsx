import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import safeApi from "../../../../api/safeApi";
import { sourceLabel } from "../../../../utils/capabilityEngine";

const COMPANY_ID = "default";

const SOURCE_TYPES = [
  { id: "csv", label: "CSV" },
  { id: "sql", label: "SQL" },
  { id: "api", label: "API" },
  { id: "excel", label: "Excel (CSV-Export)" },
  { id: "manual", label: "CSV manuell einfügen" },
  { id: "lab", label: "Labor-Export (CSV)" },
];

const FIELD_TEMPLATES = {
  quality_data: [
    ["production_run", "run_id"],
    ["machine_id", "machine_id"],
    ["timestamp", "measured_at"],
    ["material_batch", "batch_id"],
    ["quality_value", "qc_score"],
    ["approval_status", "status"],
    ["scrap", "scrap_kg"],
  ],
  maintenance_history: [
    ["machine_id", "machine_id"],
    ["timestamp", "service_date"],
    ["work_order", "wo_number"],
    ["component", "part_name"],
    ["action", "action_type"],
    ["technician", "tech_name"],
  ],
  material_batches: [
    ["material_id", "material_code"],
    ["material_batch", "batch_id"],
    ["timestamp", "received_at"],
    ["supplier", "supplier_name"],
    ["lot_quality", "incoming_qc"],
  ],
  energy_data: [
    ["machine_id", "machine_id"],
    ["timestamp", "reading_at"],
    ["kwh", "energy_kwh"],
    ["cost", "cost_eur"],
  ],
  default: [
    ["timestamp", "timestamp"],
    ["machine_id", "machine_id"],
    ["value", "value"],
    ["status", "status"],
  ],
};

const STEPS = [
  { id: 1, title: "Quelle wählen" },
  { id: 2, title: "Felder zuordnen" },
  { id: 3, title: "Vorschau" },
  { id: 4, title: "Datenqualität" },
  { id: 5, title: "Historie importieren" },
  { id: 6, title: "Aktivieren" },
];

function wizardError(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d?.msg || String(d)).join("; ");
  }
  return err?.message || fallback;
}

function defaultMapping(sourceKey) {
  const pairs = FIELD_TEMPLATES[sourceKey] || FIELD_TEMPLATES.default;
  return Object.fromEntries(pairs);
}

function emptyConnection(sourceType) {
  if (sourceType === "sql") {
    return {
      use_saved_mssql: true,
      query: "SELECT TOP 200 * FROM Tab_Actual ORDER BY TrendDate DESC",
      table: "Tab_Actual",
    };
  }
  if (sourceType === "api") {
    return {
      url: "",
      method: "GET",
      json_path: "data",
      headers: {},
    };
  }
  return { csv_text: "", delimiter: "," };
}

/**
 * Multi-step data-source setup wizard with real CSV / SQL / API connectors.
 */
export default function SetupWizard({
  open,
  sourceKey,
  onClose,
  onCompleted,
  backendAvailable = true,
}) {
  const [step, setStep] = useState(1);
  const [sourceType, setSourceType] = useState("csv");
  const [connection, setConnection] = useState(() => emptyConnection("csv"));
  const [uploadName, setUploadName] = useState(null);
  const [fieldMapping, setFieldMapping] = useState({});
  const [historyDays, setHistoryDays] = useState(30);
  const [preview, setPreview] = useState(null);
  const [quality, setQuality] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [doneSummary, setDoneSummary] = useState(null);

  useEffect(() => {
    if (!open || !sourceKey) return;
    setStep(1);
    setSourceType("csv");
    setConnection(emptyConnection("csv"));
    setUploadName(null);
    setFieldMapping(defaultMapping(sourceKey));
    setHistoryDays(30);
    setPreview(null);
    setQuality(null);
    setImportResult(null);
    setError(null);
    setDoneSummary(null);
    setBusy(false);
  }, [open, sourceKey]);

  const mappingEntries = useMemo(
    () => Object.entries(fieldMapping || {}),
    [fieldMapping]
  );

  if (!open || !sourceKey) return null;

  const updateMappingTarget = (targetKey, sourceCol) => {
    setFieldMapping((prev) => ({ ...prev, [targetKey]: sourceCol }));
  };

  const selectSourceType = (id) => {
    setSourceType(id);
    setConnection(emptyConnection(id));
    setUploadName(null);
  };

  const uploadCsv = async (file) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("company_id", COMPANY_ID);
      form.append("source_key", sourceKey);
      form.append("file", file);
      const res = await safeApi.post(
        "/operations-hardening/setup-wizard/upload-csv",
        form,
        { timeout: 30000 }
      );
      if (res?.fallback || !res?.data?.file_path) {
        // Local path: keep text in-memory for preview if API offline
        const text = await file.text();
        setConnection((prev) => ({ ...prev, csv_text: text }));
        setUploadName(`${file.name} (local)`);
        return;
      }
      setConnection((prev) => ({
        ...prev,
        file_path: res.data.file_path,
        upload_path: res.data.file_path,
        csv_text: undefined,
      }));
      setUploadName(file.name);
    } catch (err) {
      setError(wizardError(err, "CSV-Upload fehlgeschlagen"));
    } finally {
      setBusy(false);
    }
  };

  const runPreview = async () => {
    setBusy(true);
    setError(null);
    try {
      await safeApi.post("/operations-hardening/setup-wizard/start", {
        company_id: COMPANY_ID,
        source_key: sourceKey,
        source_type: sourceType,
        field_mapping: fieldMapping,
        import_history_days: historyDays,
        preview_rows: 50,
        connection,
      });

      const res = await safeApi.post(
        "/operations-hardening/setup-wizard/preview",
        {
          company_id: COMPANY_ID,
          source_key: sourceKey,
          source_type: sourceType,
          field_mapping: fieldMapping,
          preview_rows: 5,
          connection,
        },
        { timeout: 30000 }
      );
      if (res?.fallback || !res?.data) {
        setError(
          res?.error ||
            "Vorschau fehlgeschlagen — echte CSV-/SQL-/API-Verbindung konfigurieren (Demo-Vorschau deaktiviert)."
        );
        return;
      }
      if (res.data.error) {
        setError(res.data.error);
        return;
      }
      setPreview(res.data);
      setStep(3);
    } catch (err) {
      setError(wizardError(err, "Vorschau fehlgeschlagen"));
    } finally {
      setBusy(false);
    }
  };

  const runQuality = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await safeApi.post(
        "/operations-hardening/setup-wizard/assess-quality",
        {
          company_id: COMPANY_ID,
          source_key: sourceKey,
          source_type: sourceType,
          field_mapping: fieldMapping,
          connection,
          sample_rows: 200,
        },
        { timeout: 30000 }
      );
      if (res?.fallback || !res?.data) {
        setError(
          res?.error ||
            "Qualitätsprüfung fehlgeschlagen — Server muss echte Konnektorzeilen abtasten."
        );
        return;
      }
      setQuality(res.data);
      setStep(4);
    } catch (err) {
      setError(wizardError(err, "Datenqualitätsprüfung fehlgeschlagen"));
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await safeApi.post(
        "/operations-hardening/setup-wizard/import",
        {
          company_id: COMPANY_ID,
          source_key: sourceKey,
          import_history_days: historyDays,
          field_mapping: fieldMapping,
          connection,
          source_type: sourceType,
        },
        { timeout: 60000 }
      );
      if (res?.fallback || !res?.data) {
        setError(res?.error || "Import fehlgeschlagen — echter Konnektor erforderlich.");
        return;
      }
      if (res.data.status === "failed" || res.data.error) {
        setError(res.data.error || "Import hat keine Zeilen zurückgegeben");
      }
      setImportResult(res.data);
      setStep(5);
    } catch (err) {
      setError(wizardError(err, "Historienimport fehlgeschlagen"));
    } finally {
      setBusy(false);
    }
  };

  const runActivate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await safeApi.post(
        `/operations-hardening/setup-wizard/activate/${encodeURIComponent(
          sourceKey
        )}?company_id=${COMPANY_ID}`
      );
      if (res?.fallback) {
        setError(
          res?.error ||
            "Aktivierung erfordert einen erfolgreichen echten Import (Backend nicht verfügbar)."
        );
        return;
      }
      setDoneSummary({
        ok: true,
        message: `${sourceLabel(sourceKey)} über Live-Konnektor-Import verbunden`,
      });
      onCompleted?.({ sourceKey, ok: true, local: false });
      setStep(6);
    } catch (err) {
      setError(wizardError(err, "Aktivierung fehlgeschlagen"));
    } finally {
      setBusy(false);
    }
  };

  const goNext = async () => {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      await runPreview();
      return;
    }
    if (step === 3) {
      await runQuality();
      return;
    }
    if (step === 4) {
      setStep(5);
      return;
    }
    if (step === 5) {
      if (!importResult || importResult.imported_rows <= 0) {
        await runImport();
        return;
      }
      await runActivate();
      return;
    }
    onClose?.();
  };

  const goBack = () => {
    if (step > 1 && step < 6) setStep((s) => s - 1);
  };

  const isCsvFamily = ["csv", "excel", "manual", "lab"].includes(sourceType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Assistent schließen"
        onClick={onClose}
      />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#141820] text-slate-100 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/10 bg-[#141820] px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-emerald-400/90">
              Setup-Assistent
            </p>
            <h2 className="text-lg font-semibold text-slate-50">
              {sourceLabel(sourceKey)} verbinden
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {backendAvailable
                ? "CSV-, SQL- oder API-Verbindung konfigurieren."
                : "Backend offline — Konnektoren nicht verfügbar"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <ol className="flex flex-wrap gap-2">
            {STEPS.map((s) => (
              <li
                key={s.id}
                className={`rounded-full border px-2.5 py-1 text-[11px] ${
                  s.id === step
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                    : s.id < step
                      ? "border-white/15 text-slate-300"
                      : "border-white/10 text-slate-500"
                }`}
              >
                {s.id}. {s.title}
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-4 px-5 py-5">
          {error ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-300">
                Schritt 1 — Konnektortyp wählen und Verbindung konfigurieren.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SOURCE_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectSourceType(t.id)}
                    className={`rounded-xl border px-3 py-3 text-sm text-left transition ${
                      sourceType === t.id
                        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
                        : "border-white/10 bg-[#1a1f27] text-slate-300 hover:border-white/20"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {isCsvFamily ? (
                <div className="space-y-3 rounded-xl border border-white/10 bg-[#1a1f27] p-4">
                  <label className="block text-sm">
                    <span className="text-xs text-slate-400">CSV hochladen</span>
                    <input
                      type="file"
                      accept=".csv,.txt,.tsv,text/csv"
                      className="mt-1 block w-full text-xs text-slate-300"
                      onChange={(e) => uploadCsv(e.target.files?.[0])}
                    />
                  </label>
                  {uploadName ? (
                    <p className="text-xs text-emerald-300">Hochgeladen: {uploadName}</p>
                  ) : null}
                  <label className="block text-sm">
                    <span className="text-xs text-slate-400">
                      Oder CSV-Text einfügen
                    </span>
                    <textarea
                      rows={5}
                      value={connection.csv_text || ""}
                      onChange={(e) =>
                        setConnection((prev) => ({
                          ...prev,
                          csv_text: e.target.value,
                          file_path: undefined,
                        }))
                      }
                      placeholder="timestamp,machine_id,value&#10;2026-07-01T10:00:00Z,extruder_01,0.95"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1218] px-3 py-2 font-mono text-xs text-slate-100"
                    />
                  </label>
                </div>
              ) : null}

              {sourceType === "sql" ? (
                <div className="space-y-3 rounded-xl border border-white/10 bg-[#1a1f27] p-4">
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={Boolean(connection.use_saved_mssql)}
                      onChange={(e) =>
                        setConnection((prev) => ({
                          ...prev,
                          use_saved_mssql: e.target.checked,
                        }))
                      }
                    />
                    Gespeicherte Verbindungen → MSSQL-Zugangsdaten nutzen
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs text-slate-400">SELECT-Abfrage</span>
                    <textarea
                      rows={4}
                      value={connection.query || ""}
                      onChange={(e) =>
                        setConnection((prev) => ({
                          ...prev,
                          query: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1218] px-3 py-2 font-mono text-xs"
                    />
                  </label>
                  {!connection.use_saved_mssql ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {[
                        ["host", "Host"],
                        ["username", "Benutzername"],
                        ["password", "Passwort"],
                        ["database", "Datenbank"],
                      ].map(([k, label]) => (
                        <label key={k} className="block text-sm">
                          <span className="text-xs text-slate-400">{label}</span>
                          <input
                            type={k === "password" ? "password" : "text"}
                            value={connection[k] || ""}
                            onChange={(e) =>
                              setConnection((prev) => ({
                                ...prev,
                                [k]: e.target.value,
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1218] px-3 py-2 text-sm"
                          />
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {sourceType === "api" ? (
                <div className="space-y-3 rounded-xl border border-white/10 bg-[#1a1f27] p-4">
                  <label className="block text-sm">
                    <span className="text-xs text-slate-400">API URL</span>
                    <input
                      value={connection.url || ""}
                      onChange={(e) =>
                        setConnection((prev) => ({
                          ...prev,
                          url: e.target.value,
                        }))
                      }
                      placeholder="https://example.com/api/quality"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1218] px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-sm">
                      <span className="text-xs text-slate-400">Methode</span>
                      <select
                        value={connection.method || "GET"}
                        onChange={(e) =>
                          setConnection((prev) => ({
                            ...prev,
                            method: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1218] px-3 py-2 text-sm"
                      >
                        <option>GET</option>
                        <option>POST</option>
                      </select>
                    </label>
                    <label className="block text-sm">
                      <span className="text-xs text-slate-400">JSON-Pfad</span>
                      <input
                        value={connection.json_path || ""}
                        onChange={(e) =>
                          setConnection((prev) => ({
                            ...prev,
                            json_path: e.target.value,
                          }))
                        }
                        placeholder="data"
                        className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1218] px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="mb-3 text-sm text-slate-300">
                Schritt 2 — Quellspalten auf ZITTA-Felder zuordnen.
              </p>
              <div className="space-y-2">
                {mappingEntries.map(([target, sourceCol]) => (
                  <div
                    key={target}
                    className="grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-[#1a1f27] p-3 sm:grid-cols-[1fr_1.2fr]"
                  >
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">
                        ZITTA-Feld
                      </p>
                      <p className="text-sm text-slate-200">{target}</p>
                    </div>
                    <label className="block">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500">
                        Quellspalte
                      </span>
                      <input
                        value={sourceCol}
                        onChange={(e) =>
                          updateMappingTarget(target, e.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1218] px-3 py-2 text-sm text-slate-100"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="mb-3 text-sm text-slate-300">
                Schritt 3 — Zugeordnete Zeilen vorschauen (
                {preview?.value_source || "LIVE"} · {preview?.row_count || 0}{" "}
                angezeigt).
              </p>
              {preview?.rows?.length ? (
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-white/5 text-slate-400">
                      <tr>
                        {(preview.columns || []).map((c) => (
                          <th key={c} className="px-3 py-2 font-medium">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row, idx) => (
                        <tr key={idx} className="border-t border-white/5">
                          {(preview.columns || []).map((c) => (
                            <td key={c} className="px-3 py-2 text-slate-200">
                              {String(row[c] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Noch keine Vorschauzeilen.</p>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <p className="mb-3 text-sm text-slate-300">
                Schritt 4 — Datenqualität aus abgetasteten Konnektorzeilen.
              </p>
              {quality ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    ["Bewertung", `${Math.round(quality.quality_score)}%`],
                    [
                      "Vollständigkeit",
                      `${Math.round((quality.completeness || 0) * 100)}%`,
                    ],
                    [
                      "Aktualität",
                      `${Math.round((quality.freshness || 0) * 100)}%`,
                    ],
                    [
                      "Konsistenz",
                      `${Math.round((quality.consistency || 0) * 100)}%`,
                    ],
                    ["Gültigkeit", `${Math.round((quality.validity || 0) * 100)}%`],
                    [
                      "Verfügbarkeit",
                      `${Math.round((quality.availability || 0) * 100)}%`,
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-white/10 bg-[#1a1f27] px-3 py-3"
                    >
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">
                        {label}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-emerald-300">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
              {quality?.issues?.length ? (
                <ul className="mt-3 space-y-1 text-xs text-amber-200">
                  {quality.issues.map((issue) => (
                    <li key={issue}>• {issue}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-emerald-400">
                  Keine blockierenden Qualitätsprobleme erkannt.
                </p>
              )}
            </div>
          )}

          {step === 5 && (
            <div>
              <p className="mb-3 text-sm text-slate-300">
                Schritt 5 — Historische Daten in Staging importieren (
                <code className="text-emerald-300">source_import_rows</code>).
              </p>
              <label className="block max-w-xs">
                <span className="text-xs text-slate-400">Historienfenster (Tage)</span>
                <input
                  type="number"
                  min={7}
                  max={365}
                  value={historyDays}
                  onChange={(e) =>
                    setHistoryDays(Number(e.target.value) || 30)
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1218] px-3 py-2 text-sm"
                />
              </label>
              {importResult ? (
                <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-100">
                  Importiert {importResult.imported_rows} Zeilen ·{" "}
                  {importResult.import_history_days} Tage ·{" "}
                  {importResult.value_source || "LIVE"}
                  {importResult.import_batch_id
                    ? ` · Charge ${importResult.import_batch_id}`
                    : ""}
                  {importResult.domain_table ? (
                    <p className="mt-1 text-xs text-emerald-200/90">
                      Zieltabelle: {importResult.domain_table} ·{" "}
                      {importResult.domain_rows ?? 0} Zeilen
                      {importResult.quality_records_linked
                        ? ` · ${importResult.quality_records_linked} Qualitätsdatensatz-Verknüpfungen`
                        : ""}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-500">
                  „Historie importieren“ klicken, um echte Konnektorzeilen zu laden und zu speichern.
                </p>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-5">
              <p className="text-lg font-semibold text-emerald-200">
                {doneSummary?.message || "Quelle aktiviert"}
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Digitalisierungsfortschritt und Funktionsfreigaben werden in der
                Betriebszentrale aktualisiert.
              </p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-white/10 bg-[#141820] px-5 py-4">
          <button
            type="button"
            onClick={goBack}
            disabled={busy || step <= 1 || step >= 6}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 disabled:opacity-40"
          >
            Zurück
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={busy}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy
              ? "Bitte warten…"
              : step === 6
                ? "Schließen"
                : step === 5 && (!importResult || importResult.imported_rows <= 0)
                  ? "Historie importieren"
                  : step === 5
                    ? "Quelle aktivieren"
                    : "Weiter"}
          </button>
        </div>
      </div>
    </div>
  );
}
