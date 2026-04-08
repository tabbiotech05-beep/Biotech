import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import Visit from '../models/Visit.js';
import User from '../models/User.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory data store for magic search (Historical CSV data)
let planningData = [];
let isDataLoaded = false;

// Construct absolute path to the CSV file
const csvFilePath = path.join(__dirname, '../../export_All-Plannings-modified--_2026-03-10_13-12-13.csv');

// Load CSV data into memory on startup
const loadData = () => {
    if (!fs.existsSync(csvFilePath)) {
        console.error(`[MagicSearch] CSV file not found at: ${csvFilePath}`);
        return;
    }

    console.log('[MagicSearch] Loading CSV data into memory... This might take a moment.');
    const results = [];
    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            planningData = results;
            isDataLoaded = true;
            console.log(`[MagicSearch] Successfully loaded ${planningData.length} records into memory.`);
        })
        .on('error', (err) => {
            console.error('[MagicSearch] Error parsing CSV:', err);
        });
};

// Trigger the load
loadData();

// @route   GET /api/magic-search
// @desc    Search both historical CSV data and live database visits
// @access  Public
router.get('/', async (req, res) => {
    if (!isDataLoaded) {
        return res.status(503).json({ message: 'Données en cours de chargement (CSV). Veuillez réessayer dans un instant.' });
    }

    const query = req.query.q?.toLowerCase().trim();
    if (!query) return res.json([]);

    const keywords = query.split(' ').filter(k => k.length > 0);

    try {
        // 1. Search in historical CSV data
        const csvResults = planningData.filter(item => {
            const searchString = `
                ${item.Medecin || ''} 
                ${item.Pharmacie || ''} 
                ${item.Grossiste || ''} 
                ${item.TaskDetail || ''}
                ${item.TaskName || ''}
            `.toLowerCase();
            return keywords.every(kw => searchString.includes(kw));
        }).map(item => ({
            ...item,
            source: 'CSV',
            // Normalize fields for frontend
            date: item.DueDate,
            target: item.Medecin || item.Pharmacie || item.Grossiste || 'N/A',
            targetType: item.Medecin ? 'Médecin' : item.Pharmacie ? 'Pharmacie' : item.Grossiste ? 'Grossiste' : 'Inconnu',
            delegate: item.AssignedTo,
            task: item.TaskDetail,
            status: item.Approbation === 'oui' ? 'Approuvé' : 'Prévu',
            rawDate: new Date(item.DueDate).getTime()
        }));

        // 2. Search in live MongoDB visits (Dashboard1 - Biotech only)
        const dbVisits = await Visit.find({ 
            dashboardId: 'dashboard1',
            $or: [
                { doctorName: { $regex: query, $options: 'i' } },
                { pharmacyName: { $regex: query, $options: 'i' } },
                { wholesalerName: { $regex: query, $options: 'i' } },
                { details: { $regex: query, $options: 'i' } },
                { title: { $regex: query, $options: 'i' } }
            ]
        }).populate('user', 'username').limit(100);

        const dbResults = dbVisits.map(v => ({
            source: 'Database',
            date: v.start.toLocaleString('fr-FR'),
            target: v.doctorName || v.pharmacyName || v.wholesalerName || v.title,
            targetType: v.targetType || 'Visite',
            delegate: v.user?.username || 'Délégué',
            task: v.details || v.title,
            status: 'Réalisé',
            rawDate: new Date(v.start).getTime()
        }));

        // 3. Merge and Sort
        const allResults = [...dbResults, ...csvResults].sort((a, b) => (b.rawDate || 0) - (a.rawDate || 0));

        res.json(allResults.slice(0, 150));
    } catch (err) {
        console.error('Magic Search Error:', err);
        res.status(500).json({ message: 'Erreur lors de la recherche.' });
    }
});

export default router;

