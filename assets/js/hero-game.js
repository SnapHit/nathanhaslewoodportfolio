/* hero-game.js
   The games page opens with the SnapHit demo filling the viewport. The way onward is
   withheld until the player clears the ducks, which is the same gate snap-hit.online uses.

   The game is framed from snap-hit.online and posts { snaphit: 'cleared' } to the parent
   with a wildcard target origin when a run is cleared, so the signal crosses origins.
   We still check the origin ourselves rather than trusting any framed page.

   Progressive enhancement: the markup ships unlocked. This script adds the lock, so with
   JavaScript disabled the visitor gets a working link onward instead of a dead end. The
   skip link is always reachable by keyboard for anyone who does not want to play. */
(function () {
  var GAME_ORIGIN = 'https://snap-hit.online';
  var KEY = 'nh_snaphit_cleared';

  var frame = document.getElementById('heroGame');
  var hero = document.querySelector('.hero-game');
  if (!frame || !hero) return;

  function unlock() {
    document.body.classList.remove('game-locked');
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
  }

  /* Someone who has already cleared it once is never gated again. */
  var alreadyCleared = false;
  try { alreadyCleared = !!localStorage.getItem(KEY); } catch (e) {}

  if (!alreadyCleared) document.body.classList.add('game-locked');

  window.addEventListener('message', function (e) {
    if (e.origin !== GAME_ORIGIN) return;
    if (e.source !== frame.contentWindow) return;
    if (e.data && e.data.snaphit === 'cleared') unlock();
  });

  /* Safety valve: if the game fails to load or never signals, do not trap anyone.
     After 45 seconds the way onward appears regardless. */
  setTimeout(function () {
    if (document.body.classList.contains('game-locked')) {
      document.body.classList.add('game-timeout');
    }
  }, 45000);

  /* Anyone reaching the gate by keyboard gets out immediately. */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Tab' && document.body.classList.contains('game-locked')) {
      document.body.classList.add('game-keyboard');
    }
  });

  /* Park the game once it scrolls away so it is not running under the rest of the page. */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      if (!visible && frame.getAttribute('src')) {
        frame.dataset.parked = frame.getAttribute('src');
        frame.removeAttribute('src');
      } else if (visible && !frame.getAttribute('src') && frame.dataset.parked) {
        frame.setAttribute('src', frame.dataset.parked);
      }
    }, { threshold: 0.02 }).observe(hero);
  }
})();
