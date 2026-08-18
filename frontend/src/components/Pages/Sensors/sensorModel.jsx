import { useState, useEffect } from "react";

export function SensorModal({
  isOpen,
  onClose,
  sensor,
  onSave,
  isEditing = false,
  machines = [],
  isLoading = false,
}) {

  const [formData, setFormData] = useState({
    name: "",
    map_val: "",
    machine_id: "",
  });

  // Populate form for edit/create
  useEffect(() => {

    if (isEditing && sensor) {

      setFormData({
        name: sensor.name || "",
        map_val: sensor.map_val || "",
        machine_id: sensor.machine_id || "",
        unit: sensor.unit || "",
        description: sensor.description || "",
      });

    } else {

      setFormData({
        name: "",
        map_val: "",
        machine_id:
          machines?.[0]?.id || "",
        unit: "",
        description: "",
      });

    }

  }, [
    sensor,
    isEditing,
    machines,
    isOpen
  ]);


  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return alert(
        "Sensor name required"
      );
    }

    if (!formData.machine_id) {
      return alert(
        "Please select machine"
      );
    }
    console.log(formData);

    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="
      fixed inset-0
      bg-black/60
      backdrop-blur-sm
      flex items-center
      justify-center
      z-50
    ">

      <div className="
        w-[430px]
        bg-slate-900
        border border-slate-700
        rounded-2xl
        p-6
        shadow-2xl
      ">

        <h2 className="
          text-xl
          text-white
          font-semibold
          mb-5
        ">
          {
            isEditing
            ? "Edit Sensor"
            : "Create Sensor"
          }
        </h2>


        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >

          {/* Sensor Name */}

          <div>
            <label className="
              text-sm
              text-slate-400
              block mb-1
            ">
              Sensor Name
            </label>

            <input
              value={formData.name}
              onChange={(e)=>
                setFormData({
                  ...formData,
                  name:e.target.value
                })
              }
              placeholder="Pressure_bar"
              className="
              w-full
              p-3
              rounded-xl
              bg-slate-800
              text-white
              border border-slate-700
              focus:outline-none
              focus:border-emerald-500
              "
            />
          </div>



          {/* Map Value */}

          <div>
            <label className="
              text-sm
              text-slate-400
              block mb-1
            ">
              Map Value
            </label>

            <input
              value={formData.map_val}
              onChange={(e)=>
                setFormData({
                  ...formData,
                  map_val:e.target.value
                })
              }
              placeholder="Val_1"
              className="
              w-full
              p-3
              rounded-xl
              bg-slate-800
              text-white
              border border-slate-700
              focus:outline-none
              focus:border-emerald-500
              "
            />
          </div>


          {/* Machine */}

          <div>

            <label className="
              text-sm
              text-slate-400
              block mb-1
            ">
              Machine
            </label>

            <select
              value={formData.machine_id}
              onChange={(e)=>
                setFormData({
                  ...formData,
                  machine_id:e.target.value
                })
              }
              className="
              w-full
              p-3
              rounded-xl
              bg-slate-800
              text-white
              border border-slate-700
              "
            >

              <option value="">
                Select Machine
              </option>

              {machines.map((m)=>(
                <option
                  key={m.id}
                  value={m.id}
                >
                  {m.name}
                </option>
              ))}

            </select>

          </div>

          <div>
            <label className="
              text-sm
              text-slate-400
              block mb-1
            ">
              Unit
            </label>

            <input
              value={formData.unit}
              onChange={(e)=>
                setFormData({
                  ...formData,
                  unit:e.target.value
                })
              }
              placeholder="unit"
              className="
              w-full
              p-3
              rounded-xl
              bg-slate-800
              text-white
              border border-slate-700
              focus:outline-none
              focus:border-emerald-500
              "
            />
          </div>

          <div>
            <label className="
              text-sm
              text-slate-400
              block mb-1
            ">
              description
            </label>

            <input
              value={formData.description}
              onChange={(e)=>
                setFormData({
                  ...formData,
                  description:e.target.value
                })
              }
              placeholder="description"
              className="
              w-full
              p-3
              rounded-xl
              bg-slate-800
              text-white
              border border-slate-700
              focus:outline-none
              focus:border-emerald-500
              "
            />
          </div>

          {/* Buttons */}

          <div className="
            flex
            justify-end
            gap-3
            pt-4
          ">

            <button
              type="button"
              onClick={onClose}
              className="
              px-4 py-2
              rounded-xl
              bg-slate-700
              hover:bg-slate-600
              text-white
              "
            >
              Cancel
            </button>


            <button
              type="submit"
              disabled={isLoading}
              className="
              px-4 py-2
              rounded-xl
              bg-emerald-600
              hover:bg-emerald-500
              text-white
              disabled:opacity-50
              "
            >

              {
                isLoading
                ? (
                    isEditing
                    ? "Updating..."
                    : "Creating..."
                  )
                : (
                    isEditing
                    ? "Update"
                    : "Create"
                  )
              }

            </button>

          </div>

        </form>

      </div>

    </div>
  );
}