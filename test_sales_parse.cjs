const xlsx = require('xlsx');
const fs = require('fs');
const files = ['Ventes détaillées 2026-01 Biotech.xlsx', 'Ventes détaillées 2026-02 Biotech.xlsx'];

files.forEach(file => {
    if (fs.existsSync(file)) {
        console.log("Reading file:", file);
        const wl = xlsx.readFile(file);
        const sheetName = wl.SheetNames[0];
        // Read without header to get column arrays directly
        const sheetData = xlsx.utils.sheet_to_json(wl.Sheets[sheetName], { header: 1 });
        
        console.log("Headers:");
        console.log({
            D: sheetData[0][3],
            F: sheetData[0][5],
            H: sheetData[0][7],
            K: sheetData[0][10],
        });
        
        console.log("Row 1:");
        console.log({
            D: sheetData[1][3],
            F: sheetData[1][5],
            H: sheetData[1][7],
            K: sheetData[1][10],
        });
        console.log("-----");
    }
});
