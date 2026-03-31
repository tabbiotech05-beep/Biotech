import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function CycleView({ dashboardId, theme, userRole, viewUser }) {
    const isDelegue = userRole === 'delegue';
    const isReadOnly = !!viewUser;
    const [doctors, setDoctors] = useState([]);
    const [weeks, setWeeks] = useState([[], [], [], [], [], []]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [newDoctor, setNewDoctor] = useState({ name: '', specialty: '', governorate: '', address: '' });
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeWeek, setActiveWeek] = useState(0); // 0 to 5
    const [searchQuery, setSearchQuery] = useState('');
    const [visits, setVisits] = useState([]);
    const [sidebarTab, setSidebarTab] = useState('doctors'); // 'doctors' or 'tasks'
    const [selectedItemForDetails, setSelectedItemForDetails] = useState(null); // Track which doctor or task is shown in the footer

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

            const [docsRes, cycleRes, visitsRes] = await Promise.all([
                axios.get(`/api/doctors${queryParam}`, { headers }),
                axios.get(`/api/cycle${queryParam}`, { headers }),
                axios.get(`/api/visits${visitQueryParam}`, { headers })
            ]);

            let doctors = docsRes.data;

            // ── Auto-sync silencieux ─────────────────────────────────────────
            // Toujours importer depuis les visites (idempotent - ne crée que les manquants)
            // Cela assure que tous les médecins et grossistes visités apparaissent dans le cycle
            if (!isReadOnly) {
                try {
                    await axios.post('/api/doctors/import', {}, { headers });
                    const refreshed = await axios.get(`/api/doctors${queryParam}`, { headers });
                    doctors = refreshed.data;
                } catch (importErr) {
                    console.warn('Auto-sync discret échoué:', importErr.message);
                }
            }
            // ────────────────────────────────────────────────────────────────

            setDoctors(doctors);
            setVisits(visitsRes.data || []);

            if (cycleRes.data && cycleRes.data.weeks) {
                const populatedWeeks = cycleRes.data.weeks.map(week => {
                    return week.map(item => {
                        // Handle old format (just ID strings) and new format ({id, type})
                        const id = item.id || (typeof item === 'string' ? item : item?._id);
                        const type = item.type || 'Doctor';

                        if (type === 'Visit') {
                            const visit = visitsRes.data?.find(v => v._id === id);
                            return visit ? { ...visit, __type: 'Visit' } : { _id: id, name: 'Visite Introuvable', __type: 'Visit' };
                        } else {
                            const doc = doctors.find(d => d._id === id);
                            return doc ? { ...doc, __type: 'Doctor' } : { _id: id, name: 'Médecin Introuvable', specialty: 'N/A', __type: 'Doctor' };
                        }
                    });
                });
                setWeeks(populatedWeeks);
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
            // Update doctors list
            const updatedDoctors = [...doctors, addedDoctor];
            setDoctors(updatedDoctors);
            // Also immediately add to the active week
            const newWeeks = [...weeks];
            if (!newWeeks[activeWeek].some(d => d._id === addedDoctor._id)) {
                newWeeks[activeWeek] = [...newWeeks[activeWeek], addedDoctor];
                setWeeks(newWeeks);
            }
            setNewDoctor({ name: '', specialty: '', governorate: '', address: '' });
            setShowAddModal(false);
        } catch (err) {
            alert(err.response?.data?.msg || 'Error adding doctor');
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

    const saveCycle = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const weeksToSave = weeks.map(week => week.map(item => ({
                id: item._id,
                type: item.__type || (item.targetType ? 'Visit' : 'Doctor')
            })));
            await axios.post('/api/cycle', { weeks: weeksToSave }, {
                headers: { 'x-auth-token': token }
            });
            alert('Cycle enregistré avec succès');
        } catch (err) {
            alert('Erreur lors de l\'enregistrement');
        } finally {
            setIsSaving(false);
        }
    };

    const moveItemToWeek = (item, weekIndex, type) => {
        const newWeeks = [...weeks];
        if (newWeeks[weekIndex].some(i => i._id === item._id)) {
            alert("Cet élément est déjà dans cette semaine.");
            return;
        }
        newWeeks[weekIndex] = [...newWeeks[weekIndex], { ...item, __type: type }];
        setWeeks(newWeeks);
    };

    const removeFromWeek = (weekIndex, doctorId) => {
        if (!window.confirm("Retirer ce médecin de la semaine ?")) return;
        const newWeeks = [...weeks];
        newWeeks[weekIndex] = newWeeks[weekIndex].filter(d => d._id !== doctorId);
        setWeeks(newWeeks);
    };

    const filteredDoctors = doctors.filter(d =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.specialty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.governorate?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="text-center py-20 font-medium text-gray-500">Chargement de votre planification...</div>;

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Read-Only Banner */}
            {
                isReadOnly && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-2xl shadow-sm flex items-center gap-3">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-yellow-700"> Mode Lecture Seule : Visualisation du cycle de <span className="font-bold">{viewUser}</span></p>
                    </div>
                )
            }

            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-xl font-extrabold text-gray-900">Planification Cycle</h2>
                    <p className="text-sm text-gray-500">Organisez vos visites sur 6 semaines</p>
                </div>
                {!isDelegue && !isReadOnly && (
                    <div className="flex flex-wrap gap-2">
                        <button onClick={handleImport} className="px-4 py-2 text-sm bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 border border-gray-200 transition-all">
                            Récupérer mes visites
                        </button>
                        <button onClick={handleSyncAll} className="px-4 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 border border-indigo-200 transition-all font-bold">
                            🔄 Sync Tous
                        </button>
                        <button onClick={() => setShowAddModal(true)} className={`px-4 py-2 text-sm text-white rounded-xl ${theme.bg} ${theme.bgHover} shadow-lg shadow-blue-500/20 transition-all`}>
                            + Nouveau Médecin
                        </button>
                        <button onClick={saveCycle} disabled={isSaving} className={`px-6 py-2 text-sm font-bold text-white rounded-xl bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/30 transition-all disabled:opacity-50`}>
                            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-250px)]">
                {/* Sidebar */}
                <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                    <div className="flex border-b">
                        <button
                            onClick={() => setSidebarTab('doctors')}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all ${sidebarTab === 'doctors' ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Médecins
                        </button>
                        <button
                            onClick={() => setSidebarTab('tasks')}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all ${sidebarTab === 'tasks' ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Pharmacies
                        </button>
                    </div>
                    <div className="p-4 border-b">
                        <input
                            type="text"
                            placeholder={sidebarTab === 'doctors' ? "Rechercher un médecin..." : "Rechercher une pharmacie..."}
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
                                        onClick={() => {
                                            if (!isDelegue && !isReadOnly) moveItemToWeek(doctor, activeWeek, 'Doctor');
                                            setSelectedItemForDetails({ type: 'doctor', data: doctor });
                                        }}
                                        className={`w-full text-left p-3 rounded-xl border transition-all group relative ${isSelected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' :
                                            isVisited ? 'bg-green-50/50 border-green-100 hover:border-green-200' : 'bg-gray-50 border-transparent hover:border-blue-200 hover:bg-blue-50/50'
                                            } ${(isDelegue || isReadOnly) ? '' : 'active:scale-95'}`}
                                        title={isReadOnly ? "Cliquer pour voir l'historique" : isDelegue ? "Cliquer pour voir l'historique" : `Ajouter à la Semaine ${activeWeek + 1}`}
                                    >
                                        <div className="pr-4">
                                            <div className="flex justify-between items-start">
                                                <p className="font-bold text-gray-800 text-sm leading-tight">{doctor.name}</p>
                                                {isVisited && (
                                                    <span className="text-[8px] bg-green-500 text-white px-1 py-0.5 rounded font-bold uppercase tracking-tighter">Visité</span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-500 mt-0.5">{doctor.specialty} • {doctor.governorate}</p>
                                        </div>
                                        {!isDelegue && !isReadOnly && (
                                            <div className="absolute top-1/2 -translate-y-1/2 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                            </div>
                                        )}
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
                                        onClick={() => {
                                            if (!isDelegue && !isReadOnly) moveItemToWeek(visit, activeWeek, 'Visit');
                                            setSelectedItemForDetails({ type: 'task', data: visit });
                                        }}
                                        className="w-full text-left p-3 bg-gray-50 rounded-xl border border-transparent hover:border-blue-200 hover:bg-blue-50/50 transition-all group relative"
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

                {/* Main Focus Area: Single Week Display */}
                <div className="lg:col-span-9 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                    {/* Navigation Tabs */}
                    <div className="flex border-b overflow-x-auto no-scrollbar">
                        {[0, 1, 2, 3, 4, 5].map(i => (
                            <button
                                key={i}
                                onClick={() => setActiveWeek(i)}
                                className={`flex-1 min-w-[120px] py-4 px-2 text-sm font-bold transition-all border-b-2 relative ${activeWeek === i
                                    ? `text-blue-600 border-blue-600 bg-blue-50/30`
                                    : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                Semaine {i + 1}
                                {weeks[i].length > 0 && (
                                    <span className="ml-2 bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full">
                                        {weeks[i].length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Active Week Content */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-gray-800">
                                <span className={`mr-2 inline-block w-3 h-8 rounded-full ${theme.bg}`}></span>
                                Détail de la Semaine {activeWeek + 1}
                            </h3>
                            <button
                                onClick={() => setActiveWeek(prev => (prev > 0 ? prev - 1 : 5))}
                                className="p-2 mr-2 bg-gray-100 rounded-full hover:bg-gray-200"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setActiveWeek(prev => (prev < 5 ? prev + 1 : 0))}
                                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>

                        {weeks[activeWeek].length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300 py-40">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-xl font-medium">Aucun médecin planifié cette semaine</p>
                                {!isDelegue && !isReadOnly && <p className="text-sm mt-1">Utilisez la liste à gauche pour ajouter des médecins</p>}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-separate border-spacing-y-2">
                                    <thead>
                                        <tr className="text-gray-400 text-xs font-bold uppercase tracking-wider">
                                            <th className="px-4 py-2">Médecin</th>
                                            <th className="px-4 py-2">Spécialité</th>
                                            <th className="px-4 py-2">Secteur</th>
                                            <th className="px-4 py-2 border-r border-transparent">Adresse</th>
                                            {!isDelegue && !isReadOnly && <th className="px-4 py-2 text-right">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {weeks[activeWeek].map((item, idx) => {
                                            const isDoctor = item.__type === 'Doctor';
                                            const doctorVisits = isDoctor ? visits.filter(v => v.doctorName === item.name) : [];
                                            const isVisited = isDoctor ? doctorVisits.length > 0 : true; // Visits are already "visited" in a way, or we can just say true
                                            const isSelected = selectedItemForDetails?.data?._id === item._id;

                                            return (
                                                <tr key={`${item._id}-${idx}`} className={`hover:bg-gray-50 transition-colors group ${isSelected ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/50' : isVisited && isDoctor ? 'bg-green-50/70' : 'bg-white'}`}>
                                                    <td className="px-4 py-4 first:rounded-l-2xl border-y border-l border-gray-100 font-bold text-gray-900 cursor-pointer hover:text-blue-600" onClick={() => setSelectedItemForDetails({ type: isDoctor ? 'doctor' : 'task', data: item })}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs ${isVisited && isDoctor ? 'bg-green-500' : isDoctor ? theme.bg : 'bg-purple-500'}`}>
                                                                {isDoctor ? item.name.charAt(0) : 'T'}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    {isDoctor ? item.name : (item.pharmacyName || item.wholesalerName || item.visitName || 'Tâche')}
                                                                    {isVisited && isDoctor && (
                                                                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full border border-green-200 uppercase tracking-tighter">Visité</span>
                                                                    )}
                                                                    {!isDoctor && (
                                                                        <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full border border-purple-200 uppercase tracking-tighter">
                                                                            {item.targetType === 'pharmacie' ? 'Pharmacie' : 'Grossiste'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] text-blue-500 font-medium whitespace-nowrap">
                                                                    {isDoctor ? `${doctorVisits.length} visite(s) - Cliquer pour historique` : (item.details || 'Voir détails')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 border-y border-gray-100 text-gray-600">
                                                        {isDoctor ? item.specialty : (item.visitName || 'Tâche')}
                                                    </td>
                                                    <td className="px-4 py-4 border-y border-gray-100 text-gray-600">
                                                        {isDoctor ? item.governorate : (item.pharmacyName || item.wholesalerName || '-')}
                                                    </td>
                                                    <td className="px-4 py-4 border-y border-gray-100 text-gray-500 text-xs max-w-[200px] truncate">
                                                        {isDoctor ? (item.address || '-') : (item.details || '-')}
                                                    </td>
                                                    {!isDelegue && !isReadOnly && (
                                                        <td className="px-4 py-4 last:rounded-r-2xl border-y border-r border-gray-100 text-right">
                                                            <button
                                                                onClick={() => removeFromWeek(activeWeek, item._id)}
                                                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Retirer du cycle"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
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
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-gray-500 font-bold bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all">Fermer</button>
                                    <button type="submit" className={`flex-1 py-4 text-white font-bold rounded-2xl ${theme.bg} ${theme.bgHover} shadow-lg transition-all`}>Enregistrer</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {/* Footer Details Panel */}
            {
                selectedItemForDetails && (
                    <div className="bg-white border-t-2 border-blue-500 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-300 sticky bottom-0 z-40">
                        <div className="max-w-7xl mx-auto p-4 md:p-6">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${theme.bg}`}>
                                        {selectedItemForDetails.type === 'doctor' ? selectedItemForDetails.data.name.charAt(0) : 'T'}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900 leading-tight">
                                            {selectedItemForDetails.type === 'doctor' ? 'Historique des Visites' :
                                                selectedItemForDetails.data.targetType === 'pharmacie' ? 'Détails Pharmacie' :
                                                    selectedItemForDetails.data.targetType === 'grossiste' ? 'Détails Grossiste' :
                                                        'Détails de la Tâche'}
                                        </h3>
                                        <p className="text-sm font-medium text-blue-600">
                                            {selectedItemForDetails.type === 'doctor'
                                                ? `Dr. ${selectedItemForDetails.data.name} • ${selectedItemForDetails.data.specialty}`
                                                : `${selectedItemForDetails.data.targetType === 'pharmacie' ? (selectedItemForDetails.data.pharmacyName || 'Pharmacie') :
                                                    selectedItemForDetails.data.targetType === 'grossiste' ? (selectedItemForDetails.data.wholesalerName || 'Grossiste') :
                                                        (selectedItemForDetails.data.visitName || 'Tâche generic')} • ${new Date(selectedItemForDetails.data.start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
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
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Type de visite</label>
                                                <p className="text-sm font-bold text-gray-800 capitalize">
                                                    {selectedItemForDetails.data.targetType === 'pharmacie' ? '🏥 Pharmacie' :
                                                        selectedItemForDetails.data.targetType === 'grossiste' ? '🏢 Grossiste' :
                                                            selectedItemForDetails.data.targetType === 'autre' ? '📋 Tâche' : selectedItemForDetails.data.targetType}
                                                </p>
                                                {selectedItemForDetails.data.targetType === 'pharmacie' && <p className="text-sm text-gray-600">{selectedItemForDetails.data.pharmacyName}</p>}
                                                {selectedItemForDetails.data.targetType === 'grossiste' && <p className="text-sm text-gray-600">{selectedItemForDetails.data.wholesalerName}</p>}
                                                {selectedItemForDetails.data.visitName && <p className="text-sm text-gray-600 italic">{selectedItemForDetails.data.visitName}</p>}
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
