import React, { useState, useEffect, useMemo } from 'react';
import StockCommandeView from './StockCommandeView';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import './SalesDashboardView.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SalesDashboardView = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTermClient, setSearchTermClient] = useState('');
  const [searchTermProduct, setSearchTermProduct] = useState('');
  const [selectedClient, setSelectedClient] = useState('All');
  
  // New state for multi-product selection and plot triggering
  const [tempSelectedProducts, setTempSelectedProducts] = useState([]);
  const [appliedProducts, setAppliedProducts] = useState([]);
  const [isChartGenerated, setIsChartGenerated] = useState(false);

  // Tab navigation state (internal to sales dashboard)
  const [activeSalesTab, setActiveSalesTab] = useState('biotech');

  // CM Data state
  const [cmData, setCmData] = useState({});

  useEffect(() => {
    console.log("SalesDashboardView: Initializing CM data fetch...");
    fetch('/cm_data.json')
      .then(res => {
        if (!res.ok) throw new Error(`CM data fetch failed: ${res.status}`);
        return res.json();
      })
      .then(json => {
        console.log("SalesDashboardView: CM data loaded successfully");
        setCmData(json);
      })
      .catch(err => console.error("Error loading CM data:", err));
  }, []);

  useEffect(() => {
    console.log("SalesDashboardView: Loading sales data for tab:", activeSalesTab);
    setLoading(true);
    const url = activeSalesTab === 'biotech' ? '/sales_data.json' : '/local_sales_data.json';
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`Sales data fetch failed: ${res.status}`);
        return res.json();
      })
      .then(json => {
        console.log("SalesDashboardView: Raw data length:", json?.length);
        if (!Array.isArray(json)) {
          console.error("Expected array from sales data, got:", typeof json);
          setData([]);
          setLoading(false);
          return;
        }
        const processed = json.map(item => ({
          ...item,
          period: `${item.annee || ''}-${(item.mois || '').toString().padStart(2, '0')}`,
          qte: Number(item.qte) || 0
        })).sort((a, b) => a.period.localeCompare(b.period));
        setData(processed);
        console.log("SalesDashboardView: Data processed successfully");
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading sales data:", err);
        setLoading(false);
      });
  }, [activeSalesTab]);

  const clients = useMemo(() => {
    const set = new Set(data.map(item => item.nom_client));
    return ['All', ...Array.from(set).sort()];
  }, [data]);

  const allProductsList = useMemo(() => {
    const set = new Set(data.map(item => item.libelle));
    return Array.from(set).sort();
  }, [data]);

  // Determine CM (Consommation Moyenne) for a given product
  const getProductCM = (productName) => {
    if (cmData && cmData[productName] !== undefined) {
      return cmData[productName];
    }
    
    // Fallback for imported products: calculate from historical monthly average
    const productRecords = data.filter(item => item.libelle === productName);
    if (productRecords.length === 0) return 0;
    
    const monthlyTotals = productRecords.reduce((acc, item) => {
      const period = item.period;
      if (!acc[period]) acc[period] = 0;
      acc[period] += item.qte;
      return acc;
    }, {});
    
    const qtyList = Object.values(monthlyTotals);
    if (qtyList.length === 0) return 0;
    
    const totalQty = qtyList.reduce((sum, q) => sum + q, 0);
    return Math.round(totalQty / qtyList.length);
  };

  const currentCM = useMemo(() => {
    if (appliedProducts.length === 0) {
      return allProductsList.reduce((sum, p) => sum + getProductCM(p), 0);
    }
    return appliedProducts.reduce((sum, p) => sum + getProductCM(p), 0);
  }, [appliedProducts, allProductsList, cmData, data]);

  const liveCM = useMemo(() => {
    if (tempSelectedProducts.length === 0) {
      return allProductsList.reduce((sum, p) => sum + getProductCM(p), 0);
    }
    return tempSelectedProducts.reduce((sum, p) => sum + getProductCM(p), 0);
  }, [tempSelectedProducts, allProductsList, cmData, data]);

  // Data filtered for the UI elements (always live for the selection)
  const filteredProductsUI = useMemo(() => {
    return allProductsList.filter(p => {
      const pStr = (p || '').toString();
      return pStr.toLowerCase().includes((searchTermProduct || '').toLowerCase());
    });
  }, [allProductsList, searchTermProduct]);

  // LIVE Data for the transaction history (updates as you check products)
  const liveFilteredData = useMemo(() => {
    return data.filter(item => {
      const matchClient = selectedClient === 'All' || item.nom_client === selectedClient;
      const matchProduct = tempSelectedProducts.length === 0 || tempSelectedProducts.includes(item.libelle);
      return matchClient && matchProduct;
    });
  }, [data, selectedClient, tempSelectedProducts]);

  // Data used for the Plot (only updates when button is clicked)
  const plotData = useMemo(() => {
    return data.filter(item => {
      const matchClient = selectedClient === 'All' || item.nom_client === selectedClient;
      const matchProduct = appliedProducts.length === 0 || appliedProducts.includes(item.libelle);
      return matchClient && matchProduct;
    });
  }, [data, selectedClient, appliedProducts]);

  const chartData = useMemo(() => {
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    
    // Aggregate data by month and year from the plotData (already filtered by grossiste/products)
    const grouped = plotData.reduce((acc, item) => {
      const m = item.mois.padStart(2, '0');
      if (!acc[m]) acc[m] = { month: m, qty2025: 0, qty2026: 0, prevision2026: 0 };
      if (item.annee === '2025') acc[m].qty2025 += item.qte;
      if (item.annee === '2026') acc[m].qty2026 += item.qte;
      return acc;
    }, {});

    // Ensure all months are present and calculate prevision and CM
    return months.map(m => {
      const dataForMonth = grouped[m] || { month: m, qty2025: 0, qty2026: 0 };
      return {
        ...dataForMonth,
        prevision2026: (Number(dataForMonth.qty2025) || 0) * 1.15,
        cm: Number(currentCM) || 0
      };
    });
  }, [plotData, currentCM]);

  const stats = useMemo(() => {
    const totalQte = plotData.reduce((sum, item) => sum + item.qte, 0);
    const uniqueClients = new Set(plotData.map(item => item.nom_client)).size;
    const uniqueProducts = new Set(plotData.map(item => item.libelle)).size;
    return { totalQte, uniqueClients, uniqueProducts };
  }, [plotData]);

  const alertsData = useMemo(() => {
    const isBiotech = activeSalesTab === 'biotech';
    const latestPeriod = '2026-04';
    const comparePeriod = isBiotech ? '2025-04' : '2026-03';
    const activeClientsList = Array.from(new Set(data.map(item => item.nom_client))).sort();
    
    return activeClientsList.map(client => {
      const clientProductData = data.filter(item => 
        item.nom_client === client && 
        (appliedProducts.length === 0 || appliedProducts.includes(item.libelle))
      );

      const actualQty = clientProductData
        .filter(item => item.period === latestPeriod)
        .reduce((sum, item) => sum + item.qte, 0);

      const compareQty = clientProductData
        .filter(item => item.period === comparePeriod)
        .reduce((sum, item) => sum + item.qte, 0);

      const prediction = isBiotech ? Math.round(compareQty * 1.15) : compareQty;
      const diff = actualQty - prediction;
      
      let status = '';
      let color = '';
      
      if (actualQty === 0) {
        status = 'Pas de commande';
        color = 'status-danger';
      } else if (diff < 0) {
        status = 'En baisse';
        color = 'status-warning';
      } else {
        status = 'En hausse';
        color = 'status-success';
      }

      return { client, actualQty, prediction, diff, status, color };
    }).filter(a => selectedClient === 'All' || a.client === selectedClient);
  }, [data, appliedProducts, selectedClient, activeSalesTab]);

  const handleGeneratePlot = () => {
    setAppliedProducts(tempSelectedProducts);
    setIsChartGenerated(true);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Add Title
    doc.setFontSize(18);
    doc.setTextColor(40);
    const titleText = activeSalesTab === 'biotech' 
      ? 'Rapport de Performance Grossistes - Avril 2026'
      : 'Rapport de Performance Produits Locaux - Avril 2026';
    doc.text(titleText, 14, 22);
    
    // Add Subtitle
    doc.setFontSize(11);
    doc.setTextColor(100);
    const subtitleText = activeSalesTab === 'biotech'
      ? 'Basé sur la prévision 2025 + 15%'
      : 'Comparaison Avril 2026 vs Mars 2026';
    doc.text(subtitleText, 14, 30);

    const tableColumn = [
      "Grossiste", 
      "Réel (Avril)", 
      activeSalesTab === 'biotech' ? "Prévision" : "Mars 2026", 
      "Écart", 
      "Statut"
    ];
    const tableRows = [];

    alertsData.forEach(alert => {
      const alertData = [
        alert.client,
        alert.actualQty.toLocaleString(),
        alert.prediction.toLocaleString(),
        (alert.diff > 0 ? '+' : '') + alert.diff.toLocaleString(),
        alert.status
      ];
      tableRows.push(alertData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: activeSalesTab === 'biotech' ? [59, 130, 246] : [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        4: { fontStyle: 'bold' }
      }
    });

    const pdfName = activeSalesTab === 'biotech'
      ? 'Rapport_Alertes_Performance_Avril_2026.pdf'
      : 'Rapport_Alertes_Performance_Locaux_Avril_2026.pdf';
    doc.save(pdfName);
  };

  const toggleProduct = (product) => {
    setTempSelectedProducts(prev => 
      prev.includes(product) ? prev.filter(p => p !== product) : [...prev, product]
    );
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data2025 = payload.find(p => p.dataKey === 'qty2025')?.value || 0;
      const data2026 = payload.find(p => p.dataKey === 'qty2026')?.value || 0;
      const dataPrev = payload.find(p => p.dataKey === 'prevision2026')?.value || 0;
      const dataCm = payload.find(p => p.dataKey === 'cm')?.value || 0;
      
      const diff = data2026 - data2025;
      const percent = data2025 > 0 ? ((diff / data2025) * 100).toFixed(1) : 0;
      const isPositive = diff >= 0;

      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{`Mois : ${label}`}</p>
          <div className="tooltip-items">
            {activeSalesTab === 'biotech' && <div className="tooltip-item"><span className="dot year2025"></span> 2025: <strong>{data2025.toLocaleString()}</strong></div>}
            <div className="tooltip-item"><span className="dot year2026"></span> 2026: <strong>{data2026.toLocaleString()}</strong></div>
            {activeSalesTab === 'biotech' && <div className="tooltip-item"><span className="dot forecast"></span> Prév: <strong>{Math.round(dataPrev).toLocaleString()}</strong></div>}
            <div className="tooltip-item"><span className="dot cm-dot"></span> CM : <strong>{Math.round(dataCm).toLocaleString()}</strong></div>
            {activeSalesTab === 'biotech' && (
              <>
                <hr className="tooltip-divider" />
                <div className={`tooltip-diff ${isPositive ? 'pos' : 'neg'}`}>
                  Écart (2026-2025): <strong>{isPositive ? '+' : ''}{diff.toLocaleString()}</strong>
                  <br />
                  Progression: <strong>{isPositive ? '+' : ''}{percent}%</strong>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="sales-dashboard-wrapper">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Chargement des données {activeSalesTab === 'biotech' ? 'Produit Importé' : 'Produits Locaux'}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sales-dashboard-wrapper">
      <div className="dashboard-container">
        {/* Navigation tabs */}
        <div className="dashboard-tabs">
          <button 
            className={`tab-btn ${activeSalesTab === 'biotech' ? 'active' : ''}`}
            onClick={() => {
              setActiveSalesTab('biotech');
              setSelectedClient('All');
              setTempSelectedProducts([]);
              setAppliedProducts([]);
              setIsChartGenerated(false);
            }}
          >
            🌐 Produit Importé
          </button>
          <button 
            className={`tab-btn ${activeSalesTab === 'local' ? 'active' : ''}`}
            onClick={() => {
              setActiveSalesTab('local');
              setSelectedClient('All');
              setTempSelectedProducts([]);
              setAppliedProducts([]);
              setIsChartGenerated(false);
            }}
          >
            🏡 Produits Locaux
          </button>
          <button 
            className={`tab-btn ${activeSalesTab === 'stock' ? 'active' : ''}`}
            onClick={() => {
              setActiveSalesTab('stock');
              setSelectedClient('All');
              setTempSelectedProducts([]);
              setAppliedProducts([]);
              setIsChartGenerated(false);
            }}
          >
            📦 Stock et commande
          </button>
        </div>

        {activeSalesTab === 'stock' ? (
          <StockCommandeView />
        ) : (
          <>
        <header className={`dashboard-header ${activeSalesTab === 'biotech' ? 'biotech-header' : 'local-header'}`}>
          <div className="header-content">
            <h1>
              {activeSalesTab === 'biotech' ? (
                <>Produit <span className="highlight blue">Importé</span></>
              ) : (
                <>Produits <span className="highlight green">Locaux</span></>
              )}
            </h1>
          </div>
        </header>

        <main className="dashboard-main">
          <aside className={`filters-sidebar ${activeSalesTab}`}>
            <div className="filter-group">
              <label>1. Sélectionner Grossiste</label>
              <input 
                type="text" 
                placeholder="Chercher grossiste..." 
                value={searchTermClient}
                onChange={(e) => setSearchTermClient(e.target.value)}
              />
              <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
                {clients.filter(c => {
                  const cStr = (c || '').toString();
                  return cStr.toLowerCase().includes((searchTermClient || '').toLowerCase()) || c === 'All';
                }).slice(0, 50).map(client => (
                  <option key={client} value={client}>{client}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>2. Sélectionner Produits</label>
              <input 
                type="text" 
                placeholder="Filtrer la liste..." 
                value={searchTermProduct}
                onChange={(e) => setSearchTermProduct(e.target.value)}
              />
              <div className="product-checklist">
                {filteredProductsUI.slice(0, 100).map(prod => (
                  <label key={prod} className="checkbox-item">
                    <input 
                      type="checkbox" 
                      checked={tempSelectedProducts.includes(prod)}
                      onChange={() => toggleProduct(prod)}
                    />
                    <span>{prod}</span>
                  </label>
                ))}
                {filteredProductsUI.length > 100 && <p className="limit-text">Et {filteredProductsUI.length - 100} autres...</p>}
              </div>
              <div className="selection-info">
                <div>{tempSelectedProducts.length} produit(s) sélectionné(s)</div>
                <div className="live-cm-text">CM Live : <strong>{Math.round(liveCM).toLocaleString()}</strong> units/mois</div>
              </div>
            </div>

            <button className="plot-btn" onClick={handleGeneratePlot}>
              Générer le Graphique
            </button>

            <button className="reset-btn" onClick={() => {
              setSearchTermClient('');
              setSearchTermProduct('');
              setSelectedClient('All');
              setTempSelectedProducts([]);
              setAppliedProducts([]);
              setIsChartGenerated(false);
            }}>Réinitialiser tout</button>

            {isChartGenerated && (
              <div className="alert-count">
                <h4>Alertes Critiques</h4>
                <span className="badge-danger">
                  {alertsData.filter(a => a.actualQty === 0).length} Sans commande
                </span>
              </div>
            )}
          </aside>

          <section className="chart-section">
            <div className="selection-stats-bar">
              <div className="live-stat">
                <span className="live-label">Produits sélectionnés :</span>
                <span className="live-value">{tempSelectedProducts.length}</span>
              </div>
              <div className="live-stat">
                <span className="live-label">Volume total (Historique) :</span>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <span className={`live-value ${activeSalesTab === 'biotech' ? 'blue' : 'green'}`} style={{ fontSize: '1.1rem' }}>
                    2025 : {liveFilteredData.reduce((sum, item) => item.annee === '2025' ? sum + item.qte : sum, 0).toLocaleString()} units
                  </span>
                  <span className={`live-value ${activeSalesTab === 'biotech' ? 'blue' : 'green'}`} style={{ fontSize: '1.1rem' }}>
                    2026 : {liveFilteredData.reduce((sum, item) => item.annee === '2026' ? sum + item.qte : sum, 0).toLocaleString()} units
                  </span>
                </div>
              </div>
            </div>

            {!isChartGenerated ? (
              <div className="welcome-placeholder">
                <div className="placeholder-content">
                  <span className="icon">📊</span>
                  <h2>Visualiser l'évolution</h2>
                  <p>Cliquez sur le bouton ci-dessous pour générer les courbes de tendances et les prévisions pour les produits sélectionnés.</p>
                  <button className="plot-btn" onClick={handleGeneratePlot}>
                    Générer le Graphique
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="chart-container">
                  <div className="chart-header">
                    <h3>
                      {activeSalesTab === 'biotech' 
                        ? "Comparaison Mensuelle : 2025 vs 2026"
                        : "Évolution Mensuelle : 2026"}
                    </h3>
                    <div className="legend-custom">
                      {activeSalesTab === 'biotech' && <span className="legend-item"><span className="dot year2025"></span> 2025</span>}
                      <span className="legend-item"><span className="dot year2026"></span> 2026 (Réel)</span>
                      {activeSalesTab === 'biotech' && <span className="legend-item"><span className="dot forecast"></span> Prévision 2026</span>}
                      <span className="legend-item"><span className="dot cm-dot"></span> Consommation Moyenne (CM)</span>
                    </div>
                  </div>
                  <div className="responsive-chart">
                    <ResponsiveContainer width="100%" height={400}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="color2025" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="color2026" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={activeSalesTab === 'biotech' ? "#3b82f6" : "#10b981"} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={activeSalesTab === 'biotech' ? "#3b82f6" : "#10b981"} stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a3750" vertical={false} />
                        <XAxis 
                          dataKey="month" 
                          stroke="#94a3b8" 
                          tick={{fill: '#94a3b8'}} 
                          axisLine={{stroke: '#2a3750'}} 
                          tickFormatter={(m) => `Mois ${m}`}
                        />
                        <YAxis stroke="#94a3b8" tick={{fill: '#94a3b8'}} axisLine={{stroke: '#2a3750'}} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey="cm" 
                          stroke="#ec4899" 
                          strokeWidth={2} 
                          strokeDasharray="4 4" 
                          fill="transparent" 
                          name="Consommation Moyenne (CM)" 
                        />
                        {activeSalesTab === 'biotech' && (
                          <Area 
                            type="monotone" 
                            dataKey="qty2025" 
                            stroke="#8b5cf6" 
                            strokeWidth={2} 
                            fillOpacity={1} 
                            fill="url(#color2025)" 
                            name="Réel 2025" 
                          />
                        )}
                        <Area 
                          type="monotone" 
                          dataKey="qty2026" 
                          stroke={activeSalesTab === 'biotech' ? "#3b82f6" : "#10b981"} 
                          strokeWidth={4} 
                          fillOpacity={1} 
                          fill="url(#color2026)" 
                          name="Réel 2026" 
                        />
                        {activeSalesTab === 'biotech' && (
                          <Area 
                            type="monotone" 
                            dataKey="prevision2026" 
                            stroke="#f59e0b" 
                            strokeWidth={2} 
                            strokeDasharray="5 5" 
                            fillOpacity={1} 
                            fill="url(#colorForecast)" 
                            name="Prévision 2026" 
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="alerts-section table-container" id="alerts-to-pdf">
                  <div className="section-header-with-action">
                    <div className="header-text">
                      <h3>
                        {activeSalesTab === 'biotech'
                          ? "Alertes Performance Grossistes (Avril 2026)"
                          : "Alertes Ventes Produits Locaux (Avril 2026)"}
                      </h3>
                      <p className="table-subtitle">
                        {activeSalesTab === 'biotech' 
                          ? "Comparaison Réel vs Prévision (+15% vs 2025)" 
                          : "Comparaison Réel (Avril 2026) vs Mois Précédent (Mars 2026)"}
                      </p>
                    </div>
                    <button className="pdf-btn" onClick={handleDownloadPDF}>
                      <span className="icon">📄</span> Télécharger PDF
                    </button>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Grossiste</th>
                          <th>Réel (Avril)</th>
                          <th>{activeSalesTab === 'biotech' ? "Prévision" : "Mars 2026"}</th>
                          <th>Écart</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alertsData.slice(0, 50).map((alert, idx) => (
                          <tr key={idx}>
                            <td className="client-cell">{alert.client}</td>
                            <td className={`qte-cell ${activeSalesTab === 'biotech' ? 'blue' : 'green'}`}>{alert.actualQty.toLocaleString()}</td>
                            <td>{alert.prediction.toLocaleString()}</td>
                            <td className={alert.diff < 0 ? 'text-danger' : 'text-success'}>{alert.diff > 0 ? '+' : ''}{alert.diff.toLocaleString()}</td>
                            <td><span className={`status-badge ${alert.color}`}>{alert.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            <div className="table-container history-card">
              <div className="history-header">
                <h3>Historique Global des Transactions</h3>
                <span className="period-badge">
                  {activeSalesTab === 'biotech' ? "Toute l'année 2025 & 2026" : "Mars & Avril 2026"}
                </span>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Période</th>
                      <th>Grossiste</th>
                      <th>Produit</th>
                      <th>Quantité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveFilteredData.slice(0, 200).map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.period}</td>
                        <td>{item.nom_client}</td>
                        <td>{item.libelle}</td>
                        <td className={`qte-cell ${activeSalesTab === 'biotech' ? 'blue' : 'green'}`}>{item.qte.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {liveFilteredData.length > 200 && (
                <p className="limit-footer">Affichage des 200 dernières transactions sur {liveFilteredData.length} au total.</p>
              )}
            </div>
          </section>

        </main>
          </>
        )}
      </div>
      <div style={{ position: 'fixed', bottom: 10, right: 10, fontSize: '10px', color: '#666', opacity: 0.5, pointerEvents: 'none' }}>
        v1.0.4-stock
      </div>
    </div>
  );
};

export default SalesDashboardView;
