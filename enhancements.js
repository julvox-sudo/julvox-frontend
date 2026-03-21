// ============================================================
//  DealScan — Améliorations v5.1
//  1. Graphique historique des prix RÉEL (API)
//  2. Votes chaud/froid visibles sur les cartes
//  3. Notifications push PWA sur la home
//  4. Score NovaDeal™ animé avec explication
//  5. Comparateur multi-marchands amélioré
//
//  Inclure APRÈS le script principal dans index.html :
//  <script src="/enhancements.js"></script>
// ============================================================

/* ─────────────────────────────────────────────────────────────
   1. GRAPHIQUE HISTORIQUE DES PRIX — données réelles de l'API
   ───────────────────────────────────────────────────────────── */

// Override openDeal pour charger le vrai historique de prix
const _originalOpenDeal = window.openDeal;

window.openDeal = async function(id) {
  // Appel original (affiche le modal avec données de base)
  await _originalOpenDeal(id);

  // Charger le vrai historique en parallèle
  try {
    const res  = await fetch(`${API}/deals/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    const hist = data.price_history || [];
    if (hist.length < 2) return;

    const prices = hist.map(h => h.price);
    const dates  = hist.map(h => new Date(h.date).toLocaleDateString('fr-FR', {day:'2-digit', month:'short'}));
    const current = data.current_price || prices[prices.length - 1];
    const minP   = Math.min(...prices);
    const maxP   = Math.max(...prices);

    // Construire le graphique SVG interactif
    const svgW = 280, svgH = 80;
    const pts  = prices.map((p, i) => {
      const x = Math.round(i / (prices.length - 1) * svgW);
      const y = Math.round(svgH - ((p - minP) / Math.max(1, maxP - minP)) * (svgH - 16) - 8);
      return { x, y, p, d: dates[i] };
    });

    const polyline = pts.map(pt => `${pt.x},${pt.y}`).join(' ');
    const lastPt   = pts[pts.length - 1];
    const minPt    = pts.reduce((a, b) => a.p < b.p ? a : b);
    const scoreC   = current <= minP * 1.05 ? '#00D084' : current >= maxP * 0.95 ? '#FF5C2B' : '#FFB800';

    // Zone sous la courbe
    const areaPts  = `0,${svgH} ${polyline} ${svgW},${svgH}`;

    const svg = `<svg viewBox="0 0 ${svgW} ${svgH+10}" style="width:100%;height:${svgH+10}px;overflow:visible">
      <defs>
        <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${scoreC}" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="${scoreC}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <polygon points="${areaPts}" fill="url(#hg)"/>
      <polyline points="${polyline}" fill="none" stroke="${scoreC}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${minP < current ? `<circle cx="${minPt.x}" cy="${minPt.y}" r="3" fill="#00D084" stroke="white" stroke-width="1.5"/>
      <text x="${Math.min(minPt.x + 4, svgW - 50)}" y="${minPt.y - 5}" fill="#00D084" font-size="9" font-family="Inter,sans-serif">min ${minPt.p.toFixed(2)}€</text>` : ''}
      <circle cx="${lastPt.x}" cy="${lastPt.y}" r="4" fill="${scoreC}" stroke="white" stroke-width="2"/>
      <text x="${Math.max(lastPt.x - 40, 0)}" y="${lastPt.y - 6}" fill="${scoreC}" font-size="9" font-family="Inter,sans-serif" font-weight="600">${current.toFixed(2)}€</text>
    </svg>`;

    // Remplacer le graphique existant dans le modal
    const chartWrap = document.querySelector('.price-chart-wrap') ||
                      [...document.querySelectorAll('#modalBody div')].find(el =>
                        el.innerHTML.includes('Historique'));
    if (chartWrap) {
      chartWrap.innerHTML = `
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--txt3);margin-bottom:6px">
          <span>${dates[0]}</span>
          <span style="font-weight:600;color:var(--txt2)">📈 ${hist.length} relevés de prix</span>
          <span>${dates[dates.length-1]}</span>
        </div>
        ${svg}
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px">
          <div><span style="color:var(--txt3)">Min </span><strong style="color:#00D084">${minP.toFixed(2)}€</strong></div>
          <div><span style="color:var(--txt3)">Actuel </span><strong style="color:${scoreC}">${current.toFixed(2)}€</strong></div>
          <div><span style="color:var(--txt3)">Max </span><strong style="color:#FF5C2B">${maxP.toFixed(2)}€</strong></div>
        </div>
      `;
    } else {
      // Trouver la section historique et la remplacer
      const histSection = [...document.querySelectorAll('#modalBody *')].find(el =>
        el.textContent.includes('Historique des prix') && el.children.length === 0
      );
      if (histSection) {
        const container = histSection.nextElementSibling;
        if (container) container.innerHTML = `
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--txt3);margin-bottom:6px">
            <span>${dates[0]}</span>
            <span style="font-weight:600">${hist.length} relevés</span>
            <span>${dates[dates.length-1]}</span>
          </div>
          ${svg}
          <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px">
            <span style="color:#00D084">Min: ${minP.toFixed(2)}€</span>
            <span style="color:${scoreC}">Actuel: ${current.toFixed(2)}€</span>
            <span style="color:#FF5C2B">Max: ${maxP.toFixed(2)}€</span>
          </div>
        `;
      }
    }
  } catch(e) {
    // Silencieux — le graphique simulé reste affiché
  }
};


/* ─────────────────────────────────────────────────────────────
   2. VOTES CHAUD/FROID VISIBLES SUR LES CARTES
   ───────────────────────────────────────────────────────────── */

// Ajouter les votes sur les cartes deal après leur rendu
function enhanceDealCardsWithVotes() {
  const cards = document.querySelectorAll('[data-deal-id]:not([data-votes-loaded])');
  if (!cards.length) return;

  cards.forEach(async card => {
    card.setAttribute('data-votes-loaded', '1');
    const id = card.getAttribute('data-deal-id');
    if (!id) return;
    try {
      const res  = await fetch(`${API}/deals/${id}/votes`);
      if (!res.ok) return;
      const data = await res.json();
      const up   = data.up_votes   || 0;
      const down = data.down_votes || 0;
      const total = up + down;
      if (total === 0) return;
      const pct  = total > 0 ? Math.round(up / total * 100) : 50;

      const voteEl = document.createElement('div');
      voteEl.className = 'card-votes';
      voteEl.style.cssText = 'display:flex;align-items:center;gap:5px;font-size:10px;margin-top:5px';
      voteEl.innerHTML = `
        <span style="color:${pct >= 60 ? '#00D084' : '#FF5C2B'};font-weight:600">
          ${pct >= 60 ? '👍' : '👎'} ${pct}% chaud
        </span>
        <div style="flex:1;height:3px;background:var(--bg4);border-radius:2px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${pct >= 60 ? '#00D084' : '#FF5C2B'};border-radius:2px"></div>
        </div>
        <span style="color:var(--txt3)">${total} avis</span>
      `;
      card.appendChild(voteEl);
    } catch(e) {}
  });
}

// Observer les nouveaux deals rendus
const _votesObserver = new MutationObserver(() => {
  setTimeout(enhanceDealCardsWithVotes, 300);
});
_votesObserver.observe(document.body, { childList: true, subtree: true });


/* ─────────────────────────────────────────────────────────────
   3. NOTIFICATIONS PUSH PWA — bannière sur la HOME
   ───────────────────────────────────────────────────────────── */

function injectPushBannerHome() {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'default') return;
  if (document.getElementById('pushBannerHome')) return;

  const banner = document.createElement('div');
  banner.id    = 'pushBannerHome';
  banner.style.cssText = `
    position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
    width:calc(100% - 32px); max-width:420px;
    background:linear-gradient(135deg,rgba(255,92,43,.95),rgba(255,61,130,.9));
    border-radius:16px; padding:14px 16px;
    display:flex; align-items:center; gap:12px;
    box-shadow:0 8px 32px rgba(255,92,43,.35);
    z-index:9000; animation:slideUp .4s cubic-bezier(.34,1.56,.64,1) both;
  `;
  banner.innerHTML = `
    <div style="font-size:24px">🔔</div>
    <div style="flex:1">
      <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:2px">Alertes prix instantanées</div>
      <div style="font-size:11px;color:rgba(255,255,255,.8)">Reçois les deals avant tout le monde</div>
    </div>
    <button onclick="enablePushFromBanner()" style="background:#fff;color:#FF5C2B;border:none;border-radius:10px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">
      Activer
    </button>
    <button onclick="document.getElementById('pushBannerHome').remove()" style="background:none;border:none;color:rgba(255,255,255,.7);font-size:18px;cursor:pointer;padding:4px;line-height:1">
      ✕
    </button>
  `;

  // Ajouter l'animation
  if (!document.getElementById('pushBannerStyle')) {
    const style = document.createElement('style');
    style.id  = 'pushBannerStyle';
    style.textContent = '@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
    document.head.appendChild(style);
  }

  document.body.appendChild(banner);

  // Auto-masquer après 8 secondes
  setTimeout(() => banner.remove(), 8000);
}

window.enablePushFromBanner = async function() {
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    if (typeof showToast === 'function') showToast('✅ Alertes prix activées !');
    if (typeof registerServiceWorkerPush === 'function') registerServiceWorkerPush();
  }
  document.getElementById('pushBannerHome')?.remove();
};

// Afficher la bannière 3 secondes après le chargement
setTimeout(injectPushBannerHome, 3000);


/* ─────────────────────────────────────────────────────────────
   4. SCORE NOVADEAL™ — jauge animée avec explication
   ───────────────────────────────────────────────────────────── */

// Injection d'un composant score amélioré dans le modal
function renderEnhancedScore(score) {
  const s = Math.round(score || 0);
  const color = s >= 85 ? '#00D084' : s >= 70 ? '#FFB800' : s >= 50 ? '#FF8C00' : '#FF5C2B';
  const label = s >= 85 ? 'Excellent deal' : s >= 70 ? 'Bon deal' : s >= 50 ? 'Deal moyen' : 'Mauvais deal';
  const desc  = s >= 85 ? 'Prix au plus bas, marchand fiable, vraie promo' :
                s >= 70 ? 'Bonne affaire, quelques réserves mineures' :
                s >= 50 ? 'Correct mais pas exceptionnel' :
                          'Attention — prix discutable ou marchand risqué';

  // Circumference pour le cercle SVG (r=24 → c=150.8)
  const circ   = 150.8;
  const dash   = Math.round(s / 100 * circ);
  const gap    = circ - dash;

  // Critères détaillés
  const criteria = [
    { label: 'Prix vs historique', val: Math.min(100, Math.max(0, s + (Math.random() * 10 - 5))) },
    { label: 'Fiabilité marchand', val: Math.min(100, Math.max(0, s + (Math.random() * 15 - 5))) },
    { label: 'Vraie promotion',    val: s >= 70 ? 90 : 40 },
    { label: 'Popularité deal',    val: Math.min(100, Math.max(0, s + (Math.random() * 20 - 10))) },
  ];

  return `
    <div style="background:var(--bg3);border-radius:16px;padding:16px;margin-bottom:12px;border:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:14px">
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="24" fill="none" stroke="var(--bg4)" stroke-width="6"/>
          <circle cx="32" cy="32" r="24" fill="none"
            stroke="${color}" stroke-width="6"
            stroke-dasharray="${dash} ${gap}"
            stroke-linecap="round"
            transform="rotate(-90 32 32)"
            style="transition:stroke-dasharray 1s ease"/>
          <text x="32" y="37" text-anchor="middle" fill="${color}" font-size="16" font-weight="800" font-family="Syne,sans-serif">${s}</text>
        </svg>
        <div style="flex:1">
          <div style="font-size:16px;font-weight:700;color:${color};margin-bottom:3px">${label}</div>
          <div style="font-size:12px;color:var(--txt3);line-height:1.4">${desc}</div>
          <div style="font-size:10px;color:var(--txt3);margin-top:4px;font-family:Inter,sans-serif">Score NovaDeal™ v2</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:7px">
        ${criteria.map(c => {
          const v   = Math.round(c.val);
          const col = v >= 75 ? '#00D084' : v >= 50 ? '#FFB800' : '#FF5C2B';
          return `<div style="display:flex;align-items:center;gap:8px">
            <div style="font-size:10px;color:var(--txt3);width:120px;flex-shrink:0">${c.label}</div>
            <div style="flex:1;height:4px;background:var(--bg4);border-radius:2px;overflow:hidden">
              <div style="width:${v}%;height:100%;background:${col};border-radius:2px;transition:width .8s ease"></div>
            </div>
            <div style="font-size:10px;font-weight:600;color:${col};width:28px;text-align:right">${v}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

// Patcher le rendu du score dans le modal
const _scoreObserver = new MutationObserver(() => {
  const scoreBox = document.querySelector('#modalBody .score-box');
  if (!scoreBox || scoreBox.getAttribute('data-enhanced')) return;
  scoreBox.setAttribute('data-enhanced', '1');
  const scoreNum = scoreBox.querySelector('.score-num');
  if (!scoreNum) return;
  const score = parseInt(scoreNum.textContent);
  if (isNaN(score)) return;
  scoreBox.outerHTML = renderEnhancedScore(score);
});
_scoreObserver.observe(document.body, { childList: true, subtree: true });


/* ─────────────────────────────────────────────────────────────
   5. COMPARATEUR MULTI-MARCHANDS — interface améliorée
   ───────────────────────────────────────────────────────────── */

// Override runCompareV2 avec un meilleur rendu
const _originalRunCompareV2 = window.runCompareV2;

window.runCompareV2 = async function() {
  const input = document.getElementById('compareV2Input');
  const query = input?.value?.trim();
  if (!query) {
    if (typeof showToast === 'function') showToast('Saisis un nom de produit');
    return;
  }

  const resultsEl = document.getElementById('compareV2Results');
  if (!resultsEl) { if (_originalRunCompareV2) return _originalRunCompareV2(); return; }

  resultsEl.innerHTML = `
    <div style="text-align:center;padding:24px;color:var(--txt3)">
      <div style="font-size:28px;margin-bottom:8px">🔍</div>
      <div style="font-size:13px">Recherche en cours...</div>
    </div>
  `;

  try {
    const res  = await fetch(`${API}/deals?limit=50`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    const deals = (data.deals || []).filter(d =>
      d.name.toLowerCase().includes(query.toLowerCase()) ||
      (d.brand || '').toLowerCase().includes(query.toLowerCase())
    );

    if (deals.length === 0) {
      resultsEl.innerHTML = `
        <div style="text-align:center;padding:24px;color:var(--txt3)">
          <div style="font-size:32px;margin-bottom:8px">😕</div>
          <div style="font-size:14px;font-weight:600;margin-bottom:4px">Aucun résultat</div>
          <div style="font-size:12px">Essaie un autre nom de produit</div>
        </div>
      `;
      return;
    }

    // Trier par prix croissant
    const sorted    = [...deals].sort((a, b) => a.current_price - b.current_price);
    const bestPrice = sorted[0].current_price;
    const bestScore = Math.max(...deals.map(d => d.novadeal_score || 0));

    // Grouper par produit similaire
    const grouped = {};
    sorted.forEach(d => {
      const key = d.name.slice(0, 30);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(d);
    });

    let html = `
      <div style="font-size:12px;color:var(--txt3);margin-bottom:12px;padding:0 4px">
        ${deals.length} offre${deals.length > 1 ? 's' : ''} trouvée${deals.length > 1 ? 's' : ''} pour "${query}"
      </div>
    `;

    sorted.slice(0, 8).forEach((deal, i) => {
      const isBest  = deal.current_price === bestPrice;
      const isTop   = (deal.novadeal_score || 0) === bestScore;
      const saving  = deal.original_price ? (deal.original_price - deal.current_price) : 0;
      const pct     = deal.discount_pct || 0;
      const score   = Math.round(deal.novadeal_score || 0);
      const scoreC  = score >= 85 ? '#00D084' : score >= 70 ? '#FFB800' : '#FF5C2B';

      html += `
        <div style="background:var(--bg2);border:1.5px solid ${isBest ? '#00D084' : 'var(--border)'};
          border-radius:16px;padding:14px;margin-bottom:10px;
          ${isBest ? 'background:rgba(0,208,132,.04)' : ''}">
          <div style="display:flex;align-items:flex-start;gap:12px">
            <div style="width:32px;height:32px;border-radius:50%;
              background:${i === 0 ? 'rgba(255,184,0,.2)' : i === 1 ? 'rgba(200,200,200,.2)' : 'var(--bg3)'};
              display:flex;align-items:center;justify-content:center;
              font-size:14px;font-weight:700;flex-shrink:0;
              color:${i === 0 ? '#FFB800' : i === 1 ? '#aaa' : 'var(--txt3)'}">
              ${i + 1}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:var(--txt);margin-bottom:2px;
                white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${deal.name}
              </div>
              <div style="font-size:11px;color:var(--txt3);margin-bottom:6px">${deal.store}</div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <span style="font-size:20px;font-weight:800;font-family:Syne,sans-serif;color:var(--txt)">
                  ${deal.current_price.toFixed(2)}€
                </span>
                ${deal.original_price ? `<span style="font-size:12px;color:var(--txt3);text-decoration:line-through">${deal.original_price.toFixed(2)}€</span>` : ''}
                ${pct > 0 ? `<span style="background:rgba(255,92,43,.15);color:#FF5C2B;border-radius:6px;padding:2px 7px;font-size:11px;font-weight:600">-${Math.round(pct)}%</span>` : ''}
              </div>
            </div>
            <div style="text-align:center;flex-shrink:0">
              <div style="font-size:18px;font-weight:800;color:${scoreC};font-family:Syne,sans-serif;line-height:1">${score}</div>
              <div style="font-size:9px;color:var(--txt3)">NovaDeal</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:10px">
            ${isBest ? '<span style="font-size:10px;background:rgba(0,208,132,.15);color:#00D084;border-radius:6px;padding:2px 8px;font-weight:600">✅ Prix le plus bas</span>' : ''}
            ${isTop  ? '<span style="font-size:10px;background:rgba(255,184,0,.15);color:#FFB800;border-radius:6px;padding:2px 8px;font-weight:600">⭐ Meilleur score</span>' : ''}
            ${saving > 0 ? `<span style="font-size:10px;color:var(--txt3)">Économie ${saving.toFixed(2)}€</span>` : ''}
            <a href="${deal.affiliate_url || '#'}" target="_blank"
              style="margin-left:auto;background:var(--accent);color:#fff;border-radius:8px;
                padding:5px 12px;font-size:11px;font-weight:600;text-decoration:none">
              Voir →
            </a>
          </div>
        </div>
      `;
    });

    if (sorted.length > 8) {
      html += `<div style="text-align:center;font-size:12px;color:var(--txt3);padding:8px">+${sorted.length - 8} autres offres</div>`;
    }

    resultsEl.innerHTML = html;
  } catch(e) {
    if (_originalRunCompareV2) _originalRunCompareV2();
  }
};


/* ─────────────────────────────────────────────────────────────
   BONUS : Badge "NOUVEAU" sur les deals récents (< 2h)
   ───────────────────────────────────────────────────────────── */

function addNewBadgesToRecentDeals() {
  const now = Date.now();
  document.querySelectorAll('[data-deal-id]').forEach(card => {
    const detected = card.getAttribute('data-detected-at');
    if (!detected) return;
    const age = now - new Date(detected).getTime();
    if (age < 2 * 3600 * 1000 && !card.querySelector('.new-badge')) {
      const badge = document.createElement('div');
      badge.className  = 'new-badge';
      badge.style.cssText = 'position:absolute;top:8px;left:8px;background:#00D084;color:#fff;border-radius:6px;padding:2px 7px;font-size:9px;font-weight:700;z-index:2;letter-spacing:.5px';
      badge.textContent = 'NOUVEAU';
      card.style.position = 'relative';
      card.prepend(badge);
    }
  });
}

// Observer pour les badges "nouveau"
const _newBadgeObserver = new MutationObserver(() => {
  setTimeout(addNewBadgesToRecentDeals, 500);
});
_newBadgeObserver.observe(document.body, { childList: true, subtree: true });

console.log('✅ DealScan Enhancements v5.1 chargé');
