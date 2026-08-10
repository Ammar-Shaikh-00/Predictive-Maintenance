import React from 'react'

const addEmailModal = ({setShowAddEmailModal, newEmail, setNewEmail, newName, setNewName, newDescription, setNewDescription, handleAddEmail, createRecipientMutation } ) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Add Email Recipient</h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-slate-700 mb-2">
                        Email Address <span className="text-red-500">*</span>
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
                    <label className="block text-sm text-slate-700 mb-2">Name (optional)</label>
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
                    />
                </div>
                <div>
                    <label className="block text-sm text-slate-700 mb-2">Description (optional)</label>
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
                        {createRecipientMutation.isPending ? "Adding..." : "Add Email"}
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
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    </div>
  )
}

export default addEmailModal