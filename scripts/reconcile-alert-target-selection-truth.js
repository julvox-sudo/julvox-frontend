'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_68_ALERT_TARGET_SELECTION_TRUTH';
const LEGACY_FUNCTION = `function createAlertFromDeal(id) {
    var deal = findDeal(id);
    if (deal && typeof window.createAlert === 'function') window.createAlert(text(deal.name, 300), Number(deal.current_price));
  }
`;
const SAFE_FUNCTION = `function createAlertFromDeal(id) {
    // P6_68_ALERT_TARGET_SELECTION_TRUTH
    var deal = findDeal(id);
    if (!deal || typeof window.createAlert !== 'function') return false;
    var currentPrice = Number(deal.current_price);
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      if (typeof window.showToast === 'function') window.showToast('Prix actuel indisponible pour créer cette alerte.');
      return false;
    }
    if (typeof window.prompt !== 'function') {
      if (typeof window.showToast === 'function') window.showToast('Choix du prix cible indisponible.');
      return false;
    }
    var rawTarget = window.prompt('Prix cible en € (strictement inférieur à ' + currentPrice.toFixed(2).replace('.', ',') + ' €)');
    if (rawTarget === null) return false;
    var targetPrice = Number(String(rawTarget).trim().replace(',', '.'));
    if (!Number.isFinite(targetPrice) || targetPrice <= 0 || targetPrice >= currentPrice) {
      if (typeof window.showToast === 'function') window.showToast('Prix cible invalide : choisis un montant inférieur au prix actuel.');
      return false;
    }
    window.createAlert(text(deal.name, 300), targetPrice);
    return true;
  }
`;
const LEGACY_COPY = 'Depuis une offre affichée, crée une alerte au prix observé. Julvox peut ensuite envoyer un email si une offre correspondante répond aux conditions de l’alerte.';
const SAFE_COPY = 'Depuis une offre affichée, choisis un prix cible inférieur au prix observé. Julvox peut ensuite envoyer un email si une offre correspondante atteint cette cible.';

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(MARKER)) {
    assertHardened(html);
    return html;
  }
  if (countOf(html, LEGACY_FUNCTION) !== 1) {
    throw new Error(`P6.68 expected one legacy alert-from-deal function, got ${countOf(html, LEGACY_FUNCTION)}`);
  }
  if (countOf(html, LEGACY_COPY) !== 1) {
    throw new Error(`P6.68 expected one P6.66 observed-price onboarding copy, got ${countOf(html, LEGACY_COPY)}`);
  }

  let output = html.replace(LEGACY_FUNCTION, SAFE_FUNCTION);
  output = output.replace(LEGACY_COPY, SAFE_COPY);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.68 marker count must be 1');
  if (html.includes(LEGACY_FUNCTION)) throw new Error('P6.68 stale current-price alert creation remains');
  if (html.includes(LEGACY_COPY)) throw new Error('P6.68 stale observed-price target copy remains');
  for (const required of [
    SAFE_COPY,
    'window.prompt(',
    'targetPrice >= currentPrice',
    'window.createAlert(text(deal.name, 300), targetPrice)',
    'P6_66_ALERT_ONBOARDING_TARGET_TRUTH',
    'P6_67_PROMO_STATS_TRUTH',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.68 required alert target boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_68_ALERT_TARGET_SELECTION_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
