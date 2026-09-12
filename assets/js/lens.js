/* lens.js
   The machine reader lens. Loaded on /book/ and on the homepage, in two presentations of the
   same mechanism: a small fixed pill on /book/, and the reader frame itself on the homepage,
   where the frame IS the control and the whole page is the output.

   The reader pill opens a modal that DESCRIBES the page's machine reading. This instead
   turns the page itself into that reading, in place, without covering anything and without
   moving the reader out from under their own scroll position.

   One registered custom property carries the whole feature: --lens on <body>, 0 person,
   1 Google, 2 AI. CSS reads it and nothing else. This file only writes it, injects the
   annotations CSS cannot produce on its own, and keeps the reader anchored while the
   layout changes underneath them.

   Every value shown is read from the live DOM or the live document at runtime. The response
   header comes from a same origin fetch of this same URL, the way /colophon/ already does it,
   so the status and content type are the real ones rather than a description of them. If that
   fetch cannot run, the card says so instead of inventing numbers.

   With JavaScript off none of this exists: no control is built, .lens-host is never added, and
   every rule in the stylesheet is inert. The page renders exactly as it does today. */
(function () {
  "use strict";

  var body = document.body;
  var main = document.getElementById("main");
  if (!main) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var STATES = ["Person", "Google", "AI"];

  /* The text as it stood before this file touched anything. Compared later against the
     server's own HTML to establish whether the page really is rendered server side. */
  var pristineText = main.textContent.replace(/\s+/g, " ").trim();

  /* ---------------- small helpers ---------------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function bytes(n) {
    if (typeof n !== "number" || !isFinite(n) || n <= 0) return null;
    return n < 1000 ? n + " B" : (n / 1000).toFixed(1) + " kB";   /* kB is decimal */
  }

  /* Keep the host and the last path segment, drop the middle. */
  function shortUrl(a) {
    var u;
    try { u = new URL(a.getAttribute("href"), location.href); }
    catch (e) { return a.getAttribute("href") || ""; }
    if (u.protocol === "mailto:" || u.protocol === "tel:") return u.href;
    var segs = u.pathname.split("/").filter(Boolean);
    if (u.origin === location.origin) return u.pathname + (u.hash || "");
    var host = u.host.replace(/^www\./, "");
    if (!segs.length) return host;
    if (segs.length === 1) return host + "/" + segs[0];
    return host + "/…/" + segs[segs.length - 1];
  }

  /* ---------------- the audit ----------------
     The lens has to be able to show failure or it is decoration. These are the four checks,
     run against the live DOM, and whatever they return is what gets marked. Nothing is
     suppressed because it is inconvenient. */

  var VAGUE = ["here", "click here", "read more", "more", "this", "link", "learn more",
               "click", "read", "see more", "details"];
  var audit = { noAlt: 0, emptyAlt: 0, skips: 0, vague: 0 };

  function flag(level, text) {
    var f = el("span", "lens-flag" + (level === "warn" ? " warn" : ""), text);
    f.setAttribute("role", "note");
    return f;
  }

  function auditImage(img) {
    if (!img.hasAttribute("alt")) { audit.noAlt++; return flag("err", "no alt attribute"); }
    if (img.getAttribute("alt").trim() === "") {
      var decorative = img.getAttribute("role") === "presentation" ||
                       img.getAttribute("aria-hidden") === "true";
      if (!decorative) { audit.emptyAlt++; return flag("warn", "empty alt, not marked decorative"); }
    }
    return null;
  }

  /* ---------------- annotate the live page ---------------- */

  var headings = Array.prototype.slice.call(main.querySelectorAll("h1,h2,h3,h4,h5,h6"));
  var prevLevel = 0;
  headings.forEach(function (h) {
    var level = +h.tagName.slice(1);
    var tag = el("span", "lens-tag", h.tagName);          /* read from the real tag name */
    tag.setAttribute("aria-hidden", "true");
    h.insertBefore(tag, h.firstChild);
    if (prevLevel && level > prevLevel + 1) {
      audit.skips++;
      h.appendChild(flag("err", "skipped H" + (prevLevel + 1)));
    }
    prevLevel = level;
  });

  Array.prototype.forEach.call(main.querySelectorAll("a[href]"), function (a) {
    /* Read the label BEFORE the destination is appended. Appending first puts the URL inside
       the anchor, so "click here" reads as "click hereexample.com/.../c" and the check can
       never match: an auditor that silently stops finding things is worse than none. */
    var label = (a.textContent || "").replace(/\s+/g, " ").trim().toLowerCase()
                 .replace(/[.,:;!?→…]+$/g, "").trim();
    var href = el("span", "lens-href", shortUrl(a));
    href.setAttribute("aria-hidden", "true");
    a.appendChild(href);
    if (VAGUE.indexOf(label) !== -1) {
      audit.vague++;
      a.parentNode.insertBefore(flag("err", "link text is not descriptive"), a.nextSibling);
    }
  });

  Array.prototype.forEach.call(main.querySelectorAll("img"), function (img) {
    var wrap = el("span", "lens-fig");
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);
    var alt = img.getAttribute("alt");
    var box = el("span", "lens-alt");
    box.setAttribute("aria-hidden", "true");
    box.appendChild(el("b", null, "img alt"));
    box.appendChild(document.createTextNode(
      alt && alt.trim() ? alt : "(no alternative text on this image)"));
    wrap.appendChild(box);
    var f = auditImage(img);
    if (f) box.appendChild(f);
  });

  /* The chapter picker keeps working untouched. One note states what it is, counted live,
     rather than tagging every button: fifteen labels inside a 250px column only clip. */
  var picker = main.querySelector(".sampler");
  var spages = [];
  if (picker) {
    var nBtn = picker.querySelectorAll("button").length;
    spages = Array.prototype.slice.call(picker.querySelectorAll(".spage"));
    var note = el("div", "lens-navnote",
      nBtn + " buttons, no href. A crawler cannot follow these, and every one of the " +
      spages.length + " excerpts below is already in the HTML.");
    note.setAttribute("aria-hidden", "true");
    picker.insertBefore(note, picker.firstChild);
  }

  /* ---------------- the head material, and the response ---------------- */

  function kv(dl, k, v) {
    dl.appendChild(el("dt", null, k));
    var dd = el("dd");
    if (v instanceof Node) dd.appendChild(v); else dd.textContent = v;
    dl.appendChild(dd);
    return dd;
  }

  /* The same level check across the whole document, so the card can name what its own
     scope leaves out instead of appearing to have found nothing anywhere. */
  function outsideSkips() {
    var all = document.querySelectorAll("h1,h2,h3,h4,h5,h6");
    var prev = 0, n = 0;
    for (var i = 0; i < all.length; i++) {
      var lv = +all[i].tagName.slice(1);
      if (prev && lv > prev + 1 && !main.contains(all[i])) n++;
      prev = lv;
    }
    return n;
  }

  function buildHead() {
    var outer = el("div", "lens-head");
    var card = el("div", "lens-head-in");
    card.appendChild(el("span", "lens-cap", "In the head, invisible on the page"));
    var dl = el("dl", "lens-k");

    var desc = document.querySelector('meta[name="description"]');
    var canon = document.querySelector('link[rel="canonical"]');
    var og = document.querySelector('meta[property="og:image"]');
    kv(dl, "title", document.title);
    kv(dl, "description", desc ? desc.content : "(none)");
    kv(dl, "canonical", canon ? canon.href : "(none)");
    kv(dl, "lang", document.documentElement.lang || "(not set)");
    if (og) kv(dl, "og:image", og.content);
    card.appendChild(dl);

    var ld = document.querySelector('script[type="application/ld+json"]');
    if (ld) {
      var box = el("div", "lens-ld");
      try {
        var d = JSON.parse(ld.textContent);
        box.appendChild(el("b", null, "JSON-LD · " + (d["@type"] || "object") +
                                      " · " + (d["@context"] || "")));
        var l = el("dl", "lens-k");
        Object.keys(d).forEach(function (k) {
          if (k.charAt(0) === "@") return;
          var v = d[k];
          if (v && typeof v === "object") {
            v = v.name || v.url || (v["@type"] ? v["@type"] + (v.url ? " · " + v.url : "") : JSON.stringify(v));
          }
          kv(l, k, String(v));
        });
        box.appendChild(l);
      } catch (e) {
        box.appendChild(el("b", null, "JSON-LD present but did not parse"));
      }
      card.appendChild(box);
    }

    var total = audit.noAlt + audit.emptyAlt + audit.skips + audit.vague;
    var a = el("div", "lens-ld");
    a.appendChild(el("b", null, "Audit of main"));
    var al = el("dl", "lens-k");
    kv(al, "images without alt", String(audit.noAlt));
    kv(al, "empty alt, undeclared", String(audit.emptyAlt));
    kv(al, "heading level skips", String(audit.skips));
    kv(al, "vague link text", String(audit.vague));
    var v = kv(al, "result", total === 0 ? "nothing found" : total + " to look at");
    if (total === 0) v.className = "lens-clean";
    /* Scoped to main, so say so, and count what falls outside it rather than let a clean
       result imply a clean document. The sitewide footer runs h4 under an h2. */
    var outside = outsideSkips();
    kv(al, "outside main", outside === 0 ? "nothing" :
       outside + " heading skip" + (outside === 1 ? "" : "s") + " in the sitewide chrome");
    a.appendChild(al);
    card.appendChild(a);

    outer.appendChild(card);
    return { outer: outer, card: card };
  }

  function buildResp() {
    var outer = el("div", "lens-resp");
    var card = el("div", "lens-resp-in");
    card.appendChild(el("span", "lens-cap", "What the assistant received"));
    var dl = el("dl", "lens-k");
    card.appendChild(dl);
    outer.appendChild(card);

    var nav = (performance.getEntriesByType &&
               performance.getEntriesByType("navigation")[0]) || null;

    kv(dl, "url", location.origin + location.pathname);
    var statusDd = kv(dl, "status", "reading…");
    var typeDd = kv(dl, "content-type", "reading…");
    if (nav) {
      var over = bytes(nav.transferSize), dec = bytes(nav.decodedBodySize);
      kv(dl, "transfer", (over ? over + " over the wire" : "not exposed") +
                         (dec ? ", " + dec + " decoded" : ""));
      kv(dl, "protocol", nav.nextHopProtocol || "(not exposed)");
    }
    kv(dl, "characters of text", pristineText.length.toLocaleString("en-AU"));
    var ssrDd = kv(dl, "rendered", "checking…");

    /* Same origin, same URL, the way /colophon/ already does it. The point is not to describe
       the response but to read it, then compare the server's own HTML against what is on
       screen: if the text is already there, the page is rendered server side and this can say
       so as a measurement rather than a claim. */
    if (location.protocol.indexOf("http") === 0) {
      fetch(location.pathname, { headers: { Accept: "text/html" } })
        .then(function (r) {
          statusDd.textContent = r.status + " " + (r.statusText || "");
          typeDd.textContent = r.headers.get("content-type") || "(not exposed)";
          return r.text();
        })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, "text/html");
          var served = doc.getElementById("main");
          var servedText = served ? served.textContent.replace(/\s+/g, " ").trim() : "";
          var share = pristineText.length ? servedText.length / pristineText.length : 0;
          ssrDd.textContent = share >= 0.99
            ? "server side. " + servedText.length.toLocaleString("en-AU") +
              " characters were already in the HTML, before any script ran"
            : "only " + Math.round(share * 100) + "% of the text was in the HTML";
          if (share >= 0.99) ssrDd.className = "lens-clean";
          measure();
        })
        .catch(function () {
          statusDd.textContent = "not readable in this environment";
          typeDd.textContent = document.contentType || "(unknown)";
          ssrDd.textContent = "could not re-read this URL to check";
          measure();
        });
    } else {
      statusDd.textContent = "not readable over " + location.protocol;
      typeDd.textContent = document.contentType || "(unknown)";
      ssrDd.textContent = "needs http to re-read this URL";
    }
    return { outer: outer, card: card };
  }

  var head = buildHead();
  var resp = buildResp();
  /* Wrapped, because every other block on this page lives in a .wrap and main itself has no
     width or padding of its own. Inserted bare they ran the full 1280px and the metadata
     values broke mid word against both screen edges at 390px. */
  function wrapped(node) {
    var w = el("div", "wrap");
    w.appendChild(node);
    node.__wrap = w;
    return w;
  }
  main.insertBefore(wrapped(head.outer), main.firstChild);
  main.insertBefore(wrapped(resp.outer), main.firstChild);

  /* ---------------- the wave ----------------
     Index the content blocks in document order and hand each one its place in the wave, so
     the change reads as something passing down the page. Because the offset is applied to the
     value rather than to an animation, a drag held halfway holds the wave halfway. */
  /* Found here rather than beside the control it becomes, because the block indexing below
     has to know whether this page's control is the frame. */
  var frame = document.getElementById("reader-frame");
  var frameTabs = frame && frame.querySelector(".frame-tabs");

  var blocks = Array.prototype.slice.call(main.querySelectorAll("section > .wrap > *"));
  /* The homepage's frame is one of those blocks, and blocks get filter:grayscale. That would
     put a filter on an ancestor of the control, which the stylesheet says never happens for a
     good reason, and it drained the three reader dots of the colour that is the whole point of
     them: measured 0 saturation on all three in both machine states. The frame's body carries
     the index instead, so the panel greys with the page and the control does not. */
  if (frameTabs) {
    var fi = blocks.indexOf(frame);
    var fbody = frame.querySelector(".frame-body");
    if (fi > -1 && fbody) blocks[fi] = fbody;
  }
  blocks.unshift(head.outer);
  blocks.unshift(resp.outer);
  blocks.forEach(function (b, i) {
    b.setAttribute("data-lens-i", i);
    b.style.setProperty("--li", blocks.length > 1 ? (i / (blocks.length - 1)).toFixed(4) : 0);
  });

  /* Card heights are measured, not guessed, so the reveal interpolates to the exact size. */
  /* offsetHeight stops at the border box, but the card carries a bottom margin that the
     outer element's overflow:hidden would otherwise crop. */
  function cardH(card) {
    var m = parseFloat(getComputedStyle(card).marginBottom) || 0;
    return card.offsetHeight + m;
  }

  function measure() {
    head.outer.style.setProperty("--lens-head-h", cardH(head.card) + "px");
    resp.outer.style.setProperty("--lens-resp-h", cardH(resp.card) + "px");
    /* Twelve excerpts appearing at a threshold is a jump cut, and display cannot be
       interpolated. So their real heights are measured here and the reveal is driven by the
       same value as everything else, which makes the unfolding continuous and lets a drag
       hold it half open.

       Measured IN FLOW, in the same box that will render. Taking the measurement out of flow
       with position:absolute and width:100% resolved the width against .sampler-stage's
       padding box rather than the content box the excerpt actually occupies: 348px against
       306px at 390px wide, which under-measured by 132px and clipped every excerpt mid
       sentence. box-sizing is border-box globally, so the measuring class also carries the
       open state's own padding and border, or that chrome eats a further 26.6px of text. */
    /* Forced inline and important, because the rules being overridden here are five classes
       deep and a measuring class simply lost to them: the measurement then read back the
       already driven height and compounded the very clipping it was meant to remove. */
    var MEASURE = [["display", "flex"], ["flex-direction", "column"], ["height", "auto"],
                   ["min-height", "0"], ["overflow", "visible"], ["position", "static"],
                   ["padding-top", "1.6rem"], ["border-top", "1px solid transparent"],
                   /* with the annotations at full width: the injected heading tag and link
                      destinations grow with --g, and on the longest heading that tag is what
                      tips it onto a second line. Measured collapsed, the box is a line short
                      exactly when the annotation arrives to fill it. */
                   ["--g", "1"]];
    spages.forEach(function (p) {
      MEASURE.forEach(function (d) { p.style.setProperty(d[0], d[1], "important"); });
    });
    spages.forEach(function (p) {
      /* every panel, including the current one: the picker moves .cur on arrow keys as well
         as clicks, and a panel that became non current without a measurement would collapse
         to a 27px sliver of its own padding. */
      p.style.setProperty("--sp-h", p.offsetHeight + "px");
    });
    spages.forEach(function (p) {
      MEASURE.forEach(function (d) { p.style.removeProperty(d[0]); });
    });
  }

  /* ---------------- the control, in one of two presentations ----------------
     The mechanism is identical on every page: one registered custom property, the same three
     states, the same tween, keyboard and announcements. Only the object you touch differs.
     On the homepage the reader frame IS the control, large and in the flow, because that page's
     job is to teach the interaction that turns up as a small floating pill everywhere else.
     Two presentations of one lens, not two lenses. */
  var ctl, track, thumb, stops;

  if (frameTabs) {
    /* The frame's own row of stops becomes the slider. They arrive as spans carrying
       .frame-tab, which is the markup's own presentation for the no-JavaScript case; taking
       that class off is what hands them over, so the two rule sets never both apply. The row
       itself takes the slider role, and nothing inside it is focusable, because a slider with
       focusable children is two keyboard models fighting over one object. */
    track = frameTabs;
    stops = Array.prototype.slice.call(frameTabs.querySelectorAll(".frame-tab"));
    stops.forEach(function (sp, i) {
      sp.className = "lens-stop lens-stop-" + i + " frame-stop";
      sp.setAttribute("aria-hidden", "true");
      sp.removeAttribute("data-current");
    });
    thumb = el("div", "frame-thumb");
    thumb.setAttribute("aria-hidden", "true");
    frameTabs.insertBefore(thumb, frameTabs.firstChild);
    /* The invite reads "Move this", which is only true once this code has run. The class is
       what makes that sentence appear, so with JavaScript off the frame is a still picture of
       three readers and never asks for a gesture it cannot receive. */
    frame.classList.add("frame-live");
    /* The dark ground the page crosses to. Built here rather than with the particle field,
       because the field returns early when three.js is missing or reduced motion is asked for
       and the palette crosses over on all three paths regardless. Ahead of the field in
       z-index, not in DOM order, so it does not matter which file appends first. */
    var ground = el("div", "lens-ground");
    ground.setAttribute("aria-hidden", "true");
    body.appendChild(ground);
    ctl = frame;
  } else {
    ctl = el("div", "lens-ctl");
    track = el("div", "lens-track");
    thumb = el("div", "lens-thumb");
    thumb.setAttribute("aria-hidden", "true");
    track.appendChild(thumb);
    STATES.forEach(function (name, i) {
      /* Numbered explicitly. nth-child counted the thumb, which is appended first, so the
         three dots were each one reader out and the AI dot fell off the end into the grey
         fallback. */
      var sp = el("span", "lens-stop lens-stop-" + i);
      sp.setAttribute("aria-hidden", "true");
      sp.appendChild(el("i", "lens-dot"));
      sp.appendChild(document.createTextNode(name));
      track.appendChild(sp);
    });
    ctl.appendChild(track);
    body.appendChild(ctl);               /* a child of body: no ancestor carries a filter */
    stops = Array.prototype.slice.call(track.querySelectorAll(".lens-stop"));
  }

  track.tabIndex = 0;
  track.setAttribute("role", "slider");
  track.setAttribute("aria-label", "Read this page as a person, as Google, or as an AI assistant");
  track.setAttribute("aria-valuemin", "0");
  track.setAttribute("aria-valuemax", "2");

  /* ---------------- state ---------------- */

  var value = 0, raf = 0, settleRaf = 0, anchor = null, anchorTop = 0;
  var gen = 0;              /* one ticket per gesture, so stale chains cannot interfere */
  var cardsOpen = true, spoken = "";
  var target = 0;           /* where the current tween is going, which is what a key press steps from */

  /* The reader must not be moved. Before each write, note where a block currently sits in the
     viewport; after it, put it back. Thirteen excerpts opening above the fold would otherwise
     throw the page down by several screens. */
  /* The anchor has to be a leaf, not a block. Pinning the top of the sampler keeps the sampler
     where it is while its own contents grow underneath the reader: measured at 405px of drift
     entering the AI state, because the font change reflows every paragraph above the one being
     read. Pinning the actual paragraph at the top of the viewport holds the words still. */
  function grabAnchor() {
    anchor = null;
    /* The deepest element actually painted under the reader's eye, not the first block that
       happens to overlap the viewport. Pinning an outer block leaves everything that grows
       inside it free to push the words the reader is on: measured at 405px entering the AI
       state. elementFromPoint lands on the paragraph itself. */
    var x = Math.round(innerWidth / 2), y = Math.round(Math.min(140, innerHeight * 0.22));
    /* The text under that point, not the box painted there. elementFromPoint returns the
       article itself when the pixel lands on its padding, and pinning the article holds the
       article while its own headings and font grow inside it, which is the same failure as
       pinning the sampler. The caret APIs resolve to the actual text node. */
    var e = null, r;
    if (document.caretRangeFromPoint) {
      r = document.caretRangeFromPoint(x, y);
      e = r && r.startContainer;
    } else if (document.caretPositionFromPoint) {
      r = document.caretPositionFromPoint(x, y);
      e = r && r.offsetNode;
    }
    if (e && e.nodeType === 3) e = e.parentElement;
    if (!e || !main.contains(e)) e = document.elementFromPoint(x, y);
    while (e && e !== document.body && !main.contains(e)) e = e.parentElement;
    if (!e || !main.contains(e)) {
      var els = main.querySelectorAll("p, li, h1, h2, h3, figure");
      for (var i = 0; i < els.length; i++) {
        var r = els[i].getBoundingClientRect();
        if (r.height > 0 && r.bottom > 0) { e = els[i]; break; }
      }
    }
    if (e && main.contains(e)) { anchor = e; anchorTop = e.getBoundingClientRect().top; }
  }

  function apply(v) {
    value = v;
    /* The page has actually left the person state, which is one of the three things this file
       counts as having used the lens. The other two are a key press the slider acts on and a
       drag that actually moved. What is NOT counted is a finger merely landing on the control:
       it is a full width bar in the middle of the hero and most of what lands on it is a scroll
       going past, and recording those would mean a visitor who has never used the lens never
       sees the attract again. */
    if (v > 0.02) { markUsed(); stopAttract(); }
    body.style.setProperty("--lens", v.toFixed(4));
    var wasAi = body.classList.contains("lens-ai");
    var isGoog = v >= 0.5, isAi = v >= 1.5;
    body.classList.toggle("lens-open", v > 0.0001);   /* at exactly 0 the page is untouched */
    body.classList.toggle("lens-goog", isGoog);
    body.classList.toggle("lens-ai", isAi);
    if (isAi !== wasAi) measure();       /* the snap changes the cards' natural height */
    /* Collapsed to nothing but still in the accessibility tree, the two cards were read out
       before the page in the person state: 29 static text nodes, 1,158 characters, in a state
       where the feature has not been used at all. They come back the moment they open. */
    var open = v > 0.02;
    if (open !== cardsOpen) {
      cardsOpen = open;
      [head.outer, resp.outer].forEach(function (c) {
        if (open) c.removeAttribute("aria-hidden"); else c.setAttribute("aria-hidden", "true");
      });
    }

    /* Announced on arrival at a stop, not on every one of the roughly 37 frames of a
       transition, which gave a screen reader a stream of values nobody asked for. */
    var near = Math.round(v);
    var settled = Math.abs(v - near) < 0.02;
    var word = settled ? STATES[near]
      : "between " + STATES[Math.floor(v)] + " and " + STATES[Math.ceil(v)];
    if (word !== spoken) {
      spoken = word;
      track.setAttribute("aria-valuenow", String(settled ? near : v.toFixed(2)));
      track.setAttribute("aria-valuetext", word);
      Array.prototype.forEach.call(stops, function (s, i) {
        s.setAttribute("aria-pressed", i === near ? "true" : "false");
      });
    }
    dispatchEvent(new CustomEvent("lens:change", { detail: { value: v } }));
    if (anchor) {
      /* Pinned to where the anchor started, not nudged by this frame's delta. A per frame
         delta lets error accumulate: anything that moves the page between two frames, a font
         swapping in or a measurement landing, is never recovered and the reader ends up
         hundreds of pixels from where they were. Restoring an absolute offset is self
         correcting, so a bad frame costs nothing by the next one. */
      var d = anchor.getBoundingClientRect().top - anchorTop;
      /* Instant, and with smooth scrolling suspended on <html> for the duration. The stylesheet
         sets scroll-behavior:smooth globally, which animates every one of these corrections;
         at sixty frames a second each new one cancels the last and none of them ever land, so
         the reader gets dragged hundreds of pixels down the page instead of held still. */
      if (Math.abs(d) > 0.5) window.scrollBy({ top: d, left: 0, behavior: "instant" });
    }
  }

  var root = document.documentElement;
  function holdScroll(on) { root.classList.toggle("lens-anchoring", on); }

  function tweenTo(to) {
    cancelAnimationFrame(raf);
    cancelAnimationFrame(settleRaf);
    var ticket = ++gen;
    target = to;
    grabAnchor();
    holdScroll(true);
    if (reduced) { apply(to); settle(2, ticket); return; }
    var from = value, t0 = performance.now(), dur = 620;
    raf = requestAnimationFrame(function step(now) {
      if (ticket !== gen) return;
      var p = Math.min(1, (now - t0) / dur);
      var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      apply(from + (to - from) * e);
      if (p < 1) raf = requestAnimationFrame(step);
      else settle(3, ticket);
    });
  }

  /* A few frames after the value lands, hold the anchor again. The snap into monospace
     reflows the whole document and some of that arrives a frame late, so the last correction
     inside the tween can miss it. These put the reader back on the line they were reading. */
  /* Every gesture takes a ticket. A settle chain left over from the previous one would
     otherwise reach zero in the middle of the next tween and run anchor = null with
     holdScroll(false), switching anchoring off and smooth scrolling back on mid transition:
     measured at 216px of drift when a second stop was tapped about 620ms after the first. */
  function settle(n, ticket) {
    if (ticket !== gen) return;
    if (!anchor || n <= 0) { anchor = null; holdScroll(false); return; }
    settleRaf = requestAnimationFrame(function () {
      if (ticket !== gen) return;
      if (!anchor) { holdScroll(false); return; }
      var d = anchor.getBoundingClientRect().top - anchorTop;
      if (Math.abs(d) > 0.5) window.scrollBy({ top: d, left: 0, behavior: "instant" });
      settle(n - 1, ticket);
    });
  }

  /* ---------------- pointer: tap to a stop, drag to scrub ---------------- */

  /* A drag maps against the rectangle the gesture started with, not the live one. The
     homepage's control is in the flow, inside the hero's .wrap, and the AI state narrows every
     .wrap to 74ch: crossing that threshold mid drag moved the track 183px sideways and 218px
     down under the finger, and because this read the live rect the same pointer position that
     meant 1.54 a frame earlier now meant 1.85. Everything above about 1.6 was unreachable.
     A tap still measures against the live rect, which is what a tap should do. */
  var dragRect = null;
  function valueAt(clientX) {
    var r = dragRect || track.getBoundingClientRect();
    if (!r.width) return value;
    /* the thumb is a third wide, so its centre travels between 1/6 and 5/6 of the track */
    var v = ((clientX - r.left) / r.width - 1 / 6) * 3;
    return Math.max(0, Math.min(2, v));
  }

  var dragging = false, moved = false, downX = 0, downY = 0, locked = false;

  /* A finger that starts on the control is not necessarily reaching for it. The homepage's
     control is a full width bar in the middle of the hero, so the first thing a reader is
     likely to do on it is scroll past it. Touch therefore waits: the gesture belongs to the
     browser until it proves itself sideways, and the moment it proves itself vertical this
     lets go of it completely. Without that, an upward swipe anywhere on the bar scrolled
     nothing, because every frame of it was scrubbing the lens and the anchor was dutifully
     putting the page back where it found it. A mouse or a pen commits immediately: those have
     no scroll gesture to be confused with. */
  function abandonDrag() {
    dragging = false; locked = false; dragRect = null;
    ctl.classList.remove("dragging");
    anchor = null;
    holdScroll(false);
  }

  track.addEventListener("pointerdown", function (e) {
    /* First, before anything reads geometry. The attract is a transform on the thumb, and a
       reader who has taken hold of it must see it where --lens says it is, not 30px along.
       This ends the attract for this page load and does not record anything, which is the right
       pair: a gesture that turns out to be a scroll still had a finger on the control, so
       nudging at it again would be rude, and it still was not a use, so the next visit starts
       clean. markUsed is left to pointermove, the keyboard and the value itself. */
    stopAttract();
    dragging = true; moved = false; downX = e.clientX; downY = e.clientY;
    locked = e.pointerType !== "touch";
    dragRect = track.getBoundingClientRect();
    ctl.classList.add("dragging");
    cancelAnimationFrame(raf);
    cancelAnimationFrame(settleRaf);
    gen++;
    grabAnchor();
    holdScroll(true);
    /* Captured either way, so a tap that never moves still reaches pointerup here rather than
       being cancelled out from under itself. preventDefault is for the mouse only: on touch it
       is touch-action and the direction test below that decide, not this. */
    track.setPointerCapture(e.pointerId);
    if (locked) e.preventDefault();
  });

  track.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - downX, dy = e.clientY - downY;
    if (!locked) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) { abandonDrag(); return; }
      if (Math.abs(dx) > 8) locked = true;
      else return;
    }
    if (Math.abs(dx) > 3) { moved = true; markUsed(); }
    if (!moved) return;
    if (reduced) { target = Math.round(valueAt(e.clientX)); apply(target); return; }
    target = valueAt(e.clientX);
    apply(target);
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false; locked = false;
    ctl.classList.remove("dragging");
    var target = Math.round(moved ? value : valueAt(e.clientX));
    dragRect = null;
    anchor = null;
    tweenTo(target);
    track.focus();
  }
  track.addEventListener("pointerup", endDrag);
  /* The browser cancels the pointer when it decides the gesture was a scroll after all. That
     is not a state change: only settle to a stop if the drag had actually started moving the
     value before it was taken away. */
  track.addEventListener("pointercancel", function () {
    if (!dragging) return;
    var wasMoved = moved;
    abandonDrag();
    if (wasMoved) tweenTo(Math.round(value));
  });

  track.addEventListener("keydown", function (e) {
    /* Stepped from the tween's destination, not its live value. Reading the live value meant
       a second press inside the 620ms tween recomputed the same nearest stop and went
       nowhere: two quick presses landed on Google, and holding the key never reached AI. */
    var k = e.key, near = Math.round(target), next = null;
    if (k === "ArrowRight" || k === "ArrowUp") next = Math.min(2, near + 1);
    else if (k === "ArrowLeft" || k === "ArrowDown") next = Math.max(0, near - 1);
    else if (k === "Home") next = 0;
    else if (k === "End") next = 2;
    else if (k === " " || k === "Enter") next = (near + 1) % 3;
    if (next === null) return;
    e.preventDefault();
    /* Recorded even when next is where we already are, an arrow left at the first stop for
       instance. A keyboard has no gesture that could be mistaken for a scroll, so a key the
       slider acts on is unambiguously somebody working the control. */
    stopAttract();
    markUsed();
    tweenTo(next);
  });

  /* ---------------- the attract ----------------
     The control is the whole point of this page, so once it is on screen it says so, once,
     the way the arcade cabinets' press to play card does on /games/. The thumb leans toward
     the next reader and settles back, twice, and then it is finished for this page load. It
     is finished for good only once the reader has actually used the control, which is what
     the stored flag is for: somebody who watched it and did nothing has not been answered,
     so they are asked once more next time rather than never again.

     Nothing here touches --lens. The value that drives the document is untouched, so the
     attract cannot flash the page, cannot move the reader, and cannot disagree with the
     scrub: the nudge is a transform on the thumb alone, and the drag maths measures the
     track, never the thumb.

     It only runs on the homepage, where the frame is the control. The pill on /book/ is a
     fixed object at the bottom of the viewport that is already impossible to miss, and it
     appears on a page somebody is reading rather than one they are deciding to read. */
  var USED_KEY = "nh_lens_used";
  var used = false;
  try { used = !!localStorage.getItem(USED_KEY); } catch (e) {}

  function markUsed() {
    if (used) return;
    used = true;
    /* Remembered the same way the ducks gate on /games/ remembers a cleared run, so somebody
       who has already worked out what this does is never asked again. */
    try { localStorage.setItem(USED_KEY, "1"); } catch (e) {}
  }

  var attractIo = null, attractTimer = 0, attractDone = false;

  function stopAttract() {
    if (attractDone) return;
    attractDone = true;
    if (attractTimer) { clearTimeout(attractTimer); attractTimer = 0; }
    if (attractIo) { attractIo.disconnect(); attractIo = null; }
    /* Dropping the class drops the animation, and with it the transform, in the same frame.
       This repo has already shipped a stale animation frame that moved the reader 216px mid
       transition, so the attract is cancelled rather than left to play itself out. */
    ctl.classList.remove("lens-attract");
  }

  function startAttract() {
    if (frameTabs && !used && "IntersectionObserver" in window) {
      attractIo = new IntersectionObserver(function (entries) {
        if (attractDone) return;
        /* Gone again before it fired. The observer stays connected, so a reader who scrolls
           back gets the attract then rather than having spent it off screen. */
        if (!entries[entries.length - 1].isIntersecting) {
          if (attractTimer) { clearTimeout(attractTimer); attractTimer = 0; }
          return;
        }
        if (attractTimer) return;
        /* A moment after it arrives, not the instant it crosses the edge: firing during the
           scroll that brought it here is movement nobody attributes to the control. */
        attractTimer = setTimeout(function fire() {
          attractTimer = 0;
          if (attractDone) return;
          /* Not while the mobile nav is open. The page is translated 283px to the left behind
             the panel, so the whole control including the thumb is off screen and the frame is
             pointer-events:none, which means the attract would play out unseen and uncancellable
             and then be finished for good. The observer cannot catch this: instrumented, it
             reported the control still 86 per cent intersecting while its own rectangle read
             x -283, because the transform is composited and the intersection is not. So this is
             asked directly, and asked again rather than given up on. */
          if (root.classList.contains("nav-open")) { attractTimer = setTimeout(fire, 700); return; }
          attractIo.disconnect(); attractIo = null;
          ctl.classList.add("lens-attract");
        }, 1100);
      }, { threshold: 0.9 });     /* the whole control on screen, not an edge of it */
      attractIo.observe(track);
      /* Finished of its own accord: take the class off so nothing is left behind. Under
         reduced motion there is no animation and therefore no animationend, and that is
         exactly what leaves the static ring on until the control is used. */
      thumb.addEventListener("animationend", function (e) {
        if (e.animationName === "lens-nudge") stopAttract();
      });
    }
  }

  /* ---------------- go ---------------- */

  body.classList.add("lens-host");
  measure();
  apply(0);                              /* every visitor arrives in the person state */
  startAttract();
  addEventListener("resize", measure, { passive: true });
  /* Measured again once the webfonts are in. measure() first runs at DOMContentLoaded, when
     the page is still laid out in fallback metrics, and every height taken then is wrong by
     however much Instrument Sans and JetBrains Mono differ from it. */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure).catch(function () {});
  if (picker) picker.addEventListener("click", function () { setTimeout(measure, 0); });
})();
