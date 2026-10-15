/* AI2Practice Start picker: a small step-by-step dialog (depth -> lessons -> review) where learners
   choose a learning depth and the lessons they want, then start.
   Open with any element marked [data-open-picker], optionally with [data-picker-depth].
   The choice is saved through assets/js/progress.js: the full default curriculum clears any plan;
   any other selection is stored as the learner's own plan (self:true). */
(function(){
  'use strict';

  // Depths with published content. The others show as "Coming soon".
  var AVAILABLE_DEPTHS = ['beginner'];
  var DEPTHS = [
    { id:'beginner', label:'Beginner', who:'New to clinical AI' },
    { id:'intermediate', label:'Intermediate', who:'Use AI in practice' },
    { id:'advanced', label:'Advanced', who:'Lead or teach AI' }
  ];

  var own = document.currentScript;
  var siteRoot = new URL('../../', own ? own.src : window.location.href);
  function siteUrl(p){ return new URL(p, siteRoot).href; }
  function esc(s){ return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function api(){ return window.AI2PracticeProgressRail; }

  var root, state, lastFocus;

  /* ---------- Selection model ---------- */

  function data(){
    var c=api().curriculum();
    return { modules:c.modules, lessons:c.lessons };
  }
  function defaults(){
    var d=data();
    return d.lessons.filter(function(l){ return l.published && !l.optional; }).map(function(l){ return l.key; });
  }
  function initialState(depth){
    var A=api(), plan=A.activePlan(), p=A.selectedPathway();
    var lessons=plan ? plan.lessons.slice() : defaults();
    var d=depth || (plan && plan.depth) || p;
    if (AVAILABLE_DEPTHS.indexOf(d)===-1) d=AVAILABLE_DEPTHS[0];
    return { depth:d, lessons:lessons,
      assessment:plan ? plan.assessment : true,
      step:1,
      replaces:plan && !plan.self ? (plan.title || 'Plan from your educator') : '' };
  }
  function has(k){ return state.lessons.indexOf(k)!==-1; }
  function toggle(k, on){
    var i=state.lessons.indexOf(k);
    if (on===undefined) on=i===-1;
    if (on && i===-1) state.lessons.push(k);
    if (!on && i!==-1) state.lessons.splice(i,1);
  }
  function isDefault(){
    var d=defaults();
    return state.assessment && state.lessons.length===d.length && d.every(has);
  }
  function summary(){
    var n=state.lessons.length, bits=[n+' lesson'+(n===1?'':'s')];
    if (state.assessment) bits.push('assessment');
    return bits.join(' + ');
  }
  function empty(){ return !state.lessons.length && !state.assessment; }
  function ordered(){
    var keys=data().lessons.map(function(l){ return l.key; });
    return state.lessons.slice().sort(function(a,b){ return keys.indexOf(a)-keys.indexOf(b); });
  }

  function start(){
    if (empty()) return;
    var A=api(), first=ordered()[0];
    if (isDefault()) { if (A.activePlan()) A.leavePlan(); A.setPathway(state.depth); }
    else A.setPlan({ self:true, title:'', depth:state.depth, lessons:state.lessons, assessment:state.assessment });
    var href=first ? 'lessons/'+first+'.html' : 'assessment.html';
    window.location.href=siteUrl(href);
  }

  /* ---------- Shared pieces ---------- */

  function depthOptions(style){
    return '<div class="sp-depths sp-depths--'+style+'" role="radiogroup" aria-label="Learning depth">'+DEPTHS.map(function(d){
      var ok=AVAILABLE_DEPTHS.indexOf(d.id)!==-1, on=ok && state.depth===d.id;
      return '<button type="button" role="radio" class="sp-depth'+(on?' is-on':'')+(ok?'':' is-soon')+'" data-depth="'+d.id+'" aria-checked="'+on+'"'+(ok?'':' aria-disabled="true"')+' style="--c:var(--route-'+d.id.slice(0,3)+')">'+
        '<i></i><b>'+d.label+'</b><small>'+(ok ? d.who : 'Coming soon')+'</small></button>';
    }).join('')+'</div>';
  }
  function lessonRow(l, kind){
    if (!l.published) {
      return '<div class="sp-row is-soon'+(kind==='switch'?' sp-row--switch':'')+'"><span class="'+(kind==='switch'?'sp-switch':'sp-box')+'" aria-hidden="true"></span><span class="sp-title">'+esc(l.title)+'</span><span class="sp-tag">Coming soon</span></div>';
    }
    var id='sp-'+l.key, on=has(l.key);
    return '<label class="sp-row'+(kind==='switch'?' sp-row--switch':'')+'" for="'+id+'"><input type="checkbox" id="'+id+'" data-lesson="'+l.key+'"'+(on?' checked':'')+'>'+
      '<span class="'+(kind==='switch'?'sp-switch':'sp-box')+'" aria-hidden="true"></span><span class="sp-title">'+esc(l.title)+'</span>'+
      (l.optional ? '<span class="sp-tag sp-tag--opt">Optional</span>' : '')+'</label>';
  }
  function moduleGroups(kind){
    var d=data();
    return d.modules.map(function(m){
      var ls=d.lessons.filter(function(l){ return l.module===m.id; });
      var pub=ls.filter(function(l){ return l.published; });
      var all=pub.length && pub.every(function(l){ return has(l.key); });
      return '<fieldset class="sp-mod"><legend><span>'+esc(m.name)+'</span>'+
        (pub.length ? '<button type="button" class="sp-all" data-module="'+m.id+'">'+(all?'Clear':'Select all')+'</button>' : '')+'</legend>'+
        ls.map(function(l){ return lessonRow(l, kind); }).join('')+'</fieldset>';
    }).join('');
  }
  function practice(kind){
    function row(key,label){
      var id='sp-'+key;
      return '<label class="sp-row'+(kind==='switch'?' sp-row--switch':'')+'" for="'+id+'"><input type="checkbox" id="'+id+'" data-practice="'+key+'"'+(state[key]?' checked':'')+'><span class="'+(kind==='switch'?'sp-switch':'sp-box')+'" aria-hidden="true"></span><span class="sp-title">'+label+'</span></label>';
    }
    return '<fieldset class="sp-mod"><legend><span>Assessment</span></legend>'+row('assessment','Assessment (80% to pass)')+'</fieldset>';
  }
  function tracks(){
    return '<p class="sp-tracks">Optional tracks, open any time: <a href="'+siteUrl('pages/research-lab.html')+'">Research Lab</a> &middot; <a href="'+siteUrl('pages/adoption-governance.html')+'">Leadership</a></p>';
  }
  function notice(){
    return state.replaces ? '<p class="sp-note">Starting replaces your educator&rsquo;s plan &ldquo;'+esc(state.replaces)+'&rdquo;. Completed lessons stay saved.</p>' : '';
  }
  function footer(extraLeft, primaryLabel, primaryAttr){
    return '<div class="sp-foot"><div class="sp-sum">'+(extraLeft || '<strong>'+summary()+'</strong>'+(isDefault() ? '<small>Full published curriculum</small>' : '<small>Your own plan</small>'))+'</div>'+
      '<button type="button" class="sp-btn" '+(primaryAttr||'data-start')+(empty()?' disabled':'')+'>'+(primaryLabel||'Start learning &rarr;')+'</button></div>';
  }

  /* ---------- Layouts ---------- */

  function layout(){
    var steps=['Depth','Lessons','Review'];
    var bar='<ol class="sp-steps">'+steps.map(function(s,i){ var n=i+1; return '<li class="'+(n===state.step?'is-on':'')+(n<state.step?' is-done':'')+'"><span>'+n+'</span>'+s+'</li>'; }).join('')+'</ol>';
    var body, foot;
    if (state.step===1) {
      body='<h3 class="sp-h">How deep do you want to go?</h3>'+depthOptions('cards')+'<p class="sp-muted">Only one depth is published so far. Intermediate and Advanced versions are coming soon; your choice carries over.</p>';
      foot=footer('<small>Step 1 of 3</small>','Next: lessons &rarr;','data-step="2"');
    } else if (state.step===2) {
      body=notice()+'<h3 class="sp-h">Turn off anything you don&rsquo;t need</h3>'+moduleGroups('switch')+practice('switch');
      foot='<div class="sp-foot"><button type="button" class="sp-link" data-step="1">&larr; Back</button><button type="button" class="sp-btn" data-step="3"'+(empty()?' disabled':'')+'>Review &rarr;</button></div>';
    } else {
      var d=data(), dep=DEPTHS.filter(function(x){ return x.id===state.depth; })[0];
      var items=ordered().map(function(k){ var l=d.lessons.filter(function(x){ return x.key===k; })[0]; return '<li>'+esc(l.title)+'</li>'; });
      if (state.assessment) items.push('<li>Assessment</li>');
      body='<h3 class="sp-h">Your plan</h3><div class="sp-review"><p><span>Depth</span><b>'+dep.label+'</b></p><ol>'+items.join('')+'</ol></div>'+tracks();
      foot='<div class="sp-foot"><button type="button" class="sp-link" data-step="2">&larr; Edit lessons</button><button type="button" class="sp-btn" data-start>Start learning &rarr;</button></div>';
    }
    return '<header class="sp-head"><h2 id="spTitle">Start learning</h2>'+bar+'</header><div class="sp-body">'+body+'</div>'+foot;
  }

  /* ---------- Dialog ---------- */

  function render(){
    var html=layout();
    var scroller=root.querySelector('.sp-body'), top=scroller ? scroller.scrollTop : 0;
    root.querySelector('.sp-card').innerHTML='<button type="button" class="sp-x" data-close aria-label="Close">&times;</button>'+html;
    scroller=root.querySelector('.sp-body'); if (scroller) scroller.scrollTop=top;
  }
  function build(){
    root=document.createElement('div');
    root.className='sp-overlay'; root.hidden=true;
    root.innerHTML='<div class="sp-card" role="dialog" aria-modal="true" aria-labelledby="spTitle"></div>';
    document.body.appendChild(root);
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    document.addEventListener('keydown', function(e){
      if (root.hidden) return;
      if (e.key==='Escape') close();
      if (e.key==='Tab') trap(e);
    });
  }
  function trap(e){
    var f=root.querySelectorAll('button:not([disabled]),input,a[href]'); if(!f.length) return;
    var first=f[0], last=f[f.length-1];
    if (e.shiftKey && document.activeElement===first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement===last) { e.preventDefault(); first.focus(); }
  }
  function onClick(e){
    var t=e.target;
    if (t===root || t.closest('[data-close]')) { close(); return; }
    var b;
    if ((b=t.closest('[data-depth]'))) { if (b.getAttribute('aria-disabled')!=='true') { state.depth=b.getAttribute('data-depth'); render(); } return; }
    if ((b=t.closest('[data-module]'))) {
      var id=b.getAttribute('data-module'), pub=data().lessons.filter(function(l){ return l.module===id && l.published; });
      var all=pub.every(function(l){ return has(l.key); });
      pub.forEach(function(l){ toggle(l.key, !all); }); render(); return;
    }
    if ((b=t.closest('[data-step]'))) { state.step=+b.getAttribute('data-step'); render(); root.querySelector('.sp-card').focus(); return; }
    if (t.closest('[data-start]')) start();
  }
  function onChange(e){
    var t=e.target;
    if (t.hasAttribute('data-lesson')) toggle(t.getAttribute('data-lesson'), t.checked);
    else if (t.hasAttribute('data-practice')) state[t.getAttribute('data-practice')]=t.checked;
    else return;
    render();
    var again=root.querySelector('#'+t.id); if (again) again.focus();
  }
  function open(depth){
    if (!api()) return false;
    if (!root) build();
    state=initialState(depth);
    lastFocus=document.activeElement;
    render();
    root.hidden=false; document.documentElement.classList.add('sp-open');
    var card=root.querySelector('.sp-card'); card.setAttribute('tabindex','-1'); card.focus();
    return true;
  }
  function close(){
    root.hidden=true; document.documentElement.classList.remove('sp-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // Links keep their href as a fallback until progress.js is ready.
  document.addEventListener('click', function(e){
    var a=e.target.closest && e.target.closest('[data-open-picker]'); if(!a) return;
    if (open(a.getAttribute('data-picker-depth'))) e.preventDefault();
  });

  window.AI2StartPicker = { open:open, close:close, availableDepths:AVAILABLE_DEPTHS.slice() };
})();
