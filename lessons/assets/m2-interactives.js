(function() {
  'use strict';

  // In-page interactives for Module 2. Load after m1-interactives.js (sort cards,
  // step-through, tabbed explorer and the clickable report all come from there).
  // Drag-to-order now lives in interactives.js (.ix-order).
  // Each widget finds its own markup:
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
})();
