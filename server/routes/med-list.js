import express from 'express';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import auth from '../middleware/auth.js';
import Visit from '../models/Visit.js';

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

// ── Helpers for Name Normalization ───────────────────────────────────────────
const normalizeName = (str) => {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .replace(/\b(dr|docteur|pr|professeur|medecin)\b\.?/gi, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const tokenSortName = (str) => {
    const norm = normalizeName(str);
    if (!norm) return '';
    return norm.split(' ').filter(Boolean).sort().join(' ');
};

// ── Cached Base Doctors List ──────────────────────────────────────────────────
let baseDoctorsCache = null;
let baseSpecialties = [];
let baseGovernorates = [];

const buildBaseDoctorList = () => {
    if (!data.avec.isLoaded || !data.sans.isLoaded) return null;
    if (baseDoctorsCache) return baseDoctorsCache;

    const unifiedMap = new Map();
    const specialtiesSet = new Set();
    const governoratesSet = new Set();

    // 1. Process AVEC (with addresses)
    data.avec.rows.forEach((r, idx) => {
        const rawName = r.nom || '';
        const norm = normalizeName(rawName);
        const token = tokenSortName(rawName);
        const key = token || norm || `avec-${idx}`;

        const spec = r.specialite || '';
        const gov = r.secteur || '';
        if (spec) specialtiesSet.add(spec);
        if (gov) governoratesSet.add(gov);

        unifiedMap.set(key, {
            id: `avec-${idx}`,
            name: rawName,
            specialty: spec,
            governorate: gov,
            zone: r.zone || '',
            address: r.adresse || '',
            phone: r.numero ? String(r.numero) : '',
            source: 'avec',
            sourceLabel: 'Avec adresse',
            normKey: norm,
            tokenKey: token
        });
    });

    // 2. Process SANS (without addresses)
    data.sans.rows.forEach((r, idx) => {
        const rawName = r.c1 || r.nom || '';
        const norm = normalizeName(rawName);
        const token = tokenSortName(rawName);
        const key = token || norm || `sans-${idx}`;

        const spec = r.c2 || '';
        const gov = r.c4 || '';
        if (spec) specialtiesSet.add(spec);
        if (gov) governoratesSet.add(gov);

        if (unifiedMap.has(key)) {
            // Present in both lists!
            const existing = unifiedMap.get(key);
            existing.source = 'both';
            existing.sourceLabel = 'Avec & Sans adresse';
            if (!existing.specialty && spec) existing.specialty = spec;
            if (!existing.governorate && gov) existing.governorate = gov;
            if (!existing.zone && r.c3) existing.zone = r.c3;
        } else {
            unifiedMap.set(key, {
                id: `sans-${idx}`,
                name: rawName,
                specialty: spec,
                governorate: gov,
                zone: r.c3 || '',
                address: '',
                phone: '',
                source: 'sans',
                sourceLabel: 'Sans adresse',
                normKey: norm,
                tokenKey: token
            });
        }
    });

    baseDoctorsCache = Array.from(unifiedMap.values());
    baseSpecialties = Array.from(specialtiesSet).sort();
    baseGovernorates = Array.from(governoratesSet).sort();
    console.log(`[med-list] Base doctor cache built: ${baseDoctorsCache.length} unique doctors.`);
    return baseDoctorsCache;
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
        
        // Reset cache if either file reloaded
        baseDoctorsCache = null;
    } catch (err) {
        console.error(`[med-list] Failed to load Excel file for ${type}:`, err.message);
    }
};

// Load both files asynchronously at startup
setTimeout(() => {
    loadExcelFile('avec', EXCEL_FILES.avec);
    loadExcelFile('sans', EXCEL_FILES.sans);
}, 0);

// ── Helper: compute doctor visit coverage & tracking ──────────────────────────
const getCoverageData = async () => {
    const baseList = buildBaseDoctorList();
    if (!baseList) {
        throw new Error("Données des médecins en cours de chargement, réessayez dans un instant.");
    }

    // Fetch all doctor visits for Tenshi delegates (dashboard2)
    const visits = await Visit.find({
        dashboardId: 'dashboard2',
        doctorName: { $exists: true, $nin: ['', null] }
    })
    .select('doctorName delegateName user start specialty governorate address')
    .populate('user', 'username')
    .sort({ start: -1 })
    .lean();

    // Map visits by normalized and token-sorted keys
    const visitByToken = new Map();
    const visitByNorm = new Map();
    const allDelegates = new Set();

    visits.forEach(v => {
        const rawName = (v.doctorName || '').trim();
        if (!rawName) return;

        const norm = normalizeName(rawName);
        const token = tokenSortName(rawName);
        const delName = v.delegateName || v.user?.username || 'Délégué';
        if (delName && delName !== 'Délégué') allDelegates.add(delName);

        const vDate = v.start ? new Date(v.start).toISOString() : null;

        let entry = (token && visitByToken.get(token)) || (norm && visitByNorm.get(norm));
        if (!entry) {
            entry = {
                doctorName: rawName,
                normKey: norm,
                tokenKey: token,
                count: 0,
                lastVisitDate: vDate,
                lastDelegate: delName,
                delegates: new Set(),
                specialty: v.specialty || '',
                governorate: v.governorate || '',
                address: v.address || '',
                matched: false
            };
            if (token) visitByToken.set(token, entry);
            if (norm) visitByNorm.set(norm, entry);
        }

        entry.count += 1;
        if (delName) entry.delegates.add(delName);
        if (vDate && (!entry.lastVisitDate || new Date(vDate) > new Date(entry.lastVisitDate))) {
            entry.lastVisitDate = vDate;
            entry.lastDelegate = delName;
        }
    });

    // Cross-reference base doctors with visits
    let visitedCount = 0;
    const finalRows = baseList.map(doc => {
        const match = (doc.tokenKey && visitByToken.get(doc.tokenKey)) ||
                      (doc.normKey && visitByNorm.get(doc.normKey));

        if (match) {
            match.matched = true;
            visitedCount++;
            return {
                ...doc,
                isVisited: true,
                visitCount: match.count,
                lastVisitDate: match.lastVisitDate,
                lastDelegate: match.lastDelegate,
                delegates: Array.from(match.delegates)
            };
        } else {
            return {
                ...doc,
                isVisited: false,
                visitCount: 0,
                lastVisitDate: null,
                lastDelegate: '',
                delegates: []
            };
        }
    });

    // Also include any visits for doctors not in the Excel reference lists
    const unmatchedVisits = new Set();
    visitByToken.forEach(entry => {
        if (!entry.matched && !unmatchedVisits.has(entry)) {
            unmatchedVisits.add(entry);
        }
    });
    visitByNorm.forEach(entry => {
        if (!entry.matched && !unmatchedVisits.has(entry)) {
            unmatchedVisits.add(entry);
        }
    });

    unmatchedVisits.forEach((entry, idx) => {
        visitedCount++;
        finalRows.push({
            id: `visite-${idx}`,
            name: entry.doctorName,
            specialty: entry.specialty,
            governorate: entry.governorate,
            zone: '',
            address: entry.address,
            phone: '',
            source: 'visite',
            sourceLabel: 'Visite directe',
            normKey: entry.normKey,
            tokenKey: entry.tokenKey,
            isVisited: true,
            visitCount: entry.count,
            lastVisitDate: entry.lastVisitDate,
            lastDelegate: entry.lastDelegate,
            delegates: Array.from(entry.delegates)
        });
    });

    const notVisitedCount = finalRows.length - visitedCount;
    const coverageRate = finalRows.length > 0 ? ((visitedCount / finalRows.length) * 100).toFixed(1) : '0';

    return {
        stats: {
            total: finalRows.length,
            visitedCount,
            notVisitedCount,
            coverageRate
        },
        delegates: Array.from(allDelegates).sort(),
        specialties: baseSpecialties,
        governorates: baseGovernorates,
        rows: finalRows
    };
};

// ── GET /api/med-list/coverage ───────────────────────────────────────────────
router.get('/coverage', auth, async (req, res) => {
    try {
        const result = await getCoverageData();
        res.json(result);
    } catch (err) {
        console.error('[med-list] Coverage error:', err);
        res.status(500).json({ msg: err.message || 'Erreur lors du calcul du suivi des visites.' });
    }
});

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
router.get('/', auth, async (req, res) => {
    const type = req.query.type;

    if (type === 'suivi' || type === 'coverage') {
        try {
            const result = await getCoverageData();
            return res.json(result);
        } catch (err) {
            console.error('[med-list] Coverage error:', err);
            return res.status(500).json({ msg: err.message || 'Erreur lors du calcul du suivi des visites.' });
        }
    }

    const fileType = type === 'sans' ? 'sans' : 'avec';
    
    if (!data[fileType].isLoaded) {
        return res.status(503).json({ msg: `Données '${fileType}' en cours de chargement, réessayez dans un instant.` });
    }
    
    res.json({
        columns: data[fileType].columns,
        rows: data[fileType].rows
    });
});

export default router;
