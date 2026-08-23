'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_47_PRIVACY_RETENTION_TRUTH';

const REPLACEMENTS = [
  [
    '• Communications chiffrées <strong>TLS 1.3</strong>',
    '• Communications publiques protégées par <strong>HTTPS/TLS</strong>, avec terminaison et versions de protocole gérées par l’infrastructure d’hébergement',
    'CGU fixed TLS version claim',
  ],
  [
    "• Journaux d'accès conservés 12 mois maximum",
    '• Journaux applicatifs minimisés et expurgés des identifiants directs ; la rétention des journaux d’infrastructure dépend des politiques du fournisseur',
    'CGU fixed log retention claim',
  ],
  [
    '<li>Chiffrement TLS 1.3 sur toutes les communications</li>',
    '<li>Communications publiques protégées par HTTPS/TLS ; les versions de protocole sont gérées par les fournisseurs d’hébergement</li>',
    'privacy fixed TLS version claim',
  ],
  [
    '<li>Notification CNIL sous 72h en cas de violation de données (Art. 33 RGPD)</li>',
    '<li>Notification à la CNIL dans les délais prévus par le RGPD lorsqu’une violation présente un risque pour les droits et libertés des personnes</li>',
    'unconditional CNIL notification claim',
  ],
  [
    '<li>Activité anonymisée (deals consultés, alertes)</li>',
    '<li>Données liées au compte nécessaires aux fonctionnalités activées, notamment les alertes et préférences</li>',
    'anonymous account activity claim',
  ],
  [
    '<li>IP anonymisée après 30 jours</li>',
    '<li>Les journaux applicatifs structurés expurgent les IP et autres identifiants directs ; les métadonnées réseau traitées par l’hébergeur suivent sa propre politique de conservation</li>',
    'fixed IP anonymization delay claim',
  ],
  [
    "<li>Données de compte : jusqu'à suppression + 1 an</li>",
    '<li>Données de compte : conservées pendant la relation de compte ; lors d’une suppression, le profil et le graphe local explicitement couvert sont anonymisés ou supprimés, tandis que les données hors périmètre suivent leurs obligations applicables</li>',
    'account deletion plus one-year claim',
  ],
  [
    '<li>Logs : 12 mois maximum</li>',
    '<li>Journaux d’infrastructure : durée de conservation définie par le fournisseur et le forfait d’hébergement ; Julvox ne garantit pas une conservation de 12 mois</li>',
    'privacy fixed log retention claim',
  ],
  [
    '<li><strong>Railway</strong> (hébergement backend) — Serveurs EU — <a href="https://railway.app/legal/privacy" style="color:var(--accent)">Politique Railway</a></li>',
    '<li><strong>Railway</strong> (hébergement backend) — Production Julvox actuellement configurée dans la région Railway de Singapour ; voir la <a href="https://railway.app/legal/privacy" style="color:var(--accent)">politique Railway</a></li>',
    'Railway EU hosting claim',
  ],
];

function replaceExactlyOnce(source, legacy, replacement, label) {
  const count = source.split(legacy).length - 1;
  if (count !== 1) {
    throw new Error(`P6.47 expected exactly one ${label}, got ${count}`);
  }
  return source.replace(legacy, replacement);
}

function hardenHtml(html) {
  if (html.includes(`<!-- ${MARKER} -->`)) {
    assertHardened(html);
    return html;
  }

  let output = html;
  for (const [legacy, replacement, label] of REPLACEMENTS) {
    output = replaceExactlyOnce(output, legacy, replacement, label);
  }

  const anchor = 'Communications publiques protégées par <strong>HTTPS/TLS</strong>, avec terminaison';
  output = output.replace(anchor, `<!-- ${MARKER} -->${anchor}`);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const markerCount = (html.match(new RegExp(MARKER, 'g')) || []).length;
  if (markerCount !== 1) {
    throw new Error(`P6.47 marker count must be 1, got ${markerCount}`);
  }

  for (const unsupported of [
    'TLS 1.3',
    'IP anonymisée après 30 jours',
    'Activité anonymisée (deals consultés, alertes)',
    "Données de compte : jusqu'à suppression + 1 an",
    'Logs : 12 mois maximum',
    "Journaux d'accès conservés 12 mois maximum",
    '<strong>Railway</strong> (hébergement backend) — Serveurs EU —',
    'Notification CNIL sous 72h en cas de violation de données',
  ]) {
    if (html.includes(unsupported)) {
      throw new Error(`P6.47 unsupported privacy/retention claim remains: ${unsupported}`);
    }
  }

  for (const required of [
    'Communications publiques protégées par <strong>HTTPS/TLS</strong>',
    'lorsqu’une violation présente un risque pour les droits et libertés des personnes',
    'Données liées au compte nécessaires aux fonctionnalités activées',
    'Les journaux applicatifs structurés expurgent les IP et autres identifiants directs',
    'profil et le graphe local explicitement couvert sont anonymisés ou supprimés',
    'Julvox ne garantit pas une conservation de 12 mois',
    'Production Julvox actuellement configurée dans la région Railway de Singapour',
    '<strong>bcrypt</strong> (jamais stockés en clair)',
    "Tokens d'authentification JWT signés et à durée limitée",
    'Stripe/PayPal (PCI-DSS)',
  ]) {
    if (!html.includes(required)) {
      throw new Error(`P6.47 required truthful privacy/security statement missing: ${required}`);
    }
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_47_PRIVACY_RETENTION_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = {
  MARKER,
  REPLACEMENTS,
  assertHardened,
  hardenHtml,
  hardenPublicArtifact,
};
