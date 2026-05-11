(function () {
  let missionScrollY = 0;
  let quietTimer = 0;

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
    if (!button?.dataset.expeditionLaunch && !button?.dataset.missionAction) return;
    missionScrollY = window.scrollY;
    startQuietMissionRefresh();
    requestAnimationFrame(keepExpeditionView);
    window.setTimeout(keepExpeditionView, 40);
    window.setTimeout(keepExpeditionView, 220);
    window.setTimeout(keepExpeditionView, 720);
  }, true);
})();
