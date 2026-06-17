(()=> {
  const listEl = document.getElementById('list');
  const btnBack = document.getElementById('btnBack');
  const inpSearch = document.getElementById('inpSearch');
  const btnSearch = document.getElementById('btnSearch');
  if (btnBack) btnBack.onclick = ()=>{ window.location.href = 'index.html'; };
  
  let currentSearchQuery = '';
  let searchTimer = null;
  let searchResults = null;

  if (inpSearch) {
    inpSearch.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        doSearch(inpSearch.value.trim());
      }, 3000);
    });
  }
  if (btnSearch) {
    btnSearch.onclick = () => {
      clearTimeout(searchTimer);
      doSearch(inpSearch?.value.trim());
    };
  }

  async function doSearch(q) {
    if (!q) {
      currentSearchQuery = '';
      searchResults = null;
      render();
      return;
    }
    try {
      const res = await window.api.searchFilesByTag(q);
      searchResults = res.items || [];
      currentSearchQuery = q;
      render();
    } catch (e) {
      console.error(e);
      alert('查询失败: ' + e.message);
    }
  }
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
    let files = [];
    if (searchResults != null) {
      files = searchResults;
    } else {
      files = (window.store?.messages||[]).filter(m => m && m.file && (m.file.key || m.file.local_url));
      files.sort((a,b)=>(b.heart_time||0)-(a.heart_time||0));
    }
    
    if (files.length === 0) {
      listEl.innerHTML = '<div class="divider">没有找到文件</div>';
      return;
    }

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
      if (type==='录音') {
        const dur = Number(m?.file?.duration_ms)||0;
        if (dur>0) {
          const mm = String(Math.floor(dur/60000)).padStart(2,'0');
          const ss = String(Math.floor((dur%60000)/1000)).padStart(2,'0');
          btn.textContent = `【录音】 ${mm}:${ss}`;
        }
      }
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
      
      const serverTag = m.file_tag; // 标签属性可能从服务器来
      const localTag = notes[m.file?.key||''] || '';
      const tagStr = serverTag || localTag || '';

      const noteText = document.createElement('div'); 
      if (tagStr) {
        noteText.className='tag-badge'; 
        noteText.textContent = tagStr;
      }

      const noteEdit = document.createElement('div'); noteEdit.className='note-edit'; noteEdit.style.display='none';
      const input = document.createElement('input'); input.type='text'; input.placeholder='添加标签（再次点击可修改）';
      const ok = document.createElement('button'); ok.className='btn secondary'; ok.textContent='完成';
      ok.onclick = async ()=> {
        const v = input.value.trim();
        notes[m.file?.key||''] = v;
        saveNotes(notes);
        if (v) {
          noteText.className = 'tag-badge';
          noteText.textContent = v;
        } else {
          noteText.className = '';
          noteText.textContent = '';
        }
        noteEdit.style.display='none';
        try { if (window.api?.updateFileTag && m.heart_time) window.api.updateFileTag(m.heart_time, v); } catch {}
      };
      noteEdit.append(input, ok);
      meta.append(title, noteText, noteEdit);
      const plus = document.createElement('button'); plus.className='btn'; plus.textContent='+'; plus.title='标签';
      plus.onclick = ()=>{ input.value = notes[m.file?.key||''] || serverTag || ''; noteEdit.style.display = 'flex'; input.focus(); };
      if (type==='图片') {
        const thumb = document.createElement('img');
        const key = m.file?.key||'';
        const thumbStored = (key && localStorage.getItem('thumb_'+key)) || '';
        const src = m.file?.thumb_data_url || thumbStored || '';
        if (src) {
          thumb.src = src;
          thumb.className='thumb';
          let origin = m.file?.local_url || '';
          if (!origin && m.file?.key) origin = mediaUrlForKey(m.file.key);
          thumb.style.cursor = origin ? 'zoom-in' : 'default';
          if (origin) thumb.onclick = ()=> openImageViewer(origin);
          item.classList.add('image');
          item.append(thumb, meta, dl, plus);
        } else {
          item.append(btn, meta, dl, plus);
        }
      } else {
        item.append(btn, meta, dl, plus);
      }
      listEl.appendChild(item);
    }
  }
  (async () => { window.store?.loadCache && window.store.loadCache(); render(); })();
})(); 
