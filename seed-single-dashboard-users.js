import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './server/models/User.js';

dotenv.config();

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash('123456', salt);

        const usersToCreate = [
            { username: 'med_1', email: 'med1@bioxtenshi.com', dashboard: 'dashboard1' },
            { username: 'med_2', email: 'med2@bioxtenshi.com', dashboard: 'dashboard2' },
            { username: 'med_3', email: 'med3@bioxtenshi.com', dashboard: 'dashboard1' },
            { username: 'med_4', email: 'med4@bioxtenshi.com', dashboard: 'dashboard2' },
            { username: 'med_5', email: 'med5@bioxtenshi.com', dashboard: 'dashboard1' },
            { username: 'med_6', email: 'med6@bioxtenshi.com', dashboard: 'dashboard2' },
        ];

        // Clean up specific existing users
        const emails = usersToCreate.map(u => u.email);
        await User.deleteMany({ email: { $in: emails } });
        console.log('🗑️  Cleaned up existing test users');

        for (const u of usersToCreate) {
            const user = new User({
                username: u.username,
                email: u.email,
                password: password,
                allowedDashboards: [u.dashboard]
            });
            await user.save();
            console.log(`✅ Created ${u.username} (${u.dashboard})`);
        }

    } catch (err) {
        console.error('Error seeding users:', err);
    } finally {
        await mongoose.disconnect();
    }
};

seedUsers();
