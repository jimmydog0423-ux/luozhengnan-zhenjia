(() => {
  "use strict";

  const body = document.getElementById("modalBody");
  const overlay = document.getElementById("modalOverlay");
  const modalCard = document.getElementById("modalCard");
  if (!body || !overlay) return;

  const W = 960;
  const H = 600;
  const BOSS_MAX_HP = 1650;
  const PLAYER_MAX_HP = 5;
  const PLAYER_MIN_Y = 215;
  const PLAYER_R = 9;

  let session = null;
  let scheduled = false;
  let bridgeMode = false;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const dist2 = (ax, ay, bx, by) => {
    const dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  };

  function legacyBossOpen() {
    if (!overlay.classList.contains("show")) return false;
    if (body.querySelector(".overload-boss-v2")) return false;
    const panel = body.querySelector(".boss-panel");
    const title = panel?.querySelector("h2")?.textContent || "";
    return !!panel && /超負荷/.test(title) && !!body.querySelector("[data-side]");
  }

  function stopSession() {
    const s = session;
    if (!s) return;
    s.dead = true;
    if (s.raf) cancelAnimationFrame(s.raf);
    if (s.keyDown) document.removeEventListener("keydown", s.keyDown, true);
    if (s.keyUp) document.removeEventListener("keyup", s.keyUp, true);
    if (s.visibility) document.removeEventListener("visibilitychange", s.visibility);
    session = null;
    modalCard?.classList.remove("overload-boss-card");
  }

  function makeLegacyFragment() {
    const frag = document.createDocumentFragment();
    while (body.firstChild) frag.appendChild(body.firstChild);
    return frag;
  }

  function takeover() {
    if (bridgeMode || session || !legacyBossOpen()) return;

    const legacy = makeLegacyFragment();
    modalCard?.classList.add("overload-boss-card");
    body.innerHTML = `
      <div class="overload-boss-v2" data-phase="1" data-playing="0">
        <div class="ob2-head">
          <div>
            <div class="eyebrow">BOSS · BULLET HELL</div>
            <h2>大肥哥超負荷</h2>
          </div>
          <div class="ob2-phase-label"><span>PHASE</span><b data-phase-label>1 / 3</b></div>
        </div>

        <div class="ob2-bossbar">
          <div class="ob2-bossbar-top"><span>OVERLOAD</span><b data-boss-hp>${BOSS_MAX_HP}</b></div>
          <div class="ob2-bar"><i data-boss-bar style="width:100%"></i></div>
        </div>

        <div class="ob2-arena-wrap">
          <div class="ob2-boss-visual" aria-hidden="true">
            <svg viewBox="0 0 300 380"><use href="assets/art.svg#portrait-overload" width="300" height="380"></use></svg>
          </div>
          <canvas class="ob2-canvas" width="${W}" height="${H}" aria-label="超負荷彈幕 Boss 戰"></canvas>
          <div class="ob2-attack-banner" data-attack>準備戰鬥</div>
          <div class="ob2-phase-banner" data-phase-banner></div>
          <div class="ob2-countdown" data-countdown>
            <div class="ob2-ready">
              <b>超負荷開始過載</b>
              <span>滑鼠／觸控移動 · 方向鍵可輔助 · 反擊槽滿後按 Space 清彈反擊</span>
              <button type="button" class="primary" data-start>開始戰鬥</button>
            </div>
          </div>
        </div>

        <div class="ob2-status">
          <div class="ob2-player-hp"><span>羅正男</span><b data-hearts>♥ ♥ ♥ ♥ ♥</b></div>
          <div class="ob2-graze"><div><span>反擊槽</span><b data-graze-label>0%</b></div><div class="ob2-bar"><i data-graze-bar style="width:0%"></i></div></div>
          <div class="ob2-score"><span>SCORE</span><b data-score>000000</b></div>
          <div class="ob2-graze-count"><span>GRAZE</span><b data-graze-count>0</b></div>
        </div>
      </div>`;

    const root = body.querySelector(".overload-boss-v2");
    const canvas = root?.querySelector("canvas");
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !ctx) {
      body.innerHTML = "";
      body.appendChild(legacy);
      return;
    }

    const playerImg = new Image();
    playerImg.src = "assets/characters/luozhengnan.webp";

    const s = {
      root, canvas, ctx, legacy, playerImg,
      dead:false, raf:0, started:false, paused:false, finished:false,
      last:performance.now(), elapsed:0, fightTime:0, countdownActive:false,
      bossHp:BOSS_MAX_HP, phase:1, phasePause:0,
      player:{x:W/2,y:H-85,targetX:W/2,targetY:H-85,hp:PLAYER_MAX_HP,inv:0,speed:335},
      keys:{left:false,right:false,up:false,down:false,slow:false},
      bullets:[], shots:[], lasers:[], particles:[],
      pattern:null, patternIndex:0,
      shotCd:0, graze:0, grazeCount:0, score:0,
      shake:0, flash:0,
      keyDown:null,keyUp:null,visibility:null
    };
    session = s;

    bindControls(s);
    updateHud(s);
    draw(s);
    root.querySelector("[data-start]")?.addEventListener("click", () => beginCountdown(s), {once:true});
    window.GameAudio?.setMode?.("boss", {force:true, restart:true});
  }

  function bindControls(s) {
    const pointToGame = ev => {
      const r = s.canvas.getBoundingClientRect();
      const x = (ev.clientX - r.left) * W / Math.max(1, r.width);
      const y = (ev.clientY - r.top) * H / Math.max(1, r.height);
      s.player.targetX = clamp(x, 24, W-24);
      s.player.targetY = clamp(y, PLAYER_MIN_Y, H-28);
    };

    s.canvas.addEventListener("pointerdown", ev => {
      ev.preventDefault();
      s.canvas.setPointerCapture?.(ev.pointerId);
      pointToGame(ev);
    });
    s.canvas.addEventListener("pointermove", ev => {
      if (ev.pointerType === "mouse" || ev.buttons) pointToGame(ev);
    });
    s.canvas.addEventListener("pointerup", ev => {
      try { s.canvas.releasePointerCapture?.(ev.pointerId); } catch (_) {}
    });
    s.canvas.addEventListener("contextmenu", ev => { ev.preventDefault(); tryCounter(s); });

    s.keyDown = ev => {
      if (!session || session !== s || s.finished) return;
      const k = ev.key.toLowerCase();
      if (["arrowleft","arrowright","arrowup","arrowdown","a","d","w","s","shift"," "].includes(k)) ev.preventDefault();
      if (k === "arrowleft" || k === "a") s.keys.left = true;
      if (k === "arrowright" || k === "d") s.keys.right = true;
      if (k === "arrowup" || k === "w") s.keys.up = true;
      if (k === "arrowdown" || k === "s") s.keys.down = true;
      if (k === "shift") s.keys.slow = true;
      if (k === " " && s.started && !ev.repeat) tryCounter(s);
    };
    s.keyUp = ev => {
      const k = ev.key.toLowerCase();
      if (k === "arrowleft" || k === "a") s.keys.left = false;
      if (k === "arrowright" || k === "d") s.keys.right = false;
      if (k === "arrowup" || k === "w") s.keys.up = false;
      if (k === "arrowdown" || k === "s") s.keys.down = false;
      if (k === "shift") s.keys.slow = false;
    };
    document.addEventListener("keydown", s.keyDown, true);
    document.addEventListener("keyup", s.keyUp, true);

    s.visibility = () => { s.paused = document.hidden; s.last = performance.now(); };
    document.addEventListener("visibilitychange", s.visibility);
  }

  function beginCountdown(s) {
    if (!s || s.dead || s.started || s.countdownActive) return;
    s.countdownActive = true;
    const box = s.root.querySelector("[data-countdown]");
    if (!box) return;
    const seq = ["3","2","1","FIGHT"];
    seq.forEach((text, i) => {
      setTimeout(() => {
        if (!session || session !== s || s.dead) return;
        box.innerHTML = `<strong>${text}</strong>`;
        box.classList.remove("pulse");
        void box.offsetWidth;
        box.classList.add("pulse");
        if (i < 3) window.GameAudio?.playConfirm?.();
        if (text === "FIGHT") setTimeout(() => startFight(s), 430);
      }, i * 720);
    });
  }

  function startFight(s) {
    if (!s || s.dead || session !== s) return;
    s.started = true;
    s.countdownActive = false;
    s.root.dataset.playing = "1";
    s.root.querySelector("[data-countdown]")?.classList.add("hide");
    setAttackText(s, "嘴砲扇形");
    choosePattern(s, true);
    s.last = performance.now();
    s.raf = requestAnimationFrame(now => frame(s, now));
  }

  function frame(s, now) {
    if (!s || s.dead || session !== s || !document.contains(s.root)) { stopSession(); return; }
    if (!s.started || s.finished) return;
    if (s.paused) { s.raf = requestAnimationFrame(n => frame(s,n)); return; }

    const dt = clamp((now - s.last) / 1000, 0, 0.034);
    s.last = now;
    s.elapsed += dt;
    s.fightTime += dt;
    s.player.inv = Math.max(0, s.player.inv - dt);
    s.shake = Math.max(0, s.shake - dt * 12);
    s.flash = Math.max(0, s.flash - dt * 4.5);

    movePlayer(s, dt);
    autoShoot(s, dt);

    if (s.phasePause > 0) {
      s.phasePause -= dt;
      if (s.phasePause <= 0) choosePattern(s, true);
    } else {
      updatePattern(s, dt);
    }

    updateShots(s, dt);
    updateBullets(s, dt);
    updateLasers(s, dt);
    updateParticles(s, dt);
    checkPhase(s);
    updateHud(s);
    draw(s);

    if (s.player.hp <= 0) { loseFight(s); return; }
    if (s.bossHp <= 0) { winFight(s); return; }
    s.raf = requestAnimationFrame(n => frame(s, n));
  }

  function movePlayer(s, dt) {
    const p = s.player;
    let dx = 0, dy = 0;
    if (s.keys.left) dx--;
    if (s.keys.right) dx++;
    if (s.keys.up) dy--;
    if (s.keys.down) dy++;

    if (dx || dy) {
      const len = Math.hypot(dx,dy) || 1;
      const spd = p.speed * (s.keys.slow ? 0.44 : 1);
      p.x += dx / len * spd * dt;
      p.y += dy / len * spd * dt;
      p.targetX = p.x; p.targetY = p.y;
    } else {
      const lerp = 1 - Math.exp(-dt * (s.keys.slow ? 5.5 : 10.5));
      p.x += (p.targetX - p.x) * lerp;
      p.y += (p.targetY - p.y) * lerp;
    }
    p.x = clamp(p.x, 24, W-24);
    p.y = clamp(p.y, PLAYER_MIN_Y, H-28);
  }

  function autoShoot(s, dt) {
    s.shotCd -= dt;
    if (s.phasePause > 0) return;
    const interval = 0.092;
    while (s.shotCd <= 0) {
      s.shotCd += interval;
      const p = s.player;
      const aim = clamp((W/2 - p.x) * 0.17, -90, 90);
      s.shots.push({x:p.x-7,y:p.y-24,vx:aim-18,vy:-610,r:3,damage:3.1});
      s.shots.push({x:p.x+7,y:p.y-24,vx:aim+18,vy:-610,r:3,damage:3.1});
    }
  }

  function updateShots(s, dt) {
    const bossX = W/2;
    for (let i=s.shots.length-1; i>=0; i--) {
      const q = s.shots[i];
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.y < 145 && Math.abs(q.x-bossX) < 116) {
        s.bossHp = Math.max(0, s.bossHp - q.damage);
        s.score += 12;
        if (Math.random() < .35) spark(s,q.x,q.y,"hit",2);
        s.shots.splice(i,1);
      } else if (q.y < -20 || q.x < -30 || q.x > W+30) s.shots.splice(i,1);
    }
  }

  function choosePattern(s, first=false) {
    const pools = {
      1:["fan","aimed","rain"],
      2:["ring","wall","aimed","laser"],
      3:["spiral","laser","wall","ring","frenzy"]
    };
    const pool = pools[s.phase];
    let type = pool[s.patternIndex % pool.length];
    if (!first && s.pattern?.type === type) type = pool[(s.patternIndex+1)%pool.length];
    s.patternIndex++;
    s.pattern = {type,t:0,next:0,duration:patternDuration(type,s.phase),spin:rand(0,Math.PI*2),wave:0};
    setAttackText(s, attackName(type));
  }

  function patternDuration(type, phase) {
    const base = {fan:4.3,aimed:4.1,rain:4.5,ring:4.4,wall:4.7,laser:5.0,spiral:5.1,frenzy:5.0}[type] || 4.2;
    return phase === 3 ? base * .92 : base;
  }

  function attackName(type) {
    return ({fan:"嘴砲扇形",aimed:"鎖定嘴砲",rain:"聊天室暴雨",ring:"過載環爆",wall:"左右封鎖牆",laser:"紅線封鎖",spiral:"失控螺旋",frenzy:"全頻過載"})[type] || "過載攻擊";
  }

  function updatePattern(s, dt) {
    const p = s.pattern;
    if (!p) return choosePattern(s,true);
    p.t += dt;
    p.next -= dt;
    const harder = s.phase === 3 ? 1.18 : s.phase === 2 ? 1.07 : 1;

    if (p.type === "fan" && p.next <= 0) {
      p.next = .56 / harder;
      const count = s.phase >= 2 ? 11 : 9;
      const base = Math.PI/2 + Math.sin(p.t*.9)*.2;
      for (let i=0;i<count;i++) {
        const a = base + (i-(count-1)/2)*.105;
        spawnBullet(s,W/2,118,Math.cos(a)*175*harder,Math.sin(a)*175*harder,7,"orb");
      }
    }

    if (p.type === "aimed" && p.next <= 0) {
      p.next = .72 / harder;
      const a = Math.atan2(s.player.y-110,s.player.x-W/2);
      [-.18,-.09,0,.09,.18].forEach(o => spawnBullet(s,W/2,112,Math.cos(a+o)*235*harder,Math.sin(a+o)*235*harder,6,"aim"));
      if (s.phase >= 2) spawnBullet(s,W/2,112,Math.cos(a)*190,Math.sin(a)*190,9,"homing",.42);
    }

    if (p.type === "rain" && p.next <= 0) {
      p.next = .14 / harder;
      const x = rand(30,W-30);
      const sway = Math.sin(p.t*3.7+x*.01)*35;
      spawnBullet(s,x,-16,sway,rand(175,235)*harder,5,Math.random()<.18?"fast":"rain");
    }

    if (p.type === "ring" && p.next <= 0) {
      p.next = .82 / harder;
      const count = s.phase === 3 ? 24 : 18;
      p.spin += .23;
      for (let i=0;i<count;i++) {
        const a = p.spin + i*Math.PI*2/count;
        spawnBullet(s,W/2,120,Math.cos(a)*150*harder,Math.sin(a)*150*harder,6,"ring");
      }
    }

    if (p.type === "wall" && p.next <= 0) {
      p.next = .66 / harder;
      p.wave++;
      const fromLeft = p.wave % 2 === 0;
      const gap = Math.floor(rand(1,5));
      for (let row=0; row<6; row++) {
        if (row === gap || row === gap-1) continue;
        const y = PLAYER_MIN_Y + row*66;
        spawnBullet(s,fromLeft?-20:W+20,y,fromLeft?210*harder:-210*harder,Math.sin(row+p.t)*10,8,"wall");
      }
    }

    if (p.type === "laser" && p.next <= 0) {
      p.next = 1.38 / harder;
      const width = s.phase === 3 ? 54 : 46;
      s.lasers.push({x:clamp(s.player.x+rand(-135,135),55,W-55),w:width,t:0,telegraph:.72,active:.62,hit:false});
    }

    if (p.type === "spiral" && p.next <= 0) {
      p.next = .075 / harder;
      p.spin += .23;
      const a = p.spin;
      spawnBullet(s,W/2,118,Math.cos(a)*175*harder,Math.sin(a)*175*harder,5,"spiral");
      if ((p.wave++ % 5) === 0) spawnBullet(s,W/2,118,Math.cos(-a)*145*harder,Math.sin(-a)*145*harder,5,"spiral2");
    }

    if (p.type === "frenzy" && p.next <= 0) {
      p.next = .22;
      p.spin += .37;
      const a = p.spin;
      for (const o of [-.36,0,.36]) spawnBullet(s,W/2,118,Math.cos(a+o)*205,Math.sin(a+o)*205,6,"frenzy");
      if ((p.wave++ % 4) === 0) {
        const x = rand(40,W-40);
        spawnBullet(s,x,-15,rand(-25,25),240,5,"fast");
      }
      if (p.wave % 13 === 0) s.lasers.push({x:rand(70,W-70),w:48,t:0,telegraph:.62,active:.52,hit:false});
    }

    if (p.t >= p.duration) choosePattern(s);
  }

  function spawnBullet(s,x,y,vx,vy,r,kind,turn=0) {
    s.bullets.push({x,y,vx,vy,r,kind,turn,grazed:false,age:0});
  }

  function updateBullets(s, dt) {
    const p = s.player;
    for (let i=s.bullets.length-1;i>=0;i--) {
      const b=s.bullets[i]; b.age += dt;
      if (b.turn) {
        const current = Math.atan2(b.vy,b.vx);
        const target = Math.atan2(p.y-b.y,p.x-b.x);
        let diff = ((target-current+Math.PI*3)%(Math.PI*2))-Math.PI;
        const a = current + clamp(diff,-b.turn*dt,b.turn*dt);
        const sp = Math.hypot(b.vx,b.vy);
        b.vx=Math.cos(a)*sp; b.vy=Math.sin(a)*sp;
      }
      b.x += b.vx*dt; b.y += b.vy*dt;

      const hitR = PLAYER_R + b.r*.72;
      const d2 = dist2(b.x,b.y,p.x,p.y);
      if (!b.grazed && d2 < (hitR+24)*(hitR+24) && d2 > hitR*hitR) {
        b.grazed=true; s.grazeCount++; s.graze=clamp(s.graze+2.7,0,100); s.score+=35;
        spark(s,p.x,p.y,"graze",1);
      }
      if (p.inv <= 0 && d2 < hitR*hitR) {
        damagePlayer(s,b.x,b.y);
        s.bullets.splice(i,1);
        continue;
      }
      if (b.x < -70 || b.x > W+70 || b.y < -90 || b.y > H+90 || b.age>13) s.bullets.splice(i,1);
    }
  }

  function updateLasers(s,dt) {
    const p=s.player;
    for(let i=s.lasers.length-1;i>=0;i--){
      const l=s.lasers[i]; l.t+=dt;
      const active = l.t>=l.telegraph && l.t<l.telegraph+l.active;
      if(active && !l.hit && p.inv<=0 && Math.abs(p.x-l.x)<l.w*.5+PLAYER_R){
        l.hit=true; damagePlayer(s,p.x,p.y);
      }
      if(l.t>=l.telegraph+l.active+.22) s.lasers.splice(i,1);
    }
  }

  function damagePlayer(s,x,y) {
    if (s.player.inv>0 || s.finished) return;
    s.player.hp--;
    s.player.inv=1.05;
    s.shake=8;
    s.flash=.65;
    s.graze=Math.max(0,s.graze-22);
    s.score=Math.max(0,s.score-250);
    for(let i=s.bullets.length-1;i>=0;i--) if(dist2(s.bullets[i].x,s.bullets[i].y,x,y)<100*100) s.bullets.splice(i,1);
    spark(s,x,y,"hurt",18);
    navigator.vibrate?.(55);
  }

  function tryCounter(s) {
    if (!s || !s.started || s.finished || s.graze < 100) return;
    s.graze=0;
    s.bossHp=Math.max(0,s.bossHp-135);
    s.score+=1500;
    s.player.inv=Math.max(s.player.inv,1.15);
    s.bullets.length=0;
    s.lasers.length=0;
    s.flash=1;
    s.shake=6;
    for(let i=0;i<42;i++) spark(s,s.player.x,s.player.y,"counter",1);
    setAttackText(s,"聊天室反擊！");
    window.GameAudio?.playConfirm?.();
  }

  function spark(s,x,y,kind,count=1){
    for(let i=0;i<count;i++){
      const a=rand(0,Math.PI*2),sp=rand(25,165);
      s.particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,t:rand(.25,.65),max:.65,kind});
    }
  }
  function updateParticles(s,dt){
    for(let i=s.particles.length-1;i>=0;i--){const p=s.particles[i];p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy*=.97;if(p.t<=0)s.particles.splice(i,1)}
  }

  function checkPhase(s) {
    const ratio=s.bossHp/BOSS_MAX_HP;
    const next = ratio<=.30?3:ratio<=.65?2:1;
    if(next<=s.phase) return;
    s.phase=next;
    s.root.dataset.phase=String(next);
    s.root.querySelector("[data-phase-label]").textContent=`${next} / 3`;
    s.bullets.length=0; s.lasers.length=0; s.pattern=null; s.phasePause=1.35;
    s.player.inv=Math.max(s.player.inv,1.35);
    s.graze=clamp(s.graze+25,0,100);
    phaseBanner(s,next===2?"PHASE 2 · 聊天室失控":"FINAL PHASE · 全頻過載");
  }

  function phaseBanner(s,text){
    const el=s.root.querySelector("[data-phase-banner]"); if(!el)return;
    el.textContent=text; el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
    setTimeout(()=>el.classList.remove("show"),1050);
  }

  function setAttackText(s,text){
    const el=s.root.querySelector("[data-attack]"); if(!el)return;
    if(el.textContent!==text) el.textContent=text;
    el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
  }

  function updateHud(s){
    const hp=Math.max(0,s.bossHp);
    s.root.querySelector("[data-boss-hp]").textContent=Math.ceil(hp);
    s.root.querySelector("[data-boss-bar]").style.width=`${hp/BOSS_MAX_HP*100}%`;
    const hearts = Array.from({length:PLAYER_MAX_HP},(_,i)=>i<s.player.hp?"♥":"♡").join(" ");
    s.root.querySelector("[data-hearts]").textContent=hearts;
    s.root.querySelector("[data-graze-label]").textContent=`${Math.floor(s.graze)}%${s.graze>=100?" READY":""}`;
    s.root.querySelector("[data-graze-bar]").style.width=`${s.graze}%`;
    s.root.querySelector("[data-score]").textContent=String(Math.floor(s.score)).padStart(6,"0");
    s.root.querySelector("[data-graze-count]").textContent=String(s.grazeCount);
    s.root.classList.toggle("counter-ready",s.graze>=100);
  }

  function draw(s){
    const c=s.ctx;
    c.save();
    c.clearRect(0,0,W,H);
    const sx=s.shake?rand(-s.shake,s.shake):0, sy=s.shake?rand(-s.shake,s.shake):0;
    c.translate(sx,sy);

    c.globalAlpha=.2;
    c.strokeStyle="#7c3042";
    c.lineWidth=1;
    for(let x=0;x<=W;x+=80){c.beginPath();c.moveTo(x,PLAYER_MIN_Y);c.lineTo(W/2+(x-W/2)*1.25,H);c.stroke()}
    for(let y=PLAYER_MIN_Y;y<H;y+=55){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke()}
    c.globalAlpha=1;

    for(const l of s.lasers){
      const active=l.t>=l.telegraph&&l.t<l.telegraph+l.active;
      if(active){
        c.fillStyle="rgba(255,45,66,.78)"; c.shadowColor="rgba(255,35,65,.9)"; c.shadowBlur=24;
        c.fillRect(l.x-l.w/2,0,l.w,H);
        c.fillStyle="rgba(255,238,205,.78)";c.fillRect(l.x-4,0,8,H);
      } else if(l.t<l.telegraph){
        const pulse=.25+.45*Math.abs(Math.sin(l.t*12));
        c.fillStyle=`rgba(255,75,92,${pulse})`; c.fillRect(l.x-2,0,4,H);
        c.setLineDash([9,10]); c.strokeStyle="rgba(255,104,119,.7)";c.strokeRect(l.x-l.w/2,0,l.w,H);c.setLineDash([]);
      }
      c.shadowBlur=0;
    }

    c.shadowColor="rgba(255,235,130,.8)";c.shadowBlur=8;
    for(const q of s.shots){c.fillStyle="#ffe998";c.fillRect(q.x-2,q.y-8,4,14)}
    c.shadowBlur=0;

    for(const b of s.bullets){
      if(b.kind==="wall") c.fillStyle="#ff6a75";
      else if(b.kind==="homing") c.fillStyle="#b58cff";
      else if(b.kind==="fast") c.fillStyle="#ffb34e";
      else if(b.kind==="ring") c.fillStyle="#ff7a9d";
      else c.fillStyle="#ef4059";
      c.shadowColor=c.fillStyle;c.shadowBlur=b.kind==="homing"?12:7;
      c.beginPath();c.arc(b.x,b.y,b.r,0,Math.PI*2);c.fill();
      if(b.r>=7){c.fillStyle="rgba(255,235,235,.65)";c.beginPath();c.arc(b.x-b.r*.28,b.y-b.r*.28,Math.max(1,b.r*.22),0,Math.PI*2);c.fill()}
    }
    c.shadowBlur=0;

    for(const p of s.particles){
      c.globalAlpha=clamp(p.t/p.max,0,1);
      c.fillStyle=p.kind==="hurt"?"#ff4f63":p.kind==="counter"?"#fff2a6":"#ffd66c";
      c.beginPath();c.arc(p.x,p.y,p.kind==="counter"?3:2,0,Math.PI*2);c.fill();
    }
    c.globalAlpha=1;

    drawPlayer(s,c);

    if(s.flash>0){c.fillStyle=`rgba(255,70,84,${s.flash*.16})`;c.fillRect(0,0,W,H)}
    c.restore();
  }

  function drawPlayer(s,c){
    const p=s.player;
    const blink=p.inv>0 && Math.floor(p.inv*12)%2===0;
    if(blink)c.globalAlpha=.38;
    c.save(); c.translate(p.x,p.y);
    if(s.playerImg.complete&&s.playerImg.naturalWidth){
      c.shadowColor="rgba(0,0,0,.72)";c.shadowBlur=12;
      c.drawImage(s.playerImg,-27,-55,54,72);
      c.shadowBlur=0;
    } else {
      c.fillStyle="#e9e2eb";c.beginPath();c.arc(0,-10,16,0,Math.PI*2);c.fill();
    }
    c.fillStyle="#fff5a9";c.shadowColor="#ffdf65";c.shadowBlur=13;c.beginPath();c.arc(0,0,PLAYER_R*.42,0,Math.PI*2);c.fill();c.shadowBlur=0;
    if(s.keys.slow){c.strokeStyle="rgba(255,239,152,.75)";c.lineWidth=1;c.beginPath();c.arc(0,0,PLAYER_R+7,0,Math.PI*2);c.stroke()}
    c.restore();c.globalAlpha=1;
  }

  function winFight(s){
    if(s.finished)return;s.finished=true;
    s.bossHp=0;updateHud(s);s.bullets.length=0;s.lasers.length=0;
    phaseBanner(s,"OVERLOAD BREAK");
    window.GameAudio?.playConfirm?.();
    setTimeout(()=>bridgeWin(s),900);
  }

  function loseFight(s){
    if(s.finished)return;s.finished=true;
    phaseBanner(s,"OVERLOAD");
    navigator.vibrate?.([70,50,90]);
    setTimeout(()=>bridgeLose(s),850);
  }

  function restoreLegacy(s){
    modalCard?.classList.remove("overload-boss-card");
    body.innerHTML="";
    body.appendChild(s.legacy);
  }

  const nextFrame = () => new Promise(resolve=>requestAnimationFrame(()=>resolve()));

  async function bridgeWin(s){
    if(!s)return;
    bridgeMode=true;stopSession();restoreLegacy(s);
    await nextFrame();
    for(let guard=0;guard<60;guard++){
      if(!overlay.classList.contains("show")) break;
      const log=body.querySelector(".boss-log")?.textContent||"";
      const side = /左/.test(log)?"L":/右/.test(log)?"R":null;
      const dangerMatch=log.match(/第\s*(\d+)\s*區/);
      const danger=dangerMatch?Number(dangerMatch[1])-1:-1;
      const laneBtns=[...body.querySelectorAll("[data-lane]")];
      const sideBtns=[...body.querySelectorAll("[data-side]")];

      if(/聊天室爆點鎖定/.test(log)){
        const safe=laneBtns.find(b=>Number(b.dataset.lane)!==danger)||laneBtns[0];
        safe?.click();
      } else if(/先選安全區|有攻擊/.test(log) || (laneBtns.length&&sideBtns.length)){
        const safe=laneBtns.find(b=>Number(b.dataset.lane)!==danger)||laneBtns[0];
        safe?.click();await nextFrame();
        const log2=body.querySelector(".boss-log")?.textContent||log;
        const side2=/左/.test(log2)?"L":/右/.test(log2)?"R":side;
        body.querySelector(`[data-side="${side2||"L"}"]`)?.click();
      } else {
        body.querySelector(`[data-side="${side||"L"}"]`)?.click();
      }
      await nextFrame();
      if(!body.querySelector(".boss-panel")) break;
    }
    setTimeout(()=>{bridgeMode=false;scheduleScan();window.GameAudio?.refreshBgmMode?.();},180);
  }

  async function bridgeLose(s){
    if(!s)return;
    bridgeMode=true;stopSession();restoreLegacy(s);
    await nextFrame();
    for(let guard=0;guard<8;guard++){
      if(!overlay.classList.contains("show")||!body.querySelector(".boss-panel"))break;
      const log=body.querySelector(".boss-log")?.textContent||"";
      const correct=/左/.test(log)?"L":"R";
      const wrong=correct==="L"?"R":"L";
      body.querySelector(`[data-side="${wrong}"]`)?.click();
      await nextFrame();
    }
    setTimeout(()=>{bridgeMode=false;scheduleScan();window.GameAudio?.refreshBgmMode?.();},180);
  }

  function scan(){
    scheduled=false;
    if(session&&!document.contains(session.root))stopSession();
    if(!bridgeMode&&!session&&legacyBossOpen())takeover();
  }
  function scheduleScan(){if(scheduled)return;scheduled=true;requestAnimationFrame(scan)}

  new MutationObserver(scheduleScan).observe(body,{childList:true,subtree:true});
  new MutationObserver(scheduleScan).observe(overlay,{attributes:true,attributeFilter:["class","aria-hidden"]});
  scheduleScan();
})();
