import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';

const delegates = [
    { id: 'Sofiene', color: '#6366f1', lightColor: '#ede9fe' },
    { id: 'Seif', color: '#0ea5e9', lightColor: '#e0f2fe' },
    { id: 'Ines', color: '#ec4899', lightColor: '#fce7f3' },
    { id: 'Syrine', color: '#f59e0b', lightColor: '#fef3c7' },
    { id: 'Cherifa', color: '#10b981', lightColor: '#d1fae5' },
];

const EMPTY_FORM = { nom: '', prenom: '', specialite: '', ville: '', gouvernorat: '', telephone: '', mobile: '', email: '', adresse: '' };

export default function ContactView() {
    const [activeDelegate, setActiveDelegate] = useState('Sofiene');
    const [searchTerm, setSearchTerm] = useState('');
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [saving, setSaving] = useState(false);

    const token = localStorage.getItem('token');

    const fetchContacts = async (delegate) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/contacts/${delegate}`, { headers: { 'x-auth-token': token } });
            setContacts(res.data);
        } catch (err) {
            console.error('Failed to fetch contacts', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts(activeDelegate);
    }, [activeDelegate]);

    const handleTabChange = (delegateId) => {
        setActiveDelegate(delegateId);
        setSearchTerm('');
    };

    const handleAddContact = async () => {
        if (!form.nom.trim()) return;
        setSaving(true);
        try {
            await axios.post('/api/contacts', { ...form, delegate: activeDelegate }, { headers: { 'x-auth-token': token } });
            setShowAddModal(false);
            setForm(EMPTY_FORM);
            fetchContacts(activeDelegate);
        } catch (err) {
            console.error('Failed to add contact', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            if (confirmDelete.isStatic) {
                await axios.delete(`/api/contacts/${confirmDelete._staticKey}`, {
                    headers: { 'x-auth-token': token },
                    data: { staticKey: confirmDelete._staticKey, delegate: activeDelegate }
                });
            } else {
                await axios.delete(`/api/contacts/${confirmDelete._id}`, {
                    headers: { 'x-auth-token': token },
                    data: { delegate: activeDelegate }
                });
            }
            setConfirmDelete(null);
            fetchContacts(activeDelegate);
        } catch (err) {
            console.error('Failed to delete contact', err);
        }
    };

    const delegate = delegates.find(d => d.id === activeDelegate);
    const filteredContacts = contacts.filter(item =>
        (item.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.prenom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.ville || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.specialite || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6 min-h-[700px]">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-gray-50">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Contacts par Délégué</h2>
                    <p className="text-sm text-slate-500 font-medium italic">Répertoire personnel — ajoutez ou supprimez vos contacts.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <input
                            type="text"
                            placeholder="Filtrer par nom, spécialité..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:border-indigo-400 outline-none text-sm font-semibold"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-black text-sm transition-all hover:scale-105 shadow-md flex-shrink-0"
                        style={{ background: delegate?.color }}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                        Ajouter
                    </button>
                </div>
            </div>

            {/* Delegate Tabs */}
            <div className="flex flex-wrap gap-2">
                {delegates.map(d => (
                    <button
                        key={d.id}
                        onClick={() => handleTabChange(d.id)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all border-2 flex items-center gap-2 ${activeDelegate === d.id ? 'text-white shadow-md scale-105 border-transparent' : 'bg-white text-slate-400 border-slate-100 hover:text-slate-700'}`}
                        style={activeDelegate === d.id ? { background: d.color } : {}}
                    >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: activeDelegate === d.id ? 'white' : d.color }} />
                        {d.id}
                        <span className="text-[10px] opacity-70 font-bold">({contacts.length})</span>
                    </button>
                ))}
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: delegate?.color }} />
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">{filteredContacts.length} résultats pour {activeDelegate}</span>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-20 text-slate-400">
                    <svg className="animate-spin w-8 h-8 mr-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Chargement...
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="min-w-full text-sm text-left">
                        <thead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]" style={{ background: delegate?.lightColor }}>
                            <tr>
                                <th className="px-5 py-3.5">Médecin</th>
                                <th className="px-5 py-3.5">Localisation</th>
                                <th className="px-5 py-3.5">Contacts</th>
                                <th className="px-5 py-3.5">Adresse</th>
                                <th className="px-5 py-3.5 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredContacts.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            {!item.isStatic && (
                                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded text-white" style={{ background: delegate?.color }}>Nouveau</span>
                                            )}
                                            <div>
                                                <div className="font-extrabold text-slate-900">Dr {item.nom} {item.prenom}</div>
                                                {item.specialite && (
                                                    <div className="text-[10px] font-black uppercase mt-0.5" style={{ color: delegate?.color }}>{item.specialite.slice(0, 35)}</div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-slate-700">{item.ville}</div>
                                        <div className="text-[10px] text-slate-400 uppercase">{item.gouvernorat}</div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex flex-col gap-1">
                                            {(item.mobile || item.telephone) && (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                                                    <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                    </svg>
                                                    <span className="font-mono font-black">{item.mobile || item.telephone}</span>
                                                </div>
                                            )}
                                            {item.email && (
                                                <span className="text-[11px] font-bold truncate max-w-[150px]" style={{ color: delegate?.color }} title={item.email}>{item.email}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="text-slate-400 text-[11px] max-w-[180px] leading-relaxed">{item.adresse}</p>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <button
                                            onClick={() => setConfirmDelete(item)}
                                            className="p-2 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all"
                                            title="Supprimer"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredContacts.length === 0 && !loading && (
                        <div className="text-center py-16 text-slate-400 italic">Aucun contact correspondant.</div>
                    )}
                </div>
            )}

            {/* ── Add Contact Modal ── */}
            {showAddModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 mx-4" style={{ animation: 'fadeIn .2s ease' }}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-900">Nouveau Contact — {activeDelegate}</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { key: 'nom', label: 'Nom *' },
                                { key: 'prenom', label: 'Prénom' },
                                { key: 'specialite', label: 'Spécialité' },
                                { key: 'ville', label: 'Ville' },
                                { key: 'gouvernorat', label: 'Gouvernorat' },
                                { key: 'telephone', label: 'Téléphone Prof' },
                                { key: 'mobile', label: 'Mobile' },
                                { key: 'email', label: 'Email' },
                            ].map(f => (
                                <input
                                    key={f.key}
                                    placeholder={f.label}
                                    value={form[f.key]}
                                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:border-indigo-400 bg-slate-50"
                                />
                            ))}
                        </div>
                        <input
                            placeholder="Adresse professionnelle"
                            value={form.adresse}
                            onChange={e => setForm({ ...form, adresse: e.target.value })}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:border-indigo-400 bg-slate-50"
                        />
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50">Annuler</button>
                            <button
                                onClick={handleAddContact}
                                disabled={saving || !form.nom.trim()}
                                className="flex-1 py-2.5 rounded-xl text-white font-black text-sm transition-all disabled:opacity-50"
                                style={{ background: delegate?.color }}
                            >
                                {saving ? 'Enregistrement...' : 'Ajouter le contact'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── Confirm Delete Modal ── */}
            {confirmDelete && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 mx-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-red-100">
                                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-black text-slate-900">Confirmer la suppression</p>
                                <p className="text-sm text-slate-500">Dr {confirmDelete.nom} {confirmDelete.prenom}</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-600">Cette action est irréversible. Le contact sera retiré de votre liste.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50">Annuler</button>
                            <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-sm transition-all">Supprimer</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
