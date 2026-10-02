/**
 * CityGirl Wardrobe — delivery options and fees (in Naira).
 * Shared by the checkout page and the payment-verification API, so the price
 * a customer sees is the same one the server checks. Edit fees here only.
 */
(function (root, factory) {
  var rates = factory();
  if (typeof module === 'object' && module.exports) module.exports = rates;
  else root.CGW_DELIVERY = rates;
})(this, function () {
  var FREE_LAGOS_OVER = 50000; // Lagos delivery is free when the items total at least this much

  function optionsFor(country) {
    if (country === 'Nigeria') {
      return [
        { id: 'lagos',  label: 'Lagos delivery',      desc: '1–3 business days · free over ₦' + FREE_LAGOS_OVER.toLocaleString('en-NG'), fee: 2500 },
        { id: 'nation', label: 'Nationwide delivery', desc: '3–7 business days, tracked', fee: 5000 },
        { id: 'pickup', label: 'Pickup in Lagos',     desc: "Collect from us — we'll share the address", fee: 0 }
      ];
    }
    return [{ id: 'intl', label: 'Worldwide shipping', desc: '7–14 business days, fully tracked', fee: 45000 }];
  }

  // Fee for a chosen option, or null if that option isn't offered for the country.
  function feeFor(country, optionId, itemsSubtotal) {
    var opt = optionsFor(country).find(function (o) { return o.id === optionId; });
    if (!opt) return null;
    if (opt.id === 'lagos' && itemsSubtotal >= FREE_LAGOS_OVER) return 0;
    return opt.fee;
  }

  return { FREE_LAGOS_OVER: FREE_LAGOS_OVER, optionsFor: optionsFor, feeFor: feeFor };
});
