import React from 'react'
import { useTranslation } from "react-i18next";


const testEmailSection = ({testEmail, setTestEmail, handleTestEmail ,testEmailMutation}) => {
    const { t } = useTranslation();
  return (
    <div className="bg-white/90 border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">{t("testEmail")}</h2>
        <p className="text-slate-600 text-sm mb-4">
            {t("testEmailDesc")}
        </p>
        <ul className="text-slate-700 text-sm mb-4 space-y-1 list-disc list-inside">
            <li>{t("userRegistration")}</li>
            <li>{t("aiPredictions")}</li>
            <li>{t("alarmTriggers")}</li>
        </ul>
        <div className="space-y-4">
            <div>
                <label htmlFor="test-email" className="block text-sm text-slate-700 mb-2">{t("testEmailAddress")} </label>
                <input
                    id="test-email"
                    type="email"
                    placeholder="test@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 mt-2 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
                />
                <p className="text-xs text-slate-500 mt-1">
                    {t("emptySendAll")}
                </p>
            </div>
            <button
                onClick={handleTestEmail}
                disabled={testEmailMutation.isPending}
                className="px-6 py-3 bg-purple-700 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
                {testEmailMutation.isPending ? t("sending") : t("sendTestEmail")}
            </button>
        </div>
    </div>

  )
}

export default testEmailSection