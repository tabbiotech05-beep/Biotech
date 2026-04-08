import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../Listing medecins actualisé 2022(Récupération automatique).xls');

if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

const doc = xlsx.readFile(filePath);

// Delegate sheets mapping: sheetName -> delegateName
const delegateSheets = {
    'SOFIENE': 'Sofiene',
    'SEIF': 'Seif',
    'INES Final': 'Ines',
    'Syrine FINAL ': 'Syrine',
    'Cherifa ': 'Cherifa'
};

let allContacts = {};

Object.entries(delegateSheets).forEach(([sheet, delegateName]) => {
    allContacts[delegateName] = [];
    if (doc.Sheets[sheet]) {
        const data = xlsx.utils.sheet_to_json(doc.Sheets[sheet]);
        data.forEach(row => {
            // Only add rows that have at least a name
            if ((row.Nom || row.NOM) && (row.Nom || row.NOM).trim()) {
                allContacts[delegateName].push({
                    delegate: delegateName,
                    nom: row.Nom || row.NOM || '',
                    prenom: row['Prénom'] || '',
                    specialite: (row['Spécialité'] || '').trim(),
                    ville: row['Ville (A.C)'] || row.Ville || '',
                    gouvernorat: row['Gouvernorat (A.C)'] || row.Gouvernorat || '',
                    telephone: row['Téléphone Prof'] || row['Télphone'] || row.Telephone || '',
                    mobile: row['Téléphone Portable'] || row.Mobile || '',
                    email: row.Email || row.Mail || '',
                    adresse: (row['Rue (A.C)'] || row.Adresse || '') + (row['Batiment (A.C)'] ? ' ' + row['Batiment (A.C)'] : '')
                });
            }
        });
        console.log(`✅ ${delegateName}: ${allContacts[delegateName].length} contacts`);
    } else {
        console.warn(`⚠️ Sheet "${sheet}" not found`);
    }
});

const outputDir = path.join(__dirname, '../src/data');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(path.join(outputDir, 'contacts_data.json'), JSON.stringify(allContacts, null, 2));
const total = Object.values(allContacts).reduce((sum, arr) => sum + arr.length, 0);
console.log(`\n✅ Total: ${total} contacts saved to contacts_data.json`);
