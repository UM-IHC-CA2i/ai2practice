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

  var CORE = [
    { key:'lesson-2', module:'Module 1 - Fundamentals of AI', title:'What is AI?', href:'lessons/lesson-2.html' },
    { key:'lesson-3', module:'Module 2 - Radiology AI: Data, Systems & Workflow', title:'Where AI fits in radiology workflow', href:'lessons/lesson-3.html' },
    { key:'lesson-4', module:'Module 3 - AI in Clinical Practice', title:'Can I Trust This AI?', href:'lessons/lesson-4.html' },
    { key:'lesson-1', module:'Module 3 - AI in Clinical Practice', title:'AI, Expertise & Clinical Skill', href:'lessons/lesson-1.html' }
  ];
  var CORE_KEYS = CORE.map(function(x){ return x.key; });
  var RESEARCH_KEYS = ['research-1','research-2','research-3','research-4','research-5'];

  var PATHWAYS = {
    beginner: {
      label:'Beginner', track:'student',
      description:'A concise clinical-AI pathway with the required core, beginner applied cases, and the foundational assessment.',
      caseHref:'student-cases.html?level=medical_student&pathway=beginner',
      assessmentHref:'student-assessment.html?pathway=beginner',
      caseLabel:'Beginner applied cases', assessmentLabel:'Foundational assessment'
    },
    intermediate: {
      label:'Intermediate', track:'resident',
      description:'The full core in the deeper radiology version, intermediate applied cases, and the radiology assessment.',
      caseHref:'resident-cases.html?level=radiology_resident&pathway=intermediate',
      assessmentHref:'resident-assessment.html?pathway=intermediate',
      caseLabel:'Intermediate applied cases', assessmentLabel:'Radiology assessment'
    },
    advanced: {
      label:'Advanced', track:'resident',
      description:'The deeper core with advanced applied cases and the radiology assessment. Learning depth is independent of professional title.',
      caseHref:'resident-cases.html?level=attending&pathway=advanced',
      assessmentHref:'resident-assessment.html?pathway=advanced',
      caseLabel:'Advanced applied cases', assessmentLabel:'Radiology assessment'
    }
  };

  function siteUrl(path){ return new URL(path, siteRoot).href; }
  function relativePath(){
    var rootPath = siteRoot.pathname.replace(/\/$/, '');
    var p = window.location.pathname;
    if (rootPath && p.indexOf(rootPath) === 0) p = p.slice(rootPath.length);
    return p.replace(/^\//, '') || 'index.html';
  }
  function shouldMount(){
    var p = relativePath();
    if (p === 'about.html' || p === 'tracker.html' || p === 'workflow-variations.html') return false;
    if (p === 'pages/brief.html' || p === 'pages/educators.html') return false;
    return true;
  }
  function ensureStyles(){
    if (document.querySelector('link[data-ai2-progress-style]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = siteUrl('assets/progress.css');
    link.setAttribute('data-ai2-progress-style','1');
    document.head.appendChild(link);
  }
  function safeJSON(key, fallback){
    try { var raw=localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch(e){ return fallback; }
  }
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
    render();
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

  function createShell(){
    var anchor = document.querySelector('.site-header') || document.querySelector('.site-nav') || document.querySelector('.cw-topbar');
    if (!anchor || document.getElementById('ai2ProgressShell')) return null;

    var shell = document.createElement('section');
    shell.id = 'ai2ProgressShell';
    shell.className = 'ai2-progress-shell';
    shell.setAttribute('aria-label','AI2Practice learning progress');
    shell.innerHTML = ''+
      '<div class="ai2-progress-rail">'+
        '<div class="ai2-progress-rail-inner">'+
          '<div class="ai2-progress-summary-copy"><span>Core curriculum</span><strong id="ai2ProgressCount">0 of 4 complete</strong></div>'+
          '<div class="ai2-progress-meter" aria-hidden="true"><i id="ai2ProgressMeter"></i></div>'+
          '<span class="ai2-progress-saved" id="ai2ProgressSaved">Saved on this device</span>'+
          '<button type="button" class="ai2-progress-action" id="ai2ViewProgress" aria-expanded="false" aria-controls="ai2ProgressDrawer">View progress</button>'+
          '<button type="button" class="ai2-progress-action ai2-progress-action-secondary" id="ai2BackupProgress">Backup</button>'+
        '</div>'+
      '</div>'+
      '<div class="ai2-progress-drawer" id="ai2ProgressDrawer" hidden>'+
        '<div class="ai2-progress-drawer-inner">'+
          '<div class="ai2-progress-drawer-head"><div><p class="ai2-progress-kicker">Your learning progress</p><h2>Continue where you left off</h2><p>Progress is saved locally in this browser and is not uploaded to AI2Practice.</p></div><button type="button" class="ai2-progress-close" id="ai2ProgressClose" aria-label="Close progress panel">Close</button></div>'+
          '<div class="ai2-progress-grid">'+
            '<section class="ai2-progress-card"><div class="ai2-progress-card-head"><span>Required core</span><strong id="ai2CoreHeadline"></strong></div><div id="ai2CoreList" class="ai2-core-list"></div></section>'+
            '<section class="ai2-progress-card"><div class="ai2-progress-card-head"><span>Learning depth</span><strong id="ai2PathwayHeadline">Choose a pathway</strong></div><p class="ai2-progress-note">Beginner, Intermediate, and Advanced describe learning depth, not professional title.</p><div id="ai2PathwayGrid" class="ai2-pathway-grid"></div></section>'+
          '</div>'+
          '<section class="ai2-progress-card ai2-progress-completion"><div class="ai2-progress-card-head"><span>Cases, assessment & certificate</span><strong id="ai2CompletionHeadline">Choose a pathway to continue</strong></div><p id="ai2CompletionDescription" class="ai2-progress-note"></p><div id="ai2CompletionSteps" class="ai2-completion-steps"></div></section>'+
          '<div class="ai2-progress-grid ai2-progress-grid-secondary">'+
            '<section class="ai2-progress-card"><div class="ai2-progress-card-head"><span>Optional specializations</span><strong>Go deeper by role or interest</strong></div><div class="ai2-specialization-links"><a href="'+siteUrl('pages/research-lab.html')+'"><span>Research Lab</span><small id="ai2ResearchStatus">Recommended after Fundamentals; direct entry is available.</small></a><a href="'+siteUrl('pages/adoption-governance.html')+'"><span>Leadership</span><small>For learners leading clinical AI strategy, evaluation, implementation, education, or stewardship.</small></a></div></section>'+
            '<section class="ai2-progress-card"><div class="ai2-progress-card-head"><span>Optional finale</span><strong>Looking Ahead</strong></div><p class="ai2-progress-note">Recommended after completion, but open anytime.</p><a class="ai2-progress-inline-link" href="'+siteUrl('lessons/lesson-5.html')+'">Explore Looking Ahead &rarr;</a></section>'+
          '</div>'+
          '<section class="ai2-progress-card ai2-backup-card" id="ai2BackupSection">'+
            '<div class="ai2-progress-card-head"><span>Local backup</span><strong>Download or restore progress</strong></div>'+
            '<p class="ai2-progress-note">A backup is a small JSON file processed entirely in your browser. It is not uploaded to AI2Practice.</p>'+
            '<div class="ai2-backup-actions"><button type="button" id="ai2ExportProgress">Download progress file</button><label for="ai2ImportProgress">Restore from progress file</label><input id="ai2ImportProgress" type="file" accept="application/json,.json" hidden><select id="ai2ImportMode" aria-label="Restore behavior"><option value="merge">Merge with current progress</option><option value="replace">Replace current progress</option></select><button type="button" class="ai2-reset-progress" id="ai2ResetProgress">Reset local progress</button></div>'+
            '<p class="ai2-import-status" id="ai2ImportStatus" role="status" aria-live="polite"></p>'+
            '<p class="ai2-progress-note">Cross-device account sync is planned for a future version.</p>'+
          '</section>'+
        '</div>'+
      '</div>';

    anchor.insertAdjacentElement('afterend', shell);
    return shell;
  }

  function openDrawer(focusBackup){
    var drawer=document.getElementById('ai2ProgressDrawer'), btn=document.getElementById('ai2ViewProgress');
    if(!drawer) return;
    drawer.hidden=false;
    if(btn){btn.setAttribute('aria-expanded','true');btn.textContent='Hide progress';}
    render();
    if(focusBackup){ var b=document.getElementById('ai2BackupSection'); if(b) setTimeout(function(){b.scrollIntoView({behavior:'smooth',block:'nearest'});},30); }
  }
  function closeDrawer(){
    var drawer=document.getElementById('ai2ProgressDrawer'), btn=document.getElementById('ai2ViewProgress');
    if(!drawer) return;
    drawer.hidden=true;
    if(btn){btn.setAttribute('aria-expanded','false');btn.textContent='View progress';}
  }
  function toggleDrawer(){ var drawer=document.getElementById('ai2ProgressDrawer'); if(!drawer)return; if(drawer.hidden)openDrawer(false); else closeDrawer(); }

  function renderRail(){
    var done=completed(), n=CORE_KEYS.filter(function(k){return done.indexOf(k)!==-1;}).length, pct=Math.round((n/CORE_KEYS.length)*100);
    var count=document.getElementById('ai2ProgressCount'), meter=document.getElementById('ai2ProgressMeter'), saved=document.getElementById('ai2ProgressSaved');
    if(count) count.textContent=n+' of '+CORE_KEYS.length+' complete';
    if(meter) meter.style.width=pct+'%';
    if(saved) saved.textContent=n ? 'Saved on this device' : 'Progress saves on this device';
  }
  function renderCore(){
    var el=document.getElementById('ai2CoreList'), headline=document.getElementById('ai2CoreHeadline'); if(!el)return;
    var done=completed(), p=selectedPathway(), n=CORE_KEYS.filter(function(k){return done.indexOf(k)!==-1;}).length;
    if(headline) headline.textContent=n+' of '+CORE_KEYS.length+' required lessons complete';
    el.innerHTML=CORE.map(function(item){
      var ok=done.indexOf(item.key)!==-1;
      return '<a class="ai2-core-item '+(ok?'done':'')+'" href="'+coreHref(item,p)+'"><span class="ai2-progress-check">'+(ok?'&#10003;':'')+'</span><span><small>'+esc(item.module)+'</small><strong>'+esc(item.title)+'</strong></span><b>'+(ok?'Complete':'Open')+' &rarr;</b></a>';
    }).join('');
  }
  function renderPathways(){
    var el=document.getElementById('ai2PathwayGrid'), headline=document.getElementById('ai2PathwayHeadline'); if(!el)return;
    var current=selectedPathway();
    if(headline) headline.textContent=current ? PATHWAYS[current].label+' selected' : 'Choose a pathway';
    el.innerHTML=Object.keys(PATHWAYS).map(function(k){var p=PATHWAYS[k];return '<button type="button" class="ai2-pathway-card '+(current===k?'selected':'')+'" data-ai2-pathway="'+k+'"><span>'+p.label+'</span><small>'+(p.track==='student'?'Concise / foundational core':'Deeper radiology core')+'</small></button>';}).join('');
  }
  function renderCompletion(){
    var wrap=document.getElementById('ai2CompletionSteps'), title=document.getElementById('ai2CompletionHeadline'), desc=document.getElementById('ai2CompletionDescription');
    if(!wrap||!title||!desc)return;
    var pkey=selectedPathway();
    if(!pkey){ title.textContent='Choose a pathway to continue'; desc.textContent='AI2Practice will show the default cases, assessment, and certificate sequence here.'; wrap.innerHTML=''; return; }
    var p=PATHWAYS[pkey], cs=cases(), as=assessments();
    var core=coreDone(), caseDone=!!(cs[pkey]&&cs[pkey].completed), assessDone=!!(as[pkey]&&as[pkey].passed);
    title.textContent=p.label+' pathway'; desc.textContent=p.description;
    var firstIncomplete=CORE.find(function(x){return completed().indexOf(x.key)===-1;}) || CORE[0];
    var steps=[
      {ok:core,title:'Core curriculum',note:'All four currently available required lessons',href:core?null:coreHref(firstIncomplete,pkey),action:core?'Complete':'Resume core'},
      {ok:caseDone,title:p.caseLabel,note:'Applied human-AI cases at the selected depth',href:siteUrl(p.caseHref),action:caseDone?'Complete':'Start cases'},
      {ok:assessDone,title:p.assessmentLabel,note:'Pass score: 80% or higher',href:siteUrl(p.assessmentHref),action:assessDone?'Passed'+(as[pkey].bestScore?' - '+as[pkey].bestScore+'%':''):'Take assessment'}
    ];
    var html=steps.map(function(s){return '<div class="ai2-completion-step '+(s.ok?'done':'')+'"><span class="ai2-progress-check">'+(s.ok?'&#10003;':'')+'</span><div><strong>'+esc(s.title)+'</strong><small>'+esc(s.note)+'</small></div>'+(s.href?'<a href="'+s.href+'">'+esc(s.action)+' &rarr;</a>':'<b>'+esc(s.action)+'</b>')+'</div>';}).join('');
    if(pathwayEligible(pkey)) html += '<div class="ai2-certificate-ready"><div><span>All requirements complete</span><strong>Your completion certificate is ready.</strong></div><a href="'+siteUrl('certificate.html?pathway='+pkey)+'">Generate certificate</a></div>';
    else html += '<div class="ai2-certificate-locked"><strong>Certificate</strong><span>Complete the remaining requirements above to unlock the certificate.</span></div>';
    wrap.innerHTML=html;
  }
  function renderOptional(){
    var el=document.getElementById('ai2ResearchStatus'); if(!el)return;
    var done=completed(), n=RESEARCH_KEYS.filter(function(k){return done.indexOf(k)!==-1;}).length;
    el.textContent=n ? n+' of 5 Research Lab modules complete.' : 'Recommended after Fundamentals; direct entry is available.';
  }
  function render(){ renderRail(); renderCore(); renderPathways(); renderCompletion(); renderOptional(); }

  function exportProgress(){
    var payload={schema:'ai2practice-progress',version:1,exportedAt:new Date().toISOString(),pathway:selectedPathway(),completed:completed(),cases:cases(),assessments:assessments()};
    var blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}), a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download='ai2practice-progress.json'; document.body.appendChild(a); a.click();
    var u=a.href; a.remove(); setTimeout(function(){URL.revokeObjectURL(u);},500);
  }
  function cleanImported(obj){
    if(!obj || obj.schema!=='ai2practice-progress' || obj.version!==1) throw new Error('This is not a supported AI2Practice progress file.');
    var out={completed:[],cases:{},assessments:{},pathway:null};
    if(Array.isArray(obj.completed)) out.completed=obj.completed.filter(function(k){return /^lesson-[1-5]$|^research-[1-5]$/.test(k);}).slice(0,20);
    if(PATHWAYS[obj.pathway]) out.pathway=obj.pathway;
    Object.keys(PATHWAYS).forEach(function(k){
      if(obj.cases&&obj.cases[k]&&obj.cases[k].completed===true) out.cases[k]={completed:true};
      if(obj.assessments&&obj.assessments[k]){
        var a=obj.assessments[k], score=Number(a.bestScore);
        if(Number.isFinite(score)&&score>=0&&score<=100) out.assessments[k]={bestScore:Math.round(score),passed:a.passed===true};
      }
    });
    return out;
  }
  function importProgress(file,mode){
    var status=document.getElementById('ai2ImportStatus'); if(!file)return;
    if(file.size>65536){if(status)status.textContent='Restore rejected: progress files must be 64 KB or smaller.';return;}
    var reader=new FileReader();
    reader.onload=function(){
      try{
        var incoming=cleanImported(JSON.parse(String(reader.result||'')));
        if(mode==='replace'){
          localStorage.setItem(COMPLETED_KEY,JSON.stringify(incoming.completed));
          localStorage.setItem(CASES_KEY,JSON.stringify(incoming.cases));
          localStorage.setItem(ASSESS_KEY,JSON.stringify(incoming.assessments));
          if(incoming.pathway)localStorage.setItem(PATHWAY_KEY,incoming.pathway);else localStorage.removeItem(PATHWAY_KEY);
        } else {
          var done=completed(); incoming.completed.forEach(function(k){if(done.indexOf(k)===-1)done.push(k);}); localStorage.setItem(COMPLETED_KEY,JSON.stringify(done));
          var cs=cases(); Object.keys(incoming.cases).forEach(function(k){cs[k]=incoming.cases[k];}); localStorage.setItem(CASES_KEY,JSON.stringify(cs));
          var as=assessments(); Object.keys(incoming.assessments).forEach(function(k){var old=as[k]||{},inc=incoming.assessments[k];as[k]={bestScore:Math.max(Number(old.bestScore)||0,inc.bestScore||0),passed:!!old.passed||!!inc.passed};}); localStorage.setItem(ASSESS_KEY,JSON.stringify(as));
          if(incoming.pathway&&!selectedPathway())localStorage.setItem(PATHWAY_KEY,incoming.pathway);
        }
        if(status)status.textContent='Progress restored successfully. The file was processed only in this browser.';
        render(); notify();
      }catch(e){if(status)status.textContent='Restore rejected: '+e.message;}
    };
    reader.readAsText(file);
  }
  function resetProgress(){
    if(!window.confirm('Reset locally saved AI2Practice progress on this browser? This cannot be undone unless you downloaded a backup.'))return;
    localStorage.removeItem(COMPLETED_KEY);localStorage.removeItem(CASES_KEY);localStorage.removeItem(ASSESS_KEY);localStorage.removeItem(PATHWAY_KEY);
    for(var i=localStorage.length-1;i>=0;i--){var k=localStorage.key(i);if(k&&k.indexOf('aiready_ckpt_')===0)localStorage.removeItem(k);}
    render();notify();
  }
  function bind(){
    var view=document.getElementById('ai2ViewProgress'), backup=document.getElementById('ai2BackupProgress'), close=document.getElementById('ai2ProgressClose');
    if(view)view.addEventListener('click',toggleDrawer);
    if(backup)backup.addEventListener('click',function(){openDrawer(true);});
    if(close)close.addEventListener('click',closeDrawer);
    var exp=document.getElementById('ai2ExportProgress'), imp=document.getElementById('ai2ImportProgress'), reset=document.getElementById('ai2ResetProgress');
    if(exp)exp.addEventListener('click',exportProgress);
    if(imp)imp.addEventListener('change',function(){var mode=document.getElementById('ai2ImportMode').value;importProgress(this.files&&this.files[0],mode);this.value='';});
    if(reset)reset.addEventListener('click',resetProgress);

    document.addEventListener('click',function(e){
      var pathwayEl=e.target.closest&&e.target.closest('[data-progress-pathway],[data-ai2-pathway]');
      if(pathwayEl){
        var p=pathwayEl.getAttribute('data-progress-pathway')||pathwayEl.getAttribute('data-ai2-pathway');
        if(PATHWAYS[p]){e.preventDefault();setPathway(p);openDrawer(false);}
        return;
      }
      var openEl=e.target.closest&&e.target.closest('[data-open-progress]');
      if(openEl){e.preventDefault();openDrawer(false);}
    });

    window.addEventListener('storage',render);
    window.addEventListener('ai2practice:progress-changed',render);
  }

  function init(){
    if(!shouldMount())return;
    ensureStyles();
    var requested=new URLSearchParams(window.location.search).get('pathway');
    if(PATHWAYS[requested]){try{localStorage.setItem(PATHWAY_KEY,requested);}catch(e){}}
    if(!createShell())return;
    bind();render();
    if(new URLSearchParams(window.location.search).get('progress')==='1' || window.location.hash==='#progress') openDrawer(false);
  }

  window.AI2PracticeProgressRail={open:function(){openDrawer(false);},backup:function(){openDrawer(true);},render:render,setPathway:setPathway};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
