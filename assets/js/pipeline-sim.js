/* pipeline-sim.js
   Runs one article through the content engine in front of the reader.

   The content is not invented. The rejection is the leading slip-through pattern from
   Nathan's AI content detection signals research (v2.1, section 14.2): an unfounded
   population claim of the "collective experience" form, caught in production on the
   Inform Physio account. The second-pass behaviour is the one that matters: the writer
   softens rather than removes, and the independent editor catches the softening.

   Degrades to a static, readable pipeline diagram with JavaScript off. */
(function () {
  var root = document.querySelector('[data-sim]');
  if (!root) return;

  var elText = root.querySelector('[data-sim-text]');
  var elLabel = root.querySelector('[data-sim-doclabel]');
  var elVerdict = root.querySelector('[data-sim-verdict]');
  var elCaption = root.querySelector('[data-sim-caption]');
  var btn = root.querySelector('[data-sim-run]');
  var stages = Array.prototype.slice.call(root.querySelectorAll('[data-sim-stage]'));
  if (!elText || !btn || !stages.length) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* The caption exactly as the server sent it, read once rather than retyped, so a reset can
     put the card back to the document rather than to a copy of it. */
  var SERVED_CAPTION = elCaption ? elCaption.innerHTML : '';

  var CLAIM = 'Nearly every new client tells us they wish they\u2019d come sooner.';
  var SOFTENED = 'Many new clients tell us they wish they\u2019d come sooner.';
  var GROUNDED = 'One client we saw last month had been managing symptoms for three years before booking.';

  /* stage: which pipeline row is active. hold: ms to rest on this beat. */
  var beats = [
    { stage: 0, label: 'Topic discovery', text: 'What to expect at your first pelvic floor physio appointment',
      note: 'Checked against every topic already used for this client.', state: 'run', hold: 1500 },
    { stage: 1, label: 'Client voice profile', text: 'Voice anchored to the client\u2019s own human-written pages',
      note: 'Not a generic tone setting. Vocabulary is extracted from what they have already published.', state: 'run', hold: 1600 },
    { stage: 2, label: 'Draft sentence', text: CLAIM,
      note: 'First draft returned.', state: 'run', hold: 1700 },
    { stage: 3, label: 'Draft sentence', text: CLAIM,
      note: 'FLAGGED &middot; unfounded population claim, collective-experience form. No named source, not grounded in a specific client. The gate says remove, do not soften.',
      state: 'reject', hold: 3400, mark: true },
    { stage: 4, label: 'Revised sentence', text: SOFTENED,
      note: 'The writer softens "nearly every" to "many".', state: 'run', hold: 2400, diff: true },
    { stage: 5, label: 'Revised sentence', text: SOFTENED,
      note: 'FLAGGED AGAIN &middot; softened, not removed. Still unsourced, still doing the same work. An independent editor with a separate prompt catches what the writer is blind to.',
      state: 'reject', hold: 3800, mark: true },
    { stage: 4, label: 'Revised sentence', text: GROUNDED,
      note: 'Rewritten as specific, verifiable client experience.', state: 'run', hold: 2600 },
    { stage: 5, label: 'Revised sentence', text: GROUNDED,
      note: 'Passed. Claim count zero.', state: 'pass', hold: 1700 },
    { stage: 6, label: 'Verified sentence', text: GROUNDED,
      note: 'Every remaining claim checked against a named source or specific experience.', state: 'run', hold: 1700 },
    { stage: 7, label: 'Published', text: GROUNDED,
      note: 'Auto-publish tier. Both review passes clear, all claims verified.', state: 'pass', hold: 2200 }
  ];

  function highlight(text) {
    return text
      .replace(/Nearly every/g, '<mark class="sim-mark">Nearly every</mark>')
      .replace(/^Many/g, '<mark class="sim-mark">Many</mark>');
  }

  function reset() {
    stages.forEach(function (s) { s.className = ''; s.querySelector('.sim-state').textContent = ''; });
    elText.innerHTML = CLAIM;
    elLabel.textContent = 'Draft sentence';
    elVerdict.innerHTML = '';
    elVerdict.className = 'sim-verdict';
    if (elCaption) elCaption.innerHTML = SERVED_CAPTION;
    root.classList.remove('is-running', 'is-done');
  }

  /* The lens's AI state is the one thing that has to stop this.
     An assistant receives the markup as served, which is eight stage names and one sentence,
     so in that state the card goes back to being exactly that instead of animating something
     nobody on the other end can see. The threshold is not repeated here: lens.js sets
     body.lens-ai at its own 1.5 and this reads the class, so there is one definition of where
     the AI state begins. A run in flight is cancelled rather than left with a stage stuck,
     and the button says so instead of sitting disabled with "Running" on it. */
  var lensBlocked = false;

  var timer = null;
  var passCount = {};

  function apply(i) {
    var b = beats[i];

    stages.forEach(function (s) {
      var n = parseInt(s.getAttribute('data-sim-stage'), 10);
      var st = s.querySelector('.sim-state');
      s.classList.remove('is-active', 'is-reject');
      if (n < b.stage) {
        s.classList.add('is-done');
        /* a stage that rejected keeps that verdict; everything else settles to done */
        if (st.textContent !== 'rejected') st.textContent = 'done';
      } else if (n === b.stage) {
        s.classList.add('is-active');
        if (b.state === 'reject') s.classList.add('is-reject');
        if (b.state === 'pass') s.classList.add('is-done');
      } else {
        s.classList.remove('is-done');
        st.textContent = '';
      }
    });

    var active = stages[b.stage];
    var st = active.querySelector('.sim-state');
    if (b.state === 'reject') {
      passCount[b.stage] = (passCount[b.stage] || 0) + 1;
      st.textContent = 'rejected';
    } else if (b.state === 'pass') {
      st.textContent = 'passed';
    } else {
      st.textContent = 'running';
    }

    elLabel.textContent = b.label;
    elText.innerHTML = b.mark ? highlight(b.text) : b.text;
    elVerdict.innerHTML = b.note;
    elVerdict.className = 'sim-verdict is-' + b.state;

    if (i === beats.length - 1) {
      root.classList.add('is-done');
      root.classList.remove('is-running');
      btn.textContent = 'Run it again';
      btn.disabled = false;
      elCaption.innerHTML = 'Two rejections, one article. The second is the one that matters: it caught the writer wording the problem away instead of removing it.';
      return;
    }
    timer = setTimeout(function () { apply(i + 1); }, reduced ? 900 : b.hold);
  }

  function run() {
    if (lensBlocked) return;
    if (timer) clearTimeout(timer);
    passCount = {};
    reset();
    root.classList.add('is-running');
    btn.disabled = true;
    btn.textContent = 'Running';
    elCaption.innerHTML = 'The gate that matters is pass two. It checks whether the revision fixed the problem or just reworded it.';
    timer = setTimeout(function () { apply(0); }, 350);
  }

  btn.addEventListener('click', run);
  reset();

  addEventListener('lens:change', function () {
    var ai = document.body.classList.contains('lens-ai');
    if (ai === lensBlocked) return;
    lensBlocked = ai;
    if (ai) {
      if (timer) { clearTimeout(timer); timer = null; }
      reset();
      btn.textContent = 'Run it';
      btn.disabled = true;
    } else {
      btn.disabled = false;
    }
  });

  /* autoplay once when it comes into view, so the reader does not have to know to press it */
  var played = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries, obs) {
      /* Not while the lens holds the AI state, and the observer is left connected in that
         case rather than spent: a reader who arrives here in the AI state and comes back out
         of it should still get the run the first time they are looking at it. */
      if (entries[0].isIntersecting && !played && !lensBlocked) {
        played = true;
        run();
        obs.disconnect();
      }
    }, { threshold: 0.35 }).observe(root);
  }
})();
