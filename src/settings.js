window.__fx = window.__fx || {};
const __fx = window.__fx;

const DEFAULT_OPENING_STRATEGY = {
  name: "Current keybind opening",
  startPercent: 50,
  endTick: 508,
  attacks: [
    { cycle: 1, keybinds: "sssssssdd", exactTick: 7.0 },
    { cycle: 1, keybinds: "sa", exactTick: 9.1, targetLand: 144, targetTroops: 799 },
    { cycle: 2, keybinds: "wdd", exactTick: 8.2, targetLand: 264, targetTroops: 1466 },
    { cycle: 3, keybinds: "ddd", exactTick: 6.6, note: "LS" },
    { cycle: 3, keybinds: "", exactTick: 8.0, targetLand: 684, targetTroops: 2272 },
    { cycle: 4, keybinds: "dd", exactTick: 5.0 },
    { cycle: 4, keybinds: "wwwd", exactTick: 7.1 },
    { cycle: 4, keybinds: "", exactTick: 8.5, note: "LS" },
    { cycle: 4, keybinds: "", exactTick: 9.2, targetLand: 1984, targetTroops: 2767 },
    { cycle: 5, keybinds: "d", exactTick: 6.2 },
    { cycle: 5, keybinds: "", exactTick: 8.3 },
    { cycle: 5, keybinds: "", exactTick: 9.0, targetLand: 3444, targetTroops: 4657 }
  ]
};

const settings = {
  useFullscreenMode: false,
  hoveringTooltip: true,
  showPlayerDensity: true,
  coloredDensity: true,
  densityDisplayStyle: "absoluteQuotient",
  detailedTeamPercentage: false,
  openDonationHistoryFromLb: true,
  keybindButtons: false,
  openingAutomationEnabled: true,
  openingAutomationTickOffset: "-9",
  openingAutomationStrategy: "",
  infiniteExpansionEnabled: true,
  autoAttackLowDensityBots: true,
  autoAttackLowDensityBotsMode: "best",
  autoAttackLowDensityBotsStartCycle: "8.93",
  botAttackIntervalMs: "1000",
  hidePropagandaPopup: true
};

__fx.settings = settings;

function validateOpeningStrategy(rawStrategy) {
  const parsed = JSON.parse(rawStrategy);
  if (!parsed || typeof parsed !== "object") throw new Error("Opening strategy must be an object");
  if (!Array.isArray(parsed.attacks)) throw new Error("Opening strategy must include an attacks array");
  parsed.attacks.forEach((attack, index) => {
    if (!Number.isFinite(Number(attack.cycle))) throw new Error(`Attack ${index + 1} has invalid cycle`);
    const exactTick = attack.exactTick ?? attack.tick;
    if (!Number.isFinite(Number(exactTick))) throw new Error(`Attack ${index + 1} has invalid tick`);
  });
  return parsed;
}

function OpeningAutomationInput(containerElement) {
  containerElement.className = "opening-automation-input";

  const header = document.createElement("p");
  header.innerText = "Opening Automation";

  const offsetLabel = document.createElement("label");
  offsetLabel.append("Tick offset ");
  const offsetInput = document.createElement("input");
  offsetInput.type = "number";
  offsetInput.step = "0.1";
  offsetInput.value = settings.openingAutomationTickOffset || "0";
  offsetInput.addEventListener("input", () => {
    settings.openingAutomationTickOffset = offsetInput.value;
  });
  offsetLabel.append(offsetInput);

  const textarea = document.createElement("textarea");
  textarea.spellcheck = false;
  textarea.value = settings.openingAutomationStrategy || JSON.stringify(DEFAULT_OPENING_STRATEGY, null, 2);
  textarea.addEventListener("input", () => {
    settings.openingAutomationStrategy = textarea.value;
  });

  const validateButton = document.createElement("button");
  validateButton.innerText = "Validate opening";
  validateButton.addEventListener("click", () => {
    try {
      validateOpeningStrategy(textarea.value);
      settings.openingAutomationStrategy = textarea.value;
      settings.openingAutomationTickOffset = offsetInput.value;
      alert("Opening strategy is valid");
    } catch (error) {
      alert("Opening strategy error:\n" + error.message);
    }
  });

  containerElement.append(header, offsetLabel, document.createElement("br"), textarea, document.createElement("br"), validateButton);

  this.update = function (newSettings) {
    offsetInput.value = newSettings.openingAutomationTickOffset || "9";
    textarea.value = newSettings.openingAutomationStrategy || JSON.stringify(DEFAULT_OPENING_STRATEGY, null, 2);
  };
}

const settingsManager = new (function () {
  const settingsStructure = [
    {
      for: "useFullscreenMode",
      type: "checkbox",
      label: "Use fullscreen mode",
      note: "Triggers after the next page click."
    },
    {
      for: "hidePropagandaPopup",
      type: "checkbox",
      label: "Hide propaganda popup"
    },
    {
      for: "openingAutomationEnabled",
      type: "checkbox",
      label: "Run opening automation automatically"
    },
    {
      for: "infiniteExpansionEnabled",
      type: "checkbox",
      label: "Run post-opening infinite expansion"
    },
    {
      for: "autoAttackLowDensityBots",
      type: "checkbox",
      label: "Run bot attack phase"
    },
    {
      for: "autoAttackLowDensityBotsStartCycle",
      type: "numberInput",
      label: "Bot attack start cycle:",
      tooltip: "One cycle is 5.6 seconds. Example: 8.93 starts around 50 seconds."
    },
    {
      for: "botAttackIntervalMs",
      type: "numberInput",
      label: "Bot attack interval ms:",
      tooltip: "Live in-game slider also controls this. Range: 100 to 2000 ms."
    },
    OpeningAutomationInput,
    function Footer(container) {
      const versionInfo = document.createElement("p");
      versionInfo.innerText = "TerriX Client";
      container.append(versionInfo);
    }
  ];

  const settingsContainer = document.querySelector(".settings .scrollable");
  const inputFields = {};
  const checkboxFields = {};
  const customElements = [];

  settingsStructure.forEach((item) => {
    if (typeof item === "function") {
      const container = document.createElement("div");
      customElements.push(new item(container));
      settingsContainer.append(container);
      return;
    }

    const label = document.createElement("label");
    if (item.tooltip) label.title = item.tooltip;
    const isValueInput = item.type.endsWith("Input");
    const element = document.createElement(isValueInput || item.type === "checkbox" ? "input" : item.type === "selectMenu" ? "select" : "button");

    if (item.type === "numberInput") element.type = "number";
    if (item.type === "textInput") element.type = "text";
    if (isValueInput || item.type === "selectMenu") inputFields[item.for] = element;
    if (item.text) element.innerText = item.text;
    if (item.action) element.addEventListener("click", item.action);
    if (item.label) label.append(item.label + " ");
    if (item.note) {
      const note = document.createElement("small");
      note.innerText = item.note;
      label.append(document.createElement("br"), note);
    }
    if (item.options) {
      item.options.forEach((option) => {
        const optionElement = document.createElement("option");
        optionElement.value = option.value;
        optionElement.innerText = option.label;
        element.append(optionElement);
      });
    }
    label.append(element);
    if (item.type === "checkbox") {
      element.type = "checkbox";
      const checkmark = document.createElement("span");
      checkmark.className = "checkmark";
      label.className = "checkbox";
      label.append(checkmark);
      checkboxFields[item.for] = element;
    } else {
      label.append(document.createElement("br"));
    }
    settingsContainer.append(label, document.createElement("br"));
  });

  this.save = function () {
    Object.keys(inputFields).forEach((key) => {
      settings[key] = inputFields[key].value.trim();
    });
    Object.keys(checkboxFields).forEach((key) => {
      settings[key] = checkboxFields[key].checked;
    });
    settings.autoAttackLowDensityBotsMode = settings.autoAttackLowDensityBots ? "best" : "off";
    this.applySettings();
    __fx.WindowManager?.closeWindow?.("settings");
    persistSettings();
    window.location.reload();
  };

  this.reset = function () {
    localStorage.removeItem("demon_settings");
    window.location.reload();
  };

  this.resetAll = this.reset;

  this.exportToFile = function () {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "demon-settings.json";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  this.importFromFile = function () {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      file.text().then((text) => {
        Object.assign(settings, JSON.parse(text));
        persistSettings();
        window.location.reload();
      }).catch((error) => alert("Could not import settings:\n" + error.message));
    });
    input.click();
  };

  this.applySettings = function () {
    settings.showPlayerDensity = true;
    settings.coloredDensity = true;
    settings.hoveringTooltip = true;
    settings.openDonationHistoryFromLb = true;
    settings.keybindButtons = false;
    __fx.hoveringTooltip?.setEnabled?.(true);
    if (settings.useFullscreenMode) document.documentElement.requestFullscreen?.().catch(() => { });
  };

  this.update = function () {
    Object.keys(inputFields).forEach((key) => {
      inputFields[key].value = settings[key] ?? "";
    });
    Object.keys(checkboxFields).forEach((key) => {
      checkboxFields[key].checked = Boolean(settings[key]);
    });
    customElements.forEach((customElement) => customElement.update?.(settings));
  };

  this.syncFields = this.update;

  const savedSettings = JSON.parse(localStorage.getItem("demon_settings") || "{}");
  Object.assign(settings, savedSettings);
  if (!["off", "best"].includes(settings.autoAttackLowDensityBotsMode)) {
    settings.autoAttackLowDensityBotsMode = settings.autoAttackLowDensityBots ? "best" : "off";
  }
  settings.autoAttackLowDensityBots = settings.autoAttackLowDensityBotsMode !== "off";
  settings.botAttackIntervalMs = String(Math.min(2000, Math.max(100, Number(settings.botAttackIntervalMs || 400))));
  this.applySettings();
  this.update();
})();

export function persistSettings() {
  localStorage.setItem("demon_settings", JSON.stringify(settings));
}

export function getSettings() {
  return settings;
}

export function tryEnterFullscreen() {
  document.documentElement.requestFullscreen?.().catch(() => { });
}

export default settingsManager;
