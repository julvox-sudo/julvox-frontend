const fs = require('fs');
const path = require('path');
const smartScan = require('./product-smart-scan-01.js');

const root = process.cwd();
const indexPath = path.join(root, 'dist', 'index.html');
if (!fs.existsSync(indexPath)) {
  throw new Error('JULVOX-PRODUCT-VISION-SMART-SCAN-01 integration failed: dist/index.html is missing');
}

const integrated = smartScan.applySmartScanExperience(fs.readFileSync(indexPath, 'utf8'));
smartScan.verifySmartScanExperience(integrated);
fs.writeFileSync(indexPath, integrated, 'utf8');

console.log('JULVOX-PRODUCT-VISION-SMART-SCAN-01 unified Smart Scan experience integrated into dist.');
