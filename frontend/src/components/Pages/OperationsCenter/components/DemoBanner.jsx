import { AlertTriangle } from "lucide-react";

export default function DemoBanner({ visible }) {
  if (!visible) return null;

  return (
    <div
      className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
      role="status"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      <div>
        <p className="font-medium text-amber-200">
          Demo-Modus – simulierte Vorhersagen
        </p>
        <p className="mt-0.5 text-xs text-amber-100/80">
          Erwartete Risiken können noch SIMULIERT sein. Maschinenwerte und Alarme nutzen
          LIVE- / regelbasierte Daten, wenn die Quelle verbunden ist. Dies ist keine
          validierte KI-Genauigkeit.
        </p>
      </div>
    </div>
  );
}
