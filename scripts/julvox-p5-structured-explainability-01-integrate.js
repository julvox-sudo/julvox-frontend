const fs = require('fs');
const path = require('path');
const structuredExplainability = require('./julvox-p5-structured-explainability-01');

const root = process.cwd();
const indexPath = path.join(root, 'dist', 'index.html');
if (!fs.existsSync(indexPath)) {
  throw new Error('JULVOX-P5-STRUCTURED-EXPLAINABILITY-01 integration failed: dist/index.html is missing');
}

const integrated = structuredExplainability.verify(
  structuredExplainability.integrate(fs.readFileSync(indexPath, 'utf8')),
);
fs.writeFileSync(indexPath, integrated, 'utf8');

console.log('JULVOX-P5-STRUCTURED-EXPLAINABILITY-01 integrated into dist/index.html.');
