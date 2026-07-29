(()=>{
  const map=document.querySelector('#map');
  if(!map)return;
  const paths={
    eco:['M560 360 C510 422 470 495 390 520 S315 480 280 420','M560 360 C500 432 458 505 380 530 S305 485 280 420'],
    slow:['M560 360 C505 382 450 407 390 420 S320 422 280 420','M560 360 C500 375 442 398 382 414 S318 420 280 420'],
    outer:['M560 360 C565 485 505 595 395 610 S300 505 280 420','M560 360 C550 475 490 580 382 598 S294 500 280 420'],
    north:['M560 360 C505 340 450 350 400 385 S330 415 280 420','M560 360 C500 330 442 342 390 378 S320 412 280 420'],
    safety:['M560 360 C535 372 515 385 495 400']
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
    if(circles[0]){circles[0].setAttribute('cx','560');circles[0].setAttribute('cy','360');}
    if(circles[1]){circles[1].setAttribute('cx','280');circles[1].setAttribute('cy','420');}
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
