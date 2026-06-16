/**
 * Fire Google Ads waitlist conversion when ScoreApp lead form is submitted.
 * Requires cookie-consent.js (marketing consent + gtag) and embedding.js.
 */
(function () {
  var GOOGLE_ADS_CONVERSION = 'AW-18188306688/GQW-CJ-99L8cEICS7uBD';
  var SCOREAPP_ORIGIN = 'https://waitlist.kind-health.app';

  function hasMarketingConsent() {
    return window.KindCookieConsent?.hasConsent('marketing') === true;
  }

  function fireWaitlistConversion() {
    if (!hasMarketingConsent() || typeof window.gtag !== 'function') return;

    window.gtag('event', 'conversion', {
      send_to: GOOGLE_ADS_CONVERSION
    });
  }

  window.addEventListener('message', function (e) {
    if (e.origin !== SCOREAPP_ORIGIN) return;
    if (!e.data || e.data.event !== 'scoreapp_lead') return;
    fireWaitlistConversion();
  });
})();
