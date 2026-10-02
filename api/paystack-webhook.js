/**
 * POST /api/paystack-webhook
 * Backup for api/paystack-verify: Paystack calls this directly after a charge,
 * so the order is still recorded if the customer closes the page right after paying.
 * Set the webhook URL in Paystack → Settings → API Keys & Webhooks to
 *   https://<your-domain>/api/paystack-webhook
 */
'use strict';
const crypto = require('crypto');
const { processReference, config } = require('./_lib/paystack');

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }
  const secret = config().secret;
  if (!secret) return res.status(503).end();

  const raw = await readRawBody(req);
  const expected = crypto.createHmac('sha512', secret).update(raw).digest('hex');
  const given = String(req.headers['x-paystack-signature'] || '');
  if (given.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return res.status(401).end();
  }

  let event = {};
  try { event = JSON.parse(raw.toString('utf8')); } catch (e) { return res.status(400).end(); }
  if (event.event === 'charge.success' && event.data && event.data.reference) {
    try { await processReference(event.data.reference); }
    catch (e) { console.error('paystack-webhook', e.message); return res.status(e.status && e.status < 500 ? 200 : 500).end(); }
  }
  return res.status(200).end();
};

// Paystack's signature is over the exact bytes it sent, so read the raw body.
module.exports.config = { api: { bodyParser: false } };
