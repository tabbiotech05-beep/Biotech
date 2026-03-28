import React, { useEffect, useState, useCallback } from 'react';

export default function SamplesView({ dashboardId, viewUser }) {
    const [samples, setSamples] = useState([]);
    const [history, setHistory] = useState([]);
    const [delegates, setDelegates] = useState([]);
    const [loading, setLoading] = useState(true);

    const role = localStorage.getItem('role') || 'delegue';
    const isAdmin = role === 'admin';

    const fetchDelegates = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/auth/users', {
                headers: { 'x-auth-token': token }
            });
            if (res.ok) {
                const data = await res.json();
                setDelegates(data);

                // If viewing a specific user, extract their samples
                if (viewUser) {
                    const targetUser = data.find(u => u.username === viewUser);
                    if (targetUser) {
                        setSamples(targetUser.samples || []);
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching delegates:', err);
        }
    }, [viewUser]);

    const fetchMySamples = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/auth/me', {
                headers: { 'x-auth-token': token }
            });
            if (res.ok) {
                const data = await res.json();
                setSamples(data.samples || []);
            }
        } catch (err) {
            console.error('Error fetching my samples:', err);
        }
    }, []);

    const fetchHistoryData = useCallback(async (targetUsername) => {
        try {
            const token = localStorage.getItem('token');
            let url = `/api/visits?dashboardId=${dashboardId}`;
            if (targetUsername) {
                url += `&viewUser=${targetUsername}`;
            }

            const res = await fetch(url, {
                headers: { 'x-auth-token': token }
            });
            if (res.ok) {
                const data = await res.json();
                const relevantVisits = data.filter(v =>
                    v.givenSampleName ||
                    v.givenMaterialName ||
                    (v.givenMaterials && v.givenMaterials.length > 0) ||
                    (v.givenSamples && v.givenSamples.length > 0)
                );
                setHistory(relevantVisits);
            }
        } catch (err) {
            console.error('Error fetching history:', err);
        }
    }, [dashboardId]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            if (isAdmin) {
                await fetchDelegates();
                if (viewUser) {
                    await fetchHistoryData(viewUser);
                }
            } else {
                await fetchMySamples();
                await fetchHistoryData();
            }
            setLoading(false);
        };
        load();
    }, [isAdmin, viewUser, fetchDelegates, fetchMySamples, fetchHistoryData]);

    const getRecipientName = (visit) => {
        if (visit.targetType === 'medecin') return `Dr. ${visit.doctorName}`;
        if (visit.targetType === 'pharmacie') return visit.pharmacyName;
        if (visit.targetType === 'grossiste') return visit.wholesalerName;
        return 'Inconnu';
    };

    if (loading) {
        return <div className="text-center py-20 text-gray-500">Chargement...</div>;
    }

    // --- CASE 1: Admin Summary (Not viewing a specific user) ---
    if (isAdmin && !viewUser) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Stock des Délégués
                </h2>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                                <th className="px-4 py-3 border-b font-semibold">Délégué</th>
                                <th className="px-4 py-3 border-b font-semibold">Échantillons en possession</th>
                            </tr>
                        </thead>
                        <tbody>
                            {delegates.length === 0 ? (
                                <tr>
                                    <td colSpan="2" className="text-center py-10 text-gray-400 italic">Aucun délégué trouvé</td>
                                </tr>
                            ) : (
                                delegates.map((del, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-4 border-b font-medium text-gray-900 border-r">{del.username}</td>
                                        <td className="px-4 py-4 border-b">
                                            <div className="flex flex-wrap gap-2">
                                                {(!del.samples || del.samples.length === 0) ? (
                                                    <span className="text-gray-400 text-sm">Vide</span>
                                                ) : (
                                                    del.samples.map((s, sIdx) => (
                                                        <span key={sIdx} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs border border-indigo-100 flex items-center gap-1 shadow-sm">
                                                            <strong>{s.name}</strong>
                                                            {s.batchNumber && <span className="opacity-60 font-mono text-[10px] bg-white px-1 rounded border border-indigo-200">#{s.batchNumber}</span>}
                                                            : {s.count}
                                                        </span>
                                                    ))
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // --- CASE 2: Specific User View (Delegate or Admin Viewing User) ---
    const medicinalSamples = samples.filter(s => (s.itemType || 'sample') === 'sample');
    const promotionalMaterials = samples.filter(s => s.itemType === 'material');

    return (
        <div className="flex flex-col gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    {isAdmin ? `Stock de ${viewUser}` : 'Mon Inventaire'}
                </h2>

                {/* Medicinal Samples Section */}
                <h3 className="text-sm font-bold text-green-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Médicaments (Échantillons)
                </h3>
                {medicinalSamples.length === 0 ? (
                    <div className="text-gray-400 text-sm italic mb-8 bg-gray-50 p-4 rounded border border-dashed text-center">
                        Aucun médicament en possession.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                        {medicinalSamples.map((sample, index) => (
                            <div key={index} className="bg-gradient-to-br from-green-50 to-white p-6 rounded-xl border border-green-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-lg text-green-900">{sample.name}</h3>
                                        <p className="text-xs font-mono text-green-600 bg-white px-2 py-0.5 rounded border border-green-100 inline-block mt-1">
                                            Lot: {sample.batchNumber || 'N/A'}
                                        </p>
                                    </div>
                                    <span className="bg-green-600 text-white px-4 py-2 rounded-lg text-2xl font-black shadow-lg shadow-green-200">
                                        {sample.count}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}


            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Historique des échantillons offerts {isAdmin && `de ${viewUser}`}
                </h2>

                {history.length === 0 ? (
                    <p className="text-gray-500 text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        Aucun historique disponible.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                                    <th className="px-4 py-3 border-b font-semibold">Date</th>
                                    <th className="px-4 py-3 border-b font-semibold">Produit Offert</th>
                                    <th className="px-4 py-3 border-b font-semibold">Lot / Réf</th>
                                    <th className="px-4 py-3 border-b font-semibold">Destinataire</th>
                                    <th className="px-4 py-3 border-b font-semibold">Type Cible</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.sort((a, b) => new Date(b.start) - new Date(a.start)).map((visit, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-4 border-b text-gray-700">
                                            {new Date(visit.start).toLocaleDateString('fr-FR', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-4 py-4 border-b">
                                            <div className="flex flex-col gap-1">
                                                {/* Legacy Sample */}
                                                {visit.givenSampleName && (
                                                    <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded inline-block w-fit">
                                                        📦 {visit.givenSampleName}{visit.givenSampleQty > 1 ? ` (×${visit.givenSampleQty})` : ''}
                                                    </span>
                                                )}
                                                {/* New Samples */}
                                                {visit.givenSamples?.map((s, sIdx) => (
                                                    <span key={sIdx} className="font-semibold text-green-700 bg-green-50 px-2 py-1 rounded inline-block w-fit">
                                                        📦 {s.name}{s.count > 1 ? ` (×${s.count})` : ''}
                                                    </span>
                                                ))}
                                                {/* Legacy Materials */}
                                                {visit.givenMaterialName && (!visit.givenMaterials || visit.givenMaterials.length === 0) && (
                                                    <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded inline-block w-fit">
                                                        🎁 {visit.givenMaterialName}
                                                    </span>
                                                )}
                                                {visit.givenMaterials && visit.givenMaterials.map((m, mIdx) => (
                                                    <span key={mIdx} className="font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded inline-block w-fit">
                                                        🎁 {m.name} {m.count > 1 ? `(x${m.count})` : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 border-b">
                                            <div className="flex flex-col gap-1">
                                                {/* Legacy Sample */}
                                                {visit.givenSampleName && (
                                                    <span className="text-[10px] font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 w-fit">
                                                        {visit.givenSampleBatch || 'N/A'}
                                                    </span>
                                                )}
                                                {/* New Samples */}
                                                {visit.givenSamples?.map((s, sIdx) => (
                                                    <span key={sIdx} className="text-[10px] font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 w-fit">
                                                        {s.batchNumber || 'N/A'}
                                                    </span>
                                                ))}
                                                {/* Legacy Materials */}
                                                {visit.givenMaterialName && (!visit.givenMaterials || visit.givenMaterials.length === 0) && (
                                                    <span className="text-[10px] font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 w-fit">
                                                        {visit.givenMaterialBatch && visit.givenMaterialBatch !== 'N/A' ? visit.givenMaterialBatch : '-'}
                                                    </span>
                                                )}
                                                {visit.givenMaterials && visit.givenMaterials.map((m, mIdx) => (
                                                    <span key={mIdx} className="text-[10px] font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 w-fit">
                                                        {m.batch && m.batch !== 'N/A' ? m.batch : '-'}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 border-b text-gray-800 font-medium">
                                            {getRecipientName(visit)}
                                        </td>
                                        <td className="px-4 py-4 border-b">
                                            <span className={`text-xs px-2 py-1 rounded-full border ${visit.targetType === 'medecin' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                visit.targetType === 'pharmacie' ? 'bg-green-50 text-green-700 border-green-100' :
                                                    'bg-orange-50 text-orange-700 border-orange-100'
                                                }`}>
                                                {visit.targetType === 'medecin' ? 'Médecin' :
                                                    visit.targetType === 'pharmacie' ? 'Pharmacie' : 'Grossiste'}
                                            </span>
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
