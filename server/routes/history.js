import express from 'express';
import SampleHistory from '../models/SampleHistory.js';
import Stock from '../models/Stock.js';
import User from '../models/User.js';
import Visit from '../models/Visit.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// @route   GET api/history/delegates
// @desc    Get list of delegates who have history
// @access  Private
router.get('/delegates', auth, async (req, res) => {
    try {
        const history = await SampleHistory.find().distinct('delegateId');
        // We need names too. The simplest way is to aggregate or fetch users.
        // Let's use aggregation to get unique delegates with their names/latest info
        const delegates = await SampleHistory.aggregate([
            {
                $group: {
                    _id: "$delegateId",
                    delegateName: { $first: "$delegateName" }, // Take the first name encountered
                    lastGiven: { $max: "$dateGiven" }
                }
            },
            { $sort: { lastGiven: -1 } }
        ]);
        res.json(delegates);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/history/:delegateId
// @desc    Get history for specific delegate
// @access  Private
router.get('/:delegateId', auth, async (req, res) => {
    try {
        const history = await SampleHistory.find({ delegateId: req.params.delegateId })
            .sort({ dateGiven: -1 });
        res.json(history);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});



// @route   GET api/history/batch/:batchNumber
// @desc    Get detailed stats for a specific batch/lot
// @access  Private
router.get('/batch/:batchNumber', auth, async (req, res) => {
    try {
        const { batchNumber } = req.params;

        // 1. Stock Info
        // Note: There might be multiple stock entries if same batch was added multiple times (though seed prevents it).
        // Let's sum them up just in case, or look for one.
        const stockItems = await Stock.find({ batchNumber });
        const stockQuantity = stockItems.reduce((acc, item) => acc + item.quantity, 0);

        // 2. Delegate Possession
        // Find all delegates who have this batch in their samples list
        const delegatesWithBatch = await User.find({
            role: 'delegue',
            'samples.batchNumber': batchNumber
        }).select('username samples');

        let possessionTotal = 0;
        const possessionDetails = [];

        delegatesWithBatch.forEach(user => {
            const batchSamples = user.samples.filter(s => s.batchNumber === batchNumber);
            const userTotal = batchSamples.reduce((acc, s) => acc + s.count, 0);

            if (userTotal > 0) {
                possessionTotal += userTotal;
                possessionDetails.push({
                    delegateId: user._id,
                    delegateName: user.username,
                    count: userTotal
                });
            }
        });

        // 3. Distribution History (Pharmacist -> Delegate)
        const distributionHistory = await SampleHistory.find({ batchNumber })
            .sort({ dateGiven: -1 });

        // 4. Offered History (Delegate -> Doctor/Pharmacy)
        // Find visits where this batch was given (samples or materials)
        const offeredHistory = await Visit.find({
            $or: [
                { givenSampleBatch: batchNumber },
                { givenMaterialBatch: batchNumber },
                { 'givenMaterials.batch': batchNumber }
            ]
        })
            .populate('user', 'username') // Get delegate name
            .sort({ start: -1 });

        res.json({
            batchNumber,
            stockQuantity,
            possessionTotal,
            totalQuantity: stockQuantity + possessionTotal, // Approximation of total tracked (in network)
            possessionDetails,
            distributionHistory,
            offeredHistory
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

export default router;
