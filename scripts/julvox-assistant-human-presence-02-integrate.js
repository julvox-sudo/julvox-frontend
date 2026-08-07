const fs = require('fs');
const path = require('path');
const assistant = require('./julvox-assistant-human-presence-02.js');

const root = process.cwd();
const indexPath = path.join(root, 'dist', 'index.html');
if (!fs.existsSync(indexPath)) {
  throw new Error('JULVOX-ASSISTANT-HUMAN-PRESENCE-02 integration failed: dist/index.html is missing');
}

const integrated = assistant.applyAssistantHumanPresence(
  fs.readFileSync(indexPath, 'utf8'),
);
fs.writeFileSync(indexPath, integrated, 'utf8');

console.log('JULVOX-ASSISTANT-HUMAN-PRESENCE-02 Lot A integrated into dist/index.html.');
