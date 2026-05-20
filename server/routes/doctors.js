import express from 'express';
import Doctor from '../models/Doctor.js';
import Visit from '../models/Visit.js';
import User from '../models/User.js';
import Medication from '../models/Medication.js';
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

// Helper to get or create doctor by name
const getOrCreateDoctorByName = async (userId, name, extraData = {}) => {
    const trimmedName = name.trim();
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRegex = new RegExp(`^${escapeRegExp(trimmedName)}$`, 'i');
    
    let doctor = await Doctor.findOne({ user: userId, name: { $regex: nameRegex } });
    if (!doctor) {
        doctor = new Doctor({
            user: userId,
            name: trimmedName,
            specialty: extraData.specialty || 'Généraliste',
            governorate: extraData.governorate || '',
            address: extraData.address || '',
            prescriberType: extraData.prescriberType || 'non prescripteur'
        });
        await doctor.save();
    }
    return doctor;
};

// @route   GET /api/doctors/by-name/medications
// @desc    Get prescribed and not-prescribed medications for a doctor by name
router.get('/by-name/medications', auth, async (req, res) => {
    try {
        const { name, specialty, governorate, address, prescriberType, viewUser } = req.query;
        if (!name) return res.status(400).json({ msg: 'Le nom du médecin est requis' });
        
        let targetUserId = req.user.userId;
        if (viewUser && viewUser !== req.user.username) {
            if (req.user.role !== 'admin' && req.user.role !== 'pharmacienne') {
                return res.status(403).json({ msg: 'Non autorisé à voir les données d\'un autre utilisateur' });
            }
            const user = await User.findOne({ username: viewUser });
            if (!user) return res.status(404).json({ msg: 'User not found' });
            targetUserId = user._id;
        }
        
        const doctor = await getOrCreateDoctorByName(targetUserId, name, {
            specialty, governorate, address, prescriberType
        });
        
        const populatedDoctor = await Doctor.findById(doctor._id).populate('medications');
        const allMeds = await Medication.find().sort({ name: 1 });
        const prescribedIds = new Set(populatedDoctor.medications.map(m => m._id.toString()));
        const prescribed = populatedDoctor.medications;
        const notPrescribed = allMeds.filter(m => !prescribedIds.has(m._id.toString()));
        res.json({ prescribed, notPrescribed, doctorId: doctor._id });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/doctors/by-name/medications
// @desc    Add a medication to a doctor's prescribed list by name
router.post('/by-name/medications', auth, async (req, res) => {
    try {
        const { name, medicationId, medicationName, specialty, governorate, address, prescriberType, viewUser } = req.body;
        if (!name) return res.status(400).json({ msg: 'Le nom du médecin est requis' });
        
        let targetUserId = req.user.userId;
        if (viewUser && viewUser !== req.user.username) {
            if (req.user.role !== 'admin' && req.user.role !== 'pharmacienne') {
                return res.status(403).json({ msg: 'Non autorisé' });
            }
            const user = await User.findOne({ username: viewUser });
            if (!user) return res.status(404).json({ msg: 'User not found' });
            targetUserId = user._id;
        }

        const doctor = await getOrCreateDoctorByName(targetUserId, name, {
            specialty, governorate, address, prescriberType
        });
        
        let medId = medicationId;
        if (!medId) {
            if (!medicationName) return res.status(400).json({ msg: 'ID ou nom du médicament requis' });
            const trimmedMedName = medicationName.trim();
            const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            let med = await Medication.findOne({ name: { $regex: new RegExp(`^${escapeRegExp(trimmedMedName)}$`, 'i') } });
            if (!med) {
                const generatedCode = 'MED-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
                med = new Medication({ name: trimmedMedName, code: generatedCode });
                await med.save();
            }
            medId = med._id.toString();
        }
        
        if (doctor.medications.map(id => id.toString()).includes(medId)) {
            return res.status(400).json({ msg: 'Médicament déjà assigné' });
        }
        doctor.medications.push(medId);
        await doctor.save();
        
        const updated = await Doctor.findById(doctor._id).populate('medications');
        const allMeds = await Medication.find().sort({ name: 1 });
        const prescribedIds = new Set(updated.medications.map(m => m._id.toString()));
        res.json({ prescribed: updated.medications, notPrescribed: allMeds.filter(m => !prescribedIds.has(m._id.toString())), doctorId: doctor._id });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/doctors/by-name/medications/:medId
// @desc    Remove a medication from a doctor's prescribed list by name
router.delete('/by-name/medications/:medId', auth, async (req, res) => {
    try {
        const { name, viewUser } = req.query;
        if (!name) return res.status(400).json({ msg: 'Le nom du médecin est requis' });
        
        let targetUserId = req.user.userId;
        if (viewUser && viewUser !== req.user.username) {
            if (req.user.role !== 'admin' && req.user.role !== 'pharmacienne') {
                return res.status(403).json({ msg: 'Non autorisé' });
            }
            const user = await User.findOne({ username: viewUser });
            if (!user) return res.status(404).json({ msg: 'User not found' });
            targetUserId = user._id;
        }

        const doctor = await getOrCreateDoctorByName(targetUserId, name);
        
        doctor.medications = doctor.medications.filter(id => id.toString() !== req.params.medId);
        await doctor.save();
        
        const updated = await Doctor.findById(doctor._id).populate('medications');
        const allMeds = await Medication.find().sort({ name: 1 });
        const prescribedIds = new Set(updated.medications.map(m => m._id.toString()));
        res.json({ prescribed: updated.medications, notPrescribed: allMeds.filter(m => !prescribedIds.has(m._id.toString())), doctorId: doctor._id });
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

// @route   PUT /api/doctors/update-status-by-name
// @desc    Update doctor prescriber status by name and sync with visits
router.put('/update-status-by-name', auth, async (req, res) => {
    const { name, prescriberType, viewUser } = req.body;
    if (!name) return res.status(400).json({ msg: 'Name is required' });
    if (!['prescripteur', 'non prescripteur'].includes(prescriberType)) {
        return res.status(400).json({ msg: 'Invalid prescriber type' });
    }

    try {
        let targetUserId = req.user.userId;
        if (viewUser && viewUser !== req.user.username) {
            if (req.user.role !== 'admin' && req.user.role !== 'pharmacienne') {
                return res.status(403).json({ msg: 'Non autorisé' });
            }
            const user = await User.findOne({ username: viewUser });
            if (!user) return res.status(404).json({ msg: 'User not found' });
            targetUserId = user._id;
        }

        const trimmedName = name.trim();
        const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nameRegex = new RegExp(`^${escapeRegExp(trimmedName)}$`, 'i');

        // 1. Update Doctor record
        const doctor = await Doctor.findOneAndUpdate(
            { user: targetUserId, name: { $regex: nameRegex } },
            { prescriberType },
            { new: true }
        );

        // 2. Update all visits for this doctor to keep Repertoire (which is visit-based) in sync
        await Visit.updateMany(
            { user: targetUserId, targetType: 'medecin', doctorName: { $regex: nameRegex } },
            { prescriberType }
        );

        res.json({ msg: 'Status updated and synced', doctor });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/doctors/medications/catalog
// @desc    Get all medications in the catalog
router.get('/medications/catalog', auth, async (req, res) => {
    try {
        const meds = await Medication.find().sort({ name: 1 });
        res.json(meds);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/doctors/medications/catalog
// @desc    Add a new medication to the catalog
router.post('/medications/catalog', auth, async (req, res) => {
    try {
        const { name, code } = req.body;
        if (!name) return res.status(400).json({ msg: 'Le nom du médicament est requis' });
        const exists = await Medication.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
        if (exists) return res.status(400).json({ msg: 'Ce médicament existe déjà' });
        const generatedCode = code && code.trim() ? code.trim() : 'MED-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        const med = new Medication({ name: name.trim(), code: generatedCode });
        await med.save();
        res.json(med);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

export default router;
