import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    console.log('🔄 Starting local DB for password update...');
    const dbPath = path.join(__dirname, 'data', 'db');

    // Ensure dbPath exists
    if (!fs.existsSync(dbPath)) {
        console.error('❌ Data directory not found. Please run the app first to seed users.');
        process.exit(1);
    }

    try {
        const mongod = await MongoMemoryServer.create({
            instance: {
                dbPath: dbPath,
                storageEngine: 'wiredTiger'
            }
        });
        const uri = mongod.getUri();
        console.log(`✅ Connected to DB at: ${uri}`);

        console.log('🚀 Running password generation script...');
        const result = spawnSync('node', ['generate-passwords.js'], {
            env: { ...process.env, MONGODB_URI: uri },
            stdio: 'inherit'
        });

        if (result.status === 0) {
            console.log('\n✨ Password update complete!');
        } else {
            console.error('\n❌ Password update failed.');
        }

        await mongod.stop();
        console.log('👋 Local DB stopped.');
    } catch (err) {
        if (err.message.includes('lock')) {
            console.error('❌ ERROR: Database is locked. Is the BioXtenshi app currently running?');
            console.error('Please stop the app (ctrl+c) before running the password update.');
        } else {
            console.error('❌ Error during password update:', err);
        }
        process.exit(1);
    }
}

run();
