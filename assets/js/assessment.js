var AssessmentEngine = (function() {
  'use strict';

  var state = {
    answers: {},
    answered: 0,
    total: 0,
    submitted: false,
    config: null
  };

  function pathwayKey() {
    var q = new URLSearchParams(window.location.search).get('pathway');
    var valid = ['beginner','intermediate','advanced'];
    if (valid.indexOf(q) !== -1) return q;
    try { q = localStorage.getItem('ai2practice_pathway_v1'); } catch(e) { q = null; }
    return valid.indexOf(q) !== -1 ? q : 'beginner';
  }
  function recordAssessment(pct, correct, total) {
    try {
      var p = pathwayKey(), raw=localStorage.getItem('ai2practice_assessments_v1'), data=raw?JSON.parse(raw):{};
      if(!data||typeof data!=='object'||Array.isArray(data))data={}; var old=data[p]||{}, best=Math.max(Number(old.bestScore)||0,pct);
      data[p]={bestScore:best,passed:!!old.passed||pct>=80,correct:correct,total:total,updatedAt:new Date().toISOString()};
      localStorage.setItem('ai2practice_assessments_v1',JSON.stringify(data)); if(!localStorage.getItem('ai2practice_pathway_v1'))localStorage.setItem('ai2practice_pathway_v1',p);
      try { window.dispatchEvent(new CustomEvent('ai2practice:progress-changed')); } catch(e) {}
    } catch(e) {}
  }

  function init(config) {
    state.config = config;
    state.total = document.querySelectorAll('.quiz-question').length;
    bindOptions();
    bindSubmit();
    bindRetry();
  }

  function bindOptions() {
    document.querySelectorAll('.quiz-question').forEach(function(q, qi) {
      q.querySelectorAll('.quiz-option').forEach(function(opt) {
        opt.addEventListener('click', function() {
          if (state.submitted) return;
          q.querySelectorAll('.quiz-option').forEach(function(o) { o.classList.remove('selected'); });
          opt.classList.add('selected');
          var wasAnswered = state.answers.hasOwnProperty(qi);
          state.answers[qi] = parseInt(opt.getAttribute('data-idx'));
          if (!wasAnswered) {
            state.answered++;
            updateProgress();
          }
        });
      });
    });
  }

  function updateProgress() {
    var pct = Math.round((state.answered / state.total) * 100);
    var bar = document.getElementById('quiz-progress');
    if (bar) bar.style.width = pct + '%';
    var btn = document.getElementById('submit-quiz-btn');
    if (btn && state.answered === state.total) {
      btn.disabled = false;
      var hint = document.getElementById('submit-hint');
      if (hint) hint.textContent = 'Ready to submit.';
    }
  }

  function bindSubmit() {
    var btn = document.getElementById('submit-quiz-btn');
    if (!btn) return;

    btn.addEventListener('click', function() {
      if (state.submitted) return;
      state.submitted = true;

      var correct = 0;
      document.querySelectorAll('.quiz-question').forEach(function(q, qi) {
        var correctIdx = parseInt(q.getAttribute('data-correct'));
        var chosen = state.answers[qi];
        q.querySelectorAll('.quiz-option').forEach(function(opt) {
          var idx = parseInt(opt.getAttribute('data-idx'));
          opt.disabled = true;
          opt.style.cursor = 'default';
          if (idx === correctIdx) opt.classList.add('correct-answer');
          if (idx === chosen) {
            opt.classList.remove('selected');
            opt.classList.add(chosen === correctIdx ? 'correct' : 'incorrect');
          }
        });
        var expl = q.querySelector('.quiz-explanation');
        if (expl) expl.classList.add('shown');
        if (chosen === correctIdx) correct++;
      });

      var pct = Math.round((correct / state.total) * 100);
      recordAssessment(pct, correct, state.total);
      var results = document.getElementById('quiz-results');
      if (!results) return;

      results.style.display = 'block';
      document.getElementById('quiz-score').textContent = pct + '%';
      document.getElementById('quiz-correct-count').textContent = correct;
      document.getElementById('quiz-total-count').textContent = state.total;

      btn.style.display = 'none';
      var hint = document.getElementById('submit-hint');
      if (hint) hint.style.display = 'none';

      if (pct >= 80) {
        document.getElementById('quiz-status').textContent = 'Passed';
        document.getElementById('quiz-status').className = 'quiz-status passed';
        var cert = document.getElementById('cert-section');
        if (cert) { cert.style.display = 'block'; cert.innerHTML = '<p><strong>Assessment passed.</strong> Your score is saved locally. The certificate unlocks once the required published lessons are also complete.</p><p><a class="btn btn-accent" href="#progress" data-open-progress="true">View progress &amp; completion</a></p>'; }
        var retryHide = document.getElementById('retry-section');
        if (retryHide) retryHide.style.display = 'none';
      } else {
        document.getElementById('quiz-status').textContent = 'Not Yet';
        document.getElementById('quiz-status').className = 'quiz-status failed';
        var certHide = document.getElementById('cert-section');
        if (certHide) certHide.style.display = 'none';
        var retry = document.getElementById('retry-section');
        if (retry) retry.style.display = 'block';
      }

      results.scrollIntoView({ behavior: 'smooth' });
    });
  }

  function bindRetry() {
    var btn = document.getElementById('retry-btn');
    if (!btn) return;

    btn.addEventListener('click', function() {
      state.submitted = false;
      state.answered = 0;
      state.answers = {};

      document.querySelectorAll('.quiz-question').forEach(function(q) {
        q.querySelectorAll('.quiz-option').forEach(function(opt) {
          opt.classList.remove('selected', 'correct', 'incorrect', 'correct-answer');
          opt.disabled = false;
          opt.style.cursor = 'pointer';
        });
        var expl = q.querySelector('.quiz-explanation');
        if (expl) expl.classList.remove('shown');
      });

      document.getElementById('quiz-results').style.display = 'none';
      var bar = document.getElementById('quiz-progress');
      if (bar) bar.style.width = '0%';
      var submitBtn = document.getElementById('submit-quiz-btn');
      if (submitBtn) { submitBtn.style.display = ''; submitBtn.disabled = true; }
      var hint = document.getElementById('submit-hint');
      if (hint) { hint.style.display = ''; hint.textContent = 'Answer all ' + state.total + ' questions to submit.'; }

      window.scrollTo({ top: document.getElementById('assessment-section').offsetTop - 80, behavior: 'smooth' });
    });
  }

  return { init: init };
})();
