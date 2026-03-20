import cron from 'node-cron';
import Stock from '../models/Stock.js';
import { sendWhatsAppMessage } from '../utils/whatsapp.js';

/**
 * Scheduled job to check for stock expiring in exactly 6 months.
 * Runs daily at midnight.
 */
const startExpiryJob = () => {
    // cron: 0 0 * * * (Every day at midnight)
    // For testing/demo, we can use '* * * * *' (Every minute) if needed.
    cron.schedule('0 0 * * *', async () => {
        console.log('🕒 Running Daily Expiry Check...');

        try {
            // 1. Calculate the target date: Today + 6 months
            const today = new Date();
            const targetDate = new Date();
            targetDate.setMonth(today.getMonth() + 6);

            // Normalize dates to remove time (comparing days only)
            const targetDateStart = new Date(targetDate.setHours(0, 0, 0, 0));
            const targetDateEnd = new Date(targetDate.setHours(23, 59, 59, 999));

            // 2. Find items expiring on that exact day that haven't been notified
            const itemsToNotify = await Stock.find({
                expiryDate: {
                    $gte: targetDateStart,
                    $lte: targetDateEnd
                },
                notified6Months: false
            });

            if (itemsToNotify.length > 0) {
                console.log(`📢 Found ${itemsToNotify.length} items to notify.`);

                for (const item of itemsToNotify) {
                    const message = `L'echantillons [${item.name} (Lot: ${item.batchNumber})] est arrivé a 6 mois avant la fin de l'expiration.`;

                    await sendWhatsAppMessage(message);

                    // 3. Mark as notified so we don't send it again tomorrow
                    item.notified6Months = true;
                    await item.save();
                }
            } else {
                console.log('✅ No items expiring in 6 months today.');
            }
        } catch (err) {
            console.error('❌ Expiry Job Error:', err);
        }
    });

    console.log('🚀 Expiry Job Scheduled (Daily at Midnight)');
};

export default startExpiryJob;
