/**
 * Stage 1 config for ZITTA Production Intelligence.
 * Structural defaults only — never invent LIVE-looking SIMULATED process values.
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
export const ALWAYS_CONNECTED = [
  "ai_server",
  "machine_data",
  "machine_state",
  "live_sensors",
];

/** Empty slots when no live API values — honest, not simulated numbers. */
export const EMPTY_MACHINE_VALUES = [
  {
    key: "motor_load",
    label: "Motorlast",
    value: "—",
    unit: "",
    traffic: "grey",
    value_source: VALUE_SOURCES.LIVE,
    lockedHint: "Warte auf Live-Sensordaten",
    spark: [],
  },
  {
    key: "screw_speed",
    label: "Schneckendrehzahl",
    value: "—",
    unit: "",
    traffic: "grey",
    value_source: VALUE_SOURCES.LIVE,
    lockedHint: "Warte auf Live-Sensordaten",
    spark: [],
  },
  {
    key: "melt_pressure",
    label: "Extruderdruck",
    value: "—",
    unit: "",
    traffic: "grey",
    value_source: VALUE_SOURCES.LIVE,
    lockedHint: "Warte auf Live-Sensordaten",
    spark: [],
  },
  {
    key: "zone3_temp",
    label: "Zone-3-Temperatur",
    value: "—",
    unit: "",
    traffic: "grey",
    value_source: VALUE_SOURCES.LIVE,
    lockedHint: "Warte auf Live-Sensordaten",
    spark: [],
  },
  {
    key: "energy",
    label: "Energie",
    value: "—",
    unit: "",
    traffic: "grey",
    value_source: VALUE_SOURCES.LIVE,
    lockedHint: "Erfordert Energiedaten",
    spark: [],
  },
];

export const operationsCenterDemo = {
  plantName: "ZITTA Produktionsintelligenz",
  subtitle: "Digitale Produktionsleitwarte",
  demoMode: false,
  pollIntervalMs: 15000,

  totalMachines: 20,
  connectedMachines: 1,

  dataQuality: 86,

  plantStatus: "STOPPED",

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

  readinessBoost: {
    quality_data: 14,
    maintenance_history: 12,
    material_batches: 8,
    energy_data: 6,
    opc_ua: 5,
    erp: 4,
  },

  potentials: {
    after_quality: 68,
    after_maintenance: 81,
    after_all_machines: 92,
  },

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
    {
      id: "doser_01",
      name: "Dosierer",
      type: "doser",
      status: "NOT_CONNECTED",
      connected: false,
    },
    {
      id: "granulator_01",
      name: "Granulator",
      type: "granulator",
      status: "NOT_CONNECTED",
      connected: false,
    },
    {
      id: "screen_01",
      name: "Siebwechsler",
      type: "screen",
      status: "NOT_CONNECTED",
      connected: false,
    },
    {
      id: "cooling_01",
      name: "Kühlung",
      type: "cooling",
      status: "NOT_CONNECTED",
      connected: false,
    },
  ],

  /** No invented numbers — live API fills these. */
  machineValues: EMPTY_MACHINE_VALUES,

  warnings: [],

  risks: [],

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
