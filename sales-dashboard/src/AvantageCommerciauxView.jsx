import React, { useState, useEffect } from 'react';

const TABS = [
  { id: 'prixLocaux', label: '🏷️ Prix Produits Locaux', file: 'avantage_prix_locaux.json' },
  { id: 'quantity', label: '📦 Quantity per Box', file: 'avantage_quantity.json' },
  { id: 'conditions', label: '🤝 Conditions Commerciales', file: 'avantage_conditions.json' }
];

function PrixLocauxTab({ data }) {
  const [search, setSearch] = useState('');
  
  if (!data || data.length === 0) return <p className="sc-empty">Aucune donnée disponible.</p>;

  // Extract columns dynamically from the first valid item
  // In the JSON, the header we want is currently the keys of the JSON objects.
  const columns = Object.keys(data[0]).filter(k => k && !k.startsWith('Unnamed'));

  const filtered = data.filter(row => {
    return columns.some(col => {
      const val = row[col];
      return val && String(val).toLowerCase().includes(search.toLowerCase());
    });
  });

  return (
    <div>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'white', width: '300px' }}
        />
        <div style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
          {filtered.length} résultats
        </div>
      </div>
      <div className="sc-table-wrap" style={{ maxHeight: '600px' }}>
        <table className="sc-table">
          <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10 }}>
            <tr>
              {columns.map(col => <th key={col}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((row, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col}>{row[col]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 100 && (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
            Affichage des 100 premiers résultats. Utilisez la recherche pour filtrer.
          </div>
        )}
      </div>
    </div>
  );
}

function QuantityTab({ data }) {
  if (!data || data.length < 2) return <p className="sc-empty">Aucune donnée disponible.</p>;

  // The first row contains the headers according to the JSON output we saw
  const headerRow = data[0];
  const colNames = Object.keys(headerRow);
  const title1 = headerRow[colNames[0]];
  const title2 = headerRow[colNames[1]];

  const rows = data.slice(1);

  return (
    <div className="sc-table-wrap">
      <table className="sc-table">
        <thead>
          <tr>
            <th>{title1}</th>
            <th>{title2}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td className="sc-brand">{row[colNames[0]]}</td>
              <td className="sc-num sc-blue"><strong>{row[colNames[1]]}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConditionsTab({ data }) {
  if (!data || data.length < 2) return <p className="sc-empty">Aucune donnée disponible.</p>;

  // The first row contains headers
  const headerRow = data[0];
  const colKeys = Object.keys(headerRow).filter(k => k.startsWith('Unnamed'));
  const headers = colKeys.map(k => headerRow[k]);

  const rows = data.slice(1);

  return (
    <div className="sc-table-wrap">
      <table className="sc-table">
        <thead>
          <tr>
            {headers.map((h, idx) => (
              <th key={idx}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {colKeys.map((k, idx) => (
                <td key={idx} style={idx === 0 ? { fontWeight: 'bold', color: 'var(--text-primary)' } : {}}>
                  {row[k]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AvantageCommerciauxView() {
  const [activeTab, setActiveTab] = useState('prixLocaux');
  const [allData, setAllData] = useState({});
  const [loading, setLoading] = useState({});

  useEffect(() => {
    TABS.forEach(tab => {
      setLoading(prev => ({ ...prev, [tab.id]: true }));
      // Using import.meta.env.BASE_URL for correct pathing in Vite
      fetch((import.meta.env.BASE_URL || '/') + tab.file)
        .then(r => r.json())
        .then(json => {
          setAllData(prev => ({ ...prev, [tab.id]: json }));
          setLoading(prev => ({ ...prev, [tab.id]: false }));
        })
        .catch(err => {
          console.error("Error loading " + tab.file, err);
          setLoading(prev => ({ ...prev, [tab.id]: false }));
        });
    });
  }, []);

  const data = allData[activeTab];
  const isLoading = loading[activeTab];

  return (
    <div className="sc-wrapper" style={{ animation: 'fadeUp 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      {/* Header */}
      <header className="dashboard-header" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(135deg, #f59e0b, #ec4899)' }} />
        <div className="header-content">
          <h1>
            Avantage <span style={{ color: '#f59e0b', background: 'linear-gradient(135deg, #f59e0b, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Commerciaux</span>
          </h1>
          <p className="subtitle">Consultez les informations sur les prix, quantités par boîte et conditions commerciales.</p>
        </div>
      </header>

      {/* Sub-tab nav */}
      <div className="sc-tab-nav" style={{ display: 'flex', gap: '0.75rem', background: 'var(--bg-card)', padding: '0.75rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
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
        {!isLoading && (!data || data.length === 0) && (
          <p className="sc-empty">Aucune donnée disponible.</p>
        )}
        {!isLoading && data && activeTab === 'prixLocaux' && <PrixLocauxTab data={data} />}
        {!isLoading && data && activeTab === 'quantity' && <QuantityTab data={data} />}
        {!isLoading && data && activeTab === 'conditions' && <ConditionsTab data={data} />}
      </div>
    </div>
  );
}
