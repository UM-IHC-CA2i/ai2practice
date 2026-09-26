(function() {
  'use strict';

  var scriptUrl = document.currentScript && document.currentScript.src
    ? document.currentScript.src
    : new URL('js/shared.js', window.location.href).href;
  var siteRoot = new URL('../', scriptUrl);

  function siteUrl(path) {
    return new URL(path, siteRoot).href;
  }

  function relativePath() {
    var rootPath = siteRoot.pathname.replace(/\/$/, '');
    var path = window.location.pathname;
    if (rootPath && path.indexOf(rootPath) === 0) path = path.slice(rootPath.length);
    return path.replace(/^\//, '') || 'index.html';
  }

  function activeSection(path) {
    if (path === 'about.html') return 'about';
    if (path === 'tracker.html') return 'curriculum';
    if (path === 'research.html' || path.indexOf('lessons/research-') === 0) return 'spec';
    if (
      path === 'course-select.html' || path === 'students.html' || path === 'residents.html' ||
      path === 'student-cases.html' || path === 'resident-cases.html' ||
      path === 'student-assessment.html' || path === 'resident-assessment.html' ||
      path.indexOf('lessons/lesson-') === 0
    ) return 'curriculum';
    return '';
  }

  function navLink(href, label, key, active) {
    var cls = key === active ? 'active' : '';
    var aria = key === active ? ' aria-current="page"' : '';
    return '<li><a href="' + siteUrl(href) + '" class="' + cls + '"' + aria + '>' + label + '</a></li>';
  }

  function buildNav() {
    var active = activeSection(relativePath());
    var nav = document.createElement('nav');
    nav.className = 'site-nav';
    nav.setAttribute('aria-label', 'Primary');
    nav.innerHTML =
      '<div class="nav-inner">' +
        '<a href="' + siteUrl('index.html') + '" class="nav-brand" aria-label="AI2Practice home">' +
          '<img src="' + siteUrl('images/ai2practice-logo.svg') + '" alt="AI2Practice" class="nav-logo" width="420" height="103">' +
        '</a>' +
        '<button class="menu-toggle" aria-label="Toggle navigation" aria-expanded="false">&#9776;</button>' +
        '<ul class="nav-links">' +
          navLink('index.html#map', 'Route map', 'map', active) +
          navLink('index.html#core', 'Curriculum', 'curriculum', active) +
          navLink('index.html#spec', 'Specializations', 'spec', active) +
          navLink('index.html#board', 'Updates', 'board', active) +
          navLink('about.html', 'About', 'about', active) +
          '<li><a class="login" href="' + siteUrl('pages/educators.html') + '">Educator login</a></li>' +
        '</ul>' +
      '</div>';
    document.body.prepend(nav);

    var toggle = nav.querySelector('.menu-toggle');
    var links = nav.querySelector('.nav-links');
    toggle.addEventListener('click', function() {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    document.addEventListener('click', function(e) {
      if (!nav.contains(e.target) && links.classList.contains('open')) {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function buildFooter() {
    var year = new Date().getFullYear();
    var footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML =
      '<div class="footer-inner">' +
        '<div class="footer-text">AI2Practice &middot; Practical, open clinical AI education &middot; ' + year + '</div>' +
        '<ul class="footer-links">' +
          '<li><a href="' + siteUrl('index.html#map') + '">Route map</a></li>' +
          '<li><a href="' + siteUrl('pages/research-lab.html') + '">Research Lab</a></li>' +
          '<li><a href="' + siteUrl('pages/adoption-governance.html') + '">Leadership</a></li>' +
          '<li><a href="' + siteUrl('tracker.html') + '">AI Tool Tracker</a></li>' +
          '<li><a href="' + siteUrl('pages/brief.html') + '">AI2Practice Brief</a></li>' +
          '<li><a href="' + siteUrl('about.html') + '">About</a></li>' +
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
