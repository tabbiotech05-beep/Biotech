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
            name: 'BioTechPharmaMD',
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

    return (
        <div className="min-h-screen iso-grid-bg flex flex-col items-center justify-center p-8 relative overflow-hidden">
            {/* Background orbs */}
            <div className="absolute top-1/3 left-1/5 w-96 h-96 rounded-full opacity-5 animate-spin-slow"
                style={{ background: 'radial-gradient(circle, #6366f1, transparent)', filter: 'blur(80px)' }} />
            <div className="absolute bottom-1/3 right-1/5 w-80 h-80 rounded-full opacity-5 animate-spin-slow"
                style={{ background: 'radial-gradient(circle, #06b6d4, transparent)', filter: 'blur(70px)', animationDirection: 'reverse' }} />

            {/* Header */}
            <div className="text-center mb-12 animate-fade-up">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 text-xs font-bold uppercase tracking-widest"
                    style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    Sélection du Tableau de Bord
                </div>
                <h1 className="text-4xl font-black text-slate-900 mb-2">Choisissez votre espace</h1>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Sélectionnez le tableau de bord auquel vous souhaitez accéder</p>
            </div>

            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                {allowedDashboards.map((dashboard, idx) => {
                    const config = dashboardConfig[dashboard] || dashboardConfig.dashboard1;
                    return (
                        <div
                            key={dashboard}
                            className="animate-fade-up"
                            style={{ animationDelay: `${idx * 0.1}s` }}
                        >
                            {/* Main Card */}
                            <div
                                className="iso-card p-8 cursor-pointer group mb-4 shadow-sm hover:shadow-md"
                                onClick={() => navigate(`/dashboard/${dashboard}`)}
                            >
                                {/* Logo area */}
                                <div className="flex justify-center mb-6">
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105"
                                            style={{ background: '#ffffff', border: `1px solid var(--border-subtle)`, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                            <img src={config.logo} alt={config.name} className="h-16 w-16 object-contain rounded-xl" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
                                            style={{ background: config.accent }}>
                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-center">
                                    <h2 className="text-2xl font-black text-slate-900 mb-1">{config.name}</h2>
                                    <p className="text-sm font-bold mb-5" style={{ color: 'var(--text-muted)' }}>{config.team}</p>
                                    <button
                                        className="iso-btn w-full py-2.5 text-sm font-black text-white transition-all shadow-md active:scale-95"
                                        style={{
                                            background: `linear-gradient(135deg, ${config.accent}, ${config.accent}ee)`,
                                        }}
                                    >
                                        Accéder au tableau de bord
                                    </button>
                                </div>
                            </div>

                            {/* Users list */}
                            {dashboardUsers[dashboard] && dashboardUsers[dashboard].length > 0 && (
                                <div className="px-2">
                                    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                                        Voir le calendrier de :
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {dashboardUsers[dashboard].map(username => (
                                            <button
                                                key={username}
                                                onClick={() => navigate(`/dashboard/${dashboard}?viewUser=${username}`)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                                style={{
                                                    background: config.accentLight,
                                                    border: `1px solid ${config.accentBorder}`,
                                                    color: config.accent
                                                }}
                                                title={`Voir le calendrier de ${username}`}
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                {username}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
