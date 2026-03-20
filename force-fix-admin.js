import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './server/models/User.js';

dotenv.config();

const forceFixAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const admin = await User.findOne({ username: 'admin' });
        if (admin) {
            console.log('Current dashboards:', admin.allowedDashboards);
            // Force overwrite
            admin.set('allowedDashboards', ['dashboard1']);
            await admin.save();
            console.log('Forced update admin user');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

forceFixAdmin();
