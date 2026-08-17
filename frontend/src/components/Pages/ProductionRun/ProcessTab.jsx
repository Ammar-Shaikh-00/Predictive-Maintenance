import { useEffect, useState } from "react";

export default function ProcessTab({ runId }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch(`/production-run/${runId}/process`)
      .then(res => res.json())
      .then(setData);
  }, [runId]);

  return (
    <div>
      <h3 className="font-bold mb-2">Prozessdaten</h3>
      {data.map((row) => (
        <div key={row.id} className="border p-2 mb-2">
          Druck: {row.avg_pressure} | Geschwindigkeit: {row.avg_speed}
        </div>
      ))}
    </div>
  );
}
