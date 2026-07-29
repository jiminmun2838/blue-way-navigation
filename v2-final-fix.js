(() => {
  const $ = (selector) => document.querySelector(selector);
  const map = $('#map');
  const svg = $('#map svg');
  if (!map || !svg) return;

  const routes = {
    eco:   { name: '보호 우회 항로', speed: 12.0, path: 'M560 360 C510 430 470 510 390 530 S315 482 280 420' },
    slow:  { name: '감속 항로', speed: 10.0, path: 'M560 360 C505 382 450 407 390 420 S320 422 280 420' },
    outer: { name: '남측 외곽 항로', speed: 12.6, path: 'M560 360 C565 485 505 595 395 610 S300 505 280 420' },
    north: { name: '북측 완만 우회', speed: 10.0, path: 'M560 360 C505 340 450 350 400 385 S330 415 280 420' },
    safety:{ name: '안전 모드', speed: 0, path: 'M560 360 C535 372 515 385 495 400' }
  };
  const vessels = [
    { speed: 16.0, noise: '2 / 낮음', length: '5.2 m', max: '21.0 kn' },
    { speed: 12.0, noise: '2 / 보통', length: '6.5 m', max: '16.0 kn' },
    { speed: 13.5, noise: '2 / 보통', length: '8.7 m', max: '19.0 kn' },
    { speed: 11.0, noise: '3 / 높음', length: '14.2 m', max: '15.0 kn' }
  ];
  let routeId = 'eco';
  let vesselIndex = 2;
  let currentSpeed = vessels[vesselIndex].speed;
  let slowSpeed = 10;
  let slowRunning = false;
  let slowProgress = 0;

  const ports = {
    dadaepo: { x: 645, y: 190, name: '다대포항' },
    noksado: { x: 425, y: 305, name: '눌차도 북항' },
    gadeok: { x: 83, y: 500, name: '가덕도 천성항' },
    jinudo: { x: 300, y: 260, name: '진우도 관찰지점' }
  };

  const css = document.createElement('style');
  css.textContent = `
    .map-panel{display:flex!important;flex-direction:column!important;min-height:0!important;height:auto!important;overflow:visible!important;padding:0 0 42px!important}
    .map{height:500px!important;min-height:0!important;width:100%!important;transform:none!important;flex:none!important;touch-action:auto!important;cursor:default!important}
    .map-footer,.habitat-note,.voice{display:none!important}
    .nav-card{position:relative!important;left:auto!important;bottom:auto!important;transform:none!important;flex:none!important;width:calc(100% - 36px)!important;margin:38px auto 0!important;z-index:20!important}
    .nav-controls{gap:8px!important}.nav-controls button{min-height:42px!important}
    .endpoint-final{position:absolute;z-index:12;padding:6px 10px;border-radius:8px;background:#062433eb;border:1px solid #75d9d0;color:#fff;font-size:11px;font-weight:800;white-space:nowrap;pointer-events:none;transform:translate(-50%,-50%)}
    .endpoint-final.end{border-color:#9bea75;background:#163c31ed}
    #map.v2-real svg #paperZones{display:block!important;visibility:visible!important}
    #map.v2-real svg #paperZones .paper-zone{display:block!important;visibility:visible!important;fill:#ff8a3d52!important;stroke:#ff7a24!important;stroke-width:3!important;stroke-dasharray:7 5;filter:drop-shadow(0 0 5px #ff8a3d88);pointer-events:none}
    #map.v2-real svg #paperZones .paper-zone-label{display:block!important;visibility:visible!important;fill:#fff4df!important;font-size:11px;font-weight:900;paint-order:stroke;stroke:#6b300d;stroke-width:4;pointer-events:none}
    #map.v2-real svg>.hazard,#map.v2-real>.hazard-label{display:none!important}
    #map.v2-real svg #fixedPorts,#map.v2-real svg #fixedPorts .port-point{display:block!important}
    .port-point circle{display:block!important;fill:#e84e4e;stroke:#fff;stroke-width:2}.port-point text{display:block!important;fill:#fff;font-size:10px;font-weight:800;paint-order:stroke;stroke:#062433;stroke-width:3}
    .port-point.selected circle{fill:#2196f3;stroke:#fff;stroke-width:3}.port-point.both circle{fill:#7867ff}
    #rightVesselSummary{margin:0 0 12px;padding:10px;border:1px solid #2d6371;border-radius:10px;background:#082b39;color:#c4dddd;font-size:11px;line-height:1.45}
    #sendSighting{background:#9bea75!important;color:#063221!important;border:0!important;font-weight:900!important}
    .logo{cursor:pointer!important}.logo:hover{color:#9bea75!important}
    .map-panel:fullscreen{padding:14px!important;background:#061c29!important}.map-panel:fullscreen .map{height:calc(100vh - 190px)!important}.map-panel:fullscreen .nav-card{margin-top:12px!important;width:min(680px,94%)!important}
  `;
  document.head.append(css);

  const startTag = document.createElement('div');
  const endTag = document.createElement('div');
  startTag.className = 'endpoint-final'; endTag.className = 'endpoint-final end';
  map.append(startTag, endTag);
  const setTag = (element, x, y, text) => { element.style.left = `${x / 760 * 100}%`; element.style.top = `${y / 770 * 100}%`; element.textContent = text; };

  const zoneLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  zoneLayer.setAttribute('id', 'paperZones');
  svg.insertBefore(zoneLayer, $('#activePath'));
  const portLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  portLayer.setAttribute('id', 'fixedPorts');
  svg.append(portLayer);

  function renderPorts() {
    const startValue = $('#v2Start')?.value || 'dadaepo';
    const endValue = $('#v2End')?.value || 'gadeok';
    portLayer.replaceChildren();
    Object.entries(ports).forEach(([id, port]) => {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const selected = id === startValue || id === endValue;
      group.setAttribute('class', `port-point${selected ? ' selected' : ''}${id === startValue && id === endValue ? ' both' : ''}`);
      group.innerHTML = `<circle cx="${port.x}" cy="${port.y}" r="${selected ? 8 : 6}"/><text x="${port.x + 10}" y="${port.y - 9}">${port.name}</text>`;
      portLayer.append(group);
    });
  }
  const seasons = [
    { name: '겨울 · 1월', zones: [[245,595,82,58,'가덕도 남단 출몰지역 · 매우 높음'],[263,440,62,46,'가덕수로 출몰지역 · 높음'],[208,330,55,42,'눌차도 남서 출몰지역 · 주의'],[305,280,45,34,'진우도 인근 출몰지역 · 관찰']] },
    { name: '봄 · 5월', zones: [[245,580,90,64,'가덕도 남단 출몰지역 · 매우 높음'],[280,425,68,50,'가덕수로 출몰지역 · 높음'],[220,315,58,44,'눌차도 남서 출몰지역 · 주의'],[340,250,50,36,'진우도 북동 출몰지역 · 관찰']] },
    { name: '여름 · 7–9월', zones: [[245,610,54,38,'가덕도 남단 출몰지역 · 주의'],[263,440,0,0,''],[208,330,0,0,''],[305,280,0,0,'']] },
    { name: '가을 · 11월', zones: [[245,590,76,52,'가덕도 남단 출몰지역 · 높음'],[250,450,58,42,'가덕수로 출몰지역 · 주의'],[215,340,48,36,'눌차도 남서 출몰지역 · 관찰'],[315,275,42,32,'진우도 인근 출몰지역 · 관찰']] }
  ];
  let seasonIndex = 0;
  // A refresh keeps the seasonal survey pattern, while incorporating a small,
  // deterministic latest-observation adjustment.  It is not a random jump.
  let predictionVersion = 0;
  function visibleZones() {
    return seasons[seasonIndex].zones
      .map(([x, y, rx, ry, label], index) => {
        const drift = [[0,0],[18,-12],[-16,15],[12,10]][(predictionVersion + index) % 4];
        return { x: x + drift[0], y: y + drift[1], rx, ry, label };
      })
      .filter(zone => zone.rx && zone.ry);
  }
  function renderZones(reason = '계절 관측 자료') {
    const season = seasons[seasonIndex];
    zoneLayer.replaceChildren();
    visibleZones().forEach(({x, y, rx, ry, label}, index) => {
      const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      ellipse.setAttribute('class', 'paper-zone'); ellipse.setAttribute('cx', x); ellipse.setAttribute('cy', y); ellipse.setAttribute('rx', rx); ellipse.setAttribute('ry', ry);
      ellipse.setAttribute('fill', index === 0 ? '#ff6e5238' : '#ffc14d28'); ellipse.setAttribute('stroke', index === 0 ? '#ff8b70' : '#ffc14d');
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('class', 'paper-zone-label'); text.setAttribute('x', x - rx + 6); text.setAttribute('y', y + 3); text.setAttribute('fill', '#fff0d0'); text.textContent = label;
      zoneLayer.append(ellipse, text);
    });
    const title = $('#mapTitle');
    if (title) title.innerHTML = `다대포 → 가덕도 대항<small>${season.name} · ${reason} · 조사 정점 기반 관심구역</small>`;
  }

  function buildMarinePath(id, start, end) {
    if (start.x === end.x && start.y === end.y) return `M${start.x} ${start.y}`;

    // The lower half of this cropped chart is continuous open water.  Every
    // generated route first joins that surveyed corridor, so no straight
    // segment can cut across the large islands or the central islets.
    const zones = visibleZones();
    const zoneBottom = Math.max(515, ...zones.map(zone => zone.y + zone.ry));
    const routeOffset = id === 'outer' ? 92 : id === 'north' ? 52 : 68;
    const safeY = Math.min(720, zoneBottom + routeOffset);
    const leftGate = { x: 150, y: Math.min(680, safeY - 10) };
    const rightGate = { x: 585, y: Math.min(650, safeY - 35) };
    const portBranch = port => {
      if (port.x > 600) return [port,{x:610,y:260},{x:560,y:370},{x:540,y:440}];
      if (port.x < 120) return [port,{x:120,y:515},{x:150,y:535},{x:180,y:560}];
      if (port.x > 380) return [port,{x:405,y:350},{x:380,y:410},{x:410,y:520}];
      return [port,{x:285,y:320},{x:260,y:400},{x:250,y:520}];
    };
    const startBranch = portBranch(start);
    const endBranch = portBranch(end);

    // The slow route deliberately uses the existing shipping corridor.  It may
    // cross a warning ellipse, but it still stays below the mapped islets.
    if (id === 'slow') {
      // Cross only the southernmost active ecology zone, which lies in open
      // water, then return to the same charted sea corridor.
      const target = zones.reduce((best, zone) => !best || zone.y > best.y ? zone : best, null) || {x:300,y:560};
      const startApproach = start.x > target.x ? {x:470,y:500} : {x:180,y:560};
      const endApproach = end.x > target.x ? {x:470,y:500} : {x:180,y:560};
      const points = [...startBranch, startApproach, {x:target.x,y:target.y}, endApproach, ...endBranch.slice().reverse()];
      return points.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`).join(' ');
    }

    const points = start.x > end.x
      ? [...startBranch, rightGate, {x:470,y:safeY}, {x:310,y:safeY + (id === 'outer' ? 18 : 0)}, leftGate, ...endBranch.slice().reverse()]
      : [...startBranch, leftGate, {x:310,y:safeY + (id === 'outer' ? 18 : 0)}, {x:470,y:safeY}, rightGate, ...endBranch.slice().reverse()];
    return points.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${Math.min(735, point.y)}`).join(' ');
  }

  function currentVessel() { return vessels[vesselIndex]; }
  function updateRightVesselUI() {
    const vessel = currentVessel();
    const boatName = $('.boatrow span')?.textContent || '선택 선박';
    let summary = $('#rightVesselSummary');
    if (!summary) { summary = document.createElement('div'); summary.id = 'rightVesselSummary'; $('.right')?.insertAdjacentElement('afterbegin', summary); }
    summary.innerHTML = `<b style="color:#9bea75">현재 선박 기준</b><br>${boatName} · 순항 ${vessel.speed.toFixed(1)} kn · 소음 ${vessel.noise}<br>모든 항로 예상시간은 이 선박 속도로 계산됩니다.`;
    document.querySelectorAll('.route-card').forEach(card => {
      const routeButton = card.querySelector('[data-enhanced-route]');
      const cardRoute = routeButton?.dataset.enhancedRoute || 'eco';
      const distance = parseFloat(card.querySelector('.metrics div:first-child b')?.textContent || '0');
      const eta = card.querySelector('.metrics div:nth-child(2) b');
      const routeFactor = { eco: .92, slow: .72, outer: .96, north: .82, safety: 0 }[cardRoute] ?? .9;
      const effectiveSpeed = vessel.speed * routeFactor;
      if (eta && distance && effectiveSpeed) eta.textContent = `${Math.round(distance / effectiveSpeed * 60)}분`;
      if (eta && cardRoute === 'safety') eta.textContent = '재평가';
    });
    const values = document.querySelectorAll('.specs b');
    if (values[0]) values[0].textContent = `${vessel.speed.toFixed(1)} kn`;
    if (values[1]) values[1].textContent = vessel.noise;
    if (values[2]) values[2].textContent = vessel.length;
    if (values[3]) values[3].textContent = vessel.max;
    const label = $('#boatLabel text'); if (label) label.textContent = boatName;
  }

  function setRoute(id) {
    if (!routes[id]) return;
    routeId = id;
    slowRunning = false;
    slowProgress = 0;
    const route = routes[id];
    const startId = $('#v2Start')?.value || 'dadaepo';
    const endId = $('#v2End')?.value || 'gadeok';
    const start = ports[startId], end = ports[endId];
    const generatedPath = buildMarinePath(id, start, end);
    $('#activePath')?.setAttribute('d', generatedPath);
    $('#basePath')?.setAttribute('d', generatedPath);
    if (id === 'slow') positionSlowBoat();
    setTag(startTag, start.x, start.y, `출발 · ${start.name}`);
    setTag(endTag, end.x, end.y, `목적 · ${end.name}`);
    renderPorts();
    currentSpeed = route.speed || 0;
    // Keep the older dashboard timer synchronized with this simulator.
    if (id === 'slow') map.dataset.liveSpeed = '10.0';
    $('#navState').textContent = route.name;
    $('#command').innerHTML = id === 'slow' ? '보호구간 전 <b>10.0 kn</b> · 구간 안 <b>8.0 kn</b>' : '보호구간을 피해 <b>안전 우회</b> 안내';
    updateSpeed();
    updateRightVesselUI();
    document.querySelectorAll('[data-enhanced-route]').forEach(button => button.closest('.route-card')?.classList.toggle('active-card', button.dataset.enhancedRoute === id));
  }
  function updateSpeed() { const el = $('#speed'); if (el) el.innerHTML = `${currentSpeed.toFixed(1)} <small style="font-size:11px">kn</small>`; }

  function openReport() {
    const dialog = $('#dialog'), modal = $('#modal');
    dialog.innerHTML = `<button class="close">닫기</button><div class="eyebrow">CITIZEN SCIENCE REPORT</div><h2>🐬 상괭이 발견</h2><p>현재 위치 <b>35.0506°N, 128.9674°E</b> · 관측시각 자동 기록</p><label>몇 마리인가요?</label><div class="choice"><button>○ 1마리</button><button>○ 2~5마리</button><button>○ 5마리 이상</button><button>○ 알 수 없음</button></div><label>움직임</label><div class="choice"><button>○ 이동 중</button><button>○ 먹이 활동</button><button>○ 수면 위 관찰</button><button>○ 알 수 없음</button></div><label>기타 사항<input placeholder="직접 입력"></label><label>사진 첨부<input type="file" accept="image/*"></label><button class="submit" id="sendSighting">검증 전 제보 제출</button>`;
    modal.classList.add('open'); dialog.querySelector('.close').onclick = () => modal.classList.remove('open');
    dialog.querySelectorAll('.choice').forEach(group => group.onclick = event => { const b = event.target.closest('button'); if (!b) return; group.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on'); });
    $('#sendSighting').onclick = () => { modal.classList.remove('open'); window.toast?.('제보가 검증 대기열에 등록되었습니다.'); };
  }

  $('.logo')?.addEventListener('click', () => window.location.reload());
  document.addEventListener('click', (event) => {
    if (event.target.id === 'playBtn' && routeId === 'slow') {
      event.preventDefault(); event.stopImmediatePropagation();
      if (slowProgress >= 1) slowProgress = 0;
      slowRunning = !slowRunning;
      event.target.textContent = slowRunning ? 'Ⅱ 일시정지' : '▶ 항해 재생';
      return;
    }
    if (event.target.id === 'skipBtn' && routeId === 'slow') {
      event.preventDefault(); event.stopImmediatePropagation();
      slowProgress = Math.min(1, slowProgress + .2);
      positionSlowBoat();
      return;
    }
    const routeButton = event.target.closest('[data-enhanced-route]');
    if (routeButton) { event.preventDefault(); event.stopImmediatePropagation(); setRoute(routeButton.dataset.enhancedRoute); return; }
    if (event.target.closest('[data-modal="report"]')) { event.preventDefault(); event.stopImmediatePropagation(); openReport(); return; }
    if (event.target.id === 'refreshSightings') {
      event.preventDefault(); event.stopImmediatePropagation();
      predictionVersion += 1;
      renderZones('최근 제보·관측시각·계절 반영');
      setRoute(routeId);
      window.toast?.('출현 가능 영역과 현재 항로를 함께 다시 계산했습니다.');
      return;
    }
    if (event.target.id === 'saveVesselChoice') {
      const selected = $('#vesselChoices .active');
      vesselIndex = Number(selected?.dataset.vessel ?? 2);
      setTimeout(() => { currentSpeed = currentVessel().speed; updateRightVesselUI(); updateSpeed(); }, 0);
    }
    if (event.target.id === 'slowerBtn' || event.target.id === 'slowMode') setRoute('slow');
  }, true);

  $('#v2Start')?.addEventListener('change', (event) => {
    event.stopImmediatePropagation();
    setRoute(routeId);
  }, true);
  $('#v2End')?.addEventListener('change', (event) => {
    event.stopImmediatePropagation();
    setRoute(routeId);
  }, true);
  let seasonSelect = $('#seasonPicker');
  if (!seasonSelect && $('#v2Season')) {
    const holder = $('#v2Season');
    holder.insertAdjacentHTML('beforeend', '<label style="display:block;margin-top:9px;font-size:10px;color:#cde6e4">계절 선택<select id="seasonPicker" style="display:block;width:100%;margin-top:4px;padding:8px;border-radius:7px;background:#062433;color:#fff;border:1px solid #4d8278"><option value="0">겨울 · 1월</option><option value="1">봄 · 5월</option><option value="2">여름 · 7–9월</option><option value="3">가을 · 11월</option></select></label>');
    seasonSelect = $('#seasonPicker');
  }
  if (seasonSelect) seasonSelect.addEventListener('change', (event) => {
    event.stopImmediatePropagation();
    seasonIndex = Number(seasonSelect.value); predictionVersion = 0;
    renderZones('계절 생태 레이어 자동 반영');
    setRoute(routeId);
  }, true);

  const sources = $('.sources');
  if (sources && !$('#paperSource')) {
    const paper = document.createElement('a');
    paper.id = 'paperSource'; paper.target = '_blank'; paper.rel = 'noopener';
    paper.href = 'https://doi.org/10.5657/KFAS.2017.0561';
    paper.textContent = '논문: Park et al. (2017), 가덕도 상괭이 분포 및 계절 변화';
    sources.appendChild(paper);
  }

  // Older prototype layers append a legend/note after load.  Remove them from
  // the navigation canvas so the map and its control card have independent space.
  setTimeout(() => {
    document.querySelectorAll('.map-footer, .habitat-note, .voice').forEach(element => {
      element.style.setProperty('display', 'none', 'important');
    });
  }, 700);

  function boatCoordinates() {
    const transform = $('#boatIcon')?.getAttribute('transform') || '';
    const match = transform.match(/translate\(\s*([\d.-]+)[,\s]+([\d.-]+)/);
    return match ? { x: Number(match[1]), y: Number(match[2]) } : null;
  }
  function positionSlowBoat() {
    const path = $('#activePath');
    const icon = $('#boatIcon');
    if (!path || !icon || typeof path.getTotalLength !== 'function') return;
    const length = path.getTotalLength();
    if (!length) return;
    const point = path.getPointAtLength(length * slowProgress);
    const ahead = path.getPointAtLength(Math.min(length, length * slowProgress + 2));
    const angle = Math.atan2(ahead.y - point.y, ahead.x - point.x) * 180 / Math.PI + 90;
    icon.setAttribute('transform', `translate(${point.x},${point.y}) rotate(${angle})`);
    $('#boatLabel')?.setAttribute('transform', `translate(${point.x - 645},${point.y - 190})`);
  }
  setInterval(() => {
    if (routeId !== 'slow' || !slowRunning) return;
    slowProgress = Math.min(1, slowProgress + .0022);
    positionSlowBoat();
    if (slowProgress >= 1) {
      slowRunning = false;
      const play = $('#playBtn');
      if (play) play.textContent = '↺ 다시 보기';
    }
  }, 40);
  function boatInsideWarningZone(point) {
    if (!point) return false;
    return [...document.querySelectorAll('#paperZones ellipse, #map .hazard')].some(zone => {
      const cx = Number(zone.getAttribute('cx')), cy = Number(zone.getAttribute('cy'));
      const rx = Number(zone.getAttribute('rx')), ry = Number(zone.getAttribute('ry'));
      if (!rx || !ry) return false;
      return ((point.x - cx) ** 2 / rx ** 2) + ((point.y - cy) ** 2 / ry ** 2) <= 1;
    });
  }
  setInterval(() => {
    if (routeId !== 'slow') return;
    const playing = slowRunning;
    const inside = playing && boatInsideWarningZone(boatCoordinates());
    const target = inside ? 8 : 10;
    slowSpeed += (target - slowSpeed) * 0.14;
    if (Math.abs(target - slowSpeed) < 0.03) slowSpeed = target;
    map.dataset.liveSpeed = slowSpeed.toFixed(1);
    currentSpeed = slowSpeed;
    $('#command').innerHTML = inside
      ? '상괭이 주의구간 통과 중 · <b>8.0 kn 감속</b>'
      : '주의구간 밖 · <b>10.0 kn 정상 운항</b>';
    updateSpeed();
  }, 100);

  renderZones(); renderPorts(); setRoute('eco'); updateRightVesselUI();
})();
