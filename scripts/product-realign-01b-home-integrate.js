const fs = require('fs');
const path = require('path');
const home = require('./product-realign-01b-home.js');
const startupIcons = require('./product-realign-01b-startup-icons.js');

const root = process.cwd();
const indexPath = path.join(root, 'dist', 'index.html');
if (!fs.existsSync(indexPath)) throw new Error('PRODUCT-REALIGN-01B home integration failed: dist/index.html is missing');
fs.writeFileSync(indexPath, home.applyHomeExperience(fs.readFileSync(indexPath, 'utf8')), 'utf8');

const manifestPath = path.join(root, 'dist', 'manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = home.applyPwaStartupManifest(fs.readFileSync(manifestPath, 'utf8'));
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}
startupIcons.write(root);
console.log('PRODUCT-REALIGN-01B locked home and HOTFIX-05 startup integrated into dist.');
