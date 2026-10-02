/**
 * POST /api/paystack-verify  { reference }
 * Called by checkout.html right after Paystack's popup reports success.
 * Responds { status: 'paid' | 'review', ref } or { error }.
 */
'use strict';
const { processReference } = require('./_lib/paystack');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  try {
    const result = await processReference(body && body.reference);
    return res.status(200).json(result);
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error('paystack-verify', e);
    return res.status(status).json({ error: status >= 500 && !e.status ? 'Server error' : e.message });
  }
};
