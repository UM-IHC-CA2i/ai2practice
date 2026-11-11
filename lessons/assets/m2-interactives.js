(function() {
  'use strict';

  // In-page interactives for Module 2. Load after m1-interactives.js (sort cards,
  // step-through, tabbed explorer and the clickable report all come from there).
  // Drag-to-order now lives in interactives.js (.ix-order).
  // Each widget finds its own markup:
  //   .m2-sv         head CT stack scroller with find-the-slice tasks (2.1)
  //   .m2-window     CT window explorer on a drawn chest CT slice (2.2)
  //   .m2-journey    system map that lights up with the active .mi-step (2.3)
  //   .m2-translate  write a plain-language version, then compare with a sample (2.4)

  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ── CT window explorer ──
  // A made-up axial slice of a chest CT with contrast, stored as CT numbers (Hounsfield units).
  // Not a real patient: shapes are simplified so each tissue is easy to find.
  all('.m2-window').forEach(function(box) {
    var N = 256;
    var hu = new Float32Array(N * N).fill(-1000);
    var seed = 7;
    function rand() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function gauss() { return (rand() + rand() + rand() - 1.5) * 1.4; }
    function ellipse(cx, cy, rx, ry, v) {
      for (var y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(N - 1, Math.ceil(cy + ry)); y++) {
        for (var x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(N - 1, Math.ceil(cx + rx)); x++) {
          var dx = (x - cx) / rx, dy = (y - cy) / ry;
          if (dx * dx + dy * dy <= 1) hu[y * N + x] = v;
        }
      }
    }
    ellipse(128, 132, 112, 82, -100);      // body outline: fat under the skin
    ellipse(128, 132, 103, 73, 45);        // chest wall muscle and mediastinum
    ellipse(80, 128, 40, 54, -860);        // right lung (on the viewer's left)
    ellipse(177, 128, 38, 54, -860);       // left lung
    for (var v = 0; v < 70; v++) {         // small vessels in the lungs
      var side = v % 2, a = rand() * 6.283, r = Math.sqrt(rand());
      var cx = side ? 177 + Math.cos(a) * r * 32 : 80 + Math.cos(a) * r * 34;
      var cy = 128 + Math.sin(a) * r * 46;
      ellipse(cx, cy, 1 + rand() * 1.3, 1 + rand() * 1.3, 40);
    }
    [15, 40, 62, 118, 140, 165, 190, 215, 240, 300, 325, 350].forEach(function(deg) {   // ribs
      var t = deg * Math.PI / 180;
      ellipse(128 + Math.cos(t) * 99, 132 + Math.sin(t) * 69, 5, 4, 750);
    });
    ellipse(138, 140, 33, 27, -90);        // fat around the heart
    ellipse(138, 140, 30, 24, 45);         // heart
    ellipse(142, 142, 17, 13, 260);        // contrast in the heart chambers
    ellipse(116, 104, 12, 12, 300);        // ascending aorta (contrast)
    ellipse(143, 98, 13, 12, 300);         // main pulmonary artery (contrast)
    ellipse(157, 170, 8, 8, 300);          // descending aorta
    ellipse(100, 128, 5, 5, 300);          // right lower lobe pulmonary artery branch
    ellipse(100, 128, 2.5, 2.5, 30);       // clot inside it (pulmonary embolism)
    ellipse(128, 183, 15, 14, 1050);       // vertebral body: hard outer bone
    ellipse(128, 183, 12, 11, 260);        // softer inner bone
    ellipse(128, 202, 5, 5, 20);            // spinal canal
    ellipse(128, 60, 9, 5, 650);           // sternum
    ellipse(66, 98, 4, 4, 40);             // 8 mm nodule in the right upper lung
    for (var i = 0; i < hu.length; i++) if (hu[i] > -990) hu[i] += gauss() * 12;

    box.innerHTML =
      '<div class="m2-window-view">' +
      '<canvas width="' + N + '" height="' + N + '" role="img" aria-label="Drawn axial chest CT slice. Change the window to see different tissues."></canvas>' +
      '<span class="m2-window-side m2-window-side--r">R</span><span class="m2-window-side m2-window-side--l">L</span>' +
      '<p class="m2-window-hu">Point at the image to read the CT number under the cursor.</p></div>' +
      '<div><div class="m2-presets">' +
      '<button type="button" class="mi-btn" data-w="1500" data-l="-600">Lung window</button>' +
      '<button type="button" class="mi-btn" data-w="400" data-l="40">Soft-tissue window</button>' +
      '<button type="button" class="mi-btn" data-w="1800" data-l="400">Bone window</button>' +
      '<button type="button" class="mi-btn" data-w="2400" data-l="0">Everything at once</button></div>' +
      '<div class="m2-slider"><label for="m2-wl">Level (center) <b data-k="l"></b></label>' +
      '<input type="range" id="m2-wl" min="-1000" max="1000" step="10"></div>' +
      '<div class="m2-slider"><label for="m2-ww">Width (range) <b data-k="w"></b></label>' +
      '<input type="range" id="m2-ww" min="50" max="2500" step="10"></div>' +
      '<div class="m2-window-bar" style="background:linear-gradient(90deg,#000,#fff)"></div>' +
      '<div class="m2-window-range"><span data-k="lo"></span><span data-k="hi"></span></div>' +
      '<p class="m2-window-note"></p></div>';

    var canvas = box.querySelector('canvas'), ctx = canvas.getContext('2d');
    var img = ctx.createImageData(N, N);
    var lv = box.querySelector('#m2-wl'), wd = box.querySelector('#m2-ww');
    var presets = all('.m2-presets .mi-btn', box), note = box.querySelector('.m2-window-note');
    var readout = box.querySelector('.m2-window-hu');
    var notes = {
      '1500,-600': 'Lung window: the lungs turn from black to gray, so you can see vessels and the small round nodule in the right lung. Everything denser than muscle is plain white.',
      '400,40': 'Soft-tissue window: the narrow range spreads the soft tissues across the grays. Look inside the white pulmonary artery branch in the right lung: the small dark spot is the clot (the pulmonary embolism). The lungs are now just black.',
      '1800,400': 'Bone window: the ribs, sternum and spine show their inner structure. Soft tissues all look the same gray.',
      '2400,0': 'A very wide window shows every tissue at once, but each one gets only a few shades of gray, so small differences, like the clot, disappear.'
    };
    function render() {
      var L = +lv.value, W = +wd.value, lo = L - W / 2;
      for (var i = 0; i < hu.length; i++) {
        var g = Math.round(Math.max(0, Math.min(1, (hu[i] - lo) / W)) * 255);
        img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = g;
        img.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      box.querySelector('[data-k="l"]').textContent = L;
      box.querySelector('[data-k="w"]').textContent = W;
      box.querySelector('[data-k="lo"]').textContent = Math.round(lo) + ' and below: black';
      box.querySelector('[data-k="hi"]').textContent = Math.round(lo + W) + ' and above: white';
      var key = W + ',' + L;
      presets.forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-w') + ',' + b.getAttribute('data-l') === key); });
      note.textContent = notes[key] || 'Custom window. Only CT numbers between the two values above get shades of gray; everything outside is pure black or pure white.';
    }
    presets.forEach(function(b) {
      b.addEventListener('click', function() { wd.value = b.getAttribute('data-w'); lv.value = b.getAttribute('data-l'); render(); });
    });
    lv.addEventListener('input', render);
    wd.addEventListener('input', render);
    canvas.addEventListener('mousemove', function(e) {
      var r = canvas.getBoundingClientRect();
      var x = Math.floor((e.clientX - r.left) / r.width * N), y = Math.floor((e.clientY - r.top) / r.height * N);
      if (x < 0 || y < 0 || x >= N || y >= N) return;
      var h = Math.round(hu[y * N + x]);
      var what = h < -950 ? 'air' : h < -500 ? 'lung' : h < -30 ? 'fat' : h < 100 ? 'soft tissue or blood' : h < 400 ? 'contrast-filled blood or soft bone' : 'bone';
      readout.textContent = 'CT number here: ' + h + ' HU (' + what + ')';
    });
    canvas.addEventListener('mouseleave', function() { readout.textContent = 'Point at the image to read the CT number under the cursor.'; });
    wd.value = 1500; lv.value = -600;
    render();
  });

  // ── Scan journey map ──
  // <div class="m2-journey"> <svg class="m2-map"> <g class="sys" data-sys="ehr">... </svg>
  //   <div class="mi-steps"> <div class="mi-step" data-sys="ehr ris">...</div> ... </div> </div>
  all('.m2-journey').forEach(function(box) {
    var systems = all('.m2-map .sys', box), steps = all('.mi-step', box);
    function sync() {
      var active = steps.filter(function(s) { return s.classList.contains('active'); })[0];
      var on = active ? (active.getAttribute('data-sys') || '').split(' ') : [];
      systems.forEach(function(g) { g.classList.toggle('on', on.indexOf(g.getAttribute('data-sys')) !== -1); });
    }
    var obs = new MutationObserver(sync);
    steps.forEach(function(s) { obs.observe(s, { attributes: true, attributeFilter: ['class'] }); });
    sync();
  });

  // ── Translate the report ──
  // <div class="m2-translate"> <label> <textarea> <button class="mi-btn"> <div class="m2-model" hidden> </div>
  all('.m2-translate').forEach(function(box) {
    var btn = box.querySelector('.mi-btn'), model = box.querySelector('.m2-model');
    btn.addEventListener('click', function() {
      model.hidden = !model.hidden;
      btn.textContent = model.hidden ? 'Compare with a sample answer' : 'Hide the sample answer';
    });
  });

  // The clickable report reuses the .mi-shortcut script; mark the part being read.
  all('.m2-report').forEach(function(box) {
    all('.mi-hot', box).forEach(function(hot) {
      function mark() { all('.mi-hot', box).forEach(function(h) { h.classList.toggle('current', h === hot); }); }
      hot.addEventListener('click', mark);
      hot.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') mark(); });
    });
  });
  // ── Head CT scroller ──
  // 34 real axial slices (448 x 448 each) stacked in one image strip, skull base first.
  all('.m2-sv').forEach(function(box) {
    var N = 34, S = 448;
    var view = box.querySelector('.m2-sv-view'), ctx = view.querySelector('canvas').getContext('2d');
    var range = box.querySelector('.m2-sv-range'), nEl = box.querySelector('.m2-sv-n'), hint = box.querySelector('.m2-sv-hint');
    var plane = box.querySelector('.m2-sv-plane'), play = box.querySelector('.m2-sv-play');
    var img = new Image(), cur = 10, timer = null;
    img.onload = draw;
    img.src = 'images/m2/head-ct-axial.jpg';

    function draw() {
      if (img.complete && img.naturalWidth) ctx.drawImage(img, 0, (cur - 1) * S, S, S, 0, 0, S, S);
      nEl.textContent = cur; range.value = cur; view.setAttribute('aria-valuenow', cur);
      // Side view: slice 1 = skull base (x 76), slice 34 = top of the head (x 24)
      plane.setAttribute('cx', 76 - (cur - 1) * (52 / (N - 1)));
    }
    function go(n) { n = Math.max(1, Math.min(N, n)); if (n !== cur) { cur = n; draw(); } hint.style.opacity = 0; }

    // Wheel down moves toward the feet, as in most viewers
    var acc = 0;
    view.addEventListener('wheel', function(e) {
      e.preventDefault(); acc += e.deltaY;
      var step = e.deltaMode === 1 ? 1 : 100;
      while (Math.abs(acc) >= step) { go(cur + (acc > 0 ? -1 : 1)); acc -= step * Math.sign(acc); }
    }, { passive: false });

    var dragY = null;
    view.addEventListener('pointerdown', function(e) { dragY = e.clientY; view.setPointerCapture(e.pointerId); view.focus(); });
    view.addEventListener('pointermove', function(e) {
      if (dragY === null) return;
      var d = e.clientY - dragY;
      if (Math.abs(d) >= 10) { go(cur + (d > 0 ? -1 : 1) * Math.floor(Math.abs(d) / 10)); dragY = e.clientY; }
    });
    view.addEventListener('pointerup', function() { dragY = null; });
    view.addEventListener('pointercancel', function() { dragY = null; });
    view.addEventListener('keydown', function(e) {
      var m = { ArrowUp: 1, ArrowRight: 1, PageUp: 5, ArrowDown: -1, ArrowLeft: -1, PageDown: -5 };
      if (e.key in m) { e.preventDefault(); go(cur + m[e.key]); }
      else if (e.key === 'Home') { e.preventDefault(); go(1); }
      else if (e.key === 'End') { e.preventDefault(); go(N); }
    });
    range.addEventListener('input', function() { go(+range.value); });

    function stop() { clearInterval(timer); timer = null; play.textContent = 'Play'; }
    play.addEventListener('click', function() {
      if (timer) { stop(); return; }
      if (cur === N) go(1);
      play.textContent = 'Pause';
      timer = setInterval(function() { if (cur >= N) stop(); else go(cur + 1); }, 120);
    });

    // Find-the-slice tasks. Slice ranges checked by eye on the stack.
    var tasks = [
      { q: 'Find a slice that shows both eyeballs.', lo: 5, hi: 9,
        why: 'The eyeballs (globes) sit in the eye sockets near the bottom of the stack, at about slices 5 to 9. They look like two gray circles at the front, surrounded by dark fat.' },
      { q: 'Find the lateral ventricles: the dark, fluid-filled spaces in the middle of the brain.', lo: 14, hi: 20,
        why: 'The lateral ventricles appear at about slices 14 to 20. They are dark because they hold cerebrospinal fluid (CSF), which is close to water and darker than the brain around it.' },
      { q: 'Find the very top of the skull.', lo: 31, hi: 34,
        why: 'The last few slices (about 31 to 34) catch only the dome of the skull: mostly white bone, with little or no brain left inside.' }
    ];
    var t = 0, qEl = box.querySelector('.m2-sv-q'), fb = box.querySelector('.m2-sv-fb');
    var chk = box.querySelector('.m2-sv-check'), nxt = box.querySelector('.m2-sv-next'), steps = all('.m2-sv-steps i', box);
    function showTask() {
      qEl.textContent = (t + 1) + ' of ' + tasks.length + '. ' + tasks[t].q;
      fb.textContent = ''; fb.className = 'm2-sv-fb'; chk.hidden = false; nxt.hidden = true;
      steps.forEach(function(s, i) { s.className = i < t ? 'done' : i === t ? 'on' : ''; });
    }
    chk.addEventListener('click', function() {
      var k = tasks[t], ok = cur >= k.lo && cur <= k.hi;
      fb.className = 'm2-sv-fb ' + (ok ? 'ok' : 'no');
      fb.textContent = (ok ? 'Yes, slice ' + cur + '. ' : 'Not quite: you are on slice ' + cur + '. ') + k.why;
      if (ok) {
        chk.hidden = true; steps[t].className = 'done';
        if (t < tasks.length - 1) nxt.hidden = false;
        else fb.textContent += ' All three found.';
      }
    });
    nxt.addEventListener('click', function() { t++; showTask(); });
    showTask();
    draw();
  });
})();
