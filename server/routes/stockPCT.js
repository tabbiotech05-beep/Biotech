
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import auth from '../middleware/auth.js';

const require = createRequire(import.meta.url);
const xlsx = require('xlsx');

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the Excel file path (root of the project)
const EXCEL_PATH = path.join(__dirname, '../../Mahmoud .xlsx');

router.get('/', auth, async (req, res) => {
    try {
        const workbook = xlsx.readFile(EXCEL_PATH);
        const result = {};

        // ── Sheet 1: CHAMBI PRODUCTS ──────────────────────────────────────────
        // Layout: Row 0 empty, Row 1 = [SKU, CM, Prix..., Stock at DC], Row 2+ = data
        const sheet1 = workbook.Sheets['CHAMBI PRODUCTS'];
        if (sheet1) {
            const rows1 = xlsx.utils.sheet_to_json(sheet1, { header: 1 });
            // Row 1 = headers, rows 2+ = data
            const headers1 = rows1[1] || [];
            const skuIdx = headers1.indexOf('SKU');
            const cmIdx = headers1.indexOf('CM');
            const priceIdx = headers1.indexOf('Prix grossistes TTC');
            const stockIdx = headers1.indexOf('Stock at DC');

            result.chambi = rows1.slice(2)
                .filter(row => row[skuIdx])
                .map(row => ({
                    sku: String(row[skuIdx]).trim(),
                    cm: row[cmIdx] ?? 'N/A',
                    price: typeof row[priceIdx] === 'number' ? row[priceIdx] : 'N/A',
                    stock: typeof row[stockIdx] === 'number' ? row[stockIdx] : 0
                }));
        } else {
            result.chambi = [];
        }

        // ── Sheet 2: IMPORTED PRODUCTS ────────────────────────────────────────
        // Layout: Row 0 = [null, BRAND NAME, PCT Code, CM 2025, Stock PCT..., ...dates]
        //         Rows 1+ = data (also null in col A)
        const sheet2 = workbook.Sheets['IMPORTED PRODUCTS'];
        if (sheet2) {
            const rows2 = xlsx.utils.sheet_to_json(sheet2, { header: 1 });
            const headers2 = rows2[0] || [];
            const brandIdx = headers2.indexOf('BRAND NAME');
            const pctIdx = headers2.indexOf('PCT Code');
            const cmIdx2 = headers2.indexOf('CM 2025');
            // "Stock PCT  31 janvier" may have double space
            const stockIdx2 = headers2.findIndex(h => h && String(h).includes('Stock PCT'));

            result.imported = rows2.slice(1)
                .filter(row => row[brandIdx])
                .map(row => ({
                    brandName: String(row[brandIdx]).trim(),
                    pctCode: row[pctIdx] ? String(row[pctIdx]).trim() : 'N/A',
                    cm: row[cmIdx2] ?? 'N/A',
                    stock: typeof row[stockIdx2] === 'number' ? row[stockIdx2] : 0
                }));
        } else {
            result.imported = [];
        }

        console.log(`[StockPCT] Chambi: ${result.chambi.length} rows, Imported: ${result.imported.length} rows`);
        res.json(result);
    } catch (err) {
        console.error('[StockPCT] Error reading Excel:', err.message);
        res.status(500).json({ message: 'Erreur lors de la lecture du fichier de stock PCT' });
    }
});

export default router;
