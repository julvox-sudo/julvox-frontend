const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const home = require('../../scripts/product-realign-01b-home.js');
const brand = require('../../scripts/product-realign-01b-brand-integrate.js');

const root = path.resolve(__dirname, '../..');

const fixture = `<!doctype html><html lang="fr"><head><meta name="theme-color" content="#FF5C2B"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><link rel="apple-touch-icon" href="legacy"><link rel="icon" href="legacy"></head><body>
<!-- TOP NAV --><nav>DealScan</nav><div>Les meilleures offres</div><!-- MODAL --><div id="modalOverlay"></div><!-- BOTTOM NAV --><nav>Top deals · NovaDeal™ · Promos</nav><!-- AUTH MODAL -->
<div id="onboardingOverlay">Bienvenue sur DealScan — Score NovaDeal™</div><div id="aiChatPage">Bonjour ! Je suis l'assistant DealScan.</div><script>function checkOnboarding(){document.getElementById('onboardingOverlay').style.display=''};document.addEventListener('DOMContentLoaded',checkOnboarding)</script></body></html>`;

test('le premier pixel est Julvox et opaque avant le legacy', () => {
  const output = home.applyHomeExperience(fixture);
  const startup = home.extractStartupSurface(output);

  assert.ok(
    output.indexOf('id="julvoxBoot"') <
      output.indexOf('id="julvoxDecisionHome"'),
  );

  assert.match(output, /<body[^>]*data-julvox-booting="true"/);
  assert.match(startup, /Julvox/);
  assert.match(startup, /Compagnon de décision avant achat/);

  for (const term of [
    /DealScan/i,
    /NovaDeal/i,
    /Top deals/i,
    /promo/i,
    /score/i,
    /robot/i,
    /mascotte/i,
  ]) {
    assert.doesNotMatch(startup, term);
  }
});

test('le onboarding DealScan reste neutralisé après ses déclencheurs historiques', () => {
  const output = home.applyHomeExperience(fixture);

  assert.match(
    output,
    /#onboardingOverlay,#onboardOverlay\{display:none!important/,
  );

  assert.match(
    output,
    /style\.setProperty\('display', 'none', 'important'\)/,
  );

  assert.match(
    output,
    /window\.addEventListener\('pageshow', suppressLegacyStartup\)/,
  );
});

test('les métadonnées et le manifeste de lancement sont Julvox', () => {
  const output = home.applyHomeExperience(fixture);

  assert.match(output, /theme-color" content="#FCF9F4/);
  assert.match(
    output,
    /apple-mobile-web-app-status-bar-style" content="default/,
  );
  assert.match(
    output,
    /apple-touch-icon" href="\/icons\/icon-192\.png/,
  );

  const manifest = home.applyPwaStartupManifest({
    background_color: '#0a0a0f',
    theme_color: '#FF5C2B',
    shortcuts: [{ name: 'Top Deals' }],
  });

  assert.equal(manifest.background_color, '#FCF9F4');
  assert.equal(manifest.theme_color, '#0B1D34');
  assert.deepEqual(manifest.shortcuts, []);
});

test('le correctif est idempotent et conserve la navigation validée', () => {
  const once = home.applyHomeExperience(fixture);

  assert.equal(home.applyHomeExperience(once), once);

  for (const label of [
    'Accueil',
    'Conversations',
    'Mes décisions',
    'Paramètres',
    'Aide',
  ]) {
    assert.match(once, new RegExp(`>${label}`));
  }
});

test('les icônes et favicons officiels correspondent au pack A2.2', () => {
  const files = [
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/julvox-favicon-16-transparent.png',
    'icons/julvox-favicon-32-transparent.png',
  ];

  for (const relativePath of files) {
    const bytes = fs.readFileSync(
      path.join(root, ...relativePath.split('/')),
    );

    assert.equal(
      bytes.subarray(0, 8).toString('hex'),
      '89504e470d0a1a0a',
      relativePath,
    );

    assert.equal(
      crypto.createHash('sha256').update(bytes).digest('hex'),
      brand.BRAND_FILES[relativePath],
      relativePath,
    );
  }
});
