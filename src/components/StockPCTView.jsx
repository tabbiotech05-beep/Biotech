import React, { useState, useEffect } from 'react';
import pctSalesDataRaw from '../data/pct_sales_data.json';
import PctPricesTab from './PctPricesTab';
import SalesTab from './SalesTab';
import ExpiryTab from './ExpiryTab';

export default function StockPCTView() {
    const [stockData, setStockData] = useState({ chambi: [], imported: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeCategory, setActiveCategory] = useState('products'); // 'products' | 'sales'
    const [activeProductsTab, setActiveProductsTab] = useState('chambi');
    const [activeSalesTab, setActiveSalesTab] = useState('sales_pct');
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

    const pctSalesData = pctSalesDataRaw.filter(item =>
        item.brandName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const productsTabs = [
        { id: 'chambi', label: 'CHAMBI Products', count: stockData.chambi?.length || 0 },
        { id: 'imported', label: 'IMPORTED Products', count: stockData.imported?.length || 0 },
        { id: 'prices_pct', label: 'PRIX PCT', count: '-' },
    ];

    const salesTabs = [
        { id: 'sales_pct', label: 'VENTES & DATA PCT', count: pctSalesDataRaw.length },
        { id: 'sales_detail', label: 'VENTES DÉTAILLÉES', count: '-' },
    ];

    return (
        <div className="space-y-6 pb-12 w-full max-w-full">
            {/* Global Header & Search */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 mb-1">PCT</h2>
                        <p className="text-slate-500 text-sm">Vue globale des produits et des ventes</p>
                    </div>
                    <div className="relative w-full md:w-96">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Rechercher un produit (Global)..."
                            className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 p-3 transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Master Category Selector */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <button
                    onClick={() => setActiveCategory('products')}
                    className={`flex-1 py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-all ${activeCategory === 'products' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}
                >
                    <span className="text-xl">📦</span>
                    1. Produits & Prix
                </button>
                <button
                    onClick={() => setActiveCategory('sales')}
                    className={`flex-1 py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-all ${activeCategory === 'sales' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}
                >
                    <span className="text-xl">📈</span>
                    2. Analyse des Ventes
                </button>
                <button
                    onClick={() => setActiveCategory('expiry')}
                    className={`flex-1 py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-all ${activeCategory === 'expiry' ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}
                >
                    <span className="text-xl">⚠️</span>
                    3. Proches Expiration
                </button>
            </div>

            {/* Conditional Content Rendering Based on Active Category */}
            {activeCategory === 'products' ? (
                /* SECTION 1: Produits & Prix */
                <div className="space-y-4 animate-fadeIn">
                    {/* Products Tabs */}
                    <div className="flex gap-2 border-b border-slate-200 bg-white/50 pt-2 px-2 rounded-t-lg">
                        {productsTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveProductsTab(tab.id)}
                                className="px-5 py-3 text-sm font-bold rounded-t-lg transition-all"
                                style={activeProductsTab === tab.id ? {
                                    color: '#6366f1',
                                    borderBottom: '2px solid #6366f1',
                                    background: 'rgba(99,102,241,0.06)'
                                } : {
                                    color: 'var(--text-muted)',
                                }}
                            >
                                {tab.label}
                                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-black"
                                    style={activeProductsTab === tab.id
                                        ? { background: 'rgba(99,102,241,0.15)', color: '#6366f1' }
                                        : { background: 'var(--bg-elevated)', color: 'var(--text-muted)' }
                                    }>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Products Content */}
                    <div className="iso-card overflow-hidden !rounded-tl-none border border-slate-200 shadow-sm">
                        <div className="overflow-x-auto">
                            {isLoading ? (
                                <div className="p-12 text-center">
                                    <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                                    <p className="text-slate-500 font-medium">Chargement des produits...</p>
                                </div>
                            ) : error ? (
                                <div className="p-12 text-center">
                                    <p className="text-red-500 font-bold">{error}</p>
                                </div>
                            ) : activeProductsTab === 'chambi' ? (
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
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="font-bold text-slate-900" data-label="SKU / Produit">{item.sku}</td>
                                                <td data-label="Consommation Moyenne">{typeof item.cm === 'number' ? item.cm.toLocaleString() : item.cm}</td>
                                                <td data-label="Prix Grossiste TTC">{typeof item.price === 'number' ? `${item.price.toFixed(3)} DT` : item.price}</td>
                                                <td className="font-black text-indigo-600" data-label="Stock Entrepôt (DC)">{typeof item.stock === 'number' ? item.stock.toLocaleString() : item.stock}</td>
                                                <td data-label="Statut">
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
                            ) : activeProductsTab === 'imported' ? (
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
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="font-bold text-slate-900" data-label="Nom du Produit">{item.brandName}</td>
                                                <td data-label="Code PCT"><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{item.pctCode}</span></td>
                                                <td data-label="Consommation Moyenne 2025">{typeof item.cm === 'number' ? item.cm.toLocaleString() : item.cm}</td>
                                                <td className="font-black text-indigo-600" data-label="Stock PCT (31 Jan)">{typeof item.stock === 'number' ? item.stock.toLocaleString() : item.stock}</td>
                                                <td data-label="Statut">
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
                            ) : (
                                <div className="p-4 bg-white">
                                    <PctPricesTab />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : activeCategory === 'sales' ? (
                /* SECTION 2: Analyse des Ventes */
                <div className="space-y-4 animate-fadeIn">
                    {/* Sales Tabs */}
                    <div className="flex gap-2 border-b border-slate-200 bg-white/50 pt-2 px-2 rounded-t-lg">
                        {salesTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSalesTab(tab.id)}
                                className="px-5 py-3 text-sm font-bold rounded-t-lg transition-all"
                                style={activeSalesTab === tab.id ? {
                                    color: '#10b981',
                                    borderBottom: '2px solid #10b981',
                                    background: 'rgba(16,185,129,0.06)'
                                } : {
                                    color: 'var(--text-muted)',
                                }}
                            >
                                {tab.label}
                                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-black"
                                    style={activeSalesTab === tab.id
                                        ? { background: 'rgba(16,185,129,0.15)', color: '#10b981' }
                                        : { background: 'var(--bg-elevated)', color: 'var(--text-muted)' }
                                    }>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Sales Content */}
                    <div className="iso-card overflow-hidden !rounded-tl-none border border-slate-200 shadow-sm">
                        <div className="overflow-x-auto">
                            {activeSalesTab === 'sales_pct' ? (
                                <table className="iso-table w-full text-sm">
                                    <thead>
                                        <tr>
                                            <th>Nom du Produit</th>
                                            <th className="text-center">Ventes Moy.</th>
                                            <th className="text-center">Janvier</th>
                                            <th className="text-center">Février</th>
                                            <th className="text-center">Inventaire f. Fév</th>
                                            <th className="text-center">MOH</th>
                                            <th className="text-center">App. Mars</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {pctSalesData.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="font-bold text-slate-900" data-label="Nom du Produit">{item.brandName}</td>
                                                <td className="text-center text-slate-600 font-mono" data-label="Ventes Moy.">{typeof item.avgMonthlySales === 'number' ? item.avgMonthlySales.toLocaleString() : '-'}</td>
                                                <td className="text-center text-slate-600 font-mono" data-label="Janvier">{typeof item.janSales === 'number' ? item.janSales.toLocaleString() : '-'}</td>
                                                <td className="text-center text-slate-600 font-mono" data-label="Février">{typeof item.febSales === 'number' ? item.febSales.toLocaleString() : '-'}</td>
                                                <td className="text-center font-black text-indigo-700 font-mono bg-indigo-50/30" data-label="Inventaire f. Fév">{typeof item.closingInventory === 'number' ? item.closingInventory.toLocaleString() : '-'}</td>
                                                <td className="text-center" data-label="MOH">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${item.moh < 2 ? 'bg-red-100 text-red-700' : item.moh > 6 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-800'}`}>
                                                        {typeof item.moh === 'number' ? item.moh.toFixed(2) : '-'}
                                                    </span>
                                                </td>
                                                <td className="text-center text-slate-600 font-mono" data-label="App. Mars">{typeof item.supplies === 'number' ? item.supplies.toLocaleString() : '-'}</td>
                                            </tr>
                                        ))}
                                        {pctSalesData.length === 0 && (
                                            <tr><td colSpan="7" className="text-center py-12 text-slate-500">Aucun résultat pour "{searchTerm}"</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-4 bg-white">
                                    <SalesTab />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* SECTION 3: Proches Expiration */
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-fadeIn">
                    <ExpiryTab />
                </div>
            )}
        </div>
    );
}
