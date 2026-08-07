const fs = require('fs');
const path = require('path');
const bridge = require('./julvox-assistant-scanner-conversation-bridge-01.js');

const indexPath = path.join(process.cwd(), 'dist', 'index.html');
if (!fs.existsSync(indexPath)) throw new Error('Scanner conversation bridge: dist/index.html is missing');
const integrated = bridge.integrate(fs.readFileSync(indexPath, 'utf8'));
fs.writeFileSync(indexPath, integrated, 'utf8');
console.log('JULVOX-ASSISTANT-CONVERSATIONAL-INTELLIGENCE-01 scanner bridge integrated into dist/index.html.');
