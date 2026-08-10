import SensorChartCard from "./SensorChartCard";

export default function SensorCharts({
  rows,
  sensors,
}) {

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

      {sensors.map((sensor) => {

        const key =
          sensor.map_val.toLowerCase();

        const chartData = rows.map((r) => ({
          timestamp: r.timestamp,
          value: r[key],
        }));

        return (
          <SensorChartCard
            key={sensor.id}
            title={sensor.name}
            data={chartData}
          />
        );
      })}

    </div>
  );
}