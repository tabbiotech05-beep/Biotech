import React, { useState } from 'react';
import pricesData from '../data/pct_prices.json';

export default function PctPricesTab() {
    const [activeSubTab, setActiveSubTab] = useState('tenshi');
    const [searchTerm, setSearchTerm] = useState('');

    const handleSearch = (e) => setSearchTerm(e.target.value.toLowerCase());

    const filterData = (dataArray) => {
        if (!searchTerm) return dataArray;
        return dataArray.filter(item => {
            const isGroupHeader = item.specialty && !item.dosage;
            if (isGroupHeader) return true; // Keep headers; we can clean up orphans later if needed
            return (
                (item.specialty && item.specialty.toLowerCase().includes(searchTerm)) ||
                (item.dosage && item.dosage.toString().toLowerCase().includes(searchTerm))
            );
        });
    };

    const tenshiPrices = filterData(pricesData.tenshi);
    const competitorPrices = filterData(pricesData.competitors);

    const renderTableFormat = (data, isCompetitorView) => {
        return (
            <div className="overflow-x-auto mt-4 rounded-lg bg-white shadow-sm border border-gray-100">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-indigo-50 text-indigo-900 text-xs uppercase tracking-wider">
                            <th className="px-4 py-3 border-b border-indigo-100 font-bold">Spécialité</th>
                            <th className="px-4 py-3 border-b border-indigo-100 font-bold">Dosage</th>
                            <th className="px-4 py-3 border-b border-indigo-100 font-bold text-right">Grossiste TTC (TND)</th>
                            <th className="px-4 py-3 border-b border-indigo-100 font-bold text-right">Pharmacie TTC (TND)</th>
                            <th className="px-4 py-3 border-b border-indigo-100 font-bold text-right">Public TTC (TND)</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {data.map((row, idx) => {
                            const isGroupHeader = row.specialty && !row.dosage;
                            
                            if (isGroupHeader) {
                                return (
                                    <tr key={idx} className="bg-gray-100 border-b border-gray-200">
                                        <td colSpan="5" className="px-4 py-3 font-semibold text-gray-700 italic">
                                            {row.specialty}
                                        </td>
                                    </tr>
                                );
                            }

                            return (
                                <tr key={idx} className="hover:bg-indigo-50/30 transition-colors border-b border-gray-50 last:border-0">
                                    <td className="px-4 py-3 font-medium text-gray-800">{row.specialty}</td>
                                    <td className="px-4 py-3 text-gray-600">{row.dosage}</td>
                                    <td className="px-4 py-3 text-right text-gray-700 font-mono">
                                        {row.priceWholesale ? Number(row.priceWholesale).toFixed(3) : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-700 font-mono">
                                        {row.pricePharmacy ? Number(row.pricePharmacy).toFixed(3) : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-indigo-700 font-mono">
                                        {row.pricePublic ? Number(row.pricePublic).toFixed(3) : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-4 py-8 text-center text-gray-500 italic">
                                    Aucun résultat trouvé pour "{searchTerm}"
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Prix PCT Officiels
                    </h2>
                    <div className="relative w-full md:w-72">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Rechercher par spécialité ou dosage..."
                            className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 p-2.5 transition-colors"
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                    </div>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg w-fit mb-4">
                    <button
                        onClick={() => setActiveSubTab('tenshi')}
                        className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeSubTab === 'tenshi' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Produits Tenshi
                    </button>
                    <button
                        onClick={() => setActiveSubTab('competitors')}
                        className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeSubTab === 'competitors' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Produits Concurrents
                    </button>
                </div>

                {activeSubTab === 'tenshi' ? renderTableFormat(tenshiPrices, false) : renderTableFormat(competitorPrices, true)}
                
                <div className="mt-4 text-xs text-gray-500 italic text-right">
                    * Données extraites depuis : Prix Concurrents Tenshi selon circulaires PCT
                </div>
            </div>
        </div>
    );
}
