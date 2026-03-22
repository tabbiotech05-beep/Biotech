import express from 'express';
import Cycle from '../models/Cycle.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/cycle
router.get('/', auth, async (req, res) => {
    try {
        let targetUserId = req.user.userId;
        const viewUser = req.query.viewUser;

        if (viewUser && viewUser !== req.user.username) {
            if (req.user.role !== 'admin' && req.user.role !== 'pharmacienne') {
                return res.status(403).json({ msg: 'Non autorisé à voir le cycle d\'un autre utilisateur' });
            }
            const user = await User.findOne({ username: viewUser });
            if (!user) return res.status(404).json({ msg: 'User not found' });
            targetUserId = user._id;
        }

        let cycle = await Cycle.findOne({ user: targetUserId });
        if (!cycle) {
            // Create empty cycle if one doesn't exist
            cycle = new Cycle({
                user: targetUserId,
                weeks: [[], [], [], [], [], []]
            });
            await cycle.save();
        }
        res.json(cycle);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/cycle
router.post('/', auth, async (req, res) => {
    const { weeks } = req.body;
    try {
        let cycle = await Cycle.findOne({ user: req.user.userId });
        if (cycle) {
            cycle.weeks = weeks;
            await cycle.save();
        } else {
            cycle = new Cycle({
                user: req.user.userId,
                weeks
            });
            await cycle.save();
        }
        res.json(cycle);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

export default router;
