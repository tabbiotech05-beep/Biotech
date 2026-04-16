import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function RepertoireView({ dashboardId, viewUser }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchContacts = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                let url = `/api/visits?dashboardId=${dashboardId}`;
                if (viewUser) {
                    url += `&viewUser=${viewUser}`;
                }
                const res = await axios.get(url, { headers: { 'x-auth-token': token } });
                
                // Process visits to extract unique contacts
                const uniqueContacts = new Map();

                res.data.forEach(visit => {
                    const normalizedGov = visit.governorate && visit.governorate !== 'N/A' ? visit.governorate : '';
                    const normalizedAddr = visit.address || '';

                    if (visit.targetType === 'medecin' && visit.doctorName) {
                        const key = `medecin-${visit.doctorName.toLowerCase().trim()}`;
                        if (!uniqueContacts.has(key)) {
                            uniqueContacts.set(key, {
                                type: 'Médecin',
                                name: visit.doctorName,
                                specialty: visit.specialty || 'Généraliste',
                                governorate: normalizedGov,
                                address: normalizedAddr
                            });
                        }
                    } else if (visit.targetType === 'pharmacie' && visit.pharmacyName) {
                        const key = `pharmacie-${visit.pharmacyName.toLowerCase().trim()}`;
                        if (!uniqueContacts.has(key)) {
                            uniqueContacts.set(key, {
                                type: 'Pharmacie',
                                name: visit.pharmacyName,
                                specialty: '',
                                governorate: normalizedGov,
                                address: normalizedAddr
                            });
                        }
                    } else if (visit.targetType === 'grossiste' && visit.wholesalerName) {
                        const key = `grossiste-${visit.wholesalerName.toLowerCase().trim()}`;
                        if (!uniqueContacts.has(key)) {
                            uniqueContacts.set(key, {
                                type: 'Grossiste',
                                name: visit.wholesalerName,
                                specialty: '🏢 Grossiste',
                                governorate: normalizedGov,
                                address: normalizedAddr
                            });
                        }
                    }
                });

                setContacts(Array.from(uniqueContacts.values()).sort((a, b) => a.name.localeCompare(b.name)));
            } catch (err) {
                console.error('Failed to fetch visits for repertoire', err);
            } finally {
                setLoading(false);
            }
        };

        fetchContacts();
    }, [dashboardId, viewUser]);

    const filteredContacts = contacts.filter(item =>
        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.governorate || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.specialty || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const typeColors = {
        'Médecin': { bg: '#6366f1', badge: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
        'Pharmacie': { bg: '#10b981', badge: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
        'Grossiste': { bg: '#f59e0b', badge: 'bg-amber-50 text-amber-600 border-amber-200' }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6 min-h-[700px]">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-gray-50">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Répertoire {viewUser ? `de ${viewUser}` : ''}</h2>
                    <p className="text-sm text-slate-500 font-medium italic">Carnet d'adresses généré automatiquement à partir de vos visites (Médecins, Pharmacies, Grossistes).</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <input
                            type="text"
                            placeholder="Rechercher par nom, type, spécialité..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:border-indigo-400 outline-none text-sm font-semibold transition-all hover:bg-slate-100 focus:hover:bg-white"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-2 px-1">
                <div className="flex gap-4 text-[11px] font-extrabold uppercase tracking-widest text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-800"></span>
                        TOTAL : {filteredContacts.length}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: typeColors['Médecin'].bg }}></span>
                        MÉDECINS : {filteredContacts.filter(c => c.type === 'Médecin').length}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: typeColors['Pharmacie'].bg }}></span>
                        PHARMACIES : {filteredContacts.filter(c => c.type === 'Pharmacie').length}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: typeColors['Grossiste'].bg }}></span>
                        GROSSISTES : {filteredContacts.filter(c => c.type === 'Grossiste').length}
                    </span>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-32 text-slate-400 flex-col gap-4">
                    <svg className="animate-spin w-10 h-10" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    <span className="text-sm font-semibold animate-pulse">Extraction de vos contacts depuis le calendrier...</span>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Spécialité / Type</th>
                                <th className="px-6 py-4">Gouvernorat</th>
                                <th className="px-6 py-4 w-1/3">Adresse complète</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredContacts.map((item, idx) => {
                                const style = typeColors[item.type] || typeColors['Médecin'];
                                
                                return (
                                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs shadow-sm flex-shrink-0" style={{ background: style.bg }}>
                                                    {item.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-extrabold text-slate-800 text-sm">{item.name}</div>
                                                    <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">{item.type}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.specialty && (
                                                <span className={`inline-flex items-center px-2 py-1 rounded border text-[10px] font-bold uppercase ${style.badge}`}>
                                                    {item.specialty}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.governorate ? (
                                                <div className="flex items-center gap-1.5">
                                                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                                    <span className="font-bold text-slate-600">{item.governorate}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 italic text-xs">Non spécifié</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-[11px] text-slate-500 leading-relaxed font-medium line-clamp-2" title={item.address}>
                                                {item.address ? item.address : <span className="text-slate-300 italic">Aucune adresse</span>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredContacts.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <svg className="w-12 h-12 mb-3 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            <p className="italic font-medium">Aucun contact trouvé dans le calendrier.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
