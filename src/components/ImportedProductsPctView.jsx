import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import pctData from '../data/pct_imported_sales.json';

const LAB_COLORS = {
    'Tendor': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800' },
    'Viatris Retail': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-800' },
    'Upjohn': { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-800' },
};

export default function ImportedProductsPctView() {
    const [year, setYear] = useState('2026'); // '2026' | '2025' | 'COMPARISON'
    const [selectedLab, setSelectedLab] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const activeList = useMemo(() => {
        return year === '2025' ? pctData.data2025 : pctData.data2026;
    }, [year]);

    const labs = useMemo(() => {
        const set = new Set(pctData.data2026.map(p => p.lab));
        return ['ALL', ...Array.from(set)];
    }, []);

    // Filtered products
    const filteredProducts = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        return activeList.filter(item => {
            const matchLab = selectedLab === 'ALL' || item.lab === selectedLab;
            const matchSearch = !term || item.brand.toLowerCase().includes(term) || item.lab.toLowerCase().includes(term);
            return matchLab && matchSearch;
        });
    }, [activeList, selectedLab, searchTerm]);

    // Comparison list (2025 vs 2026)
    const comparisonList = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        const map2025 = {};
        pctData.data2025.forEach(p => { map2025[p.brand] = p; });

        return pctData.data2026.filter(p => {
            const matchLab = selectedLab === 'ALL' || p.lab === selectedLab;
            const matchSearch = !term || p.brand.toLowerCase().includes(term) || p.lab.toLowerCase().includes(term);
            return matchLab && matchSearch;
        }).map(p26 => {
            const p25 = map2025[p26.brand] || { total: 0, monthly: {} };
            const diff = p26.total - p25.total;
            const pct = p25.total > 0 ? ((diff / p25.total) * 100).toFixed(1) : (p26.total > 0 ? '+100' : '0');
            return {
                brand: p26.brand,
                lab: p26.lab,
                total2025: p25.total,
                total2026: p26.total,
                diff,
                pct,
                monthly2026: p26.monthly,
                monthly2025: p25.monthly
            };
        });
    }, [selectedLab, searchTerm]);

    // Summary calculations
    const stats = useMemo(() => {
        const total2026 = pctData.total2026;
        const total2025 = pctData.total2025;
        const currentTotal = filteredProducts.reduce((sum, p) => sum + p.total, 0);
        return {
            total2026,
            total2025,
            currentTotal,
            productsCount: filteredProducts.length
        };
    }, [filteredProducts]);

    // Months to display (2026 only has data up to September)
    const displayMonths = useMemo(() => {
        if (year === '2026') {
            return ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre'];
        }
        return pctData.months;
    }, [year]);

    // Calculate monthly totals for the bottom summary row
    const monthlyTotals = useMemo(() => {
        const totals = {};
        displayMonths.forEach(m => {
            totals[m] = filteredProducts.reduce((sum, p) => sum + (p.monthly[m] || 0), 0);
        });
        return totals;
    }, [filteredProducts, displayMonths]);

    // Export to Excel
    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();

        // 1. Sheet 2026
        const rows26 = [
            ['Segment / Lab', 'Brand Name', ...pctData.months.slice(0, 9), 'Total 2026 Qty']
        ];
        pctData.data2026.forEach(p => {
            rows26.push([
                p.lab,
                p.brand,
                ...pctData.months.slice(0, 9).map(m => p.monthly[m] || 0),
                p.total
            ]);
        });
        const ws26 = XLSX.utils.aoa_to_sheet(rows26);
        XLSX.utils.book_append_sheet(wb, ws26, 'PCT Sales 2026');

        // 2. Sheet 2025
        const rows25 = [
            ['Segment / Lab', 'Brand Name', ...pctData.months, 'Total 2025 Qty']
        ];
        pctData.data2025.forEach(p => {
            rows25.push([
                p.lab,
                p.brand,
                ...pctData.months.map(m => p.monthly[m] || 0),
                p.total
            ]);
        });
        const ws25 = XLSX.utils.aoa_to_sheet(rows25);
        XLSX.utils.book_append_sheet(wb, ws25, 'PCT Sales 2025');

        // 3. Comparison Sheet
        const map2025 = {};
        pctData.data2025.forEach(p => { map2025[p.brand] = p; });
        const rowsComp = [
            ['Segment / Lab', 'Brand Name', 'Total Qty 2025', 'Total Qty 2026 (Jan-Sep)', 'Écart', 'Évolution (%)']
        ];
        pctData.data2026.forEach(p26 => {
            const p25 = map2025[p26.brand] || { total: 0 };
            const diff = p26.total - p25.total;
            const pct = p25.total > 0 ? ((diff / p25.total) * 100).toFixed(1) + '%' : '-';
            rowsComp.push([p26.lab, p26.brand, p25.total, p26.total, diff, pct]);
        });
        const wsComp = XLSX.utils.aoa_to_sheet(rowsComp);
        XLSX.utils.book_append_sheet(wb, wsComp, 'Comparatif 2025-2026');

        XLSX.writeFile(wb, 'PCT_Sales_Data_Imported_Products.xlsx');
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header with Title and Actions */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-100 shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-xl md:text-2xl font-black text-slate-900">
                                    Ventes PCT — Produits Importés
                                </h2>
                                <span className="bg-sky-100 text-sky-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                    Circulaire PCT Révisée
                                </span>
                            </div>
                            <p className="text-slate-500 text-xs md:text-sm mt-0.5">
                                Suivi mensuel des ventes officielles de la Pharmacie Centrale de Tunisie (Tendor, Viatris Retail, Upjohn).
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Year Selector Tabs */}
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                                onClick={() => setYear('2026')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${year === '2026' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                📅 Année 2026 (Jan-Sep)
                            </button>
                            <button
                                onClick={() => setYear('2025')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${year === '2025' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                📅 Année 2025 (Complète)
                            </button>
                            <button
                                onClick={() => setYear('COMPARISON')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${year === 'COMPARISON' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                📊 Comparatif 25 vs 26
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

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
                    <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100">
                        <div className="text-xs text-indigo-700 font-semibold uppercase tracking-wider">Total Ventes 2026</div>
                        <div className="text-xl md:text-2xl font-black text-indigo-900 mt-1">{pctData.total2026.toLocaleString()}</div>
                        <div className="text-[11px] text-indigo-500 mt-0.5">Unités vendues (Jan-Sep)</div>
                    </div>
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Ventes 2025</div>
                        <div className="text-xl md:text-2xl font-black text-slate-800 mt-1">{pctData.total2025.toLocaleString()}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Année complète (12 mois)</div>
                    </div>
                    <div className="bg-sky-50/60 p-3.5 rounded-xl border border-sky-100">
                        <div className="text-xs text-sky-700 font-semibold uppercase tracking-wider">Moyenne Mensuelle 2026</div>
                        <div className="text-xl md:text-2xl font-black text-sky-900 mt-1">{Math.round(pctData.total2026 / 9).toLocaleString()}</div>
                        <div className="text-[11px] text-sky-600 mt-0.5">Unités / mois</div>
                    </div>
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Références Importées</div>
                        <div className="text-xl md:text-2xl font-black text-slate-900 mt-1">{pctData.data2026.length}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">3 segments de marché</div>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                {/* Search */}
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Rechercher par produit (ex: Xanax, Leponex, Viagra, Flecaine)..."
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

                {/* Lab Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-slate-500 mr-1">Laboratoire / Segment :</span>
                    <button
                        onClick={() => setSelectedLab('ALL')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedLab === 'ALL' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        Tous (37)
                    </button>
                    {labs.filter(l => l !== 'ALL').map(l => (
                        <button
                            key={l}
                            onClick={() => setSelectedLab(l)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedLab === l ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            {l} ({pctData.data2026.filter(p => p.lab === l).length})
                        </button>
                    ))}
                </div>
            </div>

            {/* MAIN TABLE (Year 2026 or 2025) */}
            {year !== 'COMPARISON' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <div className="text-sm font-bold text-slate-800">
                            Tableau Détaillé des Ventes PCT — {year === '2026' ? 'Année 2026 (Janvier à Septembre)' : 'Année 2025 (12 Mois)'}
                        </div>
                        <div className="text-xs text-slate-500">
                            {filteredProducts.length} produits affichés
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="iso-table w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider font-bold border-b border-slate-200">
                                    <th className="px-4 py-3 sticky left-0 bg-slate-100 z-10 min-w-56">Produit / Spécialité</th>
                                    <th className="px-3 py-3">Segment</th>
                                    {displayMonths.map(m => (
                                        <th key={m} className="px-3 py-3 text-right whitespace-nowrap">
                                            {m.slice(0, 4)}.
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-right font-black text-indigo-900 bg-indigo-50/70 min-w-28">
                                        Total {year}
                                    </th>
                                    <th className="px-3 py-3 text-right text-slate-600 bg-slate-50">
                                        Moy. Mens.
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProducts.map((p, idx) => {
                                    const labStyle = LAB_COLORS[p.lab] || { badge: 'bg-slate-100 text-slate-700' };
                                    const monthsCount = displayMonths.length;
                                    const avg = monthsCount > 0 ? Math.round(p.total / monthsCount) : 0;

                                    return (
                                        <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-4 py-3 font-bold text-slate-900 sticky left-0 bg-white hover:bg-indigo-50/30 z-10 shadow-xs" data-label="Produit">
                                                {p.brand}
                                            </td>
                                            <td className="px-3 py-3" data-label="Segment">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${labStyle.badge}`}>
                                                    {p.lab}
                                                </span>
                                            </td>
                                            {displayMonths.map(m => {
                                                const val = p.monthly[m] || 0;
                                                return (
                                                    <td key={m} className={`px-3 py-3 text-right font-mono ${val === 0 ? 'text-slate-300' : 'text-slate-700 font-medium'}`} data-label={m}>
                                                        {val > 0 ? val.toLocaleString() : '-'}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-4 py-3 text-right font-mono font-black text-indigo-700 bg-indigo-50/40 text-sm" data-label={`Total ${year}`}>
                                                {p.total.toLocaleString()}
                                            </td>
                                            <td className="px-3 py-3 text-right font-mono text-slate-500 bg-slate-50/50" data-label="Moy. Mens.">
                                                {avg.toLocaleString()}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={displayMonths.length + 4} className="py-12 text-center text-slate-400 italic">
                                            Aucun produit trouvé pour "{searchTerm}".
                                        </td>
                                    </tr>
                                )}

                                {/* Bottom Grand Total Row */}
                                {filteredProducts.length > 0 && (
                                    <tr className="bg-slate-800 text-white font-bold text-xs border-t-2 border-slate-900">
                                        <td className="px-4 py-3 sticky left-0 bg-slate-800 z-10 font-black uppercase tracking-wider">
                                            TOTAL GÉNÉRAL
                                        </td>
                                        <td className="px-3 py-3 text-slate-400">
                                            {filteredProducts.length} réf.
                                        </td>
                                        {displayMonths.map(m => (
                                            <td key={m} className="px-3 py-3 text-right font-mono font-bold text-slate-200">
                                                {monthlyTotals[m].toLocaleString()}
                                            </td>
                                        ))}
                                        <td className="px-4 py-3 text-right font-mono font-black text-amber-300 text-sm bg-slate-900">
                                            {stats.currentTotal.toLocaleString()}
                                        </td>
                                        <td className="px-3 py-3 text-right font-mono text-slate-300 bg-slate-850">
                                            {Math.round(stats.currentTotal / displayMonths.length).toLocaleString()}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* VIEW MODE 3: COMPARISON 2025 vs 2026 */
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <div className="text-sm font-bold text-slate-800">
                            Comparatif Annuel PCT — Année 2025 vs Année 2026 (Janvier à Septembre)
                        </div>
                        <div className="text-xs text-slate-500">
                            {comparisonList.length} produits comparés
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="iso-table w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider font-bold border-b border-slate-200">
                                    <th className="px-4 py-3 sticky left-0 bg-slate-100 z-10 min-w-56">Produit / Spécialité</th>
                                    <th className="px-3 py-3">Segment</th>
                                    <th className="px-4 py-3 text-right">Total 2025 (12 mois)</th>
                                    <th className="px-4 py-3 text-right font-bold text-indigo-900">Total 2026 (Jan-Sep)</th>
                                    <th className="px-4 py-3 text-right">Écart Volume</th>
                                    <th className="px-4 py-3 text-center">Tendance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {comparisonList.map((item, idx) => {
                                    const labStyle = LAB_COLORS[item.lab] || { badge: 'bg-slate-100 text-slate-700' };
                                    const isHigher = item.diff > 0;
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 font-bold text-slate-900 sticky left-0 bg-white hover:bg-slate-50 z-10 shadow-xs" data-label="Produit">
                                                {item.brand}
                                            </td>
                                            <td className="px-3 py-3" data-label="Segment">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${labStyle.badge}`}>
                                                    {item.lab}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-slate-600" data-label="Total 2025">
                                                {item.total2025.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-bold text-indigo-700 bg-indigo-50/30" data-label="Total 2026">
                                                {item.total2026.toLocaleString()}
                                            </td>
                                            <td className={`px-4 py-3 text-right font-mono font-bold ${isHigher ? 'text-emerald-600' : 'text-slate-600'}`} data-label="Écart Volume">
                                                {isHigher ? '+' : ''}{item.diff.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-center" data-label="Tendance">
                                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${isHigher ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                                                    {isHigher ? `+${item.pct}%` : `${item.pct}%`}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {comparisonList.length > 0 && (
                                    <tr className="bg-slate-800 text-white font-bold text-xs border-t-2 border-slate-900">
                                        <td className="px-4 py-3 sticky left-0 bg-slate-800 z-10 font-black uppercase tracking-wider">
                                            TOTAL GÉNÉRAL
                                        </td>
                                        <td className="px-3 py-3 text-slate-400">
                                            {comparisonList.length} réf.
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-slate-200">
                                            {comparisonList.reduce((s, i) => s + i.total2025, 0).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-amber-300 bg-slate-900 font-black">
                                            {comparisonList.reduce((s, i) => s + i.total2026, 0).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-slate-200">
                                            {(comparisonList.reduce((s, i) => s + i.total2026, 0) - comparisonList.reduce((s, i) => s + i.total2025, 0)).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-300">
                                            -
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="text-xs text-slate-400 italic text-right">
                * Source : Circulaires de vente et données révisées de la Pharmacie Centrale de Tunisie (PCT).
            </div>
        </div>
    );
}
