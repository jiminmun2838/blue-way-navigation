(()=>{
  const map=document.querySelector('#map');
  if(!map)return;
  const paths={
    eco:['M640 185 C575 220 510 235 456 282 C380 348 258 448 84 508','M640 185 C566 207 490 226 424 282 C340 354 224 452 84 508'],
    slow:['M640 185 C580 250 518 309 430 377 C332 452 212 487 84 508','M640 185 C570 242 498 298 402 370 C304 441 198 482 84 508'],
    outer:['M640 185 C634 294 574 410 470 488 C344 564 190 548 84 508','M640 185 C620 282 554 397 442 482 C326 548 178 540 84 508'],
    north:['M640 185 C568 192 507 228 445 284 C334 365 205 458 84 508','M640 185 C558 182 486 221 421 284 C321 371 198 463 84 508'],
    safety:['M640 185 C608 202 582 226 558 252']
  };
  const speeds={eco:12,slow:9.5,outer:12.6,north:10,safety:0};
  const style=document.createElement('style');
  style.textContent=`
    .map-panel{align-self:start!important;height:auto!important;min-height:0!important;overflow:visible!important;padding:0 0 22px!important;display:flex!important;flex-direction:column!important}
    .map{height:500px!important;min-height:0!important;transform:translateX(-18px);width:calc(100% + 18px)!important;flex:none!important}
    .map.v2-real{background-position:36% center!important}
    .map.v2-real svg{transform:none!important;width:100%!important}
    .nav-card{position:relative!important;left:auto!important;bottom:auto!important;transform:none!important;width:calc(100% - 36px)!important;margin:18px auto 0!important;flex:none!important}
    .nav-controls{gap:4px!important;margin-top:7px!important}
    .map-panel:fullscreen{display:flex!important;flex-direction:column!important;padding:14px!important;background:#061c29!important}
    .map-panel:fullscreen .map{height:calc(100vh - 184px)!important;width:100%!important;transform:none!important;flex:1 1 auto!important}
    .map-panel:fullscreen .nav-card{display:block!important;width:min(680px,94%)!important;margin:12px auto 0!important;z-index:20!important}
    .endpoint-live{position:absolute;z-index:11;transform:translate(-50%,-50%);padding:6px 9px;border-radius:8px;border:1px solid #74d9d0;background:#062433ed;color:#effffb;font-size:11px;font-weight:800;white-space:nowrap;pointer-events:none;box-shadow:0 3px 10px #00172177}
    .endpoint-live.end{border-color:#9bea75;background:#163c31ed}
  `;
  document.head.append(style);
  let selected='eco',variant=0;
  const svg=map.querySelector('svg');
  const startLabel=document.createElement('div');
  const endLabel=document.createElement('div');
  startLabel.className='endpoint-live start';
  endLabel.className='endpoint-live end';
  map.append(startLabel,endLabel);
  const pointNames={dadaepo:'다대포항',gadeok:'가덕도 대항',noksado:'눌차도 북항',jinudo:'진우도 관찰지점'};
  function selectedName(id,fallback){
    const select=document.querySelector(id);
    return select?.selectedOptions?.[0]?.textContent?.trim()||fallback;
  }
  function placeEndpoint(el,p,caption){
    el.textContent=caption;
    el.style.left=(p.x/760*100)+'%';
    el.style.top=(p.y/770*100)+'%';
  }
  function syncEndpoints(){
    const path=document.querySelector('#activePath');
    if(!path||!svg)return;
    try{
      const total=path.getTotalLength();
      placeEndpoint(startLabel,path.getPointAtLength(0),'출발 · '+selectedName('#v2Start','다대포항'));
      placeEndpoint(endLabel,path.getPointAtLength(total),'목적 · '+selectedName('#v2End','가덕도 대항'));
    }catch(_){/* SVG is still being initialized. */}
  }
  function apply(id){
    if(!paths[id])id='eco';
    selected=id;
    const p=paths[id][variant%paths[id].length];
    map.dataset.liveSpeed=String(speeds[id]);
    for(const el of document.querySelectorAll('#activePath,#basePath'))el.setAttribute('d',p);
    const circles=document.querySelectorAll('#map svg .marker circle');
    if(circles[0]){circles[0].setAttribute('cx','640');circles[0].setAttribute('cy','185');}
    if(circles[1]){circles[1].setAttribute('cx','84');circles[1].setAttribute('cy','508');}
    requestAnimationFrame(syncEndpoints);
  }
  function updateSpeed(){
    const v=Number(map.dataset.liveSpeed);
    const el=document.querySelector('#speed');
    if(el)el.innerHTML=v.toFixed(1)+' <small style="font-size:11px">kn</small>';
  }
  document.addEventListener('click',event=>{
    const routeButton=event.target.closest('[data-route],[data-enhanced-route]');
    if(routeButton){variant=0;apply(routeButton.dataset.route||routeButton.dataset.enhancedRoute);return;}
    if(event.target.id==='refreshSightings'){variant++;apply(selected);}
    if(event.target.id==='slowerBtn')map.dataset.liveSpeed='10';
    if(event.target.id==='saveVesselChoice')setTimeout(()=>{
      const active=document.querySelector('#vesselChoices .active');
      const index=active?Number(active.dataset.vessel):2;
      const vesselSpeed=[16,12,13.5,11][index]||13.5;
      map.dataset.liveSpeed=String(vesselSpeed);
      const info=document.querySelectorAll('.specs b');
      if(info[0])info[0].textContent=vesselSpeed.toFixed(1)+' kn';
    },60);
  });
  setInterval(updateSpeed,50);
  document.querySelectorAll('#v2Start,#v2End').forEach(select=>select.addEventListener('change',()=>setTimeout(syncEndpoints,50)));
  window.addEventListener('resize',syncEndpoints);
  apply('eco');
  setTimeout(syncEndpoints,120);
})();
