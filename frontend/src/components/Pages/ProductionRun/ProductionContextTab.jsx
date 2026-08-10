import { useEffect, useState } from "react";
import safeApi from "../../../api/safeApi";
import toast from "react-hot-toast";
import React from "react";
import { InputField } from "./InputField";

function ProductionContextTab({ runData, setRunData }) {
  const [form, setForm] = useState(runData || {});

  useEffect(() => {
    setForm((prev) => runData || prev)
  
    
  }, [runData])
  


  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      const res = await safeApi.put(`/production-run/${form.id}`, form);
      setRunData(res.data);
      toast.success("Saved successfully");
    } catch {
      toast.error("Update failed");
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <InputField name="product_name" label="Product Name" value={form.product_name} onChange={handleChange} />
      <InputField name="product_code" label="Product Code" value={form.product_code} onChange={handleChange} />
      <InputField name="customer_order" label="Customer Order" value={form.customer_order} onChange={handleChange} />
      <InputField name="batch_no" label="Batch" value={form.batch_no} onChange={handleChange} />
      <InputField name="material_type" label="Material Type" value={form.material_type} onChange={handleChange} />
      <InputField name="material_grade" label="Material Grade" value={form.material_grade} onChange={handleChange} />
      <InputField name="supplier" label="Supplier" value={form.supplier} onChange={handleChange} />
      <InputField name="silo_path" label="Silo Path" value={form.silo_path} onChange={handleChange} />

      <button
        onClick={handleSave}
        className="bg-blue-600 text-white p-2 col-span-2 rounded"
      >
        Save
      </button>
    </div>
  );
}

export default React.memo(ProductionContextTab);