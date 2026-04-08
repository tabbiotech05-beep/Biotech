import React, { useState } from 'react';
import listingsData from '../data/listings_data.json';

const categories = [
    { id: 'Oncologie', label: 'Oncologues', icon: '🎗️' },
    { id: 'Rhumatologie', label: 'Rhumatologues', icon: '🦴' },
    { id: 'Gastro-entérologie', label: 'Gastro / Entéro', icon: '🩺' },
    { id: 'Médecine Interne', label: 'M. Interne', icon: '🏥' }
];

export default function ListingView() {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('Oncologie');

    const filteredData = listingsData.filter(item =>
        item.category === activeCategory && (
            item.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.ville.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.gouvernorat.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6 min-h-[700px]">
            {/* Header + Search */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-50 pb-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Répertoire Médical</h2>
                    <p className="text-sm text-slate-500 font-medium italic">Accès rapide aux coordonnées des spécialistes Biotech.</p>
                </div>
                <div className="relative w-full md:w-96">
                    <input
                        type="text"
                        placeholder="Chercher par nom, ville, gouvernorat..."
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Category Selector */}
            <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 border-2 ${activeCategory === cat.id 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105' 
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-600'}`}
                    >
                        <span>{cat.icon}</span>
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-2 px-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    {filteredData.length} résultats trouvés dans {activeCategory}
                </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                <table className="min-w-full text-sm text-left">
                    <thead className="bg-slate-50/50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                            <th className="px-6 py-4">Spécialiste</th>
                            <th className="px-6 py-4">Localisation</th>
                            <th className="px-6 py-4">Contact</th>
                            <th className="px-6 py-4">Adresse Professionnelle</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredData.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-extrabold text-slate-900">{item.titre} {item.nom} {item.prenom}</div>
                                    <div className="text-[11px] font-bold text-indigo-500 uppercase mt-0.5">{item.specialite}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-700">{item.ville}</div>
                                    <div className="text-[10px] text-slate-400 font-medium uppercase">{item.gouvernorat}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1.5">
                                        {(item.mobile || item.telephone) && (
                                            <div className="flex items-center gap-2 text-slate-800 bg-slate-100 w-fit px-2 py-0.5 rounded-md border border-slate-200">
                                                <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                                <span className="font-mono text-[11px] font-black">{item.mobile || item.telephone}</span>
                                            </div>
                                        )}
                                        {item.email && (
                                            <div className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer group">
                                                <svg className="w-3 h-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 01-2 2v10a2 2 0 012 2z" />
                                                </svg>
                                                <span className="text-[11px] font-bold truncate max-w-[150px] underline decoration-indigo-200 underline-offset-2" title={item.email}>{item.email}</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-slate-500 text-xs font-medium leading-relaxed max-w-xs">{item.adresse}</p>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {filteredData.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                    <svg className="w-16 h-16 mb-4 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="italic font-bold">Aucun résultat trouvé pour cette spécialité et ce filtrage.</p>
                </div>
            )}
        </div>
    );
}
