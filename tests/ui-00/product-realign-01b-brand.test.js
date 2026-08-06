const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const brand = require('../../scripts/product-realign-01b-brand-integrate.js');

const root = path.resolve(__dirname, '../..');
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'config', 'public-artifact-manifest.json'), 'utf8'),
);
const packageDocument = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
);

const CERTIFIED_HORIZONTAL_LOGOS = [
  'brand/julvox-logo-horizontal.svg',
  'brand/julvox-logo-horizontal-negative.svg',
];

const TEMPORARY_RESIDUES = [
  'brand/.integration-probe',
  'brand/.blob-check',
  'brand/.do-not-keep',
  'brand/README.md',
];

function classificationFor(relativePath) {
  return manifest.files.find((entry) => entry.path === relativePath)?.classification;
}

test('certifie uniquement les deux logos horizontaux déjà authentifiés', () => {
  for (const relativePath of CERTIFIED_HORIZONTAL_LOGOS) {
    const expectedHash = brand.BRAND_FILES[relativePath];
    const absolutePath = path.join(root, ...relativePath.split('/'));
    const content = fs.readFileSync(absolutePath);
    assert.equal(brand.sha256(content), expectedHash);
    brand.validateOfficialSvg(content.toString('utf8'), relativePath);
  }
});

test('qualifie sans certifier le glyphe, les favicons et les icônes PWA restaurés', () => {
  assert.equal(classificationFor('brand/julvox-logo-horizontal.svg'), 'official-brand-logo');
  assert.equal(classificationFor('brand/julvox-logo-horizontal-negative.svg'), 'official-brand-logo-negative');
  assert.equal(classificationFor('brand/julvox-glyph-small.svg'), 'provisional-brand-glyph');
  assert.equal(classificationFor('icons/icon-192.png'), 'provisional-pwa-icon');
  assert.equal(classificationFor('icons/icon-512.png'), 'provisional-pwa-icon');
  assert.equal(classificationFor('icons/julvox-favicon-16-transparent.png'), 'nonconformant-favicon');
  assert.equal(classificationFor('icons/julvox-favicon-32-transparent.png'), 'nonconformant-favicon');
});

test('maintient l’intégration branding officielle hors de la chaîne de build', () => {
  const buildCommand = packageDocument.scripts.build;
  assert.doesNotMatch(buildCommand, /product-realign-01b-brand-integrate|integrate:product-realign-01b-brand/);
  assert.match(buildCommand, /integrate:product-realign-01b-home/);
});

test('ne conserve aucune sonde ou métadonnée temporaire de l’intégration rejetée', () => {
  for (const relativePath of TEMPORARY_RESIDUES) {
    assert.equal(fs.existsSync(path.join(root, ...relativePath.split('/'))), false, relativePath);
  }
});
