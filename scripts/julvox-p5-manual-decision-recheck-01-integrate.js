const fs = require('fs');
const path = require('path');
const recheck = require('./julvox-p5-manual-decision-recheck-01');

const indexPath = path.join(process.cwd(), 'dist', 'index.html');
if (!fs.existsSync(indexPath)) {
  throw new Error('JULVOX-P5-MANUAL-DECISION-RECHECK-01 integration failed: dist/index.html is missing');
}

const integrated = recheck.verify(
  recheck.integrate(fs.readFileSync(indexPath, 'utf8')),
);
fs.writeFileSync(indexPath, integrated, 'utf8');

console.log('JULVOX-P5-MANUAL-DECISION-RECHECK-01 integrated into dist/index.html.');
