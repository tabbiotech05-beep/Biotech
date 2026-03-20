import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'fs';
import User from './server/models/User.js';

dotenv.config();

function generateRandomPassword(length = 10) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

const updatePasswords = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const users = await User.find({});
        console.log(`👤 Found ${users.length} users. Generating new passwords...`);

        let credentialsText = "BIOXTENSHI - NOUVEAUX IDENTIFIANTS\n";
        credentialsText += "=".repeat(40) + "\n\n";

        for (const user of users) {
            const rawPassword = generateRandomPassword(10);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(rawPassword, salt);

            user.password = hashedPassword;
            await user.save();

            console.log(`🔑 Password reset for: ${user.username}`);
            credentialsText += `Utilisateur: ${user.username}\n`;
            credentialsText += `Mot de passe: ${rawPassword}\n`;
            credentialsText += `Role: ${user.role}\n`;
            credentialsText += "-".repeat(20) + "\n";
        }

        fs.writeFileSync('credentials.txt', credentialsText);
        console.log('\n✅ All passwords updated successfully.');
        console.log('📄 Credentials saved to credentials.txt');

    } catch (err) {
        console.error('Error updating passwords:', err);
    } finally {
        await mongoose.disconnect();
    }
};

updatePasswords();
