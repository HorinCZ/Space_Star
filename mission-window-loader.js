(function waitForMissionWindowPatch(attempt = 0) {
  if (typeof state !== "undefined" && typeof missions !== "undefined" && typeof render !== "undefined") {
    const script = document.createElement("script");
    script.src = "mission-window-patch.js?v=20260511-mission-window-3-ready";
    document.body.appendChild(script);
    return;
  }
  if (attempt < 100) window.setTimeout(() => waitForMissionWindowPatch(attempt + 1), 50);
})();
