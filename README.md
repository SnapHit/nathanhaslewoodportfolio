# nathanhaslewood.com.au · v1.17.0

Static site, built with AI assistance. No framework, no build step. Every file in this folder deploys as-is.

## Deploy to Netlify
Drag this folder (or the zip) onto Netlify's deploy area, then point nathanhaslewood.com.au at it under Domain management. Build command: none. Publish directory: root.

## Preview locally
Links are root-absolute, so use a server: python3 -m http.server 8000

## Design system
Instrument Sans for everything a person reads (weights 400 to 700), JetBrains Mono for the machine layer. Three-reader palette: signal orange, cobalt, green, fused in the spectrum bar, hero aurora, and bento accents. Tokens in /assets/css/style.css.

## Generated imagery (wired in v1.3)
Live: gen-hero.jpg + gen-hero-loop.mp4 (home hero, video hidden on mobile and for reduced-motion users, poster fallback), gen-work.jpg (/work/), gen-systems.jpg (/systems/), gen-book.jpg (/book/). The home page og:image is gen-hero.jpg.
Pending: gen-writing.jpg (4:3, /writing/): generate with the original prompt, same filename, and it wires in one line.
Optional upgrade: regenerate stills at 2400px+ wide for very large screens; current masters are 1408px.

## Contact policy
No email address anywhere by design. All contact routes to LinkedIn.

## Follow-ups
- OG share image (1200x630) per page.
- September 2026: KDP Select auto-renew OFF now; on lapse, publish full book text and change /book/ status line.
- Second book: 2027 edition live in full at /super/ (done in v1.9). Download assets refreshed in v1.9.1 (PDF now carries the cover as page 1). The bold-label '.:' artifact is still in the supplied PDF/EPUB (77 hits) and still corrected on the site pages only; fix it in the manuscript source on the next regeneration. Verification register sign-off still pending.
- Analytics: Netlify Analytics or Plausible only. GA contradicts the footer promise.
- BankVic case study after 6 to 12 months, with permission.

## v1.4
- Full second book live at /super/: hub + 10 chapters + appendices page, each with prev/next, a general-information disclaimer strip, and Book structured data on the hub. PDF and EPUB downloads sit in /super/.
- All generated imagery wired: hero (regenerated), book (regenerated), gobiz, credit-cards, land-use, writing, super.
- Neutral text pass: brand colour removed from all text glyphs (links, hovers, eyebrows, numerals, wordmark dots). Colour now lives in the spectrum bar, aurora, dots and imagery only.
- Per-page og:image set from the artwork. Footer links to Super sitewide; book page and home band cross-promote it.
- The verification register (delivered separately) lists every regulatory figure in the book awaiting Nathan's confirmation; patch the text after sign-off.

## v1.5 (final)
- Header nav set in Instrument Sans and now includes Super, matching the footer.
- Footer and colophon claims corrected: static HTML built with AI assistance, no framework, no tracking, no cookies.
- Work index rows aligned on a fixed three-column grid (the tag column no longer floats per row).
- Origin corrected: WordPress, not AEP/Braze, and reframed around researching, creating, building and publishing Origin's first-ever AI-generated web pages. Cascaded to about, are-you-ai and the LinkedIn pack.
- Six colleague testimonials added: a wall on /about/, one solo quote on the home page.
- Book PDF rebuilt properly: xelatex, Roboto Light 10pt, real table of contents with page numbers, every chapter starting on a new page. EPUB rebuilt with navigation ToC.

## v1.9
- Second book replaced with the fully rewritten 2027 edition (post-reform): hub + 14 chapters in five parts + appendices A to O, all regenerated from the new manuscript. Same URL scheme where chapters carried over (right-for-you, when-to-walk-away, rules, numbers, borrowing, buying-process, compliance, endgame); six new chapter URLs (new-landscape, commercial-for-residential-investors, asset-class-tour, business-premises, gst-duty-and-money, residential-with-cash).
- Retired /super/residential-vs-commercial/ and /super/what-and-where-to-buy/; 301s in the new _redirects file.
- New PDF (148pp print interior) and EPUB dropped in under the existing download filenames. New cover at /assets/img/super-cover-2027.jpg, shown on the /super/ hub (headgrid + cover-photo, same pattern as /book/).
- New /updates/ corrections-log page, because the 2027 edition's disclaimers and About-this-edition page point readers at nathanhaslewood.com.au/updates.
- Hub TOC grouped by part (.toc-part rule added to style.css). Sitemap, llms.txt and the /book/ cross-promo updated. Known manuscript artifact '<strong>Label.:</strong>' corrected to 'Label.' on the site pages only; it remains in the PDF/EPUB pending a regeneration pass.

## v1.9.1
- Download assets and cover refreshed, no content change. New PDF (149pp, cover embedded as page 1, 8.1 MB) and new EPUB dropped in under the existing filenames. Cover regenerated to /assets/img/super-cover-2027.jpg (800x1280) from the new master. Hub links and img src already pointed at these paths, so no HTML changed.
- Note: the supplied PDF/EPUB still contain the '<strong>Label.:</strong>' artifact (77 instances). It stays corrected on the site pages only until the manuscript source is fixed.

## v1.9.2
- Added a Games nav item (header and footer, sitewide) linking to novlr.com in a new tab, positioned after Super and before About. Only outbound nav item that opens in a new tab. Note: the extra nav item overflows the header's horizontal-scroll band between 721px and 824px; fix is to raise the nav media query in style.css from 720px to 860px (not yet done).

## v1.9.3
- Removed the rotating hero typeline on the homepage (the three cycling "reader one/two/three" sentences) and its JS. It was causing vertical layout shift as it typed and deleted. The static three-readers lede above it carries the same message. Dead CSS (.typeline/.tdot/.cursor) left in place, inert.
- Redacted a specific personal debt figure from the Build, Stabilise, Leverage sampler. The "$1.4 million in debt" line is in the risk-management excerpt ("The most uncertain week of my career", section four, page 191), not chapter 9. Changed to "Significant debt across our properties". The figure remains in the manuscript and will resurface if the full text is published in September, so fix it at source before then.
- Dialled Rankline down sitewide, pending the conflict-of-interest check against BankVic policy and public launch readiness. Removed: the hero "Founder, Rankline" line, the homepage product card (swapped for the autonomous-agent system), all rankline.ai hyperlinks, the contact-page "Advisory: the Rankline form" button and routing, the rankline.ai contact routing in are-you-ai and llms.txt, and rankline.ai from both JSON-LD sameAs arrays. Softened "launched 2026"/"my own product" framing to "early-stage ... run outside my employed work". Rankline still appears as a quiet, unlinked, factual mention in the about narrative, the systems page, two essays and the machine bios. Restore a single link when it's launch-ready and the conflict question is cleared.
- Not changed (flagged for a decision): the contact page's broader "advisory for hire" block, and the specific "truck and equipment finance brokers" market wording.

## v1.9.4
- Corrected the Origin Energy claim. Removed the assertion that the full electrification hub was delivered end to end (it was not). Kept what is accurate and now confirmed: from a blank brief, Nathan did the groundwork (research, IA, content, 20+ stakeholders), and created web pages from scratch with generative AI for the first time and published a number of them, Origin's first AI-generated web pages, taking generative content from an 80 to 90% publishable mockup to live production. Edited the work-page card body, the about-page prose, and the about-page timeline. The are-you-ai bullet was already accurate (it only claimed the AI pages, not the hub) and was left unchanged. LinkedIn pack updated to match.

## v1.9.5
- Renamed the second book from "How to Buy Property With Your Super" to "SMSF Property Investing" sitewide (title tags, H1, Book schema, prose, cross-promo, llms.txt, updates page). Case-sensitive replace: title-case title updated, the sentence-case hub H1 became "SMSF property investing", and the descriptive lowercase prose sentence in the right-for-you chapter ("...how to buy property with your super, we need to talk about whether you should") was deliberately left untouched. The manuscript text is unchanged; only the title and cover changed.
- Swapped the download assets for the new edition: PDF (149pp, cover embedded) and EPUB, both renamed to smsf-property-investing.pdf / .epub. Old filenames 301 to the new ones in _redirects. New cover regenerated to /assets/img/super-cover-2027.jpg (filename kept to avoid breaking the og:image; content updated).
- Added the Amazon edition: "Buy on Amazon" button on the hub (same-tab, matching the /book/ convention), a Kindle-and-paperback note, an Amazon mention in the /book/ cross-promo and llms.txt, a workExample in the hub Book schema, and a title-update entry on /updates/. Amazon URL: https://www.amazon.com.au/dp/B0HB3XTGJS/
- URL scheme unchanged: the book stays at /super/ with the same chapter slugs. Renaming the paths would have broken every deep link, citation and redirect for no real gain.
- OPEN ITEM: the book is still presented free in full on the site. If its Kindle edition is enrolled in Kindle Unlimited / KDP Select, that breaches Amazon's digital-exclusivity terms (the same rule that keeps Build, Stabilise, Leverage a 10% sampler). Either publish the SMSF Kindle wide, or cut the web version to a sample. Not resolved in this version, flagged to Nathan.

## v1.9.6
- Renamed the nav item "Games" to "Challenges" (header and footer, all 31 pages). Link unchanged: still novlr.com, new tab, rel=noopener, same position after Super and before About. The longer label widens the header slightly, so the pre-existing horizontal-scroll band now runs roughly 721px to 855px (was 721 to 824). The same unimplemented fix still clears it: raise the nav media query in style.css from 720px to 860px.

## v1.9.7
- Added a second external game link, "Beakdown" -> https://beakdown.fun (new tab, rel=noopener), in the header and footer of all 31 nav pages, positioned after Challenges and before About so the two game links sit together. Nav is now 9 items.
- WARNING, nav overflow is now a real problem, not a marginal one. With 9 items the header's hidden horizontal-scroll band spans roughly 721px to 955px, and the last item ("Are you AI?") is clipped off the right with no visible scrollbar. That band now includes 768px (iPad portrait) and common small-laptop widths. The one-line breakpoint fix still works but the value must rise with the item count: change the nav media query in style.css from max-width:720px to max-width:960px so the nav wraps to two rows instead of clipping. At 9+ items, consider a wrapping nav or a menu toggle rather than pushing the breakpoint higher each time. Still unimplemented per Nathan's standing direction.
- Note: at time of adding, beakdown.fun returns HTTP 503 (upstream TLS handshake failure between edge and origin), so the game was not serving yet. The link is correct; the deployment needs fixing host-side.

## v1.9.8
- Renamed the beakdown.fun nav label from "Beakdown" to "Game" (header and footer, all 31 pages). Link, new tab and position unchanged. Header is now: Work, Systems, Writing, Book, Super, Challenges, Game, About, Are you AI?. The shorter label narrows the header slightly, but it is still 9 items and the nav still clips its last item on a hidden horizontal scroll on mid widths (see v1.9.7 note); the max-width:720px to 960px breakpoint fix remains the recommendation, still unimplemented per Nathan.

## v1.9.9
- New page /games/ showcasing the two browser games, Beakdown (beakdown.fun) and Hurtle (hurtle.site), each with a cropped 21:9 screenshot (assets/img/game-beakdown.jpg, game-hurtle.jpg via the existing .artband treatment), a description drawn from each game's own site, and a Play button opening the game in a new tab. Built on the standard page template (skip link, pagehead, section-head, prose, dl-btn) plus one small CSS rule (.game-tag). Includes CollectionPage + VideoGame schema.
- Renamed the nav item "Game" to "Games" and repointed it from beakdown.fun (external, new tab) to the new internal /games/ page (same tab), header and footer, all 31 existing pages. beakdown.fun is now reached via the games page rather than directly from the nav. Challenges (novlr.com) is unchanged.
- Added /games/ to sitemap.xml and a Games section to llms.txt. Still 9 nav items, so the mid-width nav clip from v1.9.7 remains; breakpoint fix (720px to 960px) still the recommendation.

## v1.9.10
- Games page: reordered so Hurtle sits above Beakdown, and made each screenshot a link to its game (new tab), wrapping the artband img in an anchor. Added .artband a{display:block} plus a subtle scale/brightness hover so the images read as clickable. Updated og:image to the Hurtle shot and reordered the schema hasPart to match the new sequence. Only games/index.html and style.css changed.

## v1.10.0
- Replaced the hero's looping background video with a three.js WebGL particle field that changes mode with the three reader tabs: person (amber, organic drift), google (green, snaps to a grid lattice with connection lines), ai (violet, neural web with a magnetic pull toward the cursor). New file assets/js/background-canvas.js, exposing window.setReaderMode('person'|'google'|'ai').
- three.js r128 loaded from cdnjs in the head of index.html with defer, SRI (sha384) and crossorigin, so it cannot block first render and cannot be swapped under us. background-canvas.js loads deferred before the closing body tag; deferred scripts run in document order, so three.js is always ready first.
- The video element was removed. The .hero-media div stays as the canvas host and keeps its /assets/img/gen-hero.jpg background, which is now the fallback for reduced motion, a blocked CDN, or no WebGL.
- Mounting note: the supplied script mounted a position:fixed, z-index:-1 canvas on document.body. Tested and rejected. body has an opaque background (#fbfaf6) and .home .hero an opaque panel (#131109), so the canvas painted behind the hero and was invisible in exactly the region where the reader tabs sit. The canvas is instead absolutely positioned inside .hero-media, where the video was, and sized to the hero via ResizeObserver. The .hero-media::after contrast gradient still paints above it, so hero text contrast is unchanged.
- Changes to the supplied script, behavioural rather than cosmetic: honours prefers-reduced-motion on load and if toggled mid-session (the site claims this on /colophon/); returns silently if THREE or WebGL is unavailable; the per-frame Float32BufferAttribute allocation was replaced with a single preallocated buffer plus setDrawRange, since the original allocated a fresh typed array 60 times a second; squared-distance comparison instead of Math.sqrt in the O(n^2) link loop; segment cap of 2400; pauses when the tab is hidden; canvas is aria-hidden.
- Tab hookup uses a MutationObserver on the tabs' aria-selected rather than click handlers, so the background also follows the tablist's arrow-key navigation and stays decoupled from site.js. window.setReaderMode is still a global and no-ops when called with the already-current mode.
- OPEN ITEM: three.min.js r128 is 603 KB raw, 146 KB gzipped, from a third party. Every page footer says "Static HTML. No framework, no tracking, no cookies", and /colophon/ says "a handful of images, and inline SVG are the only assets". Both are now arguably false on the homepage. Either reword those two claims or reconsider the dependency. Flagged, not changed.

## v1.10.1
- Rebuilt the hero WebGL render layer. In v1.10.0 the effect was measurably invisible: only 1 to 2 per cent of background pixels changed between the three modes, and mean brightness and standard deviation were identical across all three (41/41/40, sd 62). After this pass the modes differ by 9 to 11 per cent of background pixels and are plainly distinct on screen.
- Root causes, all environmental rather than faults in the original script: gen-hero.jpg was still painted behind the transparent canvas and dominated the frame; two stacked overlay gradients at up to 95 per cent opacity crushed what was left; 180 particles at size 0.7 were far too sparse for a 1280x1100 hero; line opacity of 0.10 to 0.35 was invisible; and square point sprites with normal blending read as scattered pixels rather than an effect.
- Fixes: the hero photo is dropped once the canvas is live (.hero-media.webgl-on) and kept only as the no-WebGL and reduced-motion fallback; the overlay stays strong over the text column and eases to zero on the right; round soft sprites generated in-page on a 2D canvas, so no extra request; additive blending for glow; 380 particles at size 1.9; per-mode link thresholds; segment cap raised to 5000; snappier position and colour interpolation.
- Modes are now structurally distinct rather than just differently coloured: person is warm amber bokeh with no links, google snaps to a 22-column lattice with crisp connecting lines, ai is a dense violet neural web that clusters toward the cursor.
- Added an IntersectionObserver so rendering pauses when the hero leaves the viewport and resumes when it returns.
- Legibility verified by measuring the backdrop with the hero copy hidden: mean contrast against white text is 19.4:1, and the worst single pixel (a particle core directly behind a letter) is 4.9:1, both above the WCAG AA 4.5:1 threshold. Reduced motion, blocked CDN and mobile all re-verified.

## v1.11.0
- Rewrote the hero motion system. In v1.10.1 the field animated into formation over a second or two and then stopped: measured settled movement was 2.6px (person), 0px (google, literally frozen) and 0.9px (ai) over two seconds, and the only pointer interaction was a weak attraction in ai mode that lost 6:1 to the restoring lerp.
- Motion is now three independent layers, which is what allows a snappy mode transition and a highly responsive pointer at the same time; driving both through one position lerp forces a trade-off between them. base lerps toward the mode formation, drift is a continuous per-particle wander so the field never freezes, and repel is a springing displacement away from the pointer.
- Measured after the change: settled movement is 97px (person), 24px (google) and 31px (ai) over two seconds, so all three modes stay alive. Pointer repel displaces 35 to 50 particles by up to ~220px and the void tracks the pointer across the field; verified it recentres when the pointer moves from one side to the other.
- Repel now applies in all three modes, not just ai. Radius 14 world units, quadratic falloff, spring constant 0.18, so the void opens and closes smoothly. Links are built from final drawn positions, so the lattice and the neural web visibly distort around the pointer.
- Added touch support (touchstart, touchmove, touchend) so the effect is interactive on phones and tablets, which it previously was not at all. Added subtle camera parallax, and normalised all interpolation to a 60fps step so the animation does not run at double speed on 120Hz displays.
- Device-aware field: a narrow hero only shows a slim slice of the world, so below 700px the spread, particle count (200 rather than 380), segment cap and pixel ratio all scale down. Previously about 90 per cent of particles sat off-screen on a phone and were computed for nothing.
- Thinned the neural web (threshold 6.5 to 5.6), cutting ai from ~3720 to ~2650 segments per frame and reducing clutter over the copy.
- Contrast: the extra movement initially pushed the worst-case backdrop behind the hero copy to 3.1 to 4.1:1, below the WCAG AA 4.5:1 threshold. The overlay was reshaped to protect the text column to 50 per cent width and open up after 72 per cent. Re-measured over eight frames per mode: mean 19.4 to 19.7:1 and worst-case 7.3 to 10.4:1, comfortably above AA, with the right side of the hero left bright.
- Reduced motion, blocked CDN, no WebGL, touch and mobile fallbacks all re-verified with no console errors.

## v1.12.0
- Evidence over decoration on /work/. Removed the decorative artband (gen-work.jpg), which carried no information and pushed the case studies down the page: on a 390x844 phone the first case study sat at 778px, effectively at the fold. It now sits at 510px.
- Added an evidence visual to each of the eight case study rows, built from four reusable SVG primitives rather than eight bespoke graphics: delta (before and after, used for the credit card uplift and the Versa turnaround), rank (search position held over time, used for GoBiz), magnitude (a figure at scale, used for the chapter portfolio and the BAE organisation) and sequence (staged progress, used for Land Use Victoria, Origin and the home loan journeys). Variety comes from the data, not from inventing a new treatment per page.
- The visuals are inline SVG with no JavaScript, so they survive with JS disabled (verified: all eight still render) and stay parseable by the machine readers, consistent with the /colophon/ claim that turning JavaScript off loses the interactive demonstrations and not one word of content. The draw-on animation is CSS only and is fully disabled under prefers-reduced-motion (verified: all strokes render complete rather than stuck mid-animation).
- New .evi-cell wrapper: the row is a three-column grid, so adding the SVG as a fourth child initially pushed the metric label into the wrong cell. The visual and its label now share one cell, right-aligned on desktop and moved above the heading on mobile.
- Site-wide interaction craft: focus-visible rings on links and buttons, a considered row hover that shifts the heading and the evidence stroke to the deeper palette tone, and small lift transitions on buttons and cards. All disabled under reduced motion.
- Still to do from the agreed plan: the machine-reader lens (upgrading the existing "view this page as machines do" pill into the site's signature interaction) and the /about/ set piece. The same evidence treatment should also be applied to /systems/, where the first real content currently sits at 895px, below the fold on a phone.

## v1.13.0
- Rebuilt /work/ as an evidence wall. The v1.12 treatment was a garnish: 200px sparklines in the right margin restating what the caption already said. Each case study is now a band led by its metric at display scale (clamp up to 2.65rem), with an optional mono prefix carrying the lower bound of a range, a colour-coded range bar, and the story alongside.
- Ranges are shown as ranges. Most of Nathan's headline figures are honest ranges ($5m to $7.5m, 10 to 15%, $8.5m to $10.7m), so a count-up animation to a single number would imply a precision he has deliberately refused to claim. The prefix plus band pattern ("10 TO" above "15%", bar spanning 52 to 80 per cent) keeps the claim honest while giving the number presence.
- Motion is CSS scroll-driven (animation-timeline: view()), not JavaScript. It runs on the compositor thread and scrubs in both directions, so scrolling back up reverses the reveal. Verified: scaleX 0 to 0.28 to 0.55 to 0.83 to 1 scrolling down, and the identical values in reverse scrolling up.
- Page signature: the existing top spectrum rule (body::before) becomes a scroll progress indicator, dimmed to a track with a full-strength body::after fill driven by animation-timeline: scroll().
- Both guarded twice, by @supports (animation-timeline) and prefers-reduced-motion, so Firefox (still flagged as of 152) and reduced-motion users get the finished state rather than an element stuck at zero. Verified: bars full and figures visible under reduced motion, and all 8 figures and bars render with JavaScript disabled.
- BUG FIX, non-obvious: .section carried overflow:hidden, which establishes a scroll container, so view() timelines resolved to the section rather than the document and never activated. Changed to overflow:clip, which clips identically without creating a scroll container. This is the difference between the scroll choreography working and silently doing nothing anywhere on the site.
- BUG FIX: the v1.12 row restructure left a stray closing div in all 8 rows (a non-greedy regex stopped at the first </div> rather than the row close). Repaired; div and anchor counts now balance inside main.
- BUG FIX: .ev-fig and .ev-lab are paragraphs, so .row p (one class plus one element) beat them on specificity and the display figures rendered at body size. Selectors raised to .rows .ev-fig etc.
- Still to do: apply the same treatment to /systems/ (first content currently at 895px, below the fold on a phone), the machine-reader lens, and the /about/ set piece.

## v1.14.0
- Much bolder scroll choreography on /work/. v1.13 was underwhelming for two concrete reasons, both mine. The animation ranges (entry 6% to cover 34%) meant each reveal finished while the row was still in the bottom third of the viewport, so it was over before the reader looked at it. And the motion itself was opacity .16 to 1 over 9px of travel, which is not perceptible movement.
- Display figures are now split into per-character spans and rise individually from behind a mask, with a scroll-driven stagger: each character's animation-range is offset by 2.2% of the cover range via calc(), so the number assembles letter by letter with no JavaScript. Measured mid-scroll opacities across one figure: 0.5 0.4 0.3 0.2 0.1 0.0 0.0, a clear cascade.
- Retimed everything to play across the middle of the screen: the prefix slides in at cover 22%, characters run from cover 26% to 48% staggered, the bar draws at cover 36% to 60%, the label lands at 44%, and the body copy rises from cover 24%. Verified the sequence runs while the row travels from 56% to 33% down the viewport, and reverses exactly on scroll-up.
- Figures enlarged (clamp 2.4rem to 3.5rem, 2.9rem on mobile), bar thickened from 3px to 5px, column widened to 15rem.
- Per-character splitting is done in the markup, not by JavaScript, so the figures remain plain text to a crawler and render complete with JS off (verified: 8 figures, 32 characters, 8 bars).
- Fallbacks re-verified: under prefers-reduced-motion every character, bar and body block sits at full opacity and final position; @supports still guards Firefox.

## v1.15.0
- /systems/: replaced the static pipeline SVG with an interactive simulation, and removed the decorative artband. The SVG was a 760-unit viewBox squeezed into 300px on a phone, a 0.39 scale factor rendering the stage labels at 7px, and it sat 1506px down the page behind the artband. The simulation is vertical, legible at full size, and is now the first thing on the page.
- The simulation runs one article through the pipeline in front of the reader: topic discovery, voice profile, draft, critical review pass one, revision, critical review pass two, factual verification, publish. It autoplays once on entry and can be replayed.
- The content is not invented. The rejection is the leading slip-through pattern from Nathan's own AI content detection signals research (v2.1, section 14.2): an unfounded population claim of the collective-experience form, caught in production on the Inform Physio account. The narrative beat that matters is the second pass: the writer softens "nearly every" to "many" rather than removing the claim, and the independent editor catches the softening. That is straight from the research ("a writer that turns 'most homeowners don't realise' into 'many homeowners don't realise' has not solved the problem") and it is the behaviour that demonstrates governance rather than asserting it. The final state resolves to the auto-publish confidence tier from the CJD architecture spec.
- Degrades to a static, readable pipeline diagram with JavaScript off (verified: 8 stages listed, sentence visible), and reduced motion shortens the beats rather than animating.

## v1.16.0
- Nav: Games moved to third place, after Systems and before Writing, in the header and footer of all 32 pages. Four pages (systems, writing, and the two essays) needed a separate pass because their own nav item carries aria-current, which broke the match pattern.
- /games/ rebuilt as the SnapHit arcade, modelled on snap-hit.online: a hero cabinet plus three cabinets for Drift Fever, Hurtle and Beakdown, each with the marquee, screen, press-to-play coin and deck, and the studio counter block (games shipped, in development, ads served, sign-ups required, install size).
- The games are embedded live from snap-hit.online/play/*.html rather than copied in, so there is one source of truth and the portfolio never carries a stale build. Verified the demos send no X-Frame-Options or CSP frame-ancestors, so cross-origin framing is permitted.
- Click to play, not autoload. The four demos total about 1.9MB and Drift Fever alone is 1.5MB, which would be heavier than the rest of the site combined. Each cabinet holds its URL in data-src and only becomes a live iframe on press (verified: zero frames loaded on arrival). Starting a cabinet unloads the previous one, and scrolling a playing cabinet out of view unloads it, so audio never continues off screen and a phone never runs two games at once.
- BUG FIX: .cab-start sets display:flex, which overrides the user-agent [hidden]{display:none} rule, so the press-to-play overlay stayed on top of the running game. Added .cab-start[hidden]{display:none}.

## v1.16.1
- Repo preparation. Removed two unreferenced assets before first commit: gen-hero-loop.mp4 (2.6MB, orphaned since the WebGL hero replaced the looping video in v1.10.0) and game-beakdown.jpg (orphaned when /games/ became the arcade in v1.16.0). Added a .gitignore for OS, editor and local-tooling files.
- Note on licensing: this repo contains the full text of SMSF Property Investing and excerpts from Build, Stabilise, Leverage. Do not add an open-source licence. With no LICENSE file the default is all rights reserved, which is the intended position.

## v1.16.2
- /games/ closing paragraph corrected. It read "finished when you tap it", which said the opposite of what happens: a tap starts a game, it does not end it. Now reads "Every one starts the moment you tap it", with the no store, no download, no account line extended to "nothing to uninstall afterwards". Links to snap-hit.online and novlr unchanged. Text only, no CSS or JS touched.

## v1.17.0
- /games/ hero rebuilt to match snap-hit.online. The SnapHit demo is no longer inside a cabinet and no longer needs a tap to start: it loads on arrival and fills the viewport under the nav (100dvh minus header height). The page heading, studio counters and the three cabinets now sit below it.
- The way onward is gated. The game is framed from snap-hit.online and posts { snaphit: 'cleared' } to the parent with a wildcard target origin when a run is cleared, so the signal crosses origins. hero-game.js listens for it and reveals the More link. Cleared state is stored in localStorage, so a returning visitor is never gated twice. Verified: the More link goes from opacity 0 with pointer-events none to fully interactive on the cleared message, persists across reload, and a message forged from another origin is rejected.
- Deliberately not a scroll lock. The gate is the full-height hero plus a withheld affordance, the same as the source site. A hard scroll lock would be hostile and inaccessible.
- Three escape hatches so nobody is trapped: a keyboard-reachable skip link visible on focus, automatic reveal on first Tab press, and a 45 second timeout that reveals the link if the game fails to load or never signals. The markup also ships unlocked and JavaScript adds the lock, so with JS disabled the visitor gets a working link rather than a dead end.
- The hero frame parks itself (src removed) when scrolled out of view and restores on return, so the game is not running under the rest of the page.
