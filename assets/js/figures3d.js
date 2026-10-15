/* AI2Practice 3D figures (Clay style). Any element with data-scene="cnn|ct|second|hospital" gets a live figure.
   One WebGL renderer draws every figure and copies it into each element's own 2D canvas.
   window.AI2Figures3D.mount(el) / unmount(el) handle figures added or removed after load. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const V3 = THREE.Vector3;

let renderer;
try{
  renderer = new THREE.WebGLRenderer({antialias:true, alpha:true, preserveDrawingBuffer:true});
}catch(e){
  document.documentElement.classList.add('no-webgl');
  throw e;
}
renderer.setPixelRatio(1);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
let RW = 0, RH = 0;
function ensure(w,h){ if(w>RW || h>RH){ RW=Math.max(w,RW); RH=Math.max(h,RH); renderer.setSize(RW,RH,false); } }

const pmrem = new THREE.PMREMGenerator(renderer);
const ENV = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const TOON = null;  // only the Flat iso style in the mockups uses a toon ramp

/* ---------- Palette: one module colour, the rest from the site's navy and paper ---------- */
const HEX = {m1:'#6aaee8', m2:'#3b82d0', m3:'#2557a5', lead:'#5d55b4', res:'#1f8a9e'};
const WHITE = new THREE.Color('#ffffff'), DEEP = new THREE.Color('#0c1c33');
function pal(k){
  const a = new THREE.Color(HEX[k]);
  return {
    acc:a, accL:a.clone().lerp(WHITE,.5), accXL:a.clone().lerp(WHITE,.78), accD:a.clone().lerp(DEEP,.4),
    pulse:a.clone().lerp(WHITE,.35),
    white:new THREE.Color('#f7f9fc'), white2:new THREE.Color('#e9eef5'), paper:new THREE.Color('#dfe7f1'),
    line:new THREE.Color('#c9d5e3'), dark:new THREE.Color('#1b2f4f'), screen:new THREE.Color('#0b1626'),
    manikin:new THREE.Color('#d6dfeb'), wall:a.clone().lerp(DEEP,.55)
  };
}


/* ---------- Textures: the CC0 chest film, an AI overlay and a worklist ---------- */
const loader = new THREE.TextureLoader();
const CXR = loader.load(new URL('../../images/figures/cxr-pa.jpg', import.meta.url).href, ()=>redrawAll());
CXR.colorSpace = THREE.SRGBColorSpace; CXR.anisotropy = 4;
const FILM_AR = 1280/1464;

function canvasTex(w,h,draw){
  const c = document.createElement('canvas'); c.width=w; c.height=h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function rrect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.roundRect(x,y,w,h,r); }
const AIOVER = canvasTex(512, Math.round(512/FILM_AR), (x,w,h)=>{
  const cx=w*.3, cy=h*.6, g=x.createRadialGradient(cx,cy,4,cx,cy,w*.2);
  g.addColorStop(0,'rgba(255,196,92,.75)'); g.addColorStop(.5,'rgba(255,150,70,.35)'); g.addColorStop(1,'rgba(255,120,60,0)');
  x.fillStyle=g; x.fillRect(0,0,w,h);
  x.lineWidth=7; x.strokeStyle='#ffd27a'; rrect(x,cx-w*.15,cy-h*.12,w*.3,h*.24,12); x.stroke();
  x.fillStyle='#ffd27a'; rrect(x,cx-w*.15,cy-h*.12-46,108,40,8); x.fill();
  x.fillStyle='#1b1300'; x.font='600 26px "IBM Plex Sans",sans-serif'; x.fillText('AI 0.87',cx-w*.15+10,cy-h*.12-17);
});

function tagTex(text, bg, fg, outline){
  return canvasTex(400, 120, (x,w,h)=>{
    x.fillStyle = bg; rrect(x,4,4,w-8,h-8,40); x.fill();
    if(outline){ x.lineWidth = 5; x.strokeStyle = '#c9d5e3'; x.stroke(); }
    let fs = 52; do { x.font = '600 '+fs+'px "IBM Plex Sans",sans-serif'; } while(x.measureText(text).width > w-56 && --fs > 20);
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w/2, h/2+3);
  });
}
function suggestTex(P){
  const acc = '#'+P.acc.getHexString();
  return canvasTex(512, 420, (x,w,h)=>{
    x.fillStyle = '#ffffff'; x.fillRect(0,0,w,h);
    x.fillStyle = '#5d6572'; x.font = '500 28px "IBM Plex Sans",sans-serif'; x.fillText('AI suggestion', 32, 58);
    x.fillStyle = '#13294a'; x.font = '600 44px "IBM Plex Serif",serif'; x.fillText('Possible pneumonia', 32, 122);
    x.fillStyle = '#3a4250'; x.font = '400 30px "IBM Plex Sans",sans-serif'; x.fillText('Right lower zone', 32, 170);
    x.fillStyle = '#5d6572'; x.font = '500 26px "IBM Plex Sans",sans-serif'; x.fillText('Confidence', 32, 238); x.fillText('0.87', w-92, 238);
    x.fillStyle = '#e1e8f0'; rrect(x,32,256,w-64,16,8); x.fill();
    x.fillStyle = acc; rrect(x,32,256,(w-64)*.87,16,8); x.fill();
    x.lineWidth = 4; x.strokeStyle = '#c9d5e3'; rrect(x,32,330,200,64,14); x.stroke();
    x.fillStyle = '#13294a'; x.font = '600 28px "IBM Plex Sans",sans-serif'; x.textAlign = 'center'; x.fillText('Accept', 132, 372);
    x.fillStyle = acc; rrect(x,256,330,224,64,14); x.fill();
    x.fillStyle = '#ffffff'; x.fillText('Check image', 368, 372);
  });
}


/* ---------- Kit: the same calls build Clay (rounded, lit, shadowed) or Flat iso (sharp, toon, outlined) ---------- */
function kit(style){
  const clay = style==='clay', cache = new Map(), lines = new Map();
  function M(color, o={}){
    const c = color instanceof THREE.Color ? color : new THREE.Color(color);
    const key = [c.getHexString(), o.basic?1:0, o.side||0, o.transparent?1:0, o.opacity??1, o.rough??'', o.emissive??''].join('|');
    if(!o.unique && cache.has(key)) return cache.get(key);
    const common = {color:c.clone(), side:o.side ?? THREE.FrontSide, transparent:!!o.transparent, opacity:o.opacity ?? 1};
    let m;
    if(o.basic) m = new THREE.MeshBasicMaterial({...common, map:o.map || null, depthWrite:o.depthWrite ?? true});
    else if(clay) m = new THREE.MeshStandardMaterial({...common, roughness:o.rough ?? .72, metalness:0, emissive:new THREE.Color(o.emissive ?? 0), emissiveIntensity:o.ei ?? 1});
    else m = new THREE.MeshToonMaterial({...common, gradientMap:TOON, emissive:new THREE.Color(o.emissive ?? 0), emissiveIntensity:o.ei ?? 1});
    if(!o.unique) cache.set(key, m);
    return m;
  }
  function lineMat(c, k=.62){
    const key = c.getHexString()+k;
    if(!lines.has(key)) lines.set(key, new THREE.LineBasicMaterial({color:c.clone().lerp(DEEP,k)}));
    return lines.get(key);
  }
  function mesh(geo, color, o={}){
    const mat = o.mat || M(color, o);
    const m = new THREE.Mesh(geo, mat);
    if(clay){ m.castShadow = o.cast ?? true; m.receiveShadow = !o.basic; }
    else if(!o.noEdge && !o.basic) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, o.edgeAngle ?? 30), lineMat(mat.color)));
    return m;
  }
  return {
    clay, M, mesh,
    box(w,h,d,c,o={}){
      const r = Math.min(o.r ?? .05, Math.min(w,h,d)*.45);
      const g = clay && r>.004 ? new RoundedBoxGeometry(w,h,d,o.seg ?? 3,r) : new THREE.BoxGeometry(w,h,d);
      return mesh(g,c,o);
    },
    cyl(rt,rb,h,c,o={}){ return mesh(new THREE.CylinderGeometry(rt,rb,h,o.seg ?? (clay?40:20),1,!!o.open), c, o); },
    sphere(r,c,o={}){ return mesh(new THREE.SphereGeometry(r, clay?32:14, clay?20:10), c, {...o, noEdge:true}); },
    torus(r,t,c,o={}){ return mesh(new THREE.TorusGeometry(r,t,clay?14:8,clay?72:36), c, {...o, noEdge:true}); },
    capsule(r,l,c,o={}){ return mesh(new THREE.CapsuleGeometry(r,l,clay?8:3,clay?24:10), c, {...o, noEdge:true}); },
    plane(w,h,o={}){
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w,h), o.mat || M(o.color ?? 0xffffff, {basic:true, map:o.map, unique:true, transparent:o.transparent, depthWrite:o.depthWrite}));
      return m;
    },
    rod(a,b,r,c){
      if(!clay) return new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]), lineMat(c instanceof THREE.Color?c:new THREE.Color(c), .15));
      const d = b.clone().sub(a), L = d.length();
      const m = mesh(new THREE.CylinderGeometry(r,r,L,8,1,true), c, {cast:false});
      m.position.copy(a).addScaledVector(d,.5);
      m.quaternion.setFromUnitVectors(new V3(0,1,0), d.normalize());
      return m;
    },
    extrude(shape, depth, c, o={}){
      const g = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled:clay && (o.bevel ?? true), bevelThickness:o.bt ?? .05, bevelSize:o.bs ?? .05, bevelSegments:4, curveSegments:o.cs ?? 48});
      g.center();
      return mesh(g, c, o);
    }
  };
}
function put(parent, o, x=0, y=0, z=0){ o.position.set(x,y,z); parent.add(o); return o; }
function rrShape(w,h,r){
  const s = new THREE.Shape(), x=-w/2, y=-h/2;
  s.moveTo(x+r,y); s.lineTo(x+w-r,y); s.quadraticCurveTo(x+w,y,x+w,y+r); s.lineTo(x+w,y+h-r); s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h); s.quadraticCurveTo(x,y+h,x,y+h-r); s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y);
  return s;
}
const ease = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
const clamp01 = t => Math.max(0, Math.min(1, t));
const bump = (p,c,w) => Math.max(0, 1-Math.abs(p-c)/w);


/* ---------- The scenes ---------- */
const SCENES = {
  /* Module 1, option A: a flat CNN diagram. A small window slides over the film and each patch becomes one cell of the next map */
  cnn:{c:'m1', still:4.9, view:{clay:[-50,12], iso:[-45,18]}, build(K,P){
    const g = new THREE.Group(), Y = .8, R = -Math.PI/2;
    const fmap = (n, seed) => {
      let s = seed; const rnd = () => (s = (s*16807) % 2147483647) / 2147483647;
      const t = canvasTex(n, n, x => { for(let i=0;i<n;i++) for(let j=0;j<n;j++){ const v = rnd(); x.fillStyle = '#'+P.accD.clone().lerp(P.accXL, v*v).getHexString(); x.fillRect(i,j,1,1); } });
      t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t;
    };
    const fh = 1.3, fw = fh*FILM_AR, FX = -2.9;
    put(g, K.box(.05, fh+.1, fw+.1, P.white, {r:.02, cast:false}), FX+.03, Y, 0);
    put(g, K.plane(fw, fh, {map:CXR}), FX, Y, 0).rotation.y = R;
    const layers = [{x:-1.55,n:4,s:1.0,gap:.12,cells:14},{x:-.25,n:6,s:.7,gap:.09,cells:9},{x:.75,n:8,s:.45,gap:.06,cells:5}];
    layers.forEach((L,li)=>{ for(let i=0;i<L.n;i++){
      const x = L.x + i*L.gap;
      put(g, K.box(.025, L.s, L.s, P.white, {r:.008}), x, Y, 0);
      put(g, K.plane(L.s*.9, L.s*.9, {map:fmap(L.cells, 7+li*31+i*5)}), x-.014, Y, 0).rotation.y = R;
    }});
    // the sliding window and the lines from its corners to the cell it makes
    const warm = new THREE.Color('#ffd27a');
    const lm = new THREE.LineBasicMaterial({color:warm});
    const seg = () => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(8*3),3)); return put(g, new THREE.LineSegments(geo, lm)); };
    const loop = h => put(g, new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new V3(0,-h,-h),new V3(0,h,-h),new V3(0,h,h),new V3(0,-h,h)]), lm));
    const dotM = K.M(warm, {basic:true, unique:true});
    const dot = s => { const m = put(g, K.plane(s, s, {mat:dotM})); m.rotation.y = R; return m; };
    const k1 = .15, win1 = loop(k1), l1 = seg(), d1 = dot(.08);
    const l2 = seg(), d2 = dot(.07);
    // dense layer and the two answers
    const lastX = layers[2].x + 7*layers[2].gap + .014;
    const dense = Array.from({length:6}, (_,k)=>new V3(1.65, Y+(k-2.5)*.19, 0));
    const outs = [new V3(2.2, Y+.24, 0), new V3(2.2, Y-.24, 0)];
    dense.forEach(d=>{ g.add(K.rod(new V3(lastX,Y,0), d, .006, P.accL)); outs.forEach(o=>g.add(K.rod(d, o, .006, P.accL))); put(g, K.sphere(.05, P.white), d.x, d.y, d.z); });
    const outMats = outs.map(()=>K.M(P.acc, {unique:true, emissive:P.accL, ei:0}));
    outs.forEach((o,i)=>put(g, K.sphere(.075, P.acc, {mat:outMats[i]}), o.x, o.y, o.z));
    const tagMats = [tagTex('Normal', '#ffffff', '#13294a', true), tagTex('Pneumonia', '#'+P.acc.getHexString(), '#ffffff')].map(map=>K.M(0xffffff, {basic:true, map, unique:true, transparent:true}));
    outs.forEach((o,i)=>{ const m = put(g, K.plane(.8, .24, {mat:tagMats[i]}), o.x+.05, o.y, o.z+.55); m.rotation.y = R; });
    const setSeg = (l, pts) => { const a = l.geometry.attributes.position; pts.forEach((p,i)=>a.setXYZ(i,p.x,p.y,p.z)); a.needsUpdate = true; l.geometry.computeBoundingSphere(); };
    const corners = (x, y, z, h, to) => [new V3(x,y-h,z-h),to, new V3(x,y+h,z-h),to, new V3(x,y+h,z+h),to, new V3(x,y-h,z+h),to];
    return {g, update(t){
      const T = t % 6, p = clamp01(T/4.2), row = Math.min(3, Math.floor(p*4)), u = (p*4) % 1, v = row/3;
      const fy = Y + (.5-v)*(fh-2*k1-.1), fz = (u-.5)*(fw-2*k1-.1);
      win1.position.set(FX-.006, fy, fz);
      const L0 = layers[0], L1 = layers[1];
      const t1 = new V3(L0.x-.017, Y+(.5-v)*L0.s*.75, (u-.5)*L0.s*.75);
      d1.position.copy(t1); setSeg(l1, corners(FX-.006, fy, fz, k1, t1));
      const bx = L0.x + (L0.n-1)*L0.gap + .015, by = Y+(.5-v)*L0.s*.6, bz = (u-.5)*L0.s*.6;
      const t2 = new V3(L1.x-.017, Y+(.5-v)*L1.s*.7, (u-.5)*L1.s*.7);
      d2.position.copy(t2); setSeg(l2, corners(bx, by, bz, .12, t2));
      const show = T < 5.4 ? 1 : 1 - clamp01((T-5.4)/.4);
      [win1,l1,d1,l2,d2].forEach(o=>o.visible = show > .02);
      const lit = clamp01((T-4.3)/.5) * (T > 5.5 ? 1-clamp01((T-5.5)/.4) : 1);
      outMats[1].emissiveIntensity = lit*1.2; outMats[0].emissiveIntensity = 0;
      tagMats[1].opacity = .55 + .45*lit; tagMats[0].opacity = .55;
    }};
  }},

  /* Module 2: CT scanner, table slides in and out */
  ct:{c:'m2', build(K,P){
    const g = new THREE.Group();
    put(g, K.box(3.2,.16,4.3,P.paper,{r:.08}), 0,-.08,.95);
    const sh = rrShape(2.4,2.5,.55), hole = new THREE.Path(); hole.absarc(0,.05,.62,0,Math.PI*2,true); sh.holes.push(hole);
    put(g, K.extrude(sh,.75,P.white,{bs:.06,bt:.06}), 0,1.33,0);
    const BY = 1.38;
    const bore = put(g, K.cyl(.625,.625,.8,P.line,{open:true, side:THREE.BackSide, noEdge:true, cast:false}), 0,BY,0); bore.rotation.x = Math.PI/2;
    put(g, K.torus(.69,.045,P.acc), 0,BY,.44);
    const ringMat = K.M(P.accL, {basic:true, unique:true});
    put(g, K.torus(.6,.022,P.accL,{mat:ringMat}), 0,BY,-.1);
    put(g, K.box(.03,1.5,.26,P.acc,{r:.01}), 1.275,1.33,0);
    put(g, K.box(.5,.26,.04,P.screen,{r:.02}), .72,2.2,.44);
    const scr = put(g, K.plane(.4,.05,{color:P.accL}), .72,2.2,.462);
    put(g, K.box(.5,.85,1.2,P.white,{r:.05}), 0,.425,1.75);
    const slider = put(g, new THREE.Group(), 0,.89,1.75);
    put(slider, K.box(.66,.08,2.3,P.white2,{r:.035}));
    put(slider, K.box(.56,.06,2.1,P.accXL,{r:.03}), 0,.07,0);
    const body = put(slider, K.capsule(.16,.9,P.manikin), 0,.26,.18); body.rotation.x = Math.PI/2;
    put(slider, K.sphere(.135,P.manikin), 0,.26,-.6);
    return {g, update(t){
      const T = t%10;
      const f = T<1.5 ? 0 : T<4 ? ease((T-1.5)/2.5) : T<7 ? 1 : T<9.5 ? 1-ease((T-7)/2.5) : 0;
      slider.position.z = 1.75 - 1.2*f;
      const scan = T>4 && T<7 ? .5+.5*Math.sin((T-4)*6) : 0;
      ringMat.color.copy(P.accL).lerp(WHITE, scan*.9);
      ringMat.opacity = 1;
      scr.scale.x = .3 + .7*((T/10*3)%1);
    }};
  }},

  /* Module 3, option A: the AI marks the film and the reader checks the mark with a magnifier */
  second:{c:'m3', still:4.5, build(K,P){
    const g = new THREE.Group();
    put(g, K.box(2.5,.12,1.7,P.paper,{r:.06}), 0,-.06,-.05);
    const fh = 1.5, fw = fh*FILM_AR, MY = 1.42;
    put(g, K.box(.7,.04,.45,P.dark,{r:.02}), 0,.02,-.5);
    put(g, K.box(.12,.7,.08,P.dark,{r:.03}), 0,.38,-.62);
    put(g, K.box(fw+.16, fh+.16, .1, P.dark, {r:.04}), 0,MY,-.58);
    put(g, K.plane(fw, fh, {map:CXR}), 0,MY,-.527);
    const ovM = K.M(0xffffff, {basic:true, map:AIOVER, unique:true, transparent:true, depthWrite:false, opacity:0});
    put(g, K.plane(fw, fh, {mat:ovM}), 0,MY,-.522);
    put(g, K.box(1.1,.04,.32,P.white,{r:.02}), -.1,.02,.35);
    put(g, K.box(.12,.04,.18,P.white,{r:.04}), .65,.02,.38);
    // magnifier
    const mag = put(g, new THREE.Group());
    put(mag, K.torus(.33,.035,P.white));
    const lens = put(mag, new THREE.Mesh(new THREE.CircleGeometry(.32,40), K.M(P.accXL, {basic:true, unique:true, transparent:true, opacity:.16, depthWrite:false})));
    const handle = put(mag, K.cyl(.045,.055,.5,P.acc), .43,-.43,0); handle.rotation.z = Math.PI/4;
    // the reader's tick
    const badge = put(g, new THREE.Group());
    put(badge, K.cyl(.15,.15,.05,P.acc), 0,0,0).rotation.x = Math.PI/2;
    const tick = new THREE.Shape(); tick.moveTo(-.09,.0); tick.lineTo(-.03,-.06); tick.lineTo(.09,.065); tick.lineTo(.065,.09); tick.lineTo(-.03,-.01); tick.lineTo(-.065,.025);
    put(badge, K.extrude(tick,.02,P.white,{bevel:false,cs:4}), 0,0,.035);
    const box = new V3(-.2*fw, MY-.1*fh, -.2), start = new V3(.42*fw, MY-.62*fh, -.05);
    badge.position.set(box.x+.62, box.y+.36, -.32);
    return {g, update(t){
      const T = t % 7, out = 1-clamp01((T-6.2)/.6);
      ovM.opacity = clamp01((T-.3)/.6) * out;
      const f = ease(clamp01((T-1.1)/1.9));
      mag.position.lerpVectors(start, box, f);
      mag.position.x += Math.sin(f*Math.PI)*.25; mag.position.y += Math.sin(f*Math.PI)*.2;
      if(T > 3) mag.position.y += Math.sin((T-3)*2.4)*.015;
      mag.scale.setScalar(Math.max(.001, out));
      const b = clamp01((T-3.3)/.35);
      badge.scale.setScalar(Math.max(.001, (b < 1 ? b*1.15 - .15*b*b : 1) * out));
    }};
  }},

  /* Leadership: a hospital tower with a roofless CT wing beside it, so you look down into the scanner room */
  hospital:{c:'lead', build(K,P){
    const g = new THREE.Group();
    put(g, K.box(4.6,.16,4.0,P.paper,{r:.08}), .1,-.08,.1);
    put(g, K.box(.7,.02,1.3,P.white2,{r:.005}), -.7,.01,1.4);
    // tower
    put(g, K.box(2.0,.9,2.0,P.white,{r:.04}), -.8,.45,-.4);
    put(g, K.box(.9,.7,.04,P.accXL,{r:.01,rough:.3}), -.7,.38,.61);
    put(g, K.box(.3,.56,.05,P.accD,{r:.01}), -.7,.29,.63);
    put(g, K.box(1.1,.06,.5,P.white2,{r:.02}), -.7,.8,.85);
    [-1.18,-.22].forEach(x=>put(g, K.box(.04,.77,.04,P.white2,{r:.01}), x,.385,1.05));
    put(g, K.box(2.06,.08,2.06,P.acc,{r:.02}), -.8,.94,-.4);
    put(g, K.box(2.0,1.6,2.0,P.white,{r:.04}), -.8,1.78,-.4);
    [1.28,1.73,2.18].forEach(y=>{
      for(let i=0;i<4;i++) put(g, K.box(.3,.26,.03,P.accL,{r:.01,rough:.25}), -1.55+i*.5,y,.61);
      for(let i=0;i<4;i++) put(g, K.box(.03,.26,.3,P.accL,{r:.01,rough:.25}), .21,y,-1.15+i*.5);
    });
    put(g, K.box(.8,.3,.7,P.white2,{r:.04}), -1.15,2.73,-.85);
    put(g, K.box(.46,.12,.06,P.acc,{r:.02}), -.3,2.25,.63);
    put(g, K.box(.12,.46,.06,P.acc,{r:.02}), -.3,2.25,.63);
    // CT wing: floor, back and side walls full height, front and right cut low with an accent cut line
    put(g, K.box(1.75,.06,2.0,P.white2,{r:.01}), 1.1,.03,-.4);
    put(g, K.box(1.75,.9,.08,P.white,{r:.02}), 1.1,.45,-1.36);
    put(g, K.box(.08,.26,2.0,P.white,{r:.02}), 1.94,.13,-.4);
    put(g, K.box(1.75,.26,.08,P.white,{r:.02}), 1.1,.13,.56);
    put(g, K.box(.09,.025,2.0,P.acc,{r:.006}), 1.94,.27,-.4);
    put(g, K.box(1.75,.025,.09,P.acc,{r:.006}), 1.1,.27,.56);
    // scanner
    const sh = rrShape(1.0,1.0,.24), hole = new THREE.Path(); hole.absarc(0,.03,.25,0,Math.PI*2,true); sh.holes.push(hole);
    put(g, K.extrude(sh,.34,P.white,{bs:.03,bt:.03}), 1.0,.56,-.95);
    const ring = put(g, new THREE.Group(), 1.0,.59,-.76);
    put(ring, K.torus(.3,.02,P.acc));
    put(ring, K.box(.08,.08,.03,P.acc,{r:.01}), 0,.3,0);
    put(g, K.box(.26,.32,.55,P.white,{r:.03}), 1.0,.22,-.2);
    const top = put(g, K.box(.28,.04,.9,P.white2,{r:.012}), 1.0,.4,-.3);
    put(top, K.capsule(.07,.42,P.accXL), 0,.08,.1).rotation.x = Math.PI/2;
    // control desk in the corner
    put(g, K.box(.5,.42,.3,P.white,{r:.03}), 1.62,.27,-1.12);
    const mon = put(g, K.box(.34,.24,.03,P.dark,{r:.015}), 1.62,.62,-1.18); mon.rotation.y = -.5;
    // trees
    [[2.15,1.55],[-2.0,1.5],[.95,1.6],[-2.0,-1.6]].forEach(([x,z],i)=>{
      put(g, K.cyl(.03,.03,.28,P.white2), x,.14,z);
      put(g, K.sphere(i%2?.2:.25,P.white), x,.4+(i%2?0:.04),z);
    });
    // governance shield above the wing
    const s = new THREE.Shape(); s.moveTo(0,.32); s.quadraticCurveTo(.16,.28,.26,.24); s.lineTo(.26,.02); s.quadraticCurveTo(.24,-.22,0,-.34); s.quadraticCurveTo(-.24,-.22,-.26,.02); s.lineTo(-.26,.24); s.quadraticCurveTo(-.16,.28,0,.32);
    const shield = put(g, new THREE.Group(), 1.1,1.75,-.7); shield.rotation.y = Math.PI/4;
    put(shield, K.extrude(s,.08,P.acc,{bs:.02,bt:.02,cs:16}));
    const tick = new THREE.Shape(); tick.moveTo(-.13,.0); tick.lineTo(-.04,-.09); tick.lineTo(.14,.1); tick.lineTo(.1,.14); tick.lineTo(-.04,-.01); tick.lineTo(-.09,.04);
    put(shield, K.extrude(tick,.03,P.white,{bevel:false,cs:4}), 0,0,.06);
    return {g, update(t){
      ring.rotation.z = -t*1.6;
      top.position.z = -.3 - .25*(.5+.5*Math.sin(t*.7));
      shield.position.y = 1.75 + Math.sin(t*1.4)*.07;
    }};
  }}
};

/* ---------- A view: one scene, camera fitted to it, drawn into its own canvas ---------- */
function makeScene(name, style){
  const spec = SCENES[name], P = pal(spec.c), K = kit(style);
  const scene = new THREE.Scene(), built = spec.build(K,P);
  const holder = new THREE.Group(); holder.add(built.g); scene.add(holder);
  if(K.clay){
    scene.environment = ENV; scene.environmentIntensity = .55;
    const sun = new THREE.DirectionalLight(0xffffff, 2.1); sun.position.set(4,8,5); sun.castShadow = true;
    sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera, {left:-6.5,right:6.5,top:6.5,bottom:-6.5,near:1,far:25});
    sun.shadow.radius = 4; sun.shadow.bias = -.0004; sun.shadow.normalBias = .02;
    scene.add(sun);
    const gnd = new THREE.Mesh(new THREE.PlaneGeometry(40,40), new THREE.ShadowMaterial({opacity:.2}));
    gnd.rotation.x = -Math.PI/2; gnd.position.y = -.161; gnd.receiveShadow = true; scene.add(gnd);
  }else{
    scene.add(new THREE.AmbientLight(0xffffff, .9));
    const d = new THREE.DirectionalLight(0xffffff, 1.9); d.position.set(.2,1,.75); scene.add(d);
  }
  built.update(0);
  const box = new THREE.Box3().setFromObject(holder);
  const corners = [];
  for(let i=0;i<8;i++) corners.push(new V3(i&1?box.max.x:box.min.x, i&2?box.max.y:box.min.y, i&4?box.max.z:box.min.z));
  const center = box.getCenter(new V3());
  const vw = spec.view?.[style], az = (vw ? vw[0] : K.clay?34:45)*Math.PI/180, el = (vw ? vw[1] : K.clay?24:30)*Math.PI/180;
  const dir = new V3(Math.sin(az)*Math.cos(el), Math.sin(el), Math.cos(az)*Math.cos(el));
  const cam = K.clay ? new THREE.PerspectiveCamera(24,1,.1,200) : new THREE.OrthographicCamera(-1,1,1,-1,.1,200);
  function fit(aspect){
    const pad = K.clay ? .86 : .9;
    if(K.clay){
      cam.aspect = aspect;
      let target = center.clone(), D = 14;
      for(let it=0;it<3;it++){
        cam.position.copy(target).addScaledVector(dir, D); cam.lookAt(target); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
        let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
        corners.forEach(c=>{ const p = c.clone().project(cam); x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y); });
        const ext = Math.max((x1-x0)/2, (y1-y0)/2);
        const halfH = Math.tan(cam.fov*Math.PI/360)*D, right = new V3().setFromMatrixColumn(cam.matrixWorld,0), up = new V3().setFromMatrixColumn(cam.matrixWorld,1);
        target.addScaledVector(right, (x0+x1)/2*halfH*aspect).addScaledVector(up, (y0+y1)/2*halfH);
        D *= ext/pad;
      }
      cam.position.copy(target).addScaledVector(dir, D); cam.lookAt(target);
    }else{
      cam.position.copy(center).addScaledVector(dir, 30); cam.lookAt(center); cam.updateMatrixWorld();
      let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
      corners.forEach(c=>{ const p = c.clone().applyMatrix4(cam.matrixWorldInverse); x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y); });
      const cx=(x0+x1)/2, cy=(y0+y1)/2;
      let hw = Math.max((x1-x0)/2, (y1-y0)/2*aspect)/pad, hh = hw/aspect;
      Object.assign(cam, {left:cx-hw, right:cx+hw, top:cy+hh, bottom:cy-hh});
    }
    cam.updateProjectionMatrix();
  }
  return {scene, cam, fit, holder, clay:K.clay, update:built.update, still:spec.still};
}
function dispose(scene){ scene.traverse(o=>{ if(o.geometry) o.geometry.dispose(); }); }

/* ---------- Views ---------- */
const views = [];
function motionOn(){ return !motionQuery.matches; }
const io = new IntersectionObserver(es=>es.forEach(e=>{ const v = views.find(x=>x.el===e.target); if(v){ v.visible = e.isIntersecting; if(v.visible) draw(v, now()); } }), {rootMargin:'120px'});
const ro = new ResizeObserver(es=>es.forEach(e=>{ const v = views.find(x=>x.el===e.target); if(v){ v.w = 0; draw(v, now()); } }));

function mount(el){
  if(!el || views.some(v=>v.el===el) || !SCENES[el.dataset.scene]) return;
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden','true'); el.prepend(canvas);
  const v = {el, canvas, ctx:canvas.getContext('2d'), visible:false, px:0, py:0, tpx:0, tpy:0, w:0};
  v.s = makeScene(el.dataset.scene, 'clay');
  v.move = e=>{ const r = el.getBoundingClientRect(); v.tpx = (e.clientX-r.left)/r.width*2-1; v.tpy = (e.clientY-r.top)/r.height*2-1; if(!motionOn()) draw(v, now()); };
  v.leave = ()=>{ v.tpx = v.tpy = 0; if(!motionOn()) draw(v, now()); };
  el.addEventListener('pointermove', v.move);
  el.addEventListener('pointerleave', v.leave);
  el.classList.add('is-3d');
  io.observe(el); ro.observe(el);
  views.push(v);
  start();
}
function unmount(el){
  const i = views.findIndex(v=>v.el===el); if(i<0) return;
  const v = views[i]; views.splice(i,1);
  io.unobserve(el); ro.unobserve(el);
  el.removeEventListener('pointermove', v.move); el.removeEventListener('pointerleave', v.leave);
  v.canvas.remove(); el.classList.remove('is-3d'); dispose(v.s.scene);
}

// Scene clock: advances only while frames run, so a figure doesn't jump after the tab was hidden
let clock = 0, last = 0;
const now = () => clock;
function render(v, t, w, h){
  ensure(w,h);
  const s = v.s, m = motionOn();
  v.px += (v.tpx-v.px)*(m ? .06 : 1); v.py += (v.tpy-v.py)*(m ? .06 : 1);
  s.holder.rotation.y = (m ? Math.sin(t*.35)*.14 : 0) + v.px*.32;
  s.holder.rotation.x = v.py*.04;
  s.update(m ? t : (s.still || 2.1));
  renderer.setViewport(0,0,w,h); renderer.setScissor(0,0,w,h); renderer.setScissorTest(true);
  renderer.render(s.scene, s.cam);
}
function draw(v, t){
  const r = v.el.getBoundingClientRect(), w = Math.round(r.width*DPR), h = Math.round(r.height*DPR);
  if(!w || !h) return;
  if(v.canvas.width!==w || v.canvas.height!==h || v.w!==w){ v.canvas.width=w; v.canvas.height=h; v.w=w; v.s.fit(w/h); }
  render(v, t, w, h);
  v.ctx.clearRect(0,0,w,h);
  v.ctx.drawImage(renderer.domElement, 0, RH-h, w, h, 0, 0, w, h);
}
function redrawAll(){ views.forEach(v=>draw(v, now())); }

let raf = 0;
function frame(p){
  // Cap at about 30 fps: the motion is slow, and each figure renders shadows
  if(p-last < 30){ raf = requestAnimationFrame(frame); return; }
  clock += Math.min((p-last)/1000, .05); last = p;
  const t = clock;
  views.forEach(v=>{ if(v.visible) draw(v,t); });
  raf = views.length && motionOn() ? requestAnimationFrame(frame) : 0;
}
// With reduced motion the figures hold their still frame and only redraw when resized or tilted by the pointer
function start(){ if(motionOn()){ if(!raf && views.length){ last = performance.now(); raf = requestAnimationFrame(frame); } } else redrawAll(); }
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) last = performance.now(); });
motionQuery.addEventListener('change', start);

document.querySelectorAll('[data-scene]').forEach(mount);
document.fonts.ready.then(()=>{ views.forEach(v=>{ dispose(v.s.scene); v.s = makeScene(v.el.dataset.scene, 'clay'); v.w = 0; }); redrawAll(); });
window.AI2Figures3D = {mount, unmount};
document.dispatchEvent(new CustomEvent('ai2practice:figures3d-ready'));
