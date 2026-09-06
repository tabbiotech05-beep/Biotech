import express from 'express';
import Visit from '../models/Visit.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Pharmacy from '../models/Pharmacy.js';
import Wholesaler from '../models/Wholesaler.js';
import auth from '../middleware/auth.js';
import XLSX from 'xlsx';

const router = express.Router();

const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

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

router.get('/assigned-to-me/count', auth, async (req, res) => {
    try {
        const count = await Visit.countDocuments({ assignedTo: req.user.userId });
        res.json({ count });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/visits/assigned-to-me
// @desc    Get visits assigned to the logged in user by others
// @access  Private
router.get('/assigned-to-me', auth, async (req, res) => {
    try {
        const visits = await Visit.find({ assignedTo: req.user.userId })
            .populate('user', 'username profileImage')
            .sort({ start: -1 });
        res.json(visits);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/visits/assigned-by-me
// @desc    Get visits assigned BY the logged in user to others
// @access  Private
router.get('/assigned-by-me', auth, async (req, res) => {
    try {
        const visits = await Visit.find({ user: req.user.userId, assignedTo: { $exists: true, $ne: null } })
            .populate('assignedTo', 'username profileImage')
            .sort({ start: -1 });
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
        givenSamples,
        givenMaterialName, givenMaterialBatch,
        givenMaterials,
        prescriberType
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
                name: { $regex: new RegExp(`^${escapeRegExp(trimmedName)}$`, 'i') }
            });

            const entityData = {
                user: req.user.userId,
                name: trimmedName,
                governorate: fields.governorate || 'N/A',
                address: fields.address || ''
            };

            if (type === 'medecin') {
                entityData.specialty = fields.specialty || 'Généraliste';
                entityData.prescriberType = fields.prescriberType || 'non prescripteur';
            }

            if (!entity) {
                entity = new model(entityData);
                await entity.save();
            } else if (type === 'medecin' && fields.prescriberType) {
                // Update prescriber status for existing doctor
                entity.prescriberType = fields.prescriberType;
                await entity.save();
            }

            // Also add grossistes to the Doctor collection for cycle view compatibility
            if (type === 'grossiste') {
                const doctorExists = await Doctor.findOne({
                    user: req.user.userId,
                    name: { $regex: new RegExp(`^${escapeRegExp(trimmedName)}$`, 'i') },
                    specialty: '🏢 Grossiste'
                });
                if (!doctorExists) {
                    await new Doctor({
                        ...entityData,
                        specialty: '🏢 Grossiste'
                    }).save();
                }
            }
        };

        await saveEntityIfNew(targetType, targetType === 'medecin' ? doctorName : targetType === 'pharmacie' ? pharmacyName : wholesalerName, {
            governorate, specialty, address, prescriberType
        });

        // FIXED: Support multiple samples in givenSamples array
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        if (givenSamples && Array.isArray(givenSamples) && givenSamples.length > 0) {
            for (const item of givenSamples) {
                const sampleIndex = user.samples.findIndex(
                    s => s.name === item.name && s.batchNumber === (item.batch || null) && (s.itemType || 'sample') === 'sample'
                );
                const qtyToDeduct = Math.max(1, parseInt(item.count) || 1);

                if (sampleIndex === -1 || user.samples[sampleIndex].count < qtyToDeduct) {
                    return res.status(400).json({ msg: `Échantillon "${item.name}" non disponible ou quantité insuffisante` });
                }
                user.samples[sampleIndex].count -= qtyToDeduct;
            }
            user.markModified('samples');
            await user.save();
        } else if (givenSampleName) {
            // Fallback to legacy single sample logic
            const sampleIndex = user.samples.findIndex(
                s => s.name === givenSampleName && s.batchNumber === (givenSampleBatch || null) && (s.itemType || 'sample') === 'sample'
            );
            const qtyToDeduct = Math.max(1, parseInt(givenSampleQty) || 1);

            if (sampleIndex === -1 || user.samples[sampleIndex].count < qtyToDeduct) {
                return res.status(400).json({ msg: `Échantillon non disponible ou quantité insuffisante` });
            }
            user.samples[sampleIndex].count -= qtyToDeduct;
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
            givenSampleQty: parseInt(givenSampleQty) || 1,
            givenSamples: givenSamples || [],
            givenMaterialName,
            givenMaterialBatch,
            givenMaterials: givenMaterials || [],
            prescriberType: prescriberType || 'non prescripteur',
            user: req.user.userId,
            delegateName: req.user.username // Capture name at time of visit
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
        givenSamples,
        givenMaterialName, givenMaterialBatch,
        givenMaterials,
        prescriberType
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

        // --- INVENTORY RECONCILIATION FOR MULTI-SAMPLES ---
        const oldSamples = visit.givenSamples || [];
        const newSamples = givenSamples || [];

        // If either exists or if we have legacy single samples
        const hasLegacy = (visit.givenSampleName !== givenSampleName || visit.givenSampleQty !== givenSampleQty || visit.givenSampleBatch !== givenSampleBatch);
        const hasArrayChange = JSON.stringify(oldSamples) !== JSON.stringify(newSamples);

        if (hasArrayChange || hasLegacy) {
            // 1. Return old array samples
            if (oldSamples.length > 0) {
                for (const item of oldSamples) {
                    const idx = user.samples.findIndex(s => s.name === item.name && s.batchNumber === (item.batch || null) && (s.itemType || 'sample') === 'sample');
                    if (idx !== -1) user.samples[idx].count += (item.count || 1);
                }
            } else if (visit.givenSampleName) {
                // Return legacy single sample
                const idx = user.samples.findIndex(s => s.name === visit.givenSampleName && s.batchNumber === (visit.givenSampleBatch || null) && (s.itemType || 'sample') === 'sample');
                if (idx !== -1) user.samples[idx].count += (visit.givenSampleQty || 1);
            }

            // 2. Deduct new array samples
            if (newSamples.length > 0) {
                for (const item of newSamples) {
                    const idx = user.samples.findIndex(s => s.name === item.name && s.batchNumber === (item.batch || null) && (s.itemType || 'sample') === 'sample');
                    const qChoice = Math.max(1, parseInt(item.count) || 1);
                    if (idx === -1 || user.samples[idx].count < qChoice) {
                        return res.status(400).json({ msg: `Échantillon "${item.name}" non disponible ou quantité insuffisante` });
                    }
                    user.samples[idx].count -= qChoice;
                }
            } else if (givenSampleName) {
                // Deduct legacy single sample
                const idx = user.samples.findIndex(s => s.name === givenSampleName && s.batchNumber === (givenSampleBatch || null) && (s.itemType || 'sample') === 'sample');
                const qChoice = Math.max(1, parseInt(givenSampleQty) || 1);
                if (idx === -1 || user.samples[idx].count < qChoice) {
                    return res.status(400).json({ msg: `Échantillon "${givenSampleName}" non disponible` });
                }
                user.samples[idx].count -= qChoice;
            }
            user.markModified('samples');
        }

        // --- INVENTORY RECONCILIATION FOR MATERIALS ---
        // For simplicity, we handle single material legacy fields. 
        // Array givenMaterials is more complex, but we follow the same pattern if it changed.
        const oldMName = visit.givenMaterialName;
        const oldMBatch = visit.givenMaterialBatch;
        const newMName = givenMaterialName;
        const newMBatch = givenMaterialBatch;

        if (oldMName !== newMName || oldMBatch !== newMBatch) {
            if (oldMName) {
                const oldMIdx = user.samples.findIndex(s => s.name === oldMName && s.batchNumber === (oldMBatch || null) && s.itemType === 'material');
                if (oldMIdx !== -1) user.samples[oldMIdx].count += 1;
            }
            if (newMName) {
                const newMIdx = user.samples.findIndex(s => s.name === newMName && s.batchNumber === (newMBatch || null) && s.itemType === 'material');
                if (newMIdx === -1 || user.samples[newMIdx].count <= 0) {
                    return res.status(400).json({ msg: `Matériel "${newMName}" non disponible` });
                }
                user.samples[newMIdx].count -= 1;
            }
            user.markModified('samples');
        }

        await user.save();

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
        if (givenSampleName !== undefined) visitFields.givenSampleName = givenSampleName;
        if (givenSampleBatch !== undefined) visitFields.givenSampleBatch = givenSampleBatch;
        if (givenSampleQty !== undefined) visitFields.givenSampleQty = parseInt(givenSampleQty) || 0;
        if (givenSamples !== undefined) visitFields.givenSamples = givenSamples;
        if (givenMaterialName !== undefined) visitFields.givenMaterialName = givenMaterialName;
        if (givenMaterialBatch !== undefined) visitFields.givenMaterialBatch = givenMaterialBatch;
        if (givenMaterials !== undefined) visitFields.givenMaterials = givenMaterials;
        if (prescriberType !== undefined) visitFields.prescriberType = prescriberType;

        visit = await Visit.findByIdAndUpdate(
            req.params.id,
            { $set: visitFields },
            { new: true }
        );

        // Sync Doctor prescriber status if it is a doctor visit
        if (visit.targetType === 'medecin' && visit.doctorName && visit.prescriberType) {
            await Doctor.findOneAndUpdate(
                { user: req.user.userId, name: { $regex: new RegExp(`^${escapeRegExp(visit.doctorName.trim())}$`, 'i') } },
                { prescriberType: visit.prescriberType }
            );
        }

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

        // Handle multi-samples restoration
        if (visit.givenSamples && Array.isArray(visit.givenSamples) && visit.givenSamples.length > 0) {
            console.log(`📦 Restoring multi-samples: ${visit.givenSamples.length} items`);
            const user = await User.findById(req.user.userId);
            if (user) {
                for (const item of visit.givenSamples) {
                    const sampleIndex = user.samples.findIndex(
                        s => s.name === item.name && s.batchNumber === (item.batch || null) && (s.itemType || 'sample') === 'sample'
                    );
                    if (sampleIndex !== -1) {
                        user.samples[sampleIndex].count += (item.count || 1);
                    }
                }
                user.markModified('samples');
                await user.save();
            }
        } else if (visit.givenSampleName) {
            console.log(`📦 Restoring legacy sample: ${visit.givenSampleName}`);
            const user = await User.findById(req.user.userId);
            if (user) {
                const sampleIndex = user.samples.findIndex(
                    s => s.name === visit.givenSampleName && s.batchNumber === (visit.givenSampleBatch || null) && (s.itemType || 'sample') === 'sample'
                );
                if (sampleIndex !== -1) {
                    user.samples[sampleIndex].count += (visit.givenSampleQty || 1);
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

// @route   GET api/visits/search-tenshi
// @desc    Search across all dashboard2 visits by doctor/pharmacy/wholesaler name
// @access  Private (any authenticated user)
router.get('/search-tenshi', auth, async (req, res) => {
    const q = req.query.q?.trim();
    if (!q || q.length < 2) return res.json([]);

    try {
        const visits = await Visit.find({
            dashboardId: 'dashboard2',
            $or: [
                { doctorName:    { $regex: q, $options: 'i' } },
                { pharmacyName:  { $regex: q, $options: 'i' } },
                { wholesalerName:{ $regex: q, $options: 'i' } },
            ]
        })
        .populate('user', 'username')
        .sort({ start: -1 })
        .limit(200);

        const results = visits.map(v => ({
            id: v._id,
            date: v.start ? new Date(v.start).toLocaleDateString('fr-FR') : '—',
            target: v.doctorName || v.pharmacyName || v.wholesalerName || v.title || '—',
            targetType: v.targetType || 'visite',
            specialty: v.specialty || '',
            governorate: v.governorate || '',
            address: v.address || '',
            delegate: v.user?.username || 'Délégué',
            task: v.details || v.title || '',
            givenSamples: v.givenSamples || [],
            givenMaterials: v.givenMaterials || [],
            rawDate: v.start ? new Date(v.start).getTime() : 0
        }));

        res.json(results);
    } catch (err) {
        console.error('[search-tenshi] Error:', err.message);
        res.status(500).json({ msg: 'Erreur serveur lors de la recherche.' });
    }
});

// @route   PUT api/visits/:id/assign
// @desc    Assign a visit to another user
// @access  Private
router.put('/:id/assign', auth, async (req, res) => {
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ msg: 'Target user ID is required' });

    try {
        const visit = await Visit.findById(req.params.id);
        if (!visit) return res.status(404).json({ msg: 'Visit not found' });

        // Authorization: Only the owner can assign
        if (visit.user.toString() !== req.user.userId) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        visit.assignedTo = targetUserId;
        await visit.save();

        res.json({ msg: 'Visit assigned successfully', visit });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/visits/admin/cycle-report
// @desc    Get all visits of all delegues for admin cycle report download
// @access  Admin only
router.get('/admin/cycle-report', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Accès réservé aux administrateurs' });
    }
    const dashboardId = req.query.dashboardId;
    if (!dashboardId) return res.status(400).json({ msg: 'dashboardId requis' });

    try {
        // Get all users (delegues)
        const users = await User.find({ role: 'delegue' }).select('_id username').lean();

        // Get all visits for this dashboard, populate user
        const allVisits = await Visit.find({ dashboardId })
            .populate('user', 'username')
            .sort({ start: 1 })
            .lean();

        // Build report per delegate
        const report = users.map(u => {
            const userVisits = allVisits.filter(v => v.user?._id?.toString() === u._id.toString());

            // All unique grossistes
            const grossistesSet = new Set();
            userVisits.forEach(v => {
                if (v.targetType === 'grossiste' && v.wholesalerName) {
                    grossistesSet.add(v.wholesalerName.trim());
                }
            });

            // Group governorates by week
            const weekMap = {};
            userVisits.forEach(v => {
                if (!v.start) return;
                const d = new Date(v.start);
                let day = d.getDay();
                if (day === 0) day = 7;
                const monday = new Date(d);
                monday.setHours(0,0,0,0);
                monday.setDate(d.getDate() - (day - 1));
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                const fmt = (dt) => dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                const weekKey = `S. du ${fmt(monday)} au ${fmt(sunday)}`;

                if (!weekMap[weekKey]) weekMap[weekKey] = { timestamp: monday.getTime(), govs: new Set() };
                if (v.governorate) weekMap[weekKey].govs.add(v.governorate.trim());
            });

            // Sort weeks chronologically
            const weeks = Object.entries(weekMap)
                .sort((a, b) => a[1].timestamp - b[1].timestamp)
                .map(([label, data]) => ({
                    label,
                    governorates: [...data.govs].join(', ') || '-'
                }));

            return {
                delegue: u.username,
                grossistes: [...grossistesSet].join(' | ') || '-',
                weeks
            };
        });

        res.json(report);
    } catch (err) {
        console.error('[cycle-report] Error:', err.message);
        res.status(500).json({ msg: 'Erreur serveur' });
    }
});
// @route   GET api/visits/export-specialty-report-2026
// @desc    Export Excel report: 2026 months (4 weeks each) vs delegates with specialty visit percentages
// @access  Private (Admin only)
router.get('/export-specialty-report-2026', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Accès non autorisé: administrateur uniquement.' });
        }

        const months = [
            'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];

        // 1. Fetch all delegates
        const delegates = await User.find({
            role: { $in: ['delegue', null, undefined] }
        }).select('_id username allowedDashboards role').sort({ username: 1 }).lean();

        // 2. Fetch all visits for 2026
        const startOfYear = new Date('2026-01-01T00:00:00.000Z');
        const endOfYear = new Date('2026-12-31T23:59:59.999Z');

        const visits = await Visit.find({
            start: { $gte: startOfYear, $lte: endOfYear }
        }).select('user delegateName start specialty targetType').lean();

        // 3. Prepare data structure: delegateId -> month (0..11) -> week (0..3) -> { specialties: {}, total: 0 }
        const stats = {};
        const createEmptyMonthWeeks = () => Array.from({ length: 12 }, () =>
            Array.from({ length: 4 }, () => ({ specialties: {}, total: 0 }))
        );

        delegates.forEach(d => {
            stats[d._id.toString()] = createEmptyMonthWeeks();
        });

        // Track any unexpected delegate names
        const extraUsersMap = new Map();

        visits.forEach(v => {
            if (!v.start) return;
            const d = new Date(v.start);
            if (isNaN(d.getTime()) || d.getFullYear() !== 2026) return;

            const month = d.getMonth(); // 0 to 11
            const day = d.getDate(); // 1 to 31
            let week = 0;
            if (day <= 7) week = 0;
            else if (day <= 14) week = 1;
            else if (day <= 21) week = 2;
            else week = 3;

            const userId = v.user ? v.user.toString() : null;
            if (!userId) return;

            if (!stats[userId]) {
                stats[userId] = createEmptyMonthWeeks();
                if (!extraUsersMap.has(userId)) {
                    extraUsersMap.set(userId, v.delegateName || 'Délégué');
                }
            }

            // Determine specialty
            let spec = (v.specialty || '').trim();
            if (!spec) {
                if (v.targetType === 'pharmacie') spec = 'Pharmacie';
                else if (v.targetType === 'grossiste') spec = 'Grossiste';
                else if (v.targetType === 'medecin') spec = 'Médecin (Non précisé)';
                else spec = 'Non spécifié';
            }
            const formattedSpec = spec.charAt(0).toUpperCase() + spec.slice(1);

            stats[userId][month][week].total += 1;
            stats[userId][month][week].specialties[formattedSpec] =
                (stats[userId][month][week].specialties[formattedSpec] || 0) + 1;
        });

        const allDelegatesList = [...delegates];
        extraUsersMap.forEach((name, id) => {
            allDelegatesList.push({
                _id: id,
                username: name,
                allowedDashboards: []
            });
        });

        // 4. Build Excel structure
        // Header Row 0: Month names (merged across 4 cols each)
        const row0 = ['Délégué'];
        // Header Row 1: S1, S2, S3, S4 for each month
        const row1 = [''];

        const merges = [
            { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } } // Délégué A1:A2
        ];

        months.forEach((m, mIdx) => {
            const startCol = 1 + mIdx * 4;
            row0.push(`${m} 2026`, '', '', '');
            row1.push('S1', 'S2', 'S3', 'S4');
            merges.push({
                s: { r: 0, c: startCol },
                e: { r: 0, c: startCol + 3 }
            });
        });

        const dataRows = [];
        const weeklyTotals = Array.from({ length: 48 }, () => 0);

        allDelegatesList.forEach(d => {
            const dId = d._id.toString();
            const team = d.allowedDashboards?.includes('dashboard1')
                ? 'BioTech'
                : d.allowedDashboards?.includes('dashboard2')
                ? 'Tenshi'
                : '';

            const delegateLabel = team ? `${d.username} (${team})` : d.username;
            const row = [delegateLabel];

            for (let m = 0; m < 12; m++) {
                for (let w = 0; w < 4; w++) {
                    const colIndex = m * 4 + w;
                    const cellData = stats[dId]?.[m]?.[w];

                    if (!cellData || cellData.total === 0) {
                        row.push('-');
                    } else {
                        weeklyTotals[colIndex] += cellData.total;
                        const entries = Object.entries(cellData.specialties);
                        entries.sort((a, b) => b[1] - a[1]);

                        const lines = entries.map(([specName, count]) => {
                            const pct = Math.round((count / cellData.total) * 100);
                            return `${specName}: ${pct}% (${count})`;
                        });
                        lines.push(`Total: ${cellData.total}`);
                        row.push(lines.join('\n'));
                    }
                }
            }
            dataRows.push(row);
        });

        // Summary row at the bottom
        const summaryRow = ['TOTAL VISITES EQUIPE'];
        weeklyTotals.forEach(tot => {
            summaryRow.push(tot > 0 ? `${tot} visite${tot > 1 ? 's' : ''}` : '-');
        });
        dataRows.push(summaryRow);

        // 5. Construct sheet and workbook
        const wsData = [row0, row1, ...dataRows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!merges'] = merges;
        ws['!cols'] = [{ wch: 25 }, ...Array(48).fill({ wch: 28 })];

        const rowHeights = [
            { hpt: 26 },
            { hpt: 20 },
            ...allDelegatesList.map(() => ({ hpt: 65 })),
            { hpt: 25 }
        ];
        ws['!rows'] = rowHeights;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Spécialités 2026');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Visites_Specialites_2026.xlsx"');
        return res.send(buffer);
    } catch (err) {
        console.error('[export-specialty-report-2026] Error:', err);
        res.status(500).json({ msg: 'Erreur lors de la génération du fichier Excel', error: err.message });
    }
});

export default router;

