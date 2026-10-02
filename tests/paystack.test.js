// Run with: node --test tests/*.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { processReference } = require('../api/_lib/paystack');

const cfg = { secret: 'sk_test_x', sbUrl: 'https://db.example', sbKey: 'service' };
const PRODUCTS = [{ id: 'd1', name: 'Noir Crystal Gown', price: 220000, image: 'a.jpg' }, { id: 'p5', name: 'Peachy Crop Top', price: 9500, image: 'b.jpg' }];

function fakeFetch(tx, saved, opts = {}) {
  return async (url, init = {}) => {
    if (url.startsWith('https://api.paystack.co/transaction/verify/')) {
      assert.strictEqual(init.headers.Authorization, 'Bearer sk_test_x');
      return { ok: true, json: async () => ({ status: true, data: tx }) };
    }
    if (url.startsWith('https://db.example/rest/v1/products')) {
      return { ok: true, json: async () => (opts.products || PRODUCTS) };
    }
    if (url.startsWith('https://db.example/rest/v1/orders')) {
      saved.push(JSON.parse(init.body));
      return { ok: true, json: async () => ({}) };
    }
    throw new Error('unexpected ' + url);
  };
}
const meta = (delivery, country, items) => ({ order: { delivery, items, customer: { name: 'Ada', email: 'a@b.co', country, deliveryOption: delivery, payment: 'tampered' } } });

test('saves a correctly paid order as paid, priced from the database', async () => {
  const saved = [];
  // 220000 + 2×9500 = 239000 ≥ 50000 → Lagos delivery free
  const tx = { status: 'success', currency: 'NGN', reference: 'CGW-AAAA1111', amount: 23900000, metadata: meta('lagos', 'Nigeria', [{ id: 'd1', size: 'M', qty: 1 }, { id: 'p5', size: 'S', qty: 2, price: 1 }]) };
  const r = await processReference('CGW-AAAA1111', { config: cfg, fetch: fakeFetch(tx, saved) });
  assert.deepStrictEqual(r, { status: 'paid', ref: 'CGW-AAAA1111' });
  assert.strictEqual(saved[0].status, 'paid');
  assert.strictEqual(saved[0].total, 239000);
  assert.strictEqual(saved[0].shipping, 0);
  assert.strictEqual(saved[0].items[1].price, 9500); // browser-sent price ignored
  assert.strictEqual(saved[0].customer.payment, 'Paid online (Paystack)');
});

test('underpayment is saved as pending for review, not paid', async () => {
  const saved = [];
  const tx = { status: 'success', currency: 'NGN', reference: 'CGW-BBBB2222', amount: 100, metadata: meta('intl', 'Ghana', [{ id: 'p5', qty: 1 }]) };
  const r = await processReference('CGW-BBBB2222', { config: cfg, fetch: fakeFetch(tx, saved) });
  assert.strictEqual(r.status, 'review');
  assert.strictEqual(saved[0].status, 'pending');
  assert.strictEqual(saved[0].total, 9500 + 45000);
  assert.match(saved[0].customer.review, /check before shipping/);
});

test('metadata sent as a JSON string is understood', async () => {
  const saved = [];
  // Nationwide: 9500 + 5000 = 14500
  const tx = { status: 'success', currency: 'NGN', reference: 'CGW-STRG0000', amount: 1450000, metadata: JSON.stringify(meta('nation', 'Nigeria', [{ id: 'p5', qty: 1 }])) };
  const r = await processReference('CGW-STRG0000', { config: cfg, fetch: fakeFetch(tx, saved) });
  assert.strictEqual(r.status, 'paid');
  assert.strictEqual(saved[0].total, 14500);
});

test('failed payment is rejected and nothing is saved', async () => {
  const saved = [];
  const tx = { status: 'failed', currency: 'NGN', reference: 'CGW-CCCC3333', amount: 0, metadata: meta('lagos', 'Nigeria', [{ id: 'd1', qty: 1 }]) };
  await assert.rejects(processReference('CGW-CCCC3333', { config: cfg, fetch: fakeFetch(tx, saved) }), e => e.status === 402);
  assert.strictEqual(saved.length, 0);
});

test('unknown product is rejected', async () => {
  const saved = [];
  const tx = { status: 'success', currency: 'NGN', reference: 'CGW-DDDD4444', amount: 99999999, metadata: meta('lagos', 'Nigeria', [{ id: 'gone', qty: 1 }]) };
  await assert.rejects(processReference('CGW-DDDD4444', { config: cfg, fetch: fakeFetch(tx, saved) }), e => e.status === 409);
  assert.strictEqual(saved.length, 0);
});

test('not configured → 503; bad reference → 400', async () => {
  await assert.rejects(processReference('CGW-EEEE5555', { config: { secret: '', sbUrl: '', sbKey: '' }, fetch: async () => { throw new Error('no'); } }), e => e.status === 503);
  await assert.rejects(processReference('../etc', { config: cfg, fetch: async () => { throw new Error('no'); } }), e => e.status === 400);
});
