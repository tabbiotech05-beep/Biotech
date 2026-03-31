import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, '../Sales & Inventory Data PCT.xlsx');
const wl = xlsx.readFile(file);
const sheetName = wl.SheetNames[0];
const sheetData = xlsx.utils.sheet_to_json(wl.Sheets[sheetName], { header: 1 });

console.log("Sheet names:", wl.SheetNames);
console.log("Row 0 (Headers potentially):");
console.log(sheetData[0]);
console.log("Row 1 (Data potentially):");
console.log(sheetData[1]);
console.log(`Total rows: ${sheetData.length}`);
