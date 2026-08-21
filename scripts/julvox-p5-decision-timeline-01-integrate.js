const fs = require('fs');
const path = require('path');
const decisionTimeline = require('./julvox-p5-decision-timeline-01');

const root = process.cwd();
const indexPath = path.join(root, 'dist', 'index.html');
if (!fs.existsSync(indexPath)) {
  throw new Error('JULVOX-P5-DECISION-TIMELINE-01 integration failed: dist/index.html is missing');
}

const integrated = decisionTimeline.verify(
  decisionTimeline.integrate(fs.readFileSync(indexPath, 'utf8')),
);
fs.writeFileSync(indexPath, integrated, 'utf8');

console.log('JULVOX-P5-DECISION-TIMELINE-01 integrated into dist/index.html.');
