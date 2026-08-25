import React from "react";

export const InputField = React.memo(({ name, label, value, onChange }) => {
  return (
    <div className="flex flex-col">
      <label className="mb-1 text-sm text-slate-400">{label}</label>
      <input
        name={name}
        value={value || ""}
        onChange={onChange}
        className="rounded-lg border border-white/10 bg-[#0b0d11] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-500/20"
      />
    </div>
  );
});
