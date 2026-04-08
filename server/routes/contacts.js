import express from 'express';
import auth from '../middleware/auth.js';
import CustomContact from '../models/CustomContact.js';
import staticContactsData from '../../src/data/contacts_data.json' assert { type: 'json' };

const router = express.Router();

// GET /api/contacts/:delegate — Returns static + user-added contacts, minus soft-deleted ones
router.get('/:delegate', auth, async (req, res) => {
    try {
        const { delegate } = req.params;

        // 1. Get soft-deleted keys
        const deletedDocs = await CustomContact.find({ delegate, isDeleted: true, staticContactKey: { $ne: null } });
        const deletedKeys = new Set(deletedDocs.map(d => d.staticContactKey));

        // 2. Filter static contacts
        const staticContacts = (staticContactsData[delegate] || [])
            .map((c, i) => ({ ...c, _staticKey: `${delegate}-${i}`, isStatic: true }))
            .filter(c => !deletedKeys.has(c._staticKey));

        // 3. Get user-created contacts
        const customContacts = await CustomContact.find({ delegate, isDeleted: false, staticContactKey: null });

        const allContacts = [
            ...customContacts.map(c => ({ ...c.toObject(), isStatic: false })),
            ...staticContacts
        ];

        res.json(allContacts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/contacts — Add a new custom contact
router.post('/', auth, async (req, res) => {
    try {
        const { delegate, nom, prenom, specialite, ville, gouvernorat, telephone, mobile, email, adresse } = req.body;
        if (!delegate || !nom) return res.status(400).json({ message: 'Délégué et Nom sont requis.' });

        const contact = new CustomContact({ delegate, nom, prenom, specialite, ville, gouvernorat, telephone, mobile, email, adresse });
        await contact.save();
        res.status(201).json(contact);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/contacts/:id — Delete a user-created contact, or soft-delete a static one
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { staticKey, delegate } = req.body;

        if (staticKey) {
            // Soft-delete static contact
            await CustomContact.findOneAndUpdate(
                { delegate, staticContactKey: staticKey },
                { isDeleted: true, staticContactKey: staticKey },
                { upsert: true, new: true }
            );
            return res.json({ message: 'Contact archivé avec succès.' });
        } else {
            // Hard-delete user-created contact
            await CustomContact.findByIdAndDelete(id);
            return res.json({ message: 'Contact supprimé avec succès.' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
