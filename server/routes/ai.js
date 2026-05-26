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

        // Call Gemini
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Using gemini-1.5-pro for better reasoning and long-context processing
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        res.json({ summary: responseText });
    } catch (err) {
        console.error('Error generating AI summary:', err);
        res.status(500).json({ message: 'Erreur lors de la génération du résumé', error: err.message });
    }
});

export default router;
