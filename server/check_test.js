import mongoose from "mongoose";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env") });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
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
