const fs = require('fs');
const path = require('path');

const root = process.cwd();
const contract = JSON.parse(fs.readFileSync(path.join(root, 'config', 'runtime-contract.json'), 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const sourceHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const distHtml = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');

const legacyTitle = '<title>DealScan v17 — Meilleurs Deals & Promos vérifiés par NovaDeal™ | julvox.com</title>';
const expectedTitle = `<title>${contract.application.name} — ${contract.application.tagline}</title>`;
const marker = 'runtime-contract:application.name+application.tagline';

const errors = [];
const sourceOccurrences = sourceHtml.split(legacyTitle).length - 1;
const expectedOccurrences = distHtml.split(expectedTitle).length - 1;
const markerOccurrences = distHtml.split(marker).length - 1;

if (sourceOccurrences !== 1) {
  errors.push(`Source index.html must contain exactly one historical application title, found ${sourceOccurrences}.`);
}

if (expectedOccurrences !== 1) {
  errors.push(`Built index.html must contain exactly one contract-derived application title, found ${expectedOccurrences}.`);
}

if (markerOccurrences !== 1) {
  errors.push(`Application identity trace marker must appear exactly once, found ${markerOccurrences}.`);
}

if (packageJson.version !== contract.application.frontend_version) {
  errors.push(`package.json version (${packageJson.version}) does not match runtime contract (${contract.application.frontend_version}).`);
}

if (errors.length) {
  console.error('Application identity contract consumption verification failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Application identity contract consumption verified: ${contract.application.name} — ${contract.application.tagline} (${contract.application.frontend_version}).`);
