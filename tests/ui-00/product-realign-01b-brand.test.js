const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const brand = require('../../scripts/product-realign-01b-brand-integrate.js');

const root = path.resolve(__dirname, '../..');

function fixtureHtml() {
  return `<!doctype html><html data-theme="light"><head><link rel="icon" href="/legacy.png"><link rel="apple-touch-icon" href="/legacy.png"></head><body data-julvox-booting="true">
<svg class="pr01b-symbol-defs"><defs><symbol id="pr01b-glyph-a22"><path d="M0 0Z"/></symbol></defs></svg>
<div id="julvoxBoot"><div class="pr01b-boot-lockup"><svg class="pr01b-boot-glyph"><use href="#pr01b-glyph-a22"/></svg><strong class="pr01b-boot-name">Julvox</strong><span class="pr01b-boot-tagline">Compagnon de décision avant achat</span></div></div><script>void 0;</script>
<div class="pr01b-mobile-brand"><svg><use href="#pr01b-glyph-a22"/></svg><span>Julvox</span></div>
<a class="pr01b-brand" href="#julvoxDecisionHome" aria-label="Julvox, accueil"><svg><use href="#pr01b-glyph-a22"/></svg><span class="pr01b-wordmark">Julvox</span></a>
<div id="julvoxDecisionHome"></div></body></html>`;
}

function fixtureSw() {
  return `const CACHE_VERSION = 'v17';\nconst STATIC_ASSETS = ['/manifest.json'];\n`;
}

function tempRoot() {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'julvox-brand-'));
  for (const relativePath of Object.keys(brand.BRAND_FILES)) {
    const from = path.join(root, relativePath);
    const to = path.join(target, relativePath);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
  fs.mkdirSync(path.join(target, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(target, 'dist', 'index.html'), fixtureHtml());
  fs.writeFileSync(path.join(target, 'dist', 'manifest.json'), JSON.stringify({ icons: [], shortcuts: [{ name: 'Top Deals' }], screenshots: [{ label: 'DealScan' }] }));
  fs.writeFileSync(path.join(target, 'dist', 'sw.js'), fixtureSw());
  return target;
}

test('authentifie les masters officiels A2.2 sans dépendance de rendu à Sora', () => {
  brand.authenticateSource(root);
  for (const relativePath of Object.keys(brand.BRAND_FILES).filter(name => name.endsWith('.svg'))) {
    const svg = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.doesNotMatch(svg, /<text\b/i);
    assert.doesNotMatch(svg, /font-family\s*:/i);
    assert.doesNotMatch(svg, /<script\b|<image\b/i);
  }
});

test('remplace le glyphe provisoire par les fichiers officiels et reste idempotent', () => {
  const target = tempRoot();
  try {
    brand.integrate(target);
    const first = [
      fs.readFileSync(path.join(target, 'dist', 'index.html')),
      fs.readFileSync(path.join(target, 'dist', 'manifest.json')),
      fs.readFileSync(path.join(target, 'dist', 'sw.js')),
    ].map(data => crypto.createHash('sha256').update(data).digest('hex'));
    brand.integrate(target);
    const second = [
      fs.readFileSync(path.join(target, 'dist', 'index.html')),
      fs.readFileSync(path.join(target, 'dist', 'manifest.json')),
      fs.readFileSync(path.join(target, 'dist', 'sw.js')),
    ].map(data => crypto.createHash('sha256').update(data).digest('hex'));
    assert.deepEqual(second, first);
    const html = fs.readFileSync(path.join(target, 'dist', 'index.html'), 'utf8');
    assert.match(html, /julvox-logo-horizontal\.svg/);
    assert.match(html, /julvox-logo-horizontal-negative\.svg/);
    assert.doesNotMatch(html, /pr01b-glyph-a22|pr01b-symbol-defs|Assistant DealScan/i);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('référence les favicons, icônes PWA et actifs du service worker officiels', () => {
  const target = tempRoot();
  try {
    brand.integrate(target);
    const manifest = JSON.parse(fs.readFileSync(path.join(target, 'dist', 'manifest.json'), 'utf8'));
    assert.equal(manifest.icons.find(icon => icon.src === '/icons/icon-192.png').sizes, '192x192');
    assert.equal(manifest.icons.find(icon => icon.src === '/icons/icon-512.png').sizes, '512x512');
    assert.deepEqual(manifest.shortcuts, []);
    assert.deepEqual(manifest.screenshots, []);
    const sw = fs.readFileSync(path.join(target, 'dist', 'sw.js'), 'utf8');
    assert.match(sw, /v17-brand-a22/);
    for (const file of brand.PUBLIC_FILES) assert.match(sw, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('tests adversariaux: rejette texte, editable, SHA altéré, mauvais manifest et DealScan initial', () => {
  assert.throws(() => brand.validateOfficialSvg('<svg viewBox="0 0 1 1"><text>Julvox</text></svg>', 'sabotage.svg'), /<text>/);
  assert.throws(() => brand.verifyBrandedHtml(fixtureHtml().replace('</head>', '<meta data-brand-integration="PRODUCT-REALIGN-01B-BRAND-INTEGRATION-07"><link href="/brand/julvox-logo-horizontal.svg"><link href="/brand/julvox-logo-horizontal-negative.svg"><link href="/icons/julvox-favicon-16-transparent.png"><link href="/icons/julvox-favicon-32-transparent.png"></head>')), /provisional|editable/i);
  assert.throws(() => brand.verifyManifest({ icons: [{ src: '/icons/icon-192.png', sizes: '512x512', type: 'image/png', purpose: 'any' }], shortcuts: [], screenshots: [] }), /invalid official icon/);
  const target = tempRoot();
  try {
    fs.appendFileSync(path.join(target, 'brand', 'julvox-glyph-small.svg'), 'sabotage');
    assert.throws(() => brand.authenticateSource(target), /hash mismatch/);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
  const branded = brand.applyBrandToHtml(fixtureHtml());
  assert.throws(() => brand.verifyBrandedHtml(branded.replace('Compagnon de décision avant achat', 'Assistant DealScan')), /DealScan/);
});

test('aucune version editable n’est présente parmi les actifs publics officiels', () => {
  assert.equal(brand.PUBLIC_FILES.some(file => /editable|sora/i.test(file)), false);
});
