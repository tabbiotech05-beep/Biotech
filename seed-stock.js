import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Stock from './server/models/Stock.js';

dotenv.config({ override: false }); // Don't overwrite env vars passed by parent process

const products = [
    "CELEBREX 200 MG CAP X 10 TUN",
    "CELEBREX 200 MG CAP X 20 TUN",
    "CELEBREX 200MG BT 30 TUN",
    "TAHOR 10 MG X 91 TUN",
    "TAHOR 10 MG X 28 TUN",
    "TAHOR 20 MG X 91 TUN",
    "TAHOR 20MG X 28",
    "TAHOR 40MG X 28 TUN",
    "TAHOR 40MG BT 91 TUN",
    "ZOLOFT 50 B30",
    "ZOLOFT CP 50 MG X 15 TUN",
    "LYRICA CAP 150MG 56BL TN PZR",
    "LYRICA CAP 75MG 14BL TN PZR",
    "LYRICA CAP 75MG 56BL TN PZR",
    "EFFEXOR LP 37.5mg CAP 3x10 BLS TN/MA",
    "XALACOM ED 50MCG/5MG/ML 2.5ML 1BT TN PZR",
    "XALATAN ED 50MCG/ML 1X2.5MLBT TN PZR",
    "VIAGRA TAB 100MG 4BL TN PZR",
    "VIAGRA TAB 25MG 4BL TN PZR",
    "VIAGRA TAB 50MG 4BL TN PZR",
    "FLECAINE 100mg",
    "FLECAINE LP 200mg",
    "FLECAINE LP 50mg",
    "FLECAINE LP 100mg",
    "SOTALOL",
    "VALPROATE Officine",
    "Detrusitol Retard 2MG",
    "Detrusitol Retard 4MG"
];

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bioxtenshi');
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err.message);
        process.exit(1);
    }
};

const seedStock = async () => {
    await connectDB();

    console.log(`Starting to seed ${products.length} products...`);

    // Common data
    const QUANTITY = 100;
    const EXPIRY_DATE = new Date('2029-01-21');
    const BATCH_NUMBER = 'INIT-2029';

    try {
        // Optional: clear existing stock? 
        // The user said "add to the stock", so likely append. But to avoid duplicates if run twice, maybe check?
        // For simplicity as a seed script, I'll just add. 
        // Or I can wipe and add if I want a clean state, but user surely has existing data.
        // Let's check if it exists first to be safe, creating unique entries.

        for (const productName of products) {
            const exists = await Stock.findOne({ name: productName, batchNumber: BATCH_NUMBER });
            if (exists) {
                console.log(`Skipping ${productName} (already exists with this batch)`);
                continue;
            }

            const newStock = new Stock({
                name: productName,
                quantity: QUANTITY,
                expiryDate: EXPIRY_DATE,
                batchNumber: BATCH_NUMBER,
                creationDate: Date.now()
            });
            await newStock.save();
            console.log(`Added: ${productName}`);
        }

        console.log('Stock seeding completed successfully.');
    } catch (err) {
        console.error('Error seeding stock:', err);
    } finally {
        mongoose.connection.close();
    }
};

seedStock();
