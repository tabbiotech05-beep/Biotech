import React, { useState, useEffect } from 'react';

const IconImport = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" /></svg>);
const IconLocal = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const IconStockG = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>);
const IconOrder = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>);
const IconAvantage = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const IconSuivi = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>);

function StatusBadge({ status }) {
    const s = (status || '').toLowerCase();
    let cls = 'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ';
    if (s.includes('invoice shared')) cls += 'bg-emerald-100 text-emerald-800';
    else if (s.includes('delivered') || s.includes('livré')) cls += 'bg-blue-100 text-blue-800';
    else if (s.includes('pending') || s.includes('en attente')) cls += 'bg-amber-100 text-amber-800';
    else if (s.includes('cancelled') || s.includes('annulé')) cls += 'bg-red-100 text-red-800';
    else cls += 'bg-slate-100 text-slate-600';
    return <span className={cls}>{status || '—'}</span>;
}

function SuiviCommandesView() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        fetch('/sales_orders.json')
            .then(r => r.json())
            .then(d => { setOrders(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const statuses = [...new Set(orders.map(o => o.status).filter(Boolean))].sort();
    const filtered = orders.filter(o => {
        const matchSearch = !search || o.client?.toLowerCase().includes(search.toLowerCase()) || o.sdDocNo?.includes(search);
        const matchStatus = !statusFilter || o.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const cols = [
        { key: 'client', label: 'Client' },
        { key: 'orderDate', label: 'Date Cmd' },
        { key: 'sapEntryDate', label: 'SAP Entrée' },
        { key: 'sapReleaseDate', label: 'SAP Release' },
        { key: 'confirmLeadDays', label: 'Lead Confirm (j)' },
        { key: 'sdDocNo', label: 'N° SAP' },
        { key: 'docSharedWithWh', label: 'Doc → Entrepôt' },
        { key: 'prepDate', label: 'Date Prép.' },
        { key: 'prepared', label: 'Préparé' },
        { key: 'prepLeadDays', label: 'Lead Prép. (j)' },
        { key: 'plannedDelivery', label: 'Livr. Prévue' },
        { key: 'confirmedDelivery', label: 'Livr. Conf.' },
        { key: 'actualDelivery', label: 'Livr. Réelle' },
        { key: 'invoiceShared', label: 'Facture Client' },
        { key: 'invoiceLeadDays', label: 'Lead Fact. (j)' },
        { key: 'status', label: 'Statut' },
        { key: 'comments', label: 'Commentaires' },
    ];

    if (loading) return (<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
                <input type="text" placeholder="Rechercher client ou N° SAP..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 min-w-48 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    <option value="">Tous les statuts</option>
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="flex items-center px-3 py-2 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-100">{filtered.length} commandes</span>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                <table className="min-w-full text-xs text-left">
                    <thead>
                        <tr className="bg-indigo-600 text-white">
                            {cols.map(c => (<th key={c.key} className="px-3 py-3 font-bold whitespace-nowrap text-[10px] uppercase tracking-wider">{c.label}</th>))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filtered.map((o, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white hover:bg-indigo-50 transition-colors' : 'bg-slate-50/50 hover:bg-indigo-50 transition-colors'}>
                                {cols.map(c => (
                                    <td key={c.key} className="px-3 py-2.5 whitespace-nowrap">
                                        {c.key === 'status' ? (<StatusBadge status={o[c.key]} />)
                                        : (c.key === 'prepared' || c.key === 'confirmedDelivery') ? (
                                            <span className={o[c.key] === '✓' ? 'text-emerald-600 font-bold text-base' : 'text-red-400 font-bold'}>{o[c.key] || '—'}</span>
                                        ) : (c.key === 'confirmLeadDays' || c.key === 'prepLeadDays' || c.key === 'invoiceLeadDays') ? (
                                            <span className={`font-bold ${Number(o[c.key]) > 5 ? 'text-red-500' : Number(o[c.key]) > 3 ? 'text-amber-500' : 'text-emerald-600'}`}>{o[c.key] || '—'}</span>
                                        ) : (<span className="text-slate-700">{o[c.key] || '—'}</span>)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && (<div className="py-16 text-center text-slate-400 text-sm">Aucune commande trouvée.</div>)}
            </div>
            <div className="flex flex-wrap gap-4 text-[10px] font-semibold text-slate-500 px-1">
                <span>Lead time :</span>
                <span className="text-emerald-600">● ≤ 3 jours</span>
                <span className="text-amber-500">● 4-5 jours</span>
                <span className="text-red-500">● &gt; 5 jours</span>
            </div>
        </div>
    );
}

function PlaceholderTab({ icon, title, description }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-400 text-3xl border border-indigo-100">{icon}</div>
            <h3 className="text-lg font-black text-slate-700 uppercase tracking-tight">{title}</h3>
            <p className="text-sm text-slate-400 max-w-xs">{description}</p>
            <span className="px-4 py-1.5 bg-slate-100 text-slate-400 text-xs font-bold rounded-full uppercase tracking-wider">Bientôt disponible</span>
        </div>
    );
}

function ExternalDashLink({ label }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </div>
            <h3 className="text-lg font-black text-slate-700 uppercase tracking-tight">{label}</h3>
            <p className="text-sm text-slate-400 max-w-xs">Cette section s'ouvre dans le tableau de bord analytique dédié.</p>
            <a href="/grossiste/" target="_blank" rel="noopener noreferrer" className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                Ouvrir le Dashboard Analytique
            </a>
        </div>
    );
}

const SUB_TABS = [
    { id: 'produits-importes', label: 'Produits Importés', icon: <IconImport /> },
    { id: 'produits-locaux',   label: 'Produits Locaux',   icon: <IconLocal /> },
    { id: 'stock',             label: 'Stock',             icon: <IconStockG /> },
    { id: 'commandes',         label: 'Commandes',         icon: <IconOrder /> },
    { id: 'avantages',         label: 'Avantages Commerciaux', icon: <IconAvantage /> },
    { id: 'suivi-commandes',   label: 'Suivi Commandes',   icon: <IconSuivi /> },
];

export default function GrossisteView() {
    const [activeTab, setActiveTab] = useState('suivi-commandes');

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm min-h-[600px] overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5">
                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                    <svg className="w-6 h-6 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    Section Grossiste — Tenshi
                </h2>
                <p className="text-indigo-200 text-xs mt-1">Gestion commerciale et suivi des opérations grossiste</p>
            </div>
            <div className="border-b border-slate-100 bg-slate-50/50 overflow-x-auto">
                <div className="flex gap-0 min-w-max px-4 py-2">
                    {SUB_TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all mr-1 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' : 'text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm'}`}>
                            {tab.icon}
                            <span className="whitespace-nowrap">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div className="p-6">
                {activeTab === 'suivi-commandes' && <SuiviCommandesView />}
                {activeTab === 'produits-importes' && <ExternalDashLink label="Produits Importés" />}
                {activeTab === 'produits-locaux' && <ExternalDashLink label="Produits Locaux" />}
                {activeTab === 'stock' && <PlaceholderTab icon={<IconStockG />} title="Stock Grossiste" description="Visualisation du stock actuel par produit et par dépôt." />}
                {activeTab === 'commandes' && <PlaceholderTab icon={<IconOrder />} title="Commandes" description="Historique et gestion des commandes grossiste." />}
                {activeTab === 'avantages' && <PlaceholderTab icon={<IconAvantage />} title="Avantages Commerciaux" description="Conditions commerciales, remises et avantages accordés aux grossistes." />}
            </div>
        </div>
    );
}
