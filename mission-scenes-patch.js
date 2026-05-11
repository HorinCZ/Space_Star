(function () {
  function hashString(value) {
    return String(value || "").split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
  }

  function pick(seed, values, salt = 0) {
    return values[Math.abs(hashString(`${seed}:${salt}`)) % values.length];
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[char]);
  }

  function phaseFromActionDeck(deck) {
    const text = deck.textContent || "";
    const match = text.match(/Current phase:\s*(scan|approach|encounter|objective|return)/i);
    if (match) return match[1].toLowerCase();
    if (text.includes("Launch Mission")) return "ready";
    return "ready";
  }

  function missionTitle(deck) {
    return deck.querySelector("h2")?.textContent?.trim() || "Mission scene";
  }

  function renderSceneSvg(phase, color = "#ff9f00") {
    const gradientId = `scenePatchGlow-${phase}`;
    const stars = `
      <circle cx="44" cy="35" r="1.4" /><circle cx="128" cy="52" r="1" /><circle cx="236" cy="31" r="1.2" />
      <circle cx="334" cy="74" r="1.4" /><circle cx="482" cy="42" r="1" /><circle cx="594" cy="83" r="1.2" />
      <circle cx="710" cy="36" r="1.4" /><circle cx="804" cy="95" r="1" /><circle cx="902" cy="48" r="1.2" />
    `;
    const scenes = {
      scan: `<ellipse cx="500" cy="150" rx="360" ry="74" fill="none" stroke="${color}" stroke-width="2" opacity=".34" /><ellipse cx="500" cy="150" rx="236" ry="44" fill="none" stroke="#ff9f00" stroke-width="2" opacity=".28" /><path d="M500 150 L870 88 M500 150 L792 220 M500 150 L160 92" stroke="${color}" opacity=".38" /><circle cx="500" cy="150" r="38" fill="${color}" opacity=".16" />`,
      approach: `<path d="M72 224 C250 156 454 132 932 78" stroke="${color}" stroke-width="4" fill="none" opacity=".46" /><path d="M790 122 L904 76 L844 178Z" fill="#151b22" stroke="${color}" stroke-width="4" /><circle cx="258" cy="172" r="42" fill="#222832" stroke="#6f7682" />`,
      encounter: `<path d="M228 168 L376 116 L332 214Z" fill="#18222d" stroke="${color}" stroke-width="4" /><path d="M684 92 L864 150 L684 218 L738 150Z" fill="#2b1018" stroke="#ff3158" stroke-width="4" /><path d="M410 150 H640" stroke="#ff3158" stroke-width="4" stroke-dasharray="12 14" />`,
      objective: `<rect x="334" y="78" width="330" height="158" rx="16" fill="#111318" stroke="${color}" stroke-width="4" /><path d="M382 198 H618 M410 160 H590 M438 122 H562" stroke="#8a857d" stroke-width="8" stroke-linecap="round" /><circle cx="500" cy="78" r="34" fill="${color}" opacity=".24" />`,
      return: `<path d="M100 168 C264 58 566 58 900 168" fill="none" stroke="${color}" stroke-width="4" opacity=".44" /><circle cx="760" cy="150" r="64" fill="#29303a" stroke="#8a857d" /><path d="M240 150 L342 116 L310 184Z" fill="#19242e" stroke="${color}" stroke-width="4" />`,
      ready: `<circle cx="500" cy="150" r="76" fill="#232932" stroke="${color}" stroke-width="4" /><path d="M500 84 V216 M434 150 H566" stroke="#0a0d11" stroke-width="12" /><path d="M162 216 C328 120 672 120 838 216" stroke="${color}" stroke-width="3" fill="none" opacity=".38" />`,
    };
    return `
      <svg viewBox="0 0 1000 300" role="img" aria-hidden="true">
        <defs><radialGradient id="${gradientId}" cx="50%" cy="45%" r="60%"><stop offset="0%" stop-color="${color}" stop-opacity=".22" /><stop offset="100%" stop-color="${color}" stop-opacity="0" /></radialGradient></defs>
        <rect width="1000" height="300" fill="#03050a" />
        <rect width="1000" height="300" fill="url(#${gradientId})" />
        <g fill="#f3f0e9" opacity=".72">${stars}</g>
        ${scenes[phase] || scenes.ready}
        <path d="M0 250 H1000" stroke="#ffffff" stroke-opacity=".06" />
      </svg>
    `;
  }

  function decorateScene() {
    const deck = document.querySelector("#missionActionDeck");
    const article = deck?.querySelector("article.mission-run");
    if (!deck || !article || article.querySelector(".mission-scene-art")) return;
    const phase = phaseFromActionDeck(deck);
    const subtitles = {
      ready: "Crew briefing feed",
      scan: "Deep-space scan image",
      approach: "Navigational feed",
      encounter: "Tactical visual lock",
      objective: "Away-team situation image",
      return: "Homebound telemetry",
    };
    const figure = document.createElement("figure");
    figure.className = `mission-scene-art phase-${phase}`;
    figure.innerHTML = `${renderSceneSvg(phase)}<figcaption><strong>${escapeHtml(missionTitle(deck))}</strong><span>${subtitles[phase] || "Mission feed"}</span></figcaption>`;
    article.prepend(figure);
  }

  function renderPortrait(name, code, color) {
    const skin = pick(name, ["#f1c7a7", "#c98d64", "#8d5a42", "#d8a77b", "#f0d0b7"], 1);
    const hair = pick(name, ["#15100d", "#3b261b", "#6f4a2e", "#d9d1bd", "#261b2e"], 2);
    const eye = pick(name, ["#2f8cff", "#75d18a", "#ffd21f", "#8a6a52"], 3);
    return `
      <svg class="crew-portrait" viewBox="0 0 100 112" role="img" aria-label="${escapeHtml(name)} portrait">
        <rect x="7" y="7" width="86" height="98" rx="10" fill="#080808" stroke="${color}" />
        <circle cx="50" cy="43" r="26" fill="${skin}" />
        <path d="M28 38 Q34 17 51 17 Q72 18 74 39 Q60 29 45 31 Q36 32 28 38Z" fill="${hair}" />
        <circle cx="40" cy="45" r="3" fill="${eye}" /><circle cx="60" cy="45" r="3" fill="${eye}" />
        <path d="M42 64 Q50 67 58 64" fill="none" stroke="#5c3028" stroke-width="2" stroke-linecap="round" />
        <path d="M22 103 Q27 76 50 76 Q73 76 78 103Z" fill="${color}" />
        <path d="M39 78 L50 93 L61 78" fill="#101010" opacity="0.65" />
        <rect x="41" y="89" width="18" height="9" rx="2" fill="#050505" stroke="#f3f0e9" />
        <text x="50" y="96" text-anchor="middle" font-size="7" font-family="Consolas, monospace" fill="#f3f0e9">${escapeHtml(code || "CDT")}</text>
      </svg>
    `;
  }

  function decorateCrewCards() {
    document.querySelectorAll(".mission-crew-panel .crew header").forEach((header) => {
      if (header.querySelector(".crew-portrait")) return;
      const card = header.closest(".crew");
      const title = header.querySelector("h2")?.textContent?.trim() || "Crew";
      const rankLine = header.querySelector(".meta")?.textContent || "";
      const code = rankLine.match(/\(([A-Z]+)\)/)?.[1] || "CDT";
      const color = getComputedStyle(card).getPropertyValue("--dept").trim() || "#ff9f00";
      header.insertAdjacentHTML("afterbegin", renderPortrait(title, code, color));
      card.classList.add("mission-current-crew-card");
    });
  }

  function decorate() {
    decorateScene();
    decorateCrewCards();
  }

  document.addEventListener("click", () => {
    window.setTimeout(decorate, 80);
    window.setTimeout(decorate, 420);
  }, true);
  window.setInterval(decorate, 1200);
  window.setTimeout(decorate, 400);
})();
