/* ================= PARENT MODE ================= */
function esc(s){ return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function setPTab(t){ S.parentTab=t; save(); render(); window.scrollTo({top:0}); }

function parentHTML(){
  const p = S.profile;
  const tabs = [['overview','📊 Overview'],['child','🧒 Child'],['missions','🎯 Missions'],['content','✅ Content'],['lab','🧪 Lab'],['progress','📈 Progress'],['settings','⚙️ Settings']];
  let body = '';
  if(S.parentTab==='overview') body = pOverview();
  else if(S.parentTab==='child') body = pChild();
  else if(S.parentTab==='missions') body = pMissions();
  else if(S.parentTab==='content') body = pContent();
  else if(S.parentTab==='lab') body = pLab();
  else if(S.parentTab==='progress') body = pProgress();
  else body = pSettings();
  return `<div class="screen"><div class="parent-wrap">
    <div class="parent-top">
      <div class="logo-globe" style="width:38px;height:38px;font-size:20px;animation:none">🌍</div>
      <div><div class="brand">My Learning World · Parent</div><div class="sub">Guide curiosity — without making it feel like school</div></div>
      <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
        <span class="p-label">${esc(p.name)} · ${p.age}y · Level ${levelOf(p.xp)}</span>
      </div>
    </div>
    <div class="parent-nav">${tabs.map(([id,l])=>`<button class="${S.parentTab===id?'on':''}" onclick="setPTab('${id}')">${l}</button>`).join('')}</div>
    <div class="parent-body">${body}</div>
  </div></div>`;
}

/* ---------- OVERVIEW ---------- */
function pOverview(){
  const p = S.profile;
  const done = p.completedMissions.length;
  const pend = p.approvals.filter(a=>a.status==='pending').length;
  const recs = kidRecs().slice(0,3);
  const recent = [...p.completedMissions].slice(-3).reverse();
  return `
  <div class="p-h">Good ${daypart()}, Parent 👋</div>
  <div class="p-sub">Here's ${esc(p.name)}'s learning world at a glance. Calm, quick, useful.</div>
  <div class="p-grid c4" style="margin-top:14px">
    <div class="p-card"><div class="p-label">Missions completed</div><div class="stat-num">${done}</div><div class="p-sub">${p.minutes} minutes exploring</div></div>
    <div class="p-card"><div class="p-label">Topics explored</div><div class="stat-num">${p.topicsExplored.length}</div><div class="p-sub">${esc(p.topicsExplored.slice(-2).join(' · ')||'Just getting started')}</div></div>
    <div class="p-card"><div class="p-label">Explorer streak</div><div class="stat-num">${p.streak} 🔥</div><div class="p-sub">learning days — no pressure, just momentum</div></div>
    <div class="p-card"><div class="p-label">Needs review</div><div class="stat-num">${pend}</div><div class="p-sub">videos waiting for approval</div></div>
  </div>
  <div class="p-grid c2" style="margin-top:14px">
    <div class="p-card"><div class="p-label">💡 Insights</div><div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">${insights().map(i=>`<div class="insight">✨<span>${i}</span></div>`).join('')}</div></div>
    <div class="p-card"><div class="p-label">🧭 Suggested next missions</div><div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
      ${recs.map(m=>`<div class="appr"><div style="font-size:34px">${m.emoji}</div><div style="flex:1"><b>${esc(m.title)}</b><div class="p-sub">${m.duration} · ${m.xp} XP · <span class="tag">${m.recLabel}</span></div></div><button class="p-btn" onclick="sendMissionById('${m.id}')">Send</button></div>`).join('')}
    </div></div>
  </div>
  <div class="p-grid c2" style="margin-top:14px">
    <div class="p-card"><div class="p-label">🕓 Recent activity</div>
      ${recent.length? `<table class="table" style="margin-top:8px">${recent.map(id=>{const m=getMission(id);return m?`<tr><td>${m.emoji} <b>${esc(m.title)}</b></td><td style="color:#16a34a;font-weight:700">+${m.xp} XP</td></tr>`:'';}).join('')}</table>` : '<div class="p-sub" style="margin-top:8px">No missions yet — send the first one below, or let Scout recommend one in Child mode.</div>'}
      <div style="margin-top:10px;display:flex;gap:8px"><button class="p-btn ghost" onclick="setPTab('missions')">Open mission library</button></div>
    </div>
    <div class="p-card"><div class="p-label">🎁 Recent rewards</div>
      <div class="p-sub" style="margin-top:8px">${p.collectibles.length? esc(p.collectibles.map(c=>c.emoji+' '+c.name).join(' · ')) : 'Collectibles appear here as missions are completed.'}</div>
      <div class="p-sub">${p.worldItems.map(w=>w.emoji+' '+w.name).join(' · ')}</div>
    </div>
  </div>`;
}
function daypart(){ const h=new Date().getHours(); return h<12?'morning':h<18?'afternoon':'evening'; }
function insights(){
  const p = S.profile;
  const out = [];
  const top = Object.entries(p.interests).sort((a,b)=>b[1]-a[1])[0];
  if(top) out.push(`<b>${esc(p.name)}</b> is most engaged by <b>${esc(top[0]).toLowerCase()}</b> topics right now (${top[1]}/100).`);
  const trail = p.pathTrail.slice(-3);
  if(trail.length>=2) out.push(`Current rabbit hole: <b>${trail.map(t=>esc(t)).join(' → ')}</b> — curiosity is leading, exactly as designed.`);
  else out.push(`The next rabbit hole will appear after the first mission — watch how one topic leads to the next.`);
  const sci = p.completedMissions.filter(id=>{const m=getMission(id);return m&&m.skills.includes('Science');}).length;
  out.push(sci?`Completed <b>${sci} science mission${sci===1?'':'s'}</b> so far. Visual + building activities get the strongest responses.`:`No missions yet — Scout usually opens with volcanoes or bridges. Send one above, or let ${esc(p.name)} follow curiosity in Child mode! 🌋`);
  const weak = Object.entries(p.skills).sort((a,b)=>a[1]-b[1])[0];
  if(weak && !p.completedMissions.length) out.push(`Gentle opportunity: <b>${weak[0]}</b> (${weak[1]}/100) — the engine will weave it into ${esc(top?top[0]:'play')} themes.`);
  if(p.topicsExplored.length>=4) out.push(`Has explored <b>${p.topicsExplored.length} topics</b> beyond the starting interests — the world is widening. 🌍`);
  return out;
}

/* ---------- CHILD TAB ---------- */
function pChild(){
  const p = S.profile;
  return `<div class="p-h">🧒 ${esc(p.name)}'s profile</div><div class="p-sub">Everything Scout uses to personalize the world. Changes apply instantly.</div>
  <div class="p-grid c2" style="margin-top:14px">
    <div class="p-card"><div class="p-label">Basics</div>
      <div style="display:grid;gap:10px;margin-top:10px">
        <label class="p-label">Name <input class="p-input" id="f-name" value="${esc(p.name)}"></label>
        <label class="p-label">Age <select class="p-select" id="f-age">${[5,6,7,8,9,10].map(a=>`<option ${p.age===a?'selected':''}>${a}</option>`).join('')}</select></label>
        <div><div class="p-label">Avatar</div><div class="avatar-pick" style="margin-top:6px">${['🦊','🐯','🐼','🦁','🐸','🦄','🐲','🤖'].map(a=>`<button class="${p.avatar===a?'on':''}" onclick="setAvatar('${a}')">${a}</button>`).join('')}</div></div>
        <label class="p-label">Reading level <select class="p-select" id="f-read"><option>Early reader</option><option>Developing reader</option><option>Confident reader</option></select></label>
        <button class="p-btn" onclick="saveBasics()">Save basics</button>
      </div>
    </div>
    <div class="p-card"><div class="p-label">Learning balance & style</div>
      <div style="display:grid;gap:14px;margin-top:10px">
        ${sliderRow('balance','Learning balance','More fun 🎮','More academic 🎓')}
        ${sliderRow('challenge','Challenge','Relaxed 🌿','Challenging 🧗')}
        ${sliderRow('independence','Independence','Guided 🧭','Child chooses 🗺️')}
      </div>
    </div>
  </div>
  <div class="p-card" style="margin-top:14px"><div class="p-label">❤️ Obsessed with (interests)</div>
    <div class="chipset" style="margin-top:10px">${INTEREST_POOL.map(i=>`<button class="chip ${p.interestList.includes(i)?'on':''}" onclick="toggleInterest('${i}')"><span class="e">${INTEREST_EMOJI[i]}</span>${i}</button>`).join('')}</div>
  </div>
  <div class="p-card" style="margin-top:14px"><div class="p-label">🎯 Discover more of (learning goals)</div>
    <div class="chipset" style="margin-top:10px">${GOAL_POOL.map(g=>`<button class="chip ${p.goals.includes(g)?'on':''}" onclick="toggleGoal('${g}')"><span class="e">${GOAL_EMOJI[g]}</span>${g}</button>`).join('')}</div>
  </div>`;
}
function sliderRow(key,label,lo,hi){
  const v = S.profile.prefs[key];
  return `<div><div style="display:flex;justify-content:space-between"><b style="font-size:13.5px">${label}</b><b id="pref-${key}" style="font-size:13px;color:#5b50e8">${v}%</b></div>
  <input type="range" min="0" max="100" value="${v}" oninput="setPref('${key}',this.value)">
  <div class="slider-row"><span>${lo}</span><span>${hi}</span></div></div>`;
}
function setPref(k,v){ S.profile.prefs[k]=+v; save(); const el=document.getElementById('pref-'+k); if(el) el.textContent=v+'%'; }
function setAvatar(a){ S.profile.avatar=a; save(); render(); toast('Avatar updated! '+a); }
function toggleInterest(i){
  const l = S.profile.interestList;
  const ix = l.indexOf(i);
  if(ix>=0){ l.splice(ix,1); S.profile.interests[i]=Math.max(20,(S.profile.interests[i]||60)-25); }
  else { l.push(i); S.profile.interests[i]=Math.max(S.profile.interests[i]||0, 75); }
  save(); render();
}
function toggleGoal(g){
  const l = S.profile.goals; const ix=l.indexOf(g);
  ix>=0?l.splice(ix,1):l.push(g); save(); render();
}
function saveBasics(){
  const n = document.getElementById('f-name').value.trim();
  const a = +document.getElementById('f-age').value;
  if(n) S.profile.name=n; S.profile.age=a; save(); render(); toast('Profile saved ✅');
}

/* ---------- MISSIONS TAB ---------- */
function pMissions(){
  const p = S.profile;
  const all = MISSIONS.concat(S.customMissions||[]);
  return `<div class="p-h">🎯 Mission library</div><div class="p-sub">Every mission, what it teaches, and one-tap send to ${esc(p.name)}.</div>
  <div class="p-card" style="margin-top:14px"><div class="p-label">✉️ Send a mission</div>
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
      <input class="p-input" id="send-text" placeholder='Try: "Learn how airplanes fly"' style="flex:1;min-width:220px">
      <button class="p-btn" onclick="sendMissionText()">Send Mission 🚀</button>
    </div>
    <div class="p-sub">It lands in Child mode as <b>“Dad sent you a mission!”</b> 💌</div>
    ${p.sentMissions.length?`<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">${p.sentMissions.map(s=>{const m=getMission(s.missionId);return `<span class="chip on">💌 ${esc(m?m.title:s.title)}</span>`;}).join('')}</div>`:''}
  </div>
  <div class="p-grid c2" style="margin-top:14px">${all.map(m=>`
    <div class="appr"><div style="font-size:36px">${m.emoji}</div>
      <div style="flex:1"><b>${esc(m.title)}</b>
        <div class="p-sub">${m.duration||'~10 min'} · ${m.xp} XP · ${m.coins} coins · ${(m.skills||[]).join(' · ')}</div>
        <div class="p-sub">Zone: ${zoneName(m.zone)} · Type: ${m.type}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${p.completedMissions.includes(m.id)?'<span class="chip on">✅ Done</span>':`<button class="p-btn" onclick="sendMissionById('${m.id}')">Send</button>`}
      </div>
    </div>`).join('')}</div>`;
}
function sendMissionById(id){
  const m = getMission(id);
  if(!m) return;
  if(!S.profile.sentMissions.find(s=>s.missionId===id)) S.profile.sentMissions.push({missionId:id, from:'Dad', at:Date.now()});
  if(!S.unlockedMissions.includes(id)) S.unlockedMissions.push(id);
  save(); render(); toast(`💌 Mission sent to ${S.profile.name}!`);
}
function sendMissionText(){
  const t = document.getElementById('send-text').value.trim();
  if(!t){ toast('Type a mission first ✏️'); return; }
  const low = t.toLowerCase();
  const match = [
    [['plane','airplane','jet','fly','flight','airport'], 'jets'],
    [['volcano','lava','magma','erupt'], 'volcano'],
    [['dino','fossil','t-rex','trex'], 'dino'],
    [['bridge','bridges','arch','truss'], 'bridges'],
    [['shark','teeth','ocean','sea'], 'sharks'],
    [['mars','space','planet','rocket','astronaut'], 'mars'],
    [['car','engine','race','vehicle'], 'car'],
    [['rome','roman','pompeii','aqueduct','caesar'], 'pompeii'],
    [['math','plus','times','multiply','add'], 'mathbattle'],
    [['island','beach','coral','atoll'], 'islands'],
    [['tower','skyscraper','building','tall'], 'skyscraper'],
    [['super'], 'supervolcano'],
  ];
  let id = null;
  for(const [keys,mid] of match){ if(keys.some(k=>low.includes(k))){ id=mid; break; } }
  if(!id){
    id = 'dad-'+Date.now();
    (S.customMissions = S.customMissions||[]).push({
      id, title:t.replace(/^learn( how| about)?/i,'').trim().replace(/^./,c=>c.toUpperCase()) || t,
      theme:'discovery', zone:'home', type:'discovery', emoji:'💌',
      grad:'linear-gradient(135deg,#f9a8d4,#7c3aed)', duration:'10 min', xp:130, coins:35,
      collectible:{name:'Star sticker', emoji:'⭐'}, worldItem:{name:'Discovery Flag', emoji:'🚩'},
      desc:'A special mission sent with love.', skills:['Creativity','Critical Thinking'], tags:['Mysteries'],
      media:{type:'mock'},
      predict:{type:'choice', q:'Before we begin — which question do you MOST want answered?', options:['How does it work?','Why does it happen?','What happens next?']},
      video:{title:'Exploring: '+t, duration:'3:30', chapters:['Wonder','Discover','Create'], script:'Every great discovery starts with a question — and today the question is yours! Watch, wonder, try, and create. That is how explorers learn.'},
      questions:[
        {kind:'mc', q:'What is the BEST first step of an explorer?', options:['Ask a great question','Wait to be told','Look away'], answer:0, why:'Questions power everything!'},
        {kind:'mc', q:'What do you wonder about this topic?', options:['How it works','Why it happens','What happens next'], answer:0, why:'Wonderful wondering! Curiosity: activated.'}
      ],
      creative:{title:'Show what you found', prompt:'Draw, build, or tell what you discovered about this mission!', tabs:['draw','build','voice'], scout:'A mission straight from Dad, completed with heart. That is what explorers do!'},
      rabbitHoles:[{to:'volcano',why:'A Scout favorite'},{to:'jets',why:'Fast and curious'},{to:'dino',why:'Deep-time wonder'}]
    });
  }
  sendMissionById(id);
}

/* ================= LAB: pipeline + drafts + experiment ================= */
let LAB = {running:false, log:[], draft:null, error:null, bankIx:0};
function pLab(){
  const ev = getEvents();
  const m = labMetrics(ev);
  return `<div class="p-h">🧪 Learning Lab</div><div class="p-sub">Turn videos into missions, inspect every question's source, and watch the key metric: <b>Rabbit Hole Depth</b>.</div>
  <div class="metric-hero" style="margin-top:14px"><div class="p-label" style="color:#b9aef5">🕳️ RABBIT HOLE DEPTH (best chain)</div>
    <div class="big">${S.profile.stats&&S.profile.stats.bestDepth||0}</div>
    <div class="p-sub" style="color:#cfc8f5">consecutive child-chosen missions after the first · ${m.completed} missions completed · ${Math.round(m.rate*100)}% completion rate</div></div>
  <div class="p-card" style="margin-top:14px"><div class="p-label">🎬 YouTube URL → mission pipeline</div>
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
      <input class="p-input" id="lab-url" placeholder="Paste a YouTube URL…" style="flex:2;min-width:220px">
      <input class="p-input" id="lab-title" placeholder="Mission title (optional)" style="flex:1;min-width:160px">
      <button class="p-btn" onclick="runPipeline()" ${LAB.running?'disabled':''}>${LAB.running?'Running…':'Run Pipeline ✨'}</button>
    </div>
    ${LAB.error?`<div class="insight" style="margin-top:10px;background:#fff1f1;border-color:#f3c2c2">⚠️<span>${esc(LAB.error)}</span></div>`:''}
    ${LAB.log.length?`<div class="p-label" style="margin-top:10px">Pipeline stages</div><div class="stage-log" style="margin-top:6px">${LAB.log.map(l=>`▸ <b>${esc(l.stage)}</b> — ${esc(l.detail)}${l.prov?' <span class="prov">'+esc(PROV_LABEL[l.prov]||l.prov)+'</span>':''}`).join('<br>')}</div>`:''}
    <div id="lab-draft">${LAB.draft?labDraftHTML(LAB.draft):''}</div>
  </div>
  <div class="p-card" style="margin-top:14px"><div class="p-label">📝 Saved drafts (${(S.drafts||[]).length})</div>
    ${(S.drafts||[]).length?S.drafts.map((d,i)=>`<div class="appr" style="margin-top:8px"><div style="font-size:32px">${d.emoji}</div><div style="flex:1"><b>${esc(d.title)}</b><div class="p-sub">${d.questions.length} activities · <span class="prov">${esc(PROV_LABEL[d.provenance]||d.provenance||'demo')}</span></div></div><button class="p-btn green" onclick="labApproveDraft(${i})">Approve ✅</button> <button class="p-btn danger-ghost" onclick="S.drafts.splice(${i},1);save();render()">Delete</button></div>`).join(''):'<div class="p-sub" style="margin-top:8px">No drafts — run the pipeline above.</div>'}
  </div>
  <div class="p-card" style="margin-top:14px"><div class="p-label">📊 Experiment — is curiosity compounding?</div>
    <div class="p-grid c4" style="margin-top:10px">
      <div><div class="p-label">Started</div><div class="stat-num">${m.started}</div></div>
      <div><div class="p-label">Completed</div><div class="stat-num">${m.completed}</div></div>
      <div><div class="p-label">Rabbit holes picked</div><div class="stat-num">${m.rhPicks}</div></div>
      <div><div class="p-label">Predictions made</div><div class="stat-num">${m.preds}</div></div>
    </div>
    <div class="p-grid c2" style="margin-top:10px">
      <div><div class="p-label">Longest learning chain</div><div class="p-sub" style="font-size:14px">${m.longest||'—'}</div>
        <div class="p-label" style="margin-top:8px">Most-picked next topics</div><div class="p-sub">${m.topTopics||'—'}</div></div>
      <div><div class="p-label">Abandoned / needs love</div><div class="p-sub">${m.abandoned||'Nothing abandoned yet 🎉'}</div>
        <div class="p-label" style="margin-top:8px">Recent events</div><div class="p-sub" style="font-size:12.5px">${m.feed||'—'}</div></div>
    </div>
    <div style="margin-top:10px"><button class="p-btn ghost" onclick="localStorage.removeItem('mlw_events');render();toast('Experiment log cleared 🧹')">Clear experiment log</button></div>
  </div>`;
}
async function runPipeline(){
  const url = (document.getElementById('lab-url')||{}).value||'';
  const titleHint = ((document.getElementById('lab-title')||{}).value||'').trim();
  if(!url.trim()){ toast('Paste a YouTube URL first 🔗'); return; }
  LAB = {running:true, log:[{stage:'start',detail:'Pipeline started…'}], draft:null, error:null, bankIx:0};
  render();
  const res = await PipelineService.run(url, {age:S.profile.age, titleHint:titleHint||undefined});
  LAB.running = false;
  if(!res.ok && !res.draft){ LAB.error = res.error||'Pipeline failed.'; LAB.log = res.log||[]; }
  else { LAB.log = res.log; LAB.draft = res.draft; if(!res.ok) LAB.error = 'Validation notes: '+(res.report.issues||[]).join(' | '); }
  save(); render();
}
function labDraftHTML(d){
  const all = MISSIONS.concat(S.customMissions||[]);
  return `<div style="border:2px solid #5b50e8;border-radius:16px;padding:14px;margin-top:12px">
    <div class="p-label">👁️ Parent preview — edit anything, or approve as-is <span class="prov">${esc(PROV_LABEL[d.provenance]||d.provenance)}</span></div>
    <div class="draft-field"><div class="p-label">Mission title</div><input class="p-input" value="${esc(d.title)}" oninput="LAB.draft.title=this.value"></div>
    <div class="draft-field"><div class="p-label">Video</div>
      <div class="yt-frame" style="max-width:420px"><iframe src="${ytEmbedUrl(d.media.youtubeId,{rel:0})}" title="preview" frameborder="0" allowfullscreen></iframe></div>
      <div class="p-sub">${esc(d.video.title)} · concepts: <b>${esc((d.concepts||[]).join(', ')||'general')}</b></div></div>
    <div class="draft-field"><div class="p-label">🔮 Prediction prompt</div><input class="p-input" value="${esc(d.predict.q)}" oninput="LAB.draft.predict.q=this.value"></div>
    <div class="p-label">Activities (${d.questions.length})</div>
    ${d.questions.map((q,i)=>`<div class="appr" style="margin-top:8px;flex-direction:column;align-items:stretch">
      <div style="display:flex;gap:8px;align-items:center"><span class="prov">${q.kind}</span><span class="prov">${esc(PROV_LABEL[q.sourceProvenance]||q.sourceProvenance||'demo')}</span>
      <span style="margin-left:auto;display:flex;gap:6px"><button class="p-btn ghost" style="padding:6px 10px" onclick="labQRegen(${i})">🔄 Regenerate</button><button class="p-btn danger-ghost" style="padding:6px 10px" onclick="LAB.draft.questions.splice(${i},1);render()">✕</button></span></div>
      <input class="p-input" style="margin-top:8px" value="${esc(q.q)}" oninput="LAB.draft.questions[${i}].q=this.value">
      ${(q.kind==='mc'||q.kind==='tf')?`<input class="p-input" style="margin-top:6px" value="${esc(q.options.join(' | '))}" oninput="labQOpts(${i},this.value)"><div class="p-sub">Options separated by | · correct index: <input class="p-input" style="width:60px;display:inline-block" type="number" min="0" value="${q.answer}" oninput="LAB.draft.questions[${i}].answer=+this.value||0"></div>`:''}
      ${q.kind==='short'?`<input class="p-input" style="margin-top:6px" value="${esc((q.keywords||[]).join(', '))}" oninput="LAB.draft.questions[${i}].keywords=this.value.split(',').map(s=>s.trim())"><div class="p-sub">Accepted keywords, comma-separated</div>`:''}
      ${q.sourceExcerpt?`<div class="src-box">📎 <b>${esc(q.sourceConcept||'source')}</b> — “${esc(q.sourceExcerpt)}”</div>`:''}
    </div>`).join('')}
    <div class="draft-field"><div class="p-label">🎨 Creative</div>
      <input class="p-input" value="${esc(d.creative.title)}" oninput="LAB.draft.creative.title=this.value" style="margin-bottom:6px">
      <textarea class="p-input" oninput="LAB.draft.creative.prompt=this.value">${esc(d.creative.prompt)}</textarea></div>
    <div class="draft-field"><div class="p-label">🕳️ Rabbit holes (pick up to 4)</div><div class="chipset">
      ${all.filter(x=>x.id!==d.id).slice(0,12).map(x=>`<button class="chip ${(d.rabbitHoles||[]).some(r=>r.to===x.id)?'on':''}" onclick="labToggleRH('${x.id}')">${x.emoji} ${esc(x.title.length>22?x.title.slice(0,22)+'…':x.title)}</button>`).join('')}
    </div></div>
    <div class="btn-row" style="margin-top:10px"><button class="p-btn green" onclick="labApprove()">Approve to Child ✅</button><button class="p-btn ghost" onclick="labSaveDraft()">Save draft later</button><button class="p-btn danger-ghost" onclick="LAB.draft=null;LAB.log=[];render()">Discard</button></div>
  </div>`;
}
function labQOpts(i,v){ LAB.draft.questions[i].options = v.split('|').map(s=>s.trim()).filter(Boolean); }
function labQRegen(i){
  const bank = LAB.draft.questionBank||QUESTION_BANK;
  LAB.bankIx = (LAB.bankIx+1)%bank.length;
  const fresh = JSON.parse(JSON.stringify(bank[LAB.bankIx]));
  LAB.draft.questions[i] = Object.assign({}, LAB.draft.questions[i], fresh);
  render(); toast('Question regenerated 🔄');
}
function labToggleRH(id){
  const rh = LAB.draft.rabbitHoles||(LAB.draft.rabbitHoles=[]);
  const ix = rh.findIndex(r=>r.to===id);
  if(ix>=0) rh.splice(ix,1);
  else { if(rh.length>=4){ toast('Max 4 rabbit holes 🕳️'); return; } const mm=getMission(id); rh.push({to:id, why:'Parent pick', bridge:mm?('Because '+mm.title+' connects.'):''}); }
  render();
}
function labSaveDraft(){
  if(!LAB.draft) return;
  S.drafts = S.drafts||[]; S.drafts.push(LAB.draft); LAB.draft=null; LAB.log=[];
  save(); render(); toast('Draft saved 📝');
}
function labApprove(){
  const d = LAB.draft; if(!d) return;
  if(!d.title.trim()){ toast('Give the mission a title first ✏️'); return; }
  if(!d.questions.length){ toast('Add at least one activity 🧩'); return; }
  S.customMissions = S.customMissions||[];
  S.customMissions.push(Object.assign({}, d, {id:'gen-'+Date.now()}));
  S.profile.generatedCount++;
  S.drafts = S.drafts||[];
  LAB.draft=null; LAB.log=[];
  save(); render(); toast('Mission approved! Send it from Missions 🎯'); S.parentTab='missions'; render();
}
function labApproveDraft(i){
  const d = (S.drafts||[])[i]; if(!d) return;
  S.customMissions = S.customMissions||[]; S.customMissions.push(d);
  S.drafts.splice(i,1); S.profile.generatedCount++;
  save(); render(); toast('Mission approved! ✅');
}
function labMetrics(ev){
  const c = t=>ev.filter(e=>e.t===t);
  const started = c('mission_started').length, completed = c('mission_completed').length;
  const rhPicks = c('rabbithole_selected').length, preds = c('prediction_done').length;
  const chains = (S.profile.stats&&S.profile.stats.chains)||[];
  const done = chains.filter(ch=>ch.missions.length>1).sort((a,b)=>b.missions.length-a.missions.length)[0];
  const longest = done? done.missions.map(id=>{const mm=getMission(id);return mm?missionShort(mm):id;}).join(' → ')+' ('+(done.missions.length-1)+' deep)' : '—';
  const topics = {};
  c('rabbithole_selected').forEach(e=>{ const mm=getMission(e.to); const k=mm?mm.theme:(e.to||'?'); topics[k]=(topics[k]||0)+1; });
  const topTopics = Object.entries(topics).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>k+' ×'+v).join(', ')||'—';
  const startedIds = [...new Set(c('mission_started').map(e=>e.mission))];
  const doneIds = new Set(c('mission_completed').map(e=>e.mission));
  const quits = {};
  c('mission_quit').forEach(e=>{ if(e.mission){ quits[e.mission]=e.stage||'early'; } });
  const abandoned = startedIds.filter(id=>!doneIds.has(id)).map(id=>{ const mm=getMission(id); return (mm?mm.title:id)+(quits[id]?' (left at: '+quits[id]+')':''); }).slice(0,3).join('; ')||'';
  const feed = ev.slice(-8).reverse().map(e=>`${e.t}${e.mission?' · '+e.mission:''}${e.to?' → '+e.to:''}`).join('<br>')||'—';
  return {started, completed, rate:started?completed/started:0, rhPicks, preds, longest, topTopics, abandoned, feed};
}
/* ---------- CONTENT TAB ---------- */
function pContent(){
  const p = S.profile;
  const mode = S.contentMode||'curated';
  return `<div class="p-h">✅ Content & approvals</div><div class="p-sub">You steer. Scout drives. ${esc(p.name)} just explores.</div>
  <div class="p-card" style="margin-top:14px"><div class="p-label">Approval mode</div>
    <div class="chipset" style="margin-top:10px">
      <button class="chip ${mode==='curated'?'on':''}" onclick="setContentMode('curated')">🛡️ Curated — platform chooses</button>
      <button class="chip ${mode==='approved'?'on':''}" onclick="setContentMode('approved')">👀 Parent-approved — you review</button>
      <button class="chip ${mode==='added'?'on':''}" onclick="setContentMode('added')">➕ Parent-added — paste videos</button>
    </div></div>
  <div class="p-card" style="margin-top:14px"><div class="p-label">📥 Approval queue</div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
    ${p.approvals.map(a=>`<div class="appr">
      <div style="width:92px;height:64px;border-radius:12px;background:${a.grad};display:flex;align-items:center;justify-content:center;font-size:36px;flex:none">${a.emoji}</div>
      <div style="flex:1"><b>${esc(a.title)}</b><div class="p-sub">${a.duration} · ${esc(a.reason)}</div>
      ${a.status!=='pending'?`<div class="p-sub" style="font-weight:800;color:${a.status==='approved'?'#16a34a':'#c43030'}">${a.status==='approved'?'✅ Approved':'⏭️ Skipped'}</div>`:''}</div>
      ${a.status==='pending'?`<div style="display:flex;gap:6px"><button class="p-btn green" onclick="reviewApproval('${a.id}',true)">Approve</button><button class="p-btn danger-ghost" onclick="reviewApproval('${a.id}',false)">Skip</button></div>`:''}
    </div>`).join('')}
    </div></div>
  <div class="p-card" style="margin-top:14px"><div class="p-label">🎬 Add a video → turn it into a mission</div>
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
      <input class="p-input" id="vid-url" placeholder="Paste a YouTube / video URL…" style="flex:1;min-width:220px">
      <input class="p-input" id="vid-title" placeholder="Video title (optional)" style="flex:1;min-width:160px">
      <button class="p-btn" onclick="generateFromVideo()">Turn into a mission ✨</button>
    </div>
    <div id="gen-status"></div>
    <div class="p-sub">Simulated generation pipeline: topic → questions → creative challenge → rewards → rabbit holes.</div></div>`;
}
function setContentMode(m){ S.contentMode=m; save(); render(); toast('Content mode: '+m); }
function reviewApproval(id,ok){
  const a = S.profile.approvals.find(x=>x.id===id);
  if(a){ a.status = ok?'approved':'skipped'; if(ok){ toast('Approved! Added to suggestions ✅'); } save(); render(); }
}
async function generateFromVideo(){
  const url = (document.getElementById('vid-url')||{}).value||'';
  const title = ((document.getElementById('vid-title')||{}).value||'').trim();
  const st = document.getElementById('gen-status');
  if(!url.trim()){ toast('Paste a video URL first 🔗'); return; }
  const parsed = parseYouTubeUrl(url);
  if(!parsed.ok){ if(st) st.innerHTML = `<div class="insight" style="margin-top:10px;background:#fff1f1;border-color:#f3c2c2">⚠️<span>${esc(parsed.error)}</span></div>`; else toast(parsed.error); return; }
  if(st) st.innerHTML = `<div class="gen-bar"><i style="width:35%"></i></div><div class="p-sub">🔍 Reading video… 🧠 Finding the big idea…</div>`;
  const res = await PipelineService.run(url, {age:S.profile.age, titleHint:title||undefined});
  LAB = {running:false, log:res.log||[], draft:res.draft||null, error:(!res.ok&&!res.draft)?(res.error||'Pipeline failed.'):null, bankIx:0};
  if(st) st.innerHTML = `<div class="stage-log" style="margin-top:10px">${(res.log||[]).map(l=>`▸ <b>${esc(l.stage)}</b> — ${esc(l.detail)}`).join('<br>')}</div>
    ${res.draft?`<div class="insight" style="margin-top:10px">✨<span><b>Draft ready: “${esc(res.draft.title)}”</b> <span class="prov">${esc(PROV_LABEL[res.draft.provenance]||'')}</span></span></div><button class="p-btn" style="margin-top:8px" onclick="setPTab('lab')">Review in the Lab 🧪</button>`:''}`;
  save();
  if(res.draft) toast('Mission drafted! Review it in the Lab 🧪');
}
/* ---------- PROGRESS TAB ---------- */
function pProgress(){
  const p = S.profile;
  const skills = Object.entries(p.skills).sort((a,b)=>b[1]-a[1]);
  return `<div class="p-h">📈 Learning progress</div><div class="p-sub">Plain-language insight — never report-card pressure.</div>
  <div class="p-grid c2" style="margin-top:14px">
    <div class="p-card"><div class="p-label">Skill garden 🌱</div>
      <div style="margin-top:10px">${skills.map(([k,v])=>`<div class="skill-row"><span class="nm">${GOAL_EMOJI[k]||'•'} ${k}</span><div class="bar"><i style="width:${v}%"></i></div><b>${v}</b></div>`).join('')}</div>
    </div>
    <div class="p-card"><div class="p-label">🕸️ Knowledge web — how curiosity connects</div>
      <div style="margin-top:8px">${knowledgeSVG()}</div>
      <div class="p-sub">Familiar → Adjacent → Novel. ${esc(p.name)}'s trail: <b>${esc(p.pathTrail.slice(-4).join(' → ')||'just beginning')}</b></div>
    </div>
  </div>
  <div class="p-card" style="margin-top:14px"><div class="p-label">🛤️ Seeded journey paths</div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">${JOURNEYS.map(j=>`
      <div><b>${j.emoji} ${j.name}</b><div class="journey" style="margin-top:6px">
      ${j.steps.map((s,i)=>{const m=getMission(s);const done=p.completedMissions.includes(s);
        return `${i>0?'<span class="arr">→</span>':''}<span class="jn ${done?'done':''}">${done?'✅ ':''}${m?esc(missionShort(m)):s}</span>`;}).join('')}
      </div></div>`).join('')}</div></div>
  <div class="p-card" style="margin-top:14px"><div class="p-label">📚 Mission history</div>
    ${p.completedMissions.length?`<table class="table" style="margin-top:8px"><tr><th>Mission</th><th>Skills</th><th>Reward</th></tr>${p.completedMissions.map(id=>{const m=getMission(id);return m?`<tr><td>${m.emoji} ${esc(m.title)}</td><td>${m.skills.join(', ')}</td><td>+${m.xp} XP · +${m.coins} 🪙</td></tr>`:'';}).join('')}</table>`:'<div class="p-sub" style="margin-top:8px">History appears here after the first mission.</div>'}
  </div>`;
}
function knowledgeSVG(){
  const p = S.profile;
  const nodes = [
    {l:'Minecraft', x:110, y:70, s:95, done:true},
    {l:'Bridges', x:230, y:55, s:80, done:p.completedMissions.includes('bridges')},
    {l:'Forces', x:330, y:80, s:55, done:false},
    {l:'Rome', x:420, y:60, s:40, done:p.completedMissions.includes('pompeii')},
    {l:'Jets', x:110, y:140, s:82, done:p.completedMissions.includes('jets')},
    {l:'Lift', x:230, y:150, s:60, done:false},
    {l:'Birds', x:340, y:145, s:35, done:false},
    {l:'Dinos', x:110, y:210, s:70, done:p.completedMissions.includes('dino')},
    {l:'Fossils', x:230, y:215, s:55, done:false},
    {l:'Volcanoes', x:340, y:210, s:61, done:p.completedMissions.includes('volcano')},
  ];
  const edges = [[0,1],[1,2],[2,3],[4,5],[5,6],[7,8],[8,9],[1,5],[9,3]];
  return `<svg viewBox="0 0 470 260" style="width:100%;background:#f4f2ff;border-radius:14px">
    ${edges.map(([a,b])=>`<line x1="${nodes[a].x}" y1="${nodes[a].y}" x2="${nodes[b].x}" y2="${nodes[b].y}" stroke="#b9aef5" stroke-width="2.5" stroke-dasharray="5 4"/>`).join('')}
    ${nodes.map(n=>`<g><circle cx="${n.x}" cy="${n.y}" r="${10+n.s/9}" fill="${n.done?'#16a34a':'#fff'}" stroke="#5b50e8" stroke-width="3"/><text x="${n.x}" y="${n.y+4}" text-anchor="middle" font-size="11" font-weight="800" fill="${n.done?'#fff':'#191932'}">${n.done?'✓':n.s}</text><text x="${n.x}" y="${n.y+26+n.s/9}" text-anchor="middle" font-size="11" font-weight="700" fill="#3c3f52">${n.l}</text></g>`).join('')}
  </svg>`;
}

/* ---------- SETTINGS ---------- */
function pSettings(){
  return `<div class="p-h">⚙️ Settings</div><div class="p-sub">Safety, modes, and demo controls.</div>
  <div class="p-grid c2" style="margin-top:14px">
    <div class="p-card"><div class="p-label">🛡️ Safety boundaries (always on)</div>
      <div class="p-sub" style="margin-top:8px;line-height:2">
      ✅ No child-to-child chat · ✅ No public profiles<br>✅ No social feed or strangers · ✅ No open web browsing in Child mode<br>✅ Scout only talks about learning · ✅ No streak punishment · ✅ You approve content</div>
    </div>
    <div class="p-card"><div class="p-label">🎛️ Demo controls</div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <button class="p-btn ghost" onclick="location.reload()">🔄 Reload app</button>
        <button class="p-btn danger-ghost" onclick="resetDemo()">🧹 Reset demo data</button>
      </div>
      <div class="p-sub" style="margin-top:8px">Reset restores Jackson's seeded profile and clears progress (localStorage).</div>
    </div>
  </div>
  <div class="p-card" style="margin-top:14px"><div class="p-label">📲 PWA status (temporary diagnostic)</div>
    <div id="pwa-diag"><div class="p-sub">Gathering device signals…</div></div>
    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="p-btn ghost" onclick="copyPwaDiag()">📋 Copy PWA diagnostics</button>
      <button class="p-btn ghost" onclick="pwaDiag(true)">🔄 Refresh signals</button>
    </div>
  </div>
  <div class="p-card" style="margin-top:14px"><div class="p-label">📖 Mission library preview</div>
    <div class="p-grid c4" style="margin-top:10px">${LIBRARY.map(l=>`<div class="appr"><div style="font-size:30px">${l.emoji}</div><div><b style="font-size:13px">${l.title}</b><div class="p-sub">${l.subject} · ${l.age}</div></div></div>`).join('')}</div>
  </div>`;
}
function resetDemo(){
  confirmModal('Reset the demo?', 'All progress, rewards, and parent settings return to the fresh Jackson seed.', 'Keep Everything', 'Reset Demo', ()=>{
    localStorage.removeItem('mlw_v1'); location.reload();
  });
}
/* ----- Parent-only PWA diagnostics (no fake install UI) ----- */
let __pwaDiagCache = null;
async function pwaDiag(refresh){
  const el = document.getElementById('pwa-diag');
  const set = (html)=>{ if(el) el.innerHTML = html; };
  if(__pwaDiagCache && !refresh){ set(__pwaDiagCache); return; }
  set('<div class="p-sub">Gathering device signals…</div>');
  try{
  const d = {};
  try{ d.standalone = window.matchMedia('(display-mode: standalone)').matches; }catch(e){ d.standalone = 'unknown'; }
  d.bipThisSession = !!window.__mlwBIPFired;
  d.appinstalled = (getEvents().some(function(e){return e.t==='appinstalled';}));
  d.swSupported = ('serviceWorker' in navigator);
  d.onLine = (typeof navigator.onLine==='boolean') ? navigator.onLine : 'unknown';
  d.origin = location.origin; d.url = location.href;
  d.ua = navigator.userAgent || 'unknown';
  const m = (d.ua.match(/Chrome\/([\d.]+)/)||[])[1]; d.chrome = m || 'not-detected';
  try{
    const link = document.querySelector('link[rel="manifest"]');
    d.manifestUrl = link ? new URL(link.getAttribute('href'), location.href).toString() : '(none)';
  }catch(e){ d.manifestUrl = '(error)'; }
  if(d.manifestUrl && d.manifestUrl.indexOf('http')===0){
    try{
      const r = await fetch(d.manifestUrl, {cache:'no-store'});
      d.manifestFetch = r.status;
      if(r.ok){ const mj = await r.json();
        d.mName = mj.name; d.mId = mj.id; d.mStart = mj.start_url; d.mScope = mj.scope; d.mDisplay = mj.display;
      }
    }catch(e){ d.manifestFetch = 'fetch-failed'; }
  } else d.manifestFetch = 'n/a';
  if(d.swSupported){
    try{
      const reg = await navigator.serviceWorker.getRegistration();
      d.swRegistered = !!reg;
      d.swScope = reg ? reg.scope : '—';
      d.swActive = !!(reg && reg.active);
      d.swScript = (reg && reg.active) ? reg.active.scriptURL : '—';
      d.swControlling = !!navigator.serviceWorker.controller;
    }catch(e){ d.swRegistered = 'error'; }
  } else { d.swRegistered = 'n/a'; }
  try{
    if('getInstalledRelatedApps' in navigator){
      const apps = await navigator.getInstalledRelatedApps();
      d.relatedApps = apps.length ? apps.map(function(a){return a.id||a.platform;}).join(', ') : 'none reported';
    } else d.relatedApps = 'API unsupported here';
  }catch(e){ d.relatedApps = 'error'; }
  d.installedBelief = (d.standalone===true) ? 'YES (standalone display-mode)' : (d.relatedApps!=='none reported' && d.relatedApps!=='API unsupported here' ? 'maybe ('+d.relatedApps+')' : 'NO signal');
  const row = function(k,v){ return '<div class="kv"><span>'+k+'</span><b>'+String(v)+'</b></div>'; };
  __pwaDiagCache =
    row('Running standalone', d.standalone?'YES':'NO') +
    row('Install prompt available', d.bipThisSession?'YES — button is in the kid top bar':'NO') +
    row('beforeinstallprompt this session', d.bipThisSession?'YES':'NO') +
    row('appinstalled event', d.appinstalled?'YES':'NO') +
    row('SW supported', d.swSupported?'YES':'NO') +
    row('SW registered', d.swRegistered===true?'YES':d.swRegistered) +
    row('SW controlling page', d.swControlling?'YES':'NO') +
    row('SW scope', d.swScope||'—') +
    row('SW script', (d.swScript||'—').split('/').slice(-1)[0]||'—') +
    row('Manifest URL', d.manifestUrl||'—') +
    row('Manifest fetch', d.manifestFetch) +
    row('Manifest name', d.mName||'—') +
    row('Manifest id', d.mId||'—') +
    row('Manifest start_url', d.mStart||'—') +
    row('Manifest scope', d.mScope||'—') +
    row('Display mode', d.mDisplay||'—') +
    row('Origin', d.origin) +
    row('Online', d.onLine?'YES':'NO') +
    row('Chrome version', d.chrome) +
    row('Related apps', d.relatedApps) +
    row('Believes installed', d.installedBelief) +
    row('Standalone matches', (d.standalone===true)?'YES — installed':'NO — browser tab');
  window.__pwaDiagData = d;
  set(__pwaDiagCache);
  }catch(err){ set('<div class="insight" style="background:#fff1f1;border-color:#f3c2c2">⚠️<span>Diagnostics hit a snag ('+esc(String((err&&err.message)||err))+'). Tap Refresh signals to retry.</span></div>'); }
}
function copyPwaDiag(){
  const d = window.__pwaDiagData || {};
  const lines = ['LEARNING WORLD PWA DIAG', 'url: '+(d.url||location.href), 'origin: '+(d.origin||location.origin),
    'chrome: '+(d.chrome||'?'), 'standalone: '+d.standalone, 'bipThisSession: '+d.bipThisSession,
    'appinstalled: '+d.appinstalled, 'swRegistered: '+d.swRegistered, 'swControlling: '+d.swControlling,
    'swScope: '+(d.swScope||''), 'manifest: '+(d.manifestUrl||'')+' -> '+d.manifestFetch,
    'manifestId: '+(d.mId||''), 'startUrl: '+(d.mStart||''), 'scope: '+(d.mScope||''),
    'relatedApps: '+(d.relatedApps||''), 'online: '+d.onLine];
  const txt = lines.join('\n');
  const done = function(ok){ toast(ok?'Diagnostics copied 📋':'Copy failed — screenshot instead'); };
  try{
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function(){done(true);},function(){done(false);});
    else {
      const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
      let ok = false; try{ ok = document.execCommand('copy'); }catch(e){}
      ta.remove(); done(ok);
    }
  }catch(e){ done(false); }
}
