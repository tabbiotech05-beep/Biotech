import express from 'express';
import Stock from '../models/Stock.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// @route   GET api/stock
// @desc    Get all stock items
// @access  Private (Admin/Pharmacienne)
router.get('/', auth, async (req, res) => {
    try {
        const stocks = await Stock.find({ isDeleted: { $ne: true } }).sort({ expiryDate: 1 });
        res.json(stocks);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/stock
// @desc    Add new stock item
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { name, quantity, expiryDate, batchNumber, creationDate, type } = req.body;

        const newStock = new Stock({
            name,
            quantity,
            expiryDate: type === 'material' ? (expiryDate || null) : expiryDate,
            batchNumber: type === 'material' ? (batchNumber || 'N/A') : batchNumber,
            type: type || 'sample',
            creationDate: creationDate || Date.now()
        });

        const stock = await newStock.save();
        res.json(stock);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/stock/:id
// @desc    Remove stock item
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const stock = await Stock.findById(req.params.id);
        if (!stock) {
            return res.status(404).json({ message: 'Stock item not found' });
        }
        stock.isDeleted = true;
        await stock.save();
        res.json({ message: 'Item removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/stock/:id/expiry
// @desc    Update stock expiry date
// @access  Private
router.put('/:id/expiry', auth, async (req, res) => {
    try {
        const { expiryDate } = req.body;
        const stock = await Stock.findById(req.params.id);
        if (!stock) {
            return res.status(404).json({ message: 'Stock item not found' });
        }
        stock.expiryDate = expiryDate;
        await stock.save();
        res.json(stock);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

export default router;
