// import React, { useEffect, useRef, useState } from "react";
// import safeApi from "../../../api/safeApi";

// const ExtruderLatestValues = () => {
//   const [latestValues, setLatestValues] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [sensorMap, setSensorMap] = useState({})

//   // store previous values
//   const prevValuesRef = useRef({});

//   // track changed keys
//   const [changedKeys, setChangedKeys] = useState([]);

//   // ---------------- FETCH FUNCTION ----------------
//   const fetchValues = async () => {
//     try {
//       const res = await safeApi.get("/dashboard/extruder-latest-values");
//       const sensorMapRespose = await safeApi.get("/default-sensors");

//       if (!res?.data || !res.data.rows) {
//         throw new Error("Invalid API response");
//       }

//       const newValues = res.data.rows;

//       // 🔥 detect changes
//       const changed = [];

//       Object.entries(newValues).forEach(([key, value]) => {
//         if (key === "TrendDate" || key === "Idx") return;

//         if (prevValuesRef.current[key] !== undefined) {
//           if (prevValuesRef.current[key] !== value) {
//             changed.push(key);
//           }
//         }
//       });

//       // update refs + state
//       prevValuesRef.current = newValues;
//       setLatestValues(newValues);
//       setChangedKeys(changed);
//       setError(null);
//       setSensorMap((prev) => sensorMapRespose?.data || prev)

//       // remove highlight after 800ms
//       if (changed.length > 0) {
//         setTimeout(() => setChangedKeys([]), 800);
//       }

//     } catch (err) {
//       console.error(err);
//       setError("Failed to fetch latest values");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ---------------- AUTO REFRESH ----------------
//   useEffect(() => {
//     fetchValues();

//     const interval = setInterval(fetchValues, 3000);
//     return () => clearInterval(interval);
//   }, []);

//   // ---------------- UI STATES ----------------
//   if (loading) {
//     return (
//       <div className="p-4 text-center text-gray-500">
//         Loading latest values...
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="p-4 text-center text-red-500 font-medium">
//         {error}
//       </div>
//     );
//   }

//   const formattedDate = new Date(latestValues?.TrendDate).toLocaleString();

//   return (
//     <div className="p-4 space-y-4">
//       {/* HEADER */}
//       <div className="flex justify-between items-center">
//         <h2 className="text-xl font-semibold text-gray-800">
//           Extruder Latest Values
//         </h2>
//         <span className="text-sm text-gray-500">
//           {formattedDate}
//         </span>
//       </div>

//       {/* CARDS */}
//       <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
//         {Object.entries(latestValues)
//           .filter(([key]) => key !== "TrendDate" && key !== "Idx")
//           .map(([key, value]) => {
//             const isChanged = changedKeys.includes(key);

//             return (
//               <div
//                 key={key}
//                 className={`
//                   rounded-2xl p-4 border transition-all duration-500
//                   ${isChanged 
//                     ? "bg-green-100 border-green-400 scale-105" 
//                     : "bg-white border-gray-200"}
//                 `}
//               >
//                 <p className="text-xs text-gray-500">{key}</p>
//                 <p className="text-lg font-semibold text-gray-800">
//                   {typeof value === "number"
//                     ? value.toFixed(2)
//                     : value}
//                 </p>
//               </div>
//             );
//           })}
//       </div>
//     </div>
//   );
// };

// export default ExtruderLatestValues;





import React, { useEffect, useRef, useState } from "react";
import safeApi from "../../../api/safeApi";

const ExtruderLatestValues = () => {
  const [latestValues, setLatestValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sensorMap, setSensorMap] = useState([]);
  const [showMore, setShowMore] = useState(false);

  const prevValuesRef = useRef({});
  const [changedKeys, setChangedKeys] = useState([]);

  // ---------------- FETCH FUNCTION ----------------
  const fetchValues = async () => {
    try {
      const [res, sensorMapRespose] = await Promise.all([
        safeApi.get("/dashboard/extruder-latest-values"),
        safeApi.get("/default-sensors")
      ]);

      if (!res?.data || !res.data.rows) {
        throw new Error("Invalid API response");
      }

      const newValues = res.data.rows;

      // 🔥 detect changes
      const changed = [];

      Object.entries(newValues).forEach(([key, value]) => {
        if (key === "TrendDate" || key === "Idx") return;

        if (prevValuesRef.current[key] !== undefined) {
          if (prevValuesRef.current[key] !== value) {
            changed.push(key);
          }
        }
      });

      prevValuesRef.current = newValues;
      setLatestValues(newValues);
      setChangedKeys(changed);
      setSensorMap(sensorMapRespose?.data || []);
      setError(null);

      if (changed.length > 0) {
        setTimeout(() => setChangedKeys([]), 800);
      }

    } catch (err) {
      console.error(err);
      setError("Failed to fetch latest values");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- AUTO REFRESH ----------------
  useEffect(() => {
    fetchValues();
    const interval = setInterval(fetchValues, 3000);
    return () => clearInterval(interval);
  }, []);

  // ---------------- UI STATES ----------------
  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading latest values...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500 font-medium">{error}</div>;
  }

  const formattedDate = new Date(latestValues?.TrendDate).toLocaleString("en-GB", {
    timeZone: "UTC"
  });
  console.log(formattedDate,latestValues?.TrendDate);
  // 🔥 Create mapping: Val_X → Sensor Name
  const mappedSensors = {};
  sensorMap.forEach(sensor => {
    mappedSensors[sensor.map_val] = `${sensor.map_val} ➜ ${sensor.name}`;
  });

  // 🔥 Split values
  const mappedEntries = [];
  const otherEntries = [];

  Object.entries(latestValues).forEach(([key, value]) => {
    if (key === "TrendDate" || key === "Idx") return;

    if (mappedSensors[key]) {
      mappedEntries.push([key, value]);
    } else {
      otherEntries.push([key, value]);
    }
  });

  // ---------------- CARD UI ----------------
  const renderCard = (key, value) => {
    const isChanged = changedKeys.includes(key);
    const displayName = mappedSensors[key] || key;

    return (
      <div
        key={key}
        className={`
          rounded-2xl p-4 border transition-all duration-500
          ${isChanged 
            ? "bg-green-100 border-green-400 scale-105" 
            : "bg-white border-gray-200"}
        `}
      >
        <p className="text-xs text-gray-500">{displayName}</p>
        <p className="text-lg font-semibold text-gray-800">
          {typeof value === "number" ? value.toFixed(2) : value}
        </p>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">
          Extruder Latest Values
        </h2>
        <span className="text-sm text-gray-500">{formattedDate}</span>
      </div>

      {/* 🔥 MAPPED SENSOR VALUES */}
      <div>
        <h3 className="text-md font-semibold mb-2 text-gray-700">
          Main Sensors
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {mappedEntries.map(([key, value]) => renderCard(key, value))}
        </div>
      </div>

      {/* 🔥 TOGGLE BUTTON */}
      <div className="text-center">
        <button
          onClick={() => setShowMore(!showMore)}
          className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600 transition"
        >
          {showMore ? "Hide Values" : "More Values"}
        </button>
      </div>

      {/* 🔥 OTHER VALUES */}
      {showMore && (
        <div>
          <h3 className="text-md font-semibold mb-2 text-gray-700">
            Other Values
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {otherEntries.map(([key, value]) => renderCard(key, value))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtruderLatestValues;