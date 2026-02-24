(() => {
  function fmtDate(ts){ const d=new Date((ts||0)+8*3600*1000); const p=n=>String(n).padStart(2,'0'); const y=String(d.getUTCFullYear()).slice(2); return `${y}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`; }
  const listEl = document.getElementById('list');
  const sentinel = document.getElementById('sentinel');
  const btnPunch = document.getElementById('btnPunch');
  const btnMsg = document.getElementById('btnMsg');
  const btnSend = document.getElementById('btnSend');
  const btnRefresh = document.getElementById('btnRefresh');
  const timelineWrap = document.getElementById('timelineWrap');
  const timelineAxis = document.getElementById('timelineAxis');
  const compose = document.getElementById('compose');
  const text = document.getElementById('text');
  const msgBar = document.getElementById('msgBar');
  const textBox = document.getElementById('textBox');
  const btnText = document.getElementById('btnText');
  const btnMore = document.getElementById('btnMore');
  const btnVoice = document.getElementById('btnVoice');
  const moreSheet = document.getElementById('moreSheet');
  const pickImage = document.getElementById('pickImage');
  const pickCamera = document.getElementById('pickCamera');
  const pickFile = document.getElementById('pickFile');
  const planet = document.getElementById('planet');
  const modalPunch = document.getElementById('modalPunch');
  const pStep1 = document.getElementById('pStep1');
  const pStep2 = document.getElementById('pStep2');
  const pStep3 = document.getElementById('pStep3');
  const pTypeCustomWrap = document.getElementById('pTypeCustom');
  const inpTypeCustom = document.getElementById('inpTypeCustom');
  const pNext1 = document.getElementById('pNext1');
  const pCancel = document.getElementById('pCancel');
  const pPrev2 = document.getElementById('pPrev2');
  const pNext2 = document.getElementById('pNext2');
  const pTimeCustomWrap = document.getElementById('pTimeCustom');
  const inpTimeCustom = document.getElementById('inpTimeCustom');
  const pPrev3 = document.getElementById('pPrev3');
  const pSkip = document.getElementById('pSkip');
  const pConfirm = document.getElementById('pConfirm');
  const inpMsgOptional = document.getElementById('inpMsgOptional');
  let punchType = null;
  let punchMins = null;
  const TYPE_EMOJI = {
    '学习': '📖',
    '玩': '🎮',
    '吃饭': '🍽️',
    '睡觉': '😴'
  };
  const rainbow=['#ff4d4f','#fa8c16','#fadb14','#52c41a','#13c2c2','#1890ff','#722ed1'];
  function hashColor(nick){ let h=0; for(let i=0;i<(nick||'').length;i++){ h=((h<<5)-h)+nick.charCodeAt(i); h|=0; } const idx=((h%7)+7)%7; return rainbow[idx]; }
  const SVG_NS='http://www.w3.org/2000/svg';
  function batteryIcon(p){
    const pct=typeof p==='number'?Math.max(0,Math.min(100,p)):null;
    const svg=document.createElementNS(SVG_NS,'svg');
    svg.setAttribute('class','battery');
    svg.setAttribute('viewBox','0 0 24 16');
    svg.setAttribute('width','24');
    svg.setAttribute('height','16');
    if(pct!==null){
      const level=document.createElementNS(SVG_NS,'rect');
      const w=Math.round(16*pct/100);
      const color=pct>=60?'#52c41a':(pct>=30?'#faad14':'#f5222d');
      level.setAttribute('x','2'); level.setAttribute('y','4'); level.setAttribute('width',String(w)); level.setAttribute('height','8'); level.setAttribute('fill',color);
      svg.appendChild(level);
    }
    const body=document.createElementNS(SVG_NS,'rect');
    body.setAttribute('x','1'); body.setAttribute('y','3'); body.setAttribute('width','18'); body.setAttribute('height','10'); body.setAttribute('rx','2');
    body.setAttribute('fill','none'); body.setAttribute('stroke','#666'); body.setAttribute('stroke-width','1.5');
    const tip=document.createElementNS(SVG_NS,'rect');
    tip.setAttribute('x','19'); tip.setAttribute('y','7'); tip.setAttribute('width','3'); tip.setAttribute('height','2'); tip.setAttribute('fill','#666');
    svg.appendChild(body);
    svg.appendChild(tip);
    return svg;
  }
  function formatRemain(ms){
    if (ms <= 0) return '0秒';
    const sec = Math.floor(ms/1000);
    if (sec < 60) return `${sec}秒`;
    const min = Math.floor(sec/60);
    if (min < 60) return `${min}分`;
    const h = Math.floor(min/60);
    const m = min % 60;
    return `${h}小时${m}分`;
  }
  function pctColor(p){
    if (p < 0.33) return '#f5222d';
    if (p < 0.66) return '#faad14';
    return '#52c41a';
  }
  function bubble(m){
    const isSelf = (m.here_nick_name||'') === (window.store.nick||'');
    const wrap=document.createElement('div');
    if (isSelf) {
      const st = (m._status==='pending') ? 'pending' : ((m.read_count||0)>0 ? 'read' : 'sent');
      wrap.className = `bubble self ${st}`;
    } else {
      wrap.className = 'bubble';
    }
    wrap.dataset.ht = String(m.heart_time || '');
    wrap.dataset.self = isSelf ? '1' : '0';
    const readersArr = Array.isArray(m.readers)? m.readers: [];
    const iHaveRead = readersArr.includes(window.store.nick||'');
    wrap.dataset.read = iHaveRead ? '1' : '0';
    const top=document.createElement('div'); top.className='meta space';
    const tLeft=document.createElement('span'); tLeft.textContent=fmtDate(m.heart_time);
    const tRight=document.createElement('span');
    const ic=batteryIcon(m.battery);
    const pc=document.createElement('span'); pc.style.marginLeft='4px'; pc.textContent=(m.battery==null?'-':m.battery)+'%';
    tRight.append(ic, pc);
    top.append(tLeft, tRight);
    const second=document.createElement('div'); second.className='meta';
    const av=document.createElement('div'); av.className='avatar'; av.style.background=hashColor(m.here_nick_name||'');
    const nick=document.createElement('div'); nick.className='nick'; nick.textContent=m.here_nick_name||'';
    second.append(av, nick);
    const msg=document.createElement('div'); msg.className='msg';
    const kind = m.kind || (m.file? 'file' : 'text');
    if (kind==='text') {
      msg.textContent=m.msg||'';
    } else if (kind==='image' && m.file && m.file.key) {
      const btn=document.createElement('button'); btn.className='btn outline'; btn.style.width='100%'; btn.textContent=(m._status==='pending' && !m.file.key)?'【图片】(上传中…)':'【图片】';
      const show = async ()=>{
        let url = m.file.local_url;
        if (!url) {
          const r = await window.api.getUrl(m.file.key);
          url = r && r.url;
        }
        if (url) {
          const img = document.createElement('img'); img.src=url; img.style.maxWidth='72vw'; img.style.borderRadius='10px'; img.style.display='block';
          const collapse = document.createElement('button'); collapse.className='btn outline'; collapse.textContent='收起';
          collapse.onclick=()=>{ msg.innerHTML=''; msg.appendChild(btn); };
          img.onclick=()=>{ msg.innerHTML=''; msg.appendChild(btn); };
          msg.innerHTML=''; msg.append(img, collapse);
        }
      };
      btn.onclick = show;
      msg.appendChild(btn);
    } else if (kind==='image' && m.file && m.file.local_url && !m.file.key){
      const btn=document.createElement('button'); btn.className='btn outline'; btn.style.width='100%'; btn.textContent='【图片】(上传中…)';
      const show = ()=> {
        const img = document.createElement('img'); img.src=m.file.local_url; img.style.maxWidth='72vw'; img.style.borderRadius='10px'; img.style.display='block';
        const collapse = document.createElement('button'); collapse.className='btn outline'; collapse.textContent='收起';
        collapse.onclick=()=>{ msg.innerHTML=''; msg.appendChild(btn); };
        img.onclick=()=>{ msg.innerHTML=''; msg.appendChild(btn); };
        msg.innerHTML=''; msg.append(img, collapse);
      };
      btn.onclick = show;
      msg.appendChild(btn);
    } else if (kind==='audio' && m.file && m.file.key) {
      const btn=document.createElement('button'); btn.className='btn outline'; btn.textContent=(m._status==='pending' && !m.file.key)?'【音频】(上传中…)':'【音频】';
      const show = async ()=>{
        let url = m.file.local_url;
        if (!url) {
          const r = await window.api.getUrl(m.file.key);
          url = r && r.url;
        }
        if (url) {
          const player = document.createElement('audio'); player.controls = true; player.src = url; player.style.width='72vw';
          const collapse = document.createElement('button'); collapse.className='btn outline'; collapse.textContent='收起';
          collapse.onclick=()=>{ player.pause(); msg.innerHTML=''; msg.appendChild(btn); };
          msg.innerHTML=''; msg.append(player, collapse);
          try { player.play(); } catch {}
        }
      };
      btn.onclick = show;
      msg.appendChild(btn);
    } else if (kind==='audio' && m.file && m.file.local_url && !m.file.key){
      const btn=document.createElement('button'); btn.className='btn outline'; btn.textContent='【音频】(上传中…)';
      const show = ()=> {
        const player = document.createElement('audio'); player.controls = true; player.src = m.file.local_url; player.style.width='72vw';
        const collapse = document.createElement('button'); collapse.className='btn outline'; collapse.textContent='收起';
        collapse.onclick=()=>{ player.pause(); msg.innerHTML=''; msg.appendChild(btn); };
        msg.innerHTML=''; msg.append(player, collapse);
        try { player.play(); } catch {}
      };
      btn.onclick = show;
      msg.appendChild(btn);
    } else if (m.file && m.file.key) {
      const btn=document.createElement('button'); btn.className='btn outline'; btn.textContent='【文件】';
      btn.onclick = async ()=>{
        btn.disabled=true;
        const r = await window.api.getUrl(m.file.key);
        const u = r && r.url;
        if (u) {
          const a=document.createElement('a'); a.href=u; a.download=''; document.body.appendChild(a); a.click(); a.remove();
        }
        btn.disabled=false;
      };
      msg.appendChild(btn);
    } else if (m.file && !m.file.key) {
      const btn=document.createElement('button'); btn.className='btn outline'; btn.textContent='【文件】(上传中…)';
      msg.appendChild(btn);
    } else {
      msg.textContent=m.msg||'';
    }
    let cdRow = null;
    if (m.countdown_ts != null) {
      cdRow = document.createElement('div'); cdRow.className='countdown-row';
      const bar = document.createElement('div'); bar.className='countdown-bar';
      const fill = document.createElement('div'); fill.className='countdown-fill';
      fill.style.width = '0%';
      bar.appendChild(fill);
      const label = document.createElement('div'); label.className='countdown-label';
      label.textContent = '';
      cdRow.append(bar, label);
      cdRow.setAttribute('data-ct', String(m.countdown_ts));
      cdRow.setAttribute('data-st', String(m.heart_time || 0));
    }
    const loc=document.createElement('div'); loc.className='meta';
    const btn=document.createElement('button'); btn.className='link'; btn.textContent='地址';
    const coords=document.createElement('span'); coords.className='hidden'; coords.textContent=(m.lat!=null&&m.lng!=null)?`${m.lat}, ${m.lng}`:'无';
    btn.onclick=()=>{ coords.classList.toggle('hidden'); };
    loc.append(btn, coords);
    wrap.append(top, second);
    wrap.appendChild(msg);
    if (cdRow) wrap.appendChild(cdRow);
    wrap.appendChild(loc);
    return wrap;
  }
  function render(){
    while(listEl.firstChild) listEl.removeChild(listEl.firstChild);
    const fr = document.createDocumentFragment();
    let lastTok = null;
    window.store.messages.forEach(m=>{
      const tok = tokenOf(m.heart_time||0);
      if (tok && tok !== lastTok) {
        const div = document.createElement('div');
        div.className = 'divider';
        div.textContent = tok;
        fr.appendChild(div);
        lastTok = tok;
      }
      fr.appendChild(bubble(m));
    });
    listEl.appendChild(fr);
    listEl.appendChild(sentinel);
    attachReadObservers();
    ensureCountdownTick();
  }
  const seenReads = new Set();
  let ioRead = null;
  const dwellTimers = new Map();
  function attachReadObservers(){
    if (!ioRead) {
      ioRead = new IntersectionObserver(entries => {
        entries.forEach(e => {
          const el = e.target;
          const ht = Number(el.getAttribute('data-ht') || '0');
          const self = el.getAttribute('data-self') === '1';
          const already = el.getAttribute('data-read') === '1';
          if (!ht || self || already) return;
          if (e.isIntersecting) {
            if (seenReads.has(ht) || dwellTimers.has(ht)) return;
            const tid = setTimeout(() => {
              dwellTimers.delete(ht);
              if (!seenReads.has(ht)) {
                seenReads.add(ht);
                window.api.sendRead(ht);
              }
            }, 1000);
            dwellTimers.set(ht, tid);
          } else {
            const t = dwellTimers.get(ht);
            if (t) { clearTimeout(t); dwellTimers.delete(ht); }
          }
        });
      }, { root: null, threshold: 0.25 });
    }
    const nodes = listEl.querySelectorAll('.bubble[data-ht]');
    nodes.forEach(n => ioRead.observe(n));
  }
  function tokenOf(ts){
    const d=new Date((ts||0)+8*3600*1000);
    const y=d.getUTCFullYear(), m=d.getUTCMonth()+1, da=d.getUTCDate();
    const p=n=>String(n).padStart(2,'0');
    return `${y}-${p(m)}-${p(da)}`;
  }
  function scrollToBottom(){
    try { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); } catch { window.scrollTo(0, document.body.scrollHeight); }
  }
  function buildHourAxis(){
    if (!timelineAxis) return;
    timelineAxis.innerHTML = '';
    for(let i=0;i<24;i++){
      const s=document.createElement('span');
      s.className='tl-item';
      s.textContent=String(i).padStart(2,'0');
      timelineAxis.appendChild(s);
    }
  }
  function currentViewportToken(){
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    const mid = (window.scrollY||document.documentElement.scrollTop||0) + vh/2;
    const nodes = Array.from(listEl.querySelectorAll('.bubble[data-ht]'));
    let bestTok = null, bestDist = Infinity;
    for (const el of nodes){
      const r = el.getBoundingClientRect();
      const top = r.top + (window.scrollY||document.documentElement.scrollTop||0);
      const bottom = top + r.height;
      const center = (top+bottom)/2;
      const dt = Math.abs(center - mid);
      const ht = Number(el.getAttribute('data-ht')||'0');
      const tok = tokenOf(ht);
      if (dt < bestDist){ bestDist = dt; bestTok = tok; }
    }
    return bestTok;
  }
  function currentViewportBelowFirstTs(){
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    const mid = (window.scrollY||document.documentElement.scrollTop||0) + vh/2;
    const nodes = Array.from(listEl.querySelectorAll('.bubble[data-ht]'));
    let targetTs = null;
    for (const el of nodes){
      const rect = el.getBoundingClientRect();
      const top = rect.top + (window.scrollY||document.documentElement.scrollTop||0);
      if (top >= mid) {
        targetTs = Number(el.getAttribute('data-ht')||'0') || null;
        break;
      }
    }
    if (targetTs==null && nodes.length) {
      const last = nodes[nodes.length-1];
      targetTs = Number(last.getAttribute('data-ht')||'0') || null;
    }
    return targetTs;
  }
  function dayProgressFromTs(ts){
    if (!ts) return 0.5;
    const d=new Date(ts + 8*3600*1000);
    const h=d.getUTCHours(), m=d.getUTCMinutes(), s=d.getUTCSeconds();
    return Math.max(0, Math.min(1, (h + m/60 + s/3600)/24));
  }
  function setAxisByProgress(prog){
    const itemW = 48, gap = 8, pad = 24;
    const total = 24*(itemW+gap) + pad*2;
    const centerPos = prog*total;
    const target = centerPos - (timelineWrap.clientWidth/2);
    try { timelineWrap.scrollLeft = Math.max(0, Math.min(target, total - timelineWrap.clientWidth)); } catch {}
  }
  listEl.addEventListener('click', (e)=>{
    const prevBtn = e.target.closest && e.target.closest('[data-role=prev-day]');
    const nextBtn = e.target.closest && e.target.closest('[data-role=next-day]');
    if (prevBtn) {
      ensureDays();
      if (dayIndex < dayList.length - 1) {
        dayIndex += 1;
        selectedDayToken = dayList[dayIndex];
        dayLabel.textContent = dayLabelText(selectedDayToken);
        render();
        centerToIndex(dayIndex);
      }
    } else if (nextBtn) {
      ensureDays();
      if (dayIndex > 0) {
        scrollToBottom();
        setTimeout(()=>{
          dayIndex -= 1;
          selectedDayToken = dayList[dayIndex];
          dayLabel.textContent = dayLabelText(selectedDayToken);
          render();
          centerToIndex(dayIndex);
          scrollToBottom();
        }, 250);
      }
    }
  });
  // Smooth follow: timeline only mirrors time, never drives filtering/switch
  let scrollRaf = 0;
  function onScrollFollow(){
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(()=>{
      scrollRaf = 0;
      const ts = currentViewportBelowFirstTs();
      const prog = dayProgressFromTs(ts || Date.now());
      setAxisByProgress(prog);
    });
  }
  window.addEventListener('scroll', onScrollFollow, { passive: true });
  window.addEventListener('resize', ()=>{ onScrollFollow(); }, { passive: true });
  window.api.onPush(()=>{ render(); });
  let nextKey=null, loading=false, loadedInitial=false, noMore=false;
  async function loadMore(){
    if(loading || noMore) return; loading=true;
    const data = await window.api.list(nextKey);
    window.store.mergeMessages(data.items||[]);
    nextKey = data.nextKey || null;
    if(!nextKey) { noMore = true; }
    if(!nextKey && (data.items||[]).length===0 && !loadedInitial){
      const tip=document.createElement('div'); tip.style.textAlign='center'; tip.style.color='#888'; tip.textContent='已是最新消息'; listEl.appendChild(tip);
    }
    loadedInitial=true; render(); loading=false;
  }
  async function refreshLatest(){
    nextKey=null; noMore=false;
    const data = await window.api.list(null);
    window.store.mergeMessages(data.items||[]);
    render();
  }
  async function ensureProfile(){
    if(!window.store.here_name || !window.store.nick){
      document.getElementById('modal').style.display='flex';
      return new Promise(res=>{
        document.getElementById('btnSave').onclick=()=>{
          const p=document.getElementById('inpPlanet').value.trim();
          const n=document.getElementById('inpNick').value.trim();
          if(!p || !n) return;
          window.store.here_name=p; window.store.nick=n;
          document.getElementById('modal').style.display='none';
          planet.textContent=p;
          res();
        };
      });
    } else {
      planet.textContent=window.store.here_name;
    }
  }
  function showMsgBar(){ btnPunch.style.display='none'; btnMsg.style.display='none'; msgBar.style.display='flex'; }
  function hideMsgBar(){ msgBar.style.display='none'; moreSheet.style.display='none'; textBox.style.display='none'; btnPunch.style.display=''; btnMsg.style.display=''; text.value=''; }
  function openTextBox(){ msgBar.style.display='none'; textBox.style.display='flex'; text.focus(); }
  async function punch(){
    modalPunch.style.display = 'flex';
    punchType = null; punchMins = null;
    inpTypeCustom.value=''; inpTimeCustom.value=''; inpMsgOptional.value='';
    switchStep(1);
  }
  function switchStep(n){
    pStep1.style.display = n===1?'':'none';
    pStep2.style.display = n===2?'':'none';
    pStep3.style.display = n===3?'':'none';
  }
  function closePunch(){
    modalPunch.style.display = 'none';
  }
  function onTypeSelect(el){
    const chips = pStep1.querySelectorAll('.chip');
    chips.forEach(c=>c.classList.remove('active'));
    el.classList.add('active');
    const t = el.getAttribute('data-type');
    const isCustom = t==='自定义';
    punchType = isCustom?null:t;
    pTypeCustomWrap.style.display = isCustom?'':'none';
    pNext1.disabled = !(punchType || (inpTypeCustom.value.trim().length>0));
    if (!isCustom) {
      switchStep(2);
    }
  }
  function onTimeSelect(el){
    const chips = pStep2.querySelectorAll('.chip');
    chips.forEach(c=>c.classList.remove('active'));
    el.classList.add('active');
    const v = el.getAttribute('data-mins');
    if (v==='custom'){
      punchMins = null;
      pTimeCustomWrap.style.display='';
      pNext2.disabled = !(Number(inpTimeCustom.value.trim())>0);
    } else {
      punchMins = Number(v)||0;
      pTimeCustomWrap.style.display='none';
      pNext2.disabled = punchMins<=0;
      if (punchMins>0) {
        switchStep(3);
      }
    }
  }
  async function confirmPunch(msgOverride){
    const mins = punchMins || Number(inpTimeCustom.value.trim()) || 0;
    const now = Date.now();
    const countdownTs = now + mins*60*1000;
    const msgv = (msgOverride==null?inpMsgOptional.value.trim():msgOverride) || '';
    const label = punchType || inpTypeCustom.value.trim();
    const emoji = TYPE_EMOJI[label] || '🏷️';
    const composed = label ? (msgv ? `${emoji} ${label}｜${msgv}` : `${emoji} ${label}`) : msgv;
    // 乐观插入占位（不等待电量与地理定位）
    window.store.upsertMessage({
      here_name: window.store.here_name,
      heart_time: now,
      here_nick_name: window.store.nick,
      battery: null,
      lat: null, lng: null,
      msg: composed, message: composed,
      kind: 'text',
      countdown_ts: countdownTs,
      _status: 'pending'
    });
    render();
    closePunch();
    // 后台获取电量与定位并发送，成功后合并更新占位
    (async()=>{
      const [batt, geo] = await Promise.all([window.api.battery(), window.api.geoloc()]);
      const res = await window.api.send({ nick: window.store.nick, battery: batt, lat: geo?.lat, lng: geo?.lng, message: composed, countdownTs });
      const serverTs = Number(res?.ts) || now;
      window.store.updateByTime(now, { battery: batt, lat: geo?.lat, lng: geo?.lng, heart_time: serverTs, _status: 'sent' });
      render();
    })().catch(()=>{ /* 保持占位，后续可加失败状态与重试 */ });
  }
  function wirePunchUI(){
    if (!modalPunch) return;
    const chips1 = pStep1.querySelectorAll('.chip');
    chips1.forEach(c=>{ c.onclick=()=>onTypeSelect(c); });
    inpTypeCustom.oninput = ()=>{ punchType = null; pNext1.disabled = !(inpTypeCustom.value.trim().length>0); };
    pNext1.onclick = ()=>{ if(!punchType && !inpTypeCustom.value.trim()) return; if(!punchType) punchType = inpTypeCustom.value.trim(); switchStep(2); };
    pCancel.onclick = ()=>{ closePunch(); };
    const chips2 = pStep2.querySelectorAll('.chip');
    chips2.forEach(c=>{ c.onclick=()=>onTimeSelect(c); });
    inpTimeCustom.oninput = ()=>{ pNext2.disabled = !(Number(inpTimeCustom.value.trim())>0); };
    pPrev2.onclick = ()=>{ switchStep(1); };
    pNext2.onclick = ()=>{ if(!(punchMins || Number(inpTimeCustom.value.trim())>0)) return; switchStep(3); };
    pPrev3.onclick = ()=>{ switchStep(2); };
    pSkip.onclick = ()=>{ confirmPunch(''); };
    pConfirm.onclick = ()=>{ confirmPunch(inpMsgOptional.value.trim()); };
  }
  let countdownTimerStarted = false;
  function ensureCountdownTick(){
    if (countdownTimerStarted) return;
    countdownTimerStarted = true;
    const tick = ()=>{
      const nodes = document.querySelectorAll('.countdown-row[data-ct][data-st]');
      const now = Date.now();
      nodes.forEach(n=>{
        const ct = Number(n.getAttribute('data-ct')||'0');
        const st = Number(n.getAttribute('data-st')||'0');
        const total = Math.max(0, ct - st);
        const remainRaw = ct - now;
        const remain = Math.max(0, remainRaw);
        const p = total>0 ? Math.max(0, Math.min(1, (total - remain)/total)) : 1;
        const fill = n.querySelector('.countdown-fill');
        const label = n.querySelector('.countdown-label');
        if (fill) { fill.style.width = String(Math.round(p*100))+'%'; fill.style.backgroundColor = pctColor(p); }
        if (label) {
          const nxt = remainRaw <= 0 ? '已完成✓' : formatRemain(remain);
          if (label.textContent !== nxt) label.textContent = nxt;
        }
      });
      setTimeout(tick, 1000);
    };
    tick();
  }
  async function sendText(){
    const v=text.value.trim(); if(!v){ closeCompose(); return; }
    btnSend.disabled = true;
    const now = Date.now();
    const [batt, geo] = await Promise.all([window.api.battery(), window.api.geoloc()]);
    window.store.upsertMessage({
      here_name: window.store.here_name, heart_time: now,
      here_nick_name: window.store.nick, battery: batt, lat: geo?.lat, lng: geo?.lng, msg: v, message: v, kind: 'text', _status: 'pending'
    });
    render();
    try{
      const res = await window.api.send({ nick: window.store.nick, here_nick_name: window.store.nick, battery: batt, lat: geo?.lat, lng: geo?.lng, message: v, msg: v, kind: 'text' });
      const serverTs = Number(res?.ts) || now;
      window.store.updateByTime(now, { heart_time: serverTs, _status: 'sent' });
      render();
    } finally {
      btnSend.disabled = false;
      hideMsgBar();
    }
  }
  function pickAudioMime(){
    const cand = ['audio/webm','audio/mp4','audio/mpeg'];
    for(const m of cand){ if(MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) return m; }
    return '';
  }
  let rec = null, recChunks = [], recStart = 0;
  async function startRecord(){
    if (rec) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = pickAudioMime();
    recChunks = []; recStart = Date.now();
    const mr = new MediaRecorder(stream, mime?{ mimeType: mime }:undefined);
    mr.ondataavailable = e=>{ if(e.data && e.data.size>0) recChunks.push(e.data); };
    mr.onstop = ()=>{ rec = null; stream.getTracks().forEach(t=>t.stop()); onRecordReady(mime||recChunks[0]?.type||'audio/webm'); };
    rec = mr; mr.start();
  }
  async function onRecordReady(mime){
    const blob = new Blob(recChunks, { type: mime });
    const ext = mime==='audio/mp4'?'m4a':(mime.split('/')[1]||'bin');
    const now = Date.now();
    const [batt, geo] = await Promise.all([window.api.battery(), window.api.geoloc()]);
    const localUrl = URL.createObjectURL(blob);
    window.store.upsertMessage({
      here_name: window.store.here_name, heart_time: now,
      here_nick_name: window.store.nick, battery: batt, lat: geo?.lat, lng: geo?.lng, msg: '', kind: 'audio', file: { key: null, local_url: localUrl, content_type: blob.type, size: blob.size, duration_ms: Date.now()-recStart }, _status: 'pending'
    });
    render();
    const up = await window.api.uploadUrl(blob.type, '.'+ext);
    if (!up || !up.url || !up.key) { alert('获取上传地址失败'); hideMsgBar(); return; }
    const { key, url } = up;
    await fetch(url, { method: 'PUT', headers: { 'Content-Type': blob.type }, body: blob });
    try{
      const res = await window.api.send({ nick: window.store.nick, here_nick_name: window.store.nick, battery: batt, lat: geo?.lat, lng: geo?.lng, message: '', kind: 'audio', file: { key, content_type: blob.type, size: blob.size, duration_ms: Date.now()-recStart } });
      const serverTs = Number(res?.ts) || now;
      window.store.updateByTime(now, { heart_time: serverTs, _status: 'sent', file: { key, local_url: localUrl, content_type: blob.type, size: blob.size, duration_ms: Date.now()-recStart } });
      render();
    } finally {
      hideMsgBar();
    }
  }
  function stopRecord(){
    if (rec) try { rec.stop(); } catch {}
  }
  async function onPickFile(file, kind){
    const ct = file.type || 'application/octet-stream';
    const ext = (file.name && file.name.includes('.')) ? file.name.substring(file.name.lastIndexOf('.')) : '';
    const now = Date.now();
    const [batt, geo] = await Promise.all([window.api.battery(), window.api.geoloc()]);
    const localUrl = (kind==='image' || kind==='audio') ? URL.createObjectURL(file) : null;
    window.store.upsertMessage({ here_name: window.store.here_name, heart_time: now, here_nick_name: window.store.nick, battery: batt, lat: geo?.lat, lng: geo?.lng, msg: '', kind, file: { key: null, local_url: localUrl, content_type: ct, size: file.size }, _status: 'pending' });
    render();
    const up = await window.api.uploadUrl(ct, ext);
    if (!up || !up.url || !up.key) { alert('获取上传地址失败'); hideMsgBar(); return; }
    const { key, url } = up;
    await fetch(url, { method: 'PUT', headers: { 'Content-Type': ct }, body: file });
    try{
      const res = await window.api.send({ nick: window.store.nick, here_nick_name: window.store.nick, battery: batt, lat: geo?.lat, lng: geo?.lng, message: '', kind, file: { key, content_type: ct, size: file.size } });
      const serverTs = Number(res?.ts) || now;
      window.store.updateByTime(now, { heart_time: serverTs, _status: 'sent', file: { key, local_url: localUrl, content_type: ct, size: file.size } });
      render();
    } finally { hideMsgBar(); }
  }
  function wireMsgBar(){
    btnMsg.onclick=()=>{ showMsgBar(); };
    btnText.onclick=()=>{ openTextBox(); };
    btnMore.onclick=()=>{ moreSheet.style.display = moreSheet.style.display ? '' : 'block'; moreSheet.style.display = moreSheet.style.display || 'block'; };
    btnVoice.addEventListener('mousedown', startRecord);
    btnVoice.addEventListener('touchstart', (e)=>{ e.preventDefault(); startRecord(); }, { passive: false });
    const end = ()=>stopRecord();
    btnVoice.addEventListener('mouseup', end);
    btnVoice.addEventListener('mouseleave', end);
    btnVoice.addEventListener('touchend', end);
    btnVoice.addEventListener('touchcancel', end);
    document.getElementById('moreImage').onclick=()=>{ pickImage.click(); };
    document.getElementById('moreFile').onclick=()=>{ pickFile.click(); };
    document.getElementById('moreCamera').onclick=()=>{ pickCamera.click(); };
    pickImage.onchange = async (e)=>{ const f=e.target.files&&e.target.files[0]; if(f) await onPickFile(f, 'image'); e.target.value=''; };
    pickCamera.onchange = async (e)=>{ const f=e.target.files&&e.target.files[0]; if(f) await onPickFile(f, 'image'); e.target.value=''; };
    pickFile.onchange = async (e)=>{ const f=e.target.files&&e.target.files[0]; if(f) await onPickFile(f, 'file'); e.target.value=''; };
  }
  const io = new IntersectionObserver(es=>{ if(es[0].isIntersecting && !noMore){ loadMore(); } },{rootMargin:'200px'});
  io.observe(sentinel);
  btnPunch.onclick=punch;
  btnMsg.onclick=()=>showMsgBar();
  btnSend.onclick=()=>sendText();
  btnRefresh.onclick=()=>refreshLatest();
  (async () => { await ensureProfile(); await refreshLatest(); buildHourAxis(); onScrollFollow(); window.api.connectWS(); wirePunchUI(); wireMsgBar(); })();
})(); 
