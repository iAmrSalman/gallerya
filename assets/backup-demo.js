/* A backup, played out on the page.
 *
 * Not a screen recording: the panel below is the same structure the app draws while copying —
 * label and rate, the count over the total, the bar, a filename that changes slowly enough to
 * read, the status line, the stop button — and this drives it through three minutes of a plausible
 * run. A recording would be a video file, would blur when scaled, and would go stale the moment
 * the design moved; this stays sharp and lives in the same stylesheet as everything else.
 *
 * The numbers are chosen to match the app's own behaviour: the counter and the bar update freely
 * because they read fine at any rate, while the filename is throttled the way
 * BackupProgressPanel throttles it.
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
    done: root.querySelector("[data-done]"),
    running: root.querySelector("[data-running]"),
    doneCount: root.querySelector("[data-done-count]"),
  };

  const TOTAL = 2150;          // items in the run
  const RUN_MS = 180000;       // three minutes, then it settles and starts again
  const SETTLE_MS = 6000;      // how long the finished state stays up
  const NAME_INTERVAL = 700;   // the app's own throttle for the filename line

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nf = new Intl.NumberFormat();

  function filename(index) {
    // Believable camera names, in the order a library hands them over.
    return "IMG_" + String(4000 + (index % TOTAL)).padStart(4, "0") + ".HEIC";
  }

  function remaining(msLeft) {
    const s = Math.round(msLeft / 1000);
    if (s >= 120) return "about " + Math.round(s / 60) + " minutes left";
    if (s >= 60) return "about a minute left";
    if (s > 5) return "about " + (Math.ceil(s / 5) * 5) + " seconds left";
    return "finishing up…";
  }

  function settled() {
    el.running.hidden = true;
    el.done.hidden = false;
    el.doneCount.textContent = nf.format(TOTAL);
  }

  if (reduced) {
    // Nobody who asked for less motion wants a counter ticking for three minutes.
    settled();
    return;
  }

  let start = null;
  let lastNameAt = -Infinity;
  let shownName = filename(0);

  function frame(now) {
    if (start === null) start = now;
    const elapsed = now - start;

    if (elapsed > RUN_MS + SETTLE_MS) {
      // Loop: back to the beginning of the run.
      start = now;
      el.running.hidden = false;
      el.done.hidden = true;
      requestAnimationFrame(frame);
      return;
    }

    if (elapsed > RUN_MS) {
      settled();
      requestAnimationFrame(frame);
      return;
    }

    // Slightly eased rather than linear: a real copy starts a touch slow while the drive spins
    // up its write cache, and the last stretch is the big videos.
    const t = elapsed / RUN_MS;
    const eased = t < 0.08 ? t * 0.7 : Math.min(1, 0.056 + (t - 0.08) * 1.026);
    const done = Math.min(TOTAL, Math.floor(eased * TOTAL));

    el.count.textContent = nf.format(done);
    el.bar.style.width = (eased * 100).toFixed(2) + "%";

    // A rate that wanders the way a real one does, without ever looking implausible.
    const wobble = 1 + 0.18 * Math.sin(elapsed / 2600) + 0.06 * Math.sin(elapsed / 640);
    el.rate.textContent = (23.4 * wobble).toFixed(1) + " MB/s";

    if (elapsed - lastNameAt >= NAME_INTERVAL) {
      lastNameAt = elapsed;
      shownName = filename(done);
    }
    el.name.textContent = shownName;
    el.status.textContent = remaining(RUN_MS - elapsed);
    el.clock.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    requestAnimationFrame(frame);
  }

  el.total.textContent = nf.format(TOTAL);
  requestAnimationFrame(frame);
})();
