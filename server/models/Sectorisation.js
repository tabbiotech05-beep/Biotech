import mongoose from 'mongoose';

const sectorisationSchema = new mongoose.Schema({
    weekStart: {
        type: Date,
        required: true
    },
    weekEnd: {
        type: Date,
        required: true
    },
    delegueId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    delegueName: {
        type: String,
        required: true
    },
    secteur: {
        type: String,
        default: ''
    },
    remarque: {
        type: String,
        default: ''
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

// Unique constraint: one record per delegate per week
sectorisationSchema.index({ weekStart: 1, delegueId: 1 }, { unique: true });

export default mongoose.model('Sectorisation', sectorisationSchema);
