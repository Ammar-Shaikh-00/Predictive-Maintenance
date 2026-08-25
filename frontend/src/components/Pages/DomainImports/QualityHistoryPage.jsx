import DomainImportPage from "./DomainImportPage";

const COLUMNS = [
  { key: "event_at", label: "Wann" },
  { key: "machine_id", label: "Maschine" },
  { key: "external_run_key", label: "Laufschlüssel" },
  {
    key: "production_run_id",
    label: "Lauf-ID",
    render: (row) => row.production_run_id ?? "—",
  },
  { key: "material_batch", label: "Charge" },
  {
    key: "quality_value",
    label: "QC-Wert",
    render: (row) =>
      row.quality_value != null ? Number(row.quality_value).toFixed(3) : "—",
  },
  { key: "approval_status", label: "Status" },
  {
    key: "scrap",
    label: "Ausschuss",
    render: (row) => (row.scrap != null ? Number(row.scrap).toFixed(2) : "—"),
  },
  {
    key: "promoted_to_quality_record",
    label: "Verknüpft",
    render: (row) => row.promoted_to_quality_record || "nein",
  },
];

/** Quality events module — reads imported_quality_events. */
export default function QualityHistoryPage() {
  return (
    <DomainImportPage
      title="Qualitätshistorie"
      subtitle="Importierte QC-Ereignisse vom Setup-Assistenten-Connector"
      sourceKey="quality_data"
      endpoint="/operations-hardening/domain-imports/quality"
      columns={COLUMNS}
    />
  );
}
