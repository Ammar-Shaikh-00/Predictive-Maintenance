import React, { useEffect, useState } from "react";
import safeApi from "../../../api/safeApi";

const LiveEstimatedValues = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await safeApi.get("/window-features?limit=1&offset=0");

      if (res?.data?.length > 0) {
        setData(res.data[0]);
      }
    } catch (err) {
      console.error("LiveEstimatedValues error:", err);
    } finally {
      setLoading(false);
      console.log(data);
    }
  };

  useEffect(() => {
    let interval;

    fetchData();

    interval = setInterval(fetchData, 5000); // refresh every 2 sec

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-4 mt-4 bg-white rounded-2xl shadow-sm border">
        <p className="text-gray-500 text-sm">Loading live estimated values...</p>
      </div>
    );
  }

  if (!data) return (
      <div className="p-4 mt-4 bg-white rounded-2xl shadow-sm ">
        <p className="text-gray-500 text-sm">No live estimated values found</p>
      </div>
    );

    const formatValue = (val) => {
        if (val === null || val === undefined) return "--";

        const num = Number(val);
        if (isNaN(num)) return val;

        return num.toFixed(4);
    };

    const renderCard = (label, value) => (
        <div className="bg-gray-50 rounded-xl p-4 shadow-sm hover:shadow-md transition">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-lg font-semibold text-gray-800">
            {formatValue(value)}
        </p>
        </div>
    );

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-gray-800">
          Live Estimated Values
        </h2>
        <p className="text-xs text-gray-500">
          Last Window: {new Date(data.window_end).toLocaleString()}
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {renderCard("Screw Speed Mean", data.screw_speed_mean)}
        {renderCard("Screw Speed Std", data.screw_speed_std)}
        {renderCard("Screw Speed Trend", data.screw_speed_trend)}

        {renderCard("Pressure Mean", data.pressure_mean)}
        {renderCard("Pressure Std", data.pressure_std)}
        {renderCard("Pressure Trend", data.pressure_trend)}

        {renderCard("Temperature Mean", data.temperature_mean)}
        {renderCard("Temperature Std", data.temperature_std)}
        {renderCard("Temperature Trend", data.temperature_trend)}

        {renderCard("Load Mean", data.load_mean)}
        {renderCard("Load Std", data.load_std)}
        {renderCard("Load Trend", data.load_trend)}

        {renderCard("Pressure / RPM", data.pressure_per_rpm)}
        {renderCard("Temp Spread", data.temp_spread)}
        {renderCard("Load / Pressure", data.load_per_pressure)}
      </div>
    </div>
  );
};

export default LiveEstimatedValues;