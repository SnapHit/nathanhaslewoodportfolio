/* hero-game.js
   The games page opens with the SnapHit demo filling the viewport. All this file does now is
   park the frame when it scrolls away, so a canvas game is not running under the rest of the
   page.

   v1.17 withheld the way onward until the player cleared the ducks, the same gate
   snap-hit.online uses, and v1.36 removed it. The gate was the wrong trade here. Someone who
   lands on a full screen duck game and does not play it concludes that is the whole page, and
   never reaches Drift Fever, Hurtle or Beakdown, which are what the page is for. Losing those
   three to a visitor is worse than losing the gate. Gone with it: the game-locked class, the
   nh_snaphit_cleared key, the postMessage listener for { snaphit: 'cleared' }, the 45 second
   safety timeout and the Tab press reveal. Every one of them existed only to open the gate, so
   none of them outlives it.

   The control is now plain markup, visible and clickable before this file runs at all, which is
   why nothing here touches it. */
(function () {
  var frame = document.getElementById('heroGame');
  var hero = document.querySelector('.hero-game');
  if (!frame || !hero) return;

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
