(() => {
  const toastStack = document.querySelector("#toastStack");
  const resources = document.querySelector("#resources");
  const log = document.querySelector("#log");

  function flashButton(button) {
    button.classList.remove("is-confirming");
    void button.offsetWidth;
    button.classList.add("is-confirming");
    window.setTimeout(() => button.classList.remove("is-confirming"), 420);
  }

  function showToast(message) {
    if (!toastStack || !message) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastStack.prepend(toast);
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    window.setTimeout(() => {
      toast.classList.remove("is-visible");
      window.setTimeout(() => toast.remove(), 220);
    }, 2400);
    Array.from(toastStack.children).slice(3).forEach((item) => item.remove());
  }

  function markLatestLog() {
    if (!log) return;
    log.querySelectorAll(".latest").forEach((entry) => entry.classList.remove("latest"));
    log.firstElementChild?.classList.add("latest");
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button:not(:disabled)");
    if (button) flashButton(button);
  }, true);

  if (typeof window.addLog === "function") {
    const originalAddLog = window.addLog;
    window.addLog = function patchedAddLog(message) {
      originalAddLog(message);
      showToast(message);
      window.setTimeout(markLatestLog, 0);
    };
  }

  if (resources) {
    new MutationObserver(() => {
      resources.classList.remove("is-updated");
      void resources.offsetWidth;
      resources.classList.add("is-updated");
    }).observe(resources, { childList: true, subtree: true, characterData: true });
  }

  if (log) {
    new MutationObserver(markLatestLog).observe(log, { childList: true });
    markLatestLog();
  }
})();
