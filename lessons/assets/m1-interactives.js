(function() {
  'use strict';

  // In-page interactives for Module 1. Each widget finds its own markup, so a lesson
  // only includes the pieces it uses:
  //   .mi-sort       click-to-reveal sort cards (1.1, 1.3, 1.5)
  //   .mi-steps      step-through panels with Back / Next (1.2)
  //   .mi-thresh     threshold slider over 100 patients (1.4)
  //   .mi-shortcut   clickable regions on a drawn chest X-ray (1.5)
  //   .dt-explorer   tabbed Data Types explorer (1.3)

  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ── Sort cards ──
  // <div class="mi-sort" data-choices="Learned from examples|Hand-written rules">
  //   <div class="mi-card" data-answer="0"><div class="mi-card-text">...</div><div class="mi-card-why">...</div></div>
  // data-answer is the index of the expected choice; leave it off for opinion cards with no right answer.
  all('.mi-sort').forEach(function(box) {
    var choices = (box.getAttribute('data-choices') || '').split('|');
    var cards = all('.mi-card', box);
    var score = box.querySelector('.mi-score');
    var answered = 0, matched = 0, graded = 0;
    cards.forEach(function(card) {
      var hasAnswer = card.hasAttribute('data-answer');
      var answer = parseInt(card.getAttribute('data-answer'), 10);
      if (hasAnswer) graded++;
      var row = document.createElement('div');
      row.className = 'mi-choices';
      choices.forEach(function(label, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'mi-choice';
        b.textContent = label;
        b.addEventListener('click', function() {
          if (card.classList.contains('mi-answered')) return;
          card.classList.add('mi-answered');
          b.classList.add('mi-picked');
          if (!hasAnswer) card.classList.add('mi-neutral');
          else if (i === answer) { card.classList.add('mi-right'); matched++; }
          else card.classList.add('mi-wrong');
          answered++;
          if (score) {
            score.textContent = answered < cards.length
              ? answered + ' of ' + cards.length + ' done.'
              : (graded ? 'Done: ' + matched + ' of ' + graded + ' matched the expected answer.' : 'Done. Read how the readers labeled each case.');
          }
        });
        row.appendChild(b);
      });
      var why = card.querySelector('.mi-card-why');
      card.insertBefore(row, why);
    });
  });

  // ── Step-through ──
  all('.mi-steps').forEach(function(box) {
    var steps = all('.mi-step', box);
    if (!steps.length) return;
    var i = 0;
    var nav = document.createElement('div');
    nav.className = 'mi-step-nav';
    nav.innerHTML = '<button type="button" class="mi-btn" data-dir="-1">&larr; Back</button>' +
      '<div class="mi-dots">' + steps.map(function() { return '<span class="mi-dot"></span>'; }).join('') + '</div>' +
      '<button type="button" class="mi-btn mi-btn--fill" data-dir="1">Next step &rarr;</button>';
    box.appendChild(nav);
    var back = nav.querySelector('[data-dir="-1"]'), fwd = nav.querySelector('[data-dir="1"]');
    var dots = all('.mi-dot', nav);
    function show() {
      steps.forEach(function(s, k) { s.classList.toggle('active', k === i); });
      dots.forEach(function(d, k) { d.classList.toggle('active', k === i); });
      back.disabled = i === 0;
      fwd.innerHTML = i === steps.length - 1 ? 'Start over' : 'Next step &rarr;';
    }
    back.addEventListener('click', function() { if (i > 0) { i--; show(); } });
    fwd.addEventListener('click', function() { i = i === steps.length - 1 ? 0 : i + 1; show(); });
    show();
  });

  // ── Threshold slider ──
  // 100 made-up patients, 10 with a pneumothorax. Each has a PTX-Detect score from 0 to 1.
  all('.mi-thresh').forEach(function(box) {
    var sickScores = [0.95, 0.91, 0.88, 0.84, 0.79, 0.72, 0.66, 0.58, 0.47, 0.33];
    var people = [];
    for (var k = 0; k < 100; k++) {
      var sick = k < 10, s;
      if (sick) s = sickScores[k];
      else { var u = (((k - 10) * 37) % 90 + 0.5) / 90; s = Math.pow(u, 3) * 0.9; }
      people.push({ sick: sick, score: s, pos: (k * 43) % 100 });
    }
    people.sort(function(a, b) { return a.pos - b.pos; });

    box.innerHTML =
      '<div class="mi-thresh-top"><label for="mi-thresh-range">Alert threshold</label>' +
      '<input type="range" id="mi-thresh-range" min="5" max="95" step="5" value="50" aria-describedby="mi-thresh-note">' +
      '<span class="mi-thresh-val"></span></div>' +
      '<div class="mi-thresh-body"><div>' +
      '<div class="mi-grid" role="img" aria-label="100 patients colored by result"></div>' +
      '<div class="mi-legend">' +
      '<span><i style="background:#0e8177"></i>Pneumothorax, flagged (true positive)</span>' +
      '<span><i style="background:#fff;border:3px solid #a8492c"></i>Pneumothorax, missed (false negative)</span>' +
      '<span><i style="background:#f0b9a6"></i>No pneumothorax, flagged (false alarm)</span>' +
      '<span><i style="background:#dfe3e8"></i>No pneumothorax, cleared (true negative)</span>' +
      '</div></div>' +
      '<div class="mi-stats">' +
      '<div class="mi-stat"><b data-k="sens"></b><span>Sensitivity: of the 10 with a pneumothorax, how many were flagged</span></div>' +
      '<div class="mi-stat"><b data-k="spec"></b><span>Specificity: of the 90 without, how many were cleared</span></div>' +
      '<div class="mi-stat"><b data-k="ppv"></b><span>Of all the alerts, how many were real (PPV)</span></div>' +
      '</div></div>' +
      '<p class="mi-thresh-note" id="mi-thresh-note"></p>';

    var range = box.querySelector('input'), val = box.querySelector('.mi-thresh-val');
    var grid = box.querySelector('.mi-grid'), note = box.querySelector('.mi-thresh-note');
    var dots = people.map(function() {
      var d = document.createElement('span'); d.className = 'mi-person'; grid.appendChild(d); return d;
    });
    function render() {
      var t = range.value / 100, tp = 0, fn = 0, fp = 0, tn = 0;
      people.forEach(function(p, i) {
        var flag = p.score >= t, cls = p.sick ? (flag ? 'tp' : 'fn') : (flag ? 'fp' : 'tn');
        if (cls === 'tp') tp++; else if (cls === 'fn') fn++; else if (cls === 'fp') fp++; else tn++;
        dots[i].className = 'mi-person ' + cls;
      });
      val.textContent = t.toFixed(2);
      box.querySelector('[data-k="sens"]').textContent = tp + ' of 10 = ' + Math.round(tp * 10) + '%';
      box.querySelector('[data-k="spec"]').textContent = tn + ' of 90 = ' + Math.round(tn / 90 * 100) + '%';
      box.querySelector('[data-k="ppv"]').textContent = (tp + fp) ? tp + ' of ' + (tp + fp) + ' = ' + Math.round(tp / (tp + fp) * 100) + '%' : 'no alerts';
      if (t <= 0.3) note.textContent = 'Low threshold: PTX-Detect flags almost anything suspicious. It misses few or no pneumothoraces, but most alerts are false alarms. This suits screening, where a miss is costly.';
      else if (t >= 0.75) note.textContent = 'High threshold: alerts are rarer and more often real, but several pneumothoraces are now missed. This suits confirming, where false alarms are costly.';
      else note.textContent = 'Middle threshold: a trade-off. Move the slider and watch missed cases (white circles) and false alarms (pink) trade places.';
    }
    range.addEventListener('input', render);
    render();
  });

  // ── Spot the shortcut ──
  // <div class="mi-shortcut"> <svg>... <g class="mi-hot" data-key="drain">...</g> ...</svg>
  //   <div class="mi-shortcut-panel"> default text + <div class="mi-shortcut-info" data-key="drain" hidden>...</div></div>
  all('.mi-shortcut').forEach(function(box) {
    var hots = all('.mi-hot', box), infos = all('.mi-shortcut-info', box);
    var intro = box.querySelector('.mi-shortcut-intro');
    var count = box.querySelector('.mi-shortcut-count');
    function open(key, hot) {
      if (intro) intro.hidden = true;
      infos.forEach(function(el) { el.hidden = el.getAttribute('data-key') !== key; });
      hot.classList.add('seen');
      if (count) count.textContent = all('.mi-hot.seen', box).length + ' of ' + hots.length + ' regions explored';
    }
    hots.forEach(function(hot) {
      var key = hot.getAttribute('data-key');
      hot.setAttribute('tabindex', '0');
      hot.setAttribute('role', 'button');
      hot.addEventListener('click', function() { open(key, hot); });
      hot.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(key, hot); }
      });
    });
  });

  // ── Data Types explorer ──
  all('.dt-explorer').forEach(function(box) {
    var tabs = all('.dt-tab', box), panels = all('.dt-panel', box);
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        tabs.forEach(function(t) { t.classList.remove('active'); });
        panels.forEach(function(p) { p.classList.remove('active'); });
        tab.classList.add('active');
        box.querySelector('#' + tab.getAttribute('data-panel')).classList.add('active');
      });
    });
  });
})();
