import React, { useState, useCallback, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
    'fr': fr,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

export default function CalendarView({ dashboardId, viewUser }) {
    const [view, setView] = useState(Views.MONTH);
    const [date, setDate] = useState(new Date()); // Default to current date
    const [isProcessing, setIsProcessing] = useState(false); // New state to prevent duplicates
    const [eventsData, setEventsData] = useState([]); // Start empty, fetch from DB
    const [showModal, setShowModal] = useState(false);
    const [newEvent, setNewEvent] = useState({
        title: '',
        start: null,
        end: null,
        visitName: 'privée',
        visitTime: '',
        targetType: '',
        details: '',
        // Specific fields
        governorate: '',
        specialty: '',
        doctorName: '',
        address: '',
        pharmacyName: '',
        wholesalerName: '',
        givenSamples: []
    });
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [userSamples, setUserSamples] = useState([]);
    const [doctors, setDoctors] = useState([]); // Master list for autocomplete
    const [pharmacies, setPharmacies] = useState([]); // Master list for autocomplete
    const [wholesalers, setWholesalers] = useState([]); // Master list for autocomplete
    const [pendingMaterial, setPendingMaterial] = useState(''); // Temp selected material value
    const [pendingQty, setPendingQty] = useState(1); // Temp quantity to add
    const [pendingSampleQty, setPendingSampleQty] = useState(1); // Quantity for sample

    const onNavigate = useCallback((newDate) => setDate(newDate), [setDate]);
    const onView = useCallback((newView) => setView(newView), [setView]);

    const handleSelectSlot = useCallback(({ start, end }) => {
        setNewEvent({
            title: '',
            start,
            end,
            visitName: 'privée',
            visitTime: '09:00',
            targetType: '',
            details: '',
            governorate: '',
            specialty: '',
            doctorName: '',
            address: '',
            pharmacyName: '',
            wholesalerName: '',
            givenSamples: []
        });
        setSelectedEvent(null); // Clear selection when creating new
        setShowModal(true);
    }, []);

    const handleSelectEvent = useCallback((event) => {
        setSelectedEvent({ ...event }); // Copy event data to editing state
    }, []);

    // Fetch user profile to get samples
    const fetchUserSamples = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch('/api/auth/me', {
                headers: { 'x-auth-token': token }
            });
            if (res.ok) {
                const data = await res.json();
                setUserSamples(data.samples || []);
            }
        } catch (err) {
            console.error('Error fetching user samples:', err);
        }
    };

    const fetchDoctors = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch('/api/doctors', { headers: { 'x-auth-token': token } });
            if (res.ok) setDoctors(await res.json());
        } catch (err) { console.error('Error fetching doctors:', err); }
    };

    const fetchPharmacies = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch('/api/pharmacies', { headers: { 'x-auth-token': token } });
            if (res.ok) setPharmacies(await res.json());
        } catch (err) { console.error('Error fetching pharmacies:', err); }
    };

    const fetchWholesalers = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch('/api/wholesalers', { headers: { 'x-auth-token': token } });
            if (res.ok) setWholesalers(await res.json());
        } catch (err) { console.error('Error fetching wholesalers:', err); }
    };

    useEffect(() => {
        fetchUserSamples();
        fetchDoctors();
        fetchPharmacies();
        fetchWholesalers();
        if (eventsData.length > 0 && !eventsData[0].id) {
            setEventsData(prev => prev.map((e, i) => ({ ...e, id: i })));
        }
    }, [showModal, selectedEvent]); // Refresh data when create or edit modal opens

    // Fetch Visits from Backend
    const fetchVisits = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            let url = `/api/visits?dashboardId=${dashboardId}`;
            if (viewUser) {
                url += `&viewUser=${viewUser}`;
            }

            const res = await fetch(url, {
                headers: { 'x-auth-token': token }
            });
            const data = await res.json();

            // Convert strings to Date objects
            const formattedEvents = data.map(event => ({
                ...event,
                id: event._id, // Map _id to id for big-calendar
                start: new Date(event.start),
                end: new Date(event.end)
            }));

            setEventsData(formattedEvents);
        } catch (err) {
            console.error('Error fetching visits:', err);
        }
    }, [dashboardId, viewUser]);

    useEffect(() => {
        fetchVisits();
    }, [fetchVisits]);

    const validateVisit = (event) => {
        if (!event.details || event.details.trim() === '') {
            alert("Le champ 'Détails de la tâche' est obligatoire.");
            return false;
        }
        return true;
    };

    const handleSaveEvent = async () => {
        if (!validateVisit(newEvent)) return;

        // Construct title based on selection
        let displayTitle = newEvent.visitName || 'Tâche';
        if (newEvent.targetType === 'medecin' && newEvent.doctorName) displayTitle += ` - Dr. ${newEvent.doctorName}`;
        else if (newEvent.targetType === 'pharmacie' && newEvent.pharmacyName) displayTitle += ` - Ph. ${newEvent.pharmacyName}`;
        else if (newEvent.targetType === 'grossiste' && newEvent.wholesalerName) displayTitle += ` - Gr. ${newEvent.wholesalerName}`;

        if (displayTitle) {
            // Adjust start time based on visitTime
            const timeStr = newEvent.visitTime || '09:00';
            const [hours, minutes] = timeStr.split(':');
            const startDate = new Date(newEvent.start);
            startDate.setHours(parseInt(hours), parseInt(minutes));

            // End time + 1 hour
            const endDate = new Date(startDate);
            endDate.setHours(startDate.getHours() + 1);

            const eventToSave = {
                ...newEvent,
                dashboardId,
                title: displayTitle,
                start: startDate,
                end: endDate
            };

            // Save to Backend
            try {
                setIsProcessing(true);
                const token = localStorage.getItem('token');
                const res = await fetch('/api/visits', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token
                    },
                    body: JSON.stringify(eventToSave)
                });

                if (res.ok) {
                    const savedEvent = await res.json();
                    setEventsData([...eventsData, {
                        ...savedEvent,
                        id: savedEvent._id,
                        start: new Date(savedEvent.start),
                        end: new Date(savedEvent.end)
                    }]);
                    setShowModal(false);
                } else {
                    const err = await res.json();
                    alert(err.msg || 'Erreur lors de la sauvegarde');
                }
            } catch (err) {
                console.error('Error saving visit:', err);
                alert('Erreur réseau lors de la sauvegarde.');
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const dayPropGetter = useCallback((date) => {
        const dayEvents = eventsData.filter(evt => {
            const evtDate = new Date(evt.start);
            return evtDate.getDate() === date.getDate() &&
                evtDate.getMonth() === date.getMonth() &&
                evtDate.getFullYear() === date.getFullYear();
        });

        const totalVisits = dayEvents.length;

        if (totalVisits === 0) return {}; // No color for empty days

        const privateVisits = dayEvents.filter(evt => evt.visitName === 'privée').length;

        const isSuccess = totalVisits >= 10 && privateVisits >= 7;

        // Red if started but not success, Green if success
        const backgroundColor = isSuccess ? '#dcfce7' : '#fee2e2'; // green-100 : red-100
        const style = {
            backgroundColor,
        };

        return { style };
    }, [eventsData]);

    const handleUpdateEvent = async () => {
        if (!selectedEvent) return;
        if (!validateVisit(selectedEvent)) return;
        let displayTitle = selectedEvent.visitName || 'Tâche';
        if (selectedEvent.targetType === 'medecin' && selectedEvent.doctorName) displayTitle += ` - Dr. ${selectedEvent.doctorName}`;
        else if (selectedEvent.targetType === 'pharmacie' && selectedEvent.pharmacyName) displayTitle += ` - Ph. ${selectedEvent.pharmacyName}`;
        else if (selectedEvent.targetType === 'grossiste' && selectedEvent.wholesalerName) displayTitle += ` - Gr. ${selectedEvent.wholesalerName}`;

        const updatedEvent = {
            ...selectedEvent,
            title: displayTitle
        };

        // Update Backend
        try {
            setIsProcessing(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/visits/${selectedEvent.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify(updatedEvent)
            });

            if (res.ok) {
                const savedEvent = await res.json();
                const formattedEvent = {
                    ...savedEvent,
                    id: savedEvent._id,
                    start: new Date(savedEvent.start),
                    end: new Date(savedEvent.end)
                };

                setEventsData(prev => prev.map(evt => evt.id === formattedEvent.id ? formattedEvent : evt));
                setSelectedEvent(null);
            } else {
                const err = await res.json();
                alert(err.msg || 'Erreur lors de la mise à jour');
            }
        } catch (err) {
            console.error('Error updating visit:', err);
            alert('Erreur réseau lors de la mise à jour.');
        } finally {
            setIsProcessing(false);
        }
    }

    const handleDeleteEvent = async () => {
        const eventId = selectedEvent.id || selectedEvent._id;
        if (!eventId) {
            alert("Erreur: Impossible de trouver l'identifiant de la visite.");
            return;
        }

        if (window.confirm('Voulez-vous vraiment supprimer cette visite ?')) {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/visits/${eventId}`, {
                    method: 'DELETE',
                    headers: {
                        'x-auth-token': token
                    }
                });

                if (res.ok) {
                    setEventsData(prev => prev.filter(evt => (evt.id || evt._id) !== eventId));
                    setSelectedEvent(null);
                    fetchUserSamples();
                } else {
                    let errorMessage = 'Erreur lors de la suppression';
                    try {
                        const err = await res.json();
                        errorMessage = err.msg || errorMessage;
                    } catch (e) {
                        // Error parsing JSON
                    }
                    alert(errorMessage);
                }
            } catch (err) {
                console.error('Error deleting visit:', err);
                alert('Erreur réseau ou serveur lors de la suppression.');
            }
        }
    };
    // If viewUser is present (Read-Only Mode), disable interactions
    const isReadOnly = !!viewUser;

    return (
        <div className="relative flex flex-col gap-6">
            {/* Calendar wrapper — fluid height */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
                height: 'calc(100vh - 180px)',
                minHeight: '520px',
                display: 'flex',
                flexDirection: 'column',
            }}>
                <Calendar
                    localizer={localizer}
                    events={eventsData}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ flex: 1, minHeight: 0 }}
                    culture="fr"
                    views={['month', 'week', 'day']}
                    view={view}
                    onView={setView}
                    date={date}
                    onNavigate={setDate}
                    selectable={!isReadOnly}
                    onSelectSlot={!isReadOnly ? handleSelectSlot : undefined}
                    onSelectEvent={handleSelectEvent}
                    dayPropGetter={dayPropGetter}
                    messages={{
                        next: "Suivant",
                        previous: "Précédent",
                        today: "Aujourd'hui",
                        month: "Mois",
                        week: "Semaine",
                        day: "Jour"
                    }}
                />

                {
                    showModal && (
                        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[550px] max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 animate-fade-up">
                                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <h3 className="text-lg font-bold text-gray-800">✍️ Nouvelle Visite</h3>
                                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100">✕</button>
                                </div>

                                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                                    <div className="grid grid-cols-2 gap-4 mb-5">
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Type de visite</label>
                                            <select
                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                                value={newEvent.visitName}
                                                onChange={(e) => setNewEvent({ ...newEvent, visitName: e.target.value })}
                                            >
                                                <option value="privée">Privée</option>
                                                <option value="publique">Publique</option>
                                                <option value="hospitalier">Hospitalier</option>
                                                <option value="pharmacie">Pharmacie</option>
                                                <option value="grossiste">Grossiste</option>
                                                <option value="cnam">CNAM</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Heure prévue</label>
                                            <input
                                                type="time"
                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                                value={newEvent.visitTime}
                                                onChange={(e) => setNewEvent({ ...newEvent, visitTime: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Cible de la visite</label>
                                        <div className="flex p-1 bg-gray-100 rounded-xl gap-1">
                                            {['medecin', 'pharmacie', 'grossiste'].map((type) => (
                                                <button
                                                    key={type}
                                                    onClick={() => setNewEvent({ ...newEvent, targetType: type })}
                                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${newEvent.targetType === type ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                                                >
                                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {newEvent.targetType && (
                                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 mb-6 space-y-4 animate-in fade-in slide-in-from-top-2">
                                            {newEvent.targetType === 'medecin' && (
                                                <>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Gouvernerat</label>
                                                            <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={newEvent.governorate} onChange={(e) => setNewEvent({ ...newEvent, governorate: e.target.value })} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Spécialité</label>
                                                            <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={newEvent.specialty} onChange={(e) => setNewEvent({ ...newEvent, specialty: e.target.value })} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nom du Médecin</label>
                                                        <input
                                                            type="text"
                                                            list="doctor-options"
                                                            placeholder="Rechercher ou saisir..."
                                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                                            value={newEvent.doctorName}
                                                            onChange={(e) => {
                                                                const name = e.target.value;
                                                                const found = doctors.find(d => d.name === name);
                                                                setNewEvent({
                                                                    ...newEvent,
                                                                    doctorName: name,
                                                                    ...(found ? { governorate: found.governorate || newEvent.governorate, specialty: found.specialty || newEvent.specialty, address: found.address || newEvent.address } : {})
                                                                });
                                                            }}
                                                        />
                                                        <datalist id="doctor-options">{doctors.map(d => <option key={d._id} value={d.name} />)}</datalist>
                                                    </div>
                                                </>
                                            )}
                                            {newEvent.targetType === 'pharmacie' && (
                                                <>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Pharmacie</label>
                                                        <input
                                                            type="text"
                                                            list="pharmacy-options"
                                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                                            value={newEvent.pharmacyName}
                                                            onChange={(e) => {
                                                                const name = e.target.value;
                                                                const found = pharmacies.find(p => p.name === name);
                                                                setNewEvent({ ...newEvent, pharmacyName: name, ...(found ? { governorate: found.governorate || newEvent.governorate, address: found.address || newEvent.address } : {}) });
                                                            }}
                                                        />
                                                        <datalist id="pharmacy-options">{pharmacies.map(p => <option key={p._id} value={p.name} />)}</datalist>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Gouvernerat</label>
                                                        <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={newEvent.governorate} onChange={(e) => setNewEvent({ ...newEvent, governorate: e.target.value })} />
                                                    </div>
                                                </>
                                            )}
                                            {newEvent.targetType === 'grossiste' && (
                                                <>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Grossiste</label>
                                                        <input
                                                            type="text"
                                                            list="wholesaler-options"
                                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                                            value={newEvent.wholesalerName}
                                                            onChange={(e) => {
                                                                const name = e.target.value;
                                                                const found = wholesalers.find(w => w.name === name);
                                                                setNewEvent({ ...newEvent, wholesalerName: name, ...(found ? { governorate: found.governorate || newEvent.governorate, address: found.address || newEvent.address } : {}) });
                                                            }}
                                                        />
                                                        <datalist id="wholesaler-options">{wholesalers.map(w => <option key={w._id} value={w.name} />)}</datalist>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Gouvernerat</label>
                                                        <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={newEvent.governorate} onChange={(e) => setNewEvent({ ...newEvent, governorate: e.target.value })} />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    <div className="mb-6 space-y-4">
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">📦 Échantillons Distribués</label>
                                            <div className="flex gap-2 mb-3">
                                                <select
                                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={pendingMaterial} // Re-using pendingMaterial for sample select temp state
                                                    onChange={(e) => setPendingMaterial(e.target.value)}
                                                >
                                                    <option value="">-- Choisir un échantillon --</option>
                                                    {userSamples.filter(s => s.count > 0 && (s.itemType || 'sample') === 'sample').map((s, idx) => (
                                                        <option key={idx} value={`${s.name}|${s.batchNumber || ''}`}>
                                                            📦 {s.name} ({s.count})
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => {
                                                        if (!pendingMaterial) return;
                                                        const [name, batch] = pendingMaterial.split('|');
                                                        const updated = [...newEvent.givenSamples];
                                                        const idx = updated.findIndex(s => s.name === name && s.batchNumber === batch);
                                                        if (idx > -1) updated[idx].count += 1;
                                                        else updated.push({ name, batchNumber: batch, count: 1 });
                                                        setNewEvent({ ...newEvent, givenSamples: updated });
                                                        setPendingMaterial('');
                                                    }}
                                                    className="px-4 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition-colors"
                                                >+ Ajouter</button>
                                            </div>
                                        </div>

                                        {newEvent.givenSamples.length > 0 && (
                                            <div className="space-y-2">
                                                {newEvent.givenSamples.map((s, i) => (
                                                    <div key={i} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                                                        <span className="text-sm font-bold text-blue-800">📦 {s.name}</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black">x{s.count}</span>
                                                            <button
                                                                onClick={() => setNewEvent(p => ({ ...p, givenSamples: p.givenSamples.filter((_, idx) => idx !== i) }))}
                                                                className="text-red-400 hover:text-red-600 font-bold"
                                                            >✕</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-8">
                                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">✍️ Rapport de visite</label>
                                        <textarea
                                            placeholder="Libellé du compte rendu..."
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 bg-gray-50/50"
                                            value={newEvent.details}
                                            onChange={(e) => setNewEvent({ ...newEvent, details: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
                                        <button
                                            onClick={handleSaveEvent}
                                            disabled={isProcessing}
                                            className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-lg ${isProcessing ? 'bg-gray-300' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 hover:shadow-xl'}`}
                                        >
                                            {isProcessing ? 'Enregistrement...' : 'Confirmer la visite'}
                                        </button>
                                        <button
                                            onClick={() => setShowModal(false)}
                                            className="w-full py-3 border border-gray-200 rounded-xl text-gray-400 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-colors"
                                        >
                                            Annuler
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {selectedEvent && (
                    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[550px] max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 animate-fade-up">
                            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-lg font-bold text-gray-800">🔍 Détails de la visite</h3>
                                <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-gray-900 p-1 rounded-full hover:bg-gray-100">✕</button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                                <div className="grid grid-cols-2 gap-4 mb-5">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 uppercase mb-1.5">Nom</label>
                                        <select disabled={isReadOnly} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50" value={selectedEvent.visitName || 'privée'} onChange={(e) => setSelectedEvent({ ...selectedEvent, visitName: e.target.value })}>
                                            <option value="privée">Privée</option><option value="publique">Publique</option><option value="hospitalier">Hospitalier</option><option value="pharmacie">Pharmacie</option><option value="grossiste">Grossiste</option><option value="cnam">CNAM</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <label className="block text-sm font-bold text-gray-400 mb-1.5">Type</label>
                                        <div className="flex gap-2">
                                            {['Dr', 'Ph', 'Gr'].map(t => (
                                                <span key={t} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${selectedEvent.targetType?.startsWith(t.toLowerCase().substring(0, 2)) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="col-span-1">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Ville</label>
                                        <p className="text-sm font-bold text-gray-700">{selectedEvent.governorate || '—'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cible</label>
                                        <p className="text-sm font-black text-blue-600 truncate">{selectedEvent.doctorName || selectedEvent.pharmacyName || selectedEvent.wholesalerName || 'Non spécifié'}</p>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">📦 Échantillons Distribués</label>
                                    <div className="space-y-2">
                                        {!isReadOnly && (
                                            <div className="flex gap-2 mb-3">
                                                <select
                                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                                                    value={pendingMaterial}
                                                    onChange={(e) => setPendingMaterial(e.target.value)}
                                                >
                                                    <option value="">-- Ajouter un échantillon --</option>
                                                    {userSamples.filter(s => (s.itemType || 'sample') === 'sample').map((s, idx) => (
                                                        <option key={idx} value={`${s.name}|${s.batchNumber || ''}`}>
                                                            📦 {s.name} ({s.count})
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => {
                                                        if (!pendingMaterial) return;
                                                        const [name, batch] = pendingMaterial.split('|');
                                                        const updated = [...(selectedEvent.givenSamples || [])];
                                                        const idx = updated.findIndex(s => s.name === name && s.batchNumber === batch);
                                                        if (idx > -1) updated[idx].count += 1;
                                                        else updated.push({ name, batchNumber: batch, count: 1 });
                                                        setSelectedEvent({ ...selectedEvent, givenSamples: updated });
                                                        setPendingMaterial('');
                                                    }}
                                                    className="px-3 bg-blue-600 text-white rounded-lg font-bold text-xs"
                                                >+ Add</button>
                                            </div>
                                        )}
                                        {((selectedEvent.givenSamples && selectedEvent.givenSamples.length > 0) || selectedEvent.givenSampleName) ? (
                                            <div className="space-y-2">
                                                {/* Display legacy sample if it exists */}
                                                {selectedEvent.givenSampleName && (
                                                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                                                        <span className="text-sm font-bold text-amber-800">📦 {selectedEvent.givenSampleName} (Legacy)</span>
                                                        <span className="bg-amber-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black">x{selectedEvent.givenSampleQty || 1}</span>
                                                    </div>
                                                )}
                                                {/* Display new multi-samples */}
                                                {(selectedEvent.givenSamples || []).map((s, i) => (
                                                    <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                                                        <span className="text-sm font-bold text-green-800">📦 {s.name}</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="bg-green-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black">x{s.count}</span>
                                                            {!isReadOnly && (
                                                                <button
                                                                    onClick={() => setSelectedEvent(p => ({ ...p, givenSamples: p.givenSamples.filter((_, idx) => idx !== i) }))}
                                                                    className="text-red-400 hover:text-red-600 font-bold"
                                                                >✕</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {/* Legacy materials check for UI cleanup */}
                                                {selectedEvent.givenMaterials?.length > 0 && !isReadOnly && (
                                                    <p className="text-[9px] text-gray-400 italic">Note: Le matériel (cadeaux) sera retiré lors de l'enregistrement.</p>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 italic">Aucun échantillon distribué.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">✍️ Rapport Final</label>
                                    <textarea
                                        disabled={isReadOnly}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 bg-gray-50/50 italic text-gray-600"
                                        value={selectedEvent.details || ''}
                                        onChange={(e) => setSelectedEvent({ ...selectedEvent, details: e.target.value })}
                                    />
                                </div>

                                <div className="flex flex-col gap-3 pt-6 border-t border-gray-100">
                                    {!isReadOnly && (
                                        <button
                                            onClick={handleUpdateEvent}
                                            disabled={isProcessing}
                                            className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-lg ${isProcessing ? 'bg-gray-300' : 'bg-green-600 text-white hover:bg-green-700 shadow-green-200 hover:shadow-xl'}`}
                                        >
                                            {isProcessing ? 'Enregistrement...' : 'Enregistrer les modifications'}
                                        </button>
                                    )}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setSelectedEvent(null)}
                                            className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-colors"
                                        >
                                            Fermer
                                        </button>
                                        {!isReadOnly && (
                                            <button
                                                onClick={handleDeleteEvent}
                                                className="px-4 py-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                                                title="Supprimer"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
