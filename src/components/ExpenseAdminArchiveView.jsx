import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const MONTHS = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export default function ExpenseAdminArchiveView({ dashboardId }) {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterYear, setFilterYear] = useState('');
    const [filterMonth, setFilterMonth] = useState('');

    useEffect(() => {
        fetchExpenses();
    }, [dashboardId, filterYear, filterMonth]);

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            let url = '/api/expenses/all?';
            if (filterYear) url += `year=${filterYear}&`;
            if (filterMonth) url += `month=${filterMonth}&`;

            const res = await fetch(url, {
                headers: { 'x-auth-token': token }
            });
            if (res.ok) {
                let data = await res.json();
                if (dashboardId) {
                    data = data.filter(e => e.dashboardId === dashboardId);
                }
                setExpenses(data);
            }
        } catch (error) {
            console.error('Error fetching admin expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    const generatePDF = (exp) => {
        const doc = new jsPDF();

        // Header
        doc.setFillColor(16, 185, 129);
        doc.rect(0, 0, 210, 28, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('NOTE DE FRAIS', 14, 18);

        // Meta info
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Créé par: ${exp.user?.username || 'Inconnu'}`, 14, 32);
        doc.text(`Année: ${exp.year}    Mois: ${MONTHS[(exp.month || 1) - 1]}`, 14, 40);
        doc.text(`Voiture: ${exp.carModel || '-'}    Immatriculation: ${exp.licensePlate || '-'}`, 14, 48);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38);
        doc.text(`Kilométrage: ${exp.kilometrage}`, 14, 56);
        doc.setTextColor(30, 30, 30);
        doc.setFont('helvetica', 'normal');

        const formatNumber = (val) => {
            const n = Number(val) || 0;
            return n === 0 ? '-' : n.toFixed(3);
        };

        // Table
        const tableColumn = ['Sem.', 'Secteurs Visités', 'Hôtel', 'Essence', 'Péage', 'Parking', 'Autres (Détail)', 'Autres (DT)'];
        const tableRows = (exp.entries || []).map(e => [
            String(e.week),
            e.secteursVisites || '-',
            formatNumber(e.hotel),
            formatNumber(e.essence),
            formatNumber(e.peage),
            formatNumber(e.parking),
            e.autresDescription || '-',
            formatNumber(e.autresMontant)
        ]);

        autoTable(doc, {
            startY: 62,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 255, 250] },
            styles: { fontSize: 9 },
            columnStyles: { 0: { halign: 'center', cellWidth: 12 } }
        });

        // Total
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFillColor(16, 185, 129);
        doc.roundedRect(14, finalY, 182, 12, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`TOTAL A REMBOURSER : ${Number(exp.totalAmount).toFixed(3)} DT`, 18, finalY + 8);

        doc.save(`Note_de_Frais_${exp.user?.username || 'user'}_${exp.year}_Mois${exp.month}.pdf`);
    };

    return (
        <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in relative z-10 pb-24">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="text-4xl">🗄️</span> Archives Frais
                    </h2>
                    <p className="text-gray-500 font-medium mt-1">Consultez l'ensemble des notes de frais des délégués</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-bold text-gray-700">Année:</label>
                    <input 
                        type="number" 
                        placeholder="Toutes" 
                        value={filterYear} 
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-bold text-gray-700">Mois:</label>
                    <select 
                        value={filterMonth} 
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">Tous</option>
                        {MONTHS.map((m, i) => (
                            <option key={i+1} value={i+1}>{m}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 italic">
                        Aucune note de frais trouvée.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Créateur</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Période</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Créée le</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Kilométrage</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Total (DT)</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {expenses.map(exp => (
                                    <tr key={exp._id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{exp.user?.username || 'Utilisateur inconnu'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{MONTHS[(exp.month || 1) - 1]} {exp.year}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-500">
                                                {new Date(exp.createdAt).toLocaleDateString('fr-FR')} à {new Date(exp.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-red-600">{exp.kilometrage} km</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-black text-emerald-600">
                                                {Number(exp.totalAmount).toFixed(3)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => generatePDF(exp)}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-bold transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                PDF
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
