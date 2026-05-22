/**
 * Kind website — GDPR cookie consent
 * Stores preferences in localStorage; loads analytics/marketing tags only after consent.
 * Hook ad pixels in loadMarketingTags() / loadAnalyticsTags() or listen for kind:cookies:* events.
 */
(function () {
  const CONSENT_KEY = 'kind_cookie_consent';
  const CONSENT_VERSION = 1;

  const defaults = {
    version: CONSENT_VERSION,
    necessary: true,
    analytics: false,
    marketing: false,
    updatedAt: null
  };

  function readConsent() {
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.version !== CONSENT_VERSION) return null;
      return data;
    } catch {
      return null;
    }
  }

  function writeConsent(partial) {
    const next = {
      ...defaults,
      ...readConsent(),
      ...partial,
      version: CONSENT_VERSION,
      necessary: true,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
    applyConsent(next);
    window.dispatchEvent(new CustomEvent('kind:cookies:updated', { detail: next }));
    return next;
  }

  function hasConsent(category) {
    const c = readConsent();
    if (!c) return category === 'necessary';
    if (category === 'necessary') return true;
    return Boolean(c[category]);
  }

  function ensureGtag() {
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = window.gtag || gtag;
    return window.gtag;
  }

  let consentDefaultSet = false;

  /** Google Consent Mode v2 — denied until user opts in (for ad / analytics tags) */
  function setConsentDefaultDenied() {
    if (consentDefaultSet) return;
    consentDefaultSet = true;
    ensureGtag()('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      wait_for_update: 500
    });
  }

  function updateGoogleConsent(consent) {
    ensureGtag()('consent', 'update', {
      analytics_storage: consent.analytics ? 'granted' : 'denied',
      ad_storage: consent.marketing ? 'granted' : 'denied',
      ad_user_data: consent.marketing ? 'granted' : 'denied',
      ad_personalization: consent.marketing ? 'granted' : 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted'
    });
  }

  function loadAnalyticsTags() {
    window.dispatchEvent(new CustomEvent('kind:cookies:analytics', { detail: readConsent() }));
    /* Example: load Google Analytics when you have a measurement ID
    if (!document.getElementById('kind-ga4')) {
      const s = document.createElement('script');
      s.id = 'kind-ga4';
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXX';
      document.head.appendChild(s);
      gtag('js', new Date());
      gtag('config', 'G-XXXXXXXX', { anonymize_ip: true });
    }
    */
  }

  function loadMarketingTags() {
    window.dispatchEvent(new CustomEvent('kind:cookies:marketing', { detail: readConsent() }));
    /* Example: Meta Pixel, LinkedIn Insight, Google Ads — inject only after marketing consent
    if (!window.fbq) { ... }
    */
  }

  function applyConsent(consent) {
    updateGoogleConsent(consent);
    if (consent.analytics) loadAnalyticsTags();
    if (consent.marketing) loadMarketingTags();
  }

  function buildUI() {
    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.id = 'kind-cookie-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML = `
      <div class="cookie-banner__panel">
        <p class="cookie-banner__text">
          We use cookies to run this site, measure traffic, and support advertising tests.
          You can accept all, reject non-essential cookies, or manage your choices.
          See our <a href="cookie-policy.html">Cookie Policy</a>.
        </p>
        <div class="cookie-banner__actions">
          <button type="button" class="cookie-btn cookie-btn--ghost" data-action="reject">Reject non-essential</button>
          <button type="button" class="cookie-btn cookie-btn--secondary" data-action="settings">Manage preferences</button>
          <button type="button" class="cookie-btn cookie-btn--primary" data-action="accept">Accept all</button>
        </div>
      </div>`;

    const modal = document.createElement('div');
    modal.className = 'cookie-modal';
    modal.id = 'kind-cookie-modal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'kind-cookie-modal-title');
    modal.innerHTML = `
      <div class="cookie-modal__backdrop" data-action="close-modal"></div>
      <div class="cookie-modal__dialog">
        <button type="button" class="cookie-modal__close" data-action="close-modal" aria-label="Close">×</button>
        <h2 class="cookie-modal__title" id="kind-cookie-modal-title">Cookie preferences</h2>
        <p class="cookie-modal__intro">
          Choose which cookies we may use. Strictly necessary cookies are required for the site to work.
          Read our <a href="cookie-policy.html">Cookie Policy</a> for details.
        </p>
        <div class="cookie-category">
          <div class="cookie-category__head">
            <h3>Strictly necessary</h3>
            <span>Always on</span>
          </div>
          <p>Required for security, consent storage, and basic site functionality. These cannot be switched off.</p>
        </div>
        <div class="cookie-category">
          <div class="cookie-category__head">
            <h3>Analytics</h3>
            <label class="cookie-toggle" title="Analytics cookies">
              <input type="checkbox" id="kind-cookie-analytics" />
              <span class="cookie-toggle__track"></span>
            </label>
          </div>
          <p>Help us understand how visitors use the site (e.g. page views, traffic sources). Data is used in aggregate where possible.</p>
        </div>
        <div class="cookie-category">
          <div class="cookie-category__head">
            <h3>Marketing &amp; advertising</h3>
            <label class="cookie-toggle" title="Marketing cookies">
              <input type="checkbox" id="kind-cookie-marketing" />
              <span class="cookie-toggle__track"></span>
            </label>
          </div>
          <p>Used for ad measurement and remarketing tests (e.g. conversion tracking, audience building). Only set with your consent.</p>
        </div>
        <div class="cookie-modal__actions">
          <button type="button" class="cookie-btn cookie-btn--ghost" data-action="reject">Reject non-essential</button>
          <button type="button" class="cookie-btn cookie-btn--primary" data-action="save">Save preferences</button>
        </div>
      </div>`;

    document.body.appendChild(banner);
    document.body.appendChild(modal);
    return { banner, modal };
  }

  function openModal(ui) {
    const c = readConsent();
    const analyticsEl = document.getElementById('kind-cookie-analytics');
    const marketingEl = document.getElementById('kind-cookie-marketing');
    if (analyticsEl) analyticsEl.checked = c ? c.analytics : false;
    if (marketingEl) marketingEl.checked = c ? c.marketing : false;
    ui.modal.hidden = false;
    ui.banner.hidden = true;
    document.body.classList.add('cookie-modal-open');
  }

  function closeModal(ui) {
    ui.modal.hidden = true;
    document.body.classList.remove('cookie-modal-open');
    if (!readConsent()) ui.banner.hidden = false;
  }

  function hideBanner(ui) {
    ui.banner.hidden = true;
  }

  function bindEvents(ui) {
    const { banner, modal } = ui;

    function acceptAll() {
      writeConsent({ analytics: true, marketing: true });
      hideBanner(ui);
      closeModal(ui);
    }

    function rejectNonEssential() {
      writeConsent({ analytics: false, marketing: false });
      hideBanner(ui);
      closeModal(ui);
    }

    function savePreferences() {
      writeConsent({
        analytics: document.getElementById('kind-cookie-analytics')?.checked ?? false,
        marketing: document.getElementById('kind-cookie-marketing')?.checked ?? false
      });
      hideBanner(ui);
      closeModal(ui);
    }

    banner.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'accept') acceptAll();
      else if (action === 'reject') rejectNonEssential();
      else if (action === 'settings') openModal(ui);
    });

    modal.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'close-modal') {
        closeModal(ui);
        return;
      }
      if (action === 'accept') acceptAll();
      else if (action === 'reject') rejectNonEssential();
      else if (action === 'save') savePreferences();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) closeModal(ui);
    });

    document.querySelectorAll('[data-kind-cookie-settings]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(ui);
        hideBanner(ui);
      });
    });
  }

  function init() {
    setConsentDefaultDenied();
    const ui = buildUI();
    bindEvents(ui);

    const existing = readConsent();
    if (existing) {
      applyConsent(existing);
      ui.banner.hidden = true;
    } else {
      ui.banner.hidden = false;
    }

    window.KindCookieConsent = {
      readConsent,
      writeConsent,
      hasConsent,
      openPreferences: () => {
        openModal(ui);
        hideBanner(ui);
      },
      applyConsent
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
