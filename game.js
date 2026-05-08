const saveKey = "lunar-fleet-command-save-v1";

const shipClasses = [
  {
    id: "aster-5",
    name: "Aster-5 Scout",
    role: "maly pruzkumnik",
    crewMax: 5,
    cost: 500,
    hull: 7,
    sensors: 8,
    weapons: 3,
    range: 5,
  },
  {
    id: "vega-7",
    name: "Vega-7 Cutter",
    role: "rychla hlidkova lod",
    crewMax: 7,
    cost: 850,
    hull: 10,
    sensors: 7,
    weapons: 6,
    range: 6,
  },
  {
    id: "orion-9",
    name: "Orion-9 Surveyor",
    role: "vedecka expedice",
    crewMax: 9,
    cost: 1300,
    hull: 12,
    sensors: 11,
    weapons: 4,
    range: 8,
  },
  {
    id: "helios-12",
    name: "Helios-12 Frigate",
    role: "tezsi eskort",
    crewMax: 12,
    cost: 2100,
    hull: 18,
    sensors: 8,
    weapons: 12,
    range: 8,
  },
  {
    id: "atlas-16",
    name: "Atlas-16 Cruiser",
    role: "dlouhy dosah",
    crewMax: 16,
    cost: 3600,
    hull: 26,
    sensors: 12,
    weapons: 16,
    range: 12,
  },
];

const startingCrew = [
  ["Mara Voss", "kapitan", 8, 4, 5, 4],
  ["Jonas Kade", "prvni dustojnik", 7, 5, 4, 5],
  ["Ilya Ren", "pilot", 4, 5, 3, 8],
  ["Tomas Vale", "inzenyr", 3, 8, 4, 4],
  ["Nika Sol", "vedecky dustojnik", 4, 4, 9, 3],
  ["Ari Chen", "lekar", 4, 5, 7, 3],
  ["Rami Ko", "taktik", 5, 4, 3, 7],
  ["Elena Park", "technik", 3, 7, 4, 4],
  ["Milo Dax", "kadet", 3, 3, 3, 4],
  ["Sara Wynn", "kadet", 3, 4, 4, 3],
];

const missions = [
  {
    id: "relay",
    name: "Oprava relay stanice",
    risk: 18,
    reward: 190,
    need: "tech",
    text: "Porucha komunikacni site na okraji lunarniho prostoru.",
  },
  {
    id: "anomaly",
    name: "Mapovani anomalie",
    risk: 28,
    reward: 280,
    need: "science",
    text: "Nestabilni signal slibuje data, ale muze poskodit lod.",
  },
  {
    id: "escort",
    name: "Eskorta konvoje",
    risk: 36,
    reward: 360,
    need: "combat",
    text: "Obchodni transport hlasi nezname stiny za orbitou Marsu.",
  },
];

let state = loadGame();

const resourcesEl = document.querySelector("#resources");
const docksEl = document.querySelector("#docks");
const shipyardEl = document.querySelector("#shipyard");
const crewListEl = document.querySelector("#crewList");
const crewSummaryEl = document.querySelector("#crewSummary");
const missionsEl = document.querySelector("#missions");
const missionSummaryEl = document.querySelector("#missionSummary");
const logEl = document.querySelector("#log");
const saveBoxEl = document.querySelector("#saveBox");

document.querySelector("#resetBtn").addEventListener("click", () => {
  if (confirm("Zacit znovu od Lunar Base 1?")) {
    state = createNewGame();
    persist();
    render();
  }
});

document.querySelector("#exportBtn").addEventListener("click", () => {
  saveBoxEl.value = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  saveBoxEl.select();
});

document.querySelector("#importBtn").addEventListener("click", () => {
  try {
    const imported = JSON.parse(decodeURIComponent(escape(atob(saveBoxEl.value.trim()))));
    if (!imported || !Array.isArray(imported.crew) || !Array.isArray(imported.ships)) throw new Error();
    state = imported;
    log("Save importovan.");
    persist();
    render();
  } catch {
    log("Import se nepovedl. Save kod je neplatny.");
    render();
  }
});

document.addEventListener("click", (event) => {
  const buyId = event.target.dataset.buy;
  const selectId = event.target.dataset.select;
  const assignId = event.target.dataset.assign;
  const unassignId = event.target.dataset.unassign;
  const missionId = event.target.dataset.mission;

  if (buyId) buyShip(buyId);
  if (selectId) selectShip(selectId);
  if (assignId) assignCrew(assignId);
  if (unassignId) unassignCrew(unassignId);
  if (missionId) launchMission(missionId);
});

function createNewGame() {
  return {
    credits: 1000,
    dockLimit: 2,
    nextShipId: 1,
    selectedShipId: null,
    ships: [],
    crew: startingCrew.map(([name, rank, command, tech, science, combat], index) => ({
      id: `crew-${index + 1}`,
      name,
      rank,
      command,
      tech,
      science,
      combat,
      xp: 0,
      shipId: null,
    })),
    log: [
      "Lunar Base 1 je aktivni. Rozpocet staci presne na dve lode tridy Aster-5.",
    ],
  };
}

function loadGame() {
  const raw = localStorage.getItem(saveKey);
  if (!raw) return createNewGame();
  try {
    return JSON.parse(raw);
  } catch {
    return createNewGame();
  }
}

function persist() {
  localStorage.setItem(saveKey, JSON.stringify(state));
}

function buyShip(classId) {
  const shipClass = shipClasses.find((item) => item.id === classId);
  if (!shipClass) return;
  if (state.ships.length >= state.dockLimit) return log("Oba doky jsou obsazene.");
  if (state.credits < shipClass.cost) return log("Na tuhle lod nejsou kredity.");

  const ship = {
    id: `ship-${state.nextShipId++}`,
    classId,
    name: `${shipClass.name} ${String(state.nextShipId - 1).padStart(2, "0")}`,
    hullNow: shipClass.hull,
    missions: 0,
  };
  state.credits -= shipClass.cost;
  state.ships.push(ship);
  state.selectedShipId = ship.id;
  log(`${ship.name} zakoupena a presunuta do doku.`);
  persist();
  render();
}

function selectShip(shipId) {
  if (!state.ships.some((ship) => ship.id === shipId)) return;
  state.selectedShipId = shipId;
  persist();
  render();
}

function assignCrew(crewId) {
  const ship = selectedShip();
  const crew = state.crew.find((member) => member.id === crewId);
  if (!ship || !crew || crew.shipId) return;

  const shipClass = classFor(ship);
  const assigned = crewForShip(ship.id);
  if (assigned.length >= shipClass.crewMax) return log(`${ship.name} nema volne misto.`);

  crew.shipId = ship.id;
  log(`${crew.name} prirazen(a) na ${ship.name}.`);
  persist();
  render();
}

function unassignCrew(crewId) {
  const crew = state.crew.find((member) => member.id === crewId);
  if (!crew) return;
  crew.shipId = null;
  persist();
  render();
}

function launchMission(missionId) {
  const ship = selectedShip();
  const mission = missions.find((item) => item.id === missionId);
  if (!ship || !mission) return;

  const crew = crewForShip(ship.id);
  if (crew.length === 0) return log("Lod nemuze odletet bez posadky.");

  const shipClass = classFor(ship);
  const crewPower = crew.reduce((sum, member) => sum + member[mission.need], 0);
  const command = crew.reduce((sum, member) => sum + member.command, 0);
  const shipPower = mission.need === "combat" ? shipClass.weapons : shipClass.sensors;
  const chance = Math.max(18, Math.min(92, 42 + crewPower + Math.floor(command / 3) + shipPower - mission.risk));
  const roll = Math.floor(Math.random() * 100) + 1;

  ship.missions++;
  if (roll <= chance) {
    const reward = mission.reward + Math.floor(Math.random() * 80);
    state.credits += reward;
    crew.forEach((member) => (member.xp += 1));
    log(`${ship.name}: mise "${mission.name}" uspesna. Ziskano ${reward} kreditu.`);
  } else {
    const damage = 1 + Math.floor(Math.random() * 3);
    ship.hullNow = Math.max(1, ship.hullNow - damage);
    log(`${ship.name}: mise "${mission.name}" selhala. Trup poskozen o ${damage}.`);
  }

  persist();
  render();
}

function selectedShip() {
  return state.ships.find((ship) => ship.id === state.selectedShipId) || state.ships[0] || null;
}

function classFor(ship) {
  return shipClasses.find((item) => item.id === ship.classId);
}

function crewForShip(shipId) {
  return state.crew.filter((member) => member.shipId === shipId);
}

function log(message) {
  state.log.unshift(message);
  state.log = state.log.slice(0, 8);
}

function render() {
  const assigned = state.crew.filter((member) => member.shipId).length;
  resourcesEl.innerHTML = `
    <div class="resource">Kredity<strong>${state.credits}</strong></div>
    <div class="resource">Doky<strong>${state.ships.length}/${state.dockLimit}</strong></div>
    <div class="resource">Posadka<strong>${assigned}/${state.crew.length}</strong></div>
  `;

  renderDocks();
  renderShipyard();
  renderCrew();
  renderMissions();
  renderLog();
}

function renderDocks() {
  const slots = Array.from({ length: state.dockLimit }, (_, index) => state.ships[index] || null);
  docksEl.innerHTML = slots
    .map((ship, index) => {
      if (!ship) {
        return `<article class="dock"><header><h2>Dok ${index + 1}</h2><span class="tag warn">volny</span></header><p class="meta">Pripraven pro novou lod ze shipyardu.</p></article>`;
      }
      const shipClass = classFor(ship);
      const crew = crewForShip(ship.id);
      const selected = ship.id === state.selectedShipId ? "ok" : "";
      return `
        <article class="dock">
          <header>
            <div>
              <h2>${ship.name}</h2>
              <p class="meta">${shipClass.role}</p>
            </div>
            <span class="tag ${selected}">${crew.length}/${shipClass.crewMax}</span>
          </header>
          <div class="stats-grid">
            <div class="stat">Trup<strong>${ship.hullNow}/${shipClass.hull}</strong></div>
            <div class="stat">Senzory<strong>${shipClass.sensors}</strong></div>
            <div class="stat">Zbrane<strong>${shipClass.weapons}</strong></div>
            <div class="stat">Mise<strong>${ship.missions}</strong></div>
          </div>
          <button type="button" data-select="${ship.id}">Vybrat lod</button>
        </article>
      `;
    })
    .join("");
}

function renderShipyard() {
  shipyardEl.innerHTML = shipClasses
    .map((ship) => {
      const canBuy = state.credits >= ship.cost && state.ships.length < state.dockLimit;
      return `
        <article class="ship">
          <header>
            <div>
              <h2>${ship.name}</h2>
              <p class="meta">${ship.role}</p>
            </div>
            <span class="tag">${ship.crewMax} osob</span>
          </header>
          <div class="stats-grid">
            <div class="stat">Cena<strong>${ship.cost}</strong></div>
            <div class="stat">Trup<strong>${ship.hull}</strong></div>
            <div class="stat">Senzory<strong>${ship.sensors}</strong></div>
            <div class="stat">Zbrane<strong>${ship.weapons}</strong></div>
          </div>
          <button type="button" data-buy="${ship.id}" ${canBuy ? "" : "disabled"}>Koupit</button>
        </article>
      `;
    })
    .join("");
}

function renderCrew() {
  const ship = selectedShip();
  const selectedName = ship ? ship.name : "zadna lod";
  crewSummaryEl.textContent = `Vybrano: ${selectedName}`;

  crewListEl.innerHTML = state.crew
    .map((member) => {
      const assignedShip = state.ships.find((shipItem) => shipItem.id === member.shipId);
      const isAssigned = Boolean(assignedShip);
      return `
        <article class="crew ${isAssigned ? "assigned" : ""}">
          <header>
            <div>
              <h2>${member.name}</h2>
              <p class="meta">${member.rank}${assignedShip ? ` - ${assignedShip.name}` : ""}</p>
            </div>
            <span class="tag ${isAssigned ? "ok" : ""}">XP ${member.xp}</span>
          </header>
          <div class="stats-grid">
            <div class="stat">Veleni<strong>${member.command}</strong></div>
            <div class="stat">Tech<strong>${member.tech}</strong></div>
            <div class="stat">Veda<strong>${member.science}</strong></div>
            <div class="stat">Boj<strong>${member.combat}</strong></div>
          </div>
          <div class="crew-actions">
            <button type="button" data-assign="${member.id}" ${!ship || isAssigned ? "disabled" : ""}>Priradit</button>
            <button type="button" data-unassign="${member.id}" ${isAssigned ? "" : "disabled"}>Odvolat</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderMissions() {
  const ship = selectedShip();
  missionSummaryEl.textContent = ship ? ship.name : "nejdriv kup lod";

  missionsEl.innerHTML = missions
    .map((mission) => `
      <article class="mission">
        <header>
          <div>
            <h2>${mission.name}</h2>
            <p class="meta">${mission.text}</p>
          </div>
          <span class="tag warn">risk ${mission.risk}</span>
        </header>
        <div class="stats-grid">
          <div class="stat">Odmena<strong>${mission.reward}</strong></div>
          <div class="stat">Test<strong>${mission.need}</strong></div>
          <div class="stat">Lod<strong>${ship ? crewForShip(ship.id).length : 0}</strong></div>
          <div class="stat">Stav<strong>${ship ? classFor(ship).hull : "-"}</strong></div>
        </div>
        <button type="button" data-mission="${mission.id}" ${ship ? "" : "disabled"}>Vyslat</button>
      </article>
    `)
    .join("");
}

function renderLog() {
  logEl.innerHTML = state.log.map((entry) => `<div class="log-entry">${entry}</div>`).join("");
}

render();
