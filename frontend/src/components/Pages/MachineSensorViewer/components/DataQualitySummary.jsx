import {
  AlertTriangle,
  Database,
  Activity,
  ShieldAlert,
  Link2Off,
  Copy,
  Waves,
  Info
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function DataQualitySummary({
  data = {},
  loading = false,
}) {
    const { t } = useTranslation();
    data = data || {};
    const {
        totalRecords = 0,
        missingValues = {},
        constantSensors = [],
        unrealisticValues = {},
        duplicatedTimestamps = 0,
        sensorGaps = {},
        unmappedColumns = [],
        suspiciouslyFlatSignals = [],
    } = data;

  

  const cards = [
    {
      title: t("machineSensorViewer.quality.missingValues"),
      value: Object.keys(missingValues).length,
      description: t("machineSensorViewer.quality.descriptions.missingValues"),
      icon: Database,
      color: "bg-amber-50 text-amber-700 border-amber-200",
    },

    {
      title: t("machineSensorViewer.quality.constantSensors"),
      value: constantSensors.length,
      description: t("machineSensorViewer.quality.descriptions.constantSensors"),
      icon: Activity,
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },

    {
      title: t("machineSensorViewer.quality.unrealisticValues"),
      value: Object.keys(unrealisticValues).length,
      description: t("machineSensorViewer.quality.descriptions.unrealisticValues"),
      icon: ShieldAlert,
      color: "bg-red-50 text-red-700 border-red-200",
    },

    {
      title: t("machineSensorViewer.quality.duplicatedTimestamps"),
      value: duplicatedTimestamps,
      description: t("machineSensorViewer.quality.descriptions.duplicatedTimestamps"),
      icon: Copy,
      color: "bg-purple-50 text-purple-700 border-purple-200",
    },

    {
      title: t("machineSensorViewer.quality.sensorGaps"),
      value: Object.keys(sensorGaps).length,
      description: t("machineSensorViewer.quality.descriptions.sensorGaps"),
      icon: AlertTriangle,
      color: "bg-orange-50 text-orange-700 border-orange-200",
    },

    {
      title: t("machineSensorViewer.quality.unmappedColumns"),
      value: unmappedColumns.length,
      description: t("machineSensorViewer.quality.descriptions.unmappedColumns"),
      icon: Link2Off,
      color: "bg-slate-50 text-slate-700 border-slate-200",
    },

    {
      title: t("machineSensorViewer.quality.flatSignals"),
      value: suspiciouslyFlatSignals.length,
      description: t("machineSensorViewer.quality.descriptions.flatSignals"),
      icon: Waves,
      color: "bg-cyan-50 text-cyan-700 border-cyan-200",
    },
  ];



  const renderList = (
    title,
    description,
    items,
    color
  ) => {

    if (
      !items ||
      (
        Array.isArray(items)
          ? items.length === 0
          : Object.keys(items)
              .length === 0
      )
    ) {
      return null;
    }

    return (
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-5">

        <div className="flex items-center justify-between mb-4">

          <h3 className="font-semibold text-slate-800">
            {title}
          </h3>

          <p className="text-xs text-slate-500 mt-1">
            {description}
          </p>

          <span
            className={`text-xs px-2 py-1 rounded-full ${color}`}
          >
            {
              Array.isArray(items)
                ? items.length
                : Object.keys(items)
                    .length
            }
          </span>

        </div>

        <div className="space-y-2 max-h-64 overflow-auto">

          {
            Array.isArray(items)
              ? (
                  items.map(
                    (item) => (
                      <div
                        key={item}
                        className="px-3 py-2 rounded-xl bg-slate-50 text-sm text-slate-700"
                      >
                        {item}
                      </div>
                    )
                  )
                )
              : (
                  Object.entries(
                    items
                  ).map(
                    ([k, v]) => (
                      <div
                        key={k}
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50"
                      >
                        <span className="text-sm text-slate-700">
                          {k}
                        </span>

                        <span className="text-xs font-medium text-slate-500">
                          {
                            typeof v ===
                            "object"
                              ? JSON.stringify(
                                  v
                                )
                              : v
                          }
                        </span>
                      </div>
                    )
                  )
                )
          }

        </div>

      </div>
    );
  };

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">

        {/* <div>

          <h2 className="text-2xl font-bold text-slate-800">
            {t("machineSensorViewer.quality.title")}
          </h2>

          <p className="text-slate-500 mt-1 text-sm">
            {t("machineSensorViewer.quality.description")}
          </p>

        </div> */}

        <div className="bg-slate-100 rounded-2xl px-4 py-2 text-sm text-slate-600">
          {/* {t("machineSensorViewer.quality.totalRecords")}:
          <span className="font-semibold ml-2">
            {totalRecords}
          </span> */}
        </div>

      </div>

      {
        loading ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-500">
            {t("machineSensorViewer.quality.loading")}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

              {
                cards.map(
                  (
                    card
                  ) => {

                    const Icon =
                      card.icon;

                    return (
                      <div
                        key={card.title}
                        className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all"
                      >

                        <div className="flex items-start justify-between">

                          <div>

                            <div className="flex items-center gap-2">

                              <div className="text-sm text-slate-500">
                                {card.title}
                              </div>

                              <div className="relative group">

                                <Info
                                  size={14}
                                  className="
                                    text-slate-400
                                    cursor-pointer
                                    hover:text-blue-500
                                  "
                                />

                                <div
                                  className="
                                    absolute
                                    left-5
                                    top-0
                                    w-72
                                    p-3
                                    rounded-xl
                                    bg-slate-900
                                    text-white
                                    text-xs
                                    shadow-xl
                                    opacity-0
                                    invisible
                                    group-hover:visible
                                    group-hover:opacity-100
                                    transition-all
                                    duration-200
                                    z-50
                                  "
                                >
                                  <div className="font-semibold mb-2">
                                    {t("machineSensorViewer.quality.tooltipTitle")}
                                  </div>

                                  {card.description}
                                </div>

                              </div>

                            </div>

                            <div className="mt-3 text-3xl font-bold text-slate-800">
                              {card.value}
                            </div>

                          </div>

                          <div
                            className={`p-3 rounded-2xl border ${card.color}`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>

                        </div>

                      </div>
                    );
                  }
                )
              }

            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {
                renderList(
                  t("machineSensorViewer.quality.missingValues"),
                  t("machineSensorViewer.quality.descriptions.missingValues"),
                  missingValues,
                  "bg-amber-100 text-amber-700"
                )
              }

              {
                renderList(
                  t("machineSensorViewer.quality.constantSensors"),
                  t("machineSensorViewer.quality.descriptions.constantSensors"),
                  constantSensors,
                  "bg-blue-100 text-blue-700"
                )
              }

              {
                renderList(
                  t("machineSensorViewer.quality.unrealisticValues"),
                  t("machineSensorViewer.quality.descriptions.unrealisticValues"),
                  unrealisticValues,
                  "bg-red-100 text-red-700"
                )
              }

              {
                renderList(
                  t("machineSensorViewer.quality.sensorGaps"),
                  t("machineSensorViewer.quality.descriptions.sensorGaps"),
                  sensorGaps,
                  "bg-orange-100 text-orange-700"
                )
              }

              {
                renderList(
                  t("machineSensorViewer.quality.unmappedColumns"),
                  t("machineSensorViewer.quality.descriptions.unmappedColumns"),
                  unmappedColumns,
                  "bg-slate-100 text-slate-700"
                )
              }

              {
                renderList(
                  t("machineSensorViewer.quality.suspiciouslyFlatSignals"),
                  t("machineSensorViewer.quality.descriptions.flatSignals"),
                  suspiciouslyFlatSignals,
                  "bg-cyan-100 text-cyan-700"
                )
              }

            </div>
          </>
        )
      }

    </div>
  );
}
