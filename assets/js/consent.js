/*
 * Einwilligungsverwaltung (Cookie-Banner) für AS-TecSolutions
 *
 * STATUS: aktiv (Google Analytics 4 nach Einwilligung zu "Statistik").
 * Google Ads ist NICHT eingerichtet (adsId leer): es werden keine Ads-/Conversion-Tags geladen.
 * Bei Änderung der Dienste CONFIG.version erhöhen, dann wird neu gefragt.
 *
 * Aktivieren (erst wenn die Datenschutzerklärung aktualisiert ist):
 *   1. ga4Id und/oder adsId eintragen
 *   2. enabled auf true setzen
 *   3. optional consentMode auf true setzen (Google Consent Mode v2, Basic Mode)
 *
 * Ansehen ohne Aktivierung: Seite mit ?cookie-test=1 aufrufen. Dabei werden
 * keine Fremdskripte geladen, solange keine Mess-ID eingetragen ist.
 */
(function () {
  "use strict";

  var CONFIG = {
    enabled: true,
    ga4Id: "G-B3JFCK4S22", // Google Analytics 4
    adsId: "",          // z. B. "AW-XXXXXXXXXX" (Google Ads)
    consentMode: true,  // true = Google Consent Mode v2 (Basic Mode) verwenden
    storageKey: "astecConsent",
    version: 2,         // bei geänderten Diensten erhöhen, dann wird neu gefragt (2: Marketing-Auswahl ausgeblendet)
    marketingUi: false, // true = Kategorie "Marketing" im Fenster anzeigen (erst, wenn Google Ads eingerichtet ist)
    maxAgeDays: 365
  };

  var preview = /[?&]cookie-test=1(&|$)/.test(location.search) || window.AS_CONSENT_PREVIEW === true;
  if (!CONFIG.enabled && !preview) return;

  var KEY = CONFIG.storageKey + (CONFIG.enabled ? "" : "Preview");
  var memory = null;      // Ersatz, falls der Browser-Speicher gesperrt ist
  var configured = {};    // bereits an Google gemeldete IDs
  var gtagLoaded = false;
  var root, lastFocus = null, current = null;

  // ---------- Speicher ----------
  function read() {
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) { raw = memory; }
    if (!raw || raw.v !== CONFIG.version) return null;
    if (Date.now() - raw.ts > CONFIG.maxAgeDays * 86400000) return null;
    return { statistics: !!raw.statistics, marketing: CONFIG.marketingUi && !!raw.marketing };
  }
  function write(state) {
    var rec = { v: CONFIG.version, ts: Date.now(), statistics: !!state.statistics, marketing: !!state.marketing };
    memory = rec;
    try { localStorage.setItem(KEY, JSON.stringify(rec)); } catch (e) {}
  }

  // ---------- Cookies entfernen ----------
  var COOKIE_PATTERNS = {
    statistics: [/^_ga$/, /^_ga_/, /^_gid$/, /^_gat/],
    marketing: [/^_gcl_/, /^_gac_/, /^_gae_/]
  };
  function expire(name) {
    var host = location.hostname, bare = host.replace(/^www\./, "");
    var domains = [null, host, "." + host, bare, "." + bare];
    domains.forEach(function (d) {
      document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + (d ? "; domain=" + d : "") + "; SameSite=Lax";
    });
  }
  function removeCookies(category) {
    document.cookie.split(";").forEach(function (c) {
      var name = c.split("=")[0].replace(/^\s+/, "");
      if (!name) return;
      COOKIE_PATTERNS[category].forEach(function (re) { if (re.test(name)) expire(name); });
    });
  }

  // ---------- Google-Einbindung (nur nach Einwilligung) ----------
  function consentValues(state) {
    var ads = !!(state.marketing && CONFIG.adsId);
    return {
      // Marketing-Zustände nur, wenn Google Ads tatsächlich eingerichtet ist; Statistik gilt nie als Marketing-Zustimmung.
      ad_storage: ads ? "granted" : "denied",
      ad_user_data: ads ? "granted" : "denied",
      ad_personalization: ads ? "granted" : "denied",
      analytics_storage: state.statistics ? "granted" : "denied"
    };
  }
  function ensureGtag() {
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) window.gtag = function () { window.dataLayer.push(arguments); };
  }
  // Consent Mode v2 (Basic): Standard "denied" für alle vier Zustände, bevor irgendein Google-Tag geladen wird.
  // Das schreibt nur in dataLayer; es wird keine Anfrage an Google gesendet.
  function setConsentDefault() {
    if (!CONFIG.consentMode) return;
    ensureGtag();
    window.gtag("consent", "default", {
      ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied"
    });
  }
  function loadGoogle(state) {
    var ids = [];
    if (state.statistics && CONFIG.ga4Id) ids.push(CONFIG.ga4Id);
    if (state.marketing && CONFIG.adsId) ids.push(CONFIG.adsId);
    if (!ids.length) return;

    ensureGtag();

    if (!gtagLoaded) {
      // Basic Mode: Google-Tags werden erst nach Einwilligung geladen.
      window.gtag("js", new Date());
    }
    if (CONFIG.consentMode) window.gtag("consent", "update", consentValues(state));

    ids.forEach(function (id) {
      if (configured[id]) return;
      configured[id] = true;
      if (id === CONFIG.ga4Id) {
        // keine Werbefunktionen/Remarketing über GA4
        window.gtag("config", id, { allow_google_signals: false, allow_ad_personalization_signals: false });
      } else {
        window.gtag("config", id);
      }
    });

    if (!gtagLoaded) {
      gtagLoaded = true;
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ids[0]);
      document.head.appendChild(s);
    }
  }
  function disableGoogle() {
    if (CONFIG.ga4Id) window["ga-disable-" + CONFIG.ga4Id] = true;
  }

  // ---------- Entscheidung anwenden ----------
  function commit(state) {
    var prev = current;
    var revoked = prev && ((prev.statistics && !state.statistics) || (prev.marketing && !state.marketing));
    write(state);
    current = { statistics: !!state.statistics, marketing: !!state.marketing };

    if (revoked) {
      // Messung sofort unterbinden, bevor Cookies entfernt werden (sonst könnte ein letzter Hit sie neu setzen).
      disableGoogle();
    }
    if (prev && prev.statistics && !state.statistics) removeCookies("statistics");
    if (prev && prev.marketing && !state.marketing) removeCookies("marketing");
    if (revoked) {
      // Bereits geladene Skripte lassen sich nicht entladen: Seite neu laden.
      hide(true);
      try { document.dispatchEvent(new CustomEvent("asconsent:change", { detail: current })); } catch (e) {}
      location.reload();
      return;
    }
    loadGoogle(current);
    hide(true);
    try { document.dispatchEvent(new CustomEvent("asconsent:change", { detail: current })); } catch (e) {}
  }

  // ---------- Oberfläche ----------
  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }

  function build() {
    root = el(
      '<div class="cc" id="cookie-einstellungen" role="dialog" aria-modal="false" aria-labelledby="cc-title" aria-describedby="cc-desc" tabindex="-1" hidden>' +
        '<div class="cc-panel">' +
          '<div class="cc-view" data-view="main">' +
            '<h2 class="cc-title" id="cc-title">Datenschutz-Einstellungen</h2>' +
            '<p id="cc-desc">Wir verwenden technisch notwendige Funktionen, damit diese Website funktioniert. Mit Ihrer Einwilligung setzen wir außerdem den Statistikdienst Google Analytics 4 ein. Sie können Ihre Auswahl jederzeit über „Cookie-Einstellungen“ im Fußbereich ändern oder widerrufen.</p>' +
            '<div class="cc-actions">' +
              '<button type="button" class="cc-btn" data-cc="accept">Alle akzeptieren</button>' +
              '<button type="button" class="cc-btn" data-cc="reject">Alle ablehnen</button>' +
              '<button type="button" class="cc-btn cc-btn--plain" data-cc="settings">Einstellungen anpassen</button>' +
            '</div>' +
            '<p class="cc-links"><a href="/datenschutz/">Datenschutzerklärung</a> · <a href="/impressum/">Impressum</a></p>' +
          '</div>' +
          '<div class="cc-view" data-view="settings" hidden>' +
            '<h2 class="cc-title" id="cc-title-s">Einstellungen anpassen</h2>' +
            '<div class="cc-cats">' +
              '<div class="cc-cat"><label><input type="checkbox" checked disabled> <strong>Notwendig</strong></label>' +
                '<p>Technisch erforderlich, damit die Website und das Kontaktformular funktionieren. Dazu gehört die Speicherung Ihrer Auswahl. Immer aktiv.</p></div>' +
              '<div class="cc-cat"><label><input type="checkbox" data-cat="statistics"> <strong>Statistik (Google Analytics 4)</strong></label>' +
                '<p>Hilft uns zu verstehen, wie die Website genutzt wird. Dabei können Cookies gesetzt und Daten an Google übermittelt werden.</p></div>' +
              (CONFIG.marketingUi ?
                '<div class="cc-cat"><label><input type="checkbox" data-cat="marketing"> <strong>Marketing</strong></label>' +
                '<p>Für eine spätere Messung unserer Werbung. Derzeit setzen wir dafür keinen Dienst ein, es werden keine Marketing-Cookies gesetzt und keine Daten übermittelt.</p></div>'
                : '') +
            '</div>' +
            '<div class="cc-actions">' +
              '<button type="button" class="cc-btn" data-cc="save">Auswahl speichern</button>' +
              '<button type="button" class="cc-btn" data-cc="accept">Alle akzeptieren</button>' +
              '<button type="button" class="cc-btn" data-cc="reject">Alle ablehnen</button>' +
            '</div>' +
            '<p class="cc-links"><a href="/datenschutz/">Datenschutzerklärung</a> · <a href="/impressum/">Impressum</a></p>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cc]");
      if (!b) return;
      var a = b.getAttribute("data-cc");
      if (a === "accept") commit({ statistics: true, marketing: CONFIG.marketingUi });
      else if (a === "reject") commit({ statistics: false, marketing: false });
      else if (a === "settings") showView("settings", true);
      else if (a === "save") {
        commit({
          statistics: root.querySelector('[data-cat="statistics"]').checked,
          marketing: CONFIG.marketingUi && !!root.querySelector('[data-cat="marketing"]') && root.querySelector('[data-cat="marketing"]').checked
        });
      }
    });
    root.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && current) { hide(true); }
    });
    document.body.appendChild(root);
  }

  function showView(name, focus) {
    [].forEach.call(root.querySelectorAll(".cc-view"), function (v) { v.hidden = v.getAttribute("data-view") !== name; });
    root.setAttribute("aria-labelledby", name === "settings" ? "cc-title-s" : "cc-title");
    if (name === "settings") {
      root.querySelector('[data-cat="statistics"]').checked = !!(current && current.statistics);
      var m = root.querySelector('[data-cat="marketing"]');
      if (m) m.checked = !!(current && current.marketing);
    }
    if (focus) {
      var t = root.querySelector(".cc-view:not([hidden]) .cc-title");
      t.setAttribute("tabindex", "-1");
      t.focus();
    }
  }

  function show(view) {
    if (!root) build();
    lastFocus = document.activeElement;
    root.hidden = false;
    showView(view || "main", false);
    root.focus();
  }
  function hide(restoreFocus) {
    if (!root) return;
    root.hidden = true;
    if (restoreFocus && lastFocus && lastFocus.focus && document.contains(lastFocus)) {
      try { lastFocus.focus(); } catch (e) {}
    }
  }

  function addFooterLink() {
    var bar = document.querySelector(".footer-bottom") || document.querySelector("footer");
    if (!bar) return;
    var sep = document.createTextNode("  |  ");
    var a = document.createElement("a");
    a.href = "#cookie-einstellungen";
    a.className = "cc-open";
    a.setAttribute("role", "button");
    a.textContent = "Cookie-Einstellungen";
    a.addEventListener("click", function (e) { e.preventDefault(); show("settings"); showView("settings", true); });
    bar.appendChild(sep);
    bar.appendChild(a);
  }

  function init() {
    current = read();
    setConsentDefault();
    addFooterLink();
    if (current) loadGoogle(current);
    else show("main");
    window.AsConsent = {
      open: function () { show("settings"); showView("settings", true); },
      get: function () { return current ? { statistics: current.statistics, marketing: current.marketing } : null; }
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
