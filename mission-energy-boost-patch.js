(function () {
  window.boostMissionEnergy = function boostMissionEnergy(ship, crewId) {
    const mission = missionFor(ship.missionRun);
    const shipClass = classFor(ship);
    const currentEnergy = ship.energyNow ?? shipClass.energyMax;
    if (currentEnergy >= shipClass.energyMax) return addLog(`${ship.name} already has full energy.`);
    const crew = crewForShip(ship.id).find((member) => member.id === crewId && member.hp > 0);
    if (!crew) return addLog("Choose an active engineer for the emergency power reroute.");

    const difficulty = 22 + Math.floor(mission.risk / 2);
    const support = Math.floor(shipClass.energyMax / 3);
    const outcome = rollPower(skillValue(crew, "engineering") + support, difficulty);
    advanceCalendar(1);

    if (outcome.success) {
      ship.energyNow = Math.min(shipClass.energyMax, currentEnergy + 2);
      grantXp(crew, outcome.critical ? 2 : 1);
      playSound("confirm");
      addLog(`${crew.name} rerouted emergency power. ${ship.name} gained +2 energy.`);
    } else {
      playSound("error");
      injureCrewMember(ship, crew, "emergency power feedback");
      if (!ship.missionRun) return;
      addLog(`${crew.name} failed the emergency power reroute and was injured by feedback.`);
    }
  };

  window.renderEnergyBoost = function renderEnergyBoost(ship, mission) {
    const shipClass = classFor(ship);
    const currentEnergy = ship.energyNow ?? shipClass.energyMax;
    const engineering = departmentFor("engineering");
    const difficulty = 22 + Math.floor(mission.risk / 2);
    const support = Math.floor(shipClass.energyMax / 3);
    const crew = crewForShip(ship.id).filter((member) => member.hp > 0);
    const canBoost = currentEnergy < shipClass.energyMax;
    return `
      <section class="scan-challenge mission-energy-boost" style="--dept: ${engineering.color}">
        <div class="scan-challenge-head"><div><span>Emergency system</span><strong>Emergency Power Reroute</strong></div><span class="tag warn">Engineering</span></div>
        <p class="meta">Attempt an Engineering check during the mission. Success restores +2 energy. Failure injures the selected crew member.</p>
        <div class="chance-grid"><span>Difficulty</span><strong>${difficulty}</strong><span>Ship support</span><strong>+${support}</strong><span>Energy gain</span><strong>+2</strong><span>Failure risk</span><strong>injury</strong></div>
        <div class="scan-crew-grid">
          ${
            crew.length
              ? crew
                  .map((member) => {
                    const skill = skillValue(member, "engineering");
                    const chance = rollPower(skill + support, difficulty).chance;
                    return `<button type="button" data-mission-action="boostEnergy" data-mission-crew="${member.id}" ${canBoost ? "" : "disabled"}><span>${escapeHtml(member.name)}</span><strong>Engineering ${skill} - ${canBoost ? `${chance}%` : "full"}</strong></button>`;
                  })
                  .join("")
              : `<button type="button" disabled>No active crew</button>`
          }
        </div>
      </section>
    `;
  };

  const previousHandleMissionAction = window.handleMissionAction;
  window.handleMissionAction = function handleMissionActionWithEnergy(action, mode, crewId) {
    const ship = selectedShip();
    if (!ship?.missionRun) return;
    if (action === "boostEnergy") {
      boostMissionEnergy(ship, crewId);
      persist();
      render();
      return;
    }
    previousHandleMissionAction(action, mode, crewId);
  };

  const previousRenderMissionRun = window.renderMissionRun;
  window.renderMissionRun = function renderMissionRunWithEnergy(ship) {
    const html = previousRenderMissionRun(ship);
    if (!ship?.missionRun || ship.missionRun.phase === "return" || html.includes("mission-energy-boost")) return html;
    const mission = missionFor(ship.missionRun);
    return html.replace(/(\s*<\/article>\s*)$/, `${renderEnergyBoost(ship, mission)}$1`);
  };
})();
