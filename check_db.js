import mongoose from 'mongoose';
import User from './server/models/User.js';
import Congress from './server/models/Congress.js';
import dotenv from 'dotenv';
dotenv.config();

const dbUri = process.env.MONGO_URI || 'mongodb://localhost:27017/biotech';

async function checkData() {
    await mongoose.connect(dbUri);
    const count = await Congress.countDocuments();
    console.log(`Total Congresses: ${count}`);
    
    if (count > 0) {
        const congresses = await Congress.find().limit(5).populate('user', 'username');
        congresses.forEach(c => {
            console.log(`- Action: ${c.name}, User: ${c.user?.username}, Dashboard: ${c.dashboardId}`);
        });
    } else {
        console.log("No congresses found.");
    }
    
    const users = await User.find({}, 'username role').limit(10);
    console.log(`Total Users (subset): ${users.length}`);
    users.forEach(u => {
        console.log(`- User: ${u.username}, Role: ${u.role}`);
    });

    await mongoose.disconnect();
}

checkData();
