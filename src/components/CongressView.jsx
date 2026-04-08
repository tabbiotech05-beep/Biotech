import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function CongressView({ dashboardId }) {
    const [congresses, setCongresses] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteGlobalModal, setShowDeleteGlobalModal] = useState(false);
    const [deleteGlobalId, setDeleteGlobalId] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        startDate: '',
        endDate: '',
        location: '',
        participant: '',
        amount: '',
        status: 'planifié',
        comment: '',
        dashboardId: dashboardId,
        image: null
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchCongresses();
    }, [dashboardId]);

    const fetchCongresses = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`/api/congress?dashboardId=${dashboardId}`, {
                headers: { 'x-auth-token': token }
            });
            const data = await res.json();
            setCongresses(data);
        } catch (err) {
            console.error('Error fetching congresses:', err);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, image: e.target.files[0] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        const data = new FormData();
        data.append('dashboardId', formData.dashboardId || dashboardId);
        data.append('name', formData.name);
        data.append('startDate', formData.startDate);
        data.append('endDate', formData.endDate);
        data.append('location', formData.location);
        data.append('participant', formData.participant);
        data.append('amount', formData.amount);
        data.append('status', formData.status);
        data.append('comment', formData.comment || '');
        if (formData.image) {
            data.append('image', formData.image);
        }

        try {
            setIsSaving(true);
            const url = editingId
                ? `/api/congress/${editingId}`
                : '/api/congress';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: {
                    'x-auth-token': token
                },
                body: data
            });

            if (res.ok) {
                const savedCongress = await res.json();

                if (editingId) {
                    setCongresses(congresses.map(c => c._id === editingId ? savedCongress : c));
                } else {
                    setCongresses([...congresses, savedCongress]);
                }

                closeModal();
            } else {
                const errData = await res.json();
                alert(`Erreur: ${errData.msg || 'Une erreur est survenue lors de l\'enregistrement'}`);
            }
        } catch (err) {
            console.error('Error saving congress:', err);
            alert('Erreur réseau. Veuillez vérifier votre connexion.');
        } finally {
            setIsSaving(false);
        }
    };

    const deleteCongress = async (id) => {
        if (!window.confirm('Voulez-vous vraiment supprimer cette action marketing ?')) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/congress/${id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token }
            });
            if (res.ok) {
                setCongresses(congresses.filter(c => c._id !== id));
            }
        } catch (err) {
            console.error('Error deleting congress:', err);
        }
    };

    const openEditModal = (congress) => {
        setEditingId(congress._id);
        setFormData({
            name: congress.name,
            startDate: format(new Date(congress.startDate), 'yyyy-MM-dd'),
            endDate: format(new Date(congress.endDate), 'yyyy-MM-dd'),
            location: congress.location,
            participant: congress.participant,
            amount: congress.amount,
            status: congress.status,
            comment: congress.comment || '',
            dashboardId: congress.dashboardId || dashboardId,
            image: null // Start null, file input is for NEW image only
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData({
            name: '',
            startDate: '',
            endDate: '',
            location: '',
            participant: '',
            amount: '',
            status: 'planifié',
            comment: '',
            dashboardId: dashboardId,
            image: null
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'planifié': return 'bg-blue-100 text-blue-800';
            case 'en cours': return 'bg-yellow-100 text-yellow-800';
            case 'terminé': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const handleApprove = async (id, isApproved, comment) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/congress/${id}/approve`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({ isApproved, comment })
            });
            if (res.ok) {
                const updated = await res.json();
                setCongresses(congresses.map(c => c._id === id ? updated : c));
            }
        } catch (err) {
            console.error('Error approving congress:', err);
        }
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        const total = congresses.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

        // Header
        doc.setFontSize(20);
        doc.setTextColor(40);
        doc.text("BiotechpharmaMD", 14, 22);
        doc.setFontSize(14);
        doc.text("Rapport des Actions Marketing", 14, 32);
        doc.setFontSize(10);
        doc.text(`Généré le: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 40);

        // Table
        const tableColumn = ["Nom de l'Action", "Médecin(s) (Participant)", "Budget (TND)"];
        const tableRows = congresses.map(c => [
            c.name,
            c.participant,
            `${(Number(c.amount) || 0).toLocaleString()} TND`
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 50,
            theme: 'striped',
            headStyles: { fillStyle: 'fill', fillColor: [59, 130, 246], textColor: [255, 255, 255] },
            styles: { fontSize: 9 }
        });

        // Total Section
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(14, finalY, 182, 12, 2, 2, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL DES ACTIONS : ${total.toLocaleString()} TND`, 18, finalY + 8);

        doc.save(`Rapport_Action_Marketing_${format(new Date(), 'yyyyMMdd')}.pdf`);
    };

    const isAdmin = localStorage.getItem('role') === 'admin';

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 min-h-[600px]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Gestion des Actions Marketing</h3>
                <div className="flex gap-3">
                    {isAdmin && (
                        <button
                            onClick={() => setShowDeleteGlobalModal(true)}
                            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 transition-colors shadow-sm flex items-center gap-2 font-bold"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Supprimer une Action
                        </button>
                    )}
                    {isAdmin && congresses.length > 0 && (
                        <button
                            onClick={generatePDF}
                            className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors shadow-sm flex items-center gap-2 font-bold"
                        >
                            📄 Générer Rapport PDF
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setFormData({
                                name: '',
                                startDate: '',
                                endDate: '',
                                location: '',
                                participant: '',
                                amount: '',
                                status: 'planifié',
                                comment: '',
                                dashboardId: dashboardId,
                                image: null
                            });
                            setShowModal(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <span className="text-xl font-bold">+</span> Planifier une Action Marketing
                    </button>
                </div>
            </div>

            {congresses.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                    Aucune action marketing planifiée.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {congresses.map((congress) => (
                        <div key={congress._id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="h-48 bg-gray-100 relative">
                                {congress.image ? (
                                    <img
                                        src={`/${congress.image}`}
                                        alt={congress.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        Pas d'image
                                    </div>
                                )}
                                <div className="absolute top-2 left-2 flex flex-col gap-1">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusColor(congress.status)}`}>
                                        {congress.status}
                                    </span>
                                    {congress.isAdminCreated && (
                                        <span className="px-2 py-0.5 bg-purple-600 text-white rounded text-[10px] font-black uppercase tracking-wider shadow-sm">
                                            Admin
                                        </span>
                                    )}
                                    {isAdmin && (
                                        <span className={`px-2 py-0.5 text-white rounded text-[10px] font-black uppercase tracking-wider shadow-sm ${congress.dashboardId === 'dashboard1' ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
                                            {congress.dashboardId === 'dashboard1' ? 'Biotech' : 'Tenshi'}
                                        </span>
                                    )}
                                    {congress.isApproved && (
                                    <div className="px-2 py-0.5 bg-green-600 text-white rounded text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                                        <span>✅</span>
                                        <span>Approuvé par {congress.approvedBy || 'Admin'}</span>
                                    </div>
                                )}
                            </div>
                            {!congress.isApproved && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                                    <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg animate-pulse border-2 border-white/20">
                                        En attente d'approbation
                                    </span>
                                </div>
                            )}
                        </div>
                            <div className="p-4 flex flex-col h-full bg-white relative">
                                {!congress.isApproved && isAdmin && (
                                    <div className="absolute -top-6 right-2 z-20">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleApprove(congress._id, true, congress.comment); }}
                                            className="px-4 py-2 bg-emerald-600 text-white rounded-full text-xs font-black uppercase tracking-widest shadow-xl hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                        >
                                            <span>✔️</span> Approuver
                                        </button>
                                    </div>
                                )}
                                <div className="mb-4">
                                    <h4 className="font-black text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{congress.name}</h4>
                                    {congress.comment && (
                                        <div className="mt-2 p-2 bg-slate-50 border-l-4 border-blue-400 rounded-r text-[10px] italic text-slate-600 flex items-start gap-2">
                                            <span className="text-blue-400 font-bold text-lg leading-none">“</span>
                                            {congress.comment}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <p className="flex items-center gap-2">
                                        📅 {format(new Date(congress.startDate), 'dd MMM yyyy', { locale: fr })} - {format(new Date(congress.endDate), 'dd MMM yyyy', { locale: fr })}
                                    </p>
                                    <p>📍 {congress.location}</p>
                                    <p>👤 {congress.participant}</p>
                                    <p>💰 {congress.amount} TND</p>
                                </div>
                                <div className="mt-auto pt-4 flex items-center justify-end border-t border-gray-50 gap-2">
                                    {(isAdmin || (!congress.isAdminCreated && !congress.isApproved)) && (
                                        <button
                                            onClick={() => openEditModal(congress)}
                                            className="px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors"
                                        >
                                            Modifier
                                        </button>
                                    )}
                                    {(!isAdmin && !congress.isApproved) && (
                                        <button
                                            onClick={() => deleteCongress(congress._id)}
                                            className="px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors"
                                        >
                                            Supprimer
                                        </button>
                                    )}
                                    {isAdmin && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteCongress(congress._id); }}
                                            className="px-3 py-1.5 text-white bg-red-600 hover:bg-red-700 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors shadow-sm flex items-center gap-1"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            Supprimer
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 w-full h-full min-h-screen top-0 fixed">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-[500px] max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-6 text-gray-800">{editingId ? "Modifier l'Action Marketing" : "Nouvelle Action Marketing"}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'Action Marketing</label>
                                <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                                    <input required type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                                    <input required type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Lieu</label>
                                <input required type="text" name="location" value={formData.location} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Participant</label>
                                <input required type="text" name="participant" value={formData.participant} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2" />
                            </div>
                            {isAdmin && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Équipe assignée (Admin uniquement)</label>
                                    <select name="dashboardId" value={formData.dashboardId} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2 bg-blue-50 font-bold">
                                        <option value="dashboard1">Biotech</option>
                                        <option value="dashboard2">Tenshi</option>
                                    </select>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Montant</label>
                                    <input required type="number" name="amount" value={formData.amount} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                                    <select name="status" value={formData.status} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2">
                                        <option value="planifié">Planifié</option>
                                        <option value="en cours">En cours</option>
                                        <option value="terminé">Terminé</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire {isAdmin ? "(Visible par le délégué)" : ""}</label>
                                <textarea 
                                    name="comment" 
                                    value={formData.comment} 
                                    onChange={handleInputChange} 
                                    placeholder="Ajouter des notes ou instructions..."
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Image de l'action marketing</label>
                                <input type="file" accept="image/*" onChange={handleFileChange} className="w-full border border-gray-300 rounded px-3 py-2" />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 items-center">
                                {isAdmin && editingId && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            await deleteCongress(editingId);
                                            closeModal();
                                        }}
                                        className="px-5 py-2.5 text-white bg-red-600 hover:bg-red-700 rounded-md font-medium transition-colors mr-auto flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        Supprimer
                                    </button>
                                )}
                                <button type="button" onClick={closeModal} className="px-5 py-2.5 text-gray-600 hover:bg-gray-50 rounded-md font-medium">Annuler</button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className={`px-5 py-2.5 rounded-md font-medium text-white transition-colors ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                >
                                    {isSaving ? 'Enregistrement...' : (editingId ? 'Mettre à jour' : 'Créer')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showDeleteGlobalModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 w-full h-full min-h-screen top-0 fixed">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-[500px]">
                        <h3 className="text-xl font-bold mb-4 text-gray-800">Supprimer une Action Marketing</h3>
                        <p className="text-sm text-gray-600 mb-4">Sélectionnez l'action marketing que vous souhaitez supprimer. Cette action est irréversible.</p>
                        <select 
                            className="w-full border border-gray-300 rounded px-3 py-2 mb-6"
                            value={deleteGlobalId}
                            onChange={(e) => setDeleteGlobalId(e.target.value)}
                        >
                            <option value="">-- Sélectionnez une action --</option>
                            {congresses.map(c => (
                                <option key={c._id} value={c._id}>
                                    {c.name} - {c.participant} ({format(new Date(c.startDate), 'dd MMM yyyy', { locale: fr })})
                                </option>
                            ))}
                        </select>
                        <div className="flex justify-end gap-3">
                            <button 
                                type="button" 
                                onClick={() => { setShowDeleteGlobalModal(false); setDeleteGlobalId(''); }} 
                                className="px-5 py-2.5 text-gray-600 hover:bg-gray-50 rounded-md font-medium"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                disabled={!deleteGlobalId}
                                onClick={async () => {
                                    if (deleteGlobalId) {
                                        await deleteCongress(deleteGlobalId);
                                        setShowDeleteGlobalModal(false);
                                        setDeleteGlobalId('');
                                    }
                                }}
                                className={`px-5 py-2.5 rounded-md font-medium text-white transition-colors flex items-center gap-2 ${!deleteGlobalId ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Supprimer définitivement
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
