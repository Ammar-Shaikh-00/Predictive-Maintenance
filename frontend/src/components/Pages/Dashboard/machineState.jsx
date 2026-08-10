import React from 'react'
import { getMachineStateUI } from '../../../assets/Data/ConstantData'

const machineState = ({machineState, baseLineStatus, profileId, profileStatus}) => {
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/80 shadow-lg hover:shadow-xl transition-all duration-300 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-xl text-slate-900 mb-2">
                Maschinenzustand
              </h3>
              <div className="text-sm text-slate-600 leading-relaxed">
                Zustandsdefinitionen: AUS (Maschine aus/kalt) | BEREIT (Warm/bereit) | AUFHEIZEN (Aufwärmen) | PRODUKTION (Prozess läuft) | ABKÜHLEN (Abkühlen)
              </div>
            </div>
            <div className="text-right lg:text-right">
              <div className="text-sm text-slate-500 mb-2">Aktueller Zustand</div>
              <div className={`inline-block text-xl px-4 py-2 rounded-lg ${
                machineState === 'PRODUCTION' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                machineState === 'HEATING' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                machineState === 'COOLING' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                machineState === 'IDLE' ? 'bg-slate-100 text-slate-800 border border-slate-300' :
                machineState === 'OFF' ? 'bg-red-100 text-red-800 border border-red-300' :
                'bg-gray-100 text-gray-800 border border-gray-300'
              }`}>
                {machineState}
              </div>
              <div className="text-sm text-slate-600 mt-3 space-y-1">
                {<div className="flex items-center gap-2">
                    {getMachineStateUI(machineState)}
                </div>}                
              </div>
              {/* Baseline Status */}
                <div className="mt-3 text-sm">
                  <span className="text-slate-600">Baseline:</span> 
                  <span className={`ml-2 ${
                    baseLineStatus === 'ready' ? 'text-emerald-600' : 
                    baseLineStatus === 'not_ready' ? 'text-amber-600' : 
                    'text-rose-600'
                  }`}>
                    {baseLineStatus === 'ready' ? '✅ Ready' : 
                     baseLineStatus === 'not_ready' ? '⏳ Not Ready' : 
                     '❌ Not Available'}
                  </span>
                </div>
              
              {/* Profile Status */}
                <div className="mt-2 text-sm">
                    <span className="text-slate-600">Profile:</span> 
                    <span className={`ml-2 ${
                    profileStatus === 'active' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {profileStatus === 'active' ? '✅ Active' : '❌ Not Available'}
                  </span>
                  {profileId && (
                    <span className="ml-2 text-xs text-slate-400">(ID: {profileId.substring(0, 8)}...)</span>
                  )}
                  
                </div>
              
                            
            </div>
          </div>
        </div>
  )
}

export default machineState