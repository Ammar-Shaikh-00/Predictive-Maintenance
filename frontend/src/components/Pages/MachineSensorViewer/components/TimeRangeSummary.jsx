import {
  Activity,
  Clock3,
  PlayCircle,
  Power,
  Thermometer,
  Snowflake,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useTranslation } from "react-i18next";

function TimeRangeSummary({
  summaryLoading,
  stats = {},
}) {
  const { t } = useTranslation();

  stats = stats || {};

  const metricCards = [
    {
      title: t("machineSensorViewer.summary.metrics.totalRecords"),
      value: stats.totalRecords || 0,
      subtitle: t("machineSensorViewer.summary.metrics.rowsDetected"),
      description: t("machineSensorViewer.summary.descriptions.totalRecords"),
    },
    {
      title: t("machineSensorViewer.summary.metrics.timeDuration"),
      value: stats.duration || "0m",
      subtitle: t("machineSensorViewer.summary.metrics.selectedRange"),
      description: t("machineSensorViewer.summary.descriptions.timeDuration"),
    },
    {
      title: t("machineSensorViewer.summary.metrics.avgScrewSpeed"),
      value: `${stats.avgScrewSpeed?.toFixed?.(1) ?? 0}`,
      subtitle: "RPM",
      description: t("machineSensorViewer.summary.descriptions.avgScrewSpeed"),
    },
    {
      title: t("machineSensorViewer.summary.metrics.avgPressure"),
      value: `${stats.avgPressure?.toFixed?.(1) ?? 0}`,
      subtitle: t("machineSensorViewer.summary.metrics.average"),
      description: t("machineSensorViewer.summary.descriptions.avgPressure"),
    },
    {
      title: t("machineSensorViewer.summary.metrics.minPressure"),
      value: `${stats.minPressure?.toFixed?.(1) ?? 0}`,
      subtitle: t("machineSensorViewer.summary.metrics.minimum"),
      description: t("machineSensorViewer.summary.descriptions.minPressure"),
    },
    {
      title: t("machineSensorViewer.summary.metrics.maxPressure"),
      value: `${stats.maxPressure?.toFixed?.(1) ?? 0}`,
      subtitle: t("machineSensorViewer.summary.metrics.maximum"),
      description: t("machineSensorViewer.summary.descriptions.maxPressure"),
    },
    {
      title: t("machineSensorViewer.summary.metrics.avgTempZone1"),
      value: `${stats.avgTempZone1?.toFixed?.(1) ?? 0}`,
      subtitle: t("machineSensorViewer.summary.metrics.temperature"),
      description: t("machineSensorViewer.summary.descriptions.avgTempZone1"),
    },
    {
      title: t("machineSensorViewer.summary.metrics.avgTempZone2"),
      value: `${stats.avgTempZone2?.toFixed?.(1) ?? 0}`,
      subtitle: t("machineSensorViewer.summary.metrics.temperature"),
      description: t("machineSensorViewer.summary.descriptions.avgTempZone2"),
    },
    {
      title: t("machineSensorViewer.summary.metrics.avgTempZone3"),
      value: `${stats.avgTempZone3?.toFixed?.(1) ?? 0}`,
      subtitle: t("machineSensorViewer.summary.metrics.temperature"),
      description: t("machineSensorViewer.summary.descriptions.avgTempZone3"),
    },
    {
      title: t("machineSensorViewer.summary.metrics.avgTempZone4"),
      value: `${stats.avgTempZone4?.toFixed?.(1) ?? 0}`,
      subtitle: t("machineSensorViewer.summary.metrics.temperature"),
      description: t("machineSensorViewer.summary.descriptions.avgTempZone4"),
    },
  ];


  const machineStates =
    stats.machineStates || {};

  const stateStyles = {

    OFF: {
      color:
        "bg-slate-100 text-slate-700 border-slate-200",
      icon: Power,
      description:
        t("machineSensorViewer.summary.states.descriptions.off"),
    },

    HEATING: {
      color:
        "bg-orange-100 text-orange-700 border-orange-200",
      icon: Thermometer,
      description:
        t("machineSensorViewer.summary.states.descriptions.heating"),
    },

    READY: {
      color:
        "bg-blue-100 text-blue-700 border-blue-200",
      icon: Activity,
      description:
        t("machineSensorViewer.summary.states.descriptions.ready"),
    },

    COOLING: {
      color:
        "bg-cyan-100 text-cyan-700 border-cyan-200",
      icon: Snowflake,
      description:
        t("machineSensorViewer.summary.states.descriptions.cooling"),
    },

    LOW_PRODUCTION: {
      color:
        "bg-yellow-100 text-yellow-700 border-yellow-200",
      icon: AlertTriangle,
      description:
        t("machineSensorViewer.summary.states.descriptions.lowProduction"),
    },

    PRODUCTION: {
      color:
        "bg-green-100 text-green-700 border-green-200",
      icon: PlayCircle,
      description:
        t("machineSensorViewer.summary.states.descriptions.production"),
    },
  };

  const stateLabels = {
    OFF: t("machineSensorViewer.summary.states.labels.off"),
    HEATING: t("machineSensorViewer.summary.states.labels.heating"),
    READY: t("machineSensorViewer.summary.states.labels.ready"),
    COOLING: t("machineSensorViewer.summary.states.labels.cooling"),
    LOW_PRODUCTION: t("machineSensorViewer.summary.states.labels.lowProduction"),
    PRODUCTION: t("machineSensorViewer.summary.states.labels.production"),
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      {/* <div>

        <h2 className="text-2xl font-bold text-slate-800">
          {t("machineSensorViewer.summary.title")}
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          {t("machineSensorViewer.summary.description")}
        </p>

      </div> */}

      {
        summaryLoading ? (
          <div className="h-[250px] flex items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm">

            <div className="text-slate-500 text-sm">
              {t("machineSensorViewer.summary.loading")}
            </div>

          </div>
        ) : (

          <>
            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">

              {
                metricCards.map((item) => (

                  

                  <div
                    key={item.title}
                    className="
                      bg-white
                      rounded-3xl
                      border
                      border-slate-200
                      shadow-sm
                      hover:shadow-md
                      transition-all
                      p-5
                    "
                  >
                    <div className="relative group">
                      <Info
                        size={15}
                        className="
                          text-slate-400
                          cursor-pointer
                          hover:text-blue-500
                        "
                      />

                      <div
                        className="
                          absolute
                          right-0
                          top-6
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
                        <div className="font-semibold mb-1">
                          Description
                        </div>

                        {item.description}
                      </div>

                    </div>
                    <div className="text-sm text-slate-500 mb-2">
                      {item.title}
                    </div>

                    <div className="text-3xl font-bold text-slate-800">
                      {item.value}
                    </div>

                    <div className="text-xs text-slate-400 mt-2">
                      {item.subtitle}
                    </div>


                    

                  </div>
                ))
              }

            </div>

            {/* Machine States */}
            <div className="
              bg-white
              rounded-3xl
              border
              border-slate-200
              shadow-sm
              p-6
            ">

              {/* Section Header */}
              <div className="flex items-start justify-between gap-4 mb-8">

                <div>

                  <h3 className="text-xl font-semibold text-slate-800">
                    {t("machineSensorViewer.summary.timeline.title")}
                  </h3>

                  <p className="text-sm text-slate-500 mt-2 max-w-3xl leading-relaxed">
                    {t("machineSensorViewer.summary.timeline.description")}
                  </p>

                </div>

                <div className="
                  hidden xl:flex
                  items-center gap-2
                  text-xs
                  text-slate-400
                  bg-slate-50
                  border
                  border-slate-200
                  px-3
                  py-2
                  rounded-2xl
                ">
                  <Clock3 size={14} />
                  {t("machineSensorViewer.summary.timeline.view")}
                </div>

              </div>

              {/* Empty State */}
              {
                Object.keys(machineStates)
                  .length === 0 && (

                  <div className="
                    h-[180px]
                    flex
                    items-center
                    justify-center
                    text-slate-400
                    border
                    border-dashed
                    border-slate-200
                    rounded-3xl
                  ">
                    {t("machineSensorViewer.summary.timeline.noStates")}
                  </div>
                )
              }

              {/* Production Runs */}
              <div className="space-y-8">

                {
                  Object.entries(
                    machineStates
                  ).map(
                    ([runId, states]) => (

                      <div
                        key={runId}
                        className="
                          border
                          border-slate-200
                          rounded-3xl
                          overflow-hidden
                        "
                      >

                        {/* Run Header */}
                        <div className="
                          px-6
                          py-4
                          bg-slate-50
                          border-b
                          border-slate-200
                          flex
                          items-center
                          justify-between
                        ">

                          <div>

                            <h4 className="font-semibold text-slate-800">
                              {runId}
                            </h4>

                            <p className="text-xs text-slate-500 mt-1">
                              {t("machineSensorViewer.summary.timeline.runDescription")}
                            </p>

                          </div>

                        </div>

                        {/* States */}
                        <div className="p-6 space-y-5">

                          {
                            Object.entries(states)
                              .map(
                                ([stateName, ranges]) => {

                                  const translatedStateName =
                                    stateLabels[
                                      stateName.toUpperCase()
                                    ] ||
                                    stateLabels[stateName] ||
                                    stateName.replaceAll("_", " ");

                                  const config =
                                    stateStyles[
                                      stateName
                                    ] || {

                                      color:
                                        "bg-slate-100 text-slate-700 border-slate-200",

                                      icon: Activity,

                                      description:
                                        t("machineSensorViewer.summary.states.descriptions.fallback"),
                                    };

                                  const Icon =
                                    config.icon;

                                  return (

                                    <div
                                      key={stateName}
                                      className="
                                        border
                                        border-slate-100
                                        rounded-2xl
                                        p-5
                                        bg-slate-50
                                      "
                                    >

                                      {/* State Header */}
                                      <div className="
                                        flex
                                        items-start
                                        justify-between
                                        gap-4
                                      ">

                                        <div className="flex items-start gap-4">

                                          <div className={`
                                            p-3
                                            rounded-2xl
                                            border
                                            ${config.color}
                                          `}>
                                            <Icon size={20} />
                                          </div>

                                          <div>

                                            <div className="flex items-center gap-2">

                                              <h5 className="font-semibold text-slate-800">
                                                {
                                                  translatedStateName
                                                }
                                              </h5>

                                              <div className="relative group">

                                                <Info
                                                  size={14}
                                                  className="text-slate-400 cursor-pointer"
                                                />

                                                {/* Tooltip */}
                                                <div className="
                                                  absolute
                                                  z-50
                                                  left-5
                                                  top-0
                                                  w-80
                                                  p-4
                                                  rounded-2xl
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
                                                ">

                                                  <div className="font-semibold mb-2">
                                                    {t("machineSensorViewer.summary.timeline.stateDescription")}
                                                  </div>

                                                  <div className="leading-relaxed text-slate-200">
                                                    {
                                                      config.description
                                                    }
                                                  </div>

                                                </div>

                                              </div>

                                            </div>

                                            <p className="text-xs text-slate-500 mt-1">
                                              {t("machineSensorViewer.summary.timeline.detectedIntervals", {
                                                count: ranges.length,
                                              })}
                                            </p>

                                          </div>

                                        </div>

                                      </div>

                                      {/* Timeline Ranges */}
                                      <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-4">

                                        {
                                          ranges.map(
                                            (
                                              range,
                                              index
                                            ) => (

                                              <div
                                                key={index}
                                                className="
                                                  bg-white
                                                  border
                                                  border-slate-200
                                                  rounded-2xl
                                                  p-4
                                                "
                                              >

                                                <div className="flex items-center justify-between">

                                                  <div>

                                                    <div className="text-xs text-slate-400 mb-1">
                                                      {t("machineSensorViewer.filters.from")}
                                                    </div>

                                                    <div className="text-sm font-medium text-slate-700">
                                                      {
                                                        new Date(
                                                          range.from
                                                        ).toLocaleString()
                                                      }
                                                    </div>

                                                  </div>

                                                  <div className="text-slate-300">
                                                    →
                                                  </div>

                                                  <div className="text-right">

                                                    <div className="text-xs text-slate-400 mb-1">
                                                      {t("machineSensorViewer.filters.to")}
                                                    </div>

                                                    <div className="text-sm font-medium text-slate-700">
                                                      {
                                                        new Date(
                                                          range.to
                                                        ).toLocaleString()
                                                      }
                                                    </div>

                                                  </div>

                                                </div>

                                              </div>
                                            )
                                          )
                                        }

                                      </div>

                                    </div>
                                  );
                                }
                              )
                          }

                        </div>

                      </div>
                    )
                  )
                }

              </div>

            </div>

          </>
        )
      }

    </div>
  );
}

export default TimeRangeSummary;
