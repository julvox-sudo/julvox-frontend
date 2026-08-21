const fs = require('fs');
const path = require('path');
const feedback = require('./julvox-p5-explicit-decision-feedback-01');

const indexPath = path.join(process.cwd(), 'dist', 'index.html');
if (!fs.existsSync(indexPath)) {
  throw new Error('JULVOX-P5-EXPLICIT-DECISION-FEEDBACK-01 integration failed: dist/index.html is missing');
}

const integrated = feedback.verify(
  feedback.integrate(fs.readFileSync(indexPath, 'utf8')),
);
fs.writeFileSync(indexPath, integrated, 'utf8');

console.log('JULVOX-P5-EXPLICIT-DECISION-FEEDBACK-01 integrated into dist/index.html.');
