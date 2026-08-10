import { useEffect, useState } from "react";

const MaterialForm = ({
  showForm,
  sensors,
  editingMaterial,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState("");
  const [thresholds, setThresholds] = useState([]);

  useEffect(() => {
    if (editingMaterial) {
      setName(editingMaterial.name || "");
      setThresholds(
        Array.isArray(editingMaterial.thresholds)
          ? editingMaterial.thresholds.map((t) => ({
              sensor_id: t.sensor_id,
              min_value: t.min_value ?? "",
              max_value: t.max_value ?? "",
            }))
          : []
      );
    } else {
      setName("");
      setThresholds(
        (sensors || []).map((s) => ({
          sensor_id: s.id,
          min_value: "",
          max_value: "",
        }))
      );
    }
  }, [editingMaterial, sensors, showForm]);

  const handleChange = (index, field, value) => {
    const updated = [...thresholds];
    updated[index] = { ...updated[index], [field]: value };
    setThresholds(updated);
  };

  const handleSubmit = () => {
    const cleanedThresholds = thresholds
      .filter((t) => t.min_value !== "" && t.max_value !== "")
      .map((t) => ({
        sensor_id: t.sensor_id,
        min_value: Number(t.min_value),
        max_value: Number(t.max_value),
      }));

    onSave({
      name,
      active: editingMaterial?.active ?? false,
      thresholds: cleanedThresholds,
    });
  };

  if (!showForm) return null;

  return (
    <div className="mb-4 rounded-2xl border border-white/10 bg-[#141820] p-4 sm:p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-100">
        {editingMaterial ? "Edit material profile" : "Create material profile"}
      </h2>

      <label className="block text-sm">
        <span className="text-[10px] uppercase tracking-wider text-slate-500">
          Name
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Material name"
          className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1218] px-3 py-2 text-sm text-slate-100"
        />
      </label>

      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {thresholds.length === 0 ? (
          <p className="text-xs text-slate-500">
            No sensors available for threshold mapping.
          </p>
        ) : (
          thresholds.map((t, index) => {
            const sensor = sensors.find(
              (s) => String(s.id) === String(t.sensor_id)
            );
            return (
              <div
                key={String(t.sensor_id)}
                className="rounded-xl border border-white/10 bg-[#1a1f27] p-3"
              >
                <p className="mb-2 text-xs text-slate-300">
                  {sensor?.name || t.sensor_id}
                </p>
                <div className="flex gap-2">
                  <input
                    placeholder="Min"
                    value={t.min_value}
                    onChange={(e) =>
                      handleChange(index, "min_value", e.target.value)
                    }
                    className="w-full rounded-lg border border-white/10 bg-[#0f1218] px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Max"
                    value={t.max_value}
                    onChange={(e) =>
                      handleChange(index, "max_value", e.target.value)
                    }
                    className="w-full rounded-lg border border-white/10 bg-[#0f1218] px-3 py-2 text-sm"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default MaterialForm;
