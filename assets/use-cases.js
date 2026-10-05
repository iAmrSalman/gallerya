// "Who it's for": nine cards that answer the pointer.
//
// With a mouse or a pen, a card tilts towards the pointer, by at most 6 degrees, and a soft
// light follows the pointer across it. The styles do the rest: the edge lights up and turns
// while the card is hovered, and the card settles back flat on a spring when the pointer leaves.
//
// On a touch screen there is no hover, so the light runs round each card's edge once, the
// first time the card is mostly on screen. The card a link landed on (/#travel, from the
// travelers ad) gets the same single sweep once the page has scrolled to it.
//
// Nothing tilts or sweeps for anyone who has asked for less motion; the styles still light the
// edge on hover for them, standing still.
(function () {
  var cards = Array.prototype.slice.call(document.querySelectorAll(".persona"));
  if (!cards.length) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var touchOnly = window.matchMedia("(hover: none)");
  var MAX_TILT = 6;

  function sweep(card) {
    if (reduceMotion.matches) return;
    card.removeAttribute("data-sweep");
    // Read layout so removing and adding the attribute counts as a fresh start.
    void card.offsetWidth;
    card.setAttribute("data-sweep", "");
  }
  // Cleared when it ends, or leaving a hover would hand the edge back to the sweep and replay it.
  cards.forEach(function (card) {
    card.addEventListener("animationend", function (event) {
      if (event.animationName === "persona-sweep") card.removeAttribute("data-sweep");
    });
  });

  // The tilt. The card's box is measured as the pointer arrives, while the card is still flat:
  // measured while tilted, the box would shift under the pointer and the card would chase it.
  cards.forEach(function (card) {
    var box = null, scrollAtEnter = 0, x = 0.5, y = 0.5, frame = 0;

    function paint() {
      frame = 0;
      card.style.setProperty("--ry", ((0.5 - x) * 2 * MAX_TILT).toFixed(2) + "deg");
      card.style.setProperty("--rx", ((y - 0.5) * 2 * MAX_TILT).toFixed(2) + "deg");
      card.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
      card.style.setProperty("--my", (y * 100).toFixed(1) + "%");
    }
    function settle() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      box = null;
      ["--rx", "--ry", "--mx", "--my"].forEach(function (name) { card.style.removeProperty(name); });
    }

    card.addEventListener("pointerenter", function (event) {
      if (event.pointerType === "touch" || reduceMotion.matches) return;
      box = card.getBoundingClientRect();
      scrollAtEnter = window.scrollY;
    });
    card.addEventListener("pointermove", function (event) {
      if (!box || event.pointerType === "touch") return;
      var top = box.top - (window.scrollY - scrollAtEnter);
      x = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
      y = Math.min(1, Math.max(0, (event.clientY - top) / box.height));
      if (!frame) frame = requestAnimationFrame(paint);
    });
    card.addEventListener("pointerleave", settle);
    window.addEventListener("resize", settle);
  });

  // On a touch screen: one sweep per card, the first time it is mostly in view.
  if (touchOnly.matches && "IntersectionObserver" in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        seen.unobserve(entry.target);
        sweep(entry.target);
      });
    }, { threshold: 0.6 });
    cards.forEach(function (card) { seen.observe(card); });
  }

  // The card a link landed on, once the page has had a moment to scroll to it.
  function landed() {
    var card = cards.filter(function (c) { return "#" + c.id === location.hash; })[0];
    if (card) setTimeout(function () { sweep(card); }, 450);
  }
  landed();
  window.addEventListener("hashchange", landed);
})();
