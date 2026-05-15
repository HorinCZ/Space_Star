(function () {
  const objectiveSideTasks = [
    { id: "command-call", title: "Command Decision", skill: "command", label: "Command", difficultyMod: 2, shieldDamage: 1, hullDamage: 0, shipStat: "range", injuryCause: "command deck pressure", text: "Conflicting reports force a fast call before the operation can continue.", failLog: "The bad call forced a rough repositioning burn." },
    { id: "tactical-breach", title: "Tactical Breach", skill: "tactical", label: "Tactical", difficultyMod: 4, shieldDamage: 2, hullDamage: 0, shipStat: "weapons", injuryCause: "tactical station overload", text: "A hostile defense pattern has to be broken without losing the mission window.", failLog: "The defense pattern lashed back across the shields." },
    { id: "medical-crisis", title: "Medical Crisis", skill: "medical", label: "Medical", difficultyMod: 3, shieldDamage: 0, hullDamage: 0, shipStat: "range", injuryCause: "medical emergency", text: "A sudden casualty or exposure case needs immediate treatment before work can continue.", failLog: "The crisis spread through the field team." },
    { id: "engineering-fault", title: "Engineering Fault", skill: "engineering", label: "Engineering", difficultyMod: 3, shieldDamage: 1, hullDamage: 1, shipStat: "hull", injuryCause: "engineering fault", text: "A power fault threatens the equipment holding the site together.", failLog: "The fault kicked back into the ship systems." },
  ];

  window.createScanChallenge = function createScanChallenge(ship, mission) {
    const templates = [
      { id: "meteor-swarm", title: "Meteor Swarm", skill: "operations", label: "OPS", difficultyMod: 0, shieldDamage: 2, hullDamage: 0, injuryCause: "meteor impact shock", text: "A dense swarm crosses the sensor route. Plot a clean scan path through the moving debris.", failLog: "The swarm battered the shields and shook the scan station." },
      { id: "fighter-screen", title: "Fighter Screen", skill: "tactical", label: "Tactical", difficultyMod: 6, shieldDamage: 2, hullDamage: 0, injuryCause: "fighter strafing run", enemyOnFail: 0.35, text: "A wing of hostile fighters masks the signal. Read their pattern before they collapse the perimeter.", failLog: "The fighters clipped the shield perimeter during the scan." },
      { id: "distress-spoof", title: "Distress Signal Spoof", skill: "command", label: "Command", difficultyMod: 2, shieldDamage: 1, hullDamage: 0, injuryCause: "command deck overload", text: "A false distress beacon is mixed into the target telemetry. Decide which signal can be trusted.", failLog: "The false beacon pulled the ship through a rough correction burn." },
      { id: "sensor-overload", title: "Sensor Grid Overload", skill: "engineering", label: "Engineering", difficultyMod: 4, shieldDamage: 1, hullDamage: 1, injuryCause: "sensor grid feedback", text: "The sensor grid is overheating under reflected radiation. Stabilize it before the scan burns out.", failLog: "Feedback surged through the grid and damaged ship systems." },
    ];
    const previousId = ship.missionRun?.scanChallenge?.id;
    const options = templates.filter((template) => template.id !== previousId);
    const template = options[Math.floor(Math.random() * options.length)] || templates[0];
    return { ...template, difficulty: mission.risk + template.difficultyMod };
  };

  window.createObjectiveChallenge = function createObjectiveChallenge(ship, mission) {
    const primaryDepartment = departmentFor(mission.need);
    const primary = { id: `primary-${mission.need}`, title: `${primaryDepartment.name} Objective`, skill: mission.need, label: primaryDepartment.name, difficultyMod: 0, shieldDamage: 1, hullDamage: 0, shipStat: mission.ship, injuryCause: `${mission.name} field work`, text: `Resolve the core ${primaryDepartment.name.toLowerCase()} task at the mission site.`, failLog: "The team lost time and the ship took stress from the unstable site." };
    const previousId = ship.missionRun?.objectiveChallenge?.id;
    const pool = Math.random() < 0.68 ? [primary] : objectiveSideTasks;
    const options = pool.filter((task) => task.id !== previousId);
    const template = options[Math.floor(Math.random() * options.length)] || primary;
    return { ...template, difficulty: mission.risk + template.difficultyMod };
  };

  window.injureCrewMember = window.injureCrewMember || function injureCrewMember(ship, member, cause) {
    if (!member || member.hp <= 0) return;
    member.hp = Math.max(0, member.hp - 1);
    if (typeof playSound === "function") playSound("injury");
    if (member.hp > 0) {
      addLog(`${member.name} was injured by ${cause}. HP ${member.hp}/${member.maxHp}.`);
      return;
    }
    state.hallOfFame.unshift({ name: member.name, rank: member.rank, rankCode: member.rankCode, level: member.level, xp: member.xp, missions: member.missions, department: member.department, cause, date: currentCalendarDate() });
    state.crew = state.crew.filter((item) => item.id !== member.id);
    addLog(`${member.name} was killed by ${cause} and entered the Hall of Fame.`);
    if (ship.missionRun && crewForShip(ship.id).every((crewMember) => crewMember.hp <= 0)) {
      addLog(`${ship.name} has no surviving crew.`);
      finishMission(ship, false, "lost");
    }
  };

  window.scanMission = function scanMission(ship, crewId) {
    const run = ship.missionRun;
    const shipClass = classFor(ship);
    const mission = missionFor(run);
    if ((ship.energyNow ?? 0) < 1) return addLog(`${ship.name} has no energy for another scan.`);
    const crew = crewForShip(ship.id).find((member) => member.id === crewId && member.hp > 0);
    if (!crew) return addLog("Choose an active crew member to handle the scan check.");
    advanceCalendar(1);
    ship.energyNow = Math.max(0, (ship.energyNow ?? shipClass.energyMax) - 1);
    if (typeof playSound === "function") playSound("scan");
    const challenge = run.scanChallenge || createScanChallenge(ship, mission);
    run.scanChallenge = challenge;
    const outcome = rollPower(skillValue(crew, challenge.skill) + Math.floor(shipClass.sensors / 3), challenge.difficulty);
    if (outcome.success) {
      run.scanProgress += 1;
      grantXp(crew, outcome.critical ? 2 : 1);
      addLog(`${crew.name} passed ${challenge.title}. Scan progress +1.`);
    } else {
      applyShipDamage(ship, challenge.shieldDamage, challenge.hullDamage);
      injureCrewMember(ship, crew, challenge.injuryCause);
      if (!ship.missionRun) return;
      addLog(`${crew.name} failed ${challenge.title}. ${challenge.failLog}`);
      if (ship.hullNow <= 0) { finishMission(ship, false, "lost"); return; }
      if (challenge.enemyOnFail && Math.random() < challenge.enemyOnFail) {
        run.phase = "encounter";
        run.enemy = createEnemy(mission);
        run.scanChallenge = null;
        addLog(`${ship.name} was forced into contact with ${run.enemy.name}.`);
        return;
      }
    }
    if (run.scanProgress >= 3) {
      run.scanProgress = 3;
      run.phase = "approach";
      run.scanChallenge = null;
      addLog(`${ship.name} found the mission site. Prepare approach.`);
      return;
    }
    run.scanChallenge = createScanChallenge(ship, mission);
  };

  window.attemptObjective = function attemptObjective(ship, mode, crewId) {
    const run = ship.missionRun;
    const mission = missionFor(run);
    const challenge = run.objectiveChallenge || createObjectiveChallenge(ship, mission);
    run.objectiveChallenge = challenge;
    if ((ship.energyNow ?? 0) < 1) return addLog(`${ship.name} lacks energy for that objective attempt.`);
    const crew = crewForShip(ship.id).find((member) => member.id === crewId && member.hp > 0);
    if (!crew) return addLog("Choose an active crew member to handle the objective check.");
    advanceCalendar(1);
    ship.energyNow = Math.max(0, (ship.energyNow ?? classFor(ship).energyMax) - 1);
    const shipSupport = Math.floor((classFor(ship)[challenge.shipStat] || 0) / 3);
    const outcome = rollPower(skillValue(crew, challenge.skill) + shipSupport, challenge.difficulty);
    if (outcome.success) {
      const progress = outcome.critical ? 2 : 1;
      run.objectiveProgress += progress;
      grantXp(crew, outcome.critical ? 2 : 1);
      addLog(`${crew.name} passed ${challenge.title}. Objective progress +${progress}.`);
      if (Math.random() * 100 < (outcome.critical ? 12 : 24)) {
        maybeInjureCrew(ship, 100, challenge.injuryCause);
        if (!ship.missionRun) return;
      }
    } else {
      if (typeof playSound === "function") playSound("error");
      addLog(`${crew.name} failed ${challenge.title}. ${challenge.failLog}`);
      if (Math.random() * 100 < 40) {
        injureCrewMember(ship, crew, challenge.injuryCause);
        if (!ship.missionRun) return;
      }
      applyShipDamage(ship, challenge.shieldDamage, challenge.hullDamage);
    }
    if (ship.hullNow <= 0) { finishMission(ship, false, "lost"); return; }
    if (run.objectiveProgress >= 3) {
      run.objectiveProgress = 3;
      run.phase = "return";
      run.objectiveChallenge = null;
      addLog(`${ship.name} completed the objective. Return to Lunar Base One.`);
      return;
    }
    run.objectiveChallenge = createObjectiveChallenge(ship, mission);
  };

  window.handleMissionAction = function handleMissionAction(action, mode, crewId) {
    const ship = selectedShip();
    if (!ship?.missionRun) return;
    if (action === "scan") scanMission(ship, crewId);
    if (action === "approach") approachMission(ship);
    if (action === "attack") attackEnemy(ship);
    if (action === "evade") evadeEnemy(ship);
    if (action === "defend") defendEnemy(ship);
    if (action === "retreat") retreatMission(ship);
    if (action === "objective") attemptObjective(ship, mode || "standard", crewId);
    if (action === "abort") finishMission(ship, false, "aborted");
    if (action === "return") finishMission(ship, true, "completed");
    persist();
    render();
  };

  window.renderMissionRun = function renderMissionRun(ship) {
    const run = ship.missionRun;
    const mission = missionFor(run);
    const department = departmentFor(mission.need);
    const enemy = run.enemy;
    const phaseLabel = { scan: "Scan Area", approach: "Approach Site", encounter: "Hostile Contact", objective: "Mission Objective", return: "Return Home" }[run.phase];
    return `<article class="mission mission-run" style="--dept: ${department.color}">${renderMissionSceneArt(mission, run, enemy)}<header>${enemy ? renderEnemyVisual(enemy) : renderMissionVisual(mission)}<div><h2><span class="department-dot"></span>${mission.name}</h2><p class="meta">${phaseLabel} - ${mission.text}</p></div><span class="tag warn">${run.phase}</span></header><div class="mission-actions">${run.phase === "scan" ? `<button type="button" data-mission-action="abort">Abort Mission</button>` : ""}${run.phase === "approach" ? `<button type="button" data-mission-action="approach">Approach Site</button><button type="button" data-mission-action="abort">Abort Mission</button>` : ""}${run.phase === "encounter" ? `<button type="button" data-mission-action="attack">Attack</button><button type="button" data-mission-action="evade">Evade</button><button type="button" data-mission-action="defend" ${(ship.energyNow ?? 0) > 0 ? "" : "disabled"}>Defensive Burn</button><button type="button" data-mission-action="retreat">Retreat</button>` : ""}${run.phase === "objective" ? `<button type="button" data-mission-action="abort">Abort Mission</button>` : ""}${run.phase === "return" ? `<button type="button" data-mission-action="return">Return to Base</button>` : ""}</div><div class="stats-grid"><div class="stat">Signal<strong>${run.scanProgress}/3</strong></div><div class="stat">Objective<strong>${run.objectiveProgress}/3</strong></div><div class="stat">Banked<strong>${run.rewardBanked}</strong></div><div class="stat">Need<strong>${department.name}</strong></div></div>${run.phase === "scan" ? renderScanChallenge(ship, mission) : ""}${run.phase === "objective" ? renderObjectiveChallenge(ship, mission) : ""}${enemy ? `<div class="chance-box enemy-status-card"><div class="chance-head"><span>${enemy.name}</span><strong>${enemy.hullNow}/${enemy.hull} hull</strong></div><div class="chance-grid"><span>Damage</span><strong>${enemy.damage}</strong><span>Difficulty</span><strong>${enemy.difficulty}</strong><span>Salvage</span><strong>${enemy.reward}</strong></div></div>` : ""}</article>`;
  };

  window.renderScanChallenge = function renderScanChallenge(ship, mission) {
    const run = ship.missionRun;
    const challenge = run.scanChallenge || createScanChallenge(ship, mission);
    run.scanChallenge = challenge;
    const shipClass = classFor(ship);
    const crew = crewForShip(ship.id).filter((member) => member.hp > 0);
    return renderCrewCheck("Scan", run.scanProgress + 1, challenge, departmentFor(challenge.skill), crew, Math.floor(shipClass.sensors / 3), (ship.energyNow ?? 0) > 0, "scan");
  };

  window.renderObjectiveChallenge = function renderObjectiveChallenge(ship, mission) {
    const run = ship.missionRun;
    const challenge = run.objectiveChallenge || createObjectiveChallenge(ship, mission);
    run.objectiveChallenge = challenge;
    const shipClass = classFor(ship);
    const crew = crewForShip(ship.id).filter((member) => member.hp > 0);
    return renderCrewCheck("Objective", run.objectiveProgress + 1, challenge, departmentFor(challenge.skill), crew, Math.floor((shipClass[challenge.shipStat] || 0) / 3), (ship.energyNow ?? 0) > 0, "objective");
  };

  function renderCrewCheck(kind, step, challenge, department, crew, support, enabled, action) {
    const failureText = `${challenge.shieldDamage || 0} shield${challenge.hullDamage ? `, ${challenge.hullDamage} hull` : ""} + injury`;
    return `<section class="scan-challenge ${action === "objective" ? "objective-challenge" : ""}" style="--dept: ${department.color}"><div class="scan-challenge-head"><div><span>${kind} check ${step}/3</span><strong>${challenge.title}</strong></div><span class="tag warn">${challenge.label}</span></div><p class="meta">${challenge.text}</p><div class="chance-grid"><span>Difficulty</span><strong>${challenge.difficulty}</strong><span>${action === "scan" ? "Ship sensors" : "Ship support"}</span><strong>+${support}</strong><span>Energy cost</span><strong>1</strong><span>Failure risk</span><strong>${failureText}</strong></div><div class="scan-crew-grid">${crew.length ? crew.map((member) => { const skill = skillValue(member, challenge.skill); const chance = rollPower(skill + support, challenge.difficulty).chance; return `<button type="button" data-mission-action="${action}" data-objective-mode="standard" data-mission-crew="${member.id}" ${enabled ? "" : "disabled"}><span>${escapeHtml(member.name)}</span><strong>${challenge.label} ${skill} - ${chance}%</strong></button>`; }).join("") : `<button type="button" disabled>No active crew</button>`}</div></section>`;
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-mission-action][data-mission-crew]");
    if (!button || button.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    handleMissionAction(button.dataset.missionAction, button.dataset.objectiveMode || "standard", button.dataset.missionCrew);
    window.setTimeout(syncMissionWindow, 0);
    window.setTimeout(syncMissionWindow, 120);
  }, true);

  function syncMissionWindow() {
    try {
      const ship = selectedShip();
      const deck = document.querySelector("#missionActionDeck");
      if (!ship?.missionRun || !deck) return;
      if ((ship.missionRun.phase === "scan" || ship.missionRun.phase === "objective") && !deck.querySelector(".scan-challenge")) deck.innerHTML = renderMissionRun(ship);
    } catch {}
  }
  window.setInterval(syncMissionWindow, 700);
})();
