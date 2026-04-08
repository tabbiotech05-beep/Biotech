import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../Sectorisation 2025 Biocon.xlsx');
const doc = xlsx.readFile(filePath);

console.log('Sheets:', JSON.stringify(doc.SheetNames));

doc.SheetNames.forEach(name => {
    const data = xlsx.utils.sheet_to_json(doc.Sheets[name], { header: 1 });
    console.log(`\n--- ${name} (${data.length} rows) ---`);
    data.slice(0, 3).forEach(row => console.log(JSON.stringify(row)));
});
