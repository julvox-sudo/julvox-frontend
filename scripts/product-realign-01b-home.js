const fs = require('fs');
const path = require('path');

const MARKER = '<!-- product-realign-01b-home:applied-v1 -->';
const HOTFIX_MARKER = '<!-- product-realign-01b-home-hotfix-05:applied-v1 -->';
const LEGACY_START = '<!-- TOP NAV -->';
const LEGACY_END = '<!-- AUTH MODAL -->';
const STORAGE_KEY = 'julvox:decision-home:conversations:v1';
const BOOTING_ATTRIBUTE = 'data-julvox-booting="true"';
const STARTUP_MANIFEST_MARKER = 'PRODUCT-REALIGN-01B-HOME-HOTFIX-05';
const STARTUP_ICON_SHA256 = Object.freeze({
  'icon-192.png': 'a4ea3082d49d01bfe6fbc9793a594d55e91bbcf826d20ec25277ab7dc6a55527',
  'icon-512.png': 'eff14e2fdfb78eb48e60b6d825bf2b1ff2203d140af69e4af3709c22bf2f3fd4',
});

function readPart(filename) {
  return fs.readFileSync(path.join(__dirname, filename), 'utf8');
}

const HOME_CSS = readPart('product-realign-01b-home.styles.html');
const HOME_HTML = readPart('product-realign-01b-home.fragment.html');
const HOME_RUNTIME = readPart('product-realign-01b-home.runtime.html');

const HOTFIX_CSS = `
<style id="product-realign-01b-home-hotfix-05-styles">
html{background:#FCF9F4!important;}
body[${BOOTING_ATTRIBUTE}]{overflow:hidden!important;background:#FCF9F4!important;}
body[${BOOTING_ATTRIBUTE}] > :not(.pr01b-symbol-defs):not(#julvoxBoot):not(script){visibility:hidden!important;}
#julvoxBoot{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:#FCF9F4;color:#0B1D34;}
#julvoxBoot[hidden]{display:none!important;}
.pr01b-boot-lockup{display:flex;flex-direction:column;align-items:center;gap:15px;text-align:center;}
.pr01b-boot-glyph{width:58px;height:88px;display:block;}
.pr01b-boot-name{font-family:Sora,Inter,Arial,sans-serif;font-size:30px;line-height:1;font-weight:650;letter-spacing:-.8px;}
.pr01b-boot-tagline{font:500 14px/1.45 Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#60707C;}
#onboardingOverlay,#onboardOverlay{display:none!important;visibility:hidden!important;pointer-events:none!important;}
@media (max-width:760px){.pr01b-boot-glyph{width:52px;height:80px}.pr01b-boot-name{font-size:27px}.pr01b-boot-tagline{font-size:13px}}
@media (prefers-reduced-motion:reduce){#julvoxBoot,#julvoxBoot *{animation:none!important;transition:none!important;}}
</style>`;

const HOTFIX_HTML = `
${HOTFIX_MARKER}
<div id="julvoxBoot" role="status" aria-live="polite" aria-label="Julvox, compagnon de décision avant achat">
  <div class="pr01b-boot-lockup">
    <svg class="pr01b-boot-glyph" viewBox="40 24 320 488" aria-hidden="true"><use href="#pr01b-glyph-a22"/></svg>
    <strong class="pr01b-boot-name">Julvox</strong>
    <span class="pr01b-boot-tagline">Compagnon de décision avant achat</span>
  </div>
</div>
<script id="product-realign-01b-home-hotfix-05-runtime">
(function productRealign01BStartupHotfix(){
  'use strict';
  var legacyStartupIds = ['onboardingOverlay', 'onboardOverlay'];
  var bootStartedAt = performance.now();
  var minimumBootDuration = 160;
  function suppressLegacyStartup(){
    legacyStartupIds.forEach(function(id){
      var element = document.getElementById(id);
      if (!element) return;
      element.hidden = true;
      element.setAttribute('aria-hidden', 'true');
      element.classList.remove('show', 'open', 'active');
      element.style.setProperty('display', 'none', 'important');
    });
  }
  function revealJulvox(){
    suppressLegacyStartup();
    var boot = document.getElementById('julvoxBoot');
    if (boot) boot.hidden = true;
    if (document.body) document.body.removeAttribute('data-julvox-booting');
    document.documentElement.setAttribute('data-julvox-startup', 'ready');
  }
  suppressLegacyStartup();
  document.addEventListener('DOMContentLoaded', function(){
    suppressLegacyStartup();
    var remaining = Math.max(0, minimumBootDuration - (performance.now() - bootStartedAt));
    window.setTimeout(function(){
      requestAnimationFrame(function(){ requestAnimationFrame(revealJulvox); });
    }, remaining);
  }, { once:true });
  window.addEventListener('pageshow', suppressLegacyStartup);
})();
</script>`;

function writeStartupAssets(root) {
  const targets = [
    {
      filename: 'icon-192.png',
      parts: ['product-realign-01b-icon-192.b64'],
    },
    {
      filename: 'icon-512.png',
      parts: ['product-realign-01b-icon-512.b64.part1', 'product-realign-01b-icon-512.b64.part2'],
    },
  ];
  const iconsDir = path.join(root, 'dist', 'icons');
  fs.mkdirSync(iconsDir, { recursive: true });
  for (const target of targets) {
    const payload = target.parts.map(readPart).join('').replace(/\s+/g, '');
    const bytes = Buffer.from(payload, 'base64');
    if (bytes.length < 24 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
      fail(`startup asset is not a valid PNG: ${target.filename}`);
    }
    fs.writeFileSync(path.join(iconsDir, target.filename), bytes);
  }
}

function fail(message) {
  throw new Error(`PRODUCT-REALIGN-01B home integration failed: ${message}`);
}

function extractHomeRoot(html) {
  const start = html.indexOf('<div id="julvoxDecisionHome"');
  if (start < 0) return '';
  const end = html.indexOf('<div id="productRealign01BLegacyHome"', start);
  return end < 0 ? html.slice(start) : html.slice(start, end);
}

function extractStartupSurface(html) {
  const start = html.indexOf(HOTFIX_MARKER);
  if (start < 0) return '';
  const end = html.indexOf('<div id="julvoxDecisionHome"', start);
  return end < 0 ? html.slice(start) : html.slice(start, end);
}

function applyHeadStartupMetadata(input) {
  let html = input.replace(
    /<meta\s+name=["']theme-color["']\s+content=["'][^"']*["']\s*\/?\s*>/gi,
    '<meta name="theme-color" content="#FCF9F4"/>',
  );
  html = html.replace(
    /<meta\s+name=["']apple-mobile-web-app-status-bar-style["']\s+content=["'][^"']*["']\s*\/?\s*>/i,
    '<meta name="apple-mobile-web-app-status-bar-style" content="default"/>',
  );
  html = html.replace(
    /<link\s+rel=["']apple-touch-icon["'][^\r\n]*/i,
    '<link rel="apple-touch-icon" href="/icons/icon-192.png"/>',
  );
  html = html.replace(
    /<link\s+rel=["']icon["'][^\r\n]*/i,
    '<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png"/>',
  );

  const required = [
    ['<meta name="theme-color" content="#FCF9F4"/>', /<meta\s+name=["']theme-color["']/i],
    ['<meta name="apple-mobile-web-app-status-bar-style" content="default"/>', /<meta\s+name=["']apple-mobile-web-app-status-bar-style["']/i],
    ['<link rel="apple-touch-icon" href="/icons/icon-192.png"/>', /<link\s+rel=["']apple-touch-icon["']/i],
    ['<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png"/>', /<link\s+rel=["']icon["']/i],
  ];
  const missing = required.filter(([, pattern]) => !pattern.test(html)).map(([markup]) => markup);
  if (missing.length) {
    const headEnd = html.indexOf('</head>');
    if (headEnd < 0) fail('head closing tag is missing for startup metadata');
    html = html.slice(0, headEnd) + missing.join('\n') + '\n' + html.slice(headEnd);
  }
  return html;
}

function applyStartupHotfix(input) {
  let html = input;
  if (!new RegExp(`<body\\b[^>]*${BOOTING_ATTRIBUTE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(html)) {
    const bodyPattern = /<body\b([^>]*)>/i;
    if (!bodyPattern.test(html)) fail('body opening tag is missing');
    html = html.replace(bodyPattern, (match, attributes) => `<body${attributes} ${BOOTING_ATTRIBUTE}>`);
  }

  if (!html.includes('id="product-realign-01b-home-hotfix-05-styles"')) {
    const headEnd = html.indexOf('</head>');
    if (headEnd < 0) fail('head closing tag is missing for startup hotfix');
    html = html.slice(0, headEnd) + HOTFIX_CSS + '\n' + html.slice(headEnd);
  }

  if (!html.includes(HOTFIX_MARKER)) {
    const homeRoot = html.indexOf('<div id="julvoxDecisionHome"');
    if (homeRoot < 0) fail('decision home root is missing for startup hotfix');
    html = html.slice(0, homeRoot) + HOTFIX_HTML + '\n' + html.slice(homeRoot);
  }

  return applyHeadStartupMetadata(html);
}

function applyPwaStartupManifest(document) {
  const manifest = typeof document === 'string' ? JSON.parse(document) : JSON.parse(JSON.stringify(document));
  manifest.background_color = '#FCF9F4';
  manifest.theme_color = '#0B1D34';
  manifest.shortcuts = [];
  manifest._startup_experience = STARTUP_MANIFEST_MARKER;
  return manifest;
}

function verifyHomeExperience(html) {
  if ((html.match(/product-realign-01b-home:applied-v1/g) || []).length !== 1) fail('home marker must appear exactly once');
  if ((html.match(/product-realign-01b-home-hotfix-05:applied-v1/g) || []).length !== 1) fail('startup hotfix marker must appear exactly once');
  if (!html.includes('id="julvoxDecisionHome"')) fail('decision home root is missing');
  if (!html.includes('id="productRealign01BLegacyHome" hidden aria-hidden="true"')) fail('legacy home is not isolated from users and assistive technology');
  if (!html.includes('id="productRealign01BLegacyBottomNav" hidden aria-hidden="true"')) fail('legacy bottom navigation is not isolated');
  if (!html.includes(BOOTING_ATTRIBUTE)) fail('first-pixel boot guard is missing from body');
  if (!html.includes('id="julvoxBoot"')) fail('Julvox startup surface is missing');
  if (!html.includes('#onboardingOverlay,#onboardOverlay{display:none!important')) fail('legacy DealScan onboarding is not suppressed before reveal');
  if (!html.includes('data-julvox-startup')) fail('startup readiness marker is missing');
  if (!html.includes('<meta name="theme-color" content="#FCF9F4"/>')) fail('mobile startup theme color is not Julvox-aligned');
  if (!html.includes('<meta name="apple-mobile-web-app-status-bar-style" content="default"/>')) fail('iPhone startup status bar is not neutralized');
  if (!html.includes('<link rel="apple-touch-icon" href="/icons/icon-192.png"/>')) fail('Apple startup icon does not use the public Julvox icon');
  if (!html.includes('Que veux-tu décider aujourd’hui&nbsp;?')) fail('locked hero question is missing');
  const startup = extractStartupSurface(html);
  for (const pattern of [/DealScan/i, /NovaDeal/i, /Top deals/i, /promo/i, /vente flash/i, /robot/i, /mascotte/i, /score/i]) {
    if (pattern.test(startup)) fail(`forbidden startup content remains: ${pattern}`);
  }
  if (!startup.includes('Compagnon de décision avant achat')) fail('startup tagline is missing');
  const root = extractHomeRoot(html);
  for (const label of ['Accueil', 'Conversations', 'Mes décisions', 'Paramètres', 'Aide']) {
    if (!root.includes(`>${label}<`) && !root.includes(`>${label}</span>`)) fail(`required navigation label is missing: ${label}`);
  }
  if (root.includes('>Conseils<')) fail('Conseils remains in the home navigation');
  const forbiddenVisibleTerms = [/Premium/i, /Julvox Pro/i, /Ventes? Flash/i, /Deal du Jour/i, /Score\s*[=:]/i, /\d+\s*%/i, /promotion/i, /remise/i, /mascotte/i, /robot/i, /font-family:\s*(?:cursive|script)/i];
  for (const pattern of forbiddenVisibleTerms) {
    if (pattern.test(root)) fail(`forbidden home content remains: ${pattern}`);
  }
  if ((root.match(/data-home-conversation="true"/g) || []).length > 2) fail('more than two ongoing conversation cards are rendered');
  if (!root.includes('Aucun changement important confirmé pour le moment.')) fail('truthful influence empty state is missing');
  if (!root.includes('Des univers, pas un catalogue')) fail('inspiration is not explicitly framed as non-catalogue');
  if (!root.includes('data-product-realign="01B"')) fail('01B scope marker is missing');
  if (!html.includes('id="pr01b-glyph-a22"')) fail('A2.2 glyph symbol is missing');
  if (!html.includes('#0B1D34') || !html.includes('#0EA7A1') || !html.includes('#C79A5E')) fail('official A2.2 palette is incomplete');
  if (!html.includes('@media (max-width:1100px)') || !html.includes('@media (max-width:760px)')) fail('laptop/tablet/mobile responsive rules are incomplete');
  return html;
}

function integrateHomeExperience(input) {
  if (input.includes(MARKER)) return input;
  const start = input.indexOf(LEGACY_START);
  const end = input.indexOf(LEGACY_END);
  if (start < 0 || end < 0 || end <= start) fail('locked legacy home anchors were not found exactly as expected');
  if (input.indexOf(LEGACY_START, start + LEGACY_START.length) >= 0) fail('legacy home start anchor is ambiguous');
  if (input.indexOf(LEGACY_END, end + LEGACY_END.length) >= 0) fail('legacy home end anchor is ambiguous');

  const legacy = input.slice(start, end);
  const modalAnchor = '<!-- MODAL -->';
  const bottomAnchor = '<!-- BOTTOM NAV -->';
  const modalStart = legacy.indexOf(modalAnchor);
  const bottomStart = legacy.indexOf(bottomAnchor);
  if (modalStart < 0 || bottomStart < 0 || bottomStart <= modalStart) fail('legacy shared overlays and bottom navigation anchors are missing');
  const legacyHome = legacy.slice(0, modalStart);
  const sharedOverlays = legacy.slice(modalStart, bottomStart);
  const legacyBottom = legacy.slice(bottomStart);
  let html = input.slice(0, start) + HOME_HTML +
    '\n<div id="productRealign01BLegacyHome" hidden aria-hidden="true">\n' + legacyHome + '\n</div>\n' +
    sharedOverlays +
    '\n<div id="productRealign01BLegacyBottomNav" hidden aria-hidden="true">\n' + legacyBottom + '\n</div>\n' +
    input.slice(end);
  const headEnd = html.indexOf('</head>');
  if (headEnd < 0) fail('head closing tag is missing');
  html = html.slice(0, headEnd) + HOME_CSS + '\n' + html.slice(headEnd);
  const bodyEnd = html.lastIndexOf('</body>');
  if (bodyEnd < 0) fail('body closing tag is missing');
  html = html.slice(0, bodyEnd) + HOME_RUNTIME + '\n' + html.slice(bodyEnd);
  return html;
}

function applyHomeExperience(input) {
  return verifyHomeExperience(applyStartupHotfix(integrateHomeExperience(input)));
}

if (require.main === module) {
  const root = process.cwd();
  const indexPath = path.join(root, 'dist', 'index.html');
  if (!fs.existsSync(indexPath)) fail('dist/index.html is missing');
  const output = applyHomeExperience(fs.readFileSync(indexPath, 'utf8'));
  fs.writeFileSync(indexPath, output, 'utf8');

  const manifestPath = path.join(root, 'dist', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = applyPwaStartupManifest(fs.readFileSync(manifestPath, 'utf8'));
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }
  writeStartupAssets(root);
  console.log('PRODUCT-REALIGN-01B locked home and HOTFIX-05 startup integrated into dist.');
}

module.exports = {
  MARKER,
  HOTFIX_MARKER,
  STORAGE_KEY,
  BOOTING_ATTRIBUTE,
  STARTUP_MANIFEST_MARKER,
  STARTUP_ICON_SHA256,
  HOME_CSS,
  HOME_HTML,
  HOME_RUNTIME,
  HOTFIX_CSS,
  HOTFIX_HTML,
  applyHeadStartupMetadata,
  applyStartupHotfix,
  applyPwaStartupManifest,
  writeStartupAssets,
  applyHomeExperience,
  extractHomeRoot,
  extractStartupSurface,
  verifyHomeExperience,
};
