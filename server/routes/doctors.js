import express from 'express';
import Doctor from '../models/Doctor.js';
import Visit from '../models/Visit.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/doctors
// @desc    Get all doctors for a delegate
router.get('/', auth, async (req, res) => {
    try {
        let targetUserId = req.user.userId;
        const viewUser = req.query.viewUser;

        if (viewUser && viewUser !== req.user.username) {
            if (req.user.role !== 'admin' && req.user.role !== 'pharmacienne') {
                return res.status(403).json({ msg: 'Non autorisé à voir les données d\'un autre utilisateur' });
            }
            const user = await User.findOne({ username: viewUser });
            if (!user) return res.status(404).json({ msg: 'User not found' });
            targetUserId = user._id;
        }

        const doctors = await Doctor.find({ user: targetUserId }).sort({ name: 1 });
        res.json(doctors);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/doctors
// @desc    Add a new doctor or multi-add
router.post('/', auth, async (req, res) => {
    const { name, specialty, governorate, address } = req.body;
    try {
        const newDoctor = new Doctor({
            user: req.user.userId,
            name,
            specialty,
            governorate,
            address
        });
        const doctor = await newDoctor.save();
        res.json(doctor);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ msg: 'Doctor already exists' });
        }
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/doctors/import
// @desc    Import unique doctors AND grossistes from existing visits
router.post('/import', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        let created = 0;

        // 1. Import medecins from visits
        const medecinVisits = await Visit.find({ user: userId, targetType: 'medecin' });
        for (const visit of medecinVisits) {
            if (!visit.doctorName || !visit.doctorName.trim()) continue;
            const exists = await Doctor.findOne({ user: userId, name: visit.doctorName });
            if (!exists) {
                await new Doctor({
                    user: userId,
                    name: visit.doctorName,
                    specialty: visit.specialty || 'Généraliste',
                    governorate: visit.governorate || '',
                    address: visit.address || ''
                }).save();
                created++;
            }
        }

        // 2. Import grossistes from visits (stored as Doctor with type 'grossiste')
        const grossisteVisits = await Visit.find({ user: userId, targetType: 'grossiste' });
        for (const visit of grossisteVisits) {
            if (!visit.wholesalerName || !visit.wholesalerName.trim()) continue;
            const exists = await Doctor.findOne({ user: userId, name: visit.wholesalerName, specialty: '🏢 Grossiste' });
            if (!exists) {
                await new Doctor({
                    user: userId,
                    name: visit.wholesalerName,
                    specialty: '🏢 Grossiste',
                    governorate: visit.governorate || '',
                    address: visit.address || ''
                }).save();
                created++;
            }
        }

        res.json({ msg: `${created} entrée(s) importée(s)`, count: created });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/doctors/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) return res.status(404).json({ msg: 'Doctor not found' });
        if (doctor.user.toString() !== req.user.userId) return res.status(401).json({ msg: 'User not authorized' });

        await Doctor.deleteOne({ _id: req.params.id });
        res.json({ msg: 'Doctor removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
// @route   POST /api/doctors/sync-all
// @desc    Admin only: import all doctors from visits for all delegues
router.post('/sync-all', auth, async (req, res) => {
    try {
        // Only admins can do this
        const requestingUser = await User.findById(req.user.userId);
        if (!requestingUser || requestingUser.role !== 'admin') {
            return res.status(403).json({ msg: 'Admin access required' });
        }

        const delegues = await User.find({ role: 'delegue' }, '_id username');
        const summary = [];
        let totalCreated = 0;

        for (const delegue of delegues) {
            const visits = await Visit.find({ user: delegue._id, targetType: 'medecin' });
            let created = 0;
            let skipped = 0;

            for (const visit of visits) {
                if (!visit.doctorName || visit.doctorName.trim() === '') continue;
                const exists = await Doctor.findOne({ user: delegue._id, name: visit.doctorName });
                if (exists) { skipped++; continue; }

                await new Doctor({
                    user: delegue._id,
                    name: visit.doctorName,
                    specialty: visit.specialty || '',
                    governorate: visit.governorate || '',
                    address: visit.address || ''
                }).save();
                created++;
            }

            summary.push({ username: delegue.username, visits: visits.length, created, skipped });
            totalCreated += created;
        }

        console.log(`[sync-all] ${totalCreated} doctors imported across ${delegues.length} delegates`);
        res.json({ totalCreated, summary });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

export default router;
