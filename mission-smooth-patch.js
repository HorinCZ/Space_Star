(function () {
  const saveKey = "lunar-fleet-command-save-v2";
  const destinationKey = "lunar-fleet-command-destination";
  let missionScrollY = 0;
  let quietTimer = 0;
  let freezeTimer = 0;
  let freezeOverlay = null;

  function installMissionFreezeStyles() {
    if (document.querySelector("#missionFreezeStyles")) return;
    const styles = document.createElement("style");
    styles.id = "missionFreezeStyles";
    styles.textContent = `
      .expedition-console {
        position: relative;
      }

      .mission-freeze-overlay {
        position: absolute;
        inset: 12px;
        z-index: 5;
        display: grid;
        gap: 12px;
        grid-template-rows: auto auto auto;
        pointer-events: none;
        background: var(--panel);
        opacity: 1;
        transition: opacity 160ms ease;
      }

      .mission-freeze-overlay.is-releasing {
        opacity: 0;
      }

      .mission-freeze-overlay > #missionActionDeck {
        order: 0;
      }

      .mission-freeze-overlay > #missionShipCard {
        order: 1;
        padding: 0;
      }

      .mission-freeze-overlay > .mission-crew-panel {
        order: 2;
      }
    `;
    document.head.append(styles);
  }

  function syncDestinationFromSave() {
    try {
      const state = JSON.parse(localStorage.getItem(saveKey) || "{}");
      if (state?.selectedMissionId) {
        localStorage.setItem(destinationKey, state.selectedMissionId);
      }
    } catch {
      // Old or broken save data should not block the mission window.
    }
  }

  function releaseMissionFreeze() {
    if (!freezeOverlay) return;
    const overlay = freezeOverlay;
    freezeOverlay = null;
    overlay.classList.add("is-releasing");
    window.setTimeout(() => overlay.remove(), 180);
  }

  function freezeMissionWindow() {
    const consoleEl = document.querySelector("#expeditionView.is-active .expedition-console");
    if (!consoleEl) return;

    releaseMissionFreeze();
    freezeOverlay = document.createElement("div");
    freezeOverlay.className = "mission-freeze-overlay";
    freezeOverlay.setAttribute("aria-hidden", "true");
    freezeOverlay.innerHTML = consoleEl.innerHTML;
    consoleEl.append(freezeOverlay);

    window.clearTimeout(freezeTimer);
    freezeTimer = window.setTimeout(releaseMissionFreeze, 560);
  }

  function startQuietMissionRefresh() {
    document.body.classList.add("is-mission-step-refresh");
    window.clearTimeout(quietTimer);
    quietTimer = window.setTimeout(() => {
      document.body.classList.remove("is-mission-step-refresh");
    }, 900);
  }

  function restoreMissionScroll() {
    if (!document.querySelector("#expeditionView.is-active")) return;
    window.scrollTo(window.scrollX, missionScrollY);
  }

  function keepExpeditionView() {
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("is-active"));
    document.querySelector("#expeditionView")?.classList.add("is-active");
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === "expedition");
    });
    restoreMissionScroll();
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button?.dataset.selectMission) {
      window.setTimeout(syncDestinationFromSave, 0);
      window.setTimeout(syncDestinationFromSave, 60);
      return;
    }
    if (!button?.dataset.expeditionLaunch && !button?.dataset.missionAction) return;
    missionScrollY = window.scrollY;
    syncDestinationFromSave();
    startQuietMissionRefresh();
    freezeMissionWindow();
    requestAnimationFrame(keepExpeditionView);
    window.setTimeout(keepExpeditionView, 40);
    window.setTimeout(keepExpeditionView, 220);
    window.setTimeout(keepExpeditionView, 720);
  }, true);

  installMissionFreezeStyles();
  syncDestinationFromSave();
})();
