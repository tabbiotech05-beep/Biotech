import express from 'express';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import auth from '../middleware/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCEL_FILES = {
    avec: path.join(__dirname, '../../medtn_tous_specialites_tn_v2.clean.zones (1).xlsx'),
    sans: path.join(__dirname, '../../testi.xlsx')
};

const data = {
    avec: { rows: [], columns: [], isLoaded: false },
    sans: { rows: [], columns: [], isLoaded: false }
};

const loadExcelFile = (type, filePath) => {
    try {
        const wb = xlsx.readFile(filePath);
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const raw = xlsx.utils.sheet_to_json(ws, { defval: '' });

        if (raw.length > 0) {
            data[type].columns = Object.keys(raw[0]);
            data[type].rows = raw.map(r => {
                const cleaned = {};
                for (const col of data[type].columns) {
                    cleaned[col] = typeof r[col] === 'string' ? r[col].trim() : r[col];
                }
                return cleaned;
            });
        }
        data[type].isLoaded = true;
        console.log(`[med-list] Loaded ${type} - ${data[type].rows.length} rows, ${data[type].columns.length} columns.`);
    } catch (err) {
        console.error(`[med-list] Failed to load Excel file for ${type}:`, err.message);
    }
};

// Load both files asynchronously at startup
setTimeout(() => {
    loadExcelFile('avec', EXCEL_FILES.avec);
    loadExcelFile('sans', EXCEL_FILES.sans);
}, 0);

// ── GET /api/med-list/search ──────────────────────────────────────────────────
router.get('/search', auth, (req, res) => {
    const q = (req.query.q || '').trim().toLowerCase();
    if (q.length < 2) return res.json([]);

    const results = [];
    
    // Search helper function
    const searchInType = (sourceType) => {
        if (!data[sourceType].isLoaded) return;
        const rows = data[sourceType].rows;
        const columns = data[sourceType].columns;
        
        for (const row of rows) {
            if (results.length >= 20) break;
            
            // Check if any column value matches the query
            let matched = false;
            for (const col of columns) {
                if (String(row[col] ?? '').toLowerCase().includes(q)) {
                    matched = true;
                    break;
                }
            }

            if (matched) {
                // Find conventional columns
                const nameCol = columns.find(c => c.toLowerCase().includes('nom') && c.toLowerCase().includes('prenom')) 
                             || columns.find(c => c.toLowerCase().includes('nom')) 
                             || columns[1] || columns[0];
                             
                const specCol = columns.find(c => c.toLowerCase().includes('spec')) || '';
                const govCol  = columns.find(c => c.toLowerCase().includes('gouv')) || '';
                const addrCol = columns.find(c => c.toLowerCase().includes('adresse')) || '';

                results.push({
                    name: String(row[nameCol] ?? ''),
                    specialty: specCol ? String(row[specCol] ?? '') : '',
                    governorate: govCol ? String(row[govCol] ?? '') : '',
                    address: addrCol ? String(row[addrCol] ?? '') : '',
                    source: sourceType
                });
            }
        }
    };

    searchInType('avec');
    // If we haven't reached 20 results, search the other file
    if (results.length < 20) {
        searchInType('sans');
    }

    res.json(results); // Return max 20 matches
});

// ── GET /api/med-list ─────────────────────────────────────────────────────────
router.get('/', auth, (req, res) => {
    const type = req.query.type === 'sans' ? 'sans' : 'avec';
    
    if (!data[type].isLoaded) {
        return res.status(503).json({ msg: `Données '${type}' en cours de chargement, réessayez dans un instant.` });
    }
    
    res.json({
        columns: data[type].columns,
        rows: data[type].rows
    });
});

export default router;
