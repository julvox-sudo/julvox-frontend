'use strict';

const fs = require('node:fs');
const path = require('node:path');

const START = 'function updateNavForUser() {';
const END = 'function toggleDropdown()';
const MARKER = 'P6_31_USER_IDENTITY_DOM_TRUST';

const HARDENED = `// ${MARKER}
function updateNavForUser() {
  const area = document.getElementById('authNavArea');
  if (!area) return;
  area.replaceChildren();

  const button = document.createElement('button');
  button.className = 'user-btn';
  button.type = 'button';

  if (currentUser) {
    const trust = window.JulvoxDynamicDealTrust;
    const safeName = trust ? trust.text(currentUser.name, 160) : String(currentUser.name || '').trim().slice(0, 160);
    const safeEmail = trust ? trust.text(currentUser.email, 254) : String(currentUser.email || '').trim().slice(0, 254);
    const displayName = safeName || 'Utilisateur';

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = displayName.charAt(0).toUpperCase() || 'U';

    const label = document.createElement('span');
    label.textContent = displayName + (currentUser.is_premium ? ' 👑' : '');

    button.append(avatar, label);
    button.addEventListener('click', toggleDropdown);
    area.appendChild(button);

    const ddName = document.getElementById('ddName');
    const ddEmail = document.getElementById('ddEmail');
    const ddBadge = document.getElementById('ddBadge');
    const ddUpgrade = document.getElementById('ddUpgrade');
    if (ddName) ddName.textContent = displayName + (currentUser.is_premium ? ' 👑' : '');
    if (ddEmail) ddEmail.textContent = safeEmail;
    if (ddBadge) ddBadge.innerHTML = currentUser.is_owner
      ? '<span style="background:linear-gradient(135deg,#ff6b35,#ff9800);color:#000;border-radius:5px;padding:2px 8px;font-size:10px;font-weight:700">👑 Admin</span>'
      : currentUser.is_premium
        ? '<span style="background:linear-gradient(135deg,var(--gold),#ff9800);color:#000;border-radius:5px;padding:2px 8px;font-size:10px;font-weight:700">⭐ Premium</span>'
        : '<span style="font-size:11px;color:var(--txt3)">Plan Gratuit</span>';
    if (ddUpgrade) ddUpgrade.style.display = currentUser.is_premium ? 'none' : 'flex';
    return;
  }

  button.textContent = 'Connexion';
  button.addEventListener('click', function(){ openAuth('login'); });
  area.appendChild(button);
}
`;

function hardenHtml(html) {
  if (html.includes(`// ${MARKER}`)) return html;
  const start = html.indexOf(START);
  const end = html.indexOf(END, start + START.length);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('P6.31 identity hardening could not locate updateNavForUser block');
  }
  const original = html.slice(start, end);
  if (!original.includes('area.innerHTML=`<button class="user-btn" onclick="toggleDropdown()"')) {
    throw new Error('P6.31 expected raw currentUser identity innerHTML sink');
  }
  if (!original.includes('${currentUser.name}')) {
    throw new Error('P6.31 expected currentUser.name interpolation');
  }
  const output = html.slice(0, start) + HARDENED + html.slice(end);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const start = html.indexOf(`// ${MARKER}`);
  const end = html.indexOf(END, start);
  if (start < 0 || end < 0) throw new Error('P6.31 hardened identity block missing');
  const block = html.slice(start, end);
  if (block.includes('area.innerHTML')) throw new Error('P6.31 auth nav innerHTML remains');
  if (block.includes('${currentUser.name}')) throw new Error('P6.31 raw currentUser.name interpolation remains');
  for (const required of ['area.replaceChildren()', 'document.createElement(\'button\')', 'avatar.textContent', 'label.textContent', 'button.addEventListener']) {
    if (!block.includes(required)) throw new Error(`P6.31 missing ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_31_USER_IDENTITY_DOM_TRUST_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
