import { useQuery, useMutation } from '@tanstack/react-query';
import RecipientCard from './recipientCard';
import AddEmailModal from './addEmailModal';
import TestEmailSection from './testEmailSection';
import { useErrorToast } from '../../subComponents/errorToast';
import { useState, useEffect } from 'react';
import safeApi from '../../../api/safeApi';
import { useTranslation } from "react-i18next";


const notification = () => {
    const { t } = useTranslation();
    const [recipients, setRecipients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newEmail, setNewEmail] = useState("");
    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [showAddEmailModal, setShowAddEmailModal] = useState(false);
    const [testEmail, setTestEmail] = useState("");
    const { showError, ErrorComponent } = useErrorToast();


    useEffect(() => {
    const fetchRecipients = async () => {
      try {
        setLoading(true);
        const res = await safeApi.get("/email-recipients");
        setRecipients(res.data || []);
      } catch (error) {
        console.error(error);
        showError("❌ Failed to fetch recipients");
      } finally {
        setLoading(false);
      }
    };

    fetchRecipients();
    }, []);

    const testEmailMutation = useMutation({
        mutationFn: async (email) => {
            const payload = email ? { to: email } : null;

            const res = await safeApi.post(
                "/notifications/test-email",
                payload
            );

            return res.data;
        },

        onSuccess: (data) => {
            showError(
                data?.ok
                    ? `✅ ${t("successSend")}`
                    : `❌ ${t("failSend")}`
            );
        },

        onError: (error) => {
            showError(
                `❌ ${error.response?.data?.detail || error.message}`
            );
        },
    });

    const handleTestEmail = () => {
        testEmailMutation.mutate(testEmail || undefined);
    };

        // Create
    const createRecipientMutation = useMutation({
        mutationFn: (data) => safeApi.post("/email-recipients", data),

        onSuccess: (res) => {
        setRecipients((prev) => [...prev, res.data]);
        setShowAddEmailModal(false);
        showError("✅ Recipient created successfully!");
        },

        onError: (error) => {
        showError(
            `❌ Failed to create: ${
            error.response?.data?.detail || error.message
            }`
        );
        },
    });

    const toggleRecipientMutation = useMutation({
        mutationFn: async ({ id, is_active }) => {
            const res = await safeApi.patch(
                `/email-recipients/${id}`,
                { is_active: !is_active }
            );
            return res.data;
        },

        onSuccess: (res, variables) => {
            // ✅ manual state update
            setRecipients((prev) =>
                prev.map((r) =>
                    r.id === variables.id
                        ? { ...r, is_active: !variables.is_active }
                        : r
                )
            );

            showError("✅ Email recipient status updated!");
        },

        onError: (error) => {
            showError(
                `❌ Failed to update email recipient: ${
                    error.response?.data?.detail || error.message
                }`
            );
        },
    });

    const deleteRecipientMutation = useMutation({
        mutationFn: async (id) => {
            await safeApi.delete(`/email-recipients/${id}`);
            return id; // important for onSuccess
        },

        onSuccess: (id) => {
            // ✅ manual state update
            setRecipients((prev) =>
                prev.filter((r) => r.id !== id)
            );

            showError("✅ Email recipient removed successfully!");
        },

        onError: (error) => {
            showError(
                `❌ Failed to remove email recipient: ${
                    error.response?.data?.detail || error.message
                }`
            );
        },
    });


    const handleAddEmail = () => {
        if (!newEmail) {
            showError(t("emailRequired"));
            return;
        }
        createRecipientMutation.mutate({
            email: newEmail,
            name: newName || null,
            description: newDescription || null,
        });
    };


  return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">{t("notifications")}</h1>
                <p className="text-slate-600 mt-1">{t("manageNotifications")}</p>
            </div>

            {/* Email Recipients Management */}
            <div className="bg-white/90 border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">{t("emailRecipients")}</h2>
                        <p className="text-slate-600 text-sm mt-1">
                            {t("manageRecipients")}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddEmailModal(true)}
                        className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors text-sm"
                    >
                        + {t("addEmail")}
                    </button>
                </div>

                {loading && (
                    <div className="text-center text-slate-400">
                    {t("loadingRecipients")}
                    </div>
                )}

                {/* ✅ EMPTY */}
                {!loading && recipients.length === 0 && (
                    <div className="text-center text-slate-400">
                    {t("noRecipients")}
                    </div>
                )}

                {/* ✅ LIST */}
                {!loading && recipients.length > 0 && (
                    <div className="space-y-3">
                        {recipients.map((recipient) => (
                            < RecipientCard recipient={recipient} toggleRecipientMutation={toggleRecipientMutation} deleteRecipientMutation={deleteRecipientMutation} />
                        ))}
                    </div>
                )}
            </div>

            {/* Add Email Modal */}
            {showAddEmailModal && (
                // <AddEmailModal setShowAddEmailModal={setShowAddEmailModal} newEmail={newEmail} setNewEmail={setNewEmail} newName={newName} setNewName={setNewName} newDescription={setNewDescription} handleAddEmail={handleAddEmail} />
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
                    <h3 className="text-xl font-semibold text-slate-900 mb-4">{t("addEmailRecipient")}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-700 mb-2">
                                {t("emailAddress")} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="recipient@example.com"
                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-700 mb-2">{t("nameOptional")}</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="John Doe"
                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-700 mb-2">{t("descriptionOptional")}</label>
                            <textarea
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                placeholder="Optional notes about this recipient"
                                rows={3}
                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={handleAddEmail}
                                disabled={createRecipientMutation.isPending || !newEmail}
                                className="flex-1 px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                {createRecipientMutation.isPending ? t("loading") : t("addEmail")}
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddEmailModal(false);
                                    setNewEmail("");
                                    setNewName("");
                                    setNewDescription("");
                                }}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
                            >
                                {t("cancel")}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* Email Notifications Test */}
            <TestEmailSection testEmailMutation={testEmailMutation} testEmail={testEmail} setTestEmail={setTestEmail} handleTestEmail={handleTestEmail} createRecipientMutation={createRecipientMutation} />


            {ErrorComponent} 
        </div>
  )
}

export default notification