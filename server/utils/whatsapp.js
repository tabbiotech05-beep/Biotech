import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Sends a WhatsApp message using a generic API provider (e.g., UltraMsg, Whapi, etc.)
 * @param {string} message - The message content
 */
export const sendWhatsAppMessage = async (message) => {
    const apiUrl = process.env.WHATSAPP_API_URL;
    const token = process.env.WHATSAPP_TOKEN;
    const targetPhone = process.env.TARGET_PHONE_NUMBER || '+21692568518';

    if (!apiUrl || !token) {
        console.warn('⚠️ WhatsApp API credentials missing. Notification not sent:', message);
        return;
    }

    try {
        // Generic implementation - many providers use a simple POST with 'token', 'to', and 'body'
        // This can be adjusted based on the specific provider chosen by the user.
        await axios.post(apiUrl, {
            token: token,
            to: targetPhone,
            body: message
        });
        console.log('✅ WhatsApp message sent successfully');
    } catch (err) {
        console.error('❌ Failed to send WhatsApp message:', err.response?.data || err.message);
    }
};
