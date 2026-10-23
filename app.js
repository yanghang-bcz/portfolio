/* All artwork is the original Figma export. Coordinates use its 1920 × 1080 master. */
(() => {
  'use strict';
  const home = document.querySelector('#home');
  const pages = new Map([...document.querySelectorAll('.page')].map(page => [page.id, page]));
  const nav = [...document.querySelectorAll('.quick-nav a')];
  // Slide direction follows the nav order: home sits leftmost, then ABOUT ME … TRAVEL.
  // Always one viewport of travel, never crossing the sections in between.
  const routeOrder = ['home', ...nav.map(link => link.dataset.route)];
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const satellites = [...document.querySelectorAll('.satellite')];
  let scale = 1;
  let hovered = null;
  let focused = null;
  let phase = 0;
  let lastTime = null;
  let current = 'home';
  let moving = false;
  let pending = null;

  function resize() {
    scale = innerWidth <= 700 ? Math.min(innerWidth / 1440, (innerHeight - 112) / 1500) : Math.min(innerWidth / 1920, innerHeight / 1080);
    document.documentElement.style.setProperty('--scale', scale);
    if (hovered || focused) clampLabel(hovered || focused);
  }
  addEventListener('resize', resize);
  resize();

  // Shared ellipse clock: all five stickers translate, never rotating as an orbital substitute.
  // Initial angles are projected from their existing Figma placements.
  const orbit = { cx: 935.47, cy: 596.21, rx: 502.22, ry: 119.79, rotation: -13.77 * Math.PI / 180 };
  const placements = [
    {name:'works',x:1259.5,y:629.5,w:233,h:161},
    {name:'music',x:589.3615,y:532.5375,w:233,h:157},
    {name:'about',x:960,y:713.5,w:204,h:167},
    {name:'thoughts',x:623,y:747.5,w:152,h:189},
    {name:'travel',x:1294,y:429,w:234,h:124}
  ];
  const cos = Math.cos(orbit.rotation), sin = Math.sin(orbit.rotation);
  const items = placements.map(p => {
    const dx = p.x - orbit.cx, dy = p.y - orbit.cy;
    return {...p,element:document.querySelector(`[data-satellite="${p.name}"]`),angle:Math.atan2((-sin*dx+cos*dy)/orbit.ry,(cos*dx+sin*dy)/orbit.rx)};
  });
  // Advance by arc length so the stickers keep their spacing around the narrow ends.
  const samples = 2048;
  const lengths = [0];
  let previous = {x:orbit.rx,y:0};
  for(let i=1;i<=samples;i++){
    const angle=i/samples*Math.PI*2;
    const point={x:orbit.rx*Math.cos(angle),y:orbit.ry*Math.sin(angle)};
    lengths.push(lengths[i-1]+Math.hypot(point.x-previous.x,point.y-previous.y));
    previous=point;
  }
  const circumference=lengths[samples];
  for(const item of items){
    const normalized=(item.angle+Math.PI*2)%(Math.PI*2)/(Math.PI*2)*samples;
    const index=Math.floor(normalized);
    item.distance=lengths[index]+(lengths[index+1]-lengths[index])*(normalized-index);
  }
  function angleAtDistance(distance){
    const target=(distance%circumference+circumference)%circumference;
    let low=0,high=samples;
    while(high-low>1){const middle=(low+high)>>1;if(lengths[middle]<target)low=middle;else high=middle;}
    return (low+(target-lengths[low])/(lengths[high]-lengths[low]))/samples*Math.PI*2;
  }
  function positionSatellites() {
    for (const item of items) {
      const a = angleAtDistance(item.distance+phase/(Math.PI*2)*circumference);
      const u = orbit.rx * Math.cos(a), v = orbit.ry * Math.sin(a);
      item.element.style.setProperty('--x', orbit.cx + u*cos-v*sin-item.w/2);
      item.element.style.setProperty('--y', orbit.cy + u*sin+v*cos-item.h/2);
    }
  }
  function clock(now) {
    const elapsed = lastTime === null ? 0 : Math.min(now-lastTime, 80);
    lastTime = now;
    if (!media.matches && !hovered && !focused && !document.hidden && current === 'home' && !moving) {
      phase = (phase + elapsed / 100000 * Math.PI * 2) % (Math.PI * 2);
      positionSatellites();
    }
    requestAnimationFrame(clock);
  }
  positionSatellites();
  requestAnimationFrame(clock);
  document.addEventListener('visibilitychange', () => {lastTime = null;});

  function clampLabel(item) {
    if (!item) return;
    item.style.setProperty('--label-shift', '0px');
    requestAnimationFrame(() => {
      const label = item.querySelector('.archive-label');
      const r = label.getBoundingClientRect();
      if (!r.width) return;
      const shift = r.left < 12 ? 12-r.left : r.right > innerWidth-12 ? innerWidth-12-r.right : 0;
      item.style.setProperty('--label-shift', `${shift/scale}px`);
    });
  }
  for (const item of satellites) {
    item.addEventListener('pointerenter', event => {if(event.pointerType !== 'touch'){hovered=item;clampLabel(item);}});
    item.addEventListener('pointerleave', () => {if(hovered===item)hovered=null;});
    item.addEventListener('focus', () => {focused=item;clampLabel(item);});
    item.addEventListener('blur', () => {if(focused===item)focused=null;});
  }
  function syncMotion() {
    home.classList.toggle('motion-paused', media.matches || current !== 'home' || moving);
  }
  media.addEventListener('change', syncMotion);
  syncMotion();

  function updateNav(active = current) {
    nav.forEach(link => {
      if (link.dataset.route === active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
  async function navigate(route, push=true, focus=true) {
    if (!pages.has(route)) route='home';
    if (push && (route !== current || moving)) history.pushState({route},'',`#${route}`);
    // Move the underline on click, not after the 600ms slide: otherwise the old
    // section keeps aria-current while the new one already shows its hover rule.
    updateNav(route);
    if (moving) {pending={route,push:false,focus};return;}
    if (route === current) return;
    moving=true;
    hovered=null;
    focused=null;
    const outgoing=pages.get(current), incoming=pages.get(route);
    // Right when moving forward through the nav order, left when moving back.
    const direction = routeOrder.indexOf(route) > routeOrder.indexOf(current) ? 1 : -1;
    outgoing.inert=true;
    outgoing.setAttribute('aria-hidden','true');
    incoming.inert=true;
    incoming.classList.add('is-moving');
    incoming.scrollTop=0;
    // Each page is a single moving parent: no opacity, scale, child delays or staggers.
    syncMotion();
    if (!media.matches) {
      const timing={duration:600,easing:'cubic-bezier(.65,0,.25,1)',fill:'both'};
      const animations=[
        outgoing.animate([{transform:'translateX(0)'},{transform:`translateX(${-direction*100}%)`}],timing),
        incoming.animate([{transform:`translateX(${direction*100}%)`},{transform:'translateX(0)'}],timing)
      ];
      await Promise.all(animations.map(a=>a.finished.catch(()=>{})));
      outgoing.classList.remove('is-active');
      incoming.classList.add('is-active');
      animations.forEach(a=>a.cancel());
    } else {
      outgoing.classList.remove('is-active');
      incoming.classList.add('is-active');
    }
    incoming.classList.remove('is-moving');
    incoming.inert=false;
    incoming.removeAttribute('aria-hidden');
    current=route;
    moving=false;
    updateNav();
    syncMotion();
    document.title=route==='home'?'YangHang — My Little Universe':`${incoming.querySelector('h1').textContent} — YangHang`;
    document.querySelector('#route-status').textContent=route==='home'?'已返回首页':`已打开 ${incoming.querySelector('h1').textContent}`;
    if (focus) incoming.querySelector('h1').focus({preventScroll:true});
    if(pending){const next=pending;pending=null;navigate(next.route,next.push,next.focus);}
  }
  // Answer the press, not the release: the underline moves on pointerdown, the page
  // itself still starts on click. Releasing off the link puts the underline back.
  let pressedNav=null;
  document.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    const link=event.target.closest('.quick-nav a[data-route]');
    if(!link)return;
    pressedNav=link;
    updateNav(link.dataset.route);
  });
  document.addEventListener('pointerup',event=>{
    if(!pressedNav)return;
    const link=pressedNav;
    pressedNav=null;
    if(!link.contains(event.target))updateNav();
  });
  document.addEventListener('pointercancel',()=>{if(pressedNav){pressedNav=null;updateNav();}});
  document.addEventListener('click',event=>{
    if(event.target.closest('.skip-link')){event.preventDefault();pages.get(current).querySelector('h1').focus({preventScroll:true});return;}
    const link=event.target.closest('a[data-route]');
    if(!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button!==0)return;
    event.preventDefault();
    navigate(link.dataset.route);
  });
  addEventListener('popstate',()=>navigate(location.hash.slice(1)||'home',false));
  document.addEventListener('keydown',event=>{
    // While a reading dialog is open, Escape belongs to it — closing the article must not also leave the section.
    if(event.key==='Escape'&&current!=='home'&&!document.documentElement.classList.contains('is-reader-open'))navigate('home');
  });
  const initial=location.hash.slice(1);
  if(initial && pages.has(initial) && initial!=='home'){
    pages.get('home').classList.remove('is-active');pages.get('home').inert=true;pages.get('home').setAttribute('aria-hidden','true');
    current=initial;const page=pages.get(initial);page.classList.add('is-active');page.inert=false;page.removeAttribute('aria-hidden');
    document.title=`${page.querySelector('h1').textContent} — YangHang`;updateNav();syncMotion();
  }
})();
