(function() {
  'use strict';

  var NAV_ITEMS = [
    { href: 'index.html', label: 'Home' },
    { href: 'course-select.html?track=student', label: 'Medical Students' },
    { href: 'course-select.html?track=resident', label: 'Residents' },
    { href: 'research.html', label: 'AI Research' },
    { href: 'tracker.html', label: 'AI Tracker' },
    { href: 'about.html', label: 'About Us' }
  ];

  function currentPage() {
    var path = window.location.pathname;
    var file = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    return file;
  }

  function buildNav() {
    var cur = currentPage();
    var nav = document.createElement('nav');
    nav.className = 'site-nav';
    nav.innerHTML =
      '<div class="nav-inner">' +
        '<a href="index.html" class="nav-brand">' +
          'AI-Ready<span class="brand-sub"> edu</span>' +
        '</a>' +
        '<button class="menu-toggle" aria-label="Toggle navigation">&#9776;</button>' +
        '<ul class="nav-links">' +
          NAV_ITEMS.map(function(item) {
            var isActive = cur === item.href;
            var search = window.location.search || '';
            if (!isActive && item.href === 'course-select.html?track=student') {
              isActive = cur === 'students.html' || cur === 'student-cases.html' || cur === 'student-assessment.html' || (cur === 'course-select.html' && search.indexOf('track=student') !== -1);
            }
            if (!isActive && item.href === 'course-select.html?track=resident') {
              isActive = cur === 'residents.html' || cur === 'resident-cases.html' || cur === 'resident-assessment.html' || (cur === 'course-select.html' && search.indexOf('track=resident') !== -1);
            }
            if (!isActive && item.href === 'research.html') {
              isActive = cur === 'research.html' || cur.indexOf('research-') === 0;
            }
            if (!isActive && item.href === 'about.html') {
              isActive = cur === 'about.html';
            }
            var cls = isActive ? 'active' : '';
            return '<li><a href="' + item.href + '" class="' + cls + '">' + item.label + '</a></li>';
          }).join('') +
        '</ul>' +
      '</div>';
    document.body.prepend(nav);

    nav.querySelector('.menu-toggle').addEventListener('click', function() {
      nav.querySelector('.nav-links').classList.toggle('open');
    });

    document.addEventListener('click', function(e) {
      var links = nav.querySelector('.nav-links');
      if (!nav.contains(e.target) && links.classList.contains('open')) {
        links.classList.remove('open');
      }
    });
  }

  function buildFooter() {
    var footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML =
      '<div class="footer-inner">' +
        '<div class="footer-text">' +
          'AI-Ready &middot; Department of Radiology &middot; 2026' +
        '</div>' +
        '<ul class="footer-links">' +
          '<li><a href="index.html">Home</a></li>' +
          '<li><a href="students.html">Students</a></li>' +
          '<li><a href="residents.html">Residents</a></li>' +
          '<li><a href="research.html">AI Research</a></li>' +
          '<li><a href="tracker.html">AI Tracker</a></li>' +
          '<li><a href="about.html">About Us</a></li>' +
        '</ul>' +
      '</div>';
    document.body.appendChild(footer);
  }

  function initScrollSpy() {
    var tocLinks = document.querySelectorAll('.toc-link');
    if (tocLinks.length === 0) return;

    var sections = [];
    tocLinks.forEach(function(link) {
      var href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        var target = document.querySelector(href);
        if (target) sections.push({ link: link, target: target });
      }
    });

    if (sections.length === 0) return;

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          tocLinks.forEach(function(l) { l.classList.remove('active'); });
          sections.forEach(function(s) {
            if (s.target === entry.target) s.link.classList.add('active');
          });
        }
      });
    }, { rootMargin: '-80px 0px -60% 0px', threshold: 0 });

    sections.forEach(function(s) { observer.observe(s.target); });

    tocLinks.forEach(function(link) {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        var target = document.querySelector(link.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.replaceState(null, '', link.getAttribute('href'));
        }
      });
    });
  }

  function init() {
    buildNav();
    buildFooter();
    initScrollSpy();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
