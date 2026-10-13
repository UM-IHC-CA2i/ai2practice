(function() {
  'use strict';

  // Lesson navigation, completion and the progress rail live in assets/js/progress.js.
  // This file only handles page-level display.

  var path = window.location.pathname;
  var file = path.substring(path.lastIndexOf('/') + 1);
  var isResearchPage = file.indexOf('research-') === 0;

  // One learning depth for now: show every audience callout. Depth-specific versions are planned.
  document.querySelectorAll('.les-section--student, .les-section--resident').forEach(function(s) {
    s.classList.add('visible');
  });

  var researchSection = document.getElementById('research-content');
  if (researchSection) researchSection.style.display = 'block';

  var nextLink = document.getElementById('les-next');
  if (isResearchPage && nextLink && !hasPassed(file.replace('.html', ''))) {
    nextLink.classList.add('ckpt-next-locked');
  }

  function hasPassed(key) {
    try {
      return localStorage.getItem('aiready_ckpt_' + key) === '1';
    } catch(e) { return false; }
  }
})();
