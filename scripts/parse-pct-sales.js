import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, '../Sales & Inventory Data PCT.xlsx');

const rawData = [];

if (fs.existsSync(file)) {
    const doc = xlsx.readFile(file);
    const sheetName = doc.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(doc.Sheets[sheetName], { header: 1 });

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[1]) continue; // Skip empty rows or rows without brand name
        
        rawData.push({
            brandName: row[1],
            avgMonthlySales: row[2] || 0,
            janSales: row[3] || 0,
            febSales: row[4] || 0,
            closingInventory: row[5] || 0,
            moh: row[6] || 0,
            supplies: row[7] || 0
        });
    }

    fs.writeFileSync(path.join(__dirname, '../src/data/pct_sales_data.json'), JSON.stringify(rawData, null, 2));
    console.log(`✅ Extracted ${rawData.length} PCT sales records to pct_sales_data.json`);
} else {
    console.error(`File not found: ${file}`);
}
