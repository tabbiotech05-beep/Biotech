import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../Listing medecins actualisé 2022(Récupération automatique).xls');
const doc = xlsx.readFile(filePath);

console.log('All sheets:', doc.SheetNames);

const delegateSheets = ['SOFIENE', 'SEIF', 'INES Final', 'Syrine FINAL ', 'Cherifa '];

delegateSheets.forEach(sheet => {
    console.log(`\n--- ${sheet} ---`);
    if (doc.Sheets[sheet]) {
        const data = xlsx.utils.sheet_to_json(doc.Sheets[sheet], { header: 1 });
        data.slice(0, 4).forEach(row => console.log(JSON.stringify(row)));
    } else {
        console.log('NOT FOUND');
    }
});
