(function () {
  if (typeof state === "undefined" || typeof missions === "undefined" || !state || !Array.isArray(missions)) return;
  if (!("selectedMissionId" in state)) state.selectedMissionId = null;
  if (!missions.some((mission) => mission.id === state.selectedMissionId)) state.selectedMissionId = null;

  const missionActionDeckEl = document.querySelector("#missionActionDeck");
  const missionCrewSummaryEl = document.querySelector("#missionCrewSummary");
  const missionCrewListEl = document.querySelector("#missionCrewList");
  const expeditionViewEl = document.querySelector("#expeditionView");
  const sideDestinationEl = document.querySelector("#sideDestination");
  const originalRender = render;

  function selectedMissionPatched() {
    return missions.find((item) => item.id === state.selectedMissionId) || null;
  }

  function selectMissionPatched(missionId) {
    const mission = missions.find((item) => item.id === missionId);
    if (!mission) return;
    state.selectedMissionId = mission.id;
    addLog(`Destination selected: ${mission.name}.`);
    persist();
    render();
  }

  function updateDestinationButton() {
    const mission = selectedMissionPatched();
    if (sideDestinationEl) sideDestinationEl.textContent = mission?.name || "No destination";
  }

  function renderMissionsPatched() {
    const ship = selectedShip();
    const destination = selectedMissionPatched();
    missionSummaryEl.textContent = destination ? `Selected: ${destination.name}` : "Choose a destination";
    missionsEl.innerHTML = missions
      .map((mission) => {
        const department = departmentFor(mission.need);
        const crewCount = ship ? crewForShip(ship.id).length : 0;
        const chance = missionChance(mission, ship);
        const isSelected = mission.id === state.selectedMissionId;
        return `
          <article class="mission ${isSelected ? "selected-mission" : ""}" style="--dept: ${department.color}">
            <header>
              ${renderMissionVisual(mission)}
              <div>
                <h2><span class="department-dot"></span>${mission.name}</h2>
                <p class="meta">${mission.text}</p>
              </div>
              <span class="tag warn">risk ${mission.risk}</span>
            </header>
            <div class="stats-grid">
              <div class="stat">Reward<strong>${mission.reward}</strong></div>
              <div class="stat">Dept<strong>${department.name}</strong></div>
              <div class="stat">Scan<strong>Ops</strong></div>
              <div class="stat">Crew<strong>${crewCount}</strong></div>
            </div>
            <div class="chance-box">
              <div class="chance-head">
                <span>Success chance</span>
                <strong>${chance.chance}%</strong>
              </div>
              <div class="chance-grid">
                <span>${department.name}</span><strong>+${chance.departmentPower}</strong>
                <span>Command support</span><strong>+${chance.commandSupport}</strong>
                <span>Ship ${mission.ship}</span><strong>+${chance.shipPower}</strong>
                <span>Risk</span><strong>-${mission.risk}</strong>
              </div>
            </div>
            <div class="mission-actions">
              <button type="button" data-select-mission="${mission.id}">${isSelected ? "Destination Selected" : "Set Destination"}</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderExpedition() {
    const ship = selectedShip();
    const destination = selectedMissionPatched();
    const crew = ship ? crewForShip(ship.id) : [];
    renderMissionShipPrep(ship, destination, crew);

    if (missionCrewSummaryEl) {
      missionCrewSummaryEl.textContent = ship ? `${crew.length}/${classFor(ship).crewMax} assigned` : "No ship selected";
    }
    if (missionCrewListEl) missionCrewListEl.innerHTML = renderMissionCrewCards(crew, ship);
    if (!missionActionDeckEl) return;

    if (ship?.missionRun) {
      missionActionDeckEl.innerHTML = renderMissionRunPatched(ship);
      return;
    }

    if (!destination) {
      missionShipSummaryEl.textContent = "No destination selected";
      missionActionDeckEl.innerHTML = `
        <article class="mission mission-run">
          <header>
            <div>
              <h2>No destination</h2>
              <p class="meta">Choose a mission on the Missions screen, then return here to launch.</p>
            </div>
            <span class="tag warn">standby</span>
          </header>
        </article>
      `;
      return;
    }

    const department = departmentFor(destination.need);
    const crewCount = crew.length;
    const destroyed = Boolean(ship && ship.hullNow <= 0);
    const lowEnergy = Boolean(ship && (ship.energyNow ?? classFor(ship).energyMax) < 1);
    const canLaunch = Boolean(ship && crewCount > 0 && !destroyed && !lowEnergy);
    const chance = missionChance(destination, ship);
    missionActionDeckEl.innerHTML = `
      <article class="mission mission-run selected-mission" style="--dept: ${department.color}">
        <header>
          ${renderMissionVisual(destination)}
          <div>
            <h2><span class="department-dot"></span>${destination.name}</h2>
            <p class="meta">${destination.text}</p>
          </div>
          <span class="tag warn">risk ${destination.risk}</span>
        </header>
        <div class="mission-actions mission-actions-primary">
          <button type="button" data-mission="${destination.id}" ${canLaunch ? "" : "disabled"}>${!ship ? "Need Ship" : destroyed ? "Destroyed" : lowEnergy ? "Need Energy" : crewCount === 0 ? "Need Crew" : "Launch Mission"}</button>
          <button type="button" data-view="missions">Change Destination</button>
        </div>
        <div class="stats-grid">
          <div class="stat">Reward<strong>${destination.reward}</strong></div>
          <div class="stat">Need<strong>${department.name}</strong></div>
          <div class="stat">Chance<strong>${chance.chance}%</strong></div>
          <div class="stat">Crew<strong>${crewCount}</strong></div>
        </div>
      </article>
    `;
  }

  function renderMissionRunPatched(ship) {
    const run = ship.missionRun;
    const mission = missionFor(run);
    const department = departmentFor(mission.need);
    const enemy = run.enemy;
    const phaseLabel = {
      scan: "Scan Area",
      approach: "Approach Site",
      encounter: "Hostile Contact",
      objective: "Mission Objective",
      return: "Return Home",
    }[run.phase];
    const canScan = (ship.energyNow ?? 0) > 0;
    const canObjective = (ship.energyNow ?? 0) > 0;

    return `
      <article class="mission mission-run" style="--dept: ${department.color}">
        <header>
          ${enemy ? renderEnemyVisual(enemy) : renderMissionVisual(mission)}
          <div>
            <h2><span class="department-dot"></span>${mission.name}</h2>
            <p class="meta">${phaseLabel} - ${mission.text}</p>
          </div>
          <span class="tag warn">${run.phase}</span>
        </header>
        <div class="mission-actions">
          ${run.phase === "scan" ? `<button type="button" data-mission-action="scan" ${canScan ? "" : "disabled"}>Scan Area</button><button type="button" data-mission-action="abort">Abort Mission</button>` : ""}
          ${run.phase === "approach" ? `<button type="button" data-mission-action="approach">Approach Site</button><button type="button" data-mission-action="abort">Abort Mission</button>` : ""}
          ${
            run.phase === "encounter"
              ? `
                <button type="button" data-mission-action="attack">Attack</button>
                <button type="button" data-mission-action="evade">Evade</button>
                <button type="button" data-mission-action="defend" ${(ship.energyNow ?? 0) > 0 ? "" : "disabled"}>Defensive Burn</button>
                <button type="button" data-mission-action="retreat">Retreat</button>
              `
              : ""
          }
          ${
            run.phase === "objective"
              ? `
                <button type="button" data-mission-action="objective" data-objective-mode="careful">Careful Work</button>
                <button type="button" data-mission-action="objective" data-objective-mode="standard" ${canObjective ? "" : "disabled"}>Attempt Objective</button>
                <button type="button" data-mission-action="objective" data-objective-mode="push" ${(ship.energyNow ?? 0) >= 2 ? "" : "disabled"}>Push Hard</button>
                <button type="button" data-mission-action="abort">Abort Mission</button>
              `
              : ""
          }
          ${run.phase === "return" ? `<button type="button" data-mission-action="return">Return to Base</button>` : ""}
        </div>
        <div class="stats-grid">
          <div class="stat">Signal<strong>${run.scanProgress}/3</strong></div>
          <div class="stat">Objective<strong>${run.objectiveProgress}/3</strong></div>
          <div class="stat">Banked<strong>${run.rewardBanked}</strong></div>
          <div class="stat">Need<strong>${department.name}</strong></div>
        </div>
        ${enemy ? `<div class="chance-box"><div class="chance-head"><span>${enemy.name}</span><strong>${enemy.hullNow}/${enemy.hull} hull</strong></div><div class="chance-grid"><span>Damage</span><strong>${enemy.damage}</strong><span>Salvage</span><strong>${enemy.reward}</strong></div></div>` : ""}
        ${
          run.phase === "objective"
            ? `<div class="mission-rulebook">
                <div><strong>Careful Work</strong><span>0 energy, safer, success gives +1 progress, low injury chance.</span></div>
                <div><strong>Attempt Objective</strong><span>1 energy, balanced, success gives +1, critical gives +2.</span></div>
                <div><strong>Push Hard</strong><span>2 energy, risky, success gives +2, failures often injure crew or damage the ship.</span></div>
              </div>`
            : ""
        }
      </article>
    `;
  }

  function renderMissionShipPrep(ship, destination, crew) {
    if (!ship) {
      missionShipSummaryEl.textContent = "No ship selected";
      missionShipCardEl.innerHTML = `<article class="dock empty-state"><h2>No ship available</h2><p class="meta">Buy a ship on the Base screen to unlock missions.</p></article>`;
      return;
    }

    const shipClass = classFor(ship);
    const missingHull = shipClass.hull - ship.hullNow;
    const repairCost = missingHull * repairCostPerHull;
    const missingShields = shipClass.shields - (ship.shieldsNow ?? shipClass.shields);
    const missingEnergy = shipClass.energyMax - (ship.energyNow ?? shipClass.energyMax);
    const rechargeCost = missingEnergy * rechargeCostPerCell;
    const shipName = escapeHtml(ship.name);
    const away = Boolean(ship.missionRun);
    missionShipSummaryEl.textContent = destination ? `Ready for ${destination.name}` : "No destination selected";
    missionShipCardEl.innerHTML = `
      <article class="dock mission-ship-card">
        <header>
          ${renderShipVisual(ship)}
          <div>
            <h2>${shipName}</h2>
            <p class="meta">${shipClass.role}</p>
          </div>
          <span class="tag ${ship.hullNow <= 0 ? "danger" : away ? "warn" : "ok"}">${ship.hullNow <= 0 ? "destroyed" : away ? "away" : `${crew.length}/${shipClass.crewMax}`}</span>
        </header>
        <div class="mission-prep-grid">
          ${renderStatusBar("Hull", ship.hullNow, shipClass.hull, "red")}
          ${renderStatusBar("Shields", ship.shieldsNow ?? shipClass.shields, shipClass.shields, "blue")}
          ${renderStatusBar("Energy", ship.energyNow ?? shipClass.energyMax, shipClass.energyMax, "amber")}
        </div>
        <div class="stats-grid mission-ship-stats">
          <div class="stat">Crew<strong>${crew.length}/${shipClass.crewMax}</strong></div>
          <div class="stat">Sensors<strong>${shipClass.sensors}</strong></div>
          <div class="stat">Weapons<strong>${shipClass.weapons}</strong></div>
          <div class="stat">Range<strong>${shipClass.range}</strong></div>
        </div>
        <div class="rename-row">
          <input type="text" data-rename-input="${ship.id}" value="${shipName}" maxlength="32" aria-label="Ship name" />
          <button type="button" data-rename="${ship.id}">Rename</button>
        </div>
        <div class="crew-actions">
          <button type="button" data-repair="${ship.id}" ${!away && missingHull > 0 && state.credits >= repairCost ? "" : "disabled"}>Repair ${repairCost}</button>
          <button type="button" data-restore-shields="${ship.id}" ${!away && missingShields > 0 ? "" : "disabled"}>Restore Shields</button>
          <button type="button" data-recharge="${ship.id}" ${!away && missingEnergy > 0 && state.credits >= rechargeCost ? "" : "disabled"}>Recharge ${rechargeCost}</button>
        </div>
      </article>
    `;
  }

  function renderStatusBar(label, current, max, tone) {
    const safeMax = Number(max || 0);
    const safeCurrent = Math.max(0, Number(current || 0));
    const percent = safeMax > 0 ? Math.max(0, Math.min(100, (safeCurrent / safeMax) * 100)) : 0;
    return `<div class="bar-stat ${tone}" style="--value: ${percent}%"><div class="bar-stat-head"><span>${label}</span><strong>${safeCurrent}/${safeMax}</strong></div><div class="bar-track"><span></span></div></div>`;
  }

  function renderMissionCrewCards(crew, ship) {
    if (!ship) return `<article class="crew empty-state"><h2>No ship selected</h2><p class="meta">Select or buy a ship before preparing a mission.</p></article>`;
    if (!crew.length) return `<article class="crew empty-state"><h2>No crew assigned</h2><p class="meta">Assign personnel in Station Ops before launch.</p></article>`;
    return crew
      .map((member) => {
        const department = departmentFor(member);
        const nextXp = nextXpTarget(member);
        return `
          <article class="crew assigned" style="--dept: ${department.color}">
            <header>
              ${renderCrewPortrait(member)}
              <div>
                <h2><span class="department-dot"></span>${escapeHtml(member.name)}</h2>
                <p class="meta">${member.rank} (${member.rankCode}) - ${department.name} - ${escapeHtml(ship.name)}</p>
              </div>
              <div class="crew-vitals">
                <span class="tag ${hpTone(member)}">HP ${member.hp}/${member.maxHp}</span>
                <span class="rank-pill">Lvl ${member.level}</span>
                <span class="xp-pill">XP ${member.xp}/${nextXp}</span>
              </div>
            </header>
            <p class="rank-note">Missions ${member.missions}</p>
            <div class="stats-grid stats-grid-six">
              <div class="stat">Cmd<strong>${skillValue(member, "command")}</strong></div>
              <div class="stat">Eng<strong>${skillValue(member, "engineering")}</strong></div>
              <div class="stat">Sci<strong>${skillValue(member, "science")}</strong></div>
              <div class="stat">Med<strong>${skillValue(member, "medical")}</strong></div>
              <div class="stat">Tac<strong>${skillValue(member, "tactical")}</strong></div>
              <div class="stat">Ops<strong>${skillValue(member, "operations")}</strong></div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  renderMissions = renderMissionsPatched;
  renderViews = function () {
    viewButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === activeView);
    });
    baseViewEl.classList.toggle("is-active", activeView === "base");
    shipyardViewEl.classList.toggle("is-active", activeView === "shipyard");
    personnelViewEl.classList.toggle("is-active", activeView === "personnel");
    missionsViewEl.classList.toggle("is-active", activeView === "missions");
    expeditionViewEl?.classList.toggle("is-active", activeView === "expedition");
    saveViewEl.classList.toggle("is-active", activeView === "save");
  };
  render = function () {
    originalRender();
    renderExpedition();
    updateDestinationButton();
    renderViews();
  };

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target.closest("button");
      if (!target?.dataset.selectMission) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      selectMissionPatched(target.dataset.selectMission);
    },
    true,
  );

  render();
})();
