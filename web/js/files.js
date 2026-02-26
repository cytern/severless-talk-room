(()=> {
  const listEl = document.getElementById('list');
  const btnBack = document.getElementById('btnBack');
  if (btnBack) btnBack.onclick = ()=>{ window.location.href = 'index.html'; };
  function tokenOf(ts){
    const d=new Date((ts||0)+8*3600*1000);
    const y=d.getUTCFullYear(), m=d.getUTCMonth()+1, da=d.getUTCDate();
    const p=n=>String(n).padStart(2,'0');
    return `${y}-${p(m)}-${p(da)}`;
  }
  function mediaUrlForKey(key){
    const api = window.API_BASE || '';
    const here = window.store?.here_name || '';
    return '/media/' + encodeURIComponent(key||'') + '?t=' + encodeURIComponent(here) + '&a=' + encodeURIComponent(api);
  }
  function openImageViewer(url){
    const iv = document.getElementById('imgViewer');
    const pic = document.getElementById('imgViewPic');
    if (!iv || !pic) return;
    pic.src = url || '';
    iv.style.display = url ? 'flex' : 'none';
  }
  (function bindViewerClose(){
    const iv = document.getElementById('imgViewer');
    if (iv) iv.addEventListener('click', (e)=>{ if(e.target===iv) openImageViewer(''); });
  })();
  function loadNotes(){
    try{
      const k = 'file_notes_'+(window.store?.here_name||'');
      return JSON.parse(localStorage.getItem(k)||'{}') || {};
    }catch{ return {}; }
  }
  function saveNotes(map){
    try{
      const k = 'file_notes_'+(window.store?.here_name||'');
      localStorage.setItem(k, JSON.stringify(map||{}));
    }catch{}
  }
  function render(){
    if(!listEl) return;
    listEl.innerHTML = '';
    const notes = loadNotes();
    const files = (window.store?.messages||[]).filter(m => m && m.file && (m.file.key || m.file.local_url));
    files.sort((a,b)=>(b.heart_time||0)-(a.heart_time||0));
    let lastTok = null;
    for (const m of files){
      const tok = tokenOf(m.heart_time||0);
      if (tok && tok !== lastTok) {
        const div = document.createElement('div');
        div.className = 'divider';
        div.textContent = tok;
        listEl.appendChild(div);
        lastTok = tok;
      }
      const item = document.createElement('div');
      item.className = 'file-item';
      const type = (m.kind || (m.file?.content_type||'')).includes('image') || m.kind==='image' ? '图片'
                 : (m.kind==='audio' || (m.file?.content_type||'').startsWith('audio')) ? '录音'
                 : '文件';
      const btn = document.createElement('button'); btn.className='btn btn-green'; btn.textContent = `【${type}】`;
      btn.onclick = async ()=>{
        let url = m.file?.local_url || '';
        if (!url && m.file?.key) url = mediaUrlForKey(m.file.key);
        if (!url) return;
        if (type==='图片') {
          openImageViewer(url);
        } else if (type==='录音') {
          let player = item.querySelector('audio.fm-audio');
          if (player) { player.remove(); return; }
          player = document.createElement('audio');
          player.className='fm-audio';
          player.controls = true;
          player.src = url;
          player.style.width = '72vw';
          item.appendChild(player);
          try { player.play(); } catch {}
        } else {
          window.open(url, '_blank');
        }
      };
      const dl = document.createElement('button'); dl.className='btn btn-yellow'; dl.textContent='下载';
      dl.onclick = async ()=>{
        let url = m.file?.local_url || '';
        if (!url && m.file?.key) url = mediaUrlForKey(m.file.key);
        if (!url) return;
        const name = (m.file?.key && m.file.key.split('/').pop()) || (type==='录音'?'audio':'download');
        const a = document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
      };
      const meta = document.createElement('div'); meta.className='file-meta';
      const title = document.createElement('div'); title.textContent = `${m.here_nick_name||''} · ${new Date(m.heart_time||0).toLocaleString()}`;
      const noteText = document.createElement('div'); noteText.className='note'; noteText.textContent = notes[m.file?.key||''] || '';
      const noteEdit = document.createElement('div'); noteEdit.className='note-edit'; noteEdit.style.display='none';
      const input = document.createElement('input'); input.type='text'; input.placeholder='添加备注（再次点击可修改）';
      const ok = document.createElement('button'); ok.className='btn secondary'; ok.textContent='完成';
      ok.onclick = async ()=> {
        const v = input.value.trim();
        notes[m.file?.key||''] = v;
        saveNotes(notes);
        noteText.textContent = v;
        noteEdit.style.display='none';
        try { if (window.api?.fileRemark && m.file?.key) window.api.fileRemark(m.file.key, v); } catch {}
      };
      noteEdit.append(input, ok);
      meta.append(title, noteText, noteEdit);
      const plus = document.createElement('button'); plus.className='btn'; plus.textContent='+'; plus.title='备注';
      plus.onclick = ()=>{ input.value = notes[m.file?.key||''] || ''; noteEdit.style.display = 'flex'; input.focus(); };
      item.append(btn, meta, dl, plus);
      listEl.appendChild(item);
    }
  }
  (async () => { window.store?.loadCache && window.store.loadCache(); render(); })();
})(); 
