import mongoose from 'mongoose';
import Visit from './server/models/Visit.js';
import User from './server/models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bioxtenshi';

async function backfill() {
    try {
        await mongoose.connect(dbUri);
        console.log('Connected to DB');

        const visits = await Visit.find({ delegateName: { $exists: false } }).populate('user', 'username');
        console.log(`Found ${visits.length} visits to backfill.`);

        let count = 0;
        for (const visit of visits) {
            if (visit.user && visit.user.username) {
                visit.delegateName = visit.user.username;
                await visit.save();
                count++;
            }
        }

        console.log(`Successfully backfilled ${count} visits with delegate names.`);
    } catch (err) {
        console.error('Backfill error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

backfill();
