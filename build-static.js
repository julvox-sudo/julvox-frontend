const fs = require('fs');
const path = require('path');

const root = process.cwd();
const out = path.join(root, 'dist');
const exclude = new Set(['dist', '.git', '.github', 'node_modules']);
const excludeFiles = new Set(['package-lock.json']);

function copy(src, dest) {
  const name = path.basename(src);
  if (exclude.has(name) || excludeFiles.has(name)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) copy(path.join(src, entry), path.join(dest, entry));
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const entry of fs.readdirSync(root)) copy(path.join(root, entry), path.join(out, entry));
console.log('Static build complete: dist/');
