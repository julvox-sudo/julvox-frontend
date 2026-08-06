const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const home = require('../../scripts/product-realign-01b-home.js');
const icons = require('../../scripts/product-realign-01b-startup-icons.js');

const fixture = `<!doctype html><html lang="fr"><head><meta name="theme-color" content="#FF5C2B"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><link rel="apple-touch-icon" href="legacy"><link rel="icon" href="legacy"></head><body>
<!-- TOP NAV --><nav>DealScan</nav><div>Les meilleures offres</div><!-- MODAL --><div id="modalOverlay"></div><!-- BOTTOM NAV --><nav>Top deals · NovaDeal™ · Promos</nav><!-- AUTH MODAL -->
<div id="onboardingOverlay">Bienvenue sur DealScan — Score NovaDeal™</div><div id="aiChatPage">Bonjour ! Je suis l'assistant DealScan.</div><script>function checkOnboarding(){document.getElementById('onboardingOverlay').style.display=''};document.addEventListener('DOMContentLoaded',checkOnboarding)</script></body></html>`;

test('le premier pixel est Julvox et opaque avant le legacy', () => {
  const output = home.applyHomeExperience(fixture), startup = home.extractStartupSurface(output);
  assert.ok(output.indexOf('id="julvoxBoot"') < output.indexOf('id="julvoxDecisionHome"'));
  assert.match(output, /<body[^>]*data-julvox-booting="true"/);
  assert.match(startup, /Julvox/); assert.match(startup, /Compagnon de décision avant achat/);
  for (const term of [/DealScan/i, /NovaDeal/i, /Top deals/i, /promo/i, /score/i, /robot/i, /mascotte/i]) assert.doesNotMatch(startup, term);
});

test('le onboarding DealScan reste neutralisé après ses déclencheurs historiques', () => {
  const output = home.applyHomeExperience(fixture);
  assert.match(output, /#onboardingOverlay,#onboardOverlay\{display:none!important/);
  assert.match(output, /style\.setProperty\('display', 'none', 'important'\)/);
  assert.match(output, /window\.addEventListener\('pageshow', suppressLegacyStartup\)/);
});

test('les métadonnées et le manifeste de lancement sont Julvox', () => {
  const output = home.applyHomeExperience(fixture);
  assert.match(output, /theme-color" content="#FCF9F4/); assert.match(output, /apple-mobile-web-app-status-bar-style" content="default/); assert.match(output, /apple-touch-icon" href="\/icons\/icon-192\.png/);
  const manifest = home.applyPwaStartupManifest({ background_color:'#0a0a0f', theme_color:'#FF5C2B', shortcuts:[{name:'Top Deals'}] });
  assert.equal(manifest.background_color, '#FCF9F4'); assert.equal(manifest.theme_color, '#0B1D34'); assert.deepEqual(manifest.shortcuts, []);
});

test('le correctif est idempotent et conserve la navigation validée', () => {
  const once = home.applyHomeExperience(fixture); assert.equal(home.applyHomeExperience(once), once);
  for (const label of ['Accueil', 'Conversations', 'Mes décisions', 'Paramètres', 'Aide']) assert.match(once, new RegExp(`>${label}`));
});

test('les icônes PWA sont générées depuis les tracés A2.2 exacts', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'julvox-hotfix-05-'));
  try { icons.write(root); for (const [name, expected] of Object.entries(icons.HASHES)) { const bytes = fs.readFileSync(path.join(root, 'dist', 'icons', name)); assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a'); assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), expected); } }
  finally { fs.rmSync(root, { recursive:true, force:true }); }
});
