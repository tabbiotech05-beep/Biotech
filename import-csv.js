import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import User from './server/models/User.js';
import Visit from './server/models/Visit.js';
import Doctor from './server/models/Doctor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_FILE = 'export_All-Plannings-modified--_2026-03-10_13-12-13.csv';

const nameMapping = {
    'Ines Ghazouani': 'ines',
    'Syrine Hidri': 'syrine',
    'Seif Ben Henia': 'seif',
    'Soufiene Sghari': 'soufiene',
    'Cherifa Basly': 'cherifa',
    'Wiem': 'wiem',
    'Maha': 'maha',
    'Amal': 'amal',
    'Neffisa': 'nafissa',
    'Rahma': 'rahma',
    'Rania': 'rania',
    'Saoussen': 'saoussen',
    // add others as seen in CSV
};

async function runImport() {
    const dbPath = path.join(__dirname, 'data', 'db');
    const mongod = await MongoMemoryServer.create({
        instance: { dbPath: dbPath, storageEngine: 'wiredTiger' }
    });
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log('Connected to DB');

    const csvData = fs.readFileSync(CSV_FILE, 'utf-8');
    const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true
    });

    console.log(`Processing ${records.length} records...`);

    let importedCount = 0;
    let skippedCount = 0;

    for (const record of records) {
        const assignedTo = record.AssignedTo;
        const username = nameMapping[assignedTo] || assignedTo.split(' ')[0].toLowerCase();
        
        const user = await User.findOne({ username });
        if (!user) {
            skippedCount++;
            continue;
        }

        const date = new Date(record.DueDate);
        const report = record.TaskDetail || '';
        const title = record.TaskName || 'Visite';
        
        // Determine target doctor/pharmacy
        const doctorName = record.Medecin;
        const pharmacyName = record.Pharmacie;
        const wholesalerName = record.Grossiste;
        
        const visit = new Visit({
            user: user._id,
            dashboardId: user.allowedDashboards[0] || 'dashboard1',
            title: title,
            date: date,
            comment: report,
            doctorName: doctorName,
            pharmacyName: pharmacyName,
            wholesalerName: wholesalerName,
            status: 'completed'
        });

        await visit.save();
        importedCount++;
    }

    console.log(`Import finished. Total: ${records.length}, Imported: ${importedCount}, Skipped: ${skippedCount}`);

    await mongoose.disconnect();
    await mongod.stop();
    process.exit(0);
}

runImport().catch(err => {
    console.error(err);
    process.exit(1);
});
