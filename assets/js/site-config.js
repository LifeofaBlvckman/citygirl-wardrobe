/**
 * CityGirl Wardrobe — site settings.
 * This is the one file to edit when the domain changes or Paystack goes live.
 */
window.CGW_CONFIG = {
  // Public address of the site (no trailing slash). Also update it in
  // robots.txt, sitemap.xml and the <link rel="canonical"> / og:url tags
  // if you move to a custom domain.
  siteUrl: 'https://citygirlwardrobe-bw-3.vercel.app',

  // Paystack PUBLIC key (starts with pk_live_ or pk_test_). Safe to expose.
  // While this is empty, "Pay online" shows as "coming soon" and customers
  // order with pay on delivery. Your SECRET key never goes in this file; it
  // lives in Vercel → Settings → Environment Variables (see README).
  paystackPublicKey: '',

  // Server endpoint that confirms a Paystack payment (api/paystack-verify.js).
  paystackVerifyUrl: '/api/paystack-verify'
};
