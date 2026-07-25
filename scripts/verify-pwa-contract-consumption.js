const fs = require('fs');
const path = require('path');

const root = process.cwd();
const contract = JSON.parse(
  fs.readFileSync(path.join(root, 'config', 'runtime-contract.json'), 'utf8')
);
const sourceHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const distHtml = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');

const marker = '<!-- runtime-contract:pwa.manifest_path -->';
const expectedTag = `<link rel="manifest" href="${contract.pwa.manifest_path}"/>`;
const legacyTag = '<link rel="manifest" href="/manifest.json"/>';

if (!sourceHtml.includes(legacyTag)) {
  throw new Error('Source index.html no longer exposes the expected legacy manifest tag');
}

if (sourceHtml.includes(marker)) {
  throw new Error('Source index.html must remain untouched by the build-only manifest integration');
}

if (!distHtml.includes(marker)) {
  throw new Error('Built index.html does not contain the manifest contract marker');
}

if (!distHtml.includes(expectedTag)) {
  throw new Error(`Built index.html does not use contract manifest path: ${contract.pwa.manifest_path}`);
}

const markerIndex = distHtml.indexOf(marker);
const tagIndex = distHtml.indexOf(expectedTag);
if (markerIndex === -1 || tagIndex <= markerIndex) {
  throw new Error('Manifest contract marker must immediately precede the generated manifest tag');
}

console.log(`PWA contract consumption verified: ${contract.pwa.manifest_path}`);