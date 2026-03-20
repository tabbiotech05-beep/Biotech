import mongoose from 'mongoose';

const WholesalerSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    governorate: { type: String, default: 'N/A' },
    address: { type: String, default: '' }
}, { timestamps: true });

// Prevent generic name duplicates for same user
WholesalerSchema.index({ user: 1, name: 1 }, { unique: true });

export default mongoose.model('Wholesaler', WholesalerSchema);
