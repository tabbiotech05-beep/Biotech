import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function DoctorMedicationModal({ doctor, viewUser, onClose, readOnly = false }) {
    const { name: doctorName, specialty, governorate, address, prescriberType } = doctor;
    const [prescribed, setPrescribed] = useState([]);
    const [notPrescribed, setNotPrescribed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchPrescribed, setSearchPrescribed] = useState('');
    const [searchNotPrescribed, setSearchNotPrescribed] = useState('');
    const [newPrescribedName, setNewPrescribedName] = useState('');
    const [newNotPrescribedName, setNewNotPrescribedName] = useState('');
    const [addingPrescribed, setAddingPrescribed] = useState(false);
    const [addingNotPrescribed, setAddingNotPrescribed] = useState(false);

    const token = localStorage.getItem('token');
    const headers = { 'x-auth-token': token };

    const fetchMeds = async () => {
        try {
            setLoading(true);
            const params = { name: doctorName, specialty, governorate, address, prescriberType, viewUser };
            const res = await axios.get('/api/doctors/by-name/medications', { headers, params });
            setPrescribed(res.data.prescribed || []);
            setNotPrescribed(res.data.notPrescribed || []);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.msg || 'Erreur de chargement');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMeds(); }, [doctorName]);

    const handleAdd = async (medicationId) => {
        if (readOnly) return;
        try {
            const payload = { name: doctorName, medicationId, specialty, governorate, address, prescriberType, viewUser };
            const res = await axios.post('/api/doctors/by-name/medications', payload, { headers });
            setPrescribed(res.data.prescribed);
            setNotPrescribed(res.data.notPrescribed);
        } catch (err) {
            alert(err.response?.data?.msg || 'Erreur');
        }
    };

    const handleRemove = async (medId) => {
        if (readOnly) return;
        try {
            const res = await axios.delete(`/api/doctors/by-name/medications/${medId}`, {
                headers,
                params: { name: doctorName, viewUser }
            });
            setPrescribed(res.data.prescribed);
            setNotPrescribed(res.data.notPrescribed);
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
            setNotPrescribed(res.data.notPrescribed);
            setNewPrescribedName('');
        } catch (err) {
            alert(err.response?.data?.msg || 'Erreur lors de l\'ajout');
        } finally {
            setAddingPrescribed(false);
        }
    };

    const handleCreateNotPrescribed = async () => {
        if (readOnly) return;
        if (!newNotPrescribedName.trim()) return;
        setAddingNotPrescribed(true);
        try {
            await axios.post('/api/doctors/medications/catalog', { name: newNotPrescribedName.trim() }, { headers });
            await fetchMeds();
            setNewNotPrescribedName('');
        } catch (err) {
            alert(err.response?.data?.msg || 'Erreur lors de la création');
        } finally {
            setAddingNotPrescribed(false);
        }
    };

    const filteredPrescribed = prescribed.filter(m =>
        m.name.toLowerCase().includes(searchPrescribed.toLowerCase())
    );
    const filteredNotPrescribed = notPrescribed.filter(m =>
        m.name.toLowerCase().includes(searchNotPrescribed.toLowerCase())
    );

    return (
        <div className="med-modal-overlay" onClick={onClose}>
            <div className="med-modal-container" onClick={e => e.stopPropagation()}>
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
                        {/* Two columns */}
                        <div className="med-columns">
                            {/* Prescribed column */}
                            <div className="med-column med-column-prescribed">
                                <div className="med-column-header prescribed">
                                    <span className="med-column-icon">✅</span>
                                    <span>Prescrits ({prescribed.length})</span>
                                </div>
                                
                                {/* Add to Prescribed Input - HIDDEN in readOnly */}
                                {!readOnly && (
                                    <div className="med-column-input-row">
                                        <input
                                            type="text"
                                            placeholder="Saisir pour prescrire ou créer..."
                                            value={newPrescribedName}
                                            onChange={e => setNewPrescribedName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleCreateOrAssignPrescribed()}
                                            className="med-col-add-input"
                                        />
                                        <button
                                            onClick={handleCreateOrAssignPrescribed}
                                            disabled={addingPrescribed || !newPrescribedName.trim()}
                                            className="med-col-add-btn prescribed"
                                            title="Créer ou Assigner"
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
                                <div className="med-list">
                                    {filteredPrescribed.length === 0 ? (
                                        <p className="med-empty">Aucun médicament prescrit</p>
                                    ) : (
                                        filteredPrescribed.map(med => (
                                            <div key={med._id} className="med-item prescribed">
                                                <span className="med-item-name">{med.name}</span>
                                                {!readOnly && (
                                                    <button
                                                        className="med-item-btn remove"
                                                        onClick={() => handleRemove(med._id)}
                                                        title="Retirer"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Not prescribed column */}
                            <div className="med-column med-column-not-prescribed">
                                <div className="med-column-header not-prescribed">
                                    <span className="med-column-icon">📋</span>
                                    <span>Non Prescrits ({notPrescribed.length})</span>
                                </div>

                                {/* Add to Catalog Input - HIDDEN in readOnly */}
                                {!readOnly && (
                                    <div className="med-column-input-row">
                                        <input
                                            type="text"
                                            placeholder="Saisir pour ajouter au catalogue..."
                                            value={newNotPrescribedName}
                                            onChange={e => setNewNotPrescribedName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleCreateNotPrescribed()}
                                            className="med-col-add-input"
                                        />
                                        <button
                                            onClick={handleCreateNotPrescribed}
                                            disabled={addingNotPrescribed || !newNotPrescribedName.trim()}
                                            className="med-col-add-btn not-prescribed"
                                            title="Créer dans catalogue"
                                        >
                                            {addingNotPrescribed ? '...' : '+'}
                                        </button>
                                    </div>
                                )}

                                <input
                                    type="text"
                                    placeholder="Rechercher dans la liste..."
                                    value={searchNotPrescribed}
                                    onChange={e => setSearchNotPrescribed(e.target.value)}
                                    className="med-search-input"
                                />
                                <div className="med-list">
                                    {filteredNotPrescribed.length === 0 ? (
                                        <p className="med-empty">Tous les médicaments sont prescrits</p>
                                    ) : (
                                        filteredNotPrescribed.map(med => (
                                            <div key={med._id} className="med-item not-prescribed">
                                                <span className="med-item-name">{med.name}</span>
                                                {!readOnly && (
                                                    <button
                                                        className="med-item-btn add"
                                                        onClick={() => handleAdd(med._id)}
                                                        title="Ajouter"
                                                    >
                                                        +
                                                    </button>
                                                )}
                                            </div>
                                        ))
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
