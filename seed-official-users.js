import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './server/models/User.js';
import Stock from './server/models/Stock.js';
import Doctor from './server/models/Doctor.js';
import Cycle from './server/models/Cycle.js';
import { execSync } from 'child_process';
import fs from 'fs';

dotenv.config({ override: false }); // Don't overwrite env vars passed by parent process

const admins = ['mahmoud', 'slim', 'ouanes', 'malek'];
const biotechUsers = ['seif', 'ines', 'cherifa', 'syrine', 'soufiene'];
const tenshiUsers = ['wiem', 'feriel', 'rahma', 'rania', 'yosra', 'farah', 'saoussen', 'dorra', 'rahma.b', 'fatma', 'nessrine', 'nafissa', 'amal', 'maha'];

const seedOfficialUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Always check for renaming mohamed.f -> rania
        const oldUser = await User.findOne({ username: 'mohamed.f' });
        if (oldUser) {
            oldUser.username = 'rania';
            oldUser.email = 'rania@bioxtenshi.com';
            await oldUser.save();
            console.log('🔄 Automatically renamed user mohamed.f to rania');
        }

        // --- Feriel's Cycle Import Logic ---
        const ferielUser = await User.findOne({ username: 'feriel' });
        if (ferielUser && fs.existsSync('Feriel S1.xlsx')) {
            console.log('📊 Detected Feriel S1.xlsx, starting import for feriel...');
            try {
                const pythonCode = `import pandas as pd; import json; df = pd.read_excel('Feriel S1.xlsx'); doctors = df[['nom', 'specialite', 'secteur', 'adresse']].fillna('').to_dict(orient='records'); print(json.dumps(doctors))`;
                const jsonData = execSync(`python3 -c "${pythonCode}"`).toString();
                const doctorsData = JSON.parse(jsonData);

                const doctorIds = [];
                for (const doc of doctorsData) {
                    let doctor = await Doctor.findOne({ user: ferielUser._id, name: doc.nom });
                    if (!doctor) {
                        doctor = new Doctor({
                            user: ferielUser._id,
                            name: doc.nom,
                            specialty: doc.specialite,
                            governorate: doc.secteur,
                            address: doc.adresse
                        });
                        await doctor.save();
                    }
                    doctorIds.push(doctor._id);
                }

                let cycle = await Cycle.findOne({ user: ferielUser._id });
                if (!cycle) {
                    cycle = new Cycle({
                        user: ferielUser._id,
                        weeks: [[], [], [], [], [], []]
                    });
                }
                cycle.weeks[0] = doctorIds;
                await cycle.save();
                console.log(`✅ Automated: Cycle updated for feriel. Week 1 has ${doctorIds.length} doctors.`);
            } catch (err) {
                console.error('❌ Automation Error importing feriel cycle:', err.message);
            }
        }

        // Check if data exists — but still ensure all Tenshi users exist
        const userCount = await User.countDocuments();
        if (userCount > 0) {
            console.log('✅ Data already exists. Checking for missing users...');
            const salt2 = await bcrypt.genSalt(10);
            const password2 = await bcrypt.hash('123456', salt2);
            // Ensure all Tenshi delegates exist (handles newly added users)
            for (const username of tenshiUsers) {
                const exists = await User.findOne({ username });
                if (!exists) {
                    const newUser = new User({
                        username,
                        email: `${username}@bioxtenshi.com`,
                        password: password2,
                        role: 'delegue',
                        allowedDashboards: ['dashboard2']
                    });
                    await newUser.save();
                    console.log(`✅ Added missing Tenshi user: ${username}`);
                }
            }
            console.log('ℹ️  Skipping full seed to preserve existing data.');
            return;
        }

        // Clear all users & stock (Only if empty, but we returned above)
        // await User.deleteMany({}); 
        // await Stock.deleteMany({});
        // console.log('🗑️  All existing users and stock deleted.');

        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash('123456', salt);

        // ... (User creation code remains same) ...

        // Create Admins
        for (const username of admins) {
            const user = new User({
                username,
                email: `${username}@bioxtenshi.com`,
                password,
                role: 'admin',
                allowedDashboards: ['dashboard1', 'dashboard2']
            });
            await user.save();
            console.log(`👑 Created Admin: ${username}`);
        }

        // Create BioTechPharmaMD Users
        for (const username of biotechUsers) {
            const user = new User({
                username,
                email: `${username}@bioxtenshi.com`,
                password,
                role: 'delegue',
                allowedDashboards: ['dashboard1']
            });
            await user.save();
            console.log(`🌿 Created BioTech User: ${username}`);
        }

        // Create Tenshi Users
        for (const username of tenshiUsers) {
            const user = new User({
                username,
                email: `${username}@bioxtenshi.com`,
                password,
                role: 'delegue',
                allowedDashboards: ['dashboard2']
            });
            await user.save();
            console.log(`🔵 Created Tenshi User: ${username}`);
        }

        // Create Pharmacienne User
        const pharmacienne = new User({
            username: 'asma',
            email: 'asma@bioxtenshi.com',
            password,
            role: 'pharmacienne',
            allowedDashboards: ['dashboard1']
        });
        await pharmacienne.save();
        console.log('💊 Created Pharmacienne: asma');

        // Create Initial Stock
        const stocks = [
            { name: 'Doliprane', quantity: 100, expiryDate: new Date('2025-12-31') },
            { name: 'Advil', quantity: 50, expiryDate: new Date('2024-06-30') },
            { name: 'Fervex', quantity: 75, expiryDate: new Date('2025-01-01') }
        ];

        for (const s of stocks) {
            const stock = new Stock(s);
            await stock.save();
            console.log(`📦 Added Stock: ${s.name} (${s.quantity})`);
        }

        console.log('\n✅ Official Seeding Complete!');

    } catch (err) {
        console.error('Error seeding users:', err);
    } finally {
        await mongoose.disconnect();
    }
};

seedOfficialUsers();
