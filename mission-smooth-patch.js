(function () {
  let missionScrollY = 0;

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
    requestAnimationFrame(keepExpeditionView);
    window.setTimeout(keepExpeditionView, 40);
    window.setTimeout(keepExpeditionView, 220);
    window.setTimeout(keepExpeditionView, 720);
  }, true);
})();
