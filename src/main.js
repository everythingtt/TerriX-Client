import settingsManager from "./settings.js";
import WindowManager from "./windowManager.js";
import donationsTracker from "./donationsTracker.js";
import gameScriptUtils from "./gameScriptUtils.js";
import hoveringTooltip from "./hoveringTooltip.js";
import openingAutomation from "./openingAutomation.js";
import initAutomationControls from "./automationControls.js";
import { leaderboardFilter, clanFilter } from "./clanFilters.js";

window.__fx = window.__fx || {};
const __fx = window.__fx;

__fx.version = "TerriX Client";
__fx.settingsManager = settingsManager;
__fx.WindowManager = WindowManager;
__fx.utils = gameScriptUtils;
__fx.openingAutomation = openingAutomation;
__fx.donationsTracker = donationsTracker;
__fx.hoveringTooltip = hoveringTooltip;
__fx.leaderboardFilter = leaderboardFilter;
__fx.clanFilter = clanFilter;
__fx.reportError = (...args) => console.error("[TerriX Client]", ...args);

WindowManager.add({
    name: "settings",
    element: document.querySelector(".settings"),
    beforeOpen() {
        settingsManager.syncFields();
    }
});

__fx.keybindFunctions = {
    setAbsolute() { },
    setRelative() { },
    getAttackPercentage() { return 0; },
    repaintAttackPercentageBar() { }
};
__fx.keybindHandler = () => false;
__fx.mobileKeybinds = [];
__fx.automationControls = initAutomationControls();

console.log("Successfully loaded TerriX Client");
