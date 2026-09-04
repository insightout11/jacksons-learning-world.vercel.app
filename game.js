/* ================= MATH BATTLE (voxel-inspired mini-game) ================= */
let G = null;
const MOBS = [
  [{n:'Cave Crawler', e:'🕷️', hp:3},{n:'Moss Slime', e:'🟢', hp:3}],
  [{n:'Lava Imp', e:'👹', hp:3},{n:'Stone Golem', e:'🗿', hp:3}],
  [{n:'Ender Bat', e:'🦇', hp:2},{n:'Crystal Spider', e:'🕷️', hp:2}],
  [{n:'Magma Brute', e:'🦍', hp:2},{n:'Storm Wraith', e:'👻', hp:2}],
  [{n:'THE MOB KING', e:'🐲', hp:3},{n:'Shadow Dragon', e:'🐉', hp:2}],
];
const LVL_NAMES = ['Meadow Edge — Add & Subtract','Creeper Caves — Times Tables','Deep Mines — Type It!','Lava Core — Mixed Ops','Dragon Lair — Lightning Round'];
const rnd = (a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const pick = arr=>arr[Math.floor(Math.random()*arr.length)];

function startBattle(missionId){
  G = {missionId, lvl:0, mob:0, mobHp:MOBS[0][0].hp, playerHp:5, maxPlayer:5,
       combo:0, best:0, correct:0, asked:0, typed:'', q:null, lock:false, over:false, timerId:null, timeLeft:0};
  nextQuestion();
}
function mob(){ if(!G||!MOBS[G.lvl]||!MOBS[G.lvl][G.mob]) return {n:'Mob', e:'👾', hp:3}; return MOBS[G.lvl][G.mob]; }
function lvlCfg(l){
  if(l===0) return {mode:'mc', n:3};
  if(l===1) return {mode:'mc', n:4};
  return {mode:'type'};
}
function genQ(){
  const l = (G&&typeof G.lvl==='number')?G.lvl:0; let a,b,op,ans,text;
  if(l===0){ a=rnd(2,9); b=rnd(2,9); if(Math.random()<.5||a<b){op='+';ans=a+b;text=`${a} + ${b}`;} else {op='−'; if(b>a){const t=a;a=b;b=t;} ans=a-b; text=`${a} − ${b}`;} }
  else if(l===1){ a=rnd(2,6); b=rnd(2,6); ans=a*b; text=`${a} × ${b}`; }
  else if(l===2){ a=rnd(3,9); b=rnd(3,9); ans=a*b; text=`${a} × ${b}`; }
  else if(l===3){ const k=rnd(0,2); if(k===0){a=rnd(4,12);b=rnd(3,9); if(b>a){const t=a;a=b;b=t;} ans=a-b; text=`${a} − ${b}`;} else if(k===1){a=rnd(4,9);b=rnd(4,9);ans=a*b;text=`${a} × ${b}`;} else {a=rnd(6,14);b=rnd(3,8);ans=a+b;text=`${a} + ${b}`;} }
  else { const k=rnd(0,2); if(k===0){a=rnd(6,12);b=rnd(6,12);ans=a*b;text=`${a} × ${b}`;} else if(k===1){a=rnd(8,20);b=rnd(4,9);ans=a+b;text=`${a} + ${b}`;} else {a=rnd(9,18);b=rnd(4,12);ans=a-b;text=`${a} − ${b}`;} }
  const q = {text, ans, hint:makeHint(text,ans)};
  const cfg = lvlCfg(l);
  if(cfg.mode==='mc'){
    const set = new Set([ans]);
    while(set.size<cfg.n){ const d = ans + pick([-3,-2,-1,1,2,3,4,-4,5,-5,10]); if(d>=0) set.add(d); }
    q.options = [...set].sort(()=>Math.random()-.5);
  }
  return q;
}
function makeHint(text,ans){
  const hints = [
    `Scout whispers: the answer is ${ans > 10 ? 'bigger than 10' : 'smaller than 10'}...`,
    `Try it: ${text} = ? Count it out, warrior!`,
    `Scout: break it apart — solve a smaller piece first!`,
  ];
  return pick(hints);
}
function nextQuestion(){
  if(!G||G.over) return;
  stopTimer();
  G.q = genQ(); G.typed=''; G.lock=false; G.asked++;
  if(G.lvl===4){ G.timeLeft=25; startTimer(); }
  refreshBattle();
}
function startTimer(){
  stopTimer();
  G.timerId = setInterval(()=>{
    G.timeLeft--;
    const el = document.getElementById('timer-fill');
    const tx = document.getElementById('timer-txt');
    if(el) el.style.width = (G.timeLeft/25*100)+'%';
    if(tx) tx.textContent = G.timeLeft+'s';
    if(G.timeLeft<=0){ stopTimer(); onWrong(true); }
  },1000);
}
function stopTimer(){ if(G && G.timerId){ clearInterval(G.timerId); G.timerId=null; } }

function numPad(d){ if(!G||G.lock||G.over) return; if(G.typed.length>=3) return; G.typed+=d; refreshBattle(true); }
function numClear(){ if(!G||G.lock) return; G.typed=''; refreshBattle(true); }
function numBack(){ if(!G||G.lock) return; G.typed=G.typed.slice(0,-1); refreshBattle(true); }

function battleMC(i){
  if(!G||G.lock||G.over) return;
  G.lock = true;
  const ok = (G.q.options[i]===G.q.ans);
  markOptions(i, ok);
  setTimeout(()=>{ if(!G||G.over) return; ok ? onCorrect() : onWrong(false); }, ok?650:1100);
}
function battleType(){
  if(!G||G.lock||G.over) return;
  if(G.typed==='') { toast('Type your answer first, warrior! ⚔️'); return; }
  G.lock = true;
  const ok = (parseInt(G.typed,10)===G.q.ans);
  const panel = document.getElementById('typed-feedback');
  if(panel){ panel.innerHTML = ok
    ? `<div class="feedback good">⚔️ ${G.q.text} = <b>${G.q.ans}</b> — DIRECT HIT!</div>`
    : `<div class="feedback bad">🛡️ Not quite — ${G.q.text} = ? ${G.q.hint}</div>`; }
  setTimeout(()=>{ if(!G||G.over) return; ok ? onCorrect() : onWrong(false); }, ok?650:1400);
}
function onCorrect(){
  if(!G||G.over) return;
  stopTimer();
  G.correct++; G.combo++; G.best=Math.max(G.best,G.combo);
  G.mobHp--;
  animateHit('mob');
  flyText('+1 HIT! ⚔️');
  if(G.combo>=2) setTimeout(()=>flyText(`🔥 COMBO x${G.combo}!`),350);
  if(G.mobHp<=0){ mobDefeated(); return; } else { setTimeout(nextQuestion, 700); }
  refreshBattle();
}
function onWrong(timeout){
  if(!G||G.over) return;
  logEvent('retry',{mission:G.missionId, kind:'math', lvl:G.lvl});
  stopTimer();
  G.combo = 0; G.playerHp--;
  animateHit('hero');
  const panel = document.getElementById('q-feedback');
  if(panel){ panel.innerHTML = `<div class="feedback bad">${timeout?'⏰ Time! ':''}Good try! ${G.q.hint} The mob wiggles... strike again!</div>`; }
  refreshBattle(true);
  if(G.playerHp<=0){
    G.playerHp = G.maxPlayer;
    setTimeout(()=>{ toast('🛡️ Scout shields you! Back to full hearts!'); }, 900);
  }
  setTimeout(()=>{ if(G && !G.over){ G.q = genQ(); G.typed=''; G.lock=false; if(G.lvl===4){G.timeLeft=25; startTimer();} refreshBattle(); } }, timeout?1200:1700);
}
function animateHit(who){
  const el = document.getElementById(who==='mob'?'mob-sprite':'hero-sprite');
  if(!el) return;
  el.classList.remove('hit-mob','atk');
  void el.offsetWidth;
  el.classList.add(who==='mob'?'hit-mob':'atk');
  const hs = document.getElementById('hero-sprite');
  if(who==='mob' && hs){ hs.classList.remove('atk'); void hs.offsetWidth; hs.classList.add('atk'); }
}
function mobDefeated(){
  const m = mob();
  const bonus = 10 + G.lvl*5 + Math.min(G.combo,5)*2;
  S.profile.coins += bonus;
  toast(`${m.e} defeated! +${bonus} coins!`);
  confettiBurst(30);
  G.mob++;
  if(G.mob >= MOBS[G.lvl].length){
    G.mob = 0; G.lvl++;
    if(G.lvl>=5){ victory(); return; }
    G.mobHp = mob().hp;
    levelUpOverlay();
    return;
  }
  G.mobHp = mob().hp;
  save();
  setTimeout(nextQuestion, 900);
  refreshBattle();
}
function levelUpOverlay(){
  stopTimer();
  showOverlay(`<div class="modal" style="text-align:center">
    <div style="font-size:64px">🎉</div>
    <h2>Level ${G.lvl} cleared!</h2>
    <p style="font-weight:700;color:var(--ink-soft)">Next: <b>${LVL_NAMES[G.lvl]}</b></p>
    <div class="lvl-dots">${[0,1,2,3,4].map(i=>`<i class="${i<G.lvl?'on':''}"></i>`).join('')}</div>
    <br><button class="btn green big" onclick="closeOverlay();nextQuestion()">Charge! ⚔️</button>
  </div>`);
  save(); refreshBattle();
}
function victory(){
  stopTimer();
  G.over = true;
  const m = getMission(G.missionId);
  S.profile.mathBest = Math.max(S.profile.mathBest||0, G.correct);
  save();
  confettiBurst(120);
  showOverlay(`<div class="modal" style="text-align:center">
    <div style="font-size:72px">👑</div>
    <h2>VICTORY, Math Warrior!</h2>
    <p style="font-weight:700;color:var(--ink-soft)">Every mob defeated — the diamond cave is YOURS.</p>
    <div class="loot-grid">
      <div class="loot"><div class="le">💎</div><b>Diamond Shard</b><small>Collectible</small></div>
      <div class="loot" style="animation-delay:.15s"><div class="le">🏟️</div><b>Blocky Arena</b><small>World item</small></div>
      <div class="loot" style="animation-delay:.3s"><div class="le">⚔️</div><b>${G.correct}/${G.asked} hits</b><small>Best combo x${G.best}</small></div>
    </div>
    <button class="btn big" onclick="closeOverlay();finishBattle()">Claim Loot 💰</button>
  </div>`);
}
function fleeBattle(){
  stopTimer();
  confirmModal('Leave the battle?', 'Your progress in this fight will reset, but you can try again anytime!', 'Keep Fighting ⚔️', 'Leave', ()=>{
    G=null; R.step='intro'; render();
  });
}

function battleHTML(){
  if(!G) return '';
  const m = mob(), cfg = lvlCfg(G.lvl);
  const lvlName = (LVL_NAMES[G.lvl]||'Battle').split('—')[0];
  const mobPct = Math.max(0, G.mobHp / m.hp * 100);
  const hpPct = Math.max(0, G.playerHp / G.maxPlayer * 100);
  const hearts = '❤️'.repeat(G.playerHp) + '🤍'.repeat(Math.max(0,G.maxPlayer-G.playerHp));
  let qbox = '';
  if(cfg.mode==='mc'){
    qbox = `<div id="q-feedback"></div>
      ${G.q.options.map((o,i)=>`<button class="opt" id="opt-${i}" onclick="battleMC(${i})">${o}</button>`).join('')}`;
  } else {
    qbox = `<div id="typed-feedback"></div>
      <div style="display:flex;gap:8px;align-items:center;margin:8px 0">
        <div style="flex:1;background:#f7f4ff;border:3px solid #e6defc;border-radius:14px;padding:10px;font-family:var(--child-font);font-size:26px;text-align:center;min-height:30px">${G.typed===''?'?':G.typed}</div>
        <button class="btn orange" onclick="battleType()">Strike! ⚔️</button>
      </div>
      <div class="num-pad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button onclick="numPad('${n}')">${n}</button>`).join('')}
        <button onclick="numClear()">⌫</button><button onclick="numPad('0')">0</button><button onclick="numBack()">←</button>
      </div>
      <div id="q-feedback"></div>`;
  }
  return `<div class="battle">
    <div style="padding:14px 16px 0;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <button class="btn ghost" style="padding:8px 14px;font-size:14px" onclick="fleeBattle()">← Flee</button>
      <div style="font-family:var(--child-font);font-weight:700">Level ${Math.min(G.lvl+1,5)}/5 · ${lvlName}</div>
      ${G.lvl===4?`<div style="margin-left:auto;background:rgba(0,0,0,.5);border-radius:99px;padding:4px 12px;font-weight:900" >⏰ <span id="timer-txt">${G.timeLeft}s</span></div>`:''}
      <div class="combo" style="margin-left:${G.lvl===4?'0':'auto'}">${G.combo>=2?'🔥 COMBO x'+G.combo:''}</div>
    </div>
    <div class="lvl-dots">${[0,1,2,3,4].map(i=>`<i class="${i<=G.lvl?'on':''}"></i>`).join('')}</div>
    ${G.lvl===4?`<div style="margin:0 16px;height:8px;background:rgba(0,0,0,.4);border-radius:99px;overflow:hidden"><i id="timer-fill" style="display:block;height:100%;width:${G.timeLeft/25*100}%;background:linear-gradient(90deg,#ffbf2e,#ef4444)"></i></div>`:''}
    <div class="battle-arena">
      <div class="fighter">
        <div class="sprite hero-idle" id="hero-sprite">${S.profile.avatar}</div>
        <div style="font-weight:900;font-family:var(--child-font)">${S.profile.name}</div>
        <div class="hpbar ${hpPct<=40?'low':''}"><i style="width:${hpPct}%"></i></div>
        <div style="font-size:12px">${hearts}</div>
      </div>
      <div style="font-size:40px;animation:scoutBob 1s infinite">💥</div>
      <div class="fighter">
        <div class="sprite" id="mob-sprite">${m.e}</div>
        <div style="font-weight:900;font-family:var(--child-font)">${m.n}</div>
        <div class="hpbar mob"><i style="width:${mobPct}%"></i></div>
        <div style="font-size:12px;font-weight:800">${'●'.repeat(G.mobHp)}${'○'.repeat(Math.max(0,m.hp-G.mobHp))} hits left</div>
      </div>
    </div>
    <div class="q-panel">
      <div style="text-align:center;font-family:var(--child-font);font-size:34px;font-weight:700">${G.q.text} = ?</div>
      ${qbox}
    </div>
  </div>`;
}
function refreshBattle(keepFeedback){
  if(!G) return;
  const root = document.getElementById('battle-root');
  if(!root) return;
  const fb = keepFeedback ? document.getElementById('q-feedback')?.innerHTML : null;
  const tf = keepFeedback ? document.getElementById('typed-feedback')?.innerHTML : null;
  root.innerHTML = battleHTML();
  if(fb){ const el=document.getElementById('q-feedback'); if(el) el.innerHTML=fb; }
  if(tf){ const el=document.getElementById('typed-feedback'); if(el) el.innerHTML=tf; }
}
function markOptions(chosen, ok){
  for(let i=0;i<G.q.options.length;i++){
    const b = document.getElementById('opt-'+i);
    if(!b) continue;
    b.disabled = true;
    if(G.q.options[i]===G.q.ans) b.classList.add('correct');
    else if(i===chosen) b.classList.add('wrong');
    else b.style.opacity=.55;
  }
  const fb = document.getElementById('q-feedback');
  if(fb) fb.innerHTML = ok
    ? `<div class="feedback good">⚔️ <b>${G.q.ans}</b> — DIRECT HIT! The mob staggers!</div>`
    : `<div class="feedback bad">🛡️ Not quite! ${G.q.hint}</div>`;
}
