/* ============================================================
 * CityGirl Wardrobe — live Supabase connection
 * The publishable key is safe in the browser (Row Level Security controls it).
 * Never put the SECRET key here.
 * ============================================================ */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://zrhfvphtqpsfihnjwtim.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_cBpQB_w_85f92v7DvnDmdw_ASBwQSnT';

  if (!window.supabase || !window.supabase.createClient) {
    console.warn('CityGirl: supabase-js not loaded — the site will use bundled data.');
    return;
  }

  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // Map a database row (snake_case) to the shape the site uses (camelCase).
  function mapProduct(r) {
    return {
      id: r.id, name: r.name, price: r.price, category: r.category, tag: r.tag || '',
      bestseller: !!r.bestseller, image: r.image,
      images: r.images || [], sizes: r.sizes || ['S', 'M', 'L', 'XL'],
      fabric: r.fabric, stretch: r.stretch, care: r.care, fit: r.fit,
      modelSize: r.model_size, modelInfo: r.model_info,
      rating: r.rating || 0, reviews: r.reviews || 0, description: r.description
    };
  }

  window.CGWDB = {
    // ---- Shop data (read) ----
    products: function () {
      return sb.from('products').select('*').order('sort', { ascending: true })
        .then(function (res) { return (res.error || !res.data) ? [] : res.data.map(mapProduct); });
    },
    reviews: function () {
      return sb.from('reviews').select('*').eq('approved', true).order('created_at', { ascending: false })
        .then(function (res) { return (res.error || !res.data) ? [] : res.data; });
    },
    gallery: function () {
      return sb.from('gallery').select('url').order('sort', { ascending: true })
        .then(function (res) { return (res.error || !res.data) ? [] : res.data.map(function (g) { return g.url; }); });
    },

    // ---- Orders (write) ----
    createOrder: function (order) {
      return sb.auth.getUser().then(function (u) {
        var uid = u && u.data && u.data.user ? u.data.user.id : null;
        return sb.from('orders').insert({
          ref: order.ref,
          user_id: uid,
          customer: order.customer,
          items: order.items,
          subtotal: order.subtotal,
          shipping: order.deliveryFee || 0,
          total: order.total,
          status: order.paymentStatus || 'pending',
          paystack_ref: order.paymentRef || null
        });
      });
    },

    // ---- Newsletter (write) ----
    addSubscriber: function (email) {
      // ignoreDuplicates → ON CONFLICT DO NOTHING, which only needs the insert policy.
      return sb.from('subscribers').upsert({ email: email }, { onConflict: 'email', ignoreDuplicates: true });
    },

    // ---- Customer accounts ----
    signUp: function (email, password, fullName, phone) {
      return sb.auth.signUp({ email: email, password: password, options: { data: { full_name: fullName, phone: phone } } });
    },
    signIn: function (email, password) { return sb.auth.signInWithPassword({ email: email, password: password }); },
    signOut: function () { return sb.auth.signOut(); },
    currentUser: function () { return sb.auth.getUser().then(function (u) { return u && u.data ? u.data.user : null; }); },

    // ---- Admin writes (only work when logged in as the owner; RLS enforces it) ----
    upsertProduct: function (p) {
      var row = {
        id: p.id, name: p.name, price: p.price, category: p.category, tag: p.tag || '',
        bestseller: !!p.bestseller, image: p.image, images: (p.images && p.images.length ? p.images : (p.image ? [p.image] : [])),
        sizes: p.sizes || ['S', 'M', 'L', 'XL'], fabric: p.fabric, stretch: p.stretch, care: p.care, fit: p.fit,
        model_size: p.modelSize, model_info: p.modelInfo, rating: p.rating || 0, reviews: p.reviews || 0,
        description: p.description, sort: p.sort || 0
      };
      return sb.from('products').upsert(row).select();
    },
    deleteProduct: function (id) { return sb.from('products').delete().eq('id', id); },

    // ---- Gallery (the "Follow the CityGirl Life" strip) ----
    listGallery: function () { return sb.from('gallery').select('*').order('sort', { ascending: true }); },
    addGallery: function (url, sort) { return sb.from('gallery').insert({ url: url, sort: sort || Math.floor(Date.now() / 1000) }); },
    deleteGallery: function (id) { return sb.from('gallery').delete().eq('id', id); },

    // ---- Orders (owner reads all / updates status) ----
    listOrders: function () { return sb.from('orders').select('*').order('created_at', { ascending: false }); },
    updateOrderStatus: function (id, status) { return sb.from('orders').update({ status: status }).eq('id', id); },

    uploadImage: function (file) {
      var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      var path = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
      return sb.storage.from('products').upload(path, file, { upsert: false, contentType: file.type })
        .then(function (res) {
          if (res.error) throw res.error;
          return sb.storage.from('products').getPublicUrl(path).data.publicUrl;
        });
    },

    _client: sb
  };
})();
