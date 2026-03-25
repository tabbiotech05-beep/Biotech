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

const events = [


];

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
        givenSampleName: '',
        givenSampleBatch: '',
        givenSampleQty: 1,
        givenMaterialName: '',
        givenMaterialBatch: '',
        givenMaterials: []
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
            givenSampleName: '',
            givenSampleBatch: '',
            givenSampleQty: 1,
            givenMaterialName: '',
            givenMaterialBatch: '',
            givenMaterials: []
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
        <div className="flex flex-col gap-6">
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
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-lg py-4 px-2 overflow-hidden">
                            <div className="bg-white rounded-lg shadow-2xl w-full max-w-[550px] max-h-full overflow-hidden flex flex-col border border-gray-100">
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <h3 className="text-lg font-bold text-gray-800">Créer une nouvelle visite</h3>
                                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
                                </div>

                                <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">

                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Nom de la visite</label>
                                            <select
                                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Heure</label>
                                            <input
                                                type="time"
                                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={newEvent.visitTime}
                                                onChange={(e) => setNewEvent({ ...newEvent, visitTime: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Type de cible</label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center space-x-2 cursor-pointer text-sm">
                                                <input
                                                    type="radio"
                                                    name="targetType"
                                                    value="medecin"
                                                    checked={newEvent.targetType === 'medecin'}
                                                    onChange={(e) => setNewEvent({ ...newEvent, targetType: e.target.value })}
                                                    className="form-radio text-blue-600"
                                                />
                                                <span>Docteur</span>
                                            </label>
                                            <label className="flex items-center space-x-2 cursor-pointer text-sm">
                                                <input
                                                    type="radio"
                                                    name="targetType"
                                                    value="pharmacie"
                                                    checked={newEvent.targetType === 'pharmacie'}
                                                    onChange={(e) => setNewEvent({ ...newEvent, targetType: e.target.value })}
                                                    className="form-radio text-blue-600"
                                                />
                                                <span>Pharmacie</span>
                                            </label>
                                            <label className="flex items-center space-x-2 cursor-pointer text-sm">
                                                <input
                                                    type="radio"
                                                    name="targetType"
                                                    value="grossiste"
                                                    checked={newEvent.targetType === 'grossiste'}
                                                    onChange={(e) => setNewEvent({ ...newEvent, targetType: e.target.value })}
                                                    className="form-radio text-blue-600"
                                                />
                                                <span>Grossiste</span>
                                            </label>
                                        </div>
                                    </div>

                                    {newEvent.targetType === 'medecin' && (
                                        <div className="space-y-3 mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Gouvernerat</label>
                                                    <input
                                                        type="text"
                                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                                        value={newEvent.governorate}
                                                        onChange={(e) => setNewEvent({ ...newEvent, governorate: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Spécialité</label>
                                                    <input
                                                        type="text"
                                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                                        value={newEvent.specialty}
                                                        onChange={(e) => setNewEvent({ ...newEvent, specialty: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Médecin</label>
                                                    <input
                                                        type="text"
                                                        list="doctor-options"
                                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                                        value={newEvent.doctorName}
                                                        onChange={(e) => {
                                                            const name = e.target.value;
                                                            const found = doctors.find(d => d.name === name);
                                                            if (found) {
                                                                setNewEvent({
                                                                    ...newEvent,
                                                                    doctorName: name,
                                                                    governorate: found.governorate || newEvent.governorate,
                                                                    specialty: found.specialty || newEvent.specialty,
                                                                    address: found.address || newEvent.address
                                                                });
                                                            } else {
                                                                setNewEvent({ ...newEvent, doctorName: name });
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du Médecin</label>
                                                <input
                                                    type="text"
                                                    list="doctor-options"
                                                    className="w-full border border-gray-300 rounded px-3 py-2"
                                                    value={newEvent.doctorName}
                                                    onChange={(e) => {
                                                        const name = e.target.value;
                                                        const found = doctors.find(d => d.name === name);
                                                        if (found) {
                                                            setNewEvent({
                                                                ...newEvent,
                                                                doctorName: name,
                                                                governorate: found.governorate || newEvent.governorate,
                                                                specialty: found.specialty || newEvent.specialty,
                                                                address: found.address || newEvent.address
                                                            });
                                                        } else {
                                                            setNewEvent({ ...newEvent, doctorName: name });
                                                        }
                                                    }}
                                                />
                                                <datalist id="doctor-options">
                                                    {doctors.map(d => (
                                                        <option key={d._id} value={d.name} />
                                                    ))}
                                                </datalist>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-300 rounded px-3 py-2"
                                                    value={newEvent.address}
                                                    onChange={(e) => setNewEvent({ ...newEvent, address: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Conditional Fields for Pharmacie */}
                                    {newEvent.targetType === 'pharmacie' && (
                                        <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la pharmacie</label>
                                                <input
                                                    type="text"
                                                    list="pharmacy-options"
                                                    className="w-full border border-gray-300 rounded px-3 py-2"
                                                    value={newEvent.pharmacyName}
                                                    onChange={(e) => {
                                                        const name = e.target.value;
                                                        const found = pharmacies.find(p => p.name === name);
                                                        if (found) {
                                                            setNewEvent({
                                                                ...newEvent,
                                                                pharmacyName: name,
                                                                governorate: found.governorate || newEvent.governorate,
                                                                address: found.address || newEvent.address
                                                            });
                                                        } else {
                                                            setNewEvent({ ...newEvent, pharmacyName: name });
                                                        }
                                                    }}
                                                />
                                                <datalist id="pharmacy-options">
                                                    {pharmacies.map(p => (
                                                        <option key={p._id} value={p.name} />
                                                    ))}
                                                </datalist>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Gouvernerat</label>
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-300 rounded px-3 py-2"
                                                    value={newEvent.governorate}
                                                    onChange={(e) => setNewEvent({ ...newEvent, governorate: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Conditional Fields for Grossiste */}
                                    {newEvent.targetType === 'grossiste' && (
                                        <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du grossiste</label>
                                                <input
                                                    type="text"
                                                    list="wholesaler-options"
                                                    className="w-full border border-gray-300 rounded px-3 py-2"
                                                    value={newEvent.wholesalerName}
                                                    onChange={(e) => {
                                                        const name = e.target.value;
                                                        const found = wholesalers.find(w => w.name === name);
                                                        if (found) {
                                                            setNewEvent({
                                                                ...newEvent,
                                                                wholesalerName: name,
                                                                governorate: found.governorate || newEvent.governorate,
                                                                address: found.address || newEvent.address
                                                            });
                                                        } else {
                                                            setNewEvent({ ...newEvent, wholesalerName: name });
                                                        }
                                                    }}
                                                />
                                                <datalist id="wholesaler-options">
                                                    {wholesalers.map(w => (
                                                        <option key={w._id} value={w.name} />
                                                    ))}
                                                </datalist>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Gouvernerat</label>
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-300 rounded px-3 py-2"
                                                    value={newEvent.governorate}
                                                    onChange={(e) => setNewEvent({ ...newEvent, governorate: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">📦 Offrir un échantillon (optionnel)</label>
                                        <div className="flex gap-2 items-center">
                                            <select
                                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                value={newEvent.givenSampleName && newEvent.givenSampleBatch !== undefined ? `${newEvent.givenSampleName}|${newEvent.givenSampleBatch}` : ""}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (!val) {
                                                        setNewEvent({ ...newEvent, givenSampleName: '', givenSampleBatch: '', givenSampleQty: 1 });
                                                        setPendingSampleQty(1);
                                                    } else {
                                                        const [name, batch] = val.split('|');
                                                        setNewEvent({ ...newEvent, givenSampleName: name, givenSampleBatch: batch, givenSampleQty: pendingSampleQty });
                                                    }
                                                }}
                                            >
                                                <option value="">-- Aucun médicament --</option>
                                                {userSamples.filter(s => s.count > 0 && (s.itemType || 'sample') === 'sample').map((s, idx) => (
                                                    <option key={idx} value={`${s.name}|${s.batchNumber || ''}`}>
                                                        📦 {s.name} {s.batchNumber ? `(Lot: ${s.batchNumber})` : ''} - [Disp: {s.count}]
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                value={pendingSampleQty}
                                                onChange={(e) => {
                                                    const qty = Math.max(1, parseInt(e.target.value) || 1);
                                                    setPendingSampleQty(qty);
                                                    if (newEvent.givenSampleName) {
                                                        setNewEvent({ ...newEvent, givenSampleQty: qty });
                                                    }
                                                }}
                                                placeholder="Qté"
                                                disabled={!newEvent.givenSampleName}
                                            />
                                        </div>
                                        {newEvent.givenSampleName && (
                                            <p className="text-xs text-blue-600 font-semibold mt-1 ml-1">📦 {newEvent.givenSampleName} × {newEvent.givenSampleQty || 1}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <label className="block text-sm font-medium text-gray-700">🎁 Matériel Promotionnel (Gifts)</label>

                                        {/* List of already added materials */}
                                        {newEvent.givenMaterials && newEvent.givenMaterials.length > 0 && (
                                            <div className="space-y-1.5 mb-2">
                                                {newEvent.givenMaterials.map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                                                        <span className="text-sm font-semibold text-blue-800">
                                                            🎁 {item.name}
                                                            <span className="ml-2 bg-blue-200 text-blue-900 text-xs font-bold px-2 py-0.5 rounded-full">x{item.count || 1}</span>
                                                            {item.batch && item.batch !== 'N/A' && <span className="ml-1 text-[10px] text-blue-500 font-mono">[{item.batch}]</span>}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const updated = newEvent.givenMaterials.filter((_, i) => i !== idx);
                                                                setNewEvent({ ...newEvent, givenMaterials: updated });
                                                            }}
                                                            className="text-red-400 hover:text-red-600 transition-colors"
                                                            title="Retirer"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Select gift + type quantity + Add button */}
                                        <div className="flex gap-2 items-center">
                                            <select
                                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                value={pendingMaterial}
                                                onChange={(e) => setPendingMaterial(e.target.value)}
                                            >
                                                <option value="">-- Choisir un cadeau --</option>
                                                {userSamples
                                                    .filter(s => s.count > 0 && s.itemType === 'material')
                                                    .map((s, idx) => (
                                                        <option key={idx} value={`${s.name}|${s.batchNumber || ''}`}>
                                                            🎁 {s.name} {s.batchNumber && s.batchNumber !== 'N/A' ? `(Réf: ${s.batchNumber})` : ''} — Disp: {s.count}
                                                        </option>
                                                    ))}
                                            </select>
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                value={pendingQty}
                                                onChange={(e) => setPendingQty(Math.max(1, parseInt(e.target.value) || 1))}
                                                placeholder="Qté"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!pendingMaterial) return;
                                                    const [name, batch] = pendingMaterial.split('|');
                                                    const count = pendingQty || 1;
                                                    // Check available stock
                                                    const stockItem = userSamples.find(s => s.name === name && (s.batchNumber || '') === batch && s.itemType === 'material');
                                                    if (stockItem && count > stockItem.count) {
                                                        alert(`Stock insuffisant. Disponible: ${stockItem.count}`);
                                                        return;
                                                    }
                                                    const existsIndex = newEvent.givenMaterials.findIndex(m => m.name === name && m.batch === batch);
                                                    if (existsIndex > -1) {
                                                        const updated = [...newEvent.givenMaterials];
                                                        updated[existsIndex].count += count;
                                                        setNewEvent({ ...newEvent, givenMaterials: updated });
                                                    } else {
                                                        setNewEvent({
                                                            ...newEvent,
                                                            givenMaterials: [...(newEvent.givenMaterials || []), { name, batch, count }]
                                                        });
                                                    }
                                                    // Reset
                                                    setPendingMaterial('');
                                                    setPendingQty(1);
                                                }}
                                                className="px-3 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap disabled:opacity-40"
                                                disabled={!pendingMaterial}
                                            >
                                                + Ajouter
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">✍️ Rapport / Tâche</label>
                                    <textarea
                                        className="w-full border border-gray-300 rounded px-3 py-2 h-20 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Libellé du compte rendu..."
                                        value={newEvent.details}
                                        onChange={(e) => setNewEvent({ ...newEvent, details: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>

                            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSaveEvent}
                                    disabled={isProcessing}
                                    className={`px-5 py-2 text-sm text-white rounded-md transition-shadow font-bold ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md'}`}
                                >
                                    {isProcessing ? 'Enregistrement...' : 'Confirmer'}
                                </button>
                            </div>
                        </div>
                </div>
            )
        }
        </div >

            {
        selectedEvent && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-lg py-4 px-2 overflow-hidden">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-[550px] max-h-full overflow-hidden flex flex-col border border-gray-100">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="text-lg font-bold text-gray-800">
                            Détails de la visite {isReadOnly && <span className="text-sm font-normal text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded ml-2">(Lecture Seule)</span>}
                        </h3>
                        <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                        <button
                            onClick={() => setSelectedEvent(null)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la visite</label>
                            <select
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isReadOnly}
                                value={selectedEvent.visitName || 'privée'}
                                onChange={(e) => setSelectedEvent({ ...selectedEvent, visitName: e.target.value })}
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type de cible</label>
                            <div className="flex gap-4 pt-2">
                                <label className="flex items-center space-x-2 cursor-pointer text-sm">
                                    <input
                                        type="radio"
                                        disabled={isReadOnly}
                                        name="editTargetType"
                                        value="medecin"
                                        checked={selectedEvent.targetType === 'medecin'}
                                        onChange={(e) => setSelectedEvent({ ...selectedEvent, targetType: e.target.value })}
                                        className="form-radio text-blue-600 disabled:opacity-50"
                                    />
                                    <span>Dr</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer text-sm">
                                    <input
                                        type="radio"
                                        disabled={isReadOnly}
                                        name="editTargetType"
                                        value="pharmacie"
                                        checked={selectedEvent.targetType === 'pharmacie'}
                                        onChange={(e) => setSelectedEvent({ ...selectedEvent, targetType: e.target.value })}
                                        className="form-radio text-blue-600 disabled:opacity-50"
                                    />
                                    <span>Ph</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer text-sm">
                                    <input
                                        type="radio"
                                        disabled={isReadOnly}
                                        name="editTargetType"
                                        value="grossiste"
                                        checked={selectedEvent.targetType === 'grossiste'}
                                        onChange={(e) => setSelectedEvent({ ...selectedEvent, targetType: e.target.value })}
                                        className="form-radio text-blue-600 disabled:opacity-50"
                                    />
                                    <span>Gr</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Conditional Fields for Médecin */}
                    {selectedEvent.targetType === 'medecin' && (
                        <div className="space-y-3 mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-1">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Gouvernerat</label>
                                    <input
                                        type="text"
                                        disabled={isReadOnly}
                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm disabled:bg-gray-100"
                                        value={selectedEvent.governorate || ''}
                                        onChange={(e) => setSelectedEvent({ ...selectedEvent, governorate: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Spécialité</label>
                                    <input
                                        type="text"
                                        disabled={isReadOnly}
                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm disabled:bg-gray-100"
                                        value={selectedEvent.specialty || ''}
                                        onChange={(e) => setSelectedEvent({ ...selectedEvent, specialty: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Nom du Médecin</label>
                                    <input
                                        type="text"
                                        disabled={isReadOnly}
                                        list="doctor-options"
                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm disabled:bg-gray-100"
                                        value={selectedEvent.doctorName || ''}
                                        onChange={(e) => {
                                            const name = e.target.value;
                                            const found = doctors.find(d => d.name === name);
                                            if (found) {
                                                setSelectedEvent({
                                                    ...selectedEvent,
                                                    doctorName: name,
                                                    governorate: found.governorate || selectedEvent.governorate,
                                                    specialty: found.specialty || selectedEvent.specialty,
                                                    address: found.address || selectedEvent.address
                                                });
                                            } else {
                                                setSelectedEvent({ ...selectedEvent, doctorName: name });
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Adresse</label>
                                <input
                                    type="text"
                                    disabled={isReadOnly}
                                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm disabled:bg-gray-100"
                                    value={selectedEvent.address || ''}
                                    onChange={(e) => setSelectedEvent({ ...selectedEvent, address: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {/* Conditional Fields for Pharmacie */}
                    {selectedEvent.targetType === 'pharmacie' && (
                        <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la pharmacie</label>
                                <input
                                    type="text"
                                    disabled={isReadOnly}
                                    list="pharmacy-options"
                                    className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
                                    value={selectedEvent.pharmacyName || ''}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        const found = pharmacies.find(p => p.name === name);
                                        if (found) {
                                            setSelectedEvent({
                                                ...selectedEvent,
                                                pharmacyName: name,
                                                governorate: found.governorate || selectedEvent.governorate,
                                                address: found.address || selectedEvent.address
                                            });
                                        } else {
                                            setSelectedEvent({ ...selectedEvent, pharmacyName: name });
                                        }
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Gouvernerat</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded px-3 py-2"
                                    value={selectedEvent.governorate || ''}
                                    onChange={(e) => setSelectedEvent({ ...selectedEvent, governorate: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {/* Conditional Fields for Grossiste */}
                    {selectedEvent.targetType === 'grossiste' && (
                        <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du grossiste</label>
                                <input
                                    type="text"
                                    disabled={isReadOnly}
                                    list="wholesaler-options"
                                    className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
                                    value={selectedEvent.wholesalerName || ''}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        const found = wholesalers.find(w => w.name === name);
                                        if (found) {
                                            setSelectedEvent({
                                                ...selectedEvent,
                                                wholesalerName: name,
                                                governorate: found.governorate || selectedEvent.governorate,
                                                address: found.address || selectedEvent.address
                                            });
                                        } else {
                                            setSelectedEvent({ ...selectedEvent, wholesalerName: name });
                                        }
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Gouvernerat</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded px-3 py-2"
                                    value={selectedEvent.governorate || ''}
                                    onChange={(e) => setSelectedEvent({ ...selectedEvent, governorate: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">📦 Échantillon (optionnel)</label>
                        {isReadOnly ? (
                            selectedEvent.givenSampleName && (
                                <div className="mb-2 p-3 bg-green-50 text-green-800 rounded-md border border-green-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span>📦 Échantillon : <strong>{selectedEvent.givenSampleName}</strong>
                                            {(selectedEvent.givenSampleQty > 1) && (
                                                <span className="ml-2 bg-green-200 text-green-900 text-xs font-bold px-2 py-0.5 rounded-full">×{selectedEvent.givenSampleQty}</span>
                                            )}
                                        </span>
                                    </div>
                                    {selectedEvent.givenSampleBatch && (
                                        <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-green-200">
                                            Lot: {selectedEvent.givenSampleBatch}
                                        </span>
                                    )}
                                </div>
                            )
                        ) : (
                            <div className="flex gap-2 items-center">
                                <select
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    value={selectedEvent.givenSampleName && selectedEvent.givenSampleBatch !== undefined ? `${selectedEvent.givenSampleName}|${selectedEvent.givenSampleBatch}` : ""}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (!val) {
                                            setSelectedEvent({ ...selectedEvent, givenSampleName: '', givenSampleBatch: '', givenSampleQty: 0 });
                                        } else {
                                            const [name, batch] = val.split('|');
                                            setSelectedEvent({ ...selectedEvent, givenSampleName: name, givenSampleBatch: batch, givenSampleQty: selectedEvent.givenSampleQty || 1 });
                                        }
                                    }}
                                >
                                    <option value="">-- Aucun médicament --</option>
                                    {userSamples.filter(s => (s.count > 0 || (s.name === selectedEvent.givenSampleName && s.batchNumber === selectedEvent.givenSampleBatch)) && (s.itemType || 'sample') === 'sample').map((s, idx) => (
                                        <option key={idx} value={`${s.name}|${s.batchNumber || ''}`}>
                                            📦 {s.name} {s.batchNumber ? `(Lot: ${s.batchNumber})` : ''} - [Disp: {s.count}]
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    min="1"
                                    className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    value={selectedEvent.givenSampleQty || 1}
                                    onChange={(e) => {
                                        const qty = Math.max(1, parseInt(e.target.value) || 1);
                                        setSelectedEvent({ ...selectedEvent, givenSampleQty: qty });
                                    }}
                                    placeholder="Qté"
                                    disabled={!selectedEvent.givenSampleName}
                                />
                            </div>
                        )}
                    </div>

                    {selectedEvent.givenMaterials && selectedEvent.givenMaterials.length > 0 && (
                        <div className="mb-3 space-y-1">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Matériel Promotionnel</label>
                            <div className="grid grid-cols-2 gap-2">
                                {selectedEvent.givenMaterials.map((item, idx) => (
                                    <div key={idx} className="p-1.5 bg-blue-50 text-blue-800 rounded border border-blue-100 flex items-center justify-between text-[11px]">
                                        <span className="truncate">🎁 <strong>{item.name}</strong></span>
                                        <span className="ml-1 bg-blue-200 text-blue-900 px-1 rounded-full text-[10px]">x{item.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedEvent.givenMaterialName && (!selectedEvent.givenMaterials || selectedEvent.givenMaterials.length === 0) && (
                        <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-md border border-blue-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span>🎁 Matériel : <strong>{selectedEvent.givenMaterialName}</strong></span>
                            </div>
                            {selectedEvent.givenMaterialBatch && selectedEvent.givenMaterialBatch !== 'N/A' && (
                                <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-blue-200">
                                    Réf: {selectedEvent.givenMaterialBatch}
                                </span>
                            )}
                        </div>
                    )}

                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">✍️ Rapport / Tâche à faire</label>
                            {!isReadOnly && (
                                <button
                                    onClick={() => setSelectedEvent({ ...selectedEvent, details: '' })}
                                    className="text-[10px] text-red-500 hover:text-red-700 font-bold uppercase tracking-tighter"
                                >
                                    Effacer
                                </button>
                            )}
                        </div>
                        <textarea
                            disabled={isReadOnly}
                            className="w-full border border-gray-300 rounded px-3 py-2 h-20 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            placeholder="Écrivez ici le compte rendu de la visite ou la tâche à suivre..."
                            value={selectedEvent.details || ''}
                            onChange={(e) => setSelectedEvent({ ...selectedEvent, details: e.target.value })}
                        ></textarea>
                    </div>

                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                    <div className="flex justify-between items-center">
                        <div>
                            {!isReadOnly && (
                                <button
                                    onClick={handleDeleteEvent}
                                    className="px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors font-medium flex items-center gap-2 text-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    Supprimer
                                </button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors text-sm font-medium"
                            >
                                Fermer
                            </button>
                            <button
                                onClick={handleUpdateEvent}
                                disabled={isProcessing}
                                className={`px-5 py-2 text-white rounded-md transition-shadow font-bold text-sm ${isReadOnly ? 'hidden' : ''} ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-md'}`}
                            >
                                {isProcessing ? 'Sauvegarder...' : 'Sauvegarder'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
                </div >
            )
    }

            </div >
        )
}
        </div >
    );
}
