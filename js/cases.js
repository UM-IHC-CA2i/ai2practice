var CaseEngine = (function() {
  'use strict';

  var STEPS = ['Case Type', 'Skill Level', 'Pathologies', 'Cases', 'Results'];

  var state = {
    step: 0,
    caseType: null,
    skillLevel: null,
    paths: [],
    aiCases: [],
    noAiCases: [],
    aiPhase: true,
    caseIdx: 0,
    resp: { ai: [], noAi: [] },
    config: null,
    allCases: []
  };

  function loadData(url, onSuccess, onError) {
    if (typeof fetch === 'function' && window.location.protocol !== 'file:') {
      fetch(url)
        .then(function(r) { return r.json(); })
        .then(onSuccess)
        .catch(onError);
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onload = function() {
        if (xhr.status === 200 || xhr.status === 0) {
          try { onSuccess(JSON.parse(xhr.responseText)); }
          catch(e) { onError(e); }
        } else { onError(); }
      };
      xhr.onerror = onError;
      xhr.send();
    }
  }

  function init(config) {
    state.config = config;
    loadData(config.dataUrl, function(data) {
      state.allCases = data.cases;
      renderLanding();
    }, function() {
      document.getElementById('cw-landing-content').innerHTML =
        '<div class="callout callout-red"><p>Failed to load case data. If opening locally, please use a local server (e.g. <code>python3 -m http.server</code>).</p></div>';
    });
  }

  function renderLanding() {
    var c = state.config;
    document.getElementById('cw-landing').style.display = 'block';
    document.getElementById('cw-dashboard').style.display = 'none';

    var h = '<div class="cw-landing-card">';
    h += '<h1>' + c.courseTitle + '</h1>';
    h += '<p class="cw-landing-desc">' + c.courseDesc + '</p>';
    h += '<div class="cw-landing-meta">';
    c.courseMeta.forEach(function(m) {
      h += '<div class="cw-landing-meta-item"><div class="cw-lm-label">' + m.label + '</div><div class="cw-lm-value">' + m.value + '</div></div>';
    });
    h += '</div>';
    h += '<div class="cw-landing-objectives"><h3>Learning Objectives</h3><ol>';
    c.objectives.forEach(function(o) { h += '<li>' + o + '</li>'; });
    h += '</ol></div>';
    h += '<button class="btn btn-primary btn-lg" id="begin-course">Begin Course</button>';
    h += '</div>';

    document.getElementById('cw-landing-content').innerHTML = h;
    document.getElementById('begin-course').addEventListener('click', function() {
      document.getElementById('cw-landing').style.display = 'none';
      document.getElementById('cw-dashboard').style.display = 'grid';
      state.step = 1;
      render();
    });
  }

  function renderSidebar() {
    var el = document.getElementById('cw-sidebar');
    if (!el) return;
    var h = '<div class="cw-sidebar-title">Progress</div>';
    STEPS.forEach(function(s, i) {
      var si = i + 1;
      var cls = 'cw-step-item';
      if (si < state.step) cls += ' completed';
      else if (si === state.step) cls += ' active';
      var icon = si < state.step ? '&#10003;' : (i + 1);
      h += '<div class="' + cls + '"><div class="cw-step-num">' + icon + '</div><span>' + s + '</span></div>';
    });
    if (state.caseType || state.skillLevel || state.paths.length) {
      h += '<div class="cw-sidebar-info"><div class="cw-info-label">Selected</div>';
      if (state.caseType) h += '<div class="cw-info-row"><strong>Type:</strong> ' + cap(state.caseType) + '</div>';
      if (state.skillLevel) {
        var ln = '';
        state.config.levels.forEach(function(l) { if (l.id === state.skillLevel) ln = l.name; });
        h += '<div class="cw-info-row"><strong>Level:</strong> ' + ln + '</div>';
      }
      if (state.paths.length) h += '<div class="cw-info-row"><strong>Pathologies:</strong> ' + state.paths.length + ' selected</div>';
      if (state.step === 4) {
        var done = state.resp.ai.length + state.resp.noAi.length;
        var total = state.aiCases.length + state.noAiCases.length;
        h += '<div class="cw-info-row" style="margin-top:8px;"><strong>Progress:</strong> ' + done + ' / ' + total + '</div>';
      }
      h += '</div>';
    }
    el.innerHTML = h;
  }

  function main() { return document.getElementById('cw-main'); }

  function render() {
    renderSidebar();
    var fn = { 1: renderType, 2: renderLevel, 3: renderPath, 4: renderCases, 5: renderResults };
    if (fn[state.step]) fn[state.step]();
    var m = main();
    if (m) m.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── Step 1: Case Type ── */
  function renderType() {
    var el = main();
    var types = state.config.caseTypes || ['never-skilling', 'mis-skilling', 'deskilling'];
    var descs = {
      'never-skilling': 'Select cases you have NOT learned before. Explore how AI can prevent skill formation.',
      'mis-skilling': 'Select cases you learned but are NOT confident in. See how AI errors become your errors.',
      'deskilling': 'Select cases you learned and ARE confident in. Test whether AI reliance has eroded your skills.'
    };
    var h = '<h2>What type of cases do you want to learn about?</h2>';
    h += '<p class="cw-sub">Select the AI risk pattern you want to explore through interactive cases.</p>';
    h += '<div class="option-group">';
    types.forEach(function(t) {
      h += '<div class="option-item" data-val="' + t + '"><input type="radio" name="ct" value="' + t + '">';
      h += '<div><label><strong>' + cap(t) + '</strong></label>';
      h += '<div style="font-size:0.82rem;color:var(--gray-400);margin-top:2px;">' + (descs[t] || '') + '</div></div></div>';
    });
    h += '</div>';
    h += '<div class="cw-actions"><div></div><button class="btn btn-primary" id="nxt" disabled>Next</button></div>';
    el.innerHTML = h;
    bindRadio(el, 'caseType');
    document.getElementById('nxt').addEventListener('click', function() { state.step = 2; render(); });
  }

  /* ── Step 2: Skill Level ── */
  function renderLevel() {
    var el = main();
    var h = '<h2>What is your skill level?</h2>';
    h += '<p class="cw-sub">We will tailor pathology suggestions based on your experience.</p>';
    h += '<div class="option-group">';
    state.config.levels.forEach(function(l) {
      h += '<div class="option-item" data-val="' + l.id + '"><input type="radio" name="sl" value="' + l.id + '">';
      h += '<div><label><strong>' + l.name + '</strong></label>';
      h += '<div style="font-size:0.82rem;color:var(--gray-400);margin-top:2px;">' + l.desc + '</div></div></div>';
    });
    h += '</div>';
    h += '<div class="cw-actions"><button class="btn btn-outline" id="bk">Back</button>';
    h += '<button class="btn btn-primary" id="nxt" disabled>Next</button></div>';
    el.innerHTML = h;
    bindRadio(el, 'skillLevel');
    document.getElementById('bk').addEventListener('click', function() { state.step = 1; render(); });
    document.getElementById('nxt').addEventListener('click', function() { state.step = 3; render(); });
  }

  /* ── Step 3: Pathologies ── */
  function renderPath() {
    var el = main();
    var sug = getSuggestion(state.skillLevel);
    var prompts = {
      'never-skilling': 'Select pathologies you have <strong>not</strong> studied or are unfamiliar with.',
      'mis-skilling': 'Select pathologies you have studied but are <strong>not confident</strong> in.',
      'deskilling': 'Select pathologies you have studied and <strong>are confident</strong> in.'
    };
    var h = '<h2>Choose pathologies to practice</h2>';
    h += '<p class="cw-sub">' + (prompts[state.caseType] || 'Select pathologies.') + '</p>';
    if (sug) {
      h += '<div class="callout callout-teal" style="margin-bottom:20px;">';
      h += '<div class="callout-title">Suggested for your level</div>';
      h += '<p class="mb-0" style="font-size:0.85rem;">' + sug + '</p></div>';
    }
    h += '<div class="pathology-grid">';
    state.config.pathologies.forEach(function(p) {
      h += '<div class="pathology-card" data-id="' + p.id + '">' + p.name + '<span class="difficulty-label">' + p.difficulty + '</span></div>';
    });
    h += '</div>';
    h += '<div class="cw-actions"><button class="btn btn-outline" id="bk">Back</button>';
    h += '<button class="btn btn-primary" id="nxt" disabled>Start Cases</button></div>';
    el.innerHTML = h;

    el.querySelectorAll('.pathology-card').forEach(function(card) {
      card.addEventListener('click', function() {
        card.classList.toggle('selected');
        state.paths = [];
        el.querySelectorAll('.pathology-card.selected').forEach(function(c) { state.paths.push(c.dataset.id); });
        document.getElementById('nxt').disabled = state.paths.length === 0;
      });
    });
    document.getElementById('bk').addEventListener('click', function() { state.step = 2; render(); });
    document.getElementById('nxt').addEventListener('click', function() {
      buildCaseSet();
      state.aiPhase = true;
      state.caseIdx = 0;
      state.resp = { ai: [], noAi: [] };
      state.step = 4;
      render();
    });
  }

  /* ── Step 4: Cases (AI + no-AI combined) ── */
  function renderCases() {
    var el = main();
    var cases = state.aiPhase ? state.aiCases : state.noAiCases;
    var c = cases[state.caseIdx];

    if (!c && state.aiPhase) {
      state.aiPhase = false;
      state.caseIdx = 0;
      renderTransition();
      return;
    }
    if (!c && !state.aiPhase) {
      state.step = 5;
      render();
      return;
    }

    var aiDone = state.aiPhase ? state.caseIdx : state.aiCases.length;
    var noAiDone = state.aiPhase ? 0 : state.caseIdx;
    var totalAll = state.aiCases.length + state.noAiCases.length;
    var doneAll = aiDone + noAiDone;
    var pct = Math.round((doneAll / totalAll) * 100);

    var phaseLabel = state.aiPhase ? 'With AI Assistance' : 'Without AI';
    var phaseCls = state.aiPhase ? 'cw-phase-ai' : 'cw-phase-noai';
    var localTotal = cases.length;

    var h = '<div class="cw-phase-banner ' + phaseCls + '">' + phaseLabel + ' &mdash; Case ' + (state.caseIdx + 1) + ' of ' + localTotal + '</div>';
    h += '<div style="display:flex;justify-content:space-between;align-items:baseline;">';
    h += '<h2 style="margin:0;">Case ' + (doneAll + 1) + ' of ' + totalAll + '</h2>';
    h += '<span style="font-size:0.82rem;color:var(--gray-400);">' + cap(c.pathology.replace(/_/g, ' ')) + ' &middot; ' + c.difficulty + '</span></div>';
    h += '<div class="progress-bar" style="margin:12px 0 24px;"><div class="progress-fill" style="width:' + pct + '%;transition:width 0.4s ease;"></div></div>';

    h += '<div class="case-viewer">';
    h += '<div class="case-scenario-text">' + c.scenario + '</div>';
    h += '<div class="case-image-placeholder"><div class="placeholder-icon">&#128444;</div>Radiology image would appear here</div>';

    if (state.aiPhase) {
      h += '<div class="ai-overlay"><div class="ai-overlay-label">AI Findings</div><div class="ai-overlay-content">';
      c.ai_findings.forEach(function(f) { h += '<p style="margin-bottom:4px;">' + f + '</p>'; });
      h += '</div></div>';
    }

    h += '<div class="response-area"><label>What are your findings?</label><div class="response-options">';
    c.options.forEach(function(o, i) {
      h += '<button class="response-option" data-i="' + i + '">' + o + '</button>';
    });
    h += '</div></div>';
    h += '<div class="case-feedback" id="fb"></div>';
    h += '</div>';
    h += '<div class="cw-actions"><div></div><button class="btn btn-primary" id="nxt" disabled>Next Case</button></div>';
    el.innerHTML = h;

    var answered = false;
    el.querySelectorAll('.response-option').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (answered) return;
        answered = true;
        var ci = parseInt(btn.dataset.i);
        var ok = ci === c.correct;
        el.querySelectorAll('.response-option').forEach(function(b, i) {
          b.style.cursor = 'default';
          if (i === c.correct) b.classList.add('correct');
          if (i === ci && !ok) b.classList.add('incorrect');
        });
        var fb = document.getElementById('fb');
        fb.className = 'case-feedback shown ' + (ok ? 'correct-feedback' : 'incorrect-feedback');
        fb.innerHTML = '<strong>' + (ok ? 'Correct.' : 'Incorrect.') + '</strong> ' + c.explanation;
        var arr = state.aiPhase ? state.resp.ai : state.resp.noAi;
        arr.push({ correct: ok });
        document.getElementById('nxt').disabled = false;
        renderSidebar();
      });
    });

    document.getElementById('nxt').addEventListener('click', function() {
      state.caseIdx++;
      var cur = state.aiPhase ? state.aiCases : state.noAiCases;
      if (state.caseIdx >= cur.length) {
        if (state.aiPhase) {
          state.aiPhase = false;
          state.caseIdx = 0;
          renderTransition();
        } else {
          state.step = 5;
          render();
        }
      } else {
        renderCases();
        renderSidebar();
        main().scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  function renderTransition() {
    var el = main();
    var h = '<div class="cw-transition">';
    h += '<h3>AI Assistance Removed</h3>';
    h += '<p>You completed ' + state.aiCases.length + ' cases with AI. Now you will see ' + state.noAiCases.length + ' cases <strong>without</strong> AI assistance. Let us see how your independent skills compare.</p>';
    h += '<button class="btn btn-primary btn-lg" id="continue-noai">Continue Without AI</button>';
    h += '</div>';
    el.innerHTML = h;
    renderSidebar();
    document.getElementById('continue-noai').addEventListener('click', function() {
      renderCases();
      main().scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ── Step 5: Results ── */
  function renderResults() {
    var el = main();
    var aiOk = state.resp.ai.filter(function(r) { return r.correct; }).length;
    var noOk = state.resp.noAi.filter(function(r) { return r.correct; }).length;
    var aiT = state.resp.ai.length;
    var noT = state.resp.noAi.length;
    var aiP = aiT ? Math.round(aiOk / aiT * 100) : 0;
    var noP = noT ? Math.round(noOk / noT * 100) : 0;
    var diff = aiP - noP;

    var h = '<h2>Your Results</h2>';
    h += '<p class="cw-sub">Compare your performance with and without AI assistance.</p>';
    h += '<div class="results-comparison">';
    h += '<div class="result-card with-ai"><div class="result-value">' + aiP + '%</div><div class="result-label">With AI (' + aiOk + '/' + aiT + ' correct)</div></div>';
    h += '<div class="result-card without-ai"><div class="result-value">' + noP + '%</div><div class="result-label">Without AI (' + noOk + '/' + noT + ' correct)</div></div>';
    h += '</div>';

    h += '<div class="section-block"><h3 class="mt-0">What This Means</h3>';
    if (state.caseType === 'never-skilling') {
      h += diff > 20
        ? '<p>Your performance dropped significantly without AI. This is consistent with <strong>never-skilling</strong> &mdash; the AI was doing cognitive work you had not yet built the skills to do independently.</p>'
        : diff > 0
        ? '<p>Your performance was somewhat lower without AI. You may have some foundational skills, but there is room to build more independent capability.</p>'
        : '<p>Your performance was similar with and without AI. This suggests you have independent skills in these areas.</p>';
    } else if (state.caseType === 'mis-skilling') {
      h += '<p>Review the cases where you answered incorrectly. If your errors follow the same patterns as the AI\'s known error tendencies, this suggests <strong>mis-skilling</strong> &mdash; you may have absorbed systematic biases from AI output.</p>';
    } else {
      h += diff > 15
        ? '<p>Your performance dropped without AI in areas where you previously had competency. This is consistent with <strong>deskilling</strong> &mdash; your existing skills may be eroding from AI reliance.</p>'
        : '<p>Your performance remained relatively stable without AI. Your existing skills appear well-maintained.</p>';
    }
    h += '<p class="mb-0"><strong>Recommendation:</strong> Practice these pathologies without AI assistance regularly to build or maintain independent competency.</p></div>';

    h += '<h3>Summary</h3>';
    h += '<div class="callout callout-blue"><div class="callout-title">Course Complete</div>';
    h += '<p>You completed <strong>' + aiT + ' cases with AI</strong> and <strong>' + noT + ' cases without AI</strong>.</p>';
    h += '<p>Risk type: <strong>' + cap(state.caseType) + '</strong></p>';
    var levelName = '';
    state.config.levels.forEach(function(l) { if (l.id === state.skillLevel) levelName = l.name; });
    h += '<p class="mb-0">Skill level: <strong>' + levelName + '</strong></p></div>';

    h += '<div class="cw-actions"><button class="btn btn-outline" id="restart">Start Over</button>';
    h += '<a href="' + state.config.backUrl + '" class="btn btn-primary">Back to ' + state.config.backLabel + '</a></div>';
    el.innerHTML = h;

    document.getElementById('restart').addEventListener('click', function() {
      state.step = 0;
      state.caseType = null;
      state.skillLevel = null;
      state.paths = [];
      state.aiCases = [];
      state.noAiCases = [];
      state.caseIdx = 0;
      state.aiPhase = true;
      state.resp = { ai: [], noAi: [] };
      renderLanding();
    });
  }

  /* ── Helpers ── */
  function bindRadio(el, key) {
    el.querySelectorAll('.option-item').forEach(function(item) {
      item.addEventListener('click', function() {
        item.querySelector('input').checked = true;
        el.querySelectorAll('.option-item').forEach(function(e) { e.classList.remove('selected'); });
        item.classList.add('selected');
        state[key] = item.dataset.val;
        document.getElementById('nxt').disabled = false;
      });
    });
  }

  function buildCaseSet() {
    var filtered = state.allCases.filter(function(c) {
      return c.type === state.caseType && state.paths.indexOf(c.pathology) !== -1;
    });
    if (filtered.length === 0) {
      filtered = state.allCases.filter(function(c) { return c.type === state.caseType; });
    }
    shuffle(filtered);
    var aiCount = Math.min(3, filtered.length);
    var noAiCount = Math.min(2, Math.max(filtered.length - aiCount, 1));
    state.aiCases = filtered.slice(0, aiCount);
    state.noAiCases = filtered.length > aiCount
      ? filtered.slice(aiCount, aiCount + noAiCount)
      : filtered.slice(0, noAiCount);
  }

  function getSuggestion(level) {
    if (level === 'medical_student') return 'Start with <strong>Easy</strong> pathologies (long bone fractures, pleural effusion, pneumothorax) to build foundational pattern recognition.';
    if (level === 'radiology_resident') return 'Focus on <strong>Medium</strong> and <strong>Hard</strong> pathologies where AI dependency risk is highest (lung nodules, mammography, cardiomegaly).';
    if (level === 'attending') return 'Try <strong>Hard</strong> pathologies to test for deskilling effects. Areas where you use AI most frequently are the highest risk.';
    return '';
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  return { init: init };
})();
