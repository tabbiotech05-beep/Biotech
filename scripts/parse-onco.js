import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../liste des Oncologues.xlsx');
if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

const doc = xlsx.readFile(filePath);
const sheetName = doc.SheetNames[0];
const rawData = xlsx.utils.sheet_to_json(doc.Sheets[sheetName]);

const oncoData = rawData.map(row => ({
    gouvernorat: row.Gouvernorat || '',
    ville: row.Ville || '',
    specialite: row.Spec || '',
    titre: row.Titre || '',
    nom: row.NOM || '',
    prenom: row.Prénom || '',
    mobile: row.Mobile || '',
    telephone: row['Télphone'] || '',
    email: row.Mail || '',
    adresse: row.Adresse || ''
}));

const outputDir = path.join(__dirname, '../src/data');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(path.join(outputDir, 'onco_data.json'), JSON.stringify(oncoData, null, 2));
console.log(`✅ Extracted ${oncoData.length} records to onco_data.json`);
