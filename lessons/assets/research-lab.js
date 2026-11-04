(function() {
  'use strict';

  // Research Lab pages (lessons/research-1..6.html). One file for all six labs.
  // The page sets <body class="rl-page" data-lab="N">. This script wires:
  //   .rl-user           GitHub username fields (shared, saved in localStorage)
  //   .rl-user-echo      places that show the username (e.g. the notebook's first cell)
  //   .rl-order          warm-up "put the lines in order" (.ix-order from interactives.js);
  //                      shows .rl-order-explain after the first check
  //   .rl-parts          notebook parts checklist -> AI2PracticeProgressRail.setLabPart
  //   .rl-mix            coding-mode mix bar, data-mix="write,fill,reuse,ai,fix,read" (%)
  //   .rl-rb             report back for Labs 1-5 (RLData.answers / RLData.check)
  //   .rl-rb6            report back for Lab 6 (repo URL + abstract)
  //   .rl-note           written interpretation -> setLabNote
  //   .rl-done           "lab finished" banner
  //   [data-ix=...]      the lab's one interactive (count, clean, threshold, window, reports, abstract)
  // RLData (assets/js/rl-data.js) and the progress rail (assets/js/progress.js) may be
  // missing or late, so every call is guarded and the page re-renders when they arrive.

  var USER_KEY = 'ai2practice_github_user';
  var body = document.body;
  var LAB = parseInt(body.getAttribute('data-lab'), 10) || 0;
  var KEY = 'research-' + LAB;

  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rail() { var r = window.AI2PracticeProgressRail; return r && typeof r.labs === 'function' ? r : null; }
  function data() { var d = window.RLData; return d && typeof d.answers === 'function' && typeof d.check === 'function' ? d : null; }
  function myLab() { var r = rail(); if (!r) return null; try { return r.labs().filter(function(l) { return l.key === KEY; })[0] || null; } catch (e) { return null; } }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function words(s) { var m = String(s || '').trim().match(/\S+/g); return m ? m.length : 0; }

  /* ---------- GitHub username ---------- */

  function getUser() { return (lsGet(USER_KEY) || '').trim(); }
  function userForData() { return getUser().toLowerCase() || 'demo'; }
  function initUser() {
    var u = getUser();
    all('.rl-user').forEach(function(inp) {
      inp.value = u;
      inp.addEventListener('input', function() {
        var v = inp.value.trim().replace(/^@/, '');
        lsSet(USER_KEY, v);
        all('.rl-user').forEach(function(o) { if (o !== inp) o.value = v; });
        echoUser();
        if (rbUserTimer) clearTimeout(rbUserTimer);
        rbUserTimer = setTimeout(renderReport, 250);
      });
    });
    echoUser();
  }
  var rbUserTimer = null;
  function echoUser() {
    var u = getUser();
    all('.rl-user-echo').forEach(function(s) { s.textContent = u || 'your-username'; });
  }

  /* ---------- Warm-up ---------- */

  // Explanations appear after the first "Check my order" (right or wrong), so the
  // warm-up is never graded and always teaches.
  document.addEventListener('click', function(e) {
    var b = e.target.closest && e.target.closest('.rl-order .ix-actions button');
    if (!b) return;
    var box = b.closest('.rl-order'), ex = box && box.querySelector('.rl-order-explain');
    if (ex) ex.classList.add('shown');
  });

  /* ---------- Notebook: parts and mode mix ---------- */

  var MODES = [
    ['Write', 'var(--m-write)'], ['Fill in', 'var(--m-fill)'], ['Reuse', 'var(--m-reuse)'],
    ['Direct the AI', 'var(--m-ai)'], ['Fix', 'var(--m-fix)'], ['Read', 'var(--m-read)']
  ];
  function initMix() {
    all('.rl-mix').forEach(function(box) {
      var mix = (box.getAttribute('data-mix') || '').split(',').map(Number);
      var bar = el('div', 'rl-mix-bar'), legend = el('ul', 'rl-mix-legend');
      bar.setAttribute('role', 'img');
      var label = [];
      MODES.forEach(function(m, i) {
        var p = mix[i] || 0;
        if (!p) return;
        var seg = el('span'); seg.style.width = p + '%'; seg.style.background = m[1]; seg.title = m[0] + ': ' + p + '%';
        bar.appendChild(seg);
        legend.appendChild(el('li', null, '<i style="background:' + m[1] + '"></i>' + m[0] + ' <b>' + p + '%</b>'));
        label.push(m[0] + ' ' + p + '%');
      });
      bar.setAttribute('aria-label', 'Coding modes in this notebook: ' + label.join(', '));
      box.appendChild(bar); box.appendChild(legend);
    });
  }

  function initParts() {
    all('.rl-parts input[type=checkbox]').forEach(function(cb) {
      cb.addEventListener('change', function() {
        var r = rail(), i = parseInt(cb.getAttribute('data-part'), 10);
        if (r && typeof r.setLabPart === 'function') r.setLabPart(KEY, i, cb.checked);
        else cb.closest('li').classList.toggle('is-done', cb.checked);
        renderPartsCount();
      });
    });
  }
  function renderParts() {
    var lab = myLab();
    var done = lab ? lab.partsDone : [];
    all('.rl-parts input[type=checkbox]').forEach(function(cb) {
      var i = parseInt(cb.getAttribute('data-part'), 10);
      cb.checked = done.indexOf(i) !== -1;
      cb.closest('li').classList.toggle('is-done', cb.checked);
      cb.disabled = !rail();
    });
    renderPartsCount();
  }
  function renderPartsCount() {
    var boxes = all('.rl-parts input[type=checkbox]');
    var n = boxes.filter(function(b) { return b.checked; }).length;
    all('.rl-parts-count').forEach(function(p) {
      p.textContent = rail()
        ? n + ' of ' + boxes.length + ' parts done. Ticks are saved with your course progress.'
        : 'Progress tracking is still loading.';
    });
  }

  /* ---------- Report back (Labs 1-5) ---------- */

  // Per-question state for the current username: tries used, and how it ended.
  var rbState = {}, rbUser = null;

  function renderReport() {
    var box = document.querySelector('.rl-rb');
    if (!box) return;
    var list = box.querySelector('.rl-rb-items');
    var d = data(), u = userForData();
    if (!d) {
      list.innerHTML = '<p class="rl-wait">The answer checker is still loading. If this message stays, reload the page.</p>';
      return;
    }
    var items;
    try { items = d.answers(LAB, u) || []; } catch (e) { items = []; }
    if (!items.length) { list.innerHTML = '<p class="rl-wait">No report-back questions are set for this lab yet.</p>'; return; }
    if (u !== rbUser) { rbState = {}; rbUser = u; }
    var who = box.querySelector('.rl-rb-who');
    if (who) who.textContent = getUser() ? 'Checking against the dataset for ' + getUser() + '.' : 'No username yet, so this checks against the demo dataset. Enter the username you used in the notebook.';
    list.innerHTML = '';
    items.forEach(function(it, n) {
      var st = rbState[it.id] || (rbState[it.id] = { tries: 0, end: null, value: '' });
      var item = el('div', 'rl-rb-item');
      var inputId = 'rl-rb-' + it.id;
      item.innerHTML =
        '<p class="rl-rb-label"><label for="' + inputId + '">' + (n + 1) + '. ' + esc(it.label) + '</label></p>' +
        '<div class="rl-rb-row">' +
          '<input class="rl-input rl-input--mono" id="' + inputId + '" inputmode="decimal" autocomplete="off" spellcheck="false">' +
          (it.unit ? '<span class="rl-rb-unit">' + esc(it.unit) + '</span>' : '') +
          '<button type="button" class="mi-btn mi-btn--rl">Check</button>' +
          '<span class="rl-tries" aria-hidden="true"><i></i><i></i><i></i></span>' +
        '</div>' +
        '<p class="rl-rb-fb" aria-live="polite"></p>';
      list.appendChild(item);
      var inp = item.querySelector('input'), btn = item.querySelector('button'), fb = item.querySelector('.rl-rb-fb');
      inp.value = st.value;
      function paint() {
        all('.rl-tries i', item).forEach(function(dot, k) { dot.classList.toggle('used', k < st.tries); });
        item.classList.toggle('is-right', st.end === 'right');
        item.classList.toggle('is-revealed', st.end === 'revealed');
        inp.disabled = btn.disabled = !!st.end;
        var answer = typeof it.min === 'number' && typeof it.max === 'number'
          ? 'any value from ' + it.min + ' to ' + it.max + (it.unit ? ' ' + esc(it.unit) : '')
          : esc(it.value) + (it.unit ? ' ' + esc(it.unit) : '');
        fb.className = 'rl-rb-fb' + (st.end === 'right' ? ' is-ok' : '');
        if (st.end === 'right') fb.innerHTML = '<b>Correct.</b> ' + esc(it.explain || '');
        else if (st.end === 'revealed' && typeof it.min === 'number') fb.innerHTML = '<b>Any value from ' + it.min + ' to ' + it.max + (it.unit ? ' ' + esc(it.unit) : '') + ' is accepted.</b> ' + esc(it.explain || '') + ' Check the number your evaluation cell printed and try the next question.';
        else if (st.end === 'revealed') fb.innerHTML = '<b>The answer for your data is ' + answer + '.</b> ' + esc(it.explain || '') + ' Compare it with your notebook, find where yours went differently, and keep going.';
        else if (st.tries === 1) fb.innerHTML = '<b>Not quite.</b> Hint: ' + esc(it.hint || 'Check the notebook\'s report-back cell.');
        else if (st.tries === 2) fb.innerHTML = '<b>Still not matching.</b> ' + esc(it.explain || '') + ' One more try, then the answer is shown.';
        else fb.innerHTML = st.msg || '';
      }
      function check() {
        if (st.end) return;
        var raw = inp.value.trim().replace(/,/g, '').replace(/%$/, '');
        st.value = inp.value;
        if (raw === '' || isNaN(Number(raw))) { st.msg = 'Type a number first, for example 12 or 81.5.'; paint(); return; }
        st.msg = '';
        var ok = false;
        try { ok = !!d.check(LAB, u, it.id, Number(raw)); } catch (e) { ok = false; }
        if (ok) st.end = 'right';
        else { st.tries++; if (st.tries >= 3) st.end = 'revealed'; }
        paint();
        finishIfDone(items);
      }
      btn.addEventListener('click', check);
      inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); check(); } });
      inp.addEventListener('input', function() { st.value = inp.value; });
      paint();
    });
    renderDone();
  }

  var finishedNow = null;
  function finishIfDone(items) {
    var ended = items.every(function(it) { return rbState[it.id] && rbState[it.id].end; });
    if (!ended) return;
    var help = items.some(function(it) { return rbState[it.id].end === 'revealed'; });
    finishedNow = { help: help };
    var r = rail();
    if (r && typeof r.completeLab === 'function') r.completeLab(KEY, { help: help });
    renderDone();
  }

  function renderDone() {
    var box = document.querySelector('.rl-done');
    if (!box) return;
    var lab = myLab();
    var done = (lab && lab.done) || !!finishedNow;
    var help = (lab && lab.help) || (finishedNow && finishedNow.help);
    box.classList.toggle('shown', done);
    if (!done) return;
    if (LAB === 6) {
      box.innerHTML = '<strong>Lab 6 finished.</strong> Your repository address and abstract are saved with your course progress, and the project is marked on the Research Lab map. Next, show it to a mentor. <a href="../pages/research-lab.html">Back to the map</a>.';
      return;
    }
    box.innerHTML = '<strong>Lab ' + LAB + ' finished' + (help ? ' with help' : '') + '.</strong> ' +
      (help ? 'Some answers were shown to you, which is fine: the point is that you now know where your analysis went differently. ' : 'Your numbers matched your dataset. ') +
      'It is marked on the Research Lab map. <a href="research-' + (LAB + 1) + '.html">Go to Lab ' + (LAB + 1) + '</a> or <a href="../pages/research-lab.html">go back to the map</a>.';
  }

  /* ---------- Written interpretation ---------- */

  var noteTimer = null, noteTyping = false;
  function initNote() {
    all('textarea.rl-note').forEach(function(ta) {
      var saved = ta.parentNode.querySelector('.rl-saved');
      ta.addEventListener('input', function() {
        noteTyping = true;
        if (saved) saved.textContent = 'Saving...';
        clearTimeout(noteTimer);
        noteTimer = setTimeout(function() {
          var r = rail();
          if (r && typeof r.setLabNote === 'function') { r.setLabNote(KEY, ta.value); if (saved) saved.textContent = 'Saved with your course progress. Not scored.'; }
          else if (saved) saved.textContent = 'Could not save yet: progress tracking is still loading.';
          noteTyping = false;
        }, 600);
      });
    });
  }
  function renderNote() {
    var lab = myLab();
    all('textarea.rl-note').forEach(function(ta) {
      if (noteTyping || document.activeElement === ta) return;
      if (lab && lab.note && !ta.value) ta.value = lab.note;
    });
  }

  /* ---------- Report back (Lab 6): repo URL + abstract ---------- */

  var REPO_RE = /^https:\/\/github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]+?)(?:\.git)?\/?$/;
  function initLab6() {
    var box = document.querySelector('.rl-rb6');
    if (!box) return;
    var url = box.querySelector('.rl-repo'), abs = box.querySelector('.rl-abstract'), btn = box.querySelector('.rl-finish');
    var err = box.querySelector('.rl-error'), count = box.querySelector('.rl-abs-count');
    function countWords() { if (count) count.textContent = words(abs.value) + ' words'; }
    abs.addEventListener('input', countWords);
    btn.addEventListener('click', function() {
      var u = url.value.trim(), m = u.match(REPO_RE), me = getUser();
      if (!m) { err.textContent = 'That doesn\'t look like a GitHub repository address. It should look like https://github.com/your-username/your-repo.'; url.focus(); return; }
      if (me && m[1].toLowerCase() !== me.toLowerCase()) { err.textContent = 'The repository should be under your own account (' + me + '), so the address should start with https://github.com/' + me + '/. Fix the address, or the username above if it is wrong.'; url.focus(); return; }
      var d = data(), repoOk = true, absOk = words(abs.value) >= 50;
      if (d) { try { repoOk = d.check(6, userForData(), 'repo', u) !== false; absOk = !!d.check(6, userForData(), 'abstract', abs.value); } catch (x) {} }
      if (!repoOk) { err.textContent = 'That address has something extra in it. Use the repository\'s main page, https://github.com/your-username/your-repo, with nothing after the name.'; url.focus(); return; }
      if (!absOk) { err.textContent = 'Paste your full structured abstract (at least 50 words; most are 200 to 300).'; abs.focus(); return; }
      err.textContent = '';
      var r = rail();
      if (!r || typeof r.completeLab !== 'function') { err.textContent = 'Progress tracking is still loading. Wait a moment and try again.'; return; }
      r.setLabNote(KEY, 'Repo: ' + u + '\n\n' + abs.value.trim());
      finishedNow = { help: false };
      r.completeLab(KEY);
      renderDone();
    });
    countWords();
  }
  function renderLab6() {
    var box = document.querySelector('.rl-rb6');
    if (!box) return;
    var lab = myLab(); if (!lab || !lab.note) return;
    var url = box.querySelector('.rl-repo'), abs = box.querySelector('.rl-abstract');
    var m = lab.note.match(/^Repo: (\S+)\n\n([\s\S]*)$/);
    if (!m) return;
    if (!url.value && document.activeElement !== url) url.value = m[1];
    if (!abs.value && document.activeElement !== abs) { abs.value = m[2]; abs.dispatchEvent(new Event('input')); }
  }

  /* ---------- Render on progress changes ---------- */

  function renderProgress() { renderParts(); renderNote(); renderLab6(); renderDone(); }

  /* ================= Interactives ================= */

  var IX = {};

  // Lab 1: count CT studies by body region by hand, then let code do it.
  IX.count = function(box) {
    var REGIONS = ['Head', 'Chest', 'Abdomen/Pelvis', 'Spine', 'Extremity'];
    var studies = [
      [0, 'ED'], [1, 'ED'], [2, 'Outpatient'], [0, 'ED'], [1, 'Inpatient'], [2, 'ED'], [3, 'ED'], [0, 'Inpatient'],
      [1, 'Outpatient'], [2, 'Inpatient'], [0, 'ED'], [4, 'ED'], [1, 'ED'], [2, 'ED'], [0, 'Outpatient'], [3, 'Inpatient'],
      [1, 'Inpatient'], [2, 'Outpatient'], [0, 'ED'], [4, 'Outpatient'], [1, 'ED'], [1, 'ED'], [2, 'ED'], [1, 'Outpatient']
    ];
    var counts = [0, 0, 0, 0, 0], counted = 0;
    var wrap = el('div', 'rl-count');
    var tiles = el('div', 'rl-tiles');
    var side = el('div');
    var bars = el('div', 'rl-bars');
    REGIONS.forEach(function(r) {
      bars.appendChild(el('div', 'rl-bar-row', '<span>' + r + '</span><div class="rl-bar-track"><div class="rl-bar-fill"></div></div><b>0</b>'));
    });
    var status = el('p', 'rl-note');
    status.setAttribute('aria-live', 'polite');
    var actions = el('div', 'rl-actions', '<button type="button" class="mi-btn mi-btn--rl mi-btn--fill">Let the code count them</button><button type="button" class="mi-btn">Start over</button>');
    var out = el('pre', 'rl-pre'); out.hidden = true;
    side.appendChild(bars); side.appendChild(status); side.appendChild(actions);
    studies.forEach(function(s, i) {
      var t = el('button', 'rl-tile', '<b>CT-' + String(101 + i) + '</b>' + REGIONS[s[0]] + '<br>' + s[1]);
      t.type = 'button';
      t.setAttribute('aria-label', 'Study CT-' + (101 + i) + ', ' + REGIONS[s[0]] + ', ' + s[1] + '. Count it.');
      t.addEventListener('click', function() { if (!t.classList.contains('is-counted')) { tally(i); paint(); } });
      tiles.appendChild(t);
    });
    function tally(i) { var t = tiles.children[i]; t.classList.add('is-counted'); t.disabled = true; counts[studies[i][0]]++; counted++; }
    function paint() {
      var rows = bars.children;
      REGIONS.forEach(function(r, k) {
        rows[k].querySelector('.rl-bar-fill').style.width = (counts[k] / 8 * 100) + '%';
        rows[k].querySelector('b').textContent = counts[k];
      });
      status.textContent = counted < studies.length
        ? 'Counted ' + counted + ' of ' + studies.length + ' studies. Click each study to add it to its bar.'
        : 'All ' + studies.length + ' counted. Chest is the most common, with 8 of 24. Now imagine doing this for 400 studies, and doing it again next month.';
    }
    actions.children[0].addEventListener('click', function() {
      studies.forEach(function(s, i) { if (!tiles.children[i].classList.contains('is-counted')) tally(i); });
      paint();
      out.hidden = false;
      out.innerHTML = '<span class="c"># one line of pandas does the whole count</span>\ndf["body_region"].value_counts()\n\n' +
        REGIONS.map(function(r, k) { return { r: r, n: counts[k] }; }).sort(function(a, b) { return b.n - a.n; })
          .map(function(x) { return (x.r + '              ').slice(0, 16) + x.n; }).join('\n');
    });
    actions.children[1].addEventListener('click', function() {
      counts = [0, 0, 0, 0, 0]; counted = 0; out.hidden = true;
      all('.rl-tile', tiles).forEach(function(t) { t.classList.remove('is-counted'); t.disabled = false; });
      paint();
    });
    wrap.appendChild(tiles); wrap.appendChild(side);
    box.appendChild(wrap); box.appendChild(out);
    paint();
  };

  // Lab 2: spot the rows that need cleaning before computing mean ages.
  IX.clean = function(box) {
    var rows = [
      { id: 'P001', mod: 'CT', age: '67', sex: 'M' },
      { id: 'P002', mod: 'MRI', age: '54', sex: 'female', fix: 'Sex is written "female" here but "F" elsewhere. Keep the row, recode to F.' },
      { id: 'P003', mod: 'CT', age: '', sex: 'F', drop: 'Age is missing. It can\'t count toward a mean age; the notebook drops it and reports how many were dropped.' },
      { id: 'P004', mod: 'CT', age: '999', sex: 'M', drop: '999 is not a real age. It is a code someone used for "unknown". Left in, it drags the CT mean far up.' },
      { id: 'P005', mod: 'MRI', age: '71', sex: 'M' },
      { id: 'P006', mod: 'CT', age: '73', sex: 'male', fix: '"male" instead of "M". Keep the row, recode the value.' },
      { id: 'P002', mod: 'MRI', age: '54', sex: 'female', drop: 'An exact copy of the P002 row above. Counted twice, this patient would weigh double.' },
      { id: 'P007', mod: 'MRI', age: '45', sex: 'F' },
      { id: 'P008', mod: 'CT', age: '80', sex: 'F' },
      { id: 'P009', mod: 'MRI', age: '-4', sex: 'f', drop: 'A negative age is impossible (and "f" needs recoding too). Drop the row.' },
      { id: 'P010', mod: 'CT', age: '58', sex: 'M' },
      { id: 'P011', mod: 'MRI', age: '62', sex: 'F' }
    ];
    var picked = rows.map(function() { return false; }), checked = false;
    box.insertAdjacentHTML('beforeend',
      '<div class="rl-table-wrap"><table class="rl-table rl-pick"><thead><tr><th scope="col">Needs work?</th><th scope="col">patient_id</th><th scope="col">modality</th><th scope="col">age</th><th scope="col">sex</th><th scope="col" class="rl-why-h" hidden>Why</th></tr></thead><tbody></tbody></table></div>' +
      '<div class="rl-actions"><button type="button" class="mi-btn mi-btn--rl mi-btn--fill">Check my picks</button><button type="button" class="mi-btn">Start over</button></div>' +
      '<p class="rl-note" aria-live="polite"></p><div class="rl-stat-row" hidden></div>');
    var tbody = box.querySelector('tbody'), whyH = box.querySelector('.rl-why-h');
    var note = box.querySelector('.rl-note'), stats = box.querySelector('.rl-stat-row');
    var btns = box.querySelectorAll('.rl-actions button');
    rows.forEach(function(r, i) {
      var tr = el('tr', null,
        '<td><input type="checkbox" class="rl-tick" tabindex="-1" aria-hidden="true"></td><td class="rl-mono">' + r.id + '</td><td>' + r.mod + '</td><td class="rl-mono">' + (r.age === '' ? '<span style="color:var(--gray-400)">(blank)</span>' : r.age) + '</td><td class="rl-mono">' + r.sex + '</td><td class="rl-why" hidden></td>');
      tr.tabIndex = 0;
      tr.setAttribute('role', 'checkbox');
      tr.setAttribute('aria-checked', 'false');
      tr.setAttribute('aria-label', 'Row ' + (i + 1) + ': ' + r.id + ', ' + r.mod + ', age ' + (r.age || 'blank') + ', sex ' + r.sex);
      function toggle() { if (checked) return; picked[i] = !picked[i]; paintRow(i); }
      tr.addEventListener('click', toggle);
      tr.addEventListener('keydown', function(e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } });
      tbody.appendChild(tr);
    });
    function paintRow(i) {
      var tr = tbody.children[i], r = rows[i], bad = !!(r.drop || r.fix);
      tr.querySelector('.rl-tick').checked = picked[i];
      tr.setAttribute('aria-checked', picked[i] ? 'true' : 'false');
      tr.classList.toggle('is-picked', picked[i] && !checked);
      tr.classList.toggle('is-hit', checked && bad && picked[i]);
      tr.classList.toggle('is-miss', checked && bad && !picked[i]);
      tr.classList.toggle('is-wrong', checked && !bad && picked[i]);
      var why = tr.querySelector('.rl-why');
      why.hidden = !checked;
      why.textContent = !checked ? '' : r.drop ? 'Drop. ' + r.drop : r.fix ? 'Fix. ' + r.fix : (picked[i] ? 'This row is fine as it is.' : 'Fine.');
    }
    function mean(list) { return list.reduce(function(a, b) { return a + b; }, 0) / list.length; }
    function means(clean) {
      var out = {};
      ['CT', 'MRI'].forEach(function(m) {
        var ages = rows.filter(function(r) { return r.mod === m && r.age !== '' && !(clean && r.drop); }).map(function(r) { return Number(r.age); });
        out[m] = mean(ages);
      });
      return out;
    }
    btns[0].addEventListener('click', function() {
      checked = true; whyH.hidden = false;
      rows.forEach(function(r, i) { paintRow(i); });
      var bad = rows.filter(function(r) { return r.drop || r.fix; }).length;
      var hits = rows.filter(function(r, i) { return (r.drop || r.fix) && picked[i]; }).length;
      var extra = rows.filter(function(r, i) { return !(r.drop || r.fix) && picked[i]; }).length;
      var raw = means(false), clean = means(true);
      note.innerHTML = 'You found <b>' + hits + ' of ' + bad + '</b> rows that need work' + (extra ? ', and flagged ' + extra + (extra === 1 ? ' that was' : ' that were') + ' fine' : '') +
        '. Green: found. Orange: missed. Red: fine as it was. Four rows get dropped and two get recoded, leaving 8 patients. Here is what that does to the comparison:';
      stats.hidden = false;
      stats.innerHTML =
        '<div class="rl-stat"><span>Mean age CT, as is</span><b>' + raw.CT.toFixed(1) + '</b></div>' +
        '<div class="rl-stat"><span>Mean age MRI, as is</span><b>' + raw.MRI.toFixed(1) + '</b></div>' +
        '<div class="rl-stat"><span>Mean age CT, cleaned</span><b>' + clean.CT.toFixed(1) + '</b></div>' +
        '<div class="rl-stat"><span>Mean age MRI, cleaned</span><b>' + clean.MRI.toFixed(1) + '</b></div>';
      btns[0].disabled = true;
    });
    btns[1].addEventListener('click', function() {
      checked = false; whyH.hidden = true; picked = picked.map(function() { return false; });
      rows.forEach(function(r, i) { paintRow(i); });
      note.textContent = ''; stats.hidden = true; btns[0].disabled = false;
    });
  };

  // Lab 3: a threshold slider over 40 practice X-rays, with the 2x2 table and four rates.
  IX.threshold = function(box) {
    var POS = [0.97, 0.93, 0.91, 0.88, 0.84, 0.79, 0.72, 0.66, 0.58, 0.47, 0.38, 0.22];
    var NEG = [0.03, 0.05, 0.07, 0.09, 0.11, 0.12, 0.14, 0.16, 0.18, 0.2, 0.22, 0.24, 0.26, 0.28, 0.31, 0.33, 0.36, 0.39, 0.42, 0.45, 0.48, 0.52, 0.55, 0.61, 0.64, 0.69, 0.74, 0.83];
    var W = 560, X0 = 20, X1 = 540;
    function x(s) { return X0 + s * (X1 - X0); }
    var svg = '<svg class="rl-thr-svg" viewBox="0 0 ' + W + ' 196" role="img" aria-label="Scores of 12 X-rays with pneumothorax (top row) and 28 without (bottom row), on a scale from 0 to 1, with a movable threshold line.">' +
      '<text x="' + X0 + '" y="14" font-size="15" fill="#3e4652" font-weight="600">Pneumothorax (12)</text>' +
      '<text x="' + X0 + '" y="98" font-size="15" fill="#3e4652" font-weight="600">No pneumothorax (28)</text>' +
      '<line x1="' + X0 + '" x2="' + X1 + '" y1="168" y2="168" stroke="#cbd2d9"/>';
    [0, 0.25, 0.5, 0.75, 1].forEach(function(t) { svg += '<text x="' + x(t) + '" y="188" font-size="14" text-anchor="middle" fill="#6b7380">' + t + '</text>'; });
    function dots(list, y0, cls) {
      var used = {}, s = '';
      list.forEach(function(v) {
        var b = Math.round(v * 40), k = used[b] = (used[b] || 0) + 1;
        s += '<circle class="' + cls + '" data-s="' + v + '" cx="' + x(v).toFixed(1) + '" cy="' + (y0 + (k - 1) * 15 + ((b % 2) ? 6 : 0)) + '" r="6"/>';
      });
      return s;
    }
    svg += dots(POS, 34, 'p') + dots(NEG, 118, 'n') +
      '<rect class="thr-shade" x="0" y="20" width="0" height="150" fill="#a8492c" opacity="0.06"/>' +
      '<line class="thr-line" x1="0" x2="0" y1="20" y2="170" stroke="#a8492c" stroke-width="2" stroke-dasharray="4 3"/></svg>';
    box.insertAdjacentHTML('beforeend',
      '<div class="rl-thr"><div>' + svg +
        '<div class="rl-legend-dots"><span><i style="background:#a8492c"></i>flagged (score at or above the threshold)</span><span><i style="background:#fff;border:2px solid #94a3b8"></i>not flagged</span></div>' +
        '<label class="rl-range-label" for="rl-thr-r" style="margin-top:12px">Threshold <b class="thr-v">0.50</b></label>' +
        '<input class="rl-range" id="rl-thr-r" type="range" min="0.05" max="0.95" step="0.01" value="0.5">' +
      '</div><div>' +
        '<div class="rl-cm" aria-live="polite">' +
          '<div class="h"></div><div class="h">Has PTX</div><div class="h">No PTX</div>' +
          '<div class="h rh">Flagged</div><div class="tp">True pos.<span class="v" data-k="tp"></span></div><div class="fp">False pos.<span class="v" data-k="fp"></span></div>' +
          '<div class="h rh">Not flagged</div><div class="fn">False neg.<span class="v" data-k="fn"></span></div><div class="tn">True neg.<span class="v" data-k="tn"></span></div>' +
        '</div>' +
        '<div class="rl-stat-row">' +
          '<div class="rl-stat"><span>Sensitivity</span><b data-k="sens"></b></div><div class="rl-stat"><span>Specificity</span><b data-k="spec"></b></div>' +
          '<div class="rl-stat"><span>PPV</span><b data-k="ppv"></b></div><div class="rl-stat"><span>NPV</span><b data-k="npv"></b></div>' +
        '</div>' +
      '</div></div>' +
      '<p class="rl-note">Try it: find the lowest threshold that still keeps specificity above 75%. How many pneumothoraces does it miss? Then find a threshold that misses none, and count the false alarms it costs.</p>');
    var range = box.querySelector('input'), out = box.querySelector('.thr-v');
    var line = box.querySelector('.thr-line'), shade = box.querySelector('.thr-shade');
    function pct(a, b) { return b ? (a / b * 100).toFixed(0) + '%' : 'n/a'; }
    function update() {
      var t = parseFloat(range.value), tp = 0, fp = 0;
      POS.forEach(function(s) { if (s >= t) tp++; });
      NEG.forEach(function(s) { if (s >= t) fp++; });
      var fn = POS.length - tp, tn = NEG.length - fp;
      out.textContent = t.toFixed(2);
      line.setAttribute('x1', x(t)); line.setAttribute('x2', x(t));
      shade.setAttribute('x', x(t)); shade.setAttribute('width', X1 + 10 - x(t));
      all('circle', box).forEach(function(c) {
        var on = parseFloat(c.getAttribute('data-s')) >= t, pos = c.getAttribute('class') === 'p';
        c.setAttribute('fill', on ? (pos ? '#a8492c' : '#b7791f') : '#fff');
        c.setAttribute('stroke', on ? (pos ? '#a8492c' : '#b7791f') : '#94a3b8');
        c.setAttribute('stroke-width', '2');
      });
      var v = { tp: tp, fp: fp, fn: fn, tn: tn, sens: pct(tp, tp + fn), spec: pct(tn, tn + fp), ppv: pct(tp, tp + fp), npv: pct(tn, tn + fn) };
      all('[data-k]', box).forEach(function(n) { n.textContent = v[n.getAttribute('data-k')]; });
    }
    range.addEventListener('input', update);
    update();
  };

  // Lab 4: window and level on a drawn, simplified chest CT slice (values in Hounsfield units).
  IX.window = function(box) {
    var N = 200, hu = new Float32Array(N * N);
    function ell(cx, cy, rx, ry, v, test) {
      for (var yy = Math.max(0, Math.floor(cy - ry)); yy < Math.min(N, Math.ceil(cy + ry)); yy++)
        for (var xx = Math.max(0, Math.floor(cx - rx)); xx < Math.min(N, Math.ceil(cx + rx)); xx++) {
          var dx = (xx - cx) / rx, dy = (yy - cy) / ry;
          if (dx * dx + dy * dy <= 1 && (!test || test(xx, yy))) hu[yy * N + xx] = v;
        }
    }
    var i, seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (i = 0; i < N * N; i++) hu[i] = -1000;
    ell(100, 104, 90, 70, -100);            // subcutaneous fat
    ell(100, 104, 82, 62, 40);              // muscle and soft tissue
    ell(62, 98, 34, 46, -850);              // right lung (image left)
    ell(138, 98, 34, 46, -850);             // left lung
    ell(114, 112, 26, 24, 40);              // heart
    ell(100, 72, 9, 9, 45);                 // aorta
    ell(100, 152, 13, 11, 700); ell(100, 152, 8, 6, 250);  // vertebral body: cortex and marrow
    ell(100, 168, 5, 6, 650);               // spinous process
    ell(100, 48, 7, 4, 600);                // sternum
    for (i = 0; i < 9; i++) {               // ribs around the chest wall
      var a = Math.PI * (0.12 + i * 0.095);
      ell(100 + Math.cos(a) * 80, 104 - Math.sin(a) * 60, 4, 3, 700);
      ell(100 - Math.cos(a) * 80, 104 - Math.sin(a) * 60, 4, 3, 700);
    }
    for (i = 0; i < 40; i++) {              // small vessels in the lungs
      var lx = 40 + rnd() * 120, ly = 60 + rnd() * 80;
      if (hu[Math.round(ly) * N + Math.round(lx)] < -800) ell(lx, ly, 1.3, 1.3, 30);
    }
    ell(52, 80, 3.5, 3.5, 20);              // a small lung nodule
    for (i = 0; i < N * N; i++) hu[i] += (rnd() - 0.5) * 30;

    box.insertAdjacentHTML('beforeend',
      '<div class="rl-wl"><div><canvas width="' + N + '" height="' + N + '" aria-label="A drawn, simplified chest CT slice. Not a real patient."></canvas><p class="rl-wl-read" aria-live="polite">Point at the image to read a pixel value.</p></div>' +
      '<div>' +
        '<div class="rl-actions"><button type="button" class="mi-btn" data-p="1500,-600">Lung window</button><button type="button" class="mi-btn" data-p="400,40">Soft tissue window</button><button type="button" class="mi-btn" data-p="1800,400">Bone window</button></div>' +
        '<label class="rl-range-label" for="rl-wl-l" style="margin-top:14px">Level (center) <b class="wl-l"></b></label>' +
        '<input class="rl-range" id="rl-wl-l" type="range" min="-1000" max="1000" step="10" value="40">' +
        '<label class="rl-range-label" for="rl-wl-w" style="margin-top:10px">Width <b class="wl-w"></b></label>' +
        '<input class="rl-range" id="rl-wl-w" type="range" min="50" max="2500" step="10" value="400">' +
        '<div class="rl-ramp"></div><div class="rl-ramp-scale"><span>-1000</span><span>0</span><span>+1000 HU</span></div>' +
        '<p class="rl-note wl-say"></p>' +
      '</div></div>');
    var cv = box.querySelector('canvas'), ctx = cv.getContext('2d'), img = ctx.createImageData(N, N);
    var L = box.querySelector('#rl-wl-l'), Wd = box.querySelector('#rl-wl-w'), read = box.querySelector('.rl-wl-read');
    var ramp = box.querySelector('.rl-ramp'), say = box.querySelector('.wl-say');
    function draw() {
      var l = +L.value, w = +Wd.value, lo = l - w / 2;
      for (var k = 0; k < N * N; k++) {
        var g = (hu[k] - lo) / w * 255; g = g < 0 ? 0 : g > 255 ? 255 : g;
        img.data[k * 4] = img.data[k * 4 + 1] = img.data[k * 4 + 2] = g; img.data[k * 4 + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      box.querySelector('.wl-l').textContent = l + ' HU';
      box.querySelector('.wl-w').textContent = w + ' HU';
      var a = Math.max(0, Math.min(100, (lo + 1000) / 20)), b = Math.max(0, Math.min(100, (lo + w + 1000) / 20));
      ramp.style.background = 'linear-gradient(90deg,#000 0%,#000 ' + a + '%,#fff ' + b + '%,#fff 100%)';
      say.textContent = 'Values from ' + Math.round(lo) + ' to ' + Math.round(lo + w) + ' HU are spread from black to white. Anything below is pure black and anything above is pure white, so detail outside the window disappears.';
      all('[data-p]', box).forEach(function(bt) { bt.classList.toggle('is-on', bt.getAttribute('data-p') === w + ',' + l); });
    }
    function tissue(v) { return v < -900 ? 'air' : v < -500 ? 'lung' : v < -30 ? 'fat' : v < 120 ? 'soft tissue or blood' : v < 400 ? 'bone marrow' : 'bone'; }
    cv.addEventListener('pointermove', function(e) {
      var r = cv.getBoundingClientRect();
      var px = Math.floor((e.clientX - r.left) / r.width * N), py = Math.floor((e.clientY - r.top) / r.height * N);
      if (px < 0 || py < 0 || px >= N || py >= N) return;
      var v = Math.round(hu[py * N + px]);
      read.textContent = 'Pixel (' + px + ', ' + py + '): ' + v + ' HU, ' + tissue(v);
    });
    all('[data-p]', box).forEach(function(bt) {
      bt.addEventListener('click', function() { var p = bt.getAttribute('data-p').split(','); Wd.value = p[0]; L.value = p[1]; draw(); });
    });
    L.addEventListener('input', draw); Wd.addEventListener('input', draw);
    draw();
  };

  // Lab 5: a keyword rule and saved LLM answers on nine short report excerpts.
  IX.reports = function(box) {
    var R = [
      { t: 'Lungs: 6 mm solid nodule in the right upper lobe. No consolidation.', truth: 1, llm: 1, why: 'A plain mention. Both get it right.' },
      { t: 'No pulmonary nodule. Mild dependent atelectasis.', truth: 0, llm: 0, why: 'Negation trap: the word "nodule" is there, but the sentence says there is none. The rule flags it anyway.' },
      { t: '8 mm ground-glass opacity in the left lower lobe. Recommend follow-up CT.', truth: 1, llm: 1, why: 'Synonym: a ground-glass opacity of this size is a nodule, but the word "nodule" never appears. The rule misses it.' },
      { t: 'Clear lungs. No masses or nodules.', truth: 0, llm: 0, why: 'Another negation. "nodules" contains "nodule", so the rule fires.' },
      { t: 'The previously described right middle lobe nodule has resolved.', truth: 0, llm: 1, why: 'A nodule that is gone. The rule is fooled, and so is the LLM here: it saw a nodule and missed "resolved".' },
      { t: 'Small left thyroid nodule, incompletely evaluated. Lungs clear.', truth: 0, llm: 0, why: 'A nodule, but in the thyroid, not the lung. The rule can\'t tell where it is.' },
      { t: 'Spiculated 1.4 cm lesion in the left upper lobe, suspicious for malignancy.', truth: 1, llm: 1, why: 'The most important finding on the list, called a "lesion". The rule misses it.' },
      { t: 'Lungs clear. Heart size normal. No pleural effusion.', truth: 0, llm: 0, why: 'Nothing to find, and both agree.' },
      { t: 'Tiny 3 mm perifissural nodule, likely an intrapulmonary lymph node.', truth: 1, llm: 0, why: 'A real (probably harmless) nodule. The rule finds it; the LLM decided "likely a lymph node" meant no nodule. LLM errors look reasonable, which is why they are easy to miss.' }
    ];
    R.forEach(function(r) { r.rule = /nodule/i.test(r.t) ? 1 : 0; r.mine = null; });
    var shown = { rule: false, llm: false };
    var wrap = el('div', 'rl-reports');
    R.forEach(function(r, i) {
      var c = el('div', 'rl-report');
      c.innerHTML = '<p class="rl-report-text">' + esc(r.t) + '</p>' +
        '<div class="rl-report-row"><span class="lbl">Your call: lung nodule?</span><span class="rl-yn" role="group" aria-label="Your call for report ' + (i + 1) + '"><button type="button" data-v="1" aria-pressed="false">Yes</button><button type="button" data-v="0" aria-pressed="false">No</button></span>' +
        '<span class="rl-res" data-col="truth"></span><span class="rl-res" data-col="rule"></span><span class="rl-res" data-col="llm"></span></div>' +
        '<p class="rl-report-why">' + esc(r.why) + '</p>';
      all('.rl-yn button', c).forEach(function(b) {
        b.addEventListener('click', function() {
          r.mine = +b.getAttribute('data-v');
          all('.rl-yn button', c).forEach(function(o) { var on = o === b; o.classList.toggle('is-on', on); o.setAttribute('aria-pressed', on ? 'true' : 'false'); });
          paint();
        });
      });
      wrap.appendChild(c);
    });
    box.appendChild(wrap);
    box.insertAdjacentHTML('beforeend', '<div class="rl-actions"><button type="button" class="mi-btn mi-btn--rl mi-btn--fill" data-run="rule">Run the keyword rule</button><button type="button" class="mi-btn mi-btn--rl" data-run="llm">Show the saved LLM answers</button></div><div class="rl-stat-row" hidden></div><p class="rl-note" aria-live="polite"></p>');
    var stats = box.querySelector('.rl-stat-row'), note = box.querySelector('.rl-note');
    function chip(label, guess, truth) {
      return '<span class="rl-chip ' + (guess === truth ? 'ok' : 'no') + '">' + label + ': ' + (guess ? 'yes' : 'no') + (guess === truth ? '' : ' (wrong)') + '</span>';
    }
    function errs(col) { return R.filter(function(r) { return r[col] !== r.truth; }).length; }
    function paint() {
      var any = shown.rule || shown.llm;
      R.forEach(function(r, i) {
        var c = wrap.children[i];
        c.querySelector('[data-col=truth]').innerHTML = any ? '<span class="rl-chip na">Reference: ' + (r.truth ? 'yes' : 'no') + '</span>' : '';
        c.querySelector('[data-col=rule]').innerHTML = shown.rule ? chip('Rule', r.rule, r.truth) : '';
        c.querySelector('[data-col=llm]').innerHTML = shown.llm ? chip('LLM', r.llm, r.truth) : '';
        var t = esc(r.t);
        if (shown.rule) t = t.replace(/(nodules?)/gi, '<mark>$1</mark>');
        c.querySelector('.rl-report-text').innerHTML = t;
      });
      wrap.classList.toggle('is-run', any);
      if (!any) return;
      var mine = R.filter(function(r) { return r.mine !== null; });
      var h = '';
      if (mine.length) h += '<div class="rl-stat"><span>Your errors</span><b>' + mine.filter(function(r) { return r.mine !== r.truth; }).length + ' of ' + mine.length + '</b></div>';
      if (shown.rule) h += '<div class="rl-stat"><span>Keyword rule errors</span><b>' + errs('rule') + ' of 9</b></div>';
      if (shown.llm) h += '<div class="rl-stat"><span>LLM errors</span><b>' + errs('llm') + ' of 9</b></div>';
      stats.hidden = false; stats.innerHTML = h;
      note.textContent = shown.rule && shown.llm
        ? 'The rule made 6 errors of two kinds: false alarms from negations and from nodules outside the lung, and misses from synonyms. The LLM made 2, both plausible-looking. Neither is safe to use without checking against reports a person has labeled, which is exactly what the notebook does on about 120 reports.'
        : shown.rule ? 'The highlighted words are what the rule sees. It has no idea what "no" means.' : 'Now run the keyword rule as well and compare.';
    }
    all('[data-run]', box).forEach(function(b) { b.addEventListener('click', function() { shown[b.getAttribute('data-run')] = true; b.disabled = true; paint(); }); });
  };

  // Lab 6: build a structured abstract section by section, with a word count.
  IX.abstract = function(box) {
    var DRAFT = 'ai2practice_rl6_abstract';
    var F = [
      ['Rationale and Objectives', 'Why the question matters (one or two sentences), then the question itself.'],
      ['Materials and Methods', 'Dataset (name, size, where it came from), what you compared or trained, how you split the data, and which measures you used.'],
      ['Results', 'The main numbers, with the counts they came from. Give a 95% confidence interval if your notebook computed one.'],
      ['Conclusion', 'One or two sentences that answer the question, without claiming more than the results show.']
    ];
    var EX = [
      'Pneumonia classifiers trained on chest X-rays often report high accuracy, but performance on images from a different source is less often tested. We asked how well a small convolutional neural network (CNN) separates pneumonia from normal pediatric chest X-rays, and which image regions drive its predictions.',
      'We used PneumoniaMNIST, an open dataset of 5,856 pediatric chest X-rays resized to 28 x 28 pixels, with the dataset\'s fixed split (4,708 training, 524 validation, 624 test images). A two-layer CNN was trained for 10 epochs. We report accuracy, sensitivity and specificity on the test set at a threshold of 0.5, and inspected saliency maps for 20 randomly chosen test images.',
      'On the 624 test images (390 pneumonia, 234 normal), accuracy was 86%, sensitivity 95% (370 of 390) and specificity 71% (166 of 234). In 6 of 20 saliency maps, the highest-weighted pixels lay outside the lungs, near the image edges.',
      'A small CNN detected most pneumonia cases in this dataset but raised many false alarms, and some predictions relied on regions outside the lungs. Testing on images from another hospital is needed before drawing conclusions about clinical use.'
    ];
    var saved = [];
    try { saved = JSON.parse(lsGet(DRAFT) || '[]') || []; } catch (e) { saved = []; }
    var form = el('div', 'rl-abs');
    F.forEach(function(f, i) {
      form.insertAdjacentHTML('beforeend', '<label><span>' + f[0] + '</span><small>' + f[1] + '</small><textarea class="rl-textarea" data-i="' + i + '"></textarea></label>');
    });
    box.appendChild(form);
    box.insertAdjacentHTML('beforeend',
      '<div class="rl-abs-meter" style="margin-top:12px"><span class="abs-n"></span><div class="rl-bar-track"><div class="rl-bar-fill"></div></div><span>target: 300 words or fewer</span></div>' +
      '<div class="rl-actions"><button type="button" class="mi-btn" data-a="ex">Show an example</button><button type="button" class="mi-btn mi-btn--rl mi-btn--fill" data-a="use">Use this in the report back</button><button type="button" class="mi-btn" data-a="clear">Clear</button></div>' +
      '<p class="rl-note abs-say" aria-live="polite">Your draft is kept in this browser only until you send it in the report back.</p>');
    var tas = all('textarea', form), n = box.querySelector('.abs-n'), fill = box.querySelector('.rl-bar-fill'), say = box.querySelector('.abs-say');
    tas.forEach(function(t, i) { t.value = saved[i] || ''; t.addEventListener('input', update); });
    function text() {
      return F.map(function(f, i) { var v = tas[i].value.trim(); return v ? f[0] + ': ' + v : ''; }).filter(Boolean).join('\n\n');
    }
    function update() {
      var w = tas.reduce(function(s, t) { return s + words(t.value); }, 0);
      n.textContent = w + ' words';
      fill.style.width = Math.min(100, w / 300 * 100) + '%';
      fill.classList.toggle('over', w > 300);
      lsSet(DRAFT, JSON.stringify(tas.map(function(t) { return t.value; })));
    }
    box.querySelector('[data-a=ex]').addEventListener('click', function() {
      if (tas.some(function(t) { return t.value.trim(); }) && !window.confirm('Replace your draft with the example?')) return;
      tas.forEach(function(t, i) { t.value = EX[i]; });
      update();
      say.textContent = 'An example built on Lab 4\'s dataset, with made-up but plausible numbers. Notice that every result has its counts, and the conclusion does not go past the data. Replace it with your own.';
    });
    box.querySelector('[data-a=clear]').addEventListener('click', function() {
      if (!window.confirm('Clear all four sections?')) return;
      tas.forEach(function(t) { t.value = ''; }); update();
    });
    box.querySelector('[data-a=use]').addEventListener('click', function() {
      var target = document.querySelector('.rl-rb6 .rl-abstract');
      var empty = tas.filter(function(t) { return !t.value.trim(); }).length;
      if (empty) { say.textContent = 'Fill in all four sections first (' + empty + ' still empty).'; return; }
      if (target) { target.value = text(); target.dispatchEvent(new Event('input')); target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      say.textContent = 'Copied into the report back below.';
    });
    update();
  };

  /* ---------- Start ---------- */

  function init() {
    initUser();
    initMix();
    initParts();
    initNote();
    initLab6();
    all('[data-ix]').forEach(function(box) { var f = IX[box.getAttribute('data-ix')]; if (f) f(box); });
    renderReport();
    renderProgress();
    // progress.js and rl-data.js may arrive after this script.
    window.addEventListener('ai2practice:ready', renderProgress);
    window.addEventListener('ai2practice:progress-changed', renderProgress);
    window.addEventListener('storage', function(e) { if (e.key === USER_KEY) { all('.rl-user').forEach(function(i) { i.value = getUser(); }); echoUser(); renderReport(); } });
    if (!data()) {
      var tries = 0, t = setInterval(function() {
        if (data() || ++tries > 40) { clearInterval(t); renderReport(); }
      }, 250);
    }
    if (!rail()) {
      var tries2 = 0, t2 = setInterval(function() {
        if (rail() || ++tries2 > 40) { clearInterval(t2); renderProgress(); }
      }, 250);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
