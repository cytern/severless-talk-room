(() => {
  const messages = [];
  function keyOf(m) { return `${m.here_name || ''}|${m.heart_time || ''}|${m.here_nick_name || ''}|${m.msg || ''}`; }
  function merge(items) {
    const map = new Map(messages.map(m => [keyOf(m), m]));
    (items || []).forEach(m => map.set(keyOf(m), m));
    const arr = Array.from(map.values());
    arr.sort((a,b) => (b.heart_time||0) - (a.heart_time||0));
    messages.length = 0;
    messages.push(...arr);
  }
  function upsert(m) {
    const k = keyOf(m);
    const idx = messages.findIndex(x => keyOf(x) === k);
    if (idx >= 0) messages[idx] = { ...messages[idx], ...m };
    else messages.unshift(m);
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
    clear(){ messages.length = 0; }
  };
})(); 
