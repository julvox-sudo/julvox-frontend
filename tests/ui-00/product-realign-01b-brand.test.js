const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const brand = require('../../scripts/product-realign-01b-brand-integrate.js');

const root = path.resolve(__dirname, '../..');

const manifest = JSON.parse(
  fs.readFileSync(
    path.join(root, 'config', 'public-artifact-manifest.json'),
    'utf8',
  ),
);

const packageDocument = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
);

const homeIntegratorSource = fs.readFileSync(
  path.join(root, 'scripts', 'product-realign-01b-home-integrate.js'),
  'utf8',
);

const TEMPORARY_RESIDUES = [
  'brand/.integration-probe',
  'brand/.blob-check',
  'brand/.do-not-keep',
  'brand/README.md',
];

function classificationFor(relativePath) {
  return manifest.files.find((entry) => entry.path === relativePath)?.classification;
}

test('certifie tous les actifs Julvox A2.2 authentifiés', () => {
  for (const [relativePath, expectedHash] of Object.entries(brand.BRAND_FILES)) {
    const absolutePath = path.join(root, ...relativePath.split('/'));
    assert.equal(fs.existsSync(absolutePath), true, relativePath);

    const content = fs.readFileSync(absolutePath);
    assert.equal(brand.sha256(content), expectedHash, relativePath);

    if (relativePath.endsWith('.svg')) {
      brand.validateOfficialSvg(content.toString('utf8'), relativePath);
    }
  }
});

test('classe les actifs publiés comme officiels', () => {
  assert.equal(
    classificationFor('brand/julvox-logo-horizontal.svg'),
    'official-brand-logo',
  );
  assert.equal(
    classificationFor('brand/julvox-logo-horizontal-negative.svg'),
    'official-brand-logo-negative',
  );
  assert.equal(
    classificationFor('brand/julvox-glyph-small.svg'),
    'official-brand-glyph-small',
  );
  assert.equal(
    classificationFor('icons/icon-192.png'),
    'official-pwa-icon',
  );
  assert.equal(
    classificationFor('icons/icon-512.png'),
    'official-pwa-icon',
  );
  assert.equal(
    classificationFor('icons/julvox-favicon-16-transparent.png'),
    'official-favicon',
  );
  assert.equal(
    classificationFor('icons/julvox-favicon-32-transparent.png'),
    'official-favicon',
  );
});

test('active l’intégration branding officielle après le hotfix', () => {
  const buildCommand = packageDocument.scripts.build;

  assert.match(buildCommand, /integrate:product-realign-01b-home/);
  assert.match(homeIntegratorSource, /product-realign-01b-brand-integrate/);
  assert.match(homeIntegratorSource, /officialBrand\.integrate\(root\)/);
  assert.doesNotMatch(homeIntegratorSource, /startupIcons\.write/);
  assert.match(homeIntegratorSource, /home\.applyHomeExperience/);
  assert.match(homeIntegratorSource, /manifest\.screenshots\s*=\s*\[\]/);
});

test('ne conserve aucune sonde ou métadonnée temporaire', () => {
  for (const relativePath of TEMPORARY_RESIDUES) {
    assert.equal(
      fs.existsSync(path.join(root, ...relativePath.split('/'))),
      false,
      relativePath,
    );
  }
});
