import { getSettings, persistSettings } from "./settings.js";
import { getVar } from "./gameInterface.js";

const PANEL_POSITION_STORAGE_KEY = "demon_automation_controls_position";

function makeButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.tabIndex = -1;
  button.textContent = label;
  button.addEventListener("pointerdown", (event) => event.preventDefault());
  button.addEventListener("click", (event) => {
    event.currentTarget.blur();
    onClick(event);
  });
  return button;
}

export default function initAutomationControls() {
  const settings = getSettings();
  const container = document.createElement("div");
  container.id = "demonAutomationControls";

  const dragHandle = document.createElement("div");
  dragHandle.className = "drag-handle";
  dragHandle.textContent = "Automation";

  const buttonGrid = document.createElement("div");
  buttonGrid.className = "button-grid";

  const offButton = makeButton("Off", () => {
    window.__fx.openingAutomation.setAllAutomationEnabled(false);
    render();
  });
  const openingButton = makeButton("Opening", () => {
    window.__fx.openingAutomation.toggleOpeningAutomationEnabled();
    render();
  });
  const infiniteButton = makeButton("Inf", () => {
    window.__fx.openingAutomation.toggleInfiniteExpansion();
    render();
  });
  const botButton = makeButton("Bot", () => {
    window.__fx.openingAutomation.toggleAutoAttackMode("best");
    render();
  });
  const onButton = makeButton("On", () => {
    window.__fx.openingAutomation.setAllAutomationEnabled(true);
    render();
  });

  const intervalLabel = document.createElement("label");
  intervalLabel.className = "interval-control";
  const intervalText = document.createElement("span");
  const intervalSlider = document.createElement("input");
  intervalSlider.type = "range";
  intervalSlider.min = "100";
  intervalSlider.max = "2000";
  intervalSlider.step = "50";
  intervalSlider.value = String(window.__fx.openingAutomation.getBestAttackIntervalMs());
  intervalSlider.addEventListener("input", () => {
    const value = window.__fx.openingAutomation.setBestAttackIntervalMs(intervalSlider.value);
    intervalText.textContent = `${value} ms`;
  });
  intervalLabel.append(intervalText, intervalSlider);

  buttonGrid.append(openingButton, infiniteButton, botButton, offButton, onButton);
  container.append(dragHandle, buttonGrid, intervalLabel);

  function loadPanelPosition() {
    try {
      const position = JSON.parse(localStorage.getItem(PANEL_POSITION_STORAGE_KEY) || "null");
      if (!position || !Number.isFinite(position.left) || !Number.isFinite(position.top)) return null;
      return position;
    } catch (_error) {
      return null;
    }
  }

  function clampPanelPosition(left, top) {
    const rect = container.getBoundingClientRect();
    const width = rect.width || 220;
    const height = rect.height || 110;
    return {
      left: Math.min(Math.max(0, left), Math.max(0, window.innerWidth - width)),
      top: Math.min(Math.max(0, top), Math.max(0, window.innerHeight - height))
    };
  }

  function applyPanelPosition(left, top, persist = true) {
    const position = clampPanelPosition(left, top);
    container.style.left = `${position.left}px`;
    container.style.top = `${position.top}px`;
    container.style.right = "auto";
    container.style.bottom = "auto";
    if (persist) localStorage.setItem(PANEL_POSITION_STORAGE_KEY, JSON.stringify(position));
  }

  function applyInitialPanelPosition() {
    const savedPosition = loadPanelPosition();
    if (savedPosition) {
      applyPanelPosition(savedPosition.left, savedPosition.top, false);
      return;
    }
    requestAnimationFrame(() => {
      const rect = container.getBoundingClientRect();
      const width = rect.width || 220;
      const height = rect.height || 110;
      applyPanelPosition(Math.round((window.innerWidth - width) / 2), Math.round(window.innerHeight - height - 86), false);
    });
  }

  function initDrag() {
    let dragState = null;
    dragHandle.addEventListener("pointerdown", (event) => {
      if (!isInGame()) return;
      const rect = container.getBoundingClientRect();
      dragState = {
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top
      };
      dragHandle.setPointerCapture(event.pointerId);
      container.classList.add("dragging");
      event.preventDefault();
    });
    dragHandle.addEventListener("pointermove", (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      applyPanelPosition(event.clientX - dragState.offsetX, event.clientY - dragState.offsetY);
    });
    const stopDrag = (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      dragState = null;
      container.classList.remove("dragging");
    };
    dragHandle.addEventListener("pointerup", stopDrag);
    dragHandle.addEventListener("pointercancel", stopDrag);
    window.addEventListener("resize", () => {
      const rect = container.getBoundingClientRect();
      applyPanelPosition(rect.left, rect.top);
    });
  }

  function attach() {
    if (!document.body) return;
    if (!document.body.contains(container)) {
      document.body.append(container);
      applyInitialPanelPosition();
    }
  }

  function setActive(button, active) {
    button.classList.toggle("active", Boolean(active));
  }

  function isInGame() {
    try {
      const gameState = Number(getVar("gameState") || 0);
      return gameState === 1 && !getVar("gIsReplay");
    } catch (_error) {
      return false;
    }
  }

  function render() {
    attach();
    container.classList.toggle("in-game", isInGame());
    settings.autoAttackLowDensityBots = settings.autoAttackLowDensityBotsMode !== "off";
    setActive(openingButton, settings.openingAutomationEnabled);
    setActive(infiniteButton, settings.infiniteExpansionEnabled);
    setActive(botButton, settings.autoAttackLowDensityBots);
    setActive(onButton, settings.openingAutomationEnabled && settings.infiniteExpansionEnabled && settings.autoAttackLowDensityBots);
    setActive(offButton, !settings.openingAutomationEnabled && !settings.infiniteExpansionEnabled && !settings.autoAttackLowDensityBots);
    intervalSlider.value = String(window.__fx.openingAutomation.getBestAttackIntervalMs());
    intervalText.textContent = `${intervalSlider.value} ms`;
    persistSettings();
  }

  window.addEventListener("load", () => {
    attach();
    render();
  });
  window.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
    if (!isInGame()) return;
    if (event.key === "q" || event.key === "Q") {
      window.__fx.openingAutomation.setAllAutomationEnabled(false);
      render();
    } else if (event.key === "e" || event.key === "E") {
      window.__fx.openingAutomation.setAllAutomationEnabled(true);
      render();
    }
  });
  setTimeout(() => {
    attach();
    render();
  }, 1000);
  setInterval(render, 500);
  initDrag();

  render();
  return { render };
}
