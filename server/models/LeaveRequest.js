import mongoose from 'mongoose';

const LeaveRequestSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    adminComment: { type: String, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    approveToken: { type: String, default: null }, // one-time link token
    rejectToken:  { type: String, default: null },  // one-time link token

}, { timestamps: true });

export default mongoose.model('LeaveRequest', LeaveRequestSchema);
