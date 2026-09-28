(function(){
  'use strict';

  var COMPLETED_KEY = 'aiready_completed';
  var CASES_KEY = 'ai2practice_cases_v1';
  var ASSESS_KEY = 'ai2practice_assessments_v1';
  var PATHWAY_KEY = 'ai2practice_pathway_v1';
  var CORE = [
    { key:'lesson-2', module:'Module 1 - Fundamentals of AI', title:'What is AI?', href:'lessons/lesson-2.html' },
    { key:'lesson-3', module:'Module 2 - Radiology AI: Data, Systems & Workflow', title:'Where AI plugs into radiology', href:'lessons/lesson-3.html' },
    { key:'lesson-4', module:'Module 3 - AI in Clinical Practice', title:'Can I Trust This AI?', href:'lessons/lesson-4.html' },
    { key:'lesson-1', module:'Module 3 - AI in Clinical Practice', title:'AI, Expertise & Clinical Skill', href:'lessons/lesson-1.html' }
  ];
  var CORE_KEYS = CORE.map(function(x){ return x.key; });
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
      description:'The deeper core with advanced applied cases and the radiology assessment. Intended for learners seeking greater clinical-evaluation depth, independent of job title.',
      caseHref:'resident-cases.html?level=attending&pathway=advanced',
      assessmentHref:'resident-assessment.html?pathway=advanced',
      caseLabel:'Advanced applied cases', assessmentLabel:'Radiology assessment'
    }
  };

  function safeJSON(key, fallback){
    try { var raw=localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch(e){ return fallback; }
  }
  function completed(){
    var local=safeJSON(COMPLETED_KEY, []);
    if (!Array.isArray(local)) local=[];
    try {
      var legacy=sessionStorage.getItem(COMPLETED_KEY);
      if (legacy) {
        var old=JSON.parse(legacy);
        if (Array.isArray(old)) old.forEach(function(k){ if(local.indexOf(k)===-1) local.push(k); });
        localStorage.setItem(COMPLETED_KEY, JSON.stringify(local));
      }
    } catch(e){}
    return local.filter(function(k){ return /^lesson-[1-5]$|^research-[1-5]$/.test(k); });
  }
  function cases(){ var x=safeJSON(CASES_KEY,{}); return x && typeof x==='object' && !Array.isArray(x) ? x : {}; }
  function assessments(){ var x=safeJSON(ASSESS_KEY,{}); return x && typeof x==='object' && !Array.isArray(x) ? x : {}; }
  function selectedPathway(){ var p=localStorage.getItem(PATHWAY_KEY); return PATHWAYS[p] ? p : null; }
  function setPathway(p){ if(PATHWAYS[p]){ localStorage.setItem(PATHWAY_KEY,p); render(); } }
  function coreDone(){ var done=completed(); return CORE_KEYS.every(function(k){ return done.indexOf(k)!==-1; }); }
  function pathwayEligible(p){ var cs=cases(), as=assessments(); return coreDone() && !!(cs[p] && cs[p].completed) && !!(as[p] && as[p].passed); }
  function depthTrack(p){ return PATHWAYS[p] ? PATHWAYS[p].track : 'student'; }
  function coreHref(item,p){
    var track=depthTrack(p || selectedPathway() || 'beginner');
    return item.href + '?track=' + track + '&lessons=2,3,4,1' + (p ? '&pathway='+p : '');
  }
  function esc(s){ return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

  function renderSummary(){
    var el=document.getElementById('progressSummary'); if(!el) return;
    var done=completed(), n=CORE_KEYS.filter(function(k){return done.indexOf(k)!==-1;}).length;
    var p=selectedPathway(), pct=Math.round((n/CORE_KEYS.length)*100);
    el.innerHTML='<div><span>Core progress</span><strong>'+n+' / '+CORE_KEYS.length+' lessons</strong></div>'+
      '<div class="progress-summary-bar"><i style="width:'+pct+'%"></i></div>'+
      '<div><span>Pathway</span><strong>'+(p?PATHWAYS[p].label:'Not selected')+'</strong></div>';
  }
  function renderCore(){
    var el=document.getElementById('coreList'); if(!el) return;
    var done=completed(), p=selectedPathway();
    el.innerHTML=CORE.map(function(item){
      var ok=done.indexOf(item.key)!==-1;
      return '<a class="progress-core-item '+(ok?'done':'')+'" href="'+coreHref(item,p)+'">'+
        '<span class="progress-check">'+(ok?'&#10003;':'')+'</span><span><small>'+esc(item.module)+'</small><strong>'+esc(item.title)+'</strong></span><b>'+(ok?'Complete':'Open')+' &rarr;</b></a>';
    }).join('');
  }
  function renderPathways(){
    var el=document.getElementById('pathwayGrid'); if(!el) return;
    var current=selectedPathway();
    el.innerHTML=Object.keys(PATHWAYS).map(function(k){ var p=PATHWAYS[k]; return '<button type="button" class="pathway-card '+(current===k?'selected':'')+'" data-pathway="'+k+'"><span>'+p.label+'</span><strong>'+esc(p.description)+'</strong><small>'+(p.track==='student'?'Concise / foundational core':'Deeper radiology core')+'</small></button>'; }).join('');
    el.querySelectorAll('[data-pathway]').forEach(function(btn){ btn.addEventListener('click',function(){setPathway(btn.getAttribute('data-pathway'));}); });
  }
  function renderCompletion(){
    var wrap=document.getElementById('completionSteps'), title=document.getElementById('pathwayTitle'), desc=document.getElementById('pathwayDescription');
    if(!wrap||!title||!desc) return;
    var pkey=selectedPathway();
    if(!pkey){ title.textContent='Complete your pathway'; desc.textContent='Choose a pathway above to see the default completion sequence.'; wrap.innerHTML=''; return; }
    var p=PATHWAYS[pkey], cs=cases(), as=assessments();
    var core=coreDone(), caseDone=!!(cs[pkey]&&cs[pkey].completed), assessDone=!!(as[pkey]&&as[pkey].passed);
    title.textContent=p.label+' pathway'; desc.textContent=p.description;
    var steps=[
      {ok:core,title:'Core curriculum',note:'All four currently available required lessons',href:core?null:coreHref(CORE.find(function(x){return completed().indexOf(x.key)===-1;})||CORE[0],pkey),action:core?'Complete':'Resume core'},
      {ok:caseDone,title:p.caseLabel,note:'Applied human-AI cases at the selected depth',href:p.caseHref,action:caseDone?'Complete':'Start cases'},
      {ok:assessDone,title:p.assessmentLabel,note:'Pass score: 80% or higher',href:p.assessmentHref,action:assessDone?'Passed'+(as[pkey].bestScore?' - '+as[pkey].bestScore+'%':''):'Take assessment'}
    ];
    var html=steps.map(function(s){ return '<div class="completion-step '+(s.ok?'done':'')+'"><span class="progress-check">'+(s.ok?'&#10003;':'')+'</span><div><strong>'+esc(s.title)+'</strong><small>'+esc(s.note)+'</small></div>'+(s.href?'<a href="'+s.href+'">'+esc(s.action)+' &rarr;</a>':'<b>'+esc(s.action)+'</b>')+'</div>'; }).join('');
    if(pathwayEligible(pkey)) html += '<div class="certificate-ready"><div><span>All requirements complete</span><strong>Your completion certificate is ready.</strong></div><a class="btn btn-primary" href="certificate.html?pathway='+pkey+'">Generate certificate</a></div>';
    else html += '<div class="certificate-locked"><strong>Certificate</strong><span>Complete the remaining requirements above to unlock the certificate.</span></div>';
    wrap.innerHTML=html;
  }

  function exportProgress(){
    var payload={schema:'ai2practice-progress',version:1,exportedAt:new Date().toISOString(),pathway:selectedPathway(),completed:completed(),cases:cases(),assessments:assessments()};
    var blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}), a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download='ai2practice-progress.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){URL.revokeObjectURL(a.href);},500);
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
        if(Number.isFinite(score) && score>=0 && score<=100) out.assessments[k]={bestScore:Math.round(score),passed:a.passed===true};
      }
    });
    return out;
  }
  function importProgress(file,mode){
    var status=document.getElementById('importStatus');
    if(!file) return;
    if(file.size>65536){ if(status) status.textContent='Import rejected: progress files must be 64 KB or smaller.'; return; }
    var reader=new FileReader();
    reader.onload=function(){
      try{
        var incoming=cleanImported(JSON.parse(String(reader.result||'')));
        if(mode==='replace'){
          localStorage.setItem(COMPLETED_KEY,JSON.stringify(incoming.completed));
          localStorage.setItem(CASES_KEY,JSON.stringify(incoming.cases));
          localStorage.setItem(ASSESS_KEY,JSON.stringify(incoming.assessments));
          if(incoming.pathway) localStorage.setItem(PATHWAY_KEY,incoming.pathway); else localStorage.removeItem(PATHWAY_KEY);
        } else {
          var done=completed(); incoming.completed.forEach(function(k){if(done.indexOf(k)===-1)done.push(k);}); localStorage.setItem(COMPLETED_KEY,JSON.stringify(done));
          var cs=cases(); Object.keys(incoming.cases).forEach(function(k){cs[k]=incoming.cases[k];}); localStorage.setItem(CASES_KEY,JSON.stringify(cs));
          var as=assessments(); Object.keys(incoming.assessments).forEach(function(k){var old=as[k]||{}; var inc=incoming.assessments[k]; as[k]={bestScore:Math.max(Number(old.bestScore)||0,inc.bestScore||0),passed:!!old.passed||!!inc.passed};}); localStorage.setItem(ASSESS_KEY,JSON.stringify(as));
          if(incoming.pathway&&!selectedPathway()) localStorage.setItem(PATHWAY_KEY,incoming.pathway);
        }
        if(status) status.textContent='Progress imported successfully. The file was processed only in this browser.';
        render();
      }catch(e){ if(status) status.textContent='Import rejected: '+e.message; }
    };
    reader.readAsText(file);
  }
  function resetProgress(){
    if(!window.confirm('Reset locally saved AI2Practice progress on this browser? This cannot be undone unless you exported a backup.')) return;
    localStorage.removeItem(COMPLETED_KEY); localStorage.removeItem(CASES_KEY); localStorage.removeItem(ASSESS_KEY); localStorage.removeItem(PATHWAY_KEY);
    for(var i=localStorage.length-1;i>=0;i--){var k=localStorage.key(i); if(k&&k.indexOf('aiready_ckpt_')===0)localStorage.removeItem(k);}
    render();
  }
  function render(){ renderSummary(); renderCore(); renderPathways(); renderCompletion(); }

  document.getElementById('exportProgress').addEventListener('click',exportProgress);
  document.getElementById('importProgress').addEventListener('change',function(){var mode=document.getElementById('importMode').value; importProgress(this.files&&this.files[0],mode); this.value='';});
  document.getElementById('resetProgress').addEventListener('click',resetProgress);
  var requested=new URLSearchParams(location.search).get('pathway'); if(PATHWAYS[requested]) localStorage.setItem(PATHWAY_KEY,requested);
  render();
})();
