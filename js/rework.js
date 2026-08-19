(() => {
  "use strict";

  const STAGE_W = 1600;
  const STAGE_H = 900;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const state = {
    stage: null,
    scene: null,
    scale: 1,
    room: "",
    rhythm: { startedAt: 0, keyHandlerInstalled: false },
    pokerRound: 0,
    lastModalSignature: ""
  };

  const EMBEDDED = new Set([
    "校牌", "警衛室", "公告欄", "離開學校",
    "停住的鐘", "老榕樹", "乾掉的噴水池",
    "破掉的校慶海報", "置物櫃", "拖行痕跡",
    "31 號桌", "32 號桌", "黑板", "班級照片", "抽屜",
    "病床", "藥櫃", "鏡子",
    "電腦 A", "電腦 B", "電腦 C", "伺服器櫃",
    "窗戶", "不存在的窗戶",
    "鋼琴", "校刊書架", "閱覽桌", "歷屆照片",
    "教師桌", "老式保險箱", "看台", "籃球", "器材櫃",
    "紅色布幕", "觀眾席", "鏽蝕置物櫃", "封死的教室",
    "地下樓梯", "主配電盤"
  ]);

  const FOREGROUND = new Set([
    "單隻室內鞋", "紫外線燈", "無線電", "節拍器", "泛黃樂譜",
    "點名簿", "後台紙箱", "紅色電纜", "舊錄音帶"
  ]);

  const HITBOX = {
    "警衛室": [250, 250], "公告欄": [230, 170], "校牌": [220, 150], "離開學校": [170, 220],
    "停住的鐘": [150, 150], "老榕樹": [300, 330], "乾掉的噴水池": [330, 210], "單隻室內鞋": [130, 95],
    "破掉的校慶海報": [180, 240], "置物櫃": [230, 300], "拖行痕跡": [300, 130],
    "31 號桌": [250, 190], "32 號桌": [250, 190], "黑板": [360, 170], "班級照片": [210, 190], "抽屜": [180, 120],
    "病床": [310, 220], "藥櫃": [260, 250], "鏡子": [230, 250], "紫外線燈": [125, 105],
    "電腦 A": [220, 190], "電腦 B": [220, 190], "電腦 C": [220, 190], "伺服器櫃": [240, 310],
    "窗戶": [250, 250], "不存在的窗戶": [250, 250], "無線電": [130, 115],
    "鋼琴": [360, 240], "節拍器": [105, 135], "泛黃樂譜": [140, 120],
    "校刊書架": [280, 330], "閱覽桌": [310, 210], "歷屆照片": [260, 230],
    "教師桌": [300, 210], "點名簿": [130, 110], "老式保險箱": [250, 260],
    "看台": [340, 240], "籃球": [120, 120], "器材櫃": [260, 280],
    "紅色布幕": [360, 300], "觀眾席": [350, 230], "後台紙箱": [170, 145],
    "鏽蝕置物櫃": [260, 300], "封死的教室": [260, 330], "地下樓梯": [250, 250],
    "主配電盤": [240, 260], "紅色電纜": [300, 160], "舊錄音帶": [140, 110]
  };

  function cleanLabel(raw) {
    return String(raw || "")
      .replace(/^已完成[:：]?\s*/, "")
      .replace(/^調查[:：]?\s*/, "")
      .replace(/^互動[:：]?\s*/, "")
      .trim();
  }

  function installStage() {
    const scene = document.getElementById("scene");
    const roomArt = document.getElementById("roomArt");
    const objectLayer = document.getElementById("objectLayer");
    const shade = scene?.querySelector(".scene-shade");
    if (!scene || !roomArt || !objectLayer || !shade || scene.querySelector(".game-stage")) return;

    state.scene = scene;
    const stage = document.createElement("div");
    stage.className = "game-stage";
    stage.setAttribute("aria-hidden", "false");

    roomArt.parentNode.insertBefore(stage, roomArt);
    stage.appendChild(roomArt);

    const photo = document.getElementById("photoRoomArt");
    if (photo) stage.appendChild(photo);
    stage.appendChild(objectLayer);
    stage.appendChild(shade);
    state.stage = stage;

    const resize = () => {
      const r = scene.getBoundingClientRect();
      const scale = Math.min(r.width / STAGE_W, r.height / STAGE_H);
      state.scale = scale;
      stage.style.setProperty("--stage-scale", scale.toFixed(5));
      stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
    };
    resize();
    new ResizeObserver(resize).observe(scene);

    const photoWatcher = new MutationObserver(() => {
      const p = document.getElementById("photoRoomArt");
      if (p && p.parentNode !== stage) stage.insertBefore(p, objectLayer);
    });
    photoWatcher.observe(scene, { childList: true });
  }

  function decorateObject(button) {
    if (!(button instanceof HTMLElement) || !button.matches("button.scene-object")) return;
    const label = cleanLabel(button.dataset.label || button.getAttribute("aria-label"));
    button.dataset.cleanLabel = label;

    if (button.classList.contains("door")) {
      button.classList.add("world-door");
      return;
    }

    if (button.classList.contains("npc") || ["中指通", "TOYZ", "統神", "薛喜？"].includes(label)) {
      button.classList.add("world-npc");
      return;
    }

    if (EMBEDDED.has(label)) button.classList.add("embedded-hitbox");
    if (FOREGROUND.has(label)) button.classList.add("foreground-prop");

    const size = HITBOX[label];
    if (size) {
      button.style.setProperty("--hit-w", `${size[0]}px`);
      button.style.setProperty("--hit-h", `${size[1]}px`);
    }
  }

  function decorateObjects(root = document) {
    $$('button.scene-object', root).forEach(decorateObject);
  }

  function animateRoomChange() {
    const roomName = document.getElementById("roomName");
    const newRoom = roomName?.textContent?.trim() || "";
    if (!newRoom || newRoom === state.room) return;
    state.room = newRoom;
    const stage = state.stage;
    const scene = state.scene;
    if (!stage || !scene) return;
    stage.classList.remove("room-enter");
    scene.classList.remove("room-ui-enter");
    void stage.offsetWidth;
    stage.classList.add("room-enter");
    scene.classList.add("room-ui-enter");
    setTimeout(() => stage.classList.remove("room-enter"), 650);
  }

  function shotForDialogue(who, text) {
    const t = `${who} ${text}`;
    if (/不然勒|我偏要|哪裡？|又我？|閉嘴|真的/.test(t)) return "close";
    if (/超負荷|薛喜？/.test(who)) return "dramatic";
    if (/中指通|TOYZ|統神/.test(who)) return "bust";
    return "medium";
  }

  function decorateDialogue() {
    const layout = $(".dialogue-layout");
    if (!layout) return;
    const who = $(".dialogue-who", layout)?.textContent?.trim() || "";
    const text = $(".dialogue-text", layout)?.textContent?.trim() || "";
    const portrait = $(".portrait", layout);
    if (!portrait) return;

    const shot = shotForDialogue(who, text);
    layout.dataset.speaker = who;
    portrait.dataset.shot = shot;
    portrait.dataset.speaker = who;
    layout.classList.toggle("speaker-right", /薛喜|統神|TOYZ/.test(who));
    layout.classList.toggle("speaker-left", !layout.classList.contains("speaker-right"));

    if (!layout.querySelector(".dialogue-accent")) {
      const accent = document.createElement("div");
      accent.className = "dialogue-accent";
      layout.appendChild(accent);
    }
  }

  function addFeedback(text, tone = "good") {
    const body = document.getElementById("modalBody");
    if (!body) return;
    let el = body.querySelector(".game-feedback");
    if (!el) {
      el = document.createElement("div");
      el.className = "game-feedback";
      body.appendChild(el);
    }
    el.className = `game-feedback ${tone}`;
    el.textContent = text;
    void el.offsetWidth;
    el.classList.add("pop");
    setTimeout(() => el.classList.remove("pop"), 420);
  }

  function decorateRhythm(body) {
    const title = $("h2", body)?.textContent || "";
    if (!title.includes("六指逆拍")) return false;

    const buttons = $$("#rhythmButtons button", body);
    if (!buttons.length) return true;

    const primaryIndex = Math.max(0, buttons.findIndex(b => b.classList.contains("primary")));
    const seq = $(".sequence", body);
    if (seq) seq.classList.add("rhythm-progress");

    let arena = $(".rhythm-arena", body);
    if (!arena) {
      arena = document.createElement("div");
      arena.className = "rhythm-arena";
      arena.innerHTML = `
        <div class="rhythm-lanes">${[0,1,2,3,4,5].map(i => `<div class="rhythm-lane" data-lane="${i}"><span></span></div>`).join("")}</div>
        <div class="rhythm-judge-line"></div>
        <div class="rhythm-help">節拍落到判定線附近再點擊。鍵盤 A S D J K L 也可以。</div>`;
      const grid = $("#rhythmButtons", body);
      grid?.parentNode.insertBefore(arena, grid);
    }

    $$(".rhythm-lane", arena).forEach((lane, i) => lane.classList.toggle("target", i === primaryIndex));
    let note = $(".falling-note", arena);
    if (!note) {
      note = document.createElement("i");
      note.className = "falling-note";
      arena.appendChild(note);
    }
    note.style.left = `${(primaryIndex + 0.5) * (100/6)}%`;
    note.classList.remove("run");
    void note.offsetWidth;
    note.classList.add("run");
    state.rhythm.startedAt = performance.now();

    buttons.forEach((b, i) => {
      b.dataset.lane = String(i);
      if (b.dataset.timingGuard === "1") return;
      b.dataset.timingGuard = "1";
      b.addEventListener("click", (ev) => {
        const elapsed = performance.now() - state.rhythm.startedAt;
        if (i !== primaryIndex) {
          addFeedback("MISS", "bad");
          return;
        }
        const delta = Math.abs(elapsed - 760);
        if (delta > 310) {
          ev.preventDefault();
          ev.stopImmediatePropagation();
          addFeedback("MISS · 太早或太晚", "bad");
          note.classList.remove("run");
          void note.offsetWidth;
          note.classList.add("run");
          state.rhythm.startedAt = performance.now();
          return;
        }
        addFeedback(delta < 115 ? "PERFECT" : "GOOD", delta < 115 ? "perfect" : "good");
      }, true);
    });

    if (!state.rhythm.keyHandlerInstalled) {
      state.rhythm.keyHandlerInstalled = true;
      document.addEventListener("keydown", (e) => {
        const map = {a:0,s:1,d:2,j:3,k:4,l:5};
        const idx = map[e.key.toLowerCase()];
        if (idx == null) return;
        const active = document.querySelectorAll("#rhythmButtons button");
        if (!active.length) return;
        e.preventDefault();
        active[idx]?.click();
      });
    }
    return true;
  }

  function card(rank, suit, hidden = false) {
    if (hidden) return `<div class="poker-card back"><span>R</span></div>`;
    const red = suit === "♥" || suit === "♦";
    return `<div class="poker-card ${red ? "red" : ""}"><b>${rank}</b><span>${suit}</span></div>`;
  }

  function pokerVisualFor(face, tell) {
    const seed = [...`${face}:${tell}`].reduce((n, c) => n + c.charCodeAt(0), 0);
    const ranks = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
    const suits = ["♠","♥","♦","♣"];
    const pick = (n) => [ranks[(seed + n * 7) % ranks.length], suits[(seed + n * 3) % suits.length]];
    return [pick(1),pick(2),pick(3),pick(4),pick(5)];
  }

  function decoratePoker(body) {
    const title = $("h2", body)?.textContent || "";
    if (!title.includes("統神 vs 薛喜")) return false;

    const note = $(".note", body);
    const faceText = $("b", note)?.textContent?.replace("表情：", "").trim() || "觀察";
    const tellText = $("span", note)?.textContent?.trim() || "";
    const p = $("p", body)?.textContent || "";
    const chipMatch = p.match(/薛喜籌碼\s*(\d+)\s*統神\s*(\d+)/);
    const player = chipMatch ? Number(chipMatch[1]) : 6;
    const god = chipMatch ? Number(chipMatch[2]) : 6;
    const board = pokerVisualFor(faceText, tellText);

    let table = $(".poker-table", body);
    if (!table) {
      table = document.createElement("div");
      table.className = "poker-table";
      note?.parentNode.insertBefore(table, note);
    }

    table.dataset.face = faceText;
    table.innerHTML = `
      <div class="poker-opponent">
        <div class="poker-face" data-expression="${faceText}">
          <img src="assets/characters/tongshen.webp" alt="">
          <span class="expression-tag">${faceText}</span>
        </div>
        <div class="poker-hand">${card("?","?",true)}${card("?","?",true)}</div>
        <div class="chip-stack">統神 <b>${god}</b></div>
      </div>
      <div class="poker-center">
        <div class="pot">POT <b>${Math.max(0, 12 - player - god + 4)}</b></div>
        <div class="community-cards">${board.slice(0,3).map(x=>card(x[0],x[1])).join("")}${card(board[3][0],board[3][1], state.pokerRound < 1)}${card(board[4][0],board[4][1], state.pokerRound < 2)}</div>
        <div class="street">${state.pokerRound < 1 ? "FLOP" : state.pokerRound < 2 ? "TURN" : "RIVER"}</div>
      </div>
      <div class="poker-player">
        <div class="poker-hand">${card("A","♠")}${card("10","♥")}</div>
        <div class="chip-stack">薛喜 <b>${player}</b></div>
      </div>`;

    if (note) note.classList.add("poker-tell");
    const buttons = $$("#pokerButtons button", body);
    const labels = ["CALL｜跟注／抓 Bluff", "FOLD｜蓋牌／尊重大牌", "RAISE｜反向讀取"];
    buttons.forEach((b, i) => {
      b.textContent = labels[i] || b.textContent;
      b.addEventListener("click", () => { state.pokerRound = (state.pokerRound + 1) % 3; }, { once: true });
    });
    return true;
  }

  function decorateInvestigation(body) {
    const title = $("h2", body)?.textContent || "";
    if (!/班級照片|紫外線調查|四台機器啟動順序|紙捲競速/.test(title)) return false;
    body.classList.add("investigation-modal");
    const stage = $(".mini-stage", body);
    if (stage) stage.classList.add("interactive-evidence");
    return true;
  }

  function decorateBoss(body) {
    const panel = $(".boss-panel", body);
    if (!panel) return false;
    const title = $("h2", panel)?.textContent || "";
    panel.dataset.boss = title.includes("金字塔") ? "pyramid" : "overload";
    const hpText = $(".hp", panel)?.textContent || "";
    const nums = [...hpText.matchAll(/(\d+)/g)].map(m => Number(m[1]));
    const bossHp = nums[0] ?? 0;
    const max = panel.dataset.boss === "pyramid" ? 10 : 30;
    let meter = $(".boss-hp-meter", panel);
    if (!meter) {
      meter = document.createElement("div");
      meter.className = "boss-hp-meter";
      meter.innerHTML = "<i></i>";
      $(".hp", panel)?.insertAdjacentElement("afterend", meter);
    }
    meter.querySelector("i").style.width = `${Math.max(0, Math.min(100, bossHp / max * 100))}%`;
    return true;
  }

  function decorateModal() {
    const body = document.getElementById("modalBody");
    if (!body || !body.children.length) return;
    decorateDialogue();
    if (decorateRhythm(body)) return;
    if (decoratePoker(body)) return;
    if (decorateBoss(body)) return;
    decorateInvestigation(body);
  }

  function enhanceMessages() {
    const box = document.getElementById("messageBox");
    if (!box) return;
    new MutationObserver(() => {
      if (!box.textContent.trim()) return;
      box.classList.remove("message-pulse");
      void box.offsetWidth;
      box.classList.add("message-pulse");
      box.dataset.kind = /取得線索|TRUE ROUTE|可以|成功/.test(box.textContent) ? "success" : /錯|失敗|鎖|不見/.test(box.textContent) ? "danger" : "info";
    }).observe(box, { childList: true, characterData: true, subtree: true });
  }

  function boot() {
    installStage();
    decorateObjects();
    animateRoomChange();
    decorateModal();
    enhanceMessages();

    const app = document.getElementById("app");
    if (!app) return;
    new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches?.("button.scene-object")) decorateObject(node);
          decorateObjects(node);
        });
      }
      installStage();
      animateRoomChange();
      decorateModal();
    }).observe(app, { childList: true, subtree: true, characterData: true });

    const roomName = document.getElementById("roomName");
    if (roomName) new MutationObserver(animateRoomChange).observe(roomName, { childList:true, characterData:true, subtree:true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
