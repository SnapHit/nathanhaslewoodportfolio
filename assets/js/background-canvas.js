/* background-canvas.js
   WebGL particle field behind the hero, switching visual mode with the three reader tabs.

   Motion is composed of three independent layers, which is what lets the mode transition be
   snappy while the pointer stays highly responsive. Driving both through a single position
   lerp forces a trade-off between them.
     base   - lerps toward the mode's formation (drives the transition between tabs)
     drift  - continuous per-particle wander, so the field never settles into a still image
     repel  - a springing displacement pushing particles away from the pointer

   Mounts into .hero-media, where the looping video used to sit, so the poster image at
   /assets/img/gen-hero.jpg stays as the fallback backdrop in every case below:
     - three.js unavailable (CDN blocked or failed)
     - WebGL unavailable
     - prefers-reduced-motion: reduce
   Public API: window.setReaderMode('person' | 'google' | 'ai') */
(function () {
  var host = document.querySelector('.hero-media');
  if (!host) return;
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
  host.prepend(canvas);
  host.classList.add('webgl-on');

  function hostSize() {
    var r = host.getBoundingClientRect();
    return { w: Math.max(1, r.width), h: Math.max(1, r.height) };
  }

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
    google: { color: new THREE.Color('#25e39b'), lineOpacity: 0.55, threshold: 4.2, driftAmp: 0.95, mode: 'grid' },
    ai:     { color: new THREE.Color('#b06bff'), lineOpacity: 0.46, threshold: 5.6, driftAmp: 2.8, mode: 'neural' }
  };

  var currentMode = 'person';
  var currentColor = modeConfigs.person.color.clone();
  var currentDrift = modeConfigs.person.driftAmp;

  var material = new THREE.PointsMaterial({
    size: 1.9,
    map: sprite,
    color: currentColor,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  scene.add(new THREE.Points(geometry, material));

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
  scene.add(lineMesh);

  /* 3. Pointer, mouse and touch, tracked in world units relative to the hero */
  var REPEL_RADIUS = 14;
  var REPEL_PUSH = 9;
  var pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false };

  function movePointer(clientX, clientY) {
    var r = host.getBoundingClientRect();
    var inside = clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    pointer.active = inside;
    if (!inside) return;
    var visH = 2 * camera.position.z * Math.tan((75 * Math.PI / 180) / 2);
    var visW = visH * (r.width / r.height);
    pointer.tx = ((clientX - r.left) / r.width - 0.5) * visW;
    pointer.ty = -((clientY - r.top) / r.height - 0.5) * visH;
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
  host.addEventListener('mouseleave', function () { pointer.active = false; });

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

    pointer.x += (pointer.tx - pointer.x) * Math.min(1, 0.14 * dt);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, 0.14 * dt);

    var cfg = modeConfigs[currentMode];
    currentColor.lerp(cfg.color, Math.min(1, 0.08 * dt));
    lineMaterial.opacity += (cfg.lineOpacity - lineMaterial.opacity) * Math.min(1, 0.06 * dt);
    currentDrift += (cfg.driftAmp - currentDrift) * Math.min(1, 0.05 * dt);

    /* Subtle camera parallax: the z-spread of the field turns pointer movement into depth. */
    camera.position.x += (pointer.x * 0.07 - camera.position.x) * Math.min(1, 0.05 * dt);
    camera.position.y += (pointer.y * 0.07 - camera.position.y) * Math.min(1, 0.05 * dt);

    var baseK = Math.min(1, 0.06 * dt);
    var repelK = Math.min(1, 0.18 * dt);
    var v = 0;
    var linkable = cfg.threshold > 0;
    var threshold = cfg.threshold;
    var maxFloats = lineArray.length;

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

  /* Pause once the hero leaves the viewport. */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      if (visible && !running && !motionQuery.matches) { running = true; lastTs = 0; animate(0); }
      else if (!visible && running) { running = false; if (frameId) cancelAnimationFrame(frameId); }
    }, { threshold: 0 }).observe(host);
  }

  /* 6. Resize with the hero, not the window */
  function resize() {
    var s = hostSize();
    camera.aspect = s.w / s.h;
    camera.updateProjectionMatrix();
    renderer.setSize(s.w, s.h, false);
  }
  if ('ResizeObserver' in window) {
    new ResizeObserver(resize).observe(host);
  } else {
    window.addEventListener('resize', resize);
  }

  /* 7. Stop if the visitor turns reduced motion on mid-session */
  function onMotionChange() {
    if (!motionQuery.matches) return;
    running = false;
    if (frameId) cancelAnimationFrame(frameId);
    canvas.remove();
    host.classList.remove('webgl-on');
  }
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotionChange);
  else if (motionQuery.addListener) motionQuery.addListener(onMotionChange);

  /* 8. Follow the three reader tabs.
     Watching aria-selected rather than binding clicks means the mode also follows the
     tablist's arrow-key navigation, and stays decoupled from site.js. */
  var tablist = document.querySelector('#reader-frame .frame-tabs');
  if (tablist) {
    var tabButtons = tablist.querySelectorAll('button[data-reader]');
    var observer = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var t = records[i].target;
        if (t.getAttribute('aria-selected') === 'true' && t.dataset.reader) {
          window.setReaderMode(t.dataset.reader);
        }
      }
    });
    tabButtons.forEach(function (t) {
      observer.observe(t, { attributes: true, attributeFilter: ['aria-selected'] });
      if (t.getAttribute('aria-selected') === 'true' && t.dataset.reader) {
        currentMode = t.dataset.reader;
        currentColor = modeConfigs[currentMode].color.clone();
        currentDrift = modeConfigs[currentMode].driftAmp;
        material.color = currentColor;
        lineMaterial.color = currentColor;
      }
    });
  }
})();
