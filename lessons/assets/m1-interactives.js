(function() {
  'use strict';

  // In-page interactives for Module 1. Each widget finds its own markup, so a lesson
  // only includes the pieces it uses:
  //   .mi-sort       click-to-reveal sort cards (1.1, 1.3, 1.5)
  //   .mi-steps      step-through panels with Back / Next (1.2)
  //   .mi-thresh     threshold slider over 100 patients, with a live 2x2 table (1.4)
  //   .mi-prev       same tool in two places: prevalence changes PPV and NPV (1.4)
  //   .mi-overfit    train too long: training vs test score (1.4)
  //   .mi-ci         test set size vs confidence interval (1.4)
  //   .mi-shortcut   clickable regions on a chest X-ray (1.5)
  //   .mi-adv        invisible change: real model, targeted change (1.5)
  //   .mi-scan       different scanner: real chest X-ray model, vendor-style processing (1.5)
  //   .mi-bias       who is in the training set: one cutoff, male vs female films (1.5)
  //   .mi-name       name the problem: a dropdown per scenario (1.5)
  //   .dt-explorer   tabbed Data Types explorer (1.3)
  //   .m1-spec       rule-or-learned spectrum with tappable tools (1.1)
  //   .m1-fit        fit-a-line demo (1.1)
  //   .m1-rings      nested AI / ML / DL / generative rings (1.1)
  //   (the 1.1 vision lab lives in vision-lab.js)

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
      '<table class="mi-tt" aria-label="2 by 2 table at this threshold"><tr><th></th><th>Sick</th><th>Healthy</th></tr>' +
      '<tr><th>Alert</th><td class="tp" data-k="tp"></td><td class="fp" data-k="fp"></td></tr>' +
      '<tr><th>No alert</th><td class="fn" data-k="fn"></td><td class="tn" data-k="tn"></td></tr></table>' +
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
      box.querySelector('[data-k="tp"]').innerHTML = tp + '<small>true pos.</small>';
      box.querySelector('[data-k="fp"]').innerHTML = fp + '<small>false pos.</small>';
      box.querySelector('[data-k="fn"]').innerHTML = fn + '<small>false neg.</small>';
      box.querySelector('[data-k="tn"]').innerHTML = tn + '<small>true neg.</small>';
      if (t <= 0.3) note.textContent = 'Low threshold: PTX-Detect flags almost anything suspicious. It misses few or no pneumothoraces, but most alerts are false alarms. This suits screening, where a miss is costly.';
      else if (t >= 0.75) note.textContent = 'High threshold: alerts are rarer and more often real, but several pneumothoraces are now missed. This suits confirming, where false alarms are costly.';
      else note.textContent = 'Middle threshold: a trade-off. Move the slider and watch missed cases (white circles) and false alarms (pink) trade places.';
    }
    range.addEventListener('input', render);
    render();
  });

  // ── Same tool, two places ──
  // 1,000 patients; PTX-Detect is 90% sensitive and 90% specific. A guess comes first, then the places unlock.
  all('.mi-prev').forEach(function(box) {
    var PLACES = [
      { name: 'Emergency department', sick: 200, note: '1 in 5 patients scanned has a pneumothorax' },
      { name: 'Screening clinic', sick: 10, note: '1 in 100 patients scanned has a pneumothorax' }
    ];
    var order = [];
    for (var k = 0; k < 1000; k++) order.push((k * 379) % 1000); // a fixed shuffle so dots look scattered
    box.innerHTML =
      '<div class="mi-prev-guess"><p><strong>Guess first:</strong> in the screening clinic, when PTX-Detect raises an alert, how often is it real?</p>' +
      '<div class="mi-choices"><button class="mi-choice" data-g="0">About 9 in 10</button><button class="mi-choice" data-g="1">About half</button><button class="mi-choice" data-g="2">Less than 1 in 10</button></div>' +
      '<p class="mi-prev-fb" hidden></p></div>' +
      '<div class="mi-prev-tabs" role="group" aria-label="Place">' + PLACES.map(function(p, i) {
        return '<button class="mi-btn" data-p="' + i + '" disabled>' + p.name + '</button>';
      }).join('') + '</div>' +
      '<p class="mi-prev-note"></p>' +
      '<div class="mi-thresh-body"><div><div class="mi-grid mi-grid--k" role="img" aria-label="1,000 patients colored by result"></div>' +
      '<div class="mi-legend mi-legend--row">' +
      '<span><i style="background:#0e8177"></i>Real alert</span><span><i style="background:#f0b9a6"></i>False alarm</span>' +
      '<span><i style="background:#fff;border:2px solid #a8492c"></i>Missed</span><span><i style="background:#dfe3e8"></i>Correctly cleared</span></div></div>' +
      '<div class="mi-stats">' +
      '<div class="mi-stat"><b data-k="ppv">?</b><span>PPV: of all the alerts, how many were real</span></div>' +
      '<div class="mi-stat"><b data-k="npv">?</b><span>NPV: of all the cleared films, how many were really clear</span></div>' +
      '</div></div>';
    var grid = box.querySelector('.mi-grid'), tabs = all('[data-p]', box), cur = -1;
    var dots = order.map(function() { var d = document.createElement('span'); d.className = 'mi-person'; grid.appendChild(d); return d; });
    function show(i) {
      var P = PLACES[i], S = P.sick, H = 1000 - S, tp = Math.round(S * 0.9), fp = Math.round(H * 0.1), fn = S - tp, tn = H - fp;
      cur = i;
      tabs.forEach(function(t, j) { t.classList.toggle('mi-btn--fill', j === i); t.setAttribute('aria-pressed', j === i); });
      // order[k] < S are the sick patients; the first 90% of each group (by that rank) are flagged
      order.forEach(function(r, k) {
        var cls = r < S ? (r < tp ? 'tp' : 'fn') : (r - S < fp ? 'fp' : 'tn');
        dots[k].className = 'mi-person ' + cls;
      });
      box.querySelector('.mi-prev-note').innerHTML = '<strong>' + P.name + ':</strong> ' + P.note + ' (' + S + ' of 1,000).';
      box.querySelector('[data-k="ppv"]').textContent = tp + ' of ' + (tp + fp) + ' = ' + Math.round(tp / (tp + fp) * 100) + '%';
      box.querySelector('[data-k="npv"]').textContent = tn + ' of ' + (tn + fn) + ' = ' + (tn / (tn + fn) * 100).toFixed(1).replace('.0', '') + '%';
    }
    tabs.forEach(function(t, i) { t.addEventListener('click', function() { show(i); }); });
    all('.mi-prev-guess .mi-choice', box).forEach(function(b) {
      b.addEventListener('click', function() {
        all('.mi-prev-guess .mi-choice', box).forEach(function(x) { x.disabled = true; x.classList.toggle('mi-picked', x === b); });
        var fb = box.querySelector('.mi-prev-fb'); fb.hidden = false;
        fb.textContent = (b.getAttribute('data-g') === '2' ? 'Right. ' : 'Most people guess higher. ') +
          'Only about 1 in 12 alerts in the screening clinic is real. Switch between the two places to see why.';
        tabs.forEach(function(t) { t.disabled = false; });
        show(1);
      });
    });
    show(0);
  });

  // ── Train too long ──
  // Made-up learning curves: the training score climbs toward 100%, the test score peaks then slides.
  all('.mi-overfit').forEach(function(box) {
    var MAX = 40, W = 460, Hh = 220, x0 = 44, y0 = 186, xw = 400, yh = 166;
    var train = function(r) { return 100 - 50 * Math.exp(-r / 8); };
    var test = function(r) { return 50 + 38 * (1 - Math.exp(-r / 6)) - 0.35 * Math.max(0, r - 14); };
    var best = 0; for (var r = 0; r <= MAX; r++) if (test(r) > test(best)) best = r;
    var sx = function(r) { return x0 + r / MAX * xw; }, sy = function(v) { return y0 - (v - 50) / 50 * yh; };
    var ticks = [50, 75, 100].map(function(v) {
      return '<line x1="' + x0 + '" x2="' + (x0 + xw) + '" y1="' + sy(v) + '" y2="' + sy(v) + '" stroke="#e2e8f0"/><text x="' + (x0 - 6) + '" y="' + (sy(v) + 4) + '" text-anchor="end">' + v + '%</text>';
    }).join('');
    box.innerHTML =
      '<svg class="mi-of-svg" viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="Training and test scores over training time">' + ticks +
      '<text x="' + (x0 + xw / 2) + '" y="' + (Hh - 4) + '" text-anchor="middle">Training time &rarr;</text>' +
      '<line class="mi-of-best" x1="' + sx(best) + '" x2="' + sx(best) + '" y1="' + sy(100) + '" y2="' + y0 + '"/>' +
      '<path class="mi-of-train" fill="none"/><path class="mi-of-test" fill="none"/>' +
      '<circle class="mi-of-dtrain" r="5"/><circle class="mi-of-dtest" r="5"/></svg>' +
      '<div class="mi-thresh-top"><label for="mi-of-range">Training time</label><input type="range" id="mi-of-range" min="1" max="' + MAX + '" value="4" aria-describedby="mi-of-note"></div>' +
      '<div class="mi-of-read"><span class="k-train"><i></i>Training score <b data-k="train"></b></span><span class="k-test"><i></i>Test score <b data-k="test"></b></span><span>Gap <b data-k="gap"></b></span></div>' +
      '<p class="mi-thresh-note" id="mi-of-note"></p>';
    var range = box.querySelector('input'), note = box.querySelector('.mi-thresh-note');
    function path(f, n) { var d = ''; for (var r = 0; r <= n; r += 0.5) d += (r ? 'L' : 'M') + sx(r).toFixed(1) + ' ' + sy(f(r)).toFixed(1); return d; }
    function render() {
      var n = +range.value, a = train(n), b = test(n);
      box.querySelector('.mi-of-train').setAttribute('d', path(train, n));
      box.querySelector('.mi-of-test').setAttribute('d', path(test, n));
      [['.mi-of-dtrain', a], ['.mi-of-dtest', b]].forEach(function(q) { var c = box.querySelector(q[0]); c.setAttribute('cx', sx(n)); c.setAttribute('cy', sy(q[1])); });
      box.querySelector('.mi-of-best').style.opacity = n > best + 2 ? 1 : 0;
      box.querySelector('[data-k="train"]').textContent = Math.round(a) + '%';
      box.querySelector('[data-k="test"]').textContent = Math.round(b) + '%';
      box.querySelector('[data-k="gap"]').textContent = Math.round(a - b) + ' points';
      if (n < best - 3) note.textContent = 'Still learning: both scores are rising, and the gap is small.';
      else if (n <= best + 3) note.textContent = 'About the best test score. A careful team stops training here and reports this test score.';
      else note.textContent = 'Overfitting: the training score is nearly perfect, but the test score is falling. The model is memorizing its training films. The dashed line marks where it should have stopped.';
    }
    range.addEventListener('input', render);
    render();
  });

  // ── Test set size ──
  // 90% of the sick are caught in every case; only the number of sick patients changes. 95% Wilson interval.
  all('.mi-ci').forEach(function(box) {
    var SIZES = [10, 50, 200, 1000];
    box.innerHTML =
      '<div class="mi-prev-tabs" role="group" aria-label="Patients with a pneumothorax in the test set">' + SIZES.map(function(n, i) {
        return '<button class="mi-btn" data-i="' + i + '">' + n.toLocaleString() + '</button>';
      }).join('') + '</div>' +
      '<div class="mi-ci-scale"><div class="mi-ci-bar"></div><div class="mi-ci-dot"></div>' +
      [50, 60, 70, 80, 90, 100].map(function(v) { return '<span style="left:' + (v - 50) * 2 + '%">' + v + '%</span>'; }).join('') + '</div>' +
      '<p class="mi-thresh-note"></p>';
    var tabs = all('[data-i]', box);
    function show(i) {
      var n = SIZES[i], p = 0.9, z = 1.96, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d;
      var h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d, lo = (c - h) * 100, hi = (c + h) * 100;
      tabs.forEach(function(t, j) { t.classList.toggle('mi-btn--fill', j === i); t.setAttribute('aria-pressed', j === i); });
      var bar = box.querySelector('.mi-ci-bar');
      bar.style.left = (lo - 50) * 2 + '%'; bar.style.width = (hi - lo) * 2 + '%';
      box.querySelector('.mi-ci-dot').style.left = '80%';
      box.querySelector('.mi-thresh-note').innerHTML = 'Caught ' + Math.round(n * p).toLocaleString() + ' of ' + n.toLocaleString() +
        ': reported sensitivity <strong>90%</strong>, 95% confidence interval <strong>' + Math.round(lo) + '% to ' + Math.round(hi) + '%</strong>. ' +
        (n <= 10 ? 'The true sensitivity could be as low as ' + Math.round(lo) + '%: too few patients to say much.' : n >= 1000 ? 'A narrow range: this number can be trusted (for patients like these).' : 'More patients, a narrower range.');
    }
    tabs.forEach(function(t, i) { t.addEventListener('click', function() { show(i); }); });
    show(0);
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

  // ── Invisible change (1.5) ──
  // <div class="mi-adv" data-src="images/m1/adv/"></div>. Images and scores come from
  // planning/scripts/make_m1_5_adversarial.py: real ResNet-50 outputs on the exact PNGs shown.
  all('.mi-adv').forEach(function(box) {
    var src = box.getAttribute('data-src');
    // [size of change, top 3]
    var R = [[0,[["giant panda",50.1],["badger",0.3],["limousine",0.2]]],[1,[["gibbon",96.5],["giant panda",0.1],["guenon",0.1]]],[2,[["gibbon",99.5],["siamang",0.0],["guenon",0.0]]],[4,[["gibbon",100.0],["giant panda",0.0],["langur",0.0]]],[8,[["gibbon",100.0],["siamang",0.0],["giant panda",0.0]]]];
    box.innerHTML =
      '<div class="mi-thresh-top"><label for="adv-size">Largest change to any pixel</label>' +
        '<input id="adv-size" type="range" min="0" max="4" step="1" value="0"><span class="mi-thresh-val"></span></div>' +
      '<div class="mi-adv-panels">' +
        '<figure><img alt="Original photo of a giant panda" src="' + src + 'orig.png" width="224" height="224"><figcaption>Original</figcaption></figure>' +
        '<figure><img class="mi-adv-new" alt="" width="224" height="224"><figcaption>Changed</figcaption></figure>' +
        '<figure><img class="mi-adv-diff" alt="" width="224" height="224"><figcaption>The change, 16x stronger<small>gray = no change</small></figcaption></figure>' +
      '</div>' +
      '<div class="mi-adv-out" aria-live="polite"><h4>What the model says about the changed photo</h4><div class="mi-adv-bars"></div><p class="mi-adv-note"></p></div>';
    var range = box.querySelector('input'), val = box.querySelector('.mi-thresh-val');
    var imgNew = box.querySelector('.mi-adv-new'), imgDiff = box.querySelector('.mi-adv-diff');
    var bars = box.querySelector('.mi-adv-bars'), note = box.querySelector('.mi-adv-note');
    function pct(v) { return v >= 99.95 ? '>99.9%' : v < 0.05 ? '<0.1%' : v.toFixed(1) + '%'; }
    function draw() {
      var r = R[+range.value], k = r[0], top = r[1];
      val.textContent = k + ' of 255';
      imgNew.src = src + (k ? 'target-' + k : 'orig') + '.png';
      imgDiff.src = src + (k ? 'target-diff-' + k : 'diff-0') + '.png';
      imgNew.alt = k ? 'The panda photo with every pixel changed by at most ' + k + ' brightness levels; it looks the same' : 'The unchanged panda photo';
      imgDiff.alt = k ? 'The pattern of changes, made 16 times stronger so it is visible' : 'Plain gray: nothing changed yet';
      bars.innerHTML = top.map(function(t, i) {
        return '<div class="mi-adv-bar' + (i === 0 ? ' top' : '') + (t[0] === 'giant panda' ? '' : ' wrong') + '"><span>' + t[0] + '</span>' +
          '<div class="mi-meter-bar"><div class="mi-meter-fill" style="width:' + t[1] + '%"></div></div><b>' + pct(t[1]) + '</b></div>';
      }).join('');
      note.textContent = !k ? 'The model is a real one (ResNet-50, trained on 1.2 million everyday photos). Unchanged, its top answer is "giant panda". Move the slider.'
        : 'Each pixel moved by at most ' + k + ' out of 255 brightness levels, and the model now says "gibbon" with ' + pct(top[0][1]) + ' confidence. The change was worked out from the model itself to push its answer toward "gibbon", a direction the model is very sensitive to and people cannot see.';
    }
    range.addEventListener('input', draw);
    draw();
  });

  // ── Different scanner (1.5) ──
  // <div class="mi-scan" data-src="images/m1/scanner/"></div>. Images and scores come from
  // planning/scripts/make_m1_5_scanner.py: torchxrayvision DenseNet outputs on the exact PNGs shown
  // (0.5 = the model's own cutoff). One filter: edge sharpening + steeper contrast curve.
  all('.mi-scan').forEach(function(box) {
    var src = box.getAttribute('data-src');
    // [fracture, pneumothorax, every finding above the cutoff] for each strength
    var R = [[0.029,0.111,[]],[0.055,0.122,[]],[0.371,0.46,["Emphysema"]],[0.528,0.51,["Fracture","Pneumothorax","Enlarged Cardiomediastinum","Emphysema","Nodule"]],[0.53,0.505,["Fracture","Pneumothorax","Emphysema"]]];
    var LV = ['Off (original)', 'Low', 'Medium', 'High', 'Very high'];
    box.innerHTML =
      '<div class="mi-thresh-top"><label for="scan-k">Edge sharpening and contrast</label>' +
        '<input id="scan-k" type="range" min="0" max="4" step="1" value="0"><span class="mi-thresh-val"></span></div>' +
      '<div class="mi-adv-panels mi-scan-panels">' +
        '<figure><img alt="A normal chest X-ray, as first processed" src="' + src + 'film-0.png" width="448" height="448"><figcaption>Original film</figcaption></figure>' +
        '<figure><img class="mi-scan-new" alt="" width="448" height="448"><figcaption>Same film, different processing</figcaption></figure>' +
      '</div>' +
      '<div class="mi-adv-out" aria-live="polite"><h4>What the model says about the processed film</h4><div class="mi-adv-bars"></div><p class="mi-adv-note"></p></div>';
    var range = box.querySelector('input'), val = box.querySelector('.mi-thresh-val'), img = box.querySelector('.mi-scan-new');
    var bars = box.querySelector('.mi-adv-bars'), note = box.querySelector('.mi-adv-note');
    function draw() {
      var k = +range.value, r = R[k];
      val.textContent = LV[k];
      img.src = src + 'film-' + k + '.png';
      img.alt = 'The same normal chest X-ray with ' + LV[k].toLowerCase() + ' edge sharpening and contrast';
      bars.innerHTML = [['Fracture', r[0]], ['Pneumothorax', r[1]]].map(function(t) {
        return '<div class="mi-adv-bar' + (t[1] > 0.5 ? ' wrong top' : '') + '"><span>' + t[0] + '</span>' +
          '<div class="mi-meter-bar mi-scan-meter"><div class="mi-meter-fill" style="width:' + t[1] * 100 + '%"></div></div><b>' + t[1].toFixed(2) + '</b></div>';
      }).join('') + '<p class="mi-scan-flag"><b>Findings flagged:</b> ' + (r[2].length ? r[2].join(', ').replace(/_/g, ' ') : 'none') + '</p>';
      note.textContent = !k ? 'The model is a real one (DenseNet-121, trained on hundreds of thousands of chest X-rays). Each score runs from 0 to 1, and above 0.5 (the line) the model flags the finding. This film is normal, and nothing is flagged. Move the slider.'
        : k < 3 ? 'The patient and the lungs are exactly the same; only the processing changed. Watch the fracture and pneumothorax scores.'
        : 'The film is still normal, and a radiologist would still read it as normal. The model now flags a fracture and a pneumothorax. Nothing in the patient changed: only the sharpening and contrast, the kind of difference you get between two vendors\' software.';
    }
    range.addEventListener('input', draw);
    draw();
  });

  // ── Who is in the training set (1.5) ──
  // <div class="mi-bias"></div>. Simulated chest X-rays, one number each ("how much the
  // spot stands out from the lung"). On female films breast tissue makes every spot stand out less. The model is
  // logistic regression on that one number, trained live; its cutoff is where it says 50%.
  all('.mi-bias').forEach(function(box) {
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function norm(m, s) { var u = rnd() || 1e-9, v = rnd(); return Math.max(1, Math.min(99, m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * v))); }
    var G = [{ name: 'Male', b: [38, 9], m: [64, 9] }, { name: 'Female', b: [20, 7], m: [41, 8] }];
    function make(g, n) { var out = []; for (var i = 0; i < n; i++) out.push({ v: norm.apply(null, i % 2 ? g.m : g.b), mel: i % 2 === 1 }); return out; }
    var poolTrain = [make(G[0], 400), make(G[1], 400)], test = [make(G[0], 40), make(G[1], 40)];
    box.innerHTML =
      '<div class="mi-thresh-top"><label for="bias-share">Training films from female patients</label>' +
        '<input id="bias-share" type="range" min="0" max="50" step="5" value="5"><span class="mi-thresh-val"></span></div>' +
      '<div class="mi-bias-mix" aria-hidden="true"><i></i></div>' +
      '<p class="mi-bias-mixlbl"></p>' +
      '<svg class="mi-bias-svg" viewBox="0 0 560 190" role="img" aria-label="Test films on a scale of how much the spot stands out, with the model\'s cutoff line"></svg>' +
      '<div class="mi-legend mi-legend--row"><span><i style="background:#be123c"></i>Nodule</span><span><i style="background:#fff;border:1.5px solid #64748b"></i>Harmless shadow</span><span><i style="background:#0369a1"></i>Model\'s cutoff: right of the line = flagged as nodule</span></div>' +
      '<div class="mi-bias-read" aria-live="polite"></div>';
    var range = box.querySelector('input'), svg = box.querySelector('svg'), read = box.querySelector('.mi-bias-read');
    var x = function(v) { return 110 + v * 4.3; };
    function train(share) {
      var nDark = Math.round(200 * share / 100), set = poolTrain[0].slice(0, 200 - nDark).concat(poolTrain[1].slice(0, nDark));
      var w = 0, b = 0;
      for (var it = 0; it < 400; it++) {
        var gw = 0, gb = 0;
        set.forEach(function(p) { var z = (p.v - 40) / 15, q = 1 / (1 + Math.exp(-(w * z + b))); gw += (q - p.mel) * z; gb += q - p.mel; });
        w -= gw / set.length; b -= gb / set.length;
      }
      return 40 - 15 * b / w;
    }
    function draw() {
      var share = +range.value, cut = train(share), caught = [], alarms = [], h = '';
      box.querySelector('.mi-thresh-val').textContent = share + '%';
      box.querySelector('.mi-bias-mix i').style.width = share + '%';
      box.querySelector('.mi-bias-mixlbl').textContent = (200 - Math.round(2 * share)) + ' male films, ' + Math.round(2 * share) + ' female films (200 in total)';
      h += '<text x="110" y="182">spot blends in</text><text x="540" y="182" text-anchor="end">spot stands out</text>';
      test.forEach(function(row, gi) {
        var y = 40 + gi * 72, c = 0, f = 0;
        h += '<text x="0" y="' + (y + 4) + '" class="lbl">' + G[gi].name + '</text><line x1="110" x2="540" y1="' + y + '" y2="' + y + '" stroke="#e5e7eb"/>';
        row.forEach(function(p, i) {
          var cy = y + (p.mel ? -9 : 9) + ((i * 7) % 5 - 2);
          if (p.v >= cut) { if (p.mel) c++; else f++; }
          h += p.mel ? '<circle cx="' + x(p.v).toFixed(1) + '" cy="' + cy + '" r="5" fill="#be123c" opacity="' + (p.v >= cut ? 1 : 0.45) + '"/>'
            : '<circle cx="' + x(p.v).toFixed(1) + '" cy="' + cy + '" r="4.5" fill="#fff" stroke="#64748b" stroke-width="1.5"/>';
        });
        caught.push(c); alarms.push(f);
      });
      h += '<line x1="' + x(cut) + '" x2="' + x(cut) + '" y1="12" y2="160" stroke="#0369a1" stroke-width="3"/>';
      svg.innerHTML = h;
      read.innerHTML = '<p><b>Nodules caught:</b> male <b>' + caught[0] + ' of 20</b>, female <b>' + caught[1] + ' of 20</b>. ' +
        '<b>Harmless shadows wrongly flagged:</b> male <b>' + alarms[0] + ' of 20</b>, female <b>' + alarms[1] + ' of 20</b>.</p><p>' +
        (share <= 10 ? 'With so few female films, the cutoff is set almost entirely by male films. Nodules on female films stand out less, so most fall left of the line and are missed. If most test films were also from men, the overall score would still look good and hide this.'
        : share < 40 ? 'As female films are added, the model shifts its cutoff left and catches more nodules on female films. Keep going.'
        : 'More nodules on female films are caught, but the gap has not closed, and harmless shadows on male films are now flagged more often. One cutoff cannot fit two groups whose films look different. Real fixes are enough data from every group, a model that can learn how each group looks, and results reported for each group separately.') + '</p>';
    }
    range.addEventListener('input', draw);
    draw();
  });

  // ── Name the problem (1.5) ──
  // <div class="mi-name" data-opts="A|B|..."> <div class="mi-name-row" data-answer="0">Scenario text</div> ... </div>
  all('.mi-name').forEach(function(box) {
    var opts = box.getAttribute('data-opts').split('|');
    all('.mi-name-row', box).forEach(function(row, i) {
      var ans = +row.getAttribute('data-answer'), fb = document.createElement('span');
      var sel = document.createElement('select');
      sel.setAttribute('aria-label', 'Problem for scenario ' + (i + 1));
      sel.innerHTML = '<option value="">Choose...</option>' + opts.map(function(o, j) { return '<option value="' + j + '">' + o + '</option>'; }).join('');
      fb.className = 'mi-name-fb'; fb.setAttribute('aria-live', 'polite');
      row.appendChild(sel); row.querySelector('p').appendChild(fb);
      sel.addEventListener('change', function() {
        var ok = +sel.value === ans;
        fb.className = 'mi-name-fb ' + (sel.value === '' ? '' : ok ? 'ok' : 'no');
        fb.textContent = sel.value === '' ? '' : ok ? ' Right.' : ' Not quite. Check the definitions above.';
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
  // ── Rule-or-learned spectrum ──
  // <div class="m1-panel"> <div class="m1-spec"><div class="m1-spec-marker"></div>...</div>
  //   <div class="m1-chips"><button class="m1-chip r" data-pos="2" data-why="...">Calculator</button> ...</div>
  //   <p class="m1-why"></p></div>
  // data-pos is 0-100 along the bar; the class r / b / l colors the chip once tapped.
  all('.m1-chips').forEach(function(chips) {
    var box = chips.parentNode, marker = box.querySelector('.m1-spec-marker'), why = box.querySelector('.m1-why');
    all('.m1-chip', chips).forEach(function(c) {
      c.type = 'button';
      c.addEventListener('click', function() {
        c.classList.add('done');
        marker.style.left = c.getAttribute('data-pos') + '%';
        why.innerHTML = '<strong>' + c.textContent + '.</strong> ' + c.getAttribute('data-why');
      });
    });
  });

  // ── Fit a line ──
  // Made-up shop data: temperature against ice creams sold. The line pivots through the mean point.
  all('.m1-fit').forEach(function(box) {
    var P = [[2,18],[3,22],[4,30],[5,29],[6,40],[7,44],[8,47],[9,58],[10,60],[11,66],[12,71],[13,74]];
    var sx = function(x) { return 30 + x * 26; }, sy = function(y) { return 215 - y * 2.6; };
    var mx = 0, my = 0; P.forEach(function(p) { mx += p[0] / P.length; my += p[1] / P.length; });
    var num = 0, den = 0; P.forEach(function(p) { num += (p[0] - mx) * (p[1] - my); den += (p[0] - mx) * (p[0] - mx); });
    var best = num / den;
    box.querySelector('.m1-fit-pts').innerHTML = P.map(function(p) { return '<circle cx="' + sx(p[0]) + '" cy="' + sy(p[1]) + '" r="5" fill="#17324d"/>'; }).join('');
    var range = box.querySelector('input'), line = box.querySelector('.m1-fit-line'), err = box.querySelector('.m1-fit-err');
    function draw(m) {
      var k = m * 10, b = my - k * mx, e = 0;
      line.setAttribute('x1', sx(0)); line.setAttribute('y1', sy(b)); line.setAttribute('x2', sx(13.8)); line.setAttribute('y2', sy(b + k * 13.8));
      P.forEach(function(p) { e += Math.pow(p[1] - (b + k * p[0]), 2) / P.length; });
      err.textContent = 'Average miss (squared): ' + e.toFixed(0) + (Math.abs(k - best) < 0.15 ? '. That is about as good as it gets.' : '');
    }
    range.addEventListener('input', function() { draw(+range.value); });
    box.querySelector('.m1-btn').addEventListener('click', function() {
      var a = +range.value, z = best / 10, t0 = performance.now();
      (function step(t) {
        var p = Math.min(1, (t - t0) / 600), ease = 1 - Math.pow(1 - p, 3);
        range.value = a + (z - a) * ease; draw(+range.value);
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    });
    draw(+range.value);
  });

  // ── Nested rings ──
  // <div class="m1-rings"> <button class="m1-ring m1-r1" data-k="ai">...nested <span class="m1-ring" data-k="ml">...</button>
  //   <div class="m1-ring-info"><div data-k="ai">...</div> ...</div></div>
  all('.m1-rings').forEach(function(box) {
    var rings = all('.m1-ring', box), infos = all('.m1-ring-info [data-k]', box);
    function show(k) {
      rings.forEach(function(r) { r.classList.toggle('on', r.getAttribute('data-k') === k); });
      infos.forEach(function(i) { i.classList.toggle('on', i.getAttribute('data-k') === k); });
    }
    box.querySelector('.m1-r1').addEventListener('click', function(e) {
      var t = e.target.closest('[data-k]'); if (t) show(t.getAttribute('data-k'));
    });
    show('ai');
  });
})();
