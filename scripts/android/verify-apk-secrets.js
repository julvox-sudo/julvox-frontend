const fs = require('fs');

const inputPath = process.argv[2];
if (!inputPath || !fs.existsSync(inputPath)) {
  throw new Error('Usage: node scripts/android/verify-apk-secrets.js <apk-strings.txt>');
}
const input = fs.readFileSync(inputPath, 'utf8');
const patterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u],
  ['Google API key', /AIza[0-9A-Za-z_-]{30,}/u],
  ['OpenAI-style secret', /sk-(?:proj-)?[0-9A-Za-z_-]{20,}/u],
  ['GitHub token', /ghp_[0-9A-Za-z]{30,}/u],
  ['Slack token', /xox[baprs]-[0-9A-Za-z-]{20,}/u],
];
for (const [label, pattern] of patterns) {
  if (pattern.test(input)) throw new Error(`P5.10 APK secret scan failed: ${label} pattern found`);
}
console.log('P5.10 APK secret scan PASS: no recognized embedded secret pattern.');
