import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CalendarView from './components/CalendarView';
import CongressView from './components/CongressView';
import PharmacienneView from './components/PharmacienneView';
import SamplesView from './components/SamplesView';
import StockView from './components/StockView';
import SampleHistoryView from './components/SampleHistoryView';
import CycleView from './components/CycleView';
import StockPCTView from './components/StockPCTView';
import LeaveView from './components/LeaveView';
import LeaveAdminView from './components/LeaveAdminView';

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconCalendar = () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);
const IconCycle = () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);
const IconSamples = () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
);
const IconCongress = () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
const IconStock = () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
);
const IconAssignment = () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);
const IconHistory = () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const IconLogout = () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);
const IconSwitch = () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
);
const IconPCT = () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);
const IconMenu = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);
const IconClose = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);
const IconLeave = () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l2 2 4-4" />
    </svg>
);

// ─── Sidebar Item ─────────────────────────────────────────────────────────────
function SidebarItem({ icon, label, active, onClick, accent, collapsed }) {
    return (
        <button
            onClick={onClick}
            title={collapsed ? label : undefined}
            className="iso-sidebar-item w-full text-left"
            style={active ? {
                background: `linear-gradient(135deg, ${accent}15, ${accent}05)`,
                borderColor: `${accent}30`,
                color: accent,
                fontWeight: '700'
            } : {
                color: 'var(--text-secondary)'
            }}
        >
            <span className="transition-colors">{icon}</span>
            {!collapsed && <span className="truncate">{label}</span>}
            {active && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} />
            )}
        </button>
    );
}

// ─── Sidebar Component ────────────────────────────────────────────────────────
function Sidebar({ tabs, activeTab, setActiveTab, accent, accentLight, logo, dashName, subTitle, user, role, extraActions, sidebarOpen, setSidebarOpen }) {
    return (
        <>
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar panel */}
            <aside
                className={`iso-sidebar z-50 transition-transform duration-300 ${sidebarOpen ? 'sidebar-open' : ''}`}
                style={{ width: '240px' }}
            >
                {/* Logo */}
                <div className="p-5 mb-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm"
                            style={{ background: '#ffffff', border: `1px solid var(--border-subtle)` }}>
                            <img src={logo} alt="Logo" className="h-8 w-8 object-contain" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900 truncate">{dashName}</p>
                            <p className="text-[10px] uppercase font-bold tracking-wider truncate" style={{ color: 'var(--text-muted)' }}>{subTitle}</p>
                        </div>
                    </div>
                    {/* Close button on mobile */}
                    <button
                        className="lg:hidden p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                        style={{ color: 'var(--text-muted)' }}
                        onClick={() => setSidebarOpen(false)}
                    >
                        <IconClose />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 py-4 overflow-y-auto">
                    {tabs.map(tab => (
                        <SidebarItem
                            key={tab.id}
                            icon={tab.icon}
                            label={tab.label}
                            active={activeTab === tab.id}
                            onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                            accent={accent}
                        />
                    ))}
                </nav>

                {/* User + Actions */}
                <div className="p-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center gap-3 mb-3 px-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 shadow-sm"
                            style={{ background: `linear-gradient(135deg, ${accent}, #0ea5e9)` }}>
                            {user ? user[0].toUpperCase() : '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{user}</p>
                            <p className="text-[10px] font-medium truncate" style={{ color: 'var(--text-muted)' }}>{role}</p>
                        </div>
                    </div>
                    {extraActions}
                </div>
            </aside>
        </>
    );
}

// ─── Mobile Top Bar ───────────────────────────────────────────────────────────
function MobileTopBar({ dashName, logo, accent, accentLight, onMenuClick }) {
    return (
        <div
            className="mobile-topbar fixed top-0 left-0 right-0 z-30 items-center justify-between px-4 py-3"
            style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}
        >
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
                    style={{ background: accentLight, border: `1px solid ${accent}44` }}>
                    <img src={logo} alt="Logo" className="h-6 w-6 object-contain" />
                </div>
                <span className="text-sm font-black text-white">{dashName}</span>
            </div>
            <button
                onClick={onMenuClick}
                className="p-2 rounded-lg transition-colors"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
                <IconMenu />
            </button>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DashboardPage() {
    const navigate = useNavigate();
    const { dashboardId } = useParams();
    const queryParams = new URLSearchParams(window.location.search);
    const viewUser = queryParams.get('viewUser');

    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('calendar');
    const [pharmaTab, setPharmaTab] = useState('assignment');
    const [leavePendingCount, setLeavePendingCount] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const allowedDashboards = JSON.parse(localStorage.getItem('allowedDashboards') || '[]');
    const role = localStorage.getItem('role') || 'delegue';

    useEffect(() => {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');

        if (!token) {
            navigate('/');
        } else {
            setUser(username);
            if (!allowedDashboards.includes(dashboardId)) {
                alert('Access Denied');
                navigate('/');
            }
            if (allowedDashboards.length > 1 && !viewUser) {
                navigate('/dashboard-selection');
            }
            // Fetch pending leave count for admins
            if (role === 'admin') {
                fetch('/api/leave/all', { headers: { 'x-auth-token': token } })
                    .then(r => r.json())
                    .then(data => setLeavePendingCount(Array.isArray(data) ? data.filter(l => l.status === 'pending').length : 0))
                    .catch(() => { });
            }
        }
    }, [navigate, dashboardId, viewUser, allowedDashboards]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('allowedDashboards');
        localStorage.removeItem('role');
        navigate('/');
    };

    const accent = dashboardId === 'dashboard1' ? '#10b981' : '#6366f1';
    const accentLight = dashboardId === 'dashboard1' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)';
    const theme = dashboardId === 'dashboard1' ? {
        text: 'text-green-600', bg: 'bg-green-600', bgHover: 'hover:bg-green-700',
        border: 'border-green-600', lightBg: 'bg-green-50', navText: 'text-green-800'
    } : {
        text: 'text-blue-600', bg: 'bg-blue-600', bgHover: 'hover:bg-blue-700',
        border: 'border-blue-600', lightBg: 'bg-blue-50', navText: 'text-gray-900'
    };

    const dashName = dashboardId === 'dashboard1' ? 'BiotechpharmaMD' : 'Tenshi';
    const dashLogo = dashboardId === 'dashboard1' ? '/images/logo.jpg' : '/images/tenshi.png';

    // ── Pharmacienne Layout ──────────────────────────────────────────────────
    if (role === 'pharmacienne') {
        const pharmaTabs = [
            { id: 'assignment', label: 'Attribution', icon: <IconAssignment /> },
            { id: 'stock', label: 'Stock', icon: <IconStock /> },
            { id: 'history', label: 'Historique', icon: <IconHistory /> },
        ];

        const pharmaActions = (
            <button onClick={handleLogout} className="iso-sidebar-item w-full text-left" style={{ color: '#fca5a5' }}>
                <IconLogout />
                <span>Déconnexion</span>
            </button>
        );

        return (
            <div className="flex min-h-screen iso-grid-bg-subtle">
                <MobileTopBar dashName="Espace Pharmacie" logo="/images/tenshi.png" accent="#6366f1" accentLight="rgba(99,102,241,0.15)" onMenuClick={() => setSidebarOpen(true)} />

                <Sidebar
                    tabs={pharmaTabs}
                    activeTab={pharmaTab}
                    setActiveTab={setPharmaTab}
                    accent="#6366f1"
                    accentLight="rgba(99,102,241,0.15)"
                    logo="/images/tenshi.png"
                    dashName="Espace Pharmacie"
                    subTitle="Gestion des stocks"
                    user={user}
                    role="Pharmacienne"
                    extraActions={pharmaActions}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                />

                {/* Main Content */}
                <main className="main-content flex-1 min-h-screen">
                    <div className="mobile-padding" />
                    <div className="animate-fade-up">
                        {pharmaTab === 'assignment' && <PharmacienneView />}
                        {pharmaTab === 'stock' && <StockView />}
                        {pharmaTab === 'history' && <SampleHistoryView />}
                    </div>
                </main>

            </div>
        );
    }

    // ── Delegue Layout ───────────────────────────────────────────────────────
    const delegateTabs = [
        { id: 'calendar', label: 'Calendrier', icon: <IconCalendar /> },
        { id: 'cycle', label: 'Cycle', icon: <IconCycle /> },
        { id: 'samples', label: 'Échantillons', icon: <IconSamples /> },
        { id: 'stockpct', label: 'Stock PCT', icon: <IconPCT /> },
        { id: 'congress', label: 'Action marketing', icon: <IconCongress /> },
        { id: 'leave', label: 'Mes Congés', icon: <IconLeave /> },
    ];

    let displayedTabs = [...delegateTabs];

    // Logic: for dashboard1 (Biotech), only amal and rania can see Stock PCT.
    // Others in dashboard1 have it hidden.
    if (role === 'delegue' && dashboardId === 'dashboard1') {
        const allowedUsers = ['amal', 'rania'];
        const currentUsername = (localStorage.getItem('username') || '').toLowerCase();
        if (!allowedUsers.includes(currentUsername)) {
            displayedTabs = displayedTabs.filter(tab => tab.id !== 'stockpct');
        }
    }

    // Admin-only: add congé management tab
    if (role === 'admin') {
        displayedTabs.push({
            id: 'leave-admin',
            label: leavePendingCount > 0 ? `Congés (${leavePendingCount})` : 'Congés',
            icon: <IconLeave />
        });
    }

    const delegateActions = (
        <>
            {allowedDashboards.length > 1 && (
                <button onClick={() => navigate('/dashboard-selection')} className="iso-sidebar-item w-full text-left mb-1">
                    <IconSwitch />
                    <span>Changer de dashboard</span>
                </button>
            )}
            <button onClick={handleLogout} className="iso-sidebar-item w-full text-left" style={{ color: '#dc2626' }}>
                <IconLogout />
                <span>Déconnexion</span>
            </button>
        </>
    );


    return (
        <div className="flex min-h-screen iso-grid-bg-subtle">
            <MobileTopBar dashName={dashName} logo={dashLogo} accent={accent} accentLight={accentLight} onMenuClick={() => setSidebarOpen(true)} />

            <Sidebar
                tabs={displayedTabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                accent={accent}
                accentLight={accentLight}
                logo={dashLogo}
                dashName={dashName}
                subTitle="Délégué Médical"
                user={user}
                role="Délégué"
                extraActions={delegateActions}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
            />

            <main className="main-content flex-1 min-h-screen">
                <div className="mobile-padding" />

                {/* View-as-user banner */}
                {viewUser && (
                    <div className="mb-6 p-4 rounded-xl flex items-center gap-3 animate-fade-up"
                        style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                        <svg className="w-5 h-5 flex-shrink-0" style={{ color: '#fbbf24' }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm" style={{ color: '#fbbf24' }}>
                            Vous consultez le calendrier de <strong>{viewUser}</strong> — Mode lecture seule
                        </p>
                    </div>
                )}

                {/* Content */}
                <div className="animate-fade-up">
                    {activeTab === 'calendar' && <CalendarView key={`${dashboardId}-${viewUser}`} dashboardId={dashboardId} viewUser={viewUser} />}
                    {activeTab === 'samples' && <SamplesView dashboardId={dashboardId} viewUser={viewUser} />}
                    {activeTab === 'congress' && <CongressView key={dashboardId} dashboardId={dashboardId} />}
                    {activeTab === 'cycle' && <CycleView dashboardId={dashboardId} theme={theme} userRole={role} viewUser={viewUser} />}
                    {activeTab === 'stockpct' && <StockPCTView />}
                    {activeTab === 'leave' && <LeaveView />}
                    {activeTab === 'leave-admin' && <LeaveAdminView />}
                </div>
            </main>
        </div>
    );
}
