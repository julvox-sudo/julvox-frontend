const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targetPath = path.join(root, 'dist', 'ui-00-production-truth.js');
const installerPath = path.join(root, 'scripts', 'ui00-mutation-installer.js');
const MARKER = '/* ui-00-runtime:composed-v1 */';

function composeUi00Runtime(truthSource, installerSource) {
  if (truthSource.startsWith(MARKER)) {
    if (!truthSource.includes('JULVOX_INSTALL_UI00_MUTATIONS') || !truthSource.includes('JULVOX_PRODUCTION_TRUTH')) {
      throw new Error('UI-00 runtime composition marker is present on an incomplete output');
    }
    return truthSource;
  }
  if (!installerSource.includes('JULVOX_INSTALL_UI00_MUTATIONS')) throw new Error('UI-00 mutation installer is invalid');
  if (!truthSource.includes('JULVOX_PRODUCTION_TRUTH')) throw new Error('UI-00 production truth source is invalid');
  return `${MARKER}\n${installerSource.trim()}\n${truthSource.trim()}\n`;
}

if (require.main === module) {
  if (!fs.existsSync(targetPath) || !fs.existsSync(installerPath)) throw new Error('UI-00 runtime composition inputs are missing');
  const composed = composeUi00Runtime(fs.readFileSync(targetPath, 'utf8'), fs.readFileSync(installerPath, 'utf8'));
  fs.writeFileSync(targetPath, composed, 'utf8');
  console.log('UI-00 public runtime composed.');
}

module.exports = { MARKER, composeUi00Runtime };
