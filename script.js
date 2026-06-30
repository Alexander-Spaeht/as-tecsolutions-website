(function () {
  const GA_MEASUREMENT_ID = ""; // Hier später Ihre Google-Analytics-Mess-ID eintragen, z. B. "G-XXXXXXXXXX".
  const consentKey = "asTecSolutionsAnalyticsConsent";
  const themeKey = "asTecSolutionsTheme";

  const banner = document.querySelector("[data-cookie-banner]");
  const acceptButton = document.querySelector("[data-cookie-accept]");
  const rejectButton = document.querySelector("[data-cookie-reject]");
  const settingsButtons = document.querySelectorAll("[data-open-cookie-settings]");

  const previewOverlay = document.querySelector("[data-cookie-preview-overlay]");
  const previewClose = document.querySelector("[data-cookie-preview-close]");
  const previewStatus = document.querySelector("[data-cookie-preview-status]");
  const previewLiveActions = document.querySelector("[data-cookie-preview-live-actions]");

  function analyticsIsConfigured() {
    return /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID);
  }

  function loadGoogleAnalytics() {
    if (!analyticsIsConfigured() || window.asTecAnalyticsLoaded) return;

    window.asTecAnalyticsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    window.gtag = gtag;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_MEASUREMENT_ID);
    document.head.appendChild(script);

    gtag("js", new Date());
    gtag("config", GA_MEASUREMENT_ID, {
      anonymize_ip: true
    });
  }

  function hideBanner() {
    if (banner) banner.setAttribute("hidden", "");
  }

  function showBanner() {
    if (banner && analyticsIsConfigured()) banner.removeAttribute("hidden");
  }

  function setConsent(value) {
    localStorage.setItem(consentKey, value);
    hideBanner();
    if (value === "accepted") loadGoogleAnalytics();
    closePreview();
  }

  // --- Cookie-Banner-Vorschau (Modal) ---
  function openPreview() {
    if (!previewOverlay) return;

    if (analyticsIsConfigured()) {
      if (previewStatus) {
        previewStatus.textContent = "So sieht der Banner aus, den Ihre Besucher beim ersten Aufruf sehen. Sie können die Auswahl hier direkt testen.";
      }
      if (previewLiveActions) previewLiveActions.removeAttribute("hidden");
    } else {
      if (previewStatus) {
        previewStatus.textContent = "Sobald eine Google-Analytics-Mess-ID hinterlegt ist, erscheint dieser Banner automatisch beim ersten Seitenaufruf. Bis dahin wird kein Analytics geladen und der Banner bleibt inaktiv – das ist die Vorschau, wie er aussehen wird.";
      }
      if (previewLiveActions) previewLiveActions.setAttribute("hidden", "");
    }

    previewOverlay.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
  }

  function closePreview() {
    if (!previewOverlay) return;
    previewOverlay.setAttribute("hidden", "");
    document.body.style.overflow = "";
  }

  settingsButtons.forEach(function (button) {
    button.addEventListener("click", openPreview);
  });
  if (previewClose) previewClose.addEventListener("click", closePreview);
  if (previewOverlay) {
    previewOverlay.addEventListener("click", function (event) {
      if (event.target === previewOverlay) closePreview();
    });
  }
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && previewOverlay && !previewOverlay.hidden) closePreview();
  });

  // --- Echte Consent-Logik ---
  if (analyticsIsConfigured()) {
    const storedConsent = localStorage.getItem(consentKey);
    if (storedConsent === "accepted") {
      loadGoogleAnalytics();
    } else if (storedConsent !== "rejected") {
      showBanner();
    }
    if (acceptButton) acceptButton.addEventListener("click", function () { setConsent("accepted"); });
    if (rejectButton) rejectButton.addEventListener("click", function () { setConsent("rejected"); });
  } else {
    hideBanner();
  }

  // --- Theme-Toggle (Hell-/Dunkelmodus) ---
  const themeToggle = document.querySelector("[data-theme-toggle]");
  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  }
  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(themeKey, theme); } catch (e) {}
  }
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      setTheme(currentTheme() === "dark" ? "light" : "dark");
    });
  }
})();
