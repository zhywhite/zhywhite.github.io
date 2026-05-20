(function () {
  const SITE_KEY = "zhywhiteio";

  function buildWidgetSrcdoc(widgetId, width, height) {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html, body {
    margin: 0;
    min-height: 100%;
    background: #eaf4f2;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  body {
    display: grid;
    place-items: center;
    overflow: auto;
  }

  img, iframe, object {
    max-width: 100%;
    border: 0;
  }
</style>
</head>
<body>
<script>var _wau = _wau || []; _wau.push(["map", "${SITE_KEY}", "${widgetId}", "${width}", "${height}", "natural", "star-red"]);<\/script>
<script async src="https://waust.at/m.js"><\/script>
</body>
</html>`;
  }

  function findMapCard(trigger) {
    return trigger.closest("[data-live-map-card]")
      || trigger.closest(".visitor-globe-layout, .visitor-grid")?.querySelector("[data-live-map-card]")
      || document.querySelector("[data-live-map-card]");
  }

  function loadLiveMap(trigger) {
    const card = findMapCard(trigger);
    const frameHost = card?.querySelector("[data-live-map-frame]");
    if (!card || !frameHost) return;

    if (frameHost.dataset.loaded === "true") {
      card.classList.add("is-live");
      frameHost.classList.remove("is-hidden");
      return;
    }

    const widgetId = frameHost.dataset.widgetId || "zh1";
    const width = frameHost.dataset.widgetWidth || "620";
    const height = frameHost.dataset.widgetHeight || "310";
    const iframe = document.createElement("iframe");

    iframe.className = "visitor-live-frame";
    iframe.title = "Live visitor world map";
    iframe.loading = "lazy";
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups");
    iframe.referrerPolicy = "no-referrer-when-downgrade";
    iframe.srcdoc = buildWidgetSrcdoc(widgetId, width, height);

    frameHost.replaceChildren(iframe);
    frameHost.dataset.loaded = "true";
    frameHost.classList.remove("is-hidden");
    card.classList.add("is-live");

    document.querySelectorAll("[data-live-map-trigger]").forEach((button) => {
      button.disabled = true;
      button.textContent = "Live map loaded";
    });
  }

  document.querySelectorAll("[data-live-map-trigger]").forEach((trigger) => {
    trigger.addEventListener("click", () => loadLiveMap(trigger));
  });
}());
