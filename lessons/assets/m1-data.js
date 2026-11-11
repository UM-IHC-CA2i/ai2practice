/* Lesson 1.2 (Data & Labels): the "everything becomes numbers" converter,
   the pixel slider, the storage-size bars and labeling real chest X-rays. */
(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);
  function fit(c) {
    const d = devicePixelRatio || 1;
    c.width = c.clientWidth * d; c.height = c.clientHeight * d;
    const x = c.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); return x;
  }

  /* ── Converter ── */
  const stage = $('dl-stage');
  if (stage) {
    const btn = $('dl-btn'), note = $('dl-note'), med = $('dl-med'), tabs = [...document.querySelectorAll('.m1-dl-tab')];
    const cv = (h, n, i) => `<span class="m1-dl-cv" style="--i:${i}"><span class="h">${h}</span><span class="n">${n}</span></span>`;
    const P = { '.': [255, 255, 255], r: [214, 48, 49], d: [150, 30, 32], w: [250, 170, 170], g: [46, 139, 87], b: [120, 72, 40] };
    const apple = ['.....bg.....', '.....bgg....', '....b.......', '..rrr.rrrr..', '.rwrrrrrrrr.', '.rwrrrrrrrr.', '.rrrrrrrrrd.', '.rrrrrrrrrd.', '.rrrrrrrrdd.', '..rrrrrrdd..', '...rrrddd...', '....rr.d....'];
    const wave = t => Math.sin(t * 2 * Math.PI * 3) * 0.6 + Math.sin(t * 2 * Math.PI * 7) * 0.3;
    const ecg = k => {
      const p = (k % 400) / 400, g = (c, w, a) => a * Math.exp(-((p - c) ** 2) / w);
      return 0.05 * Math.sin(p * 6.28) + g(.15, .001, .15) + g(.27, .00005, -.15) + g(.3, .00006, 1) + g(.33, .00006, -.25) + g(.55, .003, .3);
    };
    let cur = 'table', on = false, raf = 0, last = 0, visible = false, mon = null;

    const T = {
      table: {
        med: '<b>In medicine:</b> the health record, with vital signs, lab results, medications and diagnoses.',
        note: 'Each column becomes a number. Yes and no become 1 and 0. The name is dropped: it does not help the model, and it is private.',
        html: () => {
          const rows = [['A. Lee', 24, 'Yes', 112], ['B. Ortiz', 67, 'No', 78], ['C. Shah', 31, 'Yes', 104]];
          let i = 0;
          return '<table class="m1-dl-sheet"><tr><th class="drop">Name</th><th>Age</th><th>Smoker</th><th>Heart rate</th></tr>' +
            rows.map(r => `<tr><td class="drop">${r[0]}</td><td>${cv(r[1], r[1], i++)}</td><td>${cv(r[2], r[2] === 'Yes' ? 1 : 0, i++)}</td><td>${cv(r[3], r[3], i++)}</td></tr>`).join('') + '</table>';
        }
      },
      text: {
        med: '<b>In medicine:</b> radiology reports, clinic notes and referral letters. Chatbots such as ChatGPT read and write text this way.',
        note: 'The text is cut into small pieces called tokens, and each token gets an ID number. Rare words split into smaller pieces. (These IDs are made up for the example.)',
        html: () => '<div class="m1-dl-toks">' + [['Small', 8241], ['left', 2187], ['pneumo', 30912], ['thorax', 17455], ['.', 13]]
          .map((x, i) => `<span class="m1-dl-tok" style="--i:${i}">${x[0]}<small>${x[1]}</small></span>`).join('') + '</div>'
      },
      image: {
        med: '<b>In medicine:</b> X-rays, CT, MRI, ultrasound, skin photos and pathology slides. Module 2 shows how medical images are made.',
        note: 'An image is a grid of tiny squares called pixels. In a color picture each pixel is three numbers: how much red, green and blue, from 0 to 255. The grid shows each pixel\'s average brightness. Point at a pixel to see its three numbers.',
        html: () => '<div class="m1-dl-imgrow"><div class="m1-dl-pix" id="dl-pix">' + apple.join('').split('').map(c => {
          const [r, g, b] = P[c], gray = Math.round((r + g + b) / 3);
          return `<i style="background:rgb(${r},${g},${b});color:${gray > 140 ? '#111' : '#fff'}" data-rgb="${r},${g},${b}"><span>${gray}</span></i>`;
        }).join('') + '</div><div class="m1-dl-readout"><div class="m1-dl-swatch" id="dl-sw"></div><div id="dl-rgb">R &ndash;<br>G &ndash;<br>B &ndash;</div></div></div>',
        after: () => {
          const sw = $('dl-sw'), out = $('dl-rgb'), show = e => {
            const p = e.target.closest('i'); if (!p) return;
            const [r, g, b] = p.dataset.rgb.split(',');
            sw.style.background = `rgb(${r},${g},${b})`; out.innerHTML = `R ${r}<br>G ${g}<br>B ${b}`;
          };
          $('dl-pix').addEventListener('pointerover', show); $('dl-pix').addEventListener('click', show);
        }
      },
      sound: {
        med: '<b>In medicine:</b> dictated radiology reports, and "ambient scribes" that listen to a clinic visit and draft the note.',
        note: 'Sound is a wave. A microphone measures the height of the wave thousands of times a second (44,100 times for music) and stores each height as a number.',
        html: () => '<canvas class="m1-dl-canvas" id="dl-wave"></canvas><p class="m1-dl-stream" id="dl-stream"></p><button type="button" class="m1-dl-small" id="dl-play">Play the sound</button>',
        after: () => { drawWave(); $('dl-play').onclick = play; }
      },
      signal: {
        med: '<b>In medicine:</b> ECGs and ICU bedside monitors, which track heart rhythm, oxygen level and blood pressure around the clock.',
        note: 'An ECG measures the heart\'s electrical activity about 500 times a second. Each dot is one measurement, stored as a number in millivolts (mV).',
        html: () => '<div class="m1-dl-mon"><canvas id="dl-sig"></canvas><div class="m1-dl-hr"><small>HR</small><b id="dl-hr">74</b><small>beats/min</small></div></div><div class="m1-dl-chips" id="dl-chips"></div>',
        after: () => {
          mon = { buf: null, pos: 0, k: 0, beat: -1 };
          if (ensure()) for (let i = 0; i < mon.buf.length; i++) tick();
          drawSig(); run();
        }
      }
    };

    function drawWave() {
      const c = $('dl-wave'); if (!c) return;
      const x = fit(c), w = c.clientWidth, h = c.clientHeight, out = $('dl-stream');
      x.strokeStyle = on ? '#cbd2d9' : '#0369a1'; x.lineWidth = 2; x.beginPath();
      for (let i = 0; i <= w; i++) { const py = h / 2 - wave(i / w) * h * 0.42; i ? x.lineTo(i, py) : x.moveTo(i, py); }
      x.stroke(); out.textContent = '';
      if (!on) return;
      const N = 40, vals = [];
      for (let k = 0; k <= N; k++) setTimeout(() => {
        if (!on || cur !== 'sound') return;
        const f = k / N, v = wave(f), px = f * w, py = h / 2 - v * h * 0.42;
        x.strokeStyle = '#0369a1'; x.beginPath(); x.moveTo(px, h / 2); x.lineTo(px, py); x.stroke();
        x.fillStyle = '#0369a1'; x.beginPath(); x.arc(px, py, 3.5, 0, 7); x.fill();
        vals.push(Math.round(v * 100)); out.textContent = 'heights: ' + vals.join(', ');
      }, RM ? 0 : k * 45);
    }
    function play() {
      const A = new (window.AudioContext || window.webkitAudioContext)(), g = A.createGain();
      g.connect(A.destination); g.gain.setValueAtTime(0.0001, A.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, A.currentTime + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, A.currentTime + 1.2);
      [220, 513].forEach(f => { const o = A.createOscillator(); o.frequency.value = f; o.connect(g); o.start(); o.stop(A.currentTime + 1.25); });
    }
    /* ICU-style sweep: one buffer slot per pixel, overwritten left to right. */
    function ensure() {
      const c = $('dl-sig'); if (!c || !mon) return null;
      const w = Math.round(c.clientWidth);
      if (!mon.buf || mon.buf.length !== w) { mon.buf = new Float32Array(w); mon.pos = 0; }
      return c;
    }
    function tick() {
      const b = mon.buf; b[mon.pos] = ecg(mon.k); mon.k += 4.1; mon.pos = (mon.pos + 1) % b.length;
      const beat = Math.floor(mon.k / 400);
      if (beat !== mon.beat) { mon.beat = beat; const el = $('dl-hr'); if (el) el.textContent = 73 + Math.round(3 * Math.sin(beat / 3)); }
    }
    function drawSig() {
      const c = ensure(); if (!c) return;
      const x = fit(c), w = c.clientWidth, h = c.clientHeight, b = mon.buf, y = v => h * 0.72 - v * h * 0.55;
      const ahead = i => (i - mon.pos + b.length) % b.length < 16;
      x.fillStyle = '#07130e'; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(52,211,153,0.08)'; x.lineWidth = 1; x.beginPath();
      for (let g = 0; g < w; g += 20) { x.moveTo(g + 0.5, 0); x.lineTo(g + 0.5, h); }
      for (let g = 0; g < h; g += 20) { x.moveTo(0, g + 0.5); x.lineTo(w, g + 0.5); }
      x.stroke();
      x.strokeStyle = '#34d399'; x.lineWidth = 2; x.lineJoin = 'round'; x.beginPath();
      let pen = false;
      for (let i = 0; i < b.length; i++) {
        if (ahead(i)) { pen = false; continue; }
        pen ? x.lineTo(i, y(b[i])) : x.moveTo(i, y(b[i])); pen = true;
      }
      x.stroke();
      if (on) {
        x.fillStyle = '#d1fae5';
        for (let i = 0; i < b.length; i += 6) if (!ahead(i)) { x.beginPath(); x.arc(i, y(b[i]), 1.8, 0, 7); x.fill(); }
      }
    }
    function chips() {
      const el = $('dl-chips'); if (!el || !mon) return;
      if (!on) { el.innerHTML = ''; return; }
      const b = mon.buf, v = [];
      for (let j = 6; j >= 1; j--) { const n = b[(mon.pos - 16 - j * 6 + b.length * 2) % b.length]; v.push((Math.abs(n) < 0.005 ? 0 : n).toFixed(2)); }
      el.innerHTML = '<span class="lab">Last 6 dots (mV)</span>' + v.map(n => `<span>${n}</span>`).join('');
    }
    function frame(ts) {
      raf = 0;
      if (cur !== 'signal' || !visible) return;
      ensure(); tick(); tick(); drawSig();
      if (ts - last > 400) { last = ts; chips(); }
      raf = requestAnimationFrame(frame);
    }
    function run() { if (!RM && !raf && visible && cur === 'signal') raf = requestAnimationFrame(frame); }
    new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; run(); })).observe(stage);

    function show(k) {
      cur = k; on = false; stage.classList.remove('num');
      stage.innerHTML = T[k].html(); T[k].after && T[k].after();
      note.textContent = ''; med.innerHTML = T[k].med; btn.textContent = 'Show what the computer sees';
    }
    btn.onclick = () => {
      on = !on; stage.classList.toggle('num', on);
      note.textContent = on ? T[cur].note : '';
      btn.textContent = on ? 'Show the human view' : 'Show what the computer sees';
      if (cur === 'sound') drawWave();
      if (cur === 'signal') { drawSig(); chips(); }
    };
    tabs.forEach(b => b.onclick = () => {
      tabs.forEach(o => o.setAttribute('aria-selected', o === b));
      show(b.dataset.t);
    });
    addEventListener('resize', () => { if (cur === 'sound') drawWave(); if (cur === 'signal') drawSig(); });
    show('table');
  }

  /* ── Pixel slider ── */
  const res = $('dl-res');
  if (res) {
    const seg = $('dl-res-seg'), px = $('dl-res-px'), num = $('dl-res-n'), cap = $('dl-res-cap');
    const src = document.createElement('canvas'); src.width = src.height = 256;
    const s = src.getContext('2d');
    s.fillStyle = '#cfe6f5'; s.fillRect(0, 0, 256, 256);
    s.fillStyle = '#f2b632'; s.beginPath(); s.arc(180, 70, 34, 0, 7); s.fill();
    s.fillStyle = '#5a9b6b'; s.beginPath(); s.moveTo(0, 190); s.quadraticCurveTo(70, 120, 150, 180); s.quadraticCurveTo(210, 220, 256, 170); s.lineTo(256, 256); s.lineTo(0, 256); s.fill();
    s.fillStyle = '#3d7a50'; s.beginPath(); s.moveTo(0, 230); s.quadraticCurveTo(120, 180, 256, 235); s.lineTo(256, 256); s.lineTo(0, 256); s.fill();
    s.fillStyle = '#7a4a2a'; s.fillRect(60, 140, 8, 40); s.fillStyle = '#2f6b42'; s.beginPath(); s.arc(64, 132, 20, 0, 7); s.fill();
    const caps = { 4: 'Just colored blocks.', 8: 'Still hard to tell what it is.', 16: 'Now you can make out a sun and hills.', 32: 'Clearly a landscape.', 64: 'Smooth edges.', 128: 'Fine detail. A phone photo is about 4000 &times; 3000.' };
    seg.innerHTML = [4, 8, 16, 32, 64, 128].map(k => `<button type="button" aria-pressed="${k === 16}" data-k="${k}">${k}</button>`).join('');
    const draw = k => {
      const small = document.createElement('canvas'); small.width = small.height = k;
      small.getContext('2d').drawImage(src, 0, 0, k, k);
      res.width = res.height = 256; const x = res.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(small, 0, 0, 256, 256);
      if (k <= 16) { // show the grid so each pixel reads as one square
        x.strokeStyle = 'rgba(255,255,255,0.45)'; x.lineWidth = 1; x.beginPath();
        for (let i = 1; i < k; i++) { const p = Math.round(i * 256 / k) + 0.5; x.moveTo(p, 0); x.lineTo(p, 256); x.moveTo(0, p); x.lineTo(256, p); }
        x.stroke();
      }
      px.textContent = (k * k).toLocaleString(); num.textContent = (k * k * 3).toLocaleString();
      $('dl-res-dim').innerHTML = `pixels (${k} &times; ${k})`; cap.innerHTML = caps[k];
    };
    seg.onclick = e => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      seg.querySelectorAll('button').forEach(o => o.setAttribute('aria-pressed', o === b)); draw(+b.dataset.k);
    };
    draw(16);
  }

  /* ── Size bars ── */
  const bars = $('dl-bars');
  if (bars) {
    const items = [['Row of lab results', 100, '100 B'], ['Page of report text', 3e3, '3 KB'], ['10-second ECG', 1.2e5, '120 KB'], ['1 minute of audio', 1e6, '1 MB'], ['Phone photo', 3e6, '3 MB'], ['Chest X-ray', 1e7, '10 MB', 1], ['CT scan', 3e8, '300 MB', 1]];
    const lo = Math.log10(50), hi = Math.log10(3e8);
    bars.innerHTML = items.map((d, i) => `<div class="m1-dl-bar${d[3] ? ' med' : ''}" style="--i:${i}"><span>${d[0]}</span><div class="m1-dl-track"><div class="m1-dl-fill" style="--w:${((Math.log10(d[1]) - lo) / (hi - lo)).toFixed(3)}"></div></div><span class="m1-dl-sz">${d[2]}</span></div>`).join('');
    new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { bars.classList.add('go'); o.disconnect(); } }), { threshold: 0.4 }).observe(bars);
  }

  /* ── Labeling real chest X-rays: classification, detection, segmentation ── */
  const lc = $('lb-cv');
  if (lc) {
    const S = 400, G = 2, N = S / G, ctx = lc.getContext('2d'), hit = document.createElement('canvas').getContext('2d');
    const dpr = Math.min(2, devicePixelRatio || 1); lc.width = lc.height = S * dpr; ctx.scale(dpr, dpr);
    const task = $('lb-task'), acts = $('lb-actions'), fb = $('lb-fb'), facts = $('lb-facts'), tabs = [...document.querySelectorAll('.m1-lb-tab')];
    // The mass is in the patient's left upper lung, which is on the image's right. Outlines traced on the 400 x 400 image.
    const poly = pts => { const p = new Path2D(); pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); return p; };
    const e1 = poly([[278, 75], [300, 64], [330, 65], [350, 75], [348, 95], [335, 115], [334, 145], [343, 165], [340, 188], [328, 200], [305, 203], [285, 195], [274, 170], [273, 130], [273, 95]]);
    const e2 = poly([[274, 73], [300, 59], [333, 61], [356, 74], [354, 98], [341, 118], [340, 145], [349, 168], [345, 193], [330, 210], [303, 215], [283, 205], [271, 175], [269, 130], [270, 93]]);
    const mask = c => { const m = new Uint8Array(N * N); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) m[j * N + i] = hit.isPointInPath(c, i * G + 1, j * G + 1) ? 1 : 0; return m; };
    const truth = mask(e1), truth2 = mask(e2);
    const tb = (() => { let a = N, b = N, c = 0, d = 0; truth.forEach((v, k) => { if (v) { const i = k % N, j = (k / N) | 0; a = Math.min(a, i); b = Math.min(b, j); c = Math.max(c, i); d = Math.max(d, j); } }); return [a * G, b * G, (c + 1) * G, (d + 1) * G]; })();
    const dice = (a, b) => { let i = 0, sa = 0, sb = 0; for (let k = 0; k < a.length; k++) { sa += a[k]; sb += b[k]; i += a[k] & b[k]; } return sa + sb ? 2 * i / (sa + sb) : 0; };
    const img = src => { const im = new Image(); im.onload = () => render(); im.src = src; return im; };
    const imgs = { mass: img('images/m1/lb-mass.jpg'), normal: img('images/m1/lb-normal.jpg') };

    function film(mass) {
      const im = mass ? imgs.mass : imgs.normal;
      ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, S, S);
      if (im.complete && im.naturalWidth) ctx.drawImage(im, 0, 0, S, S);
      ctx.font = '600 14px IBM Plex Sans, sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText('R', 16, 28);
      ctx.fillStyle = '#fff'; ctx.fillText('R', 16, 28);
    }

    let mode = 'cls', f = 0, box = null, drag = null, paint = new Uint8Array(N * N), showE = false, showE2 = false;
    const films = [{ mass: true, name: 'Film 1' }, { mass: false, name: 'Film 2' }], answers = [null, null];
    function render() {
      film(mode === 'cls' ? films[f].mass : true);
      if (mode === 'det') {
        if (showE) { ctx.strokeStyle = '#f2b632'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(tb[0], tb[1], tb[2] - tb[0], tb[3] - tb[1]); ctx.setLineDash([]); }
        const b = drag || box;
        if (b) { ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2.5; ctx.strokeRect(Math.min(b[0], b[2]), Math.min(b[1], b[3]), Math.abs(b[2] - b[0]), Math.abs(b[3] - b[1])); }
      }
      if (mode === 'seg') {
        if (showE) { ctx.fillStyle = 'rgba(242,182,50,0.22)'; ctx.fill(e1); ctx.strokeStyle = '#f2b632'; ctx.lineWidth = 2; ctx.stroke(e1); }
        if (showE2) { ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.stroke(e2); ctx.setLineDash([]); }
        ctx.fillStyle = 'rgba(56,189,248,0.45)';
        for (let k = 0; k < paint.length; k++) if (paint[k]) ctx.fillRect((k % N) * G, ((k / N) | 0) * G, G, G);
      }
    }
    const pos = e => { const r = lc.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * S, (e.clientY - r.top) / r.height * S]; };
    function brush([x, y]) {
      const ci = x / G, cj = y / G, R = 7;
      for (let j = Math.max(0, cj - R | 0); j <= Math.min(N - 1, cj + R); j++) for (let i = Math.max(0, ci - R | 0); i <= Math.min(N - 1, ci + R); i++) if ((i - ci) ** 2 + (j - cj) ** 2 <= R * R) paint[j * N + i] = 1;
    }
    lc.addEventListener('pointerdown', e => {
      if (mode === 'cls') return;
      lc.setPointerCapture(e.pointerId); const p = pos(e);
      if (mode === 'det') { drag = [...p, ...p]; showE = false; } else brush(p);
      render();
    });
    lc.addEventListener('pointermove', e => {
      if (!lc.hasPointerCapture(e.pointerId)) return;
      const p = pos(e);
      if (mode === 'det' && drag) { drag[2] = p[0]; drag[3] = p[1]; } else if (mode === 'seg') brush(p);
      render();
    });
    lc.addEventListener('pointerup', () => {
      if (mode !== 'det' || !drag) return;
      const b = [Math.min(drag[0], drag[2]), Math.min(drag[1], drag[3]), Math.max(drag[0], drag[2]), Math.max(drag[1], drag[3])]; drag = null;
      if (b[2] - b[0] < 6 || b[3] - b[1] < 6) { render(); return; }
      box = b; showE = true;
      const ix = Math.max(0, Math.min(b[2], tb[2]) - Math.max(b[0], tb[0])) * Math.max(0, Math.min(b[3], tb[3]) - Math.max(b[1], tb[1]));
      const iou = ix / ((b[2] - b[0]) * (b[3] - b[1]) + (tb[2] - tb[0]) * (tb[3] - tb[1]) - ix);
      fb.innerHTML = `Your box (blue) overlaps the expert's (gold) by <b>${Math.round(iou * 100)}%</b>. ` + (iou >= 0.5 ? 'Most detection tools would count that as a hit, which is usually 50% or more.' : 'Most detection tools only count a box as a hit at 50% or more. Try again: hug the edges of the white patch in the upper part of the image\'s right lung.');
      render();
    });

    const M = {
      cls: {
        task: 'Look at each film and decide: does it show a lung mass? Healthy lung is full of air, so it looks dark. A mass is solid, so it shows up as a large white patch where the lung should be dark.',
        facts: [['The label', 'One answer for the whole image'], ['Expert time', 'A few seconds'], ['The model learns', 'Is the finding there?'], ['Example', 'Flagging chest X-rays that may show a lung cancer']],
        acts: () => `<div class="m1-dl-seg" id="lb-films">${films.map((x, i) => `<button type="button" aria-pressed="${i === f}" data-f="${i}">${x.name}</button>`).join('')}</div><div class="m1-lb-row"><button type="button" class="m1-dl-small" data-a="1">Lung mass</button><button type="button" class="m1-dl-small" data-a="0">No mass</button></div>`
      },
      det: {
        task: 'Drag on the image to draw a box around the mass: the large white patch in the upper part of the lung on the image\'s right side (the patient\'s left).',
        facts: [['The label', 'A box around each finding'], ['Expert time', 'About 10 to 30 seconds'], ['The model learns', 'Is it there, and roughly where?'], ['Example', 'Boxes around lung nodules on CT']],
        acts: () => '<div class="m1-lb-row"><button type="button" class="m1-dl-small" data-x="clear">Clear</button></div>'
      },
      seg: {
        task: 'Paint over the mass with your finger or mouse: every pixel of the white patch, and as little normal dark lung as you can. Then check it against the expert.',
        facts: [['The label', 'Every pixel of the finding'], ['Expert time', 'Minutes per image'], ['The model learns', 'Exactly where, and how big'], ['Example', 'Measuring whether a tumor is shrinking with treatment']],
        acts: () => '<div class="m1-lb-row"><button type="button" class="m1-btn" data-x="check">Check my painting</button><button type="button" class="m1-dl-small" data-x="e2">Show a second expert</button><button type="button" class="m1-dl-small" data-x="clear">Clear</button></div>'
      }
    };
    function setMode(m) {
      mode = m; box = drag = null; showE = showE2 = false; paint.fill(0);
      task.textContent = M[m].task; acts.innerHTML = M[m].acts(); fb.innerHTML = '';
      facts.innerHTML = M[m].facts.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
      lc.style.cursor = m === 'cls' ? 'default' : 'crosshair';
      lc.setAttribute('aria-label', 'Frontal chest X-ray' + (m === 'cls' && !films[f].mass ? ' with normal lungs.' : ' with a large white mass in the upper part of the lung on the image\'s right side.'));
      render();
    }
    acts.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.f) {
        f = +b.dataset.f; setMode('cls'); fb.innerHTML = answers[f] || ''; return;
      }
      if (b.dataset.a) {
        const ok = (b.dataset.a === '1') === films[f].mass;
        answers[f] = (ok ? '<b>Right.</b> ' : '<b>Not quite.</b> ') + (films[f].mass ? films[f].name + ' shows a lung mass: the large white patch in the upper part of the image\'s right lung, where that lung should be dark like the other one.' : films[f].name + ' is normal: both lungs are dark, with thin white lines (blood vessels) and no large white patch.') + (f === 0 ? ' Now try Film 2.' : '');
        fb.innerHTML = answers[f]; return;
      }
      if (b.dataset.x === 'clear') { setMode(mode); return; }
      if (b.dataset.x === 'check') {
        showE = true; const d = dice(paint, truth);
        fb.innerHTML = `Your painting (blue) matches the expert's outline (gold) by <b>${Math.round(d * 100)}%</b>. ` + (d >= 0.7 ? 'That is a good match.' : d === 0 ? 'Paint the white patch first, then check.' : 'Try covering more of the white patch, and less of the dark lung around it.');
      }
      if (b.dataset.x === 'e2') {
        showE = showE2 = true;
        fb.innerHTML = `A second expert drew the edge of the mass a little further out (purple dashes). The two experts agree on <b>${Math.round(dice(truth, truth2) * 100)}%</b> of the area. Even experts give slightly different answers, and a model learns whichever one it is given.`;
      }
      render();
    });
    tabs.forEach(t => t.onclick = () => { tabs.forEach(o => o.setAttribute('aria-selected', o === t)); setMode(t.dataset.m); });
    setMode('cls');
  }
})();
