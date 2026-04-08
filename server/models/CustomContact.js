import mongoose from 'mongoose';

const customContactSchema = new mongoose.Schema({
    delegate: { type: String, required: true }, // 'Sofiene', 'Seif', etc.
    nom: { type: String, required: true },
    prenom: { type: String, default: '' },
    specialite: { type: String, default: '' },
    ville: { type: String, default: '' },
    gouvernorat: { type: String, default: '' },
    telephone: { type: String, default: '' },
    mobile: { type: String, default: '' },
    email: { type: String, default: '' },
    adresse: { type: String, default: '' },
    isDeleted: { type: Boolean, default: false }, // soft-delete for static contacts
    staticContactKey: { type: String, default: null }, // null = user-created, else = key of static entry
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('CustomContact', customContactSchema);
