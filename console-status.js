(() => {
  const selectedShipLabel = document.querySelector("#sideSelectedShip");
  const statusHull = document.querySelector("#statusHull");
  const statusEnergy = document.querySelector("#statusEnergy");
  const docks = document.querySelector("#docks");
  const resources = document.querySelector("#resources");

  function selectedDock() {
    if (!docks) return null;
    const dockList = Array.from(docks.querySelectorAll(".dock"));
    return dockList.find((dock) => dock.querySelector(".tag.ok")) || dockList[0] || null;
  }

  function statValue(dock, label) {
    if (!dock) return "--";
    const stat = Array.from(dock.querySelectorAll(".stat")).find((item) =>
      item.textContent.trim().toLowerCase().startsWith(label),
    );
    return stat?.querySelector("strong")?.textContent.trim() || "--";
  }

  function energyValue(dock) {
    if (!dock) return "--";
    return dock.querySelector(".battery-head strong")?.textContent.trim() || "--";
  }

  function updateConsoleStatus() {
    const dock = selectedDock();
    if (selectedShipLabel) {
      selectedShipLabel.textContent = dock?.querySelector("h2")?.textContent.trim() || "No vessel";
    }
    if (statusHull) statusHull.textContent = statValue(dock, "hull");
    if (statusEnergy) statusEnergy.textContent = energyValue(dock);
  }

  const observer = new MutationObserver(updateConsoleStatus);
  if (docks) observer.observe(docks, { childList: true, subtree: true, characterData: true });
  if (resources) observer.observe(resources, { childList: true, subtree: true, characterData: true });
  updateConsoleStatus();
})();
