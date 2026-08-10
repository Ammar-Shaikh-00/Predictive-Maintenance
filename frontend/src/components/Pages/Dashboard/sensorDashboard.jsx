  import React, { useEffect, useState } from "react";
  import toast from "react-hot-toast";
  import SimpleLiveChart from "../../subComponents/simpleLiveChart";
  import safeApi from "../../../api/safeApi";
  import { useErrorToast } from "../../subComponents/errorToast";
  import { useTranslation } from "react-i18next";



  const SensorDashboard = ({machineState = "PRODUCTION " , backendStatus}) => {
    const [chartTimeframe, setChartTimeframe] = useState("1h");
    const [rows, setRows] = useState([]);
    const [oneDayData, setOneDayData] = useState([]);
    const [oneWeekData, setOneWeekData] = useState([]);
    const [oneMonthData, setOneMonthData] = useState([]);
    const [oneHourData, setOneHourData] = useState([]);
    const [timeRangeData, setTimeRangeData] = useState([]);
    const [filters, setFilters] = useState({
      datefrom: "",
      dateTo: "",
    });
    const [loading, setLoading] = useState(false);
    const [pressureConfig, setPressureConfig] = useState(null);
    const chartTimeFrameValues = {'1h':()=>{setRows(oneHourData)}, '1d':()=>{setRows(oneDayData)}, '1w':()=>{setRows(oneWeekData)}, '1m':()=>{setRows(oneMonthData)}, 'TR':()=>{setRows(timeRangeData)}}
    const { t } = useTranslation();

    
    const handleSearch = async () => {
      if (!filters.datefrom) {
        toast.error(t("machineSensorViewer.errors.startDateRequired"));
        return;
      }

      if (!filters.dateTo) {
        toast.error(t("machineSensorViewer.errors.endDateRequired"));
        return;
      }

      if (new Date(filters.datefrom) > new Date(filters.dateTo)) {
        toast.error(t("machineSensorViewer.errors.startAfterEnd"));
        return;
      }

      try {
        setLoading(true);
        const response = await safeApi.get(
          "/dashboard/extruder/timeRangeData",
          {
            params: {
              fromDate: filters.datefrom,
              toDate: filters.dateTo,
              limit: 500000,
            },
          }
        );

        if (!response.fallback) {
          const data = response.data.rows || [];

          setTimeRangeData(data);
          // setRows(data);
          // setChartTimeframe("TR");
          console.log(data);
        }
      } catch (err) {
        toast.error(err?.message || "Failed to load data");
      }finally{
        setLoading(false);
      }
    };


    // 🔌 API CALL
  useEffect(() => {
      const fetchData = async () => {

        try {
          // Parallel API calls
          const [
            res1Day,
            res1Week,
            res1Month,
            res1Hour
          ] = await Promise.all([
            safeApi.get('/dashboard/extruder/history?hours=24&limit=1000'),
            safeApi.get('/dashboard/extruder/history/daily?days=7'),
            safeApi.get('/dashboard/extruder/history/daily?days=30'),
            safeApi.get('/dashboard/extruder/history?hours=1&limit=20000')
          ]);

          // Check fallback/error for each
          if (!res1Day.fallback) setOneDayData(res1Day.data.rows);
          if (!res1Week.fallback) setOneWeekData(res1Week.data.rows);
          if (!res1Month.fallback) setOneMonthData(res1Month.data.rows);
          if (!res1Hour.fallback) setOneHourData(res1Hour.data.rows);

          // console.log(res1Hour.data.rows);

          // console.log("oneHourData",oneHourData);
          // chartTimeFrameValues[chartTimeframe]();

          
        } catch (err) {
          useErrorToast().showError('Unexpected error: ' + err.message);
        } finally {
        }
      };

      fetchData();
    }, [backendStatus]);

    useEffect(() => {
      if (chartTimeframe === "1h") setRows(oneHourData);
      else if (chartTimeframe === "1d") setRows(oneDayData);
      else if (chartTimeframe === "1w") setRows(oneWeekData);
      else if (chartTimeframe === "1m") setRows(oneMonthData);
      else if (chartTimeframe ==="TR") setRows(timeRangeData)

      // console.log(rows);
    }, [chartTimeframe, oneHourData, oneDayData, oneWeekData, oneMonthData,timeRangeData]);
    
    // 🔧 Helpers
    const num = (row, ...keys) => {
      for (const k of keys) {
        const v = row?.[k];
        if (v !== undefined && v !== null && v !== "") {
          const n = parseFloat(v);
          if (!isNaN(n)) return n;
        }
      }
      return 0;
    };

    const parseTimestamp = (ts) => {
      if (!ts) return new Date();
      return new Date(ts);
    };

    const timeframeMs =
      chartTimeframe === "1h"
        ? 60 * 60 * 1000
        : chartTimeframe === "1d"
        ? 24 * 60 * 60 * 1000
        : chartTimeframe === "1w"
        ? 7 * 24 * 60 * 60 * 1000
        : chartTimeframe === "1m"
        ? 30 * 24 * 60 * 60 * 1000
        : Number.MAX_SAFE_INTEGER;

    const latestTs =
      rows.length > 0
        ? parseTimestamp(rows[rows.length - 1].TrendDate || rows[rows.length - 1].trend_date)
        : new Date();

    const withinTimeframe = (ts) => {
      const d = parseTimestamp(ts);
      return latestTs.getTime() - d.getTime() <= timeframeMs;
    };

    // console.log(rows);
    const sourceRows = [...rows].sort(
      (a, b) =>
        new Date(a.TrendDate) -
        new Date(b.TrendDate)
    );

    // 📊 Screw Speed
    const screwColor = (v) => {
      if (v === null || v === undefined) return '#94a3b8';
      if (v >= 8 && v <= 14) return '#10b981';
      if (v > 14 && v <= 18) return '#f59e0b';
      if (v > 18) return '#ef4444';
      return '#94a3b8';
    };

    const tempColor = (v) => {
              if (v === null || v === undefined) return '#94a3b8';
              if (v >= 170 && v <= 180) return '#10b981';
              if (v > 180 && v <= 185) return '#f59e0b';
              if (v > 185) return '#ef4444';
              return '#94a3b8';
            };
    
    const motorLoadData = sourceRows
      .map((row) => ({
        timestamp: row.TrendDate || row.trend_date,
        value: num(row, "Motor_load"),
      }))
      .filter((p) => withinTimeframe(p.timestamp));

    const screwSpeedData = sourceRows
      .map((row) => ({
        timestamp: row.TrendDate || row.trend_date,
        value: num(row, "ScrewSpeed_rpm", "screw_rpm"),
      }))
      .filter((p) => withinTimeframe(p.timestamp));

    // 📊 Pressure
    const pressureData = sourceRows
      .map((row) => ({
        timestamp: row.TrendDate || row.trend_date,
        value: num(row, "Pressure_bar", "pressure_bar"),
      }))
      .filter((p) => withinTimeframe(p.timestamp));

    const tempZone1Data = sourceRows
    .map((row) => ({
      timestamp: row.TrendDate || row.trend_date,
      value: num(row, "Temp_Zone1_C", "temp_zone1_c"),
    }))
    .filter((p) => withinTimeframe(p.timestamp));

    const tempZone2Data = sourceRows
      .map((row) => ({
        timestamp: row.TrendDate || row.trend_date,
        value: num(row, "Temp_Zone2_C", "temp_zone2_c"),
      }))
      .filter((p) => withinTimeframe(p.timestamp));

    const tempZone3Data = sourceRows
      .map((row) => ({
        timestamp: row.TrendDate || row.trend_date,
        value: num(row, "Temp_Zone3_C", "temp_zone3_c"),
      }))
      .filter((p) => withinTimeframe(p.timestamp));

    const tempZone4Data = sourceRows
      .map((row) => ({
        timestamp: row.TrendDate || row.trend_date,
        value: num(row, "Temp_Zone4_C", "temp_zone4_c"),
      }))
      .filter((p) => withinTimeframe(p.timestamp));

    const lastScrew = screwSpeedData.at(-1)?.value;
    const lastT1 = tempZone1Data.at(-1)?.value;
    const lastT2 = tempZone2Data.at(-1)?.value;
    const lastT3 = tempZone3Data.at(-1)?.value;
    const lastT4 = tempZone4Data.at(-1)?.value;
    // 📊 Temp Avg
    const tempAvgData = sourceRows
      .map((row) => {
        const t1 = num(row, "Temp_Zone1_C", "temp_zone1_c");
        const t2 = num(row, "Temp_Zone2_C", "temp_zone2_c");
        const t3 = num(row, "Temp_Zone3_C", "temp_zone3_c");
        const t4 = num(row, "Temp_Zone4_C", "temp_zone4_c");

        const avg = (t1 + t2 + t3 + t4) / 4;

        return {
          timestamp: row.TrendDate || row.trend_date,
          value: avg,
        };
      })
      .filter((p) => withinTimeframe(p.timestamp));
    const lastTempAvg = tempAvgData.length > 0 ? tempAvgData[tempAvgData.length - 1].value : null;

    // 📊 Temp Spread
    const tempSpreadData = sourceRows
      .map((row) => {
        const temps = [
          num(row, "Temp_Zone1_C", "temp_zone1_c"),
          num(row, "Temp_Zone2_C", "temp_zone2_c"),
          num(row, "Temp_Zone3_C", "temp_zone3_c"),
          num(row, "Temp_Zone4_C", "temp_zone4_c"),
        ];

        const spread = Math.max(...temps) - Math.min(...temps);

        return {
          timestamp: row.TrendDate || row.trend_date,
          value: spread,
        };
      })
      .filter((p) => withinTimeframe(p.timestamp));

    return (
      <div className="mb-8">
          <div className="mb-4 space-y-4">

            {/* Header Row */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

              <h2 className="text-xl text-slate-900">
                Sensorliniendiagramme
              </h2>

              {/* Timeframe Buttons */}
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(chartTimeFrameValues).map(([key]) => (
                  <button
                    key={key}
                    onClick={() => setChartTimeframe(key)}
                    className={`px-3 py-1.5 rounded-full border transition-colors ${
                      chartTimeframe === key
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>

            </div>

            {/* Filter Form */}
            {chartTimeframe === "TR" && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

                {/* From */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    {t("machineSensorViewer.filters.from")}
                  </label>

                  <input
                    key="fromDate"
                    type="datetime-local"
                    value={filters.datefrom}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        datefrom: e.target.value,
                      }))
                    }
                    className="
                      w-full
                      rounded-xl
                      px-4 py-3
                      bg-white
                      shadow-md
                      hover:shadow-lg
                      focus:outline-none
                      focus:ring-2
                      focus:ring-blue-500/30
                      focus:shadow-xl
                      transition-all
                      duration-300
                    "
                  />
                </div>

                {/* To */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    {t("machineSensorViewer.filters.to")}
                  </label>

                  <input
                    key="toDate"
                    type="datetime-local"
                    value={filters.dateTo}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        dateTo: e.target.value,
                      }))
                    }
                    className="
                      w-full
                      rounded-xl
                      px-4 py-3
                      bg-white
                      shadow-md
                      hover:shadow-lg
                      focus:outline-none
                      focus:ring-2
                      focus:ring-blue-500/30
                      focus:shadow-xl
                      transition-all
                      duration-300
                    "
                  />
                </div>

                {/* Search Button */}
                <div className="flex items-end">
                  <button
                    onClick={handleSearch}
                    className="
                      w-full
                      rounded-xl
                      py-3
                      font-medium
                      text-white
                      bg-violet-600
                      hover:bg-violet-700
                      transition-colors
                    "
                  >
                    {loading
                    ? "Daten werden geladen..."
                    : t("machineSensorViewer.filters.loadData")}
                  </button>
                </div>

              </div>
            )}

            <div className="flex justify-center">
              {loading && (
                <div className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium">
                  Daten werden geladen...
                </div>
              )}

              {!loading &&
                chartTimeframe === "TR" &&
                filters.datefrom &&
                filters.dateTo &&
                timeRangeData.length === 0 && (
                  <div className="px-4 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium">
                    Keine Daten gefunden.
                  </div>
                )}
            </div>

          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">

            <SimpleLiveChart
                key="MotorLoad_amp"
                title="Motorlast (MotorLoad_amp)"
                legend="-"
                data={motorLoadData}
                unit="amp"
                lineColor={machineState === 'PRODUCTION' ? screwColor(lastScrew) : '#10b981'}
                height={300}
                timeFormat={chartTimeframe === 'all' || chartTimeframe === '1w' || chartTimeframe === '1m' ? 'datetime' : 'time'}
            />

            {/* 1. Schneckendrehzahl (ScrewSpeed_rpm) */}
            <SimpleLiveChart
                key="ScrewSpeed_rpm"
                title="Schneckendrehzahl (ScrewSpeed_rpm)"
                legend="Bewertung ohne Baseline: 8–14 rpm 🟢, 14–18 rpm 🟠, >18 rpm 🔴"
                data={screwSpeedData}
                unit="rpm"
                lineColor={machineState === 'PRODUCTION' ? screwColor(lastScrew) : '#10b981'}
                height={300}
                timeFormat={chartTimeframe === 'all' || chartTimeframe === '1w' || chartTimeframe === '1m' ? 'datetime' : 'time'}
            />

            <SimpleLiveChart
                      key="Pressure_bar"
                      title="Schmelzedruck (Pressure_bar)"
                      legend={chartTimeframe}
                      data={pressureData}
                      unit="bar"
                      lineColor={
                        machineState === 'PRODUCTION'
                          ? "#10B981"
                          : '#10b981'
                      }
                      height={300}
                      timeFormat={chartTimeframe === 'all' || chartTimeframe === '1w' || chartTimeframe === '1m' ? 'datetime' : 'time'}
                      // bands={[
                      //   { from: Number.NEGATIVE_INFINITY, to: (pressureConfig?.ranges?.cool?.from ?? 330), color: '#99f6e4', opacity: 0.6 },
                      //   { from: (pressureConfig?.ranges?.critical?.to ?? 410), to: Number.POSITIVE_INFINITY, color: '#fecaca', opacity: 0.6 },
                      //   { from: (pressureConfig?.ranges?.cool?.from ?? 330), to: (pressureConfig?.ranges?.cool?.to ?? 360), color: '#99f6e4', opacity: 0.6 },
                      //   { from: (pressureConfig?.ranges?.medium?.from ?? 360), to: (pressureConfig?.ranges?.medium?.to ?? 380), color: '#bbf7d0', opacity: 0.6 },
                      //   { from: (pressureConfig?.ranges?.hot?.from ?? 380), to: (pressureConfig?.ranges?.hot?.to ?? 395), color: '#fef08a', opacity: 0.6 },
                      //   { from: (pressureConfig?.ranges?.critical?.from ?? 395), to: (pressureConfig?.ranges?.critical?.to ?? 410), color: '#fecaca', opacity: 0.6 },
                      // ]}
                    />

            <SimpleLiveChart
                key="Temp_Zone1_C"
                title="Temp Zone 1"
                legend="170–180°C 🟢, 180–185°C 🟠, >185°C 🔴"
                data={tempZone1Data}
                unit="°C"
                lineColor={machineState === 'PRODUCTION' ? tempColor(lastT1) : '#10b981'}
                height={300}
                timeFormat={chartTimeframe === '1w' || chartTimeframe === '1m' ? 'datetime' : 'time'}
              />

              <SimpleLiveChart
                key="Temp_Zone2_C"
                title="Temp Zone 2"
                legend="170–180°C 🟢, 180–185°C 🟠, >185°C 🔴"
                data={tempZone2Data}
                unit="°C"
                lineColor={machineState === 'PRODUCTION' ? tempColor(lastT2) : '#10b981'}
                height={300}
                timeFormat={chartTimeframe === '1w' || chartTimeframe === '1m' ? 'datetime' : 'time'}
              />

              <SimpleLiveChart
                key="Temp_Zone3_C"
                title="Temp Zone 3"
                legend="170–180°C 🟢, 180–185°C 🟠, >185°C 🔴"
                data={tempZone3Data}
                unit="°C"
                lineColor={machineState === 'PRODUCTION' ? tempColor(lastT3) : '#10b981'}
                height={300}
                timeFormat={chartTimeframe === '1w' || chartTimeframe === '1m' ? 'datetime' : 'time'}
              />

              <SimpleLiveChart
                key="Temp_Zone4_C"
                title="Temp Zone 4"
                legend="170–180°C 🟢, 180–185°C 🟠, >185°C 🔴"
                data={tempZone4Data}
                unit="°C"
                lineColor={machineState === 'PRODUCTION' ? tempColor(lastT4) : '#10b981'}
                height={300}
                timeFormat={chartTimeframe === '1w' || chartTimeframe === '1m' ? 'datetime' : 'time'}
              />
              

              <SimpleLiveChart
                      key="Temp_Avg"
                      title="Durchschnittstemperatur (Temp_Avg)"
                      legend="Bewertung ohne Baseline: 170–180°C 🟢, 180–185°C 🟠, >185°C 🔴"
                      data={tempAvgData}
                      unit="°C"
                      lineColor={machineState === 'PRODUCTION' ? tempColor(lastTempAvg) : '#10b981'}
                      height={300}
                      timeFormat={chartTimeframe === 'all' || chartTimeframe === '1w' || chartTimeframe === '1m' ? 'datetime' : 'time'}
                    />
              <SimpleLiveChart
                      key="Temp_Spread"
                      title="Temperaturspreizung (Temp_Spread)"
                      legend="Bewertung ohne Baseline: ≤5°C 🟢, 5–8°C 🟠, >8°C 🔴"
                      data={tempSpreadData}
                      unit="°C"
                      lineColor='#94a3b8'
                      height={300}
                      timeFormat={chartTimeframe === 'all' || chartTimeframe === '1w' || chartTimeframe === '1m' ? 'datetime' : 'time'}
                    />
          </div>
      </div>
    );
  };

  export default SensorDashboard;