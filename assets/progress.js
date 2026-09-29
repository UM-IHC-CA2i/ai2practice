(function(){
  'use strict';

  if (window.AI2PracticeProgressRail) return;

  var scriptUrl = document.currentScript && document.currentScript.src
    ? document.currentScript.src
    : new URL('assets/progress.js', window.location.href).href;
  var siteRoot = new URL('../', scriptUrl);

  var COMPLETED_KEY = 'aiready_completed';
  var CASES_KEY = 'ai2practice_cases_v1';
  var ASSESS_KEY = 'ai2practice_assessments_v1';
  var PATHWAY_KEY = 'ai2practice_pathway_v1';
  var RESUME_KEY = 'ai2practice_resume_v1';
  var CKPT_PREFIX = 'aiready_ckpt_';

  var CORE = [
    { key:'lesson-2', module:'Module 1 - Fundamentals of AI', title:'What is AI?', href:'lessons/lesson-2.html' },
    { key:'lesson-3', module:'Module 2 - Radiology AI: Data, Systems & Workflow', title:'Where AI fits in radiology workflow', href:'lessons/lesson-3.html' },
    { key:'lesson-4', module:'Module 3 - AI in Clinical Practice', title:'Can I Trust This AI?', href:'lessons/lesson-4.html' },
    { key:'lesson-1', module:'Module 3 - AI in Clinical Practice', title:'AI, Expertise & Clinical Skill', href:'lessons/lesson-1.html' }
  ];
  var CORE_KEYS = CORE.map(function(x){ return x.key; });
  var RESEARCH_KEYS = ['research-1','research-2','research-3','research-4','research-5'];
  var RESEARCH = [
    { key:'research-1', label:'Environment', name:'Research 1 · Setting Up Your AI Research Environment' },
    { key:'research-2', label:'Data Science', name:'Research 2 · Data Science and AI Evaluation' },
    { key:'research-3', label:'Machine Learning', name:'Research 3 · Machine Learning and Image Processing' },
    { key:'research-4', label:'Advanced AI', name:'Research 4 · Advanced Image AI and NLP' },
    { key:'research-5', label:'Project', name:'Research 5 · Mini Research Project' }
  ];
  // Bit order for resume codes. Never reorder; append only (and bump CODE_VERSION).
  var CODE_LESSONS = ['lesson-1','lesson-2','lesson-3','lesson-4','lesson-5'].concat(RESEARCH_KEYS);
  var CODE_VERSION = 1;
  var CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

  var PATHWAY_ORDER = ['beginner','intermediate','advanced'];
  var PATHWAYS = {
    beginner: {
      label:'Beginner', track:'student',
      description:'The required core, beginner applied cases, and the foundational assessment.',
      caseHref:'student-cases.html?level=medical_student&pathway=beginner',
      assessmentHref:'student-assessment.html?pathway=beginner',
      caseLabel:'Beginner applied cases', assessmentLabel:'Foundational assessment'
    },
    intermediate: {
      label:'Intermediate', track:'resident',
      description:'The deeper radiology core, intermediate applied cases, and the radiology assessment.',
      caseHref:'resident-cases.html?level=radiology_resident&pathway=intermediate',
      assessmentHref:'resident-assessment.html?pathway=intermediate',
      caseLabel:'Intermediate applied cases', assessmentLabel:'Radiology assessment'
    },
    advanced: {
      label:'Advanced', track:'resident',
      description:'The deeper radiology core, advanced applied cases, and the radiology assessment.',
      caseHref:'resident-cases.html?level=attending&pathway=advanced',
      assessmentHref:'resident-assessment.html?pathway=advanced',
      caseLabel:'Advanced applied cases', assessmentLabel:'Radiology assessment'
    }
  };

  var CHECK = '<svg viewBox="0 0 12 12" width="11" height="11" fill="none" aria-hidden="true"><path d="M2.5 6.2 5 8.6l4.5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------- Paths & storage ---------- */

  function siteUrl(path){ return new URL(path, siteRoot).href; }
  function relativePath(){
    var rootPath = siteRoot.pathname.replace(/\/$/, '');
    var p = window.location.pathname;
    if (rootPath && p.indexOf(rootPath) === 0) p = p.slice(rootPath.length);
    return p.replace(/^\//, '') || 'index.html';
  }
  function lessonKeyForPage(){
    var m = relativePath().match(/^lessons\/((?:lesson|research)-[1-5])\.html$/);
    return m ? m[1] : null;
  }
  function ensureStyles(){
    var existing = document.querySelector('link[data-ai2-progress-style]');
    if (existing) return existing;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = siteUrl('assets/progress.css');
    link.setAttribute('data-ai2-progress-style','1');
    document.head.appendChild(link);
    return link;
  }
  // Keep the rail invisible until its stylesheet applies, then enable transitions.
  function revealWhenStyled(link){
    var shown=false;
    function show(){
      if (shown || !shell) return; shown=true;
      shell.style.visibility='';
      layout();
      requestAnimationFrame(function(){ shell.classList.add('ai2-ready'); });
    }
    var loaded=false;
    try { loaded=!!(link.sheet && link.sheet.cssRules.length); } catch(e) {}
    if (loaded) { show(); return; }
    shell.style.visibility='hidden';
    link.addEventListener('load',show);
    link.addEventListener('error',show);
    setTimeout(show,2500);
  }
  function safeJSON(key, fallback){
    try { var raw=localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch(e){ return fallback; }
  }
  function store(key, value){ try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {} }
  function completed(){
    var local = safeJSON(COMPLETED_KEY, []);
    if (!Array.isArray(local)) local = [];
    try {
      var legacy = sessionStorage.getItem(COMPLETED_KEY);
      if (legacy) {
        var old = JSON.parse(legacy);
        if (Array.isArray(old)) old.forEach(function(k){ if(local.indexOf(k)===-1) local.push(k); });
        localStorage.setItem(COMPLETED_KEY, JSON.stringify(local));
      }
    } catch(e) {}
    return local.filter(function(k){ return /^lesson-[1-5]$|^research-[1-5]$/.test(k); });
  }
  function cases(){ var x=safeJSON(CASES_KEY,{}); return x && typeof x==='object' && !Array.isArray(x) ? x : {}; }
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
  function coreDone(){ var done=completed(); return CORE_KEYS.every(function(k){ return done.indexOf(k)!==-1; }); }
  function pathwayEligible(p){ var cs=cases(), as=assessments(); return coreDone() && !!(cs[p] && cs[p].completed) && !!(as[p] && as[p].passed); }
  function depthTrack(p){ return PATHWAYS[p] ? PATHWAYS[p].track : 'student'; }
  function coreHref(item,p){
    var track=depthTrack(p || selectedPathway() || 'beginner');
    return siteUrl(item.href) + '?track=' + track + '&lessons=2,3,4,1' + (p ? '&pathway='+encodeURIComponent(p) : '');
  }
  function esc(s){ return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function notify(){ try { window.dispatchEvent(new CustomEvent('ai2practice:progress-changed')); } catch(e) {} }

  /* ---------- Pathway model ---------- */

  function steps(){
    var done=completed(), p=selectedPathway(), cs=cases(), as=assessments();
    function lessonStep(id, label, name, keys){
      var n=keys.filter(function(k){return done.indexOf(k)!==-1;}).length;
      var first=CORE.filter(function(c){return keys.indexOf(c.key)!==-1 && done.indexOf(c.key)===-1;})[0] || CORE.filter(function(c){return c.key===keys[0];})[0];
      var list=keys.map(function(k){ var c=CORE.filter(function(x){return x.key===k;})[0]; return { key:k, title:c.title, done:done.indexOf(k)!==-1, href:coreHref(c,p) }; });
      return { id:id, label:label, name:name, keys:keys, lessons:list, doneCount:n, done:n===keys.length, href:coreHref(first,p),
        note: keys.length>1 ? n+' of '+keys.length+' lessons' : (n ? 'Lesson complete' : first.title), nextTitle:first.title };
    }
    var caseDone=!!(p && cs[p] && cs[p].completed);
    var assessDone=!!(p && as[p] && as[p].passed);
    var score=p && as[p] && Number(as[p].bestScore) ? Math.round(as[p].bestScore) : null;
    var eligible=!!p && pathwayEligible(p);
    return [
      lessonStep('m1','Fundamentals','Module 1 · Fundamentals of AI',['lesson-2']),
      lessonStep('m2','Data & Workflow','Module 2 · Data, Systems & Workflow',['lesson-3']),
      lessonStep('m3','Clinical Practice','Module 3 · AI in Clinical Practice',['lesson-4','lesson-1']),
      { id:'cases', label:'Cases', name:p ? PATHWAYS[p].caseLabel : 'Applied cases', done:caseDone,
        href:p ? siteUrl(PATHWAYS[p].caseHref) : null, note:p ? (caseDone ? 'Complete' : 'Human-AI cases at your depth') : 'Choose a learning depth first' },
      { id:'assess', label:'Assessment', name:p ? PATHWAYS[p].assessmentLabel : 'Assessment', done:assessDone,
        href:p ? siteUrl(PATHWAYS[p].assessmentHref) : null, note:assessDone ? 'Passed · '+score+'%' : (score!==null ? 'Best '+score+'% · pass at 80%' : 'Pass at 80% or higher') },
      { id:'cert', label:'Certificate', name:'Completion certificate', done:false, ready:eligible, locked:!eligible,
        href:eligible ? siteUrl('certificate.html?pathway='+p) : null, note:eligible ? 'Ready to generate' : 'Unlocks when every step is done' }
    ];
  }
  function pageStepId(){
    var p=relativePath();
    if (/^lessons\/lesson-2\.html$/.test(p) || p==='modules/ai-fundamentals.html') return 'm1';
    if (/^lessons\/lesson-3\.html$/.test(p) || p==='modules/informatics.html') return 'm2';
    if (/^lessons\/lesson-[14]\.html$/.test(p) || p==='modules/clinical-practice.html') return 'm3';
    if (/-cases\.html$/.test(p)) return 'cases';
    if (/-assessment\.html$/.test(p)) return 'assess';
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
    if (!isResearchPage()) return steps().slice(0,3);
    var done=completed(), qs=window.location.search;
    return RESEARCH.map(function(r){
      var d=done.indexOf(r.key)!==-1;
      return { id:r.key, label:r.label, name:r.name, keys:[r.key], doneCount:d?1:0, done:d, href:siteUrl('lessons/'+r.key+'.html')+qs };
    });
  }
  function railActive(S){
    var key=lessonKeyForPage(), id=pageStepId();
    for (var i=0;i<S.length;i++) if (S[i].id===key || S[i].id===id) return i;
    return -1;
  }
  function nextStep(){
    var S=steps(), p=selectedPathway();
    var core=S.slice(0,3).filter(function(s){return !s.done;})[0];
    if (core) return { title:core.nextTitle, label:'Continue lesson', href:core.href, eyebrow:'Next: '+core.name };
    if (!p) return { choose:true, title:'Choose your learning depth', label:'Choose depth', eyebrow:'Core lessons complete', note:'Pick Beginner, Intermediate, or Advanced to unlock cases and the assessment.' };
    if (!S[3].done) return { title:S[3].name, label:'Start cases', href:S[3].href, eyebrow:'Next: applied cases' };
    if (!S[4].done) return { title:S[4].name, label:'Take assessment', href:S[4].href, eyebrow:'Next: assessment', note:'Pass score: 80% or higher.' };
    return { title:'Your certificate is ready', label:'Generate certificate', href:S[5].href, eyebrow:'All requirements complete', done:true };
  }

  /* ---------- Resume position (last lesson + how far in) ---------- */

  function readPct(){
    var h=document.documentElement.scrollHeight-window.innerHeight;
    return h>0 ? Math.max(0,Math.min(100,Math.round(window.scrollY/h*100))) : 0;
  }
  function saveResume(){
    var key=lessonKeyForPage(); if(!key) return;
    var core=CORE.filter(function(c){return c.key===key;})[0];
    var h1=document.querySelector('.les-hero h1') || document.querySelector('main h1, h1');
    var title=core ? core.title : (h1 ? h1.textContent.trim() : document.title);
    store(RESUME_KEY,{ key:key, path:relativePath()+window.location.search, title:title, pct:readPct(), at:Date.now() });
  }
  function resumeTarget(){
    var r=safeJSON(RESUME_KEY,null);
    if (!r || !r.key || !r.path || !/^lessons\//.test(r.path)) return null;
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

  /* ---------- Resume codes ---------- */

  function encodeProgress(){
    var done=completed(), p=selectedPathway(), cs=cases(), as=assessments();
    var v=0n, bit=0n;
    function put(value,width){ v |= (BigInt(value) & ((1n<<BigInt(width))-1n)) << bit; bit += BigInt(width); }
    put(CODE_VERSION,3);
    CODE_LESSONS.forEach(function(k){ put(done.indexOf(k)!==-1 ? 1 : 0, 1); });
    put(p ? PATHWAY_ORDER.indexOf(p)+1 : 0, 2);
    PATHWAY_ORDER.forEach(function(k){
      var a=as[k]||{}, score=Math.max(0,Math.min(100,Math.round(Number(a.bestScore)||0)));
      put(cs[k]&&cs[k].completed ? 1 : 0, 1);
      put(a.passed ? 1 : 0, 1);
      put(score, 7);
    });
    var full=(v<<8n) | (v % 251n), s='';
    for (var i=0;i<10;i++){ s=CODE_ALPHABET[Number(full & 31n)]+s; full >>= 5n; }
    return s;
  }
  function formatCode(raw){ return 'AI2-'+raw.slice(0,5)+'-'+raw.slice(5); }
  function normalizeCode(text){
    var c=String(text||'').toUpperCase().replace(/[^0-9A-Z]/g,'');
    if (c.length===13 && c.indexOf('AI2')===0) c=c.slice(3);
    return c.replace(/O/g,'0').replace(/[IL]/g,'1').replace(/U/g,'V');
  }
  function decodeProgress(text){
    var c=normalizeCode(text);
    if (c.length!==10) throw new Error('A progress code has 10 characters after "AI2", like AI2-7KQM9-XD2F4. Check that nothing was cut off.');
    var full=0n;
    for (var i=0;i<10;i++){ var d=CODE_ALPHABET.indexOf(c[i]); if (d<0) throw new Error('"'+c[i]+'" is not used in progress codes.'); full=(full<<5n)|BigInt(d); }
    var v=full>>8n;
    if ((v % 251n)!==(full & 255n)) throw new Error('That code does not check out. A character is probably mistyped.');
    var bit=0n;
    function take(width){ var x=Number((v>>bit) & ((1n<<BigInt(width))-1n)); bit+=BigInt(width); return x; }
    if (take(3)!==CODE_VERSION) throw new Error('This code comes from a newer version of AI2Practice. Reload the page and try again.');
    var out={completed:[],cases:{},assessments:{},pathway:null};
    CODE_LESSONS.forEach(function(k){ if (take(1)) out.completed.push(k); });
    var pi=take(2); out.pathway=pi ? PATHWAY_ORDER[pi-1] : null;
    PATHWAY_ORDER.forEach(function(k){
      var caseDone=take(1), passed=take(1), score=take(7);
      if (caseDone) out.cases[k]={completed:true};
      if (passed || score) out.assessments[k]={bestScore:Math.min(100,score),passed:!!passed};
    });
    return out;
  }
  function cleanLegacyFile(obj){
    if(!obj || obj.schema!=='ai2practice-progress' || obj.version!==1) throw new Error('This file does not contain an AI2Practice progress code.');
    var out={completed:[],cases:{},assessments:{},pathway:null};
    if(Array.isArray(obj.completed)) out.completed=obj.completed.filter(function(k){return /^lesson-[1-5]$|^research-[1-5]$/.test(k);});
    if(PATHWAYS[obj.pathway]) out.pathway=obj.pathway;
    PATHWAY_ORDER.forEach(function(k){
      if(obj.cases&&obj.cases[k]&&obj.cases[k].completed===true) out.cases[k]={completed:true};
      if(obj.assessments&&obj.assessments[k]){
        var a=obj.assessments[k], score=Number(a.bestScore);
        if(Number.isFinite(score)&&score>=0&&score<=100) out.assessments[k]={bestScore:Math.round(score),passed:a.passed===true};
      }
    });
    return out;
  }
  // Restoring never removes progress: lessons are unioned and the better score wins.
  function mergeProgress(incoming){
    var done=completed();
    incoming.completed.forEach(function(k){ if(done.indexOf(k)===-1) done.push(k); });
    store(COMPLETED_KEY, done);
    incoming.completed.forEach(function(k){ if(k.indexOf('research-')===0){ try { localStorage.setItem(CKPT_PREFIX+k,'1'); } catch(e) {} } });
    var cs=cases(); Object.keys(incoming.cases).forEach(function(k){ cs[k]=cs[k]&&cs[k].completed ? cs[k] : incoming.cases[k]; }); store(CASES_KEY, cs);
    var as=assessments(); Object.keys(incoming.assessments).forEach(function(k){
      var old=as[k]||{}, inc=incoming.assessments[k];
      as[k]={bestScore:Math.max(Number(old.bestScore)||0,inc.bestScore||0),passed:!!old.passed||!!inc.passed};
    }); store(ASSESS_KEY, as);
    if (incoming.pathway && !selectedPathway()) { try { localStorage.setItem(PATHWAY_KEY,incoming.pathway); } catch(e) {} }
    render(); notify();
  }
  function summary(){
    var done=completed(), p=selectedPathway(), cs=cases(), as=assessments();
    var n=CORE_KEYS.filter(function(k){return done.indexOf(k)!==-1;}).length;
    var parts=[n+' of '+CORE_KEYS.length+' core lessons'];
    if (p) {
      parts.push(PATHWAYS[p].label+' pathway');
      if (cs[p] && cs[p].completed) parts.push('cases complete');
      if (as[p] && as[p].bestScore) parts.push('assessment '+Math.round(as[p].bestScore)+'%');
    }
    var r=RESEARCH_KEYS.filter(function(k){return done.indexOf(k)!==-1;}).length;
    if (r) parts.push(r+' of 5 Research Lab modules');
    return parts.join(', ');
  }
  function resumeLink(){ return siteUrl('index.html') + '#resume=' + encodeProgress(); }

  /* ---------- Shell ---------- */

  var shell, anchor, mode, compact=false, savedTimer, lastFocus;

  function drawerHTML(){
    var depthButtons = PATHWAY_ORDER.map(function(k){ return '<button type="button" data-ai2-pathway="'+k+'">'+PATHWAYS[k].label+'</button>'; }).join('');
    return ''+
      '<div class="ai2-drawer" id="ai2ProgressDrawer" role="dialog" aria-labelledby="ai2DrawerTitle" hidden>'+
        '<div class="ai2-drawer-inner">'+
          '<header class="ai2-d-head">'+
            '<div><h2 id="ai2DrawerTitle">Your progress</h2><p>Saved automatically in this browser. Nothing is uploaded.</p></div>'+
            '<button type="button" class="ai2-d-close" id="ai2CloseDrawer" aria-label="Close progress">Close</button>'+
          '</header>'+
          '<div class="ai2-continue" id="ai2Continue"></div>'+
          '<div class="ai2-d-grid">'+
            '<section class="ai2-d-col" aria-labelledby="ai2PathHead">'+
              '<div class="ai2-d-colhead"><h3 id="ai2PathHead">Full pathway</h3><div class="ai2-depth" role="group" aria-label="Learning depth">'+depthButtons+'</div></div>'+
              '<p class="ai2-note">Learning depth describes how deep the content goes, not your professional title.</p>'+
              '<ol class="ai2-d-steps" id="ai2StepList"></ol>'+
            '</section>'+
            '<section class="ai2-d-col ai2-save" id="ai2BackupSection" aria-labelledby="ai2SaveHead">'+
              '<h3 id="ai2SaveHead">Continue on another device</h3>'+
              '<p class="ai2-note">Your progress code holds everything on the left. Keep it any way that is easy for you.</p>'+
              '<div class="ai2-code"><code id="ai2Code"></code><button type="button" id="ai2CopyCode">Copy code</button></div>'+
              '<div class="ai2-share">'+
                '<button type="button" id="ai2CopyLink">Copy link</button>'+
                '<a id="ai2EmailLink" href="#">Email it to me</a>'+
                '<button type="button" id="ai2Download">Download</button>'+
              '</div>'+
              '<form class="ai2-restore" id="ai2RestoreForm" novalidate>'+
                '<label for="ai2RestoreInput">Have a code from another device?</label>'+
                '<div><input id="ai2RestoreInput" autocomplete="off" spellcheck="false" placeholder="AI2-XXXXX-XXXXX"><button type="submit">Restore</button></div>'+
              '</form>'+
              '<p class="ai2-note ai2-file-line">Or <label for="ai2ImportProgress">open a downloaded progress file</label>.<input id="ai2ImportProgress" type="file" accept=".html,.htm,.txt,.json,text/html,text/plain,application/json" hidden></p>'+
              '<p class="ai2-status" id="ai2ImportStatus" role="status" aria-live="polite"></p>'+
            '</section>'+
          '</div>'+
          '<footer class="ai2-d-foot">'+
            '<div class="ai2-extras"><span>Optional</span>'+
              '<a href="'+siteUrl('pages/research-lab.html')+'">Research Lab <small id="ai2ResearchStatus"></small></a>'+
              '<a href="'+siteUrl('pages/adoption-governance.html')+'">Leadership</a>'+
              '<a href="'+siteUrl('lessons/lesson-5.html')+'">Looking Ahead</a>'+
            '</div>'+
            '<button type="button" class="ai2-reset" id="ai2ResetProgress">Reset progress</button>'+
          '</footer>'+
        '</div>'+
      '</div>';
  }

  // Lesson pages: the rail replaces the lesson top bar and carries its back link and track badge.
  function createRail(){
    anchor = document.querySelector('.site-header') || document.querySelector('.site-nav') || document.querySelector('.les-topbar');
    if (!anchor || document.getElementById('ai2ProgressShell')) return null;
    var back=document.getElementById('les-back'), track=document.getElementById('les-track');
    var backHref=back ? back.href : siteUrl('course-select.html');
    var kicker=isResearchPage() ? 'Research Lab' : (lessonKeyForPage()==='lesson-5' ? 'Optional finale' : 'Core pathway');
    var trackText=track ? track.textContent.trim() : '';

    shell = document.createElement('section');
    shell.id = 'ai2ProgressShell';
    shell.className = 'ai2-progress-shell ai2-rail-mode' + (isResearchPage() ? ' ai2-research' : '');
    shell.setAttribute('aria-label','Lesson progress');
    shell.innerHTML = ''+
      '<div class="ai2-rail">'+
        '<div class="ai2-rail-inner">'+
          '<div class="ai2-rail-left">'+
            '<a class="ai2-back" href="'+esc(backHref)+'">&larr; All lessons</a>'+
            '<span class="ai2-rail-context"><span class="ai2-rail-kicker">'+esc(kicker)+'</span>'+(trackText ? '<span class="ai2-rail-track">'+esc(trackText)+'</span>' : '')+'</span>'+
          '</div>'+
          '<div class="ai2-rail-center"><ol class="ai2-steps" id="ai2Steps"></ol><p class="ai2-now" id="ai2Now"></p></div>'+
          '<div class="ai2-rail-right">'+
            '<span class="ai2-saved" id="ai2Saved" aria-live="polite"></span>'+
            '<div class="ai2-peek-wrap">'+
              '<button type="button" class="ai2-btn ai2-see" id="ai2ViewProgress" aria-expanded="false" aria-controls="ai2ProgressDrawer" aria-describedby="ai2Peek">'+
                '<span class="ai2-see-ring" id="ai2SeeRing" aria-hidden="true"></span><span id="ai2SeeLabel">See progress</span>'+
              '</button>'+
              '<div class="ai2-peek" id="ai2Peek" role="tooltip"></div>'+
            '</div>'+
          '</div>'+
        '</div>'+
      '</div>'+ drawerHTML();

    anchor.insertAdjacentElement('afterend', shell);
    document.body.classList.add('ai2-rail-on');
    document.querySelectorAll('.les-topbar').forEach(function(el){ el.hidden=true; el.style.display='none'; });
    return shell;
  }

  // Every other page: no rail. The same panel opens as a dialog from [data-open-progress] links.
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

  function layout(){
    if (!shell || mode!=='rail') return;
    var pos=getComputedStyle(anchor).position;
    var top=(pos==='sticky'||pos==='fixed') ? Math.round(anchor.getBoundingClientRect().height) : 0;
    shell.style.top=top+'px';
    var rail=shell.querySelector('.ai2-rail');
    document.documentElement.style.setProperty('--ai2-offset',(top+rail.offsetHeight)+'px');
  }
  function onScroll(){
    if (mode!=='rail') return;
    var y=window.scrollY;
    var want = compact ? y>40 : y>120;
    if (want!==compact) { compact=want; shell.classList.toggle('ai2-compact',compact); setTimeout(layout,220); }
    renderNow();
  }

  function openDrawer(focusSave){
    if (mode==='modal') createModal();
    var drawer=document.getElementById('ai2ProgressDrawer'), btn=document.getElementById('ai2ViewProgress');
    if(!drawer) return;
    render();
    if (mode==='modal') {
      if (drawer.hidden) lastFocus=document.activeElement;
      shell.hidden=false; document.documentElement.classList.add('ai2-modal-open');
      setTimeout(function(){ var c=document.getElementById('ai2CloseDrawer'); if(c) c.focus({preventScroll:true}); },20);
    }
    drawer.hidden=false;
    if(btn){ btn.setAttribute('aria-expanded','true'); document.getElementById('ai2SeeLabel').textContent='Hide progress'; }
    if(focusSave){ var b=document.getElementById('ai2BackupSection'); if(b) setTimeout(function(){b.scrollIntoView({behavior:'smooth',block:'nearest'});},30); }
  }
  function closeDrawer(){
    var drawer=document.getElementById('ai2ProgressDrawer'), btn=document.getElementById('ai2ViewProgress');
    if(!drawer || drawer.hidden) return;
    drawer.hidden=true;
    if (mode==='modal') {
      shell.hidden=true; document.documentElement.classList.remove('ai2-modal-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus({preventScroll:true});
    }
    if(btn){ btn.setAttribute('aria-expanded','false'); document.getElementById('ai2SeeLabel').textContent='See progress'; }
  }
  function toggleDrawer(){ var drawer=document.getElementById('ai2ProgressDrawer'); if(!drawer)return; if(drawer.hidden)openDrawer(false); else closeDrawer(); }
  function flashSaved(text){
    var el=document.getElementById('ai2Saved'); if(!el) return;
    el.innerHTML=CHECK+' '+esc(text||'Saved');
    el.classList.add('show');
    clearTimeout(savedTimer); savedTimer=setTimeout(function(){ el.classList.remove('show'); },2200);
  }
  function setStatus(msg, ok){
    var s=document.getElementById('ai2ImportStatus'); if(!s) return;
    s.textContent=msg; s.className='ai2-status '+(ok?'ok':'err');
  }

  /* ---------- Render ---------- */

  function stepState(s, here){
    if (s.done) return here ? 'Complete · you are here' : 'Complete';
    if (here) return s.keys.length>1 ? 'You are here · '+s.doneCount+' of '+s.keys.length+' lessons done' : 'You are here';
    if (s.doneCount) return s.doneCount+' of '+s.keys.length+' lessons done';
    return 'Not started';
  }
  function tipHTML(s, here){
    var list='';
    if (s.lessons && s.lessons.length>1) {
      var key=lessonKeyForPage();
      list='<ul>'+s.lessons.map(function(l){
        return '<li class="'+(l.done?'done':'')+(l.key===key?' here':'')+'"><span class="ai2-tip-mark" aria-hidden="true">'+(l.done?CHECK:'')+'</span>'+esc(l.title)+'</li>';
      }).join('')+'</ul>';
    } else if (s.nextTitle) {
      list='<p>'+esc(s.nextTitle)+'</p>';
    }
    var hint=here ? '' : '<small>'+(s.done ? 'Click to review' : 'Click to open')+'</small>';
    return '<span class="ai2-tip" role="tooltip"><strong>'+esc(s.name)+'</strong>'+list+'<em class="'+(s.done?'is-done':(here?'is-here':''))+'">'+esc(stepState(s,here))+'</em>'+hint+'</span>';
  }
  function renderRail(){
    var ol=document.getElementById('ai2Steps'); if(!ol) return;
    var S=railSteps(), active=railActive(S);
    ol.style.gridTemplateColumns='repeat('+S.length+', minmax(0, 1fr))';
    ol.innerHTML=S.map(function(s,i){
      var here=i===active;
      var cls='ai2-step'+(s.done?' done':'')+(here?' is-active':'')+(i>0&&S[i-1].done?' prev-done':'')+(!s.done&&s.doneCount?' partial':'');
      var sub=s.keys.length>1 && !s.done ? ' <span class="ai2-sub">'+s.doneCount+'/'+s.keys.length+'</span>' : '';
      var body='<span class="ai2-dot" aria-hidden="true">'+(s.done?CHECK:(i+1))+'</span><span class="ai2-step-label">'+esc(s.label)+sub+'</span>';
      var aria=s.name+': '+stepState(s,here);
      return '<li class="'+cls+'"><a href="'+s.href+'" aria-label="'+esc(aria)+'"'+(here?' aria-current="step"':'')+'>'+body+'</a>'+tipHTML(s,here)+'</li>';
    }).join('');
    renderNow();
    renderPeek();
  }
  function renderNow(){
    var el=document.getElementById('ai2Now'); if(!el) return;
    var S=railSteps(), i=railActive(S), key=lessonKeyForPage();
    var core=CORE.filter(function(c){return c.key===key;})[0];
    var text;
    if (i<0) text='<b>Optional finale</b> · Looking Ahead';
    else if (isResearchPage()) text='<b>Research '+(i+1)+' of '+S.length+'</b> · '+esc(S[i].label);
    else text='<b>Module '+(i+1)+' of '+S.length+'</b> · '+esc(core ? core.title : S[i].label);
    el.innerHTML=text+' · '+readPct()+'% read';
  }
  // Hover preview for the "See progress" button.
  function renderPeek(){
    var el=document.getElementById('ai2Peek'); if(!el) return;
    var done=completed(), n=CORE_KEYS.filter(function(k){return done.indexOf(k)!==-1;}).length;
    var total=CORE_KEYS.length, label='core lessons';
    if (isResearchPage()) { n=RESEARCH_KEYS.filter(function(k){return done.indexOf(k)!==-1;}).length; total=RESEARCH_KEYS.length; label='Research Lab modules'; }
    var pct=Math.round(n/total*100), nx=nextStep(), r=resumeTarget();
    var ring=document.getElementById('ai2SeeRing');
    if (ring) ring.style.setProperty('--p', pct);
    el.innerHTML=''+
      '<span class="ai2-peek-head"><strong>'+n+' of '+total+'</strong> '+label+' complete</span>'+
      '<span class="ai2-peek-bar"><span style="width:'+pct+'%"></span></span>'+
      (r ? '<span class="ai2-peek-row"><span>In progress</span>'+esc(r.title)+(r.pct?' · '+r.pct+'% read':'')+'</span>' : '')+
      '<span class="ai2-peek-row"><span>Up next</span>'+esc(nx.title)+'</span>'+
      '<span class="ai2-peek-foot">Saved automatically in this browser. Click for every step, your certificate, and a code to continue on another device.</span>';
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
  function renderStepList(){
    var el=document.getElementById('ai2StepList'); if(!el) return;
    var S=steps(), active=activeIndex(S);
    el.innerHTML=S.map(function(s,i){
      var cls=(s.done?'done':'')+(s.locked?' locked':'')+(i===active?' is-active':'');
      var action;
      if (s.id==='cert' && s.ready) action='<a class="ai2-btn ai2-btn-primary" href="'+s.href+'">Generate</a>';
      else if (s.done) action='<a href="'+(s.href||'#')+'">Review</a>';
      else if (s.href) action='<a href="'+s.href+'">'+(i===active?'Continue':'Open')+' &rarr;</a>';
      else action='';
      return '<li class="'+cls+'"><span class="ai2-check">'+(s.done?CHECK:(i+1))+'</span><div><strong>'+esc(s.name)+'</strong><small>'+esc(s.note)+'</small></div>'+action+'</li>';
    }).join('');
    var p=selectedPathway();
    if (shell) shell.querySelectorAll('.ai2-depth [data-ai2-pathway]').forEach(function(b){ b.setAttribute('aria-pressed', b.getAttribute('data-ai2-pathway')===p ? 'true':'false'); });
  }
  function renderSave(){
    var code=document.getElementById('ai2Code'); if(!code) return;
    code.textContent=formatCode(encodeProgress());
    var mail=document.getElementById('ai2EmailLink');
    if (mail) {
      var body='My AI2Practice progress ('+summary()+').\n\nOpen this link to continue on any device:\n'+resumeLink()+'\n\nOr enter this code under Progress > "Have a code from another device?":\n'+formatCode(encodeProgress());
      mail.href='mailto:?subject='+encodeURIComponent('My AI2Practice progress')+'&body='+encodeURIComponent(body);
    }
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
      if (no) no.textContent=n.note || (p ? PATHWAYS[p].description : 'Finish the core lessons and pick a learning depth to unlock applied cases, the assessment, and your certificate.');
      if (a) {
        a.innerHTML=esc(n.choose ? 'See all steps' : n.label)+' &rarr;';
        if (n.choose) { a.href='#progress'; a.setAttribute('data-open-progress','true'); }
        else { a.href=n.href; a.removeAttribute('data-open-progress'); }
      }
      card.querySelectorAll('[data-ai2-set-pathway]').forEach(function(b){ b.setAttribute('aria-pressed', b.getAttribute('data-ai2-set-pathway')===p ? 'true':'false'); });
    });
  }
  function render(){ renderRail(); renderContinue(); renderStepList(); renderSave(); renderOptional(); renderNextTargets(); layout(); }

  /* ---------- Actions ---------- */

  function copyText(text, btn, done){
    function ok(){ var old=btn.textContent; btn.textContent=done; setTimeout(function(){btn.textContent=old;},1500); }
    function fallback(){
      var ta=document.createElement('textarea'); ta.value=text; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch(e) { setStatus('Copy is blocked here. Select the code and copy it manually.', false); }
      ta.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback);
    else fallback();
  }
  function downloadFile(){
    var code=formatCode(encodeProgress()), link=resumeLink(), date=new Date().toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
    var html='<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<title>AI2Practice progress</title><style>body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#111827;max-width:560px;margin:56px auto;padding:0 20px;line-height:1.55}'+
      'h1{color:#17324d;font-size:1.6rem;margin:0 0 6px}p{color:#4b5563}a.btn{display:inline-block;margin:14px 0 22px;padding:11px 18px;border-radius:8px;background:#17324d;color:#fff;text-decoration:none;font-weight:600}'+
      'code{display:inline-block;font:600 1.3rem ui-monospace,Menlo,monospace;letter-spacing:.05em;padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;background:#f5f6f8;color:#17324d}</style></head><body>'+
      '<h1>Your AI2Practice progress</h1><p>Saved '+esc(date)+': '+esc(summary())+'.</p>'+
      '<a class="btn" href="'+esc(link)+'">Continue in AI2Practice &rarr;</a>'+
      '<p>Or open Progress in AI2Practice and enter this code:</p><code>'+esc(code)+'</code>'+
      '<p style="font-size:.85rem;margin-top:22px">Keep this file anywhere. Opening the link adds this progress to the browser you open it in; it never removes progress.</p>'+
      '<!-- ai2practice-progress-code: '+code+' --></body></html>';
    var blob=new Blob([html],{type:'text/html'}), a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download='ai2practice-progress.html'; document.body.appendChild(a); a.click();
    var u=a.href; a.remove(); setTimeout(function(){URL.revokeObjectURL(u);},500);
    setStatus('Downloaded ai2practice-progress.html. Open it on any device to continue.', true);
  }
  function restoreFromCode(text, source){
    try { mergeProgress(decodeProgress(text)); setStatus('Progress restored'+(source||'')+': '+summary()+'.', true); flashSaved('Restored'); return true; }
    catch(e){ setStatus(e.message, false); return false; }
  }
  function restoreFromFile(file){
    if(!file)return;
    if(file.size>262144){ setStatus('That file is too large to be an AI2Practice progress file.', false); return; }
    var reader=new FileReader();
    reader.onload=function(){
      var text=String(reader.result||'');
      var m=text.match(/AI2-?[0-9A-Z]{5}-?[0-9A-Z]{5}/i);
      if (m) { restoreFromCode(m[0],' from your file'); return; }
      try { mergeProgress(cleanLegacyFile(JSON.parse(text))); setStatus('Progress restored from your file: '+summary()+'.', true); flashSaved('Restored'); }
      catch(e){ setStatus(e instanceof SyntaxError ? 'This file does not contain an AI2Practice progress code.' : e.message, false); }
    };
    reader.readAsText(file);
  }
  function resetProgress(){
    if(!window.confirm('Reset all AI2Practice progress in this browser? Save your progress code first if you may want it back.'))return;
    [COMPLETED_KEY,CASES_KEY,ASSESS_KEY,PATHWAY_KEY,RESUME_KEY].forEach(function(k){ try { localStorage.removeItem(k); } catch(e) {} });
    try { for(var i=localStorage.length-1;i>=0;i--){var k=localStorage.key(i);if(k&&k.indexOf(CKPT_PREFIX)===0)localStorage.removeItem(k);} } catch(e) {}
    render(); notify(); setStatus('Progress reset.', true);
  }
  function handleResumeHash(){
    var m=window.location.hash.match(/^#resume=([0-9A-Za-z-]+)$/);
    if(!m) return false;
    history.replaceState(null,'',window.location.pathname+window.location.search);
    return m[1];
  }

  function bindPanel(){
    document.getElementById('ai2CloseDrawer').addEventListener('click',closeDrawer);
    document.getElementById('ai2CopyCode').addEventListener('click',function(){ copyText(formatCode(encodeProgress()),this,'Copied'); });
    document.getElementById('ai2CopyLink').addEventListener('click',function(){ copyText(resumeLink(),this,'Link copied'); });
    document.getElementById('ai2Download').addEventListener('click',downloadFile);
    document.getElementById('ai2RestoreForm').addEventListener('submit',function(e){
      e.preventDefault(); var input=document.getElementById('ai2RestoreInput');
      if(!input.value.trim()){ setStatus('Enter the code from your other device, like AI2-7KQM9-XD2F4.', false); input.focus(); return; }
      if(restoreFromCode(input.value)) input.value='';
    });
    document.getElementById('ai2ImportProgress').addEventListener('change',function(){ restoreFromFile(this.files&&this.files[0]); this.value=''; });
    document.getElementById('ai2ResetProgress').addEventListener('click',resetProgress);
  }

  function bind(){
    if (mode==='rail') {
      bindPanel();
      document.getElementById('ai2ViewProgress').addEventListener('click',toggleDrawer);
      window.addEventListener('scroll',function(){ requestAnimationFrame(onScroll); },{passive:true});
      window.addEventListener('resize',layout);
      if (window.ResizeObserver) { var ro=new ResizeObserver(layout); ro.observe(anchor); ro.observe(shell.querySelector('.ai2-rail')); }
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
        if(PATHWAYS[p]){ e.preventDefault(); setPathway(p); openDrawer(false); }
        return;
      }
      var openEl=t.closest('[data-open-progress]');
      if(openEl){ e.preventDefault(); openDrawer(false); return; }
      var drawer=document.getElementById('ai2ProgressDrawer');
      if(!drawer || drawer.hidden) return;
      if(mode==='modal' ? !drawer.contains(t) : !shell.contains(t)) closeDrawer();
    });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeDrawer(); });

    window.addEventListener('storage',render);
    window.addEventListener('ai2practice:progress-changed',function(){ render(); flashSaved(); });
  }

  function init(){
    var code=handleResumeHash();
    var requested=new URLSearchParams(window.location.search).get('pathway');
    if(PATHWAYS[requested]){try{localStorage.setItem(PATHWAY_KEY,requested);}catch(e){}}
    var styleLink=ensureStyles();
    mode=lessonKeyForPage() ? 'rail' : 'modal';
    if (mode==='rail') {
      if(!createRail()) mode='modal';
      else { revealWhenStyled(styleLink); restoreScrollIfRequested(); }
    }
    bind(); render(); onScroll();
    if(code){ openDrawer(false); restoreFromCode(code,' from your link'); }
    else if(new URLSearchParams(window.location.search).get('progress')==='1' || window.location.hash==='#progress') openDrawer(false);
  }

  window.AI2PracticeProgressRail={open:function(){openDrawer(false);},backup:function(){openDrawer(true);},render:render,setPathway:setPathway};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
