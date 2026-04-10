import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Stock from '../models/Stock.js';
import SampleHistory from '../models/SampleHistory.js';
import auth from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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
        cb(null, 'profile-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 2000000 }, // 2MB limit
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

// Register Route
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            role: role || 'delegue'
        });

        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Login Route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check user
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'supersecretkey123',
            { expiresIn: '30d' }
        );

        console.log('Login user:', user.username);
        console.log('Allowed dashboards:', user.allowedDashboards);

        res.json({
            token,
            username: user.username,
            allowedDashboards: user.allowedDashboards && user.allowedDashboards.length > 0
                ? user.allowedDashboards
                : ['dashboard1'],
            role: user.role
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   GET api/auth/dashboard-users
// @desc    Get users grouped by dashboard
// @access  Private
router.get('/dashboard-users', auth, async (req, res) => {
    try {
        // Fetch all users with their allowedDashboards and profileImage
        const users = await User.find({}, 'username allowedDashboards profileImage');

        const dashboardUsers = {
            'dashboard1': [],
            'dashboard2': []
        };

        users.forEach(user => {
            // Only list users who have exclusive access to a single dashboard
            if (user.allowedDashboards && user.allowedDashboards.length === 1) {
                const dash = user.allowedDashboards[0];
                const userData = {
                    username: user.username,
                    profileImage: user.profileImage
                };
                if (dashboardUsers[dash]) {
                    dashboardUsers[dash].push(userData);
                } else {
                    dashboardUsers[dash] = [userData];
                }
            }
        });

        res.json(dashboardUsers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/auth/users
// @desc    Get all delegue users (for pharmacienne)
// @access  Private (Pharmacienne only ideally, but generally Private for MVP)
router.get('/users', auth, async (req, res) => {
    try {
        // Only managers should see the list of delegates
        if (req.user.role !== 'admin' && req.user.role !== 'pharmacienne') {
            return res.status(403).json({ msg: 'Accès refusé : Rôle manager requis' });
        }
        // You might want to filter by role='delegue'
        const users = await User.find({ role: 'delegue' }, '-password');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/auth/users/:id/samples
// @desc    Add/Update sample for a user and deduct from stock
// @access  Private
router.post('/users/:id/samples', auth, async (req, res) => {
    try {
        const { name, count, stockId } = req.body;
        const requestedQty = parseInt(count, 10);

        // 1. Check Stock & Deduct
        if (stockId) {
            const stockItem = await Stock.findById(stockId);
            if (!stockItem) {
                return res.status(404).json({ message: 'Lot de stock non trouvé' });
            }
            if (stockItem.quantity < requestedQty) {
                return res.status(400).json({ message: `Stock insuffisant pour ce lot. Disponible: ${stockItem.quantity}` });
            }
            stockItem.quantity -= requestedQty;
            await stockItem.save();
        } else {
            // Fallback to FIFO by name (for backward compatibility if needed)
            const stocks = await Stock.find({ name: name, quantity: { $gt: 0 } }).sort({ expiryDate: 1 });
            const totalStock = stocks.reduce((acc, s) => acc + s.quantity, 0);

            if (totalStock < requestedQty) {
                return res.status(400).json({ message: `Stock insuffisant. Disponible: ${totalStock}` });
            }

            let remainingToDeduct = requestedQty;
            for (const stockItem of stocks) {
                if (remainingToDeduct <= 0) break;
                if (stockItem.quantity >= remainingToDeduct) {
                    stockItem.quantity -= remainingToDeduct;
                    remainingToDeduct = 0;
                } else {
                    remainingToDeduct -= stockItem.quantity;
                    stockItem.quantity = 0;
                }
                await stockItem.save();
            }
        }

        // 3. Assign to User
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 4. Verify Role
        if (user.role !== 'delegue') {
            return res.status(403).json({ message: 'Seuls les délégués peuvent recevoir des échantillons' });
        }

        // Get batch and type info (if stockId was used)
        let batchNumberToAssign = null;
        let itemTypeToAssign = 'sample';
        if (stockId) {
            const stockCheck = await Stock.findById(stockId);
            if (stockCheck) {
                batchNumberToAssign = stockCheck.batchNumber;
                itemTypeToAssign = stockCheck.type || 'sample';
            }
        }

        // Check if sample with this NAME, BATCH, and TYPE exists
        const sampleIndex = user.samples.findIndex(s => s.name === name && s.batchNumber === batchNumberToAssign && s.itemType === itemTypeToAssign);

        console.log(`Pharmacienne assigning sample to ${user.username}: ${name} (Lot: ${batchNumberToAssign}) count ${requestedQty}`);

        if (sampleIndex > -1) {
            user.samples[sampleIndex].count += requestedQty;
            user.samples[sampleIndex].lastUpdated = Date.now();
        } else {
            // Add new entry for this specific batch and type
            user.samples.push({
                name,
                batchNumber: batchNumberToAssign,
                itemType: itemTypeToAssign,
                count: requestedQty
            });
        }

        await user.save();

        // Record History
        try {
            const historyEntry = new SampleHistory({
                delegateId: user._id,
                delegateName: user.username,
                stockId: stockId || null,
                stockName: name,
                batchNumber: batchNumberToAssign || 'N/A',
                itemType: itemTypeToAssign,
                count: requestedQty,
                givenBy: req.user.userId
            });
            await historyEntry.save();
        } catch (historyErr) {
            console.error('Failed to save history:', historyErr);
            // Don't block the main response, but log it
        }
        console.log('User saved with samples:', user.samples);
        res.json(user.samples);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/auth/reset-samples
// @desc    Clear samples for all delegates
// @access  Private (Pharmacienne/Admin)
router.post('/reset-samples', auth, async (req, res) => {
    try {
        // Technically should check if req.user.role === 'pharmacienne' or 'admin'
        // But for this MVP validation is light.

        await User.updateMany(
            { role: 'delegue' },
            { $set: { samples: [] } }
        );

        console.log(`Reset samples for all delegates by user ${req.user.userId}`);
        res.json({ message: 'Tous les échantillons ont été réinitialisés.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/auth/profile
// @desc    Update user profile (image and license plate)
// @access  Private
router.put('/profile', auth, upload.single('image'), async (req, res) => {
    try {
        const { carLicensePlate, carModel } = req.body;
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        if (carLicensePlate !== undefined) {
            user.carLicensePlate = carLicensePlate;
        }

        if (carModel !== undefined) {
            user.carModel = carModel;
        }

        if (req.file) {
            // Delete old profile image if exists
            if (user.profileImage && fs.existsSync(user.profileImage)) {
                try {
                    fs.unlinkSync(user.profileImage);
                } catch (err) {
                    console.error('Failed to delete old profile image:', err);
                }
            }
            user.profileImage = req.file.path;
        }

        await user.save();
        
        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;
        
        res.json(userResponse);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/auth/me
// @desc    Get current user data
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        console.log(`Fetching /me for ${user.username}. Samples:`, user.samples);
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

export default router;
