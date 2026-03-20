import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function CongressView({ dashboardId }) {
    const [congresses, setCongresses] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        startDate: '',
        endDate: '',
        location: '',
        participant: '',
        amount: '',
        status: 'planifié',
        image: null
    });

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
        // dashboardId is not needed for update but needed for create
        if (!editingId) data.append('dashboardId', dashboardId);

        data.append('name', formData.name);
        data.append('startDate', formData.startDate);
        data.append('endDate', formData.endDate);
        data.append('location', formData.location);
        data.append('participant', formData.participant);
        data.append('amount', formData.amount);
        data.append('status', formData.status);
        if (formData.image) {
            data.append('image', formData.image);
        }

        try {
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
            }
        } catch (err) {
            console.error('Error saving congress:', err);
        }
    };

    const deleteCongress = async (id) => {
        if (!window.confirm('Voulez-vous vraiment supprimer ce congrès ?')) return;
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

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 min-h-[600px]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Gestion des Congrés</h3>
                <button
                    onClick={() => { setEditingId(null); setShowModal(true); }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                >
                    <span className="text-xl font-bold">+</span> Planifier un Congrés
                </button>
            </div>

            {congresses.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                    Aucun congrès planifié.
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
                                <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold ${getStatusColor(congress.status)}`}>
                                    {congress.status}
                                </span>
                            </div>
                            <div className="p-4">
                                <h4 className="font-bold text-lg mb-2 text-gray-800">{congress.name}</h4>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <p className="flex items-center gap-2">
                                        📅 {format(new Date(congress.startDate), 'dd MMM yyyy', { locale: fr })} - {format(new Date(congress.endDate), 'dd MMM yyyy', { locale: fr })}
                                    </p>
                                    <p>📍 {congress.location}</p>
                                    <p>👤 {congress.participant}</p>
                                    <p>💰 {congress.amount} TND</p>
                                </div>
                                <div className="mt-4 flex justify-end gap-2 text-sm">
                                    <button
                                        onClick={() => openEditModal(congress)}
                                        className="text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50"
                                    >
                                        Modifier
                                    </button>
                                    <button
                                        onClick={() => deleteCongress(congress._id)}
                                        className="text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50"
                                    >
                                        Supprimer
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 w-full h-full min-h-screen top-0 fixed">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-[500px] max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-6 text-gray-800">{editingId ? 'Modifier le Congrés' : 'Nouveau Congrés'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du Congrés</label>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Image du congrés</label>
                                <input type="file" accept="image/*" onChange={handleFileChange} className="w-full border border-gray-300 rounded px-3 py-2" />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={closeModal} className="px-5 py-2.5 text-gray-600 hover:bg-gray-50 rounded-md font-medium">Annuler</button>
                                <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">
                                    {editingId ? 'Mettre à jour' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
