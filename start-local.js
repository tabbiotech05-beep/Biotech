import { MongoMemoryServer } from 'mongodb-memory-server';
import { spawn, execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function start() {
    console.log('🚀 Starting BioXtenshi Local Environment...');

    // 1. Start Persistent Local MongoDB
    const dbPath = path.join(__dirname, 'data', 'db');
    const mongod = await MongoMemoryServer.create({
        instance: {
            dbPath: dbPath,
            storageEngine: 'wiredTiger'
        }
    });
    const uri = mongod.getUri();
    console.log(`✅ Local MongoDB running at: ${uri}`);
    console.log(`📂 Data stored in: ${dbPath}`);

    // Wait for MongoDB to be fully ready before seeding
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Set the environment variable for child processes
    const env = { ...process.env, MONGODB_URI: uri, PORT: '5000' };

    try {
        // 2. Run Seeding Script
        console.log('🌱 Seeding database...');
        execSync('node seed-official-users.js', {
            env,
            stdio: 'inherit',
            cwd: __dirname
        });

        console.log('💊 Seeding Stock...');
        try {
            execSync('node seed-stock.js', {
                env,
                stdio: 'inherit',
                cwd: __dirname
            });
        } catch (e) {
            console.warn('Stock seeding warning (non-fatal):', e.message);
        }

        console.log('✅ Seeding finished.');

        // 3. Start Backend Server
        console.log('🔌 Starting Backend Server...');
        const serverProcess = spawn('node', ['server/index.js'], {
            env,
            stdio: 'inherit',
            cwd: __dirname
        });

        console.log(`📡 Backend process spawned with PID: ${serverProcess.pid}`);

        serverProcess.on('error', (err) => {
            console.error('❌ Failed to start server:', err);
        });

        serverProcess.on('exit', (code, signal) => {
            console.log(`⚠️  Backend process exited (code=${code}, signal=${signal}). Restarting in 3s...`);
            setTimeout(() => {
                console.log('🔄 Restarting Backend Server...');
                const newProcess = spawn('node', ['server/index.js'], {
                    env,
                    stdio: 'inherit',
                    cwd: __dirname
                });
                console.log(`📡 Backend restarted with PID: ${newProcess.pid}`);
                newProcess.on('error', (err) => console.error('❌ Restart failed:', err));
                newProcess.on('exit', (c, s) => console.log(`⚠️  Backend exited again (code=${c}, signal=${s})`));
            }, 3000);
        });

        // Handle cleanup on exit
        process.on('SIGINT', async () => {
            console.log('\n🛑 Shutting down...');
            serverProcess.kill();
            await mongod.stop();
            process.exit();
        });

    } catch (error) {
        console.error('❌ Error during startup:', error);
        await mongod.stop();
        process.exit(1);
    }
}

start();
