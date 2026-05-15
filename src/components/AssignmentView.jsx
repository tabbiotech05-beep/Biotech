import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AssignmentView() {
    const [assignedVisits, setAssignedVisits] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedVisit, setSelectedVisit] = useState(null);

    useEffect(() => {
        const fetchAssigned = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await axios.get('/api/visits/assigned-to-me', {
                    headers: { 'x-auth-token': token }
                });
                setAssignedVisits(res.data);
            } catch (err) {
                console.error('Failed to fetch assigned visits', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAssigned();
    }, []);

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short'
        });
    };

    const getFullDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getTypeColor = (type) => {
        const t = (type || '').toLowerCase();
        if (t.includes('med')) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (t.includes('ph')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        if (t.includes('gro')) return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-gray-100 text-gray-700 border-gray-200';
    };

    return (
        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-8 min-h-[800px]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-50">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <span className="bg-blue-600 text-white p-2.5 rounded-2xl shadow-lg shadow-blue-200">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8" />
                            </svg>
                        </span>
                        Assignations Reçues
                    </h2>
                    <p className="text-slate-400 font-bold text-sm mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        {assignedVisits.length} tâches partagées avec vous
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-48">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                    </div>
                </div>
            ) : assignedVisits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 text-slate-300">
                    <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6 border-2 border-dashed border-slate-100">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <p className="text-xl font-black text-slate-400 italic">Aucune assignation pour le moment</p>
                    <p className="text-sm font-bold text-slate-300 mt-1">Vos collègues peuvent vous envoyer des tâches via leur calendrier</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-3xl border border-slate-100 bg-slate-50/30">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-16 text-center">Date</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Délégué Émetteur</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cible / Patient</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Instructions</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {assignedVisits.map((visit) => (
                                <tr 
                                    key={visit._id} 
                                    onClick={() => setSelectedVisit(visit)}
                                    className="group hover:bg-blue-50/50 transition-colors cursor-pointer"
                                >
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl p-2 border border-slate-100 group-hover:bg-white group-hover:border-blue-200 transition-all">
                                            <span className="text-[10px] font-black text-slate-400 uppercase">{new Date(visit.start).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                                            <span className="text-lg font-black text-slate-800 leading-none">{new Date(visit.start).getDate()}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-black text-xs shadow-md">
                                                {visit.user?.username?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <span className="text-sm font-extrabold text-slate-700 italic group-hover:text-blue-700 transition-colors uppercase tracking-tight">{visit.user?.username}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base font-black text-slate-900 tracking-tight truncate max-w-[200px]">
                                                    {visit.doctorName || visit.pharmacyName || visit.wholesalerName || visit.title}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${getTypeColor(visit.targetType || visit.visitName)}`}>
                                                    {visit.targetType?.substring(0, 2) || (visit.visitName === 'privée' ? 'Pr' : 'V')}
                                                </span>
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                                                {visit.governorate || 'S/O'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-xs font-bold text-slate-500 italic line-clamp-1 max-w-[250px] leading-relaxed">
                                            {visit.details || "Pas d'instructions."}
                                        </p>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <button className="bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white p-2 rounded-xl border border-slate-100 group-hover:border-blue-500 transition-all shadow-sm">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Visit Details Modal - Remains consistent for depth */}
            {selectedVisit && (
                <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-[650px] max-h-[90vh] overflow-hidden flex flex-col border border-white/20 animate-fade-up">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <span className="bg-slate-900 text-white p-3 rounded-[1.25rem] shadow-xl shadow-slate-200">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </span>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Détails de la mission</h3>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Assigné par {selectedVisit.user?.username}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedVisit(null)} className="text-slate-300 hover:text-slate-900 p-3 rounded-[1.25rem] hover:bg-white transition-all border border-transparent hover:border-slate-100 group">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-8">
                            {/* Target Hero Card */}
                            <div className="p-8 rounded-[2rem] bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-2xl shadow-blue-200 flex flex-col items-center text-center relative overflow-hidden">
                                <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl"></div>
                                
                                <span className="px-4 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-white/20">Cible Principale</span>
                                <h4 className="text-3xl font-black mb-2 leading-tight">
                                    {selectedVisit.doctorName || selectedVisit.pharmacyName || selectedVisit.wholesalerName || selectedVisit.title}
                                </h4>
                                <p className="text-blue-100 font-bold italic text-sm">{selectedVisit.specialty || "Médecin de ville"}</p>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">📅 Rendez-vous</label>
                                    <p className="text-sm font-black text-slate-800">{getFullDate(selectedVisit.start)}</p>
                                    <p className="text-xs font-bold text-blue-600 mt-1 uppercase italic">{selectedVisit.visitTime || "Matin"}</p>
                                </div>
                                <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">📍 Gouvernorat</label>
                                    <p className="text-sm font-black text-slate-800">{selectedVisit.governorate || "Non précisé"}</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase italic leading-tight truncate">{selectedVisit.address || "Addresse non fournie"}</p>
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">📝 Instructions Particulières</label>
                                    <span className="w-12 h-0.5 bg-slate-100 rounded-full"></span>
                                </div>
                                <div className="p-8 bg-amber-50/50 border-2 border-amber-50/80 rounded-[2rem] relative">
                                    <svg className="w-10 h-10 text-amber-100 absolute top-4 right-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 13.1216 16 12.017 16H8.01697C6.9124 16 6.01697 16.8954 6.01697 18L6.01697 21H4.01697L4.01697 18C4.01697 15.7909 5.80783 14 8.01697 14H12.017C14.2261 14 16.017 15.7909 16.017 18V21H14.017Z" /></svg>
                                    <p className="text-sm font-bold text-amber-900/80 leading-loose italic whitespace-pre-wrap relative z-10">
                                        "{selectedVisit.details || "Votre collègue n'a pas laissé d'instructions spécifiques, contactez-le si besoin."}"
                                    </p>
                                </div>
                            </div>

                            {/* Inventory */}
                            {((selectedVisit.givenSamples && selectedVisit.givenSamples.length > 0) || (selectedVisit.givenMaterials && selectedVisit.givenMaterials.length > 0)) && (
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">🎁 Logistique / Stock à prévoir</label>
                                    <div className="flex flex-wrap gap-3">
                                        {selectedVisit.givenSamples?.map((s, i) => (
                                            <span key={i} className="px-5 py-3 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-black border border-emerald-100 flex items-center gap-3 shadow-sm">
                                                <span className="text-lg">📦</span> {s.name} <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-lg text-[10px]">x{s.count}</span>
                                            </span>
                                        ))}
                                        {selectedVisit.givenMaterials?.map((m, i) => (
                                            <span key={i} className="px-5 py-3 bg-indigo-50 text-indigo-700 rounded-2xl text-xs font-black border border-indigo-100 flex items-center gap-3 shadow-sm">
                                                <span className="text-lg">📑</span> {m.name} <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-lg text-[10px]">x{m.count}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                            <button 
                                onClick={() => setSelectedVisit(null)}
                                className="flex-1 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
                            >
                                Fermer le dossier
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
