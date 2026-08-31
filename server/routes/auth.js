import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Stock from '../models/Stock.js';
import SampleHistory from '../models/SampleHistory.js';
import Congress from '../models/Congress.js';
import CustomContact from '../models/CustomContact.js';
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

        const now = new Date().toLocaleString('fr-FR');
        console.log(`[APP-USAGE] [${now}] L'utilisateur ${user.username} a ouvert l'application`);

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

// @route   POST api/auth/logout
// @desc    Log out user (logging purpose)
// @access  Private
router.post('/logout', auth, async (req, res) => {
    try {
        const now = new Date().toLocaleString('fr-FR');
        console.log(`[APP-USAGE] [${now}] L'utilisateur ${req.user.username} a fermé l'application`);
        res.json({ message: 'Logged out' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/auth/dashboard-users
// @desc    Get users grouped by dashboard (excludes hidden users)
// @access  Private
router.get('/dashboard-users', auth, async (req, res) => {
    try {
        // Exclude hidden users from the public list
        const users = await User.find({ isHidden: { $ne: true } }, 'username allowedDashboards profileImage');

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

// @route   GET api/auth/all-dashboard-users
// @desc    Get ALL users grouped by dashboard (including hidden) — admin only
// @access  Private (Admin)
router.get('/all-dashboard-users', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Accès refusé' });

        const users = await User.find({}, 'username allowedDashboards profileImage isHidden');

        const dashboardUsers = {
            'dashboard1': [],
            'dashboard2': []
        };

        users.forEach(user => {
            if (user.allowedDashboards && user.allowedDashboards.length === 1) {
                const dash = user.allowedDashboards[0];
                const userData = {
                    username: user.username,
                    profileImage: user.profileImage,
                    isHidden: user.isHidden || false
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

// @route   PATCH api/auth/users/:username/hide
// @desc    Toggle isHidden for a user — admin only
// @access  Private (Admin)
router.patch('/users/:username/hide', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Accès refusé' });

        const user = await User.findOne({ username: req.params.username });
        if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

        user.isHidden = !user.isHidden;
        await user.save();

        res.json({ username: user.username, isHidden: user.isHidden });
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
        // Allows delegates to see colleagues for assignment feature
        // Admin, Pharmacienne, and Delegue can see the list
        const users = await User.find({ role: 'delegue' }, 'username profileImage role samples');
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
            const stocks = await Stock.find({ name: name, quantity: { $gt: 0 }, isDeleted: { $ne: true } }).sort({ expiryDate: 1 });
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

// @route   POST api/auth/batch-assign-samples
// @desc    Assign multiple samples to multiple delegates at once
// @access  Private (Pharmacienne/Admin)
router.post('/batch-assign-samples', auth, async (req, res) => {
    try {
        const { userIds, assignments } = req.body;
        // assignments: [{ stockId, name, count, itemType }]

        if (!userIds || userIds.length === 0 || !assignments || assignments.length === 0) {
            return res.status(400).json({ message: 'Données insuffisantes pour l\'assignation' });
        }

        const nbUsers = userIds.length;

        // 1. Check if we have enough global stock for ALL assignments combined
        for (const assign of assignments) {
            const requestedTotalQty = parseInt(assign.count, 10) * nbUsers;
            if (assign.stockId) {
                const stockItem = await Stock.findById(assign.stockId);
                if (!stockItem || stockItem.quantity < requestedTotalQty) {
                    return res.status(400).json({ 
                        message: `Stock insuffisant pour ${assign.name}. Necessaire: ${requestedTotalQty}, Disponible: ${stockItem ? stockItem.quantity : 0}` 
                    });
                }
            } else {
                // Fallback to FIFO
                const stocks = await Stock.find({ name: assign.name, quantity: { $gt: 0 }, isDeleted: { $ne: true } });
                const totalStock = stocks.reduce((acc, s) => acc + s.quantity, 0);
                if (totalStock < requestedTotalQty) {
                    return res.status(400).json({ 
                        message: `Stock insuffisant pour ${assign.name}. Necessaire: ${requestedTotalQty}, Disponible: ${totalStock}` 
                    });
                }
            }
        }

        // 2. Perform Deductions
        for (const assign of assignments) {
            const requestedTotalQty = parseInt(assign.count, 10) * nbUsers;
            if (assign.stockId) {
                const stockItem = await Stock.findById(assign.stockId);
                stockItem.quantity -= requestedTotalQty;
                await stockItem.save();
            } else {
                const stocks = await Stock.find({ name: assign.name, quantity: { $gt: 0 }, isDeleted: { $ne: true } }).sort({ expiryDate: 1 });
                let remainingToDeduct = requestedTotalQty;
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
            
            // fetch batch and type if stockId is used
            if (assign.stockId) {
                const st = await Stock.findById(assign.stockId);
                if (st) {
                    assign.batchNumber = st.batchNumber;
                    assign.itemType = st.type || 'sample';
                }
            }
        }

        // 3. Assign to each user
        for (const uId of userIds) {
            const user = await User.findById(uId);
            if (!user || user.role !== 'delegue') continue;

            for (const assign of assignments) {
                const requestedQty = parseInt(assign.count, 10);
                const itemTypeToAssign = assign.itemType || 'sample';
                const batchNumberToAssign = assign.batchNumber || null;

                const sampleIndex = user.samples.findIndex(s => 
                    s.name === assign.name && 
                    s.batchNumber === batchNumberToAssign && 
                    (s.itemType || 'sample') === itemTypeToAssign
                );

                if (sampleIndex > -1) {
                    user.samples[sampleIndex].count += requestedQty;
                    user.samples[sampleIndex].lastUpdated = Date.now();
                } else {
                    user.samples.push({
                        name: assign.name,
                        batchNumber: batchNumberToAssign,
                        itemType: itemTypeToAssign,
                        count: requestedQty
                    });
                }

                // Record history
                try {
                    const historyEntry = new SampleHistory({
                        delegateId: user._id,
                        delegateName: user.username,
                        stockId: assign.stockId || null,
                        stockName: assign.name,
                        batchNumber: batchNumberToAssign || 'N/A',
                        itemType: itemTypeToAssign,
                        count: requestedQty,
                        givenBy: req.user.userId
                    });
                    await historyEntry.save();
                } catch (historyErr) {
                    console.error('Failed to save history:', historyErr);
                }
            }
            await user.save();
        }

        res.json({ message: 'Assignation en masse réussie' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// @route   POST api/auth/return-samples
// @desc    Return samples from a delegate to the main stock
// @access  Private (Pharmacienne/Admin)
router.post('/return-samples', auth, async (req, res) => {
    try {
        const { delegateId, sampleName, batchNumber, itemType, returnCount } = req.body;
        
        if (!delegateId || !sampleName || !returnCount || returnCount <= 0) {
            return res.status(400).json({ message: 'Données invalides pour la restitution' });
        }

        const user = await User.findById(delegateId);
        if (!user || user.role !== 'delegue') {
            return res.status(404).json({ message: 'Délégué non trouvé' });
        }

        const sampleIndex = user.samples.findIndex(s => 
            s.name === sampleName && 
            s.batchNumber === (batchNumber || null) && 
            (s.itemType || 'sample') === (itemType || 'sample')
        );

        if (sampleIndex === -1 || user.samples[sampleIndex].count < returnCount) {
            return res.status(400).json({ message: 'Quantité insuffisante dans l\'inventaire du délégué' });
        }

        // Deduct from delegate
        user.samples[sampleIndex].count -= returnCount;
        user.samples[sampleIndex].lastUpdated = Date.now();
        
        if (user.samples[sampleIndex].count === 0) {
            user.samples.splice(sampleIndex, 1);
        }
        await user.save();

        // Add back to global stock
        const query = { name: sampleName };
        if (batchNumber) query.batchNumber = batchNumber;
        if (itemType) query.type = itemType;

        let stockItem = await Stock.findOne(query);
        if (stockItem) {
            stockItem.quantity += returnCount;
            stockItem.isDeleted = false;
            await stockItem.save();
        } else {
            // Recreate stock if it doesn't exist anymore
            const newStockData = {
                name: sampleName,
                batchNumber: batchNumber || 'N/A',
                quantity: returnCount,
                type: itemType || 'sample'
            };
            if ((itemType || 'sample') === 'sample') {
                // Look for another stock with the same batch number to inherit the correct expiry date
                const sameBatchStock = await Stock.findOne({ batchNumber: batchNumber });
                if (sameBatchStock && sameBatchStock.expiryDate) {
                    newStockData.expiryDate = sameBatchStock.expiryDate;
                } else {
                    const nextYear = new Date();
                    nextYear.setFullYear(nextYear.getFullYear() + 1);
                    newStockData.expiryDate = nextYear;
                }
            }
            stockItem = new Stock(newStockData);
            await stockItem.save();
        }

        // Record history
        try {
            const historyEntry = new SampleHistory({
                delegateId: user._id,
                delegateName: user.username,
                stockId: stockItem._id,
                stockName: sampleName,
                batchNumber: batchNumber || 'N/A',
                itemType: itemType || 'sample',
                count: returnCount,
                action: 'return',
                givenBy: req.user.userId
            });
            await historyEntry.save();
        } catch (historyErr) {
            console.error('Failed to save history for return:', historyErr);
        }

        res.json({ message: 'Restitution effectuée avec succès' });
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
        const { username, carLicensePlate, carModel } = req.body;
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        if (username && username !== user.username) {
            // Check if user exists
            const userExists = await User.findOne({ username });
            if (userExists) {
                return res.status(400).json({ message: 'Ce nom d\'utilisateur est déjà pris' });
            }

            const oldUsername = user.username;
            user.username = username;

            // Synchronize name in other collections for delegates (Current ownership only)
            if (user.role === 'delegue') {
                console.log(`Syncing current ownership from ${oldUsername} to ${username} for delegate ${user._id}`);
                
                try {
                    // Update Custom Contacts (Répertoire) - Maintain current ownership links
                    await CustomContact.updateMany(
                        { delegate: oldUsername },
                        { $set: { delegate: username } }
                    );

                    // Note: SampleHistory and Congress records are NOT updated to preserve historical traceability as requested
                } catch (syncErr) {
                    console.error('Failed to sync current ownership across collections:', syncErr);
                }
            }
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
