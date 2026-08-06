const fs = require('fs');
const path = require('path');

const MARKER = '<!-- product-realign-01b-home:applied-v1 -->';
const LEGACY_START = '<!-- TOP NAV -->';
const LEGACY_END = '<!-- AUTH MODAL -->';
const STORAGE_KEY = 'julvox:decision-home:conversations:v1';

function readPart(filename) {
  return fs.readFileSync(path.join(__dirname, filename), 'utf8');
}

const HOME_CSS = readPart('product-realign-01b-home.styles.html');
const HOME_HTML = readPart('product-realign-01b-home.fragment.html');
const HOME_RUNTIME = readPart('product-realign-01b-home.runtime.html');

function fail(message) {
  throw new Error(`PRODUCT-REALIGN-01B home integration failed: ${message}`);
}

function extractHomeRoot(html) {
  const start = html.indexOf('<div id="julvoxDecisionHome"');
  if (start < 0) return '';
  const end = html.indexOf('<div id="productRealign01BLegacyHome"', start);
  return end < 0 ? html.slice(start) : html.slice(start, end);
}

function verifyHomeExperience(html) {
  if ((html.match(/product-realign-01b-home:applied-v1/g) || []).length !== 1) fail('home marker must appear exactly once');
  if (!html.includes('id="julvoxDecisionHome"')) fail('decision home root is missing');
  if (!html.includes('id="productRealign01BLegacyHome" hidden aria-hidden="true"')) fail('legacy home is not isolated from users and assistive technology');
  if (!html.includes('id="productRealign01BLegacyBottomNav" hidden aria-hidden="true"')) fail('legacy bottom navigation is not isolated');
  if (!html.includes('Que veux-tu décider aujourd’hui&nbsp;?')) fail('locked hero question is missing');
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

function applyHomeExperience(input) {
  if (input.includes(MARKER)) return verifyHomeExperience(input);
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
  return verifyHomeExperience(html);
}

if (require.main === module) {
  const root = process.cwd();
  const indexPath = path.join(root, 'dist', 'index.html');
  if (!fs.existsSync(indexPath)) fail('dist/index.html is missing');
  const output = applyHomeExperience(fs.readFileSync(indexPath, 'utf8'));
  fs.writeFileSync(indexPath, output, 'utf8');
  console.log('PRODUCT-REALIGN-01B locked home integrated into dist/index.html.');
}

module.exports = {
  MARKER,
  STORAGE_KEY,
  HOME_CSS,
  HOME_HTML,
  HOME_RUNTIME,
  applyHomeExperience,
  extractHomeRoot,
  verifyHomeExperience,
};
