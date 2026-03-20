import mongoose from 'mongoose';

const congressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    dashboardId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    participant: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['planifié', 'en cours', 'terminé'],
        default: 'planifié'
    },
    image: {
        type: String, // Store file path
    }
}, { timestamps: true });

export default mongoose.model('Congress', congressSchema);
