const fs = require('fs');
const path = require('path');

const root = process.cwd();
const contract = JSON.parse(fs.readFileSync(path.join(root, 'config', 'runtime-contract.json'), 'utf8'));
const sourceHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const distHtml = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');

const legacyDeclaration = '<script src="/enhancements_v3.js" defer></script>';
const configuredPath = contract.runtime.enhancements_script.startsWith('/')
  ? contract.runtime.enhancements_script
  : `/${contract.runtime.enhancements_script}`;
const configuredDeclaration = `<script src="${configuredPath}" defer></script>`;
const marker = 'runtime-contract:runtime.enhancements_script';

const errors = [];
const sourceOccurrences = sourceHtml.split(legacyDeclaration).length - 1;
const configuredOccurrences = distHtml.split(configuredDeclaration).length - 1;
const markerOccurrences = distHtml.split(marker).length - 1;

if (sourceOccurrences !== 1) {
  errors.push(`Source index.html must contain exactly one historical enhancements script declaration, found ${sourceOccurrences}.`);
}

if (configuredOccurrences !== 1) {
  errors.push(`Built index.html must contain exactly one configured enhancements script declaration, found ${configuredOccurrences}.`);
}

if (markerOccurrences !== 1) {
  errors.push(`Built index.html must contain exactly one enhancements script trace marker, found ${markerOccurrences}.`);
}

if (!fs.existsSync(path.join(root, 'dist', configuredPath.replace(/^\//, '')))) {
  errors.push(`Configured enhancements script is missing from dist: ${configuredPath}`);
}

if (errors.length) {
  console.error('Enhancements script contract consumption verification failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Enhancements script contract consumption verified: ${configuredPath}`);
