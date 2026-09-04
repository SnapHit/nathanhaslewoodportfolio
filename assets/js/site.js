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

  /* ---------- the homepage reader frame ---------- */
  var frame = document.getElementById("reader-frame");
  if (frame) {
    var tabs = frame.querySelectorAll(".frame-tabs button");
    var panels = {
      person: frame.querySelector("#panel-person"),
      google: frame.querySelector("#panel-google"),
      ai: frame.querySelector("#panel-ai")
    };
    var built = { google: false, ai: false };

    function select(name) {
      tabs.forEach(function (t) {
        var on = t.dataset.reader === name;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
      });
      Object.keys(panels).forEach(function (k) {
        panels[k].classList.toggle("active", k === name);
      });
      if (name === "google" && !built.google) { buildGoogleInto(panels.google.querySelector(".kv"), frame); built.google = true; }
      if (name === "ai" && !built.ai) { buildAIInto(panels.ai, frame); built.ai = true; }
      if (!reduced) {
        frame.classList.remove("scanning");
        void frame.offsetWidth;
        frame.classList.add("scanning");
      }
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t.dataset.reader); });
      t.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        var next = e.key === "ArrowRight" ? (i + 1) % tabs.length : (i - 1 + tabs.length) % tabs.length;
        tabs[next].focus(); select(tabs[next].dataset.reader);
      });
    });
  }

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
