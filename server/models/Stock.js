import mongoose from 'mongoose';

const stockSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    batchNumber: {
        type: String,
        required: function () { return this.type === 'sample'; }
    },
    type: {
        type: String,
        enum: ['sample', 'material'],
        default: 'sample'
    },
    creationDate: {
        type: Date,
        default: Date.now
    },
    expiryDate: {
        type: Date,
        required: function () { return this.type === 'sample'; }
    },
    notified6Months: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export default mongoose.model('Stock', stockSchema);
