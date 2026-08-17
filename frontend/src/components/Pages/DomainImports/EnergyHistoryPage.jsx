import DomainImportPage from "./DomainImportPage";

const COLUMNS = [
  { key: "event_at", label: "Wann" },
  { key: "machine_id", label: "Maschine" },
  {
    key: "kwh",
    label: "kWh",
    render: (row) =>
      row.kwh != null && row.kwh !== "" ? Number(row.kwh).toFixed(2) : "—",
  },
  {
    key: "cost",
    label: "Kosten",
    render: (row) =>
      row.cost != null && row.cost !== "" ? Number(row.cost).toFixed(2) : "—",
  },
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

/** Energy history module — reads imported_energy_readings. */
export default function EnergyHistoryPage() {
  return (
    <DomainImportPage
      title="Energiehistorie"
      subtitle="Importierte Zählerstände vom Setup-Assistenten-Connector"
      sourceKey="energy_data"
      endpoint="/operations-hardening/domain-imports/energy"
      columns={COLUMNS}
    />
  );
}
