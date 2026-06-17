(() => {
  const API_BASE = (() => {
    const saved = localStorage.getItem('api_base');
    if (saved) return saved;
    const isApiDomain = /execute-api\./.test(location.hostname) || /cytern\.click/.test(location.hostname);
    return isApiDomain ? '' : 'https://here.cytern.click';
  })();
  try { window.API_BASE = API_BASE; } catch {}
  async function battery() {
    if (navigator.getBattery) {
      try { const b = await navigator.getBattery(); return Math.round(b.level * 100); } catch {}
    }
    return Math.floor(20 + Math.random() * 70);
  }
  function netCacheKey(){ return 'net_cache_v1'; }
  function saveNetCache(label){
    try { localStorage.setItem(netCacheKey(), JSON.stringify({ v: String(label||''), ts: Date.now() })); } catch {}
  }
  function readNetCache(){
    try { const t = localStorage.getItem(netCacheKey()); return t ? JSON.parse(t) : null; } catch { return null; }
  }
  function detectNetLabel(){
    try {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const online = (navigator.onLine !== false);
      if (!online) return '离线';
      const eff = (conn && conn.effectiveType) ? String(conn.effectiveType).toLowerCase() : '';
      const typ = (conn && conn.type) ? String(conn.type).toLowerCase() : '';
      const ua = (navigator.userAgent||'').toLowerCase();
      const isMobileUA = /android|iphone|ipad|ipod|mobile/.test(ua);
      if (typ === 'wifi') return 'WiFi';
      if (typ === 'ethernet') return '有线';
      if (typ === 'cellular') {
        if (eff === 'slow-2g' || eff === '2g') return '2G';
        if (eff === '3g') return '3G';
        if (eff === '5g') return '5G';
        return '4G';
      }
      if (eff === 'slow-2g' || eff === '2g') return '2G';
      if (eff === '3g') return '3G';
      if (eff === '5g') return '5G';
      if (eff === '4g') return isMobileUA ? '4G' : 'WiFi';
      return isMobileUA ? '蜂窝' : 'WiFi';
    } catch { return '未知'; }
  }
  function netForSend(){
    const FIVE_MIN = 5*60*1000;
    const c = readNetCache();
    if (c && c.ts && (Date.now() - c.ts) < FIVE_MIN && c.v) return c.v;
    const v = detectNetLabel();
    saveNetCache(v);
    return v;
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
  function normalizeItem(it){
    try {
      if (it && it.relay_to!=null && it.reply_to==null) it.reply_to = it.relay_to;
    } catch {}
    return it;
  }
  async function list(next, opts) {
    const headers = { 'hitoken': encodeURIComponent(window.store.here_name || ''), 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' };
    const ts = Date.now();
    const q = next ? ('?lastKey=' + encodeURIComponent(next) + '&t=' + ts) : ('?t=' + ts);
    const fetchOpts = { headers, cache: (opts && opts.reload) ? 'reload' : 'no-store' };
    const res = await fetch(API_BASE + '/api/messages' + q, fetchOpts);
    const data = await res.json();
    if (data && Array.isArray(data.items)) data.items = data.items.map(normalizeItem);
    return data;
  }
  async function send(payload) {
    const headers = { 'Content-Type': 'application/json', 'hitoken': encodeURIComponent(window.store.here_name || '') };
    const p = { ...payload };
    if (p.reply_to!=null && p.relay_to==null) p.relay_to = p.reply_to;
    if (p.relay_to!=null && p.reply_to==null) p.reply_to = p.relay_to;
    const body = JSON.stringify(p);
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
  async function appendFileIndex(key, ts){
    try{
      const headers = { 'Content-Type': 'application/json', 'hitoken': encodeURIComponent(window.store.here_name || '') };
      const body = JSON.stringify({ key, ts });
      await fetch(API_BASE + '/api/files/append', { method: 'POST', headers, body });
    } catch {}
  }
  async function fileRemark(key, remark){
    try{
      const headers = { 'Content-Type': 'application/json', 'hitoken': encodeURIComponent(window.store.here_name || '') };
      const body = JSON.stringify({ key, remark });
      await fetch(API_BASE + '/api/files/remark', { method: 'POST', headers, body });
    } catch {}
  }
  // WebSocket
  let ws = null, recvCount = 0, regTimer = null, pingTimer = null, wsWatchTimer = null, lastRecvTs = 0;
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
  function heartbeat(){
    const payload = { action: 'register', here_name: window.store.here_name || '', here_nick_name: window.store.nick || '' };
    wsSend(payload);
  }
  function connectWS(){
    const url = wsBase();
    if(!url) return;
    try {
      ws = new WebSocket(url);
      ws.onopen = () => {
        try { if (onWSStateCb) onWSStateCb(true); } catch {}
        lastRecvTs = Date.now();
        const reg = () => {
          const payload = { action: 'register', here_name: window.store.here_name || '', here_nick_name: window.store.nick || '' };
          try { ws && ws.send(JSON.stringify(payload)); } catch {}
        };
        reg();
        if (pendingReads.length) {
          const copy = pendingReads.splice(0);
          copy.forEach(p => { try { ws && ws.send(JSON.stringify(p)); } catch {} });
        }
        if(regTimer) { clearInterval(regTimer); regTimer=null; }
        // lightweight keepalive: ping every ~55s to keep intermediaries alive
        if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
        pingTimer = setInterval(()=>{ try { wsSend({ action: 'ping' }); } catch {} }, 55000);
        // watchdog: if no message for > 3min, force reconnect
        if (wsWatchTimer) { clearInterval(wsWatchTimer); wsWatchTimer=null; }
        wsWatchTimer = setInterval(()=>{
          try {
            const st = wsState();
            const idle = Date.now() - lastRecvTs;
            if (st === 1 && idle > 180000) { try { ws.close(); } catch {} }
          } catch {}
        }, 60000);
      };
      ws.onmessage = async (ev) => {
        try {
          const data = JSON.parse(ev.data || '{}');
          lastRecvTs = Date.now();
          if (data && data.type === 'message' && data.item) {
            const item = normalizeItem(data.item);
            window.store.mergeMessages([item]);
            const sender = (item.here_nick_name||'');
            const me = (window.store.nick||'');
            const readers = Array.isArray(item.readers) ? item.readers : [];
            const iHaveRead = readers.includes(me);
            if (sender !== me && !iHaveRead) {
              sendRead(item.heart_time);
            }
            recvCount++;
            if (onPushCb) onPushCb(item);
            if (recvCount % 5 === 0) {
              const latest = await list(null, { reload: true });
              window.store.mergeMessages(latest.items || []);
              if (onPushCb) onPushCb(null);
            }
          } else if (data && data.type === 'read' && data.item) {
            window.store.mergeMessages([data.item]);
            if (onPushCb) onPushCb(data.item);
          }
        } catch {}
      };
      const cleanupTimers = ()=>{ if(pingTimer){ clearInterval(pingTimer); pingTimer=null; } if(wsWatchTimer){ clearInterval(wsWatchTimer); wsWatchTimer=null; } };
      ws.onclose = () => { cleanupTimers(); try { if (onWSStateCb) onWSStateCb(false); } catch {} if(regTimer) { clearInterval(regTimer); regTimer=null; } setTimeout(connectWS, 3000); };
      ws.onerror = () => { cleanupTimers(); try { if (onWSStateCb) onWSStateCb(false); ws && ws.close(); } catch {} };
    } catch {}
  }
  window.api = { battery, batteryForSend, geoloc, geolocForSend, geolocTryFast, geolocBackgroundRefresh, list, send, connectWS, onPush, sendRead, uploadUrl, getUrl, status, onWSState, wsState, heartbeat, appendFileIndex, fileRemark, geolocSaveCache: geolocSaveCache, saveBatteryCache, netForSend, saveNetCache };
})(); 
