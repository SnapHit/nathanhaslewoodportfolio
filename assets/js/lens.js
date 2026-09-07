/* lens.js
   The machine reader lens. Pilot, loaded on /book/ only.

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
    return n < 1024 ? n + " B" : (n / 1024).toFixed(1) + " kB";
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
    a.appendChild(el("b", null, "Audit of this page"));
    var al = el("dl", "lens-k");
    kv(al, "images without alt", String(audit.noAlt));
    kv(al, "empty alt, undeclared", String(audit.emptyAlt));
    kv(al, "heading level skips", String(audit.skips));
    kv(al, "vague link text", String(audit.vague));
    var v = kv(al, "result", total === 0 ? "nothing found in main" : total + " to look at");
    if (total === 0) v.className = "lens-clean";
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
  main.insertBefore(head.outer, main.firstChild);
  main.insertBefore(resp.outer, main.firstChild);

  /* ---------------- the wave ----------------
     Index the content blocks in document order and hand each one its place in the wave, so
     the change reads as something passing down the page. Because the offset is applied to the
     value rather than to an animation, a drag held halfway holds the wave halfway. */
  var blocks = Array.prototype.slice.call(main.querySelectorAll("section > .wrap > *"));
  blocks.unshift(head.outer);
  blocks.unshift(resp.outer);
  blocks.forEach(function (b, i) {
    b.setAttribute("data-lens-i", i);
    b.style.setProperty("--li", blocks.length > 1 ? (i / (blocks.length - 1)).toFixed(4) : 0);
  });

  /* Card heights are measured, not guessed, so the reveal interpolates to the exact size. */
  function measure() {
    head.outer.style.setProperty("--lens-head-h", head.card.offsetHeight + "px");
    resp.outer.style.setProperty("--lens-resp-h", resp.card.offsetHeight + "px");
    /* Twelve excerpts appearing at a threshold is a jump cut, and display cannot be
       interpolated. So their real heights are measured here and the reveal is driven by the
       same value as everything else, which makes the unfolding continuous and lets a drag
       hold it half open. Measured with the page briefly laid out, then put straight back. */
    spages.forEach(function (p) {
      if (p.classList.contains("cur")) { p.style.removeProperty("--sp-h"); return; }
      var prev = p.getAttribute("style") || "";
      p.style.cssText = prev + ";display:flex;flex-direction:column;height:auto;" +
                        "position:absolute;visibility:hidden;width:100%";
      var h = p.offsetHeight;
      p.setAttribute("style", prev);
      p.style.setProperty("--sp-h", h + "px");
    });
  }

  /* ---------------- the control ---------------- */

  var ctl = el("div", "lens-ctl");
  var track = el("div", "lens-track");
  track.tabIndex = 0;
  track.setAttribute("role", "slider");
  track.setAttribute("aria-label", "Read this page as a person, as Google, or as an AI assistant");
  track.setAttribute("aria-valuemin", "0");
  track.setAttribute("aria-valuemax", "2");
  var thumb = el("div", "lens-thumb");
  thumb.setAttribute("aria-hidden", "true");
  track.appendChild(thumb);
  STATES.forEach(function (name) {
    var s = el("span", "lens-stop");
    s.setAttribute("aria-hidden", "true");
    s.appendChild(el("i", "lens-dot"));
    s.appendChild(document.createTextNode(name));
    track.appendChild(s);
  });
  ctl.appendChild(track);
  body.appendChild(ctl);                 /* a child of body: no ancestor carries a filter */
  var stops = track.querySelectorAll(".lens-stop");

  /* ---------------- state ---------------- */

  var value = 0, raf = 0, anchor = null, anchorTop = 0;

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
    var y = Math.min(140, innerHeight * 0.22);
    var e = document.elementFromPoint(Math.round(innerWidth / 2), Math.round(y));
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
    body.style.setProperty("--lens", v.toFixed(4));
    var wasAi = body.classList.contains("lens-ai");
    var isGoog = v >= 0.5, isAi = v >= 1.5;
    body.classList.toggle("lens-open", v > 0.0001);   /* at exactly 0 the page is untouched */
    body.classList.toggle("lens-goog", isGoog);
    body.classList.toggle("lens-ai", isAi);
    if (isAi !== wasAi) measure();       /* the snap changes the cards' natural height */
    var near = Math.round(v);
    track.setAttribute("aria-valuenow", String(v.toFixed(2)));
    track.setAttribute("aria-valuetext",
      Math.abs(v - near) < 0.02 ? STATES[near]
        : "between " + STATES[Math.floor(v)] + " and " + STATES[Math.ceil(v)]);
    Array.prototype.forEach.call(stops, function (s, i) {
      s.setAttribute("aria-pressed", i === near ? "true" : "false");
    });
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

  function tweenTo(target) {
    cancelAnimationFrame(raf);
    grabAnchor();
    holdScroll(true);
    if (reduced) { apply(target); settle(2); return; }
    var from = value, t0 = performance.now(), dur = 620;
    raf = requestAnimationFrame(function step(now) {
      var p = Math.min(1, (now - t0) / dur);
      var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      apply(from + (target - from) * e);
      if (p < 1) raf = requestAnimationFrame(step);
      else settle(3);
    });
  }

  /* A few frames after the value lands, hold the anchor again. The snap into monospace
     reflows the whole document and some of that arrives a frame late, so the last correction
     inside the tween can miss it. These put the reader back on the line they were reading. */
  function settle(n) {
    if (!anchor || n <= 0) { anchor = null; holdScroll(false); return; }
    requestAnimationFrame(function () {
      if (!anchor) { holdScroll(false); return; }
      var d = anchor.getBoundingClientRect().top - anchorTop;
      if (Math.abs(d) > 0.5) window.scrollBy({ top: d, left: 0, behavior: "instant" });
      settle(n - 1);
    });
  }

  /* ---------------- pointer: tap to a stop, drag to scrub ---------------- */

  function valueAt(clientX) {
    var r = track.getBoundingClientRect();
    if (!r.width) return value;
    /* the thumb is a third wide, so its centre travels between 1/6 and 5/6 of the track */
    var v = ((clientX - r.left) / r.width - 1 / 6) * 3;
    return Math.max(0, Math.min(2, v));
  }

  var dragging = false, moved = false, downX = 0;

  track.addEventListener("pointerdown", function (e) {
    dragging = true; moved = false; downX = e.clientX;
    ctl.classList.add("dragging");
    track.setPointerCapture(e.pointerId);
    cancelAnimationFrame(raf);
    grabAnchor();
    holdScroll(true);
    e.preventDefault();
  });

  track.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    if (Math.abs(e.clientX - downX) > 3) moved = true;
    if (!moved) return;
    if (reduced) { apply(Math.round(valueAt(e.clientX))); return; }
    apply(valueAt(e.clientX));
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    ctl.classList.remove("dragging");
    var target = Math.round(moved ? value : valueAt(e.clientX));
    anchor = null;
    tweenTo(target);
    track.focus();
  }
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", function () {
    dragging = false; ctl.classList.remove("dragging"); anchor = null; tweenTo(Math.round(value));
  });

  track.addEventListener("keydown", function (e) {
    var k = e.key, near = Math.round(value), next = null;
    if (k === "ArrowRight" || k === "ArrowUp") next = Math.min(2, near + 1);
    else if (k === "ArrowLeft" || k === "ArrowDown") next = Math.max(0, near - 1);
    else if (k === "Home") next = 0;
    else if (k === "End") next = 2;
    else if (k === " " || k === "Enter") next = (near + 1) % 3;
    if (next === null) return;
    e.preventDefault();
    tweenTo(next);
  });

  /* ---------------- go ---------------- */

  body.classList.add("lens-host");
  measure();
  apply(0);                              /* every visitor arrives in the person state */
  addEventListener("resize", measure, { passive: true });
  if (picker) picker.addEventListener("click", function () { setTimeout(measure, 0); });
})();
