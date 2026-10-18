import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import pctData from './pct_imported_sales.json';

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
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header with Title and Actions */}
            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #0284c7, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '20px' }}>
                            🌐
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                                    Ventes PCT — Produits Importés
                                </h2>
                                <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '9999px' }}>
                                    Circulaire PCT Révisée
                                </span>
                            </div>
                            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                                Suivi mensuel des ventes officielles de la Pharmacie Centrale de Tunisie (Tendor, Viatris Retail, Upjohn).
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {/* Year Selector Tabs */}
                        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                            <button
                                onClick={() => setYear('2026')}
                                style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer', background: year === '2026' ? '#fff' : 'transparent', color: year === '2026' ? '#4338ca' : '#475569', boxShadow: year === '2026' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}
                            >
                                📅 Année 2026 (Jan-Sep)
                            </button>
                            <button
                                onClick={() => setYear('2025')}
                                style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer', background: year === '2025' ? '#fff' : 'transparent', color: year === '2025' ? '#4338ca' : '#475569', boxShadow: year === '2025' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}
                            >
                                📅 Année 2025 (12 mois)
                            </button>
                            <button
                                onClick={() => setYear('COMPARISON')}
                                style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer', background: year === 'COMPARISON' ? '#fff' : 'transparent', color: year === 'COMPARISON' ? '#4338ca' : '#475569', boxShadow: year === 'COMPARISON' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}
                            >
                                📊 Comparatif 25 vs 26
                            </button>
                        </div>

                        {/* Export Button */}
                        <button
                            onClick={handleExportExcel}
                            style={{ background: '#059669', color: '#fff', fontWeight: 'bold', fontSize: '12px', padding: '8px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                        >
                            📊 Exporter Excel (.xlsx)
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ background: '#eef2ff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e0e7ff' }}>
                        <div style={{ fontSize: '11px', color: '#4338ca', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Ventes 2026</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#312e81', marginTop: '4px' }}>{pctData.total2026.toLocaleString()}</div>
                        <div style={{ fontSize: '11px', color: '#6366f1', marginTop: '2px' }}>Unités (Janvier à Septembre)</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Ventes 2025</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#1e293b', marginTop: '4px' }}>{pctData.total2025.toLocaleString()}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Année complète (12 mois)</div>
                    </div>
                    <div style={{ background: '#f0f9ff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e0f2fe' }}>
                        <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Moyenne Mensuelle 2026</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0c4a6e', marginTop: '4px' }}>{Math.round(pctData.total2026 / 9).toLocaleString()}</div>
                        <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '2px' }}>Unités / mois</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Références Importées</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#1e293b', marginTop: '4px' }}>{pctData.data2026.length}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>3 segments (Tendor, Viatris, Upjohn)</div>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div style={{ background: '#fff', padding: '1rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
                    <input
                        type="text"
                        placeholder="Rechercher par produit (ex: Xanax, Leponex, Viagra, Flecaine)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '13px', outline: 'none' }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginRight: '4px' }}>Segment :</span>
                    <button
                        onClick={() => setSelectedLab('ALL')}
                        style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: selectedLab === 'ALL' ? '#4f46e5' : '#f1f5f9', color: selectedLab === 'ALL' ? '#fff' : '#475569' }}
                    >
                        Tous (37)
                    </button>
                    {labs.filter(l => l !== 'ALL').map(l => (
                        <button
                            key={l}
                            onClick={() => setSelectedLab(l)}
                            style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: selectedLab === l ? '#4f46e5' : '#f1f5f9', color: selectedLab === l ? '#fff' : '#475569' }}
                        >
                            {l} ({pctData.data2026.filter(p => p.lab === l).length})
                        </button>
                    ))}
                </div>
            </div>

            {/* MAIN TABLE */}
            {year !== 'COMPARISON' ? (
                <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>
                            Tableau Détaillé — {year === '2026' ? 'Année 2026 (Janvier à Septembre)' : 'Année 2025 (12 Mois)'}
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {filteredProducts.length} produits affichés
                        </span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9', color: '#334155', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '12px 16px', position: 'sticky', left: 0, background: '#f1f5f9', minWidth: '220px', zIndex: 2 }}>Produit / Spécialité</th>
                                    <th style={{ padding: '12px 12px', minWidth: '100px' }}>Segment</th>
                                    {displayMonths.map(m => (
                                        <th key={m} style={{ padding: '12px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            {m.slice(0, 4)}.
                                        </th>
                                    ))}
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '900', color: '#312e81', background: '#e0e7ff', minWidth: '110px' }}>
                                        Total {year}
                                    </th>
                                    <th style={{ padding: '12px 12px', textAlign: 'right', color: '#475569', background: '#f8fafc', minWidth: '90px' }}>
                                        Moy. Mens.
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((p, idx) => {
                                    const monthsCount = displayMonths.length;
                                    const avg = monthsCount > 0 ? Math.round(p.total / monthsCount) : 0;
                                    return (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                            <td style={{ padding: '10px 16px', fontWeight: 'bold', color: '#0f172a', position: 'sticky', left: 0, background: idx % 2 === 0 ? '#fff' : '#fafafa', zIndex: 1 }}>
                                                {p.brand}
                                            </td>
                                            <td style={{ padding: '10px 12px' }}>
                                                <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: p.lab === 'Tendor' ? '#fef3c7' : p.lab === 'Viatris Retail' ? '#d1fae5' : '#e0e7ff', color: p.lab === 'Tendor' ? '#92400e' : p.lab === 'Viatris Retail' ? '#065f46' : '#3730a3' }}>
                                                    {p.lab}
                                                </span>
                                            </td>
                                            {displayMonths.map(m => {
                                                const val = p.monthly[m] || 0;
                                                return (
                                                    <td key={m} style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'monospace', color: val > 0 ? '#1e293b' : '#cbd5e1' }}>
                                                        {val > 0 ? val.toLocaleString() : '-'}
                                                    </td>
                                                );
                                            })}
                                            <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '900', color: '#4338ca', background: '#eef2ff' }}>
                                                {p.total.toLocaleString()}
                                            </td>
                                            <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#64748b', background: '#f8fafc' }}>
                                                {avg.toLocaleString()}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {/* Grand Total */}
                                {filteredProducts.length > 0 && (
                                    <tr style={{ background: '#1e293b', color: '#fff', fontWeight: 'bold', borderTop: '2px solid #0f172a' }}>
                                        <td style={{ padding: '12px 16px', position: 'sticky', left: 0, background: '#1e293b', fontWeight: '900', textTransform: 'uppercase', zIndex: 2 }}>
                                            TOTAL GÉNÉRAL
                                        </td>
                                        <td style={{ padding: '12px 12px', color: '#94a3b8' }}>
                                            {filteredProducts.length} réf.
                                        </td>
                                        {displayMonths.map(m => (
                                            <td key={m} style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#e2e8f0' }}>
                                                {monthlyTotals[m].toLocaleString()}
                                            </td>
                                        ))}
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '900', color: '#fde047', background: '#0f172a' }}>
                                            {stats.currentTotal.toLocaleString()}
                                        </td>
                                        <td style={{ padding: '12px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#cbd5e1', background: '#1e293b' }}>
                                            {Math.round(stats.currentTotal / displayMonths.length).toLocaleString()}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* COMPARISON TABLE 2025 vs 2026 */
                <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>
                            Comparatif Annuel PCT — Année 2025 vs Année 2026 (Janvier à Septembre)
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {comparisonList.length} produits comparés
                        </span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9', color: '#334155', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '12px 16px', position: 'sticky', left: 0, background: '#f1f5f9', minWidth: '220px', zIndex: 2 }}>Produit / Spécialité</th>
                                    <th style={{ padding: '12px 12px' }}>Segment</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total 2025 (12 mois)</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: '#312e81' }}>Total 2026 (Jan-Sep)</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Écart Volume</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Évolution</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisonList.map((item, idx) => {
                                    const isHigher = item.diff > 0;
                                    return (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                            <td style={{ padding: '10px 16px', fontWeight: 'bold', color: '#0f172a', position: 'sticky', left: 0, background: idx % 2 === 0 ? '#fff' : '#fafafa', zIndex: 1 }}>
                                                {item.brand}
                                            </td>
                                            <td style={{ padding: '10px 12px' }}>
                                                <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: item.lab === 'Tendor' ? '#fef3c7' : item.lab === 'Viatris Retail' ? '#d1fae5' : '#e0e7ff', color: item.lab === 'Tendor' ? '#92400e' : item.lab === 'Viatris Retail' ? '#065f46' : '#3730a3' }}>
                                                    {item.lab}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#475569' }}>
                                                {item.total2025.toLocaleString()}
                                            </td>
                                            <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#4338ca', background: '#eef2ff' }}>
                                                {item.total2026.toLocaleString()}
                                            </td>
                                            <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: isHigher ? '#059669' : '#475569' }}>
                                                {isHigher ? '+' : ''}{item.diff.toLocaleString()}
                                            </td>
                                            <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '9999px', background: isHigher ? '#d1fae5' : '#f1f5f9', color: isHigher ? '#065f46' : '#475569' }}>
                                                    {isHigher ? `+${item.pct}%` : `${item.pct}%`}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {comparisonList.length > 0 && (
                                    <tr style={{ background: '#1e293b', color: '#fff', fontWeight: 'bold', borderTop: '2px solid #0f172a' }}>
                                        <td style={{ padding: '12px 16px', position: 'sticky', left: 0, background: '#1e293b', fontWeight: '900', textTransform: 'uppercase', zIndex: 2 }}>
                                            TOTAL GÉNÉRAL
                                        </td>
                                        <td style={{ padding: '12px 12px', color: '#94a3b8' }}>
                                            {comparisonList.length} réf.
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#e2e8f0' }}>
                                            {comparisonList.reduce((s, i) => s + i.total2025, 0).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#fde047', background: '#0f172a', fontWeight: '900' }}>
                                            {comparisonList.reduce((s, i) => s + i.total2026, 0).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#e2e8f0' }}>
                                            {(comparisonList.reduce((s, i) => s + i.total2026, 0) - comparisonList.reduce((s, i) => s + i.total2025, 0)).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8' }}>
                                            -
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'right' }}>
                * Source : Circulaires de vente et données révisées de la Pharmacie Centrale de Tunisie (PCT).
            </div>
        </div>
    );
}
