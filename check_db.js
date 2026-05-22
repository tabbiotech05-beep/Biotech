import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ventes_et_stocks');
  const db = mongoose.connection.db;
  
  const docs = await db.collection('doctors').find({ medications: { $exists: true, $not: { $size: 0 } } }).toArray();
  console.log('Doctors with meds:', docs.length);
  
  const meds = await db.collection('medications').find().toArray();
  console.log('Total meds:', meds.length);
  
  process.exit(0);
}

run();
