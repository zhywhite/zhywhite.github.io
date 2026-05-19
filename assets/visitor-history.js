(function () {
  "use strict";

  const STORAGE_KEY = "haoyi.visitorMap.pins.v1";
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

  function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getPinCity(pin) {
    if (pin.city) return pin.city;
    if (pin.location) return String(pin.location).split(",")[0].trim();
    return "";
  }

  function getPinRegion(pin) {
    if (pin.region) return pin.region;
    if (!pin.location) return "";

    const parts = String(pin.location).split(",").map((part) => part.trim());
    return parts.length > 2 ? parts[1] : "";
  }

  function getPinCountry(pin) {
    if (pin.country_name) return pin.country_name;
    if (pin.country) return pin.country;
    if (!pin.location) return "";

    const parts = String(pin.location).split(",").map((part) => part.trim());
    return parts.length > 1 ? parts[parts.length - 1] : "";
  }

  function getCityKey(pin) {
    const city = getPinCity(pin);
    const region = getPinRegion(pin);
    const country = getPinCountry(pin);
    const cityParts = [city, region, country].map(normalizeText).filter(Boolean);

    if (cityParts.length) return cityParts.join("|");
    return [
      Number(pin.latitude).toFixed(2),
      Number(pin.longitude).toFixed(2)
    ].join("|");
  }

  function normalizePin(pin) {
    return {
      key: getCityKey(pin),
      ip: pin.ip || "",
      city: getPinCity(pin),
      region: getPinRegion(pin),
      country: getPinCountry(pin),
      latitude: Number(pin.latitude),
      longitude: Number(pin.longitude),
      location: pin.location || [getPinCity(pin), getPinRegion(pin), getPinCountry(pin)].filter(Boolean).join(", "),
      org: pin.org || "",
      timezone: pin.timezone || "",
      seenAt: pin.seenAt || new Date().toISOString()
    };
  }

  function dedupeCityPins(pins) {
    const cityPins = [];
    const seenCities = new Set();

    pins.forEach((pin) => {
      if (!Number.isFinite(Number(pin.latitude)) || !Number.isFinite(Number(pin.longitude))) return;

      const normalizedPin = normalizePin(pin);
      if (seenCities.has(normalizedPin.key)) return;

      seenCities.add(normalizedPin.key);
      cityPins.push(normalizedPin);
    });

    return cityPins.slice(0, MAX_PINS);
  }

  function readPins() {
    if (!hasLocalStorage) return [];

    try {
      const rawPins = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(rawPins)) return [];

      return dedupeCityPins(rawPins);
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

    const key = getCityKey(data);
    const pins = readPins();
    const existing = pins.find((pin) => pin.key === key);
    const pin = {
      key,
      ip: data.ip || "",
      city: data.city || "",
      region: data.region || "",
      country: data.country_name || "",
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      location: getLocationLabel(data),
      org: data.org || "",
      timezone: data.timezone || "",
      seenAt: existing ? existing.seenAt : new Date().toISOString(),
      lastSeenAt: new Date().toISOString()
    };
    const nextPins = [
      pin,
      ...pins.filter((savedPin) => savedPin.key !== pin.key)
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
        "City-level IP lookup",
        "Counted once"
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

  function countCities(pins) {
    return dedupeCityPins(pins).length;
  }

  window.VisitorHistory = {
    countCities,
    getLocationLabel,
    lookup,
    placeMarker,
    readPins,
    record,
    renderDots
  };
})();
