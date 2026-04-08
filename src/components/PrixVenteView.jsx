import React, { useState } from 'react';
import pricesData from '../data/biosim_prices.json';
import ventesData from '../data/biosim_ventes.json';
import stockData from '../data/biosim_stock.json';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

export default function PrixVenteView() {
    const [chartMode, setChartMode] = useState('ventes'); // 'ventes' or 'stock'
    const [selectedBrand, setSelectedBrand] = useState('All');

    const availableBrands = Object.keys(ventesData[0]?.brands || {});

    // Prepare chart data: combine annee and mois for X axis
    const activeData = chartMode === 'ventes' ? ventesData : stockData;
    const chartData = activeData.map(item => {
        const payload = {
            ...item.brands,
            date: `${item.mois.substring(0,3)} ${item.annee}`
        };
        return payload;
    });

    const colors = [
        '#6366f1', '#10b981', '#f59e0b', '#ef4444', 
        '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
    ];

    const formatCurrency = (val) => {
        if (!val && val !== 0) return '-';
        return Number(val).toFixed(3) + ' TND';
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[600px] space-y-10">
            {/* HEADER */}
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Prix & Ventes (Biotech)</h2>
                <p className="text-sm text-gray-500">Visualisation des nouveaux prix Biosim et analyse des courbes de Ventes-Stock PCT (2024-2026).</p>
            </div>

            {/* PRIX TABLE SECTION */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 border-b pb-2">
                    <span className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </span>
                    <h3 className="text-xl font-bold text-gray-800">Nouveaux Prix Biosim</h3>
                </div>
                
                <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200 uppercase tracking-widest text-[10px]">
                            <tr>
                                <th className="px-4 py-3">Code PCT</th>
                                <th className="px-4 py-3">Désignation PCT</th>
                                <th className="px-4 py-3 text-right text-gray-400">Ancien P.Public</th>
                                <th className="px-4 py-3 text-right text-emerald-600 font-bold bg-emerald-50/50">Nvx Hôpital</th>
                                <th className="px-4 py-3 text-right text-blue-600 font-bold bg-blue-50/50">Nvx Officine</th>
                                <th className="px-4 py-3 text-right text-indigo-600 font-bold bg-indigo-50/50">Nvx Public</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {pricesData.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-semibold text-gray-700">{item.codePCT}</td>
                                    <td className="px-4 py-3 text-gray-600 font-medium max-w-sm truncate" title={item.designation}>{item.designation}</td>
                                    <td className="px-4 py-3 text-right text-gray-400">{formatCurrency(item.ancienPrixPublic)}</td>
                                    <td className="px-4 py-3 text-right font-black text-emerald-600 bg-emerald-50/20">{formatCurrency(item.nouveauHopital)}</td>
                                    <td className="px-4 py-3 text-right font-black text-blue-600 bg-blue-50/20">{formatCurrency(item.nouveauOfficine)}</td>
                                    <td className="px-4 py-3 text-right font-black text-indigo-600 bg-indigo-50/20">{formatCurrency(item.nouveauPublic)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CHART SECTION */}
            <div className="space-y-6 pt-6 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                        </span>
                        <h3 className="text-xl font-bold text-gray-800">Évolution des Courbes PCT</h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Data Mode Switch */}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setChartMode('ventes')}
                                className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-md transition-all ${chartMode === 'ventes' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Ventes
                            </button>
                            <button
                                onClick={() => setChartMode('stock')}
                                className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-md transition-all ${chartMode === 'stock' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Stock
                            </button>
                        </div>

                        {/* Brand Filter */}
                        <select 
                            value={selectedBrand} 
                            onChange={(e) => setSelectedBrand(e.target.value)}
                            className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block px-3 py-2 font-bold"
                        >
                            <option value="All">Toutes les marques</option>
                            {availableBrands.map((b, i) => (
                                <option key={i} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="h-[400px] w-full bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart key={`${chartMode}-${selectedBrand}`} data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis 
                                dataKey="date" 
                                tick={{fontSize: 11, fill: '#6B7280'}} 
                                axisLine={false} 
                                tickLine={false} 
                                dy={10}
                            />
                            <YAxis 
                                tick={{fontSize: 11, fill: '#6B7280'}} 
                                axisLine={false} 
                                tickLine={false} 
                                tickFormatter={(value) => value.toLocaleString()}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                itemStyle={{ fontWeight: '800' }}
                            />
                            <Legend 
                                iconType="circle" 
                                wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '20px' }} 
                            />
                            
                            {availableBrands.map((brand, i) => {
                                if (selectedBrand !== 'All' && selectedBrand !== brand) return null;
                                return (
                                    <Line
                                        key={brand}
                                        type="monotone"
                                        dataKey={brand}
                                        stroke={colors[i % colors.length]}
                                        strokeWidth={3}
                                        dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                        animationDuration={1000}
                                    />
                                );
                            })}
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* REPRESENTATIVE DATA TABLE */}
                <div className="mt-8 overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                    <table className="min-w-full text-sm text-center">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200 uppercase tracking-widest text-[10px]">
                            <tr>
                                <th className="px-4 py-3 text-left">Période</th>
                                {availableBrands.map(b => (
                                    (selectedBrand === 'All' || selectedBrand === b) && (
                                        <th key={b} className="px-4 py-3">{b}</th>
                                    )
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {chartData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-bold text-gray-700 text-left whitespace-nowrap">{row.date}</td>
                                    {availableBrands.map(b => (
                                        (selectedBrand === 'All' || selectedBrand === b) && (
                                            <td key={b} className="px-4 py-3 font-medium text-gray-600">
                                                {row[b] ? row[b].toLocaleString() : '-'}
                                            </td>
                                        )
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
