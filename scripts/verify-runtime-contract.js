const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`Missing required file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

const contractText = read('config/runtime-contract.json');
const indexHtml = read('index.html');
const serviceWorker = read('sw.js');

let contract;
try {
  contract = JSON.parse(contractText);
} catch (error) {
  fail(`config/runtime-contract.json is not valid JSON: ${error.message}`);
}

if (contract) {
  if (contract.schema_version !== 1) fail('Unsupported runtime contract schema_version');

  const requiredStrings = [
    ['backend.api_base_url', contract.backend?.api_base_url],
    ['backend.health_path', contract.backend?.health_path],
    ['pwa.manifest_path', contract.pwa?.manifest_path],
    ['pwa.service_worker_path', contract.pwa?.service_worker_path],
    ['pwa.cache_version', contract.pwa?.cache_version],
    ['runtime.enhancements_script', contract.runtime?.enhancements_script],
  ];

  for (const [name, value] of requiredStrings) {
    if (typeof value !== 'string' || !value.trim()) fail(`Runtime contract is missing ${name}`);
  }

  if (contract.backend?.api_base_url && !indexHtml.includes(contract.backend.api_base_url)) {
    fail('index.html backend URL differs from config/runtime-contract.json');
  }
  if (contract.backend?.health_path && !indexHtml.includes(contract.backend.health_path)) {
    fail('index.html health path differs from config/runtime-contract.json');
  }
  if (contract.pwa?.manifest_path && !indexHtml.includes(contract.pwa.manifest_path)) {
    fail('index.html manifest path differs from config/runtime-contract.json');
  }
  if (contract.pwa?.service_worker_path && !indexHtml.includes(contract.pwa.service_worker_path)) {
    fail('index.html service worker path differs from config/runtime-contract.json');
  }
  if (contract.runtime?.enhancements_script && !indexHtml.includes(contract.runtime.enhancements_script)) {
    fail('index.html enhancements script differs from config/runtime-contract.json');
  }
  if (contract.pwa?.cache_version) {
    const expected = `const CACHE_VERSION = '${contract.pwa.cache_version}'`;
    if (!serviceWorker.includes(expected)) {
      fail('sw.js cache version differs from config/runtime-contract.json');
    }
  }
}

if (failures.length > 0) {
  console.error('Runtime contract verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Runtime contract verification passed.');
