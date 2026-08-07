const fs = require('fs');
const path = require('path');

const PUBLIC_IDENTITY_FILES = Object.freeze([
  'index.html',
  'manifest.json',
  'enhancements_v3.js',
  'robots.txt',
]);
const BACKEND_TECHNICAL_REFERENCE = 'julvox-dealscan-backend-production.up.railway.app';
const TECHNICAL_PLACEHOLDER = '__JULVOX_BACKEND_TECHNICAL_REFERENCE__';

function fail(message) {
  throw new Error(`PRODUCT-REALIGN-01B legacy identity cleanup failed: ${message}`);
}

function protectTechnicalReferences(text) {
  return text.split(BACKEND_TECHNICAL_REFERENCE).join(TECHNICAL_PLACEHOLDER);
}

function restoreTechnicalReferences(text) {
  return text.split(TECHNICAL_PLACEHOLDER).join(BACKEND_TECHNICAL_REFERENCE);
}

function cleanupIdentityText(input) {
  let text = protectTechnicalReferences(String(input));
  text = text.replace(/<meta\s+name=["']twitter:site["']\s+content=["']@dealscan_fr["']\s*\/?\s*>\s*/gi, '');
  text = text.replace(/Deal\s*<em>\s*Scan\s*<\/em>/g, 'Julvox');
  text = text.replace(/\bDealScan\b/g, 'Julvox');
  text = text.replace(/\bDEALSCAN\b/g, 'JULVOX');
  text = text.replace(/\bNovaDeal™/g, 'Julvox');
  text = text.replace(/\bNovaDeal\b/g, 'Julvox');
  text = text.replace(/\bNOVADEAL™?/g, 'JULVOX');
  text = text.replace(/\bTop deals\b/gi, 'Sélection Julvox');
  text = text.replace(/@dealscan_fr\b/gi, 'Julvox');
  text = text.replace(/#dealscan\b/gi, '#julvox');
  return restoreTechnicalReferences(text);
}

function findForbiddenIdentity(text) {
  const protectedText = protectTechnicalReferences(String(text));
  const findings = [];
  for (const [label, pattern] of [
    ['DealScan', /\bDealScan\b/],
    ['DEALSCAN', /\bDEALSCAN\b/],
    ['split DealScan logo', /Deal\s*<em>\s*Scan\s*<\/em>/],
    ['NovaDeal', /\bNovaDeal\b/],
    ['NOVADEAL', /\bNOVADEAL\b/],
    ['Top deals', /\bTop deals\b/i],
    ['historical social handle', /@dealscan_fr/i],
    ['historical social hashtag', /#dealscan\b/i],
  ]) {
    if (pattern.test(protectedText)) findings.push(label);
  }
  return findings;
}

function verifyIdentityText(text, relativePath) {
  const findings = findForbiddenIdentity(text);
  if (findings.length) fail(`${relativePath} still contains forbidden public identity: ${findings.join(', ')}`);
  return text;
}

function cleanupPublicIdentity(root) {
  for (const relativePath of PUBLIC_IDENTITY_FILES) {
    const filePath = path.join(root, 'dist', ...relativePath.split('/'));
    if (!fs.existsSync(filePath)) fail(`dist/${relativePath} is missing`);
    const cleaned = cleanupIdentityText(fs.readFileSync(filePath, 'utf8'));
    verifyIdentityText(cleaned, relativePath);
    fs.writeFileSync(filePath, cleaned, 'utf8');
  }
  return true;
}

module.exports = {
  BACKEND_TECHNICAL_REFERENCE,
  PUBLIC_IDENTITY_FILES,
  cleanupIdentityText,
  cleanupPublicIdentity,
  findForbiddenIdentity,
  verifyIdentityText,
};
