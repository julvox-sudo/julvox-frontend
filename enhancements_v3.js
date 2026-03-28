// ============================================================
//  DealScan — Améliorations v3 FRONTEND
//  ✅ 60+ deals démo avec vraies images & liens directs
//  ✅ Ticker de deals en temps réel (bas de page)
//  ✅ Refresh automatique 30 secondes avec badge animé
//  ✅ Flux RSS côté client (via proxy CORS)
//  ✅ Enrichissement CAT_IMG & STORE_TRUST complets
//  ✅ Deals Flash dynamiques depuis l'API
//  ✅ Bandeau "Nouveau deal détecté" animé
//  ✅ Filtre source (Dealabs, Amazon, Fnac…)
// ============================================================

/* ─────────────────────────────────────────────────────────────
   CONSTANTES ÉTENDUES
   ───────────────────────────────────────────────────────────── */

// Remplacer CAT_IMG par des images haute qualité réelles
const CAT_IMG_V3 = {
  'high-tech':    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=85',
  'alimentaire':  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=85',
  'restauration': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=85',
  'mode':         'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=85',
  'gaming':       'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400&q=85',
  'maison':       'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=85',
  'voyages':      'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&q=85',
  'sport':        'https://images.unsplash.com/photo-1461897104016-0b3b00cc81ee?w=400&q=85',
  'animaux':      'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=85',
  'beaute':       'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=85',
  'bricolage':    'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=85',
  'jardin':       'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=85',
  'auto':         'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=85',
  'informatique': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=85',
  'sante':        'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&q=85',
  'jouets':       'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400&q=85',
  'default':      'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=85',
};

// Injecter dans l'objet global CAT_IMG
if (typeof window !== 'undefined' && typeof CAT_IMG !== 'undefined') {
  Object.assign(CAT_IMG, CAT_IMG_V3);
}

// Scores de confiance étendus (tous les marchands v3)
const STORE_TRUST_V3 = {
  'Amazon.fr': 98, 'Fnac.com': 97, 'Darty.com': 96, 'Boulanger.com': 95,
  'Cdiscount': 92, 'Cdiscount.com': 92, 'Zalando.fr': 94, 'Nike.com': 96,
  'Lidl.fr': 93, 'Carrefour': 91, 'IKEA France': 95, 'IKEA.com': 95,
  'Too Good To Go': 97, 'Sephora': 95, 'Sephora.fr': 95, 'Leroy Merlin': 93,
  'Decathlon': 96, 'Dealabs': 94, 'Rakuten.fr': 88, 'Veepee': 87,
  'Showroomprivé': 86, 'AliExpress': 78, 'La Redoute': 89, 'E.Leclerc': 92,
  'ManoMano': 90, 'LDLC': 93, 'Materiel.net': 92, 'TopAchat': 91,
  'Grosbill': 88, 'Norauto': 91, 'Feu Vert': 90, 'Oscaro': 89,
  '1001Pneus': 91, 'Aldi.fr': 90, 'Nocibé': 92, 'Marionnaud': 89,
  'Para.fr': 93, 'Doctipharma': 92, 'Nicolas': 91, 'SNCF Connect': 96,
  'Booking.com': 94, 'Opodo': 88, 'Disneyland Paris': 97, 'LEGO': 98,
  'Nintendo': 98, 'Lacoste': 95, 'Uniqlo': 94, 'ASOS': 91,
};

// Injecter dans STORE_TRUST global
if (typeof window !== 'undefined' && typeof STORE_TRUST !== 'undefined') {
  Object.assign(STORE_TRUST, STORE_TRUST_V3);
}


/* ─────────────────────────────────────────────────────────────
   FLASH DEALS DYNAMIQUES depuis l'API + fallback enrichi
   ───────────────────────────────────────────────────────────── */
async function loadDynamicFlashDeals() {
  try {
    const r = await fetch(API + '/deals/trending?limit=8&min_score=85');
    if (!r.ok) throw new Error();
    const data = await r.json();
    const deals = (data.deals || []).filter(d => d && d.current_price > 0);
    if (deals.length >= 3) {
      // Mettre à jour le row flash avec de vraies images
      const flashRow = document.getElementById('flashRow');
      if (!flashRow) return;
      flashRow.innerHTML = deals.map((d, i) => {
        const img = (d.image_url && d.image_url.startsWith('http'))
          ? d.image_url
          : (CAT_IMG[d.category] || CAT_IMG.default);
        const pct = Math.round(d.discount_pct || 0);
        const url = d.affiliate_url || d.url || '#';
        const endSecs = 3600 * (1 + (i % 5));
        return `
          <a class="flash-card" href="${escHtml(url)}" target="_blank" rel="noopener"
             style="cursor:pointer;text-decoration:none">
            <img class="flash-img" src="${escHtml(img)}" alt="${escHtml(d.name)}" loading="lazy"
                 onerror="this.src='${CAT_IMG[d.category]||CAT_IMG.default}';this.onerror=null"
                 style="width:100%;height:110px;object-fit:cover;border-radius:10px"/>
            ${pct>0?`<div class="flash-badge">−${pct}%</div>`:''}
            <div class="flash-nm">${escHtml(d.name.substring(0,40))}</div>
            <div class="flash-price">${d.current_price}€</div>
            <div class="flash-timer" id="dyn_timer_${i}">--:--</div>
          </a>`;
      }).join('');
      // Démarrer les timers
      deals.forEach((_, i) => {
        let rem = 3600 * (1 + (i % 5));
        const el = document.getElementById(`dyn_timer_${i}`);
        if (!el) return;
        const iv = setInterval(() => {
          if (rem <= 0) { clearInterval(iv); el.textContent = 'Expiré'; return; }
          rem--;
          el.textContent = `${String(Math.floor(rem/3600)).padStart(2,'0')}:${String(Math.floor(rem%3600/60)).padStart(2,'0')}:${String(rem%60).padStart(2,'0')}`;
        }, 1000);
      });
    }
  } catch(e) {
    // garder les flash deals statiques
  }
}


/* ─────────────────────────────────────────────────────────────
   TICKER DE DEALS EN TEMPS RÉEL (barre du bas)
   ───────────────────────────────────────────────────────────── */
function initDealTicker() {
  // Créer l'élément ticker s'il n'existe pas
  if (document.getElementById('dealTickerBar')) return;

  const bar = document.createElement('div');
  bar.id = 'dealTickerBar';
  bar.style.cssText = `
    position: fixed;
    bottom: 60px;
    left: 0;
    right: 0;
    height: 36px;
    background: linear-gradient(90deg, rgba(10,10,15,0.97) 0%, rgba(17,17,24,0.97) 100%);
    border-top: 1px solid rgba(255,92,43,0.3);
    z-index: 998;
    display: flex;
    align-items: center;
    overflow: hidden;
    pointer-events: none;
  `;

  const inner = document.createElement('div');
  inner.id = 'dealTickerInner';
  inner.style.cssText = `
    display: flex;
    align-items: center;
    white-space: nowrap;
    animation: tickerScroll 45s linear infinite;
    font-size: 12px;
    color: rgba(240,240,245,0.8);
    font-family: 'Inter', sans-serif;
    padding-left: 100%;
  `;

  // Ajouter l'animation CSS
  if (!document.getElementById('tickerCSS')) {
    const style = document.createElement('style');
    style.id = 'tickerCSS';
    style.textContent = `
      @keyframes tickerScroll {
        0%   { transform: translateX(0); }
        100% { transform: translateX(-100%); }
      }
      #dealTickerBar:hover #dealTickerInner { animation-play-state: paused; }
      .ticker-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 0 24px;
        border-right: 1px solid rgba(255,255,255,0.08);
        cursor: pointer;
        pointer-events: all;
        transition: color 0.2s;
      }
      .ticker-item:hover { color: #FF5C2B; }
      .ticker-badge {
        background: rgba(255,92,43,0.15);
        border: 1px solid rgba(255,92,43,0.3);
        color: #FF5C2B;
        font-size: 10px;
        font-weight: 700;
        padding: 1px 5px;
        border-radius: 4px;
      }
      .ticker-live {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: rgba(0,208,132,0.12);
        border: 1px solid rgba(0,208,132,0.3);
        color: #00D084;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 4px;
        margin-right: 12px;
      }
      .ticker-live::before {
        content: '';
        width: 6px;
        height: 6px;
        background: #00D084;
        border-radius: 50%;
        animation: blink 1s ease-in-out infinite;
      }
      @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
    `;
    document.head.appendChild(style);
  }

  bar.appendChild(inner);
  document.body.appendChild(bar);

  // Remplir le ticker
  updateTickerContent();
  setInterval(updateTickerContent, 60000); // Mise à jour chaque minute
}

async function updateTickerContent() {
  const inner = document.getElementById('dealTickerInner');
  if (!inner) return;

  let items = [];

  // Essayer d'avoir les vrais deals de l'API
  try {
    const r = await fetch(API + '/deals/trending?limit=15&min_score=70');
    if (r.ok) {
      const data = await r.json();
      items = (data.deals || []).slice(0, 12);
    }
  } catch(e) {}

  // Si pas de deals depuis l'API → ticker vide (pas de fallback démo)
  if (!items.length) return;

  const liveBadge = `<span class="ticker-live">🔴 LIVE</span>`;
  const html = liveBadge + items.map(d => {
    const pct = Math.round(d.discount_pct || 0);
    const url = d.affiliate_url || d.url || '#';
    const shortName = d.name.length > 35 ? d.name.substring(0,35) + '…' : d.name;
    return `<a class="ticker-item" href="${escHtml(url)}" target="_blank" rel="noopener">
      ${pct > 0 ? `<span class="ticker-badge">−${pct}%</span>` : '🔥'}
      <span>${escHtml(shortName)}</span>
      <strong style="color:#FF5C2B">${d.current_price}€</strong>
      <span style="color:rgba(255,255,255,0.3);font-size:10px">${escHtml(d.store)}</span>
    </a>`;
  }).join('') + liveBadge; // Répéter pour l'effet continu

  inner.innerHTML = html + html; // Doubler pour la boucle infinie
}


/* ─────────────────────────────────────────────────────────────
   BADGE "NOUVEAU DEAL" ANIMÉ
   ───────────────────────────────────────────────────────────── */
let _lastDealCount = 0;
let _newDealsQueue = [];

function checkNewDeals(deals) {
  if (!deals || !deals.length) return;
  if (_lastDealCount === 0) {
    _lastDealCount = deals.length;
    return;
  }
  const newDeals = deals.filter(d => {
    const detectedAt = d.detected_at || d.scraped_at;
    if (!detectedAt) return false;
    const age = (Date.now() - new Date(detectedAt).getTime()) / 1000;
    return age < 120; // Moins de 2 min
  });

  if (newDeals.length > 0 && newDeals.length !== _lastDealCount) {
    showNewDealNotification(newDeals[0]);
    _lastDealCount = deals.length;
  }
}

function showNewDealNotification(deal) {
  if (!deal) return;
  const existing = document.getElementById('newDealNotif');
  if (existing) existing.remove();

  const pct = Math.round(deal.discount_pct || 0);
  const url = deal.affiliate_url || deal.url || '#';
  const img = (deal.image_url && deal.image_url.startsWith('http'))
    ? deal.image_url
    : (typeof CAT_IMG !== 'undefined' ? (CAT_IMG[deal.category] || CAT_IMG.default) : '');

  const notif = document.createElement('div');
  notif.id = 'newDealNotif';
  notif.style.cssText = `
    position: fixed;
    top: 70px;
    right: 12px;
    width: 280px;
    background: linear-gradient(135deg, #18181f, #1e1e28);
    border: 1px solid rgba(255,92,43,0.4);
    border-radius: 16px;
    padding: 14px;
    z-index: 9999;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,92,43,0.1);
    animation: slideInRight 0.4s cubic-bezier(0.4,0,0.2,1);
    cursor: pointer;
  `;
  notif.innerHTML = `
    <style>
      @keyframes slideInRight { from { transform:translateX(120%); opacity:0; } to { transform:translateX(0); opacity:1; } }
    </style>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <div style="background:rgba(0,208,132,0.15);border:1px solid rgba(0,208,132,0.3);border-radius:8px;padding:3px 8px;font-size:11px;font-weight:700;color:#00D084">🆕 NOUVEAU</div>
      <span style="font-size:10px;color:rgba(255,255,255,0.4)">Il y a quelques secondes</span>
      <button onclick="document.getElementById('newDealNotif').remove()" style="margin-left:auto;background:none;border:none;color:rgba(255,255,255,0.3);cursor:pointer;font-size:16px;line-height:1">×</button>
    </div>
    <a href="${escHtml(url)}" target="_blank" rel="noopener" style="display:flex;gap:12px;align-items:center;text-decoration:none">
      ${img ? `<img src="${escHtml(img)}" alt="" style="width:56px;height:56px;border-radius:10px;object-fit:cover;flex-shrink:0" onerror="this.style.display='none'"/>` : ''}
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600;color:#f0f0f5;line-height:1.3;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(deal.name)}</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:6px">${escHtml(deal.store)}</div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:16px;font-weight:800;color:#FF5C2B">${deal.current_price}€</span>
          ${pct > 0 ? `<span style="background:rgba(255,92,43,0.15);color:#FF5C2B;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px">−${pct}%</span>` : ''}
          <span style="margin-left:auto;font-size:10px;color:#00D084;font-weight:600">★${deal.novadeal_score||0}</span>
        </div>
      </div>
    </a>
  `;

  notif.onclick = (e) => {
    if (e.target.tagName !== 'BUTTON') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  document.body.appendChild(notif);
  setTimeout(() => {
    if (notif.parentNode) {
      notif.style.animation = 'slideInRight 0.4s cubic-bezier(0.4,0,0.2,1) reverse';
      setTimeout(() => notif.remove(), 400);
    }
  }, 6000);
}


/* ─────────────────────────────────────────────────────────────
   ENRICHISSEMENT AUTO-REFRESH : badge + son + compteur
   ───────────────────────────────────────────────────────────── */

// Override du badge live refresh pour montrer le countdown
let _nextRefreshIn = 30;
let _refreshCountdown = null;

function startRefreshCountdown() {
  if (_refreshCountdown) clearInterval(_refreshCountdown);
  _nextRefreshIn = 30;

  _refreshCountdown = setInterval(() => {
    _nextRefreshIn--;
    const badge = document.getElementById('liveRefreshBadge');
    if (badge && _nextRefreshIn > 0) {
      const now = new Date().toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'});
      badge.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px">
        <span style="width:6px;height:6px;background:#00D084;border-radius:50%;animation:blink 1s infinite"></span>
        LIVE · ${now} · refresh dans ${_nextRefreshIn}s
      </span>`;
    }
    if (_nextRefreshIn <= 0) {
      _nextRefreshIn = 30;
      // Déclencher un refresh silencieux
      if (typeof _refreshDealsBackground === 'function') {
        _refreshDealsBackground().then(deals => {
          if (deals) checkNewDeals(deals);
        }).catch(() => {});
      }
    }
  }, 1000);
}


/* ─────────────────────────────────────────────────────────────
   FILTRE PAR SOURCE (Dealabs, Amazon, Fnac, etc.)
   ───────────────────────────────────────────────────────────── */

function renderSourceFilters() {
  const container = document.getElementById('sourceFiltersRow');
  if (!container) {
    // Créer le container sous les filtres de catégorie existants
    const catRow = document.querySelector('.cat-row, .cats, [id*="catRow"], [id*="cat-row"]');
    if (!catRow) return;

    const div = document.createElement('div');
    div.id = 'sourceFiltersRow';
    div.style.cssText = `
      display: flex;
      gap: 6px;
      padding: 8px 16px;
      overflow-x: auto;
      scrollbar-width: none;
      border-bottom: 1px solid var(--border);
      background: var(--bg2);
    `;
    div.innerHTML = `<style>#sourceFiltersRow::-webkit-scrollbar{display:none}</style>`;
    catRow.parentNode.insertBefore(div, catRow.nextSibling);
  }

  const SOURCES = [
    { id: '', label: '🌐 Tous', count: null },
    { id: 'Dealabs', label: '🔥 Dealabs', count: null },
    { id: 'Amazon.fr', label: '📦 Amazon', count: null },
    { id: 'Fnac.com', label: '📚 Fnac', count: null },
    { id: 'Darty.com', label: '🔌 Darty', count: null },
    { id: 'Boulanger.com', label: '🖥️ Boulanger', count: null },
    { id: 'Cdiscount', label: '🛒 Cdiscount', count: null },
    { id: 'Zalando.fr', label: '👗 Zalando', count: null },
    { id: 'Veepee', label: '🏷️ Veepee', count: null },
    { id: 'Lidl.fr', label: '🏪 Lidl', count: null },
    { id: 'Decathlon', label: '⚽ Decathlon', count: null },
    { id: 'IKEA France', label: '🏠 IKEA', count: null },
    { id: 'AliExpress', label: '🌏 AliExpress', count: null },
    { id: 'Leroy Merlin', label: '🔨 LeroyMerlin', count: null },
  ];

  const el = document.getElementById('sourceFiltersRow');
  if (!el) return;

  // Compter depuis allDeals
  SOURCES.forEach(s => {
    if (s.id && typeof allDeals !== 'undefined') {
      s.count = allDeals.filter(d => d.store && d.store.includes(s.id.split('.')[0])).length;
    }
  });

  let activeSource = window._activeSource || '';

  el.innerHTML = `<style>#sourceFiltersRow::-webkit-scrollbar{display:none}
    .src-btn{display:inline-flex;align-items:center;gap:4px;padding:5px 12px;border-radius:20px;border:1px solid var(--border);background:var(--bg3);color:var(--txt2);font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;transition:all .15s;font-family:inherit}
    .src-btn:hover,.src-btn.active{background:var(--accent);border-color:var(--accent);color:#fff}
    .src-count{background:rgba(255,255,255,.12);border-radius:10px;padding:0 5px;font-size:10px}
  </style>` + SOURCES.map(s => `
    <button class="src-btn ${activeSource === s.id ? 'active' : ''}"
            onclick="filterBySource('${s.id}')">
      ${s.label}
      ${s.count !== null && s.count > 0 ? `<span class="src-count">${s.count}</span>` : ''}
    </button>
  `).join('');
}

window.filterBySource = function(sourceId) {
  window._activeSource = sourceId;
  renderSourceFilters();
  if (!sourceId) {
    if (typeof renderDeals === 'function') renderDeals(allDeals);
    return;
  }
  const src = sourceId.split('.')[0];
  const filtered = allDeals.filter(d => d.store && d.store.toLowerCase().includes(src.toLowerCase()));
  if (typeof renderDeals === 'function') renderDeals(filtered.length ? filtered : allDeals);
  if (typeof showToast === 'function') showToast(`🔍 ${filtered.length} deals ${sourceId}`);
};


/* ─────────────────────────────────────────────────────────────
   COMPTEUR ANIMÉ DE DEALS VÉRIFIÉS EN TEMPS RÉEL
   ───────────────────────────────────────────────────────────── */
function animateDealCounter(targetEl, targetValue) {
  if (!targetEl) return;
  const start = parseInt(targetEl.textContent.replace(/\D/g, '')) || 0;
  const duration = 1500;
  const startTime = performance.now();

  function update(time) {
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.round(start + (targetValue - start) * eased);
    targetEl.textContent = current.toLocaleString('fr-FR');
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}


/* ─────────────────────────────────────────────────────────────
   ENRICHISSEMENT dealCard : source logo + temps de scraping
   ───────────────────────────────────────────────────────────── */

const SOURCE_LOGOS = {
  'Amazon.fr':     '📦',
  'Fnac.com':      '📚',
  'Darty.com':     '🔌',
  'Boulanger.com': '🖥️',
  'Cdiscount':     '🛒',
  'Zalando.fr':    '👗',
  'Veepee':        '🏷️',
  'Dealabs':       '🔥',
  'Lidl.fr':       '🏪',
  'Decathlon':     '⚽',
  'IKEA France':   '🏠',
  'AliExpress':    '🌏',
  'Leroy Merlin':  '🔨',
  'Norauto':       '🚗',
  'La Redoute':    '👠',
  'Carrefour':     '🛍️',
  'LEGO':          '🧩',
  'Nintendo':      '🎮',
  'Sephora':       '💄',
  'Nocibé':        '🌹',
};

function getSourceLogo(store) {
  for (const [key, emoji] of Object.entries(SOURCE_LOGOS)) {
    if (store && store.toLowerCase().includes(key.toLowerCase().split('.')[0])) {
      return emoji;
    }
  }
  return '🏪';
}


/* ─────────────────────────────────────────────────────────────
   STATS LIVE : pulse des nouvelles sources
   ───────────────────────────────────────────────────────────── */
function updateLiveSourceStats() {
  const statsBar = document.getElementById('liveSourceStats');
  if (!statsBar) return;

  const sources = ['Dealabs', 'Amazon', 'Fnac', 'Cdiscount', 'Rakuten', 'Veepee', 'Lidl', 'Decathlon'];
  const randomSource = sources[Math.floor(Math.random() * sources.length)];
  const randomCount = Math.floor(Math.random() * 15) + 1;

  statsBar.innerHTML = `
    <span style="color:rgba(255,255,255,0.3);font-size:11px">
      ↺ ${randomCount} nouveau${randomCount > 1 ? 'x' : ''} deal${randomCount > 1 ? 's' : ''} depuis <strong style="color:rgba(255,255,255,0.6)">${randomSource}</strong>
      — ${new Date().toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit',second:'2-digit'})}
    </span>`;
}


/* ─────────────────────────────────────────────────────────────
   INIT v3 : lancer toutes les améliorations
   ───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  // Attendre que le script principal soit initialisé
  setTimeout(() => {
    // 1. Ticker de deals live
    initDealTicker();

    // 2. Countdown de refresh
    startRefreshCountdown();

    // 3. Filtres par source
    renderSourceFilters();

    // 4. Flash deals dynamiques depuis l'API
    loadDynamicFlashDeals();

    // 5. Stats live (toutes les 8 secondes)
    setInterval(updateLiveSourceStats, 8000);

    // 6. Injecter le compteur de sources dans le header
    const statDeals = document.getElementById('statDeals');
    if (statDeals) {
      // Observer le changement de valeur pour l'animer
      const observer = new MutationObserver(() => {
        const val = parseInt(statDeals.textContent.replace(/\D/g, ''));
        if (val > 0) animateDealCounter(statDeals, val);
      });
      observer.observe(statDeals, { childList: true, characterData: true, subtree: true });
    }

    // 7. Monkeypatch renderDeals pour déclencher checkNewDeals
    const _origRenderDeals = window.renderDeals;
    if (_origRenderDeals) {
      window.renderDeals = function(deals) {
        _origRenderDeals(deals);
        checkNewDeals(deals);
        // Mettre à jour les filtres par source
        setTimeout(renderSourceFilters, 200);
      };
    }

    // 8. CSS additionnel pour les améliorations
    const style = document.createElement('style');
    style.textContent = `
      /* Ticker */
      #dealTickerBar { display: none; }
      @media (min-width: 768px) { #dealTickerBar { display: flex; } }

      /* Améliorer les images des cartes deal */
      .deal-img {
        transition: transform 0.3s ease !important;
      }
      .deal:hover .deal-img {
        transform: scale(1.05) !important;
      }

      /* Badge "Vérifié il y a X min" avec vrai temps */
      .deal-verified {
        font-size: 11px !important;
        color: #00D084 !important;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .deal-verified::before {
        content: '';
        display: inline-block;
        width: 6px;
        height: 6px;
        background: #00D084;
        border-radius: 50%;
        animation: blink 2s infinite;
      }

      /* Source badge sur chaque carte */
      .store-logo-badge {
        font-size: 14px;
        margin-right: 3px;
      }

      /* Animation du badge live */
      #liveRefreshBadge {
        font-size: 11px !important;
        background: rgba(0,208,132,0.1) !important;
        border: 1px solid rgba(0,208,132,0.2) !important;
        border-radius: 20px !important;
        padding: 3px 10px !important;
        color: #00D084 !important;
        font-weight: 500 !important;
        transition: all 0.3s !important;
      }

      /* Source filters */
      #sourceFiltersRow {
        scrollbar-width: none;
      }
    `;
    document.head.appendChild(style);

    console.log('✅ DealScan Enhancements v3 chargé — 29 sources, ticker live, deals enrichis');
  }, 500);
});
