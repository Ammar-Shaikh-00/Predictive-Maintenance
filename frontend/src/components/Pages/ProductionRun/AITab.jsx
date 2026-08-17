import { useEffect, useState } from "react";

export default function AITab({ runId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`/production-run/${runId}/ai`)
      .then(res => res.json())
      .then(setData);
  }, [runId]);

  if (!data) return "Wird geladen...";

  return (
    <div>
      <div>Profil: {data.detected_profile_id}</div>
      <div>Konfidenz: {data.confidence}</div>
      <div>Drift: {data.drift_score}</div>
    </div>
  );
}
