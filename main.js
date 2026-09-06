/* Jintae Park — personal site
   1. design variant switch (?design=a|b|c)   2. live GitHub star count
   3. autoplay videos only while visible       4. flip-book portrait */
(function () {
  'use strict';

  // ---- 1. design variant --------------------------------------------------
  var params = new URLSearchParams(location.search);
  var d = params.get('design');
  if (d && /^[abc]$/.test(d)) document.documentElement.setAttribute('data-design', d);

  // ---- 2. GitHub stars (falls back to the number already in the HTML) -----
  var starEl = document.getElementById('gh-stars');
  if (starEl && 'fetch' in window) {
    fetch('https://api.github.com/repos/jintae-00/ReDesign', { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && typeof j.stargazers_count === 'number') starEl.textContent = j.stargazers_count.toLocaleString('en-US');
      })
      .catch(function () { /* keep the static fallback */ });
  }

  // ---- 3. videos: play while on screen, pause when scrolled away ----------
  var vids = Array.prototype.slice.call(document.querySelectorAll('video[data-autoplay]'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (vids.length && 'IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting && e.intersectionRatio > 0.35) {
          if (v.preload !== 'auto') v.preload = 'auto';
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { threshold: [0, 0.35, 0.6] });
    vids.forEach(function (v) { io.observe(v); });
  }

  // ---- 4. flip book -------------------------------------------------------
  var book = document.getElementById('book');
  if (!book) return;
  var pages = Array.prototype.slice.call(book.querySelectorAll('.page'));
  var counter = document.getElementById('page-now');
  var last = pages.length - 1;      // the last page never turns: nothing is behind it
  var turned = 0;                   // how many pages are lying on the left
  var hoverPeek = false;

  function render() {
    pages.forEach(function (p, i) {
      var isTurned = i < turned || (hoverPeek && i === turned && turned < last);
      p.classList.toggle('turned', isTurned);
      // pages already on the left stack upward in turn order; the right stack keeps document order
      p.style.zIndex = isTurned ? (10 + i) : (10 + (last - i));
      // tiny depth offsets so the 3D sorter never z-fights coplanar pages
      p.style.setProperty('--z', (last - i + 1) + 'px');     // right stack: first page nearest the viewer
      p.style.setProperty('--zt', (-(i + 1)) + 'px');        // left stack: later-turned page nearest the viewer
    });
    var showing = Math.min(turned + (hoverPeek && turned < last ? 1 : 0), last);
    if (counter) counter.textContent = String(showing + 1);
    book.setAttribute('data-page', String(showing));
    book.classList.toggle('at-end', turned >= last);
  }

  function advance() {
    hoverPeek = false;
    turned = turned >= last ? 0 : turned + 1;
    render();
  }

  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (finePointer) {
    book.addEventListener('mouseenter', function () { hoverPeek = true; render(); });
    book.addEventListener('mouseleave', function () { hoverPeek = false; render(); });
  }
  book.addEventListener('click', advance);
  book.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); advance(); }
    if (e.key === 'ArrowLeft' && turned > 0) { e.preventDefault(); hoverPeek = false; turned -= 1; render(); }
  });
  render();
})();
