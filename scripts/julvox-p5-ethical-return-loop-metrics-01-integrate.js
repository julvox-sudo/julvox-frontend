const fs = require('fs');
const path = require('path');
const metrics = require('./julvox-p5-ethical-return-loop-metrics-01');

const indexPath = path.join(process.cwd(), 'dist', 'index.html');
if (!fs.existsSync(indexPath)) {
  throw new Error('JULVOX-P5-ETHICAL-RETURN-LOOP-METRICS-01 integration failed: dist/index.html is missing');
}

const integrated = metrics.verify(
  metrics.integrate(fs.readFileSync(indexPath, 'utf8')),
);
fs.writeFileSync(indexPath, integrated, 'utf8');

console.log('JULVOX-P5-ETHICAL-RETURN-LOOP-METRICS-01 integrated into dist/index.html.');
