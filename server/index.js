import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import visitRoutes from './routes/visits.js';
import congressRoutes from './routes/congress.js';
import stockRoutes from './routes/stock.js';
import historyRoutes from './routes/history.js';
import doctorRoutes from './routes/doctors.js';
import cycleRoutes from './routes/cycle.js';
import pharmacyRoutes from './routes/pharmacies.js';
import wholesalerRoutes from './routes/wholesalers.js';
import stockPCTRoutes from './routes/stockPCT.js';
import leaveRoutes from './routes/leave.js';
import startExpiryJob from './jobs/expiryJob.js';
import { initWhatsAppBot } from './utils/whatsappBot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Start background jobs
startExpiryJob();

// Start free WhatsApp bot (QR code shown on first launch)
initWhatsAppBot();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/congress', congressRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/cycle', cycleRoutes);
app.use('/api/pharmacies', pharmacyRoutes);
app.use('/api/wholesalers', wholesalerRoutes);
app.use('/api/stock-pct', stockPCTRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
