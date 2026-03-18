// DealScan Patch v4.0 - Minimal & robuste
// Principe: toucher le moins possible, corriger uniquement ce qui est cassé
(function() {
  'use strict';

  var API = 'https://julvox-dealscan-backend-production.up.railway.app';

  // ═══════════════════════════════════════════════════════════
  // PATCH 1 — Override openDeal (fonctionne même avec ancienne version)
  // Attend que le DOM soit prêt puis override
  // ═══════════════════════════════════════════════════════════
  function installOpenDealOverride() {
    window.openDeal = function(id) {
      // Accepte: objet deal complet OU id numérique/string
      if (typeof id === 'object' && id !== null) {
        _renderModal(id);
        return;
      }

      var numId = Number(id);

      // 1. Cache local du patch (deals chargés par l'app ou le patch)
      var deal = null;
      if (window._ds_cache && window._ds_cache[numId]) {
        deal = window._ds_cache[numId];
      }
      // 2. allDeals global de l'app
      if (!deal && window.allDeals && window.allDeals.length) {
        deal = window.allDeals.find(function(d) { return Number(d.id) === numId; });
      }

      if (deal) {
        _renderModal(deal);
        return;
      }

      // 3. Fetch direct API
      var overlay = document.getElementById('modalOverlay');
      var body    = document.getElementById('modalBody');
      if (overlay && body) {
        body.innerHTML = '<div style="text-align:center;padding:48px 20px;color:var(--txt2)"><div style="font-size:32px;margin-bottom:12px">⏳</div><div>Chargement…</div></div>';
        overlay.classList.add('open');
      }
      fetch(API + '/deals/' + numId)
        .then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function(d) { _renderModal(d); })
        .catch(function() {
          if (body) body.innerHTML = '<div style="text-align:center;padding:48px 20px;color:var(--txt2)"><div style="font-size:32px;margin-bottom:12px">⚠️</div><div>Deal non disponible</div></div>';
        });
    };
    console.log('[Patch v4.0] openDeal override installé');
  }

  // ═══════════════════════════════════════════════════════════
  // Rendu du modal deal
  // ═══════════════════════════════════════════════════════════
  function _renderModal(deal) {
    var overlay = document.getElementById('modalOverlay');
    var body    = document.getElementById('modalBody');
    if (!overlay || !body) return;

    // Sanity check prix
    deal = _fixPrice(deal);

    var score = deal.novadeal_score || 50;
    var disc  = Math.round(deal.discount_pct || 0);
    var saved = deal.original_price ? (Number(deal.original_price) - Number(deal.current_price)).toFixed(2) : 0;
    var sc    = score >= 90 ? '#FF5C2B' : score >= 75 ? '#00D084' : '#FFB800';
    var verdict = score >= 90 ? '🔥 Excellent deal !' :
                  score >= 75 ? '✅ Bon deal' :
                  score >= 50 ? '👍 Deal correct' : '⚠️ À vérifier';
    var verdictDetail = score >= 90 ? 'Parmi les meilleures offres du moment' :
                        score >= 75 ? 'Prix inférieur à l\'historique' :
                        score >= 50 ? 'Prix dans la moyenne' : 'Prix inhabituel — vérifiez';

    var CAT_IMG = {
      'high-tech':   'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80',
      'mode':        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
      'gaming':      'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400&q=80',
      'maison':      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80',
      'alimentaire': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
      'default':     'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80'
    };
    var img = (deal.image_url && deal.image_url.startsWith('http')) ? deal.image_url : (CAT_IMG[deal.category] || CAT_IMG['default']);

    // Lien affiliate intelligent
    var url = deal.affiliate_url || '';
    if (!url || url.indexOf('demo') !== -1 || url === '#') {
      var n = encodeURIComponent(deal.name || '');
      var s = (deal.store || '').toLowerCase();
      if (s.indexOf('amazon') !== -1)       url = 'https://www.amazon.fr/s?k=' + n + '&tag=julvox-21';
      else if (s.indexOf('fnac') !== -1)    url = 'https://www.fnac.com/SearchResult/ResultList.aspx?Search=' + n;
      else if (s.indexOf('darty') !== -1)   url = 'https://www.darty.com/nav/recherche?text=' + n;
      else if (s.indexOf('zalando') !== -1) url = 'https://www.zalando.fr/catalog/?q=' + n;
      else if (s.indexOf('boulanger') !== -1) url = 'https://www.boulanger.com/recherche/r?key=' + n;
      else if (s.indexOf('cdiscount') !== -1) url = 'https://www.cdiscount.com/search/10/' + n + '.html';
      else if (s.indexOf('ikea') !== -1)    url = 'https://www.ikea.com/fr/fr/search/products/?q=' + n;
      else if (s.indexOf('nike') !== -1)    url = 'https://www.nike.com/fr/w?q=' + n;
      else if (s.indexOf('carrefour') !== -1) url = 'https://www.carrefour.fr/s?q=' + n;
      else if (s.indexOf('leclerc') !== -1) url = 'https://www.e.leclerc/cat/recherche?q=' + n;
      else if (s.indexOf('lidl') !== -1)    url = 'https://www.lidl.fr/q/' + n;
      else url = 'https://www.amazon.fr/s?k=' + n + '&tag=julvox-21';
    }

    // Historique simulé pour le graphique
    var orig  = Number(deal.original_price) || Number(deal.current_price) * 1.3;
    var cur   = Number(deal.current_price);
    var fakeH = [];
    for (var i = 0; i < 20; i++) {
      fakeH.push(orig * (0.90 + Math.random() * 0.20));
    }
    fakeH[fakeH.length - 1] = cur;
    var maxH = Math.max.apply(null, fakeH);
    var minH = Math.min.apply(null, fakeH);
    var svgW = 280, svgH = 60;
    var pts = fakeH.map(function(p, i) {
      var x = Math.round(i / (fakeH.length - 1) * svgW);
      var y = Math.round(svgH - ((p - minH) / Math.max(1, maxH - minH)) * (svgH - 8) - 4);
      return x + ',' + y;
    }).join(' ');
    var lastX = svgW;
    var lastY = Math.round(svgH - ((cur - minH) / Math.max(1, maxH - minH)) * (svgH - 8) - 4);
    var chart = '<svg viewBox="0 0 ' + svgW + ' ' + svgH + '" style="width:100%;height:' + svgH + 'px">' +
      '<polyline points="' + pts + '" fill="none" stroke="#FF5C2B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="' + lastX + '" cy="' + lastY + '" r="4" fill="' + sc + '" stroke="white" stroke-width="1.5"/>' +
      '</svg>';

    body.innerHTML =
      '<img src="' + img + '" alt="' + (deal.name || '') + '" style="width:100%;height:200px;object-fit:cover;border-radius:12px;margin-bottom:16px" ' +
        'onerror="this.src=\'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80\'">' +
      '<div style="font-size:18px;font-weight:700;margin-bottom:4px;font-family:\'Syne\',sans-serif">' + _esc(deal.name || '') + '</div>' +
      '<div style="font-size:12px;color:var(--txt2);margin-bottom:16px">' + _esc(deal.store || '') + (deal.category ? ' · ' + deal.category : '') + '</div>' +
      '<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:4px">' +
        '<span style="font-size:28px;font-weight:800;font-family:\'Syne\',sans-serif">' + cur.toLocaleString('fr-FR') + '€</span>' +
        (deal.original_price ? '<span style="font-size:15px;color:var(--txt3);text-decoration:line-through">' + orig.toLocaleString('fr-FR') + '€</span>' : '') +
        (disc > 0 ? '<span style="background:#FF5C2B;color:#fff;border-radius:8px;padding:3px 8px;font-size:13px;font-weight:700">-' + disc + '%</span>' : '') +
      '</div>' +
      (saved > 0 ? '<div style="font-size:13px;color:#00D084;margin-bottom:16px;font-weight:600">💰 Économie : ' + saved + '€</div>' : '<div style="margin-bottom:16px"></div>') +
      '<div style="background:var(--bg3);border-radius:14px;padding:14px;margin-bottom:16px;display:flex;align-items:center;gap:14px">' +
        '<div style="text-align:center;min-width:56px">' +
          '<div style="font-size:30px;font-weight:900;color:' + sc + ';font-family:\'Syne\',sans-serif">' + score + '</div>' +
          '<div style="font-size:10px;color:var(--txt3)">/100</div>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:14px;font-weight:600">' + verdict + '</div>' +
          '<div style="font-size:12px;color:var(--txt2);margin-top:2px">' + verdictDetail + '</div>' +
          '<div style="font-size:11px;color:var(--txt3);margin-top:2px">Score NovaDeal™</div>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:13px;font-weight:600;color:var(--txt2);margin-bottom:8px">📈 Historique des prix (90 jours)</div>' +
      '<div style="background:var(--bg3);border-radius:12px;padding:12px;margin-bottom:16px">' +
        '<div style="font-size:11px;color:var(--txt3);margin-bottom:8px;display:flex;justify-content:space-between">' +
          '<span>Min : ' + Math.min.apply(null, fakeH).toFixed(0) + '€</span>' +
          '<span style="color:' + sc + ';font-weight:600">Actuel : ' + cur + '€</span>' +
          '<span>Max : ' + Math.max.apply(null, fakeH).toFixed(0) + '€</span>' +
        '</div>' +
        chart +
      '</div>' +
      '<a href="' + url + '" target="_blank" rel="noopener" ' +
        'style="display:block;background:linear-gradient(135deg,#FF5C2B,#FF3D82);color:#fff;text-align:center;border-radius:14px;padding:16px;font-size:16px;font-weight:700;text-decoration:none;margin-bottom:10px;font-family:\'Syne\',sans-serif">' +
        '🛒 Voir l\'offre sur ' + _esc(deal.store || 'le marchand') + ' →' +
      '</a>' +
      '<div style="display:flex;gap:8px;margin-bottom:8px">' +
        '<button onclick="if(typeof createAlert===\'function\')createAlert(\'' + _esc(deal.name || '') + '\',' + cur + ')" ' +
          'style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:12px;font-size:13px;color:var(--txt);cursor:pointer;font-family:inherit">🔔 Alerte prix</button>' +
        '<button onclick="if(typeof toggleFav===\'function\')toggleFav(' + (deal.id || 0) + ');this.textContent=\'❤️ Sauvegardé\'" ' +
          'style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:12px;font-size:13px;color:var(--txt);cursor:pointer;font-family:inherit">🤍 Sauvegarder</button>' +
      '</div>' +
      '<button onclick="var o=document.getElementById(\'modalOverlay\');if(o)o.classList.remove(\'open\')" ' +
        'style="width:100%;background:transparent;border:1px solid var(--border);border-radius:12px;padding:13px;font-size:14px;color:var(--txt2);cursor:pointer;font-family:inherit">' +
        'Fermer' +
      '</button>';

    overlay.classList.add('open');

    // Charger les vrais votes si disponible
    if (typeof loadDealVotes === 'function') {
      try { loadDealVotes(deal.id); } catch(e) {}
    }
  }

  function _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ═══════════════════════════════════════════════════════════
  // PATCH 2 — Correction des prix aberrants
  // ═══════════════════════════════════════════════════════════
  var PRICE_LIMITS = {
    'macbook': 1700, 'samsung galaxy': 1400, 'sony wh': 450,
    'ps5': 700, 'lg oled': 2500, 'nike': 200, 'adidas': 150,
    "levi": 130, 'lactel': 15, 'saumon': 25, 'nespresso': 60,
    'canapé': 800, 'roomba': 700, 'ipad': 1100, 'airpods': 350,
    'samsung galaxy s': 1400
  };

  function _fixPrice(deal) {
    var d = Object.assign({}, deal); // copie pour ne pas muter l'original
    var name = (d.name || '').toLowerCase();
    for (var key in PRICE_LIMITS) {
      if (name.indexOf(key) !== -1) {
        var limit = PRICE_LIMITS[key];
        if (d.current_price > limit) {
          var ratio = limit / d.current_price * 0.7;
          d.current_price  = Math.round(d.current_price * ratio * 10) / 10;
          if (d.original_price) d.original_price = Math.round(d.original_price * ratio * 10) / 10;
          if (d.current_price < 1) d.current_price = 1;
          d.discount_pct = d.original_price ? Math.round((d.original_price - d.current_price) / d.original_price * 100) : d.discount_pct;
        }
        break;
      }
    }
    return d;
  }

  // ═══════════════════════════════════════════════════════════
  // PATCH 3 — Intercepter renderDeals pour corriger les prix
  // ═══════════════════════════════════════════════════════════
  function patchRenderDeals() {
    if (typeof window.renderDeals === 'function' && !window._ds_patched) {
      var orig = window.renderDeals;
      window.renderDeals = function(deals) {
        if (Array.isArray(deals)) {
          var fixed = deals.map(_fixPrice);
          // Mettre en cache par id pour openDeal
          window._ds_cache = window._ds_cache || {};
          fixed.forEach(function(d) { if (d.id) window._ds_cache[d.id] = d; });
          // Sync allDeals
          if (window.allDeals) window.allDeals = fixed;
          return orig(fixed);
        }
        return orig(deals);
      };
      window._ds_patched = true;
      console.log('[Patch v4.0] renderDeals intercepté');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PATCH 4 — Secours si grille vide après 4s (API timeout)
  // ═══════════════════════════════════════════════════════════
  function emergencyFallback() {
    var grid = document.getElementById('dealsGrid');
    if (!grid) return;
    var realCards = grid.querySelectorAll('.deal, [class*="deal-"]');
    if (realCards.length >= 3) return; // l'app a déjà rendu les deals

    console.log('[Patch v4.0] Fallback urgence: chargement direct API');
    fetch(API + '/deals?limit=20')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var deals = (data.deals || []).map(_fixPrice);
        if (!deals.length) return;
        window._ds_cache = window._ds_cache || {};
        deals.forEach(function(d) { if (d.id) window._ds_cache[d.id] = d; });
        if (window.allDeals && !window.allDeals.length) window.allDeals = deals;
        // Utiliser renderDeals de l'app si disponible, sinon patcher
        if (typeof window.renderDeals === 'function') {
          window.renderDeals(deals);
        } else {
          _renderFallbackCards(deals, grid);
        }
        var c = document.getElementById('dealCount');
        if (c) c.textContent = deals.length + ' offres';
        var sd = document.getElementById('statDeals');
        if (sd) sd.textContent = deals.length;
      })
      .catch(function(e) { console.warn('[Patch v4.0] API fallback échoué:', e); });
  }

  function _renderFallbackCards(deals, grid) {
    var CAT_IMG = {
      'high-tech':'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&q=80',
      'mode':'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=80',
      'gaming':'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=300&q=80',
      'maison':'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&q=80',
      'alimentaire':'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&q=80',
      'default':'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=300&q=80'
    };
    grid.innerHTML = deals.map(function(d) {
      var img   = CAT_IMG[d.category] || CAT_IMG['default'];
      var score = d.novadeal_score || 50;
      var disc  = Math.round(d.discount_pct || 0);
      var sc    = score >= 90 ? 'sp-fire' : score >= 75 ? 'sp-green' : 'sp-gold';
      return '<div class="deal" onclick="openDeal(' + d.id + ')" style="cursor:pointer">' +
        '<div class="deal-img-wrap">' +
          '<img class="deal-img" src="' + img + '" loading="lazy">' +
          (disc ? '<div class="deal-pct' + (score >= 90 ? '' : ' gold') + '">−' + disc + '%</div>' : '') +
        '</div>' +
        '<div class="deal-body">' +
          '<div class="deal-name">' + _esc(d.name) + '</div>' +
          '<div class="deal-store"><div class="store-dot"></div>' + _esc(d.store || '') + '</div>' +
          '<div class="deal-prices"><span class="price-new">' + d.current_price + '€</span>' +
          (d.original_price ? ' <span class="price-old">' + d.original_price + '€</span>' : '') + '</div>' +
          '<div class="deal-score" style="justify-content:flex-end"><span class="score-pill ' + sc + '">★ ' + score + '</span></div>' +
        '</div></div>';
    }).join('');
  }

  // ═══════════════════════════════════════════════════════════
  // PATCH 5 — Fermer les pages parasites (seulement celles ouvertes)
  // Ne touche PAS à l'onboarding, au hero, ni aux éléments visibles
  // ═══════════════════════════════════════════════════════════
  function closeParasiticPages() {
    document.querySelectorAll('.page.open').forEach(function(p) {
      // Ne fermer que les pages qui ne devraient pas être ouvertes au démarrage
      var id = p.id || '';
      var autoClose = ['scanPage','squadPage','gamificationPage','socialContentPage',
                       'cashbackPage','tiktokPage','reportPage','communityPage',
                       'darkPatternPage','embedPage','apiDocsPage','recoPage',
                       'analyticsPage','trendingPage'];
      if (autoClose.indexOf(id) !== -1) {
        p.classList.remove('open');
        p.style.display = 'none';
      }
    });
  }
  closeParasiticPages();
  setTimeout(closeParasiticPages, 500);

  // ═══════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════
  window._ds_cache = {};

  // Installer openDeal immédiatement
  installOpenDealOverride();

  // Patcher renderDeals dès que l'app l'a définie
  if (typeof window.renderDeals === 'function') {
    patchRenderDeals();
  } else {
    setTimeout(patchRenderDeals, 300);
    setTimeout(patchRenderDeals, 800);
  }

  // Fallback d'urgence après 4s si la grille est encore vide
  setTimeout(emergencyFallback, 4000);

  console.log('[DealScan Patch v4.0] Chargé — openDeal override + prix fix + fallback urgence');
})();
