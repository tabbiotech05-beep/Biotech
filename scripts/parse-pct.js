import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workbook = xlsx.readFile(path.join(__dirname, '../Prix Concurrents Tenshi selon circulaires PCT.xlsx'));

// Sheet 1 has a note on row 1, headers on row 2 (index 1)
const sheet1Data = xlsx.utils.sheet_to_json(workbook.Sheets['Prix Des Concurrents'], { range: 1 });
const sheet2Data = xlsx.utils.sheet_to_json(workbook.Sheets['Prix Produits Tenshi ']);

const data = {
    competitors: sheet1Data.map(row => ({
        specialty: row['SPECIALITÉ'] || row['__EMPTY'] || row['NB : Les produits non mentionnés ne présentent aucun concurrent sur le marché tunisien.'],
        dosage: row['DOSAGE'] || row['__EMPTY_1'],
        priceWholesale: row['Prix Grossiste TTC'] || row['__EMPTY_2'],
        pricePharmacy: row['Prix Pharmacie TTC'] || row['__EMPTY_3'],
        pricePublic: row['Prix Public TTC'] || row['__EMPTY_4']
    })).filter(row => row.specialty && row.specialty !== 'SPECIALITÉ'),
    tenshi: sheet2Data.map(row => ({
        specialty: row['SPECIALITÉ'],
        dosage: row['DOSAGE'],
        priceWholesale: row['Prix Grossiste TTC'],
        pricePharmacy: row['Prix Pharmacie TTC'],
        pricePublic: row['Prix Public TTC']
    })).filter(row => row.specialty)
};

fs.writeFileSync(path.join(__dirname, '../src/data/pct_prices.json'), JSON.stringify(data, null, 2));
console.log('✅ Prices extracted and saved to src/data/pct_prices.json');
