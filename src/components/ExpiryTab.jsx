import React, { useState } from 'react';
import expiryData from '../data/expiry_data.json';

export default function ExpiryTab() {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredData = expiryData.filter(item =>
        item.libelle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.depot.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.numLot.toString().includes(searchTerm)
    );

    const getStatusBadge = (rawDate) => {
        const now = new Date().getTime();
        const diffMonths = (rawDate - now) / (1000 * 60 * 60 * 24 * 30.44);

        if (diffMonths < 0) return <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-black uppercase">Périmé</span>;
        if (diffMonths < 3) return <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-black uppercase tracking-wider">Critique (&lt;3m)</span>;
        if (diffMonths < 6) return <span className="bg-amber-100 text-amber-600 px-2 py-1 rounded text-xs font-black uppercase tracking-wider">Urgent (&lt;6m)</span>;
        return <span className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded text-xs font-black uppercase tracking-wider">Stable</span>;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                    <h3 className="text-lg font-black text-slate-800">Produits proches d'échéance</h3>
                    <p className="text-xs text-slate-500 font-medium">Inventaire complet avec alertes de péremption</p>
                </div>
                <div className="relative w-full md:w-80">
                    <input
                        type="text"
                        placeholder="Filtrer par produit, lot, dépôt..."
                        className="w-full bg-white border border-slate-200 text-sm rounded-lg px-10 py-2.5 focus:ring-2 focus:ring-rose-500 transition-all outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="iso-table w-full">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-left">Produit (Libellé)</th>
                            <th className="px-4 py-3 text-left">Dépôt / Emplacement</th>
                            <th className="px-4 py-3 text-center">Numéro Lot</th>
                            <th className="px-4 py-3 text-center">Stock</th>
                            <th className="px-4 py-3 text-center">Date Péremption</th>
                            <th className="px-4 py-3 text-center">Alerte</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredData.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-4 font-black text-slate-900 text-xs max-w-xs">{item.libelle}</td>
                                <td className="px-4 py-4 text-xs font-bold text-slate-600">{item.depot}</td>
                                <td className="px-4 py-4 text-center font-mono text-xs text-indigo-600 font-bold">{item.numLot}</td>
                                <td className="px-4 py-4 text-center font-black text-slate-700">{item.stock}</td>
                                <td className="px-4 py-4 text-center">
                                    <div className="flex flex-col items-center">
                                        <span className="font-bold text-slate-800">{item.expiryDate}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    {getStatusBadge(item.rawDate)}
                                </td>
                            </tr>
                        ))}
                        {filteredData.length === 0 && (
                            <tr>
                                <td colSpan="6" className="py-20 text-center text-slate-400 italic">
                                    Aucun produit trouvé pour cette recherche.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
