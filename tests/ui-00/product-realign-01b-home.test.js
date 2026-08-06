const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MARKER,
  HOME_CSS,
  HOME_HTML,
  HOME_RUNTIME,
  applyHomeExperience,
  extractHomeRoot,
  verifyHomeExperience,
} = require('../../scripts/product-realign-01b-home.js');

const fixture = `<!doctype html><html lang="fr"><head><title>Julvox</title></head><body>
<!-- TOP NAV -->
<nav class="topnav">Legacy home</nav>
<div class="hero">Les meilleures offres du moment</div>
<!-- MODAL -->
<div class="modal-overlay" id="modalOverlay"></div>
<!-- TOAST -->
<div class="toast" id="toast"></div>
<!-- BOTTOM NAV -->
<nav class="bottom-nav">Flash Promos Tendances</nav>
<!-- AUTH MODAL -->
<div class="auth-overlay" id="authOverlay"></div>
<div class="page" id="aiChatPage"></div>
<script>function openAIChat(){} function sendAIMessage(){}</script>
</body></html>`;

test('intègre la référence verrouillée sans modifier les pages existantes', () => {
  const output = applyHomeExperience(fixture);
  assert.match(output, /id="julvoxDecisionHome"/);
  assert.match(output, /id="productRealign01BLegacyHome" hidden aria-hidden="true"/);
  assert.match(output, /id="productRealign01BLegacyBottomNav" hidden aria-hidden="true"/);
  const homeEnd = output.indexOf('</div>\n<!-- MODAL -->');
  const modalPos = output.indexOf('id="modalOverlay"');
  const bottomHiddenPos = output.indexOf('id="productRealign01BLegacyBottomNav"');
  assert.ok(modalPos > homeEnd && modalPos < bottomHiddenPos, 'shared modal must remain outside hidden legacy containers');
  assert.ok(output.indexOf('id="authOverlay"') > bottomHiddenPos);
  assert.equal((output.match(/product-realign-01b-home:applied-v1/g) || []).length, 1);
});

test('rend la conversation plus importante que les produits', () => {
  const root = extractHomeRoot(applyHomeExperience(fixture));
  assert.match(root, /Que veux-tu décider aujourd’hui&nbsp;\?/);
  assert.match(root, /id="pr01bConversationForm"/);
  assert.match(root, /Explique ce que tu essaies de décider/);
  assert.doesNotMatch(root, /grille de produits|meilleures offres|deal du jour/i);
});

test('conserve uniquement la navigation demandée', () => {
  const root = extractHomeRoot(applyHomeExperience(fixture));
  for (const label of ['Accueil', 'Conversations', 'Mes décisions', 'Paramètres', 'Aide']) assert.match(root, new RegExp(label));
  for (const label of ['Conseils', 'Comparaisons', 'Favoris', 'Historique', 'Alertes & suivis']) assert.doesNotMatch(root, new RegExp(`>${label}<`));
});

test('ne rend aucun contenu promotionnel, score, badge ou monétisation sur l’accueil', () => {
  const root = extractHomeRoot(applyHomeExperience(fixture));
  for (const pattern of [/Premium/i, /Julvox Pro/i, /vente flash/i, /deal du jour/i, /score\s*[=:]/i, /\d+\s*%/i, /promotion/i, /remise/i]) {
    assert.doesNotMatch(root, pattern);
  }
});

test('limite la continuité à deux conversations réelles et prévoit un état vide honnête', () => {
  assert.match(HOME_RUNTIME, /MAX_CONVERSATIONS = 2/);
  assert.match(HOME_RUNTIME, /\.slice\(0, MAX_CONVERSATIONS\)/);
  assert.match(HOME_RUNTIME, /Tes conversations apparaîtront ici/);
  assert.match(HOME_RUNTIME, /Ton besoin initial est enregistré/);
  assert.doesNotMatch(HOME_HTML, /data-home-conversation="true"/);
});

test('ne fabrique aucun événement influençant une décision', () => {
  const root = extractHomeRoot(applyHomeExperience(fixture));
  assert.match(root, /Aucun changement important confirmé pour le moment/);
  assert.match(root, /uniquement les informations vérifiées/);
  assert.doesNotMatch(root, /a baissé de|nouveau modèle annoncé|rupture de stock confirmée/i);
});

test('retire robot, mascotte et signature manuscrite', () => {
  const root = extractHomeRoot(applyHomeExperience(fixture));
  assert.doesNotMatch(root, /robot|mascotte|signature|font-family:\s*(?:cursive|script)/i);
  assert.match(applyHomeExperience(fixture), /id="pr01b-glyph-a22"/);
  assert.match(root, /Je suis là pour t’aider à décider en confiance/);
});

test('applique la palette et la structure du glyphe A2.2 sans dépendance graphique distante', () => {
  assert.match(HOME_HTML, /viewBox="40 24 320 488"/);
  assert.match(HOME_HTML, /#0B1D34/);
  assert.match(HOME_HTML, /#0EA7A1/);
  assert.match(HOME_HTML, /#C79A5E/);
  assert.doesNotMatch(HOME_HTML, /<img|https?:\/\//i);
});

test('garantit les adaptations ordinateur portable, tablette et mobile', () => {
  assert.match(HOME_CSS, /@media \(max-width:1100px\)/);
  assert.match(HOME_CSS, /@media \(max-width:760px\)/);
  assert.match(HOME_CSS, /pr01b-mobile-nav/);
  assert.match(HOME_CSS, /grid-template-columns:1fr/);
});

test('reste idempotent et vérifiable', () => {
  const once = applyHomeExperience(fixture);
  const twice = applyHomeExperience(once);
  assert.equal(twice, once);
  assert.equal(verifyHomeExperience(once), once);
  assert.ok(once.includes(MARKER));
});
