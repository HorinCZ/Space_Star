(function () {
  const saveKey = "lunar-fleet-command-save-v2";
  const destinationKey = "lunar-fleet-command-destination";
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

  function selectedShip(state) {
    return state.ships?.find((ship) => ship.id === state.selectedShipId) || state.ships?.[0] || null;
  }

  function crewForShip(state, shipId) {
    return (state.crew || []).filter((member) => member.shipId === shipId);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[char]);
  }

  function skillValue(member, skill) {
    return member.skills?.[skill] || 0;
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
    const destination = selectedMission();
    const label = document.querySelector("#sideDestination");
    if (label) label.textContent = destination?.name || "No destination";
  }

  function renderExpedition() {
    const state = readState();
    const ship = selectedShip(state);
    const mission = selectedMission();
    const crew = ship ? crewForShip(state, ship.id) : [];
    const actionDeck = document.querySelector("#missionActionDeck");
    const shipCard = document.querySelector("#missionShipCard");
    const shipSummary = document.querySelector("#missionShipSummary");
    const crewSummary = document.querySelector("#missionCrewSummary");
    const crewList = document.querySelector("#missionCrewList");
    updateDestinationButton();
    if (!actionDeck || !shipCard) return;

    if (!ship) {
      if (shipSummary) shipSummary.textContent = "No ship selected";
      actionDeck.innerHTML = `<article class="mission mission-run"><header><div><h2>No ship</h2><p class="meta">Buy and select a ship before launching.</p></div><span class="tag warn">standby</span></header></article>`;
      shipCard.innerHTML = "";
      if (crewList) crewList.innerHTML = "";
      return;
    }

    const shipClass = shipClassData[ship.classId] || shipClassData["aster-5"];
    const destinationText = mission ? `Ready for ${mission.name}` : "No destination selected";
    if (shipSummary) shipSummary.textContent = destinationText;
    if (crewSummary) crewSummary.textContent = `${crew.length}/${shipClass.crewMax} assigned`;
    shipCard.innerHTML = `
      <article class="dock mission-ship-card">
        <header>
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
        ? crew.map(renderCrewCard).join("")
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
          <div><h2><span class="department-dot"></span>${escapeHtml(member.name)}</h2><p class="meta">${member.rank || "Cadet"} (${member.rankCode || "CDT"}) - ${dept.name}</p></div>
          <div class="crew-vitals"><span class="tag ok">HP ${member.hp}/${member.maxHp}</span><span class="rank-pill">Lvl ${member.level || 0}</span><span class="xp-pill">XP ${member.xp || 0}/${nextXpTarget(member)}</span></div>
        </header>
        <p class="rank-note">Missions ${member.missions || 0}</p>
        <div class="stats-grid stats-grid-six"><div class="stat">Cmd<strong>${skillValue(member, "command")}</strong></div><div class="stat">Eng<strong>${skillValue(member, "engineering")}</strong></div><div class="stat">Sci<strong>${skillValue(member, "science")}</strong></div><div class="stat">Med<strong>${skillValue(member, "medical")}</strong></div><div class="stat">Tac<strong>${skillValue(member, "tactical")}</strong></div><div class="stat">Ops<strong>${skillValue(member, "operations")}</strong></div></div>
      </article>
    `;
  }

  function renderRunActions(actionDeck, ship) {
    const run = ship.missionRun;
    const mission = missionData.find((item) => item.id === run.missionId) || selectedMission();
    actionDeck.innerHTML = `
      <article class="mission mission-run">
        <header><div><h2>${mission?.name || "Mission in Progress"}</h2><p class="meta">Current phase: ${run.phase}</p></div><span class="tag warn">${run.phase}</span></header>
        <div class="mission-actions">
          ${run.phase === "scan" ? `<button type="button" data-mission-action="scan">Scan Area</button><button type="button" data-mission-action="abort">Abort Mission</button>` : ""}
          ${run.phase === "approach" ? `<button type="button" data-mission-action="approach">Approach Site</button><button type="button" data-mission-action="abort">Abort Mission</button>` : ""}
          ${run.phase === "encounter" ? `<button type="button" data-mission-action="attack">Attack</button><button type="button" data-mission-action="evade">Evade</button><button type="button" data-mission-action="defend">Defensive Burn</button><button type="button" data-mission-action="retreat">Retreat</button>` : ""}
          ${run.phase === "objective" ? `<button type="button" data-mission-action="objective" data-objective-mode="careful">Careful Work</button><button type="button" data-mission-action="objective" data-objective-mode="standard">Attempt Objective</button><button type="button" data-mission-action="objective" data-objective-mode="push">Push Hard</button><button type="button" data-mission-action="abort">Abort Mission</button>` : ""}
          ${run.phase === "return" ? `<button type="button" data-mission-action="return">Return to Base</button>` : ""}
        </div>
        <div class="stats-grid"><div class="stat">Signal<strong>${run.scanProgress || 0}/3</strong></div><div class="stat">Objective<strong>${run.objectiveProgress || 0}/3</strong></div><div class="stat">Banked<strong>${run.rewardBanked || 0}</strong></div><div class="stat">Enemy<strong>${run.enemy?.name || "none"}</strong></div></div>
      </article>
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
    if (button.dataset.expeditionLaunch || button.dataset.missionAction) {
      window.setTimeout(renderExpedition, 180);
    }
  }, true);

  window.setTimeout(() => {
    updateDestinationButton();
    decorateMissionList();
    renderExpedition();
  }, 300);
})();
