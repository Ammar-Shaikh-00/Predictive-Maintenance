export const menuData = [
  {
    title: null,
    items: [
      {
        label: "Betriebszentrale",
        icon: "dashboard",
        active: true,
        path: "/",
      },
      {
        label: "Management-Ansicht",
        icon: "executive",
        active: false,
        path: "/executive",
      },
      {
        label: "Produktionen",
        icon: "productionRun",
        active: false,
        path: "/production-run",
        children: [
          {
            label: "Aktueller Lauf",
            icon: "productionRun",
            path: "/production-run",
            active: false,
          },
          {
            label: "Produktionshistorie",
            icon: "productionRun",
            path: "/historical-runs",
            active: false,
          },
        ],
      },
      {
        label: "Wartungszentrum",
        icon: "maintenance",
        active: false,
        path: "/maintenance",
        children: [
          {
            label: "Wartungshistorie",
            icon: "history",
            path: "/maintenance-history",
            active: false,
          },
        ],
      },
      {
        label: "Energiezentrum",
        icon: "energy",
        active: false,
        path: "/energy",
        children: [
          {
            label: "Energiehistorie",
            icon: "history",
            path: "/energy-history",
            active: false,
          },
        ],
      },
      {
        label: "Qualität",
        icon: "quality",
        active: false,
        path: "/quality-history",
      },
      {
        label: "Materialchargen",
        icon: "materialBatches",
        active: false,
        path: "/material-batches",
      },
      {
        label: "Daten exportieren",
        icon: "timeRangeDataView",
        active: false,
        path: "/time-range-data-view",
      },
      {
        label: "Maschinenübersicht",
        icon: "machines",
        path: "/machine",
        active: false,
      },
      {
        label: "Sensorzentrum",
        icon: "sensors",
        path: "/sensor",
        active: false,
      },
      {
        label: "Materialprofile",
        icon: "profile",
        path: "/material",
        active: false,
      },
      {
        label: "Vorhersagen",
        icon: "predictions",
        path: "/prediction",
        active: false,
      },
      {
        label: "Alarme",
        icon: "alarms",
        path: "/alarm",
        active: false,
      },
      {
        label: "Ticket-Center",
        icon: "tickets",
        path: "/ticket",
        active: false,
      },
      {
        label: "Berichte",
        icon: "reports",
        path: "/report",
        active: false,
      },
      {
        label: "Live",
        icon: "liveValue",
        path: "/extruder-latest-values",
        active: false,
        children: [
          {
            label: "Live-Werte",
            icon: "liveValue",
            path: "/extruder-latest-values",
            active: false,
          },
          {
            label: "Live-Abweichungen",
            icon: "liveDeviations",
            path: "/live-deviations",
            active: false,
          },
          {
            label: "Live-Schätzungen",
            icon: "liveEstimations",
            path: "/live-estimations",
            active: false,
          },
        ],
      },
      {
        label: "Basislinien-Manager",
        icon: "baseLine",
        path: "/baseline",
        active: false,
      },
    ],
  },
  {
    title: "KI & Integration",
    items: [
      {
        label: "KI-Dienst",
        icon: "ai",
        path: "/ki",
        active: false,
      },
      {
        label: "Einstellungen",
        icon: "settings",
        path: "#",
        children: [
          {
            label: "Benachrichtigungen",
            icon: "notifications",
            path: "/notification",
            active: false,
          },
          {
            label: "Webhooks",
            icon: "webhooks",
            path: "/webhook",
            active: false,
          },
          {
            label: "Rollen",
            icon: "roles",
            path: "/role",
            active: false,
          },
        ],
      },
    ],
  },
];
export function NavIcon({ name, active, variant = "classic" }) {
    const common = "w-5 h-5";
    const industrial = variant === "industrial";
    const stroke = industrial
        ? active
            ? "#ffffff"
            : "#e2e8f0"
        : active
            ? "#6D28D9"
            : "#8B5CF6";

    const Svg = ({ children }) => (
        <svg
            viewBox="0 0 24 24"
            className={common}
            fill="none"
            stroke={stroke}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {children}
        </svg>
    );

    switch (name) {
        case "home":
            return (
                <Svg>
                    <path d="M3 10.5 12 3l9 7.5" />
                    <path d="M5 9.5V21h14V9.5" />
                </Svg>
            );
        case "dashboard":
            return (
                <Svg>
                    <path d="M4 13V6a2 2 0 0 1 2-2h4v9H4z" />
                    <path d="M14 20v-7h6v5a2 2 0 0 1-2 2h-4z" />
                    <path d="M14 4h4a2 2 0 0 1 2 2v4h-6V4z" />
                    <path d="M4 17h6v3H6a2 2 0 0 1-2-2v-1z" />
                </Svg>
            );
        case "executive":
            return (
                <Svg>
                    <path d="M4 19h16" />
                    <path d="M7 19V9l5-4 5 4v10" />
                    <path d="M10 19v-4h4v4" />
                </Svg>
            );
        case "machines":
            return (
                <Svg>
                    <rect x="4" y="6" width="16" height="10" rx="2" />
                    <path d="M7 20h10" />
                    <path d="M8 10h8" />
                </Svg>
            );
        case "maintenance":
            return (
                <Svg>
                    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-1.8-1.8 2.1-2.1z" />
                </Svg>
            );
        case "history":
            return (
                <Svg>
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 8v4l3 2" />
                </Svg>
            );
        case "energy":
            return (
                <Svg>
                    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
                </Svg>
            );
        case "quality":
            return (
                <Svg>
                    <path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3z" />
                    <path d="m9 12 2 2 4-4" />
                </Svg>
            );
        case "materialBatches":
            return (
                <Svg>
                    <path d="M4 8h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" />
                    <path d="M8 8V6a4 4 0 0 1 8 0v2" />
                </Svg>
            );
        case "sensors":
            return (
                <Svg>
                    <path d="M12 20a8 8 0 1 0-8-8" />
                    <path d="M12 16a4 4 0 1 0-4-4" />
                    <path d="M12 12h.01" />
                </Svg>
            );
        case "predictions":
            return (
                <Svg>
                    <path d="M4 19V5" />
                    <path d="M4 19h16" />
                    <path d="M7 15l3-3 3 2 5-6" />
                </Svg>
            );
        case "alarms":
            return (
                <Svg>
                    <path d="M18 8a6 6 0 1 0-12 0c0 7-2 7-2 7h16s-2 0-2-7" />
                    <path d="M9.5 19a2.5 2.5 0 0 0 5 0" />
                </Svg>
            );
        case "tickets":
            return (
                <Svg>
                    <path d="M4 9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2" />
                    <path d="M6 7v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
                    <path d="M9 11h6" />
                    <path d="M9 15h4" />
                </Svg>
            );
        case "reports":
            return (
                <Svg>
                    <rect x="6" y="4" width="12" height="16" rx="2" />
                    <path d="M9 9h6" />
                    <path d="M9 13h6" />
                    <path d="M9 17h4" />
                </Svg>
            );
        case "ai":
            return (
                <Svg>
                    <path d="M12 3c4 0 8 3 8 7 0 2-1 3-2 4" />
                    <path d="M12 3c-4 0-8 3-8 7 0 3 2 5 5 6" />
                    <path d="M10 21h4" />
                    <path d="M8 14h8" />
                    <path d="M9 10h.01" />
                    <path d="M15 10h.01" />
                </Svg>
            );
        case "settings":
            return (
                <Svg>
                    <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
                    <path d="M19.4 15a1.8 1.8 0 0 0 .4 2l-1.2 2.1a2 2 0 0 1-2.3.9l-1.6-.6a8.2 8.2 0 0 1-1.7 1l-.2 1.7a2 2 0 0 1-2 1.8h-2.4a2 2 0 0 1-2-1.8l-.2-1.7a8.2 8.2 0 0 1-1.7-1l-1.6.6a2 2 0 0 1-2.3-.9L4.2 17a1.8 1.8 0 0 0 .4-2 8 8 0 0 1 0-2l-.4-2 1.2-2.1a2 2 0 0 1 2.3-.9l1.6.6a8.2 8.2 0 0 1 1.7-1l.2-1.7a2 2 0 0 1 2-1.8h2.4a2 2 0 0 1 2 1.8l.2 1.7a8.2 8.2 0 0 1 1.7 1l1.6-.6a2 2 0 0 1 2.3.9l1.2 2.1-.4 2a8 8 0 0 1 0 2z" />
                </Svg>
            );
        case "notifications":
            return (
                <Svg>
                    <path d="M18 8a6 6 0 1 0-12 0c0 7-2 7-2 7h16s-2 0-2-7" />
                    <path d="M9.5 19a2.5 2.5 0 0 0 5 0" />
                </Svg>
            );
        case "webhooks":
            return (
                <Svg>
                    <path d="M10 13a4 4 0 0 1 0-8h3" />
                    <path d="M14 11a4 4 0 0 1 0 8h-3" />
                    <path d="M8.5 10.5 15.5 13.5" />
                </Svg>
            );
        case "roles":
            return (
                <Svg>
                    <path d="M16 11a4 4 0 1 0-8 0" />
                    <path d="M4 21a8 8 0 0 1 16 0" />
                </Svg>
            );
        case "profile":
            return (
                <Svg>
                    <path d="M12 12c2.761 0 5-2.239 5-5S14.761 2 12 2 7 4.239 7 7s2.239 5 5 5zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z"/>
                </Svg>
            )
        case "liveValue":
            return (
                <Svg>
                    {/* outer pulse circle */}
                    <path d="M12 6a6 6 0 1 1-6 6" />
                    
                    {/* inner signal wave */}
                    <path d="M4 12h3l2-3 3 6 2-3h4" />
                    
                    {/* center dot */}
                    <path d="M12 12h.01" />
                </Svg>
            );
        
        case "baseLine":
            return (
                <Svg>
                    {/* baseline (main reference line) */}
                    <path d="M4 18h16" />
                    
                    {/* text blocks sitting on baseline */}
                    <path d="M6 6h6v6H6z" />
                    <path d="M14 8h4v4h-4z" />
                    
                    {/* small guide tick */}
                    <path d="M4 18v2M20 18v2" />
                </Svg>
            );
        case "productionRun":
            return (
                <Svg>
                    {/* outer gear */}
                    <path d="M12 3v2M12 19v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M3 12h2M19 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                    
                    {/* gear body */}
                    <path d="M12 8a4 4 0 1 1 0 8a4 4 0 0 1 0-8z" />
                    
                    {/* play/run triangle */}
                    <path d="M11 10l4 2-4 2z" />
                </Svg>
            );
        case "liveDeviations":
            return (
                <Svg>
                    <path d="M4 5h16v14H4z" />
                    <path d="M7 16V11" />
                    <path d="M11 16V8" />
                    <path d="M15 16v-5" />
                    <path d="M7 7h2M11 7h2M15 7h2" />
                </Svg>
            );
        case "liveEstimations":
            return (
                <Svg>
                    {/* outer pulse circle */}
                    <path d="M12 6a6 6 0 1 1-6 6" />
                    
                    {/* inner signal wave */}
                    <path d="M4 12h3l2-3 3 6 2-3h4" />
                    
                    {/* center dot */}
                    <path d="M12 12h.01" />
                </Svg>
            );
        case "timeRangeDataView":
            return (
                <Svg>
                    {/* outer chart frame */}
                    <path d="M4 5h16v14H4z" />

                    {/* timeline axis */}
                    <path d="M7 17h10" />

                    {/* vertical time markers */}
                    <path d="M8 15v2M12 14v3M16 15v2" />

                    {/* trend line */}
                    <path d="M6 14l3-3 3 2 3-5 3 3" />

                    {/* range selection brackets */}
                    <path d="M6 8v8M18 8v8" />
                </Svg>
            );

        default:
            return null;
    }
}

export const backendURL = "http://localhost:8002"

export const machineCriticalityColor = {
    "high":"#734961"
}

export const getMachineStateUI = (machineState) => {
  const baseClass = "flex items-center gap-2";

  switch (machineState) {
    case "PRODUCTION":
      return (
        <div className={baseClass}>
          <span className="text-emerald-600">🟢</span>
          Prozess aktiv - Ampelbewertung aktiviert
        </div>
      );

    case "HEATING":
      return (
        <div className={baseClass}>
          <span className="text-amber-600">🔥</span>
          Aufwärmen - Vorbereitung auf Produktion
        </div>
      );

    case "COOLING":
      return (
        <div className={baseClass}>
          <span className="text-blue-600">❄️</span>
          Abkühlen - Nachproduktionszyklus
        </div>
      );

    case "IDLE":
      return (
        <div className={baseClass}>
          <span className="text-slate-600">⏸️</span>
          Bereit - Warten auf Produktionsstart
        </div>
      );

    case "OFF":
      return (
        <div className={baseClass}>
          <span className="text-red-600">🔴</span>
          Maschine aus - Keine Heizung aktiv
        </div>
      );

    default:
      return null;
  }
};