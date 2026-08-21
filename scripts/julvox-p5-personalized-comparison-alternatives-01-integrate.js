const fs = require('fs');
const path = require('path');
const comparison = require('./julvox-p5-personalized-comparison-alternatives-01');

const indexPath = path.join(process.cwd(), 'dist', 'index.html');
if (!fs.existsSync(indexPath)) {
  throw new Error('JULVOX-P5-PERSONALIZED-COMPARISON-ALTERNATIVES-01 integration failed: dist/index.html is missing');
}

const integrated = comparison.verify(
  comparison.integrate(fs.readFileSync(indexPath, 'utf8')),
);
fs.writeFileSync(indexPath, integrated, 'utf8');

console.log('JULVOX-P5-PERSONALIZED-COMPARISON-ALTERNATIVES-01 integrated into dist/index.html.');
