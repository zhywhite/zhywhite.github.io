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

  function loadLiveMap(frameHost) {
    if (!frameHost) return;

    if (frameHost.dataset.loaded === "true") {
      frameHost.classList.remove("is-hidden");
      return;
    }

    const card = frameHost.closest("[data-live-map-card]");
    const widgetId = frameHost.dataset.widgetId || "zh1";
    const width = frameHost.dataset.widgetWidth || "620";
    const height = frameHost.dataset.widgetHeight || "310";
    const iframe = document.createElement("iframe");

    iframe.className = "visitor-live-frame";
    iframe.title = "Live visitor world map";
    iframe.loading = "eager";
    iframe.width = width;
    iframe.height = height;
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups");
    iframe.referrerPolicy = "no-referrer-when-downgrade";
    iframe.srcdoc = buildWidgetSrcdoc(widgetId, width, height);

    frameHost.replaceChildren(iframe);
    frameHost.dataset.loaded = "true";
    frameHost.classList.remove("is-hidden");
    if (card) card.classList.add("is-live");
  }

  function initializeLiveMaps() {
    document.querySelectorAll("[data-live-map-frame]").forEach(loadLiveMap);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeLiveMaps, { once: true });
  } else {
    initializeLiveMaps();
  }
}());
