/**
 * CityGirl Wardrobe — shared content/data layer.
 *
 * How the "admin controls the site" works: there is no backend/database here,
 * so admin.html and the storefront pages share a single JSON blob saved in
 * this browser's localStorage. The admin dashboard edits that blob; every
 * storefront page reads it on load. This means edits show up instantly for
 * anyone using the SAME browser the admin was used in — it will not, on its
 * own, push changes out to every visitor's device. Turning this into a real
 * multi-device CMS later just means swapping getContent()/saveContent() for
 * calls to a real backend (Node/Express + a database, Firebase, etc.) — the
 * rest of the site already reads content through those two functions, so
 * nothing else would need to change.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'cgw_content_v1';
  var CONTENT_VERSION = 3;

  // Monochrome presets. The site is black & white by design — these are subtle
  // variations on that (paper warmth, contrast level), all keeping the UI
  // ink-on-paper. The only colour on the storefront is the hero photograph.
  var THEMES = {
    mono:     { primary: '#0b0b0b', primaryDark: '#000000', secondary: '#2b2b2b', accent: '#0b0b0b', lilac: '#4d4d4d', bg: '#ffffff', bgAlt: '#f4f3f1', border: '#e6e5e2', label: 'Classic B&W' },
    contrast: { primary: '#000000', primaryDark: '#000000', secondary: '#141414', accent: '#000000', lilac: '#3a3a3a', bg: '#ffffff', bgAlt: '#f2f2f2', border: '#dcdcdc', label: 'High Contrast' },
    stone:    { primary: '#1a1a1a', primaryDark: '#0d0d0d', secondary: '#3a3a3a', accent: '#1a1a1a', lilac: '#5c5a56', bg: '#faf9f7', bgAlt: '#efece7', border: '#e2ded7', label: 'Warm Stone' },
    slate:    { primary: '#12141a', primaryDark: '#06070a', secondary: '#2c313d', accent: '#12141a', lilac: '#565d6b', bg: '#ffffff', bgAlt: '#f1f2f4', border: '#e2e4e8', label: 'Cool Slate' }
  };

  var DEFAULT_CONTENT = {
    version: CONTENT_VERSION,
    meta: {
      brandName: 'CityGirl Wardrobe',
      tagline: 'Cute fits for the girl who runs the city.',
      whatsapp: '2347018110075',
      instagram: 'shopcitygirlng',
      email: 'hello@citygirlwardrobe.com',
      theme: 'mono',
      customAccent: ''
    },
    announcement: {
      enabled: false,
      text: ''
    },
    hero: {
      heading: 'City Girl Energy. Dressed to Match.',
      subheading: 'Feminine, fun, and made for the girl who runs the city — a wardrobe as bold as she is.',
      buttonText: 'Shop New In',
      buttonLink: 'shop.html?filter=new',
      buttonText2: 'Shop Bestsellers',
      buttonLink2: 'shop.html?filter=bestsellers',
      video: 'assets/img/hero-citygirl.mp4',
      poster: 'assets/img/hero-poster.jpg',
      image: 'assets/img/hero-red-dress.jpg'
    },
    newsletter: {
      enabled: true,
      heading: 'Get 10% Off Your First Order 💕',
      subtext: 'Join the CityGirl fam for early drops, secret restocks and exclusive discounts.',
      discountText: '10% OFF',
      delaySeconds: 2
    },
    categories: ['Dresses', 'Sets', 'Tops', 'Bottoms', 'Accessories'],
    products: [
      { id: 'd1', name: 'Noir Crystal Gown', price: 220000, category: 'Dresses', tag: 'New', bestseller: true, rating: 5.0, reviews: 18,
        image: 'assets/img/drop-1.jpg', images: ['assets/img/drop-1.jpg'],
        sizes: ['S','M','L','XL'], fabric: 'Hand-beaded crystal lace over lining', stretch: 'Slight stretch', care: 'Dry clean only',
        modelSize: 'M', modelInfo: 'Model is 5\'9" / 1.75m and wearing a size M', fit: 'True to size · custom sizing on request',
        description: 'A show-stopping high-neck gown in hand-beaded black crystal lace — made to turn every head in the room.' },
      { id: 'd2', name: 'Golden Cascade Gown', price: 260000, category: 'Dresses', tag: 'New', bestseller: false, rating: 5.0, reviews: 12,
        image: 'assets/img/drop-2.jpg', images: ['assets/img/drop-2.jpg'],
        sizes: ['S','M','L','XL'], fabric: 'Gold & silver beaded fringe on stretch base', stretch: 'Medium stretch', care: 'Dry clean only',
        modelSize: 'M', modelInfo: 'Model is 5\'9" / 1.75m and wearing a size M', fit: 'Fitted · custom sizing on request',
        description: 'Cascading gold and silver beadwork over a sculpting black base — pure red-carpet drama.' },
      { id: 'd3', name: 'Lilac Shimmer Gown', price: 280000, category: 'Dresses', tag: 'New', bestseller: false, rating: 5.0, reviews: 9,
        image: 'assets/img/drop-3.jpg', images: ['assets/img/drop-3.jpg'],
        sizes: ['S','M','L','XL'], fabric: 'Lilac paillette sequins with pearl detail', stretch: 'Slight stretch', care: 'Dry clean only',
        modelSize: 'M', modelInfo: 'Model is 5\'9" / 1.75m and wearing a size M', fit: 'Strapless, true to size · custom sizing on request',
        description: 'A strapless lilac mermaid gown covered in soft petal sequins — romantic, glamorous and unforgettable.' },
      { id: 'd4', name: 'Amethyst Halter Gown', price: 300000, category: 'Dresses', tag: 'New', bestseller: true, rating: 5.0, reviews: 14,
        image: 'assets/img/drop-4.jpg', images: ['assets/img/drop-4.jpg'],
        sizes: ['S','M','L','XL'], fabric: 'Purple crystal-beaded mesh over lining', stretch: 'Slight stretch', care: 'Dry clean only',
        modelSize: 'M', modelInfo: 'Model is 5\'9" / 1.75m and wearing a size M', fit: 'Halter neck, true to size · custom sizing on request',
        description: 'A deep amethyst halter gown dripping in teardrop crystals — elegant, bold and made to be remembered.' },
      { id: 'd5', name: 'Pearl Fringe Dress', price: 260000, category: 'Dresses', tag: 'New', bestseller: false, rating: 5.0, reviews: 11,
        image: 'assets/img/drop-5.jpg', images: ['assets/img/drop-5.jpg'],
        sizes: ['S','M','L','XL'], fabric: 'Hand-strung pearl fringe on stretch mesh', stretch: 'Medium stretch', care: 'Dry clean only',
        modelSize: 'M', modelInfo: 'Model is 5\'9" / 1.75m and wearing a size M', fit: 'Midi length, true to size · custom sizing on request',
        description: 'A luminous pearl-fringe midi that moves with you — the ultimate birthday or dinner statement.' },
      { id: 'd6', name: 'Scarlet Crystal Gown', price: 310000, category: 'Dresses', tag: 'New', bestseller: true, rating: 5.0, reviews: 16,
        image: 'assets/img/drop-6.jpg', images: ['assets/img/drop-6.jpg'],
        sizes: ['S','M','L','XL'], fabric: 'Red crystal fringe with sculpted bardot bodice', stretch: 'Slight stretch', care: 'Dry clean only',
        modelSize: 'M', modelInfo: 'Model is 5\'9" / 1.75m and wearing a size M', fit: 'Off-shoulder, true to size · custom sizing on request',
        description: 'A sculpted scarlet gown with a dramatic bardot neckline and shimmering crystal fringe — couture-level glamour.' },
      { id: 'p1', name: 'Bubblegum Wrap Dress', price: 25000, category: 'Dresses', tag: '', bestseller: true, rating: 4.9, reviews: 38,
        image: 'https://loremflickr.com/700/900/dress,fashion/all?lock=11',
        images: ['https://loremflickr.com/700/900/dress,fashion/all?lock=11','https://loremflickr.com/700/900/dress,woman/all?lock=111','https://loremflickr.com/700/900/dress,detail/all?lock=211'],
        sizes: ['S','M','L','XL'], fabric: 'Soft cotton blend with a touch of stretch', stretch: 'Medium stretch', care: 'Hand wash cold, hang to dry, cool iron',
        modelSize: 'M', modelInfo: 'Model is 5\'8" / 1.73m and wearing a size M', fit: 'True to size',
        description: 'A soft wrap dress with a flirty tie waist — pretty for brunch or a night out.' },
      { id: 'p2', name: 'Sunset Satin Slip Dress', price: 22000, category: 'Dresses', tag: '', bestseller: true, rating: 4.8, reviews: 24,
        image: 'https://loremflickr.com/700/900/satin,dress/all?lock=12',
        images: ['https://loremflickr.com/700/900/satin,dress/all?lock=12','https://loremflickr.com/700/900/evening,dress/all?lock=112','https://loremflickr.com/700/900/silk,fabric/all?lock=212'],
        sizes: ['S','M','L','XL'], fabric: 'Silky satin, smooth and light', stretch: 'No stretch', care: 'Hand wash cold or dry clean, hang to dry',
        modelSize: 'S', modelInfo: 'Model is 5\'9" / 1.75m and wearing a size S', fit: 'True to size',
        description: 'Silky satin slip dress that catches the light — layer it or wear it alone.' },
      { id: 'p3', name: 'Blush Co-ord Set', price: 30000, category: 'Sets', tag: 'Bestseller', bestseller: true, rating: 5.0, reviews: 51,
        image: 'https://loremflickr.com/700/900/fashion,outfit/all?lock=13',
        images: ['https://loremflickr.com/700/900/fashion,outfit/all?lock=13','https://loremflickr.com/700/900/two,piece/all?lock=113','https://loremflickr.com/700/900/fashion,fabric/all?lock=213'],
        sizes: ['S','M','L','XL'], fabric: 'Structured crepe, holds its shape', stretch: 'Light stretch', care: 'Machine wash cold (gentle), hang to dry',
        modelSize: 'M', modelInfo: 'Model is 5\'7" / 1.70m and wearing a size M', fit: 'Relaxed — size down for a fitted look',
        description: 'Matching top and trousers — an easy head-to-toe fit that always looks put together.' },
      { id: 'p4', name: 'Cloud Knit Set', price: 28500, category: 'Sets', tag: '', bestseller: false, rating: 4.7, reviews: 16,
        image: 'https://loremflickr.com/700/900/knitwear,fashion/all?lock=14',
        images: ['https://loremflickr.com/700/900/knitwear,fashion/all?lock=14','https://loremflickr.com/700/900/knit,sweater/all?lock=114','https://loremflickr.com/700/900/knit,texture/all?lock=214'],
        sizes: ['S','M','L','XL'], fabric: 'Cosy brushed knit', stretch: 'High stretch', care: 'Hand wash cold, dry flat',
        modelSize: 'M', modelInfo: 'Model is 5\'8" / 1.73m and wearing a size M', fit: 'Relaxed, stretches to fit',
        description: 'Cosy knit two-piece that feels like a hug — perfect for cooler city nights.' },
      { id: 'p5', name: 'Peachy Crop Top', price: 9500, category: 'Tops', tag: '', bestseller: true, rating: 4.8, reviews: 33,
        image: 'https://loremflickr.com/700/900/top,fashion/all?lock=15',
        images: ['https://loremflickr.com/700/900/top,fashion/all?lock=15','https://loremflickr.com/700/900/crop,top/all?lock=115','https://loremflickr.com/700/900/cotton,fabric/all?lock=215'],
        sizes: ['S','M','L','XL'], fabric: 'Ribbed cotton, soft and breathable', stretch: 'High stretch', care: 'Machine wash cold, hang to dry',
        modelSize: 'S', modelInfo: 'Model is 5\'6" / 1.68m and wearing a size S', fit: 'Fitted — true to size',
        description: 'A sweet little crop top that pairs with everything in your wardrobe.' },
      { id: 'p6', name: 'Ribbon Cami Top', price: 8000, category: 'Tops', tag: '', bestseller: false, rating: 4.6, reviews: 12,
        image: 'https://loremflickr.com/700/900/blouse,fashion/all?lock=16',
        images: ['https://loremflickr.com/700/900/blouse,fashion/all?lock=16','https://loremflickr.com/700/900/cami,top/all?lock=116','https://loremflickr.com/700/900/silk,detail/all?lock=216'],
        sizes: ['S','M','L','XL'], fabric: 'Lightweight satin', stretch: 'No stretch', care: 'Hand wash cold, hang to dry',
        modelSize: 'M', modelInfo: 'Model is 5\'8" / 1.73m and wearing a size M', fit: 'True to size',
        description: 'Delicate straps and a fitted cami cut — simple, cute and easy to style.' },
      { id: 'p7', name: 'City Pleated Skirt', price: 14000, category: 'Bottoms', tag: '', bestseller: false, rating: 4.7, reviews: 19,
        image: 'https://loremflickr.com/700/900/skirt,fashion/all?lock=17',
        images: ['https://loremflickr.com/700/900/skirt,fashion/all?lock=17','https://loremflickr.com/700/900/pleated,skirt/all?lock=117','https://loremflickr.com/700/900/fabric,pleat/all?lock=217'],
        sizes: ['S','M','L','XL'], fabric: 'Flowy pleated chiffon with lining', stretch: 'Elastic waist', care: 'Hand wash cold, hang to dry',
        modelSize: 'M', modelInfo: 'Model is 5\'7" / 1.70m and wearing a size M', fit: 'Elastic waist — comfy, true to size',
        description: 'A flowy pleated midi skirt that moves with you all day.' },
      { id: 'p8', name: 'Denim Mini Skirt', price: 13500, category: 'Bottoms', tag: 'Bestseller', bestseller: true, rating: 4.9, reviews: 44,
        image: 'https://loremflickr.com/700/900/denim,skirt/all?lock=18',
        images: ['https://loremflickr.com/700/900/denim,skirt/all?lock=18','https://loremflickr.com/700/900/denim,fashion/all?lock=118','https://loremflickr.com/700/900/denim,texture/all?lock=218'],
        sizes: ['S','M','L','XL'], fabric: 'Structured denim', stretch: 'Light stretch', care: 'Machine wash cold, hang to dry',
        modelSize: 'M', modelInfo: 'Model is 5\'8" / 1.73m and wearing a size M', fit: 'True to size — high waist',
        description: 'A wardrobe staple denim mini with a flattering high waist.' },
      { id: 'p9', name: 'Heart Charm Bag', price: 11000, category: 'Accessories', tag: '', bestseller: true, rating: 4.9, reviews: 29,
        image: 'https://loremflickr.com/700/900/handbag,fashion/all?lock=19',
        images: ['https://loremflickr.com/700/900/handbag,fashion/all?lock=19','https://loremflickr.com/700/900/purse,bag/all?lock=119','https://loremflickr.com/700/900/bag,detail/all?lock=219'],
        sizes: ['One Size'], fabric: 'Vegan leather', stretch: '', care: 'Wipe clean with a soft cloth',
        modelSize: '', modelInfo: 'Approx. 18cm × 12cm with adjustable strap', fit: 'One size',
        description: 'A tiny charm bag to complete any fit — just the right size for the essentials.' },
      { id: 'p10', name: 'Pearl Hair Clip Set', price: 4500, category: 'Accessories', tag: '', bestseller: false, rating: 4.8, reviews: 21,
        image: 'https://loremflickr.com/700/900/hair,accessory/all?lock=20',
        images: ['https://loremflickr.com/700/900/hair,accessory/all?lock=20','https://loremflickr.com/700/900/pearl,accessory/all?lock=120','https://loremflickr.com/700/900/hairclip/all?lock=220'],
        sizes: ['One Size'], fabric: 'Acrylic pearls, metal clips', stretch: '', care: 'Keep dry, store in a pouch',
        modelSize: '', modelInfo: 'Set of 3 clips', fit: 'One size',
        description: 'Set of 3 pearl hair clips — the cutest finishing touch.' }
    ],
    reviews: [
      { name: '@amaka.o', rating: 5, text: 'The dress is even finer in person 😭 fits perfectly and came so fast.', product: 'Bubblegum Wrap Dress' },
      { name: '@its_tolu', rating: 5, text: 'My co-ord set is my favourite thing right now. Quality is unreal for the price.', product: 'Blush Co-ord Set' },
      { name: '@zeeworld_', rating: 5, text: 'Ordered from Abuja, arrived in 3 days. The customer service on WhatsApp is so sweet.', product: 'Denim Mini Skirt' },
      { name: '@bella.styles', rating: 5, text: 'CityGirl never misses. Everyone keeps asking where I got my top!', product: 'Peachy Crop Top' }
    ],
    // Instagram / look-book strip on the home page. Leave empty to use sample
    // imagery; later, fill this from your database (or a real IG feed) — the
    // home page reads it straight from here.
    gallery: [],
    about: {
      heading: "Hey, we're CityGirl Wardrobe 💜",
      body: "We started CityGirl Wardrobe because every girl deserves fits that feel as good as they look. Every piece is picked (and loved) by us first — cute, comfy, and made for real city life: work, brunch, nights out, everything in between.\n\nWe're small, we're growing, and we read every single DM. Thank you for shopping with us!"
    },
    footer: {
      about: 'Feminine, fun clothing for the girl who runs the city. Based in Lagos, shipping worldwide.'
    }
  };

  function deepMerge(base, override) {
    if (Array.isArray(base)) return Array.isArray(override) ? override : base;
    if (typeof base === 'object' && base !== null) {
      var out = {};
      for (var key in base) {
        out[key] = deepMerge(base[key], override && override[key] !== undefined ? override[key] : undefined);
      }
      return out;
    }
    return override !== undefined ? override : base;
  }

  function getContent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_CONTENT));
      var saved = JSON.parse(raw);
      return deepMerge(DEFAULT_CONTENT, saved);
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_CONTENT));
    }
  }

  function saveContent(content) {
    content.version = CONTENT_VERSION;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(content)); }
    catch (e) { alert('Could not save — this browser\'s storage is full or blocked. Try a smaller image (paste an image URL instead of uploading).'); }
  }

  function resetContent() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  function formatPrice(n) {
    return '₦' + Number(n || 0).toLocaleString('en-NG');
  }

  function getTheme(name) {
    // Any unknown/legacy theme name (e.g. an old 'rose' saved before the
    // black & white redesign) resolves to the default monochrome theme, so the
    // UI is never accidentally repainted in a retired palette.
    return THEMES[name] || THEMES.mono;
  }

  function applyTheme(content) {
    var theme = getTheme(content.meta.theme);
    var root = document.documentElement;
    root.style.setProperty('--brand-primary', content.meta.customAccent || theme.primary);
    root.style.setProperty('--brand-primary-dark', theme.primaryDark);
    root.style.setProperty('--brand-secondary', theme.secondary);
    root.style.setProperty('--brand-accent', theme.accent);
    root.style.setProperty('--brand-lilac', theme.lilac);
    root.style.setProperty('--brand-bg', theme.bg);
    root.style.setProperty('--brand-bg-alt', theme.bgAlt);
    root.style.setProperty('--brand-border', theme.border);
  }

  // ---- Newsletter subscribers (captured client-side, viewable in Admin) ----
  var SUBS_KEY = 'cgw_subscribers';
  function addSubscriber(email) {
    var subs = getSubscribers();
    email = String(email || '').trim().toLowerCase();
    if (!email) return;
    if (subs.indexOf(email) === -1) subs.push(email);
    try { localStorage.setItem(SUBS_KEY, JSON.stringify(subs)); } catch (e) {}
    // Also save to the database when connected (fire-and-forget).
    if (window.CGWDB && window.CGWDB.addSubscriber) {
      try { Promise.resolve(window.CGWDB.addSubscriber(email)).catch(function () {}); } catch (e) {}
    }
  }
  function getSubscribers() {
    try { return JSON.parse(localStorage.getItem(SUBS_KEY)) || []; } catch (e) { return []; }
  }

  // ---- Bag (cart) ----
  // Each line is { id, size, qty, name, price, image }. The same product in two
  // sizes is two lines. name/price/image are a snapshot taken when the item was
  // added, so the bag still shows it on pages that haven't loaded the live
  // catalogue yet. Checkout always re-prices from the live catalogue.
  var BAG_KEY = 'cgw_bag';
  var MAX_QTY = 20;
  function cleanLine(i) {
    var qty = Math.max(0, Math.min(MAX_QTY, parseInt(i.qty, 10) || 0));
    return { id: String(i.id), size: i.size || 'One Size', qty: qty, name: i.name || '', price: Number(i.price) || 0, image: i.image || '' };
  }
  function getBag() {
    try {
      var bag = JSON.parse(localStorage.getItem(BAG_KEY)) || [];
      if (!Array.isArray(bag)) return [];
      return bag.filter(function (i) { return i && i.id != null; }).map(cleanLine).filter(function (i) { return i.qty > 0; });
    } catch (e) { return []; }
  }
  function saveBag(bag) {
    try { localStorage.setItem(BAG_KEY, JSON.stringify(bag)); } catch (e) {}
  }
  function addToBag(productId, size, product) {
    size = size || 'One Size';
    var bag = getBag();
    var existing = bag.find(function (i) { return i.id === String(productId) && i.size === size; });
    if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + 1);
    else existing = bag[bag.push(cleanLine({ id: productId, size: size, qty: 1 })) - 1];
    if (product) { existing.name = product.name; existing.price = Number(product.price) || 0; existing.image = product.image || ''; }
    saveBag(bag);
    return bag;
  }
  function updateBagQty(productId, size, qty) {
    var bag = getBag().map(function (i) {
      if (i.id === String(productId) && i.size === size) i.qty = Math.max(0, Math.min(MAX_QTY, qty));
      return i;
    }).filter(function (i) { return i.qty > 0; });
    saveBag(bag);
    return bag;
  }
  function clearBag() { saveBag([]); }

  // ---- Orders (checkout) ----------------------------------------------------
  // Local stand-in for a real database. saveOrder() currently appends the order
  // to this browser's localStorage; getOrders() reads them back. When you add a
  // backend, this is the ONE place to change: swap the localStorage calls for a
  // `fetch('/api/orders', { method:'POST', body: JSON.stringify(order) })` (and
  // a GET for getOrders). Nothing else on the checkout needs to change, since
  // checkout.html talks to orders only through these two functions.
  var ORDERS_KEY = 'cgw_orders';
  function getOrders() {
    try { return JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; } catch (e) { return []; }
  }
  // The customer's own order history in this browser ("My Orders"). Only
  // called once an order is really placed, so it never lists a failed one.
  function rememberOrder(order) {
    var orders = getOrders().filter(function (o) { return o.ref !== order.ref; });
    orders.unshift(order);
    try { localStorage.setItem(ORDERS_KEY, JSON.stringify(orders.slice(0, 50))); } catch (e) {}
  }
  function saveOrder(order) {
    // Save to the database. Returns a promise that rejects if the order could
    // not be stored, so checkout can tell the customer instead of failing silently.
    if (!(window.CGWDB && window.CGWDB.createOrder)) return Promise.reject(new Error('Store database is not connected'));
    return Promise.resolve(window.CGWDB.createOrder(order)).then(function (res) {
      if (res && res.error) throw new Error(res.error.message || 'Order could not be saved');
      return order;
    });
  }
  // Human-friendly order reference, e.g. CGW-8F3K2A
  function generateOrderRef() {
    var s = '';
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (var i = 0; i < 6; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
    // Avoid Math.random where a secure generator exists (refs double as payment references).
    if (window.crypto && window.crypto.getRandomValues) {
      var buf = new Uint32Array(8); window.crypto.getRandomValues(buf); s = '';
      for (var j = 0; j < 8; j++) s += chars.charAt(buf[j] % chars.length);
    }
    return 'CGW-' + s;
  }

  global.CGW = {
    DEFAULT_CONTENT: DEFAULT_CONTENT,
    THEMES: THEMES,
    getContent: getContent,
    saveContent: saveContent,
    resetContent: resetContent,
    formatPrice: formatPrice,
    getTheme: getTheme,
    applyTheme: applyTheme,
    addSubscriber: addSubscriber,
    getSubscribers: getSubscribers,
    getBag: getBag,
    saveBag: saveBag,
    addToBag: addToBag,
    updateBagQty: updateBagQty,
    clearBag: clearBag,
    getOrders: getOrders,
    saveOrder: saveOrder,
    rememberOrder: rememberOrder,
    generateOrderRef: generateOrderRef
  };
})(window);
