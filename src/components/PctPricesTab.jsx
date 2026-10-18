import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import pricesData from '../data/pct_prices.json';

const FAMILIES_CONFIG = [
    { key: 'CLOMIPRAMINE', name: 'CLOMIPRAMINE', molecule: 'Clomipramine (10 mg – 25 mg – 75 mg)' },
    { key: 'MONTELUKAST', name: 'MONTELUKAST', molecule: 'Montélukast (5 mg)' },
    { key: 'TELMISARTAN', name: 'TELMISARTAN', molecule: 'Telmisartan (40 mg – 80 mg)' },
    { key: 'VALPROATE', name: 'VALPROATE DE SODIUM', molecule: 'Valproate de sodium (LP 500 mg)' },
    { key: 'ZOLPIDEM', name: 'ZOLPIDEM', molecule: 'Zolpidem (10 mg)' },
    { key: 'AMLOR', name: 'AMLOR', molecule: 'Amlodipine (5 mg – 10 mg)' },
    { key: 'CADUET', name: 'CADUET', molecule: 'Amlodipine + Atorvastatine (5/10 mg – 10/10 mg)' },
    { key: 'TAHOR', name: 'TAHOR', molecule: 'Atorvastatine (10 mg – 20 mg – 40 mg – 80 mg)' },
    { key: 'CELEBREX', name: 'CELEBREX', molecule: 'Célécoxib (100 mg – 200 mg)' },
    { key: 'NEURONTIN', name: 'NEURONTIN', molecule: 'Gabapentine (300 mg – 600 mg – 800 mg)' },
    { key: 'XALATAN', name: 'XALATAN', molecule: 'Latanoprost (0,005 % collyre)' },
    { key: 'XALACOM', name: 'XALACOM', molecule: 'Latanoprost + Timolol (0,005 % / 0,5 %)' },
    { key: 'LYRICA', name: 'LYRICA', molecule: 'Prégabaline (75 mg – 150 mg)' },
    { key: 'ZOLOFT', name: 'ZOLOFT', molecule: 'Sertraline (50 mg)' },
    { key: 'VIAGRA', name: 'VIAGRA', molecule: 'Sildénafil (25 mg – 50 mg – 100 mg)' },
    { key: 'EFFEXOR', altKey: 'EFEXOR', name: 'EFFEXOR / EFEXOR', molecule: 'Venlafaxine LP (37,5 mg – 75 mg – XL 150 mg)' },
    { key: 'CARDULAR', name: 'CARDULAR', molecule: 'Doxazosine (2 mg – 4 mg – 8 mg)' },
    { key: 'PHLOROGLUCINOL', name: 'PHLOROGLUCINOL', molecule: 'Phloroglucinol (80 mg)' },
    { key: 'SOTALOL', name: 'SOTALOL', molecule: 'Sotalol (160 mg)' },
    { key: 'FLECAINE', name: 'FLECAINE', molecule: 'Flécaïnide (50 mg – 100 mg – 200 mg)' },
    { key: 'XANAX', name: 'XANAX', molecule: 'Alprazolam (0.25 mg – 0.5 mg – 1 mg – 2 mg)' },
    { key: 'DETRUSITOL', name: 'DETRUSITOL', molecule: 'Toltérodine (2 mg – 4 mg)' }
];

function extractDosageNum(str) {
    if (!str) return null;
    const m = str.match(/(\d+(?:[.,]\d+)?)\s*(?:mg|mcg|%)/i);
    return m ? parseFloat(m[1].replace(',', '.')) : null;
}

export default function PctPricesTab() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFamilyKey, setSelectedFamilyKey] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'TENSHI' | 'COMPETITOR'
    const [viewMode, setViewMode] = useState('FAMILIES'); // 'FAMILIES' | 'FLAT_TABLE'
    const [collapsedFamilies, setCollapsedFamilies] = useState({});
    const [sortField, setSortField] = useState('specialty');
    const [sortDirection, setSortDirection] = useState('asc');

    // Build raw structured families
    const allFamilies = useMemo(() => {
        const familiesMap = FAMILIES_CONFIG.map(cfg => ({
            ...cfg,
            id: cfg.key.toLowerCase(),
            tenshi: [],
            competitors: []
        }));

        let curFam = null;
        for (const item of (pricesData.competitors || [])) {
            if (!item.dosage) {
                const s = item.specialty.toUpperCase();
                curFam = familiesMap.find(f => s.includes(f.key) || (f.altKey && s.includes(f.altKey)));
            } else if (curFam) {
                curFam.competitors.push(item);
            }
        }

        for (const item of (pricesData.tenshi || [])) {
            const s = item.specialty.toUpperCase();
            const fam = familiesMap.find(f => s.includes(f.key) || (f.altKey && s.includes(f.altKey)));
            if (fam) fam.tenshi.push(item);
        }

        return familiesMap;
    }, []);

    // Global Stats
    const stats = useMemo(() => {
        let totalTenshi = 0;
        let totalComp = 0;
        allFamilies.forEach(f => {
            totalTenshi += f.tenshi.length;
            totalComp += f.competitors.length;
        });
        return {
            totalFamilies: allFamilies.length,
            totalTenshi,
            totalComp,
            totalAll: totalTenshi + totalComp
        };
    }, [allFamilies]);

    // Filter families & items based on search & filters
    const filteredFamilies = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();

        return allFamilies.map(fam => {
            // Check if family is selected
            if (selectedFamilyKey !== 'ALL' && fam.key !== selectedFamilyKey) {
                return null;
            }

            const familyNameMatch = fam.name.toLowerCase().includes(term) || fam.molecule.toLowerCase().includes(term);

            // Filter tenshi items
            let matchingTenshi = fam.tenshi;
            if (typeFilter === 'COMPETITOR') {
                matchingTenshi = [];
            } else if (term && !familyNameMatch) {
                matchingTenshi = fam.tenshi.filter(item =>
                    (item.specialty && item.specialty.toLowerCase().includes(term)) ||
                    (item.dosage && item.dosage.toLowerCase().includes(term))
                );
            }

            // Filter competitor items
            let matchingCompetitors = fam.competitors;
            if (typeFilter === 'TENSHI') {
                matchingCompetitors = [];
            } else if (term && !familyNameMatch) {
                matchingCompetitors = fam.competitors.filter(item =>
                    (item.specialty && item.specialty.toLowerCase().includes(term)) ||
                    (item.dosage && item.dosage.toLowerCase().includes(term))
                );
            }

            // If nothing matches and search was active, hide this family
            if (term && !familyNameMatch && matchingTenshi.length === 0 && matchingCompetitors.length === 0) {
                return null;
            }

            // If type filter excludes both, hide
            if (matchingTenshi.length === 0 && matchingCompetitors.length === 0) {
                return null;
            }

            // Calculate min/max price for this family
            const allPublicPrices = [
                ...matchingTenshi.map(t => Number(t.pricePublic) || 0),
                ...matchingCompetitors.map(c => Number(c.pricePublic) || 0)
            ].filter(p => p > 0);

            const minPrice = allPublicPrices.length > 0 ? Math.min(...allPublicPrices) : null;
            const maxPrice = allPublicPrices.length > 0 ? Math.max(...allPublicPrices) : null;

            return {
                ...fam,
                matchingTenshi,
                matchingCompetitors,
                minPrice,
                maxPrice,
                totalShown: matchingTenshi.length + matchingCompetitors.length
            };
        }).filter(Boolean);
    }, [allFamilies, searchTerm, selectedFamilyKey, typeFilter]);

    // Flat list of all visible items (for FLAT_TABLE view)
    const flatItemsList = useMemo(() => {
        const list = [];
        filteredFamilies.forEach(fam => {
            fam.matchingTenshi.forEach(t => {
                list.push({
                    type: 'TENSHI',
                    family: fam.name,
                    molecule: fam.molecule,
                    specialty: t.specialty,
                    dosage: t.dosage,
                    priceWholesale: t.priceWholesale,
                    pricePharmacy: t.pricePharmacy,
                    pricePublic: t.pricePublic,
                    sourceItem: t
                });
            });
            fam.matchingCompetitors.forEach(c => {
                list.push({
                    type: 'COMPETITOR',
                    family: fam.name,
                    molecule: fam.molecule,
                    specialty: c.specialty,
                    dosage: c.dosage,
                    priceWholesale: c.priceWholesale,
                    pricePharmacy: c.pricePharmacy,
                    pricePublic: c.pricePublic,
                    sourceItem: c
                });
            });
        });

        // Sort flat list
        list.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return list;
    }, [filteredFamilies, sortField, sortDirection]);

    const toggleFamily = (key) => {
        setCollapsedFamilies(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const expandAll = () => setCollapsedFamilies({});
    const collapseAll = () => {
        const allCollapsed = {};
        allFamilies.forEach(f => { allCollapsed[f.key] = true; });
        setCollapsedFamilies(allCollapsed);
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const formatPrice = (val) => {
        if (val === null || val === undefined || isNaN(val)) return '-';
        return Number(val).toFixed(3) + ' TND';
    };

    // Export to Excel
    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();

        // 1. Sheet Global
        const globalRows = [];
        allFamilies.forEach(fam => {
            fam.tenshi.forEach(t => {
                globalRows.push({
                    'Type': 'TENSHI',
                    'Famille / Classe': fam.name,
                    'Molécule / Forme': fam.molecule,
                    'Spécialité': t.specialty,
                    'Dosage': t.dosage,
                    'Prix Grossiste TTC (TND)': t.priceWholesale ? Number(Number(t.priceWholesale).toFixed(3)) : null,
                    'Prix Pharmacie TTC (TND)': t.pricePharmacy ? Number(Number(t.pricePharmacy).toFixed(3)) : null,
                    'Prix Public TTC (TND)': t.pricePublic ? Number(Number(t.pricePublic).toFixed(3)) : null,
                });
            });
            fam.competitors.forEach(c => {
                globalRows.push({
                    'Type': 'CONCURRENT',
                    'Famille / Classe': fam.name,
                    'Molécule / Forme': fam.molecule,
                    'Spécialité': c.specialty,
                    'Dosage': c.dosage,
                    'Prix Grossiste TTC (TND)': c.priceWholesale ? Number(Number(c.priceWholesale).toFixed(3)) : null,
                    'Prix Pharmacie TTC (TND)': c.pricePharmacy ? Number(Number(c.pricePharmacy).toFixed(3)) : null,
                    'Prix Public TTC (TND)': c.pricePublic ? Number(Number(c.pricePublic).toFixed(3)) : null,
                });
            });
        });

        const wsGlobal = XLSX.utils.json_to_sheet(globalRows);
        XLSX.utils.book_append_sheet(wb, wsGlobal, 'Comparatif Global');

        // 2. Sheet Tenshi
        const tenshiRows = globalRows.filter(r => r['Type'] === 'TENSHI');
        const wsTenshi = XLSX.utils.json_to_sheet(tenshiRows);
        XLSX.utils.book_append_sheet(wb, wsTenshi, 'Produits Tenshi');

        // 3. Sheet Concurrents
        const compRows = globalRows.filter(r => r['Type'] === 'CONCURRENT');
        const wsComp = XLSX.utils.json_to_sheet(compRows);
        XLSX.utils.book_append_sheet(wb, wsComp, 'Concurrents');

        // Download
        XLSX.writeFile(wb, 'Prix_PCT_Officiels_Tenshi_vs_Concurrents.xlsx');
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header with Title & Export Actions */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-100 shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-xl md:text-2xl font-black text-slate-900">
                                    Prix PCT Officiels & Comparatif Concurrentiel
                                </h2>
                                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                    Circulaire PCT 2026
                                </span>
                            </div>
                            <p className="text-slate-500 text-xs md:text-sm mt-0.5">
                                Vue unifiée et ergonomique : Chaque produit Tenshi avec ses concurrents directs, posologie et différentiels de tarifs.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* View Mode Toggle */}
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                                onClick={() => setViewMode('FAMILIES')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'FAMILIES' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                                Vue par Famille
                            </button>
                            <button
                                onClick={() => setViewMode('FLAT_TABLE')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'FLAT_TABLE' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Tableau Global
                            </button>
                        </div>

                        {/* Export Button */}
                        <button
                            onClick={handleExportExcel}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs md:text-sm px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Exporter Excel (.xlsx)
                        </button>
                    </div>
                </div>

                {/* KPI Overview Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Familles Molécules</div>
                        <div className="text-xl md:text-2xl font-black text-slate-900 mt-1">{stats.totalFamilies}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Classes thérapeutiques</div>
                    </div>
                    <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100">
                        <div className="text-xs text-indigo-700 font-semibold uppercase tracking-wider">Références Tenshi</div>
                        <div className="text-xl md:text-2xl font-black text-indigo-800 mt-1">{stats.totalTenshi}</div>
                        <div className="text-[11px] text-indigo-500 mt-0.5">Spécialités de référence</div>
                    </div>
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Concurrents Référencés</div>
                        <div className="text-xl md:text-2xl font-black text-slate-800 mt-1">{stats.totalComp}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Spécialités alternatives</div>
                    </div>
                    <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100">
                        <div className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Total Lignes Tarifs</div>
                        <div className="text-xl md:text-2xl font-black text-emerald-800 mt-1">{stats.totalAll}</div>
                        <div className="text-[11px] text-emerald-600 mt-0.5">Données officielles PCT</div>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Search Field */}
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Rechercher par spécialité, molécule, dosage (ex: Tahor, Atorvastatine, 20mg, Depakine)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-10 p-2.5 transition-all outline-none"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Family Select */}
                    <div className="w-full md:w-72">
                        <select
                            value={selectedFamilyKey}
                            onChange={(e) => setSelectedFamilyKey(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 transition-all outline-none"
                        >
                            <option value="ALL">Toutes les familles ({allFamilies.length})</option>
                            {allFamilies.map(fam => (
                                <option key={fam.key} value={fam.key}>
                                    {fam.name} ({fam.tenshi.length} Tenshi / {fam.competitors.length} Comp.)
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Second row: Segmented Type Filter + Expand/Collapse */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-slate-500 mr-1">Afficher :</span>
                        <button
                            onClick={() => setTypeFilter('ALL')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${typeFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Tous ({stats.totalAll})
                        </button>
                        <button
                            onClick={() => setTypeFilter('TENSHI')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${typeFilter === 'TENSHI' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            ★ Tenshi uniquement ({stats.totalTenshi})
                        </button>
                        <button
                            onClick={() => setTypeFilter('COMPETITOR')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${typeFilter === 'COMPETITOR' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            🏢 Concurrents ({stats.totalComp})
                        </button>
                    </div>

                    {viewMode === 'FAMILIES' && (
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                                onClick={expandAll}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                            >
                                Tout déplier
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                                onClick={collapseAll}
                                className="text-xs text-slate-500 hover:text-slate-700 font-semibold px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                            >
                                Tout replier
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Family Navigation Chips (when in FAMILIES mode) */}
            {viewMode === 'FAMILIES' && selectedFamilyKey === 'ALL' && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                    <span className="text-xs font-bold text-slate-400 whitespace-nowrap pl-1 pr-2">Accès rapide :</span>
                    {allFamilies.map(fam => {
                        const isFilteredOut = !filteredFamilies.some(f => f.key === fam.key);
                        return (
                            <button
                                key={fam.key}
                                onClick={() => setSelectedFamilyKey(fam.key)}
                                disabled={isFilteredOut}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${isFilteredOut ? 'opacity-30 border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed' : 'border-slate-200 bg-white hover:border-indigo-400 hover:text-indigo-600 text-slate-700 shadow-2xs'}`}
                            >
                                {fam.name}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* VIEW MODE 1: COMPARATIF PAR FAMILLE */}
            {viewMode === 'FAMILIES' && (
                <div className="space-y-4">
                    {filteredFamilies.map((fam) => {
                        const isCollapsed = Boolean(collapsedFamilies[fam.key]);

                        return (
                            <div
                                key={fam.key}
                                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-200"
                            >
                                {/* Family Header Bar */}
                                <div
                                    onClick={() => toggleFamily(fam.key)}
                                    className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer bg-gradient-to-r from-slate-50 to-white hover:from-indigo-50/30 transition-colors border-b border-slate-100 select-none"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-sm shrink-0 border border-indigo-200/60 shadow-2xs">
                                            {fam.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-base md:text-lg font-black text-slate-900">
                                                    {fam.name}
                                                </h3>
                                                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                                                    {fam.molecule}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                                                <span className="inline-flex items-center gap-1 font-semibold text-indigo-700">
                                                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                                                    Tenshi : {fam.matchingTenshi.length} référence{fam.matchingTenshi.length > 1 ? 's' : ''}
                                                </span>
                                                <span className="text-slate-300">•</span>
                                                <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                                                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                                    Concurrents : {fam.matchingCompetitors.length} référence{fam.matchingCompetitors.length > 1 ? 's' : ''}
                                                </span>
                                                {fam.minPrice !== null && (
                                                    <>
                                                        <span className="text-slate-300">•</span>
                                                        <span className="text-emerald-700 font-mono font-medium">
                                                            Prix Public : {formatPrice(fam.minPrice)} à {formatPrice(fam.maxPrice)}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-end md:self-auto">
                                        <div className="text-xs text-slate-400 font-medium">
                                            {isCollapsed ? 'Cliquez pour ouvrir' : 'Cliquez pour réduire'}
                                        </div>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-600 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Table Body (when open) */}
                                {!isCollapsed && (
                                    <div className="overflow-x-auto">
                                        <table className="iso-table w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-100/70 text-slate-700 text-xs uppercase tracking-wider font-bold border-b border-slate-200">
                                                    <th className="px-4 py-3">Origine & Spécialité</th>
                                                    <th className="px-4 py-3">Dosage & Conditionnement</th>
                                                    <th className="px-4 py-3 text-right">Grossiste TTC</th>
                                                    <th className="px-4 py-3 text-right">Pharmacie TTC</th>
                                                    <th className="px-4 py-3 text-right font-black text-indigo-900">Public TTC</th>
                                                    <th className="px-4 py-3 text-center">Positionnement / Écart</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-sm">
                                                {/* 1. TENSHI PRODUCTS */}
                                                {fam.matchingTenshi.map((t, idx) => (
                                                    <tr
                                                        key={`tenshi-${idx}`}
                                                        className="bg-indigo-50/50 hover:bg-indigo-100/50 border-l-4 border-indigo-600 transition-colors"
                                                    >
                                                        <td className="px-4 py-3" data-label="Origine & Spécialité">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="bg-indigo-600 text-white text-[11px] font-black px-2 py-0.5 rounded shadow-2xs">
                                                                    ★ TENSHI
                                                                </span>
                                                                <span className="font-bold text-slate-900">
                                                                    {t.specialty}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 font-semibold text-slate-700" data-label="Dosage">
                                                            {t.dosage}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono text-slate-700" data-label="Grossiste TTC">
                                                            {formatPrice(t.priceWholesale)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono text-slate-700" data-label="Pharmacie TTC">
                                                            {formatPrice(t.pricePharmacy)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono font-black text-indigo-700 text-base" data-label="Public TTC">
                                                            {formatPrice(t.pricePublic)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center" data-label="Positionnement">
                                                            <span className="bg-indigo-100/80 text-indigo-800 text-[11px] font-bold px-2.5 py-1 rounded-full border border-indigo-200">
                                                                Référence Tenshi
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}

                                                {/* Divider if both exist */}
                                                {fam.matchingTenshi.length > 0 && fam.matchingCompetitors.length > 0 && (
                                                    <tr className="bg-slate-50/80">
                                                        <td colSpan="6" className="px-4 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider border-y border-slate-200">
                                                            ⚔️ Concurrents directs de {fam.name} ({fam.matchingCompetitors.length})
                                                        </td>
                                                    </tr>
                                                )}

                                                {/* 2. COMPETITOR PRODUCTS */}
                                                {fam.matchingCompetitors.map((comp, idx) => {
                                                    // Calculate delta vs Tenshi if same dosage exists
                                                    const compDose = extractDosageNum(comp.dosage);
                                                    let deltaBadge = null;

                                                    if (compDose !== null) {
                                                        const matchTenshi = fam.tenshi.find(t => extractDosageNum(t.dosage) === compDose);
                                                        if (matchTenshi && matchTenshi.pricePublic && comp.pricePublic) {
                                                            const delta = Number(comp.pricePublic) - Number(matchTenshi.pricePublic);
                                                            const pct = ((delta / Number(matchTenshi.pricePublic)) * 100).toFixed(1);

                                                            if (delta > 0.005) {
                                                                deltaBadge = (
                                                                    <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold px-2 py-0.5 rounded-full" title={`Plus cher que Tenshi de ${delta.toFixed(3)} TND`}>
                                                                        +{delta.toFixed(3)} DT (+{pct}%)
                                                                    </span>
                                                                );
                                                            } else if (delta < -0.005) {
                                                                deltaBadge = (
                                                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2 py-0.5 rounded-full" title={`Moins cher que Tenshi de ${Math.abs(delta).toFixed(3)} TND`}>
                                                                        {delta.toFixed(3)} DT ({pct}%)
                                                                    </span>
                                                                );
                                                            } else {
                                                                deltaBadge = (
                                                                    <span className="bg-slate-100 text-slate-600 text-[11px] font-bold px-2 py-0.5 rounded-full">
                                                                        = Prix identique
                                                                    </span>
                                                                );
                                                            }
                                                        }
                                                    }

                                                    return (
                                                        <tr
                                                            key={`comp-${idx}`}
                                                            className="hover:bg-slate-50 border-l-4 border-transparent transition-colors"
                                                        >
                                                            <td className="px-4 py-3" data-label="Origine & Spécialité">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                                                        CONCURRENT
                                                                    </span>
                                                                    <span className="font-semibold text-slate-800">
                                                                        {comp.specialty}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-600" data-label="Dosage">
                                                                {comp.dosage}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-mono text-slate-600" data-label="Grossiste TTC">
                                                                {formatPrice(comp.priceWholesale)}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-mono text-slate-600" data-label="Pharmacie TTC">
                                                                {formatPrice(comp.pricePharmacy)}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900" data-label="Public TTC">
                                                                {formatPrice(comp.pricePublic)}
                                                            </td>
                                                            <td className="px-4 py-3 text-center" data-label="Positionnement">
                                                                {deltaBadge || <span className="text-slate-400 text-xs italic">-</span>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}

                                                {/* Case where there are no competitors */}
                                                {fam.matchingTenshi.length > 0 && fam.matchingCompetitors.length === 0 && typeFilter !== 'TENSHI' && (
                                                    <tr>
                                                        <td colSpan="6" className="px-4 py-4 text-center text-xs text-slate-400 italic bg-slate-50/50">
                                                            Aucun concurrent direct listé dans la circulaire PCT pour cette spécialité.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {filteredFamilies.length === 0 && (
                        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
                            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h4 className="text-base font-bold text-slate-800">Aucun produit ou concurrent trouvé</h4>
                            <p className="text-sm text-slate-500 mt-1">
                                Essayez d'ajuster votre terme de recherche "{searchTerm}" ou sélectionnez une autre molécule.
                            </p>
                            <button
                                onClick={() => { setSearchTerm(''); setSelectedFamilyKey('ALL'); setTypeFilter('ALL'); }}
                                className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs rounded-xl transition-colors"
                            >
                                Réinitialiser les filtres
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* VIEW MODE 2: FLAT GLOBAL TABLE */}
            {viewMode === 'FLAT_TABLE' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <div className="text-sm font-bold text-slate-700">
                            Tableau Linéaire Triable ({flatItemsList.length} résultats)
                        </div>
                        <div className="text-xs text-slate-500">
                            Cliquez sur les en-têtes pour trier les colonnes
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="iso-table w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-slate-700 text-xs uppercase tracking-wider font-bold border-b border-slate-200">
                                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-200/60" onClick={() => handleSort('type')}>
                                        Type {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-200/60" onClick={() => handleSort('family')}>
                                        Famille {sortField === 'family' && (sortDirection === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-200/60" onClick={() => handleSort('specialty')}>
                                        Spécialité {sortField === 'specialty' && (sortDirection === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-200/60" onClick={() => handleSort('dosage')}>
                                        Dosage {sortField === 'dosage' && (sortDirection === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-200/60" onClick={() => handleSort('priceWholesale')}>
                                        Grossiste TTC {sortField === 'priceWholesale' && (sortDirection === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-200/60" onClick={() => handleSort('pricePharmacy')}>
                                        Pharmacie TTC {sortField === 'pricePharmacy' && (sortDirection === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-200/60 font-black text-indigo-900" onClick={() => handleSort('pricePublic')}>
                                        Public TTC {sortField === 'pricePublic' && (sortDirection === 'asc' ? '↑' : '↓')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {flatItemsList.map((item, idx) => (
                                    <tr
                                        key={idx}
                                        className={item.type === 'TENSHI' ? 'bg-indigo-50/50 hover:bg-indigo-100/50 border-l-4 border-indigo-600' : 'hover:bg-slate-50 border-l-4 border-transparent'}
                                    >
                                        <td className="px-4 py-3" data-label="Type">
                                            {item.type === 'TENSHI' ? (
                                                <span className="bg-indigo-600 text-white text-[11px] font-black px-2 py-0.5 rounded shadow-2xs">
                                                    ★ TENSHI
                                                </span>
                                            ) : (
                                                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                                    CONCURRENT
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-slate-600 text-xs" data-label="Famille">
                                            {item.family}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-slate-900" data-label="Spécialité">
                                            {item.specialty}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600" data-label="Dosage">
                                            {item.dosage}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-slate-600" data-label="Grossiste TTC">
                                            {formatPrice(item.priceWholesale)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-slate-600" data-label="Pharmacie TTC">
                                            {formatPrice(item.pricePharmacy)}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-mono font-black ${item.type === 'TENSHI' ? 'text-indigo-700 text-base' : 'text-slate-900'}`} data-label="Public TTC">
                                            {formatPrice(item.pricePublic)}
                                        </td>
                                    </tr>
                                ))}
                                {flatItemsList.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-8 text-center text-slate-500 italic">
                                            Aucun résultat trouvé pour "{searchTerm}"
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="text-xs text-slate-400 italic text-right">
                * Source des prix : Circulaires officielles et barèmes de la Pharmacie Centrale de Tunisie (PCT).
            </div>
        </div>
    );
}
