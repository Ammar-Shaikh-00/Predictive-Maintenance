import React from 'react'
import { useState } from 'react'

const kpiCards = ({currentDashboardData,machineState, mssqlDerived}) => {
    const [pressureConfig, setPressureConfig] = useState({})
    const Card = ({cardData}) =>{

        return (
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/80 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
                <div className="text-sm text-slate-600 mb-3">{cardData.title}</div>
                <div className="text-5xl mb-3">
                    <span className={`${cardData.color}`}>
                    {cardData.value}
                    </span>
                    <span className="text-2xl text-slate-500 ml-2">{cardData.unit}</span>
                </div>
              {/* Baseline Mean */}
                <div className="text-xs text-slate-600 mb-1">
                    {cardData.firstDesc}
                </div>
              
              {/* Green Band */}
                <div className="text-xs text-slate-600 mb-1">
                  {cardData.secondDesc}
                </div>
              
                <div className="text-xs text-slate-600">
                    {cardData.status}
                </div>
            </div>
        </div>
        )
    }

    

  return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/80 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
                <div className="text-sm text-slate-600 mb-3">Motorlast (MotorLoad_amp)</div>
                <div className="text-5xl mb-3">
                <span className={
                    machineState === 'PRODUCTION' ? 
                    (currentDashboardData?.metrics?.Motor_load?.severity === 2 ? 'text-rose-600' :
                    currentDashboardData?.metrics?.Motor_load?.severity === 1 ? 'text-amber-600' :
                    currentDashboardData?.metrics?.Motor_load?.severity === 0 ? 'text-emerald-600' :
                    'text-slate-400') :
                    'text-slate-400'  // Neutral color when not in production
                }>
                    {currentDashboardData?.metrics?.Motor_load?.current_value !== undefined 
                    ? currentDashboardData.metrics.Motor_load.current_value.toFixed(1) 
                    : '--'}
                </span>
                <span className="text-2xl text-slate-500 ml-2">amp</span>
                </div>
                {/* Baseline Mean */}
                {machineState === 'PRODUCTION' && currentDashboardData?.metrics?.Motor_load?.baseline_mean !== undefined && (
                <div className="text-xs text-slate-600 mb-1">
                    Baseline Mean: {currentDashboardData.metrics.Motor_load.baseline_mean?.toFixed(1)} amp
                    {currentDashboardData?.metrics?.Motor_load?.baseline?.baseline_material ? (
                    <span className="text-slate-500"> (Material: {currentDashboardData.metrics.Motor_load.baseline.baseline_material})</span>
                    ) : null}
                </div>
                )}
                {/* Green Band */}
                {machineState === 'PRODUCTION' && currentDashboardData?.metrics?.Motor_load?.green_band && (
                <div className="text-xs text-slate-600 mb-1">
                    Green Band: {currentDashboardData.metrics.Motor_load.green_band.min.toFixed(1)} - {currentDashboardData.metrics.Motor_load.green_band.max.toFixed(1)} amp
                </div>
                )}
                {/* Explanation */}
                {machineState === 'PRODUCTION' && currentDashboardData?.metrics?.Motor_load?.explanation && (
                <div className="text-xs text-slate-600 mt-2">
                    {String(currentDashboardData.metrics.Motor_load.explanation)}
                </div>
                )}
                {/* Deviation */}
                {machineState === 'PRODUCTION' && currentDashboardData?.metrics?.Motor_load?.deviation !== undefined && (
                <div className={`text-xs mb-1 ${
                    Math.abs(currentDashboardData.metrics.Motor_load.deviation) > 5 ? 'text-amber-600' : 'text-slate-600'
                }`}>
                    Deviation: {currentDashboardData.metrics.Motor_load.deviation > 0 ? '+' : ''}{currentDashboardData.metrics.Motor_load.deviation?.toFixed(1)} amp
                </div>
                )}
                <div className="text-xs text-slate-500 mb-1">
                Berechnung: Direkte Messung vom Drehzahlsensor
                </div>
                <div className="text-xs text-slate-500 mb-2">
                Referenz: {machineState === 'PRODUCTION' ? 'Materialabhängiger optimaler Bereich aus Baseline-Daten' : 'Prozessbewertung nur in PRODUCTION Zustand'}
                </div>
                <div className="text-xs text-slate-600">
                {machineState === 'PRODUCTION' ? (
                    <>
                    {currentDashboardData?.metrics?.Motor_load?.severity === 0 && 
                        "🟢 Schneckendrehzahl stabil. Ruhiger Materialdurchsatz im optimalen Bereich für dieses Material."}
                    {currentDashboardData?.metrics?.Motor_load?.severity === 1 && 
                        "🟠 Schneckendrehzahl weicht vom Referenzbereich ab. Mögliche Veränderung des Materialdurchsatzes oder beginnende Prozessinstabilität."}
                    {currentDashboardData?.metrics?.Motor_load?.severity === 2 && 
                        "🔴 Schneckendrehzahl außerhalb des materialabhängigen Betriebsfensters. Risiko für Druckinstabilität, Qualitätsschwankungen oder Werkzeugbelastung."}
                    {currentDashboardData?.metrics?.Motor_load?.severity === undefined && 
                        "⏳ Bewertung wird berechnet..."}
                    </>
                ) : (
                    `⏸️ Maschine im ${machineState} Zustand - keine Prozessbewertung`
                )}
                </div>
            </div>
        </div>
          
          {/* Schneckendrehzahl */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/80 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="text-sm text-slate-600 mb-3">Schneckendrehzahl (ScrewSpeed_rpm)</div>
              <div className="text-5xl mb-3">
                <span className={
                  machineState === 'PRODUCTION' ? 
                  (currentDashboardData?.metrics?.ScrewSpeed_rpm?.severity === 2 ? 'text-rose-600' :
                   currentDashboardData?.metrics?.ScrewSpeed_rpm?.severity === 1 ? 'text-amber-600' :
                   currentDashboardData?.metrics?.ScrewSpeed_rpm?.severity === 0 ? 'text-emerald-600' :
                   'text-slate-400') :
                  'text-slate-400'  // Neutral color when not in production
                }>
                  {currentDashboardData?.metrics?.ScrewSpeed_rpm?.current_value !== undefined 
                    ? currentDashboardData.metrics.ScrewSpeed_rpm.current_value.toFixed(1) 
                    : '--'}
                </span>
                <span className="text-2xl text-slate-500 ml-2">rpm</span>
              </div>
              {/* Baseline Mean */}
              {machineState === 'PRODUCTION' && currentDashboardData?.metrics?.ScrewSpeed_rpm?.baseline_mean !== undefined && (
                <div className="text-xs text-slate-600 mb-1">
                  Baseline Mean: {currentDashboardData.metrics.ScrewSpeed_rpm.baseline_mean?.toFixed(1)} rpm
                  {currentDashboardData?.metrics?.ScrewSpeed_rpm?.baseline?.baseline_material ? (
                    <span className="text-slate-500"> (Material: {currentDashboardData.metrics.ScrewSpeed_rpm.baseline.baseline_material})</span>
                  ) : null}
                </div>
              )}
              {/* Green Band */}
              {machineState === 'PRODUCTION' && currentDashboardData?.metrics?.ScrewSpeed_rpm?.green_band && (
                <div className="text-xs text-slate-600 mb-1">
                  Green Band: {currentDashboardData.metrics.ScrewSpeed_rpm.green_band.min.toFixed(1)} - {currentDashboardData.metrics.ScrewSpeed_rpm.green_band.max.toFixed(1)} rpm
                </div>
              )}
              {/* Explanation */}
              {machineState === 'PRODUCTION' && currentDashboardData?.metrics?.ScrewSpeed_rpm?.explanation && (
                <div className="text-xs text-slate-600 mt-2">
                  {String(currentDashboardData.metrics.ScrewSpeed_rpm.explanation)}
                </div>
              )}
              {/* Deviation */}
              {machineState === 'PRODUCTION' && currentDashboardData?.metrics?.ScrewSpeed_rpm?.deviation !== undefined && (
                <div className={`text-xs mb-1 ${
                  Math.abs(currentDashboardData.metrics.ScrewSpeed_rpm.deviation) > 5 ? 'text-amber-600' : 'text-slate-600'
                }`}>
                  Deviation: {currentDashboardData.metrics.ScrewSpeed_rpm.deviation > 0 ? '+' : ''}{currentDashboardData.metrics.ScrewSpeed_rpm.deviation?.toFixed(1)} rpm
                </div>
              )}
              <div className="text-xs text-slate-500 mb-1">
                Berechnung: Direkte Messung vom Drehzahlsensor
              </div>
              <div className="text-xs text-slate-500 mb-2">
                Referenz: {machineState === 'PRODUCTION' ? 'Materialabhängiger optimaler Bereich aus Baseline-Daten' : 'Prozessbewertung nur in PRODUCTION Zustand'}
              </div>
              <div className="text-xs text-slate-600">
                {machineState === 'PRODUCTION' ? (
                  <>
                    {currentDashboardData?.metrics?.ScrewSpeed_rpm?.severity === 0 && 
                      "🟢 Schneckendrehzahl stabil. Ruhiger Materialdurchsatz im optimalen Bereich für dieses Material."}
                    {currentDashboardData?.metrics?.ScrewSpeed_rpm?.severity === 1 && 
                      "🟠 Schneckendrehzahl weicht vom Referenzbereich ab. Mögliche Veränderung des Materialdurchsatzes oder beginnende Prozessinstabilität."}
                    {currentDashboardData?.metrics?.ScrewSpeed_rpm?.severity === 2 && 
                      "🔴 Schneckendrehzahl außerhalb des materialabhängigen Betriebsfensters. Risiko für Druckinstabilität, Qualitätsschwankungen oder Werkzeugbelastung."}
                    {currentDashboardData?.metrics?.ScrewSpeed_rpm?.severity === undefined && 
                      "⏳ Bewertung wird berechnet..."}
                  </>
                ) : (
                  `⏸️ Maschine im ${machineState} Zustand - keine Prozessbewertung`
                )}
              </div>
            </div>
          </div>

          {/* Schmelzedruck */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/80 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">

              <div className="text-5xl mb-3">
                <span className={
                  machineState === 'PRODUCTION' ? 
                  (currentDashboardData?.metrics?.Pressure_bar?.severity === 2 ? 'text-rose-600' :
                   currentDashboardData?.metrics?.Pressure_bar?.severity === 1 ? 'text-amber-600' :
                   currentDashboardData?.metrics?.Pressure_bar?.severity === 0 ? 'text-emerald-600' :
                   'text-slate-400') :
                  'text-slate-400'  // Neutral color when not in production
                }>
                  {currentDashboardData?.metrics?.Pressure_bar?.current_value !== undefined 
                    ? currentDashboardData.metrics.Pressure_bar.current_value.toFixed(1)  : '--'}
                </span>
                <span className="text-2xl text-slate-500 ml-2">bar</span>
              </div>
              {/* Baseline Mean */}
              {machineState === 'PRODUCTION' && currentDashboardData?.metrics?.Pressure_bar?.baseline_mean !== undefined && (
                <div className="text-xs text-slate-600 mb-1">
                  Baseline Mean: {currentDashboardData.metrics.Pressure_bar.baseline_mean?.toFixed(1)} bar
                  {currentDashboardData?.metrics?.Pressure_bar?.baseline?.baseline_material ? (
                    <span className="text-slate-500"> (Material: {currentDashboardData.metrics.Pressure_bar.baseline.baseline_material})</span>
                  ) : null}
                </div>
              )}
              {/* Green Band */}
              {machineState === 'PRODUCTION' && currentDashboardData?.metrics?.Pressure_bar?.green_band && (
                <div className="text-xs text-slate-600 mb-1">
                  Green Band: {currentDashboardData.metrics.Pressure_bar.green_band.min.toFixed(1)} - {currentDashboardData.metrics.Pressure_bar.green_band.max.toFixed(1)} bar
                </div>
              )}
              {/* Explanation */}
              {machineState === 'PRODUCTION' && currentDashboardData?.metrics?.Pressure_bar?.explanation && (
                <div className="text-xs text-slate-600 mt-2">
                  {String(currentDashboardData.metrics.Pressure_bar.explanation)}
                </div>
              )}
              {/* Deviation */}
              {machineState === 'PRODUCTION' && currentDashboardData?.metrics?.Pressure_bar?.deviation !== undefined && (
                <div className={`text-xs mb-1 ${
                  Math.abs(currentDashboardData.metrics.Pressure_bar.deviation) > 10 ? 'text-amber-600' : 'text-slate-600'
                }`}>
                  Deviation: {currentDashboardData.metrics.Pressure_bar.deviation > 0 ? '+' : ''}{currentDashboardData.metrics.Pressure_bar.deviation?.toFixed(1)} bar
                </div>
              )}
              <div className="text-xs text-slate-500 mb-1">
                Berechnung: Direkte Messung vom Drucksensor im Extruder
              </div>
              <div className="text-xs text-slate-500 mb-2">
                Referenz: {machineState === 'PRODUCTION' ? 'Materialabhängiger optimaler Druckbereich aus historischen Prozessdaten' : 'Prozessbewertung nur in PRODUCTION Zustand'}
              </div>
              <div className="text-xs text-slate-600">
                {machineState === 'PRODUCTION' ? (
                  <>
                    {currentDashboardData?.metrics?.Pressure_bar?.severity === 0 && 
                      "🟢 Prozessdruck stabil. Gleichmäßiger Materialfluss ohne Anzeichen von Verstopfung oder Überlast."}
                    {currentDashboardData?.metrics?.Pressure_bar?.severity === 1 && 
                      "🟠 Abweichender Prozessdruck. Mögliche Änderungen in Materialviskosität, Temperaturverteilung oder beginnende Ablagerungen."}
                    {currentDashboardData?.metrics?.Pressure_bar?.severity === 2 && 
                      "🔴 Kritische Druckabweichung. Erhöhtes Risiko für Werkzeugüberlast, Materialabbau oder Produktionsstopp."}
                    {currentDashboardData?.metrics?.Pressure_bar?.severity === undefined && 
                      "⏳ Bewertung wird berechnet..."}
                  </>
                ) : (
                  `⏸️ Maschine im ${machineState} Zustand - keine Prozessbewertung`
                )}
              </div>
              {/* Druckzonen- und Warnhinweise basierend auf absoluten Grenzwerten */}
              {machineState === 'PRODUCTION' && (
                <div className="text-xs text-slate-700 mt-3 space-y-1">
                  {(() => {
                    const rawValue =
                      currentDashboardData?.metrics?.Pressure_bar?.current_value !== undefined
                        ? currentDashboardData.metrics.Pressure_bar.current_value
                        : NaN;
                    const v = typeof rawValue === 'number' ? rawValue : NaN;
                    const coolFrom = pressureConfig?.ranges?.cool?.from ?? 330;
                    const coolTo = pressureConfig?.ranges?.cool?.to ?? 360;
                    const mediumFrom = pressureConfig?.ranges?.medium?.from ?? 360;
                    const mediumTo = pressureConfig?.ranges?.medium?.to ?? 380;
                    const hotFrom = pressureConfig?.ranges?.hot?.from ?? 380;
                    const hotTo = pressureConfig?.ranges?.hot?.to ?? 395;
                    const criticalFrom = pressureConfig?.ranges?.critical?.from ?? 395;
                    const criticalTo = pressureConfig?.ranges?.critical?.to ?? 410;
                    if (!Number.isFinite(v)) {
                      return null;
                    }
                    if (v >= criticalFrom) {
                      return (
                        <>
                          <div className="font-semibold text-rose-700">Druck über Grenzwert</div>
                          <div className="text-rose-700">Kritisch hoher Druck ({criticalFrom}–{criticalTo} bar)</div>
                        </>
                      );
                    }
                    if (v < coolFrom) {
                      return (
                        <>
                          <div className="font-semibold text-teal-700">Druck unter zulässigem Bereich</div>
                          <div className="text-teal-700">Unter {coolFrom} bar</div>
                        </>
                      );
                    }
                    if (v >= mediumFrom && v < mediumTo) {
                      return (
                        <div className="text-emerald-700">
                          Normaler Produktionsbereich ({mediumFrom}–{mediumTo} bar)
                        </div>
                      );
                    }
                    if (v >= coolFrom && v < coolTo) {
                      return (
                        <div className="text-teal-700">
                          Unterer Bereich ({coolFrom}–{coolTo} bar)
                        </div>
                      );
                    }
                    if (v >= hotFrom && v < hotTo) {
                      return (
                        <div className="text-amber-700">
                          Erhöhter Druck ({hotFrom}–{hotTo} bar)
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Durchschnittstemperatur */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/80 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="text-sm text-slate-600 mb-3">Durchschnittstemperatur (Temp_Avg)</div>
              <div className="text-5xl mb-3">
                <span className={
                  machineState === 'PRODUCTION' ? 
                  (currentDashboardData?.metrics?.Temp_Avg?.severity === 2 ? 'text-rose-600' :
                   currentDashboardData?.metrics?.Temp_Avg?.severity === 1 ? 'text-amber-600' :
                   currentDashboardData?.metrics?.Temp_Avg?.severity === 0 ? 'text-emerald-600' :
                   mssqlDerived?.risk?.overall === 'red' ? 'text-rose-600' :
                   mssqlDerived?.risk?.overall === 'yellow' ? 'text-amber-600' :
                   mssqlDerived?.risk?.overall === 'green' ? 'text-emerald-600' :
                   'text-slate-400') :
                  'text-slate-400'  // Neutral color when not in production
                }>
                  {currentDashboardData?.metrics?.Temp_Avg?.current_value !== undefined 
                    ? currentDashboardData.metrics.Temp_Avg.current_value.toFixed(1) 
                    : (mssqlDerived?.derived?.Temp_Avg?.current?.toFixed(1) || '--')}
                </span>
                <span className="text-2xl text-slate-500 ml-2">°C</span>
              </div>
              <div className="text-xs text-slate-500 mb-1">
                Berechnung: (Zone1 + Zone2 + Zone3 + Zone4) ÷ 4
              </div>
              <div className="text-xs text-slate-500 mb-2">
                Referenz: {machineState === 'PRODUCTION' ? 'Materialabhängiger optimaler Temperaturbereich aus Baseline-Daten' : 'Prozessbewertung nur in PRODUCTION Zustand'}
              </div>
              <div className="text-xs text-slate-600">
                {machineState === 'PRODUCTION' ? (
                  <>
                    {currentDashboardData?.metrics?.Temp_Avg?.severity === 0 && 
                      "🟢 Gesamte Temperatur im optimalen Bereich. Gleichmäßige Plastifizierung sichergestellt."}
                    {currentDashboardData?.metrics?.Temp_Avg?.severity === 1 && 
                      "🟠 Temperatur außerhalb des optimalen Bereichs. Anpassung der Heizzone empfohlen."}
                    {currentDashboardData?.metrics?.Temp_Avg?.severity === 2 && 
                      "🔴 Kritische Temperaturabweichung. Risiko für Materialabbau oder unvollständige Plastifizierung."}
                    {currentDashboardData?.metrics?.Temp_Avg?.severity === undefined && 
                      (mssqlDerived?.derived?.Temp_Avg?.current ? (
                        <>
                          {mssqlDerived?.derived?.Temp_Avg?.current >= 180 && mssqlDerived?.derived?.Temp_Avg?.current <= 220 &&
                            "🟢 Gesamte Temperatur im optimalen Bereich. Gleichmäßige Plastifizierung sichergestellt."}
                          {((mssqlDerived?.derived?.Temp_Avg?.current < 180) || (mssqlDerived?.derived?.Temp_Avg?.current > 220)) &&
                            "🟠 Temperatur außerhalb des optimalen Bereichs. Anpassung der Heizzone empfohlen."}
                          {((mssqlDerived?.derived?.Temp_Avg?.current < 160) || (mssqlDerived?.derived?.Temp_Avg?.current > 240)) &&
                            "🔴 Kritische Temperaturabweichung. Risiko für Materialabbau oder unvollständige Plastifizierung."}
                        </>
                      ) : "⏳ Bewertung wird berechnet...")}
                  </>
                ) : (
                  `⏸️ Maschine im ${machineState} Zustand - keine Prozessbewertung`
                )}
              </div>
            </div>
          </div>

          {/* Temperaturspreizung */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/80 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="text-sm text-slate-600 mb-3">Temperaturspreizung (Temp_Spread)</div>
              <div className="text-5xl mb-3">
                <span className={
                  (machineState === 'PRODUCTION' && currentDashboardData?.spread_status === 'red') ? 'text-rose-600' :
                  (machineState === 'PRODUCTION' && currentDashboardData?.spread_status === 'orange') ? 'text-amber-600' :
                  (machineState === 'PRODUCTION' && currentDashboardData?.spread_status === 'green') ? 'text-emerald-600' :
                  machineState === 'PRODUCTION' ? 
                  ((mssqlDerived?.derived?.Temp_Spread?.current || 0) > 8 ? 'text-rose-600' :
                   (mssqlDerived?.derived?.Temp_Spread?.current || 0) > 5 ? 'text-amber-600' :
                   'text-emerald-600') :
                  'text-slate-400'  // Neutral color when not in production
                }>
                  {currentDashboardData?.metrics?.Temp_Spread?.current_value !== undefined 
                    ? currentDashboardData.metrics.Temp_Spread.current_value.toFixed(1) 
                    : (mssqlDerived?.derived?.Temp_Spread?.current?.toFixed(1) || '--')}
                </span>
                <span className="text-2xl text-slate-500 ml-2">°C</span>
              </div>
              <div className="text-xs text-slate-500 mb-1">
                Berechnung: Max(Zone1-4) - Min(Zone1-4)
              </div>
              <div className="text-xs text-slate-500 mb-2">
                Referenz: {machineState === 'PRODUCTION' ? '≤5°C optimal, ≤8°C akzeptabel, >8°C kritisch' : 'Prozessbewertung nur in PRODUCTION Zustand'}
              </div>
              <div className="text-xs text-slate-600">
                {machineState === 'PRODUCTION' ? (
                  <>
                    {(currentDashboardData?.spread_status === 'green' || (currentDashboardData?.metrics?.Temp_Spread?.current_value || 0) <= 5) && 
                      "🟢 Homogene Temperaturverteilung. Saubere und gleichmäßige Plastifizierung."}
                    {(currentDashboardData?.spread_status === 'orange' || ((currentDashboardData?.metrics?.Temp_Spread?.current_value || 0) > 5 && (currentDashboardData?.metrics?.Temp_Spread?.current_value || 0) <= 8)) && 
                      "🟠 Temperaturzonen beginnen zu divergieren. Mögliche Heiz- oder Regelabweichungen."}
                    {(currentDashboardData?.spread_status === 'red' || (currentDashboardData?.metrics?.Temp_Spread?.current_value || 0) > 8) && 
                      "🔴 Starke Temperaturspreizung. Hohe Wahrscheinlichkeit für Prozessinstabilität, Sensor- oder Heizprobleme."}
                    {currentDashboardData?.spread_status === 'unknown' && 
                      "⏳ Bewertung wird berechnet..."}
                  </>
                ) : (
                  `⏸️ Maschine im ${machineState} Zustand - keine Prozessbewertung`
                )}
              </div>
            </div>
          </div>
        </div>
  )
}

export default kpiCards