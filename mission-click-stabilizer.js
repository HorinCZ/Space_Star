(function () {
  let overlay = null;
  let releaseTimer = 0;

  function activeConsole() {
    return document.querySelector("#expeditionView.is-active .expedition-console");
  }

  function keepExpeditionView() {
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("is-active"));
    document.querySelector("#expeditionView")?.classList.add("is-active");
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === "expedition");
    });
  }

  function freezeMissionWindow() {
    const consoleEl = activeConsole();
    if (!consoleEl) return;
    overlay?.remove();
    overlay = document.createElement("div");
    overlay.className = "mission-freeze-overlay mission-click-stabilizer-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = consoleEl.innerHTML;
    consoleEl.append(overlay);
    document.body.classList.add("is-mission-step-refresh");
  }

  function releaseMissionWindow() {
    if (!overlay) {
      document.body.classList.remove("is-mission-step-refresh");
      return;
    }
    const current = overlay;
    overlay = null;
    current.classList.add("is-releasing");
    window.setTimeout(() => current.remove(), 420);
    window.setTimeout(() => document.body.classList.remove("is-mission-step-refresh"), 520);
  }

  function scheduleRelease() {
    window.clearTimeout(releaseTimer);
    keepExpeditionView();
    window.setTimeout(keepExpeditionView, 60);
    window.setTimeout(keepExpeditionView, 180);
    window.setTimeout(keepExpeditionView, 420);
    window.setTimeout(keepExpeditionView, 760);
    releaseTimer = window.setTimeout(releaseMissionWindow, 900);
  }

  document.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest("button[data-mission-action]");
      if (!button || button.disabled || !document.querySelector("#expeditionView.is-active")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      freezeMissionWindow();
      handleMissionAction(button.dataset.missionAction, button.dataset.objectiveMode || "standard", button.dataset.missionCrew);
      scheduleRelease();
    },
    true,
  );
})();
