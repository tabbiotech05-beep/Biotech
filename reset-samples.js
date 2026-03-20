import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './server/models/User.js';

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bioxtenshi');
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err.message);
        process.exit(1);
    }
};

const resetSamples = async () => {
    await connectDB();

    try {
        console.log('Resetting samples for all delegates...');

        const result = await User.updateMany(
            {}, // Filter (Apply to all users, or specify { role: 'delegue' } if strict)
            { $set: { samples: [] } }
        );

        console.log(`Successfully reset samples for ${result.matchedCount} users.`);
        console.log(`Users modified: ${result.modifiedCount}`);

    } catch (err) {
        console.error('Error resetting samples:', err);
    } finally {
        mongoose.connection.close();
    }
};

resetSamples();
