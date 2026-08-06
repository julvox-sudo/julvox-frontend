const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  HOTFIX_MARKER,
  BOOTING_ATTRIBUTE,
  STARTUP_MANIFEST_MARKER,
  STARTUP_ICON_SHA256,
  HOTFIX_HTML,
  applyHomeExperience,
  applyPwaStartupManifest,
  extractStartupSurface,
  writeStartupAssets,
} = require('../../scripts/product-realign-01b-home.js');

const fixture = `<!doctype html><html lang="fr" data-theme="dark"><head>
<meta name="theme-color" content="#FF5C2B"/>
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
<link rel="apple-touch-icon" href="data:image/svg+xml,legacy"/>
<link rel="icon" href="data:image/svg+xml,legacy"/>
</head><body>
<!-- TOP NAV -->
<nav class="topnav">DealScan</nav>
<div class="hero">Les meilleures offres du moment</div>
<!-- MODAL -->
<div class="modal-overlay" id="modalOverlay"></div>
<!-- BOTTOM NAV -->
<nav class="bottom-nav">Top deals · NovaDeal™ · Promos</nav>
<!-- AUTH MODAL -->
<div id="onboardingOverlay" style="display:none">Bienvenue sur DealScan — Score NovaDeal™</div>
<div class="page" id="aiChatPage">Bonjour ! Je suis l'assistant DealScan.</div>
<script>
function checkOnboarding(){document.getElementById('onboardingOverlay').style.display='';}
document.addEventListener('DOMContentLoaded',checkOnboarding);
</script>
</body></html>`;

test('place un écran Julvox opaque avant tout contenu legacy', () => {
  const output = applyHomeExperience(fixture);
  const bodyStart = output.indexOf('<body');
  const boot = output.indexOf('id="julvoxBoot"');
  const home = output.indexOf('id="julvoxDecisionHome"');
  const legacy = output.indexOf('id="productRealign01BLegacyHome"');
  assert.ok(bodyStart >= 0 && boot > bodyStart && boot < home && home < legacy);
  assert.match(output.slice(bodyStart, output.indexOf('>', bodyStart) + 1), new RegExp(BOOTING_ATTRIBUTE));
  assert.equal((output.match(/product-realign-01b-home-hotfix-05:applied-v1/g) || []).length, 1);
});

test('le premier rendu autorisé ne contient aucun vocabulaire DealScan', () => {
  const startup = extractStartupSurface(applyHomeExperience(fixture));
  assert.match(startup, /Julvox/);
  assert.match(startup, /Compagnon de décision avant achat/);
  for (const forbidden of [/DealScan/i, /NovaDeal/i, /Top deals/i, /promo/i, /vente flash/i, /score/i, /robot/i, /mascotte/i]) {
    assert.doesNotMatch(startup, forbidden);
  }
});

test('neutralise le onboarding legacy avant et après DOMContentLoaded', () => {
  const output = applyHomeExperience(fixture);
  assert.match(output, /#onboardingOverlay,#onboardOverlay\{display:none!important/);
  assert.match(output, /legacyStartupIds = \['onboardingOverlay', 'onboardOverlay'\]/);
  assert.match(output, /style\.setProperty\('display', 'none', 'important'\)/);
  assert.match(output, /window\.addEventListener\('pageshow', suppressLegacyStartup\)/);
});

test('aligne les métadonnées de démarrage mobile sans modifier la navigation', () => {
  const output = applyHomeExperience(fixture);
  assert.match(output, /<meta name="theme-color" content="#FCF9F4"\/>/);
  assert.match(output, /<meta name="apple-mobile-web-app-status-bar-style" content="default"\/>/);
  assert.match(output, /<link rel="apple-touch-icon" href="\/icons\/icon-192\.png"\/>/);
  assert.match(output, /<link rel="icon" type="image\/png" sizes="192x192" href="\/icons\/icon-192\.png"\/>/);
  assert.match(output, />Accueil</);
  assert.match(output, />Conversations</);
  assert.match(output, />Mes décisions</);
});

test('neutralise les raccourcis PWA DealScan et fixe les couleurs de splash', () => {
  const manifest = applyPwaStartupManifest({
    name: 'Julvox',
    background_color: '#0a0a0f',
    theme_color: '#FF5C2B',
    icons: [{ src: '/icons/icon-192.png' }],
    shortcuts: [{ name: 'Top Deals' }, { name: 'Ventes Flash' }],
    screenshots: [{ src: '/screenshots/screenshot-mobile.png', label: 'Julvox' }],
  });
  assert.equal(manifest.background_color, '#FCF9F4');
  assert.equal(manifest.theme_color, '#0B1D34');
  assert.deepEqual(manifest.shortcuts, []);
  assert.equal(manifest._startup_experience, STARTUP_MANIFEST_MARKER);
  assert.equal(manifest.icons[0].src, '/icons/icon-192.png');
  assert.equal(manifest.screenshots[0].src, '/screenshots/screenshot-mobile.png');
});

test('reste strictement idempotent', () => {
  const once = applyHomeExperience(fixture);
  const twice = applyHomeExperience(once);
  assert.equal(twice, once);
  assert.ok(once.includes(HOTFIX_MARKER));
  assert.ok(HOTFIX_HTML.includes('id="julvoxBoot"'));
});

test('produit les icônes Julvox de démarrage à la place des icônes DealScan', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'julvox-hotfix-05-'));
  try {
    writeStartupAssets(root);
    for (const [filename, expectedSha] of Object.entries(STARTUP_ICON_SHA256)) {
      const file = path.join(root, 'dist', 'icons', filename);
      const bytes = fs.readFileSync(file);
      assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), expectedSha);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
