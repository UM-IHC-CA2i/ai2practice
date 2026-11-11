// Vision lab for Lesson 1.1: five real image models (Google MediaPipe Tasks) run in the browser.
// Markup: <div class="m1-lab" data-img="images/m1/lab/"> with .m1-lab-tab buttons (data-m), a canvas stage,
// #lab-thumbs, #lab-upload and the info panel. Each model downloads the first time its tab is used;
// photos never leave the device. Loaded as <script type="module">.
const V = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const M = 'https://storage.googleapis.com/mediapipe-models';
const MODELS = {
  classify: '/image_classifier/efficientnet_lite0/int8/1/efficientnet_lite0.tflite',
  detect: '/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',
  hand: '/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  face: '/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  segment: '/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
};
const MODES = {
  classify: { title: 'Name it', samples: ['dog', 'banana', 'xray'],
    text: 'This model learned from about a million labeled photos sorted into 1,000 everyday categories, like "Labrador retriever," "banana" or "laptop." It names the main thing in the picture. Try the chest X-ray: X-rays are not one of its 1,000 categories.' },
  detect: { title: 'Find objects', samples: ['desk', 'headphones', 'dogroom'],
    text: 'Instead of one name for the whole picture, this model draws a box around each thing it recognizes, from 80 common categories like person, cup, laptop and dog. This is called object detection. Look at what it misses: there is food on the desk.' },
  hand: { title: 'Hand points', samples: ['hand', 'peace', 'thumbsup'],
    text: 'This model finds 21 points on each hand: the wrist and every knuckle and fingertip. It learned them from tens of thousands of hand photos that people marked up point by point. Gesture controls and sign-language apps build on models like this.' },
  face: { title: 'Face points', samples: ['headphones', 'selfie', 'desk'],
    text: 'This model places 478 points on each face, enough to outline the eyes, lips and jaw. Phone camera filters use the same kind of model. Try the group photo: how many faces does it find?' },
  segment: { title: 'Cut out', samples: ['selfie', 'man', 'desk'],
    text: 'Segmentation means labeling every single pixel. This model sorts each pixel into hair, face, skin, clothes or background. Video calls use the same idea to blur your background. Look closely at the desk photo: what did it decide the laptop keyboard was?' },
};
const SRC = { dog: 'dog.jpg', banana: 'banana.jpg', xray: 'xray.jpg', desk: 'desk.jpg', headphones: 'headphones.jpg', dogroom: 'dogroom.jpg',
  hand: 'hand.jpg', peace: 'peace.jpg', thumbsup: 'thumbsup.jpg', selfie: 'selfie.jpg', man: 'man.jpg' };
const LABEL = { dog: 'Dog', banana: 'Banana', xray: 'Chest X-ray', desk: 'Woman at a desk', headphones: 'Man on a street', dogroom: 'Woman holding a dog',
  hand: 'Open hand', peace: 'Peace sign', thumbsup: 'Thumbs up', selfie: 'Three friends taking a selfie', man: 'Man by the water' };
const SEG = [['Background', null], ['Hair', [124, 58, 237]], ['Body skin', [234, 179, 8]], ['Face skin', [249, 115, 22]], ['Clothes', [3, 105, 161]], ['Other', [22, 163, 74]]];
const lab = document.querySelector('.m1-lab');
const img = s => lab.dataset.img + SRC[s];

const $ = id => document.getElementById(id);
const cv = $('lab-cv'), ctx = cv.getContext('2d'), hint = $('lab-hint'), status = $('lab-status'), out = $('lab-out');
const loading = $('lab-loading'), lTitle = $('lab-ltitle'), lBar = $('lab-lbar'), lText = $('lab-ltext');
let lib = null, files = null, mode = 'classify', job = 0;
const tasks = {};

function showLoading(title, text, pct) {
  loading.hidden = false; lTitle.textContent = title; lText.textContent = text;
  lBar.parentElement.style.visibility = pct == null ? 'hidden' : 'visible'; if (pct != null) lBar.style.width = pct + '%';
}
async function download(url) {  // fetch the model ourselves so we can show real progress
  const r = await fetch(url); if (!r.ok) throw new Error('model ' + r.status);
  const total = +r.headers.get('content-length') || 0, reader = r.body.getReader(), parts = []; let got = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); got += value.length;
    const mb = (got / 1e6).toFixed(1);
    showLoading('Loading the AI model', total ? `${mb} of ${(total / 1e6).toFixed(1)} MB. First time only.` : `${mb} MB. First time only.`, total ? Math.round(got / total * 100) : null); }
  const buf = new Uint8Array(got); let o = 0; parts.forEach(p => { buf.set(p, o); o += p.length; }); return buf;
}
async function getTask(m) {
  if (tasks[m]) return tasks[m];
  if (!lib) { showLoading('Starting the AI engine', 'First time only. This can take a few seconds.', null);
    lib = await import(V + '/vision_bundle.mjs'); files = await lib.FilesetResolver.forVisionTasks(V + '/wasm'); }
  const buf = await download(M + MODELS[m]);
  showLoading('Getting the model ready', 'Almost there.', 100);
  const { ImageClassifier, ObjectDetector, HandLandmarker, FaceLandmarker, ImageSegmenter } = lib;
  const make = delegate => {
    const base = { baseOptions: { modelAssetBuffer: buf, delegate }, runningMode: 'IMAGE' };
    if (m === 'classify') return ImageClassifier.createFromOptions(files, { ...base, maxResults: 3 });
    if (m === 'detect') return ObjectDetector.createFromOptions(files, { ...base, scoreThreshold: 0.35, maxResults: 10 });
    if (m === 'hand') return HandLandmarker.createFromOptions(files, { ...base, numHands: 2 });
    if (m === 'face') return FaceLandmarker.createFromOptions(files, { ...base, numFaces: 4 });
    return ImageSegmenter.createFromOptions(files, { ...base, outputCategoryMask: true, outputConfidenceMasks: false });
  };
  // the small int8 classifier only runs on the CPU delegate
  if (m === 'classify') tasks[m] = await make('CPU');
  else try { tasks[m] = await make('GPU'); } catch (e) { tasks[m] = await make('CPU'); }
  return tasks[m];
}

const lw = () => Math.max(2, cv.width / 300);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
function run(task, src) {
  const D = new lib.DrawingUtils(ctx);
  if (mode === 'classify') {
    const c = task.classify(src).classifications[0].categories;
    status.textContent = 'Top 3 guesses:';
    out.innerHTML = c.map(o => `<div class="m1-guess"><div class="m1-guess-top"><span>${o.displayName || o.categoryName}</span><span>${Math.round(o.score * 100)}%</span></div><div class="m1-bar"><i data-w="${(o.score * 100).toFixed(1)}"></i></div></div>`).join('');
    requestAnimationFrame(() => out.querySelectorAll('i').forEach(i => i.style.width = i.dataset.w + '%'));
  } else if (mode === 'detect') {
    const d = task.detect(src).detections;
    ctx.font = `600 ${Math.round(lw() * 7)}px IBM Plex Sans, sans-serif`; ctx.lineWidth = lw();
    d.forEach(x => { const b = x.boundingBox, c = x.categories[0], label = `${c.categoryName} ${Math.round(c.score * 100)}%`;
      ctx.strokeStyle = '#38bdf8'; ctx.strokeRect(b.originX, b.originY, b.width, b.height);
      const tw = ctx.measureText(label).width + lw() * 4, th = lw() * 10, y = Math.max(0, b.originY - th);
      ctx.fillStyle = '#17324d'; ctx.fillRect(b.originX, y, tw, th);
      ctx.fillStyle = '#fff'; ctx.fillText(label, b.originX + lw() * 2, y + th * 0.75); });
    status.textContent = d.length ? `Found ${plural(d.length, 'object')}:` : 'No objects found. Try a busier picture.';
    out.innerHTML = d.length ? `<p>${d.map(x => x.categories[0].categoryName).join(', ')}</p>` : '';
  } else if (mode === 'hand') {
    const r = task.detect(src);
    r.landmarks.forEach(l => { D.drawConnectors(l, lib.HandLandmarker.HAND_CONNECTIONS, { color: '#38bdf8', lineWidth: lw() * 1.5 });
      D.drawLandmarks(l, { color: '#fff', fillColor: '#0369a1', radius: lw() * 1.6, lineWidth: lw() / 2 }); });
    status.textContent = r.landmarks.length ? `Found ${plural(r.landmarks.length, 'hand')}, ${r.landmarks.length * 21} points.` : 'No hand found. Try a photo with one clear hand, fingers visible.';
  } else if (mode === 'face') {
    const r = task.detect(src), F = lib.FaceLandmarker;
    r.faceLandmarks.forEach(l => { D.drawConnectors(l, F.FACE_LANDMARKS_TESSELATION, { color: 'rgba(255,255,255,0.5)', lineWidth: Math.max(1, lw() / 2) });
      D.drawConnectors(l, F.FACE_LANDMARKS_LIPS, { color: '#f472b6', lineWidth: lw() });
      D.drawConnectors(l, F.FACE_LANDMARKS_LEFT_EYE, { color: '#38bdf8', lineWidth: lw() });
      D.drawConnectors(l, F.FACE_LANDMARKS_RIGHT_EYE, { color: '#38bdf8', lineWidth: lw() }); });
    status.textContent = r.faceLandmarks.length ? `Found ${plural(r.faceLandmarks.length, 'face')}, ${r.faceLandmarks.length * 478} points.` : 'No face found. Try a photo with a clear, front-facing face.';
  } else {
    task.segment(src, res => {
      const m = res.categoryMask, a = m.getAsUint8Array(), w = m.width, h = m.height;
      const off = new OffscreenCanvas(w, h), oc = off.getContext('2d'), id = oc.createImageData(w, h);
      for (let i = 0; i < a.length; i++) { const col = SEG[a[i]] && SEG[a[i]][1]; if (col) { id.data.set(col, i * 4); id.data[i * 4 + 3] = 150; } }
      oc.putImageData(id, 0, 0); ctx.drawImage(off, 0, 0, cv.width, cv.height);
    });
    status.textContent = 'Every pixel colored by what the model thinks it is:';
    out.innerHTML = `<ul class="m1-legend">${SEG.slice(1).map(([n, c]) => `<li><i style="background:rgb(${c})"></i>${n}</li>`).join('')}</ul>`;
  }
}

async function show(url) {
  const my = ++job; hint.hidden = true; out.innerHTML = ''; status.textContent = '';
  const im = new Image(); im.src = url;
  try {
    await im.decode(); if (my !== job) return;
    cv.width = im.naturalWidth; cv.height = im.naturalHeight; ctx.drawImage(im, 0, 0);
    const task = await getTask(mode); if (my !== job) return;
    loading.hidden = true; ctx.drawImage(im, 0, 0); run(task, im);
  } catch (e) { loading.hidden = true; status.textContent = 'Could not load the model or picture. Check your connection and try again.'; console.error(e); }
}
$('lab-upload').onchange = e => { const f = e.target.files[0]; if (f) { setThumbs(null); show(URL.createObjectURL(f)); } };

function setThumbs(active) { lab.querySelectorAll('.m1-thumb').forEach(b => b.setAttribute('aria-pressed', b.dataset.s === active)); }
function setMode(m) {
  mode = m; const cfg = MODES[m];
  lab.querySelectorAll('.m1-lab-tab').forEach(t => t.setAttribute('aria-selected', t.dataset.m === m));
  $('lab-title').textContent = cfg.title; $('lab-text').textContent = cfg.text;
  $('lab-thumbs').innerHTML = cfg.samples.map(s => `<button class="m1-thumb" data-s="${s}" aria-label="Sample: ${LABEL[s]}" title="${LABEL[s]}"><img src="${img(s)}" alt=""></button>`).join('');
  lab.querySelectorAll('.m1-thumb').forEach(b => b.onclick = () => { setThumbs(b.dataset.s); show(img(b.dataset.s)); });
  setThumbs(cfg.samples[0]); show(img(cfg.samples[0]));
}
lab.querySelectorAll('.m1-lab-tab').forEach(t => t.onclick = () => setMode(t.dataset.m));
// start the first model only when the lab scrolls into view
new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); setMode('classify'); } }, { rootMargin: '200px' }).observe(lab);
$('lab-title').textContent = MODES.classify.title; $('lab-text').textContent = MODES.classify.text;
