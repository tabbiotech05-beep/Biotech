import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const MONTHS = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export default function ExpenseView({ dashboardId }) {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingExpense, setEditingExpense] = useState(null);

    // Form inputs
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [carModel, setCarModel] = useState('');
    const [licensePlate, setLicensePlate] = useState('');
    const [kilometrage, setKilometrage] = useState('');
    
    // entries length = 5 (week 1 to 5)
    // each entry: semaine, secteursVisites, hotel, essence, peage, parking, autresMontant, autresDescription
    const initialEntries = Array.from({ length: 5 }, (_, i) => ({
        week: i + 1,
        secteursVisites: '',
        hotel: '',
        essence: '',
        peage: '',
        parking: '',
        autresDescription: '',
        autresMontant: ''
    }));
    
    const [entries, setEntries] = useState(initialEntries);

    useEffect(() => {
        fetchExpenses();
        fetchUserProfile();
    }, [dashboardId]);

    const fetchUserProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/auth/me', {
                headers: { 'x-auth-token': token }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.carLicensePlate && !licensePlate) {
                    setLicensePlate(data.carLicensePlate);
                }
                if (data.carModel && !carModel) {
                    setCarModel(data.carModel);
                }
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/expenses?dashboardId=${dashboardId}`, {
                headers: { 'x-auth-token': token }
            });
            if (res.ok) {
                const data = await res.json();
                setExpenses(data);
            }
        } catch (error) {
            console.error('Error fetching expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setYear(new Date().getFullYear());
        setMonth(new Date().getMonth() + 1);
        setCarModel('');
        setLicensePlate('');
        setKilometrage('');
        setEntries(Array.from({ length: 5 }, (_, i) => ({
            week: i + 1,
            secteursVisites: '',
            hotel: '',
            essence: '',
            peage: '',
            parking: '',
            autresDescription: '',
            autresMontant: ''
        })));
        setEditingExpense(null);
    };

    const handleEditClick = (exp) => {
        setEditingExpense(exp._id);
        setYear(exp.year);
        setMonth(exp.month);
        setCarModel(exp.carModel || '');
        setLicensePlate(exp.licensePlate || '');
        setKilometrage(exp.kilometrage);
        
        const loadedEntries = [...initialEntries];
        if (exp.entries) {
            exp.entries.forEach(e => {
                const idx = e.week - 1;
                if (idx >= 0 && idx < 5) {
                    loadedEntries[idx] = {
                        week: e.week,
                        secteursVisites: e.secteursVisites || '',
                        hotel: e.hotel || '',
                        essence: e.essence || '',
                        peage: e.peage || '',
                        parking: e.parking || '',
                        autresDescription: e.autresDescription || '',
                        autresMontant: e.autresMontant || ''
                    };
                }
            });
        }
        setEntries(loadedEntries);
        // scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Voulez-vous vraiment supprimer cette note de frais ?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/expenses/${id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token }
            });
            if (res.ok) {
                fetchExpenses();
            } else {
                alert('Erreur lors de la suppression.');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleEntryChange = (index, field, value) => {
        const newEntries = [...entries];
        newEntries[index][field] = value;
        setEntries(newEntries);
    };

    const calculateTotal = () => {
        let total = 0;
        entries.forEach(e => {
            total += (Number(e.hotel) || 0) +
                     (Number(e.essence) || 0) +
                     (Number(e.peage) || 0) +
                     (Number(e.parking) || 0) +
                     (Number(e.autresMontant) || 0);
        });
        return total;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!kilometrage) {
            alert('L\'entrée du kilométrage est obligatoire !');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const url = editingExpense ? `/api/expenses/${editingExpense}` : '/api/expenses';
            const method = editingExpense ? 'PUT' : 'POST';

            const payload = {
                dashboardId,
                year: Number(year),
                month: Number(month),
                carModel,
                licensePlate,
                kilometrage: Number(kilometrage),
                entries: entries.map(e => ({
                    week: e.week,
                    secteursVisites: e.secteursVisites,
                    hotel: Number(e.hotel) || 0,
                    essence: Number(e.essence) || 0,
                    peage: Number(e.peage) || 0,
                    parking: Number(e.parking) || 0,
                    autresDescription: e.autresDescription,
                    autresMontant: Number(e.autresMontant) || 0
                }))
            };

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                resetForm();
                fetchExpenses();
            } else {
                const data = await res.json();
                alert(`Erreur: ${data.msg || 'Impossible d\'enregistrer'}`);
            }
        } catch (error) {
            console.error('Submit error:', error);
            alert('Erreur de connexion');
        }
    };

    const totalCalculated = calculateTotal();

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
        doc.text(`Annee: ${exp.year}    Mois: ${MONTHS[(exp.month || 1) - 1]}`, 14, 38);
        doc.text(`Voiture: ${exp.carModel || '-'}    Immatriculation: ${exp.licensePlate || '-'}`, 14, 46);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38);
        doc.text(`Kilometrage: ${exp.kilometrage}`, 14, 54);
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

        doc.save(`Note_de_Frais_${exp.year}_Mois${exp.month}.pdf`);
    };

    return (
        <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in relative z-10 pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="text-4xl">📄</span> Note de Frais
                    </h2>
                    <p className="text-gray-500 font-medium mt-1">Gérez vos notes de frais mensuelles</p>
                </div>
                {editingExpense && (
                    <button 
                        onClick={resetForm}
                        className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                    >
                        Annuler la modification
                    </button>
                )}
            </div>

            {/* Form */}
            <div className="bg-white rounded-2xl shadow-sm p-6" style={{ border: '1px solid var(--border-subtle)' }}>
                <h3 className="text-xl font-bold mb-6 text-gray-800">
                    {editingExpense ? "Modifier la note de frais" : "Nouvelle note de frais"}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Top Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Année</label>
                            <input 
                                type="number" required 
                                value={year} onChange={e => setYear(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Mois</label>
                            <select
                                required
                                value={month}
                                onChange={e => setMonth(Number(e.target.value))}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                            >
                                {MONTHS.map((name, idx) => (
                                    <option key={idx + 1} value={idx + 1}>{name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Voiture</label>
                            <input 
                                type="text" placeholder="Ex: SKODA FABIA"
                                value={carModel} onChange={e => setCarModel(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">N° Immatriculation</label>
                            <input 
                                type="text"
                                value={licensePlate} onChange={e => setLicensePlate(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-red-600 mb-1 border-b border-red-200">Kilométrage Compteur *</label>
                            <input 
                                type="number" required placeholder="Obligatoire"
                                value={kilometrage} onChange={e => setKilometrage(e.target.value)}
                                className="w-full px-4 py-2 bg-red-50 border border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all font-bold text-red-700"
                            />
                        </div>
                    </div>

                    {/* Table of Entries */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead>
                                <tr className="border-b-2 border-gray-200 text-sm font-black text-gray-700 text-center">
                                    <th className="pb-3 px-2">Semaine</th>
                                    <th className="pb-3 px-2">Secteurs Visitées</th>
                                    <th className="pb-3 px-2" colSpan="4">DÉPENSES (DT)</th>
                                    <th className="pb-3 px-2" colSpan="2">DIVERS (DT)</th>
                                </tr>
                                <tr className="border-b border-gray-100 text-xs font-bold text-slate-500 text-center bg-gray-50">
                                    <th className="py-2 px-2"></th>
                                    <th className="py-2 px-2"></th>
                                    <th className="py-2 px-2 text-blue-600">Hôtel (Frais)</th>
                                    <th className="py-2 px-2 text-indigo-600">Essence (Trans.)</th>
                                    <th className="py-2 px-2 text-indigo-600">Péage (Trans.)</th>
                                    <th className="py-2 px-2 text-indigo-600">Parking (Trans.)</th>
                                    <th className="py-2 px-2 text-orange-600">Autres (Desc)</th>
                                    <th className="py-2 px-2 text-orange-600">Autres (Montant)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry, idx) => (
                                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                                        <td className="py-2 px-2 text-center font-bold text-gray-500">{entry.week}</td>
                                        <td className="py-2 px-2">
                                            <input type="text" value={entry.secteursVisites} onChange={e => handleEntryChange(idx, 'secteursVisites', e.target.value)}
                                                className="w-full px-2 py-1 bg-white border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 outline-none min-w-[150px]" />
                                        </td>
                                        <td className="py-2 px-2">
                                            <input type="number" step="0.01" value={entry.hotel} onChange={e => handleEntryChange(idx, 'hotel', e.target.value)}
                                                className="w-full px-2 py-1 bg-white border border-blue-200 rounded focus:ring-1 focus:ring-blue-500 outline-none w-20 text-right font-medium text-blue-700" />
                                        </td>
                                        <td className="py-2 px-2">
                                            <input type="number" step="0.01" value={entry.essence} onChange={e => handleEntryChange(idx, 'essence', e.target.value)}
                                                className="w-full px-2 py-1 bg-white border border-indigo-200 rounded focus:ring-1 focus:ring-indigo-500 outline-none w-20 text-right font-medium text-indigo-700" />
                                        </td>
                                        <td className="py-2 px-2">
                                            <input type="number" step="0.01" value={entry.peage} onChange={e => handleEntryChange(idx, 'peage', e.target.value)}
                                                className="w-full px-2 py-1 bg-white border border-indigo-200 rounded focus:ring-1 focus:ring-indigo-500 outline-none w-20 text-right font-medium text-indigo-700" />
                                        </td>
                                        <td className="py-2 px-2">
                                            <input type="number" step="0.01" value={entry.parking} onChange={e => handleEntryChange(idx, 'parking', e.target.value)}
                                                className="w-full px-2 py-1 bg-white border border-indigo-200 rounded focus:ring-1 focus:ring-indigo-500 outline-none w-20 text-right font-medium text-indigo-700" />
                                        </td>
                                        <td className="py-2 px-2">
                                            <input type="text" placeholder="Ex: Taxi" value={entry.autresDescription} onChange={e => handleEntryChange(idx, 'autresDescription', e.target.value)}
                                                className="w-full px-2 py-1 bg-white border border-orange-200 rounded focus:ring-1 focus:ring-orange-500 outline-none min-w-[100px] text-orange-700" />
                                        </td>
                                        <td className="py-2 px-2">
                                            <input type="number" step="0.01" value={entry.autresMontant} onChange={e => handleEntryChange(idx, 'autresMontant', e.target.value)}
                                                className="w-full px-2 py-1 bg-white border border-orange-200 rounded focus:ring-1 focus:ring-orange-500 outline-none w-20 text-right font-medium text-orange-700" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-100">
                        <div className="text-right">
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-widest block mb-1">TOTAL MOIS A REMBOURSER</span>
                            <span className="text-3xl font-black text-gray-900">{totalCalculated.toFixed(3)} DT</span>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="w-full py-4 text-white font-black rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-lg shadow-md hover:shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                    >
                        {editingExpense ? 'Mettre à jour la note de frais' : 'Soumettre la note de frais'}
                    </button>
                </form>
            </div>

            {/* List */}
            <div>
                <h3 className="text-xl font-bold mb-4 text-gray-800">Historique des notes de frais</h3>
                
                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center" style={{ border: '1px solid var(--border-subtle)' }}>
                        <div className="text-4xl mb-3">😶</div>
                        <p className="text-gray-500 font-medium text-lg">Aucune note de frais soumise</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        <th className="py-3 px-4">Période</th>
                                        <th className="py-3 px-4">Voiture / Immat.</th>
                                        <th className="py-3 px-4">Kms</th>
                                        <th className="py-3 px-4">Total (DT)</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenses.map((exp) => (
                                        <tr key={exp._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                            <td className="py-3 px-4 font-bold text-gray-800">
                                                {MONTHS[(exp.month || 1) - 1]} {exp.year}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {exp.carModel || '-'} <span className="text-gray-400">|</span> {exp.licensePlate || '-'}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-red-600">
                                                {exp.kilometrage}
                                            </td>
                                            <td className="py-3 px-4 font-black text-emerald-600 font-mono">
                                                {exp.totalAmount.toFixed(3)}
                                            </td>
                                            <td className="py-3 px-4 text-right space-x-2">
                                                <button 
                                                    onClick={() => generatePDF(exp)}
                                                    className="inline-flex items-center justify-center px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-bold text-sm transition-colors"
                                                    title="Générer PDF"
                                                >
                                                    📄 PDF
                                                </button>
                                                <button 
                                                    onClick={() => handleEditClick(exp)}
                                                    className="inline-flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                    title="Modifier"
                                                >
                                                    ✏️
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(exp._id)}
                                                    className="inline-flex items-center justify-center w-8 h-8 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                    title="Supprimer"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
