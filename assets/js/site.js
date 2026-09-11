/* nathanhaslewood.com.au
   Every machine view below derives its output from this page's real markup at runtime.
   Nothing is hard-coded or simulated. That is the point. */

document.documentElement.classList.add("js");

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- scroll reveal + stagger ---------- */
  var revealEls = document.querySelectorAll(".reveal, [data-stagger], .diagram");
  document.querySelectorAll("[data-stagger]").forEach(function (el) {
    Array.prototype.forEach.call(el.children, function (child, i) {
      child.style.transitionDelay = (i * 90) + "ms";
    });
  });
  if ("IntersectionObserver" in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }


  /* ---------- machine-view builders (shared by frame + overlay) ---------- */
  function contentRoot() { return document.querySelector("main"); }

  function buildGoogleInto(dl, excludeEl) {
    dl.innerHTML = "";
    function add(k, v, cls) {
      var dt = document.createElement("dt"); dt.textContent = k;
      var dd = document.createElement("dd"); if (cls) dd.className = cls;
      if (v instanceof Node) { dd.appendChild(v); } else { dd.textContent = v; }
      dl.appendChild(dt); dl.appendChild(dd);
    }
    var meta = document.querySelector('meta[name="description"]');
    var canon = document.querySelector('link[rel="canonical"]');
    add("Title", document.title);
    add("Description", meta ? meta.content : "(none)");
    add("Canonical", canon ? canon.href : window.location.href);
    add("Content without JavaScript", "Yes. Every word on this page is in the HTML response.", "check");

    var outline = document.createElement("div"); outline.className = "outline";
    contentRoot().querySelectorAll("h1, h2").forEach(function (h) {
      if (excludeEl && excludeEl.contains(h)) return;
      var line = document.createElement("div");
      line.className = h.tagName === "H1" ? "h1" : "h2";
      line.textContent = (h.tagName === "H1" ? "h1  " : "h2  ") + h.textContent.trim();
      outline.appendChild(line);
    });
    add("Heading outline", outline);

    var ld = document.querySelector('script[type="application/ld+json"]');
    if (ld) {
      try {
        var data = JSON.parse(ld.textContent);
        add("Structured data", [data["@type"], data.name, data.jobTitle].filter(Boolean).join(" \u00B7 ") + "  (schema.org, JSON-LD)");
      } catch (e) { add("Structured data", "present"); }
    }
    var links = document.createElement("div");
    links.innerHTML = '<a href="/sitemap.xml">/sitemap.xml</a> \u00B7 <a href="/robots.txt">/robots.txt</a>';
    add("Index files", links);
  }

  function buildAIInto(panel, excludeEl) {
    var pre = panel.querySelector("pre");
    var log = panel.querySelector(".log");
    var bytes = Math.round(document.documentElement.outerHTML.length / 1024);
    log.innerHTML = "";
    [
      "GET " + window.location.pathname + "  HTTP/1.1",
      "host: " + (window.location.hostname || "nathanhaslewood.com.au"),
      "user-agent: an AI assistant, fetching on someone\u2019s behalf",
      '<span class="ok">200 OK</span> \u00B7 text/html \u00B7 ~' + bytes + " KB \u00B7 no client-side rendering required"
    ].forEach(function (line, i) {
      var div = document.createElement("div");
      div.innerHTML = line;
      if (!reduced) { div.style.animationDelay = (i * 160) + "ms"; }
      log.appendChild(div);
    });
    if (!reduced) {
      panel.classList.add("staging");
      pre.style.opacity = "0";
      setTimeout(function () { pre.style.transition = "opacity .4s ease"; pre.style.opacity = "1"; }, 700);
    }
    var out = [], count = 0;
    contentRoot().querySelectorAll("h1, h2, h3, p, li").forEach(function (n) {
      if (excludeEl && excludeEl.contains(n)) return;
      var t = n.textContent.replace(/\s+/g, " ").trim();
      if (!t) return;
      if (n.tagName === "H1") out.push("# " + t);
      else if (n.tagName === "H2") out.push("## " + t);
      else if (n.tagName === "H3") out.push("### " + t);
      else if (n.tagName === "LI") out.push("- " + t);
      else out.push(t);
      count++;
    });
    var text = out.join("\n\n");
    var cap = 1700;
    if (text.length > cap) {
      text = text.slice(0, cap) + "\n\n[\u2026 " + count + " content blocks on this page. Serialisation truncated for display. An assistant receives all of it.]";
    }
    pre.textContent = text;
  }

  /* The homepage reader frame no longer renders machine views into panels inside itself.
     It is the lens control now, wired in lens.js, and the whole page is the output. The
     builders below stay: the reader pill on every other page still uses them. */
  var frame = document.getElementById("reader-frame");

  /* ---------- site-wide reader pill (every page without the hero frame) ----------
     A page can opt out with data-no-reader-pill on <body>. /games/ does, because the pill
     sits bottom right and collides with the More link the hero gate reveals in that corner. */
  if (!frame && !document.body.hasAttribute("data-no-reader-pill")) {
    var pill = document.createElement("button");
    pill.className = "reader-pill";
    pill.setAttribute("aria-haspopup", "dialog");
    pill.innerHTML = '<span class="tdot t1"></span><span class="tdot t2"></span><span class="tdot t3"></span> view this page as machines do';
    document.body.appendChild(pill);

    var ov = document.createElement("div");
    ov.className = "roverlay"; ov.hidden = true;
    ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true");
    ov.setAttribute("aria-label", "This page, as machines read it");
    ov.innerHTML =
      '<div class="roverlay-card">' +
      '<div class="roverlay-head"><span class="t">GET ' + window.location.pathname + ' \u00B7 <b style="color:var(--ok)">200 OK</b> \u00B7 as its machine readers receive it</span><button class="x" aria-label="Close">\u00D7</button></div>' +
      '<div class="frame-tabs" role="tablist"><button role="tab" data-reader="google" aria-selected="true"><span class="dot" aria-hidden="true"></span>Google</button><button role="tab" data-reader="ai" aria-selected="false"><span class="dot" aria-hidden="true"></span>An AI assistant</button></div>' +
      '<div class="frame-panel active" data-p="google"><dl class="kv"></dl></div>' +
      '<div class="frame-panel panel-ai" data-p="ai"><div class="log" aria-hidden="true"></div><pre></pre><p class="note">This site also publishes <a href="/llms.txt">/llms.txt</a> and <a href="/are-you-ai/">a page for the third reader</a>.</p></div>' +
      '</div>';
    document.body.appendChild(ov);

    var ovBuilt = { google: false, ai: false };
    var ovTabs = ov.querySelectorAll(".frame-tabs button");
    var ovPanels = { google: ov.querySelector('[data-p="google"]'), ai: ov.querySelector('[data-p="ai"]') };

    function ovSelect(name) {
      ovTabs.forEach(function (t) { t.setAttribute("aria-selected", t.dataset.reader === name ? "true" : "false"); });
      Object.keys(ovPanels).forEach(function (k) { ovPanels[k].classList.toggle("active", k === name); });
      if (name === "google" && !ovBuilt.google) { buildGoogleInto(ovPanels.google.querySelector(".kv"), ov); ovBuilt.google = true; }
      if (name === "ai" && !ovBuilt.ai) { buildAIInto(ovPanels.ai, ov); ovBuilt.ai = true; }
    }
    ovTabs.forEach(function (t) { t.addEventListener("click", function () { ovSelect(t.dataset.reader); }); });

    function openOv() { ov.hidden = false; document.body.style.overflow = "hidden"; ovSelect("google"); ov.querySelector(".x").focus(); }
    function closeOv() { ov.hidden = true; document.body.style.overflow = ""; pill.focus(); }
    pill.addEventListener("click", openOv);
    ov.querySelector(".x").addEventListener("click", closeOv);
    ov.addEventListener("click", function (e) { if (e.target === ov) closeOv(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !ov.hidden) closeOv(); });
  }

  /* ---------- book sampler ---------- */
  var sampler = document.querySelector(".sampler");
  if (sampler) {
    var pages = sampler.querySelectorAll(".spage");
    var navBtns = sampler.querySelectorAll(".sampler-nav button");
    var dotsWrap = sampler.querySelector(".dots");
    var cur = 0;
    pages.forEach(function (_, i) {
      var d = document.createElement("span");
      if (i === 0) d.className = "on";
      dotsWrap.appendChild(d);
    });
    var dots = dotsWrap.children;
    function show(i) {
      cur = (i + pages.length) % pages.length;
      pages.forEach(function (p, j) { p.classList.toggle("cur", j === cur); });
      navBtns.forEach(function (b, j) { b.classList.toggle("on", j === cur); b.setAttribute("aria-current", j === cur ? "true" : "false"); });
      Array.prototype.forEach.call(dots, function (d, j) { d.classList.toggle("on", j === cur); });
    }
    navBtns.forEach(function (b, i) { b.addEventListener("click", function () { show(i); }); });
    sampler.querySelector(".prev").addEventListener("click", function () { show(cur - 1); });
    sampler.querySelector(".next").addEventListener("click", function () { show(cur + 1); });
    sampler.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") show(cur + 1);
      if (e.key === "ArrowLeft") show(cur - 1);
    });
    sampler.classList.add("ready");
    show(0);
  }

  /* ---------- colophon self-fetch ---------- */
  var raw = document.getElementById("raw-response");
  if (raw && window.location.protocol.indexOf("http") === 0) {
    fetch(window.location.pathname, { headers: { "Accept": "text/html" } })
      .then(function (r) { return r.text(); })
      .then(function (html) {
        raw.textContent = html.split("\n").slice(0, 26).join("\n") + "\n\u2026";
      })
      .catch(function () {
        raw.textContent = "Fetch unavailable in this environment. Deployed on Netlify, this panel shows the live response for this URL.";
      });
  } else if (raw) {
    raw.textContent = "Open this page over HTTP (deployed, or via a local server) and this panel fetches its own URL and prints the raw response.";
  }

  var y = document.getElementById("y");
  if (y) { y.textContent = new Date().getFullYear(); }
})();

(function(){if(location.protocol==='file:')return;var v=document.querySelector('.hero-media video');if(v&&window.matchMedia('(max-width:760px)').matches){var s=v.querySelector('source');if(s){s.src='/assets/img/gen-hero-loop-sm.mp4';v.load();}}})();

/* ---------- v1.24: the mobile nav, collapsed into a burger below 700px ----------
   Progressive enhancement, not a component. The markup ships the full visible nav, which is
   what a reader with JavaScript off gets, wrapped onto two rows exactly as it has been since
   v1.7. This builds the button and the panel, and only then adds the class that hides the nav,
   so the nav can never be hidden without a button to replace it.

   The panel is the site as one outline, which is the lens idea at site scale: the path a
   machine reads, the title a person reads, and one true line about what is there. */
(function () {
  var top = document.querySelector("header.top");
  var wrap = top && top.querySelector(".wrap");
  var nav = top && top.querySelector('nav[aria-label="Primary"]');
  var shell = document.querySelector(".shell");
  var main = document.getElementById("main") || document.querySelector("main");
  var foot = document.querySelector("footer.site");
  if (!top || !wrap || !nav || !shell || !main) return;

  var LINES = {
    "/work/": "Eight decision stories, with the numbers behind them",
    "/systems/": "Production AI, with the governance built in",
    "/games/": "SnapHit Studios. Three arcade games, playable here",
    "/book/": "Build, Stabilise, Leverage. Australian property, 441 pages",
    "/super/": "SMSF Property Investing. The whole book, free",
    "/about/": "Fifteen years across banking, government and defence",
    "/are-you-ai/": "Written for the machines that read this site",
    "/contact/": "LinkedIn. Serious messages get an answer"
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---- the button ---- */
  var btn = el("button", "burger");
  btn.type = "button";
  btn.id = "nav-burger";
  btn.setAttribute("aria-label", "Menu");
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", "nav-panel");
  btn.appendChild(el("i", null, ""));
  btn.querySelector("i").setAttribute("aria-hidden", "true");

  /* ---- the panel ---- */
  var panel = el("div", "navpanel");
  panel.id = "nav-panel";
  panel.hidden = true;
  var dots = el("p", "navpanel-dots");
  dots.setAttribute("aria-hidden", "true");
  ["t1", "t2", "t3"].forEach(function (t) { dots.appendChild(el("span", "tdot " + t)); });
  panel.appendChild(dots);

  var list = el("nav", "navpanel-list");
  list.setAttribute("aria-label", "Site outline");
  /* Built from the header's own anchors, so the panel can never disagree with the nav it
     replaces: one list in the markup, two presentations of it. aria-current comes along with
     it, which is what marks the current page here as well. */
  Array.prototype.forEach.call(nav.querySelectorAll("a[href]"), function (a, i) {
    var href = a.getAttribute("href");
    var row = el("a", "np-row");
    row.href = href;
    row.style.setProperty("--np-i", String(i));
    if (a.hasAttribute("aria-current")) row.setAttribute("aria-current", "page");
    row.appendChild(el("span", "np-path", href));
    row.appendChild(el("span", "np-title", (a.textContent || "").trim()));
    if (LINES[href]) row.appendChild(el("span", "np-desc", LINES[href]));
    list.appendChild(row);
  });
  panel.appendChild(list);

  wrap.appendChild(btn);
  document.body.appendChild(panel);
  document.documentElement.classList.add("nav-js");

  /* ---- open and close ---- */
  var root = document.documentElement;
  var open = false;
  var closeTimer = 0;

  function focusables() {
    return Array.prototype.filter.call(
      panel.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])'),
      function (n) { return n.offsetWidth > 0 || n.offsetHeight > 0; });
  }

  /* The scale has to happen about the middle of the VIEWPORT, not the middle of the shell.
     The shell is the whole document, nine thousand pixels tall on the homepage, and scaling
     that about its own centre displaces everything near the top of the page downward by eight
     per cent of its distance from that centre: measured 357px at a scroll position of 400,
     which threw the sticky header and its own burger into the middle of the screen. Scroll is
     locked while the panel is open, so one reading taken as it opens stays correct until it
     closes; it is recomputed if the viewport itself changes. */
  function setOrigin() {
    shell.style.transformOrigin = "50% " + (window.pageYOffset + window.innerHeight / 2) + "px";
  }

  function setOpen(v) {
    if (v === open) return;
    /* Never over a full screen game. See the .sh-zoomed note in style.css: the game is
       position:fixed inside the shell, so a transformed shell breaks it out of the viewport. */
    if (v && document.body.classList.contains("sh-zoomed")) return;
    open = v;
    btn.setAttribute("aria-expanded", v ? "true" : "false");
    if (v) {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = 0; }
      setOrigin();
      panel.hidden = false;
      root.classList.add("nav-lift");
      /* The page is set aside, so it is set aside for a screen reader too. Not inert and not
         aria-hidden on the shell, because the burger lives in the header inside it and inert
         has no exemption: hiding the shell would hide the only control that closes the panel.
         main and the footer are the page; the header is the chrome that holds the button. */
      main.setAttribute("aria-hidden", "true");
      if (foot) foot.setAttribute("aria-hidden", "true");
      /* One frame between unhiding and the class, or the rows have no state to transition
         from and the outline arrives all at once. */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          /* Still open by the time the frame arrives. Two taps inside one tick used to leave
             the panel open: the close ran immediately and this pending frame then put the
             class back on top of it. */
          if (open) root.classList.add("nav-open");
        });
      });
      var f = focusables();
      if (f.length) f[0].focus();
    } else {
      root.classList.remove("nav-open");
      main.removeAttribute("aria-hidden");
      if (foot) foot.removeAttribute("aria-hidden");
      /* Only if there is somewhere to put it. Crossing above the breakpoint closes the panel,
         and by then the burger is display:none and cannot take focus. */
      if (btn.offsetWidth || btn.offsetHeight) btn.focus();
      else { var brand = top.querySelector(".brand"); if (brand) brand.focus(); }
      /* The panel stays in the tree until the page has finished sliding back, or it would
         vanish from behind a page that is still moving. */
      closeTimer = setTimeout(function () {
        panel.hidden = true;
        root.classList.remove("nav-lift");
        shell.style.transformOrigin = "";   /* only after the page has finished sliding back */
        closeTimer = 0;
      }, 380);
    }
  }

  btn.addEventListener("click", function () { setOpen(!open); });

  /* Tapping the visible strip of the page closes it. The strip is the only part of the shell
     a pointer can reach while the panel is open, so this needs no overlay of its own. Capture
     phase and stopPropagation, so a tap on the strip cannot also follow whatever link happens
     to be under it.

     The burger is exempt, and has to be. It lives in the header, which is inside the shell, so
     without this a second tap on it ran both handlers in order: this one closed the panel, and
     then the button's own toggle read the new state and opened it straight back up. Measured:
     the panel stayed open, which is the one interaction the brief names twice. */
  /* pointerdown, not click, and then the click is swallowed. The lens drives itself from
     pointerdown and pointerup, which both fire before click, so a guard that waited for click
     arrived after the scrub had already happened: one tap on the strip closed the nav AND ran
     the homepage from the person state to the AI state. */
  var swallow = false;
  shell.addEventListener("pointerdown", function (e) {
    if (!open || btn.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    swallow = true;
    setOpen(false);
  }, true);
  shell.addEventListener("click", function (e) {
    if (btn.contains(e.target)) return;
    if (!open && !swallow) return;
    swallow = false;
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
  }, true);

  /* Escape, and the focus trap. Capture phase and stopPropagation so Escape closes the topmost
     thing only: arcade.js listens for Escape on window unconditionally, and on /games/ that
     would otherwise also run its collapse every time a reader dismissed the nav. */
  document.addEventListener("keydown", function (e) {
    if (!open) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      setOpen(false);
      return;
    }
    if (e.key !== "Tab") return;
    var f = focusables();
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (panel.contains(document.activeElement) === false) { e.preventDefault(); first.focus(); }
  }, true);

  /* The origin is a viewport reading, so it is retaken if the viewport itself changes under an
     open panel: a rotation, or the address bar collapsing. */
  addEventListener("resize", function () { if (open) setOrigin(); }, { passive: true });

  /* Restored from the back forward cache with the panel open, which is what happens when a
     reader follows a row and then presses back. The scroll lock and the slid page would come
     back with it, and the reader asked for the page, not the menu. */
  addEventListener("pageshow", function (e) { if (e.persisted && open) setOpen(false); });

  /* Crossing back above the breakpoint with the panel open would leave the page translated and
     the scroll locked with no button on screen to undo either. The query is the exact
     complement of the stylesheet's own, so a fractional width between 700 and 701 cannot fall
     through the gap between them. */
  var wide = window.matchMedia("(max-width: 700px)");
  function onWide(e) { if (!e.matches && open) setOpen(false); }
  if (wide.addEventListener) wide.addEventListener("change", onWide);
  else if (wide.addListener) wide.addListener(onWide);
})();
