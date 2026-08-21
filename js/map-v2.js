(() => {
  "use strict";

  const body = document.getElementById("modalBody");
  if (!body) return;

  const POSITIONS = {
    "校門":       { x: 46.0, y: 84.0, side: "top" },
    "中庭":       { x: 41.5, y: 56.5, side: "top" },
    "體育館":     { x: 18.8, y: 25.5, side: "bottom" },
    "紅色禮堂":   { x: 42.5, y: 21.5, side: "bottom" },
    "一樓走廊":   { x: 70.5, y: 43.5, side: "left" },
    "二年三班":   { x: 84.8, y: 33.0, side: "left" },
    "保健室":     { x: 87.3, y: 49.8, side: "left" },
    "電腦教室":   { x: 65.3, y: 62.0, side: "right" },
    "二樓走廊":   { x: 72.3, y: 24.7, side: "left" },
    "音樂教室":   { x: 87.0, y: 63.6, side: "left" },
    "圖書館":     { x: 76.2, y: 63.2, side: "top" },
    "教職員室":   { x: 77.0, y: 47.0, side: "top" },
    "舊校舍":     { x: 18.0, y: 56.0, side: "bottom" },
    "地下機房":   { x: 79.0, y: 88.0, side: "top" }
  };

  let queued = false;

  function cleanName(button) {
    const text = button.querySelector("b")?.textContent || button.textContent || "";
    return Object.keys(POSITIONS).find(name => text.includes(name)) || text.replace(/[●✓🔒]/g, "").trim();
  }

  function enhance() {
    queued = false;
    const title = body.querySelector(".modal-title");
    const grid = body.querySelector("#mapGrid");
    if (!title || !/紅色學校平面圖/.test(title.textContent || "") || !grid) return;
    if (body.querySelector(".campus-map-v2")) return;

    const oldIntro = title.nextElementSibling;
    const buttons = [...grid.querySelectorAll("button")];

    const wrap = document.createElement("div");
    wrap.className = "campus-map-v2";
    wrap.innerHTML = `
      <div class="campus-map-toolbar">
        <div><b>紅色學校 · 校園配置圖</b><span>拖曳地圖查看校舍；到過的地點可直接快速移動。</span></div>
        <div class="campus-map-legend"><i class="current"></i>目前位置 <i class="visited"></i>已探索 <i class="locked"></i>未探索</div>
      </div>
      <div class="campus-map-scroll">
        <div class="campus-map-canvas">
          <img src="assets/backgrounds/map.png" alt="紅色學校校園地圖" draggable="false">
          <div class="campus-map-pins" aria-label="快速移動地點"></div>
        </div>
      </div>
    `;

    const pins = wrap.querySelector(".campus-map-pins");
    buttons.forEach(button => {
      const name = cleanName(button);
      const pos = POSITIONS[name];
      if (!pos) return;

      button.classList.add("campus-map-pin", `label-${pos.side}`);
      button.dataset.roomName = name;
      button.style.left = `${pos.x}%`;
      button.style.top = `${pos.y}%`;
      button.innerHTML = `<span class="campus-map-pin-core" aria-hidden="true"></span><span class="campus-map-pin-label">${name}</span>${button.classList.contains("current") ? '<em>你在這裡</em>' : ""}`;
      pins.appendChild(button);
    });

    grid.replaceWith(wrap);
    if (oldIntro && oldIntro.tagName === "P") oldIntro.remove();

    requestAnimationFrame(() => focusCurrent(wrap));
  }

  function focusCurrent(wrap) {
    const scroll = wrap.querySelector(".campus-map-scroll");
    const canvas = wrap.querySelector(".campus-map-canvas");
    const current = wrap.querySelector(".campus-map-pin.current");
    if (!scroll || !canvas || !current) return;

    const x = parseFloat(current.style.left) / 100;
    const y = parseFloat(current.style.top) / 100;
    const targetX = canvas.scrollWidth * x - scroll.clientWidth / 2;
    const targetY = canvas.scrollHeight * y - scroll.clientHeight / 2;
    scroll.scrollLeft = Math.max(0, targetX);
    scroll.scrollTop = Math.max(0, targetY);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(enhance);
  }

  new MutationObserver(schedule).observe(body, { childList: true, subtree: true });
  schedule();
})();