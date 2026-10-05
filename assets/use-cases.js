// "Who it's for": one card at a time, moving on by itself.
//
// Each card stays up for as long as it takes to read (0.3 s a word, never under 6 s), then the
// row moves to the next one and loops back after the last. It holds still while a mouse is over
// it, while it has keyboard focus, while less than half of it is on screen, and while the tab is
// hidden. The pause button stops it for good; it is the control WCAG 2.2.2 asks for on anything
// that moves by itself for more than five seconds.
//
// It starts paused for anyone who has asked for less motion, and for anyone who arrived on a
// particular card (an ad landing on /#travel came for that card, so it should not slide away).
// Swiping, a trackpad, the arrow keys, the arrows and the dots all still work either way.
(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.querySelectorAll("[data-carousel]").forEach(function (root) {
    var track = root.querySelector(".carousel");
    var nav = root.querySelector(".carousel-nav");
    var dotsBox = root.querySelector(".carousel-dots");
    var prev = root.querySelector("[data-carousel-prev]");
    var next = root.querySelector("[data-carousel-next]");
    var play = root.querySelector("[data-carousel-play]");
    if (!track || !nav || !dotsBox || !prev || !next || !play) return;

    var cards = Array.prototype.slice.call(track.querySelectorAll(".panel"));
    var count = cards.length;
    if (!count) return;

    var landedOnCard = cards.some(function (card) { return "#" + card.id === location.hash; });
    var paused = reduceMotion.matches || landedOnCard;
    var held = { hover: false, focus: false, offscreen: false, hidden: document.hidden };
    var timer = 0;

    // One card's width plus the gap after it, measured each time so it follows resizes.
    function step() {
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return cards[0].getBoundingClientRect().width + gap;
    }
    function current() {
      return Math.min(count - 1, Math.max(0, Math.round(track.scrollLeft / step())));
    }
    function goTo(index) {
      var target = (index + count) % count;
      track.scrollTo({ left: target * step(), behavior: reduceMotion.matches ? "auto" : "smooth" });
    }

    // How long a card stays up: long enough to read it.
    function dwell(index) {
      var words = cards[index].textContent.trim().split(/\s+/).length;
      return Math.max(6000, words * 300);
    }
    function isHeld() {
      return paused || held.hover || held.focus || held.offscreen || held.hidden;
    }
    function schedule() {
      clearTimeout(timer);
      if (isHeld()) return;
      timer = setTimeout(function () { goTo(current() + 1); }, dwell(current()));
    }

    // The dots: one per card, the current one drawn long.
    var dots = cards.map(function (card, index) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-controls", track.id);
      dot.setAttribute("aria-label", "Card " + (index + 1) + " of " + count + ": " + card.querySelector("h3").textContent);
      dot.addEventListener("click", function () { goTo(index); });
      dotsBox.appendChild(dot);
      return dot;
    });
    function markCurrent() {
      var index = current();
      dots.forEach(function (dot, i) { dot.setAttribute("aria-current", i === index ? "true" : "false"); });
    }

    function setPaused(value) {
      paused = value;
      play.toggleAttribute("data-paused", paused);
      play.setAttribute("aria-label", paused ? "Play" : "Pause");
      schedule();
    }

    prev.addEventListener("click", function () { goTo(current() - 1); });
    next.addEventListener("click", function () { goTo(current() + 1); });
    play.addEventListener("click", function () { setPaused(!paused); });

    // Whatever moved the row, the user or the timer, the clock restarts once it settles on a card.
    var settle = 0;
    track.addEventListener("scroll", function () {
      markCurrent();
      clearTimeout(timer);
      clearTimeout(settle);
      settle = setTimeout(schedule, 200);
    }, { passive: true });

    root.addEventListener("mouseenter", function () { held.hover = true; schedule(); });
    root.addEventListener("mouseleave", function () { held.hover = false; schedule(); });
    // Keyboard focus holds it; a mouse click on a button does not, or pressing Play would leave
    // it held by the focus the click just gave the button.
    root.addEventListener("focusin", function (event) {
      held.focus = event.target.matches(":focus-visible");
      schedule();
    });
    root.addEventListener("focusout", function (event) {
      if (!root.contains(event.relatedTarget)) { held.focus = false; schedule(); }
    });
    document.addEventListener("visibilitychange", function () { held.hidden = document.hidden; schedule(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        held.offscreen = !entries[0].isIntersecting;
        schedule();
      }, { threshold: 0.5 }).observe(track);
    }
    window.addEventListener("resize", function () { goTo(current()); });

    nav.hidden = false;
    dotsBox.hidden = false;
    markCurrent();
    setPaused(paused);
  });
})();
