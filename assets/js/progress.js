(function(){
  'use strict';

  if (window.AI2PracticeProgressRail) return;

  var scriptUrl = document.currentScript && document.currentScript.src
    ? document.currentScript.src
    : new URL('assets/js/progress.js', window.location.href).href;
  var siteRoot = new URL('../../', scriptUrl);

  var COMPLETED_KEY = 'aiready_completed';
  var ASSESS_KEY = 'ai2practice_assessments_v1';
  var PATHWAY_KEY = 'ai2practice_pathway_v1';
  var RESUME_KEY = 'ai2practice_resume_v1';
  var CKPT_PREFIX = 'aiready_ckpt_';

  /* ---------- Curriculum registry ----------
     The single source of truth for core lessons. To publish a planned lesson,
     create lessons/<key>.html from a lesson template and set published:true.
     optional:true lessons never count toward the certificate. */
  var MODULES = [
    { id:'m1', n:1, label:'Fundamentals', name:'Module 1 · Fundamentals of AI', href:'modules/ai-fundamentals.html', q:'What is AI, and how does it work clinically?' },
    { id:'m2', n:2, label:'Radiology Basics', name:'Module 2 · Radiology Basics: Images, Systems & Reports', href:'modules/informatics.html', q:'What is radiology, and how does a scan become data?' },
    { id:'m3', n:3, label:'Clinical Practice', name:'Module 3 · AI in Clinical Practice', href:'modules/clinical-practice.html', q:'How does AI affect my clinical practice?' }
  ];
  var LESSONS = [
    { key:'m1-1', module:'m1', title:'AI Around You', published:true },
    { key:'m1-2', module:'m1', title:'How Models Learn', published:true },
    { key:'m1-3', module:'m1', title:'Data & Labels', published:true },
    { key:'m1-4', module:'m1', title:'Measuring Performance', published:true },
    { key:'m1-5', module:'m1', title:'Limits & Failures', published:true },
    { key:'m2-1', module:'m2', title:'What Radiology Is', published:true },
    { key:'m2-2', module:'m2', title:'Images as Data', published:true },
    { key:'m2-3', module:'m2', title:'The Journey of a Scan', published:true },
    { key:'m2-4', module:'m2', title:'Reading a Radiology Report', published:true },
    { key:'m3-1', module:'m3', title:'AI in Radiology & Medicine', published:true },
    { key:'m3-2', module:'m3', title:'Does It Work, and Is It Worth It?', published:true },
    { key:'m3-3', module:'m3', title:'Thinking With AI', published:true },
    { key:'m3-4', module:'m3', title:'Responsibility & Patients', published:true },
    { key:'m3-5', module:'m3', title:'The Future of AI in Radiology', published:true }
  ];
  LESSONS.forEach(function(l){ l.href='lessons/'+l.key+'.html'; });
  // Lesson files before the module-order renumbering (October 2026).
  var LEGACY = { 'lesson-1':'m3-3', 'lesson-2':'m1-1', 'lesson-3':'m3-1', 'lesson-4':'m3-2', 'lesson-5':'m3-5' };
  var LESSON_KEYS = LESSONS.map(function(l){ return l.key; });
  var RESEARCH_KEYS = ['research-1','research-2','research-3','research-4','research-5'];
  var RESEARCH = [
    { key:'research-1', label:'Environment', name:'Lab 1 · Setting Up Your AI Research Environment' },
    { key:'research-2', label:'Data Science', name:'Lab 2 · Data Science and AI Evaluation' },
    { key:'research-3', label:'Machine Learning', name:'Lab 3 · Machine Learning and Image Processing' },
    { key:'research-4', label:'Advanced AI', name:'Lab 4 · Advanced Image AI and NLP' },
    { key:'research-5', label:'Project', name:'Lab 5 · Mini Research Project' }
  ];
  var KNOWN_KEYS = LESSON_KEYS.concat(RESEARCH_KEYS);
  function lessonByKey(k){ return LESSONS.filter(function(l){ return l.key===k; })[0] || null; }
  function moduleById(id){ return MODULES.filter(function(m){ return m.id===id; })[0] || null; }
  function migrateKey(k){ return LEGACY[k] || k; }

  // Every depth currently shares one assessment, so a completion recorded
  // under any depth counts. Set to false once each depth has its own material.
  var SHARED_PRACTICE = true;
  var PATHWAY_ORDER = ['beginner','intermediate','advanced'];
  var PATHWAYS = {
    beginner: { label:'Beginner', description:'Core lessons and the assessment. Beginner-specific content is planned.' },
    intermediate: { label:'Intermediate', description:'Core lessons and the assessment. Intermediate-specific content is planned.' },
    advanced: { label:'Advanced', description:'Core lessons and the assessment. Advanced-specific content is planned.' }
  };
  function assessmentHref(p){ return 'assessment.html'+(p ? '?pathway='+p : ''); }

  // Educator assignment plans arrive as ?plan=1&depth=...&lessons=m1-1,m3-1&practice=assessment&title=...
  var PLAN_KEY = 'ai2practice_plan_v1';

  var CHECK = '<svg viewBox="0 0 12 12" width="11" height="11" fill="none" aria-hidden="true"><path d="M2.5 6.2 5 8.6l4.5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------- Paths & storage ---------- */

  function siteUrl(path){ return new URL(path, siteRoot).href; }
  // Same ?v= tag as this script, so files loaded from here refresh together after a change.
  var VER=new URL(scriptUrl).search;
  function relativePath(){
    var rootPath = siteRoot.pathname.replace(/\/$/, '');
    var p = window.location.pathname;
    if (rootPath && p.indexOf(rootPath) === 0) p = p.slice(rootPath.length);
    return p.replace(/^\//, '') || 'index.html';
  }
  // Rail mode runs on published core lessons and Research Lab pages.
  function lessonKeyForPage(){
    var m = relativePath().match(/^lessons\/(m[1-3]-[1-9]|research-[1-5])\.html$/);
    if (!m) return null;
    var l = lessonByKey(m[1]);
    return (!l || l.published) ? m[1] : null;
  }
  function ensureStyles(){
    var existing = document.querySelector('link[data-ai2-progress-style]');
    if (existing) return existing;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = siteUrl('assets/css/progress.css')+VER;
    link.setAttribute('data-ai2-progress-style','1');
    document.head.appendChild(link);
    return link;
  }
  // Keep injected UI invisible until its stylesheet applies, so it never flashes unstyled.
  function revealWhenStyled(link){
    var shown=false;
    function els(){ return document.querySelectorAll('#ai2Outline, #ai2OutlineTab, #ai2Acct'); }
    function show(){
      if (shown) return; shown=true;
      els().forEach(function(el){ el.style.visibility=''; });
      requestAnimationFrame(function(){ document.documentElement.classList.add('ai2-ready'); });
    }
    var loaded=false;
    try { loaded=!!(link.sheet && link.sheet.cssRules.length); } catch(e) {}
    if (loaded) { show(); return; }
    els().forEach(function(el){ el.style.visibility='hidden'; });
    link.addEventListener('load',show);
    link.addEventListener('error',show);
    setTimeout(show,2500);
  }
  function safeJSON(key, fallback){
    try { var raw=localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch(e){ return fallback; }
  }
  function store(key, value){ try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {} }
  // Old lesson keys (lesson-1..5) are rewritten to module keys the first time they are read.
  function migrateList(list){
    var out=[];
    list.forEach(function(k){ k=migrateKey(k); if(KNOWN_KEYS.indexOf(k)!==-1 && out.indexOf(k)===-1) out.push(k); });
    return out;
  }
  function completed(){
    var raw = safeJSON(COMPLETED_KEY, []);
    if (!Array.isArray(raw)) raw = [];
    var local = raw.slice();
    try {
      var legacy = sessionStorage.getItem(COMPLETED_KEY);
      if (legacy) {
        var old = JSON.parse(legacy);
        if (Array.isArray(old)) old.forEach(function(k){ if(local.indexOf(k)===-1) local.push(k); });
        sessionStorage.removeItem(COMPLETED_KEY);
      }
    } catch(e) {}
    var clean = migrateList(local);
    if (JSON.stringify(clean)!==JSON.stringify(raw)) store(COMPLETED_KEY, clean);
    return clean;
  }
  function markComplete(key){
    var done=completed();
    if (done.indexOf(key)!==-1) return;
    done.push(key); store(COMPLETED_KEY, done); notify();
  }
  function assessments(){ var x=safeJSON(ASSESS_KEY,{}); return x && typeof x==='object' && !Array.isArray(x) ? x : {}; }
  function selectedPathway(){
    try { var p=localStorage.getItem(PATHWAY_KEY); return PATHWAYS[p] ? p : null; }
    catch(e) { return null; }
  }
  function setPathway(p){
    if (!PATHWAYS[p]) return;
    try { localStorage.setItem(PATHWAY_KEY,p); } catch(e) {}
    render(); flashSaved();
  }

  /* ---------- Assignment plans ---------- */

  function cleanPlan(raw){
    if (!raw || typeof raw!=='object') return null;
    var lessons=(Array.isArray(raw.lessons) ? raw.lessons : []).map(migrateKey)
      .filter(function(k,i,a){ var l=lessonByKey(k); return l && l.published && a.indexOf(k)===i; });
    lessons.sort(function(a,b){ return LESSON_KEYS.indexOf(a)-LESSON_KEYS.indexOf(b); });
    if (!lessons.length && !raw.assessment) return null;
    return { title:String(raw.title||'').slice(0,80), depth:PATHWAYS[raw.depth] ? raw.depth : null,
      lessons:lessons, assessment:!!raw.assessment, self:!!raw.self };
  }
  function activePlan(){ return cleanPlan(safeJSON(PLAN_KEY,null)); }
  function planFromQuery(q){
    if (q.get('plan')!=='1') return null;
    var practice=(q.get('practice')||'').split(',');
    return cleanPlan({ title:q.get('title'), depth:q.get('depth'), lessons:(q.get('lessons')||'').split(','),
      assessment:practice.indexOf('assessment')!==-1 });
  }
  function leavePlan(){ try { localStorage.removeItem(PLAN_KEY); } catch(e) {} render(); notify(); }
  // A plan the learner picked themselves (home-page Start picker); self:true changes only the wording.
  function setPlan(raw){
    var plan=cleanPlan(raw); if(!plan) return null;
    store(PLAN_KEY, plan);
    if (plan.depth) { try { localStorage.setItem(PATHWAY_KEY,plan.depth); } catch(e) {} }
    render(); notify(); return plan;
  }

  // What counts toward the certificate: the assigned plan, or every published required lesson
  // plus the assessment.
  function requirements(){
    var plan=activePlan();
    if (plan) return { plan:plan, lessons:plan.lessons, assessment:plan.assessment };
    return { plan:null, lessons:LESSONS.filter(function(l){ return l.published && !l.optional; }).map(function(l){ return l.key; }), assessment:true };
  }
  function practiceDepths(p){ return SHARED_PRACTICE ? PATHWAY_ORDER : (p ? [p] : []); }
  function assessmentRecord(p){
    var as=assessments(), best={};
    practiceDepths(p).forEach(function(k){
      var r=as[k]; if(!r) return;
      if ((r.passed && !best.passed) || (!!r.passed===!!best.passed && (Number(r.bestScore)||0)>(Number(best.bestScore)||0))) best=r;
    });
    return best;
  }
  function eligible(p){
    var R=requirements(), done=completed();
    if (!p) return false;
    if (!R.lessons.every(function(k){ return done.indexOf(k)!==-1; })) return false;
    if (R.assessment && !assessmentRecord(p).passed) return false;
    return true;
  }
  // The ordered lessons a learner moves through with Next.
  function sequence(){
    var plan=activePlan();
    if (plan) return plan.lessons.slice();
    return LESSONS.filter(function(l){ return l.published; }).map(function(l){ return l.key; });
  }
  function lessonHref(key){ return siteUrl(lessonByKey(key).href); }
  function esc(s){ return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function notify(){ try { window.dispatchEvent(new CustomEvent('ai2practice:progress-changed')); } catch(e) {} }

  /* ---------- Pathway model ---------- */

  // Steps: learning depth first, then the modules (only those with required lessons),
  // then the assessment and the certificate.
  function steps(){
    var done=completed(), p=selectedPathway(), R=requirements(), plan=R.plan;
    var out=[{ id:'depth', label:'Depth', name:'Learning depth', keys:[], doneCount:p?1:0, done:!!p, depth:true,
      href:null, note:p ? PATHWAYS[p].label+(plan && plan.depth===p ? ' · set by your plan' : '') : 'Choose Beginner, Intermediate, or Advanced' }];
    MODULES.forEach(function(m){
      var keys=R.lessons.filter(function(k){ return lessonByKey(k).module===m.id; });
      if (!keys.length) return;
      var n=keys.filter(function(k){ return done.indexOf(k)!==-1; }).length;
      var first=keys.filter(function(k){ return done.indexOf(k)===-1; })[0] || keys[0];
      var planned=LESSONS.filter(function(l){ return l.module===m.id && !l.published; }).length;
      var list=keys.map(function(k){ return { key:k, title:lessonByKey(k).title, done:done.indexOf(k)!==-1, href:lessonHref(k) }; });
      out.push({ id:m.id, label:m.label, name:m.name, keys:keys, lessons:list, doneCount:n, done:n===keys.length,
        href:lessonHref(first), nextTitle:lessonByKey(first).title, planned:plan ? 0 : planned,
        note:(keys.length>1 ? n+' of '+keys.length+' lessons' : (n ? 'Lesson complete' : lessonByKey(first).title))+(!plan && planned ? ' · '+planned+' more in development' : '') });
    });
    if (R.assessment) {
      var a=assessmentRecord(p), score=Number(a.bestScore) ? Math.round(a.bestScore) : null;
      out.push({ id:'assess', label:'Assessment', name:'Assessment', keys:[], done:!!a.passed,
        href:siteUrl(assessmentHref(p)), note:a.passed ? 'Passed · '+score+'%' : (score!==null ? 'Best '+score+'% · pass at 80%' : 'Pass at 80% or higher') });
    }
    var ok=eligible(p);
    out.push({ id:'cert', label:'Certificate', name:plan ? 'Plan completion certificate' : 'Completion certificate', keys:[], done:false, ready:ok, locked:!ok,
      href:ok ? siteUrl('certificate.html?pathway='+p) : null, note:ok ? 'Ready to generate' : (p ? 'Unlocks when every step is done' : 'Choose a learning depth first') });
    return out;
  }
  function moduleSteps(){ return steps().filter(function(s){ return /^m[1-3]$/.test(s.id); }); }
  function stepById(id){ return steps().filter(function(s){ return s.id===id; })[0] || null; }
  function pageStepId(){
    var p=relativePath(), m=p.match(/^lessons\/(m[1-3])-\d\.html$/);
    if (m) return m[1];
    for (var i=0;i<MODULES.length;i++) if (p===MODULES[i].href) return MODULES[i].id;
    if (p==='assessment.html') return 'assess';
    if (p==='certificate.html') return 'cert';
    return null;
  }
  function activeIndex(S){
    var id=pageStepId(), i;
    if (id) for (i=0;i<S.length;i++) if (S[i].id===id) return i;
    for (i=0;i<S.length;i++) if (!S[i].done) return i;
    return S.length-1;
  }
  // The lesson rail shows only the module sequence (or the Research Lab sequence on research pages).
  function isResearchPage(){ var k=lessonKeyForPage(); return !!k && k.indexOf('research-')===0; }
  function railSteps(){
    if (!isResearchPage()) return moduleSteps();
    var done=completed();
    return RESEARCH.map(function(r){
      var d=done.indexOf(r.key)!==-1;
      return { id:r.key, label:r.label, name:r.name, keys:[r.key], doneCount:d?1:0, done:d, href:siteUrl('lessons/'+r.key+'.html') };
    });
  }
  function railActive(S){
    var key=lessonKeyForPage(), id=pageStepId();
    for (var i=0;i<S.length;i++) if (S[i].id===key || S[i].id===id) return i;
    return -1;
  }
  function nextStep(){
    var S=steps(), p=selectedPathway();
    if (!p) return { choose:true, title:'Choose your learning depth', label:'Choose depth', eyebrow:'Start here', note:'Pick Beginner, Intermediate, or Advanced. All three share the same content for now; deeper versions are planned.' };
    for (var i=1;i<S.length;i++){
      var s=S[i];
      if (s.done || s.id==='cert') continue;
      if (/^m[1-3]$/.test(s.id)) return { title:s.nextTitle, label:'Continue lesson', href:s.href, eyebrow:'Next: '+s.name };
      if (s.id==='assess') return { title:s.name, label:'Take assessment', href:s.href, eyebrow:'Next: assessment', note:'Pass score: 80% or higher.' };
    }
    var c=S[S.length-1];
    return { title:'Your certificate is ready', label:'Generate certificate', href:c.href, eyebrow:'All requirements complete', done:true };
  }

  /* ---------- Resume position (last lesson + how far in) ---------- */

  function readPct(){
    var h=document.documentElement.scrollHeight-window.innerHeight;
    return h>0 ? Math.max(0,Math.min(100,Math.round(window.scrollY/h*100))) : 0;
  }
  function saveResume(){
    var key=lessonKeyForPage(); if(!key || gate) return;
    var l=lessonByKey(key);
    var h1=document.querySelector('.les-hero h1') || document.querySelector('main h1, h1');
    var title=l ? l.title : (h1 ? h1.textContent.trim() : document.title);
    store(RESUME_KEY,{ key:key, path:relativePath()+window.location.search, title:title, pct:readPct(), at:Date.now() });
  }
  function resumeTarget(){
    var r=safeJSON(RESUME_KEY,null);
    if (!r || !r.key || !r.path || !/^lessons\//.test(r.path)) return null;
    if (LEGACY[r.key]) { r.key=LEGACY[r.key]; r.path=lessonByKey(r.key).href; }
    if (completed().indexOf(r.key)!==-1) return null;
    if (r.pct>=97) return null;
    if (Date.now()-(r.at||0) > 1000*60*60*24*90) return null;
    if (r.path.split('?')[0]===relativePath()) return null;
    return r;
  }
  function restoreScrollIfRequested(){
    if (window.location.hash!=='#ai2-resume') return;
    var r=safeJSON(RESUME_KEY,null);
    history.replaceState(null,'',window.location.pathname+window.location.search);
    if (!r || r.path.split('?')[0]!==relativePath() || !r.pct) return;
    var go=function(){ var h=document.documentElement.scrollHeight-window.innerHeight; window.scrollTo({top:h*r.pct/100, behavior:'auto'}); };
    if (document.readyState==='complete') setTimeout(go,60); else window.addEventListener('load',function(){ setTimeout(go,60); });
  }

  // Keeps only known lessons, depths and valid scores from an untrusted snapshot (the signed-in account).
  function cleanSnapshot(obj){
    obj=obj || {};
    var out={completed:[],assessments:{},pathway:null};
    if(Array.isArray(obj.completed)) out.completed=migrateList(obj.completed);
    if(PATHWAYS[obj.pathway]) out.pathway=obj.pathway;
    PATHWAY_ORDER.forEach(function(k){
      if(obj.assessments&&obj.assessments[k]){
        var a=obj.assessments[k], score=Number(a.bestScore);
        if(Number.isFinite(score)&&score>=0&&score<=100) out.assessments[k]={bestScore:Math.round(score),passed:a.passed===true};
      }
    });
    return out;
  }
  // Merging never removes progress: lessons are unioned and the better score wins.
  function mergeProgress(incoming){
    var done=completed();
    incoming.completed.forEach(function(k){ if(done.indexOf(k)===-1) done.push(k); });
    store(COMPLETED_KEY, done);
    incoming.completed.forEach(function(k){ if(k.indexOf('research-')===0){ try { localStorage.setItem(CKPT_PREFIX+k,'1'); } catch(e) {} } });
    var as=assessments(); Object.keys(incoming.assessments).forEach(function(k){
      var old=as[k]||{}, inc=incoming.assessments[k];
      as[k]={bestScore:Math.max(Number(old.bestScore)||0,inc.bestScore||0),passed:!!old.passed||!!inc.passed};
    }); store(ASSESS_KEY, as);
    if (incoming.pathway && !selectedPathway()) { try { localStorage.setItem(PATHWAY_KEY,incoming.pathway); } catch(e) {} }
    render(); notify();
  }
  function snapshot(){ return { completed:completed(), assessments:assessments(), pathway:selectedPathway() }; }

  /* ---------- Shell ----------
     Lesson and Research Lab pages get a collapsible course outline on the left.
     Every page gets the account menu in the header. The progress dialog
     (depth, steps, account) opens from either. */

  var shell, lastFocus, savedTimer, olOpen={}, stepOpen={};
  var OUTLINE_KEY = 'ai2practice_outline_v1';
  var CHEVRON = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var OUTLINE_ICON = '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true"><path d="M2.5 4h11M2.5 8h11M2.5 12h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  var GOOGLE = '<svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>';

  var MICROSOFT = '<svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path fill="#F25022" d="M0 0h8.5v8.5H0z"/><path fill="#7FBA00" d="M9.5 0H18v8.5H9.5z"/><path fill="#00A4EF" d="M0 9.5h8.5V18H0z"/><path fill="#FFB900" d="M9.5 9.5H18V18H9.5z"/></svg>';

  function drawerHTML(){
    var depthButtons = PATHWAY_ORDER.map(function(k){ return '<button type="button" data-ai2-pathway="'+k+'">'+PATHWAYS[k].label+'</button>'; }).join('');
    return ''+
      '<div class="ai2-drawer" id="ai2ProgressDrawer" role="dialog" aria-modal="true" aria-labelledby="ai2DrawerTitle" hidden>'+
        '<div class="ai2-drawer-inner">'+
          '<header class="ai2-d-head">'+
            '<div><h2 id="ai2DrawerTitle">Your progress</h2><p id="ai2DrawerSub">Saved automatically in this browser.</p></div>'+
            '<button type="button" class="ai2-d-close" id="ai2CloseDrawer" aria-label="Close progress">Close</button>'+
          '</header>'+
          '<div class="ai2-sum" id="ai2Summary"></div>'+
          '<div class="ai2-plan" id="ai2Plan" hidden></div>'+
          '<div class="ai2-continue" id="ai2Continue"></div>'+
          '<section class="ai2-d-col" aria-labelledby="ai2PathHead">'+
            '<div class="ai2-d-colhead"><h3 id="ai2PathHead">Your pathway</h3><div class="ai2-depth" role="group" aria-label="Learning depth">'+depthButtons+'</div></div>'+
            '<p class="ai2-note">Learning depth describes how deep the content goes, not your professional title. All depths share the same content for now.</p>'+
            '<ol class="ai2-d-steps" id="ai2StepList"></ol>'+
          '</section>'+
          '<div class="ai2-d-acct" id="ai2DrawerAcct"></div>'+
          '<footer class="ai2-d-foot">'+
            '<div class="ai2-extras"><span>Independent tracks</span>'+
              '<a href="'+siteUrl('pages/research-lab.html')+'">Research Lab <small id="ai2ResearchStatus"></small></a>'+
              '<a href="'+siteUrl('pages/adoption-governance.html')+'">Leadership</a>'+
            '</div>'+
            '<button type="button" class="ai2-reset" id="ai2ResetProgress">Reset progress</button>'+
          '</footer>'+
        '</div>'+
      '</div>';
  }

  function createModal(){
    if (shell) return shell;
    shell = document.createElement('section');
    shell.id = 'ai2ProgressShell';
    shell.className = 'ai2-progress-shell ai2-modal';
    shell.setAttribute('aria-label','Learning progress');
    shell.hidden = true;
    shell.innerHTML = drawerHTML();
    document.body.appendChild(shell);
    bindPanel();
    return shell;
  }

  function openDrawer(){
    createModal(); closeAccount();
    var drawer=document.getElementById('ai2ProgressDrawer');
    if (drawer.hidden) lastFocus=document.activeElement;
    render();
    shell.hidden=false; drawer.hidden=false;
    document.documentElement.classList.add('ai2-modal-open');
    setTimeout(function(){ var c=document.getElementById('ai2CloseDrawer'); if(c) c.focus({preventScroll:true}); },20);
  }
  function closeDrawer(){
    var drawer=document.getElementById('ai2ProgressDrawer');
    if(!drawer || drawer.hidden) return;
    drawer.hidden=true; shell.hidden=true;
    document.documentElement.classList.remove('ai2-modal-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus({preventScroll:true});
  }
  function flashSaved(text){
    var el=document.getElementById('ai2Saved'); if(!el) return;
    el.innerHTML=CHECK+' '+esc(text||'Saved');
    el.classList.add('show');
    clearTimeout(savedTimer); savedTimer=setTimeout(function(){ el.classList.remove('show'); },2200);
  }
  /* ---------- Shared numbers ---------- */

  // Required lessons done (or Research Lab labs on research pages).
  function tally(){
    var done=completed(), R=requirements();
    var n=R.lessons.filter(function(k){return done.indexOf(k)!==-1;}).length, total=R.lessons.length;
    var label=R.plan ? (R.plan.self ? 'chosen lessons' : 'assigned lessons') : 'core lessons';
    return { n:n, total:total, pct:total ? Math.round(n/total*100) : 0, label:label };
  }
  function ring(pct, size){ return '<span class="ai2-ring'+(size ? ' ai2-ring-'+size : '')+'" style="--p:'+pct+'" aria-hidden="true"></span>'; }
  // The one "what now" target used by the account menu, the outline and module pages.
  function continueTarget(){
    var r=resumeTarget();
    if (r) return { eyebrow:'Pick up where you left off', title:r.title, note:r.pct ? r.pct+'% read' : 'Started', label:'Resume', href:siteUrl(r.path)+'#ai2-resume' };
    var n=nextStep();
    if (n.choose) return { eyebrow:n.eyebrow, title:n.title, note:n.note, label:'Choose depth', open:true };
    return { eyebrow:n.eyebrow, title:n.title, note:n.note || '', label:n.label, href:n.href };
  }

  /* ---------- Course outline (lesson pages) ---------- */

  function wideScreen(){ return window.matchMedia('(min-width: 1100px)').matches; }
  function outlinePref(){ var v=null; try { v=localStorage.getItem(OUTLINE_KEY); } catch(e) {} return v; }
  function createOutline(){
    if (document.getElementById('ai2Outline')) return;
    var aside=document.createElement('aside');
    aside.id='ai2Outline'; aside.className='ai2-outline';
    aside.setAttribute('aria-label','Course outline');
    aside.innerHTML=''+
      '<div class="ai2-ol-head">'+
        '<span class="ai2-ol-title">'+OUTLINE_ICON+' Course outline</span>'+
        '<span class="ai2-saved" id="ai2Saved" aria-live="polite"></span>'+
        '<button type="button" class="ai2-ol-close" id="ai2OutlineClose" aria-label="Collapse course outline" title="Collapse outline">'+CHEVRON+'</button>'+
      '</div>'+
      '<div class="ai2-ol-body" id="ai2OutlineBody"></div>';
    var tab=document.createElement('button');
    tab.type='button'; tab.id='ai2OutlineTab'; tab.className='ai2-ol-tab';
    tab.setAttribute('aria-controls','ai2Outline'); tab.setAttribute('aria-expanded','false');
    tab.innerHTML=OUTLINE_ICON+'<span>Course outline</span>';
    var scrim=document.createElement('div'); scrim.className='ai2-ol-scrim'; scrim.id='ai2OutlineScrim';
    document.body.appendChild(aside); document.body.appendChild(tab); document.body.appendChild(scrim);
    document.body.classList.add('ai2-has-outline');
    document.querySelectorAll('.les-topbar').forEach(function(el){ el.hidden=true; el.style.display='none'; });
    setOutline(wideScreen() && outlinePref()!=='closed', false);
    document.documentElement.classList.remove('ai2-ol-pre-open');
    document.getElementById('ai2OutlineClose').addEventListener('click',function(){ setOutline(false,true); tab.focus({preventScroll:true}); });
    tab.addEventListener('click',function(){ setOutline(true,true); });
    scrim.addEventListener('click',function(){ setOutline(false,false); });
    aside.addEventListener('toggle',function(e){ var d=e.target; if(d.dataset && d.dataset.group) olOpen[d.dataset.group]=d.open; },true);
    aside.addEventListener('click',function(e){ if(!wideScreen() && e.target.closest('a[href^="#"]')) setOutline(false,false); });
    var lastWide=wideScreen();
    window.addEventListener('resize',function(){ var w=wideScreen(); if(w!==lastWide){ lastWide=w; setOutline(w && outlinePref()!=='closed', false); } });
  }
  // remember: only a choice made on a wide screen is kept for next time.
  function setOutline(open, remember){
    if (!document.getElementById('ai2Outline')) return;
    document.body.classList.toggle('ai2-outline-open', open);
    document.body.classList.toggle('ai2-outline-overlay', open && !wideScreen());
    var tab=document.getElementById('ai2OutlineTab'); tab.setAttribute('aria-expanded', open?'true':'false');
    document.getElementById('ai2Outline').inert=!open;
    if (remember && wideScreen()) { try { localStorage.setItem(OUTLINE_KEY, open?'open':'closed'); } catch(e) {} }
    if (open && !wideScreen()) setTimeout(function(){ var c=document.getElementById('ai2OutlineClose'); if(c) c.focus({preventScroll:true}); },20);
    renderAccount();
  }
  function outlineIsOpen(){ return document.body.classList.contains('ai2-outline-open'); }
  function olItem(o){
    var cls='ai2-ol-item'+(o.done?' done':'')+(o.here?' here':'')+(o.soon?' soon':'');
    var mark='<span class="ai2-ol-mark" aria-hidden="true">'+(o.done?CHECK:'')+'</span>';
    var tag=o.soon ? '<em>Soon</em>' : (o.tag ? '<em>'+esc(o.tag)+'</em>' : '');
    var state=o.done ? ' (complete)' : (o.soon ? ' (in development)' : '');
    var label='<span class="ai2-ol-name">'+(o.num ? '<b>'+esc(o.num)+'</b>' : '')+esc(o.title)+'</span>';
    var inner=o.here || !o.href
      ? '<span class="ai2-ol-link"'+(o.here?' aria-current="page"':'')+'>'+mark+label+tag+'<span class="ai2-sr">'+state+'</span></span>'
      : '<a class="ai2-ol-link" href="'+o.href+'">'+mark+label+tag+'<span class="ai2-sr">'+state+'</span></a>';
    return '<li class="'+cls+'">'+inner+'</li>';
  }
  function olGroup(id, title, count, items, here){
    var open = id in olOpen ? olOpen[id] : here;
    return '<details class="ai2-ol-group'+(here?' here':'')+'" data-group="'+id+'"'+(open?' open':'')+'>'+
      '<summary><span>'+esc(title)+'</span>'+(count ? '<small>'+count+'</small>' : '')+'</summary>'+
      '<ol class="ai2-ol-list">'+items.join('')+'</ol></details>';
  }
  function renderOutline(){
    var body=document.getElementById('ai2OutlineBody'); if(!body) return;
    var key=lessonKeyForPage(), done=completed(), research=isResearchPage(), t=tally(), html='';
    var here=lessonByKey(key);
    html+='<div class="ai2-ol-sum">'+ring(t.pct)+'<span><strong>'+t.n+' of '+t.total+'</strong> '+t.label+' complete</span></div>';
    var sbody=steps(), pr=selectedPathway();
    MODULES.forEach(function(m){
      var ls=LESSONS.filter(function(l){ return l.module===m.id; });
      var req=ls.filter(function(l){ return l.published && !l.optional; });
      var n=req.filter(function(l){ return done.indexOf(l.key)!==-1; }).length;
      var items=ls.map(function(l){
        return olItem({ num:l.key.replace('m','').replace('-','.'), title:l.title, href:l.published ? lessonHref(l.key) : null, done:done.indexOf(l.key)!==-1,
          here:l.key===key, soon:!l.published, tag:l.optional ? 'Optional' : '' });
      });
      html+=olGroup(m.id, 'Module '+m.n+' · '+m.label, req.length ? n+'/'+req.length : '', items, !!here && here.module===m.id);
    });
    var practice=sbody.filter(function(s){ return s.id==='assess' || s.id==='cert'; }).map(function(s){
      return olItem({ title:s.name, href:s.href, done:s.done, tag:s.id==='cert' ? (s.ready ? 'Ready' : 'Locked') : '' });
    });
    if (!pr) practice.unshift('<li class="ai2-ol-note">Choose a learning depth in <a href="#progress" data-open-progress="true">progress</a> to unlock these.</li>');
    html+=olGroup('practice','Assessment & certificate','',practice,false);
    var rn=RESEARCH_KEYS.filter(function(k){ return done.indexOf(k)!==-1; }).length;
    var labs=RESEARCH.map(function(r,i){
      return olItem({ num:String(i+1), title:r.label, href:siteUrl('lessons/'+r.key+'.html'), done:done.indexOf(r.key)!==-1, here:r.key===key });
    });
    labs.unshift('<li class="ai2-ol-overview"><a href="'+siteUrl('pages/research-lab.html')+'">Research Lab overview</a></li>');
    html+=olGroup('research','Research Lab (optional)', rn ? rn+'/5' : '', labs, research);
    html+='<div class="ai2-ol-foot"><button type="button" class="ai2-ol-more" data-open-progress="true">Progress details</button></div>';
    body.innerHTML=html;
  }

  /* ---------- Account menu (every page) ---------- */

  function authApi(){ return window.AI2PracticeAuth || null; }
  function authOn(){ var c=window.AI2PRACTICE_FIREBASE; return !!(c && c.enabled); }
  function msOn(){ var c=window.AI2PRACTICE_FIREBASE; return authOn() && !!c.microsoft; }
  function providers(){ return msOn() ? 'Google, Microsoft or an email account' : 'Google or an email account'; }
  function authState(){ var a=authApi(); return a ? a.state() : { ready:false, user:null }; }
  function createAccount(){
    var host=document.querySelector('.site-nav .nav-inner') || document.querySelector('.site-header .navbar');
    if (!host || document.getElementById('ai2Acct')) return;
    var box=document.createElement('div');
    box.className='ai2-acct'; box.id='ai2Acct';
    box.innerHTML=''+
      '<button type="button" class="ai2-acct-btn" id="ai2AcctBtn" aria-expanded="false" aria-controls="ai2AcctMenu" aria-haspopup="dialog">'+
        '<span id="ai2AcctRing"></span><span class="ai2-acct-pct" id="ai2AcctPct">0%</span>'+
        '<span class="ai2-avatar" id="ai2AcctAvatar" aria-hidden="true"></span><span class="ai2-sr" id="ai2AcctSr">Your progress and account</span>'+
      '</button>'+
      '<div class="ai2-acct-menu" id="ai2AcctMenu" role="dialog" aria-label="Your progress and account" hidden></div>';
    var toggle=host.querySelector('.menu-toggle, .nav-toggle');
    host.insertBefore(box, toggle || null);
    host.classList.add('ai2-acct-host');
    document.getElementById('ai2AcctBtn').addEventListener('click',function(e){ e.stopPropagation(); if(document.getElementById('ai2AcctMenu').hidden) openAccount(); else closeAccount(); });
    box.addEventListener('click',function(e){
      var a=e.target.closest('[data-ai2-act]'); if(!a) return;
      var act=a.getAttribute('data-ai2-act');
      if (act==='signin') { closeAccount(); openAuth('signin'); }
      else if (act==='signout') { authApi().signOut(); }
      else if (act==='delete') { deleteCloud(); }
    });
  }
  function openAccount(){
    var m=document.getElementById('ai2AcctMenu'); if(!m) return;
    m.hidden=false; renderAccount();
    document.getElementById('ai2AcctBtn').setAttribute('aria-expanded','true');
  }
  function closeAccount(){
    var m=document.getElementById('ai2AcctMenu'); if(!m || m.hidden) return;
    m.hidden=true; document.getElementById('ai2AcctBtn').setAttribute('aria-expanded','false');
  }
  function initials(u){ var s=(u.name || u.email || '?').trim(); return s.charAt(0).toUpperCase(); }
  function renderAccount(){
    var t=tally(), st=authState(), u=st.user;
    var ringEl=document.getElementById('ai2AcctRing');
    if (ringEl) {
      ringEl.innerHTML=ring(t.pct);
      document.getElementById('ai2AcctPct').textContent=t.pct+'%';
      var av=document.getElementById('ai2AcctAvatar');
      av.textContent=u ? initials(u) : ''; av.hidden=!u;
      document.getElementById('ai2AcctSr').textContent='Your progress: '+t.pct+'% complete'+(u ? ', signed in as '+(u.email||u.name) : '');
    }
    var sub=document.getElementById('ai2DrawerSub'), box=document.getElementById('ai2DrawerAcct');
    if (sub) sub.textContent=u ? 'Saved in this browser and synced to '+(u.email||'your account')+'.' : 'Saved automatically in this browser.';
    if (box) {
      box.hidden=!u && !authOn();
      box.innerHTML=u
        ? '<span class="ai2-avatar" aria-hidden="true">'+esc(initials(u))+'</span><p>Signed in as <strong>'+esc(u.email||u.name)+'</strong>. Your progress follows you to any device.</p>'
        : '<p>Sign in with '+providers()+' to keep your progress on any device.</p><button type="button" class="ai2-btn" data-ai2-act="signin"'+(st.ready ? '' : ' disabled')+'>Sign in</button>';
    }
    var m=document.getElementById('ai2AcctMenu'); if(!m || m.hidden) return;
    var c=continueTarget();
    var next=c.open
      ? '<button type="button" class="ai2-btn ai2-btn-primary" data-open-progress="true">'+esc(c.label)+'</button>'
      : '<a class="ai2-btn ai2-btn-primary" href="'+c.href+'">'+esc(c.label)+' &rarr;</a>';
    var acc;
    if (u) {
      acc='<div class="ai2-am-user"><span class="ai2-avatar ai2-avatar-lg" aria-hidden="true">'+esc(initials(u))+'</span><div><strong>'+esc(u.name || u.email)+'</strong>'+(u.name && u.email ? '<small>'+esc(u.email)+'</small>' : '')+'</div></div>'+
        '<p class="ai2-am-sync'+(st.error?' err':'')+'">'+esc(st.error || (st.syncing ? 'Syncing…' : 'Progress synced to your account'))+'</p>'+
        '<div class="ai2-am-row"><button type="button" class="ai2-btn" data-ai2-act="signout">Sign out</button><button type="button" class="ai2-am-danger" data-ai2-act="delete">Delete my saved data</button></div>';
    } else if (authOn()) {
      acc='<p class="ai2-am-note">Progress is saved in this browser. Sign in with '+providers()+' to keep it on any device.</p>'+
        '<button type="button" class="ai2-btn ai2-am-signin" data-ai2-act="signin"'+(st.ready ? '' : ' disabled')+'>'+(st.ready ? 'Sign in or create account' : (st.error ? 'Sign-in unavailable' : 'Loading sign-in…'))+'</button>'+
        (st.error ? '<p class="ai2-am-sync err">'+esc(st.error)+'</p>' : '');
    } else {
      acc='<p class="ai2-am-note">Progress is saved in this browser.</p>';
    }
    m.innerHTML=''+
      '<div class="ai2-am-head">'+ring(t.pct,'lg')+'<div><strong>'+t.pct+'% complete</strong><small>'+t.n+' of '+t.total+' '+t.label+(selectedPathway() ? ' · '+PATHWAYS[selectedPathway()].label+' depth' : '')+'</small></div></div>'+
      '<div class="ai2-am-next"><span>'+esc(c.eyebrow)+'</span><strong>'+esc(c.title)+'</strong>'+(c.note && !c.open ? '<small>'+esc(c.note)+'</small>' : '')+next+'</div>'+
      '<div class="ai2-am-links">'+
        '<a href="'+siteUrl('index.html#map')+'">Curriculum map</a>'+
        '<button type="button" data-open-progress="true">Progress details</button>'+
      '</div>'+
      '<div class="ai2-am-acc">'+acc+'</div>';
  }
  function deleteCloud(){
    if (!window.confirm('Delete the progress saved to your account and remove the account? Progress in this browser stays.')) return;
    authApi().deleteData().then(function(msg){ closeAccount(); flashSaved('Deleted'); if (msg) window.alert(msg); }, function(e){ window.alert(authApi().message(e)); });
  }

  /* ---------- Sign-in dialog ---------- */

  var authMode='signin';
  function createAuth(){
    if (document.getElementById('ai2Auth')) return;
    var d=document.createElement('div');
    d.id='ai2Auth'; d.className='ai2-auth'; d.hidden=true;
    d.innerHTML=''+
      '<div class="ai2-auth-card" role="dialog" aria-modal="true" aria-labelledby="ai2AuthTitle">'+
        '<button type="button" class="ai2-auth-x" id="ai2AuthClose" aria-label="Close">&times;</button>'+
        '<h2 id="ai2AuthTitle">Sign in</h2>'+
        '<p class="ai2-auth-lede" id="ai2AuthLede">Keep your lesson progress on any device.</p>'+
        '<button type="button" class="ai2-auth-google" id="ai2AuthGoogle">'+GOOGLE+'<span>Continue with Google</span></button>'+
        (msOn() ? '<button type="button" class="ai2-auth-google ai2-auth-ms" id="ai2AuthMicrosoft">'+MICROSOFT+'<span>Continue with Microsoft</span></button>' : '')+
        '<div class="ai2-auth-or"><span>or use email</span></div>'+
        '<form id="ai2AuthForm" novalidate>'+
          '<label for="ai2AuthEmail">Email</label><input id="ai2AuthEmail" type="email" autocomplete="email" required>'+
          '<label for="ai2AuthPw">Password</label><input id="ai2AuthPw" type="password" autocomplete="current-password" minlength="6" required>'+
          '<small class="ai2-auth-hint" id="ai2AuthHint" hidden>At least 6 characters.</small>'+
          '<button type="submit" class="ai2-auth-submit" id="ai2AuthSubmit">Sign in</button>'+
        '</form>'+
        '<p class="ai2-auth-status" id="ai2AuthStatus" role="status" aria-live="polite"></p>'+
        '<div class="ai2-auth-alt"><button type="button" id="ai2AuthSwitch">New here? Create an account</button><button type="button" id="ai2AuthReset">Forgot password?</button></div>'+
        '<p class="ai2-auth-fine">We store your email and your course progress, nothing else. Progress already in this browser is added to your account. You can delete it at any time from the progress menu.</p>'+
      '</div>';
    document.body.appendChild(d);
    function status(msg, ok){ var s=document.getElementById('ai2AuthStatus'); s.textContent=msg||''; s.className='ai2-auth-status'+(msg ? (ok?' ok':' err') : ''); }
    function busy(on){ ['ai2AuthGoogle','ai2AuthMicrosoft','ai2AuthSubmit'].forEach(function(id){ var b=document.getElementById(id); if(b) b.disabled=on; }); }
    function fail(e){ busy(false); status(authApi().message(e), false); }
    function done(){ var a=pendingStart; busy(false); closeAuth(); flashSaved('Signed in'); if (a) { startPass=a; a.click(); } }
    d.addEventListener('click',function(e){ if(e.target===d) closeAuth(); });
    document.getElementById('ai2AuthClose').addEventListener('click',closeAuth);
    document.getElementById('ai2AuthGoogle').addEventListener('click',function(){ status(''); busy(true); authApi().google().then(done,fail); });
    var ms=document.getElementById('ai2AuthMicrosoft');
    if (ms) ms.addEventListener('click',function(){ status(''); busy(true); authApi().microsoft().then(done,fail); });
    document.getElementById('ai2AuthSwitch').addEventListener('click',function(){ setAuthMode(authMode==='signin' ? 'signup' : 'signin'); status(''); });
    document.getElementById('ai2AuthReset').addEventListener('click',function(){
      var email=document.getElementById('ai2AuthEmail').value.trim();
      if (!email) { status('Enter your email above, then choose "Forgot password?" again.', false); document.getElementById('ai2AuthEmail').focus(); return; }
      authApi().reset(email).then(function(){ status('If an account exists for '+email+', a reset link is on its way. Check your spam folder too.', true); }, fail);
    });
    document.getElementById('ai2AuthForm').addEventListener('submit',function(e){
      e.preventDefault();
      var email=document.getElementById('ai2AuthEmail').value.trim(), pw=document.getElementById('ai2AuthPw').value;
      if (!email || !pw) { status('Enter your email and a password.', false); return; }
      if (authMode==='signup' && pw.length<6) { status('Use a password of at least 6 characters.', false); return; }
      status(''); busy(true);
      (authMode==='signup' ? authApi().signUp(email,pw) : authApi().signIn(email,pw)).then(done,fail);
    });
  }
  function setAuthMode(m){
    authMode=m; var up=m==='signup';
    document.getElementById('ai2AuthTitle').textContent=up ? 'Create an account' : 'Sign in';
    document.getElementById('ai2AuthSubmit').textContent=up ? 'Create account' : 'Sign in';
    document.getElementById('ai2AuthSwitch').textContent=up ? 'Have an account? Sign in' : 'New here? Create an account';
    document.getElementById('ai2AuthReset').hidden=up;
    document.getElementById('ai2AuthHint').hidden=!up;
    document.getElementById('ai2AuthPw').setAttribute('autocomplete', up ? 'new-password' : 'current-password');
  }
  function openAuth(m, lede){
    if (!authApi()) return;
    createAuth(); setAuthMode(m||'signin');
    document.getElementById('ai2AuthLede').textContent=lede || 'Keep your lesson progress on any device.';
    lastFocus=document.activeElement;
    document.getElementById('ai2Auth').hidden=false;
    document.documentElement.classList.add('ai2-modal-open');
    setTimeout(function(){ document.getElementById('ai2AuthGoogle').focus({preventScroll:true}); },20);
  }
  function closeAuth(){
    var d=document.getElementById('ai2Auth'); if(!d || d.hidden) return;
    pendingStart=null;
    d.hidden=true; document.documentElement.classList.remove('ai2-modal-open');
    document.getElementById('ai2AuthPw').value='';
    if (lastFocus && lastFocus.focus) lastFocus.focus({preventScroll:true});
  }

  /* ---------- Sign-in gate ----------
     When sign-in is on, lessons, the assessment and the certificate need an account, and the
     Start button asks for sign-in before the depth picker opens. Overview pages stay open.
     With sign-in off (enabled:false or no config), nothing is gated. */

  var GATE_LEDE='Sign in or create a free account to start the course.';
  var gate=null, gateInert=[], cfgLoaded=false, authFailed=false, pendingStart=null, startPass=null;
  // Set while an account is signed in, so the next page skips the "Checking sign-in" cover
  // and only shows the gate if Firebase then reports no user.
  var SIGNED_KEY='ai2practice_signed_in_v1';
  function signedHint(){ try { return localStorage.getItem(SIGNED_KEY)==='1'; } catch(e) { return false; } }
  function rememberSignedIn(st){
    try { if (st.user) localStorage.setItem(SIGNED_KEY,'1'); else if (st.ready) localStorage.removeItem(SIGNED_KEY); } catch(e) {}
  }
  function gatedPage(){ return /^(lessons\/[^\/]+\.html|assessment\.html|certificate\.html)$/.test(relativePath()); }
  function createGate(){
    if (gate) return;
    gate=document.createElement('div'); gate.id='ai2Gate'; gate.className='ai2-gate';
    // Inline cover so the lesson can't be read before progress.css arrives.
    gate.style.cssText='position:fixed;inset:0;z-index:1300;background:#f6f8fa;';
    // While sign-in is being checked, show a grey outline of the lesson page instead of the card.
    gate.classList.add('is-checking');
    var line=function(w){ return '<i style="width:'+w+'%"></i>'; };
    gate.innerHTML='<div class="ai2-skel" aria-hidden="true">'+
      '<div class="ai2-skel-head"><b></b><span><i></i><i></i><i></i><i></i></span></div>'+
      '<div class="ai2-skel-body"><div class="ai2-skel-side">'+line(70)+line(90)+line(60)+line(85)+line(75)+line(90)+line(55)+'</div>'+
      '<div class="ai2-skel-main"><em class="k"></em><em class="t"></em>'+line(100)+line(96)+line(88)+line(93)+'<em class="f"></em>'+line(100)+line(82)+'</div></div>'+
      '<span class="ai2-sr">Checking sign-in…</span></div>'+
      '<div class="ai2-gate-card" role="dialog" aria-modal="true" aria-labelledby="ai2GateTitle" aria-describedby="ai2GateText">'+
      '<span class="ai2-gate-brand">AI2Practice</span>'+
      '<h2 id="ai2GateTitle">Sign in to start the course</h2>'+
      '<p id="ai2GateText">Checking sign-in…</p>'+
      '<button type="button" class="ai2-btn ai2-btn-primary" id="ai2GateBtn" hidden>Sign in or create account</button>'+
      '<a class="ai2-gate-home" href="'+siteUrl('index.html')+'">Back to the home page</a>'+
    '</div>';
    document.body.appendChild(gate);
    // Keep keyboard focus out of the page behind the cover.
    Array.prototype.forEach.call(document.body.children,function(el){
      if (el!==gate && el.id!=='ai2Auth' && !el.inert) { el.inert=true; gateInert.push(el); }
    });
    document.getElementById('ai2GateBtn').addEventListener('click',function(){
      if (authFailed || authState().error) window.location.reload(); else openAuth('signin', GATE_LEDE);
    });
  }
  function liftGate(){
    if (!gate) return;
    var g=gate; gate=null;
    if (g.classList.contains('is-checking') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      g.classList.add('is-leaving'); setTimeout(function(){ g.remove(); },200);
    } else g.remove();
    gateInert.forEach(function(el){ el.inert=false; }); gateInert=[];
  }
  function renderGate(){
    var st=authState();
    rememberSignedIn(st);
    if (!gatedPage()) return;
    if (cfgLoaded && !authOn()) { liftGate(); return; }
    if (st.user) { liftGate(); return; }
    if (st.ready) createGate();
    if (!gate) return;
    var text, btn=null;
    if (!cfgLoaded) text='Checking sign-in…';
    else if (authFailed || (st.error && !st.ready)) { text='Sign-in could not load. Check your internet connection and try again.'; btn='Try again'; }
    else if (!st.ready) text='Checking sign-in…';
    else { text='The course needs a free account so your progress is saved and your certificate carries your name. Use '+providers()+'.'; btn='Sign in or create account'; }
    gate.classList.toggle('is-checking', !btn);
    document.getElementById('ai2GateText').textContent=text;
    var b=document.getElementById('ai2GateBtn'), show=!!btn;
    if (show) b.textContent=btn;
    if (show && b.hidden) setTimeout(function(){ if (!document.getElementById('ai2Auth') || document.getElementById('ai2Auth').hidden) b.focus({preventScroll:true}); },20);
    b.hidden=!show;
  }

  /* ---------- Render ---------- */

  function renderPlan(){
    var el=document.getElementById('ai2Plan'); if(!el) return;
    var plan=activePlan();
    if (!plan) { el.hidden=true; el.innerHTML=''; return; }
    var bits=[plan.lessons.length+' lesson'+(plan.lessons.length===1?'':'s')];
    if (plan.assessment) bits.push('assessment');
    el.hidden=false;
    el.innerHTML='<div><span>'+(plan.self ? 'Your plan' : 'Assigned plan')+'</span><strong>'+esc(plan.title || (plan.self ? 'Lessons you chose' : 'Plan from your educator'))+'</strong><small>'+esc(bits.join(' · '))+(plan.depth ? ' · '+esc(PATHWAYS[plan.depth].label)+' depth' : '')+'. Your certificate covers exactly these items.</small></div><button type="button" class="ai2-plan-leave" id="ai2LeavePlan">'+(plan.self ? 'Clear plan' : 'Leave plan')+'</button>';
    document.getElementById('ai2LeavePlan').onclick=function(){
      if (window.confirm(plan.self ? 'Clear the lessons you picked? Your completed lessons stay saved; the full curriculum becomes your pathway again.' : 'Leave this assigned plan? Your completed lessons stay saved; the full curriculum becomes your pathway again.')) leavePlan();
    };
  }
  function renderContinue(){
    var el=document.getElementById('ai2Continue'); if(!el) return;
    var r=resumeTarget(), n=nextStep();
    if (r) {
      el.innerHTML='<div><span>Pick up where you left off</span><strong>'+esc(r.title)+'</strong><small>'+(r.pct?r.pct+'% read':'Started')+'</small></div><a class="ai2-btn ai2-btn-primary" href="'+siteUrl(r.path)+'#ai2-resume">Resume &rarr;</a>';
    } else if (n.choose) {
      el.innerHTML='<div><span>'+esc(n.eyebrow)+'</span><strong>'+esc(n.title)+'</strong><small>'+esc(n.note)+'</small></div>';
    } else {
      el.innerHTML='<div><span>'+esc(n.eyebrow)+'</span><strong>'+esc(n.title)+'</strong>'+(n.note?'<small>'+esc(n.note)+'</small>':'')+'</div><a class="ai2-btn ai2-btn-primary" href="'+n.href+'">'+esc(n.label)+' &rarr;</a>';
    }
  }
  // [data-ai2-resume] slots (home hero, curriculum page): shown once the learner has started.
  function renderResume(){
    var slots=document.querySelectorAll('[data-ai2-resume]'); if(!slots.length) return;
    var r=resumeTarget(), done=completed().filter(function(k){ return LESSON_KEYS.indexOf(k)!==-1; }).length, html='';
    if (r) {
      var rl=lessonByKey(r.key), num=rl ? rl.key.replace('m','').replace('-','.')+' · ' : '';
      html='<a class="ai2-resume" href="'+siteUrl(r.path)+'#ai2-resume">'+ring(r.pct||0,'md')+
        '<span class="ai2-resume-text"><small>Pick up where you left off'+(r.pct ? ' · '+r.pct+'% read' : '')+'</small><strong>'+esc(num+r.title)+'</strong></span>'+
        '<span class="ai2-resume-go">Resume &rarr;</span></a>';
    } else if (done) {
      var n=nextStep();
      if (!n.choose) html='<a class="ai2-resume" href="'+n.href+'">'+ring(tally().pct,'md')+
        '<span class="ai2-resume-text"><small>'+esc(n.eyebrow)+'</small><strong>'+esc(n.title)+'</strong></span>'+
        '<span class="ai2-resume-go">'+esc(n.label)+' &rarr;</span></a>';
    }
    slots.forEach(function(el){ el.innerHTML=html; el.hidden=!html; });
  }
  function renderStepList(){
    var el=document.getElementById('ai2StepList'); if(!el) return;
    var S=steps(), active=activeIndex(S);
    el.innerHTML=S.map(function(s,i){
      var cls=(s.done?'done':'')+(s.locked?' locked':'')+(i===active?' is-active':'');
      var action;
      if (s.depth) action='';
      else if (s.id==='cert' && s.ready) action='<a class="ai2-btn ai2-btn-primary" href="'+s.href+'">Generate</a>';
      else if (s.done) action='<a href="'+(s.href||'#')+'">Review</a>';
      else if (s.href) action='<a href="'+s.href+'">'+(i===active?'Continue':'Open')+' &rarr;</a>';
      else action='';
      var mark='<span class="ai2-check">'+(s.done?CHECK:'')+'</span>', body='<small>'+esc(s.note)+'</small>';
      if (s.lessons) {
        var pct=Math.round(s.doneCount/s.keys.length*100);
        if (!s.done && s.doneCount) mark='<span class="ai2-check part" style="--p:'+pct+'"></span>';
        body='<div class="ai2-d-meter"><span class="ai2-mc-segs" aria-hidden="true">'+s.lessons.map(function(l){ return '<i class="'+(l.done?'on':'')+'"></i>'; }).join('')+'</span><small>'+esc(s.note)+'</small></div>'+stepLessons(s, i===active);
      }
      return '<li class="'+cls+'">'+mark+'<div><strong>'+esc(s.name)+'</strong>'+body+'</div>'+action+'</li>';
    }).join('');
    var p=selectedPathway();
    if (shell) shell.querySelectorAll('.ai2-depth [data-ai2-pathway]').forEach(function(b){ b.setAttribute('aria-pressed', b.getAttribute('data-ai2-pathway')===p ? 'true':'false'); });
  }
  // A module's lessons inside the progress dialog: the plan's lessons, or every lesson in the module
  // (in-development ones greyed out). Open by default for the current module.
  function stepLessons(s, isActive){
    var r=resumeTarget(), done=completed(), plan=activePlan();
    var ls=plan ? s.keys.map(lessonByKey) : LESSONS.filter(function(l){ return l.module===s.id; });
    var items=ls.map(function(l){
      var reading=r && r.key===l.key;
      return olItem({ num:l.key.replace('m','').replace('-','.'), title:l.title, href:l.published ? (reading ? siteUrl(r.path)+'#ai2-resume' : lessonHref(l.key)) : null,
        done:done.indexOf(l.key)!==-1, soon:!l.published, tag:l.optional ? 'Optional' : (reading ? (r.pct ? r.pct+'% read' : 'Started') : '') });
    });
    var open=s.id in stepOpen ? stepOpen[s.id] : isActive;
    return '<details class="ai2-d-lessons" data-step="'+s.id+'"'+(open?' open':'')+'><summary>Lessons</summary><ol class="ai2-ol-list">'+items.join('')+'</ol></details>';
  }
  // At-a-glance numbers at the top of the progress dialog.
  function renderSummary(){
    var el=document.getElementById('ai2Summary'); if(!el) return;
    var t=tally(), R=requirements(), p=selectedPathway(), stats=[];
    stats.push(['Lessons', t.n+' of '+t.total, t.total && t.n===t.total]);
    if (R.assessment) {
      var a=assessmentRecord(p), sc=Number(a.bestScore) ? Math.round(a.bestScore) : null;
      stats.push(['Assessment', a.passed ? 'Passed · '+sc+'%' : (sc!==null ? 'Best '+sc+'%' : 'Not taken'), !!a.passed]);
    }
    el.innerHTML='<div class="ai2-sum-main">'+ring(t.pct,'lg')+'<div><strong>'+t.pct+'%</strong><small>of '+t.label+' complete</small></div></div>'+
      '<dl class="ai2-sum-stats">'+stats.map(function(x){ return '<div'+(x[2]?' class="ok"':'')+'><dt>'+x[0]+'</dt><dd>'+(x[2]?CHECK+' ':'')+esc(x[1])+'</dd></div>'; }).join('')+'</dl>';
  }

  /* ---------- Home curriculum map ---------- */

  // index.html tags each map stop with data-ai2-stop. Finished stops fill in, a module fills one
  // slice per finished lesson (the lesson being read shows as a pale slice), and the learner's
  // current step sends out a ripple.
  var SVGNS='http://www.w3.org/2000/svg';
  var DEPTH_COLOR={ beginner:'var(--route-beg)', intermediate:'var(--route-int)', advanced:'var(--route-adv)' };
  function svgEl(tag, attrs){ var el=document.createElementNS(SVGNS,tag); Object.keys(attrs).forEach(function(k){ el.setAttribute(k,attrs[k]); }); return el; }
  function slicePath(cx, cy, r, a0, a1){
    function pt(a){ return (cx+r*Math.cos(a)).toFixed(2)+' '+(cy+r*Math.sin(a)).toFixed(2); }
    return 'M'+cx+' '+cy+'L'+pt(a0)+'A'+r+' '+r+' 0 '+(a1-a0>Math.PI?1:0)+' 1 '+pt(a1)+'Z';
  }
  function mapStopState(id, S, p){
    var done=completed(), r=resumeTarget(), m;
    if ((m=id.match(/^depth-(\w+)$/))) return { full:p===m[1], text:p===m[1] ? 'Your learning depth' : '' };
    if (/^m[1-3]$/.test(id)) {
      var st=S.filter(function(x){ return x.id===id; })[0];
      var keys=st ? st.keys : LESSONS.filter(function(l){ return l.module===id && l.published && !l.optional; }).map(function(l){ return l.key; });
      var n=keys.filter(function(k){ return done.indexOf(k)!==-1; }).length;
      return { full:!!keys.length && n===keys.length, keys:keys, done:done, reading:r && keys.indexOf(r.key)!==-1 ? r.key : null,
        text:!keys.length ? '' : (n===keys.length ? 'Complete' : n+' of '+keys.length+' lessons complete') };
    }
    if (id==='assess') {
      var a=assessmentRecord(p), sc=Number(a.bestScore) ? Math.round(a.bestScore) : null;
      return { full:!!a.passed, text:a.passed ? 'Passed, '+sc+'%' : (sc!==null ? 'Best '+sc+'%, pass at 80%' : '') };
    }
    if (id==='cert') { var ok=eligible(p); return { full:ok, text:ok ? 'Ready to generate' : '' }; }
    if (id.indexOf('research-')===0) return { full:done.indexOf(id)!==-1, text:done.indexOf(id)!==-1 ? 'Complete' : '' };
    return { full:false, text:'' };
  }
  function renderHomeMap(){
    var svg=document.querySelector('.map-wrap svg'); if(!svg) return;
    var S=steps(), p=selectedPathway(), cur=S[activeIndex(S)];
    var here=cur.id==='depth' ? 'depth-beginner' : cur.id;
    svg.querySelectorAll('a[data-ai2-stop]').forEach(function(a){
      var id=a.getAttribute('data-ai2-stop'), dot=a.querySelector('circle:not(.hit):not(.beacon)'); if(!dot) return;
      ['fill','stroke','stroke-dasharray'].forEach(function(k){ var o='data-ai2-'+k; if(!dot.hasAttribute(o)) dot.setAttribute(o, dot.getAttribute(k)||''); var v=dot.getAttribute(o); if(v) dot.setAttribute(k,v); else dot.removeAttribute(k); });
      a.querySelectorAll('.beacon, .ai2-map-fill').forEach(function(el){ el.remove(); });
      var state=mapStopState(id, S, p), cx=+dot.getAttribute('cx'), cy=+dot.getAttribute('cy'), r=+dot.getAttribute('r');
      var color=id.indexOf('depth-')===0 ? DEPTH_COLOR[id.slice(6)] : dot.getAttribute('stroke');
      var g=svgEl('g',{ 'class':'ai2-map-fill', 'aria-hidden':'true' });
      if (state.full) {
        dot.setAttribute('fill',color); dot.setAttribute('stroke',color); dot.removeAttribute('stroke-dasharray');
        var k=r*.42;
        g.appendChild(svgEl('path',{ d:'M'+(cx-k)+' '+(cy+k*.05)+'L'+(cx-k*.3)+' '+(cy+k*.72)+'L'+(cx+k)+' '+(cy-k*.62), fill:'none', stroke:'#fff', 'stroke-width':Math.max(2.4,r*.16), 'stroke-linecap':'round', 'stroke-linejoin':'round' }));
      } else if (state.keys && state.keys.length) {
        // Slices reach the middle of the ring and the ring is redrawn on top, so no seam shows at its inner edge.
        var n=state.keys.length, sw=+dot.getAttribute('stroke-width')||4, step=2*Math.PI/n, a0=-Math.PI/2;
        // Neighbouring slices in the same state are drawn as one shape, so no seams show between them.
        var kinds=state.keys.map(function(key){ return state.done.indexOf(key)!==-1 ? 'on' : (key===state.reading ? 'pale' : ''); });
        for (var i=0, j; i<n; i=j) {
          for (j=i+1; j<n && kinds[j]===kinds[i]; j++) {}
          if (!kinds[i]) continue;
          var shape=j-i===n ? svgEl('circle',{ cx:cx, cy:cy, r:r }) : svgEl('path',{ d:slicePath(cx,cy,r,a0+i*step,a0+j*step) });
          shape.setAttribute('fill',color);
          if (kinds[i]==='pale') shape.setAttribute('fill-opacity','.3');
          g.appendChild(shape);
        }
        if (g.firstChild) g.appendChild(svgEl('circle',{ 'class':'ai2-map-ring', cx:cx, cy:cy, r:r, fill:'none', stroke:color, 'stroke-width':sw }));
      }
      dot.parentNode.insertBefore(g, dot.nextSibling);
      // The ripple starts at the outer edge of the stop; the stop itself stays solid.
      if (id===here) dot.parentNode.insertBefore(svgEl('circle',{ 'class':'beacon', cx:cx, cy:cy, r:r+(+dot.getAttribute('stroke-width')||4)/2, fill:'none', stroke:color, 'stroke-width':2.5 }), dot);
      a.classList.toggle('ai2-here', id===here);
      if (!a.hasAttribute('data-ai2-name')) a.setAttribute('data-ai2-name', a.getAttribute('aria-label') || (a.querySelector('title') ? a.querySelector('title').textContent : ''));
      var bits=[state.text, id===here ? 'Your next step' : ''].filter(Boolean);
      a.setAttribute('aria-label', a.getAttribute('data-ai2-name')+(bits.length ? '. '+bits.join('. ')+'.' : ''));
      if (a.classList.contains('map-module-stop')) a.setAttribute('data-ai2-progress', (state.text && state.text.indexOf('0 of')!==0 ? state.text : 'Not started')+(id===here ? ' · your next step' : ''));
    });
    // Narrow screens use the list version of the map.
    document.querySelectorAll('.mobile-map li[data-ai2-stop]').forEach(function(li){
      var id=li.getAttribute('data-ai2-stop'), st=/^m[1-3]$/.test(id) ? mapStopState(id,S,p) : null;
      var isDone=id==='depth' ? !!p : (id==='practice' ? eligible(p) : !!(st && st.full));
      var isHere=id==='practice' ? /^(assess|cert)$/.test(cur.id) : cur.id===id;
      li.classList.toggle('ai2-done', isDone); li.classList.toggle('ai2-here', isHere);
      if (st && st.keys.length && !st.full) li.setAttribute('data-ai2-progress', st.done.filter(function(k){ return st.keys.indexOf(k)!==-1; }).length+'/'+st.keys.length); else li.removeAttribute('data-ai2-progress');
    });
  }

  function renderOptional(){
    var el=document.getElementById('ai2ResearchStatus'); if(!el)return;
    var done=completed(), n=RESEARCH_KEYS.filter(function(k){return done.indexOf(k)!==-1;}).length;
    el.textContent=n ? n+'/5' : '';
  }
  // Pages can include a "next step" card: [data-ai2-next] with optional
  // [data-ai2-next-eyebrow], [data-ai2-next-title], [data-ai2-next-note] and a [data-ai2-next-link].
  function renderNextTargets(){
    var n=nextStep(), p=selectedPathway();
    document.querySelectorAll('[data-ai2-next]').forEach(function(card){
      var t=card.querySelector('[data-ai2-next-title]'), e=card.querySelector('[data-ai2-next-eyebrow]'), no=card.querySelector('[data-ai2-next-note]'), a=card.querySelector('[data-ai2-next-link]');
      if (e) e.textContent=n.eyebrow;
      if (t) t.textContent=n.title;
      if (no) no.textContent=n.note || (p ? PATHWAYS[p].description : 'Finish the core lessons and pick a learning depth to unlock the assessment and your certificate.');
      if (a) {
        a.innerHTML=esc(n.choose ? 'See all steps' : n.label)+' &rarr;';
        if (n.choose) { a.href='#progress'; a.setAttribute('data-open-progress','true'); }
        else { a.href=n.href; a.removeAttribute('data-open-progress'); }
      }
      card.querySelectorAll('[data-ai2-set-pathway]').forEach(function(b){ b.setAttribute('aria-pressed', b.getAttribute('data-ai2-set-pathway')===p ? 'true':'false'); });
    });
  }
  function render(){ renderOutline(); renderAccount(); renderHomeMap(); renderSummary(); renderPlan(); renderContinue(); renderStepList(); renderOptional(); renderNextTargets(); renderResume(); }

  /* ---------- Actions ---------- */

  function resetProgress(){
    if(!window.confirm('Reset all AI2Practice progress in this browser?'+(authState().user ? ' Progress saved to your account comes back the next time you sign in.' : ' This cannot be undone.')))return;
    [COMPLETED_KEY,ASSESS_KEY,PATHWAY_KEY,RESUME_KEY].forEach(function(k){ try { localStorage.removeItem(k); } catch(e) {} });
    try { for(var i=localStorage.length-1;i>=0;i--){var k=localStorage.key(i);if(k&&k.indexOf(CKPT_PREFIX)===0)localStorage.removeItem(k);} } catch(e) {}
    render(); notify(); flashSaved('Reset');
  }
  function bindPanel(){
    document.getElementById('ai2CloseDrawer').addEventListener('click',closeDrawer);
    document.getElementById('ai2ResetProgress').addEventListener('click',resetProgress);
    document.getElementById('ai2DrawerAcct').addEventListener('click',function(e){
      if (e.target.closest('[data-ai2-act="signin"]')) { closeDrawer(); openAuth('signin'); }
    });
    shell.addEventListener('toggle',function(e){ var d=e.target; if(d.dataset && d.dataset.step) stepOpen[d.dataset.step]=d.open; },true);
  }

  function bind(){
    if (lessonKeyForPage()) {
      var t=null;
      window.addEventListener('scroll',function(){ if(!t) t=setTimeout(function(){ t=null; saveResume(); },800); },{passive:true});
      window.addEventListener('pagehide',saveResume);
      saveResume();
    }

    document.addEventListener('click',function(e){
      var t=e.target.closest ? e.target : null; if(!t) return;
      var setEl=t.closest('[data-ai2-set-pathway]');
      if(setEl){ e.preventDefault(); setPathway(setEl.getAttribute('data-ai2-set-pathway')); return; }
      var pathwayEl=t.closest('[data-progress-pathway],[data-ai2-pathway]');
      if(pathwayEl){
        var p=pathwayEl.getAttribute('data-progress-pathway')||pathwayEl.getAttribute('data-ai2-pathway');
        if(PATHWAYS[p]){ e.preventDefault(); setPathway(p); openDrawer(); }
        return;
      }
      var openEl=t.closest('[data-open-progress]');
      if(openEl){ e.preventDefault(); openDrawer(); return; }
      var drawer=document.getElementById('ai2ProgressDrawer');
      if(!drawer || drawer.hidden) return;
      if(!drawer.contains(t)) closeDrawer();
    });
    document.addEventListener('click',function(e){
      var box=document.getElementById('ai2Acct');
      if (box && !box.contains(e.target)) closeAccount();
    });
    document.addEventListener('keydown',function(e){
      if(e.key!=='Escape') return;
      var auth=document.getElementById('ai2Auth'), drawer=document.getElementById('ai2ProgressDrawer');
      if (auth && !auth.hidden) { closeAuth(); return; }
      if (drawer && !drawer.hidden) { closeDrawer(); return; }
      var m=document.getElementById('ai2AcctMenu');
      if (m && !m.hidden) { closeAccount(); document.getElementById('ai2AcctBtn').focus(); return; }
      if (document.body.classList.contains('ai2-outline-overlay')) setOutline(false,false);
    });

    window.addEventListener('storage',render);
    window.addEventListener('ai2practice:progress-changed',function(){ render(); flashSaved(); });
    window.addEventListener('ai2practice:auth-changed',function(){ renderAccount(); renderGate(); });
    // Start (the depth picker) asks for sign-in first; the picker opens once signed in.
    document.addEventListener('click',function(e){
      var a=e.target.closest && e.target.closest('[data-open-picker]'); if(!a) return;
      if (a===startPass) { startPass=null; return; }
      var st=authState();
      if (!authOn() || st.user || !st.ready) return;
      e.preventDefault(); e.stopImmediatePropagation();
      openAuth('signin', GATE_LEDE); pendingStart=a;
    },true);
  }

  // Core lesson pages: Prev/Next follow the learner's sequence (plan or published lessons),
  // and Next marks the lesson complete.
  function wireLessonNav(){
    var key=lessonKeyForPage(); if(!key || isResearchPage()) return;
    var prev=document.getElementById('les-prev'), next=document.getElementById('les-next');
    var seq=sequence(), i=seq.indexOf(key);
    if (i<0) {
      // Not in the sequence (e.g. outside an assigned plan): step through published lessons instead.
      seq=LESSONS.filter(function(l){ return l.published; }).map(function(l){ return l.key; }); i=seq.indexOf(key);
    }
    var l=lessonByKey(key), mod=moduleById(l.module);
    if (prev) {
      if (i>0) { prev.href=lessonHref(seq[i-1]); prev.innerHTML='&larr; '+esc(lessonByKey(seq[i-1]).title); }
      else { prev.href=siteUrl(mod.href); prev.innerHTML='&larr; Module '+mod.n+' overview'; }
      prev.style.display='';
    }
    if (next) {
      if (i<seq.length-1) {
        next.href=lessonHref(seq[i+1]); next.removeAttribute('data-open-progress');
        next.innerHTML='Mark complete &amp; continue &rarr;';
        next.title='Next: '+lessonByKey(seq[i+1]).title;
      } else {
        next.href='#progress'; next.setAttribute('data-open-progress','true');
        next.innerHTML='Mark complete &amp; view progress &rarr;';
      }
      next.addEventListener('click',function(){ markComplete(key); });
    }
  }

  function init(){
    var q=new URLSearchParams(window.location.search);
    var plan=planFromQuery(q), planArrived=false;
    if (plan) {
      store(PLAN_KEY, plan); planArrived=true;
      if (plan.depth) { try { localStorage.setItem(PATHWAY_KEY,plan.depth); } catch(e) {} }
      ['plan','depth','lessons','practice','title'].forEach(function(k){ q.delete(k); });
      var rest=q.toString();
      history.replaceState(null,'',window.location.pathname+(rest ? '?'+rest : '')+window.location.hash);
    }
    var requested=q.get('pathway');
    if(PATHWAYS[requested]){try{localStorage.setItem(PATHWAY_KEY,requested);}catch(e){}}
    completed(); // migrates stored lesson keys
    var styleLink=ensureStyles();
    if (lessonKeyForPage()) { createOutline(); restoreScrollIfRequested(); }
    createAccount();
    if (gatedPage() && !signedHint()) createGate();
    revealWhenStyled(styleLink);
    wireLessonNav();
    bind(); render();
    loadAuth();
    if(planArrived || q.get('progress')==='1' || window.location.hash==='#progress') openDrawer();
    try { window.dispatchEvent(new CustomEvent('ai2practice:ready')); } catch(e) {}
  }

  // Sign-in is off until assets/js/firebase-config.js sets enabled:true; then assets/js/auth.js loads.
  function loadScript(src, done){
    var s=document.createElement('script'); s.src=src; s.async=true;
    s.onload=function(){ done && done(true); }; s.onerror=function(){ done && done(false); };
    document.head.appendChild(s);
  }
  function preload(href){
    var l=document.createElement('link'); l.rel='preload'; l.as='script'; l.href=href;
    document.head.appendChild(l);
  }
  function loadAuth(){
    // Warm the cache for auth.js and the Firebase SDK while firebase-config.js loads.
    if (gatedPage() || document.querySelector('[data-open-picker]')) {
      preload(siteUrl('assets/js/auth.js')+VER);
      ['firebase-app-compat.js','firebase-auth-compat.js','firebase-firestore-compat.js'].forEach(function(f){ preload('https://www.gstatic.com/firebasejs/10.12.2/'+f); });
    }
    loadScript(siteUrl('assets/js/firebase-config.js')+VER, function(ok){
      cfgLoaded=true;
      if (!ok || !authOn()) { renderGate(); return; }
      renderAccount(); renderGate();
      loadScript(siteUrl('assets/js/auth.js')+VER, function(ok2){ if(!ok2) { authFailed=true; renderAccount(); renderGate(); } });
    });
  }

  window.AI2PracticeProgressRail={
    // Used by assets/js/auth.js to sync with the signed-in account.
    snapshot:snapshot, merge:function(obj){ mergeProgress(cleanSnapshot(obj)); }, openAuth:openAuth,
    open:openDrawer, render:render, setPathway:setPathway,
    // Read-only helpers for the certificate and educator pages.
    curriculum:function(){ return { modules:MODULES.slice(), lessons:LESSONS.map(function(l){ return Object.assign({},l); }), pathways:PATHWAY_ORDER.map(function(k){ return { id:k, label:PATHWAYS[k].label }; }) }; },
    requirements:requirements, eligible:eligible, selectedPathway:selectedPathway, completed:completed,
    assessmentRecord:assessmentRecord, activePlan:activePlan, setPlan:setPlan, leavePlan:leavePlan
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
