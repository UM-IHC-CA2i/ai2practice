(function() {
  'use strict';

  var NAV_ITEMS = [
    { href: 'pages/foundations.html', label: 'Foundations' },
    { href: 'pages/clinical-practice.html', label: 'Clinical Practice' },
    { href: 'pages/adoption-governance.html', label: 'Adoption & Governance' },
    { href: 'pages/research-lab.html', label: 'Research Lab' },
    { href: 'pages/educators.html', label: 'For Educators' },
    { href: 'pages/brief.html', label: 'AI2Practice Brief' }
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
          '<img src="images/ai2practice-logo.svg" alt="AI2Practice" class="nav-logo" width="420" height="103">' +
        '</a>' +
        '<button class="menu-toggle" aria-label="Toggle navigation">&#9776;</button>' +
        '<ul class="nav-links">' +
          NAV_ITEMS.map(function(item) {
            var isActive = false;
            if (item.href === 'pages/foundations.html') {
              isActive = cur === 'students.html' || cur === 'residents.html' || cur === 'course-select.html';
            } else if (item.href === 'pages/clinical-practice.html') {
              isActive = cur === 'student-cases.html' || cur === 'resident-cases.html' || cur === 'student-assessment.html' || cur === 'resident-assessment.html';
            } else if (item.href === 'pages/adoption-governance.html') {
              isActive = cur === 'tracker.html';
            } else if (item.href === 'pages/research-lab.html') {
              isActive = cur === 'research.html' || cur.indexOf('research-') === 0;
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
    var year = new Date().getFullYear();
    var footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML =
      '<div class="footer-inner">' +
        '<div class="footer-text">' +
          'AI2Practice &middot; Practical AI for Clinical Imaging &middot; ' + year +
        '</div>' +
        '<ul class="footer-links">' +
          '<li><a href="index.html">Home</a></li>' +
          '<li><a href="pages/foundations.html">Foundations</a></li>' +
          '<li><a href="pages/clinical-practice.html">Clinical Practice</a></li>' +
          '<li><a href="pages/adoption-governance.html">Adoption & Governance</a></li>' +
          '<li><a href="pages/research-lab.html">Research Lab</a></li>' +
          '<li><a href="about.html">About</a></li>' +
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
