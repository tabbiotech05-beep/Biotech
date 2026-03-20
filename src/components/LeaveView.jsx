import React, { useState, useEffect } from 'react';
import axios from 'axios';

const statusConfig = {
    pending: { label: 'En attente', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400', icon: '🕐' },
    approved: { label: 'Approuvé', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', icon: '✅' },
    rejected: { label: 'Refusé', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', icon: '❌' },
};

function StatusBadge({ status }) {
    const c = statusConfig[status] || statusConfig.pending;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${c.bg} ${c.text} ${c.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
            {c.label}
        </span>
    );
}

const fmt = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

const daysBetween = (start, end) => Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;

export default function LeaveView() {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ startDate: '', endDate: '', reason: '' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const token = localStorage.getItem('token');
    const headers = { 'x-auth-token': token };

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/leave', { headers });
            setLeaves(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLeaves(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await axios.post('/api/leave', form, { headers });
            setForm({ startDate: '', endDate: '', reason: '' });
            setShowForm(false);
            await fetchLeaves();
        } catch (e) {
            setError(e.response?.data?.msg || 'Erreur lors de l\'envoi');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Annuler cette demande de congé ?')) return;
        try {
            await axios.delete(`/api/leave/${id}`, { headers });
            setLeaves(leaves.filter(l => l._id !== id));
        } catch (e) {
            alert(e.response?.data?.msg || 'Erreur');
        }
    };

    const pending = leaves.filter(l => l.status === 'pending').length;

    return (
        <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                        🏖️ Mes Congés
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {pending > 0
                            ? <span className="text-amber-600 font-semibold">{pending} demande(s) en attente</span>
                            : 'Soumettez et suivez vos demandes de congé'}
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(v => !v)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-95"
                >
                    {showForm ? '✕ Annuler' : '+ Nouvelle demande'}
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 p-6 animate-in fade-in slide-in-from-top-2 duration-200">
                    <h3 className="font-black text-gray-800 mb-4 text-base">Nouvelle demande de congé</h3>
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Date de début</label>
                                <input type="date" required
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                                    value={form.startDate}
                                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Date de fin</label>
                                <input type="date" required
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                                    value={form.endDate}
                                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                                />
                            </div>
                        </div>
                        {form.startDate && form.endDate && new Date(form.endDate) >= new Date(form.startDate) && (
                            <p className="text-xs text-indigo-600 font-bold -mt-2">
                                📅 {daysBetween(form.startDate, form.endDate)} jour(s)
                            </p>
                        )}
                        <div>
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Motif</label>
                            <textarea required rows={3}
                                placeholder="Ex: Congé annuel, raison personnelle..."
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium resize-none"
                                value={form.reason}
                                onChange={e => setForm({ ...form, reason: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={() => setShowForm(false)}
                                className="flex-1 py-3 text-gray-500 font-bold bg-gray-100 rounded-xl hover:bg-gray-200 transition-all text-sm">
                                Annuler
                            </button>
                            <button type="submit" disabled={submitting}
                                className="flex-1 py-3 text-white font-bold bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-500/25 transition-all text-sm disabled:opacity-50">
                                {submitting ? 'Envoi...' : '📤 Envoyer la demande'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="text-center py-16 text-gray-400 font-medium">Chargement...</div>
            ) : leaves.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <div className="text-5xl mb-3">🏖️</div>
                    <p className="text-gray-500 font-medium">Aucune demande de congé</p>
                    <p className="text-sm text-gray-400 mt-1">Cliquez sur "Nouvelle demande" pour commencer</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {leaves.map(leave => {
                        const days = daysBetween(leave.startDate, leave.endDate);
                        const sc = statusConfig[leave.status];
                        return (
                            <div key={leave._id} className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${leave.status === 'pending' ? 'border-amber-100' : leave.status === 'approved' ? 'border-emerald-100' : 'border-red-100'}`}>
                                <div className="flex justify-between items-start flex-wrap gap-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <StatusBadge status={leave.status} />
                                            <span className="text-xs text-gray-400 font-medium">
                                                Soumis le {fmt(leave.createdAt)}
                                            </span>
                                        </div>
                                        <p className="font-black text-gray-900 text-base">
                                            {fmt(leave.startDate)} → {fmt(leave.endDate)}
                                        </p>
                                        <p className="text-xs text-indigo-600 font-bold mt-0.5">{days} jour(s)</p>
                                        <p className="text-sm text-gray-600 mt-2 leading-relaxed">{leave.reason}</p>
                                        {leave.adminComment && (
                                            <div className={`mt-3 p-3 rounded-xl text-xs font-medium border ${sc.bg} ${sc.text} ${sc.border}`}>
                                                💬 <strong>Commentaire admin :</strong> {leave.adminComment}
                                            </div>
                                        )}
                                        {leave.reviewedBy && (
                                            <p className="text-xs text-gray-400 mt-2">
                                                Traité par <strong>{leave.reviewedBy.username}</strong> le {fmt(leave.reviewedAt)}
                                            </p>
                                        )}
                                    </div>
                                    {leave.status === 'pending' && (
                                        <button
                                            onClick={() => handleCancel(leave._id)}
                                            className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-all"
                                        >
                                            Annuler
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
