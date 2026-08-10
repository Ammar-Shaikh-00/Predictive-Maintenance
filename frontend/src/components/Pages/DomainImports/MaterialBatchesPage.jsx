import DomainImportPage from "./DomainImportPage";

const COLUMNS = [
  { key: "event_at", label: "When" },
  { key: "material_id", label: "Material" },
  { key: "material_batch", label: "Batch" },
  { key: "supplier", label: "Supplier" },
  { key: "lot_quality", label: "Lot QC" },
  {
    key: "value_source",
    label: "Provenance",
    render: (row) => (
      <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300">
        {row.value_source || "LIVE"}
      </span>
    ),
  },
];

/** Material batches module — reads imported_material_batches. */
export default function MaterialBatchesPage() {
  return (
    <DomainImportPage
      title="Material batches"
      subtitle="Imported material lot history from the Setup Wizard connector"
      sourceKey="material_batches"
      endpoint="/operations-hardening/domain-imports/material"
      columns={COLUMNS}
    />
  );
}
