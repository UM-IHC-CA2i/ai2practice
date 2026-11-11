/* Lesson 1.3 hands-on pieces: clean the data, split it, a line that learns, a small digit network, a CNN in action.
   Digits are MNIST (assets/m1-3/, built by planning/scripts/build_m13_digits.py). Styles: end of m1.css (.ml). */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const ASSETS = 'assets/m1-3/';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const softmax = (z) => { const m = Math.max(...z), e = z.map((v) => Math.exp(v - m)), s = e.reduce((a, b) => a + b); return e.map((v) => v / s); };
  const argmax = (a) => { let k = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[k]) k = i; return k; };
  const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
  const shuffle = (n) => { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const ORANGE = [194, 65, 12], BLUE = [3, 105, 161];
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  /* ---------- assets: loaded when a piece first comes near the screen ---------- */
  let assetsP = null, sheet = null, meta = null, cnnW = null, digits = null;
  function loadAssets() {
    if (assetsP) return assetsP;
    const img = new Image(); img.src = ASSETS + 'digits.png';
    assetsP = Promise.all([
      img.decode().then(() => { sheet = img; }),
      fetch(ASSETS + 'digits.json').then((r) => r.json()).then((j) => { meta = j; }),
      fetch(ASSETS + 'cnn.json').then((r) => r.json()).then((j) => { cnnW = unpack(j); }),
    ]);
    return assetsP;
  }
  // the digits as numbers 0 to 1, plus the list of inked pixels (training skips the blank ones)
  function getDigits() {
    if (digits) return digits;
    const c = document.createElement('canvas'); c.width = sheet.width; c.height = sheet.height;
    const g = c.getContext('2d'); g.drawImage(sheet, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data, n = meta.labels.length;
    digits = [];
    for (let k = 0; k < n; k++) {
      const px = new Float32Array(784), ox = (k % meta.cols) * 28, oy = Math.floor(k / meta.cols) * 28, nz = [];
      for (let y = 0; y < 28; y++) for (let x = 0; x < 28; x++) { const v = d[((oy + y) * c.width + ox + x) * 4] / 255; px[y * 28 + x] = v; if (v) nz.push(y * 28 + x); }
      digits.push({ px, nz: Uint16Array.from(nz), l: meta.labels[k] });
    }
    return digits;
  }
  const visible = new Set();
  function watch(el, onIn, onOut, needsAssets = true) {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { visible.add(el); needsAssets ? loadAssets().then(onIn) : onIn(); }
      else { visible.delete(el); onOut(); }
    }, { rootMargin: '300px 0px' }).observe(el);
  }

  /* ---------- small shared pieces ---------- */
  function makeBars(el) {
    el.innerHTML = Array.from({ length: 10 }, (_, d) => `<div class="row"><span>${d}</span><div class="bar"><div class="fill"></div></div><b>-</b></div>`).join('');
    const rows = [...el.children];
    return (p) => rows.forEach((r, d) => {
      r.classList.toggle('top', !!p && d === argmax(p));
      r.querySelector('.fill').style.transform = `scaleX(${p ? p[d].toFixed(3) : 0})`;
      r.querySelector('b').textContent = p ? Math.round(p[d] * 100) + '%' : '-';
    });
  }
  function paint(cv, px, color) {
    const g = cv.getContext('2d'), im = g.createImageData(cv.width, cv.height);
    for (let i = 0; i < px.length; i++) { const c = color ? color(px[i]) : [px[i] * 255, px[i] * 255, px[i] * 255]; im.data.set([c[0], c[1], c[2], 255], i * 4); }
    g.putImageData(im, 0, 0);
  }

  // drawing pad: strokes on a 280 x 280 canvas, read back as 28 x 28 numbers like an MNIST digit
  function makePad(root, onChange) {
    const cv = $('canvas', root), g = cv.getContext('2d'), small = document.createElement('canvas');
    small.width = small.height = 28;
    const sg = small.getContext('2d', { willReadFrequently: true });
    let drawing = false, last = null, inked = false, queued = false;
    const clear = () => { g.fillStyle = '#000'; g.fillRect(0, 0, 280, 280); inked = false; root.classList.remove('inked'); onChange(null); };
    clear();
    g.lineCap = g.lineJoin = 'round'; g.lineWidth = 24; g.strokeStyle = '#fff';
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * 280 / r.width, (e.clientY - r.top) * 280 / r.height]; };
    function read() {
      queued = false;
      sg.imageSmoothingQuality = 'high'; sg.clearRect(0, 0, 28, 28); sg.drawImage(cv, 0, 0, 28, 28);
      const d = sg.getImageData(0, 0, 28, 28).data, px = new Float32Array(784);
      for (let i = 0; i < 784; i++) px[i] = d[i * 4] / 255;
      onChange(px);
    }
    const update = () => { if (!queued) { queued = true; requestAnimationFrame(read); } };
    const ink = () => { inked = true; root.classList.add('inked'); };
    cv.addEventListener('pointerdown', (e) => {
      if (drawing || root.classList.contains('locked')) return;
      drawing = true; cv.setPointerCapture(e.pointerId); last = pos(e);
      g.beginPath(); g.arc(last[0], last[1], 12, 0, 7); g.fillStyle = '#fff'; g.fill();
      ink(); update();
    });
    cv.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      const p = pos(e); g.beginPath(); g.moveTo(last[0], last[1]); g.lineTo(p[0], p[1]); g.stroke(); last = p; update();
    });
    const end = () => { drawing = false; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    const btns = root.parentElement.querySelector('.pad-btns');
    btns.addEventListener('click', (e) => {
      const act = e.target.closest('button')?.dataset.act;
      if (act === 'clear') clear();
      if (act === 'shift' && inked) { const copy = g.getImageData(0, 0, 280, 280); g.fillStyle = '#000'; g.fillRect(0, 0, 280, 280); g.putImageData(copy, 40, 0); update(); }
      if (act === 'example') example();
    });
    function example() {
      if (!meta) return;
      const set = getDigits(), s = set[meta.train + Math.floor(Math.random() * meta.test)], t = document.createElement('canvas');
      t.width = t.height = 28; paint(t, s.px);
      g.imageSmoothingEnabled = true; g.drawImage(t, 0, 0, 280, 280); ink(); update();
    }
    return {
      get inked() { return inked; }, example,
      lock(on) { root.classList.toggle('locked', on); btns.querySelectorAll('button').forEach((b) => { b.disabled = on; }); },
    };
  }

  /* ---------- 1: a line that learns to split two groups ---------- */
  (function () {
    const sec = $('#ml-line'), cv = $('#l-plot'), g = cv.getContext('2d');
    const W = 640, H = 340, PAD = 20; // drawing units; the canvas is twice that for sharp lines
    g.scale(2, 2);
    const sx = (u) => PAD + (u + 1) / 2 * (W - 2 * PAD), sy = (v) => H - PAD - (v + 1) / 2 * (H - 2 * PAD);
    const ux = (x) => (x - PAD) / (W - 2 * PAD) * 2 - 1, vy = (y) => (H - PAD - y) / (H - 2 * PAD) * 2 - 1;
    let pts = [], m = { a: 0, b: 0, c: 0 }, shown = null, running = false, paused = false, raf = 0, order = [], oi = 0, cur = -1, passes = 0, lastT = 0, drag = -1;
    let hist = [], checks = 0, moves = 0, dragged = false, demo = null;
    const score = (p, k = m) => k.a * p.u + k.b * p.v + k.c;
    const wrong = (p) => (score(p) > 0 ? 1 : 0) !== p.g;
    const nWrong = () => pts.filter(wrong).length;
    const msg = (t) => { $('#l-msg').textContent = t; };

    function newDots() {
      // two clouds on either side of a random tilted divide, with a gap, so a straight line can split them
      const t = Math.random() * Math.PI, n = [Math.cos(t), Math.sin(t)];
      pts = [];
      while (pts.length < 40) {
        const gr = pts.length % 2, side = gr ? 1 : -1, cx = n[0] * 0.38 * side, cy = n[1] * 0.38 * side;
        const p = { u: cx + gauss() * 0.24, v: cy + gauss() * 0.22, g: gr };
        if (Math.abs(p.u) > 0.95 || Math.abs(p.v) > 0.92 || (p.u * n[0] + p.v * n[1]) * side < 0.1) continue;
        pts.push(p);
      }
    }
    function newLine() {
      // random line through the box, usually in the wrong place
      const t = Math.random() * Math.PI * 2;
      m = { a: Math.cos(t), b: Math.sin(t), c: (Math.random() - 0.5) * 0.6 };
      shown = { ...m };
    }
    function step() {
      if (oi >= order.length) {
        if (passes > 0 && !pts.some(wrong)) return 'done';
        if (passes >= 30) return 'stuck';
        order = shuffle(pts.length); oi = 0; passes++;
      }
      cur = order[oi++];
      const p = pts[cur], wasWrong = wrong(p);
      // logistic nudge: big when the dot is on the wrong side, small when it is right but close
      const q = 1 / (1 + Math.exp(-score(p) * 3)), err = q - p.g, lr = 0.6;
      m.a -= lr * err * p.u; m.b -= lr * err * p.v; m.c -= lr * err;
      checks++; if (wasWrong) moves++;
      hist.push(1 - nWrong() / pts.length);
      return wasWrong ? 'moved' : 'ok';
    }
    function stats(nw) {
      $('#l-acc').textContent = Math.round((1 - nw / pts.length) * 100) + '%';
      $('#l-wrong').textContent = nw; $('#l-checks').textContent = checks; $('#l-moves').textContent = moves; $('#l-passes').textContent = passes;
      const n = Math.max(hist.length, 120);
      $('#l-line').setAttribute('points', hist.map((h, i) => `${(i / (n - 1) * 220).toFixed(1)},${(66 - h * 60).toFixed(1)}`).join(' '));
    }
    function draw() {
      g.clearRect(0, 0, W, H);
      const k = shown, len = Math.hypot(k.a, k.b) || 1;
      // tint each side with the group the line assigns to it
      g.save(); g.beginPath(); g.rect(PAD, PAD, W - 2 * PAD, H - 2 * PAD); g.clip();
      const nx = k.a / len, ny = k.b / len, ox = -nx * k.c / len, oy = -ny * k.c / len, dx = -ny, dy = nx, F = 9;
      [[1, BLUE], [-1, ORANGE]].forEach(([s, c]) => {
        g.beginPath();
        g.moveTo(sx(ox - dx * F), sy(oy - dy * F)); g.lineTo(sx(ox + dx * F), sy(oy + dy * F));
        g.lineTo(sx(ox + dx * F + nx * F * s), sy(oy + dy * F + ny * F * s)); g.lineTo(sx(ox - dx * F + nx * F * s), sy(oy - dy * F + ny * F * s));
        g.fillStyle = rgba(c, 0.07); g.fill();
      });
      g.beginPath(); g.moveTo(sx(ox - dx * F), sy(oy - dy * F)); g.lineTo(sx(ox + dx * F), sy(oy + dy * F));
      g.strokeStyle = '#17324d'; g.lineWidth = 3; g.stroke();
      g.restore();
      g.strokeStyle = '#e5e7eb'; g.lineWidth = 1; g.strokeRect(PAD, PAD, W - 2 * PAD, H - 2 * PAD);
      let nw = 0;
      pts.forEach((p, i) => {
        const x = sx(p.u), y = sy(p.v), bad = wrong(p); if (bad) nw++;
        g.fillStyle = rgba(p.g ? BLUE : ORANGE, 1);
        g.beginPath(); p.g ? g.rect(x - 6.5, y - 6.5, 13, 13) : g.arc(x, y, 7, 0, 7); g.fill();
        if (bad) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
        if (i === cur && running) { g.beginPath(); g.arc(x, y, 13, 0, 7); g.strokeStyle = '#111827'; g.lineWidth = 2.5; g.stroke(); }
      });
      if (demo) drawHand();
      stats(nw);
      return nw;
    }
    function frame(t) {
      // check about 18 dots a second; the drawn line glides toward the model's line
      if (running && t - lastT > 55) {
        lastT = t;
        const r = step();
        if (r === 'done' || r === 'stuck') {
          stop();
          msg(r === 'done' ? `Done: every dot on its side after ${passes} ${passes === 1 ? 'pass' : 'passes'}. Now drag a dot across the line.` : 'No straight line splits these dots. It kept the best line it found.');
          if (!dragged) startDemo();
        } else msg(r === 'moved' ? 'Wrong side: the line moves.' : 'Right side: the line barely moves.');
      }
      const e = reduce ? 1 : 0.25;
      shown = { a: shown.a + (m.a - shown.a) * e, b: shown.b + (m.b - shown.b) * e, c: shown.c + (m.c - shown.c) * e };
      draw();
      if (running || Math.abs(shown.a - m.a) + Math.abs(shown.b - m.b) + Math.abs(shown.c - m.c) > 1e-3) raf = requestAnimationFrame(frame);
    }
    function stop() { running = false; cur = -1; $('#l-run').textContent = 'Train again'; }
    $('#l-run').onclick = () => {
      if (running) { stop(); paused = true; $('#l-run').textContent = 'Keep going'; msg('Paused.'); draw(); return; }
      if (!paused) { passes = 0; order = []; oi = 0; checks = 0; moves = 0; hist = [1 - nWrong() / pts.length]; }
      running = true; paused = false; stopDemo();
      $('#l-run').textContent = 'Pause';
      cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    };
    $('#l-reset').onclick = () => {
      stop(); paused = false; $('#l-run').textContent = 'Train'; newDots(); newLine();
      checks = 0; moves = 0; passes = 0; hist = []; draw(); msg('The line starts in a random place.');
    };

    // demo: a ghost hand picks up a dot, drags it a little way and puts it back, until the user drags one
    function startDemo() {
      if (reduce || dragged || running) return;
      // pick a dot near the middle so the hand is easy to see
      let k = 0, bd = 9; pts.forEach((p, i) => { const d = p.u * p.u + p.v * p.v; if (d < bd) { bd = d; k = i; } });
      demo = { k, u: pts[k].u, v: pts[k].v, t0: performance.now(), raf: 0 };
      const tick = (t) => {
        if (!demo) return;
        const T = ((t - demo.t0) % 3600) / 3600, p = pts[demo.k];
        // 0-.2 move in, .2-.5 drag out, .5-.75 drag back, rest rest
        const out = T < 0.2 ? 0 : T < 0.5 ? (T - 0.2) / 0.3 : T < 0.75 ? 1 - (T - 0.5) / 0.25 : 0, ease = out * out * (3 - 2 * out);
        p.u = demo.u + 0.32 * ease; p.v = demo.v + 0.18 * ease;
        demo.hand = { x: sx(p.u) + 8, y: sy(p.v) + 8, down: T > 0.15 && T < 0.78, a: T < 0.1 ? T / 0.1 : T > 0.9 ? (1 - T) / 0.1 : 1 };
        if (!running) draw();
        demo.raf = requestAnimationFrame(tick);
      };
      demo.raf = requestAnimationFrame(tick);
    }
    function stopDemo() { if (!demo) return; cancelAnimationFrame(demo.raf); pts[demo.k].u = demo.u; pts[demo.k].v = demo.v; demo = null; draw(); }
    function drawHand() {
      const h = demo.hand; if (!h) return;
      g.save(); g.globalAlpha = h.a;
      if (h.down) { g.beginPath(); g.arc(h.x - 8, h.y - 8, 16, 0, 7); g.fillStyle = 'rgba(3,105,161,0.18)'; g.fill(); }
      // a simple arrow pointer
      g.translate(h.x, h.y); g.beginPath();
      g.moveTo(0, 0); g.lineTo(0, 20); g.lineTo(5, 15); g.lineTo(9, 24); g.lineTo(12.5, 22.5); g.lineTo(8.5, 14); g.lineTo(15, 14); g.closePath();
      g.fillStyle = '#111827'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
      g.restore();
    }

    // drag a dot to move it
    const at = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    cv.addEventListener('pointerdown', (e) => {
      stopDemo();
      const [x, y] = at(e); let best = -1, bd = 18 * 18;
      pts.forEach((p, i) => { const d = (sx(p.u) - x) ** 2 + (sy(p.v) - y) ** 2; if (d < bd) { bd = d; best = i; } });
      if (best >= 0) { drag = best; cv.setPointerCapture(e.pointerId); if (!dragged) { dragged = true; $('#l-chip').classList.add('gone'); } }
    });
    cv.addEventListener('pointermove', (e) => {
      const [x, y] = at(e);
      if (drag < 0) { cv.style.cursor = pts.some((p) => (sx(p.u) - x) ** 2 + (sy(p.v) - y) ** 2 < 324) ? 'grab' : 'default'; return; }
      cv.style.cursor = 'grabbing';
      pts[drag].u = Math.max(-1, Math.min(1, ux(x))); pts[drag].v = Math.max(-1, Math.min(1, vy(y)));
      if (!running) { const n = draw(); msg(n ? 'Press Train again to fix it.' : 'Every dot is on its own side.'); }
    });
    const end = () => { drag = -1; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    newDots(); newLine(); draw();
    watch(sec, () => { if (!dragged && !running && !demo) startDemo(); }, () => { stopDemo(); if (running) { stop(); paused = true; $('#l-run').textContent = 'Keep going'; } }, false);
  })();

  /* ---------- 2: a small neural network, 784 pixels -> 16 hidden neurons -> 10 outputs ---------- */
  const HID = 16;
  const net = { W1: new Float32Array(HID * 784), b1: new Float32Array(HID), W2: new Float32Array(10 * HID), b2: new Float32Array(10), seen: 0, done: false };
  net.init = () => {
    for (let i = 0; i < net.W1.length; i++) net.W1[i] = gauss() * 0.01;
    for (let i = 0; i < net.W2.length; i++) net.W2[i] = gauss() * 0.25;
    net.b1.fill(0); net.b2.fill(0); net.seen = 0; net.done = false;
  };
  // nz: the inked pixels only (blank pixels add nothing)
  net.fwd = (px, nz) => {
    const h = new Float32Array(HID), z = [];
    for (let j = 0; j < HID; j++) {
      let s = net.b1[j]; const o = j * 784;
      if (nz) for (const i of nz) s += net.W1[o + i] * px[i]; else for (let i = 0; i < 784; i++) s += net.W1[o + i] * px[i];
      h[j] = s > 0 ? s : 0;
    }
    for (let d = 0; d < 10; d++) { let s = net.b2[d]; for (let j = 0; j < HID; j++) s += net.W2[d * HID + j] * h[j]; z.push(s); }
    return { h, p: softmax(z) };
  };
  net.init();

  (function () {
    const sec = $('#ml-net'), cv = $('#n-net'), g = cv.getContext('2d');
    g.scale(2, 2);
    const W = 720, H = 460;
    let lr = 0.01, goal = 0, order = [], oi = 0, hist = [], tHist = [], recent = [], best = 0, running = false, raf = 0, ready = false, padPx = null, frameN = 0, view = null;
    const inCv = document.createElement('canvas'); inCv.width = inCv.height = 28;
    const thumbs = Array.from({ length: HID }, () => { const c = document.createElement('canvas'); c.width = c.height = 28; return c; });
    const pad = makePad($('#n-pad'), (px) => { padPx = px; if (net.done && !running) { view = px ? { px, ...net.fwd(px) } : null; drawNet(); caption(); } });

    function step() {
      const set = getDigits();
      if (oi >= order.length) { order = shuffle(meta.train); oi = 0; }
      const s = set[order[oi++]], { h, p } = net.fwd(s.px, s.nz);
      recent.push(argmax(p) === s.l ? 1 : 0); if (recent.length > 100) recent.shift();
      // backprop: how much each output was off, passed back through the connections
      const e = p.slice(); e[s.l] -= 1;
      const dh = new Float32Array(HID);
      for (let j = 0; j < HID; j++) { if (h[j] <= 0) continue; let t = 0; for (let d = 0; d < 10; d++) t += net.W2[d * HID + j] * e[d]; dh[j] = t; }
      for (let d = 0; d < 10; d++) { for (let j = 0; j < HID; j++) net.W2[d * HID + j] -= lr * e[d] * h[j]; net.b2[d] -= lr * e[d]; }
      for (let j = 0; j < HID; j++) { if (!dh[j]) continue; const o = j * 784, k = lr * dh[j]; for (const i of s.nz) net.W1[o + i] -= k * s.px[i]; net.b1[j] -= k; }
      net.seen++;
      if (net.seen % 100 === 0) { const a = testAcc(); hist.push(a); best = Math.max(best, a); tHist.push(recent.reduce((x, y) => x + y) / recent.length); }
      return { px: s.px, h, p, l: s.l };
    }
    function testAcc() {
      const set = getDigits(); let ok = 0;
      for (let k = meta.train; k < set.length; k++) if (argmax(net.fwd(set[k].px, set[k].nz).p) === set[k].l) ok++;
      return ok / meta.test;
    }

    // the network picture: input -> hidden neurons (each with a picture of its 784 knobs) -> outputs
    const hy = (j) => 18 + j * 26.5, oyy = (d) => 24 + d * 43, IX = 20, IY = 140, IS = 130, HX = 330, NX = 376, OX = 560;
    function drawNet() {
      g.clearRect(0, 0, W, H);
      const v = view;
      let mx = 1e-6; for (let i = 0; i < net.W1.length; i++) mx = Math.max(mx, Math.abs(net.W1[i]));
      let m2 = 1e-6; for (let i = 0; i < net.W2.length; i++) m2 = Math.max(m2, Math.abs(net.W2[i]));
      let hm = 1e-6; if (v) for (const a of v.h) hm = Math.max(hm, a);
      const act = (j) => v ? v.h[j] / hm : 0.35;
      // input -> hidden: one bundle per neuron, darker when that neuron fires
      for (let j = 0; j < HID; j++) {
        g.beginPath(); g.moveTo(IX + IS + 4, IY + IS / 2); g.bezierCurveTo(230, IY + IS / 2, 250, hy(j), HX - 17, hy(j));
        g.strokeStyle = `rgba(23,50,77,${0.06 + 0.5 * act(j)})`; g.lineWidth = 1 + 2 * act(j); g.stroke();
      }
      // hidden -> outputs: one line per connection, color = direction, thickness = strength
      for (let j = 0; j < HID; j++) for (let d = 0; d < 10; d++) {
        const w = net.W2[d * HID + j], s = Math.abs(w) / m2, a = v ? (0.05 + 0.85 * s * act(j)) : (0.05 + 0.45 * s);
        if (a < 0.06) continue;
        g.beginPath(); g.moveTo(NX + 9, hy(j)); g.lineTo(OX - 15, oyy(d));
        g.strokeStyle = rgba(w > 0 ? ORANGE : BLUE, a.toFixed(3)); g.lineWidth = 0.6 + 2.6 * s; g.stroke();
      }
      // input picture
      if (v) paint(inCv, v.px); else inCv.getContext('2d').clearRect(0, 0, 28, 28);
      g.fillStyle = '#000'; g.fillRect(IX, IY, IS, IS);
      g.imageSmoothingEnabled = false; g.drawImage(inCv, IX, IY, IS, IS);
      // hidden neurons
      for (let j = 0; j < HID; j++) {
        paint(thumbs[j], net.W1.subarray(j * 784, j * 784 + 784), (w) => {
          const t = Math.sqrt(Math.min(Math.abs(w) / mx, 1)), c = w > 0 ? ORANGE : BLUE;
          return [255 + (c[0] - 255) * t, 255 + (c[1] - 255) * t, 255 + (c[2] - 255) * t];
        });
        g.drawImage(thumbs[j], HX - 12, hy(j) - 12, 24, 24);
        g.strokeStyle = '#d1d5db'; g.lineWidth = 1; g.strokeRect(HX - 12.5, hy(j) - 12.5, 25, 25);
        g.beginPath(); g.arc(NX, hy(j), 8, 0, 7);
        g.fillStyle = v ? `rgba(23,50,77,${(0.08 + 0.92 * act(j)).toFixed(3)})` : '#fff'; g.fill();
        g.strokeStyle = '#17324d'; g.lineWidth = 1.2; g.stroke();
      }
      // outputs, with the score for each digit
      const top = v ? argmax(v.p) : -1;
      g.font = '500 14px "IBM Plex Mono", monospace'; g.textBaseline = 'middle';
      for (let d = 0; d < 10; d++) {
        const p = v ? v.p[d] : 0, y = oyy(d);
        g.beginPath(); g.arc(OX, y, 14, 0, 7);
        g.fillStyle = d === top ? '#17324d' : '#fff'; g.fill();
        g.strokeStyle = v && v.l === d ? '#166534' : '#17324d'; g.lineWidth = v && v.l === d ? 3 : 1.2; g.stroke();
        g.fillStyle = d === top ? '#fff' : '#111827'; g.textAlign = 'center'; g.fillText(d, OX, y + 1);
        g.fillStyle = '#e5e7eb'; g.fillRect(OX + 24, y - 4, 90, 8);
        g.fillStyle = d === top ? '#17324d' : '#9ca3af'; g.fillRect(OX + 24, y - 4, 90 * p, 8);
        g.fillStyle = '#4b5563'; g.textAlign = 'right'; g.font = '500 12px "IBM Plex Mono", monospace'; g.fillText(v ? Math.round(p * 100) + '%' : '', W - 4, y + 1);
        g.font = '500 14px "IBM Plex Mono", monospace';
      }
      // column names
      g.font = '600 12px "IBM Plex Sans", sans-serif'; g.fillStyle = '#4b5563'; g.textAlign = 'center';
      g.fillText('INPUT', IX + IS / 2, IY - 30); g.font = '400 12px "IBM Plex Sans", sans-serif'; g.fillText('784 pixels', IX + IS / 2, IY - 14);
      g.fillText('what it sees', IX + IS / 2, IY + IS + 16);
      // key: line colors and the small pictures
      g.textAlign = 'left'; g.font = '400 12px "IBM Plex Sans", sans-serif';
      [[ORANGE, 'pushes toward a digit'], [BLUE, 'pushes away']].forEach(([c, t], k) => { const y = IY + IS + 52 + k * 18; g.fillStyle = rgba(c, 1); g.fillRect(IX, y - 1.5, 16, 3); g.fillStyle = '#4b5563'; g.fillText(t, IX + 22, y + 1); });
      g.fillText('small pictures: what each', IX, IY + IS + 96); g.fillText('neuron looks for', IX, IY + IS + 112); g.textAlign = 'center';
      g.font = '600 12px "IBM Plex Sans", sans-serif'; g.fillText('16 HIDDEN NEURONS', HX + 24, H - 10);
      g.fillText('10 OUTPUTS', OX + 50, H - 10);
    }
    function caption() {
      const el = $('#n-cap'), v = view;
      if (running && v) {
        const gu = argmax(v.p);
        el.innerHTML = `Reading a <b>${v.l}</b> (green ring). It guessed <b>${gu}</b>: ` + (gu === v.l ? '<span class="hit">right</span>, so every knob moves a little to make it more sure.' : `<span class="miss">wrong</span>, so every knob moves a little toward ${v.l}.`);
      } else if (!net.seen) el.innerHTML = '<span class="ml-muted">Knobs start random, so the small pictures are noise. Press Train.</span>';
      else if (!net.done) el.innerHTML = '<span class="ml-muted">Paused. Press Keep going to finish training.</span>';
      else if (v) el.innerHTML = `It reads your drawing as <b>${argmax(v.p)}</b>. Dark neurons: the ones your drawing turned on.`;
      else el.innerHTML = '<b>Training done.</b> Draw a digit in the black box to test it.';
    }
    function drawStats() {
      const pct = (a) => a === undefined ? '-' : Math.round(a * 100) + '%', n = Math.max(goal, meta.train) / 100;
      $('#n-seen').textContent = net.seen.toLocaleString();
      $('#n-acc').textContent = pct(hist[hist.length - 1]); $('#n-tacc').textContent = pct(tHist[tHist.length - 1]); $('#n-best').textContent = hist.length ? pct(best) : '-';
      const pts = (a) => a.length > 1 ? a.map((h, i) => `${((i + 1) / n * 205).toFixed(1)},${(76 - h * 70).toFixed(1)}`).join(' ') : '';
      $('#n-line').setAttribute('points', pts(hist)); $('#n-pline').setAttribute('points', pts(tHist));
    }
    function loop() {
      let last; for (let k = 0; k < 8 && net.seen < goal; k++) last = step();
      // redraw the picture every other frame and the caption a few times a second, so it can be read
      if (frameN++ % 2 === 0) { view = last; drawNet(); }
      if (frameN % 12 === 1) caption();
      drawStats();
      if (net.seen >= goal) return finish();
      raf = requestAnimationFrame(loop);
    }
    function finish() {
      running = false; net.done = true;
      pad.lock(false);
      $('#n-run').textContent = 'Train more';
      view = padPx ? { px: padPx, ...net.fwd(padPx) } : null; drawNet(); caption();
    }
    function pause() { cancelAnimationFrame(raf); if (!running) return; running = false; $('#n-run').textContent = 'Keep going'; caption(); }
    $('#n-run').onclick = () => {
      if (!ready) return; if (running) return pause();
      if (net.seen >= goal) goal = net.seen + meta.train; // each press reads every training digit once
      running = true; pad.lock(true);
      $('#n-run').textContent = 'Pause'; loop();
    };
    $('#n-reset').onclick = () => {
      cancelAnimationFrame(raf); running = false; net.init(); goal = 0; order = []; oi = 0; hist = []; tHist = []; recent = []; best = 0; view = null;
      pad.lock(true); $('#n-run').textContent = 'Train';
      drawNet(); drawStats(); caption();
    };
    $('#n-lr').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      lr = +b.dataset.lr; $('#n-lr').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    });
    pad.lock(true);
    watch(sec, () => { if (!ready) { ready = true; drawNet(); drawStats(); caption(); } }, pause);
  })();

  /* ---------- 3: the CNN ---------- */
  function unpack(j) {
    const dec = (o) => { const b = atob(o.q), a = new Float32Array(b.length); for (let i = 0; i < b.length; i++) a[i] = ((b.charCodeAt(i) << 24) >> 24) * o.s; return a; };
    return { names: j.names, c1w: dec(j.c1w), c1b: dec(j.c1b), c2w: dec(j.c2w), c2b: dec(j.c2b), c3w: dec(j.c3w), c3b: dec(j.c3b), fcw: dec(j.fcw), fcb: dec(j.fcb) };
  }
  // 3 x 3 window over every spot (zero padding at the border), then ReLU: keep positives, negatives become 0
  function conv(x, C, H, w, b, O) {
    const out = new Float32Array(O * H * H);
    for (let o = 0; o < O; o++) for (let y = 0; y < H; y++) for (let xx = 0; xx < H; xx++) {
      let s = b[o];
      for (let c = 0; c < C; c++) for (let ky = 0; ky < 3; ky++) {
        const yy = y + ky - 1; if (yy < 0 || yy >= H) continue;
        for (let kx = 0; kx < 3; kx++) { const xi = xx + kx - 1; if (xi < 0 || xi >= H) continue; s += w[((o * C + c) * 3 + ky) * 3 + kx] * x[(c * H + yy) * H + xi]; }
      }
      out[(o * H + y) * H + xx] = s > 0 ? s : 0;
    }
    return out;
  }
  function pool(x, C, H) {
    const h = H / 2, out = new Float32Array(C * h * h);
    for (let c = 0; c < C; c++) for (let y = 0; y < h; y++) for (let xx = 0; xx < h; xx++) {
      const i = (c * H + y * 2) * H + xx * 2; out[(c * h + y) * h + xx] = Math.max(x[i], x[i + 1], x[i + H], x[i + H + 1]);
    }
    return out;
  }
  function runCNN(px) {
    const W = cnnW, a1 = conv(px, 1, 28, W.c1w, W.c1b, 8), p1 = pool(a1, 8, 28);
    const a2 = conv(p1, 8, 14, W.c2w, W.c2b, 16), p2 = pool(a2, 16, 14);
    const a3 = conv(p2, 16, 7, W.c3w, W.c3b, 32), sum = new Float32Array(32);
    for (let c = 0; c < 32; c++) { let s = 0; for (let i = 0; i < 49; i++) s += a3[c * 49 + i]; sum[c] = s / 49; }
    const z = []; for (let d = 0; d < 10; d++) { let s = W.fcb[d]; for (let c = 0; c < 32; c++) s += W.fcw[d * 32 + c] * sum[c]; z.push(s); }
    return { a1, a2, a3, sum, p: softmax(z) };
  }

  (function () {
    const sec = $('#ml-cnn'), bars = makeBars($('#c-bars'));
    const mk = (el, n, s) => { el.insertAdjacentHTML('beforeend', Array.from({ length: n }, () => `<canvas class="px" width="${s}" height="${s}"></canvas>`).join('')); return [...el.querySelectorAll('canvas')]; };
    const L1 = mk($('#c-l1'), 8, 28), L2 = mk($('#c-l2'), 16, 14), L3 = mk($('#c-l3'), 32, 7);
    $('#c-sum').innerHTML = '<i></i>'.repeat(32);
    const sumBars = [...$('#c-sum').children];
    const heat = (v) => [v * 125, v * 211, 40 + v * 212]; // black to light blue
    $('#c-mpx').innerHTML = '<span></span>'.repeat(9); $('#c-mk').innerHTML = '<span></span>'.repeat(9);
    const mPx = [...$('#c-mpx').children], mK = [...$('#c-mk').children];
    let px = null, out = null, kSel = 1, ready = false, spot = null, pad = null;

    const CAPS = [
      ['Your drawing', 'To the computer, your drawing is a 28 by 28 grid of numbers: 0 for black, 1 for ink.'],
      ['Edges', 'A 3 by 3 window (a filter) slides over every spot and lights up where it finds its edge. Eight windows make eight edge maps. We set these by hand so they are easy to read.'],
      ['Shapes', 'The maps shrink to half size. Sixteen new windows combine edges into curves and corners. Nobody set these: they were learned from 60,000 examples.'],
      ['Parts', 'The maps shrink again. Thirty-two windows combine shapes into parts, such as a loop or a long stroke.'],
      ['How much of each part', 'Each part map becomes one number: how much of that part is in the picture. Where it sits no longer matters.'],
      ['Answer', 'The last layer weighs the 32 bars into a score for each digit. The highest score wins.'],
    ];
    let i = 0, scanT = 0, scanRaf = 0;

    function drawMaps(a, cvs, H) {
      let mx = 1e-6; for (let k = 0; k < a.length; k++) mx = Math.max(mx, a[k]);
      cvs.forEach((cv, c) => paint(cv, a.subarray(c * H * H, (c + 1) * H * H).map((v) => v / mx), heat));
    }
    // the math card: the nine pixels under the window, the window's numbers, and the total
    function drawMath(pos) {
      const w = cnnW.c1w.subarray(kSel * 9, kSel * 9 + 9), n = [...w].map((v) => Math.round(v * 4));
      $('#c-kname').textContent = cnnW.names[kSel][0].toUpperCase() + cnnW.names[kSel].slice(1) + ' window';
      mK.forEach((s, k) => { const t = Math.abs(n[k]) / 2; s.textContent = n[k]; s.style.background = n[k] > 0 ? rgba(ORANGE, t * 0.7) : n[k] < 0 ? rgba(BLUE, t * 0.7) : '#f3f4f6'; s.style.color = t > 0.6 ? '#fff' : '#111827'; });
      L1.forEach((cv, k) => cv.classList.toggle('sel', k === kSel));
      const win = $('#c-win'), mark = $('#c-mark');
      if (pos === null || !px) {
        mPx.forEach((s) => { s.textContent = ''; s.style.background = '#f3f4f6'; });
        $('#c-mtot').textContent = '-'; $('#c-mnote').textContent = 'total'; win.style.opacity = 0; mark.style.opacity = 0; return;
      }
      const y = Math.floor(pos / 28), x = pos % 28; let tot = 0;
      mPx.forEach((s, k) => {
        const yy = y + Math.floor(k / 3) - 1, xx = x + (k % 3) - 1, v = yy < 0 || yy > 27 || xx < 0 || xx > 27 ? 0 : px[yy * 28 + xx];
        tot += v * n[k]; s.textContent = v < 0.05 ? '0' : v > 0.95 ? '1' : v.toFixed(1).replace('0.', '.'); s.style.background = `rgb(${v * 255},${v * 255},${v * 255})`; s.style.color = v > 0.55 ? '#111827' : '#e5e7eb';
      });
      $('#c-mtot').textContent = Math.abs(tot) < 0.05 ? '0' : tot.toFixed(1);
      $('#c-mnote').textContent = tot > 0.05 ? 'edge here' : 'no edge';
      win.style.opacity = 1; win.style.transform = `translate(${(x - 1) * 100 / 3}%, ${(y - 1) * 100 / 3}%)`;
      const cv = L1[kSel]; mark.style.opacity = 1;
      mark.style.left = (cv.offsetLeft + (x + 0.5) / 28 * cv.offsetWidth) + 'px'; mark.style.top = (cv.offsetTop + (y + 0.5) / 28 * cv.offsetHeight) + 'px';
    }
    // where to put the window when nobody is pointing: the spot this edge lit up most
    const bestSpot = () => { if (!out) return null; const a = out.a1.subarray(kSel * 784, kSel * 784 + 784); return a[argmax(a)] > 0 ? argmax(a) : 392; };
    function render() {
      if (!px) {
        out = null; bars(null); [L1, L2, L3].flat().forEach((cv) => cv.getContext('2d').clearRect(0, 0, cv.width, cv.height));
        $('#c-in').getContext('2d').clearRect(0, 0, 28, 28); sumBars.forEach((b) => b.style.height = '0');
        $('#c-ans').textContent = '-'; $('#c-ansp').innerHTML = '&nbsp;';
        $('#c-compare').innerHTML = '<span class="ml-muted">Draw a digit to see the scores.</span>'; drawMath(null); return;
      }
      out = runCNN(px);
      paint($('#c-in'), px); bars(out.p);
      drawMaps(out.a1, L1, 28); drawMaps(out.a2, L2, 14); drawMaps(out.a3, L3, 7);
      let mx = 1e-6; out.sum.forEach((v) => mx = Math.max(mx, v));
      sumBars.forEach((b, c) => b.style.height = (out.sum[c] / mx * 100).toFixed(1) + '%');
      const a = argmax(out.p);
      $('#c-ans').textContent = a; $('#c-ansp').textContent = Math.round(out.p[a] * 100) + '% sure';
      $('#c-compare').innerHTML = `CNN reads it as <b>${a}</b>.<br>` + (net.done ? `The digit network above reads it as <b>${argmax(net.fwd(px).p)}</b>.` : '<span class="ml-muted">Train the digit network above to compare.</span>');
      if (!scanRaf) drawMath(spot ?? bestSpot());
    }

    // step 2: the window sweeps the drawing, the math updates, and the edge maps fill in behind it
    function scan() {
      cancelAnimationFrame(scanRaf); scanRaf = 0;
      if (i !== 1 || !out || reduce || !visible.has(sec) || spot !== null) { if (out) drawMaps(out.a1, L1, 28); drawMath(spot ?? bestSpot()); return; }
      scanT = Math.min(scanT + 3, 783);
      const pos = Math.floor(scanT);
      let mx = 1e-6; for (let k = 0; k < out.a1.length; k++) mx = Math.max(mx, out.a1[k]);
      L1.forEach((cv, c) => paint(cv, out.a1.subarray(c * 784, c * 784 + 784).map((v, j) => j <= pos ? v / mx : 0), heat));
      drawMath(pos);
      if (scanT < 783) scanRaf = requestAnimationFrame(scan); else drawMath(bestSpot());
    }
    function show() {
      sec.querySelectorAll('.stage').forEach((s) => { const k = +s.dataset.i; s.classList.toggle('on', k <= i); s.classList.toggle('cur', k === i); });
      $('#c-step').textContent = `Step ${i + 1} of ${CAPS.length}: ${CAPS[i][0]}`;
      $('#c-cap').textContent = CAPS[i][1];
      $('#c-prev').disabled = i === 0; $('#c-next').disabled = i === CAPS.length - 1;
      scanT = 0; scan();
    }
    function go(k) { i = Math.max(0, Math.min(CAPS.length - 1, k)); show(); }
    $('#c-prev').onclick = () => go(i - 1);
    $('#c-next').onclick = () => { if (!pad.inked) pad.example(); go(i + 1); };
    $('#c-pipe').addEventListener('click', (e) => { const s = e.target.closest('.stage'); if (s && !e.target.closest('#c-l1, #c-inbox')) go(+s.dataset.i); });

    // point at the drawing (or an edge map) to put the window there
    function pointAt(e, el) {
      if (!out) return;
      const r = el.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * 28), y = Math.floor((e.clientY - r.top) / r.height * 28);
      if (x < 0 || x > 27 || y < 0 || y > 27) return;
      spot = y * 28 + x; cancelAnimationFrame(scanRaf); scanRaf = 0;
      if (i === 1) drawMaps(out.a1, L1, 28);
      drawMath(spot);
    }
    $('#c-inbox').addEventListener('pointermove', (e) => pointAt(e, $('#c-in')));
    $('#c-inbox').addEventListener('pointerdown', (e) => pointAt(e, $('#c-in')));
    $('#c-l1').addEventListener('pointermove', (e) => { const k = L1.indexOf(e.target); if (k < 0 || !out || i < 1) return; kSel = k; pointAt(e, e.target); });
    $('#c-l1').addEventListener('pointerdown', (e) => { const k = L1.indexOf(e.target); if (k < 0 || !out) return; kSel = k; if (i < 1) go(1); pointAt(e, e.target); });
    const leave = () => { spot = null; if (out && !scanRaf) drawMath(bestSpot()); };
    $('#c-inbox').addEventListener('pointerleave', leave); $('#c-l1').addEventListener('pointerleave', leave);

    pad = makePad($('#c-pad'), (p) => { px = p; if (ready) render(); });
    bars(null);
    watch(sec, () => { if (!ready) { ready = true; } render(); show(); }, () => { cancelAnimationFrame(scanRaf); scanRaf = 0; });
  })();

  /* ---------- clean the data: spot the examples that should not be trained on ---------- */
  (function () {
    const sec = $('#ml-clean'); if (!sec) return;
    const grid = $('#cl-grid'), sum = $('#cl-sum');
    let items = [], checked = false, built = false;
    // fixed shuffle so everyone sees the same set
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    function letter(t) {
      const c = document.createElement('canvas'); c.width = c.height = 28; const g = c.getContext('2d');
      g.fillStyle = '#000'; g.fillRect(0, 0, 28, 28); g.fillStyle = '#fff'; g.font = 'bold 21px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 14, 15);
      const d = g.getImageData(0, 0, 28, 28).data, px = new Float32Array(784); for (let i = 0; i < 784; i++) px[i] = d[i * 4] / 255; return px;
    }
    function build() {
      const set = getDigits(), pick = [];
      for (let k = 0; pick.length < 21; k += 13) pick.push(set[meta.train + k]);
      items = pick.slice(0, 16).map((s) => ({ px: s.px, l: s.l, bad: '' }));
      pick.slice(16, 19).forEach((s) => items.push({ px: s.px, l: (s.l + 4) % 10, bad: 'Wrong label' }));
      items.push({ px: items[3].px, l: items[3].l, bad: 'Duplicate', twin: items[3] });
      items.push({ px: pick[19].px.map((v) => v * 0.12), l: pick[19].l, bad: 'Too faint to read' });
      items.push({ px: pick[20].px.map((v, i) => (i % 28 > 13 ? 0 : v)), l: pick[20].l, bad: 'Cut off' });
      items.push({ px: letter('A'), l: 4, bad: 'Not a digit' });
      for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
      grid.innerHTML = items.map((_, i) => `<button type="button" class="cl-tile" aria-pressed="false"><canvas class="px" width="28" height="28"></canvas><span>Label: <b></b></span><em></em></button>`).join('');
      [...grid.children].forEach((b, i) => {
        const it = items[i]; it.el = b; paint($('canvas', b), it.px); $('b', b).textContent = it.l;
        b.setAttribute('aria-label', `Example ${i + 1}, labeled ${it.l}`);
        b.onclick = () => { if (checked) return; b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); count(); };
      });
      built = true; count();
    }
    const flagged = (it) => it.el.getAttribute('aria-pressed') === 'true';
    function count() { const n = items.filter(flagged).length; sum.textContent = n ? `${n} marked to remove.` : 'Click an example to mark it for removal.'; }
    $('#cl-check').onclick = () => {
      if (!built) return;
      checked = true; let found = 0, wrong = 0;
      // either copy of the duplicate counts
      items.forEach((it) => { if (it.twin && !flagged(it) && flagged(it.twin)) { it.twin.bad = it.bad; it.bad = ''; } });
      items.forEach((it) => {
        const f = flagged(it); it.el.classList.add('done');
        if (it.bad) { it.el.classList.add(f ? 'found' : 'missed'); $('em', it.el).textContent = it.bad; if (f) found++; }
        else if (f) { it.el.classList.add('fine'); $('em', it.el).textContent = 'This one was fine'; wrong++; }
      });
      const total = items.filter((it) => it.bad).length;
      sum.innerHTML = `You found <b>${found} of ${total}</b> problems` + (wrong ? `, and removed ${wrong} good ${wrong === 1 ? 'example' : 'examples'}.` : '.') + ` The clean set has ${items.length - total} examples.`;
      $('#cl-check').disabled = true; $('#cl-after').hidden = false;
    };
    $('#cl-reset').onclick = () => { checked = false; seed = 7; $('#cl-check').disabled = false; $('#cl-after').hidden = true; build(); };
    watch(sec, () => { if (!built) build(); }, () => {});
  })();

  /* ---------- split: by image lets the same patient into both sets ---------- */
  (function () {
    const sec = $('#ml-split'); if (!sec) return;
    const COL = ['#17324d', '#a8492c', '#0369a1', '#4b9b8f', '#7c3aed', '#3f6e8c'], P = 'ABCDEF';
    let mode = 'image';
    const chip = (im, leak) => `<span class="sp-chip${leak ? ' leak' : ''}" style="background:${COL[im.p]}">${P[im.p]}${im.k + 1}</span>`;
    function render() {
      const ims = []; for (let p = 0; p < 6; p++) for (let k = 0; k < 3; k++) ims.push({ p, k });
      let train, test;
      if (mode === 'image') { const o = shuffle(18); train = o.slice(0, 12).map((i) => ims[i]); test = o.slice(12).map((i) => ims[i]); }
      else { const o = shuffle(6), tp = new Set(o.slice(4)); train = ims.filter((im) => !tp.has(im.p)); test = ims.filter((im) => tp.has(im.p)); }
      const seen = new Set(train.map((im) => im.p)), leaks = test.filter((im) => seen.has(im.p)).length;
      const byP = (a, b) => a.p - b.p || a.k - b.k;
      $('#sp-train').innerHTML = train.sort(byP).map((im) => chip(im, false)).join('');
      $('#sp-test').innerHTML = test.sort(byP).map((im) => chip(im, seen.has(im.p))).join('');
      $('#sp-leaks').textContent = `${leaks} of 6`;
      $('#sp-msg').innerHTML = leaks ? 'These test patients were already in training (outlined). The model may recognize the patient, not the disease, so its test score looks <b>better than it really is</b>.' : 'Every test patient is new to the model. This is a <b>fair test</b>.';
      $('#sp-msg').className = leaks ? 'sp-msg bad' : 'sp-msg ok';
    }
    $('#sp-mode').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      mode = b.dataset.mode; $('#sp-mode').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b)); render();
    });
    $('#sp-shuffle').onclick = render;
    render();
  })();
})();
