const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { INVENTORY_RELATIVE_PATH } = require('./public-artifact-utils');

const root = process.cwd();
const inventoryPath = path.join(root, INVENTORY_RELATIVE_PATH);

function runBuild(label) {
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(command, ['run', 'build'], {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
  if (!fs.existsSync(inventoryPath)) {
    throw new Error(`${label} did not produce ${INVENTORY_RELATIVE_PATH}`);
  }
  return JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
}

const first = runBuild('First deterministic build');
const second = runBuild('Second deterministic build');

if (JSON.stringify(first) !== JSON.stringify(second)) {
  console.error('First inventory:');
  console.error(JSON.stringify(first, null, 2));
  console.error('Second inventory:');
  console.error(JSON.stringify(second, null, 2));
  throw new Error('Two successive builds produced different public inventories or SHA-256 values');
}

console.log(`Public build determinism verified for ${second.file_count} files.`);
