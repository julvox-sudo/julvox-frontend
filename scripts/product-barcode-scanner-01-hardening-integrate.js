const fs = require('fs');
const path = require('path');
const hardening = require('./product-barcode-scanner-01-hardening.js');

const indexPath = path.join(process.cwd(), 'dist', 'index.html');
if (!fs.existsSync(indexPath)) {
  throw new Error('JULVOX-PRODUCT-BARCODE-SCANNER-01 hardening failed: dist/index.html is missing');
}

const integrated = hardening.applyScannerHardening(fs.readFileSync(indexPath, 'utf8'));
hardening.verifyScannerHardening(integrated);
fs.writeFileSync(indexPath, integrated, 'utf8');

console.log('JULVOX-PRODUCT-BARCODE-SCANNER-01 validation and Android-back hardening integrated.');
