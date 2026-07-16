/* ============================================================================
   Academy Periwinkle — widget motion driver (classic script, loaded with defer).
   • Count-up numbers  ([data-count], optional data-suffix/data-prefix/data-dec)
     tween 0 → target with a cubic ease-out the first time they scroll into view.
   • Reveal-fill bars  (.fillbar) grow to their CSS --fill the first time they
     scroll into view (width is transitioned in academy.css).
   Both are gated on prefers-reduced-motion — the final value is shown instantly.
   Robust to the SPA swapping #app: a MutationObserver re-scans on every render.
   ========================================================================== */
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setCount(el, value) {
    var dec = parseInt(el.getAttribute("data-dec") || "0", 10);
    var suf = el.getAttribute("data-suffix") || "";
    var pre = el.getAttribute("data-prefix") || "";
    // Locale grouping ("1,691", never "1691") — the hero counts real catalog
    // numbers north of 1000 now; min/max fraction digits keep data-dec exact.
    el.textContent = pre + value.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
  }

  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = "1";
    var target = parseFloat(el.getAttribute("data-count")) || 0;
    if (reduce) { setCount(el, target); return; }
    var t0 = null, dur = 1500;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3); // cubic ease-out
      setCount(el, target * e);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function fill(el) {
    if (el.dataset.filled) return;
    el.dataset.filled = "1";
    el.classList.add("in"); // academy.css transitions the inner bar to var(--fill)
  }

  var io = ("IntersectionObserver" in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var t = en.target;
      if (t.hasAttribute("data-count")) countUp(t);
      if (t.classList.contains("fillbar")) fill(t);
      io.unobserve(t);
    });
  }, { threshold: 0.35 }) : null;

  function scan() {
    var nodes = document.querySelectorAll("[data-count]:not([data-counted]), .fillbar:not([data-filled])");
    Array.prototype.forEach.call(nodes, function (n) {
      if (io) io.observe(n);
      else if (n.hasAttribute("data-count")) countUp(n);
      else fill(n);
    });
  }

  function boot() {
    scan();
    var app = document.getElementById("app");
    if (app && "MutationObserver" in window) {
      var mo = new MutationObserver(function () { scan(); });
      mo.observe(app, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
