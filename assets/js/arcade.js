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
   cook a phone, and Drift Fever alone is 1.5MB.

   From v1.33 this file drives /puzzles/ as well, which frames three light web
   apps rather than three canvas games. That page marks each frame data-sh-auto,
   which changes three things and nothing else: the frame loads on arrival rather
   than on a tap, loading one does not park the others, and a frame that scrolled
   away comes back by itself instead of waiting for a second tap. Everything about
   the unloading is shared, because unloading twice in two files is how the two
   copies drift apart. The cabinet parts are optional now: a page with no
   .sh-attract and no .sh-grow gets neither, which is what lets /puzzles/ leave out
   the expand state. */
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
    if (!card) return;                 /* autoloaded frames have no card to hold up */
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

    /* One game at a time, on the cabinets. The studio site leans on its cabinets
       being a screen apart, but that page is denser, so anything else still running
       is parked first: a phone is never left running two games at once.
       Autoloaded frames are exempt, and the reason is what they are. A canvas game
       runs a loop forever; a daily puzzle is a light document sitting still once it
       has rendered. Three of those coexist, and parking a sibling on load would
       unload the very frames this mode exists to bring up. */
    if (!rec.auto) {
      for (var i = 0; i < frames.length; i++) if (frames[i] !== rec) park(frames[i]);
    }

    var f = document.createElement('iframe');
    f.src = rec.src;
    f.title = rec.name;
    /* The cabinets suppress scrolling, which is right for a game canvas and wrong for a
       document: Forgery is long and most of the puzzle was unreachable inside the phone. A frame
       marked data-sh-scroll keeps its own scrollbar. /games/ marks none, so nothing there
       changes. A child that fits does not scroll, so the attribute costs nothing where it is not
       needed, which is why all three puzzles carry it rather than only the one measured to
       overflow: these are documents nobody here can measure, and a truncated puzzle is worse
       than a scroll surface that never scrolls. */
    if (!rec.scroll) f.setAttribute('scrolling', 'no');
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
      auto: cab.hasAttribute('data-sh-auto'),
      scroll: cab.hasAttribute('data-sh-scroll'),
      screen: cab.querySelector('.sh-screen'),
      phone: cab.querySelector('.sh-phone'),
      cab: cab,
      el: null
    };
    frames.push(rec);

    /* Both are optional from v1.33. /puzzles/ ships neither: it has nothing to tap
       because its frames load themselves, and it leaves out the expand state
       deliberately rather than carrying .sh-big's containing block risk. */
    var card = cab.querySelector('.sh-attract');
    if (card) card.addEventListener('click', function () { start(rec, card); });

    var grow = cab.querySelector('.sh-grow');
    if (grow) grow.addEventListener('click', function () { zoom(rec); });
  });

  /* ---------------- unloading whatever scrolled away ---------------- */
  /* One observer for every cabinet, and nothing is ever unobserved. A frame that
     was unloaded and then revived is therefore still watched, which is the whole
     point: observing per frame and unobserving on the way out means a cabinet
     played a second time runs off screen forever. The callback reads current
     state rather than trusting the record, because a record only ever says what
     changed, not what is true now. */
  /* Two margins, because the two kinds of frame lose different things. A cabinet is a canvas
     loop: parking it early costs a reload nobody had invested in, and the attract card says so
     when it comes back. A daily puzzle is a document somebody may have typed a guess into, and a
     revive is a fresh load rather than a resume, so parking it costs that guess with nothing on
     screen to say it happened. At 390px the phones are 689px tall and their tops 941px apart, so
     252px of page separates one from the next and at 120px the act of looking at either always
     destroyed the other. 900px keeps the immediate neighbour alive and still parks anything a
     full screen away.
     Those two numbers were 548 and 800 until v1.34.1, which is the squat geometry v1.34.0
     removed: the comment justifying a live constant was still quoting the bug. Re-measured. */
  var MARGIN = 120;
  var AUTO_MARGIN = 900;
  var io = ('IntersectionObserver' in window)
    ? new IntersectionObserver(function () { sweep(); }, { rootMargin: AUTO_MARGIN + 'px' })
    : null;

  function watch(el) { if (io) io.observe(el); }

  /* An autoloaded frame is observed through its own screen, which exists from the
     first parse, rather than through an iframe that does not exist yet. That is what
     lets one rule cover both the first load and every revive after it, instead of an
     eager pass that has to guess.
     Guessing was tried and was wrong twice. Starting all three inside the loop above
     ran while var io was hoisted but still undefined, so watch() observed nothing and
     no frame could ever unload again: measured, all three sat at -2475px and stayed
     loaded. Starting all three here instead loaded and then immediately parked every
     one of them, because at 390px no phone is within 120px of the viewport on arrival:
     three requests opened and cancelled to show nothing. The observer already knows
     which is true, so it is asked rather than second guessed. */
  for (var a = 0; a < frames.length; a++) if (frames[a].auto) watch(frames[a].screen);

  /* The observer is only a nudge. A record says what changed at the moment it was
     queued, which is not what is true by the time it is delivered: a cabinet that
     scrolled away while another was full screen arrives here after the collapse
     has already brought it back on screen. So the record is thrown away unread
     and every frame is judged on its current rectangle. */
  function offScreen(el, m) {
    if (m == null) m = MARGIN;
    var r = el.getBoundingClientRect();
    return r.bottom < -m || r.top > innerHeight + m ||
           r.right < -m || r.left > innerWidth + m;
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
          /* An autoloaded record is judged on its screen before it has a frame, and on
             its frame once it has one. A cabinet is judged only once it has a frame,
             because until somebody taps it there is nothing to unload. */
          var box = rec.el || (rec.auto ? rec.screen : null);
          if (!box) continue;
          if (offScreen(box, rec.auto ? AUTO_MARGIN : MARGIN)) { if (rec.el) park(rec); continue; }
          if (!rec.auto) continue;
          /* On screen, and autoloaded. Only these revive by themselves: a cabinet that
             scrolled away put a card back and is waiting to be asked again, which is the
             whole of its attract loop. A puzzle has no card and nothing to ask, so
             arriving at it has to be enough. Both branches are guarded on there being no
             src, so a frame that is merely on screen is never reloaded and never loses
             its state to a scroll, and from v1.33.2 a neighbouring puzzle counts as on screen
             so that looking at one does not throw away the one before it. */
          if (!rec.el) { start(rec, null); continue; }
          if (!rec.el.getAttribute('src')) {
            rec.el.src = rec.src;
            rec.phone.classList.add('sh-live');
          }
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
    if (rec.auto) { rec.phone.classList.remove('sh-live'); return; }
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
  /* Everything that is not the game is set aside while the game is full screen, and inert is
     the right tool because it takes an element out of the tab order AND out of the
     accessibility tree without moving it or restyling it.

     Not inert on .shell, which is the obvious move and the wrong one: the zoomed phone is
     position:fixed INSIDE the shell, so inerting the shell inerts the game. inert has no
     exemption and no way back down the tree. So the list is built from the parts that are
     definitely not the game: the header, the footer, every direct child of main except the one
     the zoomed cabinet sits in, and every other cabinet inside that one.

     This is the other half of moving the two controls ahead of .shell in the markup. The move
     puts the way out early in the tab order; this stops everything else being in it at all.
     Measured before: twenty tab stops from the top of a full screen game reached the brand,
     the hero frame, all three cabinets' controls, the studio card and six footer links, every
     one of them behind an opaque game. */
  var setAside = [];
  /* Walked from body rather than listed, because a list is a guess about the markup and this
     has to be true of the page as it is. At each level: anything that CONTAINS the zoomed phone
     is descended into, anything that does not is set aside, and the two full screen controls are
     exempt because they are the way out. What survives is the game, the close button and the
     bail link, and nothing else.
     A hand written list was tried first and left four stops behind: the zoomed cabinet's own
     marquee, attract button and visit link, which are siblings of the phone rather than
     ancestors of it, and the studio card, which shares a section with the rack. */
  function standDown(node, keep, exempt) {
    Array.prototype.forEach.call(node.children, function (n) {
      if (n === keep || exempt.indexOf(n) !== -1) return;
      if (n.contains(keep)) { standDown(n, keep, exempt); return; }
      if (n.tagName === 'SCRIPT' || n.tagName === 'STYLE' || n.tagName === 'LINK') return;
      if (n.inert) return;
      n.inert = true;
      setAside.push(n);
    });
  }
  function standUp() {
    setAside.forEach(function (n) { n.inert = false; });
    setAside = [];
  }

  function zoom(rec) {
    if (!shrinkBtn || !bailBtn) return;
    zoomed = rec.phone;
    rec.phone.classList.add('sh-big');
    document.body.classList.add('sh-zoomed');
    standDown(document.body, rec.phone, [shrinkBtn, bailBtn]);
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
    /* Before the focus move below, not after: focusing inside a subtree that is still inert
       does nothing, and the caller would be left with focus on the body. */
    standUp();
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
