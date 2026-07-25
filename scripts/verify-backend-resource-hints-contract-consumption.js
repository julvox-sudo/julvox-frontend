const fs = require('fs');
const path = require('path');

const root = process.cwd();
const contract = JSON.parse(fs.readFileSync(path.join(root, 'config', 'runtime-contract.json'), 'utf8'));
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const built = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');

const backendUrl = contract.backend?.api_base_url;
if (typeof backendUrl !== 'string' || !/^https:\/\//.test(backendUrl)) {
  throw new Error('backend.api_base_url must be an absolute HTTPS URL');
}

const sourceDns = '<link rel="dns-prefetch" href="https://julvox-dealscan-backend-production.up.railway.app"/>';
const sourcePreconnect = '<link rel="preconnect" href="https://julvox-dealscan-backend-production.up.railway.app" crossorigin/>';
if (!source.includes(sourceDns) || !source.includes(sourcePreconnect)) {
  throw new Error('Historical backend resource hints must remain explicit build anchors in source index.html');
}

const expectedDns = `<link rel="dns-prefetch" href="${backendUrl}"/>`;
const expectedPreconnect = `<link rel="preconnect" href="${backendUrl}" crossorigin/>`;

if (!built.includes('<!-- runtime-contract:backend.api_base_url -->')) {
  throw new Error('Built index.html is missing backend resource hints traceability marker');
}
if (!built.includes(expectedDns)) {
  throw new Error('Built index.html does not consume backend.api_base_url for dns-prefetch');
}
if (!built.includes(expectedPreconnect)) {
  throw new Error('Built index.html does not consume backend.api_base_url for preconnect');
}

const dnsCount = built.split(expectedDns).length - 1;
const preconnectCount = built.split(expectedPreconnect).length - 1;
if (dnsCount !== 1 || preconnectCount !== 1) {
  throw new Error(`Expected one backend dns-prefetch and one backend preconnect hint, found ${dnsCount} and ${preconnectCount}`);
}

console.log('Backend resource hints consume runtime contract.');