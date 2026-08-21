const fs = require('fs');
const path = require('path');
const watch = require('./julvox-p5-intelligent-decision-watch-01');

const indexPath = path.join(process.cwd(), 'dist', 'index.html');
if (!fs.existsSync(indexPath)) {
  throw new Error('JULVOX-P5-INTELLIGENT-DECISION-WATCH-01 integration failed: dist/index.html is missing');
}

const integrated = watch.verify(
  watch.integrate(fs.readFileSync(indexPath, 'utf8')),
);
fs.writeFileSync(indexPath, integrated, 'utf8');

console.log('JULVOX-P5-INTELLIGENT-DECISION-WATCH-01 integrated into dist/index.html.');
