import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Visit from '../models/Visit.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
5. Utilisez un format Markdown lisible avec des puces et des titres.
6. Soyez analytique (ex: "forte activité chez les médecins", "bon volume sur tel produit").

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

        // Fetch all delegates
        const delegates = await User.find({ role: 'delegue' }).select('username allowedDashboards');

        // Fetch all visits for the period
        const visits = await Visit.find({
            start: { $gte: start, $lte: end }
        }).populate('user', 'username allowedDashboards');

        // Build KPI data per delegate
        const kpiData = delegates.map(delegate => {
            const delegateVisits = visits.filter(v => 
                v.user && v.user._id.toString() === delegate._id.toString()
            );

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

        const formatKPIs = (list) => {
            if (list.length === 0) return "Aucun délégué trouvé.";
            return list.map(k => {
                return `Délégué: ${k.name}
  - Visites totales: ${k.totalVisits}
  - Médecins: ${k.medecinVisits} (${k.uniqueDoctors} uniques) | Pharmacies: ${k.pharmacieVisits} (${k.uniquePharmacies} uniques) | Grossistes: ${k.grossisteVisits}
  - Prescripteurs: ${k.prescribers} | Non-prescripteurs: ${k.nonPrescribers}
  - Secteurs couverts: ${k.governorates.length > 0 ? k.governorates.join(', ') : 'Non renseigné'}
  - Échantillons distribués: ${k.totalSamples}
  - Qualité des rapports: ${k.detailRate}% des visites avec détails`;
            }).join('\n\n');
        };

        const periodLabel = period === 'day' ? "Aujourd'hui" : period === 'week' ? "Cette Semaine" : period === 'month' ? "Ce Mois" : "Général";

        const prompt = `
Vous êtes un SUPERVISEUR STRICT et ANALYTIQUE dans l'industrie pharmaceutique (BiotechpharmaMD).
Votre rôle est d'évaluer la performance de chaque délégué médical de manière objective et exigeante.

Période analysée: ${periodLabel}

INSTRUCTIONS STRICTES:
1. Analysez CHAQUE délégué individuellement — n'en omettez AUCUN.
2. Attribuez un SCORE DE PERFORMANCE sur 100 à chaque délégué basé sur ces KPIs:
   - Nombre total de visites (poids: 30%)
   - Diversité des cibles (médecins + pharmacies + grossistes) (poids: 20%)
   - Couverture géographique (nombre de secteurs/gouvernorats) (poids: 15%)
   - Ratio prescripteurs vs non-prescripteurs (poids: 15%)
   - Distribution d'échantillons (poids: 10%)
   - Qualité des rapports de visite (% avec détails) (poids: 10%)
3. Classez les délégués du MEILLEUR au MOINS BON dans chaque équipe.
4. Identifiez clairement:
   - 🟢 Les délégués performants
   - 🟡 Les délégués moyens
   - 🔴 Les délégués en difficulté ou inactifs
5. Pour chaque délégué en difficulté, donnez des recommandations d'amélioration concrètes.
6. Séparez en deux sections: **ÉQUIPE BIOTECH** et **ÉQUIPE TENSHI**.
7. Indiquez le secteur d'activité (gouvernorats) de chaque délégué.
8. Terminez par un CLASSEMENT GÉNÉRAL combiné des deux équipes.
9. Utilisez un format Markdown professionnel.

DONNÉES KPI BRUTES:

=== ÉQUIPE BIOTECH (${biotechKPIs.length} délégués) ===
${formatKPIs(biotechKPIs)}

=== ÉQUIPE TENSHI (${tenshiKPIs.length} délégués) ===
${formatKPIs(tenshiKPIs)}

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

export default router;
