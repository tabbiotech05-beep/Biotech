import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function CycleView({ dashboardId, theme, userRole, viewUser }) {
    const isDelegue = userRole === 'delegue';
    const isReadOnly = !!viewUser;
    const [doctors, setDoctors] = useState([]);
    const [pastWeeks, setPastWeeks] = useState([]); // Dynamic computed weeks
    const [activeWeekLabel, setActiveWeekLabel] = useState("");
    const [loading, setLoading] = useState(true);
    const [newDoctor, setNewDoctor] = useState({ name: '', specialty: '', governorate: '', address: '', prescriberType: 'non prescripteur' });
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [visits, setVisits] = useState([]);
    const [sidebarTab, setSidebarTab] = useState('doctors'); // 'doctors' or 'tasks'
    const [selectedItemForDetails, setSelectedItemForDetails] = useState(null);

    // Helpers to group by weak
    const getWeekKey = (dateString) => {
        const d = new Date(dateString);
        let day = d.getDay();
        if (day === 0) day = 7; // Convert Sunday(0) to 7
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - (day - 1)); // Go back to Monday
        const monday = new Date(d);
        d.setDate(d.getDate() + 6); // Add 6 to reach Sunday
        const sunday = new Date(d);
        
        const formatName = (dt) => dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        return `S. du ${formatName(monday)} au ${formatName(sunday)}`;
    };

    useEffect(() => {
        fetchData();
    }, [viewUser, dashboardId]); // Refresh when viewing different user or dashboard

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'x-auth-token': token };

            const queryParam = viewUser ? `?viewUser=${viewUser}` : '';
            const visitQueryParam = viewUser
                ? `?dashboardId=${dashboardId}&viewUser=${viewUser}`
                : `?dashboardId=${dashboardId}`;

            const [docsRes, visitsRes] = await Promise.all([
                axios.get(`/api/doctors${queryParam}`, { headers }),
                axios.get(`/api/visits${visitQueryParam}`, { headers })
            ]);

            let fetchedDoctors = docsRes.data;

            // ── Auto-sync silencieux ─────────────────────────────────────────
            if (!isReadOnly) {
                try {
                    await axios.post('/api/doctors/import', {}, { headers });
                    const refreshed = await axios.get(`/api/doctors${queryParam}`, { headers });
                    fetchedDoctors = refreshed.data;
                } catch (importErr) {
                    console.warn('Auto-sync discret échoué:', importErr.message);
                }
            }
            // ────────────────────────────────────────────────────────────────

            setDoctors(Array.isArray(fetchedDoctors) ? fetchedDoctors : []);
            
            const fetchedVisits = Array.isArray(visitsRes.data) ? visitsRes.data : [];
            setVisits(fetchedVisits);

            // Group visits by dynamic weeks
            const groups = {};
            fetchedVisits.forEach(v => {
                const k = getWeekKey(v.start);
                if (!groups[k]) groups[k] = { label: k, timestamp: new Date(v.start).getTime(), items: [] };
                groups[k].items.push(v);
            });
            
            // Sort descendant, meaning newest week array first
            const computed = Object.values(groups).sort((a, b) => b.timestamp - a.timestamp);
            // Sort items inside week by time descending as well
            computed.forEach(w => w.items.sort((a,b) => new Date(b.start) - new Date(a.start)));

            setPastWeeks(computed);
            // Set first available week to active
            if (computed.length > 0) {
                setActiveWeekLabel(computed[0].label);
            }
        } catch (err) {
            console.error('Error fetching cycle data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddDoctor = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/doctors', newDoctor, {
                headers: { 'x-auth-token': token }
            });
            const addedDoctor = res.data;
            setDoctors([...doctors, addedDoctor]);
            setNewDoctor({ name: '', specialty: '', governorate: '', address: '', prescriberType: 'non prescripteur' });
            setShowAddModal(false);
        } catch (err) {
            alert(err.response?.data?.msg || 'Error adding doctor');
        }
    };

    const downloadCycleReport = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/visits/admin/cycle-report?dashboardId=${dashboardId}`, {
                headers: { 'x-auth-token': token }
            });
            if (!res.ok) throw new Error('Erreur lors du chargement du rapport');
            const report = await res.json();

            // Collect all unique week labels across all delegates (in order)
            const allWeekLabels = [];
            const seen = new Set();
            report.forEach(r => r.weeks.forEach(w => {
                if (!seen.has(w.label)) { seen.add(w.label); allWeekLabels.push(w.label); }
            }));

            // Header row
            const headers = ['Délégué', 'Grossistes Visités', ...allWeekLabels.map(w => `Gouvernorats – ${w}`)];

            const csvRows = [headers.join(';')];
            report.forEach(r => {
                const row = [
                    `"${r.delegue}"`,
                    `"${r.grossistes}"`
                ];
                allWeekLabels.forEach(wLabel => {
                    const weekEntry = r.weeks.find(w => w.label === wLabel);
                    row.push(`"${weekEntry ? weekEntry.governorates : '-'}"`);
                });
                csvRows.push(row.join(';'));
            });

            const csvContent = '\uFEFF' + csvRows.join('\n'); // BOM for Excel UTF-8
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `rapport_cycle_${dashboardId}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            alert('Erreur lors du téléchargement : ' + err.message);
        }
    };

    const handleSyncAll = async () => {
        if (!window.confirm("Synchroniser tous les médecins depuis les visites de TOUS les délégués ?")) return;
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/doctors/sync-all', {}, {
                headers: { 'x-auth-token': token }
            });
            const { totalCreated, summary } = res.data;
            let msg = `✅ Sync terminée : ${totalCreated} médecin(s) importé(s)\n\n`;
            summary.forEach(u => {
                msg += `• ${u.username}: ${u.created} ajouté(s), ${u.skipped} déjà présent(s)\n`;
            });
            alert(msg);
            await fetchData();
        } catch (err) {
            alert('Erreur lors de la synchronisation: ' + (err.response?.data?.msg || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (!window.confirm("Importer les médecins depuis vos visites passées ?")) return;
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            await axios.post('/api/doctors/import', {}, {
                headers: { 'x-auth-token': token }
            });
            await fetchData();
        } catch (err) {
            alert('Error importing doctors');
        } finally {
            setLoading(false);
        }
    };

    const filteredDoctors = doctors.filter(d =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.specialty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.governorate?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeWeekData = pastWeeks.find(w => w.label === activeWeekLabel);

    if (loading) return <div className="text-center py-20 font-medium text-gray-500">Chargement de votre historique de cycle...</div>;

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Read-Only Banner */}
            {
                isReadOnly && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-2xl shadow-sm flex items-center gap-3">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-yellow-700"> Mode Lecture Seule : Visualisation de l'historique de <span className="font-bold">{viewUser}</span></p>
                    </div>
                )
            }

            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-xl font-extrabold text-gray-900">Historique des Cycles</h2>
                    <p className="text-sm text-gray-500">Parcourez les tâches réalisées semaine par semaine</p>
                </div>
                {!isDelegue && !isReadOnly && (
                    <div className="flex flex-wrap gap-2">
                        <button onClick={handleImport} className="px-4 py-2 text-sm bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 border border-gray-200 transition-all">
                            Récupérer mes listes
                        </button>
                        <button onClick={handleSyncAll} className="px-4 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 border border-indigo-200 transition-all font-bold">
                            🔄 Sync Tous
                        </button>
                        <button onClick={() => setShowAddModal(true)} className={`px-4 py-2 text-sm text-white rounded-xl ${theme.bg} ${theme.bgHover} shadow-lg shadow-blue-500/20 transition-all`}>
                            + Nouveau Médecin
                        </button>
                    </div>
                )}
                {userRole === 'admin' && (
                    <button
                        onClick={downloadCycleReport}
                        className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 border border-emerald-700 transition-all font-bold flex items-center gap-2 shadow-md shadow-emerald-500/20"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Télécharger Rapport Cycle
                    </button>
                )}

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-250px)]">
                {/* Sidebar (Maintained) */}
                <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                    <div className="flex border-b">
                        <button
                            onClick={() => setSidebarTab('doctors')}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all ${sidebarTab === 'doctors' ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Médecins DB
                        </button>
                        <button
                            onClick={() => setSidebarTab('tasks')}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all ${sidebarTab === 'tasks' ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Pharmacies / Grossistes
                        </button>
                    </div>
                    <div className="p-4 border-b">
                        <input
                            type="text"
                            placeholder={sidebarTab === 'doctors' ? "Rechercher un médecin..." : "Rechercher une tâche..."}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {sidebarTab === 'doctors' ? (
                            filteredDoctors.map(doctor => {
                                const doctorVisits = visits.filter(v => v.doctorName === doctor.name);
                                const isVisited = doctorVisits.length > 0;
                                const isSelected = selectedItemForDetails?.type === 'doctor' && selectedItemForDetails.data._id === doctor._id;

                                return (
                                    <button
                                        key={doctor._id}
                                        onClick={() => setSelectedItemForDetails({ type: 'doctor', data: doctor })}
                                        className={`w-full text-left p-3 rounded-xl border transition-all group relative ${isSelected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' :
                                            isVisited ? 'bg-green-50/50 border-green-100' : 'bg-gray-50 border-transparent hover:border-blue-200 hover:bg-blue-50/50'
                                            } active:scale-95`}
                                        title="Cliquer pour voir l'historique"
                                    >
                                        <div className="pr-4">
                                            <div className="flex justify-between items-start gap-1">
                                                <p className="font-bold text-gray-800 text-sm leading-tight flex-1">{doctor.name}</p>
                                                <div className="flex gap-1 shrink-0">
                                                    {doctor.prescriberType === 'prescripteur' && (
                                                        <span className="text-[8px] bg-red-500 text-white px-1 py-0.5 rounded font-black uppercase tracking-tighter">P</span>
                                                    )}
                                                    {isVisited && (
                                                        <span className="text-[8px] bg-green-500 text-white px-1 py-0.5 rounded font-bold uppercase tracking-tighter">Visité</span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-gray-500 mt-0.5">{doctor.specialty} • {doctor.governorate}</p>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            visits
                                .filter(v =>
                                    v.targetType !== 'medecin' &&
                                    (v.visitName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        v.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        v.pharmacyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        v.wholesalerName?.toLowerCase().includes(searchQuery.toLowerCase()))
                                )
                                .sort((a, b) => new Date(b.start) - new Date(a.start))
                                .map(visit => (
                                    <button
                                        key={visit._id}
                                        onClick={() => setSelectedItemForDetails({ type: 'task', data: visit })}
                                        className="w-full text-left p-3 bg-gray-50 rounded-xl border border-transparent hover:border-blue-200 hover:bg-blue-50/50 transition-all group active:scale-95"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-gray-800 text-sm leading-tight">
                                                    {visit.targetType === 'pharmacie' ? (visit.pharmacyName || 'Pharmacie') :
                                                        visit.targetType === 'grossiste' ? (visit.wholesalerName || 'Grossiste') :
                                                            (visit.visitName || 'Tâche')}
                                                </p>
                                                <p className="text-[10px] text-blue-500 font-medium mt-0.5">
                                                    {new Date(visit.start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                            <span className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[8px] font-bold text-gray-400 uppercase">
                                                {visit.targetType}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">{visit.details}</p>
                                    </button>
                                ))
                        )}
                    </div>
                </div>

                {/* Main Focus Area: Historical Week Display */}
                <div className="lg:col-span-9 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                    {/* Navigation Selector (Dynamic) */}
                    <div className="p-4 border-b bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Période :</label>
                            {pastWeeks.length === 0 ? (
                                <span className="text-sm text-gray-400 font-medium">Aucune activité</span>
                            ) : (
                                <select 
                                    className="px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-blue-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[250px]"
                                    value={activeWeekLabel}
                                    onChange={(e) => setActiveWeekLabel(e.target.value)}
                                >
                                    {pastWeeks.map((weekObj) => (
                                        <option key={weekObj.label} value={weekObj.label}>
                                            {weekObj.label} — {weekObj.items.length} tâches
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Active Week Content */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        {!activeWeekData || activeWeekData.items.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300 py-40">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-xl font-medium">Aucune donnée historique trouvée</p>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-xl font-black text-gray-800 mb-6">
                                    <span className={`mr-2 inline-block w-3 h-6 rounded-full ${theme.bg} align-middle`}></span>
                                    Déroulé de {activeWeekLabel}
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-separate border-spacing-y-2">
                                        <thead>
                                            <tr className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                                                <th className="px-4 py-2">Date</th>
                                                <th className="px-4 py-2">Cible</th>
                                                <th className="px-4 py-2">Type</th>
                                                <th className="px-4 py-2">Lieu / Gouvernorat</th>
                                                <th className="px-4 py-2 border-r border-transparent text-right">Infos</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {activeWeekData.items.map((item, idx) => {
                                                const isDoctor = item.targetType === 'medecin';

                                                return (
                                                    <tr key={item._id} className={`hover:bg-gray-50 transition-colors bg-white group cursor-pointer`} onClick={() => setSelectedItemForDetails({ type: 'task', data: item })}>
                                                        <td className="px-4 py-4 first:rounded-l-2xl border-y border-l border-gray-100 font-bold text-gray-900 w-[140px]">
                                                            {new Date(item.start).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                            <span className="block text-[10px] font-medium text-gray-400 uppercase">{item.visitTime || '12:00'}</span>
                                                        </td>
                                                        <td className="px-4 py-4 border-y border-gray-100 font-bold text-gray-800">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs ${isDoctor ? theme.bg : 'bg-purple-500'}`}>
                                                                    {isDoctor ? (item.doctorName ? item.doctorName.charAt(0) : 'D') : 'T'}
                                                                </div>
                                                                <div>
                                                                    {isDoctor ? item.doctorName || 'Médecin Inconnu' : (item.pharmacyName || item.wholesalerName || item.visitName || 'Tâche')}
                                                                    <p className="text-[10px] text-gray-500 font-medium">
                                                                       {isDoctor ? item.specialty : item.details?.substring(0,30)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 border-y border-gray-100 text-gray-600">
                                                            <span className={`text-[10px] px-2 py-1 rounded-lg font-black uppercase tracking-wider ${isDoctor ? 'bg-blue-50 text-blue-600' : item.targetType === 'pharmacie' ? 'bg-green-50 text-green-600' : 'bg-purple-50 text-purple-600'}`}>
                                                                {item.targetType || 'Visite'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 border-y border-gray-100 text-gray-600">
                                                            {item.governorate || '-'}
                                                        </td>
                                                        <td className="px-4 py-4 last:rounded-r-2xl border-y border-r border-gray-100 text-right">
                                                            {(item.givenSampleName || (item.givenSamples && item.givenSamples.length > 0)) && (
                                                                <span title="Échantillons distribués" className="inline-block cursor-help mr-1">📦</span>
                                                            )}
                                                            {(item.givenMaterialName || (item.givenMaterials && item.givenMaterials.length > 0)) && (
                                                                <span title="Articles distribués" className="inline-block cursor-help">🎁</span>
                                                            )}
                                                            {!(item.givenSampleName || (item.givenSamples && item.givenSamples.length > 0) || item.givenMaterialName || (item.givenMaterials && item.givenMaterials.length > 0)) && (
                                                                <span className="text-gray-300 text-xs">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Doctor Modal */}
            {
                showAddModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className={`p-8 ${theme.bg} text-white relative`}>
                                <h3 className="text-2xl font-black">Nouveau Profil</h3>
                                <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 text-white/80 hover:text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleAddDoctor} className="p-8 space-y-5">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nom Complet</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ex: Dr. Ahmed ..."
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                                        value={newDoctor.name}
                                        onChange={e => setNewDoctor({ ...newDoctor, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Spécialité</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                                            value={newDoctor.specialty}
                                            onChange={e => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Secteur</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                                            value={newDoctor.governorate}
                                            onChange={e => setNewDoctor({ ...newDoctor, governorate: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Adresse Professionnelle</label>
                                    <textarea
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                                        rows="2"
                                        value={newDoctor.address}
                                        onChange={e => setNewDoctor({ ...newDoctor, address: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Statut Prescripteur</label>
                                    <div className="flex gap-2">
                                        {['prescripteur', 'non prescripteur'].map(t => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setNewDoctor({ ...newDoctor, prescriberType: t })}
                                                className={`flex-1 py-2 text-[10px] font-bold rounded-xl border transition-all ${newDoctor.prescriberType === t ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' : 'bg-white border-gray-100 text-gray-400'}`}
                                            >
                                                {t.charAt(0).toUpperCase() + t.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-gray-500 font-bold bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all">Fermer</button>
                                    <button type="submit" className={`flex-1 py-4 text-white font-bold rounded-2xl ${theme.bg} ${theme.bgHover} shadow-lg transition-all`}>Enregistrer</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            
            {/* Footer Details Panel (Maintained) */}
            {
                selectedItemForDetails && (
                    <div className="bg-white border-t-2 border-blue-500 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-300 sticky bottom-0 z-40">
                        <div className="max-w-7xl mx-auto p-4 md:p-6">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${theme.bg}`}>
                                        {selectedItemForDetails.type === 'doctor' ? selectedItemForDetails.data.name.charAt(0) : 'V'}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900 leading-tight">
                                            {selectedItemForDetails.type === 'doctor' ? 'Historique des Visites (Médecin)' :
                                                selectedItemForDetails.data.targetType === 'pharmacie' ? 'Détails Pharmacie' :
                                                    selectedItemForDetails.data.targetType === 'grossiste' ? 'Détails Grossiste' :
                                                        'Détails de la Visite'}
                                        </h3>
                                        <p className="text-sm font-medium text-blue-600">
                                            {selectedItemForDetails.type === 'doctor'
                                                ? `Dr. ${selectedItemForDetails.data.name} • ${selectedItemForDetails.data.specialty}`
                                                : `${selectedItemForDetails.data.doctorName || selectedItemForDetails.data.pharmacyName || selectedItemForDetails.data.wholesalerName || selectedItemForDetails.data.visitName || 'Tâche'} • ${new Date(selectedItemForDetails.data.start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                                            }
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedItemForDetails(null)}
                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                                {selectedItemForDetails.type === 'doctor' ? (
                                    visits.filter(v => v.doctorName === selectedItemForDetails.data.name).length === 0 ? (
                                        <div className="py-8 text-gray-400 italic text-center w-full bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                            Aucune visite enregistrée pour ce médecin.
                                        </div>
                                    ) : (
                                        visits
                                            .filter(v => v.doctorName === selectedItemForDetails.data.name)
                                            .sort((a, b) => new Date(b.start) - new Date(a.start))
                                            .map(visit => (
                                                <div key={visit._id} className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-tighter">
                                                            {new Date(visit.start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                        </span>
                                                        <span className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[9px] font-bold text-gray-400 uppercase">
                                                            {visit.visitName}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-700 font-medium leading-relaxed whitespace-pre-wrap break-words">
                                                        {visit.details}
                                                    </p>
                                                    {(visit.givenSampleName || visit.givenMaterialName || (visit.givenSamples && visit.givenSamples.length > 0)) && (
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            {visit.givenSampleName && (
                                                                <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full border border-green-200 font-bold uppercase">
                                                                    📦 {visit.givenSampleName} (x{visit.givenSampleQty || 1})
                                                                </span>
                                                            )}
                                                            {visit.givenSamples && visit.givenSamples.map((s, sIdx) => (
                                                                <span key={sIdx} className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full border border-green-200 font-bold uppercase">
                                                                    📦 {s.name} (x{s.count})
                                                                </span>
                                                            ))}
                                                            {visit.givenMaterialName && (!visit.givenMaterials || visit.givenMaterials.length === 0) && (
                                                                <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full border border-blue-200 font-bold uppercase">
                                                                    🎁 {visit.givenMaterialName}
                                                                </span>
                                                            )}
                                                            {visit.givenMaterials && visit.givenMaterials.map((m, mIdx) => (
                                                                <span key={mIdx} className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full border border-blue-200 font-bold uppercase">
                                                                    🎁 {m.name} {m.count > 1 ? `(x${m.count})` : ''}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                    )
                                ) : (
                                    <div className="w-full p-6 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Cible de la visite</label>
                                                <p className="text-sm font-bold text-gray-800 capitalize">
                                                    {selectedItemForDetails.data.targetType === 'medecin' ? '🩺 Médecin' :
                                                        selectedItemForDetails.data.targetType === 'pharmacie' ? '🏥 Pharmacie' :
                                                            selectedItemForDetails.data.targetType === 'grossiste' ? '🏢 Grossiste' :
                                                                '📋 Tâche Standard'}
                                                </p>
                                                {selectedItemForDetails.data.targetType === 'medecin' && <p className="text-sm text-gray-600">Dr. {selectedItemForDetails.data.doctorName}</p>}
                                                {selectedItemForDetails.data.targetType === 'pharmacie' && <p className="text-sm text-gray-600">{selectedItemForDetails.data.pharmacyName}</p>}
                                                {selectedItemForDetails.data.targetType === 'grossiste' && <p className="text-sm text-gray-600">{selectedItemForDetails.data.wholesalerName}</p>}
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Date & Heure</label>
                                                <p className="text-sm font-bold text-gray-800">
                                                    {new Date(selectedItemForDetails.data.start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                    {selectedItemForDetails.data.visitTime && ` — ${selectedItemForDetails.data.visitTime}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Détails de la tâche</label>
                                            <p className="text-sm text-gray-700 font-medium leading-relaxed whitespace-pre-wrap break-words bg-white p-4 rounded-xl border border-gray-100">
                                                {selectedItemForDetails.data.details || <span className="text-gray-400 italic">Aucun détail renseigné.</span>}
                                            </p>
                                            {(selectedItemForDetails.data.givenSampleName || selectedItemForDetails.data.givenMaterialName || (selectedItemForDetails.data.givenSamples && selectedItemForDetails.data.givenSamples.length > 0)) && (
                                                <div className="mt-3 flex flex-wrap gap-3">
                                                    {selectedItemForDetails.data.givenSampleName && (
                                                        <div className="bg-green-100 text-green-800 px-3 py-1.5 rounded-xl border border-green-200 text-xs font-bold flex items-center gap-2">
                                                            <span>📦</span> {selectedItemForDetails.data.givenSampleName} (x{selectedItemForDetails.data.givenSampleQty || 1}) {selectedItemForDetails.data.givenSampleBatch && `(Lot: ${selectedItemForDetails.data.givenSampleBatch})`}
                                                        </div>
                                                    )}
                                                    {selectedItemForDetails.data.givenSamples && selectedItemForDetails.data.givenSamples.map((s, sIdx) => (
                                                        <div key={sIdx} className="bg-green-100 text-green-800 px-3 py-1.5 rounded-xl border border-green-200 text-xs font-bold flex items-center gap-2">
                                                            <span>📦</span> {s.name} (x{s.count}) {s.batch && `(Lot: ${s.batch})`}
                                                        </div>
                                                    ))}
                                                    {selectedItemForDetails.data.givenMaterialName && (!selectedItemForDetails.data.givenMaterials || selectedItemForDetails.data.givenMaterials.length === 0) && (
                                                        <div className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-xl border border-blue-200 text-xs font-bold flex items-center gap-2">
                                                            <span>🎁</span> {selectedItemForDetails.data.givenMaterialName} {selectedItemForDetails.data.givenMaterialBatch && selectedItemForDetails.data.givenMaterialBatch !== 'N/A' && `(Réf: ${selectedItemForDetails.data.givenMaterialBatch})`}
                                                        </div>
                                                    )}
                                                    {selectedItemForDetails.data.givenMaterials && selectedItemForDetails.data.givenMaterials.map((m, mIdx) => (
                                                        <div key={mIdx} className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-xl border border-blue-200 text-xs font-bold flex items-center gap-2">
                                                            <span>🎁</span> {m.name} {m.count > 1 ? `(x${m.count})` : ''} {m.batch && m.batch !== 'N/A' && `(Réf: ${m.batch})`}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
