(function() {
  'use strict';

  // Ungraded knowledge checks (decision 2026-10-13).
  // Markup: <div class="kc" data-answer="1"> <p class="kc-q">...</p>
  //           <button class="quiz-option">...</button> x N
  //           <div class="quiz-explanation"><p>...</p></div> </div>
  // data-answer is the 0-based index of the best option. Any click is accepted and
  // shows the explanation. #les-next stays locked until every check is answered,
  // unless the lesson is already marked complete.

  var checks = Array.prototype.slice.call(document.querySelectorAll('.kc'));
  if (!checks.length) return;

  var file = window.location.pathname.split('/').pop().replace('.html', '');
  var next = document.getElementById('les-next');
  var hint = null;

  checks.forEach(function(kc, n) {
    var q = kc.querySelector('.kc-q');
    if (q && !q.querySelector('.kc-num')) {
      q.insertAdjacentHTML('afterbegin', '<span class="kc-num">' + (n + 1) + '.</span>');
    }
    var options = Array.prototype.slice.call(kc.querySelectorAll('.quiz-option'));
    var answer = parseInt(kc.getAttribute('data-answer'), 10);
    var explain = kc.querySelector('.quiz-explanation');
    options.forEach(function(opt, i) {
      opt.type = 'button';
      opt.addEventListener('click', function() {
        if (kc.classList.contains('kc-done')) return;
        kc.classList.add('kc-done');
        options.forEach(function(o) { o.setAttribute('aria-disabled', 'true'); });
        var right = i === answer;
        opt.classList.add(right ? 'correct' : 'incorrect');
        if (!right && options[answer]) options[answer].classList.add('correct-answer');
        if (explain) {
          var p = explain.querySelector('p') || explain;
          p.insertAdjacentHTML('afterbegin', right
            ? '<span class="kc-verdict kc-verdict--right">Correct.</span> '
            : '<span class="kc-verdict kc-verdict--wrong">Not quite.</span> ');
          explain.classList.add('shown');
        }
        update();
      });
    });
  });

  function alreadyComplete() {
    try {
      var done = JSON.parse(localStorage.getItem('aiready_completed') || '[]');
      return Array.isArray(done) && done.indexOf(file) !== -1;
    } catch (e) { return false; }
  }

  function remaining() {
    return checks.filter(function(kc) { return !kc.classList.contains('kc-done'); });
  }

  var gated = next && !alreadyComplete();

  function update() {
    if (!gated) return;
    var left = remaining().length;
    next.classList.toggle('kc-next-locked', left > 0);
    next.setAttribute('aria-disabled', left > 0 ? 'true' : 'false');
    if (hint) {
      hint.textContent = left > 0
        ? 'Answer the ' + (left === 1 ? 'last knowledge check' : left + ' knowledge checks') + ' above to continue. Any answer is fine.'
        : '';
    }
  }

  if (gated) {
    var nav = document.querySelector('.les-nav');
    if (nav) {
      hint = document.createElement('p');
      hint.className = 'kc-hint';
      nav.parentNode.insertBefore(hint, nav);
    }
    // Capture phase so this runs before progress.js marks the lesson complete.
    document.addEventListener('click', function(e) {
      if (!next.classList.contains('kc-next-locked')) return;
      if (!next.contains(e.target)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      var first = remaining()[0];
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, true);
    update();
  }
})();
