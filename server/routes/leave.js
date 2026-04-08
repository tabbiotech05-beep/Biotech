import express from 'express';
import LeaveRequest from '../models/LeaveRequest.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import { sendLeaveNotification } from '../utils/whatsappBot.js';

const router = express.Router();

// @route   POST /api/leave
// @desc    Delegate submits a leave request
// @access  Private (delegue)
router.post('/', auth, async (req, res) => {
    try {
        const { startDate, endDate, reason } = req.body;
        if (!startDate || !endDate || !reason?.trim()) {
            return res.status(400).json({ msg: 'Veuillez remplir tous les champs' });
        }
        if (new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({ msg: 'La date de fin doit être après la date de début' });
        }

        const leave = new LeaveRequest({
            user: req.user.userId,
            startDate,
            endDate,
            reason: reason.trim()
        });
        await leave.save();

        // Notify admin via WhatsApp with approve/reject instructions (non-blocking)
        const requester = await User.findById(req.user.userId, 'username');
        sendLeaveNotification(leave, requester?.username || 'Inconnu').catch(() => { });

        res.json(leave);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/leave
// @desc    Get my leave requests (delegate)
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const leaves = await LeaveRequest.find({ user: req.user.userId })
            .populate('reviewedBy', 'username')
            .sort({ createdAt: -1 });
        res.json(leaves);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/leave/all
// @desc    Get all leave requests (admin only)
// @access  Private (admin)
router.get('/all', auth, async (req, res) => {
    try {
        const reqUser = await User.findById(req.user.userId);
        if (!reqUser || reqUser.role !== 'admin') {
            return res.status(403).json({ msg: 'Accès admin requis' });
        }
        const leaves = await LeaveRequest.find()
            .populate('user', 'username')
            .populate('reviewedBy', 'username')
            .sort({ createdAt: -1 });
        res.json(leaves);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/leave/:id/approve
// @desc    Admin approves a leave request
// @access  Private (admin)
router.put('/:id/approve', auth, async (req, res) => {
    try {
        const reqUser = await User.findById(req.user.userId);
        if (!reqUser || reqUser.role !== 'admin') {
            return res.status(403).json({ msg: 'Accès admin requis' });
        }

        const leave = await LeaveRequest.findById(req.params.id);
        if (!leave) return res.status(404).json({ msg: 'Demande introuvable' });

        if (leave.status === 'approved') {
            return res.status(400).json({ msg: 'Cette demande est déjà approuvée' });
        }

        // Calculate days (inclusive)
        const diffTime = Math.abs(new Date(leave.endDate) - new Date(leave.startDate));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const user = await User.findById(leave.user);
        if (user) {
            user.totalLeaveDays = (user.totalLeaveDays || 0) - diffDays;
            await user.save();
        }

        leave.status = 'approved';
        leave.adminComment = req.body.comment || '';
        leave.reviewedBy = req.user.userId;
        leave.reviewedAt = new Date();
        await leave.save();

        res.json(leave);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/leave/:id/reject
// @desc    Admin rejects a leave request
// @access  Private (admin)
router.put('/:id/reject', auth, async (req, res) => {
    try {
        const reqUser = await User.findById(req.user.userId);
        if (!reqUser || reqUser.role !== 'admin') {
            return res.status(403).json({ msg: 'Accès admin requis' });
        }

        const leave = await LeaveRequest.findById(req.params.id);
        if (!leave) return res.status(404).json({ msg: 'Demande introuvable' });

        leave.status = 'rejected';
        leave.adminComment = req.body.comment || '';
        leave.reviewedBy = req.user.userId;
        leave.reviewedAt = new Date();
        await leave.save();

        res.json(leave);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/leave/:id
// @desc    Delegate cancels a pending request
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const leave = await LeaveRequest.findById(req.params.id);
        if (!leave) return res.status(404).json({ msg: 'Demande introuvable' });
        if (leave.user.toString() !== req.user.userId) {
            return res.status(401).json({ msg: 'Non autorisé' });
        }
        if (leave.status !== 'pending') {
            return res.status(400).json({ msg: 'Impossible d\'annuler une demande déjà traitée' });
        }
        await LeaveRequest.deleteOne({ _id: req.params.id });
        res.json({ msg: 'Demande annulée' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

export default router;
