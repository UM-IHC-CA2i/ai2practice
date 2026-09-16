var CheckpointQuiz = (function() {
  'use strict';

  var STORAGE_KEY = 'aiready_completed';
  var PASS_KEY_PREFIX = 'aiready_ckpt_';

  var state = {
    answers: {},
    answered: 0,
    total: 0,
    submitted: false,
    config: null
  };

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

  function hasPassed(lessonKey) {
    try {
      return sessionStorage.getItem(PASS_KEY_PREFIX + lessonKey) === '1';
    } catch(e) { return false; }
  }

  function setPassed(lessonKey) {
    try { sessionStorage.setItem(PASS_KEY_PREFIX + lessonKey, '1'); } catch(e) {}
  }

  function init(config) {
    state.config = config;
    state.total = document.querySelectorAll('.ckpt-question').length;
    state.answers = {};
    state.answered = 0;
    state.submitted = false;

    if (hasPassed(config.lessonKey)) {
      showAlreadyPassed();
      return;
    }

    bindMC();
    bindFill();
    bindSubmit();
    bindRetry();
    updateSubmitState();
  }

  function bindMC() {
    document.querySelectorAll('.ckpt-question[data-type="mc"]').forEach(function(q) {
      q.querySelectorAll('.quiz-option').forEach(function(opt) {
        opt.addEventListener('click', function() {
          if (state.submitted) return;
          q.querySelectorAll('.quiz-option').forEach(function(o) { o.classList.remove('selected'); });
          opt.classList.add('selected');
          var qIdx = q.getAttribute('data-q');
          var wasAnswered = state.answers.hasOwnProperty(qIdx);
          state.answers[qIdx] = opt.getAttribute('data-idx');
          if (!wasAnswered) state.answered++;
          updateSubmitState();
        });
      });
    });
  }

  function bindFill() {
    document.querySelectorAll('.ckpt-question[data-type="fill"]').forEach(function(q) {
      var input = q.querySelector('.ckpt-input');
      if (!input) return;
      input.addEventListener('input', function() {
        if (state.submitted) return;
        var qIdx = q.getAttribute('data-q');
        var val = input.value.trim();
        var wasAnswered = state.answers.hasOwnProperty(qIdx);
        if (val.length > 0) {
          state.answers[qIdx] = val;
          if (!wasAnswered) state.answered++;
        } else {
          if (wasAnswered) {
            delete state.answers[qIdx];
            state.answered--;
          }
        }
        updateSubmitState();
      });
    });
  }

  function updateSubmitState() {
    var btn = document.getElementById('ckpt-submit-btn');
    var hint = document.getElementById('ckpt-submit-hint');
    if (!btn) return;
    if (state.answered >= state.total) {
      btn.disabled = false;
      if (hint) hint.textContent = 'Ready to check your answers.';
    } else {
      btn.disabled = true;
      if (hint) hint.textContent = 'Answer all ' + state.total + ' questions to check.';
    }
  }

  function checkAnswer(q) {
    var type = q.getAttribute('data-type');
    var qIdx = q.getAttribute('data-q');

    if (type === 'mc') {
      var correctIdx = q.getAttribute('data-correct');
      var chosen = state.answers[qIdx];
      q.querySelectorAll('.quiz-option').forEach(function(opt) {
        var idx = opt.getAttribute('data-idx');
        opt.style.cursor = 'default';
        opt.style.pointerEvents = 'none';
        if (idx === correctIdx) opt.classList.add('correct-answer');
        if (idx === chosen) {
          opt.classList.remove('selected');
          opt.classList.add(chosen === correctIdx ? 'correct' : 'incorrect');
        }
      });
      return chosen === correctIdx;

    } else if (type === 'fill') {
      var expected = q.getAttribute('data-answer').toLowerCase().trim();
      var tolerance = parseFloat(q.getAttribute('data-tolerance') || '0');
      var given = (state.answers[qIdx] || '').toLowerCase().trim();
      var input = q.querySelector('.ckpt-input');
      if (input) input.disabled = true;

      var isCorrect = false;
      if (tolerance > 0 && !isNaN(parseFloat(expected)) && !isNaN(parseFloat(given))) {
        isCorrect = Math.abs(parseFloat(given) - parseFloat(expected)) <= tolerance;
      } else {
        var acceptList = expected.split('|');
        isCorrect = acceptList.indexOf(given) !== -1;
      }

      if (input) {
        input.classList.add(isCorrect ? 'ckpt-input--correct' : 'ckpt-input--incorrect');
        if (!isCorrect) {
          var correction = document.createElement('div');
          correction.className = 'ckpt-correction';
          correction.textContent = 'Correct answer: ' + q.getAttribute('data-answer').split('|')[0];
          input.parentNode.insertBefore(correction, input.nextSibling);
        }
      }
      return isCorrect;
    }
    return false;
  }

  function bindSubmit() {
    var btn = document.getElementById('ckpt-submit-btn');
    if (!btn) return;

    btn.addEventListener('click', function() {
      if (state.submitted) return;
      state.submitted = true;

      var correct = 0;
      document.querySelectorAll('.ckpt-question').forEach(function(q) {
        if (checkAnswer(q)) correct++;
        var expl = q.querySelector('.quiz-explanation');
        if (expl) expl.classList.add('shown');
      });

      var pct = Math.round((correct / state.total) * 100);
      var threshold = (state.config.passThreshold || 0.8) * 100;

      var results = document.getElementById('ckpt-results');
      if (!results) return;
      results.style.display = 'block';

      document.getElementById('ckpt-score').textContent = pct + '%';
      document.getElementById('ckpt-correct-count').textContent = correct;
      document.getElementById('ckpt-total-count').textContent = state.total;

      btn.style.display = 'none';
      var hint = document.getElementById('ckpt-submit-hint');
      if (hint) hint.style.display = 'none';

      if (pct >= threshold) {
        document.getElementById('ckpt-status').textContent = 'Checkpoint Passed';
        document.getElementById('ckpt-status').className = 'quiz-status passed';
        var passMsg = document.getElementById('ckpt-pass-msg');
        if (passMsg) passMsg.style.display = 'block';
        var retrySection = document.getElementById('ckpt-retry-section');
        if (retrySection) retrySection.style.display = 'none';

        markCompleted(state.config.lessonKey);
        setPassed(state.config.lessonKey);

        var nextBtn = document.getElementById('les-next');
        if (nextBtn) {
          nextBtn.classList.add('ckpt-next-enabled');
          nextBtn.classList.remove('ckpt-next-locked');
        }

        var pillTray = document.querySelector('.pill-tray');
        if (pillTray) {
          rebuildActivePill();
        }
      } else {
        document.getElementById('ckpt-status').textContent = 'Not Yet — Try Again';
        document.getElementById('ckpt-status').className = 'quiz-status failed';
        var passMsg2 = document.getElementById('ckpt-pass-msg');
        if (passMsg2) passMsg2.style.display = 'none';
        var retrySection2 = document.getElementById('ckpt-retry-section');
        if (retrySection2) retrySection2.style.display = 'block';
      }

      results.scrollIntoView({ behavior: 'smooth' });
    });
  }

  function rebuildActivePill() {
    var currentPill = document.querySelector('.pill-item.pill--active-teal');
    if (!currentPill) return;
    currentPill.classList.remove('pill--active-teal');
    currentPill.classList.add('pill--completed');
    var num = currentPill.querySelector('.pill-num');
    if (num) {
      num.classList.remove('pill-num--research');
      num.innerHTML = '<svg class="pill-check" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      num.style.background = '#059669';
      num.style.border = 'none';
      num.style.color = '#fff';
    }
  }

  function bindRetry() {
    var btn = document.getElementById('ckpt-retry-btn');
    if (!btn) return;

    btn.addEventListener('click', function() {
      state.submitted = false;
      state.answered = 0;
      state.answers = {};

      document.querySelectorAll('.ckpt-question').forEach(function(q) {
        q.querySelectorAll('.quiz-option').forEach(function(opt) {
          opt.classList.remove('selected', 'correct', 'incorrect', 'correct-answer');
          opt.style.cursor = 'pointer';
          opt.style.pointerEvents = '';
        });
        var input = q.querySelector('.ckpt-input');
        if (input) {
          input.disabled = false;
          input.value = '';
          input.classList.remove('ckpt-input--correct', 'ckpt-input--incorrect');
        }
        var correction = q.querySelector('.ckpt-correction');
        if (correction) correction.remove();
        var expl = q.querySelector('.quiz-explanation');
        if (expl) expl.classList.remove('shown');
      });

      document.getElementById('ckpt-results').style.display = 'none';
      var submitBtn = document.getElementById('ckpt-submit-btn');
      if (submitBtn) { submitBtn.style.display = ''; submitBtn.disabled = true; }
      var hint = document.getElementById('ckpt-submit-hint');
      if (hint) { hint.style.display = ''; hint.textContent = 'Answer all ' + state.total + ' questions to check.'; }

      var section = document.getElementById('ckpt-section');
      if (section) section.scrollIntoView({ behavior: 'smooth' });
    });
  }

  function showAlreadyPassed() {
    var section = document.getElementById('ckpt-section');
    if (!section) return;

    var questions = section.querySelectorAll('.ckpt-question');
    questions.forEach(function(q) { q.style.display = 'none'; });

    var submitBtn = document.getElementById('ckpt-submit-btn');
    if (submitBtn) submitBtn.style.display = 'none';
    var hint = document.getElementById('ckpt-submit-hint');
    if (hint) hint.style.display = 'none';

    var results = document.getElementById('ckpt-results');
    if (results) {
      results.style.display = 'block';
      document.getElementById('ckpt-status').textContent = 'Checkpoint Passed';
      document.getElementById('ckpt-status').className = 'quiz-status passed';
      document.getElementById('ckpt-score').textContent = '';
      var countLine = document.querySelector('.quiz-score-label');
      if (countLine) countLine.textContent = 'You have already passed this checkpoint.';
    }

    var passMsg = document.getElementById('ckpt-pass-msg');
    if (passMsg) passMsg.style.display = 'block';
    var retrySection = document.getElementById('ckpt-retry-section');
    if (retrySection) retrySection.style.display = 'none';
  }

  return { init: init };
})();
