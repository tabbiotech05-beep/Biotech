import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './server/models/User.js';

dotenv.config();

const fixAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const admin = await User.findOne({ username: 'admin' });
        if (admin) {
            if (!admin.allowedDashboards || admin.allowedDashboards.length === 0) {
                admin.allowedDashboards = ['dashboard1'];
                await admin.save();
                console.log('Updated admin user with default dashboard');
            } else {
                console.log('Admin user already has dashboards set');
            }
        } else {
            console.log('Admin user not found');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

fixAdmin();
