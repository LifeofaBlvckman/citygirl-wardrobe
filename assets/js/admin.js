/**
 * CityGirl Wardrobe — Admin dashboard.
 *
 * Login is the store owner's Supabase email + password. Products are saved to
 * the database (and photos to Supabase Storage), so they show for EVERYONE.
 * The other tabs (store settings, hero, newsletter, about) still edit this
 * browser's copy of the site content.
 */
(function () {
  'use strict';

  var OWNER = 'joofonmbuk@gmail.com';
  var draft = window.CGW.getContent();
  var dirty = false;

  function logoBadgeHtml(variant) {
    var cls = variant === 'sm' ? 'logo-badge badge-sm' : 'logo-badge badge-full';
    var size = variant === 'sm' ? 46 : 96;
    return '<img class="' + cls + '" src="assets/img/logo.png" alt="CityGirl Wardrobe" width="' + size + '" height="' + size + '">';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return '\u20A6' + (n || 0).toLocaleString('en-NG'); }

  document.getElementById('login-logo').innerHTML = logoBadgeHtml('full');

  // ---------------- Login gate (Supabase) ----------------
  function showLogin() { document.getElementById('login-screen').style.display = 'flex'; document.getElementById('dashboard').hidden = true; }
  function showDashboard() { document.getElementById('login-screen').style.display = 'none'; document.getElementById('dashboard').hidden = false; initDashboard(); }

  function checkAuth() {
    if (!window.CGWDB) {
      var err = document.getElementById('login-error');
      err.textContent = 'Not connected to the database. Check assets/js/supabase-config.js.';
      err.hidden = false; showLogin(); return;
    }
    window.CGWDB.currentUser().then(function (user) {
      if (user && user.email && user.email.toLowerCase() === OWNER) showDashboard();
      else showLogin();
    }).catch(showLogin);
  }

  document.getElementById('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = document.getElementById('login-error');
    err.hidden = true;
    var email = document.getElementById('login-email').value.trim();
    var pass = document.getElementById('login-password').value;
    if (!window.CGWDB) { err.textContent = 'Not connected to the database.'; err.hidden = false; return; }
    window.CGWDB.signIn(email, pass).then(function (res) {
      if (res.error) { err.textContent = 'Login failed — ' + res.error.message; err.hidden = false; return; }
      if (email.toLowerCase() !== OWNER) { window.CGWDB.signOut(); err.textContent = 'That account is not the store owner.'; err.hidden = false; return; }
      showDashboard();
    });
  });

  var dashboardReady = false;

  // ---------------- Dashboard ----------------
  function initDashboard() {
    if (dashboardReady) return; // guard against double init
    dashboardReady = true;

    document.getElementById('admin-logo-slot').innerHTML =
      logoBadgeHtml('sm') + '<span class="brand-name">Store <span>Admin</span></span>';

    document.getElementById('logout-btn').addEventListener('click', function () {
      if (window.CGWDB) window.CGWDB.signOut().then(function () { location.reload(); });
      else location.reload();
    });

    wireTabs();
    populateSettingsForm();
    populateNewsletterForm();
    populateAboutForm();
    renderThemeSwatches();
    renderSubscribers();
    wireDirtyTracking();

    document.getElementById('f-use-custom-accent').addEventListener('change', function (e) {
      document.getElementById('f-custom-accent').disabled = !e.target.checked;
    });

    document.getElementById('save-btn').addEventListener('click', saveDraft);
    document.getElementById('reset-btn').addEventListener('click', function () {
      if (!confirm('Reset this browser\'s site settings back to the sample data? (Products in the database are not affected.)')) return;
      window.CGW.resetContent();
      location.reload();
    });
    document.getElementById('export-subscribers-btn').addEventListener('click', exportSubscribersCsv);

    initProductManager();
    initSales();
    initGallery();
  }

  function wireTabs() {
    var tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('is-active'); });
        tab.classList.add('is-active');
        document.querySelectorAll('.admin-panel').forEach(function (p) { p.classList.remove('is-active'); });
        document.querySelector('[data-panel="' + tab.getAttribute('data-tab') + '"]').classList.add('is-active');
      });
    });
  }

  function wireDirtyTracking() {
    document.querySelectorAll('[data-panel="settings"] input, [data-panel="settings"] textarea, [data-panel="settings"] select, [data-panel="newsletter"] input, [data-panel="newsletter"] textarea, [data-panel="about"] input, [data-panel="about"] textarea').forEach(function (el) {
      el.addEventListener('input', markDirty);
      el.addEventListener('change', markDirty);
    });
  }
  function markDirty() {
    dirty = true;
    var s = document.getElementById('save-status');
    s.textContent = 'Unsaved changes'; s.style.color = '#e11d48';
  }

  function wireImagePreview(inputId, imgId) {
    var input = document.getElementById(inputId), img = document.getElementById(imgId);
    function update() { img.src = input.value; img.style.display = input.value ? 'block' : 'none'; }
    input.addEventListener('input', update); update();
  }
  function wireImageUpload(fileInput, textInput, preview) {
    if (!fileInput) return;
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) { alert('Please choose an image file.'); fileInput.value = ''; return; }
      if (file.size > 3 * 1024 * 1024) { alert('That image is larger than 3MB. Pick a smaller file or paste a URL.'); fileInput.value = ''; return; }
      var reader = new FileReader();
      reader.onload = function () { textInput.value = reader.result; if (preview) { preview.src = reader.result; preview.style.display = 'block'; } fileInput.value = ''; markDirty(); };
      reader.readAsDataURL(file);
    });
  }

  // ---- Populate settings forms from draft (localStorage content) ----
  function populateSettingsForm() {
    document.getElementById('f-brand-name').value = draft.meta.brandName;
    document.getElementById('f-tagline').value = draft.meta.tagline;
    document.getElementById('f-whatsapp').value = draft.meta.whatsapp;
    document.getElementById('f-instagram').value = draft.meta.instagram;
    document.getElementById('f-email').value = draft.meta.email;
    var useCustom = !!draft.meta.customAccent;
    document.getElementById('f-use-custom-accent').checked = useCustom;
    document.getElementById('f-custom-accent').disabled = !useCustom;
    document.getElementById('f-custom-accent').value = draft.meta.customAccent || '#be185d';
    document.getElementById('f-announcement-enabled').checked = draft.announcement.enabled;
    document.getElementById('f-announcement-text').value = draft.announcement.text;
  }
  function populateNewsletterForm() {
    document.getElementById('f-newsletter-enabled').checked = draft.newsletter.enabled;
    document.getElementById('f-newsletter-heading').value = draft.newsletter.heading;
    document.getElementById('f-newsletter-discount').value = draft.newsletter.discountText;
    document.getElementById('f-newsletter-subtext').value = draft.newsletter.subtext;
    document.getElementById('f-newsletter-delay').value = draft.newsletter.delaySeconds;
  }
  function populateAboutForm() {
    document.getElementById('f-about-heading').value = draft.about.heading;
    document.getElementById('f-about-body').value = draft.about.body;
    document.getElementById('f-footer-about').value = draft.footer.about;
  }
  function renderThemeSwatches() {
    var grid = document.getElementById('theme-grid');
    grid.innerHTML = Object.keys(window.CGW.THEMES).map(function (key) {
      var t = window.CGW.THEMES[key];
      return '<button type="button" class="theme-swatch' + (draft.meta.theme === key ? ' is-active' : '') + '" data-theme="' + key + '">' +
        '<span class="swatch-circle" style="background:linear-gradient(135deg,' + t.primary + ',' + t.secondary + ')"></span><span>' + t.label + '</span></button>';
    }).join('');
    grid.querySelectorAll('.theme-swatch').forEach(function (btn) {
      btn.addEventListener('click', function () {
        draft.meta.theme = btn.getAttribute('data-theme');
        grid.querySelectorAll('.theme-swatch').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active'); markDirty();
      });
    });
  }

  // ---- Subscribers ----
  function renderSubscribers() {
    var subs = window.CGW.getSubscribers();
    document.getElementById('subscriber-count').textContent = subs.length;
    var list = document.getElementById('subscribers-list');
    document.getElementById('subscribers-empty').hidden = subs.length > 0;
    list.innerHTML = subs.map(function (email) { return '<li>' + esc(email) + '</li>'; }).join('');
  }
  function exportSubscribersCsv() {
    var subs = window.CGW.getSubscribers();
    var csv = 'email\n' + subs.join('\n');
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'citygirl-wardrobe-subscribers.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  // ---- Save settings (localStorage; products are saved separately to the DB) ----
  function saveDraft() {
    draft.meta.brandName = document.getElementById('f-brand-name').value.trim() || draft.meta.brandName;
    draft.meta.tagline = document.getElementById('f-tagline').value.trim();
    draft.meta.whatsapp = document.getElementById('f-whatsapp').value.replace(/\D/g, '');
    draft.meta.instagram = document.getElementById('f-instagram').value.replace('@', '').trim();
    draft.meta.email = document.getElementById('f-email').value.trim();
    draft.meta.customAccent = document.getElementById('f-use-custom-accent').checked ? document.getElementById('f-custom-accent').value : '';
    draft.announcement.enabled = document.getElementById('f-announcement-enabled').checked;
    draft.announcement.text = document.getElementById('f-announcement-text').value.trim();
    draft.newsletter.enabled = document.getElementById('f-newsletter-enabled').checked;
    draft.newsletter.heading = document.getElementById('f-newsletter-heading').value.trim();
    draft.newsletter.discountText = document.getElementById('f-newsletter-discount').value.trim();
    draft.newsletter.subtext = document.getElementById('f-newsletter-subtext').value.trim();
    draft.newsletter.delaySeconds = parseInt(document.getElementById('f-newsletter-delay').value, 10) || 0;
    draft.about.heading = document.getElementById('f-about-heading').value.trim();
    draft.about.body = document.getElementById('f-about-body').value;
    draft.footer.about = document.getElementById('f-footer-about').value.trim();

    try { window.CGW.saveContent(draft); }
    catch (err) { showToast('Could not save — uploaded images may be too large for browser storage. Use smaller photos or URLs.'); return; }
    dirty = false;
    var s = document.getElementById('save-status'); s.textContent = 'All changes saved \u2713'; s.style.color = '';
    showToast('Settings saved \ud83d\udc95');
  }

  function showToast(message) {
    var toast = document.getElementById('toast');
    toast.textContent = message; toast.hidden = false;
    requestAnimationFrame(function () { toast.classList.add('is-visible'); });
    setTimeout(function () { toast.classList.remove('is-visible'); setTimeout(function () { toast.hidden = true; }, 300); }, 2600);
  }

  // ---------------- PRODUCT MANAGER (database + Storage) ----------------
  function initProductManager() {
    var form = document.getElementById('pm-form');
    var editingId = null, currentImage = '';

    function loadList() {
      var list = document.getElementById('pm-list');
      list.innerHTML = '<p class="text-muted">Loading\u2026</p>';
      window.CGWDB.products().then(function (products) {
        document.getElementById('pm-empty').hidden = products.length > 0;
        list.innerHTML = products.map(function (p) {
          return '<div class="pm-card">' +
            '<img src="' + esc(p.image || 'assets/img/product-fallback.jpg') + '" alt="" onerror="this.onerror=null;this.src=\'assets/img/product-fallback.jpg\'">' +
            '<div class="pm-body">' +
              (p.tag ? '<span class="pm-tag">' + esc(p.tag) + '</span>' : '') +
              '<span class="pm-name">' + esc(p.name) + '</span>' +
              '<span class="pm-price">' + fmt(p.price) + ' \u00b7 ' + esc(p.category || '') + '</span>' +
              '<div class="pm-actions">' +
                '<button class="btn btn-outline btn-sm" data-edit="' + esc(p.id) + '">Edit</button>' +
                '<button class="btn btn-danger btn-sm" data-del="' + esc(p.id) + '">Delete</button>' +
              '</div>' +
            '</div></div>';
        }).join('');
        list._products = products;
      }).catch(function (e) { list.innerHTML = '<p class="text-muted">Could not load products. ' + esc(e.message || '') + '</p>'; });
    }

    document.getElementById('pm-list').addEventListener('click', function (e) {
      var ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
      if (ed) openForm((this._products || []).find(function (p) { return p.id === ed.getAttribute('data-edit'); }));
      if (del) {
        var id = del.getAttribute('data-del');
        if (confirm('Delete this product? It will be removed from the live site.')) {
          window.CGWDB.deleteProduct(id).then(function (res) {
            if (res.error) { showToast('Delete failed: ' + res.error.message); return; }
            showToast('Product deleted'); loadList();
          });
        }
      }
    });

    document.getElementById('pm-add').addEventListener('click', function () { openForm(null); });
    document.getElementById('pm-cancel').addEventListener('click', function () { form.hidden = true; });

    function openForm(p) {
      editingId = p ? p.id : null;
      currentImage = p ? (p.image || '') : '';
      document.getElementById('pm-form-title').textContent = p ? 'Edit product' : 'Add product';
      document.getElementById('pm-name').value = p ? p.name : '';
      document.getElementById('pm-price').value = p ? p.price : '';
      document.getElementById('pm-category').value = p ? (p.category || 'Dresses') : 'Dresses';
      document.getElementById('pm-newin').checked = p ? (p.tag === 'New') : true;
      document.getElementById('pm-soldout').checked = p ? (p.tag === 'Sold Out') : false;
      document.getElementById('pm-bestseller').checked = p ? !!p.bestseller : false;
      document.getElementById('pm-sizes').value = p && p.sizes ? p.sizes.join(', ') : 'S, M, L, XL';
      document.getElementById('pm-fabric').value = p ? (p.fabric || '') : '';
      document.getElementById('pm-stretch').value = p ? (p.stretch || '') : '';
      document.getElementById('pm-fit').value = p ? (p.fit || '') : '';
      document.getElementById('pm-care').value = p ? (p.care || '') : '';
      document.getElementById('pm-modelinfo').value = p ? (p.modelInfo || '') : '';
      document.getElementById('pm-modelsize').value = p ? (p.modelSize || '') : '';
      document.getElementById('pm-bestseller').checked = p ? !!p.bestseller : false;
      document.getElementById('pm-description').value = p ? (p.description || '') : '';
      document.getElementById('pm-img-preview').src = currentImage || 'assets/img/product-fallback.jpg';
      document.getElementById('pm-img-status').textContent = 'JPG or PNG. Shown to everyone.';
      form.hidden = false;
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    document.getElementById('pm-img-file').addEventListener('change', function (e) {
      var file = e.target.files[0]; if (!file) return;
      var status = document.getElementById('pm-img-status');
      status.textContent = 'Uploading\u2026';
      window.CGWDB.uploadImage(file).then(function (url) {
        currentImage = url;
        document.getElementById('pm-img-preview').src = url;
        status.textContent = 'Uploaded \u2713';
      }).catch(function (err) { status.textContent = 'Upload failed: ' + (err.message || 'try again'); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var sizes = document.getElementById('pm-sizes').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      var tag = document.getElementById('pm-soldout').checked ? 'Sold Out' : (document.getElementById('pm-newin').checked ? 'New' : '');
      var product = {
        id: editingId || ('cg' + Date.now().toString(36)),
        name: document.getElementById('pm-name').value.trim(),
        price: parseInt(document.getElementById('pm-price').value, 10) || 0,
        category: document.getElementById('pm-category').value,
        tag: tag,
        bestseller: document.getElementById('pm-bestseller').checked,
        image: currentImage,
        images: currentImage ? [currentImage] : [],
        sizes: sizes.length ? sizes : ['S', 'M', 'L', 'XL'],
        fabric: document.getElementById('pm-fabric').value.trim(),
        stretch: document.getElementById('pm-stretch').value.trim(),
        fit: document.getElementById('pm-fit').value.trim(),
        care: document.getElementById('pm-care').value.trim(),
        modelInfo: document.getElementById('pm-modelinfo').value.trim(),
        modelSize: document.getElementById('pm-modelsize').value.trim(),
        description: document.getElementById('pm-description').value.trim(),
        rating: 5.0, reviews: 0, sort: Math.floor(Date.now() / 1000)
      };
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Saving\u2026';
      window.CGWDB.upsertProduct(product).then(function (res) {
        btn.disabled = false; btn.textContent = 'Save product';
        if (res.error) { showToast('Save failed: ' + res.error.message); return; }
        form.hidden = true; showToast(editingId ? 'Product updated' : 'Product added'); loadList();
      }).catch(function (err) { btn.disabled = false; btn.textContent = 'Save product'; showToast('Save failed: ' + (err.message || '')); });
    });

    loadList();
  }

  // ---------------- SALES DASHBOARD ----------------
  function stat(value, label) { return '<div class="stat-card"><div class="stat-value">' + value + '</div><div class="stat-label">' + label + '</div></div>'; }
  function initSales() {
    var btn = document.getElementById('sales-refresh');
    if (btn) btn.addEventListener('click', loadSales);
    loadSales();
  }
  function loadSales() {
    var statsEl = document.getElementById('sales-stats');
    var ordersEl = document.getElementById('sales-orders');
    statsEl.innerHTML = '<p class="text-muted">Loading\u2026</p>';
    ordersEl.innerHTML = '';
    if (!window.CGWDB) { statsEl.innerHTML = '<p class="text-muted">Not connected to the database.</p>'; return; }
    window.CGWDB.listOrders().then(function (res) {
      if (res.error) { statsEl.innerHTML = '<p class="text-muted">Could not load orders: ' + esc(res.error.message) + '</p>'; return; }
      var orders = res.data || [];
      var now = new Date();
      var totalValue = orders.reduce(function (s, o) { return s + (o.status === 'cancelled' ? 0 : (o.total || 0)); }, 0);
      var paid = orders.filter(function (o) { return o.status === 'paid'; }).length;
      var monthValue = orders.reduce(function (s, o) {
        var d = new Date(o.created_at);
        return (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && o.status !== 'cancelled') ? s + (o.total || 0) : s;
      }, 0);
      statsEl.innerHTML = stat(fmt(totalValue), 'Total sales value') + stat(orders.length, 'Orders') + stat(paid, 'Paid') + stat(fmt(monthValue), 'This month');
      if (!orders.length) { ordersEl.innerHTML = '<p class="text-muted" style="padding:18px;">No orders yet. They\'ll appear here as soon as customers check out.</p>'; return; }
      ordersEl.innerHTML = '<table class="orders-table"><thead><tr><th>Ref</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>' +
        orders.map(function (o) {
          var c = o.customer || {};
          var name = c.name || c.fullName || ((c.firstName || '') + ' ' + (c.lastName || '')).trim() || '\u2014';
          var contact = c.phone || c.email || '';
          var items = (o.items || []).reduce(function (n, i) { return n + (i.qty || 1); }, 0);
          var d = new Date(o.created_at);
          return '<tr>' +
            '<td><b>' + esc(o.ref || '') + '</b>' + (c.payment ? '<br><span class="text-muted" style="font-size:0.78rem;">' + esc(c.payment) + (c.delivery ? ' · ' + esc(c.delivery) : '') + '</span>' : '') + '</td>' +
            '<td>' + d.toLocaleDateString() + '</td>' +
            '<td>' + esc(name) + (contact ? '<br><span class="text-muted" style="font-size:0.78rem;">' + esc(contact) + '</span>' : '') + '</td>' +
            '<td>' + items + '</td>' +
            '<td>' + fmt(o.total || 0) + '</td>' +
            '<td><select data-order="' + esc(o.id) + '" class="order-status">' +
              ['pending', 'paid', 'shipped', 'cancelled'].map(function (st) { return '<option value="' + st + '"' + (o.status === st ? ' selected' : '') + '>' + st + '</option>'; }).join('') +
            '</select></td>' +
          '</tr>';
        }).join('') + '</tbody></table>';
      ordersEl.querySelectorAll('select[data-order]').forEach(function (sel) {
        sel.addEventListener('change', function () {
          window.CGWDB.updateOrderStatus(sel.getAttribute('data-order'), sel.value).then(function (r) { showToast(r && r.error ? 'Update failed' : 'Order updated'); });
        });
      });
    }).catch(function (e) { statsEl.innerHTML = '<p class="text-muted">Could not load orders. ' + esc(e.message || '') + '</p>'; });
  }

  // ---------------- GALLERY MANAGER ----------------
  function initGallery() {
    var fileInput = document.getElementById('gallery-file');
    if (fileInput) fileInput.addEventListener('change', function (e) {
      var file = e.target.files[0]; if (!file) return;
      var status = document.getElementById('gallery-status');
      status.hidden = false; status.textContent = 'Uploading\u2026';
      window.CGWDB.uploadImage(file).then(function (url) { return window.CGWDB.addGallery(url); }).then(function (res) {
        status.textContent = (res && res.error) ? 'Save failed: ' + res.error.message : 'Added \u2713';
        fileInput.value = ''; loadGallery();
        setTimeout(function () { status.hidden = true; }, 1600);
      }).catch(function (err) { status.textContent = 'Upload failed: ' + (err.message || ''); });
    });
    loadGallery();
  }
  function loadGallery() {
    var grid = document.getElementById('gallery-grid');
    grid.innerHTML = '<p class="text-muted">Loading\u2026</p>';
    if (!window.CGWDB) { grid.innerHTML = '<p class="text-muted">Not connected to the database.</p>'; return; }
    window.CGWDB.listGallery().then(function (res) {
      var items = (res && res.data) || [];
      document.getElementById('gallery-empty').hidden = items.length > 0;
      grid.innerHTML = items.map(function (g) {
        return '<div class="gallery-item"><img src="' + esc(g.url) + '" alt="" onerror="this.onerror=null;this.src=\'assets/img/product-fallback.jpg\'">' +
          '<button class="btn-danger gal-del" data-gal="' + esc(g.id) + '" aria-label="Delete">\u00d7</button></div>';
      }).join('');
      grid.querySelectorAll('[data-gal]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (!confirm('Remove this photo from the homepage strip?')) return;
          window.CGWDB.deleteGallery(b.getAttribute('data-gal')).then(function () { loadGallery(); });
        });
      });
    }).catch(function (e) { grid.innerHTML = '<p class="text-muted">Could not load gallery. ' + esc(e.message || '') + '</p>'; });
  }

  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  checkAuth();
})();
