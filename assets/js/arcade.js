/* arcade.js
   The SnapHit cabinets, ported from snap-hit.online so the studio site and this
   page show the same machine. Every class carries the sh- prefix because this
   stylesheet already had its own .cab and .rack and uses .bar, .screen, .deck
   and .panel elsewhere.

   One difference from the studio site, on purpose: the cabinets are in the HTML
   rather than built here. snap-hit.online generates them from a GAMES array, so
   with JavaScript off its rack is empty. This site promises on /colophon/ that
   turning JavaScript off loses the interactive demonstrations and not one word
   of content, so the markup ships whole and this file only adds behaviour. With
   no JavaScript you get the cabinet, the lit marquee and both links out to the
   real game; what you lose is the demo playing in the screen.

   Nothing loads until it is asked for. Three live canvases on one page would
   cook a phone, and Drift Fever alone is 1.5MB. */
(function () {
  "use strict";

  var cabs = Array.prototype.slice.call(document.querySelectorAll('[data-sh-cab]'));
  if (!cabs.length) return;

  var shrinkBtn = document.getElementById('sh-shrink');
  var bailBtn = document.getElementById('sh-bail');
  var frames = [];
  var zoomed = null;

  /* Hold a cabinet's card up until its frame has actually loaded, so a heavy game
     is the card you just tapped rather than a black rectangle. The card sits over
     the frame, and the "is there an iframe already" guard makes a second tap a
     no-op while it is up. The timer is the last resort: if load never arrives the
     card goes anyway, rather than leaving someone tapping a card that cannot
     answer. Both the first tap and the tap that revives an unloaded cabinet come
     through here, because both of them are a wait. */
  function holdUntilLoaded(f, card) {
    var timer = setTimeout(drop, 20000);
    function drop() { clearTimeout(timer); if (card.parentNode) card.remove(); }
    f.addEventListener('load', drop, { once: true });
  }

  function attractCard(name) {
    var b = document.createElement('button');
    b.className = 'sh-attract';
    b.type = 'button';
    b.setAttribute('aria-label', 'Play ' + name);
    b.innerHTML =
      '<span class="sh-title">' + name + '</span>' +
      '<span class="sh-play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3 L21 12 L6 21 Z"/></svg></span>' +
      '<span class="sh-hint">TAP TO PLAY</span>';
    return b;
  }

  function start(rec, card) {
    if (rec.screen.querySelector('iframe')) return;

    /* One game at a time. The studio site leans on its cabinets being a screen
       apart, but this page is denser, so anything else still running is parked
       first: a phone is never left running two games at once. */
    for (var i = 0; i < frames.length; i++) if (frames[i] !== rec) park(frames[i]);

    var f = document.createElement('iframe');
    f.src = rec.src;
    f.title = rec.name;
    f.setAttribute('scrolling', 'no');
    f.setAttribute('allow', 'accelerometer; gyroscope; fullscreen');
    f.setAttribute('referrerpolicy', 'no-referrer');
    rec.screen.appendChild(f);
    rec.el = f;
    holdUntilLoaded(f, card);
    rec.phone.classList.add('sh-live');
    watch(f);
  }

  cabs.forEach(function (cab) {
    var rec = {
      src: cab.dataset.src,
      name: cab.dataset.name,
      out: cab.dataset.out,
      host: cab.dataset.host,
      screen: cab.querySelector('.sh-screen'),
      phone: cab.querySelector('.sh-phone'),
      el: null
    };
    frames.push(rec);

    var card = cab.querySelector('.sh-attract');
    card.addEventListener('click', function () { start(rec, card); });

    cab.querySelector('.sh-grow').addEventListener('click', function () { zoom(rec); });
  });

  /* ---------------- unloading whatever scrolled away ---------------- */
  /* One observer for every cabinet, and nothing is ever unobserved. A frame that
     was unloaded and then revived is therefore still watched, which is the whole
     point: observing per frame and unobserving on the way out means a cabinet
     played a second time runs off screen forever. The callback reads current
     state rather than trusting the record, because a record only ever says what
     changed, not what is true now. */
  var MARGIN = 120;
  var io = ('IntersectionObserver' in window)
    ? new IntersectionObserver(function () { sweep(); }, { rootMargin: MARGIN + 'px' })
    : null;

  function watch(el) { if (io) io.observe(el); }

  /* The observer is only a nudge. A record says what changed at the moment it was
     queued, which is not what is true by the time it is delivered: a cabinet that
     scrolled away while another was full screen arrives here after the collapse
     has already brought it back on screen. So the record is thrown away unread
     and every frame is judged on its current rectangle. */
  function offScreen(el) {
    var r = el.getBoundingClientRect();
    return r.bottom < -MARGIN || r.top > innerHeight + MARGIN ||
           r.right < -MARGIN || r.left > innerWidth + MARGIN;
  }

  /* Deferred to the next frame, and only ever once per frame. Collapsing moves a
     phone back into flow and the page settles over the frames that follow, so a
     sweep run the instant the class comes off reads a rectangle that is already
     out of date and unloads a cabinet the player is looking at. */
  var sweepQueued = false;
  function sweep() {
    if (sweepQueued) return;
    sweepQueued = true;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        sweepQueued = false;
        for (var i = 0; i < frames.length; i++) {
          var rec = frames[i];
          if (rec.el && offScreen(rec.el)) park(rec);
        }
      });
    });
  }

  /* Unload one cabinet and put its card back. Safe to call at any time and as
     often as you like: it does nothing to a frame that is already unloaded, and
     nothing to the one being played full screen. Guarding that single frame is
     what lets every other cabinet still unload while one is expanded. */
  function park(rec) {
    if (!rec.el || !rec.el.getAttribute('src')) return;  // already unloaded
    if (rec.phone === zoomed) return;                    // the run the player is in
    rec.el.removeAttribute('src');                       // stop the loop dead
    var again = attractCard(rec.name);
    again.addEventListener('click', function () {
      rec.el.src = rec.src;
      holdUntilLoaded(rec.el, again);
      rec.phone.classList.add('sh-live');
    });
    rec.phone.classList.remove('sh-live');
    rec.screen.appendChild(again);
  }

  /* ---------------- full screen, without the Fullscreen API ---------------- */
  /* Focus is deliberately left where it is. Pulling it to the close button means a
     desktop player's arrow keys stop reaching the game the moment they go full
     screen, and Hurtle clears its steering state on blur, so a run dies mid
     flight. The keyboard exit is Tab, which carries out of the frame and into the
     parent, and Escape while the parent holds focus. Escape is not bound inside
     the frame on purpose: the games already use it to pause. */
  function zoom(rec) {
    if (!shrinkBtn || !bailBtn) return;
    zoomed = rec.phone;
    rec.phone.classList.add('sh-big');
    document.body.classList.add('sh-zoomed');
    /* Playing full screen is the moment somebody is most likely to want the real
       thing, so the way out lives here too. Opposite corner from the close button,
       and labelled with the destination, because a thumb going for close must not
       leave the site by accident. */
    bailBtn.href = rec.out;
    bailBtn.querySelector('span').textContent = rec.host;
    bailBtn.setAttribute('aria-label', 'Play ' + rec.name + ' on ' + rec.host);
  }

  function unzoom() {
    if (!zoomed) return;
    zoomed.classList.remove('sh-big');
    document.body.classList.remove('sh-zoomed');
    var g = zoomed.querySelector('.sh-grow');
    zoomed = null;
    if (g) g.focus();
    /* The cabinet may be out of view now that the phone is back in flow. Harmless
       either way: sweep judges by the rectangle, and does nothing to a frame that
       is on screen. */
    sweep();
  }

  if (shrinkBtn) shrinkBtn.addEventListener('click', unzoom);
  addEventListener('keydown', function (e) { if (e.key === 'Escape') unzoom(); });
})();
