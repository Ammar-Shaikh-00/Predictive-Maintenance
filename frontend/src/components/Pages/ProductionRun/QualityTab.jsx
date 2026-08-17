import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import safeApi from "../../../api/safeApi";


const Input = ({ name, label, form, handleChange }) => (
  <div className="flex flex-col">
    <label className="text-sm text-gray-600">{label}</label>
    <input
      name={name}
      value={form[name] || ""}
      onChange={handleChange}
      className="border rounded px-3 py-2"
    />
  </div>
);

const Checkbox = ({ name, label, form, handleChange }) => (
  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      name={name}
      checked={form[name] || false}
      onChange={handleChange}
    />
    {label}
  </label>
  );

export default function QualityTab({ runId }) {
  const [form, setForm] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  useEffect(() => {
    const fetchQuality = async (run_id) => {
      try{
        const res = await safeApi.get(`/production-run/${run_id}/quality`);
        setForm((prev)=> res.data || prev);
      }
      catch(err){
        toast.error("Qualität konnte nicht geladen werden");
      }

    }

    fetchQuality(runId);
  
  }, [runId])
  

  const handleSave = async () => {
      // console.log(form);
      try {
        const res = await safeApi.put(`/production-run/${runId}/quality`,form);
        setForm(res.data || {});
      } catch (err) {
        toast.error("Qualität konnte nicht aktualisiert werden", err);
        console.log(err);
        return
      }
      // console.log(form);
      toast.success("Erfolgreich aktualisiert.")
  };



  return (
    <div className="space-y-6">

      {/* 🔹 BASIC */}
      <div className="grid grid-cols-3 gap-4">
        <Input name="quality_status" label="Qualitätsstatus" form={form} handleChange={handleChange} />
        <Input name="scrap_amount" label="Ausschussmenge" form={form} handleChange={handleChange} />
        <Input name="scrap_percentage" label="Ausschuss %" form={form} handleChange={handleChange} />
      </div>

      {/* 🔹 DEFECTS */}
      <div className="grid grid-cols-2 gap-4">
        <Input name="defect_type" label="Fehlertyp" form={form} handleChange={handleChange} />
        <Input name="defect_description" label="Fehlerbeschreibung" form={form} handleChange={handleChange} />
      </div>

      {/* 🔹 FLAGS */}
      <div className="grid grid-cols-3 gap-3">
        <Checkbox name="visual_defect_flag" label="Sichtfehler" form={form} handleChange={handleChange} />
        <Checkbox name="dimensional_issue_flag" label="Maßabweichung" form={form} handleChange={handleChange} />
        <Checkbox name="surface_issue_flag" label="Oberflächenproblem" form={form} handleChange={handleChange} />
        <Checkbox name="color_deviation_flag" label="Farbabweichung" form={form} handleChange={handleChange} />
        <Checkbox name="density_weight_issue_flag" label="Dichte-/Gewichtsproblem" form={form} handleChange={handleChange} />
      </div>

      {/* 🔹 QC / LAB */}
      <div className="grid grid-cols-2 gap-4">
        <Input name="customer_complaint_reference" label="Kundenreklamationsnr." form={form} handleChange={handleChange} />
        <Input name="internal_qc_result" label="Internes QS-Ergebnis" form={form} handleChange={handleChange} />
        <Input name="lab_result" label="Laborergebnis" form={form} handleChange={handleChange} />
      </div>

      {/* 🔹 PROCESS ISSUES */}
      <div className="grid grid-cols-3 gap-3">
        <Checkbox name="rework_flag" label="Nacharbeit" form={form} handleChange={handleChange} />
        <Checkbox name="downgrade_flag" label="Herabstufung" form={form} handleChange={handleChange} />
        <Checkbox name="shift_issue_flag" label="Schichtproblem" form={form} handleChange={handleChange} />
        <Checkbox name="changeover_issue_flag" label="Umrüstproblem" form={form} handleChange={handleChange} />
        <Checkbox name="stop_start_instability_flag" label="Stopp-/Start-Instabilität" form={form} handleChange={handleChange} />
      </div>

      {/* 🔹 NOTES */}
      <div>
        <label className="text-sm text-gray-600">Notizen</label>
        <textarea
          name="notes"
          value={form.notes || ""}
          onChange={handleChange}
          className="border rounded px-3 py-2 w-full"
        />
      </div>

      {/* 🔹 SAVE */}
      <button
        onClick={handleSave}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Qualität speichern
      </button>

    </div>
  );
}
