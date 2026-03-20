import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Congress from './server/models/Congress.js';

dotenv.config();

const verifyCongress = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('\n--- 🏛️  CONGRESSES ---');
        const congresses = await Congress.find({}).populate('user', 'username');
        if (congresses.length === 0) {
            console.log("No congresses found.");
        } else {
            congresses.forEach(c => {
                console.log(`ID: ${c._id}`);
                console.log(`Name: ${c.name} | Status: ${c.status}`);
                console.log(`Dashboard: ${c.dashboardId} | User: ${c.user?.username}`);
                console.log(`Image Path: ${c.image}`);
                console.log('----------------');
            });
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
};

verifyCongress();
