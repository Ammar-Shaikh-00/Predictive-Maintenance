import React from 'react'
import { useTranslation } from "react-i18next";


const recipientCard = ({recipient, toggleRecipientMutation, deleteRecipientMutation}) => {
    const { t } = useTranslation();
    const handleToggleActive = (id, is_active) => {
        toggleRecipientMutation.mutate({ id, is_active });
    };
    const handleDeleteEmail = (id) => {
        if (window.confirm(t("confirmDeleteRecipient"))) {
            deleteRecipientMutation.mutate(id);
        }
    };

  return (
    <div
        key={recipient.id}
        className={`p-4 rounded-lg border ${
            recipient.is_active
                ? "bg-slate-50 border-slate-200"
                : "bg-slate-100 border-slate-300 opacity-60"
        }`}
    >
        <div className="flex items-start justify-between">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-900">
                        {recipient.name || recipient.email}
                    </span>
                    {recipient.name && (
                        <span className="text-sm text-slate-500">
                            ({recipient.email})
                        </span>
                    )}
                    <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                            recipient.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-200 text-slate-600"
                        }`}
                    >
                        {recipient.is_active ? t("active") : t("inactive")}
                    </span>
                </div>
                {recipient.description && (
                    <p className="text-sm text-slate-600 mt-1">
                        {recipient.description}
                    </p>
                )}
                <p className="text-xs text-slate-500 mt-2">
                    {t("added")} {new Date(recipient.created_at).toLocaleDateString()}
                </p>
            </div>
            <div className="flex items-center gap-2 ml-4">
                <button
                    onClick={() => handleToggleActive(recipient.id, recipient.is_active)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        recipient.is_active
                            ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                    disabled={toggleRecipientMutation.isPending}
                >
                    {recipient.is_active ? t("disable") : t("enable")}
                </button>
                <button
                    onClick={() => handleDeleteEmail(recipient.id)}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200 transition-colors"
                    disabled={deleteRecipientMutation.isPending}
                >
                    {t("remove")}
                </button>
            </div>
        </div>
    </div>
  )
}

export default recipientCard