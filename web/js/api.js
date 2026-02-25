(() => {
  const API_BASE = (() => {
    const saved = localStorage.getItem('api_base');
    if (saved) return saved;
    const isApiDomain = /execute-api\./.test(location.hostname);
    return isApiDomain ? '' : 'https://ko8egkyh0f.execute-api.ap-east-1.amazonaws.com';
  })();
  try { window.API_BASE = API_BASE; } catch {}
  async function battery() {
    if (navigator.getBattery) {
      try { const b = await navigator.getBattery(); return Math.round(b.level * 100); } catch {}
    }
    return Math.floor(20 + Math.random() * 70);
  }
  function batteryCacheKey(){ return 'battery_cache_v1'; }
  function saveBatteryCache(pct){
    try { localStorage.setItem(batteryCacheKey(), JSON.stringify({ v: Number(pct)||0, ts: Date.now() })); } catch {}
  }
  function readBatteryCache(){
    try { const t = localStorage.getItem(batteryCacheKey()); return t ? JSON.parse(t) : null; } catch { return null; }
  }
  function batteryForSend(){
    const c = readBatteryCache();
    if (c && typeof c.v === 'number') return c.v;
    const v = Math.floor(20 + Math.random() * 70);
    saveBatteryCache(v);
    return v;
  }
  async function geoloc() {
    const once = (opts) => new Promise(res => {
      if (!navigator.geolocation) return res(null);
      navigator.geolocation.getCurrentPosition(
        p => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
        _ => res(null),
        opts
      );
    });
    const watchOnce = (opts, ms) => new Promise(res => {
      if (!navigator.geolocation || !navigator.geolocation.watchPosition) return res(null);
      let id = null, to = null, done = false;
      const finish = (v)=>{ if(done) return; done=true; if(id!=null) try{ navigator.geolocation.clearWatch(id); }catch{} if(to) clearTimeout(to); res(v); };
      try {
        id = navigator.geolocation.watchPosition(p=>finish({ lat: p.coords.latitude, lng: p.coords.longitude }), ()=>{}, opts);
        to = setTimeout(()=>finish(null), ms||15000);
      } catch { finish(null); }
    });
    // 1) 尽快返回已有缓存定位（最多15分钟内）
    const quick = await once({ enableHighAccuracy: false, timeout: 12000, maximumAge: 900000 });
    if (quick) return quick;
    // 2) 权限探测：prompt 时强触发一次高精度，以确保弹窗
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const st = await navigator.permissions.query({ name: 'geolocation' });
        if (st && st.state === 'denied') {
          alert('需要定位权限用于附带地址，请在浏览器站点设置中允许“位置”访问。');
        } else if (st && st.state === 'prompt') {
          const rePrompt = await once({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
          if (rePrompt) return rePrompt;
        }
      }
    } catch {}
    // 3) 高精度单次尝试
    const precise = await once({ enableHighAccuracy: true, timeout: 22000, maximumAge: 0 });
    if (precise) return precise;
    // 4) 高精度 watch 等待首个 fix
    const viaWatchHi = await watchOnce({ enableHighAccuracy: true, maximumAge: 0 }, 20000);
    if (viaWatchHi) return viaWatchHi;
    // 5) 低精度 watch 兜底
    const viaWatchLo = await watchOnce({ enableHighAccuracy: false, maximumAge: 0 }, 20000);
    if (viaWatchLo) return viaWatchLo;
    return null;
  }
  function geoCacheKey(){ return 'geo_cache_v1'; }
  function saveGeoCache(obj){
    try { localStorage.setItem(geoCacheKey(), JSON.stringify({ ...obj, ts: Date.now() })); } catch {}
  }
  function geolocSaveCache(obj){ saveGeoCache(obj||{}); }
  function readGeoCache(){
    try { const t = localStorage.getItem(geoCacheKey()); return t ? JSON.parse(t) : null; } catch { return null; }
  }
  async function geolocForSend(){
    const FIVE_MIN = 5*60*1000;
    const c = readGeoCache();
    if (c && c.ts && (Date.now() - c.ts) < FIVE_MIN && c.lat!=null && c.lng!=null) return { lat: c.lat, lng: c.lng };
    const g = await geoloc();
    if (g && g.lat!=null && g.lng!=null) saveGeoCache(g);
    return g;
  }
  function geolocTryFast(){
    const FIVE_MIN = 5*60*1000;
    const c = readGeoCache();
    if (c && c.ts && (Date.now() - c.ts) < FIVE_MIN && c.lat!=null && c.lng!=null) return { lat: c.lat, lng: c.lng };
    return null;
  }
  async function geolocBackgroundRefresh(){
    try {
      const g = await geoloc();
      if (g && g.lat!=null && g.lng!=null) saveGeoCache(g);
    } catch {}
  }
  async function list(next) {
    const headers = { 'hitoken': encodeURIComponent(window.store.here_name || '') };
    const q = next ? ('?lastKey=' + encodeURIComponent(next)) : '';
    const res = await fetch(API_BASE + '/api/messages' + q, { headers, cache: 'no-store' });
    return res.json();
  }
  async function send(payload) {
    const headers = { 'Content-Type': 'application/json', 'hitoken': encodeURIComponent(window.store.here_name || '') };
    const body = JSON.stringify(payload);
    const res = await fetch(API_BASE + '/api/message', { method: 'POST', headers, body });
    return res.json();
  }
  async function uploadUrl(contentType, ext){
    const headers = { 'Content-Type': 'application/json', 'hitoken': encodeURIComponent(window.store.here_name || '') };
    const body = JSON.stringify({ contentType, ext });
    const res = await fetch(API_BASE + '/api/upload-url', { method: 'POST', headers, body });
    return res.json();
  }
  async function getUrl(key){
    const headers = { 'hitoken': encodeURIComponent(window.store.here_name || '') };
    const q = '?key=' + encodeURIComponent(key);
    const res = await fetch(API_BASE + '/api/get-url' + q, { headers, cache: 'no-store' });
    return res.json();
  }
  async function status(keys){
    const headers = { 'Content-Type': 'application/json', 'hitoken': encodeURIComponent(window.store.here_name || '') };
    const body = JSON.stringify({ keys: Array.isArray(keys)? keys : [] });
    const res = await fetch(API_BASE + '/api/messages/status', { method: 'POST', headers, body });
    return res.json();
  }
  // WebSocket
  let ws = null, recvCount = 0, regTimer = null;
  let onPushCb = null;
  let onWSStateCb = null;
  const pendingReads = [];
  function onPush(cb){ onPushCb = cb; }
  function onWSState(cb){ onWSStateCb = cb; }
  function wsState(){ return ws ? ws.readyState : -1; }
  function wsBase(){ return (window.HIHERE_CONFIG && window.HIHERE_CONFIG.ws_base) || localStorage.getItem('ws_base') || ''; }
  const sentReads = new Set();
  function wsSend(obj){
    try {
      if(ws && ws.readyState===1) { ws.send(JSON.stringify(obj)); return true; }
    } catch {}
    if (obj && obj.action === 'read') pendingReads.push(obj);
    return false;
  }
  function sendRead(heart_time){
    if (!heart_time) return;
    if (sentReads.has(heart_time)) return;
    sentReads.add(heart_time);
    const payload = { action: 'read', here_name: window.store.here_name || '', heart_time, here_nick_name: window.store.nick || '' };
    wsSend(payload);
  }
  function connectWS(){
    const url = wsBase();
    if(!url) return;
    try {
      ws = new WebSocket(url);
      ws.onopen = () => {
        try { if (onWSStateCb) onWSStateCb(true); } catch {}
        const reg = () => {
          const payload = { action: 'register', here_name: window.store.here_name || '', here_nick_name: window.store.nick || '' };
          try { ws && ws.send(JSON.stringify(payload)); } catch {}
        };
        reg();
        if (pendingReads.length) {
          const copy = pendingReads.splice(0);
          copy.forEach(p => { try { ws && ws.send(JSON.stringify(p)); } catch {} });
        }
        if(regTimer) clearInterval(regTimer);
        regTimer = setInterval(reg, 55000);
      };
      ws.onmessage = async (ev) => {
        try {
          const data = JSON.parse(ev.data || '{}');
          if (data && data.type === 'message' && data.item) {
            window.store.mergeMessages([data.item]);
            const sender = (data.item.here_nick_name||'');
            const me = (window.store.nick||'');
            const readers = Array.isArray(data.item.readers) ? data.item.readers : [];
            const iHaveRead = readers.includes(me);
            if (sender !== me && !iHaveRead) {
              sendRead(data.item.heart_time);
            }
            recvCount++;
            if (onPushCb) onPushCb(data.item);
            if (recvCount % 5 === 0) {
              const latest = await list(null);
              window.store.mergeMessages(latest.items || []);
              if (onPushCb) onPushCb(null);
            }
          } else if (data && data.type === 'read' && data.item) {
            window.store.mergeMessages([data.item]);
            if (onPushCb) onPushCb(data.item);
          }
        } catch {}
      };
      ws.onclose = () => { try { if (onWSStateCb) onWSStateCb(false); } catch {} if(regTimer) { clearInterval(regTimer); regTimer=null; } setTimeout(connectWS, 3000); };
      ws.onerror = () => { try { if (onWSStateCb) onWSStateCb(false); ws && ws.close(); } catch {} };
    } catch {}
  }
  window.api = { battery, batteryForSend, geoloc, geolocForSend, geolocTryFast, geolocBackgroundRefresh, list, send, connectWS, onPush, sendRead, uploadUrl, getUrl, status, onWSState, wsState, geolocSaveCache: geolocSaveCache, saveBatteryCache };
})(); 
