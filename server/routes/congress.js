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
        const { dashboardId, name, startDate, endDate, location, participant, amount, status } = req.body;

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
            image: imagePath
        });

        const congress = await newCongress.save();
        res.json(congress);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/congress
// @desc    Get all congresses (Global visibility)
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        // Global visibility: Return ALL congresses regardless of dashboard
        const congresses = await Congress.find({}).sort({ startDate: 1 });
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
        const { name, startDate, endDate, location, participant, amount, status } = req.body;

        // Find congress by ID
        let congress = await Congress.findById(req.params.id);
        if (!congress) return res.status(404).json({ msg: 'Action marketing introuvable' });

        // Ensure user owns congress
        if (congress.user.toString() !== req.user.userId) {
            return res.status(401).json({ msg: 'Non autorisé' });
        }

        // Update fields
        congress.name = name;
        congress.startDate = startDate;
        congress.endDate = endDate;
        congress.location = location;
        congress.participant = participant;
        congress.amount = amount;
        congress.status = status;

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

// @route   DELETE api/congress/:id
// @desc    Delete a congress
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const congress = await Congress.findById(req.params.id);
        if (!congress) return res.status(404).json({ msg: 'Action marketing introuvable' });

        // Ensure user owns congress
        if (congress.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
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

export default router;
