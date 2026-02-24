(() => {
  const messages = [];
  function keyOf(m) { return `${m.here_name || ''}|${m.heart_time || ''}|${m.here_nick_name || ''}|${m.msg || ''}`; }
  function nowTs(){ return Date.now(); }
  function sevenDaysAgo(){ return nowTs() - 7*24*60*60*1000; }
  function cacheKey(){ const h=(window.store?.here_name||'')||localStorage.getItem('here_name')||''; return `cache_messages_${h}`; }
  function persist(){
    const cutoff = sevenDaysAgo();
    const here = window.store?.here_name || localStorage.getItem('here_name') || '';
    const arr = messages.filter(m => m && m.here_name === here && (m.heart_time||0) >= cutoff).slice();
    arr.sort((a,b) => (b.heart_time||0) - (a.heart_time||0));
    try { localStorage.setItem(cacheKey(), JSON.stringify(arr)); } catch {}
  }
  function loadCache(){
    const txt = localStorage.getItem(cacheKey());
    if (!txt) return;
    try {
      const arr = JSON.parse(txt) || [];
      const cutoff = sevenDaysAgo();
      const here = window.store?.here_name || localStorage.getItem('here_name') || '';
      const filtered = arr.filter(m => m && m.here_name === here && (m.heart_time||0) >= cutoff);
      filtered.sort((a,b) => (b.heart_time||0) - (a.heart_time||0));
      messages.length = 0;
      messages.push(...filtered);
    } catch {}
  }
  function merge(items) {
    const tk = (m)=>`${m.here_name||''}|${m.heart_time||''}`;
    const map = new Map(messages.map(m => [tk(m), m]));
    (items || []).forEach(m => {
      const k = tk(m);
      const prev = map.get(k) || {};
      map.set(k, { ...prev, ...m });
    });
    const arr = Array.from(map.values());
    arr.sort((a,b) => (b.heart_time||0) - (a.heart_time||0));
    messages.length = 0;
    messages.push(...arr);
    persist();
  }
  function upsert(m) {
    const k = keyOf(m);
    const idx = messages.findIndex(x => keyOf(x) === k);
    if (idx >= 0) messages[idx] = { ...messages[idx], ...m };
    else messages.unshift(m);
    persist();
  }
  function updateByTime(heart_time, patch) {
    const here = (window.store?.here_name||'');
    const idx = messages.findIndex(x => x.heart_time === heart_time && x.here_name === here);
    if (idx >= 0) {
      Object.assign(messages[idx], patch);
      const newTime = messages[idx].heart_time;
      // dedupe: remove other items with same here_name + heart_time
      for (let i = messages.length - 1; i >= 0; i--) {
        if (i !== idx && messages[i].here_name === here && messages[i].heart_time === newTime) {
          messages.splice(i, 1);
        }
      }
      persist();
      // resort by time desc
      messages.sort((a,b) => (b.heart_time||0) - (a.heart_time||0));
    }
  }
  window.store = {
    get here_name(){ return localStorage.getItem('here_name'); },
    set here_name(v){ localStorage.setItem('here_name', v); },
    get nick(){ return localStorage.getItem('here_nick_name'); },
    set nick(v){ localStorage.setItem('here_nick_name', v); },
    get messages(){ return messages; },
    mergeMessages: merge,
    upsertMessage: upsert,
    updateByTime,
    loadCache,
    clear(){ messages.length = 0; persist(); }
  };
})(); 
