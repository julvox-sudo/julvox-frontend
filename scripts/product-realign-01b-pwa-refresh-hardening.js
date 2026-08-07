const APP_SHELL_URL = '/index.html';
const OFFLINE_SHELL_FALLBACK_HTML = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#FCF9F4">
<title>Julvox — hors ligne</title>
<style>
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#FCF9F4;color:#0B1D34;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{min-height:100vh;padding-bottom:calc(76px + env(safe-area-inset-bottom));background:linear-gradient(145deg,#fffdfa 0%,#fbf7f0 58%,#f4ece1 100%)}button,textarea{font:inherit}.top{height:72px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid rgba(11,29,52,.1);background:rgba(255,253,249,.96);position:sticky;top:0;z-index:20}.brand-logo{display:block;width:118px;height:auto;max-height:48px;object-fit:contain;object-position:left center}.menu-btn,.secondary-btn,.retry-btn,.save-btn{border:1px solid rgba(11,29,52,.12);background:#fff;border-radius:13px;color:#0B1D34;font-weight:700;min-height:44px;padding:0 15px}.main{width:min(760px,100%);margin:0 auto;padding:28px 18px 34px}.view[hidden]{display:none!important}.card{padding:30px 22px;border:1px solid rgba(11,29,52,.1);border-radius:26px;background:#fffdf9;box-shadow:0 18px 50px rgba(43,34,23,.08)}.status{display:inline-block;margin-bottom:16px;padding:8px 12px;border-radius:999px;background:#e7f3ef;color:#0b6764;font-size:13px;font-weight:750}.title{margin:0 0 14px;font-family:Georgia,"Times New Roman",serif;font-size:clamp(38px,10vw,62px);line-height:1.03;font-weight:500;color:#0d3b37;letter-spacing:-1.2px}.section-title{margin:0 0 8px;font-size:26px;line-height:1.15;color:#0B1D34}.copy{margin:0;color:#52616b;font-size:16px;line-height:1.55}.composer{display:grid;gap:10px;margin-top:22px;text-align:left}.composer label{font-weight:700;color:#243847}.composer textarea{width:100%;min-height:110px;resize:vertical;border:1px solid rgba(11,29,52,.14);border-radius:17px;padding:14px;background:#fff;color:#0B1D34;outline:none}.composer textarea:focus{border-color:#0EA7A1;box-shadow:0 0 0 3px rgba(14,167,161,.12)}.save-btn{background:#0b6764;color:#fff;border-color:#0b6764}.save-btn:active,.nav button:active,.menu-btn:active,.secondary-btn:active,.retry-btn:active{transform:scale(.98)}.message{min-height:22px;margin-top:10px;color:#0b6764;font-size:13px;font-weight:650}.list{display:grid;gap:12px;margin-top:18px}.conversation{padding:16px;border:1px solid rgba(11,29,52,.1);border-radius:17px;background:#fff}.conversation strong{display:block;color:#0B1D34;margin-bottom:6px}.conversation span{display:block;color:#60707c;font-size:13px;line-height:1.45}.empty{padding:18px;border:1px dashed rgba(11,29,52,.16);border-radius:17px;color:#60707c;background:rgba(255,255,255,.5);line-height:1.5}.actions{display:grid;gap:10px;margin-top:20px}.offline-note{margin-top:18px;padding:14px 16px;border-radius:15px;background:#eef6f3;color:#315b59;line-height:1.5}.nav{position:fixed;z-index:30;left:0;right:0;bottom:0;display:grid;grid-template-columns:repeat(3,1fr);min-height:68px;padding-bottom:env(safe-area-inset-bottom);border-top:1px solid rgba(11,29,52,.1);background:rgba(255,253,249,.98);backdrop-filter:blur(18px)}.nav button{border:0;background:transparent;color:#52616b;font-size:12px;font-weight:700;display:grid;place-items:center;align-content:center;gap:5px;padding:8px 4px;min-height:68px}.nav button[aria-current="page"]{color:#0b6764;background:rgba(14,167,161,.07)}.nav-icon{font-size:20px;line-height:1}.sheet{position:fixed;z-index:40;inset:0;background:rgba(11,29,52,.24);display:flex;align-items:flex-start;justify-content:flex-end;padding:82px 14px 90px}.sheet[hidden]{display:none}.sheet-card{width:min(320px,calc(100vw - 28px));display:grid;gap:8px;padding:10px;border-radius:20px;background:#fffdf9;box-shadow:0 20px 60px rgba(11,29,52,.18)}.sheet-card button{text-align:left}.small{font-size:13px;color:#697780;line-height:1.5;margin-top:10px}@media(max-width:520px){.main{padding-top:22px}.card{padding:26px 18px}.brand-logo{width:110px}.title{font-size:44px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
</style>
</head>
<body>
<header class="top">
  <img class="brand-logo" src="/brand/julvox-logo-horizontal.svg" alt="Julvox" width="1200" height="400">
  <button class="menu-btn" id="offlineMenuButton" type="button" aria-expanded="false" aria-controls="offlineMenu">Menu</button>
</header>
<main class="main">
  <section class="view" data-offline-view="home">
    <div class="card">
      <div class="status">Mode hors ligne</div>
      <h1 class="title">Que veux-tu décider aujourd’hui&nbsp;?</h1>
      <p class="copy">Tu peux continuer à préparer ta réflexion. Julvox enregistrera ton besoin sur cet appareil et tu pourras reprendre avec l’assistant dès la reconnexion.</p>
      <form class="composer" id="offlineDraftForm">
        <label for="offlineDraft">Ce que tu veux décider</label>
        <textarea id="offlineDraft" maxlength="800" placeholder="Décris ton besoin, ton achat ou ce qui te fait hésiter…"></textarea>
        <button class="save-btn" type="submit">Enregistrer pour plus tard</button>
      </form>
      <div class="message" id="offlineDraftStatus" role="status" aria-live="polite"></div>
    </div>
  </section>

  <section class="view" data-offline-view="conversations" hidden>
    <div class="card">
      <div class="status">Disponible sur cet appareil</div>
      <h1 class="section-title">Conversations</h1>
      <p class="copy">Tes deux réflexions les plus récentes enregistrées localement restent consultables hors ligne.</p>
      <div class="list" id="offlineConversationList"></div>
    </div>
  </section>

  <section class="view" data-offline-view="decisions" hidden>
    <div class="card">
      <div class="status">Mode hors ligne</div>
      <h1 class="section-title">Mes décisions</h1>
      <p class="copy">Les décisions qui nécessitent des données synchronisées ne sont pas téléchargées dans ce shell de secours.</p>
      <div class="offline-note">Tu peux néanmoins enregistrer une nouvelle réflexion depuis l’accueil. Elle sera disponible dans Conversations puis pourra être reprise avec Julvox après reconnexion.</div>
      <div class="actions"><button class="secondary-btn" type="button" data-offline-target="home">Préparer une réflexion</button><button class="retry-btn" type="button" data-offline-retry>Réessayer la connexion</button></div>
    </div>
  </section>

  <section class="view" data-offline-view="info" hidden>
    <div class="card">
      <div class="status">Aide / Informations</div>
      <h1 class="section-title">Julvox hors ligne</h1>
      <p class="copy">Le mode hors ligne garde l’interface essentielle accessible sans prétendre disposer des informations réseau. Tu peux naviguer, relire les conversations locales et enregistrer un besoin à reprendre plus tard.</p>
      <div class="actions"><button class="retry-btn" type="button" data-offline-retry>Réessayer la connexion</button></div>
    </div>
  </section>

  <section class="view" data-offline-view="settings" hidden>
    <div class="card">
      <div class="status">Paramètres utilisateur</div>
      <h1 class="section-title">État de l’application</h1>
      <p class="copy">Connexion réseau&nbsp;: indisponible. Stockage local&nbsp;: utilisé uniquement pour les réflexions enregistrées sur cet appareil.</p>
      <div class="actions"><button class="retry-btn" type="button" data-offline-retry>Réessayer la connexion</button></div>
    </div>
  </section>
</main>

<div class="sheet" id="offlineMenu" hidden aria-hidden="true">
  <div class="sheet-card" role="dialog" aria-modal="true" aria-label="Menu Julvox hors ligne">
    <button class="secondary-btn" type="button" data-offline-target="info">Aide / Informations</button>
    <button class="secondary-btn" type="button" data-offline-target="settings">Paramètres utilisateur</button>
    <button class="retry-btn" type="button" data-offline-retry>Réessayer la connexion</button>
  </div>
</div>

<nav class="nav" aria-label="Navigation Julvox">
  <button type="button" data-offline-target="home" aria-current="page"><span class="nav-icon" aria-hidden="true">⌂</span><span>Accueil</span></button>
  <button type="button" data-offline-target="conversations"><span class="nav-icon" aria-hidden="true">□</span><span>Conversations</span></button>
  <button type="button" data-offline-target="decisions"><span class="nav-icon" aria-hidden="true">✓</span><span>Mes décisions</span></button>
</nav>

<script>
(function(){
  'use strict';
  var STORAGE_KEY = 'julvox:decision-home:conversations:v1';
  var MAX_CONVERSATIONS = 2;
  var menu = document.getElementById('offlineMenu');
  var menuButton = document.getElementById('offlineMenuButton');

  function clean(value, limit) {
    return String(value == null ? '' : value).replace(/\\s+/g, ' ').trim().slice(0, limit || 800);
  }

  function readConversations() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function(item){ return item && clean(item.need, 800); }).slice(0, MAX_CONVERSATIONS);
    } catch (_) { return []; }
  }

  function writeConversations(items) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_CONVERSATIONS))); return true; }
    catch (_) { return false; }
  }

  function renderConversations() {
    var list = document.getElementById('offlineConversationList');
    if (!list) return;
    while (list.firstChild) list.removeChild(list.firstChild);
    var items = readConversations();
    if (!items.length) {
      var empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'Aucune conversation locale pour le moment. Enregistre une réflexion depuis l’accueil.';
      list.appendChild(empty);
      return;
    }
    items.forEach(function(item){
      var card = document.createElement('article');
      card.className = 'conversation';
      var title = document.createElement('strong');
      title.textContent = clean(item.need, 120);
      var detail = document.createElement('span');
      detail.textContent = clean(item.next || item.clarified || 'À reprendre dès la reconnexion.', 180);
      card.appendChild(title);
      card.appendChild(detail);
      list.appendChild(card);
    });
  }

  function closeMenu() {
    if (!menu) return;
    menu.hidden = true;
    menu.setAttribute('aria-hidden', 'true');
    if (menuButton) menuButton.setAttribute('aria-expanded', 'false');
  }

  function openView(target) {
    document.querySelectorAll('[data-offline-view]').forEach(function(section){
      var active = section.getAttribute('data-offline-view') === target;
      section.hidden = !active;
    });
    document.querySelectorAll('.nav [data-offline-target]').forEach(function(button){
      if (button.getAttribute('data-offline-target') === target) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (target === 'conversations') renderConversations();
    closeMenu();
    window.scrollTo(0, 0);
  }

  document.addEventListener('click', function(event){
    var targetButton = event.target.closest('[data-offline-target]');
    if (targetButton) {
      event.preventDefault();
      openView(targetButton.getAttribute('data-offline-target'));
      return;
    }
    var retry = event.target.closest('[data-offline-retry]');
    if (retry) {
      event.preventDefault();
      window.location.reload();
    }
  });

  if (menuButton) {
    menuButton.addEventListener('click', function(){
      var open = menu && menu.hidden;
      if (!menu) return;
      menu.hidden = !open;
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
      menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  if (menu) {
    menu.addEventListener('click', function(event){ if (event.target === menu) closeMenu(); });
  }

  var form = document.getElementById('offlineDraftForm');
  if (form) {
    form.addEventListener('submit', function(event){
      event.preventDefault();
      var input = document.getElementById('offlineDraft');
      var status = document.getElementById('offlineDraftStatus');
      var need = clean(input && input.value, 800);
      if (!need) {
        if (status) status.textContent = 'Décris d’abord ce que tu veux décider.';
        if (input) input.focus();
        return;
      }
      var item = {
        id: 'offline-' + Date.now().toString(36),
        need: need,
        clarified: 'Réflexion enregistrée hors ligne.',
        next: 'Reprendre avec Julvox après reconnexion.',
        updatedAt: new Date().toISOString()
      };
      var items = [item].concat(readConversations().filter(function(existing){ return clean(existing.need, 800) !== need; })).slice(0, MAX_CONVERSATIONS);
      if (writeConversations(items)) {
        if (input) input.value = '';
        if (status) status.textContent = 'Enregistré sur cet appareil. Tu le retrouveras dans Conversations.';
        renderConversations();
      } else if (status) {
        status.textContent = 'Le stockage local est indisponible sur cet appareil.';
      }
    });
  }

  window.addEventListener('online', function(){
    var status = document.getElementById('offlineDraftStatus');
    if (status) status.textContent = 'Connexion retrouvée. Rechargement de Julvox…';
    window.setTimeout(function(){ window.location.reload(); }, 400);
  });

  renderConversations();
})();
</script>
</body>
</html>`;
const CACHE_REVISION_FROM = "const CACHE_REVISION = 'offline-shell-01';";
const CACHE_REVISION_TO = "const CACHE_REVISION = 'offline-shell-04';";

const INSTALL_HANDLER_FROM = `self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});`;

const NAVIGATION_HANDLER_FROM = `  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match('/index.html');
        return cached || new Response('Application indisponible hors ligne.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      })
    );
    return;
  }`;

const RESILIENT_RUNTIME = `const OFFLINE_SHELL_FALLBACK_HTML = ${JSON.stringify(OFFLINE_SHELL_FALLBACK_HTML)};

function offlineShellFallbackResponse() {
  return new Response(OFFLINE_SHELL_FALLBACK_HTML, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

async function precacheStaticShell() {
  const cache = await caches.open(CACHE_STATIC);
  const results = await Promise.allSettled(STATIC_ASSETS.map(async asset => {
    await cache.add(asset);
    return asset;
  }));
  const failures = results
    .map((result, index) => result.status === 'rejected' ? STATIC_ASSETS[index] : null)
    .filter(Boolean);
  if (failures.length) {
    console.warn('[Julvox SW] shell precache partiel; navigation runtime utilisable', failures);
  }
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response?.ok) {
      try {
        const responseUrl = response.url ? new URL(response.url) : null;
        if (!responseUrl || responseUrl.origin === self.location.origin) {
          const cache = await caches.open(CACHE_STATIC);
          await cache.put(APP_SHELL_URL, response.clone());
        }
      } catch (cacheError) {
        console.warn('[Julvox SW] impossible de rafraîchir le shell HTML', cacheError);
      }
    }
    return response;
  } catch (_) {
    const cache = await caches.open(CACHE_STATIC);
    const cached = await cache.match(APP_SHELL_URL)
      || await caches.match(request, { ignoreSearch: true })
      || await caches.match(APP_SHELL_URL, { ignoreSearch: true });
    return cached || offlineShellFallbackResponse();
  }
}

self.addEventListener('install', event => {
  event.waitUntil(
    precacheStaticShell()
      .then(() => self.skipWaiting())
  );
});`;

const NAVIGATION_HANDLER_TO = `  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }`;

function replaceExactlyOnce(source, from, to, label) {
  const first = source.indexOf(from);
  if (first < 0) throw new Error(`PWA refresh hardening failed: ${label} anchor missing`);
  if (source.indexOf(from, first + from.length) >= 0) {
    throw new Error(`PWA refresh hardening failed: ${label} anchor is ambiguous`);
  }
  return `${source.slice(0, first)}${to}${source.slice(first + from.length)}`;
}

function applyOfflineRefreshHardening(input) {
  let source = String(input);
  if (source.includes("const CACHE_REVISION = 'offline-shell-04';") && source.includes('networkFirstNavigation(event.request)')) {
    return source;
  }

  source = replaceExactlyOnce(source, CACHE_REVISION_FROM, CACHE_REVISION_TO, 'cache revision');
  source = replaceExactlyOnce(
    source,
    'const STATIC_ASSETS = [',
    `const APP_SHELL_URL = '${APP_SHELL_URL}';\n\nconst STATIC_ASSETS = [`,
    'app shell declaration',
  );
  source = replaceExactlyOnce(source, INSTALL_HANDLER_FROM, RESILIENT_RUNTIME, 'install handler');
  source = replaceExactlyOnce(source, NAVIGATION_HANDLER_FROM, NAVIGATION_HANDLER_TO, 'navigation handler');
  return source;
}

module.exports = {
  APP_SHELL_URL,
  OFFLINE_SHELL_FALLBACK_HTML,
  applyOfflineRefreshHardening,
};
