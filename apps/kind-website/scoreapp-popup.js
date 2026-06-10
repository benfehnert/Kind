/**
 * Auto-opens the ScoreApp waitlist quiz popup once per browser session.
 * Relies on the hidden trigger button (#sa-auto-popup) that ScoreApp's
 * embedding.js binds a click handler to.
 */
(function () {
  var SESSION_KEY = "kind_scoreapp_popup_seen";
  var OPEN_DELAY_MS = 1500;

  function alreadyShown() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function markShown() {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch (e) {
      /* sessionStorage unavailable — fail open, popup may show again */
    }
  }

  function openPopup() {
    var btn = document.getElementById("sa-auto-popup");
    if (!btn) return;
    markShown();
    btn.click();
  }

  if (alreadyShown()) return;

  window.addEventListener("load", function () {
    window.setTimeout(openPopup, OPEN_DELAY_MS);
  });
})();
