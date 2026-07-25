const fs = require('fs');
const path = require('path');

const root = process.cwd();
const contract = JSON.parse(fs.readFileSync(path.join(root, 'config', 'runtime-contract.json'), 'utf8'));
const sourceManifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const distManifest = JSON.parse(fs.readFileSync(path.join(root, 'dist', 'manifest.json'), 'utf8'));

const expected = {
  name: `${contract.application.name} — ${contract.application.tagline}`,
  short_name: contract.application.name,
  description: contract.application.description,
  screenshot_label: `${contract.application.name} — ${contract.application.tagline}`,
};

const historical = {
  name: 'DealScan — Deals vérifiés NovaDeal™',
  short_name: 'DealScan',
  description: 'Les meilleures promos analysées automatiquement. Score NovaDeal™ anti-fausses-promos.',
  screenshot_label: 'DealScan — Feed des meilleurs deals',
};

const errors = [];

for (const field of ['name', 'tagline', 'description']) {
  if (typeof contract.application?.[field] !== 'string' || !contract.application[field].trim()) {
    errors.push(`Runtime contract is missing application.${field}.`);
  }
}

if (sourceManifest.name !== historical.name) errors.push('Source manifest must preserve the historical name used by the migration.');
if (sourceManifest.short_name !== historical.short_name) errors.push('Source manifest must preserve the historical short_name used by the migration.');
if (sourceManifest.description !== historical.description) errors.push('Source manifest must preserve the historical description used by the migration.');
if (sourceManifest.screenshots?.[0]?.label !== historical.screenshot_label) errors.push('Source manifest must preserve the historical primary screenshot label used by the migration.');

if (distManifest.name !== expected.name) errors.push(`Built manifest name differs from the runtime contract: ${distManifest.name}`);
if (distManifest.short_name !== expected.short_name) errors.push(`Built manifest short_name differs from the runtime contract: ${distManifest.short_name}`);
if (distManifest.description !== expected.description) errors.push('Built manifest description differs from the runtime contract.');
if (distManifest.screenshots?.[0]?.label !== expected.screenshot_label) errors.push('Built manifest primary screenshot label differs from the runtime contract.');
if (distManifest._runtime_contract !== 'application.name+application.tagline+application.description') {
  errors.push('Built manifest is missing the F010 runtime contract trace marker.');
}

for (const legacyValue of Object.values(historical)) {
  if (JSON.stringify(distManifest).includes(legacyValue)) {
    errors.push(`Built manifest still contains historical PWA identity: ${legacyValue}`);
  }
}

if (errors.length) {
  console.error('PWA manifest brand contract consumption verification failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`PWA manifest brand contract consumption verified for ${contract.application.name}.`);