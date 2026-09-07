import express from 'express';
import Wholesaler from '../models/Wholesaler.js';
import auth from '../middleware/auth.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// @route   GET api/wholesalers
// @desc    Get all wholesalers for user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const wholesalers = await Wholesaler.find({ user: req.user.userId }).sort({ name: 1 });
        res.json(wholesalers);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   POST api/wholesalers
// @desc    Add new wholesaler
// @access  Private
router.post('/', auth, async (req, res) => {
    const { name, governorate, address } = req.body;
    try {
        let wholesaler = await Wholesaler.findOne({ user: req.user.userId, name });
        if (wholesaler) return res.status(400).json({ msg: 'Grossiste déjà existant' });

        wholesaler = new Wholesaler({ user: req.user.userId, name, governorate, address });
        await wholesaler.save();
        res.json(wholesaler);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET api/wholesalers/export-local-sales
// @desc    Export Excel report: Wholesalers (rows) vs Local Products (columns) with sales quantities
// @access  Private (Admin only)
router.get('/export-local-sales', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Accès non autorisé: administrateur uniquement.' });
        }

        const candidatePaths = [
            path.join(__dirname, '../../sales-dashboard/public/local_sales_data.json'),
            path.join(__dirname, '../sales-dashboard/public/local_sales_data.json'),
            path.join(process.cwd(), 'sales-dashboard/public/local_sales_data.json'),
            path.join(process.cwd(), 'public/local_sales_data.json')
        ];
        const tenshiPath = candidatePaths.find(p => fs.existsSync(p));

        if (!tenshiPath) {
            return res.status(404).json({ msg: 'Fichier des ventes locales introuvable.' });
        }

        const rawData = JSON.parse(fs.readFileSync(tenshiPath, 'utf8'));

        const LOCAL_PRODUCTS_ALLOWED = ['amlor', 'tahor', 'celebrex', 'zoloft'];
        const filtered = rawData.filter(item =>
            LOCAL_PRODUCTS_ALLOWED.some(p => item.libelle?.toLowerCase().includes(p))
        );

        if (filtered.length === 0) {
            return res.status(400).json({ msg: 'Aucune donnée de vente locale trouvée.' });
        }

        // Distinct local products sorted alphabetically
        const uniqueProducts = [...new Set(filtered.map(i => i.libelle?.trim()))].filter(Boolean).sort();
        // Distinct wholesalers
        const uniqueClients = [...new Set(filtered.map(i => i.nom_client?.trim()))].filter(Boolean);

        function createSheetForSales(salesSubset) {
            const matrix = {};
            uniqueClients.forEach(c => {
                matrix[c] = {};
            });

            salesSubset.forEach(item => {
                const c = item.nom_client?.trim();
                const p = item.libelle?.trim();
                const q = Number(item.qte) || 0;
                if (c && p && matrix[c]) {
                    matrix[c][p] = (matrix[c][p] || 0) + q;
                }
            });

            // Sort clients by total sales descending
            const sortedClients = [...uniqueClients].sort((a, b) => {
                const totalA = uniqueProducts.reduce((sum, p) => sum + (matrix[a][p] || 0), 0);
                const totalB = uniqueProducts.reduce((sum, p) => sum + (matrix[b][p] || 0), 0);
                if (totalB !== totalA) return totalB - totalA;
                return a.localeCompare(b, 'fr');
            });

            const header = ['Grossiste', ...uniqueProducts, 'TOTAL VENTES'];
            const rows = [];
            const colTotals = Array.from({ length: uniqueProducts.length }, () => 0);
            let grandTotal = 0;

            sortedClients.forEach(c => {
                let rowSum = 0;
                const row = [c];
                uniqueProducts.forEach((p, idx) => {
                    const q = matrix[c][p] || 0;
                    row.push(q);
                    rowSum += q;
                    colTotals[idx] += q;
                });
                grandTotal += rowSum;
                row.push(rowSum);
                rows.push(row);
            });

            // Summary row at the bottom
            const totalRow = ['TOTAL GÉNÉRAL', ...colTotals, grandTotal];
            rows.push(totalRow);

            const wsData = [header, ...rows];
            const ws = XLSX.utils.aoa_to_sheet(wsData);

            ws['!cols'] = [
                { wch: 36 },
                ...uniqueProducts.map(p => ({ wch: Math.max(p.length + 2, 16) })),
                { wch: 18 }
            ];
            ws['!rows'] = [{ hpt: 26 }, ...rows.map(() => ({ hpt: 20 }))];

            return ws;
        }

        const wb = XLSX.utils.book_new();

        // 1. Total 2026 sheet
        const total2026 = filtered.filter(d => d.annee === '2026');
        const totalWs = createSheetForSales(total2026.length > 0 ? total2026 : filtered);
        XLSX.utils.book_append_sheet(wb, totalWs, 'Total Ventes 2026');

        // 2. Monthly sheets
        const monthLabels = {
            '08': 'Août 2026',
            '07': 'Juillet 2026',
            '06': 'Juin 2026',
            '05': 'Mai 2026',
            '04': 'Avril 2026',
            '03': 'Mars 2026'
        };

        Object.entries(monthLabels).forEach(([mCode, mLabel]) => {
            const subset = filtered.filter(d => d.annee === '2026' && d.mois === mCode);
            if (subset.length > 0) {
                const mWs = createSheetForSales(subset);
                XLSX.utils.book_append_sheet(wb, mWs, mLabel);
            }
        });

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Ventes_Grossistes_Produits_Locaux_2026.xlsx"');
        return res.send(buffer);
    } catch (err) {
        console.error('[export-local-sales] Error:', err);
        res.status(500).json({ msg: 'Erreur lors de la génération du fichier Excel', error: err.message });
    }
});

export default router;
