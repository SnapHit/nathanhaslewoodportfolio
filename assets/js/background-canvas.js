/* background-canvas.js
   The WebGL particle field. It reads --lens, the same value the control writes and the page
   reads, so its colour, its density, its links and how far the cloud spreads are all
   one event rather than three that happen to coincide.

   Motion is composed of three independent layers, which is what lets the formation change be
   snappy while the pointer stays highly responsive. Driving both through a single position
   lerp forces a trade-off between them.
     base   . lerps toward the state's formation
     drift  . continuous per particle wander, so the field never settles into a still image
     repel  . a springing displacement pushing particles away from the pointer

   Mounts two layers at body level: the field and the veil above it. Neither ground is built
   here, because both have to exist in the cases this file returns early on: the page's own
   near black is painted by html.home in the stylesheet, and the cold one the machine states
   cross to is .lens-ground, built by lens.js, which runs on every one of those paths. Those
   cases are:
     . three.js unavailable (CDN blocked or failed)
     . WebGL unavailable
     . prefers-reduced-motion: reduce
   In all three the hero falls back to the poster image at /assets/img/gen-hero.jpg, which is
   what the webgl-on class on .hero-media turns off when the field is live.
   Public API: window.setReaderMode('person' | 'google' | 'ai'), used internally to snap the
   formation at the thresholds. */
(function () {
  var hero = document.querySelector('.home .hero');
  var main = document.getElementById('main');
  if (!hero || !main) return;
  if (typeof THREE === 'undefined') return;

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motionQuery.matches) return;

  /* 1. Canvas, sized to the hero rather than the viewport */
  var canvas = document.createElement('canvas');
  canvas.id = 'webgl-bg';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    display: 'block',
    pointerEvents: 'none'
  });

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  } catch (e) {
    return;
  }
  /* Built here, in JS, so that with JavaScript off neither the field nor the veil exists and
     the page is exactly what it was. A direct child of <body>: no ancestor carries a filter,
     so position:fixed resolves against the viewport and the field cannot be turned into an
     absolute box that scrolls away. */
  var host = document.createElement('div');
  host.className = 'lens-field';
  host.setAttribute('aria-hidden', 'true');
  /* The veil. A CHILD of the field, after the canvas, so it paints over the particles and
     is exactly the field's own extent, which is the viewport, and always was. It was a
     body level sibling for one version, carrying its own copy of the spill geometry, and the
     two copies disagreed badly enough to black out the page. The shape it carries is the shape
     of the text, which scrolls, so the mask is sized to the document and offset by the scroll
     position instead. */
  var veil = document.createElement('div');
  veil.className = 'lens-veil';
  veil.setAttribute('aria-hidden', 'true');
  document.body.appendChild(host);
  host.appendChild(canvas);
  host.appendChild(veil);
  /* The hero still needs to know the field is live. This class does two things that were
     lost when the canvas moved out of .hero-media: it drops the photograph, which was only
     ever the no-WebGL fallback and competes with the field when both are drawn, and it swaps
     the weak fallback overlay for the strong one. Without it the page ran the photo, the weak
     overlay and the field all at once, which is how amber particles ended up reading straight
     through the hero copy. */
  var heroMedia = document.querySelector('.hero-media');
  if (heroMedia) heroMedia.classList.add('webgl-on');
  /* Sized to the viewport, always, and since v1.23.0 seen at that size in every state. */
  function hostSize() {
    return { w: Math.max(1, window.innerWidth), h: Math.max(1, window.innerHeight) };
  }

  /* The mask travels with the document while the element it is on is fixed to the viewport,
     which is what keeps the dark bands over the text rather than sliding across it. This used
     to also write the hero's live edges for the field's clip, which is gone in v1.23.0: with
     the page dark at every value the field has nowhere it needs to hide, so it covers the
     viewport in every state and there is nothing left to clip. One property write, and it
     still reads no layout. */
  function syncVeil() {
    veil.style.webkitMaskPosition = maskPos();
    veil.style.maskPosition = maskPos();
  }
  function maskPos() {
    return '0 ' + -(window.pageYOffset || document.documentElement.scrollTop || 0) + 'px';
  }
  syncVeil();
  addEventListener('scroll', syncVeil, { passive: true });
  addEventListener('resize', syncVeil, { passive: true });

  /* ---- the veil's shape, taken from the text rather than assumed ----
     The veil's horizontal shape is in the stylesheet and always was. This is the vertical one,
     and it is the reason for this version: as a single 90deg gradient the veil's alpha was a
     function of x and nothing else, so at 390px, where the text column is the whole viewport,
     it dimmed the gaps between paragraphs exactly as hard as it dimmed the paragraphs. The
     field was not too dark by accident, it was uniformly turned down.

     A band is the box of the smallest element holding a run of text, unioned with that run's
     own line boxes. Line boxes alone were the first attempt and they are not enough: a heading
     whose box is 54px tall has a 38px line box inside it, so the band began eight pixels below
     the top of the element and the mask was still climbing its ramp where the first row of
     glyphs sat. Measured 2.65:1 on that heading and 2.21:1 on the case study body. Taking the
     element too means the band covers anything the element paints, whatever the leading, the
     padding or the font's own overshoot does. Everything is in document coordinates, which is
     why the veil is positioned in the document.

     Text sitting on an opaque card is measured too. The card is between it and the field so
     nothing there needs protecting, but the gaps that would be won back are the eighteen pixels
     between one card and the next, which is under the merge distance anyway. Including it costs
     nothing visible and removes a heuristic that could be wrong in the dangerous direction. */
  /* Sixteen, not six. The band already covers the element's own box, but the mask's ramp has
     to have finished climbing before the first row of glyph pixels rather than at it: at six
     the case study body measured 3.53:1 against a solid white field, at fourteen it measured
     5.36:1, which is the same reading the flat scrim gives, and at twenty four it does not
     improve further. Sixteen is fourteen with a margin. */
  /* Eight is for antialiasing and subpixel rounding, nothing more. It used to have to be
     sixteen, to absorb a mask that had gone stale against a page reflowing under it. Rebuilding
     when the page changes is the honest fix for that, and it hands the padding back to the
     gaps: at 390px the gaps between blocks run about 28px, so every pixel spent on a safety
     margin is a pixel of field nobody sees. */
  var MASK_PAD = 8;         /* solid this far past the band, for antialiasing and rounding */
  var MASK_FEATHER = 40;    /* the most one edge may soften over */
  /* A gap this small is not worth opening, so the bands join. Ten was too generous once the
     lens's own annotation blocks were measured: in the AI state the head material card drops
     its background entirely, by design, so those blocks sit straight on the field, and two of
     them in a row leave about 30px between their text runs, 14px of it once the pad is taken
     off. That opened, and the block's left rule landed in it at 1.45:1 against a solid white
     field. Twenty closes every gap that is only the padding and margin between two parts of
     one card, and leaves the gaps that are actually empty page. Measured at ten against twenty
     over six frames, the field's lit area moves by about half a percentage point and not
     consistently in one direction: the person state reads 6.51 against 5.82 per cent at 390px
     and 6.87 against 7.26 at 1280px. That is the frame to frame variation of a field that is
     still drifting, so the cost is not distinguishable from noise. */
  var MASK_MERGE = 20;
  var maskRaf = 0, lastMask = '', lastSize = '';

  function px(v) { return Math.round(v) + 'px'; }

  function textBands(height) {
    var out = [], sy = window.pageYOffset || document.documentElement.scrollTop || 0;
    var wk = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, null, false);
    var range = document.createRange(), n, i, rects, q, a, b;
    while ((n = wk.nextNode())) {
      if (!/\S/.test(n.nodeValue)) continue;
      range.selectNodeContents(n);
      rects = range.getClientRects();
      a = Infinity; b = -Infinity;
      for (i = 0; i < rects.length; i++) {
        q = rects[i];
        if (q.width < 1 || q.height < 1) continue;
        if (q.top < a) a = q.top;
        if (q.bottom > b) b = q.bottom;
      }
      q = n.parentElement && n.parentElement.getBoundingClientRect();
      if (q && q.height > 0) {
        if (q.top < a) a = q.top;
        if (q.bottom > b) b = q.bottom;
      }
      if (a === Infinity) continue;
      a = a + sy - MASK_PAD;
      b = b + sy + MASK_PAD;
      /* Clipped to the document here, before anything is merged. Clamping later produced
         stops that ran backwards, which a gradient reads as garbage. */
      if (b <= 0 || a >= height) continue;
      out.push([Math.max(0, a), Math.min(height, b)]);
    }
    out.sort(function (x, y) { return x[0] - y[0]; });
    var merged = [];
    for (i = 0; i < out.length; i++) {
      var last = merged[merged.length - 1];
      if (last && out[i][0] <= last[1] + MASK_MERGE) {
        if (out[i][1] > last[1]) last[1] = out[i][1];
      } else merged.push([out[i][0], out[i][1]]);
    }
    return merged;
  }

  /* The feather is a share of the gap it has to fit inside, capped. A fixed forty pixels
     either side of every band closes any gap under eighty and the mask goes back to being a
     flat dimmer, which is the bug this exists to fix. This way a small gap still opens in the
     middle and a generous one opens completely. Stops are emitted in order and never allowed
     to run backwards. */
  function maskFrom(bands, height) {
    if (!bands.length) return '';
    var stops = [], i, at = -1;
    function put(colour, v) {
      v = Math.max(0, Math.min(height, v));
      if (v < at) v = at;
      at = v;
      stops.push(colour + ' ' + px(v));
    }
    for (i = 0; i < bands.length; i++) {
      var a = bands[i][0], b = bands[i][1];
      var before = i ? a - bands[i - 1][1] : a * 2;
      var after = i < bands.length - 1 ? bands[i + 1][0] - b : (height - b) * 2;
      put('transparent', a - Math.min(MASK_FEATHER, before * 0.35));
      put('#000', a);
      put('#000', b);
      put('transparent', b + Math.min(MASK_FEATHER, after * 0.35));
    }
    return 'linear-gradient(to bottom,' + stops.join(',') + ')';
  }

  function shapeVeil() {
    maskRaf = 0;
    var docH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, 1);
    var m = maskFrom(textBands(docH), docH);
    var size = '100% ' + Math.round(docH) + 'px';
    if (m !== lastMask || size !== lastSize) {
      lastMask = m; lastSize = size;
      veil.style.webkitMaskImage = m;
      veil.style.maskImage = m;
      veil.style.webkitMaskSize = size;
      veil.style.maskSize = size;
      veil.style.webkitMaskPosition = maskPos();
      veil.style.maskPosition = maskPos();
    }
  }
  function shapeSoon() { if (!maskRaf) maskRaf = requestAnimationFrame(shapeVeil); }

  shapeVeil();
  addEventListener('resize', shapeSoon, { passive: true });
  addEventListener('lens:change', shapeSoon);
  /* And on scroll. Not because the mask moves with the scroll, which the mask offset written
     in syncVeil already handles, but because the page changes shape as you go down it: the
     reveals settle, images arrive, and the lens re measures its cards when its fetch resolves.
     A mask built before any of that and never rebuilt read 0.604 alpha at a paragraph's own
     top edge and 3.53:1 against a white field. Scroll is the cheapest signal that a reader has
     moved on to a part of the page whose geometry may have changed since. One rebuild walks
     every run of text in main, a little over two hundred of them, and measures 0.8 to 2.5ms,
     so it is rAF throttled and never runs twice in a frame. */
  addEventListener('scroll', shapeSoon, { passive: true });
  /* And when something finishes moving. The reveals start at translateY(14px) and settle over
     .55s, and getClientRects() reports the transformed position, so a mask built during that
     window puts the band up to fourteen pixels below where the text ends up: the element's own
     top then sits on the mask's ramp instead of on its plateau. Measured 0.626 alpha at the
     top edge of a case study tag, and 3.15:1 against a solid white field where the plateau
     gives 5.36. Nothing else caught it. A transform does not change main's size, so the
     ResizeObserver never fires, and a reveal that settles without a further scroll left the
     mask wrong until the reader moved again. transitionend bubbles, so one listener on main is
     every reveal and every card that lifts on hover, and it is filtered to the two properties
     that can actually move a glyph. */
  /* Filtered by target as well as by property. The property test alone caught every card,
     tile and stat that lifts on hover, so a pointer crossing the bento grid scheduled a mask
     rebuild on every hover edge, and a rebuild walks every run of text in main at 0.8 to
     2.5ms. Those lifts are 3px, which the band's own 8px of pad absorbs, so the rebuild bought
     nothing. The reveals are the transitions that actually move text, by fourteen pixels. */
  var REVEALS = '.reveal,[data-stagger],[data-stagger] > *,.diagram';
  function onSettle(e) {
    if (e.propertyName !== 'transform' && e.propertyName !== 'opacity') return;
    var t = e.target;
    if (t && t.matches && t.matches(REVEALS)) shapeSoon();
  }
  main.addEventListener('transitionend', onSettle);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(shapeSoon).catch(function () {});
  /* main changes height on its own as well: images arrive, the lens opens its cards, and the
     AI state reflows the whole document. */
  var maskRO = null;
  if ('ResizeObserver' in window) { maskRO = new ResizeObserver(shapeSoon); maskRO.observe(main); }

  var size = hostSize();
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(75, size.w / size.h, 0.1, 1000);
  camera.position.z = 30;
  renderer.setSize(size.w, size.h, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, size.w < 700 ? 1.5 : 2));

  /* Soft round sprite, drawn once into an offscreen canvas. Square points read as scattered
     pixels rather than an effect. */
  function makeSprite() {
    var s = 64, c = document.createElement('canvas');
    c.width = c.height = s;
    var ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    var tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }
  var sprite = makeSprite();

  /* 2. Particle state
     A narrow hero only shows a slim vertical slice of the world, so on phones the field is
     scaled to the visible width and thinned. Otherwise most particles sit off-screen and are
     computed for nothing.

     The count went up in v1.22.1, 200 to 280 below 700px and 380 to 500 above. Person is the
     reason: until v1.23.0 its field was confined to the hero, and the hero is a wall of text,
     so almost all of the light it made landed under the veil and was spent. The count is
     one buffer, so this lifts all three states. What is per state is the point size below,
     which is where the person state gets the rest of its light without pushing the other two
     any further. Measured at 390px in the hero band, that takes the share of it that is lit
     from 1.2 to 13.9 per cent and the share that is genuinely bright from 0.00 to 0.85 per
     cent, against Google's 1.05. */
  var narrow = size.w < 700;
  var spreadX = narrow ? 26 : 60;
  var count = narrow ? 280 : 500;
  var geometry = new THREE.BufferGeometry();
  var renderPos = new Float32Array(count * 3);   // what is drawn: base + drift + repel
  var basePos = new Float32Array(count * 3);     // formation position, lerps toward target
  var targetPos = new Float32Array(count * 3);
  var repelOff = new Float32Array(count * 2);    // current pointer displacement
  var phase = new Float32Array(count);
  var freqA = new Float32Array(count);
  var freqB = new Float32Array(count);
  var ampScale = new Float32Array(count);

  for (var i = 0; i < count; i++) {
    var x = (Math.random() - 0.5) * spreadX;
    var y = (Math.random() - 0.5) * 40;
    var z = (Math.random() - 0.5) * 20;
    basePos[i * 3] = targetPos[i * 3] = renderPos[i * 3] = x;
    basePos[i * 3 + 1] = targetPos[i * 3 + 1] = renderPos[i * 3 + 1] = y;
    basePos[i * 3 + 2] = targetPos[i * 3 + 2] = renderPos[i * 3 + 2] = z;
    phase[i] = Math.random() * Math.PI * 2;
    freqA[i] = 0.45 + Math.random() * 0.75;
    freqB[i] = 0.35 + Math.random() * 0.65;
    ampScale[i] = 0.55 + Math.random() * 0.9;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(renderPos, 3));

  var modeConfigs = {
    person: { color: new THREE.Color('#ffb547'), lineOpacity: 0.00, threshold: 0,   driftAmp: 3.2, mode: 'organic' },
    google: { color: new THREE.Color('#25e39b'), lineOpacity: 0.50, threshold: 4.2, driftAmp: 0.95, mode: 'grid' },
    ai:     { color: new THREE.Color('#b06bff'), lineOpacity: 0.22, threshold: 5.6, driftAmp: 2.8, mode: 'neural' }
  };

  var currentMode = 'person';
  var currentColor = modeConfigs.person.color.clone();
  var currentDrift = modeConfigs.person.driftAmp;

  /* ---- the budget ----
     No GPU was available where this was built, so a whole frame time here is the software
     rasteriser and says nothing useful. What is quotable is the JavaScript the field runs each
     frame, timed from the top of the tick to the render call: 0.1 to 0.3ms at 390px and 0.3 to
     0.5ms at 1280px, p95 0.8ms, and the same to the tenth of a millisecond at the v1.22.0
     counts and budget as at these. So the counts below are a workload number rather than a
     timing, and the link search is not what a phone would be waiting on. The segment cap is
     what bounds the page wide states, and the sub-700px thinning carries straight through.

     The budget rises with the count, 1200 to 1580 and 600 to 840, and has to. The buffer is
     filled in index order and the outer guard stops the whole search once it is full, so with
     the count raised and the budget held the mesh reached a smaller share of the grid than it
     did before: the grid is laid out in fixed columns, so more particles make it taller rather
     than denser, and the links ran out further from the top of it. Holding segments per
     particle constant keeps the mesh covering what it covered. MAX_SEGMENTS still caps both.

     Person draws no links at all, so its per frame cost is the particle loop and nothing
     else, and that is now true through the first quarter of the drag as well rather than at
     rest only. */
  var SEGMENT_BUDGET = { person: 0, google: narrow ? 840 : 1580, ai: narrow ? 126 : 237 };
  /* AI is the quietest state, not the busiest. Its argument is that an assistant receives
     linear text and nothing else; a swarming field behind that contradicts the point. It is
     also the state with the most text on screen, so it is the worst place to put light. */
  var POINT_OPACITY = { person: 0.95, google: 0.75, ai: 0.28 };
  /* Point size is per state, and in v1.23.0 the person state wants the SMALLEST of the three,
     which is the reverse of what v1.22.1 had it at. The reason is density rather than taste.
     The spread scales the group by 1 to 1.35, and the person state is the unscaled end, so its
     cloud covers 1.35 squared less screen for the same particle count: about 1.8 times the
     areal density of the other two, and its points are the most opaque as well at .95 against
     .75. While the field was clipped to the hero none of that showed. Page wide it does, and at
     the size the clipped version needed it stopped reading as points and started reading as
     fog: measured 21.4 per cent of the viewport lit at 3.4 against Google's 3.3, and visibly
     a haze under the body copy rather than light behind it. One material, so this is written
     per frame from the same mix as everything else rather than set once. */
  var POINT_SIZE = { person: 1.9, google: 2.4, ai: 2.4 };

  function lensValue() {
    var v = parseFloat(getComputedStyle(document.body).getPropertyValue('--lens'));
    return isFinite(v) ? Math.max(0, Math.min(2, v)) : 0;
  }
  function mix(a, b, t) { return a + (b - a) * t; }
  /* Everything the field does is a reading of the one value, so the spread, the colour, the
     links and the retreat are one event rather than three that happen to coincide. */
  function fieldAt(v) {
    var lo = v < 1 ? 'person' : 'google';
    var hi = v < 1 ? 'google' : 'ai';
    var t = v < 1 ? v : v - 1;
    var A = modeConfigs[lo], B = modeConfigs[hi];
    return {
      lineOpacity: mix(A.lineOpacity, B.lineOpacity, t),
      threshold: mix(A.threshold, B.threshold, t),
      driftAmp: mix(A.driftAmp, B.driftAmp, t),
      pointOpacity: mix(POINT_OPACITY[lo], POINT_OPACITY[hi], t),
      pointSize: mix(POINT_SIZE[lo], POINT_SIZE[hi], t),
      budget: Math.round(mix(SEGMENT_BUDGET[lo], SEGMENT_BUDGET[hi], t)),
      colorFrom: A.color, colorTo: B.color, colorT: t,
      spread: v < 1 ? v : 1
    };
  }

  var material = new THREE.PointsMaterial({
    size: POINT_SIZE.person,
    map: sprite,
    color: currentColor,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  /* Points and links share one group so the spread can scale them together. Scaling the
     group rather than the positions leaves the link maths in unscaled world units, so the
     mesh a reader sees at full spread is the same mesh, drawn larger. */
  var fieldGroup = new THREE.Group();
  scene.add(fieldGroup);
  fieldGroup.add(new THREE.Points(geometry, material));

  /* Connection lines: buffer allocated once, redrawn in place via setDrawRange. */
  var MAX_SEGMENTS = narrow ? 2500 : 5000;
  var lineArray = new Float32Array(MAX_SEGMENTS * 6);
  var lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(lineArray, 3));
  var lineMaterial = new THREE.LineBasicMaterial({
    color: currentColor,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  var lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
  lineMesh.frustumCulled = false;
  fieldGroup.add(lineMesh);

  /* Aliased deliberately. three.js COPIES a Color passed through the constructor rather than
     holding the reference, so material.color was a separate object and every per frame
     currentColor.lerp() updated something nothing rendered: the field stayed the person amber
     in every state. The old tablist init block happened to re-alias these; it is gone now, so
     the aliasing has to be explicit and stated. */
  material.color = currentColor;
  lineMaterial.color = currentColor;

  /* 3. Pointer, mouse and touch, tracked in world units relative to the hero */
  var REPEL_RADIUS = 14;
  var REPEL_PUSH = 9;
  var pointer = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0, active: false };

  /* Stored as a fraction of the field, not as world units. The group is scaled by the spread,
     so a world position captured on mousemove would be read against a different scale a second
     later and the particles would push away from a point beside the cursor. The conversion
     happens once a frame instead, against the scale in force at that frame. */
  function movePointer(clientX, clientY) {
    var r = host.getBoundingClientRect();
    var inside = clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    pointer.active = inside;
    if (!inside) return;
    pointer.nx = (clientX - r.left) / r.width - 0.5;
    pointer.ny = -((clientY - r.top) / r.height - 0.5);
  }
  function pointerToWorld() {
    var s = hostSize();
    var visH = 2 * camera.position.z * Math.tan((75 * Math.PI / 180) / 2);
    var k = fieldGroup.scale.x || 1;
    pointer.tx = pointer.nx * visH * (s.w / s.h) / k;
    pointer.ty = pointer.ny * visH / k;
  }

  window.addEventListener('mousemove', function (e) {
    movePointer(e.clientX, e.clientY);
  }, { passive: true });

  window.addEventListener('touchmove', function (e) {
    if (e.touches && e.touches.length) movePointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  window.addEventListener('touchstart', function (e) {
    if (e.touches && e.touches.length) movePointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  window.addEventListener('touchend', function () { pointer.active = false; }, { passive: true });
  /* On the document, not on the field. The field is pointer-events:none and covers the whole
     viewport, so a mouseleave bound to it could never fire and pointer.active never cleared:
     particles went on being repelled from wherever the cursor was when it left the window. */
  document.addEventListener('mouseleave', function () { pointer.active = false; });

  /* 4. Mode switching */
  window.setReaderMode = function (modeKey) {
    var config = modeConfigs[modeKey];
    if (!config || modeKey === currentMode) return;
    currentMode = modeKey;

    for (var i = 0; i < count; i++) {
      if (config.mode === 'grid') {
        var cols = narrow ? 10 : 22;
        var gapX = narrow ? 2.5 : 3.0;
        targetPos[i * 3] = ((i % cols) - cols / 2) * gapX;
        targetPos[i * 3 + 1] = (Math.floor(i / cols) - (count / cols) / 2) * 2.6;
        targetPos[i * 3 + 2] = 0;
      } else {
        targetPos[i * 3] = (Math.random() - 0.5) * spreadX;
        targetPos[i * 3 + 1] = (Math.random() - 0.5) * 40;
        targetPos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      }
    }
  };

  /* 5. Animation */
  var time = 0;
  var running = true;
  var frameId = null;
  var lastTs = 0;

  function animate(ts) {
    if (!running) return;
    frameId = requestAnimationFrame(animate);
    if (document.hidden) { lastTs = ts || 0; return; }

    /* Normalise to a 60fps step so the effect runs at the same speed on 120Hz displays. */
    var dt = lastTs ? Math.min((ts - lastTs) / 16.67, 3) : 1;
    lastTs = ts || 0;
    if (!isFinite(dt) || dt <= 0) dt = 1;
    time += 0.019 * dt;

    pointerToWorld();
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, 0.14 * dt);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, 0.14 * dt);

    var lens = lensValue();
    var cfg = fieldAt(lens);
    /* The formation itself cannot be interpolated, so it still snaps at the thresholds the
       way it always did; everything continuous follows the value directly. */
    var nearest = lens < 0.5 ? 'person' : (lens < 1.5 ? 'google' : 'ai');
    if (nearest !== currentMode) window.setReaderMode(nearest);

    /* Read straight off the value, not eased toward it. The value is already tweened by
       lens.js when a reader taps a stop, and it is the pointer itself when they drag; easing a
       second time on top of that only adds a quarter second of lag between the thumb and the
       field, which is the one thing this change exists to remove. The formation morph still
       eases, because that is a shape changing rather than a number being read. */
    currentColor.copy(cfg.colorFrom).lerp(cfg.colorTo, cfg.colorT);
    lineMaterial.opacity = cfg.lineOpacity;
    material.opacity = cfg.pointOpacity;
    material.size = cfg.pointSize;
    currentDrift = cfg.driftAmp;
    /* The spread is the cloud growing, not the camera retreating. Pulling the camera back was
       the first attempt and it did the opposite of what it says: the frustum widened faster
       than the cloud, so the field shrank into the middle of the screen and left the page
       edges empty, which is the one place the veil lets it be seen. Scaling the group keeps
       the camera and therefore the coverage, and because the links are computed on unscaled
       positions the mesh is identical, just larger. */
    fieldGroup.scale.setScalar(1 + cfg.spread * 0.35);

    /* Subtle camera parallax: the z-spread of the field turns pointer movement into depth. */
    camera.position.x += (pointer.x * 0.07 - camera.position.x) * Math.min(1, 0.05 * dt);
    camera.position.y += (pointer.y * 0.07 - camera.position.y) * Math.min(1, 0.05 * dt);

    var baseK = Math.min(1, 0.06 * dt);
    var repelK = Math.min(1, 0.18 * dt);
    var v = 0;
    /* Not threshold > 0. The threshold is mixed from 0, so a value a hundredth of the way out
       of the person state gives 0.042, which no pair is ever inside, while the budget is
       already large enough that the "buffer is full" guard below never trips. The whole pair
       scan then ran every frame and drew nothing, through the first quarter of the drag. Mean
       spacing in this field is about four world units, so a threshold under one cannot produce
       a link and there is nothing to look for. */
    var linkable = cfg.threshold > 1;
    var threshold = cfg.threshold;
    var maxFloats = Math.min(lineArray.length, cfg.budget * 6);

    for (var i = 0; i < count; i++) {
      var i3 = i * 3, i2 = i * 2;

      /* base: formation */
      basePos[i3] += (targetPos[i3] - basePos[i3]) * baseK;
      basePos[i3 + 1] += (targetPos[i3 + 1] - basePos[i3 + 1]) * baseK;
      basePos[i3 + 2] += (targetPos[i3 + 2] - basePos[i3 + 2]) * baseK;

      /* drift: continuous wander so the field never freezes */
      var amp = currentDrift * ampScale[i];
      var bx = basePos[i3] + Math.sin(time * freqA[i] + phase[i]) * amp;
      var by = basePos[i3 + 1] + Math.cos(time * freqB[i] + phase[i] * 1.3) * amp;

      /* repel: push away from the pointer, spring back when it leaves */
      var wantX = 0, wantY = 0;
      if (pointer.active) {
        var rdx = bx - pointer.x;
        var rdy = by - pointer.y;
        var d2 = rdx * rdx + rdy * rdy;
        if (d2 < REPEL_RADIUS * REPEL_RADIUS) {
          var d = Math.sqrt(d2) || 0.0001;
          var falloff = 1 - d / REPEL_RADIUS;
          var push = falloff * falloff * REPEL_PUSH;
          wantX = (rdx / d) * push;
          wantY = (rdy / d) * push;
        }
      }
      repelOff[i2] += (wantX - repelOff[i2]) * repelK;
      repelOff[i2 + 1] += (wantY - repelOff[i2 + 1]) * repelK;

      renderPos[i3] = bx + repelOff[i2];
      renderPos[i3 + 1] = by + repelOff[i2 + 1];
      renderPos[i3 + 2] = basePos[i3 + 2];

      /* links, built from final drawn positions so they distort around the pointer void */
      if (linkable && v < maxFloats - 6) {
        for (var j = 0; j < i; j++) {
          var j3 = j * 3;
          var dx = renderPos[i3] - renderPos[j3];
          var dy = renderPos[i3 + 1] - renderPos[j3 + 1];
          if (dx * dx + dy * dy < threshold * threshold) {
            lineArray[v++] = renderPos[i3];
            lineArray[v++] = renderPos[i3 + 1];
            lineArray[v++] = renderPos[i3 + 2];
            lineArray[v++] = renderPos[j3];
            lineArray[v++] = renderPos[j3 + 1];
            lineArray[v++] = renderPos[j3 + 2];
            if (v >= maxFloats - 6) break;
          }
        }
      }
    }

    geometry.attributes.position.needsUpdate = true;
    lineGeometry.attributes.position.needsUpdate = true;
    lineGeometry.setDrawRange(0, v / 3);

    renderer.render(scene, camera);
  }
  animate(0);

  /* There is no hero pause any more, and there must not be one. From v1.21.0 an
     IntersectionObserver stopped the loop once the hero left the viewport, and that was only
     ever safe because the field was clipped to the hero: with the hero gone the clip closed
     completely and the stopped field was invisible. v1.23.0 removed the clip, and the same
     observer then stopped the loop while the field still covered the whole page. Measured at
     390px in the person state, scrolled past the hero: zero pixels changed over 450ms with
     20.3 per cent of the frame lit. A still photograph of a particle field, which reads as a
     rendering fault rather than as a pause. The tab being hidden is the only pause left, and
     the loop checks that every frame. */

  /* 6. Resize with the viewport. It used to be a ResizeObserver on the hero, because the
     canvas was the hero's own size; the canvas is the viewport now, and since v1.23.0 so is
     everything a reader sees of it. */
  function resize() {
    var s = hostSize();
    camera.aspect = s.w / s.h;
    camera.updateProjectionMatrix();
    renderer.setSize(s.w, s.h, false);
    syncVeil();
  }
  window.addEventListener('resize', resize);

  /* 7. Stop if the visitor turns reduced motion on mid-session */
  function onMotionChange() {
    if (!motionQuery.matches) return;
    running = false;
    if (frameId) cancelAnimationFrame(frameId);
    canvas.remove();
    host.remove();
    veil.remove();
    /* And stop listening. Both of these write to nodes that have just been detached, which is
       harmless but keeps a scroll handler alive for a field that no longer exists. */
    removeEventListener('scroll', syncVeil);
    removeEventListener('resize', syncVeil);
    removeEventListener('resize', shapeSoon);
    removeEventListener('lens:change', shapeSoon);
    removeEventListener('scroll', shapeSoon);
    main.removeEventListener('transitionend', onSettle);
    if (maskRO) maskRO.disconnect();
    if (maskRaf) cancelAnimationFrame(maskRaf);
    window.removeEventListener('resize', resize);
    /* Back to the still photograph, which is what reduced motion should get. */
    if (heroMedia) heroMedia.classList.remove('webgl-on');
  }
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotionChange);
  else if (motionQuery.addListener) motionQuery.addListener(onMotionChange);

  /* The field follows --lens directly, read once per frame. The tablist observer that used
     to drive it is gone: one value drives the page, the control and the field, which is the
     whole point of folding the two mechanisms together. */
})();
