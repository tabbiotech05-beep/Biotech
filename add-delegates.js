
// add-delegates.js — Ajoute amal et maha comme déléguées Tenshi
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './server/models/User.js';

dotenv.config();

const newDelegates = ['amal', 'maha'];

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('123456', salt);

    for (const username of newDelegates) {
        const exists = await User.findOne({ username });
        if (exists) {
            console.log(`⚠️  ${username} existe déjà — ignoré`);
            continue;
        }
        const user = new User({
            username,
            email: `${username}@bioxtenshi.com`,
            password,
            role: 'delegue',
            allowedDashboards: ['dashboard2']
        });
        await user.save();
        console.log(`✅ Créé: ${username} (mot de passe: 123456)`);
    }

    await mongoose.disconnect();
    console.log('🏁 Terminé.');
};

run().catch(err => { console.error(err); process.exit(1); });
