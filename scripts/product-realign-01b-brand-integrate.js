const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const BRAND_MARKER = 'PRODUCT-REALIGN-01B-BRAND-INTEGRATION-07';
const BRAND_STYLE_ID = 'product-realign-01b-official-brand-styles';
const BRAND_FILES = Object.freeze({
  'brand/julvox-logo-horizontal.svg': 'cebca51950d70db87f33100be87adaf28907b99792f2a4eb5e6e7ffcd50bf91f',
  'brand/julvox-logo-horizontal-negative.svg': 'd1c1f73d9a94557463218880c9c40e19c55c4b68f273731db3902994ebad7b4f',
  'brand/julvox-glyph-master-color.svg': 'd83ccecde1beae02ee1883369f8c402e06af5d07c6b619ae377e9992c8ad792a',
  'brand/julvox-glyph-master-color-no-sand.svg': '35c6c11572341d1a15d3463701533033cd370ad42cf25d06c7d888b04f689944',
  'brand/julvox-glyph-small.svg': '07b51790ee93467f2e22c47c5af50b91fd6853596ee55307933589dd48f32bd0',
  'icons/icon-192.png': '8681b5b78c93fa72dc0837400f4335b899fbb1371572e36bf22587e8b70435f6',
  'icons/icon-512.png': 'b61af9f6b613062a32eab2a1ab4b3dbc6eaa0ea5add3f8fd03de1ab3a298395f',
  'icons/julvox-favicon-16-transparent.png': '39596221dc5a077bd5ba56e0ab3d8f4fb39b24d320d0eed12cb313bef526276f',
  'icons/julvox-favicon-32-transparent.png': '0b66364bdfa60647d453d9d98d150f1b1a4ef3d7534151efc7dfb41174398ca5',
});
const PUBLIC_FILES = Object.freeze([
  'brand/julvox-logo-horizontal.svg',
  'brand/julvox-logo-horizontal-negative.svg',
  'brand/julvox-glyph-small.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/julvox-favicon-16-transparent.png',
  'icons/julvox-favicon-32-transparent.png',
]);

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function assertFileHash(root, relativePath, expected, base = root) {
  const target = path.join(base, ...relativePath.split('/'));
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    throw new Error(`Official Julvox asset is missing: ${relativePath}`);
  }
  const actual = sha256(fs.readFileSync(target));
  if (actual !== expected) {
    throw new Error(`Official Julvox asset hash mismatch: ${relativePath}: expected ${expected}, got ${actual}`);
  }
  return actual;
}

function validateOfficialSvg(svg, label) {
  const forbidden = [
    [/<text\b/i, '<text>'],
    [/<image\b/i, '<image>'],
    [/<script\b/i, '<script>'],
    [/(?:href|xlink:href)\s*=\s*["'](?:https?:|\/\/|data:)/i, 'external or embedded resource'],
    [/@font-face|font-family\s*:/i, 'font rendering dependency'],
  ];
  for (const [pattern, description] of forbidden) {
    if (pattern.test(svg)) throw new Error(`Official Julvox SVG ${label} contains forbidden ${description}`);
  }
  if (!/<svg\b/i.test(svg) || !/viewBox\s*=/.test(svg)) {
    throw new Error(`Official Julvox SVG ${label} is not a standalone SVG master`);
  }
  return true;
}

function officialLockupMarkup(className, alt = 'Julvox') {
  return `<span class="${className} pr01b-official-lockup" data-julvox-brand="A2.2-official">` +
    `<img class="pr01b-official-logo pr01b-official-logo-positive" src="/brand/julvox-logo-horizontal.svg" alt="${alt}" width="1200" height="400"/>` +
    `<img class="pr01b-official-logo pr01b-official-logo-negative" src="/brand/julvox-logo-horizontal-negative.svg" alt="${alt}" width="1200" height="400"/>` +
    `</span>`;
}

const BRAND_CSS = `<style id="${BRAND_STYLE_ID}">
.pr01b-official-lockup{display:inline-flex;align-items:center;line-height:0;max-width:100%;}
.pr01b-official-logo{display:block;width:auto;height:auto;max-width:100%;object-fit:contain;}
.pr01b-official-logo-negative{display:none;}
html[data-theme="dark"] .pr01b-official-logo-positive{display:none;}
html[data-theme="dark"] .pr01b-official-logo-negative{display:block;}
#julvoxBoot .pr01b-official-logo-positive{display:block!important;}
#julvoxBoot .pr01b-official-logo-negative{display:none!important;}
.pr01b-brand.pr01b-official-lockup{width:156px;}
.pr01b-mobile-brand.pr01b-official-lockup{width:112px;}
.pr01b-boot-lockup .pr01b-official-lockup{width:188px;}
@media(max-width:760px){.pr01b-boot-lockup .pr01b-official-lockup{width:166px}.pr01b-mobile-brand.pr01b-official-lockup{width:104px}}
</style>`;

function replaceExactlyOnce(text, pattern, replacement, label) {
  const matches = text.match(pattern);
  if (!matches || matches.length !== 1) {
    throw new Error(`Official Julvox integration expected exactly one ${label}, found ${matches ? matches.length : 0}`);
  }
  return text.replace(pattern, replacement);
}

function applyBrandToHtml(input) {
  if (input.includes(`data-brand-integration="${BRAND_MARKER}"`)) return verifyBrandedHtml(input);
  let html = input;
  html = replaceExactlyOnce(html, /<svg class="pr01b-symbol-defs"[\s\S]*?<\/svg>\s*/, '', 'provisional A2.2 symbol definition');
  html = replaceExactlyOnce(
    html,
    /<div class="pr01b-mobile-brand">[\s\S]*?<\/div>/,
    officialLockupMarkup('pr01b-mobile-brand', 'Julvox'),
    'mobile provisional logo',
  );
  html = replaceExactlyOnce(
    html,
    /<a class="pr01b-brand" href="#julvoxDecisionHome" aria-label="Julvox, accueil">[\s\S]*?<\/a>/,
    `<a class="pr01b-brand pr01b-official-lockup" data-julvox-brand="A2.2-official" href="#julvoxDecisionHome" aria-label="Julvox, accueil"><img class="pr01b-official-logo pr01b-official-logo-positive" src="/brand/julvox-logo-horizontal.svg" alt="" width="1200" height="400"/><img class="pr01b-official-logo pr01b-official-logo-negative" src="/brand/julvox-logo-horizontal-negative.svg" alt="" width="1200" height="400"/></a>`,
    'sidebar provisional logo',
  );
  html = replaceExactlyOnce(
    html,
    /<div class="pr01b-boot-lockup">[\s\S]*?<span class="pr01b-boot-tagline">Compagnon de décision avant achat<\/span>\s*<\/div>/,
    `<div class="pr01b-boot-lockup">${officialLockupMarkup('pr01b-boot-brand', 'Julvox')}<span class="pr01b-boot-tagline">Compagnon de décision avant achat</span></div>`,
    'startup provisional logo',
  );

  html = html.replace(
    /<use\s+href=["']#pr01b-glyph-a22["']\s*\/?>/gi,
    '<image href="/brand/julvox-glyph-small.svg" x="40" y="24" width="320" height="488" preserveAspectRatio="xMidYMid meet"/>',
  );

  html = html.replace(
    /\.pr01b-symbol-defs\{[^}]*\}/gi,
    '',
  );

  html = html.replace(
    /:not\(\.pr01b-symbol-defs\)/gi,
    '',
  );

  const iconLinks = [
    '<link rel="icon" type="image/png" sizes="16x16" href="/icons/julvox-favicon-16-transparent.png"/>',
    '<link rel="icon" type="image/png" sizes="32x32" href="/icons/julvox-favicon-32-transparent.png"/>',
    '<link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png"/>',
  ].join('\n');
  html = html.replace(/<link\s+rel=["'](?:shortcut )?icon["'][^>]*>\s*/gi, '');
  html = html.replace(/<link\s+rel=["']apple-touch-icon["'][^>]*>\s*/gi, '');
  const headEnd = html.indexOf('</head>');
  if (headEnd < 0) throw new Error('Official Julvox integration cannot find </head>');
  html = html.slice(0, headEnd) + `${BRAND_CSS}\n${iconLinks}\n<meta data-brand-integration="${BRAND_MARKER}"/>\n` + html.slice(headEnd);
  return verifyBrandedHtml(html);
}

function verifyBrandedHtml(html) {
  const required = [
    '/brand/julvox-logo-horizontal.svg',
    '/brand/julvox-logo-horizontal-negative.svg',
    '/icons/julvox-favicon-16-transparent.png',
    '/icons/julvox-favicon-32-transparent.png',
    `data-brand-integration="${BRAND_MARKER}"`,
  ];
  for (const token of required) if (!html.includes(token)) throw new Error(`Branded HTML is missing ${token}`);
  const forbidden = [/#pr01b-glyph-a22/i, /id="pr01b-glyph-a22"/i, /pr01b-symbol-defs/i, /julvox-logo-horizontal-editable/i];
  for (const pattern of forbidden) if (pattern.test(html)) throw new Error(`Branded HTML contains forbidden provisional or editable identity: ${pattern}`);
  const startup = html.match(/<div id="julvoxBoot"[\s\S]*?<\/script>/i)?.[0] || '';
  if (/DealScan|NovaDeal|Top deals|vente flash|promotion/i.test(startup)) {
    throw new Error('DealScan branding is visible in the initial Julvox surface');
  }
  return html;
}

function applyBrandToManifest(input) {
  const manifest = typeof input === 'string' ? JSON.parse(input) : JSON.parse(JSON.stringify(input));
  manifest.icons = [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ];
  manifest.shortcuts = [];
  manifest.screenshots = [];
  manifest._brand_identity = BRAND_MARKER;
  return verifyManifest(manifest);
}

function verifyManifest(manifest) {
  const expected = new Map([['/icons/icon-192.png', '192x192'], ['/icons/icon-512.png', '512x512']]);
  for (const [src, sizes] of expected) {
    const icon = (manifest.icons || []).find(entry => entry.src === src && entry.purpose === 'any');
    if (!icon || icon.sizes !== sizes || icon.type !== 'image/png') throw new Error(`PWA manifest has an invalid official icon declaration: ${src}`);
  }
  if ((manifest.shortcuts || []).length !== 0) throw new Error('PWA manifest still contains legacy DealScan shortcuts');
  if ((manifest.screenshots || []).length !== 0) throw new Error('PWA manifest still contains a legacy DealScan screenshot');
  return manifest;
}

function applyBrandToServiceWorker(input) {
  let output = input;
  const assets = [
    '/manifest.json',
    '/brand/julvox-logo-horizontal.svg',
    '/brand/julvox-logo-horizontal-negative.svg',
    '/brand/julvox-glyph-small.svg',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/julvox-favicon-16-transparent.png',
    '/icons/julvox-favicon-32-transparent.png',
    'https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap',
  ];
  output = output.replace(/const STATIC_ASSETS = \[[\s\S]*?\];/, `const STATIC_ASSETS = ${JSON.stringify(assets, null, 2)};`);
  for (const asset of assets.slice(0, -1)) if (!output.includes(`'${asset}'`) && !output.includes(`"${asset}"`)) throw new Error(`Service worker does not cache ${asset}`);
  return output;
}

function authenticateSource(root) {
  for (const [relativePath, expected] of Object.entries(BRAND_FILES)) {
    assertFileHash(root, relativePath, expected);
    if (relativePath.endsWith('.svg')) validateOfficialSvg(fs.readFileSync(path.join(root, relativePath), 'utf8'), relativePath);
  }
}

function copyPublicAssets(root) {
  const dist = path.join(root, 'dist');
  for (const relativePath of PUBLIC_FILES) {
    const source = path.join(root, ...relativePath.split('/'));
    const destination = path.join(dist, ...relativePath.split('/'));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    assertFileHash(root, relativePath, BRAND_FILES[relativePath], dist);
  }
}

function integrate(root = process.cwd()) {
  authenticateSource(root);
  const dist = path.join(root, 'dist');
  if (!fs.existsSync(dist)) throw new Error('Official Julvox integration requires dist/');
  copyPublicAssets(root);

  const indexPath = path.join(dist, 'index.html');
  const manifestPath = path.join(dist, 'manifest.json');
  const swPath = path.join(dist, 'sw.js');
  for (const required of [indexPath, manifestPath, swPath]) if (!fs.existsSync(required)) throw new Error(`Official Julvox integration is missing ${path.relative(root, required)}`);

  fs.writeFileSync(indexPath, applyBrandToHtml(fs.readFileSync(indexPath, 'utf8')), 'utf8');
  fs.writeFileSync(manifestPath, `${JSON.stringify(applyBrandToManifest(fs.readFileSync(manifestPath, 'utf8')), null, 2)}\n`, 'utf8');
  fs.writeFileSync(swPath, applyBrandToServiceWorker(fs.readFileSync(swPath, 'utf8')), 'utf8');

  for (const relativePath of PUBLIC_FILES) assertFileHash(root, relativePath, BRAND_FILES[relativePath], dist);
  return { marker: BRAND_MARKER, publicFiles: [...PUBLIC_FILES] };
}

if (require.main === module) {
  integrate(process.cwd());
  console.log('Official Julvox A2.2 masters integrated into the public artifact.');
}

module.exports = {
  BRAND_FILES,
  BRAND_MARKER,
  PUBLIC_FILES,
  applyBrandToHtml,
  applyBrandToManifest,
  applyBrandToServiceWorker,
  assertFileHash,
  authenticateSource,
  integrate,
  sha256,
  validateOfficialSvg,
  verifyBrandedHtml,
  verifyManifest,
};
