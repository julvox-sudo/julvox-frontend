const fs = require('fs');
const path = require('path');
const conversational = require('./julvox-assistant-conversational-intelligence-01.js');

const root = process.cwd();
const indexPath = path.join(root, 'dist', 'index.html');
if (!fs.existsSync(indexPath)) {
  throw new Error('JULVOX-ASSISTANT-CONVERSATIONAL-INTELLIGENCE-01 integration failed: dist/index.html is missing');
}

const integrated = conversational.verify(
  conversational.integrate(fs.readFileSync(indexPath, 'utf8')),
);
fs.writeFileSync(indexPath, integrated, 'utf8');

console.log('JULVOX-ASSISTANT-CONVERSATIONAL-INTELLIGENCE-01 integrated into dist/index.html.');
