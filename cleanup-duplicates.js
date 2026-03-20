import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import Visit from './server/models/Visit.js';
import User from './server/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function cleanup() {
    let mongod;
    try {
        console.log('🚀 Starting Local MongoDB for cleanup...');
        const dbPath = path.join(__dirname, 'data', 'db');

        mongod = await MongoMemoryServer.create({
            instance: {
                dbPath: dbPath,
                storageEngine: 'wiredTiger'
            }
        });

        const uri = mongod.getUri();
        console.log(`✅ Connected to Database at: ${uri}`);

        await mongoose.connect(uri);

        // 1. Find all duplicates
        const duplicates = await Visit.aggregate([
            {
                $group: {
                    _id: {
                        user: "$user",
                        dashboardId: "$dashboardId",
                        title: "$title",
                        start: "$start",
                        end: "$end"
                    },
                    count: { $sum: 1 },
                    ids: { $push: "$_id" }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]);

        console.log(`🔍 Found ${duplicates.length} groups of duplicate visits.`);

        let removedCount = 0;
        let restoredSamples = 0;

        for (const group of duplicates) {
            const [keepId, ...removeIds] = group.ids;

            console.log(`\n📂 Processing group: "${group._id.title}" at ${group._id.start}`);
            console.log(`   - Total visits in group: ${group.count}`);
            console.log(`   - Keeping visit ID: ${keepId}`);

            for (const dupId of removeIds) {
                const visitToDelete = await Visit.findById(dupId);
                if (!visitToDelete) continue;

                if (visitToDelete.givenSampleName) {
                    console.log(`   - Restoring sample: ${visitToDelete.givenSampleName}`);
                    const user = await User.findById(visitToDelete.user);
                    if (user) {
                        const sampleIndex = user.samples.findIndex(
                            s => s.name === visitToDelete.givenSampleName && s.batchNumber === (visitToDelete.givenSampleBatch || null)
                        );

                        if (sampleIndex !== -1) {
                            user.samples[sampleIndex].count += 1;
                            user.markModified('samples');
                            await user.save();
                            restoredSamples++;
                        }
                    }
                }

                await Visit.findByIdAndDelete(dupId);
                removedCount++;
            }
        }

        console.log('\n--- Cleanup Summary ---');
        console.log(`✅ Duplicate visits removed: ${removedCount}`);
        console.log(`📦 Samples restored to stock: ${restoredSamples}`);
        console.log('------------------------');

    } catch (err) {
        if (err.message.includes('instance is already running')) {
            console.error('❌ Error: The database is already in use by another process (your server).');
            console.error('👉 Please STOP your server terminal before running this cleanup script.');
        } else {
            console.error('❌ Error during cleanup:', err);
        }
    } finally {
        await mongoose.disconnect();
        if (mongod) await mongod.stop();
        console.log('🔌 Cleanup process finished.');
    }
}

cleanup();
