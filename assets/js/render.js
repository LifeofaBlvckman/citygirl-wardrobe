/**
 * CityGirl Wardrobe — renders header/footer/announcement/modals/products
 * from the shared content object (see store-data.js) into every storefront
 * page, and wires up the interactive bits (nav, search, bag drawer, quick
 * view, newsletter popup, floating WhatsApp, reveal animation).
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var content = window.CGW.getContent();
  window.CGW.applyTheme(content);

  var IMG_FALLBACK = 'assets/img/product-fallback.jpg';
  var ONERR = ' onerror="this.onerror=null;this.src=\'' + IMG_FALLBACK + '\'"';

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function waLink(text) {
    return 'https://wa.me/' + encodeURIComponent(content.meta.whatsapp) + (text ? '?text=' + encodeURIComponent(text) : '');
  }
  function productById(id) { return content.products.find(function (p) { return String(p.id) === String(id); }); }

  // ---------- Live catalogue ----------
  // Every page gets products the same way: bundled sample data first, replaced by
  // the live Supabase catalogue once it arrives. Pages wait on CGWRender.products().
  var productsPromise = null;
  function loadProducts() {
    if (productsPromise) return productsPromise;
    productsPromise = (window.CGWDB ? Promise.resolve().then(function () { return window.CGWDB.products(); }) : Promise.resolve([]))
      .then(function (list) { if (list && list.length) content.products = list; })
      .catch(function (e) { console.warn('CityGirl: live products unavailable, using bundled data', e); })
      .then(function () {
        refreshBagSnapshots();
        if (document.querySelector('.bag-drawer-overlay.is-open')) renderBagContents();
        return content.products;
      });
    return productsPromise;
  }
  // Keep bag snapshots (name/price/photo) in step with the live catalogue.
  function refreshBagSnapshots() {
    var bag = window.CGW.getBag(), changed = false;
    bag.forEach(function (line) {
      var p = productById(line.id);
      if (p && (line.name !== p.name || line.price !== p.price || line.image !== p.image)) {
        line.name = p.name; line.price = p.price; line.image = p.image; changed = true;
      }
    });
    if (changed) window.CGW.saveBag(bag);
  }
  // Product for a bag line: live/bundled product if known, otherwise the snapshot.
  function bagLineProduct(line) {
    return productById(line.id) || (line.name ? { id: line.id, name: line.name, price: line.price, image: line.image } : null);
  }

  // ---------- Overlays: one scroll lock + Escape to close ----------
  var OVERLAYS = '.modal-overlay.is-open, .bag-drawer-overlay.is-open, .menu-overlay.is-open, .search-overlay.is-open';
  function syncScrollLock() {
    document.documentElement.classList.toggle('is-locked', !!document.querySelector(OVERLAYS));
  }
  function closeAllOverlays() {
    document.querySelectorAll(OVERLAYS).forEach(function (el) { el.classList.remove('is-open'); });
    var t = document.querySelector('.nav-toggle'); if (t) t.setAttribute('aria-expanded', 'false');
    syncScrollLock();
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAllOverlays(); });

  // Small "Added to bag" confirmation.
  var toastTimer = null;
  function toast(message) {
    var el = document.getElementById('cgw-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cgw-toast'; el.className = 'cgw-toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-visible'); }, 2200);
  }
  function addProductToBag(product, size, quiet) {
    window.CGW.addToBag(product.id, size, product);
    updateBagCount(true);
    if (!quiet) toast('Added to bag — ' + product.name);
  }
  function isBestseller(p) { return p.bestseller === true || p.tag === 'Bestseller'; }
  function starsHtml(rating, reviews) {
    var full = Math.round(rating || 5);
    var s = '';
    for (var i = 0; i < 5; i++) s += '<span class="star' + (i < full ? '' : ' empty') + '">★</span>';
    return '<span class="stars" aria-label="' + (rating || 5) + ' out of 5">' + s + '</span>' +
      (reviews ? '<span class="rating-count">' + (rating ? rating.toFixed(1) + ' · ' : '') + reviews + ' reviews</span>' : '');
  }

  function logoBadgeHtml(variant) {
    var cls = variant === 'sm' ? 'logo-badge badge-sm' : 'logo-badge badge-full';
    return '<img class="' + cls + '" src="assets/img/logo.png" alt="CityGirl Wardrobe" width="' +
      (variant === 'sm' ? 46 : 96) + '" height="' + (variant === 'sm' ? 46 : 96) + '">';
  }

  function renderAnnouncement() {
    var el = document.getElementById('announcement-bar');
    if (!el) return;
    if (content.announcement.enabled && content.announcement.text) {
      el.innerHTML = escapeHtml(content.announcement.text);
      el.style.display = '';
    } else { el.style.display = 'none'; }
  }

  function renderHeader(activePage) {
    var el = document.getElementById('site-header');
    if (!el) return;
    // Shop-first navigation: New In + garment categories + Bestsellers, then About/Contact.
    var links = [{ href: 'index.html', label: 'Home' }, { href: 'shop.html?filter=new', label: 'New In' }]
      .concat(content.categories.map(function (c) { return { href: 'shop.html?cat=' + encodeURIComponent(c), label: c }; }))
      .concat([
        { href: 'shop.html?filter=bestsellers', label: 'Bestsellers' },
        { href: 'about.html', label: 'About' },
        { href: 'contact.html', label: 'Contact' }
      ]);
    var linksHtml = links.map(function (l) {
      return '<a href="' + l.href + '"' + (l.href === activePage ? ' aria-current="page"' : '') + '>' + escapeHtml(l.label) + '</a>';
    }).join('');

    // Simple storefront header: menu (left) · brand name (centre) · search + bag (right).
    el.innerHTML =
      '<div class="nav">' +
        '<button class="btn-icon nav-toggle" aria-expanded="false" aria-controls="nav-links" aria-label="Open menu">' +
          '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>' +
        '</button>' +
        '<a href="index.html" class="brand-lockup" aria-label="' + escapeHtml(content.meta.brandName) + '">' + logoBadgeHtml('sm') +
          '<span class="brand-name">CITY<b class="bn-accent">GIRL</b></span>' +
        '</a>' +
        '<div class="nav-actions">' +
          '<button class="btn-icon" id="search-open-btn" aria-label="Search">' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.6-4.6"/></svg>' +
          '</button>' +
          '<button class="btn-icon bag-btn" id="bag-open-btn" aria-label="Open bag">' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16l-1.3 12.1a1 1 0 0 1-1 .9H6.3a1 1 0 0 1-1-.9z"/><path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10"/></svg>' +
            '<span class="bag-count" id="bag-count" hidden>0</span>' +
          '</button>' +
        '</div>' +
      '</div>';

    // Slide-out menu drawer (lives on <body> so it isn't clipped by the header).
    var menu = document.createElement('div');
    menu.className = 'menu-overlay';
    menu.id = 'menu-overlay';
    menu.innerHTML =
      '<nav class="menu-drawer" id="nav-links" aria-label="Primary">' +
        '<div class="menu-head">' +
          '<span class="menu-title">Menu</span>' +
          '<button class="btn-icon" id="menu-close-btn" aria-label="Close menu">' +
            '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="menu-links">' + linksHtml + '</div>' +
      '</nav>';
    document.body.appendChild(menu);
  }

  function renderFooter() {
    var el = document.getElementById('site-footer');
    if (!el) return;
    var catLinks = content.categories.map(function (c) {
      return '<li><a href="shop.html?cat=' + encodeURIComponent(c) + '">' + escapeHtml(c) + '</a></li>';
    }).join('');
    el.innerHTML =
      '<div class="container footer-grid">' +
        '<div>' +
          '<a href="index.html" class="brand-lockup" style="margin-bottom:14px;display:inline-flex;">' + logoBadgeHtml('sm') +
            '<span class="brand-name" style="color:#fff;">CITY<b class="bn-accent">GIRL</b></span>' +
          '</a>' +
          '<p>' + escapeHtml(content.footer.about) + '</p>' +
          '<div class="social-row">' +
            '<a href="https://instagram.com/' + encodeURIComponent(content.meta.instagram) + '" aria-label="Instagram" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1"/></svg></a>' +
            '<a href="' + waLink('') + '" aria-label="WhatsApp" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.6 14.2c-.2.6-1.4 1.2-1.9 1.3-.5.1-1.1.2-3.5-.8-2.9-1.2-4.8-4.2-5-4.4-.1-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5.2.6.7 1.9.8 2 .1.2.1.4 0 .6-.1.2-.2.4-.4.6l-.5.6c-.2.2-.3.4-.1.7.2.3.9 1.4 1.9 2.3 1.3 1.2 2.4 1.5 2.7 1.7.3.2.5.1.7-.1l.9-1c.2-.3.4-.2.7-.1l1.8.9c.2.1.4.2.5.3.1.2.1.9-.1 1.5Z"/></svg></a>' +
          '</div>' +
        '</div>' +
        '<div><h4>Shop</h4><ul class="footer-links">' +
          '<li><a href="shop.html?filter=new">New In</a></li>' + catLinks +
          '<li><a href="shop.html?filter=bestsellers">Bestsellers</a></li>' +
        '</ul></div>' +
        '<div><h4>Quick Links</h4><ul class="footer-links">' +
          '<li><a href="index.html">Home</a></li><li><a href="about.html">About Us</a></li>' +
          '<li><a href="contact.html">Contact</a></li>' +
        '</ul></div>' +
        '<div><h4>Get In Touch</h4><ul class="footer-links">' +
          '<li><a href="mailto:' + escapeHtml(content.meta.email) + '">' + escapeHtml(content.meta.email) + '</a></li>' +
          '<li><a href="' + waLink('') + '" target="_blank" rel="noopener">WhatsApp Us</a></li>' +
          '<li><a href="https://instagram.com/' + encodeURIComponent(content.meta.instagram) + '" target="_blank" rel="noopener">@' + escapeHtml(content.meta.instagram) + '</a></li>' +
        '</ul></div>' +
      '</div>' +
      '<div class="container footer-bottom">' +
        '<span>© <span data-year></span> ' + escapeHtml(content.meta.brandName) + '. All rights reserved.</span>' +
        '<span>Made with 🖤 in Lagos</span>' +
      '</div>';
    var y = el.querySelector('[data-year]');
    if (y) y.textContent = new Date().getFullYear();
  }

  // Badge on the photo: shown for tags like "Sale" or "Sold Out". "New" and
  // "Bestseller" are skipped — the rails they appear in already say that.
  function cardBadge(p) {
    if (!p.tag || p.tag === 'New' || p.tag === 'Bestseller') return '';
    return '<span class="product-tag" data-tag="' + escapeHtml(p.tag) + '">' + escapeHtml(p.tag) + '</span>';
  }

  function productCardHtml(p) {
    return (
      '<div class="product-card" data-reveal>' +
        '<div class="product-media">' +
          cardBadge(p) +
          '<img src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(p.name) + '" loading="lazy" data-quickview="' + p.id + '"' + ONERR + '>' +
          // Opens the quick view so the customer picks a size before it goes in the bag.
          '<button class="card-bag-btn" data-quickview="' + p.id + '" aria-label="Add ' + escapeHtml(p.name) + ' to bag">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16l-1.3 12.1a1 1 0 0 1-1 .9H6.3a1 1 0 0 1-1-.9z"/><path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="product-body">' +
          '<h3 data-quickview="' + p.id + '">' + escapeHtml(p.name) + '</h3>' +
          '<span class="product-price">' + window.CGW.formatPrice(p.price) + '</span>' +
        '</div>' +
      '</div>'
    );
  }

  // Large image card with a title and "View all" link (homepage collection rails).
  function collectionCardHtml(c) {
    return (
      '<a class="collection-card" href="' + escapeHtml(c.href) + '">' +
        '<img src="' + escapeHtml(c.image) + '" alt="" loading="lazy"' + ONERR + '>' +
        '<span class="collection-text"><span class="collection-title">' + escapeHtml(c.title) + '</span>' +
        '<span class="collection-link">View all</span></span>' +
      '</a>'
    );
  }

  function renderNewsletterModal() {
    var root = document.getElementById('newsletter-modal-root');
    if (!root) return;
    root.innerHTML =
      '<div class="modal-overlay" id="newsletter-overlay">' +
        '<div class="newsletter-modal" id="newsletter-modal">' +
          '<button class="modal-close" id="newsletter-close" aria-label="Close">&times;</button>' +
          logoBadgeHtml() +
          '<h2 style="margin-top:14px;">' + escapeHtml(content.newsletter.heading) + '</h2>' +
          '<p class="text-muted">' + escapeHtml(content.newsletter.subtext) + '</p>' +
          '<span class="discount-pill">' + escapeHtml(content.newsletter.discountText) + '</span>' +
          '<form id="newsletter-form">' +
            '<input type="email" required placeholder="Enter your email">' +
            '<button type="submit" class="btn btn-primary btn-block">Unlock My Discount</button>' +
          '</form>' +
          '<p class="modal-note">No spam, ever — just cute new drops.</p>' +
          '<p class="modal-success">Yay, you\'re in! Check your inbox for your code.</p>' +
        '</div>' +
      '</div>';

    var overlay = document.getElementById('newsletter-overlay');
    var modal = document.getElementById('newsletter-modal');
    function openModal() { modal.classList.remove('is-success'); overlay.classList.add('is-open'); syncScrollLock(); }
    function closeModal() { overlay.classList.remove('is-open'); syncScrollLock(); }
    window.CGW.openNewsletter = openModal;
    document.getElementById('newsletter-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    document.getElementById('newsletter-form').addEventListener('submit', function (e) {
      e.preventDefault();
      window.CGW.addSubscriber(e.target.querySelector('input[type="email"]').value);
      try { localStorage.setItem('cgw_subscribed', '1'); } catch (err) {}
      modal.classList.add('is-success');
      var pill = document.getElementById('promo-pill');
      if (pill) { pill.hidden = true; document.body.classList.remove('has-promo'); }
      try { sessionStorage.setItem('cgw_promo_closed', '1'); } catch (err) {}
      setTimeout(closeModal, 2200);
    });
  }

  function renderBagDrawer() {
    var root = document.getElementById('bag-drawer-root');
    if (!root) return;
    root.innerHTML =
      '<div class="bag-drawer-overlay" id="bag-overlay">' +
        '<div class="bag-drawer">' +
          '<div class="bag-header"><h3 style="margin:0;">Your Bag</h3><button class="btn-icon" id="bag-close-btn" aria-label="Close bag">&times;</button></div>' +
          '<div class="bag-items" id="bag-items"></div>' +
          '<div class="bag-footer" id="bag-footer"></div>' +
        '</div>' +
      '</div>';
    var overlay = document.getElementById('bag-overlay');
    document.getElementById('bag-close-btn').addEventListener('click', closeBag);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeBag(); });
    function openBag() { renderBagContents(); overlay.classList.add('is-open'); syncScrollLock(); }
    function closeBag() { overlay.classList.remove('is-open'); syncScrollLock(); }
    window.CGW.openBag = openBag;
    var openBtn = document.getElementById('bag-open-btn');
    if (openBtn) openBtn.addEventListener('click', openBag);
  }

  function renderBagContents() {
    var bag = window.CGW.getBag();
    var itemsEl = document.getElementById('bag-items');
    var footerEl = document.getElementById('bag-footer');
    if (!itemsEl) return;

    var lineItems = bag.map(function (entry) {
      var product = bagLineProduct(entry);
      return product ? { product: product, size: entry.size, qty: entry.qty } : null;
    }).filter(Boolean);

    if (!lineItems.length) {
      itemsEl.innerHTML = '<div class="bag-empty">Your bag is empty.<br>Let\'s find you something cute.</div>';
      footerEl.innerHTML = '';
      updateBagCount();
      return;
    }

    itemsEl.innerHTML = lineItems.map(function (li) {
      return (
        '<div class="bag-item">' +
          '<img src="' + escapeHtml(li.product.image) + '" alt=""' + ONERR + '>' +
          '<div class="bag-item-info">' +
            '<h4>' + escapeHtml(li.product.name) + '</h4>' +
            '<span class="text-muted">' + window.CGW.formatPrice(li.product.price) + (li.size && li.size !== 'One Size' ? ' · Size ' + escapeHtml(li.size) : '') + '</span>' +
            '<div class="bag-qty">' +
              '<button data-qty-id="' + escapeHtml(li.product.id) + '" data-qty-size="' + escapeHtml(li.size) + '" data-delta="-1" aria-label="Decrease quantity">−</button>' +
              '<span>' + li.qty + '</span>' +
              '<button data-qty-id="' + escapeHtml(li.product.id) + '" data-qty-size="' + escapeHtml(li.size) + '" data-delta="1" aria-label="Increase quantity">+</button>' +
              '<button class="bag-remove" data-remove-id="' + escapeHtml(li.product.id) + '" data-remove-size="' + escapeHtml(li.size) + '" aria-label="Remove ' + escapeHtml(li.product.name) + ' from bag">Remove</button>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    var subtotal = lineItems.reduce(function (sum, li) { return sum + li.product.price * li.qty; }, 0);
    var waMessage = 'Hi ' + content.meta.brandName + '! I\'d like to order:\n' +
      lineItems.map(function (li) { return '- ' + li.product.name + (li.size && li.size !== 'One Size' ? ' (Size ' + li.size + ')' : '') + ' x' + li.qty + ' (' + window.CGW.formatPrice(li.product.price * li.qty) + ')'; }).join('\n') +
      '\n\nTotal: ' + window.CGW.formatPrice(subtotal);

    footerEl.innerHTML =
      '<div class="bag-subtotal"><span>Subtotal</span><span>' + window.CGW.formatPrice(subtotal) + '</span></div>' +
      '<a href="checkout.html" class="btn btn-primary btn-block">Proceed to Checkout</a>' +
      '<a href="' + waLink(waMessage) + '" target="_blank" rel="noopener" class="bag-secondary">Or order on WhatsApp</a>' +
      '<p class="text-muted" style="font-size:0.76rem;margin:12px 0 0;text-align:center;">Delivery is calculated at checkout.</p>' +
      '<button class="bag-clear" id="bag-clear-btn" type="button">Clear bag</button>';

    itemsEl.querySelectorAll('[data-remove-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.CGW.updateBagQty(btn.getAttribute('data-remove-id'), btn.getAttribute('data-remove-size'), 0);
        renderBagContents();
      });
    });
    document.getElementById('bag-clear-btn').addEventListener('click', function () {
      if (!window.confirm('Remove everything from your bag?')) return;
      window.CGW.clearBag();
      renderBagContents();
    });
    itemsEl.querySelectorAll('[data-qty-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-qty-id');
        var size = btn.getAttribute('data-qty-size');
        var delta = parseInt(btn.getAttribute('data-delta'), 10);
        var entry = window.CGW.getBag().find(function (i) { return i.id === id && i.size === size; });
        window.CGW.updateBagQty(id, size, (entry ? entry.qty : 0) + delta);
        renderBagContents();
      });
    });
    updateBagCount();
  }

  function updateBagCount(bump) {
    var count = window.CGW.getBag().reduce(function (sum, i) { return sum + i.qty; }, 0);
    var el = document.getElementById('bag-count');
    if (!el) return;
    el.textContent = count;
    el.hidden = count === 0;
    if (bump && !reduceMotion) { el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump'); }
  }

  // ---------- Rich product quick view ----------
  function renderQuickView() {
    var root = document.getElementById('quickview-modal-root');
    if (!root) return;
    root.innerHTML = '<div class="modal-overlay" id="qv-overlay"></div>';
    var overlay = document.getElementById('qv-overlay');

    function close() { overlay.classList.remove('is-open'); syncScrollLock(); }

    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-quickview]');
      if (!trigger) return;
      var product = productById(trigger.getAttribute('data-quickview'));
      if (!product) return;
      e.preventDefault();
      openFor(product);
    });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

    function openFor(product) {
      var imgs = (product.images && product.images.length ? product.images : [product.image]);
      var sizes = product.sizes && product.sizes.length ? product.sizes : ['One Size'];
      var selectedSize = sizes[0];

      var thumbs = imgs.map(function (src, i) {
        return '<button class="qv-thumb' + (i === 0 ? ' is-active' : '') + '" data-img="' + escapeHtml(src) + '" aria-label="View photo ' + (i + 1) + '">' +
          '<img src="' + escapeHtml(src) + '" alt=""' + ONERR + '></button>';
      }).join('');

      var sizeBtns = sizes.map(function (s, i) {
        return '<button class="size-btn' + (i === 0 ? ' is-active' : '') + '" data-size="' + escapeHtml(s) + '">' + escapeHtml(s) + '</button>';
      }).join('');

      var specs = '';
      if (product.fabric) specs += '<li><b>Fabric</b><span>' + escapeHtml(product.fabric) + '</span></li>';
      if (product.stretch) specs += '<li><b>Stretch</b><span>' + escapeHtml(product.stretch) + '</span></li>';
      if (product.fit) specs += '<li><b>Fit</b><span>' + escapeHtml(product.fit) + '</span></li>';
      if (product.care) specs += '<li><b>Care</b><span>' + escapeHtml(product.care) + '</span></li>';
      specs += '<li><b>Delivery</b><span>Lagos 1–3 days · worldwide shipping · free in Lagos over ₦50,000</span></li>';

      var stylistMsg = 'Hi CityGirl! I need help with sizing for the ' + product.name + '.';

      overlay.innerHTML =
        '<div class="newsletter-modal quickview-modal">' +
          '<button class="modal-close" id="qv-close" aria-label="Close">&times;</button>' +
          '<div class="quickview-grid">' +
            '<div class="qv-gallery">' +
              '<div class="qv-main"><img id="qv-main-img" src="' + escapeHtml(imgs[0]) + '" alt="' + escapeHtml(product.name) + '"' + ONERR + '></div>' +
              (imgs.length > 1 ? '<div class="qv-thumbs">' + thumbs + '</div>' : '') +
            '</div>' +
            '<div class="quickview-body">' +
              (product.tag ? '<span class="product-tag" data-tag="' + escapeHtml(product.tag) + '" style="position:static;display:inline-block;margin-bottom:10px;">' + escapeHtml(product.tag) + '</span>' : '') +
              '<h2>' + escapeHtml(product.name) + '</h2>' +
              (product.rating ? '<div class="qv-rating">' + starsHtml(product.rating, product.reviews) + '</div>' : '') +
              '<span class="product-price">' + window.CGW.formatPrice(product.price) + '</span>' +
              '<p class="text-muted" style="margin-top:12px;">' + escapeHtml(product.description) + '</p>' +
              '<div class="qv-size-block">' +
                '<div class="qv-size-head"><span class="qv-label">Select size</span>' + (product.fit ? '<span class="qv-fit">' + escapeHtml(product.fit) + '</span>' : '') + '</div>' +
                '<div class="size-row" id="qv-sizes">' + sizeBtns + '</div>' +
              '</div>' +
              (product.modelSize ? '<p class="qv-model">MODEL IS WEARING: <b>' + escapeHtml(product.modelSize) + '</b>' + (product.modelInfo ? ' — ' + escapeHtml(product.modelInfo) : '') + '</p>' : (product.modelInfo ? '<p class="qv-model">' + escapeHtml(product.modelInfo) + '</p>' : '')) +
              '<div class="qv-actions">' +
                '<button class="btn btn-primary btn-block" id="qv-add"' + (product.tag === 'Sold Out' ? ' disabled style="opacity:.5;cursor:not-allowed;"' : '') + '>' + (product.tag === 'Sold Out' ? 'Sold Out' : 'Add to Bag') + '</button>' +
                (product.tag === 'Sold Out' ? '' : '<button class="btn btn-outline btn-block" id="qv-buy">Buy Now</button>') +
              '</div>' +
              '<a class="qv-stylist" href="' + waLink(stylistMsg) + '" target="_blank" rel="noopener">Not sure what size to get? Chat with a CityGirl stylist →</a>' +
              '<ul class="qv-specs">' + specs + '</ul>' +
            '</div>' +
          '</div>' +
        '</div>';

      overlay.classList.add('is-open');
      syncScrollLock();
      overlay.scrollTop = 0;
      var closeBtn = document.getElementById('qv-close');
      closeBtn.addEventListener('click', close);
      closeBtn.focus({ preventScroll: true });

      // Gallery thumbnails
      overlay.querySelectorAll('.qv-thumb').forEach(function (t) {
        t.addEventListener('click', function () {
          document.getElementById('qv-main-img').src = t.getAttribute('data-img');
          overlay.querySelectorAll('.qv-thumb').forEach(function (x) { x.classList.remove('is-active'); });
          t.classList.add('is-active');
        });
      });
      // Size selection
      overlay.querySelectorAll('.size-btn').forEach(function (b) {
        b.addEventListener('click', function () {
          selectedSize = b.getAttribute('data-size');
          overlay.querySelectorAll('.size-btn').forEach(function (x) { x.classList.remove('is-active'); });
          b.classList.add('is-active');
        });
      });
      // Add to bag / Buy now
      var addBtn = document.getElementById('qv-add');
      if (addBtn && product.tag !== 'Sold Out') {
        addBtn.addEventListener('click', function () {
          addProductToBag(product, selectedSize, true); // the bag drawer opening is the confirmation
          close(); // swap the quick view for the bag rather than stacking them
          if (window.CGW.openBag) window.CGW.openBag();
        });
      }
      var buyBtn = document.getElementById('qv-buy');
      if (buyBtn) buyBtn.addEventListener('click', function () {
        window.CGW.addToBag(product.id, selectedSize, product);
        window.location.href = 'checkout.html';
      });
    }
  }

  function wireAddToBag() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-add-to-bag]');
      if (!btn || btn.disabled) return;
      var product = productById(btn.getAttribute('data-add-to-bag'));
      if (!product) return;
      addProductToBag(product, (product.sizes && product.sizes[0]) || 'One Size');
    });
  }

  // ---------- Search overlay ----------
  function renderSearch() {
    var wrap = document.createElement('div');
    wrap.className = 'search-overlay';
    wrap.id = 'search-overlay';
    wrap.innerHTML =
      '<div class="search-panel">' +
        '<div class="search-bar">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>' +
          '<input type="search" id="search-input" placeholder="Search dresses, sets, tops…" autocomplete="off">' +
          '<button class="btn-icon" id="search-close" aria-label="Close search">&times;</button>' +
        '</div>' +
        '<div class="search-results" id="search-results"><p class="search-hint">Start typing to find your next favourite fit.</p></div>' +
      '</div>';
    document.body.appendChild(wrap);

    var input = wrap.querySelector('#search-input');
    var results = wrap.querySelector('#search-results');
    function open() { loadProducts(); wrap.classList.add('is-open'); syncScrollLock(); setTimeout(function () { input.focus(); }, 60); }
    function close() { wrap.classList.remove('is-open'); syncScrollLock(); }
    var openBtn = document.getElementById('search-open-btn');
    if (openBtn) openBtn.addEventListener('click', open);
    wrap.querySelector('#search-close').addEventListener('click', close);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });

    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      if (!q) { results.innerHTML = '<p class="search-hint">Start typing to find your next favourite fit.</p>'; return; }
      var matches = content.products.filter(function (p) {
        return (p.name + ' ' + (p.category || '') + ' ' + (p.description || '')).toLowerCase().indexOf(q) !== -1;
      });
      if (!matches.length) { results.innerHTML = '<p class="search-hint">No matches — try “dress”, “set” or “top”.</p>'; return; }
      results.innerHTML = matches.map(function (p) {
        return '<button class="search-result" data-quickview="' + p.id + '">' +
          '<img src="' + escapeHtml(p.image) + '" alt=""' + ONERR + '>' +
          '<span class="sr-info"><b>' + escapeHtml(p.name) + '</b><span>' + escapeHtml(p.category) + ' · ' + window.CGW.formatPrice(p.price) + '</span></span>' +
          '</button>';
      }).join('');
    });
    // Opening a result opens the quick view (global handler) — close search first.
    results.addEventListener('click', function (e) { if (e.target.closest('[data-quickview]')) close(); });
  }

  // ---------- WhatsApp side tab ----------
  function renderWhatsAppFloat() {
    var a = document.createElement('a');
    a.className = 'wa-float';
    a.href = waLink('Hi CityGirl! I need help with an order.');
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('aria-label', 'Chat with CityGirl on WhatsApp');
    a.innerHTML =
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.6 14.2c-.2.6-1.4 1.2-1.9 1.3-.5.1-1.1.2-3.5-.8-2.9-1.2-4.8-4.2-5-4.4-.1-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5.2.6.7 1.9.8 2 .1.2.1.4 0 .6-.1.2-.2.4-.4.6l-.5.6c-.2.2-.3.4-.1.7.2.3.9 1.4 1.9 2.3 1.3 1.2 2.4 1.5 2.7 1.7.3.2.5.1.7-.1l.9-1c.2-.3.4-.2.7-.1l1.8.9c.2.1.4.2.5.3.1.2.1.9-.1 1.5Z"/></svg>' +
      '<span class="wa-float-label">Chat</span>';
    document.body.appendChild(a);
  }

  // ---------- Floating discount pill (opens the newsletter popup) ----------
  function renderPromoPill(activePage) {
    // Keep checkout free of distractions.
    if (activePage === 'checkout.html' || !window.CGW.openNewsletter) return;
    // Shown on every visit; tapping × (or signing up) hides it until the browser tab is closed.
    var dismissed = false;
    try { dismissed = sessionStorage.getItem('cgw_promo_closed') === '1'; } catch (e) {}
    if (dismissed) return;
    // "10% OFF" -> "10% Off"
    var label = String(content.newsletter.discountText || '10% Off').toLowerCase().replace(/(^|\s)\S/g, function (c) { return c.toUpperCase(); });
    var wrap = document.createElement('div');
    wrap.className = 'promo-pill';
    wrap.id = 'promo-pill';
    wrap.innerHTML =
      '<button class="promo-pill-btn" type="button">' + escapeHtml(label) + '</button>' +
      '<button class="promo-pill-close" type="button" aria-label="Dismiss offer">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>' +
      '</button>';
    document.body.appendChild(wrap);
    document.body.classList.add('has-promo');
    wrap.querySelector('.promo-pill-btn').addEventListener('click', window.CGW.openNewsletter);
    wrap.querySelector('.promo-pill-close').addEventListener('click', function () {
      wrap.hidden = true;
      document.body.classList.remove('has-promo');
      try { sessionStorage.setItem('cgw_promo_closed', '1'); } catch (e) {}
    });
  }

  function wireNav() {
    var toggle = document.querySelector('.nav-toggle');
    var overlay = document.getElementById('menu-overlay');
    if (toggle && overlay) {
      var setOpen = function (open) {
        toggle.setAttribute('aria-expanded', String(open));
        overlay.classList.toggle('is-open', open);
        syncScrollLock();
      };
      toggle.addEventListener('click', function () { setOpen(true); });
      document.getElementById('menu-close-btn').addEventListener('click', function () { setOpen(false); });
      overlay.addEventListener('click', function (e) { if (e.target === overlay || e.target.closest('.menu-links a')) setOpen(false); });
    }
    // Already on the homepage? "Home" (menu link or logo) scrolls back to the top instead of reloading.
    if (document.body.classList.contains('home')) {
      document.addEventListener('click', function (e) {
        var a = e.target.closest('a[href="index.html"]');
        if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    }
    var header = document.getElementById('site-header');
    if (header) {
      var setState = function () { header.classList.toggle('is-scrolled', window.scrollY > 12); };
      setState();
      window.addEventListener('scroll', setState, { passive: true });
    }
  }

  // Swipe rows: stagger their cards in once the row scrolls into view.
  function wireRails() {
    var rails = document.querySelectorAll('.rail:not(.will-animate)');
    if (!rails.length || reduceMotion || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.15 });
    rails.forEach(function (rail) {
      if (!rail.children.length) return; // filled later; wired on the next call
      Array.prototype.forEach.call(rail.children, function (c, i) { c.style.setProperty('--i', i); });
      rail.classList.add('will-animate');
      io.observe(rail);
    });
  }

  function wireReveal() {
    wireRails();
    document.querySelectorAll('.grid, .chip-row').forEach(function (group) {
      group.querySelectorAll(':scope > [data-reveal]').forEach(function (item, i) {
        item.style.setProperty('--reveal-delay', Math.min(i * 70, 350) + 'ms');
      });
    });
    var els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { observer.observe(el); });
  }

  function wireBackToTop() {
    var btn = document.querySelector('.back-to-top');
    if (!btn) return;
    window.addEventListener('scroll', function () { btn.classList.toggle('visible', window.scrollY > 480); }, { passive: true });
    btn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); });
  }

  // ---------- Headings: letters arrive one by one ----------
  // Splits each heading into per-letter spans (screen readers get the plain
  // text via aria-label) and plays the animation when it scrolls into view.
  var LETTER_HEADINGS = '.hero-title, .section-title, .section-head h2, .page-hero h1';
  function animateLetters(el) {
    if (!el || el.children.length) return; // only plain-text headings (call again after changing the text)
    var text = el.textContent.trim();
    if (!text) return;
    var i = 0;
    el.setAttribute('aria-label', text);
    el.innerHTML = text.split(/\s+/).map(function (word) {
      return '<span class="word" aria-hidden="true">' + Array.from(word).map(function (ch) {
        return '<span class="ltr" style="--i:' + (i++) + '">' + escapeHtml(ch) + '</span>';
      }).join('') + '</span>';
    }).join(' ');
    el.classList.remove('is-in');
    el.classList.add('letters');
    if (reduceMotion || !('IntersectionObserver' in window)) { el.classList.add('is-in'); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { el.classList.add('is-in'); io.disconnect(); }
      });
    }, { threshold: 0.3 });
    io.observe(el);
  }
  function wireLetters() {
    // Run after the page's own scripts have filled in the heading text.
    var run = function () { document.querySelectorAll(LETTER_HEADINGS).forEach(animateLetters); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
  }

  window.CGWRender = {
    content: content,
    escapeHtml: escapeHtml,
    logoBadgeHtml: logoBadgeHtml,
    productCardHtml: productCardHtml,
    products: loadProducts,
    productById: productById,
    bagLineProduct: bagLineProduct,
    toast: toast,
    collectionCardHtml: collectionCardHtml,
    starsHtml: starsHtml,
    isBestseller: isBestseller,
    waLink: waLink,
    renderAnnouncement: renderAnnouncement,
    renderHeader: renderHeader,
    renderFooter: renderFooter,
    renderNewsletterModal: renderNewsletterModal,
    renderBagDrawer: renderBagDrawer,
    renderBagContents: renderBagContents,
    renderQuickView: renderQuickView,
    updateBagCount: updateBagCount,
    wireReveal: wireReveal,
    animateLetters: animateLetters,
    init: function (activePage) {
      renderAnnouncement();
      renderHeader(activePage);
      renderFooter();
      renderNewsletterModal();
      renderBagDrawer();
      renderQuickView();
      renderSearch();
      renderWhatsAppFloat();
      renderPromoPill(activePage);
      wireAddToBag();
      wireNav();
      wireBackToTop();
      wireLetters();
      updateBagCount();
      loadProducts();
    }
  };
})();
