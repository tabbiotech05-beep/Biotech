import express from 'express';
import Expense from '../models/Expense.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Get all expenses for the logged in user based on dashboard
router.get('/', auth, async (req, res) => {
    try {
        const { dashboardId } = req.query;
        if (!dashboardId) {
            return res.status(400).json({ msg: 'dashboardId is required' });
        }

        const query = { dashboardId };

        // Délégué only sees their own expenses; Admins might see all, but here we scope to user
        if (req.user.role !== 'admin') {
            query.user = req.user.userId;
        }

        const expenses = await Expense.find(query).populate('user', 'username').sort({ year: -1, month: -1 });
        res.json(expenses);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Admin: get ALL expenses across all users (for global export)
router.get('/all', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied' });
        }
        
        const { year, month } = req.query;
        const query = {};
        if (year) query.year = Number(year);
        if (month) query.month = Number(month);

        const expenses = await Expense.find(query)
            .populate('user', 'username')
            .sort({ year: -1, month: -1 });
        res.json(expenses);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Create a new expense report
router.post('/', auth, async (req, res) => {
    try {
        const { 
            dashboardId, year, month, carModel, licensePlate, kilometrage, entries = [] 
        } = req.body;

        if (!dashboardId || !year || !month || kilometrage == null) {
            return res.status(400).json({ msg: 'Please provide dashboardId, year, month, and kilometrage' });
        }

        // Calculate total amount
        let totalAmount = 0;
        entries.forEach(entry => {
            totalAmount += (Number(entry.hotel) || 0) + 
                           (Number(entry.essence) || 0) + 
                           (Number(entry.peage) || 0) + 
                           (Number(entry.parking) || 0) + 
                           (Number(entry.autresMontant) || 0);
        });

        const newExpense = new Expense({
            user: req.user.userId,
            dashboardId,
            year,
            month,
            carModel,
            licensePlate,
            kilometrage,
            entries,
            totalAmount
        });

        const expense = await newExpense.save();
        res.json(expense);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Update an expense report
router.put('/:id', auth, async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);

        if (!expense) {
            return res.status(404).json({ msg: 'Expense report not found' });
        }

        // Ensure user owns expense (or is admin)
        if (expense.user.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        const { 
            year, month, carModel, licensePlate, kilometrage, entries 
        } = req.body;

        if (year !== undefined) expense.year = year;
        if (month !== undefined) expense.month = month;
        if (carModel !== undefined) expense.carModel = carModel;
        if (licensePlate !== undefined) expense.licensePlate = licensePlate;
        if (kilometrage !== undefined) expense.kilometrage = kilometrage;
        if (entries !== undefined) {
             expense.entries = entries;
             let totalAmount = 0;
             entries.forEach(entry => {
                totalAmount += (Number(entry.hotel) || 0) + 
                               (Number(entry.essence) || 0) + 
                               (Number(entry.peage) || 0) + 
                               (Number(entry.parking) || 0) + 
                               (Number(entry.autresMontant) || 0);
             });
             expense.totalAmount = totalAmount;
        }

        await expense.save();
        res.json(expense);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Delete an expense report
router.delete('/:id', auth, async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);

        if (!expense) {
            return res.status(404).json({ msg: 'Expense report not found' });
        }

        if (expense.user.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        await Expense.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Expense report removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

export default router;
