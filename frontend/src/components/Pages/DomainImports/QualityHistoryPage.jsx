import DomainImportPage from "./DomainImportPage";

const COLUMNS = [
  { key: "event_at", label: "When" },
  { key: "machine_id", label: "Machine" },
  { key: "external_run_key", label: "Run key" },
  {
    key: "production_run_id",
    label: "Run ID",
    render: (row) => row.production_run_id ?? "—",
  },
  { key: "material_batch", label: "Batch" },
  {
    key: "quality_value",
    label: "QC value",
    render: (row) =>
      row.quality_value != null ? Number(row.quality_value).toFixed(3) : "—",
  },
  { key: "approval_status", label: "Status" },
  {
    key: "scrap",
    label: "Scrap",
    render: (row) => (row.scrap != null ? Number(row.scrap).toFixed(2) : "—"),
  },
  {
    key: "promoted_to_quality_record",
    label: "Linked",
    render: (row) => row.promoted_to_quality_record || "no",
  },
];

/** Quality events module — reads imported_quality_events. */
export default function QualityHistoryPage() {
  return (
    <DomainImportPage
      title="Quality history"
      subtitle="Imported QC events from the Setup Wizard connector"
      sourceKey="quality_data"
      endpoint="/operations-hardening/domain-imports/quality"
      columns={COLUMNS}
    />
  );
}
