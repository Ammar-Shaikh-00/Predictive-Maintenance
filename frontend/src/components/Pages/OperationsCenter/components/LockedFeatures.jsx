import { Lock, Unlock } from "lucide-react";
import { Link } from "react-router-dom";
import { sourceLabel } from "../../../../utils/capabilityEngine";

const STATUS_UI = {
  locked: {
    badge: "Locked",
    className: "border-white/10 bg-[#1a1f27] text-slate-300",
    Icon: Lock,
  },
  partially_available: {
    badge: "In progress",
    className: "border-amber-500/30 bg-amber-500/5 text-amber-100",
    Icon: Lock,
  },
  active: {
    badge: "Active",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
    Icon: Unlock,
  },
};

const FEATURE_LINKS = {
  remaining_useful_life: "/maintenance-history",
  energy_optimization: "/energy",
  quality_degradation_prediction: "/quality-history",
  scrap_prediction: "/quality-history",
  material_behaviour_analysis: "/material-batches",
};

export default function LockedFeatures({ features = [] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#141820] p-4 sm:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
        Unlockable features
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Status from capability engine — unlocks when required sources connect
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => {
          const ui = STATUS_UI[feature.status] || STATUS_UI.locked;
          const Icon = ui.Icon;
          const badge =
            feature.backendStatus && feature.status === "partially_available"
              ? String(feature.backendStatus).replace(/_/g, " ")
              : ui.badge;
          const href = FEATURE_LINKS[feature.key];
          return (
            <div
              key={feature.key}
              className={`rounded-xl border px-3 py-3 ${ui.className}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-4 w-4 shrink-0 opacity-80" />
                  <p className="text-sm font-medium truncate">{feature.name}</p>
                </div>
                <span className="shrink-0 rounded border border-current/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide opacity-80">
                  {badge}
                </span>
              </div>
              <p className="mt-2 text-xs opacity-80">{feature.benefit}</p>
              {feature.missingSources?.length > 0 ? (
                <p className="mt-2 text-[11px] opacity-70">
                  Requires:{" "}
                  {feature.missingSources.map(sourceLabel).join(", ")}
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-emerald-300">
                  Requirements met
                  {href ? (
                    <>
                      {" · "}
                      <Link to={href} className="underline hover:text-emerald-200">
                        Open module
                      </Link>
                    </>
                  ) : null}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
