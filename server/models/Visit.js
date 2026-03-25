import mongoose from 'mongoose';

const VisitSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    dashboardId: { type: String, required: true }, // 'dashboard1', 'dashboard2'
    title: { type: String, required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    visitName: { type: String, default: 'privée' },
    visitTime: { type: String }, // e.g. "09:00"
    targetType: { type: String }, // 'medecin', 'pharmacie', 'grossiste'
    details: { type: String },

    // Specific fields
    governorate: { type: String },
    specialty: { type: String },
    doctorName: { type: String },
    address: { type: String },
    pharmacyName: { type: String },
    wholesalerName: { type: String },
    givenSampleName: { type: String },
    givenSampleBatch: { type: String },
    givenSampleQty: { type: Number, default: 1 },
    givenMaterialName: { type: String },
    givenMaterialBatch: { type: String },
    givenMaterials: [{
        name: { type: String },
        batch: { type: String },
        count: { type: Number, default: 1 }
    }]
}, { timestamps: true });

export default mongoose.model('Visit', VisitSchema);
