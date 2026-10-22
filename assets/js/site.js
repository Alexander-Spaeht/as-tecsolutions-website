(function () {
  // Mobilmenü
  var btn = document.querySelector(".menu-btn");
  var nav = document.getElementById("hauptnavigation");
  if (btn && nav) {
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); }
    });
  }

  // Jahreszahl in der Fußzeile
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();

  // Kontaktformular
  // Solange kein Formulardienst eingetragen ist (action enthält noch "[FORMULAR-ENDPUNKT]"),
  // öffnet das Formular das Mailprogramm mit vorausgefüllter Nachricht.
  var form = document.querySelector("form[data-contact]");
  if (!form) return;
  form.addEventListener("submit", function (e) {
    var action = form.getAttribute("action") || "";
    var status = form.querySelector(".form-status");
    if (action.indexOf("[") === -1) {
      // Echter Endpunkt (Formward): per fetch absenden, Antwort direkt auf der Seite anzeigen
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var fehler = "Das Senden hat leider nicht geklappt. Bitte rufen Sie uns an unter 02192 7919059 oder schreiben Sie an info@as-tecsolutions.de.";
      if (btn) btn.disabled = true;
      if (status) status.textContent = "Ihre Anfrage wird gesendet ...";
      fetch(action, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (d) { return res.ok && d.ok !== false; });
        })
        .then(function (ok) {
          if (ok) { form.reset(); if (status) status.textContent = "Vielen Dank, Ihre Anfrage ist bei uns angekommen. Wir melden uns in der Regel noch am selben Tag, spätestens am nächsten Tag."; }
          else if (status) status.textContent = fehler;
        })
        .catch(function () { if (status) status.textContent = fehler; })
        .then(function () { if (btn) btn.disabled = false; });
      return;
    }
    e.preventDefault();
    var d = new FormData(form);
    var body =
      "Name: " + (d.get("name") || "") + "\n" +
      "Telefon: " + (d.get("telefon") || "") + "\n" +
      "E-Mail: " + (d.get("email") || "") + "\n" +
      "Ort: " + (d.get("ort") || "") + "\n" +
      "Anliegen: " + (d.get("anliegen") || "") + "\n\n" +
      (d.get("nachricht") || "");
    window.location.href = "mailto:info@as-tecsolutions.de?subject=" +
      encodeURIComponent("Anfrage über die Website: " + (d.get("anliegen") || "")) +
      "&body=" + encodeURIComponent(body);
    if (status) status.textContent = "Ihr Mailprogramm öffnet sich mit Ihrer Anfrage. Bitte dort auf Senden klicken.";
  });
})();

// Bildslider im Startbereich: wischen, Pfeile, Punkte, ruhiger automatischer Wechsel
(function () {
  var root = document.querySelector("[data-slider]");
  if (!root) return;
  var track = root.querySelector(".slider-track");
  var slides = root.querySelectorAll(".slide");
  var dotsBox = root.querySelector(".slider-dots");
  var prev = root.querySelector(".slider-btn--prev");
  var next = root.querySelector(".slider-btn--next");
  var n = slides.length, i = 0, timer = null;
  if (n < 2) { prev.hidden = next.hidden = true; return; }
  var dots = [];
  for (var k = 0; k < n; k++) {
    var b = document.createElement("button");
    b.type = "button"; b.setAttribute("aria-label", "Bild " + (k + 1));
    (function (k) { b.addEventListener("click", function () { go(k); restart(); }); })(k);
    dotsBox.appendChild(b); dots.push(b);
  }
  function mark() { dots.forEach(function (d, k) { d.setAttribute("aria-current", k === i ? "true" : "false"); }); }
  function go(k) { i = (k + n) % n; track.scrollTo({ left: i * track.clientWidth }); mark(); }
  prev.addEventListener("click", function () { go(i - 1); restart(); });
  next.addEventListener("click", function () { go(i + 1); restart(); });
  var t;
  track.addEventListener("scroll", function () {
    clearTimeout(t);
    t = setTimeout(function () { i = Math.round(track.scrollLeft / track.clientWidth); mark(); }, 80);
  });
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function start() { if (!reduce && !timer) timer = setInterval(function () { go(i + 1); }, 6000); }
  function stop() { clearInterval(timer); timer = null; }
  function restart() { stop(); start(); }
  root.addEventListener("mouseenter", stop); root.addEventListener("mouseleave", start);
  root.addEventListener("focusin", stop); root.addEventListener("focusout", start);
  track.addEventListener("touchstart", stop, { passive: true });
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  track.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); go(i + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(i - 1); }
  });
  mark(); start();
})();
