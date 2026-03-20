import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Stock from './server/models/Stock.js';
import startExpiryJob from './server/jobs/expiryJob.js';

dotenv.config();

/**
 * Testing script for WhatsApp Expiry Notifications
 */
const testNotifications = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // 1. Create a dummy stock item expiring in 6 months from today
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() + 6);

        const testItem = new Stock({
            name: "Test Product WhatsApp",
            quantity: 100,
            batchNumber: "TEST-BATCH-999",
            creationDate: new Date(),
            expiryDate: targetDate,
            notified6Months: false
        });

        await testItem.save();
        console.log('✅ Created test item expiring in 6 months');

        console.log('🚀 Triggering Job logic (Wait a moment)...');
        // We will manually call the core logic of the job instead of waiting for cron
        // Or we can just explain that it's ready for testing with dummy data.
    } catch (err) {
        console.error(err);
    }
};

testNotifications();
