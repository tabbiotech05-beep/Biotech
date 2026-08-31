import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    allowedDashboards: {
        type: [String],
        default: ['dashboard1']
    },
    role: {
        type: String,
        enum: ['admin', 'delegue', 'pharmacienne'],
        default: 'delegue'
    },
    samples: [{
        name: { type: String, required: true },
        batchNumber: { type: String },
        count: { type: Number, required: true, default: 0 },
        itemType: { type: String, enum: ['sample', 'material'], default: 'sample' },
        lastUpdated: { type: Date, default: Date.now }
    }],
    profileImage: {
        type: String,
        default: ''
    },
    carLicensePlate: {
        type: String,
        default: ''
    },
    carModel: {
        type: String,
        default: ''
    },
    totalLeaveDays: {
        type: Number,
        default: 25
    },
    isHidden: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
