(() => {
  "use strict";

  const roomArt = document.getElementById("roomArt");
  const roomUse = document.getElementById("roomArtUse");
  if (!roomArt || !roomUse) return;

  const BACKGROUNDS = {
    gate: "assets/backgrounds/gate.webp",
    courtyard: "assets/backgrounds/courtyard.webp",
    hall1: "assets/backgrounds/hall1.webp",
    auditorium: "assets/backgrounds/auditorium.webp",
    class203: "assets/backgrounds/class203.webp",
    infirmary: "assets/backgrounds/infirmary.webp",
    computer: "assets/backgrounds/computer.webp",
    hall2: "assets/backgrounds/hall2.webp",
    music: "assets/backgrounds/music.webp",
    library: "assets/backgrounds/library.webp",
    staff: "assets/backgrounds/staff.webp",
    gym: "assets/backgrounds/gym.webp",
    oldhall: "assets/backgrounds/oldhall.webp",
    basement: "assets/backgrounds/basement.webp"
  };

  const photo = document.createElement("img");
  photo.id = "photoRoomArt";
  photo.className = "room-art photo-room-art";
  photo.alt = "";
  photo.setAttribute("aria-hidden", "true");
  photo.style.display = "none";
  photo.style.pointerEvents = "none";
  photo.style.objectFit = "cover";
  photo.style.objectPosition = "center";
  roomArt.insertAdjacentElement("afterend", photo);

  function syncBackground() {
    const href = roomUse.getAttribute("href") || "";
    const room = href.includes("#room-") ? href.split("#room-")[1] : "";
    const src = BACKGROUNDS[room];

    if (src) {
      if (photo.getAttribute("src") !== src) photo.setAttribute("src", src);
      photo.style.display = "block";
      roomArt.style.display = "none";
    } else {
      photo.style.display = "none";
      roomArt.style.display = "block";
    }
  }

  new MutationObserver(syncBackground).observe(roomUse, {
    attributes: true,
    attributeFilter: ["href"]
  });

  syncBackground();

  if (!document.querySelector("script[data-character-loader]")) {
    const characterScript = document.createElement("script");
    characterScript.src = "js/characters.js";
    characterScript.dataset.characterLoader = "true";
    document.body.appendChild(characterScript);
  }

  if (!document.querySelector("script[data-object-loader]")) {
    const objectScript = document.createElement("script");
    objectScript.src = "js/objects.js";
    objectScript.dataset.objectLoader = "true";
    document.body.appendChild(objectScript);
  }

  if (!document.querySelector("script[data-minigame-art-loader]")) {
    const minigameScript = document.createElement("script");
    minigameScript.src = "js/minigames-art.js?v=20260821-0921";
    minigameScript.dataset.minigameArtLoader = "true";
    document.body.appendChild(minigameScript);
  }
})();