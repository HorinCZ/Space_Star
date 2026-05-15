(function () {
  const originalRenderCrew = window.renderCrew;
  if (typeof originalRenderCrew !== "function") return;

  window.renderCrew = function renderCrewWithRename() {
    originalRenderCrew();
    addCrewRenameRows();
  };

  function addCrewRenameRows() {
    const list = document.querySelector("#crewList");
    if (!list || typeof state === "undefined" || !Array.isArray(state.crew) || state.crew.length === 0) return;
    const cards = [...list.querySelectorAll(":scope > article.crew:not(.hall-card)")];
    const members = sortedCrewMembers();

    cards.forEach((card, index) => {
      const member = members[index];
      if (!member || card.querySelector("[data-crew-rename-row]")) return;
      const header = card.querySelector("header");
      if (!header) return;
      const row = document.createElement("div");
      row.className = "rename-row crew-rename-row";
      row.dataset.crewRenameRow = member.id;
      row.innerHTML = `
        <input type="text" data-crew-rename-input="${member.id}" value="${escapeHtml(member.name)}" maxlength="32" aria-label="Crew name" />
        <button type="button" data-rename-crew="${member.id}">Rename</button>
      `;
      header.insertAdjacentElement("afterend", row);
    });
  }

  function renameCrew(crewId) {
    const member = state.crew.find((item) => item.id === crewId);
    if (!member) return;
    const input = document.querySelector(`[data-crew-rename-input="${crewId}"]`);
    const nextName = input ? input.value : window.prompt("Enter new crew name:", member.name);
    if (nextName === null) return;
    const cleanName = nextName.trim().replace(/\s+/g, " ").slice(0, 32);
    if (!cleanName) return addLog("Crew rename cancelled. A crew member needs a name.");
    if (cleanName === member.name) return;
    const oldName = member.name;
    member.name = cleanName;
    playSound("confirm");
    addLog(`${oldName} renamed to ${member.name}.`);
    persist();
    render();
  }

  document.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest("button[data-rename-crew]");
      if (!button || button.disabled) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      renameCrew(button.dataset.renameCrew);
    },
    true,
  );

  addCrewRenameRows();
})();
