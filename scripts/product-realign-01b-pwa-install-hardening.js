const RUNTIME_MARKER = 'product-realign-01b-pwa-install-hardening-v1';
const INSTALL_STATE_KEY = 'julvox:pwa:installed:v1';

const PWA_INSTALL_RUNTIME = `
<script id="${RUNTIME_MARKER}">
(function productRealign01BPwaInstallHardening(){
  'use strict';
  var INSTALL_STATE_KEY = '${INSTALL_STATE_KEY}';

  function readInstalledState() {
    try { return localStorage.getItem(INSTALL_STATE_KEY) === '1'; }
    catch (_) { return false; }
  }

  function writeInstalledState(installed) {
    try {
      if (installed) localStorage.setItem(INSTALL_STATE_KEY, '1');
      else localStorage.removeItem(INSTALL_STATE_KEY);
    } catch (_) {}
  }

  function isStandaloneContext() {
    var displayModeStandalone = !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    var iosStandalone = typeof navigator !== 'undefined' && navigator.standalone === true;
    return displayModeStandalone || iosStandalone;
  }

  function isKnownInstalled() {
    return isStandaloneContext() || readInstalledState();
  }

  function hideInstallUi() {
    var prompt = document.getElementById('installPrompt');
    if (prompt) {
      prompt.classList.remove('show');
      prompt.setAttribute('aria-hidden', 'true');
    }
    var badge = document.getElementById('pwaInstallBadge');
    if (badge && isKnownInstalled()) {
      badge.textContent = '✅ Installé';
      badge.style.color = 'var(--green)';
    }
  }

  function markInstalled() {
    writeInstalledState(true);
    hideInstallUi();
  }

  function hasDeferredInstallPrompt() {
    try { return typeof deferredInstallPrompt !== 'undefined' && !!deferredInstallPrompt; }
    catch (_) { return false; }
  }

  var legacyShowInstallPrompt = window.showInstallPrompt;
  if (typeof legacyShowInstallPrompt === 'function') {
    window.showInstallPrompt = function(fromButton) {
      if (isKnownInstalled()) {
        markInstalled();
        if (fromButton === true && typeof window.showToast === 'function') {
          window.showToast('✅ Julvox est déjà installé.');
        }
        return;
      }
      if (fromButton !== true && !hasDeferredInstallPrompt()) {
        hideInstallUi();
        return;
      }
      return legacyShowInstallPrompt.apply(this, arguments);
    };
  }

  if (isStandaloneContext()) markInstalled();
  else hideInstallUi();

  window.addEventListener('appinstalled', markInstalled);
  window.addEventListener('beforeinstallprompt', function(){
    if (!isStandaloneContext()) writeInstalledState(false);
  });

  if (window.matchMedia) {
    var displayMode = window.matchMedia('(display-mode: standalone)');
    if (displayMode && typeof displayMode.addEventListener === 'function') {
      displayMode.addEventListener('change', function(event){ if (event.matches) markInstalled(); });
    }
  }
})();
</script>`;

function applyPwaInstallHardening(input) {
  const html = String(input);
  if (html.includes(`id="${RUNTIME_MARKER}"`)) return html;
  const bodyEnd = html.lastIndexOf('</body>');
  if (bodyEnd < 0) throw new Error('PWA install hardening failed: closing body tag is missing');
  return `${html.slice(0, bodyEnd)}${PWA_INSTALL_RUNTIME}\n${html.slice(bodyEnd)}`;
}

module.exports = {
  INSTALL_STATE_KEY,
  PWA_INSTALL_RUNTIME,
  RUNTIME_MARKER,
  applyPwaInstallHardening,
};
