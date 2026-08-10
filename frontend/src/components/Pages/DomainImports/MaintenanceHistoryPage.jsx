import DomainImportPage from "./DomainImportPage";

const COLUMNS = [
  { key: "event_at", label: "When" },
  { key: "machine_id", label: "Machine" },
  { key: "work_order", label: "Work order" },
  { key: "component", label: "Component" },
  { key: "action", label: "Action" },
  { key: "technician", label: "Technician" },
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

/** Maintenance history module — reads imported_maintenance_events. */
export default function MaintenanceHistoryPage() {
  return (
    <DomainImportPage
      title="Maintenance history"
      subtitle="Imported CMMS / service events from the Setup Wizard connector"
      sourceKey="maintenance_history"
      endpoint="/operations-hardening/domain-imports/maintenance"
      columns={COLUMNS}
    />
  );
}
