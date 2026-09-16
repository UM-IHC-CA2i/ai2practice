(function() {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var track = params.get('track') || 'student';
  var lessonsRaw = params.get('lessons');
  var lessons = (lessonsRaw !== null && lessonsRaw !== '') ? lessonsRaw : '1,2,3,4,5';
  var research = params.get('research') === '1';
  var qs = '?track=' + track + '&lessons=' + lessons;
  if (research) qs += '&research=1';

  var trackLabel = document.getElementById('les-track');
  var path = window.location.pathname;
  var file = path.substring(path.lastIndexOf('/') + 1);
  var isResearchPage = file.indexOf('research-') === 0;

  if (trackLabel) {
    if (isResearchPage) {
      trackLabel.textContent = 'Research';
      trackLabel.style.background = '#CCFBF1';
      trackLabel.style.color = '#0D9488';
    } else {
      trackLabel.textContent = track === 'resident' ? 'Resident' : 'Medical Student';
    }
  }

  var studentSections = document.querySelectorAll('.les-section--student');
  var residentSections = document.querySelectorAll('.les-section--resident');

  if (track === 'resident') {
    residentSections.forEach(function(s) { s.classList.add('visible'); });
  } else {
    studentSections.forEach(function(s) { s.classList.add('visible'); });
  }

  var backLink = document.getElementById('les-back');
  var prevLink = document.getElementById('les-prev');
  var nextLink = document.getElementById('les-next');

  if (backLink) {
    var backHref = backLink.getAttribute('href').split('?')[0];
    backLink.href = backHref + '?track=' + track;
  }

  var researchSection = document.getElementById('research-content');
  if (researchSection && research) {
    researchSection.style.display = 'block';
  }

  if (prevLink) {
    var prevHref = prevLink.getAttribute('href');
    if (prevHref.indexOf('lesson-') !== -1 || prevHref.indexOf('research-') !== -1) {
      prevLink.href = prevHref.split('?')[0] + qs;
    }
  }
  if (nextLink) {
    var nextHref = nextLink.getAttribute('href');
    if (nextHref.indexOf('lesson-') !== -1 || nextHref.indexOf('research-') !== -1) {
      nextLink.href = nextHref.split('?')[0] + qs;
    }
  }

  // ── Pill Bar ──

  var CLINICAL = [
    { key: 'lesson-1', file: 'lesson-1.html', label: 'Never-Skilling' },
    { key: 'lesson-2', file: 'lesson-2.html', label: 'AI 101' },
    { key: 'lesson-3', file: 'lesson-3.html', label: 'Radiology 101' },
    { key: 'lesson-4', file: 'lesson-4.html', label: 'AI Evaluation' },
    { key: 'lesson-5', file: 'lesson-5.html', label: 'Future of AI' }
  ];

  var RESEARCH_ITEMS = [
    { key: 'research-1', file: 'research-1.html', label: 'Python' },
    { key: 'research-2', file: 'research-2.html', label: 'Data Sci' },
    { key: 'research-3', file: 'research-3.html', label: 'ML' },
    { key: 'research-4', file: 'research-4.html', label: 'Adv AI' },
    { key: 'research-5', file: 'research-5.html', label: 'Project' }
  ];

  var CHECK_SVG = '<svg class="pill-check" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var STORAGE_KEY = 'aiready_completed';

  function getCompleted() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  }

  function markCompleted(key) {
    var done = getCompleted();
    if (done.indexOf(key) === -1) {
      done.push(key);
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(done)); } catch(e) {}
    }
  }

  var currentKey = file.replace('.html', '');
  var selectedLessons = lessons ? lessons.split(',') : [];

  function buildPillBar() {
    var done = getCompleted();

    var tray = document.createElement('div');
    tray.className = 'pill-tray';

    CLINICAL.forEach(function(item) {
      var lessonNum = item.key.replace('lesson-', '');
      if (selectedLessons.length > 0 && selectedLessons.indexOf(lessonNum) === -1) return;
      var a = document.createElement('a');
      a.href = item.file + qs;
      a.className = 'pill-item';

      var isActive = item.key === currentKey;
      var isCompleted = done.indexOf(item.key) !== -1;

      if (isActive) {
        a.classList.add('pill--active');
      } else if (isCompleted) {
        a.classList.add('pill--completed');
      }

      var num = document.createElement('span');
      num.className = 'pill-num';
      if (!isActive && !isCompleted) {
        num.classList.add('pill-num--clinical');
      }
      if (isCompleted) {
        num.innerHTML = CHECK_SVG;
      } else {
        num.textContent = item.key.replace('lesson-', '');
      }

      var label = document.createElement('span');
      label.className = 'pill-label';
      label.textContent = item.label;

      a.appendChild(num);
      a.appendChild(label);
      tray.appendChild(a);
    });

    if (research) {
      var divider = document.createElement('div');
      divider.className = 'pill-divider';
      tray.appendChild(divider);

      RESEARCH_ITEMS.forEach(function(item) {
        var a = document.createElement('a');
        a.href = item.file + qs;
        a.className = 'pill-item';

        var isActive = item.key === currentKey;
        var isCompleted = done.indexOf(item.key) !== -1;

        if (isActive) {
          a.classList.add('pill--active-teal');
        } else if (isCompleted) {
          a.classList.add('pill--completed');
        }

        var num = document.createElement('span');
        num.className = 'pill-num';
        if (!isActive && !isCompleted) {
          num.classList.add('pill-num--research');
        }
        if (isCompleted) {
          num.innerHTML = CHECK_SVG;
        } else {
          num.textContent = item.key.replace('research-', '');
        }

        var label = document.createElement('span');
        label.className = 'pill-label';
        label.textContent = item.label;

        a.appendChild(num);
        a.appendChild(label);
        tray.appendChild(a);
      });
    }

    var topbarTitle = document.querySelector('.les-topbar-title');
    if (topbarTitle) {
      topbarTitle.replaceWith(tray);
    }
  }

  buildPillBar();

  if (nextLink && !isResearchPage) {
    nextLink.addEventListener('click', function() {
      markCompleted(currentKey);
    });
  }

  if (isResearchPage && nextLink && !hasPassed(currentKey)) {
    nextLink.classList.add('ckpt-next-locked');
  }

  function hasPassed(key) {
    try {
      return sessionStorage.getItem('aiready_ckpt_' + key) === '1';
    } catch(e) { return false; }
  }
})();
