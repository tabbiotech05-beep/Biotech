import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function MagicSearchView() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [selectedItem, setSelectedItem] = useState(null);

    // Debounced search logic
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (query.trim().length >= 2) {
                performSearch(query);
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const performSearch = async (searchTerm) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/magic-search?q=${encodeURIComponent(searchTerm)}`);
            setResults(response.data);
        } catch (err) {
            console.error('Search error:', err);
            setError(err.response?.data?.message || 'Erreur lors de la recherche.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[600px] space-y-6 relative">
            {/* HEADER */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <span className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Magic Search</h2>
                </div>
                <p className="text-sm text-gray-500 italic">Recherche instantanée dans l'historique complet des plannings (Médecins, Pharmacies, Grossistes).</p>
            </div>

            {/* SEARCH INPUT */}
            <div className="relative max-w-2xl mx-auto pt-4">
                <input
                    type="text"
                    placeholder="Tapez un nom, une pharmacie, un lieu..."
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none text-lg font-medium"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <div className="absolute left-4 top-[60%] -translate-y-1/2 text-slate-400">
                    {loading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    )}
                </div>
            </div>

            {/* STATUS MESSAGES */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium animate-pulse">
                    {error}
                </div>
            )}

            {/* RESULTS TABLE */}
            <div className="pt-4">
                {!loading && results.length === 0 && query.trim().length >= 2 && !error && (
                    <div className="text-center py-12 text-gray-400">
                        <p>Aucun planning trouvé pour cette recherche.</p>
                    </div>
                )}

                {results.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="min-w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                <tr>
                                    <th className="px-4 py-3">Date Prévue</th>
                                    <th className="px-4 py-3">Cible</th>
                                    <th className="px-4 py-3">Délégué</th>
                                    <th className="px-4 py-3">Détails de la mission</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {results.map((item, idx) => (
                                    <tr 
                                        key={idx} 
                                        className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                                        onClick={() => setSelectedItem(item)}
                                    >
                                        <td className="px-4 py-4 whitespace-nowrap">
                                           <div className="font-bold text-slate-700">{item.date}</div>
                                           <div className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded inline-block mt-1 ${item.source === 'Database' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                                                {item.source === 'Database' ? 'Récent' : 'Archive'}
                                           </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="font-black text-purple-700">
                                                {item.target}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">
                                                {item.targetType}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 font-medium text-slate-600">
                                            {item.delegate}
                                        </td>
                                        <td className="px-4 py-4 text-slate-500 max-w-md">
                                            <p className="line-clamp-2" title={item.task}>{item.task}</p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${item.status === 'Approuvé' || item.status === 'Réalisé' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* DETAIL MODAL */}
            {selectedItem && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div 
                        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-scale-up border border-slate-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="relative h-32 bg-gradient-to-br from-purple-600 to-indigo-700 p-8 flex items-end">
                            <button 
                                onClick={() => setSelectedItem(null)}
                                className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg text-purple-600">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-white text-2xl font-black">{selectedItem.target}</h3>
                                    <p className="text-purple-100 text-sm font-bold uppercase tracking-wider">{selectedItem.targetType}</p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date de la mission</p>
                                    <p className="text-slate-800 font-bold">{selectedItem.date}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Délégué assigné</p>
                                    <p className="text-slate-800 font-bold">{selectedItem.delegate}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Détails complets de la mission</p>
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 italic text-slate-600 leading-relaxed min-h-[100px]">
                                    {selectedItem.task || "Aucun détail spécifié pour cette mission."}
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <div className="flex gap-2">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${selectedItem.status === 'Approuvé' || selectedItem.status === 'Réalisé' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {selectedItem.status}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${selectedItem.source === 'Database' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                                        {selectedItem.source === 'Database' ? 'Données Récentes' : 'Archives Historiques'}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => setSelectedItem(null)}
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

