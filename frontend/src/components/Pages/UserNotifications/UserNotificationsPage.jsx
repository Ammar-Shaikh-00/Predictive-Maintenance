import { Bell } from "lucide-react";
import { useAuth } from "../../../context/authContext";

/**
 * User-specific notification inbox.
 * Placeholder for system / AI_Model messages targeted at the signed-in user.
 * Settings for email recipients stay on /notification.
 */
export default function UserNotificationsPage() {
  const { user } = useAuth();
  const displayName = user?.name || user?.full_name || user?.email || null;

  // Future: replace with API feed of user-targeted notifications
  const notifications = [];

  return (
    <div className="oc-skin min-h-[calc(100vh-5rem)] px-3 sm:px-4 pb-8 text-slate-100">
      <header className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Persönlich
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
          Benachrichtigungen
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          System- und KI-Hinweise für{" "}
          {displayName ? (
            <span className="text-slate-200">{displayName}</span>
          ) : (
            "Ihren Benutzer"
          )}
          . Keine allgemeinen E-Mail-Empfänger-Einstellungen.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-[#141820] px-4 py-10 sm:px-6">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-[#1a1f27] text-slate-500">
              <Bell size={22} />
            </div>
            <p className="text-lg font-semibold text-white">Leer</p>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Noch keine benutzerspezifischen Benachrichtigungen. Hier erscheinen
              später Hinweise von System und KI-Modell.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li
                key={n.id}
                className="rounded-xl border border-white/10 bg-[#1a1f27] px-4 py-3"
              >
                <p className="text-sm text-slate-100">{n.title}</p>
                {n.body ? (
                  <p className="mt-1 text-xs text-slate-400">{n.body}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
