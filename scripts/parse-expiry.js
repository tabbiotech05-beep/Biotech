import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelDateToJSDate = (serial) => {
    // Excel serial date to JS Date
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date;
};

const filePath = path.join(__dirname, '../Inventory with Expiry Details.xlsx');
if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

const doc = xlsx.readFile(filePath);
const sheetName = doc.SheetNames[0];
const rawData = xlsx.utils.sheet_to_json(doc.Sheets[sheetName]);

const expiryData = rawData.map(row => {
    const jsDate = excelDateToJSDate(row.DATEPEREMPTION);
    return {
        depot: row.DEPOT,
        libelle: row.LIBELLE,
        numLot: row.NUMLOT,
        stock: row.STOCK,
        expiryDate: jsDate.toLocaleDateString('fr-FR'),
        rawDate: jsDate.getTime()
    };
}).sort((a, b) => a.rawDate - b.rawDate); // Sort by expiry date (soonest first)

const outputDir = path.join(__dirname, '../src/data');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(path.join(outputDir, 'expiry_data.json'), JSON.stringify(expiryData, null, 2));
console.log(`✅ Extracted ${expiryData.length} expiry records to expiry_data.json`);
