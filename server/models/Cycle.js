import mongoose from 'mongoose';

const CycleSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    // weeks will be an array of 6 arrays, each containing items
    // item can be a Doctor ID or a Visit ID
    weeks: [[{
        id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        type: {
            type: String,
            enum: ['Doctor', 'Visit'],
            default: 'Doctor'
        }
    }]]
}, { timestamps: true });

export default mongoose.model('Cycle', CycleSchema);
