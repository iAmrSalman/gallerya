/* A backup, played out on the page.
 *
 * Not a screen recording: the panel below is the same structure the app draws while copying —
 * label and rate, the count over the total, the bar, a filename that changes slowly enough to
 * read, the status line, the stop button — and this drives it through a minute of a plausible
 * run. A recording would be a video file, would blur when scaled, and would go stale the moment
 * the design moved; this stays sharp and lives in the same stylesheet as everything else.
 *
 * The numbers have to agree with each other, or the whole thing reads as a mock-up: 2,150 items
 * in a minute is about 36 a second, which at roughly 2.6 MB an item is the ~95 MB/s a decent
 * USB-C SSD actually writes. The counter and the bar update freely because they read fine at any
 * rate; the filename is throttled, the way BackupProgressPanel throttles it.
 *
 * The run only advances while it is on screen. Scroll away mid-copy and come back, and it carries
 * on from the count you left rather than having skipped ahead, or restarted, while you were not
 * looking — the same reason the app never lets a panel jump to a value it did not pass through.
 */
(function () {
  const root = document.querySelector("[data-backup-demo]");
  if (!root) return;

  const el = {
    rate: root.querySelector("[data-rate]"),
    count: root.querySelector("[data-count]"),
    total: root.querySelector("[data-total]"),
    bar: root.querySelector("[data-bar]"),
    name: root.querySelector("[data-name]"),
    status: root.querySelector("[data-status]"),
    clock: root.querySelector("[data-clock]"),
    doneCount: root.querySelector("[data-done-count]"),
  };

  const TOTAL = 2150;          // items in the run
  const RUN_MS = 60000;        // a minute, then it settles and starts again
  const SETTLE_MS = 5000;      // how long the finished state stays up
  const NAME_INTERVAL = 520;   // a shade under the app's 0.7s: the run is quicker here

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nf = new Intl.NumberFormat();

  function filename(index) {
    // Believable camera names, in the order a library hands them over.
    return "IMG_" + String(4000 + (index % TOTAL)).padStart(4, "0") + ".HEIC";
  }

  function remaining(msLeft) {
    const s = Math.round(msLeft / 1000);
    if (s >= 120) return "about " + Math.round(s / 60) + " minutes left";
    if (s >= 55) return "about a minute left";
    if (s > 5) return "about " + (Math.ceil(s / 5) * 5) + " seconds left";
    return "finishing up…";
  }

  // The two panels hand over in CSS (see .device .panes): this only says which one is showing.
  function show(state) {
    if (root.dataset.state !== state) root.dataset.state = state;
  }

  function setProgress(fraction) {
    el.bar.style.transform = "translateX(" + (fraction * 100 - 100).toFixed(2) + "%)";
  }

  function settled() {
    if (root.dataset.state === "done") return;
    // The running panel is still visible while it scales away, so it finishes on the full count
    // rather than on whatever the last frame before the minute happened to reach.
    el.count.textContent = nf.format(TOTAL);
    setProgress(1);
    el.doneCount.textContent = nf.format(TOTAL);
    show("done");
  }

  if (reduced) {
    // Nobody who asked for less motion wants a counter ticking at them at all.
    settled();
    return;
  }

  let elapsed = 0;
  let last = null;
  let lastNameAt = -Infinity;
  let shownName = filename(0);
  let shownClock = "";
  let request = 0;

  function frame(now) {
    // Time is added up frame by frame instead of read off a start timestamp, so a pause costs
    // nothing: a gap longer than a few frames is a pause, not progress.
    if (last !== null) elapsed += Math.min(now - last, 100);
    last = now;
    request = requestAnimationFrame(frame);

    const clock = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (clock !== shownClock) el.clock.textContent = shownClock = clock;

    if (elapsed > RUN_MS + SETTLE_MS) {
      // Loop: back to the beginning of the run. The running panel is out of sight while its
      // numbers go back to zero, and it scales in already reading 0.
      elapsed = 0;
      lastNameAt = -Infinity;
      el.count.textContent = nf.format(0);
      setProgress(0);
      show("running");
      return;
    }

    if (elapsed > RUN_MS) {
      settled();
      return;
    }

    // Slightly eased rather than linear: a real copy starts a touch slow while the drive spins
    // up its write cache, and the last stretch is the big videos.
    const t = elapsed / RUN_MS;
    const eased = t < 0.08 ? t * 0.7 : Math.min(1, 0.056 + (t - 0.08) * 1.0261);
    const done = Math.min(TOTAL, Math.floor(eased * TOTAL));

    el.count.textContent = nf.format(done);
    setProgress(eased);

    // A rate that wanders the way a real one does, without ever looking implausible.
    const wobble = 1 + 0.18 * Math.sin(elapsed / 2600) + 0.06 * Math.sin(elapsed / 640);
    el.rate.textContent = (94.6 * wobble).toFixed(1) + " MB/s";

    if (elapsed - lastNameAt >= NAME_INTERVAL) {
      lastNameAt = elapsed;
      shownName = filename(done);
    }
    el.name.textContent = shownName;
    el.status.textContent = remaining(RUN_MS - elapsed);
  }

  function play() {
    if (request) return;
    last = null;
    delete root.dataset.paused;
    request = requestAnimationFrame(frame);
  }

  function pause() {
    cancelAnimationFrame(request);
    request = 0;
    root.dataset.paused = "";
  }

  el.total.textContent = nf.format(TOTAL);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? play() : pause())).observe(root);
  } else {
    play();
  }
})();
