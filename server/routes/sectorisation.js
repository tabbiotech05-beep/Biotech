import express from 'express';
import auth from '../middleware/auth.js';
import Sectorisation from '../models/Sectorisation.js';
import User from '../models/User.js';

const router = express.Router();

// Helper: get Monday and Sunday of a given date
function getWeekBounds(dateStr) {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0=Sun, 1=Mon...
    const diff = (day === 0) ? -6 : 1 - day; // adjust to Monday
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { weekStart: monday, weekEnd: sunday };
}

// ─── GET /api/sectorisation?weekStart=YYYY-MM-DD  (Admin only)
// Returns all delegue sectorisations for a given week
router.get('/', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Accès réservé à l\'administrateur' });
    }
    try {
        const { weekStart } = req.query;
        if (!weekStart) return res.status(400).json({ message: 'weekStart requis' });

        const { weekStart: ws, weekEnd: we } = getWeekBounds(weekStart);

        // Get all Tenshi delegues (dashboard2)
        const tenshiDelegues = await User.find({
            role: 'delegue',
            allowedDashboards: 'dashboard2'
        }, '_id username profileImage').sort({ username: 1 });

        // Get existing sectorisations for this week
        const existing = await Sectorisation.find({
            weekStart: { $gte: ws, $lte: ws }
        });

        const existingMap = {};
        existing.forEach(s => { existingMap[s.delegueId.toString()] = s; });

        // Merge: for each delegue, return existing or empty record
        const result = tenshiDelegues.map(delegue => {
            const sec = existingMap[delegue._id.toString()];
            return {
                delegueId: delegue._id,
                delegueName: delegue.username,
                profileImage: delegue.profileImage,
                secteur: sec ? sec.secteur : '',
                remarque: sec ? sec.remarque : '',
                _id: sec ? sec._id : null
            };
        });

        res.json({
            weekStart: ws,
            weekEnd: we,
            sectorisations: result
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ─── POST /api/sectorisation  (Admin only)
// Upsert sectorisations for a whole week
router.post('/', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Accès réservé à l\'administrateur' });
    }
    try {
        const { weekStart, sectorisations } = req.body;
        // sectorisations: [{ delegueId, delegueName, secteur, remarque }]

        if (!weekStart || !Array.isArray(sectorisations)) {
            return res.status(400).json({ message: 'Données invalides' });
        }

        const { weekStart: ws, weekEnd: we } = getWeekBounds(weekStart);

        const ops = sectorisations.map(s => ({
            updateOne: {
                filter: { weekStart: ws, delegueId: s.delegueId },
                update: {
                    $set: {
                        weekStart: ws,
                        weekEnd: we,
                        delegueId: s.delegueId,
                        delegueName: s.delegueName,
                        secteur: s.secteur || '',
                        remarque: s.remarque || '',
                        createdBy: req.user.userId
                    }
                },
                upsert: true
            }
        }));

        await Sectorisation.bulkWrite(ops);
        res.json({ message: 'Sectorisation enregistrée avec succès' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ─── GET /api/sectorisation/me?weekStart=YYYY-MM-DD  (Délégué)
// Returns ONLY the connected delegate's sectorisation for a week
router.get('/me', auth, async (req, res) => {
    try {
        const { weekStart } = req.query;

        // Default to current week if no weekStart provided
        const dateStr = weekStart || new Date().toISOString().slice(0, 10);
        const { weekStart: ws, weekEnd: we } = getWeekBounds(dateStr);

        const sec = await Sectorisation.findOne({
            weekStart: { $gte: ws, $lte: ws },
            delegueId: req.user.userId
        });

        res.json({
            weekStart: ws,
            weekEnd: we,
            secteur: sec ? sec.secteur : null,
            remarque: sec ? sec.remarque : null,
            defined: !!sec
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ─── GET /api/sectorisation/weeks  (Admin only)
// Returns list of distinct weeks that have data
router.get('/weeks', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Accès réservé à l\'administrateur' });
    }
    try {
        const weeks = await Sectorisation.aggregate([
            {
                $group: {
                    _id: '$weekStart',
                    weekEnd: { $first: '$weekEnd' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 20 }
        ]);

        res.json(weeks.map(w => ({
            weekStart: w._id,
            weekEnd: w.weekEnd,
            count: w.count
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

export default router;
