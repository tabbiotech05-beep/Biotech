import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './server/models/User.js';

dotenv.config();

const seedUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const username = 'admin';
        const email = 'admin@example.com';
        const password = 'password123';

        // Check if user exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            console.log('User already exists');
            process.exit(0);
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        await newUser.save();
        console.log(`User created: ${username} / ${password}`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedUser();
