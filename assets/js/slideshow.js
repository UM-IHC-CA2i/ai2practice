var Slideshow = (function() {
  'use strict';

  function create(container, config) {
    var slides = config.slides || [];
    if (slides.length === 0) return;

    var idx = 0;
    var animating = false;

    var wrap = document.createElement('div');
    wrap.className = 'slideshow';

    var viewport = document.createElement('div');
    viewport.className = 'slideshow-viewport';

    var counter = document.createElement('div');
    counter.className = 'slideshow-counter';

    var topRight = document.createElement('div');
    topRight.className = 'slideshow-top-right';
    topRight.appendChild(counter);

    if (config.downloadUrl) {
      var dlBtn = document.createElement('a');
      dlBtn.className = 'slideshow-download';
      dlBtn.href = config.downloadUrl;
      dlBtn.target = '_blank';
      dlBtn.rel = 'noopener';
      dlBtn.setAttribute('aria-label', 'Download slides');
      dlBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v9M4 8l4 4 4-4M2 14h12"/></svg>';
      topRight.appendChild(dlBtn);
    }

    var prevBtn = document.createElement('button');
    prevBtn.className = 'slideshow-arrow slideshow-arrow--prev';
    prevBtn.innerHTML = '&#8249;';
    prevBtn.setAttribute('aria-label', 'Previous slide');

    var nextBtn = document.createElement('button');
    nextBtn.className = 'slideshow-arrow slideshow-arrow--next';
    nextBtn.innerHTML = '&#8250;';
    nextBtn.setAttribute('aria-label', 'Next slide');

    var slideEl = document.createElement('div');
    slideEl.className = 'slideshow-slide';

    viewport.appendChild(topRight);
    viewport.appendChild(slideEl);
    wrap.appendChild(prevBtn);
    wrap.appendChild(viewport);
    wrap.appendChild(nextBtn);

    container.appendChild(wrap);

    function setContent(s) {
      if (s.src) {
        slideEl.innerHTML = '<img src="' + s.src + '" alt="' + (s.alt || '') + '">';
      } else {
        slideEl.innerHTML =
          '<div class="slideshow-placeholder">' +
            '<div class="slideshow-placeholder-icon">&#128444;</div>' +
            '<div class="slideshow-placeholder-text">' + (s.alt || 'Image placeholder') + '</div>' +
          '</div>';
      }
    }

    function render(animate) {
      var s = slides[idx];
      counter.textContent = (idx + 1) + ' / ' + slides.length;
      prevBtn.disabled = idx === 0;
      nextBtn.disabled = idx === slides.length - 1;

      if (animate && !animating) {
        animating = true;
        slideEl.classList.add('slideshow-fade-out');
        setTimeout(function() {
          setContent(s);
          slideEl.classList.remove('slideshow-fade-out');
          slideEl.classList.add('slideshow-fade-in');
          setTimeout(function() {
            slideEl.classList.remove('slideshow-fade-in');
            animating = false;
          }, 250);
        }, 150);
      } else {
        setContent(s);
      }
    }

    function goTo(i) {
      var next = Math.max(0, Math.min(slides.length - 1, i));
      if (next === idx || animating) return;
      idx = next;
      render(true);
    }

    prevBtn.addEventListener('click', function() { goTo(idx - 1); });
    nextBtn.addEventListener('click', function() { goTo(idx + 1); });

    wrap.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowLeft') goTo(idx - 1);
      if (e.key === 'ArrowRight') goTo(idx + 1);
    });
    wrap.setAttribute('tabindex', '0');

    render(false);
  }

  return { create: create };
})();
