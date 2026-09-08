/* background-canvas.js
   The WebGL particle field. It reads --lens, the same value the control writes and the page
   reads, so its colour, its density, its links and how far it spreads out of the hero are all
   one event rather than three that happen to coincide.

   Motion is composed of three independent layers, which is what lets the formation change be
   snappy while the pointer stays highly responsive. Driving both through a single position
   lerp forces a trade-off between them.
     base   . lerps toward the state's formation
     drift  . continuous per particle wander, so the field never settles into a still image
     repel  . a springing displacement pushing particles away from the pointer

   Mounts two layers at body level: the field and the veil above it. The dark ground the page
   crosses to is NOT built here, it is body's own background in the stylesheet, because it has
   to exist in the cases this file returns early on. Those cases are:
     . three.js unavailable (CDN blocked or failed)
     . WebGL unavailable
     . prefers-reduced-motion: reduce
   In all three the hero falls back to the poster image at /assets/img/gen-hero.jpg, which is
   what the webgl-on class on .hero-media turns off when the field is live.
   Public API: window.setReaderMode('person' | 'google' | 'ai'), used internally to snap the
   formation at the thresholds. */
(function () {
  var hero = document.querySelector('.home .hero');
  if (!hero) return;
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
  /* The veil is the v1.11.0 hero overlay generalised. That overlay lived on .hero-media and
     painted OVER the canvas because the canvas was inside it; moving the canvas to a body level
     layer left the overlay underneath, which is what let the field blaze straight through the
     hero copy. It is a separate layer now, after the field in the DOM so it paints above it,
     and it follows the same shape: heavy over the text column, open on the right. */
  var veil = document.createElement('div');
  veil.className = 'lens-veil';
  veil.setAttribute('aria-hidden', 'true');
  document.body.appendChild(host);
  host.appendChild(canvas);
  /* The hero still needs to know the field is live. This class does two things that were
     lost when the canvas moved out of .hero-media: it drops the photograph, which was only
     ever the no-WebGL fallback and competes with the field when both are drawn, and it swaps
     the weak fallback overlay for the strong one. Without it the page ran the photo, the weak
     overlay and the field all at once, which is how amber particles ended up reading straight
     through the hero copy. */
  var heroMedia = document.querySelector('.hero-media');
  if (heroMedia) heroMedia.classList.add('webgl-on');
  /* Inside the field, after the canvas: it paints over the particles and inherits the same
     clip, so it only dims where the field actually is. As a sibling of the field it dimmed the
     whole page in the person state, where the field is confined to the hero and the rest of the
     page should be untouched paper. */
  host.appendChild(veil);

  /* Sized to the viewport, always. The clip decides how much of it you can see. */
  function hostSize() {
    return { w: Math.max(1, window.innerWidth), h: Math.max(1, window.innerHeight) };
  }

  /* The field is confined to the hero at rest and opens to the whole viewport as the lens
     moves. Writing the hero's live edges lets CSS interpolate the opening, so the spill is one
     animation on the same value as everything else rather than a separate effect. */
  function clipToHero() {
    var r = hero.getBoundingClientRect();
    var top = Math.max(0, r.top);
    var bottom = Math.max(0, window.innerHeight - r.bottom);
    host.style.setProperty('--field-top', top + 'px');
    host.style.setProperty('--field-bottom', bottom + 'px');
  }
  clipToHero();
  addEventListener('scroll', clipToHero, { passive: true });
  addEventListener('resize', clipToHero, { passive: true });

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
     computed for nothing. */
  var narrow = size.w < 700;
  var spreadX = narrow ? 26 : 60;
  var count = narrow ? 200 : 380;
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
     No GPU was available where this was built, so these are workload numbers rather than
     timings: particles are unchanged from the hero-only field, and the segment cap is what
     bounds the page wide states. The existing sub-700px halving carries straight through.
     Person draws no links at all, so its cost is unchanged from before this change. */
  var SEGMENT_BUDGET = { person: 0, google: narrow ? 600 : 1200, ai: narrow ? 90 : 180 };
  /* AI is the quietest state, not the busiest. Its argument is that an assistant receives
     linear text and nothing else; a swarming field behind that contradicts the point. It is
     also the state with the most text on screen, so it is the worst place to put light. */
  var POINT_OPACITY = { person: 0.95, google: 0.75, ai: 0.28 };

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
      budget: Math.round(mix(SEGMENT_BUDGET[lo], SEGMENT_BUDGET[hi], t)),
      colorFrom: A.color, colorTo: B.color, colorT: t,
      spread: v < 1 ? v : 1
    };
  }

  var material = new THREE.PointsMaterial({
    size: 1.9,
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
    var linkable = cfg.threshold > 0;
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

  /* Pause once the hero leaves the viewport, but only while the field is still confined to
     the hero. Once it has spread across the page there is no hero to leave, so the only pause
     left is the tab being hidden, which the loop checks every frame. */
  var heroVisible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      var shouldRun = heroVisible || lensValue() > 0.02;
      if (shouldRun && !running && !motionQuery.matches) { running = true; lastTs = 0; animate(0); }
      else if (!shouldRun && running) { running = false; if (frameId) cancelAnimationFrame(frameId); }
    }, { threshold: 0 }).observe(hero);
  }
  /* The observer only fires when the hero crosses the viewport edge, so the lens moving while
     the reader is parked mid page has to be its own signal, in both directions: leaving the
     person state has to start the loop, and coming back to it has to stop the loop again
     rather than leave it rendering a field clipped to a hero nobody can see. */
  addEventListener('lens:change', function () {
    if (motionQuery.matches) return;
    var shouldRun = heroVisible || lensValue() > 0.02;
    if (shouldRun && !running) { running = true; lastTs = 0; animate(0); }
    else if (!shouldRun && running) { running = false; if (frameId) cancelAnimationFrame(frameId); }
  });

  /* 6. Resize with the viewport. It used to be a ResizeObserver on the hero, because the
     canvas was the hero's own size; the canvas is the viewport now and the clip is what
     decides how much of it a reader sees. */
  function resize() {
    var s = hostSize();
    camera.aspect = s.w / s.h;
    camera.updateProjectionMatrix();
    renderer.setSize(s.w, s.h, false);
    clipToHero();
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
    removeEventListener('scroll', clipToHero);
    removeEventListener('resize', clipToHero);
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
