import React, { useState, useEffect } from 'react';
import axios from 'axios';

const statusConfig = {
    pending: { label: 'En attente', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' },
    approved: { label: 'Approuvé', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    rejected: { label: 'Refusé', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
};

function StatusBadge({ status }) {
    const c = statusConfig[status] || statusConfig.pending;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${c.bg} ${c.text} ${c.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
            {c.label}
        </span>
    );
}

const fmt = d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const daysBetween = (s, e) => Math.ceil((new Date(e) - new Date(s)) / 86400000) + 1;

function ReviewModal({ leave, onClose, onDone }) {
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const headers = { 'x-auth-token': localStorage.getItem('token') };

    const handleAction = async (action) => {
        setLoading(true);
        try {
            await axios.put(`/api/leave/${leave._id}/${action}`, { comment }, { headers });
            onDone();
        } catch (e) {
            alert(e.response?.data?.msg || 'Erreur');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-indigo-600 to-blue-500 text-white">
                    <h3 className="text-xl font-black">Traiter la demande</h3>
                    <p className="text-indigo-100 text-sm mt-1">
                        {leave.user?.username} · {fmt(leave.startDate)} → {fmt(leave.endDate)}
                    </p>
                </div>
                <div className="p-6 space-y-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Motif</p>
                        <p className="text-sm text-gray-700 font-medium">{leave.reason}</p>
                    </div>
                    <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Commentaire (optionnel)</label>
                        <textarea rows={3} placeholder="Laissez un message au délégué..."
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                            value={comment} onChange={e => setComment(e.target.value)} />
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-3 text-gray-500 font-bold bg-gray-100 rounded-xl hover:bg-gray-200 text-sm">Annuler</button>
                        <button onClick={() => handleAction('reject')} disabled={loading}
                            className="flex-1 py-3 text-white font-bold bg-red-500 hover:bg-red-600 rounded-xl shadow-lg shadow-red-500/20 text-sm disabled:opacity-50">❌ Refuser</button>
                        <button onClick={() => handleAction('approve')} disabled={loading}
                            className="flex-1 py-3 text-white font-bold bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 text-sm disabled:opacity-50">✅ Approuver</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LeaveAdminView() {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [expandedUser, setExpandedUser] = useState(null);
    const headers = { 'x-auth-token': localStorage.getItem('token') };

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/leave/all', { headers });
            setLeaves(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLeaves(); }, []);

    // Group leaves by delegate username
    const grouped = leaves.reduce((acc, leave) => {
        const name = leave.user?.username || 'Inconnu';
        if (!acc[name]) acc[name] = [];
        acc[name].push(leave);
        return acc;
    }, {});

    const delegates = Object.entries(grouped).sort((a, b) => {
        // Sort: pending first
        const aPending = a[1].filter(l => l.status === 'pending').length;
        const bPending = b[1].filter(l => l.status === 'pending').length;
        return bPending - aPending;
    });

    const totalPending = leaves.filter(l => l.status === 'pending').length;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                        🏖️ Gestion des Congés
                        {totalPending > 0 && (
                            <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-black rounded-full animate-pulse">
                                {totalPending} en attente
                            </span>
                        )}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {delegates.length} délégué(s) · {leaves.length} demande(s) au total
                    </p>
                </div>
                <button onClick={fetchLeaves}
                    className="px-4 py-2 text-sm bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 border border-gray-200 font-medium">
                    🔄 Actualiser
                </button>
            </div>

            {/* Delegate list */}
            {loading ? (
                <div className="text-center py-16 text-gray-400">Chargement...</div>
            ) : delegates.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <div className="text-5xl mb-3">📭</div>
                    <p className="text-gray-500 font-medium">Aucune demande de congé</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {delegates.map(([username, userLeaves]) => {
                        const pending = userLeaves.filter(l => l.status === 'pending').length;
                        const approved = userLeaves.filter(l => l.status === 'approved').length;
                        const rejected = userLeaves.filter(l => l.status === 'rejected').length;
                        const isExpanded = expandedUser === username;

                        return (
                            <div key={username} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${pending > 0 ? 'border-amber-200' : 'border-gray-100'}`}>
                                {/* Delegate header — always visible */}
                                <button
                                    onClick={() => setExpandedUser(isExpanded ? null : username)}
                                    className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-black text-indigo-600 flex-shrink-0">
                                            {username[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-900">{username}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{userLeaves.length} demande(s)</p>
                                        </div>
                                        <div className="flex gap-2 ml-2 flex-wrap">
                                            {pending > 0 && (
                                                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                                                    🕐 {pending} en attente
                                                </span>
                                            )}
                                            {approved > 0 && (
                                                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                                                    ✅ {approved} approuvé
                                                </span>
                                            )}
                                            {rejected > 0 && (
                                                <span className="px-2.5 py-0.5 bg-red-50 text-red-700 text-xs font-bold rounded-full border border-red-200">
                                                    ❌ {rejected} refusé
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <svg className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Expanded: individual requests */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 divide-y divide-gray-50">
                                        {userLeaves
                                            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                            .map(leave => {
                                                const days = daysBetween(leave.startDate, leave.endDate);
                                                const sc = statusConfig[leave.status];
                                                return (
                                                    <div key={leave._id} className={`p-4 pl-[72px] flex justify-between items-start gap-4 ${leave.status === 'pending' ? 'bg-amber-50/30' : ''}`}>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <StatusBadge status={leave.status} />
                                                                <span className="text-xs text-gray-400">{fmt(leave.createdAt)}</span>
                                                            </div>
                                                            <p className="font-bold text-gray-800 text-sm mt-1.5">
                                                                📅 {fmt(leave.startDate)} → {fmt(leave.endDate)}
                                                                <span className="ml-2 text-indigo-600 text-xs font-bold">({days} j)</span>
                                                            </p>
                                                            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{leave.reason}</p>
                                                            {leave.adminComment && (
                                                                <div className={`mt-2 p-2.5 rounded-xl text-xs font-medium border ${sc.bg} ${sc.text} ${sc.border}`}>
                                                                    💬 {leave.adminComment}
                                                                </div>
                                                            )}
                                                            {leave.reviewedBy && (
                                                                <p className="text-xs text-gray-400 mt-1">
                                                                    Traité par <strong>{leave.reviewedBy.username}</strong> le {fmt(leave.reviewedAt)}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {leave.status === 'pending' && (
                                                            <button
                                                                onClick={() => setSelected(leave)}
                                                                className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 whitespace-nowrap flex-shrink-0"
                                                            >
                                                                Traiter →
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Review modal */}
            {selected && (
                <ReviewModal
                    leave={selected}
                    onClose={() => setSelected(null)}
                    onDone={async () => { setSelected(null); await fetchLeaves(); }}
                />
            )}
        </div>
    );
}
