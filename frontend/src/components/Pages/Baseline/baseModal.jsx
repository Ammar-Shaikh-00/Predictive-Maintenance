import { useState,useEffect } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

const BaselineModal = ({
    isOpen,
    onClose,
    onSave,
    machineStates,
    sensors,
    isLoading,
    isEditing,
    baseline
}) => {
    const [name, setName] = useState("");
    const { t } = useTranslation();
    const [stateData, setStateData] = useState({});

    // INITIALIZE WHEN EDITING
    useEffect(() => {
        if (baseline && isEditing) {
            setName(baseline.baseline_name || "");

            const formatted = {};

            (baseline.mappings || []).forEach((state) => {
                formatted[state.machine_state_id] = {
                    mappings: (state.mappings || []).map((m) => ({
                        sensor_id: m.sensor_id,
                        min_value: m.min_value,
                        max_value: m.max_value
                    }))
                };
            });

            setStateData(formatted);
        } else {
            setName("");
            setStateData({});
        }
    }, [baseline, isEditing]);

    if (!isOpen) return null;



    const handleAddSensor = (stateId) => {
        setStateData((prev) => ({
            ...prev,
            [stateId]: {
                mappings: [
                    ...(prev[stateId]?.mappings || []),
                    { sensor_id: "", min_value: "", max_value: "" }
                ]
            }
        }));
    };

    const handleChange = (stateId, index, field, value) => {
        const updated = [...(stateData[stateId]?.mappings || [])];
        updated[index][field] = value;

        setStateData((prev) => ({
            ...prev,
            [stateId]: {
                mappings: updated
            }
        }));
    };

    const validateStateData = () => {
        if (!stateData || Object.keys(stateData).length === 0) {
            return
        }
        
    }

    const handleSubmit = () => {
        if(!name){
            toast.error(t("messages.name_required"));   
            return
        }


        if (!stateData || Object.keys(stateData).length === 0) {
            toast.error(t("messages.sensor_required"));
            return false;
        }

        // ✅ NEW VALIDATION BLOCK
        for (const [stateId, sensors] of Object.entries(stateData)) {
            if (!sensors?.mappings || sensors.mappings.length === 0) {
                toast.error(t("messages.state_no_sensor") || `Status ${stateId} hat keine Sensoren.`);
                return;
            }

            for (const s of sensors.mappings) {
                if (
                    Number(s.sensor_id) === 0 ||
                    s.min_value === null || s.min_value === "" || isNaN(Number(s.min_value)) ||
                    s.max_value === null || s.max_value === "" || isNaN(Number(s.max_value))
                ) {
                    toast.error(t("messages.sensor_invalid"));
                    return;
                }
            }    
        }
        
        const payload = {
            
            baseline_name: name,  // ✅ FIXED (was name before)
            mappings: Object.entries(stateData).map(
                ([stateId, sensors]) => ({
                    
                    
                    machine_state_id: Number(stateId),

                    mappings: sensors['mappings'].map((s) => ({
                        sensor_id: Number(s.sensor_id),
                        min_value: s.min_value !== null && s.min_value !== undefined ? Number(s.min_value) : null,
                        max_value: s.max_value !== null && s.max_value !== undefined ? Number(s.max_value) : null
                    }))
                })
            )
        };
        console.log(payload);
        onSave(payload);
    };

    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#141820] p-5 text-slate-100 shadow-2xl">

                <h2 className="mb-4 text-lg font-semibold text-slate-50">{isEditing? t("baseline.edit") : t("baseline.create")}</h2>

                {/* Baseline Name */}
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("baseline.name_placeholder")}
                    className="mb-4 w-full rounded-lg border border-white/10 bg-[#0f1218] p-2 text-slate-100"
                />

                {/* Machine States */}
                {machineStates.map((state) => (
                    <div key={state.id} className="mb-4 rounded-xl border border-white/10 bg-[#1a1f27] p-3">

                        <div className="flex justify-between">
                            <h3 className="font-semibold text-slate-100">{state.name}</h3>

                            <button
                                type="button"
                                onClick={() => handleAddSensor(state.id)}
                                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200"
                            >
                                + {t("baseline.add_sensor")}
                            </button>
                        </div>

                        {(stateData[state.id]?.mappings || []).map((sensorRow, i) => (
                            <div key={i} className="mt-2 flex flex-wrap gap-2">

                                {/* Sensor Dropdown */}
                                <select
                                    value={sensorRow.sensor_id || ""}
                                    onChange={(e) =>
                                        handleChange(state.id, i, "sensor_id", e.target.value)
                                    }
                                    className="rounded-lg border border-white/10 bg-[#0f1218] p-2 text-slate-100"
                                >
                                    <option value="">{t("baseline.select_sensor")}</option>
                                    {sensors.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>

                                {/* Min */}
                                <input
                                    type="number"
                                    placeholder={t("baseline.min")}
                                    value={sensorRow.min_value}
                                    onChange={(e) =>
                                        handleChange(state.id, i, "min_value", e.target.value)
                                    }
                                    className="w-24 rounded-lg border border-white/10 bg-[#0f1218] p-2 text-slate-100"
                                />

                                {/* Max */}
                                <input
                                    type="number"
                                    placeholder={t("baseline.max")}
                                    value={sensorRow.max_value}
                                    onChange={(e) =>
                                        handleChange(state.id, i, "max_value", e.target.value)
                                    }
                                    className="w-24 rounded-lg border border-white/10 bg-[#0f1218] p-2 text-slate-100"
                                />
                            </div>
                        ))}
                    </div>
                ))}

                {/* Actions */}
                <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">
                        {t("common.cancel")}
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                        {isLoading ? t("common.saving") : t("common.save")}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BaselineModal;