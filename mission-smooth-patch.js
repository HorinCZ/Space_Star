(function () {
  function keepExpeditionView() {
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("is-active"));
    document.querySelector("#expeditionView")?.classList.add("is-active");
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === "expedition");
    });
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button?.dataset.expeditionLaunch && !button?.dataset.missionAction) return;
    requestAnimationFrame(keepExpeditionView);
    window.setTimeout(keepExpeditionView, 40);
    window.setTimeout(keepExpeditionView, 220);
    window.setTimeout(keepExpeditionView, 720);
  }, true);
})();
