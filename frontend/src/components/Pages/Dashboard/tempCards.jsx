import React from 'react'

const tempCards = ({mssqlDerived,machineState}) => {


    // const Card = ({cardData}) => {
        
        
    //     return (
    //         <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/80 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
    //             <div className="text-sm text-slate-600 mb-2">{cardData.title}</div>
    //             <div className="text-5xl mb-3">
    //               <span className={`${cardData.color}`}>
    //                 {cardData.value}
    //               </span>
    //               <span className="text-3xl text-slate-500 ml-2">{cardData.unit}</span>
    //             </div>
    //             <div className="text-xs text-slate-500 mb-1">
    //               {cardData.desc}
    //             </div>
    //             <div className="text-xs text-slate-600">
    //               {cardData.zone}
    //             </div>
    //         </div>
    //     )
    // }

    const mssqlRows = mssqlDerived?.rows || null

  return (
    // <div className="mb-8">
    //       <h2 className="text-xl text-slate-900 mb-4">
    //         Temperaturzonen (Zone 1–4)
    //       </h2>
    //       <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
    //         {tempZoneData.map((zoneData) => (
    //           <Card cardData={zoneData} />
    //         ))}
    //       </div>
    //     </div>

    <div className="mb-8">
          <h2 className="text-xl text-slate-900 mb-4">
            Temperaturzonen (Zone 1–4)
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {['Zone1_C', 'Zone2_C', 'Zone3_C', 'Zone4_C'].map((zone, index) => (
              <div key={zone} className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/80 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                <div className="text-sm text-slate-600 mb-2">Zone {index + 1}</div>
                <div className="text-5xl mb-3">
                  <span className={
                    machineState === 'PRODUCTION' ? 
                    (mssqlDerived?.risk?.sensors[`Temp_${zone}`] === 'red' ? 'text-rose-600' :
                     mssqlDerived?.risk?.sensors[`Temp_${zone}`] === 'yellow' ? 'text-amber-600' :
                     mssqlDerived?.risk?.sensors[`Temp_${zone}`] === 'green' ? 'text-emerald-600' :
                     'text-slate-400') :
                    'text-slate-400'  // Neutral color when not in production
                  }>
                    {mssqlRows?.[0]?.[`Temp_${zone}`] ? parseFloat(mssqlRows[0][`Temp_${zone}`]).toFixed(1) : '--'}
                  </span>
                  <span className="text-3xl text-slate-500 ml-2">°C</span>
                </div>
                <div className="text-xs text-slate-500 mb-1">
                  Berechnung: Direkte Messung von Temperatursensor Zone {index + 1}
                </div>
                <div className="text-xs text-slate-600">
                  {machineState === 'PRODUCTION' ? (
                    <>
                      {mssqlDerived?.risk?.sensors[`Temp_${zone}`] === 'green' && 
                        "🟢 Temperaturzone im materialgerechten Bereich. Saubere Erwärmung ohne Auffälligkeiten."}
                      {mssqlDerived?.risk?.sensors[`Temp_${zone}`] === 'yellow' && 
                        "🟠 Temperaturabweichung festgestellt. Mögliche Änderungen im Heizverhalten oder Materialfluss."}
                      {mssqlDerived?.risk?.sensors[`Temp_${zone}`] === 'red' && 
                        "🔴 Kritische Temperaturabweichung. Risiko für unvollständige Plastifizierung, Materialabbau oder Qualitätsprobleme."}
                    </>
                  ) : (
                    `⏸️ Maschine im ${machineState} Zustand - keine Prozessbewertung`
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
  )
}

export default tempCards