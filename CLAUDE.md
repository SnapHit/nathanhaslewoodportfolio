# CLAUDE.md

Guidance for Claude Code working in this repository.

## Git workflow

**Commit and push directly to `main`. Always.**

- Do not create branches.
- Do not open pull requests.
- Do not ask for permission to push. Just push.
- One commit per logical change, with a message that says what changed and why.

There is one maintainer and no review step. Branches and PRs create manual merge work for no benefit here.

Pushing to `main` deploys to production in about a minute. There is no staging. Verify before you push, not after. Git history is the rollback: if something breaks, revert the commit and push again.

## What this is

The personal portfolio and publishing site for Nathan Haslewood, at nathanhaslewood.com.au. It is a hand written static site. It also hosts the full text of one book and excerpts from another.

## Deployment

- **Host:** Cloudflare Workers static assets, auto deployed from `main`.
- **Config:** `wrangler.jsonc` at repo root.
- **Build command: none. No npm, no bundler, no framework, no build step.** Every file deploys exactly as committed.
- Cloudflare caches at the edge. After a deploy, a changed page may still serve stale for a while. That is caching, not a failed deploy. Purge in the dashboard before concluding something is broken.

### Cloudflare rules learned in production, do not undo these

- `wrangler.jsonc` **must** stay committed and **must not** be listed in `.assetsignore`. Excluding it breaks the build.
- **No `assets` binding and no `main`** in `wrangler.jsonc`. There is no Worker script. A binding without a script makes the build fail silently rather than erroring.
- `.assetsignore` is the **only** thing preventing `.git` from being served publicly. No Cloudflare setting does this. Keep `.git`, `.github`, `.wrangler`, `.gitignore`, `.assetsignore` and `README.md` in it.
- `workers_dev` and `preview_urls` are `false` deliberately. Turning them on serves the entire site again on a second indexable hostname.
- `_headers` and `_redirects` are read natively by Cloudflare. They are live configuration, not documentation.

## Absolute content rules

These are not stylistic preferences. Breaking them is a defect.

1. **No dashes of any kind.** No em dashes, no en dashes, no hyphens used as dashes. Restructure with full stops, commas, colons or separate sentences. This applies to prose, code comments, commit messages and documentation.
2. **Australian spelling** throughout. Optimise, colour, organisation, licence as a noun.
3. **Sentence case for headings and subheadings.** Not title case.
4. **Every factual claim must be defensible.** Numbers on this site are real and have been checked. Do not invent, round, extrapolate or "improve" a figure. Most headline metrics are honest ranges ($5m to $7.5m, 10 to 15 per cent). Never collapse a range to a single number, including in animations, because it implies a precision that has been deliberately refused.

## Non negotiable technical standards

Every interactive or animated feature must satisfy all four:

1. **Works with JavaScript disabled.** The site claims on `/colophon/` that turning JS off loses the interactive demonstrations and not one word of content. Verify this, do not assume it.
2. **Respects `prefers-reduced-motion`.** Reduced motion means the finished state, not a broken or mid animation state.
3. **Degrades where unsupported.** Scroll driven animations sit behind `@supports (animation-timeline: view())`. Without support the element must show its final state, never a state stuck at zero opacity or zero scale.
4. **Text contrast stays above WCAG AA (4.5:1).** Animated backgrounds behind text must be measured with the text hidden, worst case pixel, not eyeballed.

## Gotchas already paid for

Do not rediscover these.

- **`overflow: hidden` silently establishes a scroll container**, so `animation-timeline: view()` resolves to that element instead of the document and never fires. Use `overflow: clip`. This single property was the difference between the scroll choreography working and doing nothing.
- **Specificity:** `.row p` (one class plus one element) beats `.ev-fig` (one class). Component classes on paragraphs inside styled containers need a parent selector.
- **`display: flex` overrides the user agent `[hidden] { display: none }` rule.** Any element styled with a display value needs its own `[hidden]` rule.
- **Nav find and replace breaks on `aria-current`.** The current page's own nav item carries `aria-current="page"`, so a pattern matching the plain anchor misses those pages. Always verify nav changes across every page, not a sample.
- **Animation range timing:** an animation ending at `cover 34%` finishes while the element is still in the bottom third of the viewport, before the reader looks at it. Time reveals to run while the element crosses the middle of the screen.
- **Scale motion to be visible.** Opacity 0.16 to 1 over 9px of travel is not perceptible movement.

## Structure

```
/                     index.html plus robots.txt, sitemap.xml, llms.txt, _headers, _redirects, 404.html
/assets/css/          style.css, the single stylesheet, design tokens at the top
/assets/js/           site.js, background-canvas.js (hero WebGL), arcade.js, pipeline-sim.js
/assets/img/          all imagery
/work/ /systems/ /games/ /writing/ /book/ /super/ /about/ /contact/ /colophon/ /updates/ /are-you-ai/
/super/               the full text of SMSF Property Investing, 14 chapters plus appendices
```

Every page is a directory with an `index.html`. URLs keep trailing slashes.

## Do not break

- **The canonical hostname.** The apex serves the site, `www` 301s to it via a Cloudflare redirect rule. Do not add `www` as a second custom domain.
- **The four 301s in `_redirects`.** They cover retired book chapter URLs and renamed download filenames.
- **The machine layer.** `llms.txt`, `robots.txt`, `sitemap.xml` and `/are-you-ai/` are load bearing, not decoration. Adding a page means updating `sitemap.xml` and usually `llms.txt`.
- **`README.md`** is the changelog. Add an entry for every version, including what broke and why, not just what shipped.

## Licensing

This repo contains the full text of SMSF Property Investing and excerpts from Build, Stabilise, Leverage. **Do not add a LICENSE file.** With none, the default is all rights reserved, which is intended.

## Verifying work

This site has repeatedly shipped changes that were technically correct and visually invisible. Measure, do not assume:

- Serve locally with `python3 -m http.server 8000`. Links are root absolute, so opening files directly will not work.
- For visual or animation changes, check the rendered result at both 390px and 1280px before pushing.
- For animation, confirm it is visible while the element is on screen, not just that the CSS is attached.
