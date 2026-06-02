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
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import './App.css';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const App = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTermClient, setSearchTermClient] = useState('');
  const [searchTermProduct, setSearchTermProduct] = useState('');
  const [selectedClient, setSelectedClient] = useState('All');
  
  // New state for multi-product selection and plot triggering
  const [tempSelectedProducts, setTempSelectedProducts] = useState([]);
  const [appliedProducts, setAppliedProducts] = useState([]);
  const [isChartGenerated, setIsChartGenerated] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('04'); // default April

  // Tab navigation state
  const [activeTab, setActiveTab] = useState('biotech');

  // CM Data state
  const [cmData, setCmData] = useState({});

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'cm_data.json')
      .then(res => res.json())
      .then(json => setCmData(json))
      .catch(err => console.error("Error loading CM data:", err));
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = activeTab === 'biotech'
      ? import.meta.env.BASE_URL + 'sales_data.json'
      : import.meta.env.BASE_URL + 'local_sales_data.json';
    fetch(url)
      .then(res => res.json())
      .then(json => {
        const processed = json.map(item => ({
          ...item,
          period: `${item.annee}-${item.mois.padStart(2, '0')}`,
          qte: Number(item.qte) || 0
        })).sort((a, b) => a.period.localeCompare(b.period));
        setData(processed);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading data:", err);
        setLoading(false);
      });
  }, [activeTab]);

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
    return allProductsList.filter(p => p.toLowerCase().includes(searchTermProduct.toLowerCase()));
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
        prevision2026: dataForMonth.qty2025 * 1.15,
        cm: currentCM
      };
    });
  }, [plotData, currentCM]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FDB462', '#B3DE69', '#FCCDE5', '#D9D9D9'];

  const pieData2025 = useMemo(() => {
    const products = {};
    plotData.forEach(item => {
      if (item.annee === '2025') {
        products[item.libelle] = (products[item.libelle] || 0) + item.qte;
      }
    });
    return Object.entries(products)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [plotData]);

  const pieData2026 = useMemo(() => {
    const products = {};
    plotData.forEach(item => {
      if (item.annee === '2026') {
        products[item.libelle] = (products[item.libelle] || 0) + item.qte;
      }
    });
    return Object.entries(products)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [plotData]);

  const stats = useMemo(() => {
    const totalQte = plotData.reduce((sum, item) => sum + item.qte, 0);
    const uniqueClients = new Set(plotData.map(item => item.nom_client)).size;
    const uniqueProducts = new Set(plotData.map(item => item.libelle)).size;
    return { totalQte, uniqueClients, uniqueProducts };
  }, [plotData]);

  const alertsData = useMemo(() => {
    const isBiotech = activeTab === 'biotech';
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
  }, [data, appliedProducts, selectedClient, activeTab]);

  const comparativeTableData = useMemo(() => {
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    
    const grouped = liveFilteredData.reduce((acc, item) => {
      const m = item.mois.padStart(2, '0');
      if (!acc[m]) acc[m] = { qty2025: 0, qty2026: 0 };
      if (item.annee === '2025') acc[m].qty2025 += item.qte;
      if (item.annee === '2026') acc[m].qty2026 += item.qte;
      return acc;
    }, {});

    return months.map((m, idx) => {
      const dataForMonth = grouped[m] || { qty2025: 0, qty2026: 0 };
      const diff = dataForMonth.qty2026 - dataForMonth.qty2025;
      return {
        monthKey: m,
        monthName: monthNames[idx],
        qty2025: dataForMonth.qty2025,
        qty2026: dataForMonth.qty2026,
        diff: diff,
        evolution: dataForMonth.qty2025 ? ((diff / dataForMonth.qty2025) * 100).toFixed(1) + '%' : '-'
      };
    });
  }, [liveFilteredData]);

  const productComparativeData = useMemo(() => {
    const clientData = data.filter(item => selectedClient === 'All' || item.nom_client === selectedClient);
    const monthData = clientData.filter(item => item.mois.padStart(2, '0') === selectedMonth);
    
    const grouped = monthData.reduce((acc, item) => {
      const prod = item.libelle;
      if (!acc[prod]) acc[prod] = { qty2025: 0, qty2026: 0 };
      if (item.annee === '2025') acc[prod].qty2025 += item.qte;
      if (item.annee === '2026') acc[prod].qty2026 += item.qte;
      return acc;
    }, {});

    const filteredProducts = Object.keys(grouped).filter(prod => 
      tempSelectedProducts.length === 0 || tempSelectedProducts.includes(prod)
    );

    return filteredProducts.map(prod => {
      const d = grouped[prod];
      const diff = d.qty2026 - d.qty2025;
      return {
        product: prod,
        qty2025: d.qty2025,
        qty2026: d.qty2026,
        diff: diff,
        evolution: d.qty2025 ? ((diff / d.qty2025) * 100).toFixed(1) + '%' : '-'
      };
    }).sort((a, b) => b.qty2026 - a.qty2026);
  }, [data, selectedClient, selectedMonth, tempSelectedProducts]);



  const handleDownloadComparativePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Comparatif Mensuel: ${selectedClient}`, 14, 15);
    doc.setFontSize(12);
    doc.text(`Produit: ${tempSelectedProducts[0]}`, 14, 22);
    
    autoTable(doc, {
      html: '#comparative-table',
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 10 }
    });
    doc.save(`Comparatif_${selectedClient}_${tempSelectedProducts[0]}.pdf`);
  };

  const handleGeneratePlot = () => {
    setAppliedProducts(tempSelectedProducts);
    setIsChartGenerated(true);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Add Title
    doc.setFontSize(18);
    doc.setTextColor(40);
    const titleText = activeTab === 'biotech' 
      ? 'Rapport de Performance Grossistes - Avril 2026'
      : 'Rapport de Performance Produits Locaux - Avril 2026';
    doc.text(titleText, 14, 22);
    
    // Add Subtitle
    doc.setFontSize(11);
    doc.setTextColor(100);
    const subtitleText = activeTab === 'biotech'
      ? 'Basé sur la prévision 2025 + 15%'
      : 'Comparaison Avril 2026 vs Mars 2026';
    doc.text(subtitleText, 14, 30);

    const tableColumn = [
      "Grossiste", 
      "Réel (Avril)", 
      activeTab === 'biotech' ? "Prévision" : "Mars 2026", 
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
      headStyles: { fillColor: activeTab === 'biotech' ? [59, 130, 246] : [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        4: { fontStyle: 'bold' }
      }
    });

    const pdfName = activeTab === 'biotech'
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
            {activeTab === 'biotech' && <div className="tooltip-item"><span className="dot year2025"></span> 2025: <strong>{data2025.toLocaleString()}</strong></div>}
            <div className="tooltip-item"><span className="dot year2026"></span> 2026: <strong>{data2026.toLocaleString()}</strong></div>
            {activeTab === 'biotech' && <div className="tooltip-item"><span className="dot forecast"></span> Prév: <strong>{Math.round(dataPrev).toLocaleString()}</strong></div>}
            <div className="tooltip-item"><span className="dot cm-dot"></span> CM : <strong>{Math.round(dataCm).toLocaleString()}</strong></div>
            {activeTab === 'biotech' && (
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
      <div className="loading-container">
        <div className="loader"></div>
        <p>Chargement des données {activeTab === 'biotech' ? 'Produit Importé' : 'Produits Locaux'}...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Navigation and Back button */}
      <div className="top-navigation-bar">
        <button 
          className="back-btn"
          onClick={() => {
            if (document.referrer && document.referrer.includes(window.location.host)) {
              window.history.back();
            } else {
              window.location.href = '/dashboard/dashboard2';
            }
          }}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '1.25rem', height: '1.25rem' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Retour au Dashboard
        </button>

        <div className="dashboard-tabs" style={{ margin: '0' }}>
          <button 
            className={`tab-btn ${activeTab === 'biotech' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('biotech');
              setSelectedClient('All');
              setTempSelectedProducts([]);
              setAppliedProducts([]);
              setIsChartGenerated(false);
            }}
          >
            🌐 Produit Importé
          </button>
          <button 
            className={`tab-btn ${activeTab === 'local' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('local');
              setSelectedClient('All');
              setTempSelectedProducts([]);
              setAppliedProducts([]);
              setIsChartGenerated(false);
            }}
          >
            🏡 Produits Locaux
          </button>
          <button 
            className={`tab-btn ${activeTab === 'stock' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('stock');
              setSelectedClient('All');
              setTempSelectedProducts([]);
              setAppliedProducts([]);
              setIsChartGenerated(false);
            }}
          >
            📦 Stock et commande
          </button>
        </div>

        <div className="nav-spacer" style={{ width: '180px' }} />
      </div>

      {activeTab === 'stock' ? (
        <StockCommandeView />
      ) : (
        <>
      <header className={`dashboard-header ${activeTab === 'biotech' ? 'biotech-header' : 'local-header'}`}>
        <div className="header-content">
          <h1>
            {activeTab === 'biotech' ? (
              <>Produit <span className="highlight blue">Importé</span></>
            ) : (
              <>Produits <span className="highlight green">Locaux</span></>
            )}
          </h1>
        </div>
      </header>

      <main className="dashboard-main">
        <aside className={`filters-sidebar ${activeTab}`}>
          <div className="filter-group">
            <label>1. Sélectionner Grossiste</label>
            <input 
              type="text" 
              placeholder="Chercher grossiste..." 
              value={searchTermClient}
              onChange={(e) => setSearchTermClient(e.target.value)}
            />
            <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
              {clients.filter(c => c.toLowerCase().includes(searchTermClient.toLowerCase()) || c === 'All').slice(0, 50).map(client => (
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
              <span className={`live-value ${activeTab === 'biotech' ? 'blue' : 'green'}`}>
                {liveFilteredData.reduce((sum, item) => sum + item.qte, 0).toLocaleString()} units
              </span>
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
                    {activeTab === 'biotech' 
                      ? "Comparaison Mensuelle : 2025 vs 2026"
                      : "Évolution Mensuelle : 2026"}
                  </h3>
                  <div className="legend-custom">
                    {activeTab === 'biotech' && <span className="legend-item"><span className="dot year2025"></span> 2025</span>}
                    <span className="legend-item"><span className="dot year2026"></span> 2026 (Réel)</span>
                    {activeTab === 'biotech' && <span className="legend-item"><span className="dot forecast"></span> Prévision 2026</span>}
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
                          <stop offset="5%" stopColor={activeTab === 'biotech' ? "#3b82f6" : "#10b981"} stopOpacity={0.4}/>
                          <stop offset="95%" stopColor={activeTab === 'biotech' ? "#3b82f6" : "#10b981"} stopOpacity={0}/>
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
                      {activeTab === 'biotech' && (
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
                        stroke={activeTab === 'biotech' ? "#3b82f6" : "#10b981"} 
                        strokeWidth={4} 
                        fillOpacity={1} 
                        fill="url(#color2026)" 
                        name="Réel 2026" 
                      />
                      {activeTab === 'biotech' && (
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

              <div className="pie-charts-section">
                {activeTab === 'biotech' && pieData2025.length > 0 && (
                  <div className="pie-container">
                    <h4>Répartition des Produits - 2025</h4>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={pieData2025} cx="50%" cy="50%" innerRadius={50} outerRadius={90} fill="#8884d8" paddingAngle={5} dataKey="value" nameKey="name">
                          {pieData2025.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => value.toLocaleString() + ' unités'} />
                      </PieChart>
                    </ResponsiveContainer>
                    <select className="pie-legend-dropdown" style={{ width: '100%', padding: '0.65rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600', outline: 'none' }}>
                      <option value="">📊 Détail des Produits (2025)</option>
                      {pieData2025.map((item, idx) => (
                        <option key={idx} value={item.name}>
                          {item.name} — {item.value.toLocaleString()} unités
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {pieData2026.length > 0 && (
                  <div className="pie-container">
                    <h4>Répartition des Produits - 2026</h4>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={pieData2026} cx="50%" cy="50%" innerRadius={50} outerRadius={90} fill="#82ca9d" paddingAngle={5} dataKey="value" nameKey="name">
                          {pieData2026.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => value.toLocaleString() + ' unités'} />
                      </PieChart>
                    </ResponsiveContainer>
                    <select className="pie-legend-dropdown" style={{ width: '100%', padding: '0.65rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600', outline: 'none' }}>
                      <option value="">📊 Détail des Produits (2026)</option>
                      {pieData2026.map((item, idx) => (
                        <option key={idx} value={item.name}>
                          {item.name} — {item.value.toLocaleString()} unités
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="alerts-section table-container" id="alerts-to-pdf">
                <div className="section-header-with-action">
                  <div className="header-text">
                    <h3>
                      {activeTab === 'biotech'
                        ? "Alertes Performance Grossistes (Avril 2026)"
                        : "Alertes Ventes Produits Locaux (Avril 2026)"}
                    </h3>
                    <p className="table-subtitle">
                      {activeTab === 'biotech' 
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
                        <th>{activeTab === 'biotech' ? "Prévision" : "Mars 2026"}</th>
                        <th>Écart</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alertsData.slice(0, 50).map((alert, idx) => (
                        <tr key={idx}>
                          <td className="client-cell">{alert.client}</td>
                          <td className={`qte-cell ${activeTab === 'biotech' ? 'blue' : 'green'}`}>{alert.actualQty.toLocaleString()}</td>
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

          <div className="table-container history-card" id="comparative-section">
            <div className="section-header-with-action">
              <div className="header-text">
                <h3>Comparatif Mensuel (2025 vs 2026)</h3>
                <span className="period-badge" style={{ marginTop: '0.5rem', display: 'inline-block' }}>
                  {selectedClient === 'All' ? 'Tous les Grossistes' : selectedClient} — {tempSelectedProducts.length === 0 ? 'Tous les Produits' : tempSelectedProducts.length === 1 ? tempSelectedProducts[0] : `${tempSelectedProducts.length} Produits sélectionnés`}
                </span>
              </div>
              <button className="pdf-btn" onClick={handleDownloadComparativePDF}>
                <span className="icon">📄</span> Télécharger PDF
              </button>
            </div>
            <div className="table-wrapper">
              <table id="comparative-table">
                <thead>
                  <tr>
                    <th>Mois</th>
                    <th>Qté 2025</th>
                    <th>Qté 2026</th>
                    <th>Écart</th>
                    <th>Évolution</th>
                  </tr>
                </thead>
                <tbody>
                  {comparativeTableData.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.monthName}</td>
                      <td>{row.qty2025.toLocaleString()}</td>
                      <td>{row.qty2026.toLocaleString()}</td>
                      <td className={row.diff < 0 ? 'text-danger' : row.diff > 0 ? 'text-success' : ''}>
                        {row.diff > 0 ? '+' : ''}{row.diff.toLocaleString()}
                      </td>
                      <td className={row.diff < 0 ? 'text-danger' : row.diff > 0 ? 'text-success' : ''}>
                        {row.evolution}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 'bold', background: 'rgba(255,255,255,0.05)' }}>
                    <td>TOTAL</td>
                    <td>{comparativeTableData.reduce((sum, r) => sum + r.qty2025, 0).toLocaleString()}</td>
                    <td>{comparativeTableData.reduce((sum, r) => sum + r.qty2026, 0).toLocaleString()}</td>
                    <td className={comparativeTableData.reduce((sum, r) => sum + r.diff, 0) < 0 ? 'text-danger' : 'text-success'}>
                      {comparativeTableData.reduce((sum, r) => sum + r.diff, 0) > 0 ? '+' : ''}{comparativeTableData.reduce((sum, r) => sum + r.diff, 0).toLocaleString()}
                    </td>
                    <td>-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="table-container history-card" id="detailed-product-section" style={{ marginTop: '2rem' }}>
            <div className="section-header-with-action">
              <div className="header-text">
                <h3>Comparatif Détaillé par Produit</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                  <span className="period-badge">
                    {selectedClient === 'All' ? 'Tous les Grossistes' : selectedClient}
                  </span>
                  <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{ 
                      padding: '0.4rem', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border)', 
                      background: 'var(--bg-secondary)', 
                      color: 'var(--text-primary)', 
                      fontSize: '0.9rem', 
                      fontWeight: '500', 
                      outline: 'none' 
                    }}
                  >
                    <option value="01">Janvier</option>
                    <option value="02">Février</option>
                    <option value="03">Mars</option>
                    <option value="04">Avril</option>
                    <option value="05">Mai</option>
                    <option value="06">Juin</option>
                    <option value="07">Juillet</option>
                    <option value="08">Août</option>
                    <option value="09">Septembre</option>
                    <option value="10">Octobre</option>
                    <option value="11">Novembre</option>
                    <option value="12">Décembre</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="table-wrapper">
              <table id="detailed-product-table">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Qté 2025</th>
                    <th>Qté 2026</th>
                    <th>Écart</th>
                    <th>Évolution</th>
                  </tr>
                </thead>
                <tbody>
                  {productComparativeData.length > 0 ? (
                    productComparativeData.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: '500' }}>{row.product}</td>
                        <td>{row.qty2025.toLocaleString()}</td>
                        <td>{row.qty2026.toLocaleString()}</td>
                        <td className={row.diff < 0 ? 'text-danger' : row.diff > 0 ? 'text-success' : ''}>
                          {row.diff > 0 ? '+' : ''}{row.diff.toLocaleString()}
                        </td>
                        <td className={row.diff < 0 ? 'text-danger' : row.diff > 0 ? 'text-success' : ''}>
                          {row.evolution}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        Aucune donnée pour ce mois.
                      </td>
                    </tr>
                  )}
                  {productComparativeData.length > 0 && (
                    <tr style={{ fontWeight: 'bold', background: 'rgba(255,255,255,0.05)' }}>
                      <td>TOTAL</td>
                      <td>{productComparativeData.reduce((sum, r) => sum + r.qty2025, 0).toLocaleString()}</td>
                      <td>{productComparativeData.reduce((sum, r) => sum + r.qty2026, 0).toLocaleString()}</td>
                      <td className={productComparativeData.reduce((sum, r) => sum + r.diff, 0) < 0 ? 'text-danger' : 'text-success'}>
                        {productComparativeData.reduce((sum, r) => sum + r.diff, 0) > 0 ? '+' : ''}{productComparativeData.reduce((sum, r) => sum + r.diff, 0).toLocaleString()}
                      </td>
                      <td>-</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </main>
        </>
      )}

    </div>
  );
};

export default App;
