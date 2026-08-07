const fs = require('fs');
const path = require('path');
const { integrate, verify } = require('./julvox-frontend-reconciliation-01');

const file = path.join(process.cwd(), 'dist', 'index.html');
if (!fs.existsSync(file)) throw new Error('dist/index.html is missing');
const output = integrate(fs.readFileSync(file, 'utf8'));
verify(output);
fs.writeFileSync(file, output, 'utf8');
console.log('JULVOX-FRONTEND-RECONCILIATION-01 integrated.');
