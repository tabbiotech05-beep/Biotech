import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getMondayOfWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
}

function getWeekLabel(monday) {
    const d = new Date(monday);
    const sunday = new Date(d);
    sunday.setDate(d.getDate() + 6);

    const formatName = (dt) => dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return `S. du ${formatName(d)} au ${formatName(sunday)}`;
}

function toInputDate(date) {
    return new Date(date).toISOString().slice(0, 10);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SectorisationAdminView() {
    const token = localStorage.getItem('token');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Data state
    const [allDelegates, setAllDelegates] = useState([]); // Base list of delegates
    const [currentWeekData, setCurrentWeekData] = useState([]); // Detailed sectorisations for active week
    const [availableWeeks, setAvailableWeeks] = useState([]); // List of week strings (YYYY-MM-DD)
    
    // UI state
    const [activeWeekDate, setActiveWeekDate] = useState(""); 
    const [selectedDelegate, setSelectedDelegate] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Form state for selected delegate
    const [formData, setFormData] = useState({ secteur: '', remarque: '' });

    // Toast
    const [toast, setToast] = useState(null);
    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Calculate initial dynamic weeks: Current and Next week
    const getInitialWeeks = useCallback(() => {
        const today = new Date();
        const currentMonday = getMondayOfWeek(today);
        
        const nextWeek = new Date(currentMonday);
        nextWeek.setDate(currentMonday.getDate() + 7);
        
        const prevWeek = new Date(currentMonday);
        prevWeek.setDate(currentMonday.getDate() - 7);

        return [
            toInputDate(nextWeek),
            toInputDate(currentMonday),
            toInputDate(prevWeek)
        ];
    }, []);

    // 1. Fetch weeks history
    const loadWeeks = useCallback(async () => {
        try {
            const res = await axios.get('/api/sectorisation/weeks', {
                headers: { 'x-auth-token': token }
            });
            const fetchedWeeks = res.data.map(w => toInputDate(w.weekStart));
            
            // Merge fetched weeks with Current and Next week, remove duplicates, sort descending
            const combined = [...new Set([...getInitialWeeks(), ...fetchedWeeks])];
            combined.sort((a, b) => new Date(b) - new Date(a));
            
            setAvailableWeeks(combined);
            
            // Set active week to current week if none selected
            if (!activeWeekDate) {
                setActiveWeekDate(toInputDate(getMondayOfWeek(new Date())));
            }
        } catch (err) {
            console.error(err);
            showToast('Erreur de chargement des semaines', 'error');
        }
    }, [token, activeWeekDate, getInitialWeeks]);

    // 2. Fetch sectorisation data for the active week
    const loadWeekData = useCallback(async (weekStart) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/sectorisation?weekStart=${weekStart}`, {
                headers: { 'x-auth-token': token }
            });
            const sectorisations = res.data.sectorisations || [];
            
            // We use sectorisations to get the base delegate list (it returns all Tenshi delegates)
            setAllDelegates(sectorisations.map(s => ({
                id: s.delegueId,
                name: s.delegueName,
                profileImage: s.profileImage
            })));
            
            setCurrentWeekData(sectorisations);
            
            // If a delegate is currently selected, refresh its form data
            if (selectedDelegate) {
                const updatedSec = sectorisations.find(s => s.delegueId === selectedDelegate.id);
                if (updatedSec) {
                    setFormData({
                        secteur: updatedSec.secteur || '',
                        remarque: updatedSec.remarque || ''
                    });
                }
            }
        } catch (err) {
            console.error(err);
            showToast('Erreur lors du chargement des données de la semaine', 'error');
        } finally {
            setLoading(false);
        }
    }, [token, selectedDelegate]);

    useEffect(() => {
        loadWeeks();
    }, [loadWeeks]);

    useEffect(() => {
        if (activeWeekDate) {
            loadWeekData(activeWeekDate);
        }
    }, [activeWeekDate, loadWeekData]);

    const handleSelectDelegate = (delegate) => {
        setSelectedDelegate(delegate);
        const dataForDelegate = currentWeekData.find(s => s.delegueId === delegate.id);
        setFormData({
            secteur: dataForDelegate?.secteur || '',
            remarque: dataForDelegate?.remarque || ''
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!selectedDelegate || !activeWeekDate) return;
        
        setSaving(true);
        try {
            // We save only the selected delegate to the API. 
            // The API expects an array and will upsert only this one.
            const payload = {
                weekStart: activeWeekDate,
                sectorisations: [{
                    delegueId: selectedDelegate.id,
                    delegueName: selectedDelegate.name,
                    secteur: formData.secteur,
                    remarque: formData.remarque
                }]
            };

            await axios.post('/api/sectorisation', payload, {
                headers: { 'x-auth-token': token }
            });
            
            showToast('Sectorisation enregistrée ✓');
            
            // Reload the week data to update the sidebar indicators
            loadWeekData(activeWeekDate);
            // Also refresh weeks list in case we just added data to a new week
            loadWeeks();
            
        } catch (err) {
            showToast(err.response?.data?.message || 'Erreur lors de la sauvegarde', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Filter delegates for the sidebar
    const filteredDelegates = allDelegates.filter(d => 
        d.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isPastWeek = useMemo(() => {
        if (!activeWeekDate) return false;
        const todayMonday = getMondayOfWeek(new Date());
        const activeMonday = new Date(activeWeekDate);
        // It's strictly past if it's before this week's Monday
        return activeMonday < todayMonday;
    }, [activeWeekDate]);

    return (
        <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-500">
            {/* Toast Component */}
            {toast && (
                <div style={{
                    position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
                    padding: '0.9rem 1.5rem', borderRadius: '14px', fontWeight: 700,
                    fontSize: '0.9rem', boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                    background: toast.type === 'error' ? '#ef4444' : '#10b981',
                    color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}>
                    {toast.type === 'error' ? '✗' : '✓'} {toast.msg}
                </div>
            )}

            {/* Read-Only Banner */}
            {isPastWeek && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-2xl shadow-sm flex items-center gap-3">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-yellow-700"> Mode Lecture Seule : Visualisation de l'historique d'une <span className="font-bold">semaine passée</span>.</p>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                        <span className="text-indigo-600">🗺️</span>
                        Sectorisation des Délégués Tenshi
                    </h2>
                    <p className="text-sm text-gray-500">Planifiez et assignez les secteurs d'activité semaine par semaine</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-250px)]">
                {/* Sidebar: List of Delegates */}
                <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
                        <span className="text-gray-400">👥</span>
                        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Équipe Tenshi</h3>
                    </div>
                    <div className="p-4 border-b">
                        <input
                            type="text"
                            placeholder="Rechercher un délégué..."
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {loading && allDelegates.length === 0 ? (
                            <div className="text-center text-sm text-gray-400 py-10">Chargement...</div>
                        ) : filteredDelegates.length === 0 ? (
                            <div className="text-center text-sm text-gray-400 py-10">Aucun délégué trouvé</div>
                        ) : (
                            filteredDelegates.map(delegate => {
                                const delegateData = currentWeekData.find(s => s.delegueId === delegate.id);
                                const isAssigned = !!delegateData?.secteur;
                                const isSelected = selectedDelegate?.id === delegate.id;

                                return (
                                    <button
                                        key={delegate.id}
                                        onClick={() => handleSelectDelegate(delegate)}
                                        className={`w-full text-left p-3 rounded-xl border transition-all group relative 
                                            ${isSelected ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' :
                                              isAssigned ? 'bg-green-50/50 border-green-100 hover:border-green-300' : 
                                              'bg-gray-50 border-transparent hover:border-indigo-200 hover:bg-indigo-50/50'
                                            } active:scale-95`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs flex-shrink-0
                                                ${isSelected ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                                {delegate.profileImage ? (
                                                    <img 
                                                        src={delegate.profileImage.startsWith('http') ? delegate.profileImage : `/${delegate.profileImage.replace(/^\//, '')}`} 
                                                        alt={delegate.name}
                                                        className="w-full h-full object-cover rounded-full"
                                                        onError={e => e.target.style.display = 'none'}
                                                    />
                                                ) : delegate.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-800 text-sm leading-tight truncate">{delegate.name}</p>
                                                {isAssigned ? (
                                                    <p className="text-[10px] text-green-600 font-bold truncate mt-0.5">Secteur: {delegateData.secteur}</p>
                                                ) : (
                                                    <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5 italic">Non assigné</p>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Main Area: Week Selector & Edit Form */}
                <div className="lg:col-span-9 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                    {/* Navigation Selector (Dynamic) */}
                    <div className="p-4 border-b bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Période :</label>
                            <select 
                                className="px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-indigo-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[250px]"
                                value={activeWeekDate}
                                onChange={(e) => setActiveWeekDate(e.target.value)}
                                disabled={loading}
                            >
                                {availableWeeks.map((weekDate) => {
                                    const isCurrent = weekDate === toInputDate(getMondayOfWeek(new Date()));
                                    return (
                                        <option key={weekDate} value={weekDate}>
                                            {getWeekLabel(weekDate)} {isCurrent ? '(Semaine Actuelle)' : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>

                    {/* Active Week Content */}
                    <div className="flex-1 p-6 md:p-10 overflow-y-auto bg-slate-50/50 relative">
                        {loading && !currentWeekData.length ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            </div>
                        ) : null}

                        {!selectedDelegate ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 py-20">
                                <span className="text-6xl mb-4 opacity-50">👈</span>
                                <p className="text-xl font-medium text-slate-500">Sélectionnez un délégué dans la liste</p>
                                <p className="text-sm mt-2 text-slate-400">pour visualiser et modifier sa sectorisation</p>
                            </div>
                        ) : (
                            <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50">
                                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl font-black shadow-inner">
                                        {selectedDelegate.profileImage ? (
                                            <img 
                                                src={selectedDelegate.profileImage.startsWith('http') ? selectedDelegate.profileImage : `/${selectedDelegate.profileImage.replace(/^\//, '')}`} 
                                                alt={selectedDelegate.name}
                                                className="w-full h-full object-cover rounded-2xl"
                                                onError={e => e.target.style.display = 'none'}
                                            />
                                        ) : selectedDelegate.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800">{selectedDelegate.name}</h3>
                                        <p className="text-sm font-bold text-indigo-500 mt-1">{getWeekLabel(activeWeekDate)}</p>
                                    </div>
                                </div>

                                <form onSubmit={handleSave} className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                            Secteur Affecté
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.secteur}
                                            onChange={e => setFormData({ ...formData, secteur: e.target.value })}
                                            placeholder="Ex: Tunis Nord, Bizerte..."
                                            disabled={isPastWeek}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                            Remarques / Consignes
                                        </label>
                                        <textarea
                                            value={formData.remarque}
                                            onChange={e => setFormData({ ...formData, remarque: e.target.value })}
                                            placeholder="Objectifs de la semaine, points d'attention particuliers..."
                                            disabled={isPastWeek}
                                            rows="4"
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                                        />
                                    </div>

                                    {!isPastWeek && (
                                        <div className="pt-4 flex justify-end">
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-70 flex items-center gap-2"
                                            >
                                                {saving ? (
                                                    <>
                                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        Enregistrement...
                                                    </>
                                                ) : (
                                                    <>
                                                        💾 Enregistrer la sectorisation
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
