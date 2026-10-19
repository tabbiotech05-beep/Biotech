import React, { useState } from 'react';
import * as XLSX from 'xlsx';

const CONDITIONS_DATA = [
  {
    palier: "1,500 – 4,999",
    min: 1500,
    max: 4999,
    comptant: "1.50%",
    j30: "1.00%",
    j45: "-",
    j60: "-",
    j90: "-",
    rates: { comptant: 1.5, 30: 1.0, 45: null, 60: null, 90: null }
  },
  {
    palier: "5,000 – 9,999",
    min: 5000,
    max: 9999,
    comptant: "1.90%",
    j30: "1.40%",
    j45: "0.90%",
    j60: "0.00%",
    j90: "-",
    rates: { comptant: 1.9, 30: 1.4, 45: 0.9, 60: 0.0, 90: null }
  },
  {
    palier: "10,000 – 14,999",
    min: 10000,
    max: 14999,
    comptant: "2.30%",
    j30: "1.80%",
    j45: "1.30%",
    j60: "1.05%",
    j90: "0.00%",
    rates: { comptant: 2.3, 30: 1.8, 45: 1.3, 60: 1.05, 90: 0.0 }
  },
  {
    palier: "15,000 – 24,999",
    min: 15000,
    max: 24999,
    comptant: "2.70%",
    j30: "2.20%",
    j45: "1.70%",
    j60: "1.45%",
    j90: "1.20%",
    rates: { comptant: 2.7, 30: 2.2, 45: 1.7, 60: 1.45, 90: 1.2 }
  },
  {
    palier: "≥ 25,000",
    min: 25000,
    max: Infinity,
    comptant: "3.00%",
    j30: "2.50%",
    j45: "2.00%",
    j60: "1.75%",
    j90: "1.50%",
    rates: { comptant: 3.0, 30: 2.5, 45: 2.0, 60: 1.75, 90: 1.5 }
  }
];

export default function AvantageCommerciauxView() {
  const [simAmount, setSimAmount] = useState('12000');
  const [simPayment, setSimPayment] = useState('comptant');

  // Simulation calculation
  const numericAmount = parseFloat(simAmount) || 0;
  const matchedRow = CONDITIONS_DATA.find(r => numericAmount >= r.min && numericAmount <= r.max);
  const matchedRate = matchedRow ? matchedRow.rates[simPayment] : null;
  const discountAmount = matchedRate !== null && matchedRate !== undefined ? (numericAmount * matchedRate) / 100 : null;
  const netAmount = discountAmount !== null ? numericAmount - discountAmount : null;

  const exportExcel = () => {
    const wsData = [
      ["Niveau d’engagement commercial - Valeur moyenne de commande (TND)", "Modalités de paiement convenues", "", "", "", ""],
      ["", "Paiement comptant", "30 jours", "45 jours", "60 jours", "90 jours"],
      ...CONDITIONS_DATA.map(row => [
        row.palier,
        row.comptant,
        row.j30,
        row.j45,
        row.j60,
        row.j90
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    // Merges
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
      { s: { r: 0, c: 1 }, e: { r: 0, c: 5 } }
    ];
    ws['!cols'] = [
      { wch: 38 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Conditions Commerciales");
    XLSX.writeFile(wb, "Conditions_Commerciales_Grossistes.xlsx");
  };

  const renderBadge = (value, isHighlighted) => {
    if (value === '-') {
      return (
        <span style={{ color: 'var(--text-muted, #94a3b8)', fontWeight: 'bold' }}>
          —
        </span>
      );
    }
    const isZero = value === '0.00%';
    const num = parseFloat(value);
    
    let badgeBg = 'rgba(148, 163, 184, 0.15)';
    let badgeColor = '#94a3b8';
    let borderColor = 'rgba(148, 163, 184, 0.25)';

    if (!isZero) {
      if (num >= 2.0) {
        badgeBg = 'rgba(16, 185, 129, 0.15)';
        badgeColor = '#10b981';
        borderColor = 'rgba(16, 185, 129, 0.35)';
      } else if (num >= 1.0) {
        badgeBg = 'rgba(59, 130, 246, 0.15)';
        badgeColor = '#60a5fa';
        borderColor = 'rgba(59, 130, 246, 0.35)';
      } else {
        badgeBg = 'rgba(245, 158, 11, 0.15)';
        badgeColor = '#fbbf24';
        borderColor = 'rgba(245, 158, 11, 0.35)';
      }
    }

    return (
      <span
        style={{
          display: 'inline-block',
          padding: '0.35rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.875rem',
          fontWeight: '700',
          background: badgeBg,
          color: badgeColor,
          border: `1px solid ${borderColor}`,
          boxShadow: isHighlighted ? '0 0 12px rgba(59, 130, 246, 0.6)' : 'none',
          transform: isHighlighted ? 'scale(1.08)' : 'scale(1)',
          transition: 'all 0.25s ease'
        }}
      >
        {value}
      </span>
    );
  };

  return (
    <div className="sc-wrapper" style={{ animation: 'fadeUp 0.6s cubic-bezier(0.4, 0, 0.2, 1)', padding: '1.5rem 0' }}>
      {/* HEADER */}
      <header className="dashboard-header" style={{ position: 'relative', overflow: 'hidden', marginBottom: '2rem' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(135deg, #f59e0b, #ec4899)' }} />
        <div className="header-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '900', letterSpacing: '-0.025em', margin: 0 }}>
              Avantages <span style={{ color: '#f59e0b', background: 'linear-gradient(135deg, #f59e0b, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Commerciaux</span>
            </h1>
            <p className="subtitle" style={{ color: 'var(--text-muted, #94a3b8)', marginTop: '0.35rem', fontSize: '0.9rem' }}>
              Modalités de paiement et barème de remise convenus selon le niveau d’engagement commercial.
            </p>
          </div>

          <button
            onClick={exportExcel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exporter en Excel
          </button>
        </div>
      </header>

      {/* MAIN TABLE */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div className="sc-table-wrap" style={{ borderRadius: '20px', border: '1px solid var(--border, #334155)', overflow: 'hidden' }}>
          <table className="sc-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
            <thead>
              <tr style={{ background: 'rgba(30, 41, 59, 0.7)' }}>
                <th
                  rowSpan="2"
                  style={{
                    padding: '1.2rem 1.5rem',
                    textAlign: 'left',
                    verticalAlign: 'middle',
                    borderBottom: '2px solid var(--border, #334155)',
                    borderRight: '1px solid var(--border, #334155)',
                    color: 'var(--text-primary, #ffffff)',
                    fontWeight: '800',
                    fontSize: '0.95rem',
                    lineHeight: '1.3'
                  }}
                >
                  <div>Niveau d’engagement commercial</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', fontWeight: '600', marginTop: '0.2rem' }}>
                    Valeur moyenne de commande (TND)
                  </div>
                </th>
                <th
                  colSpan="5"
                  style={{
                    padding: '1rem 1.5rem',
                    textAlign: 'center',
                    borderBottom: '1px solid var(--border, #334155)',
                    color: 'var(--text-primary, #ffffff)',
                    fontWeight: '800',
                    fontSize: '0.95rem',
                    letterSpacing: '0.5px'
                  }}
                >
                  Modalités de paiement convenues
                </th>
              </tr>
              <tr style={{ background: 'rgba(15, 23, 42, 0.8)' }}>
                <th style={{ padding: '0.9rem 1rem', fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-secondary, #cbd5e1)', borderBottom: '2px solid var(--border, #334155)' }}>
                  Paiement comptant
                </th>
                <th style={{ padding: '0.9rem 1rem', fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-secondary, #cbd5e1)', borderBottom: '2px solid var(--border, #334155)' }}>
                  30 jours
                </th>
                <th style={{ padding: '0.9rem 1rem', fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-secondary, #cbd5e1)', borderBottom: '2px solid var(--border, #334155)' }}>
                  45 jours
                </th>
                <th style={{ padding: '0.9rem 1rem', fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-secondary, #cbd5e1)', borderBottom: '2px solid var(--border, #334155)' }}>
                  60 jours
                </th>
                <th style={{ padding: '0.9rem 1rem', fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-secondary, #cbd5e1)', borderBottom: '2px solid var(--border, #334155)' }}>
                  90 jours
                </th>
              </tr>
            </thead>
            <tbody>
              {CONDITIONS_DATA.map((row, idx) => {
                const isCurrentPalier = matchedRow && matchedRow.palier === row.palier;
                return (
                  <tr
                    key={idx}
                    style={{
                      background: isCurrentPalier ? 'rgba(59, 130, 246, 0.08)' : (idx % 2 === 0 ? 'rgba(255, 255, 255, 0.015)' : 'transparent'),
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <td
                      style={{
                        padding: '1.1rem 1.5rem',
                        textAlign: 'left',
                        fontWeight: '800',
                        fontSize: '0.95rem',
                        color: isCurrentPalier ? '#60a5fa' : 'var(--text-primary, #ffffff)',
                        borderRight: '1px solid var(--border, #334155)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {isCurrentPalier && (
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                        )}
                        <span>{row.palier} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 'normal' }}>TND</span></span>
                      </div>
                    </td>
                    <td style={{ padding: '1.1rem 1rem' }}>
                      {renderBadge(row.comptant, isCurrentPalier && simPayment === 'comptant')}
                    </td>
                    <td style={{ padding: '1.1rem 1rem' }}>
                      {renderBadge(row.j30, isCurrentPalier && simPayment === '30')}
                    </td>
                    <td style={{ padding: '1.1rem 1rem' }}>
                      {renderBadge(row.j45, isCurrentPalier && simPayment === '45')}
                    </td>
                    <td style={{ padding: '1.1rem 1rem' }}>
                      {renderBadge(row.j60, isCurrentPalier && simPayment === '60')}
                    </td>
                    <td style={{ padding: '1.1rem 1rem' }}>
                      {renderBadge(row.j90, isCurrentPalier && simPayment === '90')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* INTERACTIVE SIMULATOR CARD */}
      <div
        style={{
          background: 'var(--bg-card, #1e293b)',
          border: '1px solid var(--border, #334155)',
          borderRadius: '20px',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-card, 0 10px 25px -5px rgba(0,0,0,0.3))'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(236, 72, 153, 0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b'
            }}
          >
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary, #ffffff)' }}>
              Simulateur d’Avantage Commercial
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
              Sélectionnez une commande type et une modalité de règlement pour calculer la remise applicable.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', alignItems: 'end' }}>
          {/* Montant */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.5rem' }}>
              Valeur de la commande (TND)
            </label>
            <input
              type="number"
              value={simAmount}
              onChange={(e) => setSimAmount(e.target.value)}
              placeholder="Ex: 12000"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: '1px solid var(--border, #334155)',
                background: 'var(--bg-secondary, #0f172a)',
                color: 'var(--text-primary, #ffffff)',
                fontWeight: '700',
                fontSize: '0.95rem'
              }}
            />
          </div>

          {/* Modalité */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.5rem' }}>
              Modalité de paiement
            </label>
            <select
              value={simPayment}
              onChange={(e) => setSimPayment(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: '1px solid var(--border, #334155)',
                background: 'var(--bg-secondary, #0f172a)',
                color: 'var(--text-primary, #ffffff)',
                fontWeight: '700',
                fontSize: '0.95rem'
              }}
            >
              <option value="comptant">Paiement comptant</option>
              <option value="30">30 jours</option>
              <option value="45">45 jours</option>
              <option value="60">60 jours</option>
              <option value="90">90 jours</option>
            </select>
          </div>

          {/* Taux obtenu */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Taux de Remise
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#60a5fa' }}>
              {matchedRate !== null && matchedRate !== undefined ? `${matchedRate.toFixed(2)}%` : 'Non éligible (—)'}
            </span>
          </div>

          {/* Économie estimée */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Remise Accordée
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#10b981' }}>
              {discountAmount !== null ? `${discountAmount.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND` : '—'}
            </span>
          </div>
        </div>

        {netAmount !== null && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
              Montant net à régler après remise :
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--text-primary, #ffffff)' }}>
              {netAmount.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
