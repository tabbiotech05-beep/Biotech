import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure src/data exists
const dataDir = path.join(__dirname, '../src/data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 1. Parse Biosim Prices
const biosimFile = path.join(__dirname, '../Nouveaux prix Biosim.xlsx');
if (fs.existsSync(biosimFile)) {
    const doc = xlsx.readFile(biosimFile);
    const sheetName = doc.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(doc.Sheets[sheetName], { header: 1 });
    
    // row 0 is headers
    const headers = data[0];
    const parsedPrices = [];
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[1]) continue;
        parsedPrices.push({
            codePCT: row[0],
            designation: row[1],
            ancienPrixPublic: row[2],
            nouveauHopital: row[3],
            nouveauOfficine: row[4],
            nouveauPublic: row[5]
        });
    }
    fs.writeFileSync(path.join(dataDir, 'biosim_prices.json'), JSON.stringify(parsedPrices, null, 2));
    console.log(`✅ Extracted ${parsedPrices.length} Biosim prices.`);
} else {
    console.error(`Missing file: ${biosimFile}`);
}

// 2. Parse Ventes & Stock
const pctFile = path.join(__dirname, '../Ventes-Stock PCT 2024-2026 (courbes).xlsx');
if (fs.existsSync(pctFile)) {
    const doc = xlsx.readFile(pctFile);
    
    // Parse Ventes
    if (doc.SheetNames.includes("Ventes")) {
        const data = xlsx.utils.sheet_to_json(doc.Sheets["Ventes"], { header: 1 });
        const headers = data[1]; // row 1 is ["Année", "Mois", "Abevmy 100", ...]
        const parsedVentes = [];
        for (let i = 2; i < data.length; i++) {
            const row = data[i];
            if (!row || !row[0]) continue;
            
            const entry = { annee: row[0], mois: row[1], brands: {} };
            for(let c = 2; c < headers.length; c++) {
                if (headers[c]) {
                   entry.brands[headers[c]] = row[c] || 0;
                }
            }
            parsedVentes.push(entry);
        }
        fs.writeFileSync(path.join(dataDir, 'biosim_ventes.json'), JSON.stringify(parsedVentes, null, 2));
        console.log(`✅ Extracted ${parsedVentes.length} Ventes rows.`);
    }

    // Parse Stock
    if (doc.SheetNames.includes("Stock")) {
        const data = xlsx.utils.sheet_to_json(doc.Sheets["Stock"], { header: 1 });
        const headers = data[1]; 
        const parsedStock = [];
        for (let i = 2; i < data.length; i++) {
            const row = data[i];
            if (!row || !row[0]) continue;
            
            const entry = { annee: row[0], mois: row[1], brands: {} };
            for(let c = 2; c < headers.length; c++) {
                if (headers[c]) {
                   entry.brands[headers[c]] = row[c] || 0;
                }
            }
            parsedStock.push(entry);
        }
        fs.writeFileSync(path.join(dataDir, 'biosim_stock.json'), JSON.stringify(parsedStock, null, 2));
        console.log(`✅ Extracted ${parsedStock.length} Stock rows.`);
    }
} else {
    console.error(`Missing file: ${pctFile}`);
}
