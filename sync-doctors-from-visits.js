/**
 * sync-doctors-from-visits.js
 * Importe automatiquement tous les médecins depuis les visites 
 * pour TOUS les délégués (medecin targetType).
 * 
 * Usage: MONGODB_URI="mongodb://..." node sync-doctors-from-visits.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './server/models/User.js';
import Visit from './server/models/Visit.js';
import Doctor from './server/models/Doctor.js';

dotenv.config({ override: false });

const run = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI non défini. Usage: MONGODB_URI="mongodb://..." node sync-doctors-from-visits.js');
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('✅ Connecté à MongoDB\n');

    // Get all delegue users
    const delegues = await User.find({ role: 'delegue' }, 'username _id');
    console.log(`👥 ${delegues.length} délégué(s) trouvé(s)\n`);

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const delegue of delegues) {
        // Find all their visits where they visited a doctor
        const visits = await Visit.find({ user: delegue._id, targetType: 'medecin' });

        if (visits.length === 0) {
            console.log(`  ⚪ ${delegue.username}: aucune visite médecin`);
            continue;
        }

        let created = 0;
        let skipped = 0;

        for (const visit of visits) {
            if (!visit.doctorName || visit.doctorName.trim() === '') continue;

            const exists = await Doctor.findOne({ user: delegue._id, name: visit.doctorName });
            if (exists) {
                skipped++;
                continue;
            }

            const newDoctor = new Doctor({
                user: delegue._id,
                name: visit.doctorName,
                specialty: visit.specialty || '',
                governorate: visit.governorate || '',
                address: visit.address || ''
            });
            await newDoctor.save();
            created++;
        }

        console.log(`  ✅ ${delegue.username}: ${created} ajouté(s), ${skipped} déjà présent(s) (${visits.length} visites)`);
        totalCreated += created;
        totalSkipped += skipped;
    }

    console.log(`\n🏁 Total: ${totalCreated} médecin(s) ajouté(s), ${totalSkipped} ignoré(s)`);
    await mongoose.disconnect();
};

run().catch(err => { console.error('❌ Erreur:', err.message); process.exit(1); });
