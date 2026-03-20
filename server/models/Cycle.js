import mongoose from 'mongoose';

const CycleSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    // weeks will be an array of 6 arrays, each containing IDs of Doctors
    weeks: [[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor'
    }]]
}, { timestamps: true });

export default mongoose.model('Cycle', CycleSchema);
