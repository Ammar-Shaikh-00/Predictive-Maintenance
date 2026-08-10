import React from 'react'

const topSection = ({ aiStatus,mssqlStatus}) => {
    
  return (
    <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
            <div>
              <h1 className="text-3xl text-slate-900 mb-2">
                Extruder Überwachungsdashboard
              </h1>
              <p className="text-slate-600 text-sm">
                Predictive Maintenance für Kunststoffextrusion
              </p>
            </div>
          </div>
          
          {/* Status Cards Row */}
          <div className="flex flex-wrap gap-4">
            <div className="bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-xl px-5 py-3 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] flex-1 min-w-[180px]">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full $${aiStatus?.color}`}></div>
                <span className="text-xs text-slate-500">KI-DIENST</span>
              </div>
              <div className={`text-base ${aiStatus?.color}`}>
                {aiStatus?.status}
              </div>
            </div>
            <div className="bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-xl px-5 py-3 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] flex-1 min-w-[180px]">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${mssqlStatus?.color}`}></div>
                <span className="text-xs text-slate-500">MSSQL</span>
              </div>
              <div className={`text-base ${
                !mssqlStatus ? 'text-slate-600' :
                (!mssqlStatus?.configured ? 'text-amber-600' : 
                (mssqlStatus?.last_error ? 'text-rose-600' : 'text-emerald-600'))
              }`}>
                {!mssqlStatus
                  ? 'Unbekannt'
                  : (!mssqlStatus.configured ? 'Not configured' : (mssqlStatus.last_error ? 'Mistake' : 'Tied together'))}
              </div>  
            </div>
        
          </div>
        </div>
  )
}

export default topSection