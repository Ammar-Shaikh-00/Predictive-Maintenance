import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import safeApi from "../../../api/safeApi";

import FilterForm from "./components/FilterForm";
import SensorTable from "./components/SensorTable";
import SensorCharts from "./components/SensorCharts";
import ExportButtons from "./components/ExportButtons";
import TimeRangeSummary from "./components/TimeRangeSummary";
import DataQualitySummary from "./components/DataQualitySummary";
import SectionCard from "./components/SectionCard";

export default function MachineSensorViewerPage() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);

  const [machines, setMachines] = useState([]);

  const [sensors, setSensors] = useState([]);

  const [tableData, setTableData] = useState([]);

  const [pagination, setPagination] = useState({
    limit: 100,
    offset: 0,
    has_more: false,
  });

  const [summary, setSummary] = useState({
    totalRecords: 0,
    duration: "0m",
    avgScrewSpeed: 0,
    avgPressure: 0,
    avgTempZone1: 0,
    avgTempZone2: 0,
    avgTempZone3: 0,
    avgTempZone4: 0,
    minPressure: 0,
    maxPressure: 0,
    machineStates: {
      OFF: 0,
      Heating: 0,
      Ready: 0,
      Cooling: 0,
      LOW_PRODUCTION: 0,
      PRODUCTION: 0,
    },
  });
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [qualityData, setQualityData] = useState({});
  const [qualityLoading, setQualityLoading] =useState(false);

  const fetchSummary = async () => {
    setSummaryLoading(true);
    if (!filters.machine_id) return;

    if (!filters.datefrom || !filters.dateTo) return;

    try {

      const params = {
        machine_id: filters.machine_id,
        line_id: filters.line_id,
        datefrom: filters.datefrom,
        dateTo: filters.dateTo,
      };

      const res = await safeApi.get(
        "/machine-raw-data/time-range-summary",
        { params }
      );
      console.log(res.data);
      setSummary(res.data);
      // if (!res.data){
      //   fetchSummary();
      
      //   // console.log(res.data);

      // }

      setSummaryLoading(false);
    } catch (err) {

      console.error(err);

      toast.error(
        t("machineSensorViewer.errors.failedLoadSummary")
      );
    }
  };

  const fetchQualitySummary = async () => {

    if (!filters.machine_id) return;

    if (
      !filters.datefrom ||
      !filters.dateTo
    ) return;

    try {

      setQualityLoading(true);

      const params = {
        machine_id:
          filters.machine_id,

        line_id:
          filters.line_id,

        datefrom: new Date(
          filters.datefrom
        ).toISOString(),

        dateTo: new Date(
          filters.dateTo
        ).toISOString(),

        timeout:20000
      };

      const res =
        await safeApi.get(
          "/machine-raw-data/data-quality-summary",
          { params }
        );

        // console.log(res.data);
        // if(!res.data){
        //   fetchQualitySummary();
        // }

      setQualityData(
        res.data
      );

    } catch (err) {

      console.error(err);

      toast.error(
        t("machineSensorViewer.errors.failedLoadQualityReport")
      );

    } finally {

      setQualityLoading(false);
    }
  };


  const [filters, setFilters] = useState({
    machine_id: "",
    line_id: 29,
    datefrom: "",
    dateTo: "",
    sort: "asc",
  });

  /* LOAD INITIAL DATA */
  useEffect(() => {
    fetchMachines();
    fetchSensors();
  }, []);

  const fetchMachines = async () => {
    try {

      const res = await safeApi.get("/machines");

      setMachines(res.data || []);

    } catch (err) {
      console.error(err);
      toast.error(t("machineSensorViewer.errors.failedLoadMachines"));
    }
  };

  const fetchSensors = async () => {
    try {

      const res = await safeApi.get("/default-sensors");

      const mapped =
        (res.data || []).filter(
          (s) =>
            s.map_val &&
            s.map_val.toLowerCase().startsWith("val_")
        );

      setSensors(mapped);

    } catch (err) {
      console.error(err);
      toast.error(t("machineSensorViewer.errors.failedLoadSensors"));
    }
  };

  /* FETCH RAW DATA */
  const fetchRawData = async (
    customOffset = 0
  ) => {

    if (!filters.machine_id) {
      toast.error(t("machineSensorViewer.errors.selectMachine"));
      return;
    }

    if (!filters.datefrom || !filters.dateTo) {
      toast.error(t("machineSensorViewer.errors.selectDateRange"));
      return;
    }

    try {

      setLoading(true);

      const params = {
        ...filters,
        limit: pagination.limit,
        offset: customOffset,
      };

      const res = await safeApi.get(
        "/machine-raw-data",
        { params }
      );

      setTableData(res.data.items || []);
      // console.log(res.data.items);

      setPagination((prev) => ({
        ...prev,
        offset: customOffset,
        has_more: res.data.has_more,
      }));

      // await fetchSummary();
    } catch (err) {
      console.error(err);
      toast.error(t("machineSensorViewer.errors.failedLoadSensorData"));
    } finally {
      setLoading(false);
    }
  };

  /* PAGINATION */
  const nextPage = () => {
    fetchRawData(
      pagination.offset + pagination.limit
    );
  };

  const prevPage = () => {

    const newOffset = Math.max(
      0,
      pagination.offset - pagination.limit
    );

    fetchRawData(newOffset);
  };

  /* SENSOR MAP */
  const sensorMap = useMemo(() => {

    const map = {};

    sensors.forEach((s) => {
      map[s.map_val.toLowerCase()] = {'name':s.name,'unit':s.unit,'description':s.description,'map_val':s.map_val};
    });

    return map;

  }, [sensors]);

  return (
    <div className="p-6 space-y-6">

      {/* PAGE HEADER */}
      <div>

        <h1 className="text-3xl font-bold text-slate-800">
          {t("machineSensorViewer.title")}
        </h1>

        <p className="text-slate-500 mt-2">
          {t("machineSensorViewer.description")}
        </p>

      </div>

      {/* FILTER FORM */}
      <FilterForm
        filters={filters}
        setFilters={setFilters}
        machines={machines}
        onSearch={() => {
          fetchRawData(0);
          fetchSummary();
          fetchQualitySummary();

        }
        }
      />

      
      <SectionCard
        title={t("machineSensorViewer.summary.title")}
        description={t("machineSensorViewer.summary.description")}
      >

        <TimeRangeSummary
          stats={summary}
          summaryLoading={summaryLoading}
        />

      </SectionCard>

      <SectionCard
        title={t("machineSensorViewer.quality.title")}
        description={t("machineSensorViewer.quality.description")}
        defaultOpen={false}
      >

        <DataQualitySummary
          data={qualityData}
          loading={qualityLoading}
        />

      </SectionCard>

      

      <SectionCard
        title="Rohe Sensordaten"
        description="Chronologische Messwerte der Maschinensensoren innerhalb des ausgewählten Bereichs."
        defaultOpen={false}
      >
        {/* EXPORT */}
        <ExportButtons
            filters={filters}
            sensorMap={sensorMap}
        />

        <SensorTable
          loading={loading}
          rows={tableData}
          sensorMap={sensorMap}
          pagination={pagination}
          nextPage={nextPage}
          prevPage={prevPage}
        />

      </SectionCard>

      {/* CHARTS */}
      <SectionCard
        title="Sensorvisualisierungen"
        description="Interaktive Diagramme und Prozessverhaltenstrends."
        defaultOpen={false}
      >

        <SensorCharts
          rows={tableData}
          sensors={sensors}
        />

      </SectionCard>

      

    </div>
  );
}
