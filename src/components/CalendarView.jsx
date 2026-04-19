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
    const isReadOnly = !!viewUser;
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
        givenSamples: []
    });
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [userSamples, setUserSamples] = useState([]);
    const [doctors, setDoctors] = useState([]); // Master list for autocomplete (cycle DB)
    const [contactDoctors, setContactDoctors] = useState([]); // From contacts section
    const [medSuggestions, setMedSuggestions] = useState([]); // dynamic autocomplete from excel
    const [pharmacies, setPharmacies] = useState([]); // Master list for autocomplete
    const [wholesalers, setWholesalers] = useState([]); // Master list for autocomplete
    const [pendingSample, setPendingSample] = useState(''); // Temp selected sample value
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

    // Fetch contacts from the Biotech contact section for autocomplete
    const fetchContactDoctors = async () => {
        if (dashboardId !== 'dashboard1') return; // Only for Biotech
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const username = localStorage.getItem('username') || '';
            // Detect current delegate by username
            const delegateMap = { sofiene: 'Sofiene', seif: 'Seif', ines: 'Ines', syrine: 'Syrine', cherifa: 'Cherifa' };
            const delegateName = delegateMap[username.toLowerCase()];
            if (!delegateName) return;
            const res = await fetch(`/api/contacts/${delegateName}`, { headers: { 'x-auth-token': token } });
            if (res.ok) {
                const data = await res.json();
                // Transform to the same format as cycle doctors: { name, governorate, specialty, address }
                const mapped = data.map(c => ({
                    _id: c._id || `contact-${c.nom}-${c.prenom}`,
                    name: `${c.nom} ${c.prenom}`.trim(),
                    governorate: c.gouvernorat || '',
                    specialty: c.specialite || '',
                    address: c.adresse || ''
                }));
                setContactDoctors(mapped);
            }
        } catch (err) { console.error('Error fetching contact doctors:', err); }
    };

    useEffect(() => {
        fetchUserSamples();
        fetchDoctors();
        fetchPharmacies();
        fetchWholesalers();
        fetchContactDoctors();
        if (eventsData.length > 0 && !eventsData[0].id) {
            setEventsData(prev => prev.map((e, i) => ({ ...e, id: i })));
        }
    }, [showModal, selectedEvent]); // Refresh data when create or edit modal opens

    // Doctor autocomplete via Excel server search
    const fetchMedSuggestions = async (searchTerm) => {
        if (!searchTerm || searchTerm.trim().length < 2) {
            setMedSuggestions([]);
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/med-list/search?q=${encodeURIComponent(searchTerm)}`, {
                headers: { 'x-auth-token': token }
            });
            if (res.ok) {
                const data = await res.json();
                setMedSuggestions(data);
            }
        } catch (err) {
            console.error('Erreur autocomplete médecins', err);
        }
    };
    
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
            const visitsData = await res.json();

            // Fetch Leaves
            let leaveUrl = '/api/leave';
            if (localStorage.getItem('role') === 'admin') {
                leaveUrl = '/api/leave/all';
            }

            const leaveRes = await fetch(leaveUrl, {
                headers: { 'x-auth-token': token }
            });
            const leavesDataArr = await leaveRes.json();
            
            // Filter leaves for specific user if viewing another user's dashboard
            let filteredLeaves = [];
            if (Array.isArray(leavesDataArr)) {
                filteredLeaves = leavesDataArr.filter(l => {
                    if (viewUser) {
                        // Match by username if viewing specific user (since viewUser is a username string)
                        const leaveUsername = (l.user?.username || l.user || '').toString().toLowerCase();
                        return leaveUsername === viewUser.toLowerCase();
                    } else if (localStorage.getItem('role') === 'admin') {
                         // In admin selection, we might not want ALL leaves on one calendar
                         return true; 
                    }
                    return l.status === 'approved';
                }).filter(l => l.status === 'approved');
            }

            const formattedVisits = Array.isArray(visitsData) ? visitsData.map(event => ({
                ...event,
                id: event._id,
                start: new Date(event.start),
                end: new Date(event.end)
            })) : [];

            const formattedLeaves = filteredLeaves.map(leave => {
                // For all-day events, set end to the end of the day
                const startDate = new Date(leave.startDate);
                const endDate = new Date(leave.endDate);
                endDate.setHours(23, 59, 59);
                
                return {
                    id: leave._id,
                    title: `🏖️ CONGÉ: ${leave.reason}`,
                    start: startDate,
                    end: endDate,
                    allDay: true,
                    isLeave: true,
                    status: leave.status
                };
            });

            setEventsData([...formattedVisits, ...formattedLeaves]);
        } catch (err) {
            console.error('Error fetching calendar data:', err);
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
    const eventPropGetter = useCallback((event) => {
        const style = {
            backgroundColor: event.isLeave ? '#f59e0b' : '#3b82f6', // amber-500 for leave, blue-500 for visits
            borderRadius: '6px',
            opacity: 0.8,
            color: 'white',
            border: 'none',
            display: 'block',
            fontSize: '11px',
            fontWeight: 'bold'
        };
        return { style };
    }, []);

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
                    eventPropGetter={eventPropGetter}
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
                                                                
                                                                // Fetch dynamic suggestions
                                                                fetchMedSuggestions(name);
                                                                
                                                                // Look in both cycle DB, contacts AND matched medSuggestions
                                                                const foundLocal = doctors.find(d => d.name === name) || contactDoctors.find(c => c.name === name);
                                                                const foundExcel = medSuggestions.find(m => m.name === name);
                                                                
                                                                let newGov = newEvent.governorate;
                                                                let newSpec = newEvent.specialty;
                                                                let newAddress = newEvent.address;

                                                                if (foundLocal) {
                                                                    newGov = foundLocal.governorate || newGov;
                                                                    newSpec = foundLocal.specialty || newSpec;
                                                                    newAddress = foundLocal.address || newAddress;
                                                                } else if (foundExcel) {
                                                                    newGov = foundExcel.governorate || newGov;
                                                                    newSpec = foundExcel.specialty || newSpec;
                                                                    newAddress = foundExcel.address || newAddress;
                                                                }

                                                                setNewEvent({
                                                                    ...newEvent,
                                                                    doctorName: name,
                                                                    governorate: newGov,
                                                                    specialty: newSpec,
                                                                    address: newAddress
                                                                });
                                                            }}
                                                        />
                                                        <datalist id="doctor-options">
                                                            {/* Local doctors (cycle & contacts) */}
                                                            {doctors.map(d => <option key={`db-${d._id}`} value={d.name} />)}
                                                            {contactDoctors.map(c => <option key={`ct-${c._id}`} value={c.name} />)}
                                                            {/* National Excel Suggestions */}
                                                            {medSuggestions.map((m, idx) => (
                                                                <option key={`excel-${idx}`} value={m.name} />
                                                            ))}
                                                        </datalist>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Adresse</label>
                                                        <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={newEvent.address} onChange={(e) => setNewEvent({ ...newEvent, address: e.target.value })} />
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
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Gouvernerat</label>
                                                            <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={newEvent.governorate} onChange={(e) => setNewEvent({ ...newEvent, governorate: e.target.value })} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Adresse</label>
                                                            <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={newEvent.address} onChange={(e) => setNewEvent({ ...newEvent, address: e.target.value })} />
                                                        </div>
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
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Gouvernerat</label>
                                                            <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={newEvent.governorate} onChange={(e) => setNewEvent({ ...newEvent, governorate: e.target.value })} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Adresse</label>
                                                            <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={newEvent.address} onChange={(e) => setNewEvent({ ...newEvent, address: e.target.value })} />
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    <div className="mb-6 space-y-4 shadow-sm bg-white p-4 rounded-xl border border-gray-100">
                                        <div>
                                            <label className="block text-[11px] font-black text-gray-400 uppercase mb-3 tracking-widest">📦 Échantillons Distribués</label>

                                            {/* Multi-Sample Selection */}
                                            <div className="flex gap-2 mb-3">
                                                <select
                                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                                    value={pendingSample}
                                                    onChange={(e) => setPendingSample(e.target.value)}
                                                >
                                                    <option value="">-- Ajouter un échantillon --</option>
                                                    {userSamples.filter(s => s.count > 0 && (s.itemType || 'sample') === 'sample').map((s, idx) => (
                                                        <option key={idx} value={`${s.name}|${s.batchNumber || ''}`}>
                                                            📦 {s.name} ({s.count})
                                                        </option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="number"
                                                    className="w-16 border border-gray-200 rounded-lg px-2 text-center text-sm font-bold bg-gray-50"
                                                    value={pendingSampleQty}
                                                    onChange={(e) => setPendingSampleQty(Math.max(1, parseInt(e.target.value) || 1))}
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (!pendingSample) return;
                                                        const [name, batch] = pendingSample.split('|');
                                                        const updated = [...newEvent.givenSamples];
                                                        const idx = updated.findIndex(s => s.name === name && s.batch === batch);
                                                        if (idx > -1) updated[idx].count += pendingSampleQty;
                                                        else updated.push({ name, batch, count: pendingSampleQty });
                                                        setNewEvent({ ...newEvent, givenSamples: updated });
                                                        setPendingSample('');
                                                        setPendingSampleQty(1);
                                                    }}
                                                    className="px-4 bg-green-600 text-white rounded-lg font-black text-xs uppercase tracking-tighter hover:bg-green-700 transition-colors shadow-md shadow-green-100"
                                                >Add</button>
                                            </div>
                                        </div>

                                        {/* Display selected items as badges */}
                                        {newEvent.givenSamples?.length > 0 && (
                                            <div className="flex flex-wrap gap-2 p-3 bg-green-50/30 rounded-xl border border-dashed border-green-200">
                                                {newEvent.givenSamples?.map((s, i) => (
                                                    <span key={`s-${i}`} className="text-[10px] bg-white text-green-700 px-2 py-1.5 rounded-lg font-black flex items-center gap-2 shadow-sm border border-green-100">
                                                        <span className="opacity-50">📦</span> {s.name} <span className="bg-green-600 text-white px-1.5 py-0.5 rounded-md">x{s.count}</span>
                                                        <button onClick={() => setNewEvent(p => ({ ...p, givenSamples: p.givenSamples.filter((_, idx) => idx !== i) }))} className="hover:text-red-500 ml-1 font-bold">✕</button>
                                                    </span>
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

                                <div className="grid grid-cols-4 gap-3 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="col-span-1">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Ville</label>
                                        <p className="text-sm font-bold text-gray-700">{selectedEvent.governorate || '—'}</p>
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Spécialité</label>
                                        {isReadOnly ? (
                                            <p className="text-sm font-bold text-gray-700">{selectedEvent.specialty || '—'}</p>
                                        ) : (
                                            <input
                                                type="text"
                                                className="w-full border border-gray-200 rounded-md px-2 py-1 text-[11px] font-bold"
                                                value={selectedEvent.specialty || ''}
                                                onChange={(e) => setSelectedEvent({ ...selectedEvent, specialty: e.target.value })}
                                            />
                                        )}
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cible</label>
                                        <p className="text-sm font-black text-blue-600 truncate">{selectedEvent.doctorName || selectedEvent.pharmacyName || selectedEvent.wholesalerName || '—'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Adresse</label>
                                        {isReadOnly ? (
                                            <p className="text-[11px] font-bold text-gray-500 leading-tight">{selectedEvent.address || 'Non spécifiée'}</p>
                                        ) : (
                                            <input
                                                type="text"
                                                className="w-full border border-gray-200 rounded-md px-2 py-1 text-[11px] font-bold"
                                                value={selectedEvent.address || ''}
                                                onChange={(e) => setSelectedEvent({ ...selectedEvent, address: e.target.value })}
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">🎁 Produits Distribués</label>

                                    {!isReadOnly && (
                                        <div className="mb-4 space-y-2">
                                            <div className="flex gap-2">
                                                <select
                                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={pendingSample}
                                                    onChange={(e) => setPendingSample(e.target.value)}
                                                >
                                                    <option value="">-- Ajouter un échantillon --</option>
                                                    {userSamples.filter(s => s.count > 0 && (s.itemType || 'sample') === 'sample').map((s, idx) => (
                                                        <option key={idx} value={`${s.name}|${s.batchNumber || ''}`}>
                                                            📦 {s.name} ({s.count})
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => {
                                                        if (!pendingSample) return;
                                                        const [name, batch] = pendingSample.split('|');
                                                        const updated = [...(selectedEvent.givenSamples || [])];
                                                        // Migrate legacy if any
                                                        if (selectedEvent.givenSampleName && updated.length === 0) {
                                                            updated.push({ name: selectedEvent.givenSampleName, batch: selectedEvent.givenSampleBatch, count: selectedEvent.givenSampleQty || 1 });
                                                        }
                                                        const idx = updated.findIndex(s => s.name === name && s.batch === batch);
                                                        if (idx > -1) updated[idx].count += 1;
                                                        else updated.push({ name, batch, count: 1 });
                                                        setSelectedEvent({ ...selectedEvent, givenSamples: updated, givenSampleName: '', givenSampleQty: 0 }); // Clear legacy
                                                        setPendingSample('');
                                                    }}
                                                    className="px-3 bg-green-50 text-green-600 rounded-lg font-bold text-xs"
                                                >+ Add</button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        {/* Display legacy sample if it exists and no givenSamples array yet */}
                                        {selectedEvent.givenSampleName && (!selectedEvent.givenSamples || selectedEvent.givenSamples.length === 0) && (
                                            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100 mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-green-800">📦 {selectedEvent.givenSampleName}</span>
                                                    {!isReadOnly && <span className="text-[10px] text-green-500 font-bold uppercase tracking-tighter">(Legacy)</span>}
                                                </div>
                                                {isReadOnly ? (
                                                    <span className="bg-green-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black">x{selectedEvent.givenSampleQty || 1}</span>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        className="w-16 border border-green-200 rounded-md px-2 py-1 text-center text-sm font-black text-green-700 h-8"
                                                        value={selectedEvent.givenSampleQty || 1}
                                                        onChange={(e) => setSelectedEvent({ ...selectedEvent, givenSampleQty: Math.max(1, parseInt(e.target.value) || 1) })}
                                                    />
                                                )}
                                            </div>
                                        )}

                                        {/* Display array samples */}
                                        {selectedEvent.givenSamples?.map((s, i) => (
                                            <div key={`gs-${i}`} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-green-800">📦 {s.name}</span>
                                                    {!isReadOnly && (
                                                        <button
                                                            onClick={() => setSelectedEvent(p => ({ ...p, givenSamples: p.givenSamples.filter((_, idx) => idx !== i) }))}
                                                            className="text-red-400 hover:text-red-600 transition-colors"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                                {isReadOnly ? (
                                                    <span className="bg-green-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black">x{s.count}</span>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        className="w-16 border border-green-200 rounded-md px-2 py-1 text-center text-sm font-black text-green-700 h-8"
                                                        value={s.count}
                                                        onChange={(e) => {
                                                            const updated = [...selectedEvent.givenSamples];
                                                            updated[i].count = Math.max(1, parseInt(e.target.value) || 1);
                                                            setSelectedEvent({ ...selectedEvent, givenSamples: updated });
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        ))}
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
