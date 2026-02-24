(() => {
  function fmtDate(ts){ const d=new Date((ts||0)+8*3600*1000); const p=n=>String(n).padStart(2,'0'); const y=String(d.getUTCFullYear()).slice(2); return `${y}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`; }
  const listEl = document.getElementById('list');
  const sentinel = document.getElementById('sentinel');
  const btnPunch = document.getElementById('btnPunch');
  const btnMsg = document.getElementById('btnMsg');
  const btnSend = document.getElementById('btnSend');
  const btnRefresh = document.getElementById('btnRefresh');
  const wsDot = document.getElementById('wsDot');
  const wsText = document.getElementById('wsText');
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
  const imgViewer = document.getElementById('imgViewer');
  const imgViewPic = document.getElementById('imgViewPic');
  const expandedImgs = new Set();
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
  const B64_LIMIT = 6 * 1024 * 1024; // 6MB 预算
  const pendingMedia = new Map();
  function b64MetaKey(){ return 'media_b64_meta'; }
  function encKey(k){ return encodeURIComponent(k||''); }
  function b64ItemKey(k){ return 'media_b64:'+encKey(k); }
  function loadB64Meta(){
    try { return JSON.parse(localStorage.getItem(b64MetaKey())||'') || { total: 0, items: {} }; } catch { return { total:0, items:{} }; }
  }
  function saveB64Meta(m){ try { localStorage.setItem(b64MetaKey(), JSON.stringify(m)); } catch {} }
  function getB64(k){
    try {
      const v = localStorage.getItem(b64ItemKey(k));
      if (v) {
        const meta = loadB64Meta();
        const it = meta.items[encKey(k)];
        if (it) { it.ts = Date.now(); saveB64Meta(meta); }
      }
      return v;
    } catch { return null; }
  }
  function evictIfNeeded(){
    const meta = loadB64Meta();
    if (meta.total <= B64_LIMIT) return;
    const entries = Object.entries(meta.items).sort((a,b)=> (a[1].ts||0) - (b[1].ts||0)); // 最旧优先
    for (const [ek, it] of entries){
      try { localStorage.removeItem('media_b64:'+ek); } catch {}
      meta.total = Math.max(0, (meta.total||0) - (it.size||0));
      delete meta.items[ek];
      if (meta.total <= B64_LIMIT) break;
    }
    saveB64Meta(meta);
  }
  function putB64(k, dataUrl){
    try {
      const ek = encKey(k);
      const size = dataUrl ? dataUrl.length : 0;
      const meta = loadB64Meta();
      const old = meta.items[ek];
      if (old && old.size) meta.total = Math.max(0, meta.total - old.size);
      try { localStorage.setItem(b64ItemKey(k), dataUrl); } catch {}
      meta.items[ek] = { size, ts: Date.now() };
      meta.total = (meta.total||0) + size;
      saveB64Meta(meta);
      evictIfNeeded();
    } catch {}
  }
  function blobToDataURL(blob){
    return new Promise(res=>{
      try{
        const fr = new FileReader();
        fr.onload = ()=> res(String(fr.result||''));
        fr.onerror = ()=> res(null);
        fr.readAsDataURL(blob);
      } catch { res(null); }
    });
  }
  const mediaCacheName = 'hihere-media-v1';
  async function getFromCaches(key){
    try {
      if (typeof caches === 'undefined' || !caches?.open) return null;
      const c = await caches.open(mediaCacheName);
      const m = await c.match(new Request('media:'+key));
      if (!m) return null;
      const b = await m.blob();
      return URL.createObjectURL(b);
    } catch { return null; }
  }
  async function putCaches(key, blob, type){
    try {
      if (typeof caches === 'undefined' || !caches?.open) return false;
      const c = await caches.open(mediaCacheName);
      const resp = new Response(blob, { headers: { 'Content-Type': type || blob.type || 'application/octet-stream' } });
      await c.put(new Request('media:'+key), resp);
      return true;
    } catch { return false; }
  }
  async function getImageSrcByKey(key, contentType){
    if (!key) return null;
    const b64 = getB64(key);
    if (b64) return b64;
    const cachedObj = await getFromCaches(key);
    if (cachedObj) return cachedObj;
    if (pendingMedia.has(key)) return pendingMedia.get(key);
    const p = (async ()=>{
      try {
        const r = await window.api.getUrl(key);
        const u = r && r.url;
        if (!u) return null;
        const resp = await fetch(u, { cache: 'no-store' });
        if (!resp || !resp.ok) return null;
        const blob = await resp.blob();
        const dt = await blobToDataURL(blob);
        if (dt && String(dt).startsWith('data:image/')) {
          try { putB64(key, dt); } catch {}
          return dt;
        }
        const ok = await putCaches(key, blob, contentType || blob.type);
        if (ok) return URL.createObjectURL(blob);
        return dt || URL.createObjectURL(blob);
      } catch { return null; }
      finally { pendingMedia.delete(key); }
    })();
    pendingMedia.set(key, p);
    return p;
  }
  function openImageViewer(url){
    if (!imgViewer || !imgViewPic) return;
    imgViewPic.src = url || '';
    imgViewer.style.display = url ? 'flex' : 'none';
  }
  function mediaUrlForKey(key){
    const api = window.API_BASE || '';
    const here = window.store.here_name || '';
    return '/media/' + encodeURIComponent(key||'') + '?t=' + encodeURIComponent(here) + '&a=' + encodeURIComponent(api);
  }
  if (imgViewer) {
    imgViewer.addEventListener('click', (e)=>{ if(e.target===imgViewer) openImageViewer(''); });
  }
  function renderImageInline(host, m){
    const ht = m.heart_time || 0;
    const wrap = document.createElement('div');
    const loading = document.createElement('div');
    loading.textContent = '加载中…';
    loading.style.color = '#888';
    const img = document.createElement('img');
    img.style.maxWidth='72vw'; img.style.borderRadius='10px'; img.style.display='block';
    const collapse = document.createElement('button');
    collapse.className='btn outline'; collapse.textContent='收起';
    collapse.onclick=()=>{ expandedImgs.delete(ht); render(); };
    wrap.append(loading);
    host.innerHTML = '';
    host.append(wrap, collapse);
    (()=>{
      let src = m?.file?.local_url || null;
      if (!src && m?.file?.key) {
        src = mediaUrlForKey(m.file.key);
      }
      if (src) {
        img.src = src;
        img.onclick = ()=>{ openImageViewer(src); };
        wrap.innerHTML = '';
        wrap.appendChild(img);
      } else {
        loading.textContent = '加载失败';
      }
    })();
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
      const ht = m.heart_time || 0;
      if (expandedImgs.has(ht)) {
        renderImageInline(msg, m);
      } else {
        const btn=document.createElement('button'); btn.className='btn outline'; btn.style.width='100%'; btn.textContent=(m._status==='pending' && !m.file.key)?'【图片】(上传中…)':'【图片】';
        btn.onclick = ()=>{ expandedImgs.add(ht); render(); };
        msg.appendChild(btn);
      }
    } else if (kind==='image' && m.file && m.file.local_url && !m.file.key){
      const ht = m.heart_time || 0;
      if (expandedImgs.has(ht)) {
        renderImageInline(msg, m);
      } else {
        const btn=document.createElement('button'); btn.className='btn outline'; btn.style.width='100%'; btn.textContent='【图片】(上传中…)';
        btn.onclick = ()=>{ expandedImgs.add(ht); render(); };
        msg.appendChild(btn);
      }
    } else if (kind==='audio' && m.file && m.file.key) {
      const btn=document.createElement('button'); btn.className='btn outline'; btn.textContent=(m._status==='pending' && !m.file.key)?'【音频】(上传中…)':'【音频】';
      const show = async ()=>{
        let url = m.file.local_url;
        if (!url) url = mediaUrlForKey(m.file.key);
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
        let url = mediaUrlForKey(m.file.key);
        if (url) {
          const name = (m.file.key && m.file.key.split('/').pop()) || 'download';
          const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
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
  // ws indicator
  const peerSeen = new Map();
  function updateWsIndicator(){
    if (!wsDot || !wsText) return;
    const now = Date.now();
    let onlinePeers = 0;
    for (const [k, t] of peerSeen.entries()){
      if (now - t < 5*60*1000) onlinePeers++;
    }
    const connected = (window.api.wsState && window.api.wsState() === 1);
    const strong = connected && onlinePeers >= 2;
    wsDot.style.background = strong ? '#07c160' : (connected ? '#91d5ff' : '#bbb');
    wsText.textContent = connected ? (strong ? '在线(多人)' : '在线') : '离线';
  }
  window.api.onPush((item)=>{
    if (item && item.here_nick_name) {
      const me = window.store.nick||'';
      if (item.here_nick_name !== me) peerSeen.set(item.here_nick_name, Date.now());
    }
    updateWsIndicator();
    const me = window.store.nick||'';
    if (item && item.here_nick_name === me) {
      const minePending = (window.store.messages||[]).find(x => x._status==='pending' && x.here_nick_name===me && (x.msg||'')===(item.msg||'') && (x.kind||'text')===(item.kind||'text'));
      if (minePending) {
        const oldTs = minePending.heart_time;
        window.store.updateByTime(oldTs, { heart_time: item.heart_time, _status: 'sent', readers: item.readers, read_count: item.read_count, file: item.file });
        const oldNode = document.querySelector(`.bubble[data-ht="${oldTs}"]`);
        if (oldNode) oldNode.replaceWith(bubble(item));
        return;
      }
    }
    if (item && document.querySelector(`.bubble[data-ht="${item.heart_time}"]`)) {
      const el = document.querySelector(`.bubble[data-ht="${item.heart_time}"]`);
      const newNode = bubble(item);
      el.replaceWith(newNode);
    } else if (item) {
      render();
    }
  });
  if (window.api.onWSState) window.api.onWSState(()=>updateWsIndicator());
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
    const items = data.items||[];
    window.store.mergeMessages(items);
    let replaced = 0;
    items.forEach(it=>{
      const node = document.querySelector(`.bubble[data-ht="${it.heart_time}"]`);
      if (node) { node.replaceWith(bubble(it)); replaced++; }
    });
    if (replaced === 0 && items.length) render();
  }
  async function reconcileReadStatus(){
    try{
      const me = window.store.nick || '';
      const here = window.store.here_name || '';
      if (!here) return;
      const arr = (window.store.messages||[]).slice(0, 200);
      const keys = [];
      for (const m of arr){
        const readersArr = Array.isArray(m.readers)? m.readers: [];
        const isSelf = (m.here_nick_name||'') === (me||'');
        const iHaveRead = readersArr.includes(me);
        if (isSelf || !iHaveRead) {
          if (m.heart_time) keys.push(m.heart_time);
        }
        if (keys.length >= 100) break;
      }
      if (!keys.length) return;
      const resp = await window.api.status(keys);
      const items = Array.isArray(resp?.items)? resp.items : [];
      for (const it of items){
        if (it && it.heart_time) {
          window.store.updateByTime(it.heart_time, { readers: Array.isArray(it.readers)? it.readers: [], read_count: Number(it.read_count)||0 });
        }
      }
      render();
    } catch {}
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
  function closeTextBox(){ textBox.style.display='none'; msgBar.style.display='flex'; }
  function syncTextBoxButtons(){
    const has = text.value.trim().length>0;
    const send = document.getElementById('btnSend');
    const back = document.getElementById('btnBack');
    if (send) send.style.display = has ? '' : 'none';
    if (back) back.style.display = has ? 'none' : '';
  }
  document.getElementById('btnBack') && (document.getElementById('btnBack').onclick = ()=>{ closeTextBox(); });
  text && (text.oninput = ()=>{ syncTextBoxButtons(); });
  if (text) {
    text.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && !e.isComposing) {
        e.preventDefault();
        const val = text.value.trim();
        if (val) {
          btnSend && btnSend.click();
        } else {
          closeTextBox();
        }
      }
    });
  }
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
    window.store.upsertMessage({
      here_name: window.store.here_name, heart_time: now,
      here_nick_name: window.store.nick, battery: null, lat: null, lng: null, msg: v, message: v, kind: 'text', _status: 'pending'
    });
    const node = document.querySelector(`.bubble[data-ht="${now}"]`);
    if (!node) { render(); }
    text.value=''; syncTextBoxButtons(); closeTextBox();
    (async()=>{
      const [batt, geo] = await Promise.all([window.api.battery(), window.api.geoloc()]);
      const res = await window.api.send({ nick: window.store.nick, here_nick_name: window.store.nick, battery: batt, lat: geo?.lat, lng: geo?.lng, message: v, msg: v, kind: 'text' });
      const serverTs = Number(res?.ts) || now;
      window.store.updateByTime(now, { battery: batt, lat: geo?.lat, lng: geo?.lng, heart_time: serverTs, _status: 'sent' });
      const finalItem = { here_name: window.store.here_name, heart_time: serverTs, here_nick_name: window.store.nick, battery: batt, lat: geo?.lat, lng: geo?.lng, msg: v, message: v, kind: 'text', _status: 'sent' };
      const pendingNode = document.querySelector(`.bubble[data-ht="${now}"]`);
      if (pendingNode) {
        pendingNode.replaceWith(bubble(finalItem));
      } else {
        const sameNode = document.querySelector(`.bubble[data-ht="${serverTs}"]`);
        if (sameNode) sameNode.replaceWith(bubble(finalItem));
        else {
          const nodes = Array.from(listEl.querySelectorAll('.bubble[data-ht]'));
          let inserted = false;
          for (const el of nodes){
            const ht = Number(el.getAttribute('data-ht')||'0');
            if (ht < serverTs) { listEl.insertBefore(bubble(finalItem), el); inserted = true; break; }
          }
          if (!inserted) listEl.insertBefore(bubble(finalItem), sentinel);
        }
      }
    })().catch(()=>{/* 保持占位，可加失败态 */})
    .finally(()=>{
      btnSend.disabled = false;
    });
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
    btnMore.onclick=(e)=>{ 
      e.stopPropagation && e.stopPropagation();
      const showing = moreSheet.style.display === 'block';
      moreSheet.style.display = showing ? 'none' : 'block';
    };
    document.addEventListener('click', (e)=>{
      if (moreSheet.style.display === 'block') {
        const inPanel = moreSheet.contains(e.target);
        const onBtn = btnMore.contains(e.target);
        if (!inPanel && !onBtn) moreSheet.style.display = 'none';
      }
    }, { passive: true });
    window.addEventListener('scroll', ()=>{ if(moreSheet.style.display==='block') moreSheet.style.display='none'; }, { passive: true });
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
  (async () => { await ensureProfile(); window.store.loadCache(); render(); await reconcileReadStatus(); await refreshLatest(); updateWsIndicator(); window.api.connectWS(); wirePunchUI(); wireMsgBar(); })();
})(); 
