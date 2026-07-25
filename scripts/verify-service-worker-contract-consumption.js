const fs = require('fs');
const path = require('path');

const root = process.cwd();
const contract = JSON.parse(fs.readFileSync(path.join(root, 'config', 'runtime-contract.json'), 'utf8'));
const sourceHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const distHtml = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');

const expectedUrl = `${contract.pwa.service_worker_path}?v=${contract.pwa.cache_version.replace(/^v/, '')}`;
const expectedRegistration = `navigator.serviceWorker.register('${expectedUrl}', { scope: '/' })`;
const legacyRegistration = "navigator.serviceWorker.register('/sw.js?v=17', { scope: '/' })";
const marker = 'runtime-contract:pwa.service_worker_path+pwa.cache_version';

const errors = [];
const sourceOccurrences = sourceHtml.split(legacyRegistration).length - 1;
const expectedOccurrences = distHtml.split(expectedRegistration).length - 1;
const markerOccurrences = distHtml.split(marker).length - 1;

if (sourceOccurrences < 1) {
  errors.push('Source index.html no longer contains the expected historical service worker registration.');
}

if (distHtml.includes(legacyRegistration)) {
  errors.push('Built index.html still contains an autonomous historical service worker registration.');
}

if (!distHtml.includes(expectedRegistration)) {
  errors.push(`Built index.html does not register the service worker from the contract: ${expectedUrl}`);
}

if (expectedOccurrences !== sourceOccurrences) {
  errors.push(`Configured service worker registration count changed: source=${sourceOccurrences}, built=${expectedOccurrences}.`);
}

if (markerOccurrences !== sourceOccurrences) {
  errors.push(`Service worker trace marker count does not match the migrated registrations: expected ${sourceOccurrences}, found ${markerOccurrences}.`);
}

if (errors.length) {
  console.error('Service worker contract consumption verification failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Service worker contract consumption verified: ${expectedUrl} (${expectedOccurrences} registration(s) preserved).`);