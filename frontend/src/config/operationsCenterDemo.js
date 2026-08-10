/**
 * Stage 1 demo configuration for ZITTA Production Intelligence.
 * Adjust these values for customer presentations without backend changes.
 * Stage 2 will replace machineValues / warnings with live API data.
 */

export const VALUE_SOURCES = {
  LIVE: "LIVE",
  RULE_BASED: "RULE_BASED",
  DERIVED: "DERIVED",
  SIMULATED: "SIMULATED",
  MODEL_PREDICTION: "MODEL_PREDICTION",
  MANUAL: "MANUAL",
};

/** Weight per connected source for digitalization progress (sums toward 100). */
export const DIGITALIZATION_WEIGHTS = {
  ai_server: 10,
  machine_data: 15,
  machine_state: 10,
  live_sensors: 10,
  production_history: 10,
  quality_data: 15,
  maintenance_history: 10,
  material_batches: 5,
  energy_data: 5,
  operator_events: 5,
  models_validated: 5,
};

/** Always-on infrastructure credits for the current Zitta footprint. */
export const ALWAYS_CONNECTED = ["ai_server", "machine_data", "machine_state", "live_sensors"];

export const operationsCenterDemo = {
  plantName: "ZITTA Production Intelligence",
  subtitle: "Digital Production Control Center",
  demoMode: true,
  pollIntervalMs: 15000,

  totalMachines: 20,
  connectedMachines: 1,

  /** Base scores before optional source toggles (presentation-friendly). */
  dataQuality: 86,

  plantStatus: "PRODUCTION", // PRODUCTION | READY | HEATING | COOLING | FAULT | STOPPED

  connectedSources: [...ALWAYS_CONNECTED],

  missingSources: [
    "quality_data",
    "maintenance_history",
    "material_batches",
    "energy_data",
    "opc_ua",
    "erp",
  ],

  checklistDone: [
    { key: "ai_server", label: "KI-Server" },
    { key: "sql_database", label: "SQL-Datenbank" },
    { key: "live_sensors", label: "Live-Sensordaten" },
    { key: "vpn", label: "VPN" },
    { key: "user_management", label: "Benutzerverwaltung" },
  ],

  checklistOpen: [
    { key: "quality_data", label: "Qualitätsdaten" },
    { key: "maintenance_history", label: "Wartungssystem" },
    { key: "erp", label: "ERP" },
    { key: "energy_data", label: "Energiezähler" },
    { key: "opc_ua", label: "OPC-UA" },
    { key: "material_batches", label: "Materialchargen" },
  ],

  /** Readiness contribution when a source becomes connected (0–100 scale piece). */
  readinessBoost: {
    quality_data: 14,
    maintenance_history: 12,
    material_batches: 8,
    energy_data: 6,
    opc_ua: 5,
    erp: 4,
  },

  /** Presentation potentials (Estimated Potential — not Accuracy). */
  potentials: {
    after_quality: 68,
    after_maintenance: 81,
    after_all_machines: 92,
  },

  /** Base readiness with current connected footprint only. */
  basePredictionReadiness: 42,

  machines: [
    {
      id: "extruder_01",
      name: "Extruder 1",
      type: "extruder",
      status: "PRODUCTION",
      connected: true,
      sensors: 21,
      integrationScore: 72,
      healthScore: 88,
    },
    { id: "doser_01", name: "Dosierer", type: "doser", status: "NOT_CONNECTED", connected: false },
    { id: "granulator_01", name: "Granulator", type: "granulator", status: "NOT_CONNECTED", connected: false },
    { id: "screen_01", name: "Siebwechsler", type: "screen", status: "NOT_CONNECTED", connected: false },
    { id: "cooling_01", name: "Kühlung", type: "cooling", status: "NOT_CONNECTED", connected: false },
  ],

  /** Compact live-looking values — Stage 1: SIMULATED / RULE_BASED only. */
  machineValues: [
    {
      key: "motor_load",
      label: "Motorlast",
      value: 68,
      unit: "%",
      traffic: "green",
      normalMin: 40,
      normalMax: 85,
      deviation: 0,
      value_source: VALUE_SOURCES.SIMULATED,
      spark: [62, 64, 63, 66, 65, 67, 68, 66, 69, 68],
    },
    {
      key: "screw_speed",
      label: "Schneckendrehzahl",
      value: 42.5,
      unit: "rpm",
      traffic: "green",
      normalMin: 30,
      normalMax: 55,
      deviation: 1.2,
      value_source: VALUE_SOURCES.SIMULATED,
      spark: [40, 41, 41.5, 42, 41.8, 42.2, 42.5, 42.1, 42.4, 42.5],
    },
    {
      key: "melt_pressure",
      label: "Extruderdruck",
      value: 187,
      unit: "bar",
      traffic: "yellow",
      normalMin: 140,
      normalMax: 200,
      deviation: 8,
      value_source: VALUE_SOURCES.RULE_BASED,
      spark: [170, 172, 175, 178, 180, 182, 184, 185, 186, 187],
    },
    {
      key: "zone3_temp",
      label: "Zone-3-Temperatur",
      value: 214,
      unit: "°C",
      traffic: "green",
      normalMin: 200,
      normalMax: 230,
      deviation: -2,
      value_source: VALUE_SOURCES.SIMULATED,
      spark: [216, 215, 215, 214, 214, 215, 214, 213, 214, 214],
    },
    {
      key: "throughput",
      label: "Materialdurchsatz",
      value: 312,
      unit: "kg/h",
      traffic: "green",
      normalMin: 280,
      normalMax: 350,
      deviation: 0,
      value_source: VALUE_SOURCES.SIMULATED,
      spark: [300, 305, 308, 310, 309, 311, 312, 310, 311, 312],
    },
    {
      key: "energy",
      label: "Energie",
      value: "—",
      unit: "",
      traffic: "grey",
      normalMin: null,
      normalMax: null,
      deviation: null,
      value_source: VALUE_SOURCES.SIMULATED,
      lockedHint: "Erfordert Energiedaten",
      spark: [],
    },
  ],

  warnings: [
    {
      id: "w1",
      text: "Schmelzdruck nähert sich dem oberen Normalbereich.",
      value_source: VALUE_SOURCES.RULE_BASED,
      display_label: "Regelbasierte Warnung",
    },
    {
      id: "w2",
      text: "Maschinennetzwerk für 19 Maschinen noch nicht verbunden.",
      value_source: VALUE_SOURCES.DERIVED,
      display_label: "Abgeleitet",
    },
  ],

  risks: [
    {
      id: "r1",
      text: "In 11 Stunden steigt die Wahrscheinlichkeit eines Druckverlusts auf 82%.",
      value_source: VALUE_SOURCES.SIMULATED,
      display_label: "Demo-Vorhersage",
      is_customer_decision_relevant: false,
    },
    {
      id: "r2",
      text: "Werkzeug erreicht voraussichtlich in 34 Tagen den Wartungsbereich.",
      value_source: VALUE_SOURCES.SIMULATED,
      display_label: "Demo-Vorhersage",
      is_customer_decision_relevant: false,
    },
  ],

  networkNotes: [
    "Maschinennetzwerk für weitere Linien noch nicht verbunden",
    "Qualitätsanbindung fehlt",
    "Wartungsanbindung fehlt",
  ],
};

export const lockedFeaturesDemo = [
  {
    key: "quality_degradation_prediction",
    name: "Vorhersage Qualitätsverschlechterung",
    requires: ["quality_data"],
    benefit: "Frühere Erkennung von Qualitätsverschlechterung",
  },
  {
    key: "remaining_useful_life",
    name: "Restnutzungsdauer",
    requires: ["maintenance_history"],
    benefit: "Bessere Wartungsplanung",
  },
  {
    key: "material_behaviour_analysis",
    name: "Materialverhaltensanalyse",
    requires: ["material_batches"],
    benefit: "Vergleich von Materialchargen",
  },
  {
    key: "energy_optimization",
    name: "Energieoptimierung",
    requires: ["energy_data"],
    benefit: "Niedrigere Energiekosten pro Kilogramm",
  },
  {
    key: "scrap_prediction",
    name: "Ausschussvorhersage",
    requires: ["quality_data", "material_batches"],
    benefit: "Weniger Ausschusschargen",
  },
];

export const SOURCE_LABELS = {
  ai_server: "KI-Server",
  machine_data: "Maschinendaten",
  machine_state: "Maschinenstatus",
  live_sensors: "Live-Sensoren",
  production_history: "Produktionshistorie",
  quality_data: "Qualitätsdaten",
  maintenance_history: "Wartungshistorie",
  material_batches: "Materialchargen",
  energy_data: "Energiedaten",
  operator_events: "Bedienerereignisse",
  models_validated: "Validierte Modelle",
  opc_ua: "OPC-UA",
  erp: "ERP",
  sql_database: "SQL-Datenbank",
  vpn: "VPN",
  user_management: "Benutzerverwaltung",
};
