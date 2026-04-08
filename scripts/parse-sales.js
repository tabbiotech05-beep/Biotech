import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const months = {
    '01': 'Janvier',
    '02': 'Février',
    '03': 'Mars',
    '04': 'Avril',
    '05': 'Mai',
    '06': 'Juin',
    '07': 'Juillet',
    '08': 'Août',
    '09': 'Septembre',
    '10': 'Octobre',
    '11': 'Novembre',
    '12': 'Décembre'
};

const files = [
    { name: 'Ventes détaillées 2026-01 Biotech.xlsx', monthCode: '01' },
    { name: 'Ventes détaillées 2026-02 Biotech.xlsx', monthCode: '02' },
    { name: 'Ventes détaillées 2026-03 Biotech.xlsx', monthCode: '03' }
];

let allSalesData = [];

files.forEach(fileDef => {
    const filePath = path.join(__dirname, '../', fileDef.name);
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    const doc = xlsx.readFile(filePath);
    const sheetName = doc.SheetNames[0];
    const rawData = xlsx.utils.sheet_to_json(doc.Sheets[sheetName], { header: 1 });

    // Assuming row 0 is headers
    // Col D = index 3
    // Col F = index 5
    // Col H = index 7
    // Col K = index 10

    const monthName = months[fileDef.monthCode];

    for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length < 11) continue; // Skip empty/incomplete rows

        // Only add if there's actual data to display
        if (row[3] || row[5] || row[10]) {
            allSalesData.push({
                mois: monthName,
                libelle: row[3] || '',
                client: row[5] || '',
                gouvernorat: row[7] || '',
                quantite: row[10] || 0
            });
        }
    }
});

fs.writeFileSync(path.join(__dirname, '../src/data/sales_data.json'), JSON.stringify(allSalesData, null, 2));
console.log(`✅ Extracted ${allSalesData.length} records to sales_data.json`);
