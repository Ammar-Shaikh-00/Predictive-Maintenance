import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ProductionRunPage from "./ProductionRun";
import safeApi from "../../../api/safeApi";
import { InputField } from "./InputField";
import toast from "react-hot-toast";

const CreateProductionRun = ({ newRun, onChange, handleCreate, setNewRun }) => {
  const { t } = useTranslation();
  const [machines, setMachines] = useState([]);

  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const res = await safeApi.get("/machines");
        setMachines(res.data || []);
      } catch (err) {
        console.error(err);
        toast.error(t("productionRunDashboard.errors.fetchMachines"));
      }
    };

    fetchMachines();
  }, [t]);

  return (
    <section className="rounded-xl border border-violet-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-950">
            {t("productionRunDashboard.create.title")}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {t("productionRunDashboard.create.description")}
          </p>
        </div>
        <div className="hidden rounded-xl bg-violet-50 p-3 text-violet-600 sm:block">
          <Plus size={22} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InputField
          name="line_id"
          label={t("productionRunDashboard.fields.lineId")}
          value={newRun.line_id}
          onChange={onChange}
        />

        <div className="flex flex-col">
          <label className="mb-1 text-sm text-gray-600">
            {t("productionRunDashboard.fields.machine")}
          </label>
          <select
            value={newRun.machine_id || ""}
            onChange={(e) =>
              setNewRun((prev) => ({
                ...prev,
                machine_id: e.target.value,
              }))
            }
            className="rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            <option value="">{t("productionRunDashboard.fields.selectMachine")}</option>
            {machines.map((machine) => (
              <option key={machine.id} value={machine.id}>
                {machine.name}
              </option>
            ))}
          </select>
        </div>

        <InputField
          name="product_name"
          label={t("productionRunDashboard.fields.productName")}
          value={newRun.product_name}
          onChange={onChange}
        />

        <div className="flex flex-col">
          <label className="mb-1 text-sm text-gray-600">
            {t("productionRunDashboard.fields.startTime")}
          </label>
          <input
            type="datetime-local"
            value={newRun.start_time || ""}
            onChange={(e) =>
              setNewRun((prev) => ({
                ...prev,
                start_time: e.target.value,
              }))
            }
            className="rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
      </div>

      <button
        onClick={() => {
          const lineId = Number(newRun.line_id);

          if (!newRun.line_id || Number.isNaN(lineId) || lineId <= 0) {
            toast.error(t("productionRunDashboard.errors.validLineId"));
            return;
          }

          if (!newRun.machine_id || !newRun.start_time) {
            toast.error(t("productionRunDashboard.errors.machineAndStartTime"));
            return;
          }

          handleCreate();
        }}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
      >
        <Plus size={16} />
        {t("productionRunDashboard.create.button")}
      </button>
    </section>
  );
};

export default function ProductionRunDashboard() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedRunId, setSelectedRunId] = useState(null);
  const urlRunId = searchParams.get("runId");
  const showCreate = searchParams.get("create") === "1";
  const currentRunId = urlRunId || selectedRunId;

  const [newRun, setNewRun] = useState({
    line_id: "",
    machine_id: "",
    product_name: "",
    start_time: "",
  });

  const fetchRuns = useCallback(async () => {
    try {
      const res = await safeApi.get("/production-run?limit=5");
      const data = res.data || [];

      if (data.length > 0 && !selectedRunId) {
        setSelectedRunId(data[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error(t("productionRunDashboard.errors.fetchRuns"));
    }
  }, [selectedRunId, t]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewRun((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRuns();
  }, [fetchRuns]);

  const handleCreate = async () => {
    try {
      const payload = {
        ...newRun,
        line_id: Number(newRun.line_id),
        machine_id: newRun.machine_id,
        start_time: newRun.start_time ? `${newRun.start_time}:00` : null,
      };
      
      const res = await safeApi.post("/production-run", payload);

      setNewRun({
        line_id: "",
        machine_id: "",
        product_name: "",
        start_time: "",
      });
      // if (res.fallback){
      //   console.log(res);
      //   toast.error(res.error);
      //   return
      // }
      setSelectedRunId(res.data.id);
      setSearchParams({ runId: String(res.data.id) });
      fetchRuns();
    } catch (err) {
      // console.log(err);
      toast.error(
        err.response?.data?.detail || t("productionRunDashboard.errors.createRun")
      );
    }
  };

  return (
    <div className="space-y-5 px-2 pb-6 sm:px-0">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <ProductionRunPage runId={currentRunId} />
      </section>

      {showCreate && (
        <CreateProductionRun
          newRun={newRun}
          onChange={handleChange}
          handleCreate={handleCreate}
          setNewRun={setNewRun}
        />
      )}
    </div>
  );
}
