import mongoose from 'mongoose';

const MedicationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String, unique: true, sparse: true },
  description: { type: String },
}, { timestamps: true });

export default mongoose.model('Medication', MedicationSchema);
