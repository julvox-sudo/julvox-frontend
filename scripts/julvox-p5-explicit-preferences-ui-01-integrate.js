const fs = require('fs');
const path = require('path');
const preferences = require('./julvox-p5-explicit-preferences-ui-01');

const indexPath = path.join(process.cwd(), 'dist', 'index.html');
if (!fs.existsSync(indexPath)) {
  throw new Error('JULVOX-P5-EXPLICIT-PREFERENCES-UI-01 integration failed: dist/index.html is missing');
}

const integrated = preferences.verify(
  preferences.integrate(fs.readFileSync(indexPath, 'utf8')),
);
fs.writeFileSync(indexPath, integrated, 'utf8');

console.log('JULVOX-P5-EXPLICIT-PREFERENCES-UI-01 integrated into dist/index.html.');
