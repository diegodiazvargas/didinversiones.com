/* ==========================================================================
   DIDI Inversiones — interacciones generales del sitio
   Menú móvil, contadores animados, revelado al hacer scroll, año del footer
   ========================================================================== */

(function () {
  "use strict";

  /* ---------- Menú móvil ---------- */
  var navToggle = document.getElementById("navToggle");
  var mobileMenu = document.getElementById("mobileMenu");

  if (navToggle && mobileMenu) {
    navToggle.addEventListener("click", function () {
      var isOpen = mobileMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    mobileMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileMenu.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Tabs de aliados (inmobiliarias / bancos / mutuarias) ---------- */
  var alliesTabs = document.querySelectorAll(".allies-tab");
  var alliesPanels = document.querySelectorAll(".allies-panel");

  alliesTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      alliesTabs.forEach(function (t) {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
      });
      alliesPanels.forEach(function (panel) {
        panel.classList.remove("is-active");
        panel.hidden = true;
      });

      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");

      var target = document.getElementById("panel-" + tab.getAttribute("data-tab"));
      if (target) {
        target.classList.add("is-active");
        target.hidden = false;
      }
    });
  });

  /* ---------- Simulador de crédito ---------- */
  (function () {
    var ufInput = document.getElementById("sim-uf");
    var ufValEl = document.getElementById("sim-uf-val");
    var termBtns = document.querySelectorAll(".sim-term-btn");
    var fogaesToggle = document.getElementById("sim-fogaes");
    var fogaesLabel = document.getElementById("sim-fogaes-label");
    var fogaesNote = document.getElementById("sim-fogaes-note");
    var divValEl = document.getElementById("sim-div-val");
    var detailEl = document.getElementById("sim-detail");

    if (!ufInput || !divValEl) return;

    // Valor UF de respaldo por si falla la API (actualizar si queda muy desfasado)
    var UF_CLP = 40850;
    var years = 30;

    // FOGAES: garantía estatal que sube el financiamiento de 80% a 90% y
    // subsidia la tasa (4% -> 3,2%). Solo aplica a propiedades hasta UF 6.000.
    var FOGAES_MAX_UF = 6000;
    var FOGAES_NOTE_DEFAULT = fogaesNote ? fogaesNote.textContent : "";
    var FOGAES_NOTE_BLOCKED = "No disponible para propiedades sobre UF 6.000 — el tope de FOGAES.";

    // Trae el valor UF del día desde una API pública chilena, así el cálculo
    // nunca queda desactualizado sin depender de tocar el código.
    fetch("https://mindicador.cl/api/uf")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.serie && data.serie[0] && data.serie[0].valor) {
          UF_CLP = data.serie[0].valor;
          update();
        }
      })
      .catch(function () {
        /* sin conexión a la API: se usa el valor de respaldo */
      });

    function fmt(n) {
      return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    function update() {
      var ufAmount = parseInt(ufInput.value, 10);
      ufValEl.textContent = "UF " + fmt(ufAmount);

      // Sobre el tope, FOGAES no aplica: se bloquea el toggle y se desmarca solo.
      var overFogaesLimit = ufAmount > FOGAES_MAX_UF;
      fogaesToggle.disabled = overFogaesLimit;
      if (overFogaesLimit) fogaesToggle.checked = false;
      if (fogaesLabel) fogaesLabel.classList.toggle("is-disabled", overFogaesLimit);
      if (fogaesNote) fogaesNote.textContent = overFogaesLimit ? FOGAES_NOTE_BLOCKED : FOGAES_NOTE_DEFAULT;

      var withFogaes = fogaesToggle.checked && !overFogaesLimit;
      var financingPct = withFogaes ? 0.9 : 0.8;
      var annualRate = withFogaes ? 0.032 : 0.04;
      var monthlyRate = annualRate / 12;
      var months = years * 12;

      var principalCLP = ufAmount * financingPct * UF_CLP;
      var payment = (principalCLP * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));

      var ratePct = (annualRate * 100).toFixed(1).replace(".", ",");
      divValEl.textContent = "$ " + fmt(payment);
      detailEl.textContent =
        "Financiamiento " + Math.round(financingPct * 100) + "% · tasa " +
        ratePct + "% anual · " + years + " años";
    }

    ufInput.addEventListener("input", update);
    fogaesToggle.addEventListener("change", update);
    termBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        termBtns.forEach(function (b) {
          b.classList.remove("is-active");
          b.setAttribute("aria-pressed", "false");
        });
        btn.classList.add("is-active");
        btn.setAttribute("aria-pressed", "true");
        years = parseInt(btn.getAttribute("data-years"), 10);
        update();
      });
    });

    update();
  })();

  /* ---------- Año dinámico en el footer ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Revelado al hacer scroll ---------- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && revealEls.length) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Contadores animados (barra de credibilidad) ---------- */
  var counters = document.querySelectorAll("[data-count-to]");
  function animateCounter(el) {
    var target = parseFloat(el.getAttribute("data-count-to"));
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    var duration = 1400;
    var start = null;

    function step(timestamp) {
      if (start === null) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(target * eased);
      el.textContent = prefix + current + suffix;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = prefix + target + suffix;
      }
    }
    window.requestAnimationFrame(step);
  }

  if ("IntersectionObserver" in window && counters.length) {
    var counterObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach(function (el) { counterObserver.observe(el); });
  }
})();
