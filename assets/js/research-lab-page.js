/* Research Lab landing page: lab timeline (status from progress.js), coding-mode mix, "Where do I start?" check */
(function(){
  'use strict';
  document.documentElement.classList.add('js');

  var MODES=[['write','Write','From an empty cell, with a hint'],['fill','Fill in','Finish partly written code'],['reuse','Reuse','Import a function you wrote earlier'],['ai','Direct the AI','Have an AI write it; a test checks it'],['fix','Fix','Find the bug in AI-written code'],['read','Read','Order lines or predict output']];
  var LABS=[
    {name:'Python, Colab and GitHub',time:'1.5 h',q:'How many CT scans were done last month, and of which body regions?',parts:['Python basics','Loading a table','A first chart','Saving your work to GitHub'],mix:[45,30,0,0,0,25]},
    {name:'Clinical data',time:'2 h',q:'Are patients sent for CT older than those sent for MRI?',parts:['Cleaning messy data','Describing it: Table 1','Charts','Statistical tests'],mix:[40,30,10,0,0,20]},
    {name:'Evaluating an AI tool',time:'2 h',q:'A pneumothorax detector claims 94% sensitivity. What does it get on local data, and is it equal at both sites?',parts:['Confusion matrix','Sensitivity, specificity, PPV, NPV','Thresholds and ROC curves','Subgroups'],mix:[25,15,20,20,10,10]},
    {name:'Imaging AI',time:'2 h',q:'Can a model tell pneumonia from normal on a chest X-ray, and what is it looking at?',parts:['Images as data','Splitting by patient','A first image model (CNN)','Saliency maps and a second hospital'],mix:[10,20,20,25,20,5]},
    {name:'Reports and LLMs',time:'1.5 h',q:'How often do reports mention an incidental lung nodule, and can a large language model find them reliably?',parts:['Reports as text data','Simple rules vs an LLM','Checking LLM output'],mix:[15,15,25,25,15,5]},
    {name:'Your project',time:'4-6 h',q:'Your own question on an open dataset, written up as a short abstract.',parts:['A question','An analysis','A structured abstract','Peer review'],mix:[20,0,40,30,0,10],opt:true}
  ];
  function href(i){ return '../lessons/research-'+(i+1)+'.html'; }

  // Status per lab from progress.js; falls back to "not started" before it loads.
  function status(){
    var rail=window.AI2PracticeProgressRail, list=rail&&rail.labs ? rail.labs() : [];
    return LABS.map(function(l,i){
      var s=list[i]||{}, done=(s.partsDone||[]).length;
      return { done:s.done?l.parts.length:Math.min(done,l.parts.length), finished:!!s.done, help:!!s.help, partsDone:s.partsDone||[] };
    });
  }
  function state(st){ return st.finished ? 'done' : st.done ? 'now' : 'next'; }
  function tagFor(l,st){
    var s=state(st);
    if(s==='done') return '<span class="tag done">'+(st.help?'Finished with help':'Finished')+'</span>';
    if(s==='now') return '<span class="tag now">'+st.done+' of '+l.parts.length+' parts</span>';
    return l.opt ? '<span class="tag opt">Optional</span>' : '<span class="tag">'+l.time+'</span>';
  }
  function bar(mix,r){
    var label=mix.map(function(v,i){ return v ? MODES[i][1]+' '+v+'%' : ''; }).filter(Boolean).join(', ');
    return '<div class="mixbar" role="img" aria-label="'+label+'">'+mix.map(function(v,i){ return v ? '<i style="width:'+v+'%;background:var(--m-'+MODES[i][0]+');--r:'+(r||0)+';--c:'+i+'"></i>' : ''; }).join('')+'</div>';
  }
  function parts(l,st){ return '<ul class="parts">'+l.parts.map(function(p,i){ return '<li class="'+(st.partsDone.indexOf(i)!==-1||st.finished?'ok':'')+'"><span class="pd"></span>'+p+'</li>'; }).join('')+'</ul>'; }
  function action(i,st){
    var s=state(st);
    if(s==='done') return '<a class="pill line" href="'+href(i)+'">Review Lab '+(i+1)+'</a>';
    if(s==='now') return '<a class="pill dark" href="'+href(i)+'">Continue Lab '+(i+1)+' &rarr;</a>';
    return '<a class="pill line" href="'+href(i)+'">Open Lab '+(i+1)+'</a>';
  }
  // The lab to suggest next: the first one started but not finished, else the first not finished.
  function current(S){
    for(var i=0;i<S.length;i++) if(state(S[i])==='now') return i;
    for(i=0;i<S.length;i++) if(!S[i].finished && !LABS[i].opt) return i;
    return -1;
  }

  var J=document.getElementById('journey'), vb, opened=null;
  function renderJourney(){
    var S=status(), cur=current(S), finished=S.filter(function(s,i){ return s.finished && !LABS[i].opt; }).length;
    if(opened===null) opened=cur;
    // The rail fills to the current lab's node (half a step into it when it is under way).
    var fill=cur===-1 ? 100 : Math.min(100,(cur+(state(S[cur])==='now'?.5:0))/(LABS.length-1)*100);
    var h='<div class="vb-rail"><div class="vb-fill'+(vb&&vb.classList.contains('in')?' now':'')+'" style="--h:'+fill+'%"></div></div>';
    LABS.forEach(function(l,i){
      var st=S[i], s=state(st), open=i===opened, id='lab'+(i+1);
      if(l.opt) h+='<div class="vb-gap">Then, if you want a portfolio piece</div>';
      h+='<div class="vb-item '+s+(l.opt?' opt':'')+'"><div class="vb-node" aria-hidden="true">'+(s==='done'?'<svg width="14" height="14" viewBox="0 0 14 14"><path d="M2.5 7.5l3 3 6-6.5" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>':i+1)+'</div>'+
        '<div class="vb-card" data-open="'+open+'" data-i="'+i+'"><button class="vb-head" aria-expanded="'+open+'" aria-controls="'+id+'"><div><div class="meta" style="margin-bottom:.35rem"><span>Lab '+(i+1)+'</span>'+tagFor(l,st)+'</div><h3>'+l.name+'</h3><p class="q">'+l.q+'</p></div>'+
        '<span class="chev" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg></span></button>'+
        '<div class="vb-body" id="'+id+'"><div><div class="vb-inner"><div><p class="mini-lbl">Parts</p>'+parts(l,st)+'</div><div><p class="mini-lbl">How you\'ll work with code</p>'+bar(l.mix)+'<div class="meta" style="margin-top:.6rem"><span>About '+l.time+'</span></div><div style="margin-top:1.2rem">'+action(i,st)+'</div></div></div></div></div></div></div>';
    });
    if(!vb){ vb=document.createElement('div'); vb.className='vb rv'; J.appendChild(vb); }
    vb.innerHTML=h;

    var go=document.getElementById('rlGo');
    if(go){
      var started=S.some(function(s){ return s.done; });
      if(cur===-1){ go.href='#labs'; go.innerHTML='Review your labs <span class="ar" aria-hidden="true">&rarr;</span>'; }
      else { go.href=href(cur); go.innerHTML=(started?'Continue':'Start')+' Lab '+(cur+1)+' <span class="ar" aria-hidden="true">&rarr;</span>'; }
    }
    var d=document.getElementById('rlDone'); if(d) d.textContent=finished+' of 5';
  }
  J.addEventListener('click',function(e){
    var b=e.target.closest('.vb-head'); if(!b) return;
    var c=b.parentElement, o=c.getAttribute('data-open')!=='true';
    c.setAttribute('data-open',o); b.setAttribute('aria-expanded',o);
    opened=o ? +c.getAttribute('data-i') : -1;
  });
  renderJourney();
  window.addEventListener('ai2practice:progress-changed',renderJourney);
  window.addEventListener('load',renderJourney);

  document.getElementById('mix').innerHTML=LABS.map(function(l,i){ return '<div class="mix-row"><span><em>0'+(i+1)+'</em>'+l.name+'</span>'+bar(l.mix,i)+'</div>'; }).join('');
  document.getElementById('key').innerHTML=MODES.map(function(m){ return '<div><i style="background:var(--m-'+m[0]+')"></i><span><b>'+m[1]+'</b><small>'+m[2]+'</small></span></div>'; }).join('');

  /* Where do I start? */
  var SQ=['I have written a loop or function in Python','I have cleaned or summarized a table with pandas (a Python library for tables)','I can explain the difference between sensitivity and PPV (positive predictive value)','I have trained a model on images or text'], ans=[null,null,null,null];
  var sq=document.getElementById('sq');
  sq.innerHTML=SQ.map(function(q,i){ return '<div class="sq"><span id="sq'+i+'">'+q+'</span><span class="seg" role="group" aria-labelledby="sq'+i+'" data-i="'+i+'"><span class="knob"></span><button type="button" aria-pressed="false" data-v="1">Yes</button><button type="button" aria-pressed="false" data-v="0">No</button></span></div>'; }).join('');
  function rec(){
    var n=ans.filter(function(a){ return a!==null; }).length, start=1, el=document.getElementById('result'), txt;
    if(!n){ el.innerHTML='<div class="swap"><p class="eyebrow">Suggested start</p><h3>Answer the questions</h3><p>Most people with no coding background start at Lab 1. It assumes nothing.</p></div>'; return; }
    if(ans[0]===1) start=2;
    if(ans[0]===1&&ans[1]===1) start=3;
    if(start===3&&ans[2]===1) start=4;
    var l=LABS[start-1];
    txt=start===1 ? 'It starts from zero: what Python is, how Colab works, and saving to GitHub.' : 'Take the Lab '+start+' warm-up first. If it feels easy, keep going; if not, step back one lab.';
    if(ans[3]===1&&start>=3) txt+=' With model experience, Lab 6 (your own project) may be a good goal soon.';
    el.innerHTML='<div class="swap"><p class="eyebrow">Suggested start</p><h3>Lab '+start+': '+l.name+'</h3><p>'+txt+'</p></div><div><a class="pill solid" href="'+href(start-1)+'">Go to Lab '+start+' <span class="ar" aria-hidden="true">&rarr;</span></a></div>';
  }
  sq.addEventListener('click',function(e){
    var b=e.target.closest('button'); if(!b) return;
    var seg=b.parentElement, i=+seg.getAttribute('data-i');
    ans[i]=+b.getAttribute('data-v'); seg.setAttribute('data-v',b.getAttribute('data-v'));
    seg.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed',x===b); });
    rec();
  });
  rec();

  /* Clinical evaluation tabs (arrow keys move between tabs) */
  var tl=document.querySelector('.ce-tabs');
  if(tl){
    var tabs=[].slice.call(tl.querySelectorAll('[role="tab"]'));
    function pick(t,focus){
      tabs.forEach(function(x){ var on=x===t; x.setAttribute('aria-selected',on); x.tabIndex=on?0:-1; document.getElementById(x.getAttribute('aria-controls')).hidden=!on; });
      if(focus) t.focus();
    }
    tl.addEventListener('click',function(e){ var t=e.target.closest('[role="tab"]'); if(t) pick(t); });
    tl.addEventListener('keydown',function(e){
      var i=tabs.indexOf(document.activeElement); if(i===-1) return;
      if(e.key==='ArrowRight'||e.key==='ArrowLeft'){ e.preventDefault(); pick(tabs[(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length],true); }
    });
  }

  /* Reveal once */
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }); },{threshold:.15,rootMargin:'0px 0px -8% 0px'});
    document.querySelectorAll('.rl .rv').forEach(function(el){ io.observe(el); });
  } else document.querySelectorAll('.rl .rv').forEach(function(el){ el.classList.add('in'); });
})();
