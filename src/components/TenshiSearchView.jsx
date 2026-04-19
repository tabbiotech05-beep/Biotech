import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const TYPE_STYLE = {
    medecin:   { badge: 'bg-indigo-50 text-indigo-600 border-indigo-200',  dot: '#6366f1', label: 'Médecin'    },
    pharmacie: { badge: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: '#10b981', label: 'Pharmacie'  },
    grossiste: { badge: 'bg-amber-50 text-amber-600 border-amber-200',      dot: '#f59e0b', label: 'Grossiste'  },
};
function typeStyle(t) { return TYPE_STYLE[t?.toLowerCase()] || TYPE_STYLE.medecin; }

export default function TenshiSearchView() {
    const [query, setQuery]         = useState('');
    const [results, setResults]     = useState([]);
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState(null);
    const [selected, setSelected]   = useState(null);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim().length >= 2) {
                doSearch(query.trim());
            } else {
                setResults([]);
                setError(null);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [query]);

    const doSearch = async (q) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(
                `${API_URL}/visits/search-tenshi?q=${encodeURIComponent(q)}`,
                { headers: { 'x-auth-token': token } }
            );
            setResults(res.data);
        } catch (err) {
            setError(err.response?.data?.msg || 'Erreur lors de la recherche.');
        } finally {
            setLoading(false);
        }
    };

    const noResults = !loading && results.length === 0 && query.trim().length >= 2 && !error;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[600px] space-y-6 relative">

            {/* ── Header ─────────────────────────────────────── */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <span className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Recherche</h2>
                </div>
                <p className="text-sm text-gray-500 italic pl-1">
                    Saisissez le nom d'un médecin pour voir les détails des tâches et les délégués associés.
                </p>
            </div>

            {/* ── Search input ────────────────────────────────── */}
            <div className="relative max-w-2xl mx-auto pt-2">
                <input
                    type="text"
                    placeholder="Nom du médecin, pharmacie ou grossiste..."
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-lg font-medium"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    autoFocus
                />
                <div className="absolute left-4 top-1/2 mt-1 -translate-y-1/2 text-slate-400">
                    {loading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    )}
                </div>
            </div>

            {/* ── Error ───────────────────────────────────────── */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium">
                    {error}
                </div>
            )}

            {/* ── No results ──────────────────────────────────── */}
            {noResults && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                    <svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="italic font-medium">Aucun résultat trouvé pour « {query} »</p>
                </div>
            )}

            {/* ── Results table ───────────────────────────────── */}
            {results.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            <tr>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Cible</th>
                                <th className="px-4 py-3">Délégué</th>
                                <th className="px-4 py-3">Détails de la tâche</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {results.map((item, idx) => {
                                const ts = typeStyle(item.targetType);
                                return (
                                    <tr
                                        key={idx}
                                        className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                                        onClick={() => setSelected(item)}
                                    >
                                        {/* Date */}
                                        <td className="px-4 py-4 whitespace-nowrap font-bold text-slate-700">
                                            {item.date}
                                        </td>

                                        {/* Cible */}
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ts.dot }} />
                                                <div>
                                                    <div className="font-black text-indigo-700">{item.target}</div>
                                                    <span className={`inline-flex mt-0.5 px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase ${ts.badge}`}>
                                                        {ts.label}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Délégué */}
                                        <td className="px-4 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                {item.delegate}
                                            </span>
                                        </td>

                                        {/* Détails */}
                                        <td className="px-4 py-4 text-slate-500 max-w-xs">
                                            <p className="line-clamp-2 text-[11px] leading-relaxed" title={item.task}>
                                                {item.task || <span className="italic text-slate-300">Aucun détail</span>}
                                            </p>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {results.length} résultat{results.length > 1 ? 's' : ''} — Cliquez sur une ligne pour voir les détails
                    </div>
                </div>
            )}

            {/* ── Detail Modal ─────────────────────────────────── */}
            {selected && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
                    onClick={() => setSelected(null)}
                >
                    <div
                        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div className="relative bg-gradient-to-br from-indigo-600 to-violet-700 p-8 pt-7 flex items-end">
                            <button
                                onClick={() => setSelected(null)}
                                className="absolute top-5 right-5 p-2 rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg text-indigo-600 flex-shrink-0">
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-white text-xl font-black leading-tight">{selected.target}</h3>
                                    <span className={`inline-flex mt-1 px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${typeStyle(selected.targetType).badge}`}>
                                        {typeStyle(selected.targetType).label}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Modal body */}
                        <div className="p-8 space-y-6">

                            {/* Date + Délégué */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 rounded-2xl p-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date de la visite</p>
                                    <p className="text-slate-800 font-bold">{selected.date}</p>
                                </div>
                                <div className="bg-indigo-50 rounded-2xl p-4">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Délégué</p>
                                    <p className="text-indigo-800 font-black">{selected.delegate}</p>
                                </div>
                            </div>

                            {/* Specialty + Governorate */}
                            {(selected.specialty || selected.governorate) && (
                                <div className="grid grid-cols-2 gap-4">
                                    {selected.specialty && (
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Spécialité</p>
                                            <p className="text-slate-700 font-semibold">{selected.specialty}</p>
                                        </div>
                                    )}
                                    {selected.governorate && (
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gouvernorat</p>
                                            <p className="text-slate-700 font-semibold">{selected.governorate}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Task details */}
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Détails complets de la tâche</p>
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-slate-600 leading-relaxed italic min-h-[80px] text-sm">
                                    {selected.task || 'Aucun détail spécifié pour cette tâche.'}
                                </div>
                            </div>

                            {/* Samples given */}
                            {selected.givenSamples?.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Échantillons remis</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selected.givenSamples.map((s, i) => (
                                            <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-bold">
                                                {s.name} {s.count > 1 ? `×${s.count}` : ''}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="flex justify-end pt-2 border-t border-slate-100">
                                <button
                                    onClick={() => setSelected(null)}
                                    className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold transition-all"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
