const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { INVENTORY_RELATIVE_PATH } = require('./public-artifact-utils');

const root = process.cwd();
const dist = path.join(root, 'dist');
const inventoryPath = path.join(root, INVENTORY_RELATIVE_PATH);
const staleMarkerPath = path.join(dist, '__quality01a_stale_build_marker__.tmp');

function seedStaleArtifact() {
  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(staleMarkerPath, 'This file must be removed by a clean build.\n', 'utf8');
}

function runBuild(label) {
  seedStaleArtifact();
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
  if (fs.existsSync(staleMarkerPath)) {
    throw new Error(`${label} did not rebuild dist from zero`);
  }
  if (!fs.existsSync(inventoryPath)) {
    throw new Error(`${label} did not produce ${INVENTORY_RELATIVE_PATH}`);
  }
  const raw = fs.readFileSync(inventoryPath, 'utf8');
  return {
    raw,
    parsed: JSON.parse(raw),
  };
}

const first = runBuild('First deterministic build');
const second = runBuild('Second deterministic build');

if (first.raw !== second.raw || JSON.stringify(first.parsed) !== JSON.stringify(second.parsed)) {
  console.error('First inventory:');
  console.error(first.raw);
  console.error('Second inventory:');
  console.error(second.raw);
  throw new Error('Two clean successive builds produced different inventory bytes, paths, sizes or SHA-256 values');
}

console.log(`Public build determinism verified for ${second.parsed.file_count} files after two clean rebuilds.`);
