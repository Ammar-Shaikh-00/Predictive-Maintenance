import React from 'react'

const Stabilitat = () => {
  return (
    <div className="mb-8">
          <h2 className="text-xl text-slate-900 mb-4">
            Stabilität (Time Spread / Fluktuation)
          </h2>
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/80 shadow-lg">
            <div className="text-xs text-slate-500 mb-4">
              Calculation: stability_ratio = window_std / baseline_std
              <br />
              <span className="ml-2">window_std = Standard Deviation over Sliding Window</span>
              <br />
              <span className="ml-2">baseline_std = Learned Basic Standard Deviation</span>
            </div>
            <div className="text-xs text-slate-500 mb-4">
              Referenz:
              <br />
              <span className="ml-2">🟢 Stable: stability_ratio ≤ 1.2</span>
              <br />
              <span className="ml-2">🟠 Fluctuating: 1.2 &lt; stability_ratio ≤ 1.6</span>
              <br />
              <span className="ml-2">🔴 Unstable: stability_ratio &gt; 1.6</span>
              <br />
              <span className="ml-2 italic text-slate-400">
                Tooltip: Increased fluctuation compared to baseline
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-slate-500 mb-2">Prozessstabilität</div>
                <div className="text-2xl mb-2">
                  <span className={
                    machineState === 'PRODUCTION' ? 
                    (anomaliesCount > 2 ? 'text-rose-600' :
                     anomaliesCount > 0 ? 'text-amber-600' :
                     'text-emerald-600') :
                    'text-slate-400'  // Neutral color when not in production
                  }>
                    {anomaliesCount > 2 ? '🔴 Stark schwankend' :
                     anomaliesCount > 0 ? '🟠 Erhöhte Varianz' :
                     '🟢 Geringe Varianz'}
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  {machineState === 'PRODUCTION' ? (
                    <>
                      {anomaliesCount === 0 && 
                        "🟢 Prozess stabil. Keine ungewöhnlichen Schwankungen."}
                      {anomaliesCount > 0 && anomaliesCount <= 2 && 
                        "🟠 Erhöhte Prozessunruhe. Frühindikator für mögliche Abweichungen."}
                      {anomaliesCount > 2 && 
                        "🔴 Instabiler Prozess. Hohe Wahrscheinlichkeit für Qualitätsprobleme oder Störungen."}
                    </>
                  ) : (
                    `⏸️ Maschine im ${machineState} Zustand - keine Prozessbewertung`
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-2">Anomalien in letzter Zeit</div>
                <div className="text-2xl mb-2">{anomaliesCount}</div>
                <div className="text-xs text-slate-600">
                  Anzahl der erkannten Abweichungen im Analysefenster
                </div>
              </div>
            </div>
          </div>
        </div>
  )
}

export default Stabilitat