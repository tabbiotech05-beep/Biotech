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

        // If viewing another user (Supervisor Mode)
        if (viewUser) {
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
        givenSampleName, givenSampleBatch,
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

        // If a sample is given, deduct it from user's inventory
        if (givenSampleName) {
            const user = await User.findById(req.user.userId);
            if (!user) return res.status(404).json({ msg: 'User not found' });

            const sampleIndex = user.samples.findIndex(
                s => s.name === givenSampleName && s.batchNumber === (givenSampleBatch || null) && (s.itemType || 'sample') === 'sample'
            );

            if (sampleIndex === -1 || user.samples[sampleIndex].count <= 0) {
                return res.status(400).json({ msg: 'Échantillon non disponible ou quantité insuffisante' });
            }

            user.samples[sampleIndex].count -= 1;
            user.markModified('samples');
            await user.save();
        }

        // If materials are given in an array, deduct each from user's inventory
        if (givenMaterials && Array.isArray(givenMaterials) && givenMaterials.length > 0) {
            const user = await User.findById(req.user.userId);
            if (!user) return res.status(404).json({ msg: 'User not found' });

            for (const item of givenMaterials) {
                const materialIndex = user.samples.findIndex(
                    s => s.name === item.name && s.batchNumber === (item.batch || null) && s.itemType === 'material'
                );

                const qtyToDeduct = item.count || 1;

                if (materialIndex === -1 || user.samples[materialIndex].count < qtyToDeduct) {
                    return res.status(400).json({ msg: `Matériel "${item.name}" non disponible ou quantité insuffisante` });
                }

                user.samples[materialIndex].count -= qtyToDeduct;
            }
            user.markModified('samples');
            await user.save();
        } else if (givenMaterialName) {
            // Fallback to legacy single material logic
            const user = await User.findById(req.user.userId);
            if (!user) return res.status(404).json({ msg: 'User not found' });

            const materialIndex = user.samples.findIndex(
                s => s.name === givenMaterialName && s.batchNumber === (givenMaterialBatch || null) && s.itemType === 'material'
            );

            if (materialIndex === -1 || user.samples[materialIndex].count <= 0) {
                return res.status(400).json({ msg: 'Matériel non disponible ou quantité insuffisante' });
            }

            user.samples[materialIndex].count -= 1;
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
            givenSampleName,
            givenSampleBatch,
            givenMaterialName,
            givenMaterialBatch,
            givenMaterials: givenMaterials || [],
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
        governorate, specialty, doctorName, address, pharmacyName, wholesalerName
    } = req.body;

    // Validation for update (if fields are being updated)
    // In our UI, we send the whole object, so all fields should be checked.
    // Validation for update
    if (details === '') {
        return res.status(400).json({ msg: 'Les détails ne peuvent pas être vides' });
    }

    // Build visit object
    const visitFields = {};
    if (title !== undefined) visitFields.title = title;
    if (start !== undefined) visitFields.start = start;
    if (end !== undefined) visitFields.end = end;
    if (visitName !== undefined) visitFields.visitName = visitName;
    if (visitTime !== undefined) visitFields.visitTime = visitTime;
    if (targetType !== undefined) visitFields.targetType = targetType;
    if (details !== undefined) visitFields.details = details;
    if (governorate !== undefined) visitFields.governorate = governorate;
    if (specialty !== undefined) visitFields.specialty = specialty;
    if (doctorName !== undefined) visitFields.doctorName = doctorName;
    if (address !== undefined) visitFields.address = address;
    if (pharmacyName !== undefined) visitFields.pharmacyName = pharmacyName;
    if (wholesalerName !== undefined) visitFields.wholesalerName = wholesalerName;

    try {
        let visit = await Visit.findById(req.params.id);

        if (!visit) return res.status(404).json({ msg: 'Visit not found' });

        // Make sure user owns visit
        if (visit.user.toString() !== req.user.userId) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        // Auto-save entity if it changed/new
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
        };

        if (targetType) {
            await saveEntityIfNew(targetType, targetType === 'medecin' ? doctorName : targetType === 'pharmacie' ? pharmacyName : wholesalerName, {
                governorate, specialty, address
            });
        }

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

        // If a sample was given, return it to user's inventory
        if (visit.givenSampleName) {
            console.log(`📦 Restoring sample: ${visit.givenSampleName}`);
            const user = await User.findById(req.user.userId);
            if (user) {
                const sampleIndex = user.samples.findIndex(
                    s => s.name === visit.givenSampleName && s.batchNumber === (visit.givenSampleBatch || null) && (s.itemType || 'sample') === 'sample'
                );
                if (sampleIndex !== -1) {
                    user.samples[sampleIndex].count += 1;
                    user.markModified('samples');
                    await user.save();
                }
            }
        }

        // Handle multi-materials restoration
        if (visit.givenMaterials && Array.isArray(visit.givenMaterials) && visit.givenMaterials.length > 0) {
            console.log(`📦 Restoring multi-materials: ${visit.givenMaterials.length} items`);
            const user = await User.findById(req.user.userId);
            if (user) {
                for (const item of visit.givenMaterials) {
                    const materialIndex = user.samples.findIndex(
                        s => s.name === item.name && s.batchNumber === (item.batch || null) && s.itemType === 'material'
                    );
                    if (materialIndex !== -1) {
                        user.samples[materialIndex].count += (item.count || 1);
                    }
                }
                user.markModified('samples');
                await user.save();
            }
        } else if (visit.givenMaterialName) {
            // Fallback to legacy single material logic
            console.log(`📦 Restoring material: ${visit.givenMaterialName}`);
            const user = await User.findById(req.user.userId);
            if (user) {
                const materialIndex = user.samples.findIndex(
                    s => s.name === visit.givenMaterialName && s.batchNumber === (visit.givenMaterialBatch || null) && s.itemType === 'material'
                );
                if (materialIndex !== -1) {
                    user.samples[materialIndex].count += 1;
                    user.markModified('samples');
                    await user.save();
                }
            }
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
