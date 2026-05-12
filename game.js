let state = loadGame();
let activeView = "base";
let crewSortMode = "department";
let audioContext = null;
const manualSaveSlots = 3;
const manualSavePrefix = `${saveKey}-manual-slot-`;

const resourcesEl = document.querySelector("#resources");
const toastStackEl = document.querySelector("#toastStack");
const sideSelectedShipEl = document.querySelector("#sideSelectedShip");
const sideDestinationEl = document.querySelector("#sideDestination");
const statusHullEl = document.querySelector("#statusHull");
const statusShieldsEl = document.querySelector("#statusShields");
const statusEnergyEl = document.querySelector("#statusEnergy");
const statusHullMeterEl = document.querySelector("#statusHullMeter");
const statusShieldsMeterEl = document.querySelector("#statusShieldsMeter");
const statusEnergyMeterEl = document.querySelector("#statusEnergyMeter");
const docksEl = document.querySelector("#docks");
const shipyardEl = document.querySelector("#shipyard");
const shipyardSummaryEl = document.querySelector("#shipyardSummary");
const hireListEl = document.querySelector("#hireList");
const hireSummaryEl = document.querySelector("#hireSummary");
const crewListEl = document.querySelector("#crewList");
const crewSummaryEl = document.querySelector("#crewSummary");
const missionsEl = document.querySelector("#missions");
const missionSummaryEl = document.querySelector("#missionSummary");
const missionShipSummaryEl = document.querySelector("#missionShipSummary");
const missionShipCardEl = document.querySelector("#missionShipCard");
const missionActionDeckEl = document.querySelector("#missionActionDeck");
const missionCrewSummaryEl = document.querySelector("#missionCrewSummary");
const missionCrewListEl = document.querySelector("#missionCrewList");
const logEl = document.querySelector("#log");
const saveSummaryEl = document.querySelector("#saveSummary");
const autosaveDetailsEl = document.querySelector("#autosaveDetails");
const manualSaveSlotsEl = document.querySelector("#manualSaveSlots");
const importFileEl = document.querySelector("#importFile");
const viewButtons = document.querySelectorAll("[data-view]");
const baseViewEl = document.querySelector("#baseView");
const shipyardViewEl = document.querySelector("#shipyardView");
const personnelViewEl = document.querySelector("#personnelView");
const missionsViewEl = document.querySelector("#missionsView");
const expeditionViewEl = document.querySelector("#expeditionView");
const saveViewEl = document.querySelector("#saveView");

viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeView = button.dataset.view;
    renderViews();
  });
});

document.querySelector("#resetBtn").addEventListener("click", () => {
  if (confirm("Start a new save at Lunar Base 1?")) {
    state = createNewGame();
    persist();
    render();
  }
});

document.querySelector("#exportBtn").addEventListener("click", () => {
  exportCurrentSave();
});

document.querySelector("#importBtn").addEventListener("click", () => {
  importFileEl.click();
});

importFileEl.addEventListener("change", async () => {
  const file = importFileEl.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const imported = parseSavePayload(text);
    const summary = summarizeSave(imported);
    if (!confirm(`Load imported save?\n\n${summary.title}\n${summary.details}`)) return;
    state = normalizeState(imported);
    addLog("Save imported from file.");
    persist();
    render();
  } catch {
    addLog("Import failed. The selected file is not a valid save.");
    render();
  } finally {
    importFileEl.value = "";
  }
});

document.addEventListener("click", (event) => {
  if (event.target.matches("button:not(:disabled)")) {
    flashButton(event.target);
    playSound("click");
  }

  const buyId = event.target.dataset.buy;
  const hireId = event.target.dataset.hire;
  const selectId = event.target.dataset.select;
  const assignId = event.target.dataset.assign;
  const unassignId = event.target.dataset.unassign;
  const missionId = event.target.dataset.mission;
  const selectMissionId = event.target.dataset.selectMission;
  const missionAction = event.target.dataset.missionAction;
  const objectiveMode = event.target.dataset.objectiveMode;
  const upgradeCrewId = event.target.dataset.upgradeCrew;
  const upgradeSkill = event.target.dataset.upgradeSkill;
  const repairId = event.target.dataset.repair;
  const sellId = event.target.dataset.sell;
  const rechargeId = event.target.dataset.recharge;
  const restoreShieldsId = event.target.dataset.restoreShields;
  const renameId = event.target.dataset.rename;
  const soundToggle = event.target.dataset.soundToggle;
  const saveSlot = event.target.dataset.saveSlot;
  const loadSlot = event.target.dataset.loadSlot;
  const deleteSlot = event.target.dataset.deleteSlot;
  const crewSort = event.target.dataset.crewSort;
  const viewId = event.target.dataset.view;

  if (soundToggle) {
    toggleSound();
    return;
  }

  if (crewSort) {
    crewSortMode = crewSort;
    renderCrew();
    return;
  }

  if (viewId) {
    activeView = viewId;
    renderViews();
    return;
  }

  if (buyId) buyShip(buyId);
  if (hireId) hireCadet(hireId);
  if (selectId) selectShip(selectId);
  if (assignId) assignCrew(assignId);
  if (unassignId) unassignCrew(unassignId);
  if (missionId) startMission(missionId);
  if (selectMissionId) selectMission(selectMissionId);
  if (missionAction) handleMissionAction(missionAction, objectiveMode);
  if (upgradeCrewId && upgradeSkill) upgradeCrewSkill(upgradeCrewId, upgradeSkill);
  if (repairId) repairShip(repairId);
  if (sellId) sellShip(sellId);
  if (rechargeId) rechargeShip(rechargeId);
  if (restoreShieldsId) restoreShields(restoreShieldsId);
  if (renameId) renameShip(renameId);
  if (saveSlot) saveToManualSlot(Number(saveSlot));
  if (loadSlot) loadManualSlot(Number(loadSlot));
  if (deleteSlot) deleteManualSlot(Number(deleteSlot));
});

function createNewGame() {
  return {
    version: 2,
    credits: 1000,
    dockLimit: 2,
    nextShipId: 1,
    nextCrewId: 1,
    calendarDay: 0,
    soundEnabled: true,
    selectedShipId: null,
    selectedMissionId: null,
    ships: [],
    crew: [],
    hallOfFame: [],
    log: [
      "Lunar Base 1 is online. You have two empty docks, no crew, and enough credits for two Aster-5 Scouts.",
    ],
  };
}

function loadGame() {
  const raw = localStorage.getItem(saveKey);
  if (!raw) return createNewGame();
  try {
    const parsed = JSON.parse(raw);
    return parsed.version === 2 ? normalizeState(parsed) : createNewGame();
  } catch {
    return createNewGame();
  }
}

function normalizeState(loadedState) {
  if (typeof loadedState.calendarDay !== "number") loadedState.calendarDay = 0;
  if (typeof loadedState.soundEnabled !== "boolean") loadedState.soundEnabled = true;
  if (!Array.isArray(loadedState.hallOfFame)) loadedState.hallOfFame = [];
  if (!loadedState.selectedShipId && loadedState.ships?.length) {
    loadedState.selectedShipId = loadedState.ships[0].id;
  }
  if (!loadedState.selectedMissionId || !missions.some((mission) => mission.id === loadedState.selectedMissionId)) {
    loadedState.selectedMissionId = null;
  }
  loadedState.ships?.forEach((ship) => {
    const shipClass = classFor(ship);
    if (shipClass && typeof ship.energyNow !== "number") {
      ship.energyNow = shipClass.energyMax;
    }
    if (shipClass && ship.energyNow > shipClass.energyMax) {
      ship.energyNow = shipClass.energyMax;
    }
    if (shipClass && typeof ship.shieldsNow !== "number") {
      ship.shieldsNow = shipClass.shields;
    }
    if (shipClass && ship.shieldsNow > shipClass.shields) {
      ship.shieldsNow = shipClass.shields;
    }
    if (shipClass && typeof ship.hullNow !== "number") {
      ship.hullNow = shipClass.hull;
    }
    if (shipClass && ship.hullNow > shipClass.hull) {
      ship.hullNow = shipClass.hull;
    }
    if (ship.missionRun?.enemy && typeof ship.missionRun.enemy.hullNow !== "number") {
      ship.missionRun.enemy.hullNow = ship.missionRun.enemy.hull;
    }
  });
  loadedState.crew?.forEach((member) => {
    if (typeof member.pendingSkillPoints !== "number") member.pendingSkillPoints = 0;
    if (typeof member.maxHp !== "number") member.maxHp = crewMaxHp;
    if (typeof member.hp !== "number") member.hp = member.maxHp;
    if (typeof member.missions !== "number") member.missions = 0;
    syncRank(member);
  });
  return loadedState;
}

function persist() {
  localStorage.setItem(saveKey, JSON.stringify(state));
}

function manualSlotKey(slot) {
  return `${manualSavePrefix}${slot}`;
}

function validateSave(candidate) {
  return Boolean(candidate && candidate.version === 2 && Array.isArray(candidate.crew) && Array.isArray(candidate.ships));
}

function parseSavePayload(text) {
  const trimmed = text.trim();
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    parsed = JSON.parse(decodeURIComponent(escape(atob(trimmed))));
  }

  const saveState = parsed?.state || parsed;
  if (!validateSave(saveState)) throw new Error("Invalid save");
  return saveState;
}

function createSavePackage(sourceState = state) {
  const cleanState = JSON.parse(JSON.stringify(sourceState));
  return {
    game: "Lunar Fleet Command",
    type: "save",
    saveVersion: cleanState.version,
    exportedAt: new Date().toISOString(),
    summary: summarizeSave(cleanState),
    state: cleanState,
  };
}

function readManualSlot(slot) {
  const raw = localStorage.getItem(manualSlotKey(slot));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const saveState = parsed?.state || parsed;
    if (!validateSave(saveState)) return null;
    return parsed.state ? parsed : createSavePackage(saveState);
  } catch {
    return null;
  }
}

function saveToManualSlot(slot) {
  localStorage.setItem(manualSlotKey(slot), JSON.stringify(createSavePackage()));
  addLog(`Manual save slot ${slot} updated.`);
  render();
}

function loadManualSlot(slot) {
  const packageData = readManualSlot(slot);
  if (!packageData) return addLog(`Manual save slot ${slot} is empty.`);
  const saveState = packageData.state;
  const summary = summarizeSave(saveState);
  if (!confirm(`Load manual slot ${slot}?\n\n${summary.title}\n${summary.details}`)) return;
  state = normalizeState(saveState);
  addLog(`Manual save slot ${slot} loaded.`);
  persist();
  render();
}

function deleteManualSlot(slot) {
  if (!readManualSlot(slot)) return;
  if (!confirm(`Delete manual save slot ${slot}?`)) return;
  localStorage.removeItem(manualSlotKey(slot));
  addLog(`Manual save slot ${slot} deleted.`);
  render();
}

function exportCurrentSave() {
  const data = JSON.stringify(createSavePackage(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `lunar-fleet-command-save-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  addLog("Save exported as a file.");
  render();
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  playSound(state.soundEnabled ? "confirm" : "click", { force: true });
  addLog(`Sound ${state.soundEnabled ? "enabled" : "muted"}.`);
  persist();
  render();
}

function ensureAudio() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioContext) audioContext = new AudioCtx();
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function playSound(type, options = {}) {
  if (!options.force && state.soundEnabled === false) return;
  const ctx = ensureAudio();
  if (!ctx) return;

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(type === "hit" || type === "injury" ? 0.18 : 0.12, now + 0.01);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
  master.connect(ctx.destination);

  const patterns = {
    click: [520, 760],
    confirm: [440, 660, 990],
    error: [180, 120],
    buy: [260, 520, 780],
    launch: [160, 260, 420, 640],
    scan: [700, 1040, 1320],
    hit: [90, 55],
    success: [480, 720, 960, 1280],
    level: [620, 880, 1240, 1660],
    injury: [220, 130],
  };
  const freqs = patterns[type] || patterns.click;

  freqs.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + index * 0.045;
    const end = start + (type === "scan" ? 0.16 : 0.12);
    osc.type = type === "hit" || type === "injury" ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(freq, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.72), end);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.45, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(end + 0.02);
  });

  if (type === "launch" || type === "scan") {
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 11;
    lfoGain.gain.value = 18;
    lfo.connect(lfoGain);
    lfo.start(now);
    lfo.stop(now + 0.32);
  }
}

function buyShip(classId) {
  const shipClass = shipClasses.find((item) => item.id === classId);
  if (!shipClass) return;
  if (state.ships.length >= state.dockLimit) return addLog("Both docks are already occupied.");
  if (state.credits < shipClass.cost) return addLog("Not enough credits for that ship.");

  const shipNumber = state.nextShipId++;
  const ship = {
    id: `ship-${shipNumber}`,
    classId,
    name: `${shipClass.name} ${String(shipNumber).padStart(2, "0")}`,
    hullNow: shipClass.hull,
    shieldsNow: shipClass.shields,
    energyNow: shipClass.energyMax,
    missions: 0,
  };
  state.credits -= shipClass.cost;
  state.ships.push(ship);
  state.selectedShipId = ship.id;
  playSound("buy");
  addLog(`${ship.name} purchased and moved into dock.`);
  persist();
  render();
}

function hireCadet(departmentId) {
  const department = departments.find((item) => item.id === departmentId);
  if (!department) return;
  if (state.credits < cadetCost) return addLog("Not enough credits to hire a cadet.");

  const crewNumber = state.nextCrewId++;
  const crew = {
    id: `crew-${crewNumber}`,
    name: generateCrewName(),
    rank: "Cadet",
    rankCode: "CDT",
    level: 0,
    xp: 0,
    hp: crewMaxHp,
    maxHp: crewMaxHp,
    missions: 0,
    pendingSkillPoints: 0,
    department: department.id,
    skills: { ...department.skills },
    shipId: null,
  };

  state.credits -= cadetCost;
  state.crew.push(crew);
  playSound("confirm");
  addLog(`${crew.name} joined ${department.name} as a cadet.`);
  persist();
  render();
}

function generateCrewName() {
  const usedNames = new Set(state.crew.map((member) => member.name));
  const origins = Array.isArray(crewNameOrigins) && crewNameOrigins.length ? crewNameOrigins : [];
  if (!origins.length) return `Cadet ${String(state.nextCrewId || state.crew.length + 1).padStart(3, "0")}`;
  for (let attempt = 0; attempt < 80; attempt++) {
    const origin = origins[Math.floor(Math.random() * origins.length)];
    const first = origin.first[Math.floor(Math.random() * origin.first.length)];
    const last = origin.last[Math.floor(Math.random() * origin.last.length)];
    const name = `${first} ${last}`;
    if (!usedNames.has(name)) return name;
  }

  const fallbackId = String(state.nextCrewId || state.crew.length + 1).padStart(3, "0");
  return `Cadet ${fallbackId}`;
}

function selectShip(shipId) {
  if (!state.ships.some((ship) => ship.id === shipId)) return;
  state.selectedShipId = shipId;
  persist();
  render();
}

function renameShip(shipId) {
  const ship = state.ships.find((item) => item.id === shipId);
  if (!ship) return;

  const input = document.querySelector(`[data-rename-input="${shipId}"]`);
  const nextName = input ? input.value : window.prompt("Enter new ship name:", ship.name);
  if (nextName === null) return;

  const cleanName = nextName.trim().replace(/\s+/g, " ").slice(0, 32);
  if (!cleanName) return addLog("Ship rename cancelled. A ship needs a name.");
  if (cleanName === ship.name) return;

  const oldName = ship.name;
  ship.name = cleanName;
  playSound("confirm");
  addLog(`${oldName} renamed to ${ship.name}.`);
  persist();
  render();
}

function assignCrew(crewId) {
  const ship = selectedShip();
  const crew = state.crew.find((member) => member.id === crewId);
  if (!ship || !crew || crew.shipId) return;
  if (ship.missionRun) return addLog(`${ship.name} is away on mission.`);
  if (crew.hp <= 0) return addLog(`${crew.name} cannot be assigned.`);

  const shipClass = classFor(ship);
  const assigned = crewForShip(ship.id);
  if (assigned.length >= shipClass.crewMax) return addLog(`${ship.name} has no open bunks.`);

  crew.shipId = ship.id;
  addLog(`${crew.name} assigned to ${ship.name}.`);
  persist();
  render();
}

function unassignCrew(crewId) {
  const crew = state.crew.find((member) => member.id === crewId);
  if (!crew) return;
  const ship = state.ships.find((item) => item.id === crew.shipId);
  if (ship?.missionRun) return addLog(`${crew.name} is away on mission.`);
  crew.shipId = null;
  persist();
  render();
}

function startMission(missionId) {
  const ship = selectedShip();
  const mission = missions.find((item) => item.id === missionId) || selectedMission();
  if (!ship || !mission) return;
  if (ship.missionRun) return addLog(`${ship.name} is already away on mission.`);
  if (ship.hullNow <= 0) return addLog(`${ship.name} is destroyed and cannot launch.`);
  if ((ship.energyNow ?? 0) < 1) return addLog(`${ship.name} needs energy to leave Lunar Base One.`);

  const crew = crewForShip(ship.id);
  if (crew.length === 0) return addLog("A ship cannot launch without crew.");
  if (crew.every((member) => member.hp <= 0)) return addLog(`${ship.name} has no crew fit for duty.`);

  advanceCalendar(1);
  ship.missions++;
  crew.forEach((member) => {
    member.missions++;
  });
  ship.missionRun = {
    missionId: mission.id,
    phase: "scan",
    scanProgress: 0,
    objectiveProgress: 0,
    rewardBanked: 0,
    enemy: null,
    defended: false,
  };
  ship.energyNow = Math.max(0, (ship.energyNow ?? classFor(ship).energyMax) - 1);
  playSound("launch");
  addLog(`${ship.name} departed for "${mission.name}". Scan for the mission site.`);

  persist();
  render();
}

function selectMission(missionId) {
  const mission = missions.find((item) => item.id === missionId);
  if (!mission) return;
  state.selectedMissionId = mission.id;
  addLog(`Destination selected: ${mission.name}.`);
  persist();
  render();
}

function handleMissionAction(action, mode) {
  const ship = selectedShip();
  if (!ship?.missionRun) return;

  if (action === "scan") scanMission(ship);
  if (action === "approach") approachMission(ship);
  if (action === "attack") attackEnemy(ship);
  if (action === "evade") evadeEnemy(ship);
  if (action === "defend") defendEnemy(ship);
  if (action === "retreat") retreatMission(ship);
  if (action === "objective") attemptObjective(ship, mode || "standard");
  if (action === "abort") finishMission(ship, false, "aborted");
  if (action === "return") finishMission(ship, true, "completed");

  persist();
  render();
}

function scanMission(ship) {
  const run = ship.missionRun;
  const shipClass = classFor(ship);
  const mission = missionFor(run);
  if ((ship.energyNow ?? 0) < 1) return addLog(`${ship.name} has no energy for another scan.`);

  advanceCalendar(1);
  ship.energyNow = Math.max(0, (ship.energyNow ?? shipClass.energyMax) - 1);
  playSound("scan");
  const power = crewPower(ship, "operations") + Math.floor(shipClass.sensors / 2);
  const outcome = rollPower(power, mission.risk);
  const hazardRoll = Math.random();

  if (outcome.critical) {
    run.scanProgress += 2;
    addLog(`${ship.name} locked a clean signal vector. Scan progress +2.`);
  } else if (outcome.success) {
    run.scanProgress += 1;
    addLog(`${ship.name} narrowed the search area. Scan progress +1.`);
  } else if (hazardRoll < 0.18) {
    applyShipDamage(ship, 1, 0);
    maybeInjureCrew(ship, 20, "scan turbulence");
    if (!ship.missionRun) return;
    addLog(`${ship.name} hit an ion pocket while scanning. Shields damaged.`);
  } else {
    addLog(`${ship.name} followed a false signal. Energy spent, no progress.`);
  }

  if (Math.random() < 0.12 && run.scanProgress < 3) {
    run.phase = "encounter";
    run.enemy = createEnemy(mission);
    addLog(`${ship.name} was ambushed by ${run.enemy.name}.`);
    return;
  }

  if (run.scanProgress >= 3) {
    run.scanProgress = 3;
    run.phase = "approach";
    addLog(`${ship.name} found the mission site. Prepare approach.`);
  }
}

function approachMission(ship) {
  const run = ship.missionRun;
  const mission = missionFor(run);
  advanceCalendar(1);

  const eventRoll = Math.random();
  if (eventRoll < 0.28) {
    run.phase = "encounter";
    run.enemy = createEnemy(mission);
    addLog(`${ship.name} detected ${run.enemy.name} blocking the route.`);
    return;
  }

  if (eventRoll < 0.5) {
    const outcome = rollPower(crewPower(ship, "tactical") + classFor(ship).range, mission.risk);
    if (outcome.success) {
      addLog(`${ship.name} threaded a hostile debris field without damage.`);
    } else {
      applyShipDamage(ship, 2, 0);
      maybeInjureCrew(ship, 25, "violent approach maneuver");
      if (!ship.missionRun) return;
      addLog(`${ship.name} clipped a debris field on approach. Shields damaged.`);
    }
  } else {
    addLog(`${ship.name} made a clean approach. No contact.`);
  }

  if (ship.hullNow <= 0) {
    finishMission(ship, false, "lost");
    return;
  }
  run.phase = "objective";
}

function attackEnemy(ship) {
  const run = ship.missionRun;
  const enemy = run.enemy;
  if (!enemy) return;

  advanceCalendar(1);
  const power = crewPower(ship, "tactical") + classFor(ship).weapons;
  const outcome = rollPower(power, enemy.difficulty);
  if (outcome.success) {
    const damage = Math.max(2, Math.ceil(classFor(ship).weapons / 2)) + (outcome.critical ? 2 : 0);
    enemy.hullNow = Math.max(0, enemy.hullNow - damage);
    playSound("hit");
    addLog(`${ship.name} hit ${enemy.name} for ${damage} damage.`);
  } else {
    addLog(`${ship.name} missed ${enemy.name}.`);
  }

  if (enemy.hullNow <= 0) {
    run.rewardBanked += enemy.reward;
    run.enemy = null;
    run.phase = "objective";
    playSound("success");
    addLog(`${enemy.name} destroyed. Salvage value secured: ${enemy.reward} credits.`);
    return;
  }

  enemyAttack(ship);
}

function evadeEnemy(ship) {
  const run = ship.missionRun;
  const enemy = run.enemy;
  const power = crewPower(ship, "operations") + classFor(ship).range;
  advanceCalendar(1);
  if (rollPower(power, enemy.difficulty + 10).success) {
    run.enemy = null;
    run.phase = "objective";
    addLog(`${ship.name} evaded ${enemy.name} and reached the mission site.`);
  } else {
    addLog(`${ship.name} failed to break contact with ${enemy.name}.`);
    enemyAttack(ship);
  }
}

function defendEnemy(ship) {
  ship.missionRun.defended = true;
  advanceCalendar(1);
  ship.energyNow = Math.max(0, (ship.energyNow ?? classFor(ship).energyMax) - 1);
  addLog(`${ship.name} reinforced shields and braced for impact.`);
  enemyAttack(ship);
}

function retreatMission(ship) {
  const enemy = ship.missionRun.enemy;
  const difficulty = enemy ? enemy.difficulty + 4 : 24;
  const power = crewPower(ship, "operations") + classFor(ship).range;
  advanceCalendar(1);
  if (rollPower(power, difficulty).success) {
    finishMission(ship, false, "retreated");
  } else {
    addLog(`${ship.name} failed to retreat cleanly.`);
    if (enemy) enemyAttack(ship);
  }
}

function attemptObjective(ship, mode) {
  const run = ship.missionRun;
  const mission = missionFor(run);
  const energyCost = mode === "careful" ? 0 : mode === "push" ? 2 : 1;
  if ((ship.energyNow ?? 0) < energyCost) return addLog(`${ship.name} lacks energy for that objective attempt.`);

  advanceCalendar(1);
  ship.energyNow = Math.max(0, (ship.energyNow ?? classFor(ship).energyMax) - energyCost);
  const riskMod = mode === "careful" ? -4 : mode === "push" ? 8 : 0;
  const power = crewPower(ship, mission.need) + Math.floor(crewPower(ship, "command") / 3);
  const outcome = rollPower(power, mission.risk + riskMod);
  let progress = 0;
  let complicationChance = 0;

  if (outcome.success) {
    if (mode === "careful") {
      progress = 1;
      complicationChance = 12;
    } else if (mode === "push") {
      progress = 2;
      complicationChance = outcome.critical ? 25 : 45;
    } else {
      progress = outcome.critical ? 2 : 1;
      complicationChance = outcome.critical ? 12 : 24;
    }
    run.objectiveProgress += progress;
    addLog(`${ship.name} advanced "${mission.name}". Objective progress +${progress}.`);
    if (Math.random() * 100 < complicationChance) {
      maybeInjureCrew(ship, 100, `${mission.name} field work`);
      if (!ship.missionRun) return;
    }
  } else {
    playSound("error");
    addLog(`${ship.name} failed the objective attempt.`);
    const failInjuryChance = mode === "careful" ? 25 : mode === "push" ? 60 : 40;
    const failDamage = mode === "push" ? 2 : 1;
    if (Math.random() * 100 < failInjuryChance) {
      maybeInjureCrew(ship, 100, "objective backlash");
      if (!ship.missionRun) return;
    }
    if (mode !== "careful" || Math.random() < 0.35) applyShipDamage(ship, failDamage, 0);
  }

  if (ship.hullNow <= 0) {
    finishMission(ship, false, "lost");
    return;
  }

  if (run.objectiveProgress >= 3) {
    run.objectiveProgress = 3;
    run.phase = "return";
    addLog(`${ship.name} completed the objective. Return to Lunar Base One.`);
  }
}

function finishMission(ship, success, reason) {
  const run = ship.missionRun;
  const mission = missionFor(run);
  const crew = crewForShip(ship.id);
  advanceCalendar(1);

  if (success) {
    const reward = mission.reward + run.rewardBanked + Math.floor(Math.random() * 70);
    state.credits += reward;
    crew.forEach((member) => grantXp(member, 2));
    playSound("success");
    addLog(`${ship.name} returned from "${mission.name}". Earned ${reward} credits.`);
  } else {
    crew.forEach((member) => grantXp(member, 1));
    playSound(reason === "lost" ? "hit" : "error");
    addLog(`${ship.name} ${reason === "retreated" ? "retreated from" : reason === "lost" ? "lost" : "aborted"} "${mission.name}".`);
  }

  ship.missionRun = null;
  healRestingCrew(ship.id);
}

function missionFor(run) {
  return missions.find((item) => item.id === run?.missionId) || missions[0];
}

function createEnemy(mission) {
  const base = enemyContacts[Math.floor(Math.random() * enemyContacts.length)];
  const riskBonus = Math.floor(mission.risk / 12);
  return {
    ...base,
    hull: base.hull + riskBonus,
    hullNow: base.hull + riskBonus,
    damage: base.damage + Math.floor(riskBonus / 2),
    reward: base.reward + riskBonus * 12,
  };
}

function rollPower(power, difficulty) {
  const chance = Math.max(12, Math.min(92, 48 + power * 4 - difficulty));
  const roll = Math.floor(Math.random() * 100) + 1;
  return { roll, chance, success: roll <= chance, critical: roll <= Math.max(5, Math.floor(chance / 5)) };
}

function crewPower(ship, skill) {
  return crewForShip(ship.id)
    .filter((member) => member.hp > 0)
    .reduce((sum, member) => sum + skillValue(member, skill), 0);
}

function enemyAttack(ship) {
  const run = ship.missionRun;
  const enemy = run.enemy;
  if (!enemy) return;

  const reduction = run.defended ? 1 : 0;
  const damage = Math.max(1, enemy.damage + Math.floor(Math.random() * 3) - reduction);
  run.defended = false;
  applyShipDamage(ship, damage, 0);
  playSound("hit");
  maybeInjureCrew(ship, ship.hullNow <= 0 ? 75 : 45, `${enemy.name} attack`);
  if (!ship.missionRun) return;
  addLog(`${enemy.name} hit ${ship.name} for ${damage} damage.`);

  if (ship.hullNow <= 0) finishMission(ship, false, "lost");
}

function applyShipDamage(ship, shieldDamage, hullDamage) {
  let remaining = shieldDamage;
  const currentShields = ship.shieldsNow ?? classFor(ship).shields;
  const absorbed = Math.min(currentShields, remaining);
  ship.shieldsNow = currentShields - absorbed;
  remaining -= absorbed;
  ship.hullNow = Math.max(0, ship.hullNow - remaining - hullDamage);
  return { absorbed, hullDamage: remaining + hullDamage };
}

function maybeInjureCrew(ship, chance, cause) {
  if (Math.random() * 100 > chance) return;

  const candidates = crewForShip(ship.id).filter((member) => member.hp > 0);
  if (!candidates.length) return;

  const member = candidates[Math.floor(Math.random() * candidates.length)];
  member.hp = Math.max(0, member.hp - 1);
  playSound("injury");
  if (member.hp > 0) {
    addLog(`${member.name} was injured by ${cause}. HP ${member.hp}/${member.maxHp}.`);
    return;
  }

  state.hallOfFame.unshift({
    name: member.name,
    rank: member.rank,
    rankCode: member.rankCode,
    level: member.level,
    xp: member.xp,
    missions: member.missions,
    department: member.department,
    cause,
    date: currentCalendarDate(),
  });
  state.crew = state.crew.filter((item) => item.id !== member.id);
  addLog(`${member.name} was killed by ${cause} and entered the Hall of Fame.`);
  if (ship.missionRun && crewForShip(ship.id).every((crewMember) => crewMember.hp <= 0)) {
    addLog(`${ship.name} has no surviving crew.`);
    finishMission(ship, false, "lost");
  }
}

function healRestingCrew(activeShipId) {
  let healed = 0;
  state.crew.forEach((member) => {
    if (member.shipId === activeShipId || member.hp >= member.maxHp) return;
    member.hp += 1;
    healed++;
  });
  if (healed) addLog(`${healed} resting crew recovered 1 HP at Lunar Base One.`);
}

function repairShip(shipId) {
  const ship = state.ships.find((item) => item.id === shipId);
  if (!ship) return;
  if (ship.missionRun) return addLog(`${ship.name} is away on mission and cannot be repaired.`);

  const shipClass = classFor(ship);
  const missingHull = shipClass.hull - ship.hullNow;
  if (missingHull <= 0) return addLog(`${ship.name} is already fully repaired.`);

  const cost = missingHull * repairCostPerHull;
  if (state.credits < cost) return addLog(`Repairing ${ship.name} requires ${cost} credits.`);

  state.credits -= cost;
  ship.hullNow = shipClass.hull;
  addLog(`${ship.name} repaired to full hull for ${cost} credits.`);
  persist();
  render();
}

function rechargeShip(shipId) {
  const ship = state.ships.find((item) => item.id === shipId);
  if (!ship) return;
  if (ship.missionRun) return addLog(`${ship.name} is away on mission and cannot recharge.`);

  const shipClass = classFor(ship);
  const energyNow = ship.energyNow ?? shipClass.energyMax;
  const missingEnergy = shipClass.energyMax - energyNow;
  if (missingEnergy <= 0) return addLog(`${ship.name} battery is already full.`);

  const cost = missingEnergy * rechargeCostPerCell;
  if (state.credits < cost) return addLog(`Recharging ${ship.name} requires ${cost} credits.`);

  state.credits -= cost;
  ship.energyNow = shipClass.energyMax;
  addLog(`${ship.name} battery recharged for ${cost} credits.`);
  persist();
  render();
}

function restoreShields(shipId) {
  const ship = state.ships.find((item) => item.id === shipId);
  if (!ship) return;
  if (ship.missionRun) return addLog(`${ship.name} is away on mission and cannot restore shields.`);

  const shipClass = classFor(ship);
  if ((ship.shieldsNow ?? shipClass.shields) >= shipClass.shields) return addLog(`${ship.name} shields are already full.`);

  ship.shieldsNow = shipClass.shields;
  addLog(`${ship.name} shields restored at Lunar Base One.`);
  persist();
  render();
}

function sellShip(shipId) {
  const ship = state.ships.find((item) => item.id === shipId);
  if (!ship) return;
  if (ship.missionRun) return addLog(`${ship.name} is away on mission and cannot be sold.`);

  const shipClass = classFor(ship);
  const refund = Math.floor(shipClass.cost / 2);
  state.crew.forEach((member) => {
    if (member.shipId === ship.id) member.shipId = null;
  });
  state.ships = state.ships.filter((item) => item.id !== ship.id);
  state.credits += refund;
  state.selectedShipId = state.ships[0]?.id || null;
  addLog(`${ship.name} sold for ${refund} credits. Assigned crew returned to base.`);
  persist();
  render();
}

function renderBattery(ship) {
  const shipClass = classFor(ship);
  const max = shipClass.energyMax;
  const current = Math.max(0, Math.min(max, ship.energyNow ?? max));
  const ratio = current / max;
  const tone = ratio <= 0.25 ? "low" : ratio <= 0.5 ? "mid" : "high";
  const cells = Array.from({ length: max }, (_, index) => `<span class="${index < current ? "filled" : ""}"></span>`).join("");
  return `
    <div class="battery ${tone}" style="--cells: ${max}" aria-label="Energy ${current} of ${max}">
      <div class="battery-head">
        <span>Energy</span>
        <strong>${current}/${max}</strong>
      </div>
      <div class="battery-cells">${cells}</div>
    </div>
  `;
}

function hashString(value) {
  return String(value).split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function pickSeed(seed, list, offset = 0) {
  return list[Math.abs(hashString(`${seed}:${offset}`)) % list.length];
}

function renderCrewPortrait(member) {
  const department = departmentFor(member);
  const seed = member.id || member.name;
  const skin = pickSeed(seed, ["#f1c7a7", "#c98d64", "#8d5a42", "#d8a77b", "#f0d0b7"], 1);
  const hair = pickSeed(seed, ["#15100d", "#3b261b", "#6f4a2e", "#d9d1bd", "#261b2e"], 2);
  const eye = pickSeed(seed, ["#2f8cff", "#75d18a", "#ffd21f", "#8a6a52"], 3);
  const hairStyle = Math.abs(hashString(`${seed}:hair`)) % 3;
  const mouth = Math.abs(hashString(`${seed}:mouth`)) % 2 ? "M42 63 Q50 68 58 63" : "M42 65 Q50 62 58 65";
  const hairShape =
    hairStyle === 0
      ? `<path d="M28 38 Q30 17 51 17 Q72 18 74 39 Q60 29 45 31 Q36 32 28 38Z" fill="${hair}" />`
      : hairStyle === 1
        ? `<path d="M29 40 Q35 14 60 20 Q72 26 72 44 Q56 31 44 33 Q34 35 29 40Z" fill="${hair}" />`
        : `<path d="M29 39 Q38 20 54 18 Q68 20 74 38 L72 46 Q56 30 42 34 Q34 36 29 39Z" fill="${hair}" />`;

  const fallback = `
    <svg class="crew-portrait" viewBox="0 0 100 112" role="img" aria-label="${escapeHtml(member.name)} portrait">
      <rect x="7" y="7" width="86" height="98" rx="10" fill="#080808" stroke="${department.color}" />
      <circle cx="50" cy="43" r="26" fill="${skin}" />
      ${hairShape}
      <circle cx="40" cy="45" r="3" fill="${eye}" />
      <circle cx="60" cy="45" r="3" fill="${eye}" />
      <path d="${mouth}" fill="none" stroke="#5c3028" stroke-width="2" stroke-linecap="round" />
      <path d="M22 103 Q27 76 50 76 Q73 76 78 103Z" fill="${department.color}" />
      <path d="M39 78 L50 93 L61 78" fill="#101010" opacity="0.65" />
      <rect x="41" y="89" width="18" height="9" rx="2" fill="#050505" stroke="#f3f0e9" />
      <text x="50" y="96" text-anchor="middle" font-size="7" font-family="Consolas, monospace" fill="#f3f0e9">${member.rankCode}</text>
    </svg>
  `;
  return window.LunarAssets?.crewPortrait(member, department, fallback) || fallback;
}

function renderShipVisual(shipOrClass) {
  const shipClass = shipOrClass.classId ? classFor(shipOrClass) : shipOrClass;
  const seed = shipClass.id;
  const accent = pickSeed(seed, ["#2f8cff", "#00d062", "#ff9f00", "#b565ff"], 1);
  const wing = 16 + (Math.abs(hashString(seed)) % 10);
  const nose = 14 + (Math.abs(hashString(`${seed}:nose`)) % 14);
  const fallback = `
    <svg class="ship-visual" viewBox="0 0 180 90" role="img" aria-label="${escapeHtml(shipClass.name)}">
      <rect x="8" y="10" width="164" height="70" rx="8" fill="#040609" stroke="#25282e" />
      <path d="M90 ${12 + nose} L${148 - wing} 70 L90 58 L${32 + wing} 70Z" fill="#1c252e" stroke="${accent}" stroke-width="3" />
      <path d="M90 ${18 + nose} L110 58 L90 66 L70 58Z" fill="#0a0f15" stroke="#8a857d" />
      <circle cx="90" cy="48" r="8" fill="${accent}" opacity="0.75" />
      <path d="M42 72 L24 78 M138 72 L156 78" stroke="${accent}" stroke-width="4" stroke-linecap="round" />
    </svg>
  `;
  return window.LunarAssets?.shipVisual(shipOrClass, shipClass, fallback) || fallback;
}

function renderEnemyVisual(enemy) {
  const seed = enemy?.name || "hostile";
  const accent = pickSeed(seed, ["#ff3158", "#ff9f00", "#b565ff"], 1);
  const fallback = `
    <svg class="enemy-visual" viewBox="0 0 180 90" role="img" aria-label="${escapeHtml(enemy?.name || "Enemy contact")}">
      <rect x="8" y="10" width="164" height="70" rx="8" fill="#080303" stroke="#321016" />
      <path d="M90 18 L145 44 L116 71 L90 58 L64 71 L35 44Z" fill="#281019" stroke="${accent}" stroke-width="3" />
      <path d="M70 44 L90 33 L110 44 L90 54Z" fill="#050505" stroke="${accent}" />
      <circle cx="72" cy="48" r="4" fill="${accent}" />
      <circle cx="108" cy="48" r="4" fill="${accent}" />
    </svg>
  `;
  return window.LunarAssets?.enemyVisual(enemy, fallback) || fallback;
}

function renderMissionVisual(mission) {
  const department = departmentFor(mission.need);
  const icon = {
    engineering: "M32 58 L62 28 L72 38 L42 68Z",
    science: "M50 25 A25 25 0 1 0 51 25 M50 18 L50 82 M20 50 L80 50",
    tactical: "M50 18 L78 38 L67 75 L33 75 L22 38Z",
    medical: "M44 25 H56 V44 H75 V56 H56 V75 H44 V56 H25 V44 H44Z",
  }[mission.need] || "M25 65 L50 22 L75 65Z";
  return `
    <svg class="mission-visual" viewBox="0 0 100 100" role="img" aria-label="${escapeHtml(mission.name)}">
      <rect x="8" y="8" width="84" height="84" rx="10" fill="#070707" stroke="${department.color}" />
      <path d="${icon}" fill="none" stroke="${department.color}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="50" cy="50" r="34" fill="none" stroke="#2a2a2a" stroke-dasharray="3 7" />
    </svg>
  `;
}

function renderMissionSceneArt(mission, run = {}, enemy = null) {
  const phase = run.phase || "ready";
  const department = departmentFor(mission.need);
  const title = {
    ready: "Mission site preview",
    scan: "Long-range sensor sweep",
    approach: "Approach vector",
    encounter: enemy?.name || "Hostile contact",
    objective: mission.name,
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
    <figure class="mission-scene-art phase-${phase}" style="--dept: ${department.color}" aria-label="${escapeHtml(title)}">
      ${window.LunarAssets?.sceneArt(phase, renderSceneSvg(phase, department.color)) || renderSceneSvg(phase, department.color)}
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
      <defs>
        <radialGradient id="${gradientId}" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stop-color="${color}" stop-opacity=".22" />
          <stop offset="100%" stop-color="${color}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1000" height="300" fill="#03050a" />
      <rect width="1000" height="300" fill="url(#${gradientId})" />
      <g fill="#f3f0e9" opacity=".72">${starfield}</g>
      ${scene}
      <path d="M0 250 H1000" stroke="#ffffff" stroke-opacity=".06" />
    </svg>
  `;
}

function grantXp(member, amount) {
  if (member.pendingSkillPoints > 0) {
    addLog(`${member.name} is waiting for a skill upgrade before gaining more XP.`);
    return;
  }

  const oldLevel = member.level;
  member.xp += amount;
  syncRank(member);

  if (member.level > oldLevel) {
    member.pendingSkillPoints += member.level - oldLevel;
    playSound("level");
    addLog(`${member.name} advanced to ${member.rank} (${member.rankCode}). Choose ${member.pendingSkillPoints} skill upgrade${member.pendingSkillPoints > 1 ? "s" : ""}.`);
  }
}

function upgradeCrewSkill(crewId, skill) {
  const member = state.crew.find((item) => item.id === crewId);
  if (!member || member.pendingSkillPoints <= 0 || !(skill in skillLabels)) return;

  member.skills[skill] += 1;
  member.pendingSkillPoints -= 1;
  playSound("confirm");
  addLog(`${member.name} improved ${skillLabels[skill]} to ${member.skills[skill]}.`);
  persist();
  render();
}

function syncRank(member) {
  const currentRank = [...rankLadder].reverse().find((rank) => member.xp >= rank.xp) || rankLadder[0];
  member.level = currentRank.level;
  member.rank = currentRank.rank;
  member.rankCode = currentRank.code;
}

function nextRankFor(member) {
  return rankLadder.find((rank) => rank.level > member.level) || null;
}

function nextXpTarget(member) {
  return nextRankFor(member)?.xp || rankLadder[rankLadder.length - 1].xp;
}

function skillValue(member, skill) {
  return member.skills?.[skill] || 0;
}

function hpTone(member) {
  const ratio = member.hp / member.maxHp;
  if (ratio <= 0.34) return "danger";
  if (ratio <= 0.67) return "warn";
  return "ok";
}

function selectedShip() {
  const ship = state.ships.find((item) => item.id === state.selectedShipId) || state.ships[0] || null;
  if (ship && state.selectedShipId !== ship.id) state.selectedShipId = ship.id;
  return ship;
}

function selectedMission() {
  return missions.find((item) => item.id === state.selectedMissionId) || null;
}

function classFor(ship) {
  return shipClasses.find((item) => item.id === ship.classId);
}

function departmentFor(memberOrId) {
  const id = typeof memberOrId === "string" ? memberOrId : memberOrId.department;
  return departments.find((item) => item.id === id) || departments[0];
}

function crewForShip(shipId) {
  return state.crew.filter((member) => member.shipId === shipId);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function addLog(message) {
  state.log.unshift(message);
  state.log = state.log.slice(0, 10);
  showToast(message);
}

function advanceCalendar(days) {
  state.calendarDay = (state.calendarDay || 0) + days;
}

function formatCalendarDate(calendarDay = 0) {
  let day = calendarStart.day + calendarDay;
  let month = calendarStart.month;
  let year = calendarStart.year;

  while (day > 30) {
    day -= 30;
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return `${day}.${month}.${year}`;
}

function currentCalendarDate() {
  return formatCalendarDate(state.calendarDay || 0);
}

function summarizeSave(sourceState = state) {
  const assigned = sourceState.crew?.filter((member) => member.shipId).length || 0;
  const activeMissions = sourceState.ships?.filter((ship) => ship.missionRun).length || 0;
  const date = formatCalendarDate(sourceState.calendarDay || 0);
  return {
    title: `${sourceState.credits ?? 0} credits - ${date}`,
    details: `${sourceState.ships?.length || 0}/${sourceState.dockLimit || 0} docks, ${assigned}/${sourceState.crew?.length || 0} crew assigned, ${activeMissions} active mission${activeMissions === 1 ? "" : "s"}`,
  };
}

function formatSavedAt(value) {
  if (!value) return "Not saved";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString();
}

function showToast(message) {
  if (!toastStackEl) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toastStackEl.prepend(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  window.setTimeout(() => {
    toast.classList.remove("is-visible");
    window.setTimeout(() => toast.remove(), 220);
  }, 2400);
  Array.from(toastStackEl.children).slice(3).forEach((item) => item.remove());
}

function flashButton(button) {
  button.classList.remove("is-confirming");
  void button.offsetWidth;
  button.classList.add("is-confirming");
  window.setTimeout(() => button.classList.remove("is-confirming"), 420);
}

function setMeter(meter, current, max) {
  if (!meter || !max) {
    meter?.style.setProperty("--value", "0%");
    return;
  }

  const value = Math.max(0, Math.min(100, (Number(current || 0) / Number(max)) * 100));
  meter.style.setProperty("--value", `${value}%`);
}

function render() {
  const assigned = state.crew.filter((member) => member.shipId).length;
  const ship = selectedShip();
  const destination = selectedMission();
  const shipClass = ship ? classFor(ship) : null;
  const hullValue = ship && shipClass ? `${ship.hullNow}/${shipClass.hull}` : "--";
  const shieldsValue = ship && shipClass ? `${ship.shieldsNow ?? shipClass.shields}/${shipClass.shields}` : "--";
  const energyValue = ship && shipClass ? `${ship.energyNow ?? shipClass.energyMax}/${shipClass.energyMax}` : "--";
  resourcesEl.innerHTML = `
    <div class="resource">Stardate<strong>${currentCalendarDate()}</strong></div>
    <div class="resource">Credits<strong>${state.credits}</strong></div>
    <div class="resource">Docks<strong>${state.ships.length}/${state.dockLimit}</strong></div>
    <div class="resource">Crew<strong>${assigned}/${state.crew.length}</strong></div>
    <button class="sound-toggle ${state.soundEnabled ? "is-on" : "is-off"}" type="button" data-sound-toggle="1">${state.soundEnabled ? "Sound On" : "Muted"}</button>
  `;
  if (sideSelectedShipEl) sideSelectedShipEl.textContent = ship?.name || "No vessel";
  if (sideDestinationEl) sideDestinationEl.textContent = destination?.name || "No destination";
  if (statusHullEl) statusHullEl.textContent = hullValue;
  if (statusShieldsEl) statusShieldsEl.textContent = shieldsValue;
  if (statusEnergyEl) statusEnergyEl.textContent = energyValue;
  setMeter(statusHullMeterEl, ship?.hullNow, shipClass?.hull);
  setMeter(statusShieldsMeterEl, ship?.shieldsNow ?? shipClass?.shields, shipClass?.shields);
  setMeter(statusEnergyMeterEl, ship?.energyNow ?? shipClass?.energyMax, shipClass?.energyMax);
  resourcesEl.classList.remove("is-updated");
  void resourcesEl.offsetWidth;
  resourcesEl.classList.add("is-updated");

  renderLog();
  renderDocks();
  renderShipyard();
  renderHiring();
  renderCrew();
  renderMissions();
  renderExpedition();
  renderSaveManagement();
  renderViews();
}

function renderViews() {
  viewButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === activeView);
  });
  baseViewEl.classList.toggle("is-active", activeView === "base");
  shipyardViewEl.classList.toggle("is-active", activeView === "shipyard");
  personnelViewEl.classList.toggle("is-active", activeView === "personnel");
  missionsViewEl.classList.toggle("is-active", activeView === "missions");
  expeditionViewEl.classList.toggle("is-active", activeView === "expedition");
  saveViewEl.classList.toggle("is-active", activeView === "save");
}

function renderSaveManagement() {
  if (!saveSummaryEl || !autosaveDetailsEl || !manualSaveSlotsEl) return;
  const autosave = createSavePackage();
  const summary = autosave.summary;
  saveSummaryEl.textContent = "Autosave plus 3 manual slots";
  autosaveDetailsEl.innerHTML = `
    <div class="save-detail"><span>Current save</span><strong>${escapeHtml(summary.title)}</strong></div>
    <div class="save-detail"><span>Fleet state</span><strong>${escapeHtml(summary.details)}</strong></div>
    <div class="save-detail"><span>Storage</span><strong>Browser autosave</strong></div>
  `;
  manualSaveSlotsEl.innerHTML = Array.from({ length: manualSaveSlots }, (_, index) => {
    const slot = index + 1;
    const packageData = readManualSlot(slot);
    const slotSummary = packageData?.summary || (packageData ? summarizeSave(packageData.state) : null);
    const empty = !packageData;
    return `
      <article class="save-card ${empty ? "empty-save" : ""}">
        <header>
          <div>
            <h2>Manual Save ${slot}</h2>
            <p class="meta">${empty ? "Empty slot ready for a backup." : `Saved ${escapeHtml(formatSavedAt(packageData.exportedAt))}`}</p>
          </div>
          <span class="tag ${empty ? "warn" : "ok"}">${empty ? "empty" : "saved"}</span>
        </header>
        <div class="save-details">
          ${
            empty
              ? `<div class="save-detail"><span>Status</span><strong>No save stored</strong></div>`
              : `
                <div class="save-detail"><span>Snapshot</span><strong>${escapeHtml(slotSummary.title)}</strong></div>
                <div class="save-detail"><span>Fleet state</span><strong>${escapeHtml(slotSummary.details)}</strong></div>
              `
          }
        </div>
        <div class="save-actions">
          <button type="button" data-save-slot="${slot}">Save</button>
          <button type="button" data-load-slot="${slot}" ${empty ? "disabled" : ""}>Load</button>
          <button type="button" data-delete-slot="${slot}" ${empty ? "disabled" : ""}>Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderDocks() {
  const slots = Array.from({ length: state.dockLimit }, (_, index) => state.ships[index] || null);
  docksEl.innerHTML = slots
    .map((ship, index) => {
      if (!ship) {
        return `<article class="dock"><header><h2>Dock ${index + 1}</h2><span class="tag warn">empty</span></header><p class="meta">Ready for a new ship from the shipyard.</p></article>`;
      }
      const shipClass = classFor(ship);
      const crew = crewForShip(ship.id);
      const selected = ship.id === state.selectedShipId ? "ok" : "";
      const missingHull = shipClass.hull - ship.hullNow;
      const repairCost = missingHull * repairCostPerHull;
      const missingShields = shipClass.shields - (ship.shieldsNow ?? shipClass.shields);
      const missingEnergy = shipClass.energyMax - (ship.energyNow ?? shipClass.energyMax);
      const rechargeCost = missingEnergy * rechargeCostPerCell;
      const destroyed = ship.hullNow <= 0;
      const away = Boolean(ship.missionRun);
      const shipName = escapeHtml(ship.name);
      return `
        <article class="dock">
          <header>
            ${renderShipVisual(ship)}
            <div>
              <h2>${shipName}</h2>
              <p class="meta">${shipClass.role}</p>
            </div>
            <span class="tag ${destroyed ? "danger" : away ? "warn" : selected}">${destroyed ? "destroyed" : away ? "away" : `${crew.length}/${shipClass.crewMax}`}</span>
          </header>
          <div class="stats-grid">
            <div class="stat">Hull<strong>${ship.hullNow}/${shipClass.hull}</strong></div>
            <div class="stat">Shields<strong>${ship.shieldsNow ?? shipClass.shields}/${shipClass.shields}</strong></div>
            <div class="stat">Sensors<strong>${shipClass.sensors}</strong></div>
            <div class="stat">Weapons<strong>${shipClass.weapons}</strong></div>
          </div>
          ${renderBattery(ship)}
          <div class="rename-row">
            <input type="text" data-rename-input="${ship.id}" value="${shipName}" maxlength="32" aria-label="Ship name" />
            <button type="button" data-rename="${ship.id}">Rename</button>
          </div>
          <div class="crew-actions">
            <button type="button" data-select="${ship.id}">Select Ship</button>
            <button type="button" data-repair="${ship.id}" ${!away && missingHull > 0 && state.credits >= repairCost ? "" : "disabled"}>Repair ${repairCost}</button>
            <button type="button" data-restore-shields="${ship.id}" ${!away && missingShields > 0 ? "" : "disabled"}>Restore Shields</button>
            <button type="button" data-recharge="${ship.id}" ${!away && missingEnergy > 0 && state.credits >= rechargeCost ? "" : "disabled"}>Recharge ${rechargeCost}</button>
            <button type="button" data-sell="${ship.id}" ${away ? "disabled" : ""}>Sell ${Math.floor(shipClass.cost / 2)}</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderShipyard() {
  shipyardSummaryEl.textContent = "Two docks available at Lunar Base 1";
  shipyardEl.innerHTML = shipClasses
    .map((ship) => {
      const canBuy = state.credits >= ship.cost && state.ships.length < state.dockLimit;
      return `
        <article class="ship">
          <header>
            ${renderShipVisual(ship)}
            <div>
              <h2>${ship.name}</h2>
              <p class="meta">${ship.role}</p>
            </div>
            <span class="tag">${ship.crewMax} crew</span>
          </header>
          <div class="stats-grid shipyard-stats-grid">
            <div class="stat">Cost<strong>${ship.cost}</strong></div>
            <div class="stat">Hull<strong>${ship.hull}</strong></div>
            <div class="stat">Shields<strong>${ship.shields}</strong></div>
            <div class="stat">Energy<strong>${ship.energyMax}</strong></div>
            <div class="stat">Sensors<strong>${ship.sensors}</strong></div>
            <div class="stat">Weapons<strong>${ship.weapons}</strong></div>
          </div>
          <button type="button" data-buy="${ship.id}" ${canBuy ? "" : "disabled"}>Buy Ship</button>
        </article>
      `;
    })
    .join("");
}

function renderHiring() {
  hireSummaryEl.textContent = `${cadetCost} credits per cadet`;
  hireListEl.innerHTML = departments
    .map((department) => `
      <article class="hire-card" style="--dept: ${department.color}">
        <header>
          <div>
            <h2><span class="department-dot"></span>${department.name}</h2>
            <p class="meta">${department.focus}</p>
          </div>
          <span class="tag">Lvl 0</span>
        </header>
        <div class="stats-grid stats-grid-six">
          <div class="stat">Command<strong>${department.skills.command}</strong></div>
          <div class="stat">Eng<strong>${department.skills.engineering}</strong></div>
          <div class="stat">Science<strong>${department.skills.science}</strong></div>
          <div class="stat">Medical<strong>${department.skills.medical}</strong></div>
          <div class="stat">Tactical<strong>${department.skills.tactical}</strong></div>
          <div class="stat">Ops<strong>${department.skills.operations}</strong></div>
        </div>
        <p class="rank-note">Starts with ${crewMaxHp}/${crewMaxHp} HP and 0 missions flown.</p>
        <button type="button" data-hire="${department.id}" ${state.credits >= cadetCost ? "" : "disabled"}>Hire Cadet</button>
      </article>
    `)
    .join("");
}

function sortedCrewMembers() {
  const departmentOrder = new Map(departments.map((department, index) => [department.id, index]));
  return [...state.crew].sort((left, right) => {
    if (crewSortMode === "hp") {
      return left.hp - right.hp || right.xp - left.xp || left.name.localeCompare(right.name);
    }

    if (crewSortMode === "xp") {
      return right.xp - left.xp || right.level - left.level || left.name.localeCompare(right.name);
    }

    return (
      (departmentOrder.get(left.department) ?? 99) - (departmentOrder.get(right.department) ?? 99) ||
      left.name.localeCompare(right.name)
    );
  });
}

function renderCrew() {
  const ship = selectedShip();
  crewSummaryEl.textContent = ship ? `Selected: ${ship.name}` : "Selected: no ship";
  document.querySelectorAll("[data-crew-sort]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.crewSort === crewSortMode);
  });

  if (state.crew.length === 0) {
    crewListEl.innerHTML = `<article class="crew empty-state"><h2>No personnel hired</h2><p class="meta">Hire cadets from the Personnel Office, then assign them to a selected ship.</p></article>`;
    return;
  }

  const crewCards = sortedCrewMembers()
    .map((member) => {
      const assignedShip = state.ships.find((shipItem) => shipItem.id === member.shipId);
      const isAssigned = Boolean(assignedShip);
      const department = departmentFor(member);
      const assignedShipName = assignedShip ? ` - ${escapeHtml(assignedShip.name)}` : "";
      syncRank(member);
      const nextXp = nextXpTarget(member);
      const upgradeActions =
        member.pendingSkillPoints > 0
          ? `
            <div class="upgrade-actions" aria-label="Skill upgrade options">
              ${Object.entries(skillLabels)
                .map(
                  ([skill, label]) =>
                    `<button type="button" data-upgrade-crew="${member.id}" data-upgrade-skill="${skill}">+ ${label}</button>`,
                )
                .join("")}
            </div>
          `
          : "";
      return `
        <article class="crew ${isAssigned ? "assigned" : ""}" style="--dept: ${department.color}">
          <header>
            ${renderCrewPortrait(member)}
            <div>
              <h2><span class="department-dot"></span>${member.name}</h2>
              <p class="meta">${member.rank} (${member.rankCode}) - ${department.name}${assignedShipName}</p>
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
          <div class="crew-actions">
            <button type="button" data-assign="${member.id}" ${!ship || isAssigned ? "disabled" : ""}>Assign</button>
            <button type="button" data-unassign="${member.id}" ${isAssigned ? "" : "disabled"}>Recall</button>
          </div>
          ${upgradeActions}
        </article>
      `;
    })
    .join("");
  const hallCards = state.hallOfFame.length
    ? `
      <article class="crew hall-card">
        <header>
          <div>
            <h2>Hall of Fame</h2>
            <p class="meta">Fallen crew remembered by Lunar Base One.</p>
          </div>
          <span class="tag danger">${state.hallOfFame.length}</span>
        </header>
        <div class="hall-list">
          ${state.hallOfFame
            .slice(0, 8)
            .map(
              (member) => `
                <div class="hall-entry">
                  <strong>${escapeHtml(member.name)}</strong>
                  <span>${member.rank} (${member.rankCode}) - ${member.missions} missions - ${member.date}</span>
                </div>
              `,
            )
            .join("")}
        </div>
      </article>
    `
    : "";
  crewListEl.innerHTML = crewCards + hallCards;
}

function renderMissions() {
  const ship = selectedShip();
  const destination = selectedMission();
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
  const destination = selectedMission();
  const crew = ship ? crewForShip(ship.id) : [];

  renderMissionShipCard(ship);
  if (missionCrewSummaryEl) {
    missionCrewSummaryEl.textContent = ship ? `${crew.length}/${classFor(ship).crewMax} assigned` : "No ship selected";
  }
  if (missionCrewListEl) {
    missionCrewListEl.innerHTML = renderMissionCrewCards(crew, ship);
  }
  if (!missionActionDeckEl) return;

  if (ship?.missionRun) {
    missionActionDeckEl.innerHTML = renderMissionRun(ship);
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
      ${renderMissionSceneArt(destination, { phase: "ready" })}
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

function renderMissionRun(ship) {
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
      ${renderMissionSceneArt(mission, run, enemy)}
      <header>
        ${enemy ? renderEnemyVisual(enemy) : renderMissionVisual(mission)}
        <div>
          <h2><span class="department-dot"></span>${mission.name}</h2>
          <p class="meta">${phaseLabel} - ${mission.text}</p>
        </div>
        <span class="tag warn">${run.phase}</span>
      </header>
      <div class="mission-actions">
        ${
          run.phase === "scan"
            ? `<button type="button" data-mission-action="scan" ${canScan ? "" : "disabled"}>Scan Area</button><button type="button" data-mission-action="abort">Abort Mission</button>`
            : ""
        }
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
      ${
        enemy
          ? `<div class="chance-box enemy-status-card"><div class="chance-head"><span>${enemy.name}</span><strong>${enemy.hullNow}/${enemy.hull} hull</strong></div><div class="chance-grid"><span>Damage</span><strong>${enemy.damage}</strong><span>Difficulty</span><strong>${enemy.difficulty}</strong><span>Salvage</span><strong>${enemy.reward}</strong></div></div>`
          : ""
      }
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

function renderMissionShipCard(ship) {
  if (!ship) {
    missionShipSummaryEl.textContent = "No ship selected";
    missionShipCardEl.innerHTML = `<article class="dock empty-state"><h2>No ship available</h2><p class="meta">Buy a ship on the Base screen to unlock missions.</p></article>`;
    return;
  }

  const shipClass = classFor(ship);
  const crew = crewForShip(ship.id);
  const missingHull = shipClass.hull - ship.hullNow;
  const repairCost = missingHull * repairCostPerHull;
  const missingShields = shipClass.shields - (ship.shieldsNow ?? shipClass.shields);
  const missingEnergy = shipClass.energyMax - (ship.energyNow ?? shipClass.energyMax);
  const rechargeCost = missingEnergy * rechargeCostPerCell;
  const shipName = escapeHtml(ship.name);
  const destination = selectedMission();
  missionShipSummaryEl.textContent = destination ? `Ready for ${destination.name}` : "No destination selected";
  const away = Boolean(ship.missionRun);
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
  return `
    <div class="bar-stat ${tone}" style="--value: ${percent}%">
      <div class="bar-stat-head"><span>${label}</span><strong>${safeCurrent}/${safeMax}</strong></div>
      <div class="bar-track"><span></span></div>
    </div>
  `;
}

function renderMissionCrewCards(crew, ship) {
  if (!ship) {
    return `<article class="crew empty-state"><h2>No ship selected</h2><p class="meta">Select or buy a ship before preparing a mission.</p></article>`;
  }
  if (!crew.length) {
    return `<article class="crew empty-state"><h2>No crew assigned</h2><p class="meta">Assign personnel in Station Ops before launch.</p></article>`;
  }

  return crew
    .map((member) => {
      const department = departmentFor(member);
      const nextXp = nextXpTarget(member);
      return `
        <article class="crew assigned mission-current-crew-card" style="--dept: ${department.color}">
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

function renderMissionCrew(crew) {
  if (!crew.length) {
    return `<div class="mission-crew empty-state"><h2>No crew assigned</h2><p class="meta">Assign personnel in Station Ops before launch.</p></div>`;
  }

  return `
    <div class="mission-crew">
      <div class="mission-crew-head"><span>Current Crew</span><strong>${crew.length}</strong></div>
      <div class="mission-crew-list">
        ${crew
          .map((member) => {
            const department = departmentFor(member);
            const nextXp = nextXpTarget(member);
            return `
              <div class="mission-crew-row" style="--dept: ${department.color}">
                ${renderCrewPortrait(member)}
                <div>
                  <strong><span class="department-dot"></span>${escapeHtml(member.name)}</strong>
                  <span>${member.rankCode} - ${department.name}</span>
                </div>
                <div class="crew-mini-stats">
                  <span class="${hpTone(member)}">HP ${member.hp}/${member.maxHp}</span>
                  <span>XP ${member.xp}/${nextXp}</span>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function missionChance(mission, ship) {
  if (!ship) {
    return { chance: 0, departmentPower: 0, commandSupport: 0, shipPower: 0 };
  }

  const shipClass = classFor(ship);
  const crew = crewForShip(ship.id);
  const departmentPower = crew.reduce((sum, member) => sum + skillValue(member, mission.need), 0);
  const commandPower = crew.reduce((sum, member) => sum + skillValue(member, "command"), 0);
  const commandSupport = Math.floor(commandPower / 3);
  const shipPower = shipClass[mission.ship] || 0;
  const chance = Math.max(18, Math.min(92, 40 + departmentPower + commandSupport + shipPower - mission.risk));

  return { chance, departmentPower, commandSupport, shipPower };
}

function renderLog() {
  logEl.innerHTML = state.log
    .map((entry, index) => `<div class="log-entry ${index === 0 ? "latest" : ""}">${escapeHtml(entry)}</div>`)
    .join("");
}

render();
