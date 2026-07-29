(()=>{
  const map=document.querySelector('#map');
  if(!map)return;
  const paths={
    eco:['M570 300 C520 245 455 235 410 270 S365 335 340 430','M570 300 C515 230 435 220 390 265 S350 350 340 430'],
    slow:['M570 300 C505 330 445 365 390 390 S360 415 340 430','M570 300 C500 320 445 355 400 385 S360 415 340 430'],
    outer:['M570 300 C540 405 480 470 410 485 S365 455 340 430','M570 300 C550 390 495 460 425 480 S370 450 340 430'],
    north:['M570 300 C520 260 465 250 415 285 S365 365 340 430','M570 300 C515 250 450 245 405 290 S360 370 340 430'],
    safety:['M570 300 C555 310 545 320 535 330']
  };
  const speeds={eco:12,slow:9.5,outer:12.6,north:10,safety:0};
  const style=document.createElement('style');
  style.textContent=`
    .map-panel{align-self:start!important;height:auto!important;min-height:0!important;overflow:visible!important;padding-bottom:14px}
    .map{height:500px!important;min-height:0!important;transform:translateX(-18px);width:calc(100% + 18px)!important}
    .map.v2-real{background-position:36% center!important}
    .map.v2-real svg{transform:none!important;width:100%!important}
    .nav-card{position:relative!important;left:auto!important;bottom:auto!important;transform:none!important;width:calc(100% - 36px)!important;margin:10px auto 0!important}
    .nav-controls{gap:4px!important;margin-top:7px!important}
  `;
  document.head.append(style);
  let selected='eco',variant=0;
  function apply(id){
    if(!paths[id])id='eco';
    selected=id;
    const p=paths[id][variant%paths[id].length];
    map.dataset.liveSpeed=String(speeds[id]);
    for(const el of document.querySelectorAll('#activePath,#basePath'))el.setAttribute('d',p);
    const circles=document.querySelectorAll('#map svg .marker circle');
    if(circles[0]){circles[0].setAttribute('cx','570');circles[0].setAttribute('cy','300');}
    if(circles[1]){circles[1].setAttribute('cx','340');circles[1].setAttribute('cy','430');}
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
  apply('eco');
})();
