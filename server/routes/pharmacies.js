import express from 'express';
import Pharmacy from '../models/Pharmacy.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// @route   GET api/pharmacies
// @desc    Get all pharmacies for user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const pharmacies = await Pharmacy.find({ user: req.user.userId }).sort({ name: 1 });
        res.json(pharmacies);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   POST api/pharmacies
// @desc    Add new pharmacy
// @access  Private
router.post('/', auth, async (req, res) => {
    const { name, governorate, address } = req.body;
    try {
        let pharmacy = await Pharmacy.findOne({ user: req.user.userId, name });
        if (pharmacy) return res.status(400).json({ msg: 'Pharmacie déjà existante' });

        pharmacy = new Pharmacy({ user: req.user.userId, name, governorate, address });
        await pharmacy.save();
        res.json(pharmacy);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

export default router;
