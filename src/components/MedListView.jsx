import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const PAGE_SIZE = 50;

// Columns to hide for raw Excel tabs (internal or redundant)
const HIDDEN_COLS = new Set(['__rowNum__', 'id', 'ID', 'normKey', 'tokenKey']);
const COL_LABELS = {};

export default function MedListView() {
    const [activeTab, setActiveTab] = useState('avec'); // 'avec' | 'sans' | 'suivi'
    const [allRows, setAllRows]     = useState([]);
    const [columns, setColumns]     = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const [query, setQuery]         = useState('');
    const [page, setPage]           = useState(1);

    // Suivi (Coverage) Tab State
    const [stats, setStats]                     = useState(null);
    const [delegatesList, setDelegatesList]     = useState([]);
    const [specialtiesList, setSpecialtiesList] = useState([]);
    const [governoratesList, setGovernoratesList] = useState([]);

    // Filters for Suivi Tab
    const [filterStatus, setFilterStatus]           = useState('all'); // 'all' | 'not_visited' | 'visited'
    const [selectedSpecialty, setSelectedSpecialty] = useState('');
    const [selectedGov, setSelectedGov]             = useState('');
    const [selectedDelegate, setSelectedDelegate]   = useState('');
    const [selectedSource, setSelectedSource]       = useState('all'); // 'all' | 'avec' | 'sans' | 'both'

    // Load data when activeTab changes
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            setPage(1);
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/med-list?type=${activeTab}`, {
                    headers: { 'x-auth-token': token }
                });

                if (activeTab === 'suivi') {
                    setAllRows(res.data.rows || []);
                    setStats(res.data.stats || null);
                    setDelegatesList(res.data.delegates || []);
                    setSpecialtiesList(res.data.specialties || []);
                    setGovernoratesList(res.data.governorates || []);
                    setColumns([]);
                } else {
                    const visibleCols = (res.data.columns || []).filter(c => !HIDDEN_COLS.has(c));
                    setColumns(visibleCols);
                    setAllRows(res.data.rows || []);
                    setStats(null);
                }
            } catch (err) {
                setError(err.response?.data?.msg || 'Impossible de charger la liste des médecins.');
                setAllRows([]);
                setColumns([]);
                setStats(null);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [activeTab]);

    // Filtering logic
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        if (activeTab === 'suivi') {
            return allRows.filter(row => {
                // Status Filter
                if (filterStatus === 'not_visited' && row.isVisited) return false;
                if (filterStatus === 'visited' && !row.isVisited) return false;

                // Specialty Filter
                if (selectedSpecialty && row.specialty !== selectedSpecialty) return false;

                // Governorate Filter
                if (selectedGov && row.governorate !== selectedGov) return false;

                // Delegate Filter
                if (selectedDelegate) {
                    const hasDelegate = (row.delegates || []).includes(selectedDelegate) || row.lastDelegate === selectedDelegate;
                    if (!hasDelegate) return false;
                }

                // Source Filter
                if (selectedSource !== 'all') {
                    if (selectedSource === 'both' && row.source !== 'both') return false;
                    if (selectedSource === 'avec' && row.source !== 'avec' && row.source !== 'both') return false;
                    if (selectedSource === 'sans' && row.source !== 'sans' && row.source !== 'both') return false;
                }

                // Text Search
                if (q) {
                    const matchText = (
                        (row.name || '') + ' ' +
                        (row.specialty || '') + ' ' +
                        (row.governorate || '') + ' ' +
                        (row.zone || '') + ' ' +
                        (row.address || '') + ' ' +
                        (row.lastDelegate || '') + ' ' +
                        (row.delegates || []).join(' ')
                    ).toLowerCase();
                    if (!matchText.includes(q)) return false;
                }

                return true;
            });
        }

        // Standard filtering for 'avec' and 'sans' tabs
        if (!q) return allRows;
        return allRows.filter(row =>
            columns.some(col => String(row[col] ?? '').toLowerCase().includes(q))
        );
    }, [query, allRows, columns, activeTab, filterStatus, selectedSpecialty, selectedGov, selectedDelegate, selectedSource]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage   = Math.min(page, totalPages);
    const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    // Reset to page 1 when search or filter changes
    useEffect(() => { setPage(1); }, [query, filterStatus, selectedSpecialty, selectedGov, selectedDelegate, selectedSource]);

    const colLabel = c => COL_LABELS[c] || c;

    // Excel Export Handler
    const handleExportExcel = () => {
        if (!filtered || filtered.length === 0) return;

        let dataToExport = [];
        let exportFileName = '';

        if (activeTab === 'suivi') {
            dataToExport = filtered.map((row, idx) => ({
                '#': idx + 1,
                'Nom du Médecin': row.name || '—',
                'Spécialité': row.specialty || '—',
                'Gouvernorat / Secteur': row.governorate || '—',
                'Zone': row.zone || '—',
                'Adresse': row.address || '—',
                'Téléphone': row.phone || '—',
                'Source Répertoire': row.sourceLabel || row.source || '—',
                'Statut Visite': row.isVisited ? 'Visité' : 'Non encore faite',
                'Nombre de Visites': row.visitCount || 0,
                'Dernier Délégué': row.lastDelegate || '—',
                'Dernière Visite': row.lastVisitDate ? new Date(row.lastVisitDate).toLocaleDateString('fr-FR') : '—',
                'Tous les Délégués': (row.delegates || []).join(', ')
            }));
            exportFileName = `Suivi_Medecins_Tenshi_${filterStatus}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        } else {
            dataToExport = filtered.map((row, idx) => {
                const item = { '#': idx + 1 };
                columns.forEach(col => {
                    item[colLabel(col)] = row[col] ?? '';
                });
                return item;
            });
            exportFileName = `Liste_Medecins_${activeTab}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        }

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Médecins');
        XLSX.writeFile(wb, exportFileName);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[600px] space-y-6">
            
            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <span className="p-3 bg-indigo-50 text-indigo-600 rounded-xl flex-shrink-0 shadow-xs border border-indigo-100">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </span>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Liste des Médecins</h2>
                        <p className="text-xs text-slate-500 font-medium">
                            {activeTab === 'suivi'
                                ? 'Croisement du répertoire national avec les visites des délégués Tenshi'
                                : 'Répertoire national – toutes spécialités, toutes zones'}
                        </p>
                    </div>
                </div>

                {/* Sub-Tabs */}
                <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl gap-1">
                    <button
                        onClick={() => { setActiveTab('avec'); setQuery(''); }}
                        className={`px-4 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${activeTab === 'avec' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Avec adresses
                    </button>
                    <button
                        onClick={() => { setActiveTab('sans'); setQuery(''); }}
                        className={`px-4 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${activeTab === 'sans' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Sans adresses
                    </button>
                    <button
                        onClick={() => { setActiveTab('suivi'); setQuery(''); }}
                        className={`px-4 py-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'suivi' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'}`}
                    >
                        <span>🎯</span>
                        <span>Suivi & Non Visités</span>
                    </button>
                </div>
            </div>

            {/* ── KPI Cards for Suivi Tab ────────────────────────────────────── */}
            {activeTab === 'suivi' && stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/80 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Répertoire</span>
                            <span className="p-1.5 bg-slate-200 text-slate-700 rounded-lg text-sm">📋</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900 mt-2">
                            {stats.total.toLocaleString('fr-FR')}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Médecins uniques consolidés</p>
                    </div>

                    <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/50 shadow-xs cursor-pointer hover:bg-rose-50 transition-colors"
                         onClick={() => setFilterStatus('not_visited')}>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Non encore faite</span>
                            <span className="p-1.5 bg-rose-100 text-rose-600 rounded-lg text-sm">🔴</span>
                        </div>
                        <p className="text-2xl font-black text-rose-700 mt-2">
                            {stats.notVisitedCount.toLocaleString('fr-FR')}
                        </p>
                        <p className="text-[11px] text-rose-600 font-medium mt-0.5">
                            {stats.total > 0 ? ((stats.notVisitedCount / stats.total) * 100).toFixed(1) : 0}% restant à visiter
                        </p>
                    </div>

                    <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 shadow-xs cursor-pointer hover:bg-emerald-50 transition-colors"
                         onClick={() => setFilterStatus('visited')}>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Déjà visitée</span>
                            <span className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg text-sm">🟢</span>
                        </div>
                        <p className="text-2xl font-black text-emerald-700 mt-2">
                            {stats.visitedCount.toLocaleString('fr-FR')}
                        </p>
                        <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                            {stats.total > 0 ? ((stats.visitedCount / stats.total) * 100).toFixed(1) : 0}% ayant reçu une visite
                        </p>
                    </div>

                    <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Couverture</span>
                            <span className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg text-sm">📈</span>
                        </div>
                        <p className="text-2xl font-black text-indigo-700 mt-2">
                            {stats.coverageRate}%
                        </p>
                        <div className="w-full bg-indigo-200/50 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, stats.coverageRate)}%` }} />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Filters & Search Toolbar for Suivi Tab ─────────────────────── */}
            {activeTab === 'suivi' && (
                <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Status Pills */}
                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
                            <button
                                onClick={() => setFilterStatus('not_visited')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                    filterStatus === 'not_visited'
                                        ? 'bg-rose-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${filterStatus === 'not_visited' ? 'bg-white' : 'bg-rose-500'}`} />
                                <span>Non encore faite ({stats ? stats.notVisitedCount.toLocaleString('fr-FR') : 0})</span>
                            </button>

                            <button
                                onClick={() => setFilterStatus('visited')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                    filterStatus === 'visited'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50'
                                }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${filterStatus === 'visited' ? 'bg-white' : 'bg-emerald-500'}`} />
                                <span>Déjà visitée ({stats ? stats.visitedCount.toLocaleString('fr-FR') : 0})</span>
                            </button>

                            <button
                                onClick={() => setFilterStatus('all')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                    filterStatus === 'all'
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'
                                }`}
                            >
                                <span>Tous ({stats ? stats.total.toLocaleString('fr-FR') : 0})</span>
                            </button>
                        </div>

                        {/* Export Button */}
                        <button
                            onClick={handleExportExcel}
                            disabled={filtered.length === 0}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Exporter la liste filtrée au format Excel"
                        >
                            <span>📥</span>
                            <span>Exporter Excel ({filtered.length.toLocaleString('fr-FR')})</span>
                        </button>
                    </div>

                    {/* Dropdown Filters Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
                        {/* Specialty Filter */}
                        <div>
                            <select
                                value={selectedSpecialty}
                                onChange={e => setSelectedSpecialty(e.target.value)}
                                className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="">Toutes spécialités ({specialtiesList.length})</option>
                                {specialtiesList.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        {/* Governorate Filter */}
                        <div>
                            <select
                                value={selectedGov}
                                onChange={e => setSelectedGov(e.target.value)}
                                className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="">Toutes zones / gouvernorats ({governoratesList.length})</option>
                                {governoratesList.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>

                        {/* Delegate Filter */}
                        <div>
                            <select
                                value={selectedDelegate}
                                onChange={e => setSelectedDelegate(e.target.value)}
                                className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="">Tous les délégués ({delegatesList.length})</option>
                                {delegatesList.map(d => (
                                    <option key={d} value={d}>Visité par : {d}</option>
                                ))}
                            </select>
                        </div>

                        {/* Source Filter */}
                        <div>
                            <select
                                value={selectedSource}
                                onChange={e => setSelectedSource(e.target.value)}
                                className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="all">Toutes sources (Avec & Sans)</option>
                                <option value="avec">Source : Avec adresse</option>
                                <option value="sans">Source : Sans adresse</option>
                                <option value="both">Source : Présent dans les deux</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Search bar ────────────────────────────────────────────────── */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder={activeTab === 'suivi'
                            ? "Rechercher par nom du médecin, spécialité, ville, zone ou délégué…"
                            : "Rechercher par nom, spécialité, ville, zone…"}
                        className="w-full pl-10 pr-10 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-medium transition-all"
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

                {activeTab !== 'suivi' && (
                    <button
                        onClick={handleExportExcel}
                        disabled={filtered.length === 0}
                        className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50"
                        title="Exporter en Excel"
                    >
                        <span>📥</span>
                        <span className="hidden sm:inline">Export Excel</span>
                    </button>
                )}
            </div>

            {/* ── Content Area ──────────────────────────────────────────────── */}
            {loading ? (
                <div className="flex items-center justify-center py-32 flex-col gap-4 text-slate-400">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
                    <p className="text-sm font-semibold animate-pulse">Chargement et croisement des données…</p>
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
                    <div className="flex flex-wrap items-center justify-between gap-4 text-[11px] font-extrabold uppercase tracking-widest text-slate-400 px-1">
                        <div className="flex flex-wrap items-center gap-4">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                TOTAL : {allRows.length.toLocaleString('fr-FR')}
                            </span>
                            {(query || filterStatus !== 'all' || selectedSpecialty || selectedGov || selectedDelegate || selectedSource !== 'all') && (
                                <span className="flex items-center gap-1.5 text-indigo-600">
                                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                                    FILTRÉS : {filtered.length.toLocaleString('fr-FR')}
                                </span>
                            )}
                        </div>
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
                            <p className="italic font-medium">Aucun médecin trouvé pour les critères sélectionnés.</p>
                        </div>
                    ) : activeTab === 'suivi' ? (
                        /* ── SUIVI CROSS-REFERENCED TABLE ── */
                        <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm">
                            <table className="min-w-full text-sm text-left">
                                <thead className="bg-indigo-50/80 text-indigo-900 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10 border-b border-indigo-100">
                                    <tr>
                                        <th className="px-4 py-3 text-slate-400 font-black w-12 text-center">#</th>
                                        <th className="px-4 py-3">Médecin</th>
                                        <th className="px-4 py-3">Spécialité</th>
                                        <th className="px-4 py-3">Gouvernorat / Zone</th>
                                        <th className="px-4 py-3">Adresse</th>
                                        <th className="px-4 py-3 text-center">Source</th>
                                        <th className="px-4 py-3 text-center">Statut Visite</th>
                                        <th className="px-4 py-3">Dernier Délégué</th>
                                        <th className="px-4 py-3">Dernière Visite</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {pageRows.map((row, idx) => {
                                        const globalIdx = (safePage - 1) * PAGE_SIZE + idx + 1;
                                        return (
                                            <tr key={row.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-4 py-3 text-slate-300 font-bold text-[10px] text-center">{globalIdx}</td>
                                                
                                                {/* Doctor Name */}
                                                <td className="px-4 py-3 font-bold text-slate-900 text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-slate-400">🩺</span>
                                                        <span className="truncate max-w-[220px]" title={row.name}>{row.name || '—'}</span>
                                                    </div>
                                                </td>

                                                {/* Specialty */}
                                                <td className="px-4 py-3 text-slate-600 text-xs">
                                                    {row.specialty ? (
                                                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold text-[11px] truncate max-w-[160px]" title={row.specialty}>
                                                            {row.specialty}
                                                        </span>
                                                    ) : '—'}
                                                </td>

                                                {/* Governorate / Zone */}
                                                <td className="px-4 py-3 text-slate-600 text-xs">
                                                    <div>
                                                        <span className="font-semibold text-slate-800">{row.governorate || '—'}</span>
                                                        {row.zone && <span className="block text-[10px] text-slate-400">{row.zone}</span>}
                                                    </div>
                                                </td>

                                                {/* Address */}
                                                <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px]">
                                                    <div className="truncate text-[11px]" title={row.address || 'Non spécifiée'}>
                                                        {row.address || '—'}
                                                    </div>
                                                </td>

                                                {/* Source */}
                                                <td className="px-4 py-3 text-center">
                                                    {row.source === 'both' ? (
                                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                                            Avec & Sans
                                                        </span>
                                                    ) : row.source === 'avec' ? (
                                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            Avec adresse
                                                        </span>
                                                    ) : row.source === 'sans' ? (
                                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                                            Sans adresse
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                                            Visite directe
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Visit Status */}
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    {row.isVisited ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-black rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                                                            <span>✓</span> Visité ({row.visitCount})
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                            Non encore faite
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Last Delegate */}
                                                <td className="px-4 py-3 text-slate-700 text-xs font-semibold">
                                                    {row.lastDelegate ? (
                                                        <span className="inline-flex items-center gap-1 text-slate-800">
                                                            <span className="text-[11px]">👤</span>
                                                            <span title={row.delegates?.join(', ')}>{row.lastDelegate}</span>
                                                        </span>
                                                    ) : '—'}
                                                </td>

                                                {/* Last Visit Date */}
                                                <td className="px-4 py-3 text-slate-500 text-xs font-medium whitespace-nowrap">
                                                    {row.lastVisitDate ? new Date(row.lastVisitDate).toLocaleDateString('fr-FR') : '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        /* ── RAW EXCEL TAB TABLE (AVEC / SANS) ── */
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
