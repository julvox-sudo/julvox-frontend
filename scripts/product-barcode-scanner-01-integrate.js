const fs = require('fs');
const path = require('path');
const scanner = require('./product-barcode-scanner-01.js');

const root = process.cwd();
const indexPath = path.join(root, 'dist', 'index.html');
if (!fs.existsSync(indexPath)) {
  throw new Error('JULVOX-PRODUCT-BARCODE-SCANNER-01 integration failed: dist/index.html is missing');
}

const integrated = scanner.applyScannerExperience(fs.readFileSync(indexPath, 'utf8'));
scanner.verifyScannerExperience(integrated);
fs.writeFileSync(indexPath, integrated, 'utf8');

console.log('JULVOX-PRODUCT-BARCODE-SCANNER-01 local scanner shell integrated into dist.');
