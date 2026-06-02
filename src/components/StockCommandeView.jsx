import React, { useState, useEffect } from 'react';

const TABS = [
  { id: 'openOrders',    label: '📋 Open Orders PCT',         file: '/stock_open_orders.json' },
  { id: 'viatrisSales',  label: '📈 Ventes Viatris',          file: '/stock_viatris_sales.json' },
  { id: 'pctSales',      label: '📊 Ventes PCT',              file: '/stock_pct_sales.json' },
  { id: 'inventory',     label: '🏪 Inventaire Mensuel',      file: '/stock_inventory.json' },
  { id: 'pctOrders',     label: '🚚 Commandes PCT→Viatris',   file: '/stock_pct_orders.json' },
];

/* ─── helpers ──────────────────────────────────────────────────────────────── */
const NUM = (v) =>
  v == null ? '—' : typeof v === 'number' ? v.toLocaleString('fr-FR') : v;

const STATUS_COLORS = {
  critical: { bg: 'rgba(239,68,68,0.12)', border: '#ef4444', text: '#dc2626', label: '⚠️ Critique' },
  warning:  { bg: 'rgba(245,158,11,0.12)', border: '#f59e0b', text: '#d97706', label: '⚡ Attention' },
  ok:       { bg: 'rgba(16,185,129,0.10)', border: '#10b981', text: '#059669', label: '✅ OK' },
};

/* ─── sub-views ─────────────────────────────────────────────────────────────── */

function OpenOrdersTab({ data }) {
  return (
    <div className="sc-table-wrap">
      <table className="sc-table">
        <thead>
          <tr>
            <th>Produit</th>
            <th>Qté Ouverte Totale</th>
            <th>Détails PO</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td className="sc-brand">{row.brand}</td>
              <td className="sc-num sc-blue">{NUM(row.totalOpenQty)}</td>
              <td>
                <div className="sc-po-list">
                  {row.poEntries.map((po, j) => (
                    <span key={j} className="sc-po-chip">
                      <span className="sc-po-no">{po.poNo}</span>
                      <span className="sc-po-qty">{NUM(po.qty)}</span>
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SalesMatrixTab({ datasets, color }) {
  const [activeSet, setActiveSet] = useState(0);
  if (!datasets || !datasets.length) return <p className="sc-empty">Données non disponibles.</p>;
  const ds = datasets[activeSet];
  const months = ds.months.filter(m => m !== 'Total 2025' && m !== 'Total 2026' && m !== 'compare');
  const totalCol = ds.months.find(m => m === 'Total 2025' || m === 'Total 2026');

  return (
    <div>
      {/* Year switcher */}
      <div className="sc-year-tabs">
        {datasets.map((d, i) => (
          <button
            key={i}
            className={`sc-year-btn ${activeSet === i ? 'active' : ''}`}
            style={activeSet === i ? { background: color, color: '#fff' } : {}}
            onClick={() => setActiveSet(i)}
          >
            {d.title}
          </button>
        ))}
      </div>

      <div className="sc-table-wrap">
        <table className="sc-table">
          <thead>
            <tr>
              <th>Produit</th>
              {months.map(m => <th key={m}>{m}</th>)}
              {totalCol && <th className="sc-total-col">Total</th>}
              {ds.products[0]?.compareRatio != null && <th>% vs 2025</th>}
            </tr>
          </thead>
          <tbody>
            {ds.products.map((prod, i) => {
              const rowVals = months.map(m => prod.months[m]);
              const rowMax = Math.max(...rowVals.filter(v => v != null), 0);
              return (
                <tr key={i}>
                  <td className="sc-brand">{prod.brand}</td>
                  {months.map((m, mi) => {
                    const v = prod.months[m];
                    const intensity = rowMax > 0 && v ? Math.min(v / rowMax, 1) : 0;
                    return (
                      <td
                        key={m}
                        className="sc-num"
                        style={{ background: v ? `${color}${Math.round(intensity * 40 + 5).toString(16).padStart(2,'0')}` : 'transparent' }}
                      >
                        {NUM(v)}
                      </td>
                    );
                  })}
                  {totalCol && <td className="sc-num sc-total-col" style={{color}}><strong>{NUM(prod.months[totalCol])}</strong></td>}
                  {prod.compareRatio != null && (
                    <td className={`sc-num ${prod.compareRatio < 50 ? 'sc-danger' : 'sc-success'}`}>
                      {prod.compareRatio}%
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InventoryTab({ data }) {
  const [search, setSearch] = useState('');
  const filtered = data.filter(p =>
    p.brand.toLowerCase().includes(search.toLowerCase()) ||
    (p.pctCode && p.pctCode.includes(search))
  );

  const counts = { critical: 0, warning: 0, ok: 0 };
  data.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++; });

  return (
    <div>
      {/* KPIs */}
      <div className="sc-kpis">
        {Object.entries(STATUS_COLORS).map(([key, cfg]) => (
          <div key={key} className="sc-kpi" style={{ borderColor: cfg.border, background: cfg.bg }}>
            <span className="sc-kpi-val" style={{ color: cfg.text }}>{counts[key]}</span>
            <span className="sc-kpi-lbl">{cfg.label}</span>
          </div>
        ))}
      </div>

      <input
        className="sc-search"
        placeholder="Rechercher produit ou code PCT..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="sc-table-wrap">
        <table className="sc-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Code PCT</th>
              <th>Débit Annuel</th>
              <th>AMC</th>
              <th>Stock (01/06/2026)</th>
              <th>MOH</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => {
              const cfg = STATUS_COLORS[row.status] || STATUS_COLORS.ok;
              return (
                <tr key={i} style={{ background: cfg.bg }}>
                  <td className="sc-brand">{row.brand}</td>
                  <td className="sc-code">{row.pctCode || '—'}</td>
                  <td className="sc-num">{NUM(row.annualOfftake)}</td>
                  <td className="sc-num sc-blue">{NUM(row.amc)}</td>
                  <td className="sc-num" style={{ fontWeight: 800, color: cfg.text }}>{NUM(row.stock)}</td>
                  <td className="sc-num" style={{ fontWeight: 700, color: cfg.text }}>
                    {row.moh != null ? row.moh.toFixed(2) : '—'}
                  </td>
                  <td>
                    <span className="sc-badge" style={{ background: cfg.border, color: '#fff' }}>
                      {cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PctOrdersTab({ data }) {
  const [expanded, setExpanded] = useState({});
  const toggle = (i) => setExpanded(prev => ({ ...prev, [i]: !prev[i] }));

  return (
    <div className="sc-table-wrap">
      <table className="sc-table">
        <thead>
          <tr>
            <th style={{ width: 36 }}></th>
            <th>Code PCT</th>
            <th>Description</th>
            <th>Qté Totale Commandée</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <React.Fragment key={i}>
              <tr
                className={expanded[i] ? 'sc-row-expanded' : 'sc-row-collapsed'}
                onClick={() => toggle(i)}
                style={{ cursor: row.deliveries?.length ? 'pointer' : 'default' }}
              >
                <td className="sc-expand-cell">
                  {row.deliveries?.length > 0 && (
                    <span className="sc-expand-icon">{expanded[i] ? '▼' : '▶'}</span>
                  )}
                </td>
                <td className="sc-code">{row.pctCode || '—'}</td>
                <td className="sc-brand">{row.description}</td>
                <td className="sc-num sc-blue"><strong>{NUM(row.totalOrderedQty)}</strong></td>
              </tr>
              {expanded[i] && row.deliveries?.map((d, j) => (
                <tr key={`${i}-${j}`} className="sc-delivery-row">
                  <td></td>
                  <td colSpan={2} className="sc-delivery-date">📅 {d.poOrDate}</td>
                  <td className="sc-num sc-green">{NUM(d.qty)}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── main component ────────────────────────────────────────────────────────── */
export default function StockCommandeView() {
  const [activeTab, setActiveTab] = useState('openOrders');
  const [allData, setAllData] = useState({});
  const [loading, setLoading] = useState({});

  useEffect(() => {
    TABS.forEach(tab => {
      setLoading(prev => ({ ...prev, [tab.id]: true }));
      fetch(tab.file)
        .then(r => r.json())
        .then(json => {
          setAllData(prev => ({ ...prev, [tab.id]: json }));
          setLoading(prev => ({ ...prev, [tab.id]: false }));
        })
        .catch(() => setLoading(prev => ({ ...prev, [tab.id]: false })));
    });
  }, []);

  const data = allData[activeTab];
  const isLoading = loading[activeTab];

  return (
    <div className="sc-wrapper">
      {/* Sub-tab nav */}
      <div className="sc-tab-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`sc-tab-btn ${activeTab === tab.id ? 'sc-tab-active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="sc-content">
        {isLoading && (
          <div className="sc-loading">
            <div className="sc-spinner" />
            <p>Chargement des données...</p>
          </div>
        )}
        {!isLoading && !data && (
          <p className="sc-empty">Aucune donnée disponible.</p>
        )}
        {!isLoading && data && activeTab === 'openOrders'   && <OpenOrdersTab data={data} />}
        {!isLoading && data && activeTab === 'viatrisSales' && <SalesMatrixTab datasets={data} color="#8b5cf6" />}
        {!isLoading && data && activeTab === 'pctSales'     && <SalesMatrixTab datasets={data} color="#3b82f6" />}
        {!isLoading && data && activeTab === 'inventory'    && <InventoryTab data={data} />}
        {!isLoading && data && activeTab === 'pctOrders'    && <PctOrdersTab data={data} />}
      </div>
    </div>
  );
}
