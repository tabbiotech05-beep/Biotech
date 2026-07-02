import mongoose from 'mongoose';

const expenseEntrySchema = new mongoose.Schema({
    week: { type: Number, required: true },
    secteursVisites: { type: String, default: '' },
    hotel: { type: Number, default: 0 },
    essence: { type: Number, default: 0 },
    peage: { type: Number, default: 0 },
    parking: { type: Number, default: 0 },
    autresDescription: { type: String, default: '' },
    autresMontant: { type: Number, default: 0 }
});

const expenseSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    dashboardId: {
        type: String,
        default: 'none'
    },
    year: {
        type: Number,
        required: true
    },
    month: {
        type: Number,
        required: true
    },
    carModel: {
        type: String,
        default: ''
    },
    licensePlate: {
        type: String,
        default: ''
    },
    kilometrage: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['en attente', 'approuvé', 'rejeté'],
        default: 'en attente'
    },
    entries: [expenseEntrySchema],
    totalAmount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

export default mongoose.model('Expense', expenseSchema);
