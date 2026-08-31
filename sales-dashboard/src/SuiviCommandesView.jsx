import React, { useState, useEffect } from 'react';

function StatusBadge({ status }) {
    const s = (status || '').toLowerCase();
    let cls = 'status-badge ';
    if (s.includes('invoice shared')) cls += 'bg-emerald-100 text-emerald-800';
    else if (s.includes('delivered') || s.includes('livré')) cls += 'bg-blue-100 text-blue-800';
    else if (s.includes('pending') || s.includes('en attente')) cls += 'bg-amber-100 text-amber-800';
    else if (s.includes('cancelled') || s.includes('annulé')) cls += 'bg-red-100 text-red-800';
    else cls += 'bg-slate-100 text-slate-600';
    return <span className={cls} style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{status || '—'}</span>;
}

export default function SuiviCommandesView() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        // The path in sales-dashboard is just relative to the public folder
        fetch(import.meta.env.BASE_URL + 'sales_orders.json')
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

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'white' }}>
            Chargement des commandes...
        </div>
    );

    return (
        <div className="table-container history-card" style={{ width: '100%', margin: '0 auto' }}>
            <div className="section-header-with-action" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                <div className="header-text">
                    <h3 style={{ color: 'white' }}>Suivi des Commandes</h3>
                    <p className="table-subtitle" style={{ color: '#aaa' }}>Affichage de {filtered.length} commandes.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input type="text" placeholder="Rechercher client ou N° SAP..." value={search} onChange={e => setSearch(e.target.value)} 
                        style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white' }} />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white' }}>
                        <option value="">Tous les statuts</option>
                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            <div className="table-wrapper" style={{ overflowX: 'auto', marginTop: '1rem', background: 'transparent' }}>
                <table style={{ width: '100%', color: '#ddd', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #444' }}>
                            {cols.map(c => (<th key={c.key} style={{ padding: '12px 8px', color: '#9CA3AF' }}>{c.label}</th>))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((o, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #333', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                                {cols.map(c => (
                                    <td key={c.key} style={{ padding: '10px 8px' }}>
                                        {c.key === 'status' ? (<StatusBadge status={o[c.key]} />)
                                        : (c.key === 'prepared' || c.key === 'confirmedDelivery') ? (
                                            <span style={{ color: o[c.key] === '✓' ? '#10B981' : '#F87171', fontWeight: 'bold', fontSize: '14px' }}>{o[c.key] || '—'}</span>
                                        ) : (c.key === 'confirmLeadDays' || c.key === 'prepLeadDays' || c.key === 'invoiceLeadDays') ? (
                                            <span style={{ fontWeight: 'bold', color: Number(o[c.key]) > 5 ? '#F87171' : Number(o[c.key]) > 3 ? '#FBBF24' : '#10B981' }}>{o[c.key] || '—'}</span>
                                        ) : (<span>{o[c.key] || '—'}</span>)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && (<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Aucune commande trouvée.</div>)}
            </div>
            <div style={{ marginTop: '1rem', fontSize: '11px', color: '#888', display: 'flex', gap: '1rem' }}>
                <span>Lead time :</span>
                <span style={{ color: '#10B981' }}>● ≤ 3 jours</span>
                <span style={{ color: '#FBBF24' }}>● 4-5 jours</span>
                <span style={{ color: '#F87171' }}>● &gt; 5 jours</span>
            </div>
        </div>
    );
}
