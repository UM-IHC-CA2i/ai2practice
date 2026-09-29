(function() {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var track = params.get('track') || 'student';
  var lessonsRaw = params.get('lessons');
  var lessons = (lessonsRaw !== null && lessonsRaw !== '') ? lessonsRaw : '2,3,4,1';
  var research = params.get('research') === '1';
  var pathway = params.get('pathway');
  var qs = '?track=' + track + '&lessons=' + lessons;
  if (research) qs += '&research=1';
  if (pathway) qs += '&pathway=' + encodeURIComponent(pathway);

  var trackLabel = document.getElementById('les-track');
  var path = window.location.pathname;
  var file = path.substring(path.lastIndexOf('/') + 1);
  var isResearchPage = file.indexOf('research-') === 0;

  if (trackLabel) {
    if (isResearchPage) {
      trackLabel.textContent = 'Research';
      trackLabel.style.background = '#F6E6DF';
      trackLabel.style.color = '#A8492C';
    } else {
      trackLabel.textContent = track === 'resident' ? 'Deeper radiology' : 'Concise';
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

  // Progress for lesson pages is shown by the shared progress rail (assets/progress.js).

  var STORAGE_KEY = 'aiready_completed';

  function getCompleted() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  }

  function markCompleted(key) {
    var done = getCompleted();
    if (done.indexOf(key) === -1) {
      done.push(key);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(done)); } catch(e) {}
      try { window.dispatchEvent(new CustomEvent('ai2practice:progress-changed')); } catch(e) {}
    }
  }

  var currentKey = file.replace('.html', '');
  var selectedLessons = lessons ? lessons.split(',') : [];

  // Migrate progress from older session-only storage into persistent local browser storage.
  try {
    var oldDone = sessionStorage.getItem(STORAGE_KEY);
    if (oldDone && !localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, oldDone);
  } catch(e) {}


  // Follow the selected curriculum order rather than legacy file numbering.
  if (!isResearchPage && currentKey.indexOf('lesson-') === 0 && currentKey !== 'lesson-5') {
    var currentNum = currentKey.replace('lesson-', '');
    var idx = selectedLessons.indexOf(currentNum);
    if (idx >= 0) {
      if (prevLink) {
        if (idx > 0) { prevLink.href = 'lesson-' + selectedLessons[idx-1] + '.html' + qs; prevLink.style.display = ''; }
        else { prevLink.href = '../index.html#map'; prevLink.textContent = '\u2190 Curriculum'; }
      }
      if (nextLink) {
        if (idx < selectedLessons.length - 1) {
          nextLink.href = 'lesson-' + selectedLessons[idx+1] + '.html' + qs;
          nextLink.removeAttribute('data-open-progress');
        } else {
          nextLink.href = '#progress';
          nextLink.setAttribute('data-open-progress', 'true');
        }
        nextLink.textContent = idx < selectedLessons.length - 1 ? 'Mark complete & continue \u2192' : 'Mark complete & view progress \u2192';
      }
    }
  }
  if (currentKey === 'lesson-5' && nextLink) { nextLink.href = '#progress'; nextLink.setAttribute('data-open-progress', 'true'); nextLink.textContent = 'View progress \u2192'; }

  if (nextLink && !isResearchPage) {
    nextLink.addEventListener('click', function() {
      if (currentKey !== 'lesson-5') markCompleted(currentKey);
    });
  }

  if (isResearchPage && nextLink && !hasPassed(currentKey)) {
    nextLink.classList.add('ckpt-next-locked');
  }

  function hasPassed(key) {
    try {
      return localStorage.getItem('aiready_ckpt_' + key) === '1';
    } catch(e) { return false; }
  }
})();
