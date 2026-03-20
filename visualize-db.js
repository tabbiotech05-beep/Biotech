import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './server/models/User.js';
import Visit from './server/models/Visit.js';

dotenv.config();

const visualizeDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('\n--- 👥 USERS ---');
        const users = await User.find({});
        users.forEach(user => {
            console.log(`ID: ${user._id}`);
            console.log(`Username: ${user.username}`);
            console.log(`Email: ${user.email}`);
            console.log(`Dashboards: ${user.allowedDashboards}`);
            console.log('----------------');
        });

        console.log('\n--- 🗓️  VISITS ---');
        const visits = await Visit.find({}).populate('user', 'username');
        visits.forEach(visit => {
            console.log(`ID: ${visit._id}`);
            console.log(`Title: ${visit.title}`);
            console.log(`User: ${visit.user ? visit.user.username : 'Unknown'}`);
            console.log(`Date: ${visit.start.toLocaleString()} - ${visit.end.toLocaleString()}`);
            console.log(`Type: ${visit.targetType} (${visit.visitName})`);
            console.log('----------------');
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected.');
    }
};

visualizeDB();
