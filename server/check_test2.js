import mongoose from "mongoose";

async function run() {
  try {
    await mongoose.connect('mongodb://localhost:27017/bioxtenshi');
    const Congress = mongoose.model("Congress", new mongoose.Schema({}, { strict: false }));
    const result = await Congress.find({ name: /test/i }).lean();
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
