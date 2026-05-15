import mongoose from 'mongoose';

const DoctorSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: { type: String, required: true },
    specialty: { type: String },
    governorate: { type: String },
    address: { type: String },
    prescriberType: { type: String, enum: ['prescripteur', 'non prescripteur'], default: 'non prescripteur' }
}, { timestamps: true });

// Ensure unique doctors per user to avoid duplicates
DoctorSchema.index({ user: 1, name: 1 }, { unique: true });

export default mongoose.model('Doctor', DoctorSchema);
