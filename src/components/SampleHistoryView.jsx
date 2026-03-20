import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SampleHistoryView() {
    const [viewMode, setViewMode] = useState('delegate'); // 'delegate' or 'batch'
    const [view, setView] = useState('list'); // 'list' or 'detail' (for delegate view)

    // Delegate View State
    const [delegates, setDelegates] = useState([]);
    const [selectedDelegate, setSelectedDelegate] = useState(null);
    const [history, setHistory] = useState([]);

    // Batch View State
    const [batchQuery, setBatchQuery] = useState('');
    const [batchData, setBatchData] = useState(null);
    const [batchError, setBatchError] = useState('');

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchDelegatesWithHistory();
    }, []);

    const fetchDelegatesWithHistory = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/history/delegates', {
                headers: { 'x-auth-token': token }
            });
            if (res.ok) {
                const data = await res.json();
                setDelegates(data);
            }
        } catch (err) {
            console.error("Failed to fetch delegates history", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelegateClick = async (delegate) => {
        setLoading(true);
        setSelectedDelegate(delegate);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/history/${delegate._id}`, {
                headers: { 'x-auth-token': token }
            });
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
                setView('detail');
            }
        } catch (err) {
            console.error("Failed to fetch delegate history", err);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setView('list');
        setSelectedDelegate(null);
        setHistory([]);
    };

    const handleSearchBatch = async (e) => {
        e.preventDefault();
        if (!batchQuery.trim()) return;

        setLoading(true);
        setBatchError('');
        setBatchData(null);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/history/batch/${encodeURIComponent(batchQuery)}`, {
                headers: { 'x-auth-token': token }
            });

            if (res.ok) {
                const data = await res.json();
                // Improved check: even if stock/possession is 0, if there's history, we show it
                if (data.stockQuantity === 0 && data.possessionTotal === 0 && data.distributionHistory.length === 0 && data.offeredHistory.length === 0) {
                    setBatchError('Aucune donnée trouvée pour ce numéro de lot.');
                } else {
                    setBatchData(data);
                }
            } else {
                setBatchError('Erreur lors de la recherche.');
            }
        } catch (err) {
            console.error(err);
            setBatchError('Erreur serveur.');
        } finally {
            setLoading(false);
        }
    };

    const generatePDF = () => {
        if (!batchData) return;

        try {
            const doc = new jsPDF();
            const dateGen = new Date().toLocaleString('fr-FR');

            // Header
            doc.setFontSize(20);
            doc.setTextColor(40, 167, 69); // Green
            doc.text("BioXtenshi - Rapport de Traçabilité", 14, 22);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Généré le : ${dateGen}`, 14, 28);

            // Batch Info
            doc.setFontSize(14);
            doc.setTextColor(0);
            doc.text(`Lot N° : ${batchData.batchNumber}`, 14, 40);

            // Summary Table
            const summaryHead = [['En Stock (Pharmacie)', 'Chez les Délégués', 'Total Tracé']];
            const summaryBody = [[batchData.stockQuantity, batchData.possessionTotal, batchData.totalQuantity]];

            autoTable(doc, {
                startY: 45,
                head: summaryHead,
                body: summaryBody,
                theme: 'grid',
                headStyles: { fillColor: [66, 139, 202] },
            });

            // Possession Table
            let currentY = doc.lastAutoTable.finalY + 15;
            doc.setFontSize(14);
            doc.text("Possession Actuelle (Délégués)", 14, currentY);

            const possessionRows = (batchData.possessionDetails || []).map(d => [d.delegateName, d.count]);

            if (possessionRows.length === 0) {
                doc.setFontSize(10);
                doc.text("Aucun délégué n'a ce lot en possession.", 14, currentY + 10);
                currentY += 20;
            } else {
                autoTable(doc, {
                    startY: currentY + 5,
                    head: [['Délégué', 'Quantité']],
                    body: possessionRows,
                    theme: 'striped',
                    headStyles: { fillColor: [111, 66, 193] },
                });
                currentY = doc.lastAutoTable.finalY + 15;
            }

            // Distribution History Table
            doc.setFontSize(14);
            doc.text("Historique des Attributions (Pharmacie -> Délégué)", 14, currentY);

            const distributionRows = (batchData.distributionHistory || []).map(h => [
                new Date(h.dateGiven).toLocaleString('fr-FR'),
                h.delegateName,
                h.stockName,
                h.count
            ]);

            if (distributionRows.length === 0) {
                doc.setFontSize(10);
                doc.text("Aucune attribution enregistrée.", 14, currentY + 10);
                currentY += 20;
            } else {
                autoTable(doc, {
                    startY: currentY + 5,
                    head: [['Date', 'Délégué', 'Produit', 'Quantité']],
                    body: distributionRows,
                    theme: 'striped',
                    headStyles: { fillColor: [108, 117, 125] },
                });
                currentY = doc.lastAutoTable.finalY + 15;
            }

            // Offered History Table
            doc.setFontSize(14);
            doc.text("Historique des Offres (Délégué -> Médecin)", 14, currentY);

            const offeredRows = [];
            (batchData.offeredHistory || []).forEach(h => {
                const date = new Date(h.start).toLocaleDateString('fr-FR');
                const delegate = h.user ? h.user.username : 'Inconnu';
                const target = `Dr. ${h.doctorName || h.pharmacyName || 'N/A'}`;

                // Check sample
                if (h.givenSampleBatch === batchData.batchNumber) {
                    offeredRows.push([date, delegate, target, h.givenSampleName, 1]);
                }
                // Check legacy material
                if (h.givenMaterialBatch === batchData.batchNumber) {
                    offeredRows.push([date, delegate, target, h.givenMaterialName, 1]);
                }
                // Check materials array
                (h.givenMaterials || []).forEach(m => {
                    if (m.batch === batchData.batchNumber) {
                        offeredRows.push([date, delegate, target, m.name, m.count || 1]);
                    }
                });
            });

            if (offeredRows.length === 0) {
                doc.setFontSize(10);
                doc.text("Aucune offre enregistrée.", 14, currentY + 10);
            } else {
                autoTable(doc, {
                    startY: currentY + 5,
                    head: [['Date', 'Délégué', 'Médecin/Cible', 'Produit', 'Qté']],
                    body: offeredRows,
                    theme: 'striped',
                    headStyles: { fillColor: [255, 193, 7] },
                });
            }

            doc.save(`Tracabilite_Lot_${batchData.batchNumber}.pdf`);
        } catch (err) {
            console.error("PDF Generation Error:", err);
            alert("Erreur lors de la génération du PDF. Vérifiez la console pour plus de détails.");
        }
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">Historique des Échantillons</h2>



            {/* View Switcher */}
            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => setViewMode('delegate')}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${viewMode === 'delegate' ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    Par Délégué
                </button>
                <button
                    onClick={() => setViewMode('batch')}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${viewMode === 'batch' ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    Traçabilité par Lot
                </button>
            </div>

            {viewMode === 'delegate' ? (
                view === 'list' ? (
                    <div>
                        <h3 className="font-semibold text-lg mb-4 text-gray-700">Délégués ayant reçu des échantillons</h3>
                        {loading ? <p>Chargement...</p> : (
                            <div className="overflow-x-auto border rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom du Délégué</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dernière Attribution</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {delegates.length === 0 ? (
                                            <tr>
                                                <td colSpan="3" className="px-6 py-4 text-center text-gray-500">Aucun historique disponible.</td>
                                            </tr>
                                        ) : (
                                            delegates
                                                .filter(d => d.lastGiven && d.delegateName) // Filter out incomplete entries
                                                .map((d) => (
                                                    <tr key={d._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleDelegateClick(d)}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{d.delegateName}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                                            {new Date(d.lastGiven).toLocaleDateString('fr-FR')}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-blue-600 font-medium">
                                                            Voir Détails &rarr;
                                                        </td>
                                                    </tr>
                                                ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <button onClick={handleBack} className="mb-4 flex items-center text-blue-600 hover:text-blue-800">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                            Retour à la liste
                        </button>

                        <h3 className="font-semibold text-lg mb-4 text-gray-700">
                            Historique pour : <span className="text-green-600">{selectedDelegate?.delegateName}</span>
                        </h3>

                        {loading ? <p>Chargement...</p> : (
                            <div className="overflow-x-auto border rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produit</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lot/Réf</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantité</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {history.map((item) => (
                                            <tr key={item._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                                                    {new Date(item.dateGiven).toLocaleString('fr-FR')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.itemType === 'material' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                                        {item.itemType === 'material' ? 'MATÉRIEL' : 'ÉCHANTILLON'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{item.stockName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{item.batchNumber}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-bold">{item.count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )
            ) : (
                /* BATCH VIEW */
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-lg text-gray-700">Recherche par Numéro de Lot</h3>
                        {batchData && (
                            <button
                                onClick={generatePDF}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium flex items-center shadow-sm transition-colors"
                            >
                                <span className="mr-2">📄</span> Générer PDF
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleSearchBatch} className="flex gap-3 mb-8">
                        <input
                            type="text"
                            placeholder="Entrez le numéro de lot (ex: INIT-2029)"
                            className="flex-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            value={batchQuery}
                            onChange={(e) => setBatchQuery(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors shadow-sm"
                        >
                            {loading ? 'Recherche...' : 'Rechercher'}
                        </button>
                    </form>

                    {batchError && (
                        <div className="p-4 mb-6 bg-red-50 text-red-700 border border-red-100 rounded-lg">
                            {batchError}
                        </div>
                    )}

                    {batchData && (
                        <div className="space-y-8 animate-fade-in">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                                    <h4 className="text-blue-800 font-semibold mb-2">En Stock (Pharmacie)</h4>
                                    <p className="text-4xl font-bold text-blue-900">{batchData.stockQuantity}</p>
                                </div>
                                <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
                                    <h4 className="text-purple-800 font-semibold mb-2">Chez les Délégués</h4>
                                    <p className="text-4xl font-bold text-purple-900">{batchData.possessionTotal}</p>
                                </div>
                                <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                                    <h4 className="text-green-800 font-semibold mb-2">Total Tracé</h4>
                                    <p className="text-4xl font-bold text-green-900">{batchData.totalQuantity}</p>
                                </div>
                            </div>

                            {/* Offered History (New Section) */}
                            <div>
                                <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2 flex items-center gap-2">
                                    <span className="bg-orange-100 text-orange-600 p-1 rounded">🩺</span>
                                    Historique des Offres (Délégué &rarr; Médecin)
                                </h4>
                                {(!batchData.offeredHistory || batchData.offeredHistory.length === 0) ? (
                                    <p className="text-gray-500 italic text-sm">Aucune offre enregistrée pour ce lot auprès des médecins.</p>
                                ) : (
                                    <div className="overflow-x-auto border rounded-lg">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Délégué</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Médecin / Cible</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produit</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantité</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {(batchData.offeredHistory || []).map(h => {
                                                    const date = new Date(h.start).toLocaleDateString('fr-FR');
                                                    const delegate = h.user ? h.user.username : 'Inconnu';
                                                    const target = `Dr. ${h.doctorName || h.pharmacyName || 'N/A'}`;

                                                    const rows = [];
                                                    if (h.givenSampleBatch === batchData.batchNumber) {
                                                        rows.push({ id: `${h._id}-s`, date, delegate, target, item: h.givenSampleName, qty: 1 });
                                                    }
                                                    if (h.givenMaterialBatch === batchData.batchNumber) {
                                                        rows.push({ id: `${h._id}-m`, date, delegate, target, item: h.givenMaterialName, qty: 1 });
                                                    }
                                                    (h.givenMaterials || []).forEach((m, idx) => {
                                                        if (m.batch === batchData.batchNumber) {
                                                            rows.push({ id: `${h._id}-gm-${idx}`, date, delegate, target, item: m.name, qty: m.count || 1 });
                                                        }
                                                    });

                                                    return rows.map(r => (
                                                        <tr key={r.id} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.date}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.delegate}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.target}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.item}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-orange-600">{r.qty}</td>
                                                        </tr>
                                                    ));
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Possession List */}
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2">Possession Actuelle</h4>
                                    {batchData.possessionDetails.length === 0 ? (
                                        <p className="text-gray-500 italic text-sm">Aucun délégué n'a ce lot en possession.</p>
                                    ) : (
                                        <ul className="space-y-3">
                                            {batchData.possessionDetails.map(d => (
                                                <li key={d.delegateId} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                    <span className="font-medium text-gray-800">{d.delegateName}</span>
                                                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-bold">{d.count}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                {/* Distribution History */}
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2">Historique des Attributions</h4>
                                    {batchData.distributionHistory.length === 0 ? (
                                        <p className="text-gray-500 italic text-sm">Aucune attribution enregistrée pour ce lot.</p>
                                    ) : (
                                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                            {batchData.distributionHistory.map(h => (
                                                <div key={h._id} className="bg-white border border-gray-100 p-3 rounded-lg shadow-sm flex justify-between items-center">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{h.delegateName}</p>
                                                        <p className="text-xs text-gray-500">{new Date(h.dateGiven).toLocaleString('fr-FR')}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block text-green-600 font-bold">+{h.count}</span>
                                                        <span className="text-xs text-gray-400">{h.stockName}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
