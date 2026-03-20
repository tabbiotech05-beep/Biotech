import express from 'express';
import Wholesaler from '../models/Wholesaler.js';
import auth from '../middleware/auth.js';

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

export default router;
