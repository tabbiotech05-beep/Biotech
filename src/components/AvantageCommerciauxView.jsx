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
      return <span className="text-slate-300 font-bold text-sm">—</span>;
    }
    const isZero = value === '0.00%';
    const num = parseFloat(value);
    
    let colorClasses = "bg-slate-100 text-slate-600 border-slate-200";
    if (!isZero) {
      if (num >= 2.0) {
        colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-200 font-black";
      } else if (num >= 1.0) {
        colorClasses = "bg-blue-50 text-blue-700 border-blue-200 font-bold";
      } else {
        colorClasses = "bg-amber-50 text-amber-700 border-amber-200 font-bold";
      }
    }

    return (
      <span
        className={`inline-block px-3 py-1 rounded-full text-xs border transition-all ${colorClasses} ${
          isHighlighted ? 'ring-2 ring-blue-500 scale-105 shadow-md shadow-blue-100' : ''
        }`}
      >
        {value}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            Conditions Commerciales Grossistes
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Barème de remise commerciale selon le niveau d’engagement et les modalités de paiement convenues.
          </p>
        </div>

        <button
          onClick={exportExcel}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-100 transition-all self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exporter en Excel
        </button>
      </div>

      {/* TABLE CARD */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
        <table className="w-full text-center text-sm border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th
                rowSpan="2"
                className="px-6 py-4 text-left font-black border-r border-slate-700 align-middle min-w-[240px]"
              >
                <div className="text-sm uppercase tracking-wide">Niveau d’engagement commercial</div>
                <div className="text-xs text-slate-300 font-medium mt-0.5">Valeur moyenne de commande (TND)</div>
              </th>
              <th
                colSpan="5"
                className="px-6 py-3 font-black text-sm uppercase tracking-wider text-slate-100 border-b border-slate-700 bg-slate-850"
              >
                Modalités de paiement convenues
              </th>
            </tr>
            <tr className="bg-slate-700/80 text-slate-200 text-xs uppercase font-bold tracking-wider">
              <th className="px-4 py-3">Paiement comptant</th>
              <th className="px-4 py-3">30 jours</th>
              <th className="px-4 py-3">45 jours</th>
              <th className="px-4 py-3">60 jours</th>
              <th className="px-4 py-3">90 jours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {CONDITIONS_DATA.map((row, idx) => {
              const isCurrentPalier = matchedRow && matchedRow.palier === row.palier;
              return (
                <tr
                  key={idx}
                  className={`transition-colors hover:bg-slate-50/80 ${
                    isCurrentPalier ? 'bg-blue-50/60' : (idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')
                  }`}
                >
                  <td className="px-6 py-4 text-left font-black text-slate-800 border-r border-slate-100 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {isCurrentPalier && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      )}
                      <span>{row.palier} <span className="text-xs font-semibold text-slate-400">TND</span></span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {renderBadge(row.comptant, isCurrentPalier && simPayment === 'comptant')}
                  </td>
                  <td className="px-4 py-4">
                    {renderBadge(row.j30, isCurrentPalier && simPayment === '30')}
                  </td>
                  <td className="px-4 py-4">
                    {renderBadge(row.j45, isCurrentPalier && simPayment === '45')}
                  </td>
                  <td className="px-4 py-4">
                    {renderBadge(row.j60, isCurrentPalier && simPayment === '60')}
                  </td>
                  <td className="px-4 py-4">
                    {renderBadge(row.j90, isCurrentPalier && simPayment === '90')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SIMULATOR CARD */}
      <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl border border-indigo-100/60 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              Simulateur de Remise Grossiste
            </h4>
            <p className="text-xs text-slate-500">
              Renseignez une commande type pour visualiser la remise accordée selon le barème.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Montant */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Valeur de la commande (TND)
            </label>
            <input
              type="number"
              value={simAmount}
              onChange={(e) => setSimAmount(e.target.value)}
              placeholder="Ex: 12000"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>

          {/* Modalité */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Modalité de règlement
            </label>
            <select
              value={simPayment}
              onChange={(e) => setSimPayment(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            >
              <option value="comptant">Paiement comptant</option>
              <option value="30">30 jours</option>
              <option value="45">45 jours</option>
              <option value="60">60 jours</option>
              <option value="90">90 jours</option>
            </select>
          </div>

          {/* Taux obtenu */}
          <div className="p-3 bg-white rounded-xl border border-blue-100 shadow-sm">
            <span className="block text-[11px] font-bold text-blue-500 uppercase tracking-wider">
              Taux Applicable
            </span>
            <span className="text-lg font-black text-blue-700">
              {matchedRate !== null && matchedRate !== undefined ? `${matchedRate.toFixed(2)}%` : 'Non éligible (—)'}
            </span>
          </div>

          {/* Montant remise */}
          <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-sm">
            <span className="block text-[11px] font-bold text-emerald-500 uppercase tracking-wider">
              Montant Remise
            </span>
            <span className="text-lg font-black text-emerald-700">
              {discountAmount !== null ? `${discountAmount.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND` : '—'}
            </span>
          </div>
        </div>

        {netAmount !== null && (
          <div className="mt-4 pt-3 border-t border-indigo-100/60 flex flex-col sm:flex-row justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">
              Net à payer après application de l’avantage commercial :
            </span>
            <span className="text-sm font-black text-slate-900 mt-1 sm:mt-0">
              {netAmount.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
