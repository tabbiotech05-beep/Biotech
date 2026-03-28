import express from 'express';
import Visit from '../models/Visit.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Pharmacy from '../models/Pharmacy.js';
import Wholesaler from '../models/Wholesaler.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// @route   GET api/visits
// @desc    Get all visits for the logged in user AND specific dashboard
// @access  Private
router.get('/', auth, async (req, res) => {
    const dashboardId = req.query.dashboardId;
    const viewUser = req.query.viewUser; // Username of user to view

    if (!dashboardId) return res.status(400).json({ msg: 'Dashboard ID required' });

    try {
        let targetUserId = req.user.userId; // Default to own visits

        // Authorization Check: Only admin and pharmacienne can view other users
        if (viewUser && viewUser !== req.user.username) {
            if (req.user.role !== 'admin' && req.user.role !== 'pharmacienne') {
                return res.status(403).json({ msg: 'Non autorisé à voir les données d\'un autre utilisateur' });
            }
            const targetUser = await User.findOne({ username: viewUser });
            if (!targetUser) {
                return res.status(404).json({ msg: 'User not found' });
            }
            targetUserId = targetUser._id;
        }

        const visits = await Visit.find({ user: targetUserId, dashboardId }).sort({ start: 1 });
        res.json(visits);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/visits
// @desc    Add new visit
// @access  Private
router.post('/', auth, async (req, res) => {
    const {
        dashboardId, title, start, end, visitName, visitTime, targetType, details,
        governorate, specialty, doctorName, address, pharmacyName, wholesalerName,
        givenSampleName, givenSampleBatch, givenSampleQty,
        givenMaterialName, givenMaterialBatch,
        givenMaterials
    } = req.body;

    // Validation
    if (!details || details.trim() === '') {
        return res.status(400).json({ msg: 'Veuillez remplir les détails de la tâche' });
    }

    try {
        // Helper to find or create entities during visit save
        const saveEntityIfNew = async (type, name, fields) => {
            if (!name || !name.trim()) return;
            const trimmedName = name.trim();
            let model;
            if (type === 'medecin') model = Doctor;
            else if (type === 'pharmacie') model = Pharmacy;
            else if (type === 'grossiste') model = Wholesaler;
            else return;

            let entity = await model.findOne({
                user: req.user.userId,
                name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
            });

            if (!entity) {
                entity = new model({
                    user: req.user.userId,
                    name: trimmedName,
                    governorate: fields.governorate || 'N/A',
                    address: fields.address || '',
                    specialty: fields.specialty || (type === 'medecin' ? 'Généraliste' : undefined)
                });
                await entity.save();
            }

            // Also add medecins AND grossistes to the Doctor collection
            // so they appear in the cycle view sidebar automatically
            if (type === 'medecin' || type === 'grossiste') {
                const doctorLabel = type === 'grossiste' ? '🏢 Grossiste' : (fields.specialty || 'Généraliste');
                const doctorExists = await Doctor.findOne({
                    user: req.user.userId,
                    name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
                    specialty: type === 'grossiste' ? '🏢 Grossiste' : { $exists: true }
                });
                if (!doctorExists) {
                    await new Doctor({
                        user: req.user.userId,
                        name: trimmedName,
                        specialty: doctorLabel,
                        governorate: fields.governorate || '',
                        address: fields.address || ''
                    }).save();
                }
            }
        };

        await saveEntityIfNew(targetType, targetType === 'medecin' ? doctorName : targetType === 'pharmacie' ? pharmacyName : wholesalerName, {
            governorate, specialty, address
        });

        // If samples are given, deduct quantity from user's inventory
        if (givenSamples && Array.isArray(givenSamples) && givenSamples.length > 0) {
            const user = await User.findById(req.user.userId);
            if (!user) return res.status(404).json({ msg: 'User not found' });

            for (const item of givenSamples) {
                const sampleIndex = user.samples.findIndex(
                    s => s.name === item.name && s.batchNumber === (item.batchNumber || null) && (s.itemType || 'sample') === 'sample'
                );

                const qtyToDeduct = Math.max(1, parseInt(item.count) || 1);

                if (sampleIndex === -1 || user.samples[sampleIndex].count < qtyToDeduct) {
                    return res.status(400).json({ msg: `Échantillon "${item.name}" non disponible ou quantité insuffisante (demandé: ${qtyToDeduct})` });
                }

                user.samples[sampleIndex].count -= qtyToDeduct;
            }
            user.markModified('samples');
            await user.save();
        }

        const newVisit = new Visit({
            dashboardId,
            title,
            start,
            end,
            visitName,
            visitTime,
            targetType,
            details,
            governorate,
            specialty,
            doctorName,
            address,
            pharmacyName,
            wholesalerName,
            givenSamples: givenSamples || [],
            user: req.user.userId
        });

        const visit = await newVisit.save();
        res.json(visit);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/visits/:id
// @desc    Update visit
// @access  Private
router.put('/:id', auth, async (req, res) => {
    const {
        title, start, end, visitName, visitTime, targetType, details,
        governorate, specialty, doctorName, address, pharmacyName, wholesalerName,
        givenSampleName, givenSampleBatch, givenSampleQty,
        givenMaterialName, givenMaterialBatch,
        givenMaterials
    } = req.body;

    // Validation for update
    if (details === '') {
        return res.status(400).json({ msg: 'Les détails ne peuvent pas être vides' });
    }

    try {
        let visit = await Visit.findById(req.params.id);
        if (!visit) return res.status(404).json({ msg: 'Visit not found' });

        // Make sure user owns visit
        if (visit.user.toString() !== req.user.userId) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        // --- INVENTORY RECONCILIATION ---

        // 1. Return ALL old items to stock (Legacy and Multi-sample)
        // Multi-samples
        if (visit.givenSamples && visit.givenSamples.length > 0) {
            for (const s of visit.givenSamples) {
                const idx = user.samples.findIndex(si =>
                    si.name === s.name &&
                    si.batchNumber === (s.batchNumber || null) &&
                    (si.itemType || 'sample') === 'sample'
                );
                if (idx !== -1) user.samples[idx].count += (s.count || 1);
            }
        }
        // Legacy single sample
        if (visit.givenSampleName) {
            const idx = user.samples.findIndex(si =>
                si.name === visit.givenSampleName &&
                si.batchNumber === (visit.givenSampleBatch || null) &&
                (si.itemType || 'sample') === 'sample'
            );
            if (idx !== -1) user.samples[idx].count += (visit.givenSampleQty || 1);
        }
        // Legacy materials
        if (visit.givenMaterials && visit.givenMaterials.length > 0) {
            for (const m of visit.givenMaterials) {
                const idx = user.samples.findIndex(si => si.name === m.name && si.batchNumber === (m.batch || null) && si.itemType === 'material');
                if (idx !== -1) user.samples[idx].count += (m.count || 1);
            }
        } else if (visit.givenMaterialName) {
            const idx = user.samples.findIndex(si => si.name === visit.givenMaterialName && si.batchNumber === (visit.givenMaterialBatch || null) && si.itemType === 'material');
            if (idx !== -1) user.samples[idx].count += 1;
        }

        // 2. Deduct NEW samples
        const newSamples = req.body.givenSamples || [];
        for (const s of newSamples) {
            const idx = user.samples.findIndex(si =>
                si.name === s.name &&
                si.batchNumber === (s.batchNumber || null) &&
                (si.itemType || 'sample') === 'sample'
            );
            const qty = s.count || 1;
            if (idx === -1 || user.samples[idx].count < qty) {
                return res.status(400).json({ msg: `Stock insuffisant pour "${s.name}"` });
            }
            user.samples[idx].count -= qty;
        }

        user.markModified('samples');
        await user.save();

        // Build visit object
        const visitFields = { ...req.body };
        // Clean up legacy fields if we want to explicitly remove them during update
        // but $set with spread might be enough if the Model doesn't have them anymore.
        // Actually, $set will only update fields defined in the schema.

        // Remove materials fields from being saved if they persist in body
        delete visitFields.givenMaterialName;
        delete visitFields.givenMaterialBatch;
        delete visitFields.givenMaterials;
        delete visitFields.givenSampleName;
        delete visitFields.givenSampleBatch;
        delete visitFields.givenSampleQty;

        visit = await Visit.findByIdAndUpdate(
            req.params.id,
            { $set: visitFields },
            { new: true }
        );

        res.json(visit);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/visits/:id
// @desc    Delete visit
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        console.log(`🗑️ Deletion request for visit ID: ${req.params.id} by user: ${req.user.userId}`);
        let visit = await Visit.findById(req.params.id);

        if (!visit) {
            console.log('❌ Visit not found');
            return res.status(404).json({ msg: 'Visite non trouvée' });
        }

        // Make sure user owns visit
        console.log(`🔍 Ownership check: Visit User [${visit.user.toString()}] vs Request User [${req.user.userId}]`);
        if (visit.user.toString() !== req.user.userId) {
            console.log('❌ Unauthorized deletion attempt');
            return res.status(401).json({ msg: 'Non autorisé à supprimer cette visite' });
        }

        // Return all samples to user's inventory
        const user = await User.findById(req.user.userId);
        if (user) {
            // New multi-samples
            if (visit.givenSamples && visit.givenSamples.length > 0) {
                for (const s of visit.givenSamples) {
                    const idx = user.samples.findIndex(si => si.name === s.name && si.batchNumber === (s.batchNumber || null) && (si.itemType || 'sample') === 'sample');
                    if (idx !== -1) user.samples[idx].count += (s.count || 1);
                }
            }
            // Legacy single sample
            if (visit.givenSampleName) {
                const idx = user.samples.findIndex(si => si.name === visit.givenSampleName && si.batchNumber === (visit.givenSampleBatch || null) && (si.itemType || 'sample') === 'sample');
                if (idx !== -1) user.samples[idx].count += (visit.givenSampleQty || 1);
            }
            // Legacy materials
            if (visit.givenMaterials && visit.givenMaterials.length > 0) {
                for (const m of visit.givenMaterials) {
                    const idx = user.samples.findIndex(si => si.name === m.name && si.batchNumber === (m.batch || null) && si.itemType === 'material');
                    if (idx !== -1) user.samples[idx].count += (m.count || 1);
                }
            } else if (visit.givenMaterialName) {
                const idx = user.samples.findIndex(si => si.name === visit.givenMaterialName && si.batchNumber === (visit.givenMaterialBatch || null) && si.itemType === 'material');
                if (idx !== -1) user.samples[idx].count += 1;
            }

            user.markModified('samples');
            await user.save();
        }

        await Visit.findByIdAndDelete(req.params.id);
        console.log('✅ Visit deleted successfully');

        res.json({ msg: 'Visit removed' });
    } catch (err) {
        console.error('❌ Server Error during visit deletion:', err.message);
        res.status(500).json({ msg: 'Erreur serveur lors de la suppression', error: err.message });
    }
});

export default router;
