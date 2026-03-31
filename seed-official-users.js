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
const tenshiUsers = ['wiem', 'feriel', 'rahma', 'rania', 'bureau', 'farah', 'saoussen', 'dorra', 'rahma.b', 'fatma', 'nessrine', 'nafissa', 'amal', 'maha'];

const passwords = {
    'mahmoud': 'R8D7pVOOnV',
    'slim': 'LWevHH56o7',
    'ouanes': 'lVgWdbbWrr',
    'malek': 'v63vAyEtyc',
    'seif': 'nfgkcGKBTY',
    'ines': '82YUbSzBcg',
    'cherifa': 'cVDwc1NvCK',
    'syrine': '4r4a5yFr4v',
    'soufiene': 'GDUIm2uBKH',
    'wiem': 'vxDGUS32me',
    'feriel': 'oJDPIAp1I8',
    'rahma': '6zUdZAm6mN',
    'rania': '6OouDNkEyL',
    'bureau': 'rdTQ8CMaYN',
    'farah': 'gsEiMIWZgs',
    'saoussen': 'IG7ZPUHP4L',
    'dorra': 'ArazTk7Hdw',
    'rahma.b': 'ariUWShIgZ',
    'fatma': 'Z1p2m86bir',
    'nessrine': 'EhYtdc0ZBv',
    'nafissa': 'szNiLavQRk',
    'asma': 'n2kNPd0e5Y',
    'amal': '0Acn4a3jiRdFnA',
    'maha': 'PJIAphUvW2yteA'
};

const getHash = async (pwd) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(pwd, salt);
};

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

        const oldYosra = await User.findOne({ username: 'yosra' });
        if (oldYosra) {
            oldYosra.username = 'bureau';
            oldYosra.email = 'bureau@bioxtenshi.com';
            await oldYosra.save();
            console.log('🔄 Automatically renamed user yosra to bureau');
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
                cycle.weeks[0] = doctorIds.map(id => ({ id, type: 'Doctor' }));
                await cycle.save();
                console.log(`✅ Automated: Cycle updated for feriel. Week 1 has ${doctorIds.length} doctors.`);
            } catch (err) {
                console.error('❌ Automation Error importing feriel cycle:', err.message);
            }
        }

        const allUsersList = [...admins, ...biotechUsers, ...tenshiUsers, 'asma'];

        for (const username of allUsersList) {
            const rawPwd = passwords[username] || '123456';
            const user = await User.findOne({ username });

            if (!user) {
                const newUser = new User({
                    username,
                    email: `${username}@bioxtenshi.com`,
                    password: await getHash(rawPwd),
                    role: admins.includes(username) ? 'admin' : (username === 'asma' ? 'pharmacienne' : 'delegue'),
                    allowedDashboards: admins.includes(username) ? ['dashboard1', 'dashboard2'] : (biotechUsers.includes(username) || username === 'asma' ? ['dashboard1'] : ['dashboard2'])
                });
                await newUser.save();
                console.log(`✅ Created User: ${username} with official password`);
            } else {
                // Check if password is "123456" and update it to official if needed
                const isDefault = await bcrypt.compare('123456', user.password);
                if (isDefault && rawPwd !== '123456') {
                    user.password = await getHash(rawPwd);
                    await user.save();
                    console.log(`🔄 Updated password for ${username} to official one`);
                }
            }
        }

        // Create Initial Stock if empty
        const stockCount = await Stock.countDocuments();
        if (stockCount === 0) {
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
        }

        console.log('\n✅ Official Seeding/Update Complete!');

    } catch (err) {
        console.error('Error seeding users:', err);
    } finally {
        await mongoose.disconnect();
    }
};

seedOfficialUsers();
