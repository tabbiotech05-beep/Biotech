import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import auth from '../middleware/auth.js';
import Congress from '../models/Congress.js';

const router = express.Router();

// Ensure upload directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Erreur: Images uniquement (jpeg/jpg/png/webp)!'));
        }
    }
});

// @route   POST api/congress
// @desc    Create a new congress
// @access  Private
router.post('/', auth, upload.single('image'), async (req, res) => {
    try {
        const { dashboardId, name, startDate, endDate, location, participant, amount, status, comment } = req.body;

        const isAdmin = req.user.role === 'admin';

        let imagePath = '';
        if (req.file) {
            imagePath = req.file.path;
        }

        const newCongress = new Congress({
            user: req.user.userId,
            dashboardId,
            name,
            startDate,
            endDate,
            location,
            participant,
            amount,
            status,
            image: imagePath,
            isAdminCreated: isAdmin,
            isApproved: isAdmin, // Admins auto-approve
            approvedBy: isAdmin ? req.user.username : '',
            comment: comment || '',
            adminCommentAuthor: (isAdmin && comment) ? req.user.username : ''
        });

        const congress = await newCongress.save();
        res.json(congress);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/congress
// @desc    Get all congresses (Global visibility with approval filter)
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';
        const { dashboardId } = req.query;
        let query = {};

        if (dashboardId) {
            query.dashboardId = { $in: [dashboardId, null, 'undefined', ''] };
        }

        if (!isAdmin) {
            // Délégués see only approved congresses OR their own pending ones
            query.$and = [
                { $or: [{ isApproved: true }, { user: req.user.userId }] }
            ];
            // Si on a déjà un filtre dashboardId
            if (query.dashboardId) {
                // query reste valide car on mixe champ simple et $and
            }
        }

        const congresses = await Congress.find(query).sort({ startDate: 1 }).populate('user', 'username name');
        res.json(congresses);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/congress/:id
// @desc    Update a congress
// @access  Private
router.put('/:id', auth, upload.single('image'), async (req, res) => {
    try {
        const { name, startDate, endDate, location, participant, amount, status, comment, isApproved, dashboardId } = req.body;

        const isAdmin = req.user.role === 'admin';

        // Find congress by ID
        let congress = await Congress.findById(req.params.id);
        if (!congress) return res.status(404).json({ msg: 'Action marketing introuvable' });

        // Access Control
        if (!isAdmin) {
            // Delegate cannot edit admin-created congresses
            if (congress.isAdminCreated) {
                return res.status(403).json({ msg: 'Non autorisé: action créée par l\'administrateur' });
            }
            // Delegate can only edit their own
            if (congress.user.toString() !== req.user.userId) {
                return res.status(403).json({ msg: 'Non autorisé' });
            }
        }

        // Update fields
        if (name) congress.name = name;
        if (startDate) congress.startDate = startDate;
        if (endDate) congress.endDate = endDate;
        if (location) congress.location = location;
        if (participant) congress.participant = participant;
        if (amount) congress.amount = amount;
        if (status) congress.status = status;
        
        // Admin can also update these
        if (isAdmin) {
            if (comment !== undefined) congress.comment = comment;
            if (isApproved !== undefined) congress.isApproved = isApproved === 'true' || isApproved === true;
            if (dashboardId) congress.dashboardId = dashboardId;
        }

        // Handle Image Update
        if (req.file) {
            // Delete old image if exists
            if (congress.image && fs.existsSync(congress.image)) {
                fs.unlinkSync(congress.image);
            }
            congress.image = req.file.path;
        }

        await congress.save();
        res.json(congress);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PATCH api/congress/:id/approve
// @desc    Admin approve/reject and comment
// @access  Admin
router.patch('/:id/approve', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Accès administrateur requis' });
        }

        const { isApproved, comment } = req.body;
        const congress = await Congress.findById(req.params.id);

        if (!congress) return res.status(404).json({ msg: 'Action marketing introuvable' });

        congress.isApproved = isApproved;
        if (isApproved) {
            congress.approvedBy = req.user.username;
        }
        if (comment !== undefined) {
            congress.comment = comment;
            congress.adminCommentAuthor = req.user.username;
        }

        await congress.save();
        res.json(congress);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/congress/:id
// @desc    Delete a congress
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';
        const congress = await Congress.findById(req.params.id);
        if (!congress) return res.status(404).json({ msg: 'Action marketing introuvable' });

        // Access Control
        if (!isAdmin) {
            if (congress.user.toString() !== req.user.userId) {
                return res.status(403).json({ msg: 'Non autorisé' });
            }
            if (congress.isApproved) {
                return res.status(403).json({ msg: 'Désolé, cette action est déjà approuvée et ne peut plus être supprimée par un délégué.' });
            }
        }

        // Delete image file if exists
        if (congress.image && fs.existsSync(congress.image)) {
            fs.unlinkSync(congress.image);
        }

        await congress.deleteOne();
        res.json({ msg: 'Action marketing supprimée' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PATCH api/congress/:id/delegate-comment
// @desc    Delegate adds a comment on a marketing action
// @access  Private (non-admin)
router.patch('/:id/delegate-comment', auth, async (req, res) => {
    try {
        const { delegateComment } = req.body;

        const congress = await Congress.findById(req.params.id);
        if (!congress) return res.status(404).json({ msg: 'Action marketing introuvable' });

        // Only the delegate (non-admin) can use this route, or any non-admin
        if (req.user.role === 'admin') {
            return res.status(403).json({ msg: 'Les admins utilisent la route /approve pour commenter' });
        }

        congress.delegateComment = delegateComment || '';
        congress.delegateCommentAuthor = req.user.username;
        await congress.save();
        res.json(congress);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

export default router;
