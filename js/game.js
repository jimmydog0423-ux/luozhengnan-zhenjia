(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;

  const overlays = {
    start: document.getElementById("startOverlay"),
    pause: document.getElementById("pauseOverlay"),
    ending: document.getElementById("endingOverlay"),
  };

  const input = {
    keys: new Set(),
    pressed: new Set(),
    mouseDown: false,
    mouseX: W / 2,
    mouseY: H / 2,
  };

  const META_KEY = "disorderDungeonMeta_v1";

  function loadMeta() {
    try {
      return Object.assign({
        totalDeaths: 0,
        bossDeaths: 0,
        roomsSeen: {},
        finished: 0,
        bestDeaths: null,
        hasSeenDeathDoor: false,
      }, JSON.parse(localStorage.getItem(META_KEY) || "{}"));
    } catch {
      return {
        totalDeaths: 0,
        bossDeaths: 0,
        roomsSeen: {},
        finished: 0,
        bestDeaths: null,
        hasSeenDeathDoor: false,
      };
    }
  }

  function saveMeta() {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  }

  let meta = loadMeta();

  const COLORS = {
    bg: "#090b0f",
    floor: "#171a20",
    floor2: "#1d2027",
    wall: "#303640",
    wallEdge: "#505967",
    player: "#e8edf3",
    playerDash: "#a5e1ff",
    enemy: "#dc6672",
    shooter: "#cf8df0",
    sentinel: "#e0b66a",
    boss: "#f25c54",
    bullet: "#f3c55b",
    enemyBullet: "#e46b7a",
    danger: "#ff6a6a",
    safe: "#79cf9f",
    rule: "#f5d76e",
    text: "#e6ebf2",
    muted: "#8993a2",
    door: "#5977a8",
    doorOpen: "#84b6f4",
    redDoor: "#9d4048",
    blueDoor: "#3f609f",
    plate: "#57616e",
    plateOn: "#8bc49e",
  };

  const RULES = {
    NONE: { id: "NONE", label: "無特殊規則" },
    NO_DASH: { id: "NO_DASH", label: "禁止奔跑" },
    NO_ATTACK: { id: "NO_ATTACK", label: "禁止攻擊" },
    KEEP_MOVING: { id: "KEEP_MOVING", label: "禁止停止" },
    NO_KILL: { id: "NO_KILL", label: "不可殺生" },
    FACE_AWAY: { id: "FACE_AWAY", label: "不得面向典獄長" },
    NO_REPEAT: { id: "NO_REPEAT", label: "禁止重複動作" },
    LEFT_FORBIDDEN: { id: "LEFT_FORBIDDEN", label: "禁止向左" },
    MOVING_HURTS: { id: "MOVING_HURTS", label: "只有移動時才會受傷" },
    ONE_HIT: { id: "ONE_HIT", label: "一擊死亡" },
    HALF_FIELD: { id: "HALF_FIELD", label: "禁止進入右半場" },
  };

  const game = {
    running: false,
    paused: false,
    roomIndex: 0,
    room: null,
    time: 0,
    lastTime: 0,
    message: "",
    messageTimer: 0,
    roomBannerTimer: 0,
    shake: 0,
    flash: 0,
    currentRule: RULES.NONE,
    bossRuleTimer: 0,
    bossPhase: 1,
    bossRuleIndex: 0,
    bossRuleList: [
      RULES.NO_ATTACK,
      RULES.KEEP_MOVING,
      RULES.FACE_AWAY,
      RULES.HALF_FIELD,
      RULES.NO_REPEAT,
      RULES.NO_DASH,
    ],
    roomKills: 0,
    roomViolations: 0,
    transitionLock: 0,
  };

  const player = {
    x: 95,
    y: H / 2,
    r: 14,
    hp: 5,
    maxHp: 5,
    speed: 205,
    vx: 0,
    vy: 0,
    facingX: 1,
    facingY: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashVx: 0,
    dashVy: 0,
    invuln: 0,
    attackTimer: 0,
    attackCooldown: 0,
    lastAction: "",
    stopTimer: 0,
    hurtMoveTick: 0,
  };

  const audio = {
    ctx: null,
    init() {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
    },
    tone(freq = 440, len = .05, type = "square", volume = .03) {
      try {
        this.init();
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.value = volume;
        o.connect(g);
        g.connect(this.ctx.destination);
        o.start();
        o.stop(this.ctx.currentTime + len);
      } catch {}
    }
  };

  function rect(x, y, w, h, extra = {}) {
    return Object.assign({ x, y, w, h }, extra);
  }

  function enemy(type, x, y, extra = {}) {
    const base = {
      type,
      x,
      y,
      r: type === "sentinel" ? 17 : 15,
      hp: type === "sentinel" ? 4 : type === "shooter" ? 3 : 3,
      maxHp: type === "sentinel" ? 4 : type === "shooter" ? 3 : 3,
      alive: true,
      speed: type === "chaser" ? 95 : type === "shooter" ? 62 : 48,
      shootTimer: Math.random() * 1.1,
      hitFlash: 0,
      patrol: Math.random() * Math.PI * 2,
    };
    return Object.assign(base, extra);
  }

  function boss(x, y) {
    return {
      type: "boss",
      x,
      y,
      r: 30,
      hp: 55,
      maxHp: 55,
      alive: true,
      speed: 80,
      shootTimer: 1,
      radialTimer: 2.5,
      chargeTimer: 4.5,
      chargeState: 0,
      chargeVx: 0,
      chargeVy: 0,
      hitFlash: 0,
    };
  }

  const ROOM_DEFS = [
    {
      name: "01 / 醒來",
      subtitle: "先活著走出去。",
      rule: RULES.NONE,
      spawn: [95, 270],
      exit: rect(905, 220, 35, 100),
      walls: [
        rect(0, 0, W, 28),
        rect(0, H - 28, W, 28),
        rect(0, 0, 28, H),
        rect(W - 28, 0, 28, H),
        rect(300, 120, 35, 160),
        rect(540, 270, 35, 150),
      ],
      enemies: () => [
        enemy("chaser", 455, 180),
        enemy("chaser", 690, 350),
      ],
      intro: "WASD 移動，空白鍵攻擊，Shift Dash。",
      exitCondition: (r) => r.enemies.every(e => !e.alive),
      lockedText: "清掉守衛，出口才會開。",
    },
    {
      name: "02 / 奔跑禁止",
      subtitle: "牆上的規則第一次介入你的手。",
      rule: RULES.NO_DASH,
      spawn: [95, 270],
      exit: rect(905, 220, 35, 100),
      walls: [
        rect(0, 0, W, 28), rect(0, H - 28, W, 28),
        rect(0, 0, 28, H), rect(W - 28, 0, 28, H),
        rect(260, 28, 32, 315),
        rect(500, 197, 32, 315),
        rect(735, 28, 32, 315),
      ],
      enemies: () => [
        enemy("shooter", 390, 410),
        enemy("chaser", 620, 105),
        enemy("shooter", 840, 410),
      ],
      intro: "規則：禁止奔跑。試著按 Shift，你會知道代價。",
      exitCondition: (r) => r.enemies.every(e => !e.alive),
    },
    {
      name: "03 / 不可殺生",
      subtitle: "怪物有時不是敵人，而是鑰匙。",
      rule: RULES.NO_KILL,
      spawn: [95, 270],
      exit: rect(905, 220, 35, 100),
      walls: [
        rect(0, 0, W, 28), rect(0, H - 28, W, 28),
        rect(0, 0, 28, H), rect(W - 28, 0, 28, H),
        rect(450, 190, 60, 160),
      ],
      plates: [
        rect(700, 120, 46, 46, { active: false }),
        rect(700, 374, 46, 46, { active: false }),
      ],
      enemies: () => [
        enemy("chaser", 320, 145, { hp: 6, maxHp: 6 }),
        enemy("chaser", 320, 395, { hp: 6, maxHp: 6 }),
      ],
      intro: "不可殺生。把兩隻守衛引到壓力板上。",
      exitCondition: (r) => r.plates && r.plates.every(p => p.active),
      lockedText: "兩塊壓力板必須同時被壓住。",
      noKillFail: true,
    },
    {
      name: "04 / 不要相信紅色",
      subtitle: "你已經開始相信牆了。這很危險。",
      rule: RULES.NONE,
      spawn: [95, 270],
      exit: null,
      walls: [
        rect(0, 0, W, 28), rect(0, H - 28, W, 28),
        rect(0, 0, 28, H), rect(W - 28, 0, 28, H),
        rect(465, 28, 30, 165),
        rect(465, 347, 30, 165),
      ],
      doors: [
        rect(900, 115, 35, 90, { kind: "red", good: true }),
        rect(900, 335, 35, 90, { kind: "blue", good: false }),
      ],
      enemies: () => [
        enemy("sentinel", 520, 270),
      ],
      intro: "牆上只寫了一句：『不要相信紅色。』",
      exitCondition: () => false,
    },
    {
      name: "05 / 禁止停止",
      subtitle: "不是跑得快就好，是不能停。",
      rule: RULES.KEEP_MOVING,
      spawn: [95, 270],
      exit: rect(905, 220, 35, 100),
      walls: [
        rect(0, 0, W, 28), rect(0, H - 28, W, 28),
        rect(0, 0, 28, H), rect(W - 28, 0, 28, H),
        rect(230, 110, 90, 30),
        rect(410, 400, 90, 30),
        rect(590, 110, 90, 30),
        rect(760, 400, 90, 30),
      ],
      enemies: () => [
        enemy("shooter", 300, 420),
        enemy("shooter", 485, 120),
        enemy("chaser", 675, 410),
        enemy("sentinel", 825, 120),
      ],
      intro: "規則：禁止停止。站著不動太久會受傷。",
      exitCondition: (r) => r.enemies.every(e => !e.alive),
    },
    {
      name: "06 / 左方封鎖",
      subtitle: "方向鍵也可以被世界沒收。",
      rule: RULES.LEFT_FORBIDDEN,
      spawn: [95, 270],
      exit: rect(905, 220, 35, 100),
      walls: [
        rect(0, 0, W, 28), rect(0, H - 28, W, 28),
        rect(0, 0, 28, H), rect(W - 28, 0, 28, H),
        rect(260, 210, 45, 300),
        rect(505, 28, 45, 300),
        rect(745, 210, 45, 300),
      ],
      enemies: () => [
        enemy("chaser", 370, 100),
        enemy("shooter", 620, 430),
        enemy("chaser", 850, 105),
      ],
      intro: "規則：禁止向左。A 鍵仍然存在，但牢獄不允許。",
      exitCondition: (r) => r.enemies.every(e => !e.alive),
    },
    {
      name: "07 / 動則受傷",
      subtitle: "你第一次必須把『不動』當作防禦。",
      rule: RULES.MOVING_HURTS,
      spawn: [95, 270],
      exit: rect(905, 220, 35, 100),
      walls: [
        rect(0, 0, W, 28), rect(0, H - 28, W, 28),
        rect(0, 0, 28, H), rect(W - 28, 0, 28, H),
        rect(300, 140, 60, 260),
        rect(600, 140, 60, 260),
      ],
      enemies: () => [
        enemy("shooter", 470, 120),
        enemy("shooter", 470, 420),
        enemy("sentinel", 810, 270),
      ],
      intro: "規則：只有移動時才會受傷。移動傷害每隔一段時間觸發。",
      exitCondition: (r) => r.enemies.every(e => !e.alive),
    },
    {
      name: "08 / 死亡者房間",
      subtitle: "牢獄記得的，比你以為的更多。",
      rule: RULES.NONE,
      spawn: [95, 270],
      exit: rect(905, 220, 35, 100),
      walls: [
        rect(0, 0, W, 28), rect(0, H - 28, W, 28),
        rect(0, 0, 28, H), rect(W - 28, 0, 28, H),
      ],
      enemies: () => [
        enemy("sentinel", 540, 270, { hp: 8, maxHp: 8 }),
      ],
      intro: () => {
        if (meta.totalDeaths === 0) return "這裡很安靜。像是在等一個從沒死過的人。";
        if (meta.totalDeaths < 5) return `牆上有 ${meta.totalDeaths} 道刻痕。數量和你的死亡一樣。`;
        return `牆上寫著：『你已經死過 ${meta.totalDeaths} 次。別再假裝第一次來。』`;
      },
      exitCondition: (r) => r.enemies.every(e => !e.alive),
    },
    {
      name: "09 / 交叉規則",
      subtitle: "牢獄開始把你學過的東西疊在一起。",
      rule: RULES.NO_REPEAT,
      spawn: [95, 270],
      exit: rect(905, 220, 35, 100),
      walls: [
        rect(0, 0, W, 28), rect(0, H - 28, W, 28),
        rect(0, 0, 28, H), rect(W - 28, 0, 28, H),
        rect(280, 85, 35, 370),
        rect(590, 85, 35, 370),
      ],
      enemies: () => [
        enemy("chaser", 415, 135),
        enemy("shooter", 415, 405),
        enemy("sentinel", 760, 270),
      ],
      intro: "規則：禁止重複動作。攻擊、Dash、攻擊，才能保持節奏。",
      exitCondition: (r) => r.enemies.every(e => !e.alive),
    },
    {
      name: "10 / 典獄長",
      subtitle: "到這裡，規則已經不屬於牆。",
      rule: RULES.NO_ATTACK,
      spawn: [110, 270],
      exit: null,
      boss: true,
      walls: [
        rect(0, 0, W, 28), rect(0, H - 28, W, 28),
        rect(0, 0, 28, H), rect(W - 28, 0, 28, H),
      ],
      enemies: () => [boss(720, 270)],
      intro: () => {
        if (meta.bossDeaths === 0) return "典獄長：你終於走到這裡。現在，照我的規則活。";
        if (meta.bossDeaths < 3) return "典獄長：你又回來了。看來死亡沒有教會你服從。";
        return `典獄長：第 ${meta.bossDeaths + 1} 次。這次你能撐過幾條規則？`;
      },
      exitCondition: (r) => r.enemies.every(e => !e.alive),
    },
  ];

  function cloneRoom(index) {
    const def = ROOM_DEFS[index];
    return {
      def,
      enemies: def.enemies ? def.enemies() : [],
      walls: (def.walls || []).map(w => ({ ...w })),
      exit: def.exit ? { ...def.exit } : null,
      doors: (def.doors || []).map(d => ({ ...d })),
      plates: (def.plates || []).map(p => ({ ...p })),
      complete: false,
      failed: false,
      enterTime: game.time,
    };
  }

  function currentIntro(def) {
    return typeof def.intro === "function" ? def.intro() : def.intro;
  }

  function startGame() {
    audio.init();
    overlays.start.classList.remove("show");
    overlays.ending.classList.remove("show");
    game.running = true;
    game.paused = false;
    game.time = 0;
    game.roomIndex = 0;
    enterRoom(0, true);
  }

  function enterRoom(index, fullHeal = false) {
    game.roomIndex = index;
    game.room = cloneRoom(index);
    game.currentRule = game.room.def.rule || RULES.NONE;
    game.roomKills = 0;
    game.roomViolations = 0;
    game.transitionLock = .35;
    game.bossRuleTimer = 8;
    game.bossRuleIndex = 0;
    game.bossPhase = 1;
    projectiles.length = 0;

    const [sx, sy] = game.room.def.spawn;
    player.x = sx;
    player.y = sy;
    player.vx = 0;
    player.vy = 0;
    player.dashTimer = 0;
    player.dashCooldown = 0;
    player.attackCooldown = 0;
    player.attackTimer = 0;
    player.invuln = 1;
    player.stopTimer = 0;
    player.lastAction = "";
    player.hurtMoveTick = 0;

    if (fullHeal) player.hp = player.maxHp;
    else player.hp = Math.min(player.maxHp, Math.max(3, player.hp + 1));

    game.roomBannerTimer = 2.6;
    showMessage(currentIntro(game.room.def), 4.2);
    meta.roomsSeen[index] = (meta.roomsSeen[index] || 0) + 1;
    saveMeta();
  }

  function restartRoom(fromDeath = false) {
    if (fromDeath) {
      meta.totalDeaths++;
      if (game.room && game.room.def.boss) meta.bossDeaths++;
      saveMeta();
    }
    const hp = player.maxHp;
    enterRoom(game.roomIndex, false);
    player.hp = hp;
  }

  function showMessage(text, seconds = 2) {
    game.message = text || "";
    game.messageTimer = seconds;
  }

  function togglePause() {
    if (!game.running) return;
    game.paused = !game.paused;
    overlays.pause.classList.toggle("show", game.paused);
  }

  function circleRectCollision(cx, cy, cr, r) {
    const nx = Math.max(r.x, Math.min(cx, r.x + r.w));
    const ny = Math.max(r.y, Math.min(cy, r.y + r.h));
    const dx = cx - nx;
    const dy = cy - ny;
    return dx * dx + dy * dy < cr * cr;
  }

  function resolveWalls(obj) {
    for (const w of game.room.walls) {
      if (!circleRectCollision(obj.x, obj.y, obj.r, w)) continue;

      const left = Math.abs((obj.x + obj.r) - w.x);
      const right = Math.abs((w.x + w.w) - (obj.x - obj.r));
      const top = Math.abs((obj.y + obj.r) - w.y);
      const bottom = Math.abs((w.y + w.h) - (obj.y - obj.r));
      const m = Math.min(left, right, top, bottom);

      if (m === left) obj.x = w.x - obj.r;
      else if (m === right) obj.x = w.x + w.w + obj.r;
      else if (m === top) obj.y = w.y - obj.r;
      else obj.y = w.y + w.h + obj.r;
    }
  }

  function damagePlayer(amount = 1, reason = "") {
    if (player.invuln > 0 || !game.running) return;

    if (game.currentRule.id === "ONE_HIT") {
      amount = player.maxHp;
    }

    player.hp -= amount;
    player.invuln = .9;
    game.shake = 8;
    game.flash = .2;
    audio.tone(110, .1, "sawtooth", .05);

    if (reason) showMessage(reason, 1.5);

    if (player.hp <= 0) {
      player.hp = 0;
      setTimeout(() => {
        if (game.running) restartRoom(true);
      }, 180);
    }
  }

  function violateRule(reason, damage = 1) {
    game.roomViolations++;
    damagePlayer(damage, reason);
  }

  function registerAction(action) {
    if (game.currentRule.id === "NO_REPEAT" && player.lastAction === action) {
      violateRule("規則違反：禁止重複動作。", 1);
      return false;
    }
    player.lastAction = action;
    return true;
  }

  function attemptDash(dx, dy) {
    if (player.dashCooldown > 0 || player.dashTimer > 0) return;
    if (!dx && !dy) {
      dx = player.facingX;
      dy = player.facingY;
    }

    if (game.currentRule.id === "NO_DASH") {
      violateRule("規則違反：禁止奔跑。", 1);
      return;
    }

    if (!registerAction("dash")) return;

    const len = Math.hypot(dx, dy) || 1;
    player.dashVx = dx / len * 540;
    player.dashVy = dy / len * 540;
    player.dashTimer = .14;
    player.dashCooldown = .65;
    player.invuln = Math.max(player.invuln, .16);
    audio.tone(260, .05, "square", .025);
  }

  function attemptAttack() {
    if (player.attackCooldown > 0 || player.attackTimer > 0) return;

    if (game.currentRule.id === "NO_ATTACK") {
      violateRule("規則違反：禁止攻擊。", 1);
      return;
    }

    if (game.currentRule.id === "FACE_AWAY") {
      const b = game.room.enemies.find(e => e.type === "boss" && e.alive);
      if (b) {
        const toBossX = b.x - player.x;
        const toBossY = b.y - player.y;
        const dot = toBossX * player.facingX + toBossY * player.facingY;
        if (dot > 0) {
          violateRule("規則違反：不得面向典獄長。", 1);
          return;
        }
      }
    }

    if (!registerAction("attack")) return;

    player.attackTimer = .12;
    player.attackCooldown = .28;
    audio.tone(410, .04, "square", .025);

    const range = 54;
    const ax = player.x + player.facingX * 34;
    const ay = player.y + player.facingY * 34;

    for (const e of game.room.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - ax, e.y - ay);
      if (d < range + e.r) {
        hitEnemy(e, 1);
      }
    }
  }

  function hitEnemy(e, dmg) {
    if (game.room.def.noKillFail && e.hp - dmg <= 0) {
      e.hp = 1;
      game.room.failed = true;
      showMessage("你違反了『不可殺生』。房間拒絕讓你通過。按 R 重來。", 3);
      game.shake = 9;
      audio.tone(90, .16, "sawtooth", .05);
      return;
    }

    e.hp -= dmg;
    e.hitFlash = .1;

    if (e.hp <= 0) {
      e.hp = 0;
      e.alive = false;
      game.roomKills++;
      audio.tone(e.type === "boss" ? 70 : 180, e.type === "boss" ? .25 : .08, "sawtooth", .04);

      if (e.type === "boss") {
        finishGame();
      }
    }
  }

  const projectiles = [];

  function fireProjectile(x, y, vx, vy, hostile = true, radius = 7) {
    projectiles.push({ x, y, vx, vy, hostile, r: radius, life: 5 });
  }

  function shootAtPlayer(e, speed = 210) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const len = Math.hypot(dx, dy) || 1;
    fireProjectile(e.x, e.y, dx / len * speed, dy / len * speed, true, e.type === "boss" ? 8 : 7);
    audio.tone(150, .03, "square", .018);
  }

  function radialBurst(e, count = 12, speed = 180) {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i / count) + game.time * .2;
      fireProjectile(e.x, e.y, Math.cos(a) * speed, Math.sin(a) * speed, true, 7);
    }
    audio.tone(95, .08, "sawtooth", .025);
  }

  function updatePlayer(dt) {
    player.invuln = Math.max(0, player.invuln - dt);
    player.attackTimer = Math.max(0, player.attackTimer - dt);
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    player.dashTimer = Math.max(0, player.dashTimer - dt);
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);

    let dx = 0;
    let dy = 0;
    if (input.keys.has("KeyA") || input.keys.has("ArrowLeft")) dx -= 1;
    if (input.keys.has("KeyD") || input.keys.has("ArrowRight")) dx += 1;
    if (input.keys.has("KeyW") || input.keys.has("ArrowUp")) dy -= 1;
    if (input.keys.has("KeyS") || input.keys.has("ArrowDown")) dy += 1;

    if (game.currentRule.id === "LEFT_FORBIDDEN" && dx < 0) {
      dx = 0;
      if (input.pressed.has("KeyA") || input.pressed.has("ArrowLeft")) {
        violateRule("規則違反：禁止向左。", 1);
      }
    }

    const moving = dx !== 0 || dy !== 0;

    if (moving) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      player.facingX = dx;
      player.facingY = dy;
      player.stopTimer = 0;
    } else {
      player.stopTimer += dt;
    }

    if (input.pressed.has("ShiftLeft") || input.pressed.has("ShiftRight")) {
      attemptDash(dx, dy);
    }

    if (input.pressed.has("Space") || input.mouseDown) {
      if (input.mouseDown) {
        const worldMouseX = input.mouseX;
        const worldMouseY = input.mouseY;
        const mdx = worldMouseX - player.x;
        const mdy = worldMouseY - player.y;
        const mlen = Math.hypot(mdx, mdy);
        if (mlen > 5) {
          player.facingX = mdx / mlen;
          player.facingY = mdy / mlen;
        }
      }
      attemptAttack();
    }

    if (game.currentRule.id === "KEEP_MOVING" && player.stopTimer > .55) {
      player.stopTimer = 0;
      violateRule("規則違反：禁止停止。", 1);
    }

    if (game.currentRule.id === "MOVING_HURTS" && moving) {
      player.hurtMoveTick += dt;
      if (player.hurtMoveTick > 1.25) {
        player.hurtMoveTick = 0;
        damagePlayer(1, "移動本身正在傷害你。");
      }
    } else if (!moving) {
      player.hurtMoveTick = 0;
    }

    if (game.currentRule.id === "HALF_FIELD" && player.x > W / 2) {
      damagePlayer(1, "規則違反：禁止進入右半場。");
      player.x = W / 2 - player.r - 2;
    }

    if (player.dashTimer > 0) {
      player.x += player.dashVx * dt;
      player.y += player.dashVy * dt;
    } else {
      player.vx = dx * player.speed;
      player.vy = dy * player.speed;
      player.x += player.vx * dt;
      player.y += player.vy * dt;
    }

    resolveWalls(player);

    player.x = Math.max(player.r + 1, Math.min(W - player.r - 1, player.x));
    player.y = Math.max(player.r + 1, Math.min(H - player.r - 1, player.y));

    handleDoorsAndExit();
  }

  function handleDoorsAndExit() {
    const r = game.room;

    if (r.def.doors && r.def.doors.length) {
      for (const d of r.def.doors) {
        if (!circleRectCollision(player.x, player.y, player.r, d)) continue;
        if (d.good) {
          if (r.enemies.some(e => e.alive)) {
            showMessage("守門者還在。", 1.2);
            player.x = d.x - player.r - 2;
            return;
          }
          if (game.transitionLock <= 0) {
            enterRoom(game.roomIndex + 1);
            return;
          }
        } else {
          damagePlayer(player.maxHp, "藍門後面什麼都沒有。只有墜落。");
          return;
        }
      }
    }

    if (!r.exit) return;

    const open = !r.failed && (!r.def.exitCondition || r.def.exitCondition(r));

    if (circleRectCollision(player.x, player.y, player.r, r.exit)) {
      if (open) {
        if (game.transitionLock <= 0) {
          enterRoom(game.roomIndex + 1);
        }
      } else {
        if (r.def.lockedText) showMessage(r.def.lockedText, 1.2);
        player.x = r.exit.x - player.r - 2;
      }
    }
  }

  function updatePlates() {
    if (!game.room.plates.length) return;

    for (const p of game.room.plates) {
      p.active = false;
      for (const e of game.room.enemies) {
        if (!e.alive) continue;
        if (circleRectCollision(e.x, e.y, e.r, p)) {
          p.active = true;
          if (game.room.def.noKillFail) e.onPlateLock = true;
          break;
        }
      }
    }
  }

  function updateEnemies(dt) {
    for (const e of game.room.enemies) {
      if (!e.alive) continue;
      e.hitFlash = Math.max(0, e.hitFlash - dt);

      if (e.type === "boss") {
        updateBoss(e, dt);
        continue;
      }

      if (e.onPlateLock) {
        continue;
      }

      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;

      if (e.type === "chaser") {
        e.x += nx * e.speed * dt;
        e.y += ny * e.speed * dt;
      }

      if (e.type === "shooter") {
        if (dist < 185) {
          e.x -= nx * e.speed * dt;
          e.y -= ny * e.speed * dt;
        } else if (dist > 300) {
          e.x += nx * e.speed * .55 * dt;
          e.y += ny * e.speed * .55 * dt;
        }
        e.shootTimer -= dt;
        if (e.shootTimer <= 0) {
          shootAtPlayer(e, 215);
          e.shootTimer = 1.25 + Math.random() * .45;
        }
      }

      if (e.type === "sentinel") {
        e.patrol += dt * .9;
        e.x += Math.cos(e.patrol) * 18 * dt;
        e.y += Math.sin(e.patrol * 1.3) * 18 * dt;
        e.shootTimer -= dt;
        if (e.shootTimer <= 0) {
          for (let i = -1; i <= 1; i++) {
            const a = Math.atan2(dy, dx) + i * .22;
            fireProjectile(e.x, e.y, Math.cos(a) * 195, Math.sin(a) * 195, true, 7);
          }
          e.shootTimer = 1.6;
        }
      }

      resolveWalls(e);

      if (dist < e.r + player.r + 2) {
        damagePlayer(1, "你被守衛撞到了。");
      }
    }
  }

  function updateBoss(e, dt) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    const hpRatio = e.hp / e.maxHp;
    game.bossPhase = hpRatio > .66 ? 1 : hpRatio > .33 ? 2 : 3;

    if (e.chargeState > 0) {
      e.x += e.chargeVx * dt;
      e.y += e.chargeVy * dt;
      e.chargeState -= dt;
      if (e.chargeState <= 0) {
        e.chargeTimer = 3.4;
      }
    } else {
      if (dist > 220) {
        e.x += nx * e.speed * dt;
        e.y += ny * e.speed * dt;
      } else {
        e.x -= nx * e.speed * .25 * dt;
        e.y -= ny * e.speed * .25 * dt;
      }

      e.shootTimer -= dt;
      e.radialTimer -= dt;
      e.chargeTimer -= dt;

      if (e.shootTimer <= 0) {
        const shots = game.bossPhase === 1 ? 3 : game.bossPhase === 2 ? 5 : 7;
        const spread = .13;
        const a0 = Math.atan2(dy, dx);
        for (let i = 0; i < shots; i++) {
          const offset = (i - (shots - 1) / 2) * spread;
          fireProjectile(e.x, e.y, Math.cos(a0 + offset) * 250, Math.sin(a0 + offset) * 250, true, 8);
        }
        e.shootTimer = game.bossPhase === 3 ? .72 : 1.05;
      }

      if (e.radialTimer <= 0) {
        radialBurst(e, game.bossPhase === 1 ? 10 : game.bossPhase === 2 ? 14 : 18, game.bossPhase === 3 ? 220 : 180);
        e.radialTimer = game.bossPhase === 3 ? 2.1 : 2.8;
      }

      if (e.chargeTimer <= 0 && dist > 100) {
        e.chargeVx = nx * 500;
        e.chargeVy = ny * 500;
        e.chargeState = .42;
        e.chargeTimer = 4;
        audio.tone(70, .12, "sawtooth", .04);
      }
    }

    resolveWalls(e);

    if (dist < e.r + player.r + 3) {
      damagePlayer(1, "典獄長撞上了你。");
    }

    game.bossRuleTimer -= dt;
    if (game.bossRuleTimer <= 0) {
      game.bossRuleTimer = game.bossPhase === 1 ? 8 : game.bossPhase === 2 ? 6.6 : 5.2;
      game.bossRuleIndex = (game.bossRuleIndex + 1) % game.bossRuleList.length;
      game.currentRule = game.bossRuleList[game.bossRuleIndex];
      player.lastAction = "";
      showMessage(`典獄長改寫規則：${game.currentRule.label}`, 2);
      audio.tone(310, .14, "sawtooth", .035);
    }
  }

  function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      let remove = p.life <= 0 || p.x < -30 || p.x > W + 30 || p.y < -30 || p.y > H + 30;

      if (!remove) {
        for (const w of game.room.walls) {
          if (circleRectCollision(p.x, p.y, p.r, w)) {
            remove = true;
            break;
          }
        }
      }

      if (!remove && p.hostile) {
        const d = Math.hypot(p.x - player.x, p.y - player.y);
        if (d < p.r + player.r) {
          damagePlayer(1, "你被彈幕擊中。");
          remove = true;
        }
      }

      if (remove) projectiles.splice(i, 1);
    }
  }

  function finishGame() {
    game.running = false;
    meta.finished++;
    if (meta.bestDeaths === null || meta.totalDeaths < meta.bestDeaths) {
      meta.bestDeaths = meta.totalDeaths;
    }
    saveMeta();

    const title = document.getElementById("endingTitle");
    const text = document.getElementById("endingText");

    title.textContent = meta.totalDeaths === 0 ? "零死亡越獄" : "你離開了規則牢獄。";

    if (meta.totalDeaths === 0) {
      text.textContent = "你一次也沒有死。牢獄無法確認你是否真的來過。";
    } else if (meta.totalDeaths < 5) {
      text.textContent = `你帶著 ${meta.totalDeaths} 次死亡的記憶離開。典獄長死了，但牆上的規則仍在你腦中。`;
    } else {
      text.textContent = `你死過 ${meta.totalDeaths} 次。牢獄記得每一次，而你終於不再需要服從它。`;
    }

    overlays.ending.classList.add("show");
  }

  function update(dt) {
    if (!game.running || game.paused || !game.room) return;

    game.time += dt;
    game.transitionLock = Math.max(0, game.transitionLock - dt);
    game.messageTimer = Math.max(0, game.messageTimer - dt);
    game.roomBannerTimer = Math.max(0, game.roomBannerTimer - dt);
    game.shake = Math.max(0, game.shake - dt * 25);
    game.flash = Math.max(0, game.flash - dt);
    projectiles.splice(0, projectiles.length, ...projectiles.filter(p => p.life > 0));

    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updatePlates();

    input.pressed.clear();
    input.mouseDown = false;
  }

  function drawRectObj(r, fill, stroke = null) {
    ctx.fillStyle = fill;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
  }

  function drawRoom() {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    const grid = 32;
    for (let y = 0; y < H; y += grid) {
      for (let x = 0; x < W; x += grid) {
        ctx.fillStyle = ((x / grid + y / grid) % 2 === 0) ? COLORS.floor : COLORS.floor2;
        ctx.fillRect(x, y, grid, grid);
      }
    }

    for (const w of game.room.walls) {
      drawRectObj(w, COLORS.wall, COLORS.wallEdge);
    }

    for (const p of game.room.plates) {
      drawRectObj(p, p.active ? COLORS.plateOn : COLORS.plate, "#99a3b0");
      ctx.fillStyle = p.active ? "#d9ffe4" : "#bbc3cf";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.active ? "ON" : "OFF", p.x + p.w / 2, p.y + 28);
    }

    for (const d of game.room.doors) {
      drawRectObj(d, d.kind === "red" ? COLORS.redDoor : COLORS.blueDoor, "#d3d8e0");
    }

    if (game.room.exit) {
      const open = !game.room.failed && (!game.room.def.exitCondition || game.room.def.exitCondition(game.room));
      drawRectObj(game.room.exit, open ? COLORS.doorOpen : COLORS.door, open ? "#d9f0ff" : "#8390a1");
    }

    if (game.roomIndex === 3) {
      ctx.fillStyle = COLORS.muted;
      ctx.font = "20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("不要相信紅色", W / 2, 80);
    }

    if (game.roomIndex === 7 && meta.totalDeaths >= 5) {
      ctx.strokeStyle = "#67525b";
      ctx.lineWidth = 3;
      for (let i = 0; i < Math.min(meta.totalDeaths, 20); i++) {
        const x = 90 + i * 17;
        ctx.beginPath();
        ctx.moveTo(x, 80);
        ctx.lineTo(x - 4, 104);
        ctx.stroke();
      }
    }
  }

  function drawPlayer() {
    const blink = player.invuln > 0 && Math.floor(player.invuln * 18) % 2 === 0;
    if (blink) return;

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.fillStyle = player.dashTimer > 0 ? COLORS.playerDash : COLORS.player;
    ctx.beginPath();
    ctx.arc(0, 0, player.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#11161d";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(player.facingX * 22, player.facingY * 22);
    ctx.stroke();

    if (player.attackTimer > 0) {
      ctx.strokeStyle = "#f8f5d6";
      ctx.lineWidth = 5;
      ctx.beginPath();
      const a = Math.atan2(player.facingY, player.facingX);
      ctx.arc(0, 0, 43, a - .75, a + .75);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEnemy(e) {
    if (!e.alive) return;
    ctx.save();
    ctx.translate(e.x, e.y);

    let fill = COLORS.enemy;
    if (e.type === "shooter") fill = COLORS.shooter;
    if (e.type === "sentinel") fill = COLORS.sentinel;
    if (e.type === "boss") fill = COLORS.boss;
    if (e.hitFlash > 0) fill = "#ffffff";

    ctx.fillStyle = fill;

    if (e.type === "sentinel") {
      ctx.rotate(game.time * .5);
      ctx.fillRect(-e.r, -e.r, e.r * 2, e.r * 2);
    } else if (e.type === "boss") {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = Math.PI * 2 * i / 8;
        const rr = i % 2 ? e.r * .72 : e.r;
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, e.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    const bw = e.type === "boss" ? 220 : 42;
    const bh = e.type === "boss" ? 9 : 5;
    const bx = e.type === "boss" ? W / 2 - bw / 2 : e.x - bw / 2;
    const by = e.type === "boss" ? 52 : e.y - e.r - 12;
    ctx.fillStyle = "#2b3038";
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = e.type === "boss" ? "#f25c54" : "#c75c66";
    ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh);
  }

  function drawProjectiles() {
    for (const p of projectiles) {
      ctx.fillStyle = p.hostile ? COLORS.enemyBullet : COLORS.bullet;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHUD() {
    ctx.save();

    ctx.fillStyle = "rgba(8,10,14,.82)";
    ctx.fillRect(18, 16, 250, 76);
    ctx.strokeStyle = "#3e4653";
    ctx.strokeRect(18, 16, 250, 76);

    ctx.fillStyle = COLORS.text;
    ctx.font = "700 16px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(game.room.def.name, 32, 42);

    ctx.fillStyle = COLORS.rule;
    ctx.font = "700 14px sans-serif";
    ctx.fillText(`規則：${game.currentRule.label}`, 32, 67);

    for (let i = 0; i < player.maxHp; i++) {
      ctx.fillStyle = i < player.hp ? "#e46a73" : "#3a3f48";
      ctx.fillRect(290 + i * 25, 24, 18, 18);
    }

    ctx.fillStyle = COLORS.muted;
    ctx.font = "13px sans-serif";
    ctx.fillText(`死亡記憶 ${meta.totalDeaths}`, 290, 65);

    if (game.room.def.boss) {
      ctx.fillStyle = COLORS.muted;
      ctx.textAlign = "center";
      ctx.font = "13px sans-serif";
      ctx.fillText(`規則重寫倒數 ${Math.max(0, game.bossRuleTimer).toFixed(1)} 秒`, W / 2, 82);
    }

    if (game.messageTimer > 0 && game.message) {
      const alpha = Math.min(1, game.messageTimer * 2);
      ctx.globalAlpha = alpha;
      const boxW = 720;
      const boxH = 58;
      const boxX = W / 2 - boxW / 2;
      const boxY = H - 86;
      ctx.fillStyle = "rgba(10,12,16,.92)";
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeStyle = "#4c5562";
      ctx.strokeRect(boxX, boxY, boxW, boxH);
      ctx.fillStyle = COLORS.text;
      ctx.font = "15px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(game.message, W / 2, boxY + 35);
    }

    if (game.roomBannerTimer > 0) {
      const a = Math.min(1, game.roomBannerTimer) * Math.min(1, (2.6 - game.roomBannerTimer) * 2);
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = "rgba(8,10,14,.86)";
      ctx.fillRect(0, H / 2 - 55, W, 110);
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = "center";
      ctx.font = "700 27px sans-serif";
      ctx.fillText(game.room.def.name, W / 2, H / 2 - 5);
      ctx.fillStyle = COLORS.muted;
      ctx.font = "14px sans-serif";
      ctx.fillText(game.room.def.subtitle, W / 2, H / 2 + 26);
    }

    ctx.restore();
  }

  function draw() {
    if (!game.room) {
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, W, H);
      return;
    }

    ctx.save();

    if (game.shake > 0) {
      ctx.translate((Math.random() - .5) * game.shake, (Math.random() - .5) * game.shake);
    }

    drawRoom();
    drawProjectiles();
    for (const e of game.room.enemies) drawEnemy(e);
    drawPlayer();
    drawHUD();

    if (game.flash > 0) {
      ctx.fillStyle = `rgba(255,90,90,${Math.min(.22, game.flash)})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  function loop(ts) {
    const now = ts / 1000;
    const dt = Math.min(.033, game.lastTime ? now - game.lastTime : .016);
    game.lastTime = now;

    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }

    if (!input.keys.has(e.code)) input.pressed.add(e.code);
    input.keys.add(e.code);

    if (e.code === "Escape") togglePause();

    if (e.code === "KeyR" && game.running && !game.paused) {
      restartRoom(false);
    }
  });

  window.addEventListener("keyup", (e) => {
    input.keys.delete(e.code);
  });

  canvas.addEventListener("mousemove", (e) => {
    const box = canvas.getBoundingClientRect();
    input.mouseX = (e.clientX - box.left) / box.width * W;
    input.mouseY = (e.clientY - box.top) / box.height * H;
  });

  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0) input.mouseDown = true;
  });

  document.getElementById("btnStart").addEventListener("click", startGame);
  document.getElementById("btnResume").addEventListener("click", togglePause);

  document.getElementById("btnRestart").addEventListener("click", () => {
    if (!game.running) {
      startGame();
      return;
    }
    game.roomIndex = 0;
    player.hp = player.maxHp;
    enterRoom(0, true);
  });

  document.getElementById("btnEndingRestart").addEventListener("click", () => {
    overlays.ending.classList.remove("show");
    game.running = true;
    game.roomIndex = 0;
    player.hp = player.maxHp;
    enterRoom(0, true);
  });

  document.getElementById("btnResetMeta").addEventListener("click", () => {
    if (!confirm("確定要清除死亡次數、Boss 嘗試與通關記憶嗎？")) return;
    localStorage.removeItem(META_KEY);
    meta = loadMeta();
    showMessage("死亡記憶已清除。", 2);
  });

  // 預先繪製開場背景
  game.room = cloneRoom(0);
  draw();
  requestAnimationFrame(loop);
})();
