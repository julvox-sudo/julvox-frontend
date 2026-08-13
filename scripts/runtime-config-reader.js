'use strict';

const fs = require('fs');
const vm = require('vm');

function readGeneratedRuntimeConfig(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const sandbox = {};
  vm.runInNewContext(source, sandbox, {
    filename: filePath,
    timeout: 1000,
  });
  const config = sandbox.JULVOX_RUNTIME_CONFIG;
  if (!config || typeof config !== 'object') {
    throw new Error(`Generated runtime config is missing JULVOX_RUNTIME_CONFIG: ${filePath}`);
  }
  if (!config.backend || typeof config.backend.apiBaseUrl !== 'string' || !config.backend.apiBaseUrl) {
    throw new Error(`Generated runtime config is missing backend.apiBaseUrl: ${filePath}`);
  }
  return config;
}

module.exports = { readGeneratedRuntimeConfig };
