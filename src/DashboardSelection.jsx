import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function DashboardSelection() {
    const navigate = useNavigate();
    const allowedDashboards = JSON.parse(localStorage.getItem('allowedDashboards') || '[]');
    const [dashboardUsers, setDashboardUsers] = React.useState({});

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/');
            return;
        }

        const fetchDashboardUsers = async () => {
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
    const [downloading, setDownloading] = React.useState(false);

    // Flatten all users into a single list
    const allUsers = React.useMemo(() => {
        const list = [];
        Object.entries(dashboardUsers).forEach(([dashId, users]) => {
            if (Array.isArray(users)) {
                users.forEach(userObj => {
                    // Handle both old (string) and new (object) formats defensively
                    const username = typeof userObj === 'string' ? userObj : userObj?.username;
                    const profileImage = typeof userObj === 'string' ? null : userObj?.profileImage;
                    
                    if (username) {
                        list.push({ 
                            username, 
                            profileImage,
                            dashboardId: dashId 
                        });
                    }
                });
            }
        });
        return list.sort((a, b) => a.username.localeCompare(b.username));
    }, [dashboardUsers]);

    const filteredUsers = allUsers.filter(u =>
        u.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const biotechUsers = filteredUsers.filter(u => u.dashboardId === 'dashboard1');
    const tenshiUsers = filteredUsers.filter(u => u.dashboardId === 'dashboard2');

    const downloadAllExpenses = async () => {
        setDownloading(true);
        try {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1;
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/expenses/all?year=${currentYear}&month=${currentMonth}`, {
                headers: { 'x-auth-token': token }
            });
            if (!res.ok) { alert('Erreur lors du téléchargement'); return; }
            const expenses = await res.json();

            if (expenses.length === 0) {
                alert('Aucune note de frais trouvée.');
                return;
            }

            const doc = new jsPDF();
            let firstPage = true;

            // Group by user
            const byUser = {};
            expenses.forEach(exp => {
                const uname = exp.user?.username || 'Inconnu';
                if (!byUser[uname]) byUser[uname] = [];
                byUser[uname].push(exp);
            });

            Object.entries(byUser).forEach(([username, userExps]) => {
                if (!firstPage) doc.addPage();
                firstPage = false;

                // User header
                doc.setFillColor(16, 185, 129);
                doc.rect(0, 0, 210, 24, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(14);
                doc.text(`Notes de Frais — ${username}`, 14, 16);

                let cursorY = 30;

                userExps.forEach((exp, idx) => {
                    doc.setTextColor(30, 30, 30);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(11);
                    doc.text(`${['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][(exp.month||1)-1]} ${exp.year}`, 14, cursorY);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9);
                    doc.setTextColor(100, 100, 100);
                    doc.text(`Voiture: ${exp.carModel || '-'}  |  Immat: ${exp.licensePlate || '-'}  |  Kms: ${exp.kilometrage}`, 14, cursorY + 6);

                    const tableColumn = ['Sem.', 'Secteurs Visités', 'Hôtel', 'Essence', 'Péage', 'Parking', 'Autres Détail', 'Autres DT'];
                    const tableRows = (exp.entries || []).map(e => [
                        String(e.week),
                        e.secteursVisites || '',
                        String(e.hotel || 0),
                        String(e.essence || 0),
                        String(e.peage || 0),
                        String(e.parking || 0),
                        e.autresDescription || '',
                        String(e.autresMontant || 0)
                    ]);

                    autoTable(doc, {
                        startY: cursorY + 10,
                        head: [tableColumn],
                        body: tableRows,
                        theme: 'grid',
                        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 7 },
                        styles: { fontSize: 7 },
                        columnStyles: { 0: { halign: 'center', cellWidth: 10 } },
                        margin: { left: 14, right: 14 }
                    });

                    cursorY = doc.lastAutoTable.finalY + 4;

                    // Total line
                    doc.setFillColor(16, 185, 129);
                    doc.roundedRect(14, cursorY, 182, 8, 1, 1, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(255, 255, 255);
                    doc.text(`TOTAL : ${Number(exp.totalAmount).toFixed(3)} DT`, 18, cursorY + 5.5);

                    cursorY += 14;

                    if (cursorY > 260 && idx < userExps.length - 1) {
                        doc.addPage();
                        cursorY = 15;
                    }
                });
            });

            doc.save(`Toutes_Notes_de_Frais_${new Date().toISOString().slice(0,10)}.pdf`);
        } catch (err) {
            console.error(err);
            alert('Erreur lors de la génération du PDF.');
        } finally {
            setDownloading(false);
        }
    };

    const configMap = {
        dashboard1: { name: 'BiotechpharmaMD', accent: '#10b981', light: 'rgba(16, 185, 129, 0.1)' },
        dashboard2: { name: 'Tenshi', accent: '#6366f1', light: 'rgba(99, 102, 241, 0.1)' }
    };

    const getImageUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        // Normalize path: remove leading slash if present, then add one
        const cleanPath = url.startsWith('/') ? url.slice(1) : url;
        return `/${cleanPath}`;
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
                    <div className="flex items-center gap-4">
                        <button
                            onClick={downloadAllExpenses}
                            disabled={downloading}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-md hover:opacity-90 transition-all disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                        >
                            {downloading ? (
                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            )}
                            Télécharger Notes de Frais
                        </button>
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

            {/* Two-Column Grid Layout */}
            <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 animate-fade-up" style={{ animationDelay: '0.2s' }}>
                
                {/* BIOTECH COLUMN */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 px-6 py-4 bg-emerald-50/50 rounded-3xl border border-emerald-100/50">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                            <span className="font-black text-xs">B</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-emerald-900 uppercase tracking-[0.2em]">Équipe Biotech</h2>
                            <p className="text-[10px] font-bold text-emerald-600/70">{biotechUsers.length} Délégués</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {biotechUsers.length > 0 ? (
                            biotechUsers.map((u, idx) => {
                                const cfg = configMap.dashboard1;
                                return (
                                    <button
                                        key={`bt-${idx}`}
                                        onClick={() => navigate(`/dashboard/dashboard1?viewUser=${u.username}`)}
                                        className="group relative flex flex-col items-center p-6 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 hover:-translate-y-2 overflow-hidden"
                                    >
                                        <div className="relative mb-4">
                                            <div className="w-20 h-20 rounded-3xl flex items-center justify-center font-black text-white text-2xl shadow-xl overflow-hidden transition-transform duration-500 group-hover:scale-110"
                                                style={{ background: `linear-gradient(135deg, ${cfg.accent}, #059669)` }}>
                                                {u.profileImage ? (
                                                    <img 
                                                        src={getImageUrl(u.profileImage)} 
                                                        alt={u.username} 
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.parentElement.innerText = u.username?.charAt(0).toUpperCase() || '?';
                                                        }}
                                                    />
                                                ) : (
                                                    u.username?.charAt(0).toUpperCase() || '?'
                                                )}
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{u.username}</h3>
                                        <div className="mt-4 flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-slate-300 group-hover:text-emerald-500 transition-colors">
                                            Voir Calendrier
                                            <svg className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                             <div className="col-span-full py-10 text-center text-slate-300 text-[10px] font-bold uppercase tracking-widest bg-white/30 rounded-3xl border border-dashed border-slate-100">Vide</div>
                        )}
                    </div>
                </div>

                {/* TENSHI COLUMN */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 px-6 py-4 bg-indigo-50/50 rounded-3xl border border-indigo-100/50">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <span className="font-black text-xs">T</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-indigo-900 uppercase tracking-[0.2em]">Équipe Tenshi</h2>
                            <p className="text-[10px] font-bold text-indigo-600/70">{tenshiUsers.length} Délégués</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {tenshiUsers.length > 0 ? (
                            tenshiUsers.map((u, idx) => {
                                const cfg = configMap.dashboard2;
                                return (
                                    <button
                                        key={`tn-${idx}`}
                                        onClick={() => navigate(`/dashboard/dashboard2?viewUser=${u.username}`)}
                                        className="group relative flex flex-col items-center p-6 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 hover:-translate-y-2 overflow-hidden"
                                    >
                                        <div className="relative mb-4">
                                            <div className="w-20 h-20 rounded-3xl flex items-center justify-center font-black text-white text-2xl shadow-xl overflow-hidden transition-transform duration-500 group-hover:scale-110"
                                                style={{ background: `linear-gradient(135deg, ${cfg.accent}, #3b82f6)` }}>
                                                {u.profileImage ? (
                                                    <img 
                                                        src={getImageUrl(u.profileImage)} 
                                                        alt={u.username} 
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.parentElement.innerText = u.username?.charAt(0).toUpperCase() || '?';
                                                        }}
                                                    />
                                                ) : (
                                                    u.username?.charAt(0).toUpperCase() || '?'
                                                )}
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{u.username}</h3>
                                        <div className="mt-4 flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-slate-300 group-hover:text-indigo-500 transition-colors">
                                            Voir Calendrier
                                            <svg className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="col-span-full py-10 text-center text-slate-300 text-[10px] font-bold uppercase tracking-widest bg-white/30 rounded-3xl border border-dashed border-slate-100">Vide</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-12 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                &copy; BiotechpharmaMD &bull; Dashboard Engine
            </div>
        </div>
    );
}
