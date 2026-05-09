(function () {
  function renameFromAddon(shipId) {
    const ship = state.ships.find((item) => item.id === shipId);
    if (!ship) return;

    const nextName = prompt("Enter new ship name:", ship.name);
    if (nextName === null) return;

    const cleanName = nextName.trim().replace(/\s+/g, " ").slice(0, 32);
    if (!cleanName) return addLog("Ship rename cancelled. A ship needs a name.");
    if (cleanName === ship.name) return;

    const oldName = ship.name;
    ship.name = cleanName;
    addLog(`${oldName} renamed to ${ship.name}.`);
    persist();
    render();
  }

  function addRenameButtons() {
    document.querySelectorAll("#docks .dock").forEach((dock, index) => {
      const ship = state.ships[index];
      const actions = dock.querySelector(".crew-actions");
      if (!ship || !actions || actions.querySelector("[data-rename], [data-addon-rename]")) return;

      const button = document.createElement("button");
      button.type = "button";
      button.dataset.addonRename = ship.id;
      button.textContent = "Rename";
      actions.insertBefore(button, actions.children[1] || null);
    });

    const missionActions = document.querySelector("#missionShipCard .crew-actions");
    const missionShip = selectedShip();
    if (missionActions && missionShip && !missionActions.querySelector("[data-rename], [data-addon-rename]")) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.addonRename = missionShip.id;
      button.textContent = "Rename";
      missionActions.prepend(button);
    }
  }

  document.addEventListener("click", (event) => {
    const shipId = event.target.dataset.addonRename;
    if (shipId) renameFromAddon(shipId);
  });

  const originalRender = render;
  render = function () {
    originalRender();
    addRenameButtons();
  };

  addRenameButtons();
})();
