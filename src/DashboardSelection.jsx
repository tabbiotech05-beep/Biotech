import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DashboardSelection() {
    const navigate = useNavigate();
    const allowedDashboards = JSON.parse(localStorage.getItem('allowedDashboards') || '[]');
    const [dashboardUsers, setDashboardUsers] = React.useState({});

    useEffect(() => {
        const fetchDashboardUsers = async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch('/api/auth/dashboard-users', {
                    headers: { 'x-auth-token': token }
                });
                const data = await res.json();
                setDashboardUsers(data);
            } catch (err) {
                console.error('Error fetching dashboard users:', err);
            }
        };

        fetchDashboardUsers();

        if (allowedDashboards.length === 1) {
            navigate(`/dashboard/${allowedDashboards[0]}`);
        } else if (allowedDashboards.length === 0) {
            navigate('/');
        }
    }, [allowedDashboards, navigate]);

    const dashboardConfig = {
        dashboard1: {
            name: 'BiotechpharmaMD',
            team: 'Équipe BioTech',
            logo: '/images/logo.jpg',
            accent: '#10b981',
            accentLight: 'rgba(16, 185, 129, 0.2)',
            accentBorder: 'rgba(16, 185, 129, 0.3)',
            accentGlow: '0 0 30px rgba(16, 185, 129, 0.2)',
        },
        dashboard2: {
            name: 'Tenshi',
            team: 'Équipe Tenshi',
            logo: '/images/tenshi.png',
            accent: '#6366f1',
            accentLight: 'rgba(99, 102, 241, 0.2)',
            accentBorder: 'rgba(99, 102, 241, 0.3)',
            accentGlow: '0 0 30px rgba(99, 102, 241, 0.2)',
        }
    };

    const [searchQuery, setSearchQuery] = React.useState('');

    // Flatten all users into a single list
    const allUsers = React.useMemo(() => {
        const list = [];
        Object.entries(dashboardUsers).forEach(([dashId, users]) => {
            users.forEach(username => {
                list.push({ username, dashboardId: dashId });
            });
        });
        return list.sort((a, b) => a.username.localeCompare(b.username));
    }, [dashboardUsers]);

    const filteredUsers = allUsers.filter(u =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const configMap = {
        dashboard1: { name: 'BiotechpharmaMD', accent: '#10b981', light: 'rgba(16, 185, 129, 0.1)' },
        dashboard2: { name: 'Tenshi', accent: '#6366f1', light: 'rgba(99, 102, 241, 0.1)' }
    };

    return (
        <div className="min-h-screen iso-grid-bg flex flex-col items-center p-8 relative overflow-hidden">
            {/* Background design */}
            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-50/30 blur-[120px] rounded-full -z-10" />
            <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-green-50/20 blur-[100px] rounded-full -z-10" />

            {/* Header */}
            <div className="w-full max-w-2xl text-center mb-10 animate-fade-up">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-[10px] font-black uppercase tracking-widest bg-white shadow-sm border border-slate-100 text-blue-600">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    Panneau d'Administration
                </div>
                <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Sélection du Calendrier</h1>
                <p className="text-slate-500 font-medium">Accédez au planning de n'importe quel délégué en un clic.</p>
            </div>

            {/* Search & Stats */}
            <div className="w-full max-w-2xl mb-8 space-y-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Rechercher un délégué..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all font-bold text-slate-700 placeholder:text-slate-300"
                    />
                </div>

                <div className="flex justify-between items-center px-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        {filteredUsers.length} Délégués trouvés
                    </span>
                    <div className="flex gap-4">
                        {allowedDashboards.map(dash => (
                            <button
                                key={dash}
                                onClick={() => navigate(`/dashboard/${dash}`)}
                                className="text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-70 transition-opacity"
                                style={{ color: configMap[dash]?.accent }}
                            >
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: configMap[dash]?.accent }} />
                                Espace {configMap[dash]?.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Unified List */}
            <div className="w-full max-w-2xl grid grid-cols-1 gap-3 animate-fade-up" style={{ animationDelay: '0.2s' }}>
                {filteredUsers.length > 0 ? (
                    filteredUsers.map((u, idx) => {
                        const cfg = configMap[u.dashboardId] || configMap.dashboard1;
                        return (
                            <button
                                key={`${u.username}-${idx}`}
                                onClick={() => navigate(`/dashboard/${u.dashboardId}?viewUser=${u.username}`)}
                                className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-slate-200/70 hover:-translate-y-1 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-inner bg-blue-600">
                                        {u.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="text-left">
                                        <p className="font-black text-slate-900 leading-tight">{u.username}</p>
                                        <p className="text-[10px] uppercase font-black tracking-tighter text-blue-500">
                                            Équipe {cfg.name}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:bg-slate-50 group-hover:text-slate-900 transition-colors">
                                    Voir Calendrier
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                </div>
                            </button>
                        );
                    })
                ) : (
                    <div className="text-center py-20 bg-white/50 rounded-3xl border border-dashed border-slate-200">
                        <p className="text-slate-400 font-bold">Aucun délégué trouvé pour "{searchQuery}"</p>
                    </div>
                )}
            </div>

            <div className="mt-12 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                &copy; BiotechpharmaMD &bull; Dashboard Engine
            </div>
        </div>
    );
}
