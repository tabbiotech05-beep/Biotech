
import React, { useState, useEffect } from 'react';

export default function StockPCTView() {
    const [stockData, setStockData] = useState({ chambi: [], imported: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeSheet, setActiveSheet] = useState('chambi');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchStockPCT = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/api/stock-pct', {
                    headers: { 'x-auth-token': token }
                });
                if (res.ok) {
                    const data = await res.json();
                    setStockData(data);
                } else {
                    const err = await res.json();
                    setError(err.message || 'Erreur serveur');
                }
            } catch (err) {
                console.error('Error fetching stock PCT:', err);
                setError('Impossible de charger les données.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchStockPCT();
    }, []);

    const chambiData = (stockData.chambi || []).filter(item =>
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const importedData = (stockData.imported || []).filter(item =>
        item.brandName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sheetTabs = [
        { id: 'chambi', label: 'CHAMBI Products', count: stockData.chambi?.length || 0 },
        { id: 'imported', label: 'IMPORTED Products', count: stockData.imported?.length || 0 },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 mb-1">Stock PCT</h2>

                </div>
                <div className="relative w-full md:w-72">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Rechercher un produit..."
                        className="iso-input pl-10 w-full"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); }}
                    />
                </div>
            </div>

            {/* Sheet Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                {sheetTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveSheet(tab.id); setSearchTerm(''); }}
                        className="px-4 py-2.5 text-sm font-bold rounded-t-lg transition-all"
                        style={activeSheet === tab.id ? {
                            color: '#6366f1',
                            borderBottom: '2px solid #6366f1',
                            background: 'rgba(99,102,241,0.06)'
                        } : {
                            color: 'var(--text-muted)',
                        }}
                    >
                        {tab.label}
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-black"
                            style={activeSheet === tab.id
                                ? { background: 'rgba(99,102,241,0.15)', color: '#6366f1' }
                                : { background: 'var(--bg-elevated)', color: 'var(--text-muted)' }
                            }>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="iso-card overflow-hidden">
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="p-12 text-center">
                            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-slate-500 font-medium">Chargement des données...</p>
                        </div>
                    ) : error ? (
                        <div className="p-12 text-center">
                            <p className="text-red-500 font-bold">{error}</p>
                        </div>
                    ) : activeSheet === 'chambi' ? (
                        <table className="iso-table w-full">
                            <thead>
                                <tr>
                                    <th>SKU / Produit</th>
                                    <th>Consommation Moyenne</th>
                                    <th>Prix Grossiste TTC</th>
                                    <th>Stock Entrepôt (DC)</th>
                                    <th>Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {chambiData.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="font-bold text-slate-900">{item.sku}</td>
                                        <td>{typeof item.cm === 'number' ? item.cm.toLocaleString() : item.cm}</td>
                                        <td>{typeof item.price === 'number' ? `${item.price.toFixed(3)} DT` : item.price}</td>
                                        <td className="font-black text-indigo-600">{typeof item.stock === 'number' ? item.stock.toLocaleString() : item.stock}</td>
                                        <td>
                                            {item.stock > 1000 ? (
                                                <span className="iso-badge iso-badge-green">Disponible</span>
                                            ) : item.stock > 0 ? (
                                                <span className="iso-badge iso-badge-amber">Faible</span>
                                            ) : (
                                                <span className="iso-badge iso-badge-red">Rupture</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {chambiData.length === 0 && (
                                    <tr><td colSpan="5" className="text-center py-12 text-slate-500">Aucun produit trouvé</td></tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="iso-table w-full">
                            <thead>
                                <tr>
                                    <th>Nom du Produit</th>
                                    <th>Code PCT</th>
                                    <th>Consommation Moyenne 2025</th>
                                    <th>Stock PCT (31 Jan)</th>
                                    <th>Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {importedData.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="font-bold text-slate-900">{item.brandName}</td>
                                        <td><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{item.pctCode}</span></td>
                                        <td>{typeof item.cm === 'number' ? item.cm.toLocaleString() : item.cm}</td>
                                        <td className="font-black text-indigo-600">{typeof item.stock === 'number' ? item.stock.toLocaleString() : item.stock}</td>
                                        <td>
                                            {item.stock > 1000 ? (
                                                <span className="iso-badge iso-badge-green">Disponible</span>
                                            ) : item.stock > 0 ? (
                                                <span className="iso-badge iso-badge-amber">Faible</span>
                                            ) : (
                                                <span className="iso-badge iso-badge-red">Rupture</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {importedData.length === 0 && (
                                    <tr><td colSpan="5" className="text-center py-12 text-slate-500">Aucun produit trouvé</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
