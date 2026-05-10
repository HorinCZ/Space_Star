(function () {
  const saveKey = "lunar-fleet-command-save-v2";
  const manualPrefix = `${saveKey}-manual-slot-`;
  const slotCount = 3;
  const calendarStart = { day: 1, month: 5, year: 2326 };
  const departmentOrder = ["command", "engineering", "science", "medical", "tactical", "operations"];
  let crewSortMode = "department";
  let applyingCrewPresentation = false;

  function parseSave(raw) {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      const saveState = parsed?.state || parsed;
      return saveState?.version === 2 && Array.isArray(saveState.crew) && Array.isArray(saveState.ships)
        ? saveState
        : null;
    } catch {
      try {
        const parsed = JSON.parse(decodeURIComponent(escape(atob(raw.trim()))));
        return parsed?.version === 2 && Array.isArray(parsed.crew) && Array.isArray(parsed.ships) ? parsed : null;
      } catch {
        return null;
      }
    }
  }

  function formatCalendarDate(calendarDay = 0) {
    let day = calendarStart.day + calendarDay;
    let month = calendarStart.month;
    let year = calendarStart.year;
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

  function summarizeSave(save) {
    if (!save) {
      return { title: "No save found", details: "Browser autosave is empty." };
    }
    const assigned = save.crew.filter((member) => member.shipId).length;
    const activeMissions = save.ships.filter((ship) => ship.missionRun).length;
    return {
      title: `${save.credits || 0} credits - ${formatCalendarDate(save.calendarDay || 0)}`,
      details: `${save.ships.length}/${save.dockLimit || 0} docks, ${assigned}/${save.crew.length} crew assigned, ${activeMissions} active mission${activeMissions === 1 ? "" : "s"}`,
    };
  }

  function savePackage(save) {
    return {
      game: "Lunar Fleet Command",
      type: "save",
      saveVersion: save.version,
      exportedAt: new Date().toISOString(),
      summary: summarizeSave(save),
      state: save,
    };
  }

  function readManualSlot(slot) {
    return parseSave(localStorage.getItem(`${manualPrefix}${slot}`));
  }

  function showSaveView() {
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("is-active"));
    document.querySelector("#saveView")?.classList.add("is-active");
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === "save");
    });
    renderSavePanel();
  }

  function hideSaveViewLater() {
    window.setTimeout(() => {
      const saveView = document.querySelector("#saveView");
      if (saveView && !document.querySelector('[data-view="save"].is-active')) saveView.classList.remove("is-active");
    }, 0);
  }

  function detail(label, value) {
    return `<div class="save-detail"><span>${label}</span><strong>${value}</strong></div>`;
  }

  function renderSavePanel() {
    const current = parseSave(localStorage.getItem(saveKey));
    const summary = summarizeSave(current);
    const saveSummary = document.querySelector("#saveSummary");
    const autosaveDetails = document.querySelector("#autosaveDetails");
    const manualSlots = document.querySelector("#manualSaveSlots");
    if (saveSummary) saveSummary.textContent = "Autosave plus 3 manual slots";
    if (autosaveDetails) {
      autosaveDetails.innerHTML =
        detail("Current save", escapeHtml(summary.title)) +
        detail("Fleet state", escapeHtml(summary.details)) +
        detail("Storage", "Browser autosave");
    }
    if (!manualSlots) return;
    manualSlots.innerHTML = Array.from({ length: slotCount }, (_, index) => {
      const slot = index + 1;
      const slotSave = readManualSlot(slot);
      const slotSummary = summarizeSave(slotSave);
      return `
        <article class="save-card ${slotSave ? "" : "empty-save"}">
          <header>
            <div>
              <h2>Manual Save ${slot}</h2>
              <p class="meta">${slotSave ? "Stored in this browser." : "Empty slot ready for a backup."}</p>
            </div>
            <span class="tag ${slotSave ? "ok" : "warn"}">${slotSave ? "saved" : "empty"}</span>
          </header>
          <div class="save-details">
            ${slotSave ? detail("Snapshot", escapeHtml(slotSummary.title)) + detail("Fleet state", escapeHtml(slotSummary.details)) : detail("Status", "No save stored")}
          </div>
          <div class="save-actions">
            <button type="button" data-save-slot="${slot}">Save</button>
            <button type="button" data-load-slot="${slot}" ${slotSave ? "" : "disabled"}>Load</button>
            <button type="button" data-delete-slot="${slot}" ${slotSave ? "" : "disabled"}>Delete</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function exportCurrentSave() {
    const save = parseSave(localStorage.getItem(saveKey));
    if (!save) return;
    const blob = new Blob([JSON.stringify(savePackage(save), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lunar-fleet-command-save-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function loadSave(save) {
    localStorage.setItem(saveKey, JSON.stringify(save));
    window.location.reload();
  }

  function applyCrewPresentation() {
    if (applyingCrewPresentation) return;
    const crewList = document.querySelector("#crewList");
    const save = parseSave(localStorage.getItem(saveKey));
    if (!crewList || !save) return;
    applyingCrewPresentation = true;

    document.querySelectorAll("[data-crew-sort]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.crewSort === crewSortMode);
    });

    const byName = new Map(save.crew.map((member) => [member.name, member]));
    const cards = Array.from(crewList.querySelectorAll(".crew:not(.hall-card)"));
    const hallCards = Array.from(crewList.querySelectorAll(".hall-card"));

    cards.forEach((card) => {
      Array.from(card.querySelectorAll(".tag")).forEach((tag) => {
        if (tag.textContent.trim().startsWith("Lvl ")) tag.className = "xp-pill";
      });
    });

    const sortedCards = cards.sort((leftCard, rightCard) => compareCrewCards(leftCard, rightCard, byName));
    const currentOrder = cards.map((card) => crewNameFromCard(card)).join("|");
    const nextOrder = sortedCards.map((card) => crewNameFromCard(card)).join("|");
    if (currentOrder !== nextOrder) {
      sortedCards.forEach((card) => crewList.appendChild(card));
      hallCards.forEach((card) => crewList.appendChild(card));
    }

    applyingCrewPresentation = false;
  }

  function crewNameFromCard(card) {
    return card.querySelector("h2")?.textContent.trim() || "";
  }

  function compareCrewCards(leftCard, rightCard, byName) {
    const left = byName.get(crewNameFromCard(leftCard));
    const right = byName.get(crewNameFromCard(rightCard));
    if (!left || !right) return crewNameFromCard(leftCard).localeCompare(crewNameFromCard(rightCard));

    if (crewSortMode === "hp") {
      return left.hp - right.hp || right.xp - left.xp || left.name.localeCompare(right.name);
    }
    if (crewSortMode === "xp") {
      return right.xp - left.xp || right.level - left.level || left.name.localeCompare(right.name);
    }
    return (
      departmentOrder.indexOf(left.department) - departmentOrder.indexOf(right.department) ||
      left.name.localeCompare(right.name)
    );
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target.closest("button");
      if (!target) return;

      if (target.dataset.view === "save") {
        event.preventDefault();
        event.stopImmediatePropagation();
        showSaveView();
        return;
      }
      if (target.dataset.view) hideSaveViewLater();

      if (target.id === "exportBtn") {
        event.preventDefault();
        event.stopImmediatePropagation();
        exportCurrentSave();
        renderSavePanel();
        return;
      }
      if (target.id === "importBtn") {
        event.preventDefault();
        event.stopImmediatePropagation();
        document.querySelector("#importFile")?.click();
        return;
      }
      if (target.dataset.saveSlot) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const save = parseSave(localStorage.getItem(saveKey));
        if (save) localStorage.setItem(`${manualPrefix}${target.dataset.saveSlot}`, JSON.stringify(savePackage(save)));
        renderSavePanel();
        return;
      }
      if (target.dataset.loadSlot) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const save = readManualSlot(target.dataset.loadSlot);
        if (save && confirm(`Load manual slot ${target.dataset.loadSlot}?\n\n${summarizeSave(save).title}`)) loadSave(save);
        return;
      }
      if (target.dataset.deleteSlot) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (confirm(`Delete manual save slot ${target.dataset.deleteSlot}?`)) {
          localStorage.removeItem(`${manualPrefix}${target.dataset.deleteSlot}`);
          renderSavePanel();
        }
        return;
      }
      if (target.dataset.crewSort) {
        event.preventDefault();
        event.stopImmediatePropagation();
        crewSortMode = target.dataset.crewSort;
        applyCrewPresentation();
      }
    },
    true,
  );

  document.querySelector("#importFile")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const save = parseSave(await file.text());
    event.target.value = "";
    if (save && confirm(`Load imported save?\n\n${summarizeSave(save).title}`)) loadSave(save);
  });

  const crewList = document.querySelector("#crewList");
  if (crewList) {
    new MutationObserver(applyCrewPresentation).observe(crewList, { childList: true, subtree: true });
  }
  window.setTimeout(() => {
    renderSavePanel();
    applyCrewPresentation();
  }, 0);
})();
