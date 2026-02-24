(() => {
  const API_BASE = (() => {
    const saved = localStorage.getItem('api_base');
    if (saved) return saved;
    const isApiDomain = /execute-api\./.test(location.hostname);
    return isApiDomain ? '' : 'https://ko8egkyh0f.execute-api.ap-east-1.amazonaws.com';
  })();
  async function battery() {
    if (navigator.getBattery) {
      try { const b = await navigator.getBattery(); return Math.round(b.level * 100); } catch {}
    }
    return Math.floor(20 + Math.random() * 70);
  }
  async function geoloc() {
    return new Promise(r => {
      if (!navigator.geolocation) return r(null);
      navigator.geolocation.getCurrentPosition(
        p => r({ lat: p.coords.latitude, lng: p.coords.longitude }),
        _ => r(null),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
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
  // WebSocket
  let ws = null, recvCount = 0, regTimer = null;
  let onPushCb = null;
  const pendingReads = [];
  function onPush(cb){ onPushCb = cb; }
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
      ws.onclose = () => { if(regTimer) { clearInterval(regTimer); regTimer=null; } setTimeout(connectWS, 3000); };
      ws.onerror = () => { try { ws && ws.close(); } catch {} };
    } catch {}
  }
  window.api = { battery, geoloc, list, send, connectWS, onPush, sendRead, uploadUrl, getUrl };
})(); 
