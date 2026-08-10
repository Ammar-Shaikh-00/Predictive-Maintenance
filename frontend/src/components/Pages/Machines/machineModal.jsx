import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

export function MachineModal({
  isOpen,
  onClose,
  onSave,
  machine,
  isEditing = false,
  isLoading = false,
}) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    description: "",
    status: "online",
    criticality: "medium",
    metadata: {},
  });

  // Fill form when editing
  useEffect(() => {
    if (machine && isEditing) {
      setFormData({
        name: machine.name || "",
        location: machine.location || "",
        description: machine.description || "",
        status: machine.status || "online",
        criticality: machine.criticality || "medium",
        metadata: machine.metadata || {},
      });
    } else {
      setFormData({
        name: "",
        location: "",
        description: "",
        status: "online",
        criticality: "medium",
        metadata: {},
      });
    }
  }, [machine, isEditing, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert(t("nameRequired"));
      return;
    }

    onSave(formData); // 🔥 backend ko data bhej raha hai
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-slate-900 p-6 rounded-lg w-[400px]">
        <h2 className="text-lg text-white mb-4">
          {isEditing ? t("editMachine") : t("createMachine")}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name */}
          <input
            type="text"
            placeholder={t("machineName")}  
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            className="w-full p-2 rounded bg-slate-800 text-white"
            disabled={isLoading}
          />

          {/* Location */}
          <input
            type="text"
            placeholder={t("location")}
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
            className="w-full p-2 rounded bg-slate-800 text-white"
            disabled={isLoading}
          />

          {/* Description */}
          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full p-2 rounded bg-slate-800 text-white"
            disabled={isLoading}
          />

          {/* Status */}
          <label className="text-white" htmlFor="selectStatus">{t("status")}</label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value })
            }
            className="w-full p-2 rounded bg-slate-800 text-white"
            disabled={isLoading}
            id="selectStatus"
          >
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="maintenance">Maintenance</option>
            <option value="degraded">Degraded</option>
          </select>

          {/* Criticality */}
          <label className="text-white" htmlFor="selectCriticality">{t("criticality")}</label>
          <select
            value={formData.criticality}
            onChange={(e) =>
              setFormData({ ...formData, criticality: e.target.value })
            }
            className="w-full p-2 rounded bg-slate-800 text-white"
            disabled={isLoading}
            id="selectCriticality"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-gray-600 text-white rounded"
              disabled={isLoading}
            >
              {t("cancel")}
            </button>

            <button
              type="submit"
              className="px-3 py-1 bg-emerald-600 text-white rounded"
              disabled={isLoading}
            >
              {isLoading
                ? t("saving")
                : isEditing
                ? t("update")
                : t("create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}