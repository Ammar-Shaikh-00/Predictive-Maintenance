import React from "react";

export const InputField = React.memo(({ name, label, value, onChange }) => {
  return (
    <div className="flex flex-col">
      <label className="text-sm text-gray-600 mb-1">{label}</label>
      <input
        name={name}
        value={value || ""}
        onChange={onChange}
        className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  );
});