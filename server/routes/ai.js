import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Visit from '../models/Visit.js';
import User from '../models/User.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Expense from '../models/Expense.js';
import Congress from '../models/Congress.js';
import Sectorisation from '../models/Sectorisation.js';
import SampleHistory from '../models/SampleHistory.js';
import Cycle from '../models/Cycle.js';
import auth from '../middleware/auth.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Helper to calculate date ranges
const getDateRange = (period) => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    if (period === 'day') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
        // Monday as start of week
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
    } else {
        // 'all'
        start.setFullYear(2000);
        end.setFullYear(2100);
    }
    return { start, end };
};

// Helper to aggregate sales JSON data
const getSalesSummary = () => {
    try {
        const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, '0');
        
        // Paths
        const biotechPath = path.join(__dirname, '../../sales-dashboard/public/sales_data.json');
        const tenshiPath = path.join(__dirname, '../../sales-dashboard/public/local_sales_data.json');
        
        let biotechSales = 0;
        let biotechProducts = {};
        if (fs.existsSync(biotechPath)) {
            const data = JSON.parse(fs.readFileSync(biotechPath, 'utf-8'));
            // Filter for current month to reduce size
            const currentMonthData = data.filter(d => d.mois === currentMonthStr);
            currentMonthData.forEach(d => {
                biotechSales += (Number(d.montant) || 0);
                biotechProducts[d.libelle] = (biotechProducts[d.libelle] || 0) + (Number(d.qte) || 0);
            });
        }

        let tenshiSales = 0;
        let tenshiProducts = {};
        if (fs.existsSync(tenshiPath)) {
            const data = JSON.parse(fs.readFileSync(tenshiPath, 'utf-8'));
            const currentMonthData = data.filter(d => d.mois === currentMonthStr);
            currentMonthData.forEach(d => {
                // local_sales_data might not have "montant", so we count quantity
                tenshiProducts[d.libelle] = (tenshiProducts[d.libelle] || 0) + (Number(d.qte) || 0);
                tenshiSales += (Number(d.qte) || 0); // fallback if montant is missing
            });
        }

        return {
            month: currentMonthStr,
            biotech: {
                totalAmount: biotechSales,
                topProducts: Object.entries(biotechProducts).sort((a,b)=>b[1]-a[1]).slice(0, 5)
            },
            tenshi: {
                totalQuantity: tenshiSales,
                topProducts: Object.entries(tenshiProducts).sort((a,b)=>b[1]-a[1]).slice(0, 5)
            }
        };
    } catch (err) {
        console.error("Error reading sales data for AI:", err);
        return { error: "Données de ventes non disponibles" };
    }
};

// @route   GET api/ai/summary
// @desc    Generate an AI summary of activities and sales
// @access  Private (Admin only)
router.get('/summary', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Accès refusé. Administrateurs uniquement.' });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ message: 'Clé API Gemini manquante dans le fichier .env' });
        }

        const period = req.query.period || 'day'; // day, week, month, all
        const { start, end } = getDateRange(period);

        // Fetch Visits
        const visits = await Visit.find({
            start: { $gte: start, $lte: end }
        }).populate('user', 'username');

        // Separate visits by team
        const biotechVisits = visits.filter(v => v.dashboardId === 'dashboard1');
        const tenshiVisits = visits.filter(v => v.dashboardId === 'dashboard2');

        // Summarize visits for prompt to save tokens
        const formatVisits = (visitList) => {
            if (visitList.length === 0) return "Aucune activité signalée.";
            
            const grouped = {};
            visitList.forEach(v => {
                const name = v.user?.username || 'Inconnu';
                if (!grouped[name]) grouped[name] = [];
                let target = v.doctorName || v.pharmacyName || v.wholesalerName || v.title || 'Inconnu';
                grouped[name].push(`${v.targetType || 'Visite'} chez ${target}: ${v.details || 'Pas de détails'}`);
            });

            return Object.entries(grouped).map(([name, tasks]) => {
                return `Délégué: ${name}\nActivités:\n- ${tasks.join('\n- ')}`;
            }).join('\n\n');
        };

        const salesData = getSalesSummary();

        // Build the Prompt
        const prompt = `
Vous êtes un assistant IA pour un administrateur dans l'industrie pharmaceutique (BiotechpharmaMD).
Générez un rapport DÉTAILLÉ et EXHAUSTIF des activités et des ventes pour la période: ${period === 'day' ? "Aujourd'hui" : period === 'week' ? "Cette Semaine" : period === 'month' ? "Ce Mois" : "Général"}.

Règles importantes:
1. Séparez clairement le résumé en deux parties: ÉQUIPE BIOTECH et ÉQUIPE TENSHI.
2. EXHAUSTIVITÉ OBLIGATOIRE : Vous DEVEZ analyser et inclure une sous-section pour CHAQUE délégué présent dans les données brutes ci-dessous. N'omettez absolument AUCUN délégué, même s'il a peu d'activité.
3. Pour chaque délégué, détaillez ses visites (qui a fait quoi, chez qui, et pourquoi).
4. Intégrez une analyse détaillée des ventes du mois en cours basées sur les données fournies.
5. FORMATAGE PDF-FRIENDLY : Utilisez UNIQUEMENT du texte, des titres (#) et des listes à puces (-).
6. INTERDICTION STRICTE : NE CRÉEZ AUCUN TABLEAU MARKDOWN (n'utilisez jamais le caractère |). N'UTILISEZ AUCUN EMOJI.
7. Soyez analytique (ex: "forte activité chez les médecins", "bon volume sur tel produit").

Voici les données brutes:

--- ÉQUIPE BIOTECH ---
Rapports de visites:
${formatVisits(biotechVisits)}

Ventes (Mois en cours: ${salesData.month}):
Montant total: ${salesData.biotech?.totalAmount} DT
Top 5 produits: ${JSON.stringify(salesData.biotech?.topProducts)}

--- ÉQUIPE TENSHI ---
Rapports de visites:
${formatVisits(tenshiVisits)}

Ventes (Mois en cours: ${salesData.month}):
Quantité totale: ${salesData.tenshi?.totalQuantity}
Top 5 produits: ${JSON.stringify(salesData.tenshi?.topProducts)}

Rédigez le rapport détaillé maintenant:
`;

        // Call Gemini with fallback models and retry
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash'];
        let responseText = null;
        let lastError = null;

        for (const modelName of modelsToTry) {
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    console.log(`AI: Trying ${modelName} (attempt ${attempt})...`);
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(prompt);
                    responseText = result.response.text();
                    break; // Success
                } catch (e) {
                    lastError = e;
                    console.warn(`AI: ${modelName} attempt ${attempt} failed: ${e.message}`);
                    if (e.message?.includes('503') && attempt < 2) {
                        await new Promise(r => setTimeout(r, 3000)); // wait 3s before retry
                    } else {
                        break; // Try next model
                    }
                }
            }
            if (responseText) break; // Got a successful response
        }

        if (!responseText) {
            throw lastError || new Error('Tous les modèles IA sont indisponibles');
        }

        res.json({ summary: responseText });
    } catch (err) {
        console.error('Error generating AI summary:', err);
        const isQuota = err.message?.includes('429') || err.message?.includes('quota');
        const isOverloaded = err.message?.includes('503');
        const userMessage = isQuota
            ? "Quota API dépassé. Veuillez réessayer dans quelques minutes ou passer à un plan payant Google AI."
            : isOverloaded
            ? "Les serveurs IA sont temporairement surchargés. Veuillez réessayer dans quelques secondes."
            : "Erreur lors de la génération du résumé";
        res.status(500).json({ message: userMessage, error: err.message });
    }
});

// ─── SUPERVISEUR AI ──────────────────────────────────────────────────────────
// @route   GET api/ai/supervisor
// @desc    Generate a strict KPI-based performance report for all delegates
// @access  Private (Admin only)
router.get('/supervisor', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Accès refusé. Administrateurs uniquement.' });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ message: 'Clé API Gemini manquante dans le fichier .env' });
        }

        const period = req.query.period || 'month'; // day, week, month, all
        const { start, end } = getDateRange(period);

        // Tunisian national holidays (fixed dates for simplicity, excluding variable religious holidays for now)
        const tunisianHolidays = [
            '01-01', // Nouvel an
            '03-20', // Fête de l'Indépendance
            '04-09', // Fête des Martyrs
            '05-01', // Fête du Travail
            '07-25', // Fête de la République
            '08-13', // Fête de la Femme
            '10-15'  // Fête de l'Évacuation
        ];

        // Fetch all delegates
        const delegates = await User.find({ role: 'delegue' }).select('username allowedDashboards');

        // Fetch all visits for the period
        const visits = await Visit.find({
            start: { $gte: start, $lte: end }
        }).populate('user', 'username allowedDashboards');

        // Fetch approved leave requests for the period
        const leaves = await LeaveRequest.find({
            status: 'approved',
            $or: [
                { startDate: { $lte: end }, endDate: { $gte: start } }
            ]
        });

        // Calculate total possible days in period (excluding Sundays)
        let totalPossibleDays = 0;
        let currentDate = new Date(start);
        while (currentDate <= end) {
            const dayOfWeek = currentDate.getDay();
            const monthDay = `${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
            
            if (dayOfWeek !== 0 && !tunisianHolidays.includes(monthDay)) { // Exclude Sundays and Holidays
                totalPossibleDays++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Build KPI data per delegate
        const kpiData = delegates.map(delegate => {
            const delegateVisits = visits.filter(v => 
                v.user && v.user._id.toString() === delegate._id.toString()
            );

            // Calculate delegate's specific leave days in the period
            let delegateLeaveDays = 0;
            const delegateLeaves = leaves.filter(l => l.user.toString() === delegate._id.toString());
            delegateLeaves.forEach(leave => {
                let leaveStart = new Date(Math.max(start, leave.startDate));
                let leaveEnd = new Date(Math.min(end, leave.endDate));
                while (leaveStart <= leaveEnd) {
                    const dayOfWeek = leaveStart.getDay();
                    const monthDay = `${String(leaveStart.getMonth() + 1).padStart(2, '0')}-${String(leaveStart.getDate()).padStart(2, '0')}`;
                    if (dayOfWeek !== 0 && !tunisianHolidays.includes(monthDay)) {
                        delegateLeaveDays++;
                    }
                    leaveStart.setDate(leaveStart.getDate() + 1);
                }
            });

            const actualWorkingDays = Math.max(1, totalPossibleDays - delegateLeaveDays); // Avoid division by zero
            const visitsPerWorkingDay = (delegateVisits.length / actualWorkingDays).toFixed(1);

            const team = delegate.allowedDashboards?.includes('dashboard2') ? 'Tenshi' : 'Biotech';

            // Count visit types
            const medecinVisits = delegateVisits.filter(v => v.targetType === 'medecin');
            const pharmacieVisits = delegateVisits.filter(v => v.targetType === 'pharmacie');
            const grossisteVisits = delegateVisits.filter(v => v.targetType === 'grossiste');

            // Unique doctors visited
            const uniqueDoctors = new Set(medecinVisits.map(v => v.doctorName).filter(Boolean));
            
            // Unique pharmacies visited
            const uniquePharmacies = new Set(pharmacieVisits.map(v => v.pharmacyName).filter(Boolean));

            // Governorates (secteurs) covered
            const governorates = new Set(delegateVisits.map(v => v.governorate).filter(Boolean));

            // Prescribers ratio
            const prescribers = medecinVisits.filter(v => v.prescriberType === 'prescripteur').length;

            // Samples given
            let totalSamples = 0;
            delegateVisits.forEach(v => {
                totalSamples += (v.givenSampleQty || 0);
                if (v.givenSamples) {
                    v.givenSamples.forEach(s => { totalSamples += (s.count || 0); });
                }
            });

            // Visits with details filled (quality indicator)
            const visitsWithDetails = delegateVisits.filter(v => v.details && v.details.trim().length > 10).length;

            return {
                name: delegate.username,
                team,
                totalVisits: delegateVisits.length,
                actualWorkingDays,
                delegateLeaveDays,
                visitsPerWorkingDay,
                medecinVisits: medecinVisits.length,
                pharmacieVisits: pharmacieVisits.length,
                grossisteVisits: grossisteVisits.length,
                uniqueDoctors: uniqueDoctors.size,
                uniquePharmacies: uniquePharmacies.size,
                governorates: [...governorates],
                prescribers,
                nonPrescribers: medecinVisits.length - prescribers,
                totalSamples,
                visitsWithDetails,
                detailRate: delegateVisits.length > 0 ? Math.round((visitsWithDetails / delegateVisits.length) * 100) : 0
            };
        });

        const biotechKPIs = kpiData.filter(k => k.team === 'Biotech');
        const tenshiKPIs = kpiData.filter(k => k.team === 'Tenshi');

        const formatKPIs = (list, isTenshi) => {
            if (list.length === 0) return "Aucun délégué trouvé.";
            return list.map(k => {
                let text = `Délégué: ${k.name}
  - Jours de travail réels: ${k.actualWorkingDays} jours (Jours de congé/absences: ${k.delegateLeaveDays})
  - Visites totales: ${k.totalVisits} (Fréquence moyenne: ${k.visitsPerWorkingDay} visites / jour)
  - Médecins: ${k.medecinVisits} (${k.uniqueDoctors} uniques) | Pharmacies: ${k.pharmacieVisits} (${k.uniquePharmacies} uniques) | Grossistes: ${k.grossisteVisits}
  - Prescripteurs: ${k.prescribers} | Non-prescripteurs: ${k.nonPrescribers}
  - Secteurs couverts: ${k.governorates.length > 0 ? k.governorates.join(', ') : 'Non renseigné'}
  - Qualité et Assiduité des rapports: ${k.detailRate}% des visites avec descriptions détaillées`;
                
                if (isTenshi) {
                    text += `\n  - Échantillons distribués: ${k.totalSamples}`;
                }
                return text;
            }).join('\n\n');
        };

        const periodLabel = period === 'day' ? "Aujourd'hui" : period === 'week' ? "Cette Semaine" : period === 'month' ? "Ce Mois" : "Général";

        const prompt = `
Vous êtes un SUPERVISEUR STRICT et ANALYTIQUE dans l'industrie pharmaceutique (BiotechpharmaMD).
Votre rôle est d'évaluer la performance de chaque délégué médical de manière objective et exigeante.

Période analysée: ${periodLabel}

INSTRUCTIONS STRICTES:
1. Analysez CHAQUE délégué individuellement — n'en omettez AUCUN.
2. Évaluation de l'Équipe Biotech : NE PARLEZ PAS D'ÉCHANTILLONS, ils n'en ont pas. Évaluez-les sur la fréquence de visites, le ratio de prescripteurs, la couverture des secteurs et l'assiduité des rapports.
3. Évaluation de l'Équipe Tenshi : Évaluez-les sur les mêmes critères PLUS la distribution d'échantillons.
4. Pour chaque délégué, fournissez une analyse structurée :
   - Statut : [PERFORMANT], [MOYEN] ou [EN DIFFICULTÉ]
   - Fréquence de visite : Évaluez le nombre moyen de visites par jour travaillé (prenez en compte les jours de congés et fériés listés).
   - Assiduité de rédaction : Jugez le taux de rapports contenant des détails.
   - Points forts : Ce que le délégué fait de bien.
   - Points faibles : Ce qu'il doit améliorer.
5. Classez les délégués du MEILLEUR au MOINS BON dans chaque équipe.
6. Séparez en deux sections: **ÉQUIPE BIOTECH** et **ÉQUIPE TENSHI**.
7. Terminez par un CLASSEMENT GÉNÉRAL.
8. FORMATAGE PDF-FRIENDLY : Utilisez UNIQUEMENT du texte, des titres (#) et des listes à puces (-).
9. INTERDICTION STRICTE : NE CRÉEZ ABSOLUMENT AUCUN TABLEAU MARKDOWN (n'utilisez jamais le caractère |). N'utilisez AUCUN EMOJI ou caractère spécial.

DONNÉES KPI BRUTES:

=== ÉQUIPE BIOTECH (${biotechKPIs.length} délégués) ===
${formatKPIs(biotechKPIs, false)}

=== ÉQUIPE TENSHI (${tenshiKPIs.length} délégués) ===
${formatKPIs(tenshiKPIs, true)}

Rédigez votre rapport de supervision maintenant:
`;

        // Call Gemini with fallback
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash'];
        let responseText = null;
        let lastError = null;

        for (const modelName of modelsToTry) {
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    console.log(`Supervisor AI: Trying ${modelName} (attempt ${attempt})...`);
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(prompt);
                    responseText = result.response.text();
                    break;
                } catch (e) {
                    lastError = e;
                    console.warn(`Supervisor AI: ${modelName} attempt ${attempt} failed: ${e.message}`);
                    if (e.message?.includes('503') && attempt < 2) {
                        await new Promise(r => setTimeout(r, 3000));
                    } else {
                        break;
                    }
                }
            }
            if (responseText) break;
        }

        if (!responseText) {
            throw lastError || new Error('Tous les modèles IA sont indisponibles');
        }

        res.json({ summary: responseText });
    } catch (err) {
        console.error('Error generating Supervisor AI report:', err);
        const isQuota = err.message?.includes('429') || err.message?.includes('quota');
        const isOverloaded = err.message?.includes('503');
        const userMessage = isQuota
            ? "Quota API dépassé. Veuillez réessayer dans quelques minutes."
            : isOverloaded
            ? "Les serveurs IA sont temporairement surchargés. Veuillez réessayer."
            : "Erreur lors de la génération du rapport de supervision";
        res.status(500).json({ message: userMessage, error: err.message });
    }
});

// ─── ANALYSE GROSSISTE AI ────────────────────────────────────────────────────────
// @route   GET api/ai/grossiste
// @desc    Generate a strict, detailed report on local sales vs CM and vs previous month
// @access  Private (Admin only)
router.get('/grossiste', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Accès refusé. Administrateurs uniquement.' });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ message: 'Clé API Gemini manquante dans le fichier .env' });
        }

        const tenshiPath = path.join(__dirname, '../../sales-dashboard/public/local_sales_data.json');
        const cmPath = path.join(__dirname, '../../sales-dashboard/public/cm_data.json');

        if (!fs.existsSync(tenshiPath) || !fs.existsSync(cmPath)) {
            return res.status(500).json({ message: "Les fichiers de données (ventes locales ou CM) sont introuvables." });
        }

        const localSales = JSON.parse(fs.readFileSync(tenshiPath, 'utf-8'));
        const cmData = JSON.parse(fs.readFileSync(cmPath, 'utf-8'));

        const LOCAL_PRODUCTS_ALLOWED = ['amlor', 'tahor', 'celebrex', 'zoloft'];

        // Find the 2 most recent months in the data
        const allMonths = [...new Set(
            localSales
                .filter(item => LOCAL_PRODUCTS_ALLOWED.some(p => item.libelle?.toLowerCase().includes(p)))
                .map(item => `${item.annee}-${item.mois}`)
        )].sort();

        const currentMonthKey = allMonths[allMonths.length - 1];
        const prevMonthKey = allMonths[allMonths.length - 2] || null;
        const [currentYear, currentMonth] = currentMonthKey.split('-');
        const [prevYear, prevMonth] = prevMonthKey ? prevMonthKey.split('-') : [null, null];

        // Helper: aggregate sales for a given year+month
        const aggregateSales = (year, month) => {
            const result = {}; // { clientName: { product: qty, _total: n } }
            localSales
                .filter(item =>
                    item.annee === year &&
                    item.mois === month &&
                    LOCAL_PRODUCTS_ALLOWED.some(p => item.libelle?.toLowerCase().includes(p))
                )
                .forEach(item => {
                    if (!result[item.nom_client]) result[item.nom_client] = { _total: 0 };
                    result[item.nom_client][item.libelle] = (result[item.nom_client][item.libelle] || 0) + (Number(item.qte) || 0);
                    result[item.nom_client]._total += (Number(item.qte) || 0);
                });
            return result;
        };

        const currentSales = aggregateSales(currentYear, currentMonth);
        const prevSales = prevYear ? aggregateSales(prevYear, prevMonth) : {};

        // All known clients (historically active)
        const allKnownClients = [...new Set(
            localSales
                .filter(item => LOCAL_PRODUCTS_ALLOWED.some(p => item.libelle?.toLowerCase().includes(p)))
                .map(item => item.nom_client)
        )].filter(c => c && c !== 'INCONNU').sort();

        const activeClientsThisMonth = Object.keys(currentSales).filter(c => c !== 'INCONNU');

        // --- CATEGORY 1: Inactive this month (bought before, not now) ---
        const inactiveClients = allKnownClients.filter(c => !activeClientsThisMonth.includes(c));

        // --- CATEGORY 2: Active this month - compare to previous month & CM ---
        const activeAnalysis = activeClientsThisMonth.map(client => {
            const current = currentSales[client];
            const prev = prevSales[client];
            const currentTotal = current._total || 0;
            const prevTotal = prev ? prev._total || 0 : 0;
            const diff = prevTotal > 0 ? currentTotal - prevTotal : null;
            const diffPct = prevTotal > 0 ? ((diff / prevTotal) * 100).toFixed(1) : null;

            // CM comparison: sum CM of all products present this month
            let totalCM = 0;
            Object.keys(current).filter(k => k !== '_total').forEach(product => {
                totalCM += cmData[product] || 0;
            });
            const cmGap = currentTotal - totalCM;

            // Product detail
            const productLines = Object.entries(current)
                .filter(([k]) => k !== '_total')
                .map(([product, qty]) => {
                    const cm = cmData[product] || 0;
                    const gap = qty - cm;
                    return `${product}: Vendu=${qty}, CM=${cm}, Écart=${gap >= 0 ? '+' : ''}${gap}`;
                });

            return { client, currentTotal, prevTotal, diff, diffPct, totalCM, cmGap, productLines, status: cmGap < 0 ? 'SOUS CM' : 'AU-DESSUS CM', trend: diff === null ? 'NOUVEAU' : diff < 0 ? 'EN BAISSE' : diff > 0 ? 'EN HAUSSE' : 'STABLE' };
        });

        // Sort by CM gap (worst first)
        activeAnalysis.sort((a, b) => a.cmGap - b.cmGap);
        const declining = activeAnalysis.filter(a => a.trend === 'EN BAISSE');
        const underCM = activeAnalysis.filter(a => a.status === 'SOUS CM');
        const overCM = activeAnalysis.filter(a => a.status === 'AU-DESSUS CM');

        // --- Build the detailed prompt ---
        const monthLabel = (m) => {
            const months = { '01':'Janvier','02':'Février','03':'Mars','04':'Avril','05':'Mai','06':'Juin','07':'Juillet','08':'Août','09':'Septembre','10':'Octobre','11':'Novembre','12':'Décembre' };
            return months[m] || m;
        };

        let promptData = `
== CONTEXTE ==
Mois analysé : ${monthLabel(currentMonth)} ${currentYear}
Mois de comparaison : ${prevMonth ? monthLabel(prevMonth) + ' ' + prevYear : 'N/A'}
Nombre total de grossistes actifs historiquement : ${allKnownClients.length}
Grossistes actifs ce mois : ${activeClientsThisMonth.length}
Grossistes inactifs ce mois : ${inactiveClients.length}

== GROSSISTES N'AYANT PAS COMMANDE CE MOIS (${inactiveClients.length} grossistes) ==
${inactiveClients.map(c => `- ${c}`).join('\n')}

== GROSSISTES EN BAISSE vs MOIS PRECEDENT (${declining.length} grossistes) ==
${declining.map(a => `- ${a.client}: ${a.prevTotal} -> ${a.currentTotal} (${a.diffPct}%)`).join('\n') || 'Aucun'}

== GROSSISTES SOUS LA CM (${underCM.length} grossistes) ==
${underCM.map(a => `- ${a.client}: Total vendu=${a.currentTotal}, CM cible=${a.totalCM}, Écart=${a.cmGap}`).join('\n') || 'Aucun'}

== GROSSISTES AU-DESSUS DE LA CM (${overCM.length} grossistes) ==
${overCM.map(a => `- ${a.client}: Total vendu=${a.currentTotal}, CM cible=${a.totalCM}, Écart=+${a.cmGap}`).join('\n') || 'Aucun'}

== DETAIL PAR GROSSISTE ACTIF ==
${activeAnalysis.map(a => `${a.client} [${a.trend} / ${a.status}]\n${a.productLines.map(l => '  - ' + l).join('\n')}`).join('\n\n')}
`;

        const prompt = `
Vous êtes un DIRECTEUR COMMERCIAL EXPÉRIMENTÉ et EXIGEANT dans l'industrie pharmaceutique, responsable de l'équipe de ventes "Tenshi".
Vous rédigez un compte-rendu de performance mensuelle sur les ventes des produits locaux (Amlor, Tahor, Celebrex, Zoloft) auprès des grossistes.

Votre analyse doit couvrir OBLIGATOIREMENT les sections suivantes dans cet ordre:

# 1. BILAN GÉNÉRAL
Donnez un bilan global chiffré du mois : nombre de grossistes actifs vs inactifs, ratio sous/au-dessus CM, tendance globale vs mois précédent. Soyez direct et sans concession.

# 2. LISTE ROUGE - GROSSISTES INACTIFS CE MOIS
Nommez EXPLICITEMENT chaque grossiste qui n'a pas passé commande ce mois. Insistez sur la gravité de cette situation et exigez une visite obligatoire de l'équipe de ventes pour chacun d'eux.

# 3. GROSSISTES EN BAISSE
Analysez les grossistes dont le volume a baissé vs le mois précédent. Pour chaque un, quantifiez la perte et formulez une question directe à l'équipe de ventes pour expliquer cette baisse.

# 4. GROSSISTES SOUS LA CONSOMMATION MOYENNE (CM)
Listez les grossistes qui commandent en deçà de la CM. C'est inacceptable. Exigez un plan d'action chiffré.

# 5. POINTS POSITIFS (Grossistes au-dessus de la CM)
Mentionnez brièvement les bons résultats pour équilibrer le bilan, mais restez concis.

# 6. PLAN D'ACTION EXIGÉ
Formulez 5 actions concrètes et immédiates que l'équipe de ventes doit mettre en place cette semaine.

Règles de forme:
- Ton FERME et EXIGEANT, jamais complaisant
- Citez les noms des grossistes explicitement dans chaque section
- FORMATAGE: Uniquement du texte, des titres (#) et des listes à puces (-)
- INTERDIT: Tableaux markdown (caractère |) et emojis

DONNÉES BRUTES:
${promptData}

Rédigez votre rapport maintenant:
`;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash'];
        let responseText = null;
        let lastError = null;

        for (const modelName of modelsToTry) {
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    console.log(`Grossiste AI: Trying ${modelName} (attempt ${attempt})...`);
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(prompt);
                    responseText = result.response.text();
                    break;
                } catch (e) {
                    lastError = e;
                    console.warn(`Grossiste AI: ${modelName} attempt ${attempt} failed: ${e.message}`);
                    if (e.message?.includes('503') && attempt < 2) {
                        await new Promise(r => setTimeout(r, 3000));
                    } else {
                        break;
        // ─── CHAT IA CONTEXTUEL ──────────────────────────────────────────────────────
// @route   POST api/ai/chat
// @desc    Answer any admin question with full access to all project data
// @access  Private (Admin only)
router.post('/chat', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Accès refusé. Administrateurs uniquement.' });
        }
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ message: 'Clé API Gemini manquante dans le fichier .env' });
        }

        const { question, history = [] } = req.body;
        if (!question || !question.trim()) {
            return res.status(400).json({ message: 'Question vide.' });
        }

        // ─── Gather all available context ────────────────────────────────────
        const now = new Date();
        const monthStr = String(now.getMonth() + 1).padStart(2, '0');
        const since180 = new Date(now); since180.setDate(since180.getDate() - 180);

        // 1. DB: All delegates
        const delegates = await User.find({ role: 'delegue' }).select('username allowedDashboards').lean();

        // 2. DB: Recent visits (last 180 days)
        const visits = await Visit.find({ start: { $gte: since180 } })
            .populate('user', 'username')
            .select('user targetType doctorName pharmacyName wholesalerName details start governorate dashboardId')
            .lean();

        // 3. DB: Leave requests
        const leaves = await LeaveRequest.find({})
            .populate('user', 'username')
            .select('user status startDate endDate reason')
            .lean();

        // 4. DB: Expenses
        const expenses = await Expense.find({ date: { $gte: since180 } })
            .populate('user', 'username')
            .select('user date totalAmount status')
            .lean();

        // 5. DB: Congresses
        const congresses = await Congress.find({})
            .populate('participants', 'username')
            .select('name location startDate endDate participants status')
            .lean();

        // 6. DB: Sectorisation
        const sectorisations = await Sectorisation.find({})
            .populate('delegue', 'username')
            .lean();

        // 7. DB: Sample History
        const sampleHistory = await SampleHistory.find({ date: { $gte: since180 } })
            .populate('user', 'username')
            .select('user date medication quantity action')
            .lean();

        // 8. DB: Cycles (Planning)
        const cycles = await Cycle.find({ startDate: { $gte: since180 } })
            .populate('delegue', 'username')
            .lean();

        // 9. Sales JSON files
        const paths = {
            localSales: path.join(__dirname, '../../sales-dashboard/public/local_sales_data.json'),
            biotechSales: path.join(__dirname, '../../sales-dashboard/public/sales_data.json'),
            cm: path.join(__dirname, '../../sales-dashboard/public/cm_data.json'),
        };

        let localSalesSummary = 'Non disponible';
        let biotechSalesSummary = 'Non disponible';
        let cmSummary = 'Non disponible';

        if (fs.existsSync(paths.localSales) && fs.existsSync(paths.cm)) {
            const localSalesRaw = JSON.parse(fs.readFileSync(paths.localSales, 'utf-8'));
            const cmData = JSON.parse(fs.readFileSync(paths.cm, 'utf-8'));
            const LOCAL_PRODUCTS = ['amlor', 'tahor', 'celebrex', 'zoloft'];

            const allMonths = [...new Set(localSalesRaw
                .filter(d => LOCAL_PRODUCTS.some(p => d.libelle?.toLowerCase().includes(p)))
                .map(d => `${d.annee}-${d.mois}`)
            )].sort();
            const latestMonth = allMonths[allMonths.length - 1] || `2026-${monthStr}`;
            const [ly, lm] = latestMonth.split('-');

            const clientTotals = {};
            const allClients = new Set();
            localSalesRaw
                .filter(d => LOCAL_PRODUCTS.some(p => d.libelle?.toLowerCase().includes(p)))
                .forEach(d => allClients.add(d.nom_client));

            localSalesRaw
                .filter(d => d.annee === ly && d.mois === lm && LOCAL_PRODUCTS.some(p => d.libelle?.toLowerCase().includes(p)))
                .forEach(d => {
                    if (!clientTotals[d.nom_client]) clientTotals[d.nom_client] = 0;
                    clientTotals[d.nom_client] += Number(d.qte) || 0;
                });

            const activeClients = Object.keys(clientTotals).filter(c => c !== 'INCONNU');
            const inactiveClients = [...allClients].filter(c => c !== 'INCONNU' && !activeClients.includes(c));

            localSalesSummary = `Mois analysé: ${latestMonth}. Grossistes actifs: ${activeClients.length}. Inactifs: ${inactiveClients.length} (${inactiveClients.join(', ')}). Top clients actifs: ${Object.entries(clientTotals).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([c,q])=>`${c}(${q})`).join(', ')}`;
            cmSummary = Object.entries(cmData).map(([p,cm])=>`${p}:${cm}`).join(', ');
        }

        if (fs.existsSync(paths.biotechSales)) {
            const biotechSalesRaw = JSON.parse(fs.readFileSync(paths.biotechSales, 'utf-8'));
            const allMonths = [...new Set(biotechSalesRaw.map(d => `${d.annee}-${d.mois}`))].sort();
            const latestMonth = allMonths[allMonths.length - 1] || `2026-${monthStr}`;
            const [ly, lm] = latestMonth.split('-');

            let totalQty = 0;
            const topProducts = {};
            biotechSalesRaw.filter(d => d.annee === ly && d.mois === lm).forEach(d => {
                totalQty += Number(d.qte) || 0;
                if (!topProducts[d.libelle]) topProducts[d.libelle] = 0;
                topProducts[d.libelle] += Number(d.qte) || 0;
            });
            biotechSalesSummary = `Mois analysé: ${latestMonth}. Quantité totale vendue: ${totalQty}. Top produits: ${Object.entries(topProducts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([p,q])=>`${p}(${q})`).join(', ')}`;
        }

        // ─── Formatting all the summaries for the prompt ────────────────────────
        
        // Format visit summaries
        const visitSummary = (() => {
            const grouped = {};
            visits.forEach(v => {
                const name = v.user?.username || 'Inconnu';
                if (!grouped[name]) grouped[name] = { total: 0, types: {}, recent: [] };
                grouped[name].total++;
                const type = v.targetType || 'autre';
                grouped[name].types[type] = (grouped[name].types[type] || 0) + 1;
                if (grouped[name].recent.length < 5) {
                    grouped[name].recent.push(`${v.targetType} chez ${v.doctorName || v.pharmacyName || v.wholesalerName || '?'} (${new Date(v.start).toLocaleDateString('fr-FR')})`);
                }
            });
            return Object.entries(grouped).map(([name, d]) =>
                `- ${name}: ${d.total} visites (Détails types: ${Object.entries(d.types).map(([t,n])=>`${t}:${n}`).join(', ')}). Exemples récents: ${d.recent.join(' | ')}`
            ).join('\n');
        })();

        // Expenses summary
        const expenseSummary = (() => {
            const grouped = {};
            expenses.forEach(e => {
                const name = e.user?.username || 'Inconnu';
                if (!grouped[name]) grouped[name] = 0;
                grouped[name] += Number(e.totalAmount) || 0;
            });
            return Object.entries(grouped).map(([name, total]) => `- ${name}: ${total.toFixed(2)} DT`).join('\n');
        })();

        // Congress summary
        const congressSummary = congresses.map(c => 
            `- ${c.name} à ${c.location} (${new Date(c.startDate).toLocaleDateString('fr-FR')} - ${new Date(c.endDate).toLocaleDateString('fr-FR')}). Statut: ${c.status}. Participants: ${c.participants?.map(p => p.username).join(', ')}`
        ).join('\n');

        // Sectorisation summary
        const sectorSummary = sectorisations.map(s => 
            `- ${s.delegue?.username || 'Inconnu'}: Semaines [${s.weeks.join(',')}] - Secteur: ${s.sectorInfo}`
        ).join('\n');

        // Samples summary
        const sampleSum = (() => {
            const grouped = {};
            sampleHistory.forEach(s => {
                const name = s.user?.username || 'Inconnu';
                if (!grouped[name]) grouped[name] = {};
                grouped[name][s.medication] = (grouped[name][s.medication] || 0) + (s.action === 'distributed' ? Number(s.quantity) : 0);
            });
            return Object.entries(grouped).map(([name, meds]) => 
                `- ${name} a distribué: ${Object.entries(meds).map(([m,q])=>`${m}(${q})`).join(', ')}`
            ).join('\n');
        })();

        // Leaves summary
        const pendingLeaves = leaves.filter(l => l.status === 'pending');
        const approvedLeaves = leaves.filter(l => l.status === 'approved');
        const leaveSummary = `
Congés en attente (${pendingLeaves.length}): ${pendingLeaves.map(l => `${l.user?.username}: ${new Date(l.startDate).toLocaleDateString('fr-FR')} - ${new Date(l.endDate).toLocaleDateString('fr-FR')}`).join(' | ')}
Congés approuvés: ${approvedLeaves.slice(-10).map(l => `${l.user?.username}: ${new Date(l.startDate).toLocaleDateString('fr-FR')}`).join(' | ')}`;

        const delegatesSummary = delegates.map(d => `${d.username} (${d.allowedDashboards?.includes('dashboard2') ? 'Tenshi' : 'Biotech'})`).join(', ');

        const historyText = history.slice(-6).map(m => `${m.role === 'user' ? 'Question' : 'Réponse'}: ${m.content}`).join('\n');

        // ─── Build the master prompt ──────────────────────────────────────────
        const prompt = `
Vous êtes l'ASSISTANT IA EXPERT OMNISCIENT de l'entreprise pharmaceutique BiotechpharmaMD / Tenshi.
Vous avez accès à une vue à 360 degrés sur TOUTES les données de l'entreprise.
Votre but est d'analyser ces données pour répondre aux questions de l'administrateur avec une précision absolue.
N'hésitez pas à croiser les données (ex: visites vs frais, visites vs échantillons).
Si l'administrateur demande de faire une analyse d'équipe, soyez pointu, chiffré et n'hésitez pas à jouer le rôle d'un manager si la question l'exige.
FORMATAGE: Utilisez du Markdown (listes, gras) pour rendre vos réponses très lisibles.

=== DONNÉES DISPONIBLES ===

--- DÉLÉGUÉS (${delegates.length} au total) ---
${delegatesSummary}

--- VISITES (180 derniers jours) ---
${visitSummary || 'Aucune visite enregistrée.'}

--- NOTES DE FRAIS (Totaux sur 180 jours) ---
${expenseSummary || 'Aucune note de frais.'}

--- CONGRÈS ---
${congressSummary || 'Aucun congrès.'}

--- SECTORISATION (Affectations par délégué) ---
${sectorSummary || 'Aucune sectorisation définie.'}

--- ÉCHANTILLONS DISTRIBUÉS (180 jours) ---
${sampleSum || 'Aucun échantillon distribué.'}

--- CONGÉS ---
${leaveSummary}

--- VENTES LOCALES / GROSSISTES (TENSHI) ---
${localSalesSummary}

--- CM (Consommation Moyenne par produit) ---
${cmSummary}

--- VENTES BIOTECH ---
${biotechSalesSummary}

=== HISTORIQUE DE LA CONVERSATION ===
${historyText || 'Début de conversation.'}

=== QUESTION ACTUELLE DE L'ADMIN ===
${question}

Analysez ces données pour répondre de la manière la plus complète possible:`;

        // ─── Call Gemini ──────────────────────────────────────────────────────
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash'];
        let answer = null;
        let lastError = null;

        for (const modelName of modelsToTry) {
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(prompt);
                    answer = result.response.text();
                    break;
                } catch (e) {
                    lastError = e;
                    if (e.message?.includes('503') && attempt < 2) {
                        await new Promise(r => setTimeout(r, 2000));
                    } else { break; }
                }
            }
            if (answer) break;
        }

        if (!answer) throw lastError || new Error('IA indisponible');

        res.json({ answer });
    } catch (err) {
        console.error('Chat AI error:', err);
        const isQuota = err.message?.includes('429') || err.message?.includes('quota');
        res.status(500).json({
            message: isQuota
                ? 'Quota API dépassé. Réessayez dans quelques minutes.'
                : 'Erreur lors de la réponse IA.',
            error: err.message
        });
    }
});

export default router;
