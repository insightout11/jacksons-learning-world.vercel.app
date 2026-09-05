/* ================= MY LEARNING WORLD — CORE APP ================= */
let S = null, R = null, OB = null;

function freshState(){
  return { onboarded:false, mode:'child', childTab:'world', parentTab:'overview',
    contentMode:'curated', profile:defaultProfile(), customMissions:[],
    unlockedMissions:['volcano','jets','bridges','dino','skyscraper','pompeii','islands','mars','sharks','car','aqueducts','mathbattle'],
    collTab:'collect', mFilter:'all' };
}
function load(){
  try{ const raw = localStorage.getItem('mlw_v1'); if(raw){ const s=JSON.parse(raw); if(s&&s.profile) return s; } }catch(e){}
  return freshState();
}
function save(){ try{ localStorage.setItem('mlw_v1', JSON.stringify(S)); }catch(e){} }
function levelOf(xp){ return Math.floor(xp/150)+1; }
function getMission(id){ return MISSIONS.concat(S.customMissions||[]).find(m=>m.id===id); }
function zoneName(z){ const zn = ZONES.find(z2=>z2.id===z); return zn?zn.name:z; }
function missionOpen(m){
  if(!m) return false;
  if(S.profile.completedMissions.includes(m.id)) return true;
  if((S.unlockedMissions||[]).includes(m.id) && (m.lockedByDefault ? S.profile.completedMissions.includes('volcano') : true)) return true;
  if(S.profile.unlockedZones.includes(m.zone)) return !m.lockedByDefault || S.profile.completedMissions.includes('volcano');
  return false;
}

/* ---------- Recommendation: Familiar → Adjacent → Novel ---------- */
function kidRecs(){
  const p = S.profile;
  const all = MISSIONS.concat(S.customMissions||[]);
  const last = p.completedMissions[p.completedMissions.length-1];
  const lastM = last?getMission(last):null;
  const scored = all.map(m=>{
    if(p.completedMissions.includes(m.id)) return null;
    let fam = 30;
    (m.tags||[]).forEach(t=>{ if(p.interests[t]!=null) fam=Math.max(fam,p.interests[t]); });
    let adj = 20;
    if(lastM){
      const sharedJourney = JOURNEYS.some(j=>j.steps.includes(lastM.id)&&j.steps.includes(m.id));
      if(sharedJourney) adj = 85;
      else if((m.tags||[]).some(t=>(lastM.tags||[]).includes(t))) adj = 60;
    }
    const novel = 100 - fam;
    const goalHit = (m.skills||[]).filter(s=>p.goals.includes(s)).length;
    let score = 0.7*fam + 0.2*adj + 0.1*novel + goalHit*6 + (p.prefs.balance>60?goalHit*3:0);
    let label = fam>=70?'💜 Familiar favorite':(adj>=60?'🌉 Next step':'✨ Something new');
    if(!missionOpen(m)) score -= 60;
    return {m, score, label, fam};
  }).filter(Boolean).sort((a,b)=>b.score-a.score);
  const sent = (p.sentMissions||[]).map(s=>getMission(s.missionId)).filter(m=>m&&!p.completedMissions.includes(m.id));
  const out = [];
  sent.forEach(m=>out.push({id:m.id,title:m.title,emoji:m.emoji,duration:m.duration,xp:m.xp,recLabel:'💌 From Dad',sent:true}));
  scored.slice(0,6).forEach(s=>{ if(!out.find(o=>o.id===s.m.id)) out.push({id:s.m.id,title:s.m.title,emoji:s.m.emoji,duration:s.m.duration,xp:s.m.xp,recLabel:s.label}); });
  return out;
}

/* ================= RENDER ROOT ================= */
const SESSION_ID = 's'+Date.now().toString(36);
function logEvent(type, data){
  try{
    const key = 'mlw_events';
    let arr = [];
    try{ arr = JSON.parse(localStorage.getItem(key)||'[]'); }catch(e){ arr = []; }
    arr.push(Object.assign({t:type, at:Date.now(), session:SESSION_ID, child:S?S.profile.name:'?'}, data||{}));
    while(arr.length>600) arr.shift();
    localStorage.setItem(key, JSON.stringify(arr));
  }catch(e){}
}
function getEvents(){ try{ return JSON.parse(localStorage.getItem('mlw_events')||'[]'); }catch(e){ return []; } }
function render(){
  const app = document.getElementById('app');
  if(window.__mlwDiag && window.__mlwDiag.length && S){ const q = window.__mlwDiag.splice(0); q.forEach(function(e){ logEvent(e.t,{}); }); }
  if(S && !window.__mlwStdLogged && standaloneMode()){ window.__mlwStdLogged = true; logEvent('standalone_launch',{}); }
  if(!S.onboarded){ app.innerHTML = onboardHTML(); const b=document.getElementById('ob-build'); if(b) runBuildAnim(); return; }
  if(S.mode==='parent'){ app.innerHTML = topbarMini() + parentHTML(); schedulePwaDiag(); return; }
  let screen = '';
  if(R) screen = playerHTML();
  else if(S.childTab==='world') screen = worldHTML();
  else if(S.childTab==='missions') screen = missionsHTML();
  else if(S.childTab==='collection') screen = collectionHTML();
  else screen = profileHTML();
  app.innerHTML = topbar() + screen + (R?'':bottomnav());
}
function schedulePwaDiag(){
  if(!(S&&S.mode==='parent'&&S.parentTab==='settings')) return;
  __pwaDiagCache=null;
  setTimeout(function(){ try{ pwaDiag(); }catch(e){} },60);
  setTimeout(function(){ try{ var el=document.getElementById('pwa-diag'); if(el && /Gathering/.test(el.innerText||'')) pwaDiag(true); }catch(e){} },2500);
}
function standaloneMode(){ try{ return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }catch(e){ return false; } }
function showInstallBtn(){ return !!(window.__mlwBIP && !standaloneMode()); }
function topbar(){
  const p = S.profile;
  return `<div class="topbar">
    <div class="logo"><div class="logo-globe">🌍</div><span>My Learning World</span></div>
    <span class="pill xp">⭐ ${p.xp} XP · Lv ${levelOf(p.xp)}</span>
    <span class="pill coins">🪙 ${p.coins}</span>
    <span class="pill streak">🔥 ${p.streak} days</span>
    ${showInstallBtn()?'<button class="btn green" id="install-btn" style="padding:8px 14px;font-size:14px" onclick="installApp()">📲 Install</button>':''}
    <div class="mode-switch"><button class="on">🧒 Kid</button><button onclick="gateToParent()">🔒 Grown-ups</button></div>
  </div>`;
}
/* Temporary diagnostic install flow (removed once device install is confirmed). */
function installApp(){
  logEvent('install_clicked',{});
  const ev = window.__mlwBIP;
  if(!ev){ toast('Install isn’t available right now.'); return; }
  logEvent('prompt_invoked',{});
  try{ const r = ev.prompt(); if(r && r.catch) r.catch(()=>{}); }catch(e){}
  if(ev.userChoice && ev.userChoice.then){
    ev.userChoice.then(function(ch){
      logEvent('install_choice',{outcome:(ch&&ch.outcome)||'unknown'});
      if(ch && ch.outcome === 'accepted') window.__mlwBIP = null;
      render();
    }).catch(function(){});
  } else { setTimeout(function(){ render(); }, 1200); }
}
window.__mlwBIPShow = function(){ if(window.render && typeof S !== 'undefined' && S){ logEvent('install_shown',{}); render(); } };
function topbarMini(){
  return `<div class="topbar" style="justify-content:flex-end">
    <span class="p-label" style="margin-right:auto;font-family:var(--parent-font)">🔒 Grown-ups area · kid mode is one tap away</span>
    <div class="mode-switch" style="margin-left:0"><button onclick="setMode('child')">🧒 Kid</button><button class="on">🔒 Grown-ups</button></div>
  </div><div style="height:12px"></div>`;
}
function bottomnav(){
  const t = S.childTab;
  return `<div class="bottomnav">
    <button class="${t==='world'?'on':''}" onclick="setCTab('world')"><span class="ico">🗺️</span>World</button>
    <button class="${t==='missions'?'on':''}" onclick="setCTab('missions')"><span class="ico">🎯</span>Missions</button>
    <button class="${t==='collection'?'on':''}" onclick="setCTab('collection')"><span class="ico">🎒</span>Collection</button>
    <button class="${t==='profile'?'on':''}" onclick="setCTab('profile')"><span class="ico">🦊</span>Me</button>
  </div>`;
}
function setMode(m){ S.mode=m; if(m==='child'&&!R){} save(); render(); window.scrollTo({top:0}); }
function setCTab(t){ S.childTab=t; R=null; save(); render(); window.scrollTo({top:0}); }
function gateToParent(){
  const a = 3+Math.floor(Math.random()*6), b = 2+Math.floor(Math.random()*5);
  showOverlay(`<div class="modal" style="text-align:center"><div style="font-size:50px">🔒</div>
    <h2>Grown-ups only!</h2><p style="font-weight:700;color:var(--ink-soft)">Quick check: what is ${a} + ${b}?</p>
    <div style="display:flex;gap:8px;justify-content:center;margin:12px 0">
      <input id="gate-in" class="short-in" style="max-width:140px;text-align:center" inputmode="numeric" placeholder="?">
      <button class="btn green" onclick="gateCheck(${a+b})">Go →</button>
    </div>
    <button class="btn ghost" onclick="closeOverlay()">Back to play</button></div>`);
  setTimeout(()=>{const i=document.getElementById('gate-in'); if(i) i.focus();},100);
}
function gateCheck(ans){
  const v = parseInt((document.getElementById('gate-in')||{}).value,10);
  if(v===ans){ closeOverlay(); setMode('parent'); } else toast('Hmm, try again! 🧮');
}

/* ================= ONBOARDING ================= */
function onboardHTML(){
  if(!OB) OB = {step:0, name:'Jackson', age:6, avatar:'🦊', interests:['Minecraft','Cars','Fighter Jets','Engineering','Dinosaurs'], goals:['Math','Science','History','Geography','Reading','Creativity'], balance:55, challenge:60, independence:70};
  const steps = ['Welcome','Basics','Obsessions','Goals','Style','Building'];
  let body = '';
  if(OB.step===0) body = `
    <div class="onboard-hero" style="background:linear-gradient(135deg,#7c5cff,#00c2a8)"><div style="font-size:70px">🌍</div>
      <h1 style="font-size:32px">Build a learning world around what your child already loves.</h1>
      <p style="font-weight:700;opacity:.92;margin-top:8px">Missions · games · rabbit holes · a world that grows</p></div>
    <div class="onboard-body"><button class="btn big" style="width:100%" onclick="obNext()">Start Building ✨</button></div>`;
  else if(OB.step===1) body = `
    <div class="onboard-hero" style="background:linear-gradient(135deg,#ff8a3d,#ff5d8f)"><div style="font-size:60px">🧒</div><h1>Who is exploring?</h1></div>
    <div class="onboard-body">
      <div class="p-label">Name</div><input id="ob-name" class="p-input" value="${esc(OB.name)}" style="margin:6px 0 12px">
      <div class="p-label">Age</div><div class="chipset" style="margin:6px 0 12px">${[5,6,7,8,9,10].map(a=>`<button class="chip ${OB.age===a?'on':''}" onclick="OB.age=${a};render()">${a}</button>`).join('')}</div>
      <div class="p-label">Avatar</div><div class="avatar-pick" style="margin-top:6px">${['🦊','🐯','🐼','🦁','🐸','🦄','🐲','🤖'].map(a=>`<button class="${OB.avatar===a?'on':''}" onclick="OB.avatar='${a}';render()">${a}</button>`).join('')}</div>
      <div class="btn-row" style="margin-top:16px"><button class="btn ghost" onclick="OB.step=0;render()">← Back</button><button class="btn" onclick="obSaveBasics()">Next →</button></div>
    </div>`;
  else if(OB.step===2) body = `
    <div class="onboard-hero" style="background:linear-gradient(135deg,#7c5cff,#2fb9ff)"><div style="font-size:60px">❤️</div><h1>What are they obsessed with?</h1><p style="font-weight:700;opacity:.9">Pick at least 3 — this powers everything.</p></div>
    <div class="onboard-body"><div class="chipset">${INTEREST_POOL.map(i=>`<button class="chip ${OB.interests.includes(i)?'on':''}" onclick="obToggle('interests','${i}')"><span class="e">${INTEREST_EMOJI[i]}</span>${i}</button>`).join('')}</div>
      <div class="btn-row" style="margin-top:16px"><button class="btn ghost" onclick="OB.step=1;render()">← Back</button><button class="btn" onclick="obNext()">Next →</button></div></div>`;
  else if(OB.step===3) body = `
    <div class="onboard-hero" style="background:linear-gradient(135deg,#00c2a8,#2fb9ff)"><div style="font-size:60px">🎯</div><h1>What should they discover more of?</h1></div>
    <div class="onboard-body"><div class="chipset">${GOAL_POOL.map(g=>`<button class="chip ${OB.goals.includes(g)?'on':''}" onclick="obToggle('goals','${g}')"><span class="e">${GOAL_EMOJI[g]}</span>${g}</button>`).join('')}</div>
      <div class="btn-row" style="margin-top:16px"><button class="btn ghost" onclick="OB.step=2;render()">← Back</button><button class="btn" onclick="obNext()">Next →</button></div></div>`;
  else if(OB.step===4) body = `
    <div class="onboard-hero" style="background:linear-gradient(135deg,#a855f7,#ec4899)"><div style="font-size:60px">🎛️</div><h1>How should it feel?</h1></div>
    <div class="onboard-body" style="display:grid;gap:14px;font-family:var(--parent-font)">
      ${obSlider('balance','Learning balance','More fun 🎮','More academic 🎓')}
      ${obSlider('challenge','Challenge','Relaxed 🌿','Challenging 🧗')}
      ${obSlider('independence','Independence','Guided 🧭','Child chooses 🗺️')}
      <div class="btn-row"><button class="btn ghost" onclick="OB.step=3;render()">← Back</button><button class="btn orange big" onclick="OB.step=5;render()" style="flex:1">Build ${esc(OB.name)}'s World ✨</button></div>
    </div>`;
  else body = `
    <div class="build-anim" id="ob-build"><div class="build-emoji">🌍</div>
      <h2 id="build-txt">Building ${esc(OB.name)}'s World…</h2>
      <div class="gen-bar" style="max-width:340px;margin:14px auto"><i id="build-fill"></i></div>
      <div class="p-sub" id="build-sub" style="font-family:var(--parent-font);font-weight:600;color:var(--ink-soft)">Planting Dino Valley…</div></div>`;
  return `<div class="screen"><div class="onboard">${body}
    ${OB.step<5?`<div class="dots">${[0,1,2,3,4].map(i=>`<i class="${OB.step===i?'on':''}"></i>`).join('')}</div>`:''}
  </div></div>`;
}
function obSlider(k,l,lo,hi){ return `<div><div style="display:flex;justify-content:space-between;font-size:13.5px"><b>${l}</b><b id="ob-${k}" style="color:#5b50e8">${OB[k]}%</b></div><input type="range" min="0" max="100" value="${OB[k]}" oninput="OB.${k}=+this.value;document.getElementById('ob-${k}').textContent=this.value+'%'"><div class="slider-row"><span>${lo}</span><span>${hi}</span></div></div>`; }
function obNext(){ if(OB.step===2&&OB.interests.length<3){ toast('Pick at least 3 obsessions ❤️'); return; } OB.step++; save(); render(); }
function obSaveBasics(){ const n=document.getElementById('ob-name'); if(n&&n.value.trim()) OB.name=n.value.trim(); OB.step=2; render(); }
function obToggle(k,v){ const a=OB[k]; const i=a.indexOf(v); i>=0?a.splice(i,1):a.push(v); render(); }
function runBuildAnim(){
  const msgs = ['Planting Dino Valley…','Raising Engineering Canyon…','Fueling the Space Port…','Waking Scout…','Hiding surprises…'];
  let i = 0; const fill = document.getElementById('build-fill');
  const tick = ()=>{
    i++;
    if(!document.getElementById('build-fill')) return;
    document.getElementById('build-fill').style.width = (i/msgs.length*100)+'%';
    if(i<msgs.length){ document.getElementById('build-sub').textContent = msgs[i]; setTimeout(tick, 650); }
    else setTimeout(finishOnboard, 700);
  };
  setTimeout(tick, 650);
}
function finishOnboard(){
  if(!OB) return;
  const p = defaultProfile();
  p.name = OB.name||'Jackson'; p.age = OB.age;
  p.avatar = OB.avatar; p.interestList = [...OB.interests]; p.goals = [...OB.goals];
  p.prefs = {balance:OB.balance, challenge:OB.challenge, independence:OB.independence};
  p.interests = {}; OB.interests.forEach((n,i)=>p.interests[n]=95-i*5);
  ['Space','Animals','Drawing','Sports','Machines','Oceans','Mysteries','How Things Work','Strange Places'].forEach(n=>{ if(p.interests[n]==null) p.interests[n]=25; });
  S.profile = p; S.onboarded = true; S.mode='child'; S.childTab='world'; OB=null; save();
  showOverlay(`<div class="modal" style="text-align:center"><div style="font-size:70px">🌍✨</div>
    <h2>Your world just got bigger.</h2><p style="font-weight:700;color:var(--ink-soft)">Scout is waiting inside…</p>
    <button class="btn big" onclick="closeOverlay();render()">Enter the World 🗺️</button></div>`);
  confettiBurst(80); render();
}

/* ================= CHILD: WORLD ================= */
function scoutRec(){ const recs = kidRecs(); return recs[0]; }
function worldHTML(){
  const p = S.profile;
  const rec = scoutRec();
  const recM = rec?getMission(rec.id):null;
  const sent = (p.sentMissions||[]).map(s=>getMission(s.missionId)).filter(m=>m&&!p.completedMissions.includes(m.id));
  return `<div class="screen">
    ${sent.length?`<div class="card from-dad" style="margin-bottom:12px;display:flex;gap:12px;align-items:center;cursor:pointer" onclick="openMission('${sent[0].id}')">
      <div style="font-size:44px">💌</div>
      <div><div style="font-family:var(--child-font);font-size:18px">Dad sent you a mission!</div>
      <div style="font-weight:700;color:var(--ink-soft);font-size:14px">${esc(sent[0].title)} — tap to open 🎯</div></div></div>`:''}
    <div class="scout-bar"><div class="scout-face">🦊</div>
      <div class="scout-bubble"><span class="scout-name">Scout · your guide</span><br>
      ${recM?`${hiName()}! ${scoutTeaser(recM)}<div class="btn-row" style="margin-top:10px">
        <button class="btn" onclick="openMission('${recM.id}')">▶ ${rec.sent?'Open Dad’s Mission':'Start: '+esc(shortTitle(recM.title))}</button>
        <button class="btn ghost" onclick="setCTab('missions')">All missions</button></div>`
      :`Amazing — you finished EVERYTHING! Scout is doing cartwheels. 🛒 Check back soon for new lands!`}</div>
    </div>
    <div class="world-map">${worldSVG()}</div>
    <div class="zone-card-row">
      ${ZONES.map(z=>{const open=p.unlockedZones.includes(z.id);const count=MISSIONS.filter(m=>m.zone===z.id&&p.completedMissions.includes(m.id)).length;
        return `<div class="zone-chip ${open?'open':'locked'}" ${open?`onclick="zoneTap('${z.id}')"`:''}><div class="ze">${open?z.emoji:'🔒'}</div>${z.name}<br><small>${open?count+' explorer stars ⭐':'Locked — find a path!'}</small></div>`;}).join('')}
    </div>
    <div class="section-title">⚡ Continue exploring</div>
    <div class="m-grid">${kidRecs().slice(0,4).map(r=>missionCard(r.id)).join('')}</div>
    <div class="section-title">🛤️ Your curiosity trails</div>
    <div class="card">${JOURNEYS.map(j=>{const done=j.steps.filter(s=>p.completedMissions.includes(s)).length;
      return `<div style="margin:8px 0"><b>${j.emoji} ${j.name}</b> <small style="color:var(--ink-soft);font-weight:800">${done}/${j.steps.length}</small>
      <div class="journey" style="margin-top:6px">${j.steps.map((s,i)=>{const m=getMission(s);const d=p.completedMissions.includes(s);
        return `${i>0?'<span class="arr" style="color:var(--ink-soft)">→</span>':''}<span class="jn ${d?'done':''}" style="${d?'':'background:#f4f1ff'}">${d?'✅ ':''}${m?esc(missionShort(m)):s}</span>`;}).join('')}</div></div>`;}).join('')}</div>
  </div>`;
}
function hiName(){ const h=new Date().getHours(); return (h<12?'Good morning':h<18?'Good afternoon':'Good evening')+', '+esc(S.profile.name); }
const SHORTS={volcano:'🌋 Volcanoes',jets:'🛩️ Fighter Jets',bridges:'🌉 Strong Bridges',dino:'🦕 Dino Mystery',skyscraper:'🏙️ Skyscrapers',pompeii:'🏛️ Pompeii',islands:'🏝️ Islands',mars:'🔴 Mars Base',sharks:'🦈 Sharks',car:'🏎️ Car Engines',aqueducts:'🏺 Aqueducts',mathbattle:'⚔️ Mob Battle',supervolcano:'💥 Supervolcanoes',fossils:'🦴 Fossils',earthcore:'🌍 Earth’s Core',birds:'🐦 Birds',forces:'🧲 Forces'};
function missionShort(m){ return SHORTS[m.id]||shortTitle(m.title); }
function shortTitle(t){ return t.replace(/^Why (Do|Did|Don't) /,'').replace(/^How (Do|Did|Does) /,'').replace(/^Can You /,'').replace(/^What Was /,'').replace(/\?$/,''); }
function scoutTeaser(m){
  const lines = {
    volcano:`You just love big forces — I found a mountain that <b>explodes</b>. “${esc(m.title)}” — steam, lava, the works!`,
    jets:`Strap in! “${esc(m.title)}” — the invisible push that holds up 10 cars of metal.`,
    bridges:`I dare you: “${esc(m.title)}” — triangles vs arches. Loser holds the toy cars. 😏`,
    dino:`Psst… “${esc(m.title)}” — I found 66-million-year-old footprints. Follow me. 🦶`,
    pompeii:`${esc(S.profile.name)}! I found something strange nearby… an entire Roman city buried by a volcano. “${esc(m.title)}” — investigate?`,
    mars:`No air. Pink skies. A volcano 3x Everest. “${esc(m.title)}” — pack your imagination.`,
    sharks:`Older than dinosaurs, teeth like a conveyor belt… “${esc(m.title)}”!`,
    car:`Tiny explosions, 100 times a second. “${esc(m.title)}” — vroom awaits.`,
    skyscraper:`50 houses stacked high — and it DOESN'T fall. “${esc(m.title)}”!`,
    aqueducts:`Romans moved rivers with NO pumps. “${esc(m.title)}” — gravity magic!`,
    islands:`Fire built paradise. “${esc(m.title)}” — volcanoes to beaches!`,
    mathbattle:`Monsters stole the diamonds! “${esc(m.title)}” — your sword is MATH. ⚔️`,
  };
  return lines[m.id]||`I found something perfect: “<b>${esc(m.title)}</b>” — trust me, explorer!`;
}
const EDGES = [['home','minecraft'],['home','dino'],['home','engineering'],['home','space'],['minecraft','engineering'],['dino','earth'],['earth','ocean'],['engineering','history'],['earth','history'],['space','engineering'],['dino','minecraft']];
function worldSVG(){
  const p = S.profile;
  const byId = {}; ZONES.forEach(z=>byId[z.id]=z);
  const edgeSvg = EDGES.map(([a,b])=>{
    const A=byId[a],B=byId[b];
    const open = p.unlockedZones.includes(a)&&p.unlockedZones.includes(b);
    const mx=(A.x+B.x)/2, my=(A.y+B.y)/2-40;
    return `<path d="M${A.x},${A.y} Q${mx},${my} ${B.x},${B.y}" fill="none" stroke="${open?'#ffd76a':'rgba(255,255,255,.22)'}" stroke-width="${open?7:4}" stroke-linecap="round" ${open?'class="path-flow"':''} stroke-dasharray="${open?'8 8':'4 8'}" opacity="${open?.95:.5}"/>`;
  }).join('');
  const rec = scoutRec(); const recM = rec?getMission(rec.id):null;
  const items = p.worldItems.slice(0,10);
  const itemSvg = items.map((w,i)=>{
    const a=(i/Math.max(1,items.length))*Math.PI*2 - Math.PI/2;
    const x=Math.round(400+Math.cos(a)*108), y=Math.round(330+Math.sin(a)*82);
    return `<g class="scout-float" style="animation-delay:${(i*0.25).toFixed(2)}s"><title>${esc(w.name)}</title><circle cx="${x}" cy="${y}" r="17" fill="rgba(255,255,255,.92)" stroke="#ffbf2e" stroke-width="2.5"/><text x="${x}" y="${y+7}" text-anchor="middle" font-size="19">${w.emoji}</text></g>`;
  }).join('');
  const nodes = ZONES.map(z=>{
    const open = p.unlockedZones.includes(z.id);
    const isRec = recM && recM.zone===z.id && open;
    const zoneMissions = MISSIONS.concat(S.customMissions||[]).filter(m=>m.zone===z.id);
    const hasSent = zoneMissions.some(m=>(p.sentMissions||[]).some(s=>s.missionId===m.id)&&!p.completedMissions.includes(m.id));
    const done = zoneMissions.filter(m=>p.completedMissions.includes(m.id)).length;
    return `<g class="zone-node ${open?'':'locked'}" ${open?`onclick="zoneTap('${z.id}')"`:''}>
      ${isRec||hasSent?`<circle class="node-glow" cx="${z.x}" cy="${z.y}" r="62" fill="none" stroke="#ffbf2e" stroke-width="5"/>`:''}
      ${open?`<circle cx="${z.x}" cy="${z.y}" r="46" fill="rgba(255,255,255,.25)"/><circle cx="${z.x}" cy="${z.y}" r="38" fill="rgba(20,10,50,.45)" stroke="#fff" stroke-width="3.5"/>`:`<circle cx="${z.x}" cy="${z.y}" r="38" fill="rgba(15,10,40,.55)" stroke="rgba(255,255,255,.4)" stroke-width="3" stroke-dasharray="6 5"/>`}
      <text x="${z.x}" y="${z.y+14}" text-anchor="middle" font-size="${z.id==='home'?40:36}">${z.id==='home'?p.avatar:(open?z.emoji:'🔒')}</text>
      ${isRec?`<g class="scout-float"><circle cx="${z.x+44}" cy="${z.y-44}" r="17" fill="#fff"/><text x="${z.x+44}" y="${z.y-36}" text-anchor="middle" font-size="20">🦊</text></g>`:''}
      ${hasSent?`<text x="${z.x-44}" y="${z.y-38}" font-size="24">💌</text>`:''}
      ${done>0?`<g><rect x="${z.x-24}" y="${z.y+44}" width="48" height="20" rx="10" fill="#16a34a"/><text x="${z.x}" y="${z.y+58}" text-anchor="middle" font-size="12" font-weight="900" fill="#fff">⭐${done}</text></g>`:''}
      <text x="${z.x}" y="${z.y+82}" text-anchor="middle" font-size="16" font-weight="900" fill="#fff" style="paint-order:stroke" stroke="rgba(0,0,0,.55)" stroke-width="4">${z.name}</text>
    </g>`;
  }).join('');
  const deco = `<text x="90" y="80" font-size="34">☁️</text><text x="660" y="120" font-size="28">☁️</text>
    <text x="700" y="560" font-size="30">🌴</text><text x="80" y="560" font-size="30">🌲</text><text x="330" y="480" font-size="26">🌲</text><text x="520" y="600" font-size="26">🌵</text>
    <circle cx="700" cy="70" r="30" fill="#ffe08a" opacity=".9"/><circle cx="700" cy="70" r="40" fill="none" stroke="#ffe08a" stroke-width="3" opacity=".5" class="twinkle"/>
    <text x="120" y="680" font-size="26" class="twinkle">✨</text><text x="640" y="330" font-size="22" class="twinkle">✨</text><text x="300" y="200" font-size="20" class="twinkle">✨</text>`;
  return `<svg viewBox="0 0 800 760">${deco}${edgeSvg}${itemSvg}${nodes}</svg>`;
}
function zoneTap(zid){
  const ms = MISSIONS.concat(S.customMissions||[]).filter(m=>m.zone===zid&&!S.profile.completedMissions.includes(m.id)&&missionOpen(m));
  if(!ms.length){ toast('All clear here, explorer! ⭐ Try another land!'); return; }
  openMission(ms[0].id);
}

/* ================= CHILD: MISSIONS TAB ================= */
function missionCard(id){
  const m = getMission(id); if(!m) return '';
  const p = S.profile;
  const done = p.completedMissions.includes(id);
  const open = missionOpen(m);
  const sent = (p.sentMissions||[]).some(s=>s.missionId===id)&&!done;
  return `<div class="m-card ${sent?'from-dad':''}" ${open?`onclick="openMission('${id}')"`:`onclick="lockedToast('${m.zone}')"`} style="${open?'':'opacity:.75;cursor:not-allowed'}">
    ${done?'<div class="done-ribbon">✅ DONE</div>':''}
    <div class="m-cover" style="background:${m.grad}"><span>${open?m.emoji:'🔒'}</span>
      <span class="type-tag">${m.type==='game'?'🎮 GAME':m.type==='story'?'📖 STORY':m.type==='challenge'?'⚡ CHALLENGE':'🔍 DISCOVER'}</span>
      ${getMedia(m).type==='youtube'?'<span class="type-tag" style="left:8px;top:36px;background:#dcfce7;color:#15803d">📺 REAL VIDEO</span>':''}
      <span class="dur">⏱️ ${m.duration||'~10 min'}</span></div>
    <div class="m-body"><h3>${sent?'💌 ':''}${esc(m.title)}</h3>
      <div class="m-meta"><span class="tag gold">⭐ ${m.xp} XP</span><span class="tag green">🪙 ${m.coins}</span><span class="tag">${m.emoji==null?'':''}${zoneName(m.zone)}</span></div>
    </div></div>`;
}
function missionsHTML(){
  const f = S.mFilter;
  const all = MISSIONS.concat(S.customMissions||[]);
  const zones = ['all',...new Set(all.map(m=>m.zone))];
  const list = all.filter(m=>f==='all'||m.zone===f||(f==='todo'&&!S.profile.completedMissions.includes(m.id)&&missionOpen(m)));
  return `<div class="screen">
    <div class="hero-card"><h2 style="font-size:24px">🎯 Mission Board</h2><p style="font-weight:700;color:var(--ink-soft)">Pick a quest. Every one grows your world.</p>
    <div class="chipset" style="margin-top:10px">
      <button class="chip ${f==='all'?'on':''}" onclick="S.mFilter='all';render()">All</button>
      <button class="chip ${f==='todo'?'on':''}" onclick="S.mFilter='todo';render()">⭐ Ready</button>
      ${zones.filter(z=>z!=='all').map(z=>`<button class="chip ${f===z?'on':''}" onclick="S.mFilter='${z}';render()">${(ZONES.find(zz=>zz.id===z)||{emoji:'🔍'}).emoji} ${zoneName(z)}</button>`).join('')}
    </div></div>
    <div style="height:12px"></div>
    <div class="m-grid">${list.map(m=>missionCard(m.id)).join('')||'<div class="card">Nothing here yet!</div>'}</div>
  </div>`;
}

/* ================= MISSION PLAYER ================= */
function openMission(id, viaRabbit){
  const m = getMission(id); if(!m) return;
  if(!missionOpen(m)){ toast('🔒 Find a glowing path to unlock this land first!'); return; }
  YTPlayer.destroy(); if(vidTimer)clearInterval(vidTimer);
  const depth = viaRabbit ? (viaRabbit.depth+1) : 0;
  R = {id, step:'intro', qi:0, correct:0, storyNode:m.story?m.story.start:null,
       creativeTab:(m.creative.tabs||['draw','voice'])[0], builder:[], videoOn:false, videoT:0,
       answered:false, sortOrder:null, imgSel:[], chestOpen:false, text:'',
       built:null, buildBank:null,
       prediction:null, revisit:null, depth, viaRabbit:viaRabbit?viaRabbit.from:null,
       bridge:viaRabbit?viaRabbit.bridge:null, ytMode:false};
  if(m.type==='game'){ /* battle starts after intro */ }
  S.profile.stats.started = (S.profile.stats.started||0)+1;
  logEvent('mission_started',{mission:id, depth, viaRabbit:viaRabbit?viaRabbit.from:null});
  save(); render(); window.scrollTo({top:0});
}
function lockedToast(z){ toast('🔒 Keep exploring to grow a glowing path to '+zoneName(z)+'!'); }
function curMission(){ return R?getMission(R.id):null; }
function playerHTML(){
  const m = curMission(); if(!m){ R=null; return worldHTML(); }
  const totalSteps = m.type==='game'?4:(m.video?6:5);
  const stepIx = R.step==='intro'?0:R.step==='predict'?1:(R.step==='watch'||R.step==='battle'||R.step==='story')?2:R.step==='revisit'?3:R.step==='quiz'?(m.video?4:3):R.step==='creative'?(m.type==='game'?2:(m.video?5:4)):(m.type==='game'?3:(m.video?6:5));
  let inner = '';
  if(R.step==='intro') inner = introHTML(m);
  else if(R.step==='predict') inner = predictHTML(m);
  else if(R.step==='watch') inner = watchHTML(m);
  else if(R.step==='revisit') inner = revisitHTML(m);
  else if(R.step==='story') inner = storyHTML(m);
  else if(R.step==='quiz') inner = quizHTML(m);
  else if(R.step==='creative') inner = creativeHTML(m);
  else if(R.step==='battle') inner = `<div id="battle-root">${battleHTML()}</div>`;
  else if(R.step==='reward') inner = rewardHTML(m);
  else if(R.step==='rabbit') inner = rabbitHTML(m);
  return `<div class="screen"><div class="player">
    <div class="player-head">
      <button class="btn ghost" style="padding:8px 14px;font-size:14px" onclick="quitMission()">← World</button>
      <h2 style="font-size:23px;margin-top:8px">${m.emoji} ${esc(m.title)}</h2>
      <div class="steps">${Array.from({length:totalSteps}).map((_,i)=>`<i class="${i<stepIx?'done':i===stepIx?'now':''}"></i>`).join('')}</div>
    </div>${inner}</div></div>`;
}
function quitMission(){ if(R&&R.step==='battle'&&G){ stopTimer(); G=null; } YTPlayer.destroy(); if(vidTimer)clearInterval(vidTimer); logEvent('mission_quit',{mission:R?R.id:null, stage:R?R.step:null}); R=null; render(); }
function introHTML(m){
  const sent = (S.profile.sentMissions||[]).some(s=>s.missionId===m.id);
  return `<div style="padding:6px 20px 22px">
    ${sent?'<div class="feedback good" style="background:#ffe9f2;border-color:#ff9ec6;color:#9d174d">💌 <b>Dad sent you this mission!</b> He thought you’d love it.</div>':''}
    <div class="m-cover" style="background:${m.grad};border-radius:18px;height:150px;font-size:72px"><span>${m.emoji}</span><span class="dur">⏱️ ${m.duration||'~10 min'}</span></div>
    <p style="font-size:16.5px;font-weight:700;line-height:1.55;margin:12px 2px">${esc(m.desc)}</p>
    <div class="scout-bar" style="margin:10px 0"><div class="scout-face">🦊</div>
      <div class="scout-bubble"><span class="scout-name">Scout ${R.bridge?'connects the dots':'briefs you'}</span><br>${R.bridge?esc(R.bridge):scoutBrief(m)}</div></div>
    <div class="m-meta" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
      <span class="tag gold">⭐ ${m.xp} XP</span><span class="tag green">🪙 ${m.coins} coins</span>
      <span class="tag">🎁 ${m.collectible.emoji} ${esc(m.collectible.name)}</span><span class="tag">${m.worldItem.emoji} ${esc(m.worldItem.name)}</span></div>
    <button class="btn big" style="width:100%" onclick="beginMission()">${m.type==='game'?'⚔️ Enter the Battle!':m.type==='story'?'📖 Begin the Story!':'▶ Start Mission!'}</button>
  </div>`;
}
function scoutBrief(m){
  if(m.type==='game') return `Monsters ahead, ${esc(S.profile.name)}! Your sword is <b>math</b>. Hit them with correct answers — 5 levels stand between you and the diamonds!`;
  if(m.type==='story') return `This one is a <b>story YOU control</b>. Every choice changes what happens. Choose bravely!`;
  if(m.type==='challenge') return `A real thinker-challenge. No rushing — engineers test, guess, and test again. You've got this!`;
  return `Watch closely, then show me what you learned. <b>Curious eyes find the most!</b>`;
}
function beginMission(){
  const m = curMission();
  if(!m) return;
  if(m.type==='game'){ R.step='battle'; startBattle(m.id); }
  else if(m.predict){ R.step='predict'; }
  else if(m.video) R.step='watch';
  else if(m.story){ R.step='story'; }
  else R.step='quiz';
  logEvent('mission_begin',{mission:m.id, firstStep:R.step});
  render(); window.scrollTo({top:0});
}

/* ----- Predict ----- */
function predictHTML(m){
  const p = m.predict;
  let input = '';
  if(p.type==='choice'){
    input = (p.options||[]).map((o,i)=>`<button class="opt" id="pred-${i}" onclick="submitPredict(${i})">${esc(o)}</button>`).join('');
  } else {
    input = `<textarea id="pred-text" class="short-in" rows="3" placeholder="My theory is…"></textarea>
    <button class="btn orange big" style="width:100%;margin-top:10px" onclick="submitPredictText()">Lock In My Theory 🔮</button>`;
  }
  return `<div class="predict-card"><div class="p-label">🔮 Before you watch — predict!</div>
    <h3 style="font-size:19px;margin:6px 0 10px">Scout wonders… ${esc(p.q)}</h3>
    <p style="font-weight:700;color:var(--ink-soft);font-size:14px">There are no wrong predictions. Guessers become discoverers!</p>
    ${input}<div id="pred-fb"></div></div><div style="height:14px"></div>`;
}
function submitPredict(i){
  const m = curMission(); if(!m||R.prediction) return;
  R.prediction = {pick:i, text:(m.predict.options||[])[i]||''};
  for(let j=0;j<(m.predict.options||[]).length;j++){ const b=document.getElementById('pred-'+j); if(!b)continue; b.disabled=true; if(j===i)b.classList.add('correct'); else b.style.opacity=.5; }
  logEvent('prediction_done',{mission:m.id, kind:'choice', pick:i});
  const fb=document.getElementById('pred-fb');
  if(fb) fb.innerHTML = `<div class="feedback good">🔮 Locked in: <b>${esc(R.prediction.text)}</b> — let’s see what the video reveals!</div>
  <button class="btn big" style="width:100%;margin-top:10px" onclick="afterPredict()">Watch & Find Out ▶</button>`;
  else afterPredict();
}
function submitPredictText(){
  const m = curMission(); if(!m||R.prediction) return;
  const t = ((document.getElementById('pred-text')||{}).value||'').trim();
  if(t.length<3){ toast('Give me a little theory first! 🔮'); return; }
  R.prediction = {pick:-1, text:t};
  logEvent('prediction_done',{mission:m.id, kind:'text'});
  afterPredict();
}
function afterPredict(){
  const m = curMission();
  R.step = m.video?'watch':(m.story?'story':'quiz');
  render(); window.scrollTo({top:0});
}
/* ----- Revisit prediction ----- */
function revisitHTML(m){
  const pr = R.prediction;
  return `<div class="predict-card"><div class="p-label">🔮 Back to your prediction</div>
    <h3 style="font-size:19px;margin:6px 0">You thought <b>“${esc(pr?pr.text:'…')}”</b> before watching.</h3>
    <p style="font-weight:700;color:var(--ink-soft)">What do you think NOW?</p>
    <div class="btn-row">
      <button class="btn green" onclick="revisitChoice('keep')">✅ Keep my answer</button>
      <button class="btn orange" onclick="revisitChoice('change')">🔄 Change it</button>
    </div>
    <textarea id="revisit-text" class="short-in" rows="2" style="margin-top:10px" placeholder="What did you learn? (optional — or tap below)"></textarea>
    <button class="btn big" style="width:100%;margin-top:10px" onclick="revisitChoice('explain')">Explain What I Learned ✨</button>
  </div><div style="height:14px"></div>`;
}
function revisitChoice(mode){
  const m = curMission(); if(!m) return;
  const extra = ((document.getElementById('revisit-text')||{}).value||'').trim();
  R.revisit = {mode, extra};
  logEvent('prediction_revisited',{mission:m.id, mode, kept:mode==='keep'});
  R.step = (m.story && !R.fromStory) ? 'story' : 'quiz';
  render(); window.scrollTo({top:0});
}

/* ----- Watch ----- */
const VID_LEN = {'volcano':272,'jets':245,'bridges':220,'skyscraper':235,'islands':210,'mars':260,'sharks':205,'car':230,'aqueducts':225,'dino':240,'pompeii':250,'supervolcano':200};
function watchHTML(m){
  if(getMedia(m).type==='youtube' && !R.ytFallback) return watchYTHTML(m, getMedia(m));
  const v = m.video; const len = VID_LEN[m.id]||220;
  const pct = Math.min(100, R.videoT/len*100);
  const fmt = s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  const chit = v.chapters.map((c,i)=>{const hit = pct > (i+1)/v.chapters.length*100; return `<span class="${hit?'hit':''}">${esc(c)}</span>`;}).join('');
  return `<div class="video-mock">
      <div class="video-art ${R.videoOn?'playing':''}" style="background:${m.grad}"><span>${m.emoji}</span>
        <button class="play-btn" style="position:absolute" onclick="videoToggle(${len})">${R.videoOn?'⏸️':'▶️'}</button></div>
      <div class="video-bar"><b>${esc(v.title)}</b>
        <div style="font-size:12px;font-weight:700;opacity:.75;margin:2px 0 8px">${fmt(R.videoT)} / ${v.duration} · Scout watches with you 🦊</div>
        <div class="v-progress" onclick="videoSkip(event,${len})"><i style="width:${pct}%"></i></div>
        <div class="chapters">${chit}</div></div>
    </div>
    <div class="vocab">📖 <b>Scout's word:</b> ${esc(v.script.split('.')[0])}.</div>
    <div style="padding:0 20px 22px">
      <div class="scout-bar"><div class="scout-face">🦊</div><div class="scout-bubble"><span class="scout-name">Scout</span><br>${R.videoT>0?'Great watching! Ready for the challenges? I believe in you! 🌟':'Press play and watch with me — then we play! 🍿'}</div></div>
      <div class="btn-row"><button class="btn green big" style="flex:1" onclick="afterWatch()">Play Challenges 🎮</button>
      ${R.videoT===0?'<button class="btn ghost" onclick="afterWatch()">Skip video →</button>':''}</div>
    </div>`;
}
let vidTimer = null;
function videoToggle(len){
  R.videoOn = !R.videoOn;
  if(R.videoOn){
    vidTimer = setInterval(()=>{
      if(!R||R.step!=='watch'){clearInterval(vidTimer);return;}
      R.videoT += 4;
      if(R.videoT>=len){R.videoT=len;R.videoOn=false;clearInterval(vidTimer);toast('Video finished! 🌟');}
      const bar = document.querySelector('.v-progress>i'); if(bar) bar.style.width=(R.videoT/len*100)+'%';
    },200);
  } else if(vidTimer) clearInterval(vidTimer);
  render();
}
function videoSkip(ev,len){ if(ev) ev.stopPropagation(); R.videoT = len; R.videoOn=false; if(vidTimer)clearInterval(vidTimer); render(); }
/* ----- Real YouTube stage (stays inside the mission — no browsing) ----- */
function watchYTHTML(m, media){
  const v = m.video;
  setTimeout(()=>mountYTPlayer(m, media), 60);
  return `<div style="padding:2px 20px 22px">
    <div class="yt-frame"><div id="yt-api-player"></div></div>
    <div class="yt-note">▶️ <span>Real video · <b>${esc(media.channel||'YouTube')}</b> · plays right here — the mission never leaves.</span></div>
    <div class="vocab">📖 <b>Scout's word:</b> ${esc(v.script.split('.')[0])}.</div>
    <div class="scout-bar"><div class="scout-face">🦊</div><div class="scout-bubble"><span class="scout-name">Scout watches with you</span><br>Eyes wide, explorer! I’ll pause us if I spot something HUGE. 🍿</div></div>
    <div class="btn-row"><button class="btn green big" style="flex:1" onclick="afterWatch()">I Watched It! Continue 🎮</button></div>
    <div class="yt-note" style="justify-content:center">🔄 <a href="#" onclick="ytFallbackToMock();return false" style="color:#6c46f5;font-weight:800">Video won't play? Use Scout's version instead</a></div>
  </div>`;
}
function ytFallbackToMock(){
  if(!R) return;
  R.ytFallback = true; YTPlayer.destroy();
  logEvent('video_fallback',{mission:R.id});
  toast('Scout’s got you — story version! 📖');
  render();
}
function mountYTPlayer(m, media){
  if(!R||R.step!=='watch'||!m) return;
  const el = document.getElementById('yt-api-player'); if(!el) return;
  const trigs = (m.triggers||[]).map(t=>({at:t.at, prompt:t.prompt, options:t.options}));
  if(!trigs.length || !ytApiUsable()){ YTPlayer.fallback(el, media.youtubeId); return; }
  YTPlayer.mount('yt-api-player', media.youtubeId, {
    triggers: trigs,
    onTrigger:(tr)=>{ logEvent('trigger_fired',{mission:m.id, at:tr.at}); ytTriggerOverlay(tr); },
    onEnded:()=>{ logEvent('video_ended',{mission:m.id}); toast('Video finished! 🌟'); },
    onError:()=>{ const e2=document.getElementById('yt-api-player'); if(e2) YTPlayer.fallback(e2, media.youtubeId); }
  });
  /* Watchdog: if the API player fails to become ready, swap to plain embed. */
  setTimeout(()=>{
    try{
      const bad = !YTPlayer.player || !YTPlayer.player.getPlayerState;
      const gone = !R || R.step!=='watch';
      if(bad && !gone){ const e2=document.getElementById('yt-api-player'); if(e2) YTPlayer.fallback(e2, media.youtubeId); }
    }catch(e){}
  }, 7000);
}
function afterWatch(){
  if(vidTimer)clearInterval(vidTimer); R.videoOn=false; YTPlayer.destroy();
  const m = curMission();
  logEvent('video_completed',{mission:m.id, yt:!!(getMedia(m).type==='youtube')});
  R.step = m.predict?'revisit':(m.story?'story':'quiz');
  render(); window.scrollTo({top:0});
}

/* ----- Story ----- */
function storyHTML(m){
  const node = m.story.nodes[R.storyNode];
  let choices = '';
  if(!node.end){
    choices = node.choices.map((c,i)=>`<button class="opt story-choice" onclick="storyGo('${c.to}')">${esc(c.t)}</button>`).join('');
  } else {
    choices = `<div class="feedback good">🌟 <b>Chapter complete!</b> Your choices wrote this ending — no one else gets exactly yours.</div>
    <button class="btn green big" style="width:100%;margin-top:10px" onclick="R.fromStory=true;R.step='quiz';render();window.scrollTo({top:0})">Face the Challenges 🎮</button>`;
  }
  return `<div class="q-card"><div class="p-label">📖 Interactive story</div><h3 style="margin-top:6px">Choose your path, explorer…</h3>
    <p style="font-size:16.5px;font-weight:600;line-height:1.65;background:#fff;border-radius:14px;padding:14px;border:2px dashed #c9bdf5">${esc(node.text)}</p>${choices}</div>
    <div style="height:14px"></div>`;
}
function storyGo(to){ R.storyNode=to; R.answered=false; render(); window.scrollTo({top:0}); }

/* ----- Quiz ----- */
function quizHTML(m){
  const q = m.questions[R.qi];
  const total = m.questions.length;
  let qbody = '';
  if(q.kind==='mc'||q.kind==='tf'){
    const cls = q.kind==='tf'?'tf-row':'';
    qbody = `<div class="${cls}">${q.options.map((o,i)=>`<button class="opt" id="opt-${i}" onclick="answerOpt(${i})">${esc(o)}</button>`).join('')}</div><div id="q-feedback"></div>`;
  } else if(q.kind==='sort'){
    if(!R.sortOrder) R.sortOrder = q.options.map((_,i)=>i).sort(()=>Math.random()-.5);
    qbody = `<div id="sort-list">${R.sortOrder.map(si=>`<div class="sort-item"><span class="grip">⠿</span><span style="flex:1">${esc(q.options[si])}</span><span><button class="btn ghost" style="padding:4px 10px;font-size:13px" onclick="sortMove(${si},-1)">↑</button> <button class="btn ghost" style="padding:4px 10px;font-size:13px" onclick="sortMove(${si},1)">↓</button></span></div>`).join('')}</div>
    <div id="q-feedback"></div><button class="btn green" style="width:100%;margin-top:6px" onclick="sortCheck()">Check Order ✅</button>`;
  } else if(q.kind==='img'){
    qbody = `<div class="img-pick">${q.options.map((o,i)=>`<button id="img-${i}" onclick="imgPick(${i})"><span>${o.e}</span><small>${esc(o.t)}</small></button>`).join('')}</div><div id="q-feedback"></div>`;
  } else if(q.kind==='build'){
    if(!R.buildBank) R.buildBank = q.tiles.map((_,i)=>i).sort(()=>Math.random()-.5);
    if(!R.built) R.built = [];
    const placed = {};
    R.built.forEach(function(bi){ placed[bi] = true; });
    qbody = `<div class="p-label">Tap tiles to build your answer — tap a placed tile to take it back.</div>
    <div class="builder-stage" id="build-answer" style="min-height:68px">${R.built.length?R.built.map(function(bi){return `<button class="tile placed" onclick="buildUnplace(${bi})">${esc(q.tiles[bi])}</button>`;}).join(''):'<span style="font-size:14px;font-weight:700;color:#6b8f71">Your sentence builds here…</span>'}</div>
    <div class="builder-palette" style="margin-top:10px">${R.buildBank.filter(function(bi){return !placed[bi];}).map(function(bi){return `<button class="tile" onclick="buildTap(${bi})">${esc(q.tiles[bi])}</button>`;}).join('')}</div>
    <div id="q-feedback"></div><button class="btn green" style="width:100%;margin-top:8px" onclick="buildCheck()">Check My Sentence ✅</button>`;
  } else if(q.kind==='short'){
    qbody = `<textarea id="short-in" class="short-in" rows="3" placeholder="Type your idea here…"></textarea><div id="q-feedback"></div>
    <button class="btn green" style="width:100%;margin-top:8px" onclick="shortSubmit()">Share Idea 💡</button>`;
  }
  return `<div class="q-card"><div class="p-label">Challenge ${R.qi+1} of ${total} · ${R.correct} ⭐ so far</div><h3>${esc(q.q)}</h3>${qbody}
    <div id="quiz-next"></div></div><div style="height:14px"></div>`;
}
function buildTap(bi){ if(R.answered||!R.built) return; if(R.built.indexOf(bi)>=0) return; R.built.push(bi); render(); }
function buildUnplace(bi){ if(R.answered||!R.built) return; R.built = R.built.filter(function(x){return x!==bi;}); render(); }
function buildCheck(){
  if(R.answered) return; R.answered=true;
  const m = curMission(), q = m.questions[R.qi];
  const made = R.built.map(function(bi){return q.tiles[bi];});
  const ok = made.length===(q.answer||[]).length && made.every(function(t,i){return t===q.answer[i];});
  if(ok){R.correct++;confettiBurst(12);flyText('+10 ⭐');}
  const fb=document.getElementById('q-feedback');
  if(fb)fb.innerHTML=ok?`<div class="feedback good">✅ Beautiful sentence! Read it back: <b>${esc(made.join(' '))}</b>. ${esc(q.why)}</div>`:`<div class="feedback bad">💡 Almost! The sentence goes: <b>${esc((q.answer||[]).join(' '))}</b>. ${esc(q.why)}</div>`;
  logEvent('activity_completed',{mission:m.id, qi:R.qi, kind:'build', ok}); if(!ok) logEvent('retry',{mission:m.id, qi:R.qi, kind:'build'});
  bumpSkill(m,ok); quizNextBtn(m);
}
function quizNextBtn(m){
  const last = R.qi>=m.questions.length-1;
  const el = document.getElementById('quiz-next');
  if(el) el.innerHTML = `<button class="btn big" style="width:100%;margin-top:12px" onclick="quizNext()">${last?'Create Something! 🎨':'Next Challenge →'}</button>`;
}
function quizNext(){
  const m = curMission();
  if(R.qi>=m.questions.length-1){ R.step='creative'; R.answered=false; }
  else { R.qi++; R.answered=false; R.sortOrder=null; R.imgSel=[]; R.built=null; R.buildBank=null; }
  render(); window.scrollTo({top:0});
}
function answerOpt(i){
  if(R.answered) return; R.answered=true;
  const m = curMission(), q = m.questions[R.qi];
  const ok = (i===q.answer);
  if(ok) R.correct++;
  q.options.forEach((_,j)=>{const b=document.getElementById('opt-'+j); if(!b)return; b.disabled=true;
    if(j===q.answer)b.classList.add('correct'); else if(j===i)b.classList.add('wrong'); else b.style.opacity=.55;});
  const fb = document.getElementById('q-feedback');
  if(fb) fb.innerHTML = ok?`<div class="feedback good">✅ ${esc(q.why)}</div>`:`<div class="feedback bad">💡 Good try! ${esc(q.why)}</div>`;
  if(ok){ confettiBurst(12); flyText('+10 ⭐'); }
  else logEvent('retry',{mission:m.id, qi:R.qi, kind:q.kind});
  logEvent('activity_completed',{mission:m.id, qi:R.qi, kind:q.kind, ok});
  bumpSkill(m, ok);
  quizNextBtn(m);
}
function sortMove(si,dir){
  const o = R.sortOrder; const i = o.indexOf(si); const j = i+dir;
  if(j<0||j>=o.length) return;
  [o[i],o[j]]=[o[j],o[i]]; render();
}
function sortCheck(){
  if(R.answered) return; R.answered=true;
  const m = curMission(), q = m.questions[R.qi];
  const ok = R.sortOrder.every((v,i)=>v===q.answer[i]);
  if(ok){R.correct++;confettiBurst(12);flyText('+10 ⭐');}
  document.querySelectorAll('.sort-item').forEach(el=>{el.style.borderColor=ok?'#059669':'#ef4444';el.style.background=ok?'#dcfce7':'#fee2e2';});
  const fb=document.getElementById('q-feedback');
  if(fb)fb.innerHTML=ok?`<div class="feedback good">✅ Perfect order! ${esc(q.why)}</div>`:`<div class="feedback bad">💡 Almost! The right order: <b>${q.answer.map(a=>esc(q.options[a])).join(' → ')}</b>. ${esc(q.why)}</div>`;
  logEvent('activity_completed',{mission:m.id, qi:R.qi, kind:'sort', ok}); if(!ok) logEvent('retry',{mission:m.id, qi:R.qi, kind:'sort'});
  bumpSkill(m,ok); quizNextBtn(m);
}
function imgPick(i){
  if(R.answered) return; R.answered=true;
  const m = curMission(), q = m.questions[R.qi];
  const ok = (i===q.answer);
  if(ok){R.correct++;confettiBurst(12);flyText('+10 ⭐');}
  q.options.forEach((_,j)=>{const b=document.getElementById('img-'+j);if(!b)return;b.disabled=true;
    if(j===q.answer)b.classList.add('correct');else if(j===i)b.classList.add('wrong');else b.style.opacity=.5;});
  const fb=document.getElementById('q-feedback');
  if(fb)fb.innerHTML=ok?`<div class="feedback good">✅ ${esc(q.why)}</div>`:`<div class="feedback bad">💡 Look again! ${esc(q.why)}</div>`;
  logEvent('activity_completed',{mission:m.id, qi:R.qi, kind:'img', ok}); if(!ok) logEvent('retry',{mission:m.id, qi:R.qi, kind:'img'});
  bumpSkill(m,ok); quizNextBtn(m);
}
function shortSubmit(){
  if(R.answered) return;
  const m = curMission(), q = m.questions[R.qi];
  const txt = ((document.getElementById('short-in')||{}).value||'').trim();
  if(txt.length<3){ toast('Add a little more — your idea matters! 💡'); return; }
  R.answered=true; R.correct++;
  const low = txt.toLowerCase();
  const hits = (q.keywords||[]).filter(k=>low.includes(k));
  const fb=document.getElementById('q-feedback');
  if(fb)fb.innerHTML=`<div class="feedback good">🌟 ${hits.length?`You used a scientist word — <b>${esc(hits[0])}</b>! `:''}${esc(q.why)}</div>
    <div class="scout-bar" style="margin:8px 0"><div class="scout-face" style="width:48px;height:48px;font-size:26px">🦊</div><div class="scout-bubble"><span class="scout-name">Scout read your idea</span><br>${esc(scoutShortReply(txt,hits))}</div></div>`;
  confettiBurst(10); flyText('+10 ⭐');
  logEvent('activity_completed',{mission:m.id, qi:R.qi, kind:'short', ok:true});
  bumpSkill(m,true); quizNextBtn(m);
}
function scoutShortReply(txt,hits){
  if(hits.length>=2) return `Brilliant — you wove in “${hits.slice(0,2).join('” and “')}” like a real expert. That detail shows deep thinking!`;
  if(hits.length===1) return `Nice — “${hits[0]}” is exactly the key idea. You clearly get it!`;
  return `I love how you put it in your own words — that is the hardest kind of thinking, and you did it!`;
}
function bumpSkill(m,ok){
  const p = S.profile;
  (m.skills||[]).forEach(s=>{ if(p.skills[s]==null)p.skills[s]=50; p.skills[s]=Math.min(99,p.skills[s]+(ok?2:1)); });
  save();
}

/* ----- Creative ----- */
function creativeHTML(m){
  const c = m.creative;
  const tab = R.creativeTab;
  let pane = '';
  if(tab==='text') pane = `<textarea id="cr-text" class="short-in" rows="4" placeholder="Write your creation here…">${esc(R.text||'')}</textarea>`;
  else if(tab==='draw') pane = `<canvas id="drawCanvas" width="600" height="320"></canvas>
    <div class="btn-row" style="margin-top:8px"><button class="btn ghost" onclick="drawClear()">🧹 Clear</button><span style="font-weight:800;color:var(--ink-soft);font-size:13px;align-self:center">Draw with finger or mouse!</span></div>`;
  else if(tab==='voice') pane = `<div class="voice-mock"><button class="mic-btn" id="micBtn" onclick="voiceRec()">🎤</button>
    <div id="voice-status" style="font-weight:800;margin-top:10px;color:var(--ink-soft)">Tap the mic and tell Scout your idea!</div></div>`;
  else if(tab==='upload') pane = `<div class="voice-mock"><div style="font-size:50px">📸</div>
    <label class="btn blue" style="display:inline-block">Choose a Photo<input type="file" accept="image/*" style="display:none" onchange="uploadMock(this)"></label>
    <div id="upload-status" style="font-weight:700;margin-top:8px;color:var(--ink-soft)">Show something you built in real life!</div></div>`;
  else if(tab==='build'){
    const pal = ['🧱','🪵','🪨','💎','🔺','🟫','⚙️','🚩','🌋','🌉'];
    pane = `<div class="builder-palette">${pal.map(e=>`<button onclick="builderAdd('${e}')">${e}</button>`).join('')}</div>
    <div class="builder-stage" id="build-stage">${R.builder.length?R.builder.map(e=>`<span>${e}</span>`).join(''):'<span style="font-size:14px;font-weight:700;color:#6b8f71">Tap pieces to build here…</span>'}</div>
    <button class="btn ghost" style="margin-top:8px" onclick="R.builder=[];render();initDrawIfNeeded()">🧹 Start over</button>`;
  }
  return `<div class="q-card"><div class="p-label">🎨 Creator challenge</div><h3>${esc(c.title)}</h3>
    <p style="font-weight:600;line-height:1.55">${esc(c.prompt)}</p>
    <div class="creative-tabs">${c.tabs.map(t=>`<button class="${tab===t?'on':''}" onclick="R.creativeTab='${t}';render();initDrawIfNeeded()">${tabIcon(t)} ${t}</button>`).join('')}</div>
    ${pane}<div id="q-feedback"></div>
    <button class="btn orange big" style="width:100%;margin-top:12px" onclick="submitCreative()">Share with Scout ✨</button></div><div style="height:14px"></div>`;
}
function tabIcon(t){ return {text:'✏️',draw:'🖌️',voice:'🎤',upload:'📸',build:'🧱'}[t]||'✨'; }
function builderAdd(e){ R.builder.push(e); const st=document.getElementById('build-stage'); if(st) st.innerHTML=R.builder.map(x=>`<span>${x}</span>`).join(''); }
function initDrawIfNeeded(){
  const cv = document.getElementById('drawCanvas'); if(!cv||!cv.getContext) return;
  const ctx = cv.getContext('2d'); ctx.lineWidth=6; ctx.lineCap='round'; ctx.strokeStyle='#6c46f5';
  let down=false;
  const pos = e=>{const r=cv.getBoundingClientRect();const t=e.touches?e.touches[0]:e;return [(t.clientX-r.left)*(cv.width/r.width),(t.clientY-r.top)*(cv.height/r.height)];};
  cv.onmousedown=e=>{down=true;const [x,y]=pos(e);ctx.beginPath();ctx.moveTo(x,y);};
  cv.onmousemove=e=>{if(!down)return;const [x,y]=pos(e);ctx.lineTo(x,y);ctx.stroke();};
  window.onmouseup=()=>down=false;
  cv.ontouchstart=e=>{e.preventDefault();down=true;const [x,y]=pos(e);ctx.beginPath();ctx.moveTo(x,y);};
  cv.ontouchmove=e=>{e.preventDefault();if(!down)return;const [x,y]=pos(e);ctx.lineTo(x,y);ctx.stroke();};
  cv.ontouchend=()=>down=false;
  cv.dataset.drawn='1';
}
function drawClear(){ const cv=document.getElementById('drawCanvas'); if(cv) cv.getContext('2d').clearRect(0,0,cv.width,cv.height); }
function voiceRec(){
  const b=document.getElementById('micBtn'), st=document.getElementById('voice-status');
  if(!b||b.classList.contains('rec'))return;
  b.classList.add('rec'); st.textContent='🎙️ Listening… tell me everything! (3s)';
  setTimeout(()=>{ b.classList.remove('rec'); b.textContent='✅';
    st.innerHTML='Heard you loud and clear! <b>“My design uses strong shapes…”</b> — tap Share! ✨'; R.text='voice: my design uses strong shapes and smart materials'; },3000);
}
function uploadMock(inp){
  const st=document.getElementById('upload-status');
  const f = inp.files&&inp.files[0];
  if(st) st.innerHTML = f?`📸 <b>${esc(f.name)}</b> attached! Scout can almost see it — tap Share!`:'Nothing attached yet.';
  if(f) R.text='photo: '+f.name;
}
function submitCreative(){
  const m = curMission(), c = m.creative;
  if(R.creativeTab==='text'){ R.text = (document.getElementById('cr-text')||{}).value||R.text||''; if(R.text.trim().length<3){toast('Add a little more — Scout is curious! ✏️');return;} }
  logEvent('creative_used',{mission:m.id, tab:R.creativeTab});
  completeMission();
}
function finishBattle(){ R.step='creative'; R.answered=false; render(); window.scrollTo({top:0}); }

/* ----- Rewards ----- */
function completeMission(){
  const m = curMission(); if(!m) return;
  const p = S.profile;
  if(!p.completedMissions.includes(m.id)) p.completedMissions.push(m.id);
  const first = !p._rewarded || !p._rewarded.includes(m.id);
  p._rewarded = p._rewarded||[]; if(!p._rewarded.includes(m.id)) p._rewarded.push(m.id);
  if(first){
    p.xp += m.xp; p.coins += m.coins;
    if(!p.unlockedZones.includes(m.zone)) p.unlockedZones.push(m.zone);
    if(!p.collectibles.find(c=>c.name===m.collectible.name)) p.collectibles.push({...m.collectible});
    if(!p.worldItems.find(w=>w.name===m.worldItem.name)) p.worldItems.push({...m.worldItem});
    p.minutes += parseInt(m.duration)||10;
    if(!p.topicsExplored.includes(shortTitle(m.title))) p.topicsExplored.push(shortTitle(m.title));
    p.pathTrail.push(shortTitle(m.title)); p.pathTrail = p.pathTrail.slice(-6);
    const today = new Date().toDateString();
    if(p.lastPlay!==today){ p.streak++; p.lastPlay=today; }
    Object.keys(p.interests).forEach(k=>{ if((m.tags||[]).includes(k)) p.interests[k]=Math.min(99,p.interests[k]+2); });
    const novelTag = (m.tags||[]).find(t=>(p.interests[t]||0)<50);
    if(novelTag){ p.interests[novelTag]=(p.interests[novelTag]||30)+6; if(!p.interestList.includes(novelTag)&&p.interests[novelTag]>45) p.interestList.push(novelTag); }
    p.stats = p.stats||{bestDepth:0, chains:[], started:0, completed:0};
    p.stats.completed++;
    const depth = R.depth||0;
    if(depth>(p.stats.bestDepth||0)) p.stats.bestDepth = depth;
    const chain = p.stats.chains[p.stats.chains.length-1];
    if(R.viaRabbit && chain && !chain.closed){ chain.missions.push(m.id); chain.depth = depth; }
    else { if(chain) chain.closed = true; p.stats.chains.push({missions:[m.id], depth, closed:false}); }
    p.stats.chains = p.stats.chains.slice(-12);
  }
  logEvent('mission_completed',{mission:m.id, depth:R.depth||0, viaRabbit:R.viaRabbit||null, correct:R.correct, prediction:!!R.prediction, revisited:!!R.revisit});
  save();
  R.step='reward'; R.chestOpen=false; render(); window.scrollTo({top:0});
}
function rewardHTML(m){
  if(!R.chestOpen){
    return `<div class="reward-stage"><div style="font-size:20px;font-weight:900;color:var(--ink-soft)">🎉 MISSION COMPLETE! 🎉</div>
      <h2 style="font-size:28px;margin:6px 0">You did it, ${esc(S.profile.name)}!</h2>
      <div class="chest" onclick="openChest()">🎁</div>
      <div style="font-weight:800;color:var(--ink-soft)">Tap the treasure chest!</div></div>`;
  }
  return `<div class="reward-stage"><div style="font-size:20px;font-weight:900;color:#059669">🎉 MISSION COMPLETE! 🎉</div>
    <h2 style="font-size:26px">Your world just got bigger. 🌍</h2>
    <div style="font-size:80px">🎁</div>
    <div class="loot-grid">
      <div class="loot"><div class="le">⭐</div><b>+${m.xp} XP</b><small>Level ${levelOf(S.profile.xp)}</small></div>
      <div class="loot" style="animation-delay:.12s"><div class="le">🪙</div><b>+${m.coins} coins</b><small>Wallet: ${S.profile.coins}</small></div>
      <div class="loot" style="animation-delay:.24s"><div class="le">${m.collectible.emoji}</div><b>${esc(m.collectible.name)}</b><small>Collectible</small></div>
      <div class="loot" style="animation-delay:.36s"><div class="le">${m.worldItem.emoji}</div><b>${esc(m.worldItem.name)}</b><small>New in your world!</small></div>
    </div>
    <div class="scout-bar" style="text-align:left"><div class="scout-face">🦊</div>
      <div class="scout-bubble"><span class="scout-name">Scout celebrates</span><br>${esc(m.creative.scout)}</div></div>
    <div class="btn-row" style="justify-content:center;margin-top:12px">
      <button class="btn big" onclick="gotoRabbit()">Choose Your Rabbit Hole 🕳️</button>
      <button class="btn ghost" onclick="R=null;S.childTab='world';save();render()">World 🗺️</button>
    </div></div>`;
}
function openChest(){
  R.chestOpen=true;
  const m = curMission();
  render(); confettiBurst(90);
  flyText(`+${m.xp} XP ⭐`); setTimeout(()=>flyText(`+${m.coins} 🪙`),400);
}
function gotoRabbit(){ R.step='rabbit'; render(); window.scrollTo({top:0}); }

/* ----- Rabbit holes ----- */
function rabbitHTML(m){
  const opts = (m.rabbitHoles||[]).map(rh=>({rh, m:getMission(rh.to)})).filter(o=>o.m);
  const fallback = kidRecs().filter(r=>r.id!==m.id).slice(0,2);
  fallback.forEach(f=>{ if(!opts.find(o=>o.m.id===f.id)){ const mm=getMission(f.id); if(mm) opts.push({rh:{to:f.id,why:f.recLabel}, m:mm}); } });
  const shown = opts.slice(0,4);
  return `<div style="padding:6px 20px 22px;text-align:center">
    <div style="font-size:56px">🕳️✨</div>
    <h2 style="font-size:26px">Choose your rabbit hole!</h2>
    <p style="font-weight:700;color:var(--ink-soft)">Scout found ${shown.length} strange new paths… where does curiosity pull you?</p>
    <div class="rh-grid">${shown.map(({rh,m:om},i)=>{
      const novel = ((S.profile.interests[(om.tags||[])[0]]||50)<50);
      return `<button class="rh-card" style="animation:screenIn .4s ${i*0.1}s backwards" onclick="chooseRabbit('${om.id}')">
        <div class="rh-art" style="background:${om.grad}">${om.emoji}</div>
        <div class="rh-b"><b>${esc(om.title)}</b>${novel?' <span class="novel-badge">NEW WORLD</span>':''}<div class="rh-why">🦊 ${esc(rh.why)}</div>${rh.bridge?`<div class="rh-why" style="color:#6c46f5">💡 ${esc(rh.bridge)}</div>`:''}</div></button>`;}).join('')}</div>
    <button class="btn ghost" style="margin-top:14px" onclick="R=null;S.childTab='world';save();render()">Back to World 🗺️</button>
  </div>`;
}
function chooseRabbit(id){
  const om = getMission(id); if(!om) return;
  const fromM = curMission();
  const edge = fromM ? (fromM.rabbitHoles||[]).find(r=>r.to===id) : null;
  const bridge = edge&&edge.bridge ? edge.bridge : ('Curiosity pulled you from '+(fromM?fromM.title:'the world')+' to '+om.title+'.');
  const depth = R?(R.depth||0):0;
  const p = S.profile;
  const newZone = !p.unlockedZones.includes(om.zone);
  if(!S.unlockedMissions.includes(id)) S.unlockedMissions.push(id);
  if(newZone) p.unlockedZones.push(om.zone);
  logEvent('rabbithole_selected',{from:fromM?fromM.id:null, to:id, depth:depth+1});
  save();
  showOverlay(`<div class="modal" style="text-align:center">
    <div style="font-size:64px">🌀✨</div><h2>You found a new path!</h2>
    <div class="scout-bar" style="text-align:left;margin:10px 0"><div class="scout-face" style="width:52px;height:52px;font-size:28px">🦊</div>
      <div class="scout-bubble"><span class="scout-name">Scout connects it</span><br>${esc(bridge)}</div></div>
    <p style="font-weight:700;color:var(--ink-soft)">Following curiosity: <b>${esc(om.title)}</b></p>
    ${newZone?`<div style="font-size:60px;animation:buildBounce 1s infinite">${(ZONES.find(z=>z.id===om.zone)||{}).emoji||'🌟'}</div>
    <h3 style="color:#6c46f5">🎉 ${esc(p.name)} unlocked ${esc(zoneName(om.zone))}!</h3>`:`<div style="font-size:50px">${om.emoji}</div>`}
    <button class="btn big" onclick="closeOverlay();openMission('${id}',{from:'${fromM?fromM.id:''}',depth:${depth},bridge:${JSON.stringify(String(bridge).replace(/"/g,"'")).replace(/</g,'\\u003c')}})">Explore! 🚀</button></div>`);
  confettiBurst(60);
}

/* ================= COLLECTION ================= */
function collectionHTML(){
  const p = S.profile;
  const t = S.collTab;
  let inner = '';
  if(t==='collect'){
    const all = ['Lava Rock','Mini Jet Engine','Tiny Steel Beam','Fossil Fragment','Golden Rivet','Roman Coin','Black Sand Vial','Mars Pebble','Shark Tooth','Piston Charm','Aqua Drop','Diamond Shard','Ash Crystal','Ammonite Spiral','Core Crystal','Lucky Feather','Push-Pull Badge'];
    const emo = {'Lava Rock':'🪨','Mini Jet Engine':'🌀','Tiny Steel Beam':'🔩','Fossil Fragment':'🦴','Golden Rivet':'🔩','Roman Coin':'🪙','Black Sand Vial':'⏳','Mars Pebble':'🔴','Shark Tooth':'🦷','Piston Charm':'⚙️','Aqua Drop':'💧','Diamond Shard':'💎','Ash Crystal':'💠','Ammonite Spiral':'🌀','Core Crystal':'🔮','Lucky Feather':'🪶','Push-Pull Badge':'🏅'};
    inner = `<div class="coll-grid">${all.map(n=>{const has=p.collectibles.some(c=>c.name===n);
      return `<div class="coll-item ${has?'':'locked'}"><div class="ce">${has?(p.collectibles.find(c=>c.name===n)||{}).emoji||emo[n]:'❔'}</div><b style="font-size:13px">${n}</b><br><small>${has?'Collected! ⭐':'Keep exploring…'}</small></div>`;}).join('')}</div>`;
  } else if(t==='world'){
    inner = `<div class="coll-grid">${p.worldItems.map(w=>`<div class="coll-item"><div class="ce">${w.emoji}</div><b style="font-size:13px">${esc(w.name)}</b><br><small>Placed in your world 🏡</small></div>`).join('')}</div>
    <div class="card" style="margin-top:10px">🏡 <b>Home base showcase:</b> ${p.worldItems.map(w=>w.emoji).join(' ')}</div>`;
  } else {
    inner = JOURNEYS.map(j=>{const done=j.steps.filter(s=>p.completedMissions.includes(s));
      return `<div class="card" style="margin-bottom:10px"><b>${j.emoji} ${j.name}</b> — ${done.length}/${j.steps.length}
      <div class="journey" style="margin-top:8px">${j.steps.map((s,i)=>{const m=getMission(s);const d=p.completedMissions.includes(s);
        return `${i>0?'<span class="arr" style="color:var(--ink-soft)">→</span>':''}<span class="jn ${d?'done':''}">${d?'✅ ':''}${m?esc(missionShort(m)):s}</span>`;}).join('')}</div></div>`;}).join('');
  }
  return `<div class="screen"><div class="hero-card"><h2>🎒 ${esc(p.name)}'s Collection</h2>
    <p style="font-weight:700;color:var(--ink-soft)">${p.collectibles.length} treasures · ${p.worldItems.length} world wonders</p>
    <div class="chipset" style="margin-top:10px">
      <button class="chip ${t==='collect'?'on':''}" onclick="S.collTab='collect';render()">🎁 Collectibles</button>
      <button class="chip ${t==='world'?'on':''}" onclick="S.collTab='world';render()">🏡 World Items</button>
      <button class="chip ${t==='paths'?'on':''}" onclick="S.collTab='paths';render()">🛤️ Paths</button>
    </div></div><div style="height:12px"></div>${inner}</div>`;
}

/* ================= PROFILE ================= */
function profileHTML(){
  const p = S.profile;
  const lvl = levelOf(p.xp);
  const base = (lvl-1)*150, pct = Math.round((p.xp-base)/150*100);
  const skills = Object.entries(p.skills).sort((a,b)=>b[1]-a[1]);
  return `<div class="screen"><div class="hero-card" style="text-align:center">
      <div style="font-size:80px">${p.avatar}</div>
      <h2 style="font-size:28px">${esc(p.name)}, Level ${lvl} Explorer!</h2>
      <div style="background:#eee8ff;border-radius:99px;height:18px;overflow:hidden;margin:10px 0;border:3px solid #e2d7ff"><i style="display:block;height:100%;width:${pct}%;background:linear-gradient(90deg,#8f72ff,#00c2a8);border-radius:99px"></i></div>
      <b>${p.xp} XP · ${150-(p.xp-base)} to Level ${lvl+1}</b>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:10px;flex-wrap:wrap">
        <span class="pill coins">🪙 ${p.coins} coins</span><span class="pill streak">🔥 ${p.streak} learning days</span><span class="pill">✅ ${p.completedMissions.length} missions</span>
      </div></div>
    <div class="section-title">🌱 My skills are growing</div>
    <div class="card">${skills.map(([k,v])=>`<div class="skill-row"><span class="nm">${GOAL_EMOJI[k]||'⭐'} ${k}</span><div class="bar"><i style="width:${v}%"></i></div><b>${v}</b></div>`).join('')}</div>
    <div class="section-title">❤️ What I love</div>
    <div class="card"><div class="chipset">${p.interestList.map(i=>`<span class="chip on">${INTEREST_EMOJI[i]||'⭐'} ${esc(i)} · ${p.interests[i]||50}</span>`).join('')}</div></div>
    <div class="section-title">🏡 My world</div>
    <div class="card" style="font-size:30px">${p.worldItems.map(w=>`<span title="${esc(w.name)}">${w.emoji}</span>`).join(' ')}</div>
  </div>`;
}

/* ================= OVERLAYS / FX ================= */
function showOverlay(html){ document.getElementById('overlay-root').innerHTML = `<div class="overlay" onclick="if(event.target===this)closeOverlay()">${html}</div>`; }
function closeOverlay(){ document.getElementById('overlay-root').innerHTML=''; }
function confirmModal(title,sub,keep,go,onGo){
  window._cfGo = onGo;
  showOverlay(`<div class="modal" style="text-align:center"><h2>${esc(title)}</h2><p style="font-weight:600;color:var(--ink-soft)">${esc(sub)}</p>
  <div class="btn-row" style="justify-content:center;margin-top:14px"><button class="btn ghost" onclick="closeOverlay()">${esc(keep)}</button><button class="btn pink" onclick="closeOverlay();window._cfGo()">${esc(go)}</button></div></div>`);
}
function toast(msg){
  const r = document.getElementById('toast-root');
  const t = document.createElement('div'); t.className='toast'; t.textContent=msg; r.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity .4s';setTimeout(()=>t.remove(),400);},2600);
}
function flyText(txt){
  const f = document.createElement('div'); f.className='xp-fly'; f.textContent=txt;
  f.style.left = (30+Math.random()*40)+'vw'; f.style.top='38vh';
  document.body.appendChild(f); setTimeout(()=>f.remove(),1450);
}
function confettiBurst(n){
  const colors = ['#ff5d8f','#ffbf2e','#00c2a8','#7c5cff','#2fb9ff','#34d399'];
  for(let i=0;i<(n||40);i++){
    const c = document.createElement('div'); c.className='confetti';
    c.textContent = Math.random()<.4?'⭐':['🎉','✨','🎊','💎'][Math.floor(Math.random()*4)];
    c.style.left = Math.random()*100+'vw';
    c.style.fontSize = (12+Math.random()*18)+'px';
    c.style.animationDuration = (1.6+Math.random()*1.6)+'s';
    document.body.appendChild(c); setTimeout(()=>c.remove(),3400);
  }
}

/* ================= INIT ================= */
window.addEventListener('load', ()=>{ S = load(); render(); });
