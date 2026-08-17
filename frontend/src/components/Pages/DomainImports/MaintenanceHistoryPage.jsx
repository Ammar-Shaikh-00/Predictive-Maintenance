import DomainImportPage from "./DomainImportPage";

const COLUMNS = [
  { key: "event_at", label: "Wann" },
  { key: "machine_id", label: "Maschine" },
  { key: "work_order", label: "Arbeitsauftrag" },
  { key: "component", label: "Komponente" },
  { key: "action", label: "Aktion" },
  { key: "technician", label: "Techniker" },
  {
    key: "value_source",
    label: "Herkunft",
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
      title="Wartungshistorie"
      subtitle="Importierte CMMS-/Serviceereignisse vom Setup-Assistenten-Connector"
      sourceKey="maintenance_history"
      endpoint="/operations-hardening/domain-imports/maintenance"
      columns={COLUMNS}
    />
  );
}
