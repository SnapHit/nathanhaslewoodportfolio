/* arcade.js
   Cabinets load their game only when the visitor asks for it.

   The four demos total roughly 1.9MB, and Drift Fever alone is 1.5MB, so loading them all
   on page view would be slower than the entire rest of the site combined. Each cabinet holds
   its URL in data-src and only becomes a live iframe on press. One cabinet plays at a time:
   starting a new one unloads the last, so a phone is never running two games at once. */
(function () {
  var cabs = Array.prototype.slice.call(document.querySelectorAll('[data-cab]'));
  if (!cabs.length) return;

  var live = null;

  function stop(cab) {
    if (!cab) return;
    var frame = cab.querySelector('[data-cab-frame]');
    if (frame) frame.removeAttribute('src');   // unload: stops audio and frees memory
    cab.classList.remove('is-playing');
    var btn = cab.querySelector('[data-cab-start]');
    if (btn) {
      btn.hidden = false;
      btn.querySelector('.cab-press').textContent = 'Press to play';
    }
  }

  function start(cab) {
    var frame = cab.querySelector('[data-cab-frame]');
    var btn = cab.querySelector('[data-cab-start]');
    if (!frame || !frame.dataset.src) return;

    if (live && live !== cab) stop(live);

    if (btn) btn.querySelector('.cab-press').textContent = 'Loading';
    frame.setAttribute('src', frame.dataset.src);
    frame.addEventListener('load', function once() {
      frame.removeEventListener('load', once);
      cab.classList.add('is-playing');
      if (btn) btn.hidden = true;
      try { frame.focus(); } catch (e) {}
    });
    live = cab;
  }

  cabs.forEach(function (cab) {
    var btn = cab.querySelector('[data-cab-start]');
    if (btn) btn.addEventListener('click', function () { start(cab); });
  });

  /* Stop the running game when it scrolls away, so nothing keeps playing off screen. */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting && e.target.classList.contains('is-playing')) {
          stop(e.target);
          if (live === e.target) live = null;
        }
      });
    }, { threshold: 0.15 });
    cabs.forEach(function (c) { io.observe(c); });
  }
})();
