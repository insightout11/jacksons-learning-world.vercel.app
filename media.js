/* ================= MEDIA SERVICE — youtube | mock =================
   Clean boundary: missions declare m.media = {type:'youtube', youtubeId, channel, ...}
   or {type:'mock'}. Everything else goes through MediaResolver / YTPlayer. */
function parseYouTubeUrl(url){
  if(!url || typeof url!=='string') return {ok:false, error:'Empty URL — paste a YouTube link.'};
  const u = url.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?[^#]*v=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([A-Za-z0-9_-]{11})/,
    /(?:m\.youtube\.com\/watch\?[^#]*v=)([A-Za-z0-9_-]{11})/,
  ];
  for(const p of patterns){ const m = u.match(p); if(m) return {ok:true, videoId:m[1]}; }
  if(/^[A-Za-z0-9_-]{11}$/.test(u)) return {ok:true, videoId:u};
  if(/youtube\.com|youtu\.be/.test(u)) return {ok:false, error:'That YouTube link didn’t contain a video ID. Try the full watch URL.'};
  return {ok:false, error:'Only YouTube links are supported — no other websites.'};
}
function ytEmbedUrl(id, opts){
  // Privacy Enhanced Mode host + no related videos + captions on + inline playback.
  const o = Object.assign({rel:0, modestbranding:1, playsinline:1, cc_load_policy:1, cc_lang_pref:'en'}, opts||{});
  const q = Object.keys(o).map(k=>k+'='+encodeURIComponent(o[k])).join('&');
  return 'https://www.youtube-nocookie.com/embed/'+id+'?'+q;
}
function ytThumb(id){ return 'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg'; }
function getMedia(m){
  if(m && m.media && m.media.type==='youtube' && m.media.youtubeId) return m.media;
  return {type:'mock'};
}
/* The JS API requires an http(s) origin; on file:// we use plain embeds. */
function ytApiUsable(){
  try{ return (location.protocol||'').indexOf('http')===0; }catch(e){ return false; }
}

/* ---------- YT IFrame API player with timestamp triggers ---------- */
let __ytApiPromise = null;
function loadYTApi(){
  if(typeof YT!=='undefined' && YT.Player) return Promise.resolve();
  if(__ytApiPromise) return __ytApiPromise;
  __ytApiPromise = new Promise((resolve)=>{
    let done = false;
    const to = setTimeout(()=>{ if(!done){ done=true; resolve(false); } }, 8000);
    window.__ytApiReady = ()=>{ if(!done){ done=true; clearTimeout(to); resolve(true); } };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = ()=>{ if(!done){ done=true; clearTimeout(to); resolve(false); } };
    (document.head||document.body).appendChild(tag);
    const iv = setInterval(()=>{ if(typeof YT!=='undefined'&&YT.Player){ clearInterval(iv); if(!done){done=true;clearTimeout(to);resolve(true);} } }, 300);
  });
  return __ytApiPromise;
}
const YTPlayer = {
  player:null, triggers:[], fired:{}, pollId:null, videoId:null,
  async mount(elId, videoId, opts){
    this.destroy();
    this.videoId = videoId;
    this.triggers = (opts&&opts.triggers)||[];
    this.fired = {};
    const ok = await loadYTApi();
    const el = document.getElementById(elId);
    if(!el) return false;
    if(!ok || typeof YT==='undefined' || !YT.Player){ this.fallback(el, videoId); return 'fallback'; }
    try{
      this.player = new YT.Player(elId, {
        width:'100%', videoId,
        playerVars:{rel:0, modestbranding:1, playsinline:1},
        events:{
          onReady: ()=>{ if(opts&&opts.onReady) opts.onReady(); },
          onStateChange: (e)=>{
            if(e.data===YT.PlayerState.ENDED && opts&&opts.onEnded) opts.onEnded();
            if((e.data===YT.PlayerState.PLAYING) && opts&&opts.onPlay) opts.onPlay();
          },
          onError: ()=>{ if(opts&&opts.onError) opts.onError(); }
        }
      });
    }catch(err){ this.fallback(el, videoId); return 'fallback'; }
    if(this.triggers.length){
      this.pollId = setInterval(()=>{
        try{
          if(!this.player||!this.player.getCurrentTime) return;
          if(this.player.getPlayerState&&this.player.getPlayerState()!==1) return;
          const t = this.player.getCurrentTime();
          this.triggers.forEach((tr,i)=>{
            if(!this.fired[i] && t>=tr.at){ this.fired[i]=true; this.pause(); if(opts&&opts.onTrigger) opts.onTrigger(tr); }
          });
        }catch(err){}
      }, 500);
    }
    return 'api';
  },
  pause(){ try{ if(this.player&&this.player.pauseVideo) this.player.pauseVideo(); }catch(e){} },
  resume(){ try{ if(this.player&&this.player.playVideo) this.player.playVideo(); }catch(e){} },
  fallback(el, videoId){
    /* Replace the whole node: the API may have swapped our div for its iframe. */
    try{
      const fresh = document.createElement('div');
      fresh.setAttribute('id', el.getAttribute ? (el.getAttribute('id')||'yt-api-player') : 'yt-api-player');
      fresh.innerHTML = `<iframe width="100%" height="100%" src="${ytEmbedUrl(videoId,{rel:0})}" title="Video" frameborder="0" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
      if(el.parentNode) el.parentNode.replaceChild(fresh, el);
      else el.innerHTML = fresh.innerHTML;
    }catch(err){
      try{ el.innerHTML = `<iframe width="100%" height="100%" src="${ytEmbedUrl(videoId,{rel:0})}" title="Video" frameborder="0" allowfullscreen></iframe>`; }catch(e2){}
    }
  },
  destroy(){
    if(this.pollId){ clearInterval(this.pollId); this.pollId=null; }
    try{ if(this.player&&this.player.destroy) this.player.destroy(); }catch(e){}
    this.player=null; this.triggers=[]; this.fired={};
  }
};
function ytTriggerOverlay(tr){
  showOverlay(`<div class="modal" style="text-align:center">
    <div class="scout-face" style="margin:0 auto">🦊</div>
    <div class="p-label" style="margin-top:8px">⏸️ Scout paused the video…</div>
    <h2 style="font-size:21px;margin:8px 0">${esc(tr.prompt)}</h2>
    ${(tr.options||[]).map((o,i)=>`<button class="opt" onclick="ytTriggerAnswer(${i})">${esc(o)}</button>`).join('')}
    <div id="trig-fb"></div>
  </div>`);
  window.__trig = tr;
}
function ytTriggerAnswer(i){
  const tr = window.__trig;
  const fb = document.getElementById('trig-fb');
  if(fb) fb.innerHTML = `<div class="feedback good">🔮 Prediction locked in! Let’s see what the video reveals…</div>
    <button class="btn green big" style="width:100%;margin-top:10px" onclick="closeOverlay();YTPlayer.resume();logEvent('trigger_answered',{at:${tr?tr.at:0},pick:${i}})">▶ Keep Watching</button>`;
  if(R){ R.triggerAnswers = R.triggerAnswers||[]; R.triggerAnswers.push({at:tr?tr.at:0, pick:i}); }
}
