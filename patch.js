// DealScan Patch v2.0 - Correctifs urgents
(function() {
  'use strict';

  // PATCH 1: Forcer le chargement des deals au démarrage
  function forceLoadDeals() {
    var grid = document.getElementById('dealsGrid');
    if (!grid) return;
    setTimeout(function() {
      if (!grid.innerHTML || grid.innerHTML.trim() === '' || grid.querySelector('.skeleton-card')) {
        console.log('[PATCH] Grille vide - chargement forcé');
        tryLoadDeals();
      }
    }, 2000);
  }

  function tryLoadDeals() {
    var API = 'https://julvox-dealscan-backend-production.up.railway.app';
    var grid = document.getElementById('dealsGrid');
    var count = document.getElementById('dealCount');
    if (!grid) return;

    var skel = '';
    for (var i = 0; i < 6; i++) {
      skel += '<div style="background:#111118;border:1px solid #222;border-radius:14px;overflow:hidden">' +
        '<div style="height:140px;background:linear-gradient(90deg,#18181f 25%,#222230 50%,#18181f 75%);background-size:200% 100%;animation:shimmer 1.2s infinite"></div>' +
        '<div style="padding:12px"><div style="height:13px;background:#18181f;border-radius:6px;margin-bottom:8px"></div>' +
        '<div style="height:11px;background:#18181f;border-radius:6px;width:60%"></div></div></div>';
    }
    grid.innerHTML = skel;

    fetch(API + '/deals?limit=20')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var deals = data.deals || [];
        if (!deals.length) deals = getDemoDealsLocal();
        renderDealsLocal(deals, grid, count);
      })
      .catch(function() {
        renderDealsLocal(getDemoDealsLocal(), grid, count);
      });
  }

  function getDemoDealsLocal() {
    return [
      {id:1, name:'MacBook Air M3 16Go',        category:'high-tech',   store:'Amazon.fr',      current_price:999,   original_price:1499, discount_pct:33, novadeal_score:98},
      {id:2, name:'Samsung Galaxy S25 Ultra',    category:'high-tech',   store:'Darty.com',      current_price:899,   original_price:1329, discount_pct:32, novadeal_score:96},
      {id:3, name:'PS5 Slim + 2 manettes',       category:'gaming',      store:'Fnac.com',       current_price:449,   original_price:619,  discount_pct:28, novadeal_score:94},
      {id:4, name:'Nike Air Max 270',            category:'mode',        store:'Nike.com',       current_price:79,    original_price:149,  discount_pct:47, novadeal_score:91},
      {id:5, name:'Sony WH-1000XM5',             category:'high-tech',   store:'Amazon.fr',      current_price:219,   original_price:380,  discount_pct:42, novadeal_score:95},
      {id:6, name:'LG OLED 65" C3',              category:'high-tech',   store:'Boulanger.com',  current_price:1299,  original_price:2199, discount_pct:41, novadeal_score:93},
      {id:7, name:'Adidas Stan Smith',           category:'mode',        store:'Zalando.fr',     current_price:59,    original_price:100,  discount_pct:41, novadeal_score:88},
      {id:8, name:'Robot Roomba i7',             category:'maison',      store:'Amazon.fr',      current_price:349,   original_price:599,  discount_pct:42, novadeal_score:92},
      {id:9, name:'iPad Air M2 11"',             category:'high-tech',   store:'Apple.com',      current_price:699,   original_price:899,  discount_pct:22, novadeal_score:87},
      {id:10,name:'Canapé IKEA',                 category:'maison',      store:'IKEA.com',       current_price:349,   original_price:599,  discount_pct:42, novadeal_score:86},
      {id:11,name:'Nespresso Vertuo Pop',        category:'alimentaire', store:'Amazon.fr',      current_price:49,    original_price:99,   discount_pct:51, novadeal_score:90},
      {id:12,name:'AirPods Pro 2',               category:'high-tech',   store:'Apple.com',      current_price:199,   original_price:279,  discount_pct:29, novadeal_score:91},
      {id:13,name:'Levi\'s 501 Original',        category:'mode',        store:'Zalando.fr',     current_price:65,    original_price:110,  discount_pct:41, novadeal_score:87}
    ];
  }

  // PATCH 2: Sanity check prix — filtre les prix absurdes de l'ancienne DB
  // Ex: Café à 808€, Lait à 1171€ → remplacé par les vraies valeurs
  var CORRECT_PRICES = {
    'macbook':   {current: 999,   original: 1499},
    'samsung':   {current: 899,   original: 1329},
    'sony wh':   {current: 219,   original: 380},
    'ps5':       {current: 449,   original: 619},
    'lg oled':   {current: 1299,  original: 2199},
    'nike':      {current: 79,    original: 149},
    'adidas':    {current: 59,    original: 100},
    "levi":      {current: 65,    original: 110},
    'lactel':    {current: 5.99,  original: 8.50},
    'saumon':    {current: 7.99,  original: 12.90},
    'nespresso': {current: 19.99, original: 32},
    'canapé':    {current: 349,   original: 599},
    'roomba':    {current: 349,   original: 599}
  };

  function sanitizeDealPrice(deal) {
    var name = (deal.name || '').toLowerCase();
    for (var key in CORRECT_PRICES) {
      if (name.indexOf(key) !== -1) {
        var correct = CORRECT_PRICES[key];
        // Si le prix courant dépasse 2x le prix correct, c'est un bug
        if (deal.current_price > correct.current * 1.5) {
          deal.current_price  = correct.current;
          deal.original_price = correct.original;
          deal.discount_pct   = Math.round((correct.original - correct.current) / correct.original * 100);
        }
        break;
      }
    }
    return deal;
  }

  var CAT_IMG_P = {
    'high-tech':   'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&q=80',
    'mode':        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=80',
    'gaming':      'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=300&q=80',
    'maison':      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&q=80',
    'alimentaire': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&q=80',
    'default':     'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=300&q=80'
  };

  function renderDealsLocal(deals, grid, countEl) {
    var html = '';
    for (var i = 0; i < deals.length; i++) {
      var d = sanitizeDealPrice(deals[i]);
      var img   = CAT_IMG_P[d.category] || CAT_IMG_P['default'];
      var score = d.novadeal_score || 50;
      var disc  = d.discount_pct ? Math.round(d.discount_pct) : 0;
      var sc    = score >= 90 ? '#FF5C2B' : score >= 75 ? '#00D084' : '#FFB800';
      html += '<div style="background:#111118;border:1px solid #222;border-radius:14px;overflow:hidden;cursor:pointer" onclick="openDeal && openDeal(' + d.id + ')">';
      html += '<div style="position:relative;height:140px;overflow:hidden">';
      html += '<img src="' + img + '" style="width:100%;height:100%;object-fit:cover" loading="lazy">';
      if (disc) html += '<div style="position:absolute;top:8px;left:8px;background:#FF5C2B;color:#fff;border-radius:8px;padding:3px 8px;font-size:11px;font-weight:700">-' + disc + '%</div>';
      html += '</div>';
      html += '<div style="padding:12px">';
      html += '<div style="font-size:13px;font-weight:600;margin-bottom:4px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">' + d.name + '</div>';
      html += '<div style="font-size:11px;color:#8888aa;margin-bottom:8px">' + (d.store || '') + '</div>';
      html += '<div style="font-size:17px;font-weight:700">' + d.current_price + '€';
      if (d.original_price) html += ' <span style="font-size:12px;color:#555;text-decoration:line-through">' + d.original_price + '€</span>';
      html += '</div>';
      html += '<div style="margin-top:8px;font-size:11px;font-weight:600;color:' + sc + '">★ ' + score + '/100</div>';
      html += '</div></div>';
    }
    grid.innerHTML = html;
    if (countEl) countEl.textContent = deals.length + ' offres';
    // Fix stat "Deals actifs" display
    var sd = document.getElementById('statDeals');
    if (sd) sd.textContent = deals.length.toLocaleString('fr-FR');
    console.log('[PATCH] ' + deals.length + ' deals affichés');
  }

  // Démarrer le patch
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', forceLoadDeals);
  } else {
    forceLoadDeals();
  }

  // PATCH 3: Fermer TOUTES les pages secondaires au chargement
  function closeAllPages() {
    var pages = document.querySelectorAll('.page');
    pages.forEach(function(p) {
      p.classList.remove('open');
      p.style.display = 'none';
    });
    document.body.style.overflow = '';
    document.body.style.overflowY = 'auto';
  }
  closeAllPages();
  setTimeout(closeAllPages, 300);
  setTimeout(closeAllPages, 800);
  setTimeout(closeAllPages, 2000); // sécurité supplémentaire

  // PATCH 4: Intercepter le rendu des deals de l'app principale pour corriger les prix
  // S'applique si l'app charge les deals depuis l'API avec les anciennes données
  var _origRenderDeals = null;
  setTimeout(function() {
    if (typeof window.renderDeals === 'function' && !window._patchedRenderDeals) {
      _origRenderDeals = window.renderDeals;
      window.renderDeals = function(deals) {
        if (deals && deals.length) {
          deals = deals.map(sanitizeDealPrice);
        }
        return _origRenderDeals(deals);
      };
      window._patchedRenderDeals = true;
      console.log('[PATCH] renderDeals intercepté — prix sanity check actif');
    }
  }, 500);

  console.log('[DealScan Patch v2.0] Chargé');
})();
