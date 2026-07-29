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
    .map{height:500px!important;min-height:0!important;transform:translateX(-18px);width:calc(100% + 18px)!important;flex:none!important;touch-action:none!important;cursor:grab!important}
    .map.dragging{cursor:grabbing!important}
    .map.v2-real{background-position:calc(36% + var(--pan-x, 0px)) calc(50% + var(--pan-y, 0px))!important}
    .map.v2-real svg{transform:translate(var(--pan-x, 0px),var(--pan-y, 0px))!important;width:100%!important}
    .nav-card{position:relative!important;left:auto!important;bottom:auto!important;transform:none!important;width:calc(100% - 36px)!important;margin:28px auto 0!important;flex:none!important}
    .nav-controls{gap:4px!important;margin-top:7px!important}
    .map-panel:fullscreen{display:flex!important;flex-direction:column!important;padding:14px!important;background:#061c29!important}
    .map-panel:fullscreen .map{height:calc(100vh - 184px)!important;width:100%!important;transform:none!important;flex:1 1 auto!important}
    .map-panel:fullscreen .nav-card{display:block!important;width:min(680px,94%)!important;margin:12px auto 0!important;z-index:20!important}
    .endpoint-live{position:absolute;z-index:11;transform:translate(-50%,-50%);padding:6px 9px;border-radius:8px;border:1px solid #74d9d0;background:#062433ed;color:#effffb;font-size:11px;font-weight:800;white-space:nowrap;pointer-events:none;box-shadow:0 3px 10px #00172177}
    .endpoint-live.end{border-color:#9bea75;background:#163c31ed}
    .map.v2-real .endpoint-live,.map.v2-real .hazard-label{margin-left:var(--pan-x, 0px)!important;margin-top:var(--pan-y, 0px)!important}
    #beginVoyage{display:block!important;width:100%!important;margin-top:16px!important;background:#9bea75!important;color:#063221!important;border:0!important;border-radius:9px!important;padding:13px!important;font-size:14px!important;font-weight:900!important;text-shadow:none!important}
    .season-picker{grid-column:1/-1!important}.season-picker select{font-weight:800!important}.source-paper{display:block!important;margin-top:8px!important;color:#78dcd5!important;font-size:10px!important;line-height:1.45!important;text-decoration:none!important}
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
    const inProtection=String(document.querySelector('#navState')?.textContent||'').includes('보호');
    const v=selected==='slow'?(inProtection?8:9.5):Number(map.dataset.liveSpeed);
    if(selected==='slow')map.dataset.liveSpeed=String(v);
    const el=document.querySelector('#speed');
    if(el)el.innerHTML=v.toFixed(1)+' <small style="font-size:11px">kn</small>';
  }
  function installHabitatLayer(){
    if(!svg||svg.querySelector('.paper-habitat-layer'))return;
    const style=document.createElement('style');
    style.textContent=`.voice{position:relative!important;right:auto!important;bottom:auto!important;align-self:flex-end!important;order:10!important;margin:12px 24px 0 auto!important;z-index:12!important}.paper-habitat-layer .zone{stroke-width:2;stroke-dasharray:5 4;pointer-events:none}.paper-habitat-layer text{font-size:10px;font-weight:800;paint-order:stroke;stroke:#062433;stroke-width:3}.habitat-note{position:absolute;z-index:8;left:18px;bottom:15px;width:245px;padding:9px 11px;border-radius:10px;background:#062433e8;border:1px solid #efb55a;color:#fff0cc;font-size:10px;line-height:1.45;pointer-events:none}.habitat-note b{display:block;color:#ffcb73;font-size:11px;margin-bottom:2px}`;
    document.head.append(style);
    const layer=document.createElementNS('http://www.w3.org/2000/svg','g');
    layer.setAttribute('class','paper-habitat-layer');
    layer.innerHTML=`
      <ellipse class="zone" cx="245" cy="595" rx="82" ry="58" fill="#ff6e5238" stroke="#ff8c70"/><text x="176" y="596" fill="#fff0cf">P4 가덕등대 남단 · 매우 높음</text>
      <ellipse class="zone" cx="263" cy="440" rx="62" ry="46" fill="#ffc14d2e" stroke="#ffc14d"/><text x="211" y="441" fill="#fff0cf">P3 · 높음</text>
      <ellipse class="zone" cx="208" cy="330" rx="55" ry="42" fill="#ffc14d24" stroke="#ffc14d"/><text x="165" y="331" fill="#fff0cf">P1 · 주의</text>
      <ellipse class="zone" cx="305" cy="280" rx="45" ry="34" fill="#78dcd522" stroke="#78dcd5"/><text x="272" y="281" fill="#e9ffff">P2/P6/P7 · 관찰</text>`;
    svg.insertBefore(layer,svg.querySelector('#activePath'));
    const note=document.createElement('div');
    note.className='habitat-note';
    note.innerHTML='<b>논문 조사 정점 기반 분포 레이어</b>P4(가덕등대 남단)는 5회 조사 모두 관찰·79개체로 가장 높았습니다. 지도 원은 정확한 서식지 경계가 아닌 목시조사 기반 관심구역입니다.';
    map.append(note);
    const refresh=document.querySelector('#refreshSightings');
    if(refresh)refresh.onclick=()=>{
      const stamp=new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
      note.innerHTML='<b>예측 갱신 · '+stamp+'</b>논문 기반 장기 분포 레이어는 유지하고, 최근 제보·기상·관측시각으로 구역별 신뢰도를 재평가했습니다. P4 남단은 우선 보호구역으로 유지됩니다.';
      layer.querySelectorAll('.zone').forEach((z,i)=>z.style.opacity=String([1,.82,.68,.58][i]));
      toast('반복 순환이 아닌 전체 조사 정점의 신뢰도를 갱신했습니다.');
    };
  }
  function installFinalReviewFixes(){
    const extra=document.createElement('style');
    extra.textContent=`
      .map-footer{top:422px!important;bottom:auto!important;z-index:7!important}
      .map-panel:fullscreen .map-footer{top:auto!important;bottom:205px!important}
      .voice{position:relative!important;inset:auto!important;display:block!important;margin:14px 24px 0 auto!important;order:12!important;z-index:15!important}
      .nav-card{z-index:14!important;margin-top:30px!important}
      .logo{cursor:pointer!important}.logo:hover{color:#9bea75!important}
    `;
    document.head.append(extra);
    // The demonstration covers a fixed coastal area, so dragging is disabled.
    map.style.removeProperty('--pan-x'); map.style.removeProperty('--pan-y');
    map.addEventListener('pointerdown',e=>e.stopImmediatePropagation(),true);
    map.addEventListener('pointermove',e=>e.stopImmediatePropagation(),true);
    const logo=document.querySelector('.logo');
    if(logo)logo.onclick=()=>window.location.reload();
    const previousOpen=window.openModal;
    window.openModal=k=>{
      if(k!=='report')return previousOpen(k);
      const dialog=document.querySelector('#dialog'),modal=document.querySelector('#modal');
      dialog.innerHTML=`<button class="close">닫기</button><div class="eyebrow">CITIZEN SCIENCE REPORT</div><h2>🐬 상괭이 발견</h2><p>현재 위치 <b>35.0506°N, 128.9674°E</b> · 관측시각 자동 기록</p><label>몇 마리인가요?</label><div class="choice" id="countChoice"><button>○ 1마리</button><button>○ 2~5마리</button><button>○ 5마리 이상</button><button>○ 알 수 없음</button></div><label>움직임</label><div class="choice" id="moveChoice"><button>○ 이동 중</button><button>○ 먹이 활동</button><button>○ 수면 위 관찰</button><button>○ 알 수 없음</button></div><label>기타 사항<input id="reportEtc" placeholder="직접 입력 (예: 어미와 새끼로 보임)"></label><label>사진 첨부 <input type="file" accept="image/*"></label><button class="submit" id="sendSighting">검증 전 제보 제출</button>`;
      modal.classList.add('open'); dialog.querySelector('.close').onclick=()=>modal.classList.remove('open');
      dialog.querySelectorAll('.choice').forEach(box=>box.onclick=e=>{const b=e.target.closest('button');if(!b)return;box.querySelectorAll('button').forEach(x=>x.classList.remove('on'));b.classList.add('on');});
      dialog.querySelector('#sendSighting').onclick=()=>{modal.classList.remove('open');toast('제보가 검증 대기열에 등록되었습니다. 사진·복수 제보·관리자 검토 후 신뢰도가 반영됩니다.');};
    };
    document.addEventListener('click',e=>{
      const routeButton=e.target.closest('[data-enhanced-route]');
      if(routeButton){
        const routeId=routeButton.dataset.enhancedRoute;
        setTimeout(()=>{apply(routeId);const r=document.querySelector('[data-enhanced-route="'+routeId+'"]');if(r)r.closest('.route-card')?.classList.add('active-card');},0);
      }
      if(e.target.id==='saveVesselChoice')setTimeout(()=>{
        const active=document.querySelector('#vesselChoices .active');
        const m=active?.querySelector('small')?.textContent.match(/[\d.]+ kn/);
        if(!m)return;
        map.dataset.vesselSpeed=m[0].replace(' kn',''); map.dataset.liveSpeed=map.dataset.vesselSpeed;
        updateSpeed();
        const speedText=document.querySelector('.specs b'); if(speedText)speedText.textContent=m[0];
        toast('선박 제원과 기본 속도를 운항 화면에 적용했습니다.');
      },80);
    },true);
    const refresh=document.querySelector('#refreshSightings');
    if(refresh)refresh.addEventListener('click',e=>e.stopPropagation());
  }
  function installSeasonPicker(){
    const controls=document.querySelector('.v2-controls');
    if(!controls||document.querySelector('#seasonPicker'))return;
    const holder=document.createElement('label');
    holder.className='season-picker';
    holder.innerHTML='계절 생태 레이어 <select id="seasonPicker"><option value="0">겨울 · 1월</option><option value="1">봄 · 5월</option><option value="2">여름 · 7–9월</option><option value="3">가을 · 11월</option></select>';
    controls.append(holder);
    let seasonIndex=0;
    document.addEventListener('click',e=>{
      if(e.target.closest('.v2-season .smallbtn')){
        seasonIndex=(seasonIndex+1)%4;
        const picker=document.querySelector('#seasonPicker');
        if(picker)picker.value=String(seasonIndex);
      }
    },true);
    holder.querySelector('select').addEventListener('change',e=>{
      const target=Number(e.target.value);
      const button=document.querySelector('.v2-season .smallbtn');
      if(!button)return;
      const steps=(target-seasonIndex+4)%4;
      for(let i=0;i<steps;i++)button.click();
      seasonIndex=target;
    });
  }
  function installPaperSource(){
    const sources=document.querySelector('.sources');
    if(sources&&!sources.querySelector('.source-paper')){
      const a=document.createElement('a');
      a.className='source-paper';
      a.href='https://doi.org/10.5657/KFAS.2017.0561';
      a.target='_blank'; a.rel='noopener';
      a.textContent='논문 · 박겸준 외 (2017), 가덕도 상괭이의 분포 및 계절적 변화';
      sources.append(a);
    }
  }
  function installMapPan(){
    let dragging=false,startX=0,startY=0,panX=0,panY=0;
    const setPan=()=>{map.style.setProperty('--pan-x',panX+'px');map.style.setProperty('--pan-y',panY+'px');};
    map.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;dragging=true;startX=e.clientX-panX;startY=e.clientY-panY;map.classList.add('dragging');map.setPointerCapture?.(e.pointerId);});
    map.addEventListener('pointermove',e=>{if(!dragging)return;panX=Math.max(-95,Math.min(95,e.clientX-startX));panY=Math.max(-70,Math.min(70,e.clientY-startY));setPan();});
    const stop=e=>{if(!dragging)return;dragging=false;map.classList.remove('dragging');if(e?.pointerId!=null)map.releasePointerCapture?.(e.pointerId);};
    map.addEventListener('pointerup',stop); map.addEventListener('pointercancel',stop); map.addEventListener('pointerleave',stop);
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
  installSeasonPicker();
  installPaperSource();
  installMapPan();
  installHabitatLayer();
  installFinalReviewFixes();
  apply('eco');
  setTimeout(syncEndpoints,120);
})();
