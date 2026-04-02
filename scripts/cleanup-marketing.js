import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Congress from '../server/models/Congress.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });

async function cleanupMarketing() {
    let mongod;
    try {
        console.log('Starting Persistent Local MongoDB for cleanup...');
        const dbPath = path.join(rootDir, 'data', 'db');
        
        // Remove lock file if it exists but no process is running
        const lockFile = path.join(dbPath, 'mongod.lock');
        if (fs.existsSync(lockFile)) {
            console.log('Removing stale mongod.lock...');
            fs.unlinkSync(lockFile);
        }

        mongod = await MongoMemoryServer.create({
            instance: {
                dbPath: dbPath,
                storageEngine: 'wiredTiger'
            }
        });

        const uri = mongod.getUri();
        console.log(`Connected to MongoDB at: ${uri}`);
        await mongoose.connect(uri);

        const congresses = await Congress.find({});
        console.log(`Found ${congresses.length} marketing actions to delete.`);

        for (const congress of congresses) {
            if (congress.image) {
                // Ensure image path is absolute or relative to rootDir
                const imagePath = path.isAbsolute(congress.image) 
                    ? congress.image 
                    : path.join(rootDir, congress.image);
                
                if (fs.existsSync(imagePath)) {
                    console.log(`Deleting image: ${imagePath}`);
                    fs.unlinkSync(imagePath);
                } else {
                    console.log(`Image not found: ${imagePath}`);
                }
            }
        }

        const result = await Congress.deleteMany({});
        console.log(`Deleted ${result.deletedCount} marketing actions from database.`);

        await mongoose.disconnect();
        await mongod.stop();
        console.log('Cleanup complete and MongoDB stopped.');
        process.exit(0);
    } catch (err) {
        console.error('Error during cleanup:', err);
        if (mongod) await mongod.stop();
        process.exit(1);
    }
}

cleanupMarketing();
