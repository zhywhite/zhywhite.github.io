(function () {
  "use strict";

  const STORAGE_KEY = "haoyi.visitorMap.pins.v1";
  const SESSION_KEY_PREFIX = "haoyi.visitorMap.session.";
  const MAX_PINS = 80;

  function canUseStorage(type) {
    try {
      const storage = window[type];
      const key = "__visitor_map_test__";
      storage.setItem(key, key);
      storage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  const hasLocalStorage = canUseStorage("localStorage");
  const hasSessionStorage = canUseStorage("sessionStorage");

  function readPins() {
    if (!hasLocalStorage) return [];

    try {
      const rawPins = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(rawPins)) return [];

      return rawPins
        .filter((pin) => Number.isFinite(Number(pin.latitude)) && Number.isFinite(Number(pin.longitude)))
        .slice(0, MAX_PINS);
    } catch (error) {
      return [];
    }
  }

  function writePins(pins) {
    if (!hasLocalStorage) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pins.slice(0, MAX_PINS)));
    } catch (error) {
      // Ignore storage quota or private browsing failures; the live dot still renders.
    }
  }

  function getLocationLabel(data) {
    return [data.city, data.region, data.country_name].filter(Boolean).join(", ");
  }

  function getPinKey(data) {
    if (data.ip) return data.ip;
    return `${Number(data.latitude).toFixed(3)},${Number(data.longitude).toFixed(3)}`;
  }

  function shouldCountVisit(key) {
    if (!hasSessionStorage) return true;

    const sessionKey = `${SESSION_KEY_PREFIX}${key}`;
    if (window.sessionStorage.getItem(sessionKey)) return false;
    window.sessionStorage.setItem(sessionKey, "1");
    return true;
  }

  function getMapPosition(latitude, longitude) {
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    const left = ((lon + 180) / 360) * 100;
    const top = ((90 - lat) / 180) * 100;
    return {
      left: `${Math.max(3, Math.min(97, left))}%`,
      top: `${Math.max(5, Math.min(95, top))}%`
    };
  }

  function record(data) {
    const position = getMapPosition(data.latitude, data.longitude);
    if (!position) {
      const pins = readPins();
      return { pin: null, pins };
    }

    const key = getPinKey(data);
    const pins = readPins();
    const existing = pins.find((pin) => pin.key === key || (data.ip && pin.ip === data.ip));
    const countVisit = shouldCountVisit(key);
    const pin = {
      key,
      ip: data.ip || "",
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      location: getLocationLabel(data),
      org: data.org || "",
      timezone: data.timezone || "",
      seenAt: new Date().toISOString(),
      visits: existing ? Number(existing.visits || 1) + (countVisit ? 1 : 0) : 1
    };
    const nextPins = [
      pin,
      ...pins.filter((savedPin) => savedPin.key !== pin.key && (!pin.ip || savedPin.ip !== pin.ip))
    ].slice(0, MAX_PINS);

    writePins(nextPins);
    return { pin, pins: nextPins };
  }

  function renderDots(layer, options = {}) {
    if (!layer) return 0;

    const pins = Array.isArray(options.pins) ? options.pins : readPins();
    layer.innerHTML = "";

    pins.forEach((pin, index) => {
      const position = getMapPosition(pin.latitude, pin.longitude);
      if (!position) return;

      const dot = document.createElement("span");
      dot.className = "visitor-dot";
      if (pin.key === options.currentKey || (pin.ip && pin.ip === options.currentIp)) {
        dot.classList.add("is-current");
      }
      dot.style.left = position.left;
      dot.style.top = position.top;
      dot.style.setProperty("--dot-delay", `${Math.min(index, 10) * 0.04}s`);
      dot.title = [
        pin.location || "Visitor",
        pin.ip ? `IP: ${pin.ip}` : "",
        `${Number(pin.visits || 1)} visit${Number(pin.visits || 1) === 1 ? "" : "s"}`
      ].filter(Boolean).join(" · ");
      layer.append(dot);
    });

    return pins.length;
  }

  function placeMarker(pinElement, pulseElement, data) {
    const position = getMapPosition(data && data.latitude, data && data.longitude);
    if (!position || !pinElement || !pulseElement) return;

    pinElement.style.left = position.left;
    pinElement.style.top = position.top;
    pulseElement.style.left = position.left;
    pulseElement.style.top = position.top;
    pinElement.classList.add("is-visible");
  }

  async function lookup() {
    const response = await fetch("https://ipapi.co/json/");
    if (!response.ok) throw new Error("Lookup failed");
    return response.json();
  }

  function countVisits(pins) {
    return pins.reduce((total, pin) => total + Number(pin.visits || 1), 0);
  }

  window.VisitorHistory = {
    countVisits,
    getLocationLabel,
    lookup,
    placeMarker,
    readPins,
    record,
    renderDots
  };
})();
