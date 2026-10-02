/* ============================================================
 * CityGirl Wardrobe — Supabase integration (TEMPLATE)
 * ------------------------------------------------------------
 * 1. Rename this file to `supabase-config.js`.
 * 2. Paste your Project URL + anon (public) key below.
 * 3. In every HTML page, add these two <script> tags BEFORE store-data.js:
 *
 *      <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *      <script src="assets/js/supabase-config.js"></script>
 *
 * The ANON key is safe to expose in the browser — Row Level Security (see
 * schema.sql) controls what it can do. NEVER put the service_role key here.
 * ============================================================ */

const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-PUBLIC-KEY';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ---------------- SHOP DATA ---------------- */

// Fetch all products (use this to replace the local sample catalogue).
async function cgwGetProducts() {
  const { data, error } = await sb.from('products').select('*').order('sort', { ascending: true });
  if (error) { console.error(error); return []; }
  return data;
}

async function cgwGetReviews() {
  const { data, error } = await sb.from('reviews').select('*').eq('approved', true).order('created_at', { ascending: false });
  return error ? [] : data;
}

async function cgwGetGallery() {
  const { data, error } = await sb.from('gallery').select('url').order('sort', { ascending: true });
  return error ? [] : data.map(function (g) { return g.url; });
}

/* ---------------- ORDERS ---------------- */

// order = { ref, customer:{...}, items:[...], subtotal, shipping, total, paystack_ref? }
async function cgwCreateOrder(order) {
  const user = (await sb.auth.getUser()).data.user;
  const { data, error } = await sb.from('orders').insert({
    ref: order.ref,
    user_id: user ? user.id : null,
    customer: order.customer,
    items: order.items,
    subtotal: order.subtotal,
    shipping: order.shipping || 0,
    total: order.total,
    paystack_ref: order.paystack_ref || null,
    status: 'pending'
  }).select().single();
  if (error) throw error;
  return data;
}

/* ---------------- NEWSLETTER ---------------- */

async function cgwAddSubscriber(email) {
  // upsert avoids errors if the email already exists
  const { error } = await sb.from('subscribers').upsert({ email: email }, { onConflict: 'email' });
  return !error;
}

/* ---------------- CUSTOMER ACCOUNTS (Auth) ---------------- */
// Supabase Auth stores and hashes passwords for you (bcrypt). You never handle
// raw passwords or store them in your tables.

async function cgwSignUp(email, password, fullName, phone) {
  return await sb.auth.signUp({
    email: email,
    password: password,
    options: { data: { full_name: fullName, phone: phone } }
  });
}

async function cgwSignIn(email, password) {
  return await sb.auth.signInWithPassword({ email: email, password: password });
}

async function cgwSignOut() { return await sb.auth.signOut(); }

async function cgwCurrentUser() { return (await sb.auth.getUser()).data.user; }

/* ============================================================
 * HOW TO PLUG THIS INTO THE EXISTING SITE
 * ------------------------------------------------------------
 * A) LOAD PRODUCTS FROM SUPABASE (instead of the sample data)
 *    In each page, AFTER CGWRender.init(...) but before you render products:
 *
 *      const dbProducts = await cgwGetProducts();
 *      if (dbProducts.length) {
 *        CGWRender.content.products = dbProducts.map(p => ({
 *          ...p, modelSize: p.model_size, modelInfo: p.model_info   // map snake_case → camelCase
 *        }));
 *      }
 *      // then run your grid/carousel render code
 *
 * B) SAVE ORDERS TO SUPABASE
 *    In checkout.html, find where the order object is built and CGW.saveOrder(order)
 *    is called. Add:
 *
 *      try { await cgwCreateOrder(order); } catch (e) { console.error('order save failed', e); }
 *
 * C) NEWSLETTER
 *    In the newsletter submit handlers, replace  CGW.addSubscriber(email)
 *    with:   await cgwAddSubscriber(email);
 *
 * D) REVIEWS / GALLERY (home page)
 *    const reviews = await cgwGetReviews();  // then feed into the reviews slider
 *    const gallery = await cgwGetGallery();  // then feed into content.gallery
 *
 * E) ACCOUNTS
 *    Build a simple login/signup form and call cgwSignUp / cgwSignIn.
 *    Use cgwCurrentUser() to show "My account" / order history.
 * ============================================================ */
