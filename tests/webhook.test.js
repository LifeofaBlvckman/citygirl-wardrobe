'use strict';
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { Readable } = require('stream');
const handler = require('../api/paystack-webhook');

function call(body, signature) {
  const req = Readable.from([Buffer.from(body)]);
  req.method = 'POST';
  req.headers = { 'x-paystack-signature': signature };
  return new Promise(resolve => {
    const res = { statusCode: 0, setHeader() {}, status(c) { this.statusCode = c; return this; }, end() { resolve(this.statusCode); }, json() { resolve(this.statusCode); } };
    handler(req, res);
  });
}

test('webhook rejects a bad signature and accepts a valid one', async () => {
  process.env.PAYSTACK_SECRET_KEY = 'sk_test_x';
  const body = JSON.stringify({ event: 'transfer.success', data: {} }); // ignored event → 200 without DB calls
  assert.strictEqual(await call(body, 'deadbeef'), 401);
  const sig = crypto.createHmac('sha512', 'sk_test_x').update(body).digest('hex');
  assert.strictEqual(await call(body, sig), 200);
  delete process.env.PAYSTACK_SECRET_KEY;
});
