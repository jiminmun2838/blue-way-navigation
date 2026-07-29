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
  let slowStartedAt = null;
  let currentSpeed = vessels[vesselIndex].speed;

  const css = document.createElement('style');
  css.textContent = `
    .map-panel{display:flex!important;flex-direction:column!important;min-height:0!important;height:auto!important;overflow:visible!important;padding:0 0 42px!important}
    .map{height:500px!important;min-height:0!important;width:100%!important;transform:none!important;flex:none!important;touch-action:auto!important;cursor:default!important}
    .map-footer,.habitat-note,.voice{display:none!important}
    .nav-card{position:relative!important;left:auto!important;bottom:auto!important;transform:none!important;flex:none!important;width:calc(100% - 36px)!important;margin:38px auto 0!important;z-index:20!important}
    .nav-controls{gap:8px!important}.nav-controls button{min-height:42px!important}
    .endpoint-final{position:absolute;z-index:12;padding:6px 10px;border-radius:8px;background:#062433eb;border:1px solid #75d9d0;color:#fff;font-size:11px;font-weight:800;white-space:nowrap;pointer-events:none;transform:translate(-50%,-50%)}
    .endpoint-final.end{border-color:#9bea75;background:#163c31ed}
    .paper-zone{stroke-width:2;stroke-dasharray:5 4;pointer-events:none}.paper-zone-label{font-size:10px;font-weight:800;paint-order:stroke;stroke:#062433;stroke-width:3;pointer-events:none}
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
  const seasons = [
    { name: '겨울 · 1월', zones: [[245,595,82,58,'P4 가덕등대 남단 · 매우 높음'],[263,440,62,46,'P3 · 높음'],[208,330,55,42,'P1 · 주의'],[305,280,45,34,'P2/P6/P7 · 관찰']] },
    { name: '봄 · 5월', zones: [[245,580,90,64,'P4 가덕등대 남단 · 매우 높음'],[280,425,68,50,'P3 · 높음'],[220,315,58,44,'P1 · 주의'],[340,250,50,36,'P7 북동측 · 관찰']] },
    { name: '여름 · 7–9월', zones: [[245,610,54,38,'P4 가덕등대 남단 · 주의'],[263,440,0,0,''],[208,330,0,0,''],[305,280,0,0,'']] },
    { name: '가을 · 11월', zones: [[245,590,76,52,'P4 가덕등대 남단 · 높음'],[250,450,58,42,'P3 · 주의'],[215,340,48,36,'P1 · 관찰'],[315,275,42,32,'P6/P7 · 관찰']] }
  ];
  let seasonIndex = 0;
  // A refresh keeps the seasonal survey pattern, while incorporating a small,
  // deterministic latest-observation adjustment.  It is not a random jump.
  let predictionVersion = 0;
  function renderZones(reason = '계절 관측 자료') {
    const season = seasons[seasonIndex];
    zoneLayer.replaceChildren();
    season.zones.forEach(([x, y, rx, ry, label], index) => {
      if (!rx) return;
      const drift = [[0,0],[6,-4],[-5,5],[4,3]][(predictionVersion + index) % 4];
      x += drift[0]; y += drift[1];
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

  function currentVessel() { return vessels[vesselIndex]; }
  function updateRightVesselUI() {
    const vessel = currentVessel();
    const boatName = $('.boatrow span')?.textContent || '선택 선박';
    let summary = $('#rightVesselSummary');
    if (!summary) { summary = document.createElement('div'); summary.id = 'rightVesselSummary'; $('.right')?.insertAdjacentElement('afterbegin', summary); }
    summary.innerHTML = `<b style="color:#9bea75">현재 선박 기준</b><br>${boatName} · 순항 ${vessel.speed.toFixed(1)} kn · 소음 ${vessel.noise}<br>모든 항로 예상시간은 이 선박 속도로 계산됩니다.`;
    document.querySelectorAll('.route-card').forEach(card => {
      const distance = Number(card.querySelector('.metrics div:first-child b')?.textContent) || 0;
      const eta = card.querySelector('.metrics div:nth-child(2) b');
      if (eta && distance) eta.textContent = `${Math.round(distance / vessel.speed * 60)}분`;
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
    routeId = id; slowStartedAt = null;
    const route = routes[id];
    $('#activePath')?.setAttribute('d', route.path);
    $('#basePath')?.setAttribute('d', route.path);
    const startName = $('#v2Start')?.selectedOptions?.[0]?.textContent?.trim() || '다대포항';
    const endName = $('#v2End')?.selectedOptions?.[0]?.textContent?.trim() || '가덕도 대항';
    setTag(startTag, 560, 360, `출발 · ${startName}`); setTag(endTag, 280, 420, `목적 · ${endName}`);
    const startCircle = $('#map svg .marker circle'); if (startCircle) { startCircle.setAttribute('cx', '560'); startCircle.setAttribute('cy', '360'); }
    const circles = [...document.querySelectorAll('#map svg .marker circle')]; if (circles[1]) { circles[1].setAttribute('cx', '280'); circles[1].setAttribute('cy', '420'); }
    currentSpeed = route.speed || 0;
    $('#navState').textContent = route.name;
    $('#command').innerHTML = id === 'slow' ? '보호구간 전 <b>10.0 kn</b> · 구간 안 <b>8.0 kn</b>' : '보호구간을 피해 <b>안전 우회</b> 안내';
    updateSpeed();
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
    const routeButton = event.target.closest('[data-enhanced-route]');
    if (routeButton) { event.preventDefault(); event.stopImmediatePropagation(); setRoute(routeButton.dataset.enhancedRoute); return; }
    if (event.target.closest('[data-modal="report"]')) { event.preventDefault(); event.stopImmediatePropagation(); openReport(); return; }
    if (event.target.id === 'refreshSightings') { event.preventDefault(); event.stopImmediatePropagation(); predictionVersion += 1; renderZones('최근 제보·관측시각·계절 반영'); window.toast?.('계절 조사 정점을 유지하고 최신 제보 반영 위치를 갱신했습니다.'); return; }
    if (event.target.id === 'saveVesselChoice') {
      const selected = $('#vesselChoices .active');
      vesselIndex = Number(selected?.dataset.vessel ?? 2);
      setTimeout(() => { currentSpeed = currentVessel().speed; updateRightVesselUI(); updateSpeed(); }, 0);
    }
    if (event.target.id === 'slowerBtn' || event.target.id === 'slowMode') setRoute('slow');
  }, true);

  $('#v2Start')?.addEventListener('change', () => {
    const start = $('#v2Start'), end = $('#v2End'); if (start.value === end.value) end.value = start.value === 'gadeok' ? 'dadaepo' : 'gadeok'; setRoute(routeId);
  });
  $('#v2End')?.addEventListener('change', () => {
    const start = $('#v2Start'), end = $('#v2End'); if (start.value === end.value) start.value = end.value === 'dadaepo' ? 'gadeok' : 'dadaepo'; setRoute(routeId);
  });
  const seasonSelect = $('#seasonPicker');
  if (seasonSelect) seasonSelect.addEventListener('change', (event) => {
    event.stopImmediatePropagation();
    seasonIndex = Number(seasonSelect.value); predictionVersion = 0;
    renderZones('계절 생태 레이어 자동 반영');
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

  setInterval(() => {
    if (routeId !== 'slow') return;
    const playing = $('#playBtn')?.textContent.includes('일시정지');
    if (playing && slowStartedAt == null) slowStartedAt = Date.now();
    if (!playing) { slowStartedAt = null; currentSpeed = 10; updateSpeed(); return; }
    const phase = ((Date.now() - slowStartedAt) % 16000) / 1000;
    let target = 10;
    if (phase >= 4 && phase < 12) target = 8;
    currentSpeed += (target - currentSpeed) * 0.08;
    if (Math.abs(target - currentSpeed) < 0.03) currentSpeed = target;
    $('#command').innerHTML = target === 8 ? '상괭이 가능 영역 통과 중 · <b>8.0 kn 감속 유지</b>' : '감속 항로 운항 · <b>10.0 kn 유지</b>';
    updateSpeed();
  }, 80);

  renderZones(); setRoute('eco'); updateRightVesselUI();
})();
