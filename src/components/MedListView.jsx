import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const PAGE_SIZE = 50;

// Columns to hide (internal or redundant)
const HIDDEN_COLS = new Set(['__rowNum__', 'id', 'ID']);
const COL_LABELS = {}; // Friendly labels if needed

export default function MedListView() {
    const [activeTab, setActiveTab] = useState('avec'); // 'avec' or 'sans'
    const [allRows, setAllRows]     = useState([]);
    const [columns, setColumns]     = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const [query, setQuery]         = useState('');
    const [page, setPage]           = useState(1);

    // Load data when activeTab changes
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/med-list?type=${activeTab}`, {
                    headers: { 'x-auth-token': token }
                });
                const visibleCols = (res.data.columns || []).filter(c => !HIDDEN_COLS.has(c));
                setColumns(visibleCols);
                setAllRows(res.data.rows || []);
                setPage(1); // reset page on tab switch
            } catch (err) {
                setError(err.response?.data?.msg || 'Impossible de charger la liste des médecins.');
                setAllRows([]);
                setColumns([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [activeTab]);

    // Client-side search across all columns
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return allRows;
        return allRows.filter(row =>
            columns.some(col => String(row[col] ?? '').toLowerCase().includes(q))
        );
    }, [query, allRows, columns]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage   = Math.min(page, totalPages);
    const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    // Reset to page 1 when search changes
    useEffect(() => { setPage(1); }, [query]);

    const colLabel = c => COL_LABELS[c] || c;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[600px] space-y-5">
            
            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-50">
                <div className="flex items-center gap-3">
                    <span className="p-2 bg-indigo-100 text-indigo-600 rounded-lg flex-shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </span>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Liste des Médecins</h2>
                        <p className="text-xs text-slate-400 font-medium italic">Répertoire national – toutes spécialités, toutes zones</p>
                    </div>
                </div>

                {/* Sub-Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => { setActiveTab('avec'); setQuery(''); }}
                        className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'avec' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Avec adresses
                    </button>
                    <button
                        onClick={() => { setActiveTab('sans'); setQuery(''); }}
                        className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'sans' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Sans adresses
                    </button>
                </div>
            </div>

            {/* ── Search bar ────────────────────────────────────────────────── */}
            <div className="relative w-full">
                <input
                    type="text"
                    placeholder="Rechercher par nom, spécialité, ville, zone…"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-medium transition-all"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {query && (
                    <button
                        onClick={() => setQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* ── Content Area ──────────────────────────────────────────────── */}
            {loading ? (
                <div className="flex items-center justify-center py-32 flex-col gap-4 text-slate-400">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
                    <p className="text-sm font-semibold animate-pulse">Chargement du répertoire…</p>
                </div>
            ) : error ? (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center space-y-3">
                        <svg className="w-12 h-12 mx-auto text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-red-500 font-bold">{error}</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Stats bar */}
                    <div className="flex flex-wrap items-center gap-4 text-[11px] font-extrabold uppercase tracking-widest text-slate-400 px-1">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            TOTAL : {allRows.length.toLocaleString('fr-FR')}
                        </span>
                        {query && (
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-violet-400" />
                                RÉSULTATS : {filtered.length.toLocaleString('fr-FR')}
                            </span>
                        )}
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-300" />
                            PAGE {safePage}/{totalPages}
                        </span>
                    </div>

                    {/* Table */}
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                            <svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="italic font-medium">Aucun médecin trouvé pour « {query} »</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm">
                            <table className="min-w-full text-sm text-left">
                                <thead className="bg-indigo-50 text-indigo-600 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-slate-400 font-black w-12">#</th>
                                        {columns.map(col => (
                                            <th key={col} className="px-4 py-3 whitespace-nowrap">{colLabel(col)}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {pageRows.map((row, idx) => {
                                        const globalIdx = (safePage - 1) * PAGE_SIZE + idx + 1;
                                        return (
                                            <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                                                <td className="px-4 py-3 text-slate-300 font-bold text-[10px]">{globalIdx}</td>
                                                {columns.map(col => {
                                                    const val = String(row[col] ?? '');
                                                    const highlighted = query.trim()
                                                        ? highlightMatch(val, query.trim())
                                                        : val;
                                                    return (
                                                        <td key={col} className="px-4 py-3 text-slate-600 max-w-[200px]">
                                                            <div className="truncate text-[12px] font-medium"
                                                                title={val}
                                                                dangerouslySetInnerHTML={{ __html: highlighted }}
                                                            />
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={safePage === 1}
                                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-indigo-100 hover:text-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                ← Précédent
                            </button>

                            {/* Page pills */}
                            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                                const mid = Math.min(Math.max(safePage, 4), totalPages - 3);
                                const pg = totalPages <= 7 ? i + 1 : (i < 3 ? i + 1 : i > 5 ? totalPages - (6 - i) : mid + (i - 3));
                                return (
                                    <button
                                        key={pg}
                                        onClick={() => setPage(pg)}
                                        className={`w-9 h-9 rounded-xl font-bold text-sm transition-all ${safePage === pg ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700'}`}
                                    >
                                        {pg}
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={safePage === totalPages}
                                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-indigo-100 hover:text-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Suivant →
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ── Utility: highlight query matches in cell text ──────────────────────────────
function highlightMatch(text, query) {
    if (!query || !text) return escHtml(text);
    const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(
        new RegExp(`(${esc})`, 'gi'),
        '<mark style="background:#e0e7ff;color:#4338ca;border-radius:3px;padding:0 2px;font-weight:700">$1</mark>'
    );
}

function escHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
