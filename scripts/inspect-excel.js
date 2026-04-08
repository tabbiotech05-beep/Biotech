import xlsx from 'xlsx';
import path from 'path';

function inspect(file) {
    console.log(`\n=== Inspecting: ${file} ===`);
    try {
        const doc = xlsx.readFile(file);
        doc.SheetNames.forEach(sheetName => {
            console.log(`\nSheet: ${sheetName}`);
            const data = xlsx.utils.sheet_to_json(doc.Sheets[sheetName], { header: 1 });
            console.log("Rows:");
            data.slice(0, 5).forEach(row => console.log(JSON.stringify(row)));
        });
    } catch(err) {
        console.error("Error reading file:", err.message);
    }
}

inspect('./Nouveaux prix Biosim.xlsx');
inspect('./Ventes-Stock PCT 2024-2026 (courbes).xlsx');
