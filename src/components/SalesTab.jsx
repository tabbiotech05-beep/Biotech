import React, { useState, useMemo } from 'react';
import salesData from '../data/sales_data.json';

export default function SalesTab() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('Tous');

    // Extract unique months for the filter dropdown
    const availableMonths = useMemo(() => {
        const months = new Set(salesData.map(item => item.mois));
        return ['Tous', ...Array.from(months)];
    }, []);

    const filteredData = useMemo(() => {
        return salesData.filter(item => {
            const matchesMonth = selectedMonth === 'Tous' || item.mois === selectedMonth;
            
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm || 
                (item.libelle && item.libelle.toLowerCase().includes(searchLower)) ||
                (item.client && item.client.toLowerCase().includes(searchLower)) ||
                (item.gouvernorat && item.gouvernorat.toLowerCase().includes(searchLower));

            return matchesMonth && matchesSearch;
        });
    }, [searchTerm, selectedMonth]);

    return (
        <div className="flex flex-col gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                        </svg>
                        Ventes Détaillées
                    </h2>
                    
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2.5 transition-colors"
                        >
                            {availableMonths.map(month => (
                                <option key={month} value={month}>{month === 'Tous' ? 'Tous les mois' : month}</option>
                            ))}
                        </select>

                        <div className="relative w-full md:w-72">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Rechercher par libellé, client..."
                                className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 p-2.5 transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-lg bg-white shadow-sm border border-gray-100 h-[600px] relative">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-indigo-50 shadow-sm z-10">
                            <tr className="text-indigo-900 text-xs uppercase tracking-wider">
                                <th className="px-4 py-3 border-b border-indigo-100 font-bold">Mois</th>
                                <th className="px-4 py-3 border-b border-indigo-100 font-bold">Client</th>
                                <th className="px-4 py-3 border-b border-indigo-100 font-bold">Libellé (Spécialité)</th>
                                <th className="px-4 py-3 border-b border-indigo-100 font-bold">Gouvernorat</th>
                                <th className="px-4 py-3 border-b border-indigo-100 font-bold text-center">Quantité</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {filteredData.slice(0, 500).map((row, idx) => (
                                <tr key={idx} className="hover:bg-indigo-50/30 transition-colors border-b border-gray-50 last:border-0">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-indigo-200">
                                            {row.mois}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-800">{row.client}</td>
                                    <td className="px-4 py-3 text-gray-600">{row.libelle}</td>
                                    <td className="px-4 py-3 text-gray-600">{row.gouvernorat}</td>
                                    <td className="px-4 py-3 text-center text-indigo-700 font-black font-mono bg-indigo-50/30 border-l border-indigo-50">
                                        {row.quantite}
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length > 500 && (
                                <tr>
                                    <td colSpan="5" className="px-4 py-6 text-center text-sm text-gray-500 bg-gray-50 italic">
                                        Affichage des 500 premiers résultats sur {filteredData.length}. Veuillez affiner votre recherche.
                                    </td>
                                </tr>
                            )}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-4 py-16 text-center text-gray-400 italic">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Aucun résultat pour cette recherche.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
