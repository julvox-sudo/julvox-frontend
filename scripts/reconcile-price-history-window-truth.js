'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_53_PRICE_HISTORY_WINDOW_TRUTH';

const LEGACY_GUIDE = `<p class="seo-p">Le score Julvox est un indicateur de 0 à 100 qui mesure la qualité réelle d'un deal. Il analyse l'historique de prix sur 90 jours, la réputation du marchand, la rareté du prix et détecte les fausses promos (prix gonflés avant les soldes).</p>`;
const SAFE_GUIDE = `<p class="seo-p"><!-- ${MARKER} -->Le score Julvox est un indicateur de 0 à 100 calculé à partir des données disponibles. Il ne garantit pas un historique de prix couvrant 90 jours et ne constitue pas, à lui seul, une décision d’achat.</p>`;

const LEGACY_FAQ = `<div itemprop="text">Julvox analyse l'historique de prix sur 90 jours. Si le "prix original" affiché n'a jamais été pratiqué, ou si le prix a été gonflé artificiellement dans les 2 semaines précédant la promo, Julvox affiche le badge ⚠️ "Fausse promo suspectée".</div>`;
const SAFE_FAQ = `<div itemprop="text">Quand une analyse dispose de données de prix exploitables, Julvox peut afficher un signal ⚠️ "Fausse promo suspectée". La couverture temporelle dépend des observations réellement disponibles ; Julvox ne garantit pas systématiquement 90 jours d’historique.</div>`;

const LEGACY_CHART_TITLE = '📈 Historique des prix (90 jours)';
const SAFE_CHART_TITLE = '📈 Historique des prix disponible';

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(`<!-- ${MARKER} -->`)) {
    assertHardened(html);
    return html;
  }

  const guideCount = countOf(html, LEGACY_GUIDE);
  const faqCount = countOf(html, LEGACY_FAQ);
  const chartCount = countOf(html, LEGACY_CHART_TITLE);

  if (guideCount !== 1) throw new Error(`P6.53 expected one legacy score/history guide claim, got ${guideCount}`);
  if (faqCount !== 1) throw new Error(`P6.53 expected one legacy fake-promo duration claim, got ${faqCount}`);
  if (chartCount !== 1) throw new Error(`P6.53 expected one hard-coded 90-day chart title, got ${chartCount}`);

  let output = html.replace(LEGACY_GUIDE, SAFE_GUIDE);
  output = output.replace(LEGACY_FAQ, SAFE_FAQ);
  output = output.replace(LEGACY_CHART_TITLE, SAFE_CHART_TITLE);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const markerCount = countOf(html, MARKER);
  if (markerCount !== 1) throw new Error(`P6.53 marker count must be 1, got ${markerCount}`);

  for (const legacy of [LEGACY_GUIDE, LEGACY_FAQ, LEGACY_CHART_TITLE]) {
    if (html.includes(legacy)) throw new Error('P6.53 unsupported fixed-window claim remains');
  }
  if (html.includes('2 semaines précédant la promo')) throw new Error('P6.53 observation-count-as-calendar wording remains');

  for (const required of [
    SAFE_GUIDE,
    SAFE_FAQ,
    SAFE_CHART_TITLE,
    'ne constitue pas, à lui seul, une décision d’achat',
    'La couverture temporelle dépend des observations réellement disponibles',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.53 required truth boundary missing: ${required}`);
  }

  if (!html.includes('function renderPriceHistoryChart(')) throw new Error('P6.53 price-history chart renderer must remain');
  if (!html.includes('function _loadAndRenderPriceChart(')) throw new Error('P6.53 price-history loader must remain');
  if (!html.includes("JULVOX_API.get('/deals/' + encodeURIComponent(deal.id))")) throw new Error('P6.53 factual deal-history retrieval must remain');
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_53_PRICE_HISTORY_WINDOW_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
