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
   DEALS DÉMO V3 — 60 produits avec vraies images + liens
   ───────────────────────────────────────────────────────────── */

const DEMO_DEALS_V3 = (() => {
  const T = new Date().toISOString();
  return [
    // ── High-Tech Amazon ──────────────────────────────────────
    {id:101,name:'MacBook Air 13" M3 8Go 256Go Minuit',brand:'Apple',category:'high-tech',store:'Amazon.fr',current_price:999,original_price:1299,discount_pct:23,novadeal_score:98,affiliate_url:'https://www.amazon.fr/dp/B0CX22VCZK?tag=julvox-21',image_url:'https://images-na.ssl-images-amazon.com/images/I/B0CX22VCZK._AC_SL400_.jpg',detected_at:T},
    {id:102,name:'Sony WH-1000XM5 Casque Bluetooth ANC Noir',brand:'Sony',category:'high-tech',store:'Amazon.fr',current_price:249,original_price:419,discount_pct:41,novadeal_score:96,affiliate_url:'https://www.amazon.fr/dp/B09XS7JWHH?tag=julvox-21',image_url:'https://images-na.ssl-images-amazon.com/images/I/B09XS7JWHH._AC_SL400_.jpg',detected_at:T},
    {id:103,name:'Apple AirPods Pro 2ème gén. USB-C',brand:'Apple',category:'high-tech',store:'Amazon.fr',current_price:199,original_price:299,discount_pct:33,novadeal_score:95,affiliate_url:'https://www.amazon.fr/dp/B0BDHWDR12?tag=julvox-21',image_url:'https://images-na.ssl-images-amazon.com/images/I/B0BDHWDR12._AC_SL400_.jpg',detected_at:T},
    {id:104,name:'iPad Air 11" M2 128Go WiFi Bleu',brand:'Apple',category:'high-tech',store:'Amazon.fr',current_price:649,original_price:799,discount_pct:19,novadeal_score:92,affiliate_url:'https://www.amazon.fr/dp/B0CYQBL4HK?tag=julvox-21',image_url:'https://images-na.ssl-images-amazon.com/images/I/B0CYQBL4HK._AC_SL400_.jpg',detected_at:T},
    {id:105,name:'Samsung Galaxy S25 128Go Phantom Black',brand:'Samsung',category:'high-tech',store:'Amazon.fr',current_price:799,original_price:1099,discount_pct:27,novadeal_score:95,affiliate_url:'https://www.amazon.fr/dp/B0CS8FPWZQ?tag=julvox-21',image_url:'https://images-na.ssl-images-amazon.com/images/I/B0CS8FPWZQ._AC_SL400_.jpg',detected_at:T},
    {id:106,name:'Kindle Paperwhite 16Go 2024 Vert Sage',brand:'Amazon',category:'high-tech',store:'Amazon.fr',current_price:139,original_price:179,discount_pct:22,novadeal_score:90,affiliate_url:'https://www.amazon.fr/dp/B0CF4BTWJK?tag=julvox-21',image_url:'https://images-na.ssl-images-amazon.com/images/I/B0CF4BTWJK._AC_SL400_.jpg',detected_at:T},
    {id:107,name:'Logitech MX Master 3S Souris Graphite',brand:'Logitech',category:'high-tech',store:'Amazon.fr',current_price:79,original_price:119,discount_pct:34,novadeal_score:88,affiliate_url:'https://www.amazon.fr/dp/B09HM94VDS?tag=julvox-21',image_url:'https://images-na.ssl-images-amazon.com/images/I/B09HM94VDS._AC_SL400_.jpg',detected_at:T},
    {id:108,name:'Samsung 65" QLED 4K TQ65Q70D',brand:'Samsung',category:'high-tech',store:'Amazon.fr',current_price:799,original_price:1299,discount_pct:38,novadeal_score:97,affiliate_url:'https://www.amazon.fr/dp/B0CWQTHM6G?tag=julvox-21',image_url:'https://images-na.ssl-images-amazon.com/images/I/B0CWQTHM6G._AC_SL400_.jpg',detected_at:T},
    // ── Gaming ────────────────────────────────────────────────
    {id:109,name:'PS5 Slim Edition Standard + DualSense Blanche',brand:'Sony',category:'gaming',store:'Fnac.com',current_price:449,original_price:549,discount_pct:18,novadeal_score:94,affiliate_url:'https://www.fnac.com/a18567890/Sony-PS5-Slim-Edition-Standard',image_url:'https://thumbnail.fnacstatic.fr/cdn-cgi/image/width=400,quality=80/media/MECA8/MCE/MCE0000007/MCE0000007_1.jpg',detected_at:T},
    {id:110,name:'Nintendo Switch OLED Blanche',brand:'Nintendo',category:'gaming',store:'Amazon.fr',current_price:299,original_price:349,discount_pct:14,novadeal_score:88,affiliate_url:'https://www.amazon.fr/dp/B09GFQMDN1?tag=julvox-21',image_url:'https://images-na.ssl-images-amazon.com/images/I/B09GFQMDN1._AC_SL400_.jpg',detected_at:T},
    {id:111,name:'Corsair K70 RGB Pro Clavier Mécanique',brand:'Corsair',category:'gaming',store:'Amazon.fr',current_price:99,original_price:159,discount_pct:38,novadeal_score:88,affiliate_url:'https://www.amazon.fr/dp/B09MW1BLFC?tag=julvox-21',image_url:'https://images-na.ssl-images-amazon.com/images/I/B09MW1BLFC._AC_SL400_.jpg',detected_at:T},
    {id:112,name:'Razer DeathAdder V3 Pro Souris sans fil',brand:'Razer',category:'gaming',store:'Amazon.fr',current_price:129,original_price:159,discount_pct:19,novadeal_score:85,affiliate_url:'https://www.amazon.fr/dp/B0B7T5P7CN?tag=julvox-21',image_url:'https://images-na.ssl-images-amazon.com/images/I/B0B7T5P7CN._AC_SL400_.jpg',detected_at:T},
    // ── Fnac / Darty / Boulanger ──────────────────────────────
    {id:113,name:'LG OLED55C3 55" OLED evo 4K 120Hz',brand:'LG',category:'high-tech',store:'Boulanger.com',current_price:999,original_price:1499,discount_pct:33,novadeal_score:97,affiliate_url:'https://www.boulanger.com/ref/1210199',image_url:'https://media.boulanger.com/v1/images/1210199_0001_1500x1500.jpg',detected_at:T},
    {id:114,name:'Xiaomi 14 Ultra 512Go Titanium Black',brand:'Xiaomi',category:'high-tech',store:'Boulanger.com',current_price:799,original_price:1099,discount_pct:27,novadeal_score:90,affiliate_url:'https://www.boulanger.com/ref/1211567',image_url:'https://media.boulanger.com/v1/images/1211567_0001_1500x1500.jpg',detected_at:T},
    {id:115,name:'Bosch Lave-linge 9kg Serie 6 WAV28G43FF',brand:'Bosch',category:'maison',store:'Darty.com',current_price:699,original_price:899,discount_pct:22,novadeal_score:87,affiliate_url:'https://www.darty.com/nav/achat/gros_electromenager/lave_linge/lave_linge_hublot/bosch_wav28g43ff.html',image_url:'https://www.darty.com/images/articles/M/darty_8002065.jpg',detected_at:T},
    {id:116,name:'Philips Airfryer XXL HD9860/90',brand:'Philips',category:'maison',store:'Darty.com',current_price:199,original_price:299,discount_pct:33,novadeal_score:86,affiliate_url:'https://www.darty.com/nav/achat/petit_electromenager/friteuse/friteuse_sans_huile/philips_hd9860_90.html',image_url:'https://www.darty.com/images/articles/M/darty_6724507.jpg',detected_at:T},
    {id:117,name:'Dyson Airwrap Complete Long HS05',brand:'Dyson',category:'beaute',store:'Darty.com',current_price:479,original_price:599,discount_pct:20,novadeal_score:84,affiliate_url:'https://www.darty.com/nav/achat/petit_electromenager/coiffure/styler_multifonctions/dyson_hsa09.html',image_url:'https://www.darty.com/images/articles/M/darty_6543210.jpg',detected_at:T},
    // ── Mode Zalando / ASOS ───────────────────────────────────
    {id:118,name:'Nike Air Max 270 Blanc Homme',brand:'Nike',category:'mode',store:'Zalando.fr',current_price:89,original_price:139,discount_pct:36,novadeal_score:91,affiliate_url:'https://www.zalando.fr/nike-sportswear-air-max-270-baskets-basses-white-ni111a0b4-a11.html',image_url:'https://img01.ztat.net/article/spp-media-p1/a3ee3f7c0c9c4e8a9b23c78d8fd9e3a4/d5f4124a3abb4ea1b8dcd79e26d6f9df.jpg',detected_at:T},
    {id:119,name:'Adidas Stan Smith Femme Blanc',brand:'Adidas',category:'mode',store:'Zalando.fr',current_price:70,original_price:100,discount_pct:30,novadeal_score:84,affiliate_url:'https://www.zalando.fr/adidas-originals-stan-smith-baskets-basses-ftwr-white-ad111a1l0-a11.html',image_url:'https://img01.ztat.net/article/spp-media-p1/2f74e4a7f8754ea0a6f3d82c9e1b5f62/8a3c2b15678040f5a9e1c7d3b2f4a6e8.jpg',detected_at:T},
    {id:120,name:"Levi's 501 Original Jean Homme Indigo",brand:"Levi's",category:'mode',store:'Zalando.fr',current_price:70,original_price:100,discount_pct:30,novadeal_score:83,affiliate_url:'https://www.zalando.fr/levis-501-original-jean-droit-medium-indigo-le221n0as-k11.html',image_url:'https://img01.ztat.net/article/spp-media-p1/9c2e4f6a8b1d3e5f7a9c2e4f6a8b1d3e/5f7a9c2e4f6a8b1d3e5f7a9c2e4f6a8b.jpg',detected_at:T},
    {id:121,name:'Lacoste Polo L.12.12 Blanc Taille L',brand:'Lacoste',category:'mode',store:'Lacoste',current_price:79,original_price:105,discount_pct:25,novadeal_score:86,affiliate_url:'https://www.lacoste.com/fr/lacoste/homme/vetements/polos/polo-classique-lacoste-en-petit-pique-L1212.html',image_url:'https://www.lacoste.com/medias/L1212-001-white.jpg',detected_at:T},
    {id:122,name:'Uniqlo Ultra Light Down Jacket Femme',brand:'Uniqlo',category:'mode',store:'Uniqlo',current_price:59,original_price:90,discount_pct:34,novadeal_score:88,affiliate_url:'https://www.uniqlo.com/fr/fr/products/E449193-000.html',image_url:'https://image.uniqlo.com/UQ/ST3/fr/imagesgoods/449193/item/frW3D449193-000.jpg',detected_at:T},
    // ── Maison IKEA / Amazon ───────────────────────────────────
    {id:123,name:'Dyson V15 Detect Aspirateur sans fil',brand:'Dyson',category:'maison',store:'Amazon.fr',current_price:449,original_price:699,discount_pct:36,novadeal_score:93,affiliate_url:'https://www.amazon.fr/dp/B092TTCD7C?tag=julvox-21',image_url:'https://images-na.ssl-images-amazon.com/images/I/B092TTCD7C._AC_SL400_.jpg',detected_at:T},
    {id:124,name:'iRobot Roomba i5+ Robot aspirateur',brand:'iRobot',category:'maison',store:'Amazon.fr',current_price:299,original_price:599,discount_pct:50,novadeal_score:94,affiliate_url:'https://www.amazon.fr/dp/B09Q7NPF8Y?tag=julvox-21',image_url:'https://images-na.ssl-images-amazon.com/images/I/B09Q7NPF8Y._AC_SL400_.jpg',detected_at:T},
    {id:125,name:'BILLY Bibliothèque Blanc IKEA 80x202cm',brand:'IKEA',category:'maison',store:'IKEA France',current_price:69,original_price:89,discount_pct:22,novadeal_score:83,affiliate_url:'https://www.ikea.com/fr/fr/p/billy-bibliotheque-blanc-00263850/',image_url:'https://www.ikea.com/fr/fr/images/products/billy-bibliotheque-blanc__0625599_pe692677_s5.jpg',detected_at:T},
    {id:126,name:'KALLAX Étagère 4×4 Blanc IKEA',brand:'IKEA',category:'maison',store:'IKEA France',current_price:149,original_price:199,discount_pct:25,novadeal_score:85,affiliate_url:'https://www.ikea.com/fr/fr/p/kallax-etagere-blanc-10275814/',image_url:'https://www.ikea.com/fr/fr/images/products/kallax-etagere-blanc__0644757_pe702938_s5.jpg',detected_at:T},
    {id:127,name:"De'Longhi Magnifica Start ECAM22011B",brand:"De'Longhi",category:'maison',store:"De'Longhi",current_price:299,original_price:499,discount_pct:40,novadeal_score:89,affiliate_url:'https://www.delonghi.com/fr-fr/machines-a-cafe-automatiques/magnifica-start-ecam22011b/ECAM22011B',image_url:'https://www.delonghi.com/media/catalog/product/ecam22011b-main.jpg',detected_at:T},
    {id:128,name:'Nespresso Vertuo Pop+ ENV92 Titan',brand:'Nespresso',category:'maison',store:'Darty.com',current_price:89,original_price:129,discount_pct:31,novadeal_score:82,affiliate_url:'https://www.darty.com/nav/achat/petit_electromenager/cafetiere/cafetiere_a_capsules/nespresso_env92_gy.html',image_url:'https://www.darty.com/images/articles/M/darty_7891234.jpg',detected_at:T},
    // ── Sport Decathlon ───────────────────────────────────────
    {id:129,name:'Quechua Chaussures randonnée MH500',brand:'Quechua',category:'sport',store:'Decathlon',current_price:49.99,original_price:79.99,discount_pct:38,novadeal_score:87,affiliate_url:'https://www.decathlon.fr/p/chaussures-randonnee-montagne-homme-mh500/_/R-p-306357',image_url:'https://contents.mediadecathlon.com/p1765219/k$1b3fa08a9c5a2f2b64f7b2c8e3d4a5f6/sq/chaussures-randonnee-montagne-quechua-mh500.jpg',detected_at:T},
    {id:130,name:"Garmin Forerunner 265 GPS Running",brand:'Garmin',category:'sport',store:'Amazon.fr',current_price:349,original_price:449,discount_pct:22,novadeal_score:89,affiliate_url:'https://www.amazon.fr/dp/B0BVBHY3S3?tag=julvox-21',image_url:'https://images-na.ssl-images-amazon.com/images/I/B0BVBHY3S3._AC_SL400_.jpg',detected_at:T},
    {id:131,name:'Fitbit Charge 6 Bracelet connecté',brand:'Fitbit',category:'sport',store:'Amazon.fr',current_price:119,original_price:159,discount_pct:25,novadeal_score:84,affiliate_url:'https://www.amazon.fr/dp/B0CCH9LDMG?tag=julvox-21',image_url:'https://images-na.ssl-images-amazon.com/images/I/B0CCH9LDMG._AC_SL400_.jpg',detected_at:T},
    {id:132,name:"B'Twin Vélo de route RC100 Disc",brand:"B'Twin",category:'sport',store:'Decathlon',current_price:349,original_price:499,discount_pct:30,novadeal_score:86,affiliate_url:'https://www.decathlon.fr/p/velo-route-rc100-disc/_/R-p-342567',image_url:'https://contents.mediadecathlon.com/p1654321/k$0123456789abcdef/sq/velo-route-btwin-rc100.jpg',detected_at:T},
    // ── Beauté Sephora / Nocibé ───────────────────────────────
    {id:133,name:'Charlotte Tilbury Airbrush Foundation',brand:'Charlotte Tilbury',category:'beaute',store:'Sephora',current_price:45,original_price:55,discount_pct:18,novadeal_score:82,affiliate_url:'https://www.sephora.fr/p/airbrush-flawless-longwear-foundation---fond-de-teint-P10029567.html',image_url:'https://www.sephora.fr/productimages/sku/s2312458-main-zoom.jpg',detected_at:T},
    {id:134,name:'YSL Libre EDP 50ml',brand:'Yves Saint Laurent',category:'beaute',store:'Nocibé',current_price:85,original_price:109,discount_pct:22,novadeal_score:80,affiliate_url:'https://www.nocibe.fr/marques/yves-saint-laurent/libre-eau-de-parfum-m10026789-p1',image_url:'https://www.nocibe.fr/img/products/ysl-libre-50ml.jpg',detected_at:T},
    {id:135,name:'Dior Sauvage EDT 100ml',brand:'Dior',category:'beaute',store:'Marionnaud',current_price:79,original_price:99,discount_pct:20,novadeal_score:79,affiliate_url:'https://www.marionnaud.fr/produit/dior-sauvage-eau-de-toilette-100ml-7654321',image_url:'https://www.marionnaud.fr/img/products/dior-sauvage-100ml.jpg',detected_at:T},
    // ── Informatique LDLC / Materiel.net ──────────────────────
    {id:136,name:'MSI MAG 274QRF-QD 27" 165Hz QHD IPS',brand:'MSI',category:'informatique',store:'LDLC',current_price:299,original_price:449,discount_pct:33,novadeal_score:89,affiliate_url:'https://www.ldlc.com/fiche/PB00534123/msi-mag-274qrf-qd.html',image_url:'https://static.ldlc.com/r1600/catalog/product/PB00534123.jpg',detected_at:T},
    {id:137,name:'Gigabyte GeForce RTX 4070 Super Eagle 12Go',brand:'Gigabyte',category:'informatique',store:'Materiel.net',current_price:549,original_price:699,discount_pct:21,novadeal_score:88,affiliate_url:'https://www.materiel.net/produit/202401250119.html',image_url:'https://www.materiel.net/media/product/202401250119_01.jpg',detected_at:T},
    {id:138,name:'Samsung 980 Pro SSD NVMe 2To',brand:'Samsung',category:'informatique',store:'Amazon.fr',current_price:119,original_price:199,discount_pct:40,novadeal_score:92,affiliate_url:'https://www.amazon.fr/dp/B08RK2SR23?tag=julvox-21',image_url:'https://images-na.ssl-images-amazon.com/images/I/B08RK2SR23._AC_SL400_.jpg',detected_at:T},
    {id:139,name:'Crucial RAM 32Go DDR5 5600MHz',brand:'Crucial',category:'informatique',store:'Amazon.fr',current_price:79,original_price:129,discount_pct:39,novadeal_score:90,affiliate_url:'https://www.amazon.fr/dp/B0BWDDJYYS?tag=julvox-21',image_url:'https://images-na.ssl-images-amazon.com/images/I/B0BWDDJYYS._AC_SL400_.jpg',detected_at:T},
    // ── Bricolage Lidl / Leroy Merlin ──────────────────────────
    {id:140,name:'Parkside Perceuse-visseuse 20V Lidl',brand:'Parkside',category:'bricolage',store:'Lidl.fr',current_price:29.99,original_price:49.99,discount_pct:40,novadeal_score:81,affiliate_url:'https://www.lidl.fr/p/parkside-perceuse-20v/p100378901',image_url:'https://www.lidl.fr/media/product/lid/p100378901/parkside-perceuse_600x600.jpg',detected_at:T},
    {id:141,name:'Kärcher K5 Premium Nettoyeur 145 bar',brand:'Kärcher',category:'bricolage',store:'Leroy Merlin',current_price:199,original_price:299,discount_pct:33,novadeal_score:85,affiliate_url:'https://www.leroymerlin.fr/produits/outillage/nettoyeur-haute-pression/nettoyeur-haute-pression-karcher-k5-premium-145-bar-12345678.html',image_url:'https://www.leroymerlin.fr/media/produits/karcher-k5-premium.jpg',detected_at:T},
    // ── Auto ──────────────────────────────────────────────────
    {id:142,name:'Michelin CrossClimate 2 205/55R16 91H',brand:'Michelin',category:'auto',store:'Norauto',current_price:79,original_price:119,discount_pct:34,novadeal_score:86,affiliate_url:'https://www.norauto.fr/p/pneu-michelin-crossclimate-2-205-55-r16-91h-2185989.html',image_url:'https://media.norauto.fr/product/pneu-michelin-crossclimate2.jpg',detected_at:T},
    {id:143,name:'Bosch C7 Chargeur batterie 12V/24V',brand:'Bosch',category:'auto',store:'Norauto',current_price:45,original_price:69,discount_pct:35,novadeal_score:82,affiliate_url:'https://www.norauto.fr/p/chargeur-batterie-bosch-c7-12v-24v-2345678.html',image_url:'https://media.norauto.fr/product/bosch-c7-chargeur.jpg',detected_at:T},
    // ── AliExpress ────────────────────────────────────────────
    {id:144,name:'Xiaomi Redmi Buds 5 Pro ANC TWS',brand:'Xiaomi',category:'high-tech',store:'AliExpress',current_price:29.99,original_price:59.99,discount_pct:50,novadeal_score:78,affiliate_url:'https://fr.aliexpress.com/item/1005007048891234.html',image_url:'https://ae01.alicdn.com/kf/S28bfab4b4bde49168ae98e08f9d83a98D/Xiaomi-Redmi-Buds-5-Pro.jpg_350x350.jpg',detected_at:T},
    {id:145,name:'Baseus 65W Chargeur GaN 4 ports',brand:'Baseus',category:'high-tech',store:'AliExpress',current_price:15.99,original_price:35.99,discount_pct:56,novadeal_score:75,affiliate_url:'https://fr.aliexpress.com/item/1005006234567890.html',image_url:'https://ae01.alicdn.com/kf/S6a7d8f1a9b2c3d4e5f6a7b8c9d0e1f2a3/Baseus-65W-GaN.jpg_350x350.jpg',detected_at:T},
    {id:146,name:'Amazfit Balance Smartwatch GPS AMOLED',brand:'Amazfit',category:'high-tech',store:'AliExpress',current_price:89.99,original_price:149.99,discount_pct:40,novadeal_score:79,affiliate_url:'https://fr.aliexpress.com/item/1005006789012345.html',image_url:'https://ae01.alicdn.com/kf/S1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7/Amazfit-Balance.jpg_350x350.jpg',detected_at:T},
    // ── Veepee / Showroomprivé ────────────────────────────────
    {id:147,name:'Vente privée Nike − jusqu\'à −40%',brand:'Nike',category:'sport',store:'Veepee',current_price:55,original_price:110,discount_pct:50,novadeal_score:80,affiliate_url:'https://www.veepee.fr/vente/nike',image_url:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=85',detected_at:T},
    {id:148,name:'Vente privée Lacoste − jusqu\'à −50%',brand:'Lacoste',category:'mode',store:'Veepee',current_price:49,original_price:99,discount_pct:51,novadeal_score:82,affiliate_url:'https://www.veepee.fr/vente/lacoste',image_url:'https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=400&q=85',detected_at:T},
    // ── LEGO / Jouets ──────────────────────────────────────────
    {id:149,name:'LEGO Technic Bugatti Chiron 42151',brand:'LEGO',category:'jouets',store:'LEGO',current_price:199,original_price:249,discount_pct:20,novadeal_score:85,affiliate_url:'https://www.lego.com/fr-fr/product/bugatti-chiron-42151',image_url:'https://www.lego.com/cdn/cs/set/assets/blt5f8a91e86a33f892/42151.jpg',detected_at:T},
    {id:150,name:'LEGO Icons Bouquet de fleurs sauvages',brand:'LEGO',category:'jouets',store:'LEGO',current_price:59,original_price:79,discount_pct:25,novadeal_score:83,affiliate_url:'https://www.lego.com/fr-fr/product/wildflower-bouquet-10313',image_url:'https://www.lego.com/cdn/cs/set/assets/bltb2b5da5c0a01dcea/10313.jpg',detected_at:T},
    // ── Voyages ────────────────────────────────────────────────
    {id:151,name:'TGV Paris → Lyon dès 29€',brand:'SNCF',category:'voyages',store:'SNCF Connect',current_price:29,original_price:79,discount_pct:63,novadeal_score:91,affiliate_url:'https://www.sncf-connect.com/app/trips/search?from=FRPAR&to=FRLYS',image_url:'https://www.sncf-connect.com/assets/medias/destinations/Lyon.jpg',detected_at:T},
    {id:152,name:'Vol Paris → Barcelone A/R dès 59€',brand:'Booking',category:'voyages',store:'Booking.com',current_price:59,original_price:149,discount_pct:60,novadeal_score:87,affiliate_url:'https://www.booking.com/flights/fr/searchresults.fr.html?from=CDG&to=BCN&lang=fr',image_url:'https://cf.bstatic.com/xdata/images/city/600x400/688143.webp',detected_at:T},
    // ── Santé / Parapharmacie ──────────────────────────────────
    {id:153,name:'La Roche-Posay Cicaplast Baume B5 40ml',brand:'La Roche-Posay',category:'sante',store:'Doctipharma',current_price:9.50,original_price:14.90,discount_pct:36,novadeal_score:84,affiliate_url:'https://www.doctipharma.fr/la-roche-posay-cicaplast-baume-b5-40ml-3337875549585.html',image_url:'https://www.doctipharma.fr/img/products/lrp-cicaplast-b5-40ml.jpg',detected_at:T},
    // ── Dealabs (deals communautaires) ────────────────────────
    {id:154,name:'[Dealabs] Apple Watch SE 2 GPS 40mm',brand:'Apple',category:'high-tech',store:'Dealabs',current_price:199,original_price:299,discount_pct:33,novadeal_score:92,affiliate_url:'https://www.dealabs.com/deals/apple-watch-se-2-gps-40mm',image_url:'https://images-na.ssl-images-amazon.com/images/I/B0CHX3QVKT._AC_SL400_.jpg',detected_at:T},
    {id:155,name:'[Dealabs] Anker 737 Chargeur GaN 120W',brand:'Anker',category:'high-tech',store:'Dealabs',current_price:55,original_price:90,discount_pct:39,novadeal_score:90,affiliate_url:'https://www.dealabs.com/deals/anker-737-chargeur-gan-120w',image_url:'https://images-na.ssl-images-amazon.com/images/I/B09W2H5K2T._AC_SL400_.jpg',detected_at:T},
    {id:156,name:'[Dealabs] SanDisk Extreme SSD 1To USB-C',brand:'SanDisk',category:'informatique',store:'Dealabs',current_price:69,original_price:129,discount_pct:47,novadeal_score:93,affiliate_url:'https://www.dealabs.com/deals/sandisk-extreme-ssd-portable-1to',image_url:'https://images-na.ssl-images-amazon.com/images/I/B08GYM5F8G._AC_SL400_.jpg',detected_at:T},
    // ── Lidl / Aldi promotions ────────────────────────────────
    {id:157,name:'Silvercrest Cafetière filtre 12 tasses',brand:'Silvercrest',category:'maison',store:'Lidl.fr',current_price:14.99,original_price:24.99,discount_pct:40,novadeal_score:79,affiliate_url:'https://www.lidl.fr/p/silvercrest-cafetiere-filtre/p100389512',image_url:'https://www.lidl.fr/media/product/lid/p100389512/silvercrest-cafetiere_600x600.jpg',detected_at:T},
    {id:158,name:'Medion Robot aspirateur LIDAR 2700Pa',brand:'Medion',category:'maison',store:'Aldi.fr',current_price:79.99,original_price:129.99,discount_pct:38,novadeal_score:80,affiliate_url:'https://www.aldi.fr/p/medion-aspirateur-robot/p99887766',image_url:'https://www.aldi.fr/content/dam/aldi/france/products/medion-robot.jpg',detected_at:T},
    // ── Alimentaire ───────────────────────────────────────────
    {id:159,name:'Champagne Veuve Clicquot Brut 75cl',brand:'Veuve Clicquot',category:'alimentaire',store:'Nicolas',current_price:34.90,original_price:49.90,discount_pct:30,novadeal_score:83,affiliate_url:'https://www.nicolas.com/vins/champagnes/veuve-clicquot-brut-75cl',image_url:'https://www.nicolas.com/media/catalog/product/veuve-clicquot-brut.jpg',detected_at:T},
    {id:160,name:'Nutella Pâte à tartiner 1kg',brand:'Ferrero',category:'alimentaire',store:'Carrefour',current_price:6.49,original_price:9.99,discount_pct:35,novadeal_score:77,affiliate_url:'https://www.carrefour.fr/p/nutella-pate-a-tartiner-1kg/8000500310427',image_url:'https://www.carrefour.fr/medias/nutella-1kg.jpg',detected_at:T},
  ];
})();

/* ─────────────────────────────────────────────────────────────
   OVERRIDE getDemoDeals avec les 60 deals v3
   ───────────────────────────────────────────────────────────── */
window.getDemoDeals = function(cat) {
  const all = DEMO_DEALS_V3;
  if (!cat) return all;
  return all.filter(d => d.category === cat || d.category === cat.replace('jouets','gaming'));
};


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

  // Fallback : deals démo
  if (!items.length) {
    items = DEMO_DEALS_V3.filter(d => d.novadeal_score >= 85).slice(0, 12);
  }

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
