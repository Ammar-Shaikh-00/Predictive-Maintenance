import { useEffect, useState } from "react";

export default function AITab({ runId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`/production-run/${runId}/ai`)
      .then(res => res.json())
      .then(setData);
  }, [runId]);

  if (!data) return "Loading...";

  return (
    <div>
      <div>Profile: {data.detected_profile_id}</div>
      <div>Confidence: {data.confidence}</div>
      <div>Drift: {data.drift_score}</div>
    </div>
  );
}
