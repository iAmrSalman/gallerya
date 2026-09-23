/* The background follows the page.
 *
 * Every section that is about one of the app's screens says so with data-tint — azure for Backup,
 * violet for the Archive, jade for Cleanup — and the light takes on the tint of whatever is passing
 * through the middle of the window. Each tint's weight is how much of a band across the middle its
 * sections cover, so crossing from one section into the next cross-fades over the height of that
 * band, in step with the scroll. Nothing runs on a timer, so there is nothing to interrupt:
 * stopping halfway leaves it halfway, and scrolling back runs it backwards.
 *
 * The weights always sum to one, and the layers are composited with plus-lighter, which is what
 * keeps the brightness constant through a handover (see .aurora in aurora.css).
 */
(function () {
  const sections = Array.from(document.querySelectorAll("[data-tint]"));
  if (!sections.length) return;

  const layers = {};
  for (const tint of ["azure", "jade", "violet"]) {
    layers[tint] = document.querySelector(".aurora ." + tint);
  }

  // A third of the window, centred: about 250px of scrolling on a phone to hand one tint to the
  // next — long enough to read as the light changing, short enough to finish before the heading.
  const BAND = 0.3;

  let queued = false;
  let shown = "";

  function update() {
    queued = false;
    const top = innerHeight * (0.5 - BAND / 2);
    const bottom = innerHeight * (0.5 + BAND / 2);
    const weight = { azure: 0, jade: 0, violet: 0 };
    let total = 0;

    for (const section of sections) {
      const box = section.getBoundingClientRect();
      const overlap = Math.min(box.bottom, bottom) - Math.max(box.top, top);
      if (overlap > 0 && section.dataset.tint in weight) {
        weight[section.dataset.tint] += overlap;
        total += overlap;
      }
    }
    // Only the footer in the band: keep the tint of the last thing read.
    if (!total) return;

    const next = ["azure", "jade", "violet"].map((tint) => (weight[tint] / total).toFixed(3));
    if (next.join() === shown) return;
    shown = next.join();
    layers.azure.style.opacity = next[0];
    layers.jade.style.opacity = next[1];
    layers.violet.style.opacity = next[2];
  }

  // One reading per frame however many scroll events arrive in it. Only opacity is written, so
  // reading the boxes never forces a layout the frame was not already going to do.
  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }

  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue);
  update();
})();
