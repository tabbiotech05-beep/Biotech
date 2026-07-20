import mongoose from 'mongoose';

const SampleHistorySchema = new mongoose.Schema({
    delegateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    delegateName: { type: String, required: true },
    stockId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock' },
    stockName: { type: String, required: true },
    batchNumber: { type: String },
    itemType: { type: String, enum: ['sample', 'material'], default: 'sample' },
    count: { type: Number, required: true },
    action: { type: String, enum: ['assign', 'return'], default: 'assign' },
    dateGiven: { type: Date, default: Date.now },
    givenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

export default mongoose.model('SampleHistory', SampleHistorySchema);
