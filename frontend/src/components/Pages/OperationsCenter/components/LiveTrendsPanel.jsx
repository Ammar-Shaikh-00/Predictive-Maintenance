import CssSparkline from "./CssSparkline";
import { localizeUiText } from "../buildOcCockpit";

const PROCESS_KEYS = [
  "motor_load",
  "screw_speed",
  "melt_pressure",
  "zone3_temp",
];

const LABEL_DE = {
  motor_load: "Motorlast",
  screw_speed: "Schneckendrehzahl",
  melt_pressure: "Extruderdruck",
  zone3_temp: "Zone-3-Temperatur",
  temp_avg: "Schmelztemperatur",
};

const UNIT_FALLBACK = {
  motor_load: "%",
  screw_speed: "rpm",
  melt_pressure: "bar",
  zone3_temp: "°C",
};

/**
 * Live Prozesswerte — 4 compact sparkline tiles.
 */
export default function LiveTrendsPanel({ values = [], embedded = false }) {
  const byKey = Object.fromEntries((values || []).map((v) => [v.key, v]));

  const tiles = PROCESS_KEYS.map((key) => {
    const v = byKey[key];
    if (v) return v;
    // fallback: temp_avg for zone3 if missing
    if (key === "zone3_temp" && byKey.temp_avg) {
      return { ...byKey.temp_avg, key: "zone3_temp", label: LABEL_DE.zone3_temp };
    }
    return {
      key,
      label: LABEL_DE[key],
      value: "—",
      unit: UNIT_FALLBACK[key] || "",
      traffic: "grey",
      spark: [],
      lockedHint: "Warte auf Live-Sensordaten",
    };
  });

  return (
    <section className={embedded ? "oc-process-embed min-w-0" : "oc-panel oc-process-panel min-w-0"}>
      <h2 className="oc-section-title mb-3">Live Prozesswerte</h2>
      <div className="oc-process-grid">
        {tiles.map((item) => {
          const spark = Array.isArray(item.spark) ? item.spark.slice(-40) : [];
          const unit = item.unit || UNIT_FALLBACK[item.key] || "";
          const value =
            item.value === "—" || item.value == null
              ? "—"
              : `${item.value}${unit ? ` ${unit}` : ""}`;
          return (
            <div key={item.key} className="oc-process-tile">
              <p className="oc-process-tile__label">
                {LABEL_DE[item.key] || item.label}
              </p>
              <p className="oc-process-tile__value">{value}</p>
              <div className="oc-process-tile__spark">
                {spark.length > 1 ? (
                  <CssSparkline
                    data={spark}
                    color="#94a3b8"
                    height={36}
                    width={160}
                  />
                ) : (
                  <div className="oc-process-tile__flat" />
                )}
              </div>
              {item.value === "—" && item.lockedHint ? (
                <p className="oc-process-tile__hint">
                  {localizeUiText(item.lockedHint)}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
