import { useTranslation } from "react-i18next";
import ParameterCard from "./ParameterCard";

export default function ParameterCards({
  features,
  evaluations,
  trendHistory = [],
}) {
  const { t } = useTranslation();

  const getEval = (name) =>
    evaluations.find((e) => e.feature_name === name);

  const getTrend = (key) =>
    trendHistory.map((item) => ({ value: item[key] }));

  return (
    <div
      className="
        grid
        grid-cols-1
        sm:grid-cols-2
        lg:grid-cols-3
        2xl:grid-cols-4
        gap-4
      "
    >
      <ParameterCard
        parameterKey="screw_speed"
        label={t("liveEstimated.parameters.screwSpeedRpm")}
        value={features.screw_speed_mean}
        baseFeature1={t("liveEstimated.std")}
        feature1={features.screw_speed_std}
        baseFeature2={t("liveEstimated.trend")}
        feature2={features.screw_speed_trend}
        unit="rpm"
        evalData={getEval("screw_speed_mean")}
        trendData={getTrend("avg_speed")}
      />

      <ParameterCard
        parameterKey="pressure"
        label={t("liveEstimated.parameters.pressureBar")}
        value={features.pressure_mean}
        baseFeature1={t("liveEstimated.std")}
        feature1={features.pressure_std}
        baseFeature2={t("liveEstimated.trend")}
        feature2={features.pressure_trend}
        unit="bar"
        evalData={getEval("pressure_mean")}
        trendData={getTrend("avg_pressure")}
      />

      <ParameterCard
        parameterKey="temperature"
        label={t("liveEstimated.parameters.temperatureC")}
        value={features?.temperature_mean}
        baseFeature1={t("liveEstimated.std")}
        feature1={features?.temperature_std}
        baseFeature2={t("liveEstimated.trend")}
        feature2={features?.temperature_trend}
        unit="°C"
        evalData={getEval("temperature_mean")}
        trendData={getTrend("avg_temp")}
      />

      <ParameterCard
        parameterKey="load"
        label={t("liveEstimated.parameters.loadAmp")}
        value={features?.load_mean}
        baseFeature1={t("liveEstimated.std")}
        feature1={features?.load_std}
        baseFeature2={t("liveEstimated.trend")}
        feature2={features?.load_trend}
        unit="amp"
        evalData={getEval("load_mean")}
        trendData={getTrend("avg_load")}
      />

      <ParameterCard
        parameterKey="pressure_per_rpm"
        label={t("liveEstimated.parameters.pressurePerRpm")}
        value={features?.pressure_per_rpm}
        unit="bar/rpm"
        evalData={getEval("pressure_per_rpm")}
        trendData={getTrend("pressure_per_rpm")}
      />

      <ParameterCard
        parameterKey="temp_spread"
        label={t("liveEstimated.parameters.temperatureSpreadC")}
        value={features?.temp_spread}
        unit="°C"
        evalData={getEval("temp_spread")}
        trendData={getTrend("temp_spread")}
      />

      <ParameterCard
        parameterKey="load_per_pressure"
        label={t("liveEstimated.parameters.loadPerPressure")}
        value={features?.load_per_pressure}
        unit="amp/bar"
        evalData={getEval("load_per_pressure")}
        trendData={getTrend("load_per_pressure")}
      />
    </div>
  );
}
