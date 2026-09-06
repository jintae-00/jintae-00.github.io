/* Jintae Park — personal site
   1. palette variant switch (?design=a|b|c)  2. live GitHub star count
   3. media carousels (swipe / arrows / dots)  4. lightbox for full-size media
   5. play videos only while visible */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- 1. palette variant ------------------------------------------------
  var params = new URLSearchParams(location.search);
  var d = params.get('design');
  if (d && /^[abc]$/.test(d)) document.documentElement.setAttribute('data-design', d);

  // ---- 2. GitHub stars (falls back to the number already in the HTML) ----
  var starEl = document.getElementById('gh-stars');
  if (starEl && 'fetch' in window) {
    fetch('https://api.github.com/repos/jintae-00/ReDesign', { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && typeof j.stargazers_count === 'number') starEl.textContent = j.stargazers_count.toLocaleString('en-US'); })
      .catch(function () {});
  }

  // ---- 3. carousels -------------------------------------------------------
  var carousels = Array.prototype.slice.call(document.querySelectorAll('[data-carousel]'));
  carousels.forEach(function (c) {
    var track = c.querySelector('.track');
    var slides = Array.prototype.slice.call(track.children);
    var dots = c.querySelector('.dots');
    var prev = c.querySelector('.prev');
    var next = c.querySelector('.next');
    c._slides = slides;
    c._index = 0;
    if (slides.length < 2) { c.classList.add('single'); }

    slides.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('aria-label', 'Go to item ' + (i + 1)); b.tabIndex = -1;
      b.addEventListener('click', function (e) { e.stopPropagation(); go(i); });
      dots.appendChild(b);
    });

    function setActive(i) {
      c._index = i;
      Array.prototype.forEach.call(dots.children, function (b, j) { b.classList.toggle('on', j === i); });
      slides.forEach(function (s, j) {
        var v = s.querySelector('video');
        if (!v) return;
        if (j === i && c._visible && !reduce) {
          if (v.preload === 'none') v.preload = 'auto';
          v.playbackRate = parseFloat(v.getAttribute('data-rate') || '1');
          var p = v.play(); if (p && p.catch) p.catch(function () {});
          if (!v._retry) { v._retry = true; v.addEventListener('canplay', function () { if (c._visible && v.paused) { var q = v.play(); if (q && q.catch) q.catch(function () {}); } }); }
        }
        else if (!v.paused) v.pause();
      });
    }
    function go(i) {
      i = (i + slides.length) % slides.length;
      track.scrollTo({ left: i * track.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
      setActive(i);
    }
    c._go = go;
    prev.addEventListener('click', function (e) { e.stopPropagation(); go(c._index - 1); });
    next.addEventListener('click', function (e) { e.stopPropagation(); go(c._index + 1); });

    // keep the dots in sync with touch / trackpad swipes
    var t;
    track.addEventListener('scroll', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        if (i !== c._index) setActive(Math.min(slides.length - 1, Math.max(0, i)));
      }, 80);
    }, { passive: true });

    // keyboard on the focused carousel
    c.tabIndex = 0;
    c.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(c._index + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(c._index - 1); }
      if (e.key === 'Enter' && !c.hasAttribute('data-nolightbox')) { e.preventDefault(); openLightbox(c, c._index); }
    });

    // click a slide -> lightbox (photo strip: just show the next photo)
    var noLightbox = c.hasAttribute('data-nolightbox');
    slides.forEach(function (s, i) { s.addEventListener('click', function () { if (noLightbox) go(i + 1); else openLightbox(c, i); }); });

    // play the active video only while the carousel is on screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { c._visible = e.isIntersecting; setActive(c._index); });
      }, { threshold: [0, 0.01] }).observe(c);
    } else { c._visible = true; }
    setActive(0);
  });

  // "videos" / "pipeline" text links open the lightbox at a given item
  Array.prototype.forEach.call(document.querySelectorAll('[data-open]'), function (b) {
    b.addEventListener('click', function () {
      var c = document.querySelector('#' + b.getAttribute('data-open') + ' [data-carousel]');
      if (c) openLightbox(c, parseInt(b.getAttribute('data-index') || '0', 10));
    });
  });

  // ---- 4. lightbox --------------------------------------------------------
  var lb = document.getElementById('lightbox');
  var stage = document.getElementById('lb-stage');
  var cap = document.getElementById('lb-caption');
  var lbC = null, lbI = 0;

  function renderLightbox() {
    var s = lbC._slides[lbI];
    var kind = s.getAttribute('data-kind');
    var src = s.getAttribute('data-full');
    stage.innerHTML = '';
    var el;
    if (kind === 'video') {
      el = document.createElement('video');
      el.src = src; el.controls = true; el.autoplay = true; el.loop = true; el.muted = true; el.playsInline = true;
      el.playbackRate = parseFloat(s.getAttribute('data-rate') || '1');
      el.addEventListener('loadedmetadata', function () { el.playbackRate = parseFloat(s.getAttribute('data-rate') || '1'); });
      var poster = s.querySelector('video') && s.querySelector('video').getAttribute('poster');
      if (poster) el.poster = poster;
    } else {
      el = document.createElement('img');
      el.src = src; el.alt = (s.querySelector('img') && s.querySelector('img').alt) || '';
    }
    stage.appendChild(el);
    cap.textContent = s.getAttribute('data-caption') || '';
    var n = lbC._slides.length;
    lb.classList.toggle('single', n < 2);
    cap.setAttribute('data-count', (lbI + 1) + ' / ' + n);
  }
  function openLightbox(c, i) {
    if (!lb || typeof lb.showModal !== 'function') { window.open(c._slides[i].getAttribute('data-full'), '_blank'); return; }
    lbC = c; lbI = i;
    renderLightbox();
    lb.showModal();
    document.body.classList.add('no-scroll');
  }
  function closeLightbox() { if (lb.open) lb.close(); }
  function step(k) { lbI = (lbI + k + lbC._slides.length) % lbC._slides.length; renderLightbox(); lbC._go(lbI); }

  if (lb) {
    lb.querySelector('.lb-close').addEventListener('click', closeLightbox);
    lb.querySelector('.lb-prev').addEventListener('click', function () { step(-1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { step(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });
    lb.addEventListener('close', function () { stage.innerHTML = ''; document.body.classList.remove('no-scroll'); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });
  }

})();
