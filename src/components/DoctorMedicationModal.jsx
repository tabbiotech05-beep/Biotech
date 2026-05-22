import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function DoctorMedicationModal({ doctor, viewUser, onClose, readOnly = false }) {
    const { name: doctorName, specialty, governorate, address, prescriberType } = doctor;
    const [prescribed, setPrescribed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchPrescribed, setSearchPrescribed] = useState('');
    const [newPrescribedName, setNewPrescribedName] = useState('');
    const [addingPrescribed, setAddingPrescribed] = useState(false);

    const token = localStorage.getItem('token');
    const headers = { 'x-auth-token': token };

    const fetchMeds = async () => {
        try {
            setLoading(true);
            const params = { name: doctorName, specialty, governorate, address, prescriberType, viewUser };
            const res = await axios.get('/api/doctors/by-name/medications', { headers, params });
            setPrescribed(res.data.prescribed || []);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.msg || 'Erreur de chargement');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMeds(); }, [doctorName]);

    const handleRemove = async (medId) => {
        if (readOnly) return;
        try {
            const res = await axios.delete(`/api/doctors/by-name/medications/${medId}`, {
                headers,
                params: { name: doctorName, viewUser }
            });
            setPrescribed(res.data.prescribed);
        } catch (err) {
            alert(err.response?.data?.msg || 'Erreur');
        }
    };

    const handleCreateOrAssignPrescribed = async () => {
        if (readOnly) return;
        if (!newPrescribedName.trim()) return;
        setAddingPrescribed(true);
        try {
            const payload = {
                name: doctorName,
                medicationName: newPrescribedName.trim(),
                specialty,
                governorate,
                address,
                prescriberType,
                viewUser
            };
            const res = await axios.post('/api/doctors/by-name/medications', payload, { headers });
            setPrescribed(res.data.prescribed);
            setNewPrescribedName('');
        } catch (err) {
            alert(err.response?.data?.msg || 'Erreur lors de l\'ajout');
        } finally {
            setAddingPrescribed(false);
        }
    };

    const filteredPrescribed = prescribed.filter(m => {
        const medName = typeof m === 'string' ? m : (m?.name || '');
        return medName.toLowerCase().includes(searchPrescribed.toLowerCase());
    });

    return (
        <div className="med-modal-overlay" onClick={onClose}>
            <div className="med-modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                {/* Header */}
                <div className="med-modal-header">
                    <div>
                        <h3 className="med-modal-title">
                            {readOnly ? 'Médicaments du Délégué' : 'Gestion des Médicaments'}
                        </h3>
                        <p className="med-modal-subtitle">Dr. {doctorName}</p>
                        {readOnly && viewUser && (
                            <p style={{ fontSize: '11px', color: '#fbbf24', marginTop: '4px', fontWeight: 700 }}>
                                👁️ Consultation — {viewUser}
                            </p>
                        )}
                    </div>
                    <button className="med-modal-close" onClick={onClose}>✕</button>
                </div>

                {loading ? (
                    <div className="med-modal-loading">
                        <div className="med-spinner"></div>
                        <p>Chargement des médicaments...</p>
                    </div>
                ) : error ? (
                    <div className="med-modal-error">
                        <p>⚠️ {error}</p>
                    </div>
                ) : (
                    <>
                        <div className="med-columns" style={{ gridTemplateColumns: '1fr' }}>
                            {/* Prescribed column */}
                            <div className="med-column med-column-prescribed">
                                <div className="med-column-header prescribed">
                                    <span className="med-column-icon">💊</span>
                                    <span>Liste des Médicaments ({prescribed.length})</span>
                                </div>
                                
                                {/* Add Input - HIDDEN in readOnly */}
                                {!readOnly && (
                                    <div className="med-column-input-row">
                                        <input
                                            type="text"
                                            placeholder="Saisir pour ajouter..."
                                            value={newPrescribedName}
                                            onChange={e => setNewPrescribedName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleCreateOrAssignPrescribed()}
                                            className="med-col-add-input"
                                        />
                                        <button
                                            onClick={handleCreateOrAssignPrescribed}
                                            disabled={addingPrescribed || !newPrescribedName.trim()}
                                            className="med-col-add-btn prescribed"
                                            title="Ajouter à la liste"
                                        >
                                            {addingPrescribed ? '...' : '+'}
                                        </button>
                                    </div>
                                )}

                                <input
                                    type="text"
                                    placeholder="Rechercher dans la liste..."
                                    value={searchPrescribed}
                                    onChange={e => setSearchPrescribed(e.target.value)}
                                    className="med-search-input"
                                />
                                <div className="med-list" style={{ maxHeight: '350px' }}>
                                    {filteredPrescribed.length === 0 ? (
                                        <p className="med-empty">Aucun médicament dans la liste</p>
                                    ) : (
                                        filteredPrescribed.map((med, idx) => {
                                            const medName = typeof med === 'string' ? med : (med?.name || 'Inconnu');
                                            const medId = typeof med === 'string' ? idx : (med?._id || idx);
                                            return (
                                                <div key={medId} className="med-item prescribed">
                                                    <span className="med-item-name">{medName}</span>
                                                    {!readOnly && (
                                                        <button
                                                            className="med-item-btn remove"
                                                            onClick={() => handleRemove(typeof med === 'string' ? med : med._id)}
                                                            title="Retirer"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
