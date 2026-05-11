(function () {
  const saveKey = "lunar-fleet-command-save-v2";
  const destinationKey = "lunar-fleet-command-destination";
  const crewSortKey = "lunar-fleet-command-mission-crew-sort";
  let missionCrewSort = localStorage.getItem(crewSortKey) || "department";
  const missionData = [
    { id: "relay", name: "Repair Relay Station", risk: 18, reward: 190, need: "engineering", ship: "hull", text: "A broken comm relay is drifting at the edge of lunar control space." },
    { id: "anomaly", name: "Map Spatial Anomaly", risk: 28, reward: 280, need: "science", ship: "sensors", text: "An unstable signal promises valuable data and a dangerous field surge." },
    { id: "escort", name: "Escort Supply Convoy", risk: 36, reward: 360, need: "tactical", ship: "weapons", text: "A civilian hauler reports unknown contacts beyond the Mars corridor." },
    { id: "triage", name: "Emergency Triage Run", risk: 24, reward: 250, need: "medical", ship: "range", text: "A remote mining dome needs a medical team before its storm shutters fail." },
  ];
  const shipClassData = {
    "aster-5": { name: "Aster-5 Scout", role: "small survey craft", crewMax: 5, hull: 12, shields: 7, energyMax: 10, sensors: 8, weapons: 3, range: 5 },
    "vega-7": { name: "Vega-7 Cutter", role: "fast patrol vessel", crewMax: 7, hull: 16, shields: 9, energyMax: 11, sensors: 7, weapons: 6, range: 6 },
    "orion-9": { name: "Orion-9 Surveyor", role: "science expedition ship", crewMax: 9, hull: 18, shields: 10, energyMax: 12, sensors: 11, weapons: 4, range: 8 },
    "helios-12": { name: "Helios-12 Frigate", role: "heavy escort vessel", crewMax: 12, hull: 26, shields: 14, energyMax: 13, sensors: 8, weapons: 12, range: 8 },
    "atlas-16": { name: "Atlas-16 Cruiser", role: "long-range command cruiser", crewMax: 16, hull: 38, shields: 18, energyMax: 15, sensors: 12, weapons: 16, range: 12 },
  };
  const departmentData = {
    command: { name: "Command", color: "#62b6ff" },
    engineering: { name: "Engineering", color: "#f4bc56" },
    science: { name: "Science", color: "#a98bff" },
    medical: { name: "Medical", color: "#75d18a" },
    tactical: { name: "Tactical", color: "#f06a5f" },
    operations: { name: "Operations", color: "#41d6c3" },
  };

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(saveKey) || "{}");
    } catch {
      return {};
    }
  }

  function selectedMission() {
    const id = localStorage.getItem(destinationKey);
    return missionData.find((mission) => mission.id === id) || null;
  }

  function activeMission(state) {
    const ship = selectedShip(state);
    const id = ship?.missionRun?.missionId;
    return missionData.find((mission) => mission.id === id) || null;
  }

  function selectedShip(state) {
    return state.ships?.find((ship) => ship.id === state.selectedShipId) || state.ships?.[0] || null;
  }

  function crewForShip(state, shipId) {
    return (state.crew || []).filter((member) => member.shipId === shipId);
  }

  function sortedCrewForMission(crew) {
    const departmentOrder = ["command", "engineering", "science", "medical", "tactical", "operations"];
    return [...crew].sort((left, right) => {
      if (missionCrewSort === "hp") {
        return (left.hp || 0) - (right.hp || 0) || String(left.name).localeCompare(String(right.name));
      }
      if (missionCrewSort === "xp") {
        return (right.xp || 0) - (left.xp || 0) || String(left.name).localeCompare(String(right.name));
      }
      return (
        departmentOrder.indexOf(left.department) - departmentOrder.indexOf(right.department) ||
        String(left.name).localeCompare(String(right.name))
      );
    });
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[char]);
  }

  function skillValue(member, skill) {
    return member.skills?.[skill] || 0;
  }

  function hashString(value) {
    return String(value || "").split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
  }

  function pickSeed(seed, values, salt = 0) {
    return values[Math.abs(hashString(`${seed}:${salt}`)) % values.length];
  }

  function hpTone(member) {
    const ratio = (member.hp || 0) / Math.max(1, member.maxHp || 1);
    if (ratio <= 0.34) return "danger";
    if (ratio <= 0.67) return "warn";
    return "ok";
  }

  function nextXpTarget(member) {
    const levels = [10, 30, 80, 160, 280, 450, 700, 1000];
    return levels[Math.max(0, member.level || 0)] || 1000;
  }

  function statusBar(label, current, max, tone) {
    const value = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
    return `<div class="bar-stat ${tone}" style="--value: ${value}%"><div class="bar-stat-head"><span>${label}</span><strong>${current}/${max}</strong></div><div class="bar-track"><span></span></div></div>`;
  }

  function setView(viewId) {
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("is-active"));
    document.querySelector(`#${viewId}View`)?.classList.add("is-active");
    document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.view === viewId));
    if (viewId === "expedition") renderExpedition();
    if (viewId === "missions") window.setTimeout(decorateMissionList, 60);
  }

  function decorateMissionList() {
    const current = selectedMission();
    document.querySelectorAll("#missionsView [data-mission]").forEach((button) => {
      const mission = missionData.find((item) => item.id === button.dataset.mission);
      if (!mission) return;
      button.textContent = current?.id === mission.id ? "Destination Selected" : "Set Destination";
    });
    updateDestinationButton();
  }

  function updateDestinationButton() {
    const destination = selectedMission() || activeMission(readState());
    const label = document.querySelector("#sideDestination");
    if (label) label.textContent = destination?.name || "No destination";
  }

  function renderMissionCrewHeader(ship, crew, shipClass) {
    const title = document.querySelector(".mission-crew-panel .panel-title");
    if (!title) return;
    const summary = ship ? `${crew.length}/${shipClass.crewMax} assigned` : "No ship selected";
    title.innerHTML = `
      <h2>Current Crew</h2>
      <div class="crew-toolbar">
        <span id="missionCrewSummary">${summary}</span>
        <div class="sort-controls" aria-label="Mission crew sorting">
          <button class="${missionCrewSort === "department" ? "is-active" : ""}" type="button" data-mission-crew-sort="department">Division</button>
          <button class="${missionCrewSort === "hp" ? "is-active" : ""}" type="button" data-mission-crew-sort="hp">HP</button>
          <button class="${missionCrewSort === "xp" ? "is-active" : ""}" type="button" data-mission-crew-sort="xp">XP</button>
        </div>
      </div>
    `;
  }

  function renderExpedition() {
    const state = readState();
    const ship = selectedShip(state);
    const mission = selectedMission() || activeMission(state);
    const crew = ship ? crewForShip(state, ship.id) : [];
    const actionDeck = document.querySelector("#missionActionDeck");
    const shipCard = document.querySelector("#missionShipCard");
    const shipSummary = document.querySelector("#missionShipSummary");
    const crewList = document.querySelector("#missionCrewList");
    updateDestinationButton();
    if (!actionDeck || !shipCard) return;

    if (!ship) {
      renderMissionCrewHeader(null, [], { crewMax: 0 });
      if (shipSummary) shipSummary.textContent = "No ship selected";
      actionDeck.innerHTML = `<article class="mission mission-run"><header><div><h2>No ship</h2><p class="meta">Buy and select a ship before launching.</p></div><span class="tag warn">standby</span></header></article>`;
      shipCard.innerHTML = "";
      if (crewList) crewList.innerHTML = "";
      return;
    }

    const shipClass = shipClassData[ship.classId] || shipClassData["aster-5"];
    const destinationText = mission ? `Ready for ${mission.name}` : "No destination selected";
    const sortedCrew = sortedCrewForMission(crew);
    renderMissionCrewHeader(ship, crew, shipClass);
    if (shipSummary) shipSummary.textContent = destinationText;
    shipCard.innerHTML = `
      <article class="dock mission-ship-card">
        <header>
          ${renderShipVisual(ship, shipClass)}
          <div><h2>${escapeHtml(ship.name)}</h2><p class="meta">${shipClass.role}</p></div>
          <span class="tag ${ship.missionRun ? "warn" : "ok"}">${ship.missionRun ? "away" : `${crew.length}/${shipClass.crewMax}`}</span>
        </header>
        <div class="mission-prep-grid">
          ${statusBar("Hull", ship.hullNow ?? shipClass.hull, shipClass.hull, "red")}
          ${statusBar("Shields", ship.shieldsNow ?? shipClass.shields, shipClass.shields, "blue")}
          ${statusBar("Energy", ship.energyNow ?? shipClass.energyMax, shipClass.energyMax, "amber")}
        </div>
        <div class="stats-grid mission-ship-stats">
          <div class="stat">Crew<strong>${crew.length}/${shipClass.crewMax}</strong></div>
          <div class="stat">Sensors<strong>${shipClass.sensors}</strong></div>
          <div class="stat">Weapons<strong>${shipClass.weapons}</strong></div>
          <div class="stat">Range<strong>${shipClass.range}</strong></div>
        </div>
      </article>
    `;
    if (crewList) {
      crewList.innerHTML = crew.length
        ? sortedCrew.map(renderCrewCard).join("")
        : `<article class="crew empty-state"><h2>No crew assigned</h2><p class="meta">Assign personnel in Station Ops before launch.</p></article>`;
    }

    if (ship.missionRun) {
      renderRunActions(actionDeck, ship);
      return;
    }

    if (!mission) {
      actionDeck.innerHTML = `<article class="mission mission-run"><header><div><h2>No destination</h2><p class="meta">Choose a mission on the Missions screen, then return here to launch.</p></div><span class="tag warn">standby</span></header></article>`;
      return;
    }

    const dept = departmentData[mission.need] || departmentData.operations;
    const canLaunch = crew.length > 0 && (ship.hullNow ?? 0) > 0 && (ship.energyNow ?? 0) > 0;
    actionDeck.innerHTML = `
      <article class="mission mission-run selected-mission" style="--dept: ${dept.color}">
        ${renderMissionSceneArt(mission, { phase: "ready" })}
        <header><div><h2><span class="department-dot"></span>${mission.name}</h2><p class="meta">${mission.text}</p></div><span class="tag warn">risk ${mission.risk}</span></header>
        <div class="mission-actions mission-actions-primary">
          <button type="button" data-expedition-launch="1" data-mission="${mission.id}" ${canLaunch ? "" : "disabled"}>${canLaunch ? "Launch Mission" : "Need Ship / Crew / Energy"}</button>
          <button type="button" data-view="missions">Change Destination</button>
        </div>
        <div class="stats-grid"><div class="stat">Reward<strong>${mission.reward}</strong></div><div class="stat">Need<strong>${dept.name}</strong></div><div class="stat">Crew<strong>${crew.length}</strong></div><div class="stat">Ship<strong>${mission.ship}</strong></div></div>
      </article>
    `;
  }

  function renderCrewCard(member) {
    const dept = departmentData[member.department] || departmentData.operations;
    return `
      <article class="crew assigned" style="--dept: ${dept.color}">
        <header>
          ${renderCrewPortrait(member, dept)}
          <div><h2><span class="department-dot"></span>${escapeHtml(member.name)}</h2><p class="meta">${member.rank || "Cadet"} (${member.rankCode || "CDT"}) - ${dept.name}</p></div>
          <div class="crew-vitals"><span class="tag ${hpTone(member)}">HP ${member.hp}/${member.maxHp}</span><span class="rank-pill">Lvl ${member.level || 0}</span><span class="xp-pill">XP ${member.xp || 0}/${nextXpTarget(member)}</span></div>
        </header>
        <p class="rank-note">Missions ${member.missions || 0}</p>
        <div class="stats-grid stats-grid-six"><div class="stat">Cmd<strong>${skillValue(member, "command")}</strong></div><div class="stat">Eng<strong>${skillValue(member, "engineering")}</strong></div><div class="stat">Sci<strong>${skillValue(member, "science")}</strong></div><div class="stat">Med<strong>${skillValue(member, "medical")}</strong></div><div class="stat">Tac<strong>${skillValue(member, "tactical")}</strong></div><div class="stat">Ops<strong>${skillValue(member, "operations")}</strong></div></div>
      </article>
    `;
  }

  function renderShipVisual(ship, shipClass) {
    const seed = ship?.classId || shipClass.name;
    const accent = pickSeed(seed, ["#2f8cff", "#00d062", "#ff9f00", "#b565ff"], 1);
    const wing = 16 + (Math.abs(hashString(seed)) % 10);
    const nose = 14 + (Math.abs(hashString(`${seed}:nose`)) % 14);
    return `
      <svg class="ship-visual" viewBox="0 0 180 90" role="img" aria-label="${escapeHtml(shipClass.name)}">
        <rect x="8" y="10" width="164" height="70" rx="8" fill="#040609" stroke="#25282e" />
        <path d="M90 ${12 + nose} L${148 - wing} 70 L90 58 L${32 + wing} 70Z" fill="#1c252e" stroke="${accent}" stroke-width="3" />
        <path d="M90 ${18 + nose} L110 58 L90 66 L70 58Z" fill="#0a0f15" stroke="#8a857d" />
        <circle cx="90" cy="48" r="8" fill="${accent}" opacity="0.75" />
        <path d="M42 72 L24 78 M138 72 L156 78" stroke="${accent}" stroke-width="4" stroke-linecap="round" />
      </svg>
    `;
  }

  function renderCrewPortrait(member, dept) {
    const seed = member.id || member.name;
    const skin = pickSeed(seed, ["#f1c7a7", "#c98d64", "#8d5a42", "#d8a77b", "#f0d0b7"], 1);
    const hair = pickSeed(seed, ["#15100d", "#3b261b", "#6f4a2e", "#d9d1bd", "#261b2e"], 2);
    const eye = pickSeed(seed, ["#2f8cff", "#75d18a", "#ffd21f", "#8a6a52"], 3);
    const hairStyle = Math.abs(hashString(`${seed}:hair`)) % 3;
    const hairShape =
      hairStyle === 0
        ? `<path d="M28 38 Q30 17 51 17 Q72 18 74 39 Q60 29 45 31 Q36 32 28 38Z" fill="${hair}" />`
        : hairStyle === 1
          ? `<path d="M29 40 Q35 14 60 20 Q72 26 72 44 Q56 31 44 33 Q34 35 29 40Z" fill="${hair}" />`
          : `<path d="M29 39 Q38 20 54 18 Q68 20 74 38 L72 46 Q56 30 42 34 Q34 36 29 39Z" fill="${hair}" />`;
    return `
      <svg class="crew-portrait" viewBox="0 0 100 112" role="img" aria-label="${escapeHtml(member.name)} portrait">
        <rect x="7" y="7" width="86" height="98" rx="10" fill="#080808" stroke="${dept.color}" />
        <circle cx="50" cy="43" r="26" fill="${skin}" />
        ${hairShape}
        <circle cx="40" cy="45" r="3" fill="${eye}" />
        <circle cx="60" cy="45" r="3" fill="${eye}" />
        <path d="M42 64 Q50 67 58 64" fill="none" stroke="#5c3028" stroke-width="2" stroke-linecap="round" />
        <path d="M22 103 Q27 76 50 76 Q73 76 78 103Z" fill="${dept.color}" />
        <path d="M39 78 L50 93 L61 78" fill="#101010" opacity="0.65" />
        <rect x="41" y="89" width="18" height="9" rx="2" fill="#050505" stroke="#f3f0e9" />
        <text x="50" y="96" text-anchor="middle" font-size="7" font-family="Consolas, monospace" fill="#f3f0e9">${member.rankCode || "CDT"}</text>
      </svg>
    `;
  }

  function renderRunActions(actionDeck, ship) {
    const run = ship.missionRun;
    const mission = missionData.find((item) => item.id === run.missionId) || selectedMission();
    const enemy = run.enemy;
    actionDeck.innerHTML = `
      <article class="mission mission-run">
        ${renderMissionSceneArt(mission, run, enemy)}
        <header><div><h2>${mission?.name || "Mission in Progress"}</h2><p class="meta">Current phase: ${run.phase}</p></div><span class="tag warn">${run.phase}</span></header>
        <div class="mission-actions">
          ${run.phase === "scan" ? `<button type="button" data-mission-action="scan">Scan Area</button><button type="button" data-mission-action="abort">Abort Mission</button>` : ""}
          ${run.phase === "approach" ? `<button type="button" data-mission-action="approach">Approach Site</button><button type="button" data-mission-action="abort">Abort Mission</button>` : ""}
          ${run.phase === "encounter" ? `<button type="button" data-mission-action="attack">Attack</button><button type="button" data-mission-action="evade">Evade</button><button type="button" data-mission-action="defend">Defensive Burn</button><button type="button" data-mission-action="retreat">Retreat</button>` : ""}
          ${run.phase === "objective" ? `<button type="button" data-mission-action="objective" data-objective-mode="careful">Careful Work</button><button type="button" data-mission-action="objective" data-objective-mode="standard">Attempt Objective</button><button type="button" data-mission-action="objective" data-objective-mode="push">Push Hard</button><button type="button" data-mission-action="abort">Abort Mission</button>` : ""}
          ${run.phase === "return" ? `<button type="button" data-mission-action="return">Return to Base</button>` : ""}
        </div>
        <div class="stats-grid"><div class="stat">Signal<strong>${run.scanProgress || 0}/3</strong></div><div class="stat">Objective<strong>${run.objectiveProgress || 0}/3</strong></div><div class="stat">Banked<strong>${run.rewardBanked || 0}</strong></div><div class="stat">Enemy<strong>${enemy?.name || "none"}</strong></div></div>
        ${enemy ? renderEnemyStatus(enemy) : ""}
      </article>
    `;
  }

  function renderEnemyStatus(enemy) {
    const hullNow = Math.max(0, enemy.hullNow ?? enemy.hull ?? 0);
    const hullMax = Math.max(1, enemy.hull ?? hullNow);
    return `
      <section class="enemy-status-card" aria-label="Enemy contact">
        <header>
          <div class="enemy-silhouette" aria-hidden="true"><span></span><i></i><b></b></div>
          <div>
            <h3>${escapeHtml(enemy.name || "Hostile Contact")}</h3>
            <p class="meta">Hostile contact locked on tactical sensors.</p>
          </div>
          <span class="tag danger">hostile</span>
        </header>
        <div class="mission-prep-grid">
          ${statusBar("Enemy Hull", hullNow, hullMax, "red")}
        </div>
        <div class="stats-grid mission-ship-stats">
          <div class="stat">Damage<strong>${enemy.damage ?? 0}</strong></div>
          <div class="stat">Difficulty<strong>${enemy.difficulty ?? 0}</strong></div>
          <div class="stat">Salvage<strong>${enemy.reward ?? 0}</strong></div>
          <div class="stat">Status<strong>${hullNow <= 0 ? "disabled" : "active"}</strong></div>
        </div>
      </section>
    `;
  }

  function renderMissionSceneArt(mission, run = {}, enemy = null) {
    const phase = run.phase || "ready";
    const dept = departmentData[mission?.need] || departmentData.operations;
    const title = {
      ready: "Mission site preview",
      scan: "Long-range sensor sweep",
      approach: "Approach vector",
      encounter: enemy?.name || "Hostile contact",
      objective: mission?.name || "Mission objective",
      return: "Return corridor",
    }[phase] || "Mission scene";
    const subtitle = {
      ready: "Crew briefing feed",
      scan: "Deep-space scan image",
      approach: "Navigational feed",
      encounter: "Tactical visual lock",
      objective: "Away-team situation image",
      return: "Homebound telemetry",
    }[phase] || "Mission feed";
    return `
      <figure class="mission-scene-art phase-${phase}" style="--dept: ${dept.color}" aria-label="${escapeHtml(title)}">
        ${renderSceneSvg(phase, dept.color)}
        <figcaption><strong>${escapeHtml(title)}</strong><span>${escapeHtml(subtitle)}</span></figcaption>
      </figure>
    `;
  }

  function renderSceneSvg(phase, color) {
    const gradientId = `missionGlow-${phase}`;
    const starfield = `
      <circle cx="44" cy="35" r="1.4" /><circle cx="128" cy="52" r="1" /><circle cx="236" cy="31" r="1.2" />
      <circle cx="334" cy="74" r="1.4" /><circle cx="482" cy="42" r="1" /><circle cx="594" cy="83" r="1.2" />
      <circle cx="710" cy="36" r="1.4" /><circle cx="804" cy="95" r="1" /><circle cx="902" cy="48" r="1.2" />
    `;
    const scene = {
      scan: `<ellipse cx="500" cy="150" rx="360" ry="74" fill="none" stroke="${color}" stroke-width="2" opacity=".34" /><ellipse cx="500" cy="150" rx="236" ry="44" fill="none" stroke="#ff9f00" stroke-width="2" opacity=".28" /><path d="M500 150 L870 88 M500 150 L792 220 M500 150 L160 92" stroke="${color}" opacity=".38" /><circle cx="500" cy="150" r="38" fill="${color}" opacity=".16" />`,
      approach: `<path d="M72 224 C250 156 454 132 932 78" stroke="${color}" stroke-width="4" fill="none" opacity=".46" /><path d="M790 122 L904 76 L844 178Z" fill="#151b22" stroke="${color}" stroke-width="4" /><circle cx="258" cy="172" r="42" fill="#222832" stroke="#6f7682" />`,
      encounter: `<path d="M228 168 L376 116 L332 214Z" fill="#18222d" stroke="${color}" stroke-width="4" /><path d="M684 92 L864 150 L684 218 L738 150Z" fill="#2b1018" stroke="#ff3158" stroke-width="4" /><path d="M410 150 H640" stroke="#ff3158" stroke-width="4" stroke-dasharray="12 14" />`,
      objective: `<rect x="334" y="78" width="330" height="158" rx="16" fill="#111318" stroke="${color}" stroke-width="4" /><path d="M382 198 H618 M410 160 H590 M438 122 H562" stroke="#8a857d" stroke-width="8" stroke-linecap="round" /><circle cx="500" cy="78" r="34" fill="${color}" opacity=".24" />`,
      return: `<path d="M100 168 C264 58 566 58 900 168" fill="none" stroke="${color}" stroke-width="4" opacity=".44" /><circle cx="760" cy="150" r="64" fill="#29303a" stroke="#8a857d" /><path d="M240 150 L342 116 L310 184Z" fill="#19242e" stroke="${color}" stroke-width="4" />`,
      ready: `<circle cx="500" cy="150" r="76" fill="#232932" stroke="${color}" stroke-width="4" /><path d="M500 84 V216 M434 150 H566" stroke="#0a0d11" stroke-width="12" /><path d="M162 216 C328 120 672 120 838 216" stroke="${color}" stroke-width="3" fill="none" opacity=".38" />`,
    }[phase] || "";
    return `
      <svg viewBox="0 0 1000 300" role="img" aria-hidden="true">
        <rect width="1000" height="300" fill="#03050a" />
        <defs><radialGradient id="${gradientId}" cx="50%" cy="45%" r="60%"><stop offset="0%" stop-color="${color}" stop-opacity=".22"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></radialGradient></defs>
        <rect width="1000" height="300" fill="url(#${gradientId})" />
        <g fill="#f3f0e9" opacity=".72">${starfield}</g>
        ${scene}
        <path d="M0 250 H1000" stroke="#ffffff" stroke-opacity=".06" />
      </svg>
    `;
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const view = button.dataset.view;
    if (view === "expedition" || view === "missions") {
      event.preventDefault();
      event.stopImmediatePropagation();
      setView(view);
      return;
    }
    if (button.dataset.mission && button.closest("#missionsView")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      localStorage.setItem(destinationKey, button.dataset.mission);
      updateDestinationButton();
      decorateMissionList();
      return;
    }
    if (button.dataset.missionCrewSort) {
      event.preventDefault();
      event.stopImmediatePropagation();
      missionCrewSort = button.dataset.missionCrewSort;
      localStorage.setItem(crewSortKey, missionCrewSort);
      renderExpedition();
      return;
    }
    if (button.dataset.expeditionLaunch || button.dataset.missionAction) {
      window.setTimeout(() => setView("expedition"), 0);
      window.setTimeout(() => setView("expedition"), 80);
      window.setTimeout(() => setView("expedition"), 360);
    }
  }, true);

  window.setTimeout(() => {
    updateDestinationButton();
    decorateMissionList();
    renderExpedition();
  }, 300);
})();
