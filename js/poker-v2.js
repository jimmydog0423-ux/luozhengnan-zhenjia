(() => {
  "use strict";

  const SUITS = ["♠", "♥", "♦", "♣"];
  const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const RANK_LABEL = { 11: "J", 12: "Q", 13: "K", 14: "A" };
  const STREET_NAME = ["PRE-FLOP", "FLOP", "TURN", "RIVER"];
  const MAX_HANDS = 4;
  const THINK_MS = 15000;

  const TELLS = {
    freeze: [
      "統神忽然停止碎念，右手停在籌碼上。",
      "他盯著桌面不動，連手指都停了。",
      "他把背挺直，沒有立刻看你的反應。"
    ],
    fidget: [
      "他把最上面的兩枚籌碼交換位置，又換回去。",
      "他的手指在桌邊敲了兩下，第三下停住。",
      "他摸了一次牌角，又很快把手收回去。"
    ],
    glance: [
      "他看了一眼你的籌碼，再看公共牌。",
      "他的視線在你的手和牌桌之間來回一次。",
      "他先看底牌，再抬眼看你，動作很短。"
    ],
    breathe: [
      "他往後靠，呼吸突然變得很慢。",
      "他把肩膀放鬆，下注前多停了半拍。",
      "他靠回椅背，像在等你先犯錯。"
    ],
    snap: [
      "籌碼被很快推進中央，幾乎沒有停頓。",
      "他這次下注比上一輪快很多。",
      "他用指尖把籌碼彈進底池，動作乾脆。"
    ]
  };

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function freshDeck() {
    return shuffle(SUITS.flatMap(s => RANKS.map(r => ({ r, s }))));
  }

  function rankText(r) {
    return RANK_LABEL[r] || String(r);
  }

  function isRed(card) {
    return card && (card.s === "♥" || card.s === "♦");
  }

  function cardHTML(card, { hidden = false, cls = "", delay = 0, slot = false } = {}) {
    if (slot) return `<div class="adv-card-slot"></div>`;
    if (hidden) {
      return `<div class="adv-card card-back ${cls}" style="--delay:${delay}ms"><i></i></div>`;
    }
    return `<div class="adv-card ${isRed(card) ? "red" : ""} ${cls}" style="--delay:${delay}ms"><b>${rankText(card.r)}</b><span>${card.s}</span><em>${card.s}</em></div>`;
  }

  function compareScore(a, b) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const d = (a[i] || 0) - (b[i] || 0);
      if (d) return d;
    }
    return 0;
  }

  function eval5(cards) {
    const ranks = cards.map(c => c.r).sort((a, b) => b - a);
    const counts = new Map();
    ranks.forEach(r => counts.set(r, (counts.get(r) || 0) + 1));
    const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
    const flush = cards.every(c => c.s === cards[0].s);
    const uniq = [...new Set(ranks)];
    if (uniq.includes(14)) uniq.push(1);
    uniq.sort((a, b) => b - a);
    let straightHigh = 0;
    for (let i = 0; i <= uniq.length - 5; i++) {
      if (uniq[i] - uniq[i + 4] === 4) { straightHigh = uniq[i]; break; }
    }

    if (flush && straightHigh) return [8, straightHigh];
    if (groups[0][1] === 4) return [7, groups[0][0], groups.find(g => g[1] === 1)[0]];
    if (groups[0][1] === 3 && groups[1]?.[1] >= 2) return [6, groups[0][0], groups[1][0]];
    if (flush) return [5, ...ranks];
    if (straightHigh) return [4, straightHigh];
    if (groups[0][1] === 3) return [3, groups[0][0], ...groups.filter(g => g[1] === 1).map(g => g[0]).sort((a,b)=>b-a)];
    const pairs = groups.filter(g => g[1] === 2).map(g => g[0]).sort((a,b)=>b-a);
    if (pairs.length >= 2) {
      const kicker = groups.filter(g => g[1] === 1).map(g => g[0]).sort((a,b)=>b-a)[0] || 0;
      return [2, pairs[0], pairs[1], kicker];
    }
    if (pairs.length === 1) {
      return [1, pairs[0], ...groups.filter(g => g[1] === 1).map(g => g[0]).sort((a,b)=>b-a)];
    }
    return [0, ...ranks];
  }

  function bestScore(cards) {
    if (cards.length < 5) return null;
    let best = null;
    const n = cards.length;
    for (let a = 0; a < n - 4; a++)
      for (let b = a + 1; b < n - 3; b++)
        for (let c = b + 1; c < n - 2; c++)
          for (let d = c + 1; d < n - 1; d++)
            for (let e = d + 1; e < n; e++) {
              const score = eval5([cards[a], cards[b], cards[c], cards[d], cards[e]]);
              if (!best || compareScore(score, best) > 0) best = score;
            }
    return best;
  }

  function scoreName(score) {
    if (!score) return "尚未成牌";
    return ["高牌", "一對", "兩對", "三條", "順子", "同花", "葫蘆", "四條", "同花順"][score[0]];
  }

  function preflopName(hole) {
    if (hole[0].r === hole[1].r) return `${rankText(hole[0].r)} 口袋對`;
    return `${rankText(Math.max(hole[0].r, hole[1].r))} 高張`;
  }

  function strengthOf(hole, board) {
    const cards = hole.concat(board);
    if (cards.length < 5) {
      const [a, b] = hole.map(c => c.r).sort((x,y)=>y-x);
      let s = (a / 14) * 0.34 + (b / 14) * 0.14;
      if (a === b) s += 0.34 + a / 70;
      if (hole[0].s === hole[1].s) s += 0.07;
      if (Math.abs(a - b) <= 2) s += 0.055;
      if (a >= 12 && b >= 10) s += 0.08;
      return Math.max(0.08, Math.min(0.94, s));
    }
    const score = bestScore(cards);
    const base = [0.15, 0.40, 0.57, 0.66, 0.74, 0.81, 0.88, 0.95, 0.99][score[0]];
    return Math.min(0.995, base + ((score[1] || 0) / 14) * 0.045);
  }

  function randomTell(strength, bluff) {
    let type;
    if (bluff) type = Math.random() < 0.62 ? "fidget" : "snap";
    else if (strength > 0.72) type = Math.random() < 0.58 ? "freeze" : "breathe";
    else if (strength > 0.48) type = "glance";
    else type = Math.random() < 0.55 ? "breathe" : "glance";

    // Tells are useful but never a lookup table. Sometimes the body language lies.
    if (Math.random() < 0.20) {
      const alternatives = ["freeze", "fidget", "glance", "breathe", "snap"].filter(x => x !== type);
      type = alternatives[Math.floor(Math.random() * alternatives.length)];
    }
    const lines = TELLS[type];
    return { type, text: lines[Math.floor(Math.random() * lines.length)] };
  }

  function advancedPokerMini() {
    let active = true;
    let timer = null;
    let token = 0;
    let handNo = 0;
    let player = 14;
    let god = 14;
    let pot = 0;
    let street = 0;
    let deck = [];
    let playerHole = [];
    let godHole = [];
    let board = [];
    let oppBet = 0;
    let lastTell = { type: "glance", text: "統神把牌壓在桌面上，等你坐好。" };
    let lastOppAction = "等待發牌";
    let decisionLocked = false;
    let resultText = "";
    let resultTone = "";
    let showdownReveal = false;
    let handPotSnapshot = 0;

    const visibleBoardCount = () => street === 0 ? 0 : street === 1 ? 3 : street === 2 ? 4 : 5;
    const visibleBoard = () => board.slice(0, visibleBoardCount());

    function cleanup() {
      active = false;
      token++;
      clearTimeout(timer);
    }

    function setModal(html, closable = true) {
      if (!active) return;
      showModal(html, { closable, onClose: cleanup });
    }

    function showRules() {
      setModal(`
        <div class="poker-v2 poker-rules">
          <div class="eyebrow">HEADS-UP HOLD'EM</div>
          <h2>統神 VS 薛喜：午夜德州</h2>
          <div class="poker-rule-board">
            <div><b>01</b><span>每局依序經過 PRE-FLOP、FLOP、TURN、RIVER。</span></div>
            <div><b>02</b><span>看自己的底牌、公共牌、下注節奏與對手動作，在時間內決定 Check / Call / Raise / Fold。</span></div>
            <div><b>03</b><span>四局後籌碼較多者勝；籌碼歸零會提前結束，平手進入 Sudden Death。</span></div>
            <div><b>04</b><span>遊戲不會告訴你哪個動作代表強牌或 Bluff。每次牌局與行為都會改變。</span></div>
          </div>
          <p class="poker-rule-note">每次決策 15 秒。無人下注時逾時視為 Check；面對下注時逾時視為 Fold。</p>
          <button id="pokerV2Start" class="primary poker-start" type="button">坐下發牌</button>
        </div>`);
      const start = document.getElementById("pokerV2Start");
      if (start) start.onclick = startHand;
    }

    function takePlayer(amount) {
      const paid = Math.max(0, Math.min(player, amount));
      player -= paid;
      pot += paid;
      animateChips("player", paid);
      return paid;
    }

    function takeGod(amount) {
      const paid = Math.max(0, Math.min(god, amount));
      god -= paid;
      pot += paid;
      animateChips("opponent", paid);
      return paid;
    }

    function award(winner) {
      const amount = pot;
      if (winner === "player") player += amount;
      else if (winner === "god") god += amount;
      else {
        const half = Math.floor(amount / 2);
        player += half;
        god += amount - half;
      }
      pot = 0;
      return amount;
    }

    function startHand() {
      if (!active) return;
      clearTimeout(timer);
      handNo++;
      street = 0;
      pot = 0;
      oppBet = 0;
      showdownReveal = false;
      resultText = "";
      resultTone = "";
      deck = freshDeck();
      playerHole = [deck.pop(), deck.pop()];
      godHole = [deck.pop(), deck.pop()];
      board = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];

      takePlayer(1);
      takeGod(1);
      lastTell = { type: "glance", text: handNo > MAX_HANDS ? "平手。統神把下一副牌直接推進桌面。" : "統神把底牌壓低，只露出背面。" };
      lastOppAction = handNo > MAX_HANDS ? "SUDDEN DEATH · 雙方投入 Ante 1" : "雙方投入 Ante 1";
      renderTable({ dealing: true });

      const myToken = ++token;
      setTimeout(() => {
        if (!active || myToken !== token) return;
        beginStreet();
      }, 900);
    }

    function beginStreet() {
      if (!active) return;
      decisionLocked = false;
      oppBet = 0;
      const strength = strengthOf(godHole, visibleBoard());
      const bluff = strength < 0.50 && Math.random() < (0.20 + street * 0.025);
      const pressure = strength + (bluff ? 0.30 : 0) + (Math.random() - 0.5) * 0.18;
      lastTell = randomTell(strength, bluff);

      if (god <= 0) {
        showdown();
        return;
      }

      if (pressure > 0.69) {
        const wanted = pressure > 0.84 ? 3 : 2;
        oppBet = takeGod(wanted);
        lastOppAction = oppBet ? `統神下注 ${oppBet}` : "統神 Check";
      } else {
        lastOppAction = "統神 Check";
      }

      renderTable({ decision: true, freshStreet: true });
      startDecisionTimer();
    }

    function startDecisionTimer() {
      clearTimeout(timer);
      const myToken = ++token;
      timer = setTimeout(() => {
        if (!active || myToken !== token || decisionLocked) return;
        resolvePlayerAction(oppBet > 0 ? "fold" : "check", true);
      }, THINK_MS);
    }

    function playerHandLabel() {
      const cards = playerHole.concat(visibleBoard());
      return cards.length < 5 ? preflopName(playerHole) : scoreName(bestScore(cards));
    }

    function boardHTML(freshStreet) {
      const visible = visibleBoardCount();
      const newlyFrom = street === 1 ? 0 : street === 2 ? 3 : street === 3 ? 4 : 99;
      return board.map((c, i) => {
        if (i >= visible) return cardHTML(null, { slot: true });
        const fresh = freshStreet && i >= newlyFrom;
        return cardHTML(c, { cls: fresh ? "board-reveal" : "board-settled", delay: fresh ? (i - newlyFrom) * 110 : 0 });
      }).join("");
    }

    function renderTable({ decision = false, dealing = false, freshStreet = false, showdown = false, reraised = false } = {}) {
      if (!active) return;
      const sudden = handNo > MAX_HANDS;
      const oppCards = godHole.map((c, i) => cardHTML(c, { hidden: !showdownReveal, cls: dealing ? "deal-opponent" : showdown ? "showdown-card" : "", delay: 150 + i * 120 })).join("");
      const myCards = playerHole.map((c, i) => cardHTML(c, { cls: dealing ? "deal-player" : "", delay: i * 120 })).join("");
      const actionClass = lastTell.type || "glance";
      const stageClass = [dealing ? "is-dealing" : "", showdown ? "is-showdown" : "", reraised ? "is-reraise" : ""].filter(Boolean).join(" ");

      let actions = "";
      if (decision) {
        if (reraised) {
          const call = Math.min(player, oppBet);
          actions = `<button data-poker-act="fold" class="danger">FOLD<small>棄牌</small></button><button data-poker-act="call-reraise" class="primary">CALL ${call}<small>跟上反加</small></button>`;
        } else if (oppBet > 0) {
          const call = Math.min(player, oppBet);
          const raiseCost = Math.min(player, oppBet + 2);
          actions = `<button data-poker-act="fold" class="danger">FOLD<small>棄牌</small></button><button data-poker-act="call" class="primary">CALL ${call}<small>跟注</small></button><button data-poker-act="raise">RAISE ${raiseCost}<small>跟注再加壓</small></button>`;
        } else {
          actions = `<button data-poker-act="check">CHECK<small>過牌</small></button><button data-poker-act="bet2" class="primary">BET 2<small>小注</small></button><button data-poker-act="bet4">BET 4<small>重注</small></button>`;
        }
      }

      setModal(`
        <div class="poker-v2">
          <div class="poker-v2-head">
            <div><div class="eyebrow">${sudden ? "SUDDEN DEATH" : `HAND ${Math.min(handNo, MAX_HANDS)} / ${MAX_HANDS}`}</div><h2>統神 VS 薛喜：午夜德州</h2></div>
            <div class="poker-score"><span>薛喜 <b>${player}</b></span><span>統神 <b>${god}</b></span></div>
          </div>
          <div id="pokerV2Stage" class="poker-v2-stage ${stageClass}" data-tell="${actionClass}">
            <div class="poker-v2-bg"></div>
            <div class="poker-opponent-v2">
              <div class="poker-avatar-v2 tell-${actionClass}"><img src="assets/characters/tongshen.webp" alt="統神"><i></i></div>
              <div class="poker-nameplate">統神 <span>${god} CHIPS</span></div>
              <div class="poker-hole-v2 opponent-hole">${oppCards}</div>
            </div>
            <div class="poker-table-v2">
              <div class="street-badge">${STREET_NAME[street]}</div>
              <div class="pot-v2">POT <b>${showdown && handPotSnapshot ? handPotSnapshot : pot}</b></div>
              <div class="community-v2">${boardHTML(freshStreet)}</div>
              <div class="opponent-action-v2">${lastOppAction}</div>
              <div class="tell-v2"><span>OBSERVE</span>${lastTell.text}</div>
              ${resultText ? `<div class="poker-result-v2 ${resultTone}">${resultText}</div>` : ""}
            </div>
            <div class="poker-player-v2">
              <div class="poker-hole-v2 player-hole">${myCards}</div>
              <div class="poker-nameplate player">薛喜 <span>${player} CHIPS</span></div>
              <div class="my-hand-v2">目前牌型 <b>${playerHandLabel()}</b></div>
            </div>
          </div>
          ${decision ? `<div class="poker-decision-v2"><div class="poker-clock"><i></i><span>DECISION</span></div><div id="pokerV2Buttons" class="poker-actions-v2">${actions}</div></div>` : ""}
        </div>`);

      if (decision) {
        document.querySelectorAll("[data-poker-act]").forEach(btn => {
          btn.onclick = () => resolvePlayerAction(btn.dataset.pokerAct, false);
        });
      }
    }

    function resolvePlayerAction(action, timedOut) {
      if (!active || decisionLocked) return;
      decisionLocked = true;
      clearTimeout(timer);
      token++;

      if (action === "fold") {
        resultText = timedOut ? "TIME OUT · FOLD" : "FOLD";
        resultTone = "lose";
        const won = award("god");
        handPotSnapshot = won;
        lastOppAction = `統神收下 ${won} 籌碼`;
        renderTable({ showdown: false });
        return afterHandDelay();
      }

      if (action === "check") {
        lastOppAction = timedOut ? "時間到 · 薛喜 Check" : "薛喜 Check";
        return settleStreetSoon();
      }

      if (action === "call") {
        const paid = takePlayer(oppBet);
        lastOppAction = `薛喜 Call ${paid}`;
        oppBet = 0;
        return settleStreetSoon();
      }

      if (action === "call-reraise") {
        const paid = takePlayer(oppBet);
        lastOppAction = `薛喜跟上反加 ${paid}`;
        oppBet = 0;
        return settleStreetSoon();
      }

      if (action === "raise") {
        const call = oppBet;
        const total = takePlayer(call + 2);
        const extra = Math.max(0, total - call);
        lastOppAction = `薛喜 Raise 到 ${total}`;
        const strength = strengthOf(godHole, visibleBoard());
        const foldChance = strength < 0.36 ? 0.66 : strength < 0.50 ? 0.34 : 0.07;
        if (Math.random() < foldChance) {
          resultText = "統神 FOLD";
          resultTone = "win";
          const won = award("player");
          handPotSnapshot = won;
          renderTable({ showdown: false });
          return afterHandDelay();
        }
        const matched = takeGod(extra);
        oppBet = 0;
        lastOppAction = `統神 Call ${matched}`;
        return settleStreetSoon();
      }

      if (action === "bet2" || action === "bet4") {
        const amount = action === "bet4" ? 4 : 2;
        const paid = takePlayer(amount);
        lastOppAction = `薛喜 Bet ${paid}`;
        return opponentRespondToBet(paid);
      }
    }

    function opponentRespondToBet(amount) {
      const strength = strengthOf(godHole, visibleBoard());
      const bluffDefend = strength < 0.43 && Math.random() < 0.18;
      const foldChance = strength < 0.30 ? 0.62 : strength < 0.45 ? 0.34 : 0.05;

      if (!bluffDefend && Math.random() < foldChance) {
        lastTell = randomTell(strength, false);
        lastOppAction = "統神 FOLD";
        resultText = "BET 拿下底池";
        resultTone = "win";
        const won = award("player");
        handPotSnapshot = won;
        renderTable({ showdown: false });
        return afterHandDelay();
      }

      const canRaise = god >= amount + 2 && player > 0;
      const raise = canRaise && (strength > 0.76 || (bluffDefend && Math.random() < 0.42));
      if (raise) {
        takeGod(amount + 2);
        oppBet = Math.min(player, 2);
        lastTell = randomTell(strength, bluffDefend);
        lastOppAction = `統神 RE-RAISE · 你還要補 ${oppBet}`;
        decisionLocked = false;
        renderTable({ decision: true, reraised: true });
        startDecisionTimer();
        return;
      }

      const paid = takeGod(amount);
      lastOppAction = `統神 Call ${paid}`;
      oppBet = 0;
      settleStreetSoon();
    }

    function settleStreetSoon() {
      const myToken = ++token;
      renderTable();
      setTimeout(() => {
        if (!active || myToken !== token) return;
        if (street >= 3 || player <= 0 || god <= 0) showdown();
        else {
          street++;
          beginStreet();
        }
      }, 720);
    }

    function showdown() {
      clearTimeout(timer);
      token++;
      showdownReveal = true;
      street = 3;
      const pScore = bestScore(playerHole.concat(board));
      const gScore = bestScore(godHole.concat(board));
      const cmp = compareScore(pScore, gScore);
      const winner = cmp > 0 ? "player" : cmp < 0 ? "god" : "tie";
      const amount = pot;
      handPotSnapshot = amount;
      award(winner);
      if (winner === "player") {
        resultText = `SHOWDOWN WIN · ${scoreName(pScore)} +${amount}`;
        resultTone = "win";
      } else if (winner === "god") {
        resultText = `SHOWDOWN LOST · 統神 ${scoreName(gScore)}`;
        resultTone = "lose";
      } else {
        resultText = `SPLIT POT · ${scoreName(pScore)}`;
        resultTone = "tie";
      }
      lastOppAction = `統神亮牌：${scoreName(gScore)}`;
      renderTable({ showdown: true, freshStreet: true });
      afterHandDelay(1900);
    }

    function afterHandDelay(ms = 1450) {
      clearTimeout(timer);
      const myToken = ++token;
      setTimeout(() => {
        if (!active || myToken !== token) return;
        if (god <= 0) return finishMatch(true, "統神籌碼歸零");
        if (player <= 0) return finishMatch(false, "你的籌碼已經歸零");
        if (handNo >= MAX_HANDS && player !== god) return finishMatch(player > god, `四局結束 · ${player}：${god}`);
        startHand();
      }, ms);
    }

    function finishMatch(win, detail) {
      cleanup();
      hideModal();
      if (win) {
        G.flags.pokerWon = true;
        G.miniWins++;
        setMsg(`統神：可以啦。${detail}。點名簿你拿去。`, 3200);
        renderRoom();
        saveRun();
      } else {
        G.wrongChoices++;
        setMsg(`統神：你只看按鈕不看人喔？${detail}，再來。`, 3200);
        renderRoom();
        saveRun();
      }
    }

    function animateChips(from, amount) {
      if (!amount) return;
      requestAnimationFrame(() => {
        const stage = document.getElementById("pokerV2Stage");
        if (!stage) return;
        const count = Math.min(5, amount);
        for (let i = 0; i < count; i++) {
          const chip = document.createElement("i");
          chip.className = `poker-chip-flight from-${from}`;
          chip.style.setProperty("--chip-i", String(i));
          stage.appendChild(chip);
          setTimeout(() => chip.remove(), 720);
        }
      });
    }

    showRules();
  }

  // Replace the original fixed-pattern poker challenge. The old function is a
  // classic-script global binding, so assigning both forms keeps all existing
  // interactProp/startDialogue callbacks pointed at the new game.
  try { startPokerMini = advancedPokerMini; } catch (_) {}
  window.startPokerMini = advancedPokerMini;
})();
