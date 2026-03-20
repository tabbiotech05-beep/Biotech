import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './server/models/User.js';

dotenv.config();

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const users = [
            { email: 'mahmoud@biotechpharmabiotech.com', username: 'mahmoud', dashboards: ['dashboard1', 'dashboard2'] },
            { email: 'ouanes@biotechpharmemd.com', username: 'ouanes', dashboards: ['dashboard1', 'dashboard2'] },
            { email: 'malek@biotechpharmamd.com', username: 'malek', dashboards: ['dashboard1', 'dashboard2'] }
        ];

        const password = 'password123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        for (const u of users) {
            const existingUser = await User.findOne({ email: u.email });
            if (existingUser) {
                existingUser.allowedDashboards = u.dashboards;
                await existingUser.save();
                console.log(`Updated user: ${u.username}`);
            } else {
                const newUser = new User({
                    username: u.username,
                    email: u.email,
                    password: hashedPassword,
                    allowedDashboards: u.dashboards
                });
                await newUser.save();
                console.log(`Created user: ${u.username}`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedUsers();
