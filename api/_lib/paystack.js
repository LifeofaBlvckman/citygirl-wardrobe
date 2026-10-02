/**
 * Shared Paystack → order logic for api/paystack-verify.js and api/paystack-webhook.js.
 *
 * An order is only saved as "paid" after:
 *   1. Paystack confirms the transaction succeeded (checked with the SECRET key), and
 *   2. the amount paid covers the order re-priced on the server from the products
 *      table and assets/js/delivery-rates.js — never from prices sent by a browser.
 *
 * Environment variables (Vercel → Project → Settings → Environment Variables):
 *   PAYSTACK_SECRET_KEY        sk_live_… / sk_test_…
 *   SUPABASE_URL               https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  service role key (server only — never in browser code)
 */
'use strict';

const DELIVERY = require('../../assets/js/delivery-rates.js');

function config() {
  return {
    secret: process.env.PAYSTACK_SECRET_KEY || '',
    sbUrl: (process.env.SUPABASE_URL || '').replace(/\/+$/, ''),
    sbKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  };
}

function isConfigured(cfg) { return !!(cfg.secret && cfg.sbUrl && cfg.sbKey); }

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const REF_RE = /^[A-Za-z0-9_.=-]{6,100}$/;

async function verifyTransaction(reference, cfg, fetchImpl) {
  const r = await fetchImpl('https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference), {
    headers: { Authorization: 'Bearer ' + cfg.secret }
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || !body.status || !body.data) throw new HttpError(502, 'Could not verify payment with Paystack');
  return body.data;
}

function parseMetadata(meta) {
  if (typeof meta === 'string') { try { return JSON.parse(meta); } catch (e) { return {}; } }
  return meta || {};
}

async function fetchProducts(ids, cfg, fetchImpl) {
  const list = ids.map(id => '"' + String(id).replace(/["\\]/g, '') + '"').join(',');
  const url = cfg.sbUrl + '/rest/v1/products?select=id,name,price,tag,image&id=in.(' + encodeURIComponent(list) + ')';
  const r = await fetchImpl(url, { headers: { apikey: cfg.sbKey, Authorization: 'Bearer ' + cfg.sbKey } });
  if (!r.ok) throw new HttpError(502, 'Could not load products');
  return r.json();
}

// Rebuild the order from what Paystack says was paid for (its metadata), priced from the database.
async function priceOrder(meta, cfg, fetchImpl) {
  const cart = meta && meta.order;
  if (!cart || !Array.isArray(cart.items) || !cart.items.length || !cart.customer) throw new HttpError(422, 'Payment has no order details');
  const lines = cart.items.slice(0, 50).map(i => ({ id: String(i.id), size: String(i.size || 'One Size').slice(0, 20), qty: Math.max(1, Math.min(20, parseInt(i.qty, 10) || 1)) }));
  const products = await fetchProducts([...new Set(lines.map(l => l.id))], cfg, fetchImpl);
  const byId = new Map(products.map(p => [String(p.id), p]));
  const items = lines.map(l => {
    const p = byId.get(l.id);
    if (!p) throw new HttpError(409, 'A product in this order no longer exists');
    const price = Number(p.price) || 0;
    return { id: l.id, name: p.name, price, size: l.size, qty: l.qty, image: p.image || '' };
  });
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const customer = cart.customer || {};
  const fee = DELIVERY.feeFor(customer.country === 'Nigeria' ? 'Nigeria' : 'Other', String(cart.delivery || ''), subtotal);
  if (fee == null) throw new HttpError(409, 'Unknown delivery option');
  const clean = {};
  ['name', 'phone', 'email', 'address', 'city', 'state', 'country', 'notes', 'delivery', 'deliveryOption'].forEach(k => {
    if (customer[k] != null) clean[k] = String(customer[k]).slice(0, 500);
  });
  clean.payment = 'Paid online (Paystack)';
  return { items, subtotal, shipping: fee, total: subtotal + fee, customer: clean };
}

async function upsertOrder(row, cfg, fetchImpl) {
  const r = await fetchImpl(cfg.sbUrl + '/rest/v1/orders?on_conflict=ref', {
    method: 'POST',
    headers: {
      apikey: cfg.sbKey, Authorization: 'Bearer ' + cfg.sbKey,
      'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(row)
  });
  if (!r.ok) throw new HttpError(502, 'Could not save order');
}

/**
 * Verify a Paystack reference and record the order. Returns { status, ref }.
 * status is 'paid', or 'review' when money arrived but doesn't match the order
 * (saved as pending with a note so the owner can check it).
 */
async function processReference(reference, opts) {
  opts = opts || {};
  const cfg = opts.config || config();
  const fetchImpl = opts.fetch || fetch;
  if (!isConfigured(cfg)) throw new HttpError(503, 'Payments are not set up on the server yet');
  reference = String(reference || '');
  if (!REF_RE.test(reference)) throw new HttpError(400, 'Invalid payment reference');

  const tx = await verifyTransaction(reference, cfg, fetchImpl);
  if (tx.status !== 'success') throw new HttpError(402, 'Payment was not successful');
  if (tx.currency !== 'NGN') throw new HttpError(409, 'Unexpected currency');

  const order = await priceOrder(parseMetadata(tx.metadata), cfg, fetchImpl);
  const paidKobo = Number(tx.amount) || 0;
  const amountOk = paidKobo >= Math.round(order.total * 100);
  if (!amountOk) order.customer.review = 'Paid ₦' + (paidKobo / 100).toLocaleString('en-NG') + ' but order total is ₦' + order.total.toLocaleString('en-NG') + ' — check before shipping.';

  await upsertOrder({
    ref: reference,
    customer: order.customer,
    items: order.items,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    status: amountOk ? 'paid' : 'pending',
    paystack_ref: tx.reference || reference
  }, cfg, fetchImpl);

  return { status: amountOk ? 'paid' : 'review', ref: reference };
}

module.exports = { processReference, HttpError, config, isConfigured };
