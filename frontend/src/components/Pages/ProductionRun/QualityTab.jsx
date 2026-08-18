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
        toast.error("Failed to fatch quality");
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
        toast.error("Failed to update quality", err);
        console.log(err);
        return
      }
      // console.log(form);
      toast.success("updated successfully.")
  };



  return (
    <div className="space-y-6">

      {/* 🔹 BASIC */}
      <div className="grid grid-cols-3 gap-4">
        <Input name="quality_status" label="Quality Status" form={form} handleChange={handleChange} />
        <Input name="scrap_amount" label="Scrap Amount" form={form} handleChange={handleChange} />
        <Input name="scrap_percentage" label="Scrap %" form={form} handleChange={handleChange} />
      </div>

      {/* 🔹 DEFECTS */}
      <div className="grid grid-cols-2 gap-4">
        <Input name="defect_type" label="Defect Type" form={form} handleChange={handleChange} />
        <Input name="defect_description" label="Defect Description" form={form} handleChange={handleChange} />
      </div>

      {/* 🔹 FLAGS */}
      <div className="grid grid-cols-3 gap-3">
        <Checkbox name="visual_defect_flag" label="Visual Defect" form={form} handleChange={handleChange} />
        <Checkbox name="dimensional_issue_flag" label="Dimensional Issue" form={form} handleChange={handleChange} />
        <Checkbox name="surface_issue_flag" label="Surface Issue" form={form} handleChange={handleChange} />
        <Checkbox name="color_deviation_flag" label="Color Deviation" form={form} handleChange={handleChange} />
        <Checkbox name="density_weight_issue_flag" label="Density/Weight Issue" form={form} handleChange={handleChange} />
      </div>

      {/* 🔹 QC / LAB */}
      <div className="grid grid-cols-2 gap-4">
        <Input name="customer_complaint_reference" label="Customer Complaint Ref" form={form} handleChange={handleChange} />
        <Input name="internal_qc_result" label="Internal QC Result" form={form} handleChange={handleChange} />
        <Input name="lab_result" label="Lab Result" form={form} handleChange={handleChange} />
      </div>

      {/* 🔹 PROCESS ISSUES */}
      <div className="grid grid-cols-3 gap-3">
        <Checkbox name="rework_flag" label="Rework" form={form} handleChange={handleChange} />
        <Checkbox name="downgrade_flag" label="Downgrade" form={form} handleChange={handleChange} />
        <Checkbox name="shift_issue_flag" label="Shift Issue" form={form} handleChange={handleChange} />
        <Checkbox name="changeover_issue_flag" label="Changeover Issue" form={form} handleChange={handleChange} />
        <Checkbox name="stop_start_instability_flag" label="Stop/Start Instability" form={form} handleChange={handleChange} />
      </div>

      {/* 🔹 NOTES */}
      <div>
        <label className="text-sm text-gray-600">Notes</label>
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
        Save Quality
      </button>

    </div>
  );
}