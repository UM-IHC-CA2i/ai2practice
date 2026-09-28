const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav-links');
function closeDrops(except) {
  document.querySelectorAll('.nav-drop.open').forEach(d => { if (d !== except) { d.classList.remove('open'); const b=d.querySelector('.nav-drop-toggle'); if(b)b.setAttribute('aria-expanded','false'); } });
}
if (toggle && nav) {
  toggle.addEventListener('click', () => { const open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); if(!open)closeDrops(); });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); closeDrops(); }));
}
document.querySelectorAll('.nav-drop').forEach(drop => {
  const b=drop.querySelector('.nav-drop-toggle'); if(!b)return;
  b.addEventListener('click',e=>{e.stopPropagation();const willOpen=!drop.classList.contains('open');closeDrops(drop);drop.classList.toggle('open',willOpen);b.setAttribute('aria-expanded',String(willOpen));});
  drop.addEventListener('mouseenter',()=>{ if(window.matchMedia('(min-width: 901px)').matches){closeDrops(drop);drop.classList.add('open');b.setAttribute('aria-expanded','true');} });
  drop.addEventListener('mouseleave',()=>{ if(window.matchMedia('(min-width: 901px)').matches){drop.classList.remove('open');b.setAttribute('aria-expanded','false');} });
});
document.addEventListener('click',()=>closeDrops());
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrops();});
document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
