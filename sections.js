(() => {
  const calendarKey = "lunar-fleet-calendar-day";
  const start = { day: 1, month: 5, year: 2326 };
  const viewMap = {
    base: "#baseView",
    shipyard: "#shipyardView",
    personnel: "#personnelView",
    missions: "#missionsView",
  };

  function calendarDay() {
    return Number(localStorage.getItem(calendarKey) || "0");
  }

  function setCalendarDay(value) {
    localStorage.setItem(calendarKey, String(Math.max(0, value)));
  }

  function currentDate() {
    let day = start.day + calendarDay();
    let month = start.month;
    let year = start.year;

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

  function updateCalendarHud() {
    const resources = document.querySelector("#resources");
    if (!resources) return;
    const date = currentDate();
    let stardate = Array.from(resources.querySelectorAll(".resource")).find((item) =>
      item.textContent.toLowerCase().includes("stardate"),
    );
    if (!stardate) {
      resources.insertAdjacentHTML("afterbegin", '<div class="resource">Stardate<strong></strong></div>');
      stardate = resources.querySelector(".resource");
    }
    const value = stardate.querySelector("strong");
    if (value && value.textContent !== date) value.textContent = date;
  }

  function showView(viewName) {
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("is-active"));
    const view = document.querySelector(viewMap[viewName] || viewMap.base);
    view?.classList.add("is-active");
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === viewName);
    });
  }

  document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      window.setTimeout(() => showView(viewButton.dataset.view), 0);
      return;
    }

    const missionButton = event.target.closest("button[data-mission]:not(:disabled)");
    if (missionButton) {
      setCalendarDay(calendarDay() + 1);
      window.setTimeout(updateCalendarHud, 0);
    }
  });

  const resources = document.querySelector("#resources");
  if (resources) {
    new MutationObserver(updateCalendarHud).observe(resources, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  updateCalendarHud();
  showView(document.querySelector("[data-view].is-active")?.dataset.view || "base");
})();
