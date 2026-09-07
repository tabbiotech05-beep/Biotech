import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ReactMarkdown from 'react-markdown';

export default function DashboardSelection() {
    const navigate = useNavigate();
    const allowedDashboards = JSON.parse(localStorage.getItem('allowedDashboards') || '[]');
    const userRole = localStorage.getItem('role');
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
    const [exportingSpecialties, setExportingSpecialties] = React.useState(false);
    const [exportingLocations, setExportingLocations] = React.useState(false);
    const [exportingGrossistes, setExportingGrossistes] = React.useState(false);
    const [manageMode, setManageMode] = React.useState(false);
    const [allDashboardUsers, setAllDashboardUsers] = React.useState({});
    const [togglingUser, setTogglingUser] = React.useState(null);

    const fetchAllUsers = React.useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/auth/all-dashboard-users', {
                headers: { 'x-auth-token': token }
            });
            const data = await res.json();
            setAllDashboardUsers(data);
        } catch (err) {
            console.error('Error fetching all users:', err);
        }
    }, []);

    const toggleHideUser = async (username) => {
        setTogglingUser(username);
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/auth/users/${username}/hide`, {
                method: 'PATCH',
                headers: { 'x-auth-token': token }
            });
            // Refresh both lists
            await fetchAllUsers();
            const res2 = await fetch('/api/auth/dashboard-users', { headers: { 'x-auth-token': token } });
            const data2 = await res2.json();
            setDashboardUsers(data2);
        } catch (err) {
            console.error('Error toggling user:', err);
        } finally {
            setTogglingUser(null);
        }
    };

    // AI Assistant States
    const [showAIModal, setShowAIModal] = React.useState(false);
    const [aiLoading, setAiLoading] = React.useState(false);
    const [aiSummary, setAiSummary] = React.useState('');
    const [aiPeriod, setAiPeriod] = React.useState('day');

    // Supervisor AI States
    const [showSupervisorModal, setShowSupervisorModal] = React.useState(false);
    const [supervisorLoading, setSupervisorLoading] = React.useState(false);
    const [supervisorSummary, setSupervisorSummary] = React.useState('');
    const [supervisorPeriod, setSupervisorPeriod] = React.useState('month');

    // Grossiste AI States
    const [showGrossisteModal, setShowGrossisteModal] = React.useState(false);
    const [grossisteLoading, setGrossisteLoading] = React.useState(false);
    const [grossisteSummary, setGrossisteSummary] = React.useState('');

    const generateAISummary = async (period = 'day') => {
        setAiPeriod(period);
        setAiLoading(true);
        setAiSummary('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/ai/summary?period=${period}`, {
                headers: { 'x-auth-token': token }
            });
            const data = await res.json();
            if (!res.ok) {
                setAiSummary(`Erreur: ${data.message || 'Une erreur est survenue'}`);
            } else {
                setAiSummary(data.summary);
            }
        } catch (err) {
            console.error(err);
            setAiSummary("Erreur de connexion à l'IA.");
        } finally {
            setAiLoading(false);
        }
    };

    const generateSupervisorReport = async (period = 'month') => {
        setSupervisorPeriod(period);
        setSupervisorLoading(true);
        setSupervisorSummary('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/ai/supervisor?period=${period}`, {
                headers: { 'x-auth-token': token }
            });
            const data = await res.json();
            if (!res.ok) {
                setSupervisorSummary(`Erreur: ${data.message || 'Une erreur est survenue'}`);
            } else {
                setSupervisorSummary(data.summary);
            }
        } catch (err) {
            console.error(err);
            setSupervisorSummary("Erreur de connexion à l'IA.");
        } finally {
            setSupervisorLoading(false);
        }
    };

    const generateGrossisteReport = async () => {
        setGrossisteLoading(true);
        setGrossisteSummary('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/ai/grossiste', {
                headers: { 'x-auth-token': token }
            });
            const data = await res.json();
            if (!res.ok) {
                setGrossisteSummary(`Erreur: ${data.message || 'Une erreur est survenue'}`);
            } else {
                setGrossisteSummary(data.summary);
            }
        } catch (err) {
            console.error(err);
            setGrossisteSummary("Erreur de connexion à l'IA.");
        } finally {
            setGrossisteLoading(false);
        }
    };

    const downloadAsPdf = (markdownText, title) => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const maxWidth = pageWidth - margin * 2;
        let y = 20;

        // Header
        doc.setFillColor(99, 102, 241);
        doc.rect(0, 0, pageWidth, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('BiotechpharmaMD', margin, 8);
        const now = new Date();
        doc.text(now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), pageWidth - margin, 8, { align: 'right' });

        // Title
        y = 22;
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, y);
        y += 10;

        // Parse markdown lines
        const lines = markdownText.split('\n');
        doc.setTextColor(51, 65, 85);

        for (const line of lines) {
            if (y > pageHeight - 20) {
                doc.addPage();
                y = 15;
            }

            const trimmed = line.trim();
            if (!trimmed) { y += 4; continue; }

            if (trimmed.startsWith('# ')) {
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 41, 59);
                const wrapped = doc.splitTextToSize(trimmed.replace(/^#+\s*/, ''), maxWidth);
                doc.text(wrapped, margin, y);
                y += wrapped.length * 7 + 3;
            } else if (trimmed.startsWith('## ')) {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(67, 56, 202);
                const wrapped = doc.splitTextToSize(trimmed.replace(/^#+\s*/, ''), maxWidth);
                doc.text(wrapped, margin, y);
                y += wrapped.length * 6 + 2;
            } else if (trimmed.startsWith('### ')) {
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(79, 70, 229);
                const wrapped = doc.splitTextToSize(trimmed.replace(/^#+\s*/, ''), maxWidth);
                doc.text(wrapped, margin, y);
                y += wrapped.length * 5.5 + 2;
            } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(51, 65, 85);
                const clean = trimmed.replace(/^[-*]\s*/, '').replace(/\*\*/g, '').replace(/\*/g, '');
                const wrapped = doc.splitTextToSize('• ' + clean, maxWidth - 6);
                doc.text(wrapped, margin + 4, y);
                y += wrapped.length * 4.5 + 1;
            } else {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(51, 65, 85);
                const clean = trimmed.replace(/\*\*/g, '').replace(/\*/g, '');
                const wrapped = doc.splitTextToSize(clean, maxWidth);
                doc.text(wrapped, margin, y);
                y += wrapped.length * 4.5 + 1;
            }
        }

        const filename = `${title.replace(/\s+/g, '_')}_${now.toISOString().slice(0,10)}.pdf`;
        doc.save(filename);
    };

    // Flatten all users into a single list (use allDashboardUsers in manage mode)
    const allUsers = React.useMemo(() => {
        const source = manageMode ? allDashboardUsers : dashboardUsers;
        const list = [];
        Object.entries(source).forEach(([dashId, users]) => {
            if (Array.isArray(users)) {
                users.forEach(userObj => {
                    const username = typeof userObj === 'string' ? userObj : userObj?.username;
                    const profileImage = typeof userObj === 'string' ? null : userObj?.profileImage;
                    const isHidden = typeof userObj === 'object' ? (userObj?.isHidden || false) : false;
                    if (username) {
                        list.push({ username, profileImage, isHidden, dashboardId: dashId });
                    }
                });
            }
        });
        return list.sort((a, b) => a.username.localeCompare(b.username));
    }, [dashboardUsers, allDashboardUsers, manageMode]);

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

    const downloadSpecialtiesReport = async () => {
        setExportingSpecialties(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/visits/export-specialty-report-2026', {
                headers: { 'x-auth-token': token }
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({ msg: 'Erreur serveur' }));
                alert(errData.msg || 'Erreur lors du téléchargement du fichier Excel.');
                return;
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Visites_Specialites_2026.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Erreur export spécialités:', err);
            alert('Erreur réseau lors de la génération du rapport.');
        } finally {
            setExportingSpecialties(false);
        }
    };

    const downloadLocationsReport = async () => {
        setExportingLocations(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/visits/export-location-report-2026', {
                headers: { 'x-auth-token': token }
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({ msg: 'Erreur serveur' }));
                alert(errData.msg || 'Erreur lors du téléchargement du fichier Excel.');
                return;
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Visites_Villes_Gouvernorats_2026.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Erreur export villes et gouvernorats:', err);
            alert('Erreur réseau lors de la génération du rapport.');
        } finally {
            setExportingLocations(false);
        }
    };

    const downloadGrossistesSalesReport = async () => {
        setExportingGrossistes(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/wholesalers/export-local-sales', {
                headers: { 'x-auth-token': token }
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({ msg: 'Erreur serveur' }));
                alert(errData.msg || 'Erreur lors du téléchargement du fichier Excel.');
                return;
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Ventes_Grossistes_Produits_Locaux_2026.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Erreur export ventes grossistes:', err);
            alert('Erreur réseau lors de la génération du rapport.');
        } finally {
            setExportingGrossistes(false);
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
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={downloadAllExpenses}
                            disabled={downloading}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-md hover:opacity-90 transition-all disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                        >
                            {downloading ? (
                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            )}
                            Télécharger Notes de Frais
                        </button>
                        {userRole === 'admin' && (
                            <button
                                onClick={downloadSpecialtiesReport}
                                disabled={exportingSpecialties}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-50 border border-emerald-300 shadow-sm hover:bg-emerald-100 transition-all disabled:opacity-60"
                                title="Télécharger le fichier Excel des pourcentages de visites par spécialité pour chaque semaine de 2026"
                            >
                                {exportingSpecialties ? (
                                    <span className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                )}
                                Export Spécialités 2026
                            </button>
                        )}
                        {userRole === 'admin' && (
                            <button
                                onClick={downloadLocationsReport}
                                disabled={exportingLocations}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-teal-800 bg-teal-50 border border-teal-300 shadow-sm hover:bg-teal-100 transition-all disabled:opacity-60"
                                title="Télécharger le fichier Excel des pourcentages de visites par ville et gouvernorat pour chaque semaine de 2026"
                            >
                                {exportingLocations ? (
                                    <span className="w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                )}
                                Export Villes & Gouv. 2026
                            </button>
                        )}
                        {userRole === 'admin' && (
                            <button
                                onClick={downloadGrossistesSalesReport}
                                disabled={exportingGrossistes}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-amber-900 bg-amber-50 border border-amber-300 shadow-sm hover:bg-amber-100 transition-all disabled:opacity-60"
                                title="Télécharger le fichier Excel des ventes des grossistes par produit local"
                            >
                                {exportingGrossistes ? (
                                    <span className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                )}
                                Export Ventes Grossistes
                            </button>
                        )}
                        {userRole === 'admin' && (
                            <button
                                onClick={() => { setShowAIModal(true); if(!aiSummary) generateAISummary('day'); }}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-200 shadow-sm hover:bg-indigo-100 transition-all"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Assistant IA
                            </button>
                        )}
                        {userRole === 'admin' && (
                            <button
                                onClick={() => { setShowSupervisorModal(true); if(!supervisorSummary) generateSupervisorReport('month'); }}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 shadow-sm hover:bg-amber-100 transition-all"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Superviseur IA
                            </button>
                        )}
                        {userRole === 'admin' && (
                            <button
                                onClick={() => { setShowGrossisteModal(true); if(!grossisteSummary) generateGrossisteReport(); }}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-700 bg-rose-50 border border-rose-200 shadow-sm hover:bg-rose-100 transition-all"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                Analyse Grossiste
                            </button>
                        )}
                        {userRole === 'admin' && (
                            <button
                                onClick={() => {
                                    if (!manageMode) fetchAllUsers();
                                    setManageMode(m => !m);
                                }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm transition-all ${
                                    manageMode
                                        ? 'text-white bg-slate-700 border-slate-700 hover:bg-slate-800'
                                        : 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {manageMode ? 'Quitter Gérer' : 'Gérer'}
                            </button>
                        )}
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
                                        className={`group relative flex flex-col items-center p-4 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 hover:-translate-y-2 overflow-hidden ${u.isHidden ? 'opacity-50 grayscale hover:opacity-100 hover:grayscale-0' : ''}`}
                                    >
                                        {manageMode && (
                                            <div
                                                onClick={(e) => { e.stopPropagation(); toggleHideUser(u.username); }}
                                                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer border border-slate-200 shadow-sm"
                                                title={u.isHidden ? "Réafficher l'utilisateur" : "Masquer l'utilisateur"}
                                            >
                                                {togglingUser === u.username ? (
                                                    <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                                ) : u.isHidden ? (
                                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                ) : (
                                                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.71-2.29c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                                )}
                                            </div>
                                        )}
                                        <div className="relative mb-3">
                                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white text-lg shadow-xl overflow-hidden transition-transform duration-500 group-hover:scale-110"
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
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{u.username}</h3>
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
                                        className={`group relative flex flex-col items-center p-4 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 hover:-translate-y-2 overflow-hidden ${u.isHidden ? 'opacity-50 grayscale hover:opacity-100 hover:grayscale-0' : ''}`}
                                    >
                                        {manageMode && (
                                            <div
                                                onClick={(e) => { e.stopPropagation(); toggleHideUser(u.username); }}
                                                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer border border-slate-200 shadow-sm"
                                                title={u.isHidden ? "Réafficher l'utilisateur" : "Masquer l'utilisateur"}
                                            >
                                                {togglingUser === u.username ? (
                                                    <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                                ) : u.isHidden ? (
                                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                ) : (
                                                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.71-2.29c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                                )}
                                            </div>
                                        )}
                                        <div className="relative mb-3">
                                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white text-lg shadow-xl overflow-hidden transition-transform duration-500 group-hover:scale-110"
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

            {/* AI Assistant Modal */}
            {showAIModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800">Assistant IA Administrateur</h2>
                                    <p className="text-xs font-bold text-slate-400">Résumé automatisé des activités et ventes</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {aiSummary && !aiLoading && (
                                    <button
                                        onClick={() => downloadAsPdf(aiSummary, 'Assistant_IA_Resume')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        PDF
                                    </button>
                                )}
                                <button onClick={() => setShowAIModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-4 bg-white border-b border-slate-100 flex flex-wrap gap-2 justify-center">
                            {[
                                { id: 'day', label: "Aujourd'hui" },
                                { id: 'week', label: "Cette Semaine" },
                                { id: 'month', label: "Ce Mois" },
                                { id: 'all', label: "Général" }
                            ].map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => generateAISummary(p.id)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                        aiPeriod === p.id
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                            {aiLoading ? (
                                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                    <p className="text-sm font-bold text-slate-400 animate-pulse">L'IA analyse les données des équipes...</p>
                                </div>
                            ) : (
                                <div className="prose prose-sm md:prose-base prose-indigo max-w-none prose-headings:font-black prose-h1:text-2xl prose-h2:text-xl prose-p:font-medium prose-p:text-slate-600">
                                    <ReactMarkdown>{aiSummary}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Supervisor AI Modal */}
            {showSupervisorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-amber-100">
                        <div className="p-6 border-b border-amber-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800">Superviseur IA</h2>
                                    <p className="text-xs font-bold text-amber-600">Évaluation KPI & Classement des Délégués</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {supervisorSummary && !supervisorLoading && (
                                    <button
                                        onClick={() => downloadAsPdf(supervisorSummary, 'Superviseur_IA_Rapport')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        PDF
                                    </button>
                                )}
                                <button onClick={() => setShowSupervisorModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-amber-200 text-slate-400 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-4 bg-white border-b border-amber-100 flex flex-wrap gap-2 justify-center">
                            {[
                                { id: 'day', label: "Aujourd'hui" },
                                { id: 'week', label: "Cette Semaine" },
                                { id: 'month', label: "Ce Mois" },
                                { id: 'all', label: "Général" }
                            ].map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => generateSupervisorReport(p.id)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                        supervisorPeriod === p.id
                                            ? 'bg-amber-600 text-white shadow-md shadow-amber-200'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 bg-amber-50/30">
                            {supervisorLoading ? (
                                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                                    <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
                                    <p className="text-sm font-bold text-amber-500 animate-pulse">Le Superviseur IA évalue les performances...</p>
                                </div>
                            ) : (
                                <div className="prose prose-sm md:prose-base prose-amber max-w-none prose-headings:font-black prose-h1:text-2xl prose-h2:text-xl prose-p:font-medium prose-p:text-slate-600">
                                    <ReactMarkdown>{supervisorSummary}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* AI Grossiste Modal */}
            {showGrossisteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-rose-100 bg-rose-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shadow-inner">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800">Analyse Grossiste (IA Stricte)</h3>
                                    <p className="text-sm font-semibold text-rose-600/80">
                                        Performance des ventes locales vs CM
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => downloadAsPdf(grossisteSummary, "Analyse Stricte des Ventes Grossistes (Locales vs CM)")}
                                    disabled={grossisteLoading || !grossisteSummary}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50"
                                    title="Télécharger en PDF"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setShowGrossisteModal(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                            {grossisteLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 text-rose-500">
                                    <span className="w-12 h-12 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin mb-4" />
                                    <p className="font-bold animate-pulse">L'IA analyse strictement les chiffres...</p>
                                </div>
                            ) : (
                                <div className="prose prose-slate max-w-none prose-headings:font-black prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-800">
                                    {grossisteSummary ? (
                                        <ReactMarkdown>{grossisteSummary}</ReactMarkdown>
                                    ) : (
                                        <p className="text-center text-slate-400 italic py-10">Aucun rapport généré.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between items-center">
                            <p className="text-xs font-semibold text-slate-400">
                                Analyse générée par Google Gemini
                            </p>
                            <button
                                onClick={() => generateGrossisteReport()}
                                disabled={grossisteLoading}
                                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm shadow-md shadow-rose-200 transition-all disabled:opacity-50"
                            >
                                Régénérer l'Analyse
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
