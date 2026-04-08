import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const oncoFilePath = path.join(__dirname, '../liste des Oncologues.xlsx');
const othersFilePath = path.join(__dirname, '../Listing medecins actualisé 2022(Récupération automatique).xls');

let allListings = [];

// 1. Process Oncologues
if (fs.existsSync(oncoFilePath)) {
    const doc = xlsx.readFile(oncoFilePath);
    const data = xlsx.utils.sheet_to_json(doc.Sheets[doc.SheetNames[0]]);
    data.forEach(row => {
        allListings.push({
            category: 'Oncologie',
            titre: row.Titre || '',
            nom: row.NOM || '',
            prenom: row['Prénom'] || '',
            specialite: 'Oncologie',
            ville: row.Ville || '',
            gouvernorat: row.Gouvernorat || '',
            telephone: row['Télphone'] || '',
            mobile: row.Mobile || '',
            email: row.Mail || '',
            adresse: row.Adresse || ''
        });
    });
}

// 2. Process Others (Rhumato, Gastro, Interne)
if (fs.existsSync(othersFilePath)) {
    const doc = xlsx.readFile(othersFilePath);
    const mapping = {
        'Rhumato': 'Rhumatologie',
        'Gastro': 'Gastro-entérologie',
        'Interne': 'Médecine Interne'
    };

    ['Rhumato', 'Gastro', 'Interne'].forEach(sheet => {
        if (doc.Sheets[sheet]) {
            const data = xlsx.utils.sheet_to_json(doc.Sheets[sheet]);
            data.forEach(row => {
                allListings.push({
                    category: mapping[sheet],
                    titre: 'Dr', // Standard for these sheets
                    nom: row.Nom || '',
                    prenom: row['Prénom'] || '',
                    specialite: (row['Spécialité'] || mapping[sheet]).trim(),
                    ville: row['Ville (A.C)'] || '',
                    gouvernorat: row['Gouvernorat (A.C)'] || '',
                    telephone: row['Téléphone Prof'] || '',
                    mobile: row['Téléphone Portable'] || '',
                    email: row.Email || '',
                    adresse: (row['Rue (A.C)'] || '') + (row['Batiment (A.C)'] ? ' ' + row['Batiment (A.C)'] : '')
                });
            });
        }
    });
}

const outputDir = path.join(__dirname, '../src/data');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(path.join(outputDir, 'listings_data.json'), JSON.stringify(allListings, null, 2));
console.log(`✅ Extracted ${allListings.length} total records to listings_data.json`);

// ─── Delegate Contacts Extraction ────────────────────────────────────────────
const sectorFilePath = path.join(__dirname, '../Sectorisation 2025 Biocon.xlsx');

// Helper to parse a delegate sheet from a workbook
function extractDelegateContacts(doc, sheetName, delegateName) {
    const entries = [];
    if (doc.Sheets[sheetName]) {
        const data = xlsx.utils.sheet_to_json(doc.Sheets[sheetName]);
        data.forEach(row => {
            const nom = row.Nom || row.NOM || '';
            if (nom.trim()) {
                entries.push({
                    delegate: delegateName,
                    nom: nom.trim(),
                    prenom: row['Prénom'] || '',
                    specialite: (row['Spécialité'] || '').trim(),
                    ville: (row['Ville (A.C)'] || row.Ville || '').trim(),
                    gouvernorat: (row['Gouvernorat (A.C)'] || row.Gouvernorat || '').trim(),
                    telephone: row['Téléphone Prof'] || row['Télphone'] || '',
                    mobile: row['Téléphone Portable'] || row.Mobile || '',
                    email: row.Email || row.Mail || '',
                    adresse: ((row['Rue (A.C)'] || row.Adresse || '') + (row['Batiment (A.C)'] ? ' ' + row['Batiment (A.C)'] : '')).trim()
                });
            }
        });
    }
    return entries;
}

if (fs.existsSync(othersFilePath)) {
    const docOld = xlsx.readFile(othersFilePath);

    // Sheet name -> delegate name (old listing file)
    const oldDelegateSheets = {
        'SOFIENE': 'Sofiene',
        'SEIF': 'Seif',
        'INES Final': 'Ines',
        'Syrine FINAL ': 'Syrine',
        'Cherifa ': 'Cherifa'
    };

    let allContacts = { Sofiene: [], Seif: [], Ines: [], Syrine: [], Cherifa: [] };

    // 1. Read from old listing file
    Object.entries(oldDelegateSheets).forEach(([sheet, delegateName]) => {
        const entries = extractDelegateContacts(docOld, sheet, delegateName);
        allContacts[delegateName].push(...entries);
        console.log(`✅ Old listing - ${delegateName}: ${entries.length} entries`);
    });

    // 2. Append from sectorisation file (keep duplicates as requested)
    if (fs.existsSync(sectorFilePath)) {
        const docSector = xlsx.readFile(sectorFilePath);
        // Sectorisation sheets are named directly after delegates
        const sectorSheets = {
            'Sofiene': 'Sofiene',
            'Seif': 'Seif',
            'Ines': 'Ines',
            'Syrine': 'Syrine',
            'Cherifa': 'Cherifa'
        };

        Object.entries(sectorSheets).forEach(([sheet, delegateName]) => {
            const entries = extractDelegateContacts(docSector, sheet, delegateName);
            allContacts[delegateName].push(...entries);
            console.log(`✅ Sectorisation - ${delegateName}: ${entries.length} entries`);
        });
    } else {
        console.warn('⚠️ Sectorisation file not found');
    }

    fs.writeFileSync(path.join(outputDir, 'contacts_data.json'), JSON.stringify(allContacts, null, 2));
    const total = Object.values(allContacts).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`\n✅ Total ${total} contacts saved to contacts_data.json`);
}
