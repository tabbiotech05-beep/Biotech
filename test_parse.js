const xlsx = require('xlsx');
const wl = xlsx.readFile('Prix Concurrents Tenshi selon circulaires PCT.xlsx');
const sheet1 = xlsx.utils.sheet_to_json(wl.Sheets['Prix Des Concurrents'], {range: 1});
const sheet2 = xlsx.utils.sheet_to_json(wl.Sheets['Prix Produits Tenshi ']);
console.log("Sheet 1:\n", sheet1.slice(0, 2));
console.log("Sheet 2:\n", sheet2.slice(0, 2));
