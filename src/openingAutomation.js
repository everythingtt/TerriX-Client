import { getSettings, persistSettings } from "./settings.js";
import { getVar } from "./gameInterface.js";

const KEY_RATIOS = {
    "+": 6 / 5,
    "-": 5 / 6,
    w: 8 / 7,
    s: 7 / 8,
    d: 32 / 31,
    a: 31 / 32
};

const DEFAULT_STRATEGY = {
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

const INFINITE_EXPANSION_START_CYCLE = 6;
const INFINITE_EXPANSION_REFILL_RATIO = 0.20;
const INFINITE_EXPANSION_END_CYCLE = 9;
const INFINITE_EXPANSION_CANCEL_TICK = 98;
const INFINITE_EXPANSION_ATTACK_PERCENT = 331 / 1024;
const INFINITE_EXPANSION_HANDOFF_BOT_PERCENT = 0.10;
const INFINITE_EXPANSION_MAX_DEPLOYED_BY_CYCLE = {
    8: 3000,
    9: 4000
};
const REFERENCE_INFINITE_EXPANSION_ATTACKS = [
    { tick: 539, type: "neutral", percent: 331 / 1024 },
    { tick: 560, type: "neutral", percent: 331 / 1024 },
    { tick: 574, type: "neutral", percent: 331 / 1024 },
    { tick: 581, type: "neutral", percent: 331 / 1024 },
    { tick: 581, type: "neutral", percent: 331 / 1024 },
    { tick: 588, type: "neutral", percent: 331 / 1024 },
    { tick: 595, type: "neutral", percent: 331 / 1024 },
    { tick: 623, type: "neutral", percent: 331 / 1024 },
    { tick: 644, type: "neutral", percent: 331 / 1024 },
    { tick: 665, type: "neutral", percent: 331 / 1024 },
    { tick: 679, type: "neutral", percent: 331 / 1024 },
    { tick: 693, type: "neutral", percent: 331 / 1024 },
    { tick: 707, type: "neutral", percent: 331 / 1024 },
    { tick: 742, type: "neutral", percent: 232 / 1024 },
    { tick: 749, type: "neutral", percent: 232 / 1024 },
    { tick: 763, type: "neutral", percent: 232 / 1024 },
    { tick: 770, type: "neutral", percent: 232 / 1024 },
    { tick: 770, type: "neutral", percent: 232 / 1024 },
    { tick: 777, type: "neutral", percent: 232 / 1024 },
    { tick: 784, type: "neutral", percent: 232 / 1024 },
    { tick: 791, type: "neutral", percent: 232 / 1024 },
    { tick: 798, type: "neutral", percent: 232 / 1024 },
    { tick: 812, type: "neutral", percent: 232 / 1024 },
    { tick: 833, type: "neutral", percent: 145 / 1024 },
    { tick: 840, type: "bot", percent: 145 / 1024 },
    { tick: 847, type: "bot", percent: 145 / 1024 },
    { tick: 861, type: "bot", percent: 145 / 1024 },
    { tick: 868, type: "neutral", percent: 145 / 1024 },
    { tick: 875, type: "bot", percent: 145 / 1024 },
    { tick: 889, type: "bot", percent: 145 / 1024 }
];

const AUTO_ATTACK_MODES = new Set(["off", "best"]);
const BOT_ATTACK_TELEMETRY_STORAGE_KEY = "fx_bot_attack_telemetry";

function normalizeAutoAttackMode(settings) {
    settings = settings || getSettings?.() || {};
    const mode = settings.autoAttackLowDensityBotsMode;
    if (AUTO_ATTACK_MODES.has(mode)) return mode;
    return settings.autoAttackLowDensityBots ? "best" : "off";
}

function getBestAttackIntervalMs() {
    const interval = Number(getSettings().botAttackIntervalMs || 400);
    if (!Number.isFinite(interval)) return 400;
    return Math.min(2000, Math.max(100, interval));
}

function getInfiniteExpansionMaxDeployedTroops(cycle) {
    if (cycle >= 9) return INFINITE_EXPANSION_MAX_DEPLOYED_BY_CYCLE[9];
    return INFINITE_EXPANSION_MAX_DEPLOYED_BY_CYCLE[cycle] || Infinity;
}

function loadStoredBotAttackTelemetry() {
    try {
        const stored = JSON.parse(localStorage.getItem(BOT_ATTACK_TELEMETRY_STORAGE_KEY) || "[]");
        return Array.isArray(stored) ? stored : [];
    } catch (_error) {
        return [];
    }
}

function applyKeybinds(startPercent, keybinds = "") {
    let percent = startPercent;
    for (const key of keybinds) {
        if (!KEY_RATIOS[key]) throw new Error(`Unknown opening keybind: ${key}`);
        percent *= KEY_RATIOS[key];
    }
    return percent;
}

function exactTickToInternalTick(cycle, exactTick) {
    return (cycle - 1) * 100 + Math.round(exactTick * 10);
}

function readStrategy(settings = getSettings()) {
    const raw = settings.openingAutomationStrategy?.trim();
    if (!raw) return DEFAULT_STRATEGY;
    return JSON.parse(raw);
}

function getOpeningAutomationTickOffset() {
    const offset = Number(getSettings().openingAutomationTickOffset || 0);
    return Number.isFinite(offset) ? offset : 0;
}

function isInfiniteExpansionConfigured() {
    return getSettings?.()?.infiniteExpansionEnabled !== false;
}

function normalizeStrategy(config, tickOffset = 0) {
    let currentPercent = Number(config.startPercent ?? 50);
    const attacks = (config.attacks || []).map((row) => {
        currentPercent = row.slider !== undefined
            ? Number(row.slider) / 1024 * 100
            : row.percent === undefined
                ? applyKeybinds(currentPercent, row.keybinds || "")
                : Number(row.percent);
        const exactTick = row.exactTick === undefined ? row.tick : row.exactTick;
        if (exactTick === undefined) throw new Error("Opening attack is missing exactTick/tick");
        return {
            tick: exactTickToInternalTick(Number(row.cycle), Number(exactTick)) + tickOffset,
            percent: currentPercent / 100
        };
    });
    attacks.sort((a, b) => a.tick - b.tick);
    return attacks;
}

const openingAutomation = new (function () {
    this.attack = () => { };
    this.attackPlayer = () => false;
    this.getBotAttackSnapshot = () => null;
    this.isLiveLowDensityBotTarget = () => false;
    this.hasFreeLandAroundPlayer = () => false;
    this.getDeployedTroops = () => 0;
    this.getPlayerTroops = () => 0;
    this.findLowDensityBorderingBot = () => -1;
    this.findBestLowDensityBorderingBot = () => -1;
    this.findFullsendEncapsulatedBot = () => -1;
    this.findWeakEncapsulatedBot = () => null;
    this.findThighClientBotAttackTarget = () => null;
    this.findSimpleBestBotAttackTarget = () => -1;
    this.findLowDensityBorderingBots = () => [];
    this.enabledForGame = false;
    this.completed = false;
    this.nextAttack = 0;
    this.lastTick = -1;
    this.lastGameState = 0;
    this.attacks = [];
    this.autoAttackCycle = -1;
    this.autoAttackCount = 0;
    this.autoAttackReservedAttackUsed = false;
    this.autoAttackLastTick = -1;
    this.autoAttackLastAttackTime = -Infinity;
    this.autoAttackStartOverrideTick = -1;
    this.autoAttackCheckSlot = 0;
    this.autoAttackTimers = [];
    this.autoAttackInitializedPercent = false;
    this.autoAttackReducedCycles = new Set();
    this.safeBotDensityTracker = new Map();
    this.autoAttackRecentTargets = new Map();
    this.automatedBotAttacks = new Map();
    this.automatedBotCancelLastTick = -1;
    this.safeBotTelemetry = {
        events: [],
        maxEvents: 1000,
        sequence: 0
    };
    this.botAttackTelemetry = {
        events: loadStoredBotAttackTelemetry(),
        maxEvents: 2000,
        sequence: 0
    };
    this.botAttackTelemetry.sequence = this.botAttackTelemetry.events.reduce(
        (max, event) => Math.max(max, Number(event.sequence) || 0),
        0
    );
    this.autoAttackMode = normalizeAutoAttackMode();
    this.infiniteExpansionEnabled = isInfiniteExpansionConfigured();
    this.infiniteExpansionActive = false;
    this.infiniteExpansionIndex = 0;
    this.referenceInfiniteExpansionIndex = 0;
    this.infiniteExpansionComplete = false;
    this.infiniteExpansionLastAttackTick = -1;
    this.infiniteExpansionLastCancelCycle = -1;
    this.infiniteExpansionCycle = -1;
    this.infiniteExpansionPeakDeployedTroops = 0;
    this.infiniteExpansionLastPercent = null;
    this.findBestDynamicBotAttackTarget = () => null;
    this.cancelPlayerAttack = () => false;
    this.cancelFreeLandAttack = () => false;

    this.getSafeDynamicAttackPercent = function (cycle) {
        const startCycle = Math.floor(Number(getSettings().autoAttackLowDensityBotsStartCycle || 8));
        const cycleOffset = Math.max(0, cycle - startCycle);
        if (cycleOffset <= 0) return 0.10;
        if (cycleOffset === 1) return 0.07;
        if (cycleOffset === 2) return 0.06;
        return 0.05;
    };

    this.reset = function () {
        this.enabledForGame = false;
        this.completed = false;
        this.nextAttack = 0;
        this.lastTick = -1;
        this.attacks = [];
        this.autoAttackCycle = -1;
        this.autoAttackCount = 0;
        this.autoAttackReservedAttackUsed = false;
        this.autoAttackLastTick = -1;
        this.autoAttackLastAttackTime = -Infinity;
        this.autoAttackStartOverrideTick = -1;
        this.autoAttackCheckSlot = 0;
        this.autoAttackInitializedPercent = false;
        this.autoAttackReducedCycles.clear();
        this.safeBotDensityTracker.clear();
        this.autoAttackRecentTargets.clear();
        this.automatedBotAttacks.clear();
        this.automatedBotCancelLastTick = -1;
        this.infiniteExpansionActive = false;
        this.infiniteExpansionIndex = 0;
        this.referenceInfiniteExpansionIndex = 0;
        this.infiniteExpansionComplete = false;
        this.infiniteExpansionLastAttackTick = -1;
        this.infiniteExpansionLastCancelCycle = -1;
        this.infiniteExpansionCycle = -1;
        this.infiniteExpansionPeakDeployedTroops = 0;
        this.infiniteExpansionLastPercent = null;
        this.clearAutoAttackTimers();
    };

    this.clearAutoAttackTimers = function () {
        this.autoAttackTimers.forEach((timer) => clearTimeout(timer));
        this.autoAttackTimers = [];
    };

    this.recordSafeTelemetry = function (event) {
        const telemetry = this.safeBotTelemetry;
        telemetry.events.push({
            sequence: ++telemetry.sequence,
            time: Math.round(performance.now()),
            ...event
        });
        if (telemetry.events.length > telemetry.maxEvents) {
            telemetry.events.splice(0, telemetry.events.length - telemetry.maxEvents);
        }
    };

    this.clearSafeTelemetry = function () {
        this.safeBotTelemetry.events = [];
        this.safeBotTelemetry.sequence = 0;
    };

    this.getSafeTelemetry = function () {
        return this.safeBotTelemetry.events.slice();
    };

    this.summarizeSafeTelemetry = function () {
        const summary = this.safeBotTelemetry.events.reduce((result, event) => {
            result.total++;
            result.byType[event.type] = (result.byType[event.type] || 0) + 1;
            if (event.type === "safe-check") {
                result.rejections.density += event.rejectDensity || 0;
                result.rejections.fresh += event.rejectFresh || 0;
                result.rejections.kill += event.rejectKill || 0;
                result.rejections.exposure += event.rejectExposure || 0;
                result.selected += event.selected ? 1 : 0;
            }
            if (event.type === "safe-attack") result.attacks++;
            if (event.type === "safe-conquest-check") {
                result.conquestChecks++;
                if (event.conquered) result.conquests++;
            }
            return result;
        }, {
            total: 0,
            byType: {},
            rejections: { density: 0, fresh: 0, kill: 0, exposure: 0 },
            selected: 0,
            attacks: 0,
            conquestChecks: 0,
            conquests: 0
        });
        if (summary.conquestChecks > 0) {
            summary.conquestRate = (summary.conquests / summary.conquestChecks * 100).toFixed(1) + "%";
        }
        console.table(summary.rejections);
        console.log("Safe telemetry summary", summary);
        return summary;
    };

    this.recordBotAttackTelemetry = function (target, context = {}) {
        const { snapshot: providedSnapshot, ...eventContext } = context;
        const snapshot = providedSnapshot || this.getBotAttackSnapshot(target);
        if (!snapshot) return null;
        const telemetry = this.botAttackTelemetry;
        const event = {
            sequence: ++telemetry.sequence,
            time: Math.round(performance.now()),
            gameTick: this.lastTick,
            cycle: Math.floor(this.lastTick / 100),
            tickInCycle: this.lastTick - Math.floor(this.lastTick / 100) * 100,
            status: "accepted",
            ...eventContext,
            ...snapshot
        };
        telemetry.events.push(event);
        this.persistBotAttackTelemetry();
        return event;
    };

    this.persistBotAttackTelemetry = function () {
        const telemetry = this.botAttackTelemetry;
        if (telemetry.events.length > telemetry.maxEvents) {
            telemetry.events.splice(0, telemetry.events.length - telemetry.maxEvents);
        }
        try {
            localStorage.setItem(BOT_ATTACK_TELEMETRY_STORAGE_KEY, JSON.stringify(telemetry.events));
        } catch (_error) { }
    };

    this.scheduleBotAttackOutcomeCheck = function (event, target) {
        if (!event) return;
        setTimeout(() => {
            const land = this.getTargetLand?.(target) ?? -1;
            const troops = this.getTargetTroops?.(target) ?? -1;
            event.outcomeCheckedAt = Math.round(performance.now());
            event.outcomeDelayMs = 6000;
            event.conquered = land <= 0;
            event.remainingLand = land;
            event.remainingTroops = troops;
            event.remainingDensity = land > 0 ? Number((troops / (land * 150)).toFixed(4)) : 0;
            this.persistBotAttackTelemetry();
        }, 6000);
    };

    this.trackAutomatedBotAttack = function (target, event = null) {
        const snapshot = event || this.getBotAttackSnapshot(target);
        if (!snapshot) return;
        this.automatedBotAttacks.set(target, {
            tick: this.lastTick,
            density: Number(snapshot.targetDensity || 0),
            land: Number(snapshot.targetLand || 0),
            troops: Number(snapshot.targetTroops || 0)
        });
    };

    this.cancelBadAutomatedBotAttacks = function (tick) {
        if (!getVar("gameState") || tick - this.automatedBotCancelLastTick < 1) return;
        for (const [target, record] of Array.from(this.automatedBotAttacks.entries())) {
            const land = this.getTargetLand?.(target) ?? 0;
            if (tick - record.tick > 120 || land <= 0) {
                this.automatedBotAttacks.delete(target);
                continue;
            }
            if (tick - record.tick < 3) continue;
            const troops = this.getTargetTroops?.(target) ?? 0;
            const density = land > 0 ? troops / (land * 150) * 100 : 0;
            const cancelDensity = Math.max(0.32, Number(record.density || 0) * 1.85);
            if (density >= cancelDensity && this.cancelPlayerAttack(target)) {
                this.automatedBotAttacks.delete(target);
                this.automatedBotCancelLastTick = tick;
            }
        }
    };

    this.clearBotAttackTelemetry = function () {
        this.botAttackTelemetry.events = [];
        this.botAttackTelemetry.sequence = 0;
        localStorage.removeItem(BOT_ATTACK_TELEMETRY_STORAGE_KEY);
    };

    this.getBotAttackTelemetry = function () {
        return this.botAttackTelemetry.events.slice();
    };

    this.summarizeBotAttackTelemetry = function () {
        const events = this.getBotAttackTelemetry();
        const summary = events.reduce((result, event) => {
            result.total++;
            result.byMode[event.mode] = (result.byMode[event.mode] || 0) + 1;
            result.byKind[event.kind] = (result.byKind[event.kind] || 0) + 1;
            result.avgDensity += Number(event.targetDensity || 0);
            result.avgLand += Number(event.targetLand || 0);
            result.avgAttackPercent += Number(event.attackPercent || 0);
            result.avgAttackTroops += Number(event.attackTroops || 0);
            return result;
        }, {
            total: 0,
            byMode: {},
            byKind: {},
            avgDensity: 0,
            avgLand: 0,
            avgAttackPercent: 0,
            avgAttackTroops: 0
        });
        if (summary.total > 0) {
            summary.avgDensity = Number((summary.avgDensity / summary.total).toFixed(4));
            summary.avgLand = Math.round(summary.avgLand / summary.total);
            summary.avgAttackPercent = Number((summary.avgAttackPercent / summary.total).toFixed(4));
            summary.avgAttackTroops = Math.round(summary.avgAttackTroops / summary.total);
        }
        console.table(summary.byMode);
        console.table(summary.byKind);
        console.log("Bot attack telemetry summary", summary);
        return summary;
    };

    this.getBotAttackTelemetryCsv = function () {
        const events = this.getBotAttackTelemetry();
        const columns = [
            "sequence", "time", "gameTick", "cycle", "tickInCycle", "mode", "kind",
            "target", "targetName", "targetLand", "targetTroops", "targetDensity",
            "attackPercent", "playerTroops", "attackTroops", "autoAttackCount",
            "scheduledDelay", "cycleProgress", "status", "conquered", "remainingLand",
            "remainingTroops", "remainingDensity"
        ];
        const escapeCell = (value) => {
            if (value === undefined || value === null) return "";
            const text = String(value);
            return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
        };
        return [
            columns.join(","),
            ...events.map((event) => columns.map((column) => escapeCell(event[column])).join(","))
        ].join("\n");
    };

    this.downloadBotAttackTelemetry = function (format = "json") {
        const isCsv = format === "csv";
        const content = isCsv
            ? this.getBotAttackTelemetryCsv()
            : JSON.stringify(this.getBotAttackTelemetry(), null, 2);
        const blob = new Blob([content], { type: isCsv ? "text/csv" : "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `bot-attack-telemetry.${isCsv ? "csv" : "json"}`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    this.getAutoAttackMode = function () {
        return normalizeAutoAttackMode();
    };

    this.setAutoAttackMode = function (mode) {
        const settings = getSettings();
        const nextMode = AUTO_ATTACK_MODES.has(mode) ? mode : "off";
        settings.autoAttackLowDensityBotsMode = nextMode;
        settings.autoAttackLowDensityBots = nextMode !== "off";
        persistSettings();
        this.autoAttackMode = nextMode;
        this.autoAttackCycle = -1;
        this.autoAttackCount = 0;
        this.autoAttackReservedAttackUsed = false;
        this.autoAttackLastTick = -1;
        this.autoAttackLastAttackTime = -Infinity;
        this.autoAttackStartOverrideTick = -1;
        this.autoAttackInitializedPercent = false;
        this.autoAttackReducedCycles.clear();
        this.safeBotDensityTracker.clear();
        this.autoAttackRecentTargets.clear();
        this.clearAutoAttackTimers();
        return nextMode;
    };

    this.toggleAutoAttackMode = function (mode) {
        return this.setAutoAttackMode(this.getAutoAttackMode() === mode ? "off" : mode);
    };

    this.handoffInfiniteExpansionToBotAttacks = function (tick) {
        this.infiniteExpansionComplete = true;
        this.infiniteExpansionActive = false;
        this.setAutoAttackMode("best");
        this.autoAttackStartOverrideTick = tick;
        window.__fx.keybindFunctions.setAbsolute(INFINITE_EXPANSION_HANDOFF_BOT_PERCENT);
        window.__fx.keybindFunctions.repaintAttackPercentageBar();
        this.autoAttackInitializedPercent = true;
        this.autoAttackLastAttackTime = -Infinity;
    };

    this.setInfiniteExpansionAttackPercent = function (percent) {
        if (this.infiniteExpansionLastPercent === percent) return;
        window.__fx.keybindFunctions.setAbsolute(percent);
        window.__fx.keybindFunctions.repaintAttackPercentageBar();
        this.infiniteExpansionLastPercent = percent;
    };

    this.setOpeningAutomationEnabled = function (enabled) {
        const settings = getSettings();
        settings.openingAutomationEnabled = Boolean(enabled);
        persistSettings();
        if (!settings.openingAutomationEnabled) this.stop();
        else if ((!this.enabledForGame || this.completed) && this.lastTick >= 0 && this.lastTick < 20) this.start();
        return settings.openingAutomationEnabled;
    };

    this.toggleOpeningAutomationEnabled = function () {
        return this.setOpeningAutomationEnabled(!getSettings().openingAutomationEnabled);
    };

    this.getBestAttackIntervalMs = getBestAttackIntervalMs;

    this.setBestAttackIntervalMs = function (intervalMs) {
        const settings = getSettings();
        settings.botAttackIntervalMs = String(Math.round(Math.min(2000, Math.max(100, Number(intervalMs) || 400))));
        persistSettings();
        return Number(settings.botAttackIntervalMs);
    };

    this.isInfiniteExpansionEnabled = function () {
        this.infiniteExpansionEnabled = isInfiniteExpansionConfigured();
        return this.infiniteExpansionEnabled;
    };

    this.setInfiniteExpansionEnabled = function (enabled) {
        const settings = getSettings();
        this.infiniteExpansionEnabled = Boolean(enabled);
        settings.infiniteExpansionEnabled = this.infiniteExpansionEnabled;
        persistSettings();
        this.infiniteExpansionActive = this.infiniteExpansionEnabled && Boolean(getVar("gameState"));
        this.infiniteExpansionIndex = 0;
        this.referenceInfiniteExpansionIndex = 0;
        this.infiniteExpansionComplete = false;
        this.infiniteExpansionLastAttackTick = -1;
        this.infiniteExpansionLastCancelCycle = -1;
        this.infiniteExpansionCycle = -1;
        this.infiniteExpansionPeakDeployedTroops = 0;
        this.infiniteExpansionLastPercent = null;
        return this.infiniteExpansionEnabled;
    };

    this.toggleInfiniteExpansion = function () {
        return this.setInfiniteExpansionEnabled(!this.isInfiniteExpansionEnabled());
    };

    this.setAllAutomationEnabled = function (enabled) {
        const settings = getSettings();
        const nextEnabled = Boolean(enabled);
        settings.openingAutomationEnabled = nextEnabled;
        settings.infiniteExpansionEnabled = nextEnabled;
        settings.autoAttackLowDensityBotsMode = nextEnabled ? "best" : "off";
        settings.autoAttackLowDensityBots = nextEnabled;
        persistSettings();
        if (!nextEnabled) {
            this.stop();
            this.setInfiniteExpansionEnabled(false);
            this.setAutoAttackMode("off");
        } else {
            this.setInfiniteExpansionEnabled(true);
            this.setAutoAttackMode("best");
            if ((!this.enabledForGame || this.completed) && this.lastTick >= 0 && this.lastTick < 20) this.start();
        }
        return nextEnabled;
    };

    this.start = function () {
        try {
            this.attacks = normalizeStrategy(readStrategy(), Number(getSettings().openingAutomationTickOffset || 0));
            this.enabledForGame = this.attacks.length > 0;
            this.completed = false;
            this.nextAttack = 0;
            this.lastTick = -1;
            this.infiniteExpansionEnabled = isInfiniteExpansionConfigured();
            this.infiniteExpansionActive = this.infiniteExpansionEnabled;
            this.infiniteExpansionIndex = 0;
            this.referenceInfiniteExpansionIndex = 0;
            this.infiniteExpansionComplete = false;
            this.infiniteExpansionLastAttackTick = -1;
            this.infiniteExpansionLastCancelCycle = -1;
            this.infiniteExpansionCycle = -1;
            this.infiniteExpansionPeakDeployedTroops = 0;
            this.infiniteExpansionLastPercent = null;
            console.log(`Opening automation loaded ${this.attacks.length} attacks`);
        } catch (error) {
            this.reset();
            console.error("Opening automation strategy error", error);
            alert("Opening automation strategy error:\n" + error.message);
        }
    };

    this.stop = function () {
        this.reset();
        console.log("Opening automation stopped");
    };

    this.toggle = function () {
        if (this.enabledForGame && !this.completed) this.stop();
        else this.start();
    };

    this.onTick = function (tick) {
        const settings = getSettings();
        const gameState = getVar("gameState");
        if (!gameState) {
            if (this.lastGameState) this.reset();
            this.lastGameState = gameState;
            return;
        }
        this.lastGameState = gameState;

        if (tick < this.lastTick) this.reset();
        this.lastTick = tick;

        if (!this.enabledForGame && !this.completed && settings.openingAutomationEnabled && tick < 20) {
            this.start();
        }
        if (this.infiniteExpansionActive) this.onTickInfiniteExpansion(tick);
        if (!this.enabledForGame || this.completed) return;

        while (this.nextAttack < this.attacks.length && this.attacks[this.nextAttack].tick <= tick) {
            const attack = this.attacks[this.nextAttack++];
            window.__fx.keybindFunctions.setAbsolute(attack.percent);
            window.__fx.keybindFunctions.repaintAttackPercentageBar();
            this.attack();
        }

        if (this.nextAttack >= this.attacks.length) {
            this.completed = true;
            this.enabledForGame = false;
        }
    };

    this.runWeakEncapsulatedBotAttack = function (tick, percent, mode = "raw", kind = "encapsulated") {
        const selection = this.findWeakEncapsulatedBot?.(percent, mode);
        if (!selection || selection.target < 0) return false;
        if (selection.percent) {
            window.__fx.keybindFunctions.setAbsolute(selection.percent);
            window.__fx.keybindFunctions.repaintAttackPercentageBar();
        }
        const attackSnapshot = this.getBotAttackSnapshot(selection.target);
        const attackAccepted = this.attackPlayer(selection.target);
        if (!attackAccepted) return false;
        const attackEvent = this.recordBotAttackTelemetry(selection.target, {
            snapshot: attackSnapshot,
            mode,
            kind,
            autoAttackCount: this.autoAttackCount,
            cycleProgress: (tick % 100) / 100,
            score: selection.score,
            oneShotRatio: selection.oneShotRatio
        });
        this.trackAutomatedBotAttack(selection.target, attackSnapshot);
        this.scheduleBotAttackOutcomeCheck(attackEvent, selection.target);
        this.autoAttackRecentTargets.set(selection.target, tick);
        this.autoAttackLastTick = tick;
        this.autoAttackCount++;
        return true;
    };

    this.runReferenceInfiniteBotAttack = function (tick, percent) {
        if (this.runWeakEncapsulatedBotAttack(tick, percent, "raw", "infinite-encapsulated")) return true;
        const selection = this.findBestDynamicBotAttackTarget(tick, { mode: "raw", fixedPercent: percent });
        if (!selection || selection.target < 0) return false;
        window.__fx.keybindFunctions.setAbsolute(selection.percent || percent);
        window.__fx.keybindFunctions.repaintAttackPercentageBar();
        const attackSnapshot = this.getBotAttackSnapshot(selection.target);
        const attackAccepted = this.attackPlayer(selection.target);
        if (!attackAccepted) return false;
        const attackEvent = this.recordBotAttackTelemetry(selection.target, {
            snapshot: attackSnapshot,
            mode: "raw",
            kind: "infinite-bot",
            autoAttackCount: this.autoAttackCount,
            cycleProgress: (tick % 100) / 100,
            score: selection.score,
            oneShotRatio: selection.oneShotRatio
        });
        this.trackAutomatedBotAttack(selection.target, attackSnapshot);
        this.scheduleBotAttackOutcomeCheck(attackEvent, selection.target);
        this.autoAttackRecentTargets.set(selection.target, tick);
        this.autoAttackLastTick = tick;
        this.autoAttackCount++;
        return true;
    };

    this.onTickReferenceInfiniteExpansion = function (tick) {
        const tickOffset = getOpeningAutomationTickOffset();
        const firstTick = REFERENCE_INFINITE_EXPANSION_ATTACKS[0].tick + tickOffset;
        const lastTick = REFERENCE_INFINITE_EXPANSION_ATTACKS[REFERENCE_INFINITE_EXPANSION_ATTACKS.length - 1].tick + tickOffset;
        if (tick < firstTick - 7 || tick > lastTick + 11) return false;
        const cycle = Math.floor(tick / 100) + 1;
        if (!this.hasFreeLandAroundPlayer()) {
            this.handoffInfiniteExpansionToBotAttacks(tick);
            return true;
        }
        const deployedTroops = Math.max(0, Number(this.getDeployedTroops?.() || 0));
        if (deployedTroops > getInfiniteExpansionMaxDeployedTroops(cycle)) return true;
        while (
            this.referenceInfiniteExpansionIndex < REFERENCE_INFINITE_EXPANSION_ATTACKS.length
            && REFERENCE_INFINITE_EXPANSION_ATTACKS[this.referenceInfiniteExpansionIndex].tick + tickOffset < tick - 5
        ) {
            this.referenceInfiniteExpansionIndex++;
        }
        while (
            this.referenceInfiniteExpansionIndex < REFERENCE_INFINITE_EXPANSION_ATTACKS.length
            && tick >= REFERENCE_INFINITE_EXPANSION_ATTACKS[this.referenceInfiniteExpansionIndex].tick + tickOffset
        ) {
            this.referenceInfiniteExpansionIndex++;
            this.setInfiniteExpansionAttackPercent(INFINITE_EXPANSION_ATTACK_PERCENT);
            this.attack();
            this.infiniteExpansionLastAttackTick = tick;
        }
        return true;
    };

    this.onTickInfiniteExpansion = function (tick) {
        if (!getVar("gameState")) return;
        if (this.infiniteExpansionComplete) return;
        if (this.onTickReferenceInfiniteExpansion(tick)) return;
        if (tick < 532 + getOpeningAutomationTickOffset()) return;

        const cycle = Math.floor(tick / 100) + 1;
        const tickInCycle = tick % 100;
        if (cycle < INFINITE_EXPANSION_START_CYCLE) return;
        if (cycle > INFINITE_EXPANSION_END_CYCLE) {
            this.infiniteExpansionComplete = true;
            this.infiniteExpansionActive = false;
            return;
        }

        if (cycle !== this.infiniteExpansionCycle) {
            this.infiniteExpansionCycle = cycle;
            this.infiniteExpansionPeakDeployedTroops = 0;
            this.infiniteExpansionLastAttackTick = -1;
        }

        if (tickInCycle >= INFINITE_EXPANSION_CANCEL_TICK) {
            if (this.infiniteExpansionLastCancelCycle !== cycle) {
                this.cancelFreeLandAttack();
                this.infiniteExpansionLastCancelCycle = cycle;
            }
            if (cycle >= INFINITE_EXPANSION_END_CYCLE) {
                this.infiniteExpansionComplete = true;
                this.infiniteExpansionActive = false;
            }
            return;
        }

        const startTick = cycle < 8 ? 2 : 0;
        if (tickInCycle < startTick) return;

        if (!this.hasFreeLandAroundPlayer()) {
            this.handoffInfiniteExpansionToBotAttacks(tick);
            return;
        }

        if (this.infiniteExpansionLastAttackTick === tick) return;

        const deployedTroops = Math.max(0, Number(this.getDeployedTroops?.() || 0));
        if (deployedTroops > getInfiniteExpansionMaxDeployedTroops(cycle)) return;
        this.infiniteExpansionPeakDeployedTroops = Math.max(this.infiniteExpansionPeakDeployedTroops, deployedTroops);
        if (
            this.infiniteExpansionPeakDeployedTroops > 0
            && deployedTroops / this.infiniteExpansionPeakDeployedTroops > INFINITE_EXPANSION_REFILL_RATIO
        ) {
            return;
        }

        const percent = cycle >= 8 ? INFINITE_EXPANSION_ATTACK_PERCENT : 0.30;
        this.setInfiniteExpansionAttackPercent(percent);
        this.attack();
        this.infiniteExpansionLastAttackTick = tick;
    };

    this.onTickAutoAttack = function (tick) {
        const mode = this.getAutoAttackMode();
        if (mode === "off") {
            this.clearAutoAttackTimers();
            return;
        }
        if (!getVar("gameState")) return;

        const startCycle = Number(getSettings().autoAttackLowDensityBotsStartCycle || 8);
        const startTick = this.autoAttackStartOverrideTick >= 0
            ? Math.min(startCycle * 100, this.autoAttackStartOverrideTick)
            : startCycle * 100;
        if (tick < startTick) return;

        const cycle = Math.floor(tick / 100);
        const tickInCycle = tick - cycle * 100;
        if (cycle !== this.autoAttackCycle) {
            this.autoAttackCycle = cycle;
            this.autoAttackCount = 0;
            this.autoAttackReservedAttackUsed = false;
            this.autoAttackLastTick = -1;
            this.autoAttackLastAttackTime = -Infinity;
            this.autoAttackCheckSlot = 0;
            this.safeBotDensityTracker.clear();
            this.autoAttackRecentTargets.clear();
            this.clearAutoAttackTimers();
            if (mode === "safe") {
                if (!this.autoAttackInitializedPercent) {
                    window.__fx.keybindFunctions.setAbsolute(0.12);
                    this.autoAttackInitializedPercent = true;
                } else {
                    window.__fx.keybindFunctions.setRelative(KEY_RATIOS.a);
                }
                window.__fx.keybindFunctions.repaintAttackPercentageBar();
            } else if (mode === "best") {
                if (!this.autoAttackInitializedPercent) {
                    window.__fx.keybindFunctions.setAbsolute(0.12);
                    this.autoAttackInitializedPercent = true;
                    window.__fx.keybindFunctions.repaintAttackPercentageBar();
                }
            }
        }

        if (mode === "safe") {
            while (this.autoAttackCheckSlot < 24 && tickInCycle >= Math.round(this.autoAttackCheckSlot * 100 / 24)) {
                const checkSlot = this.autoAttackCheckSlot++;
                if (checkSlot % 3 !== 0) continue;
                if (this.autoAttackCount >= 8) {
                    this.cancelBadAutomatedBotAttacks(tick);
                    return;
                }
                const safePercent = Number(window.__fx.keybindFunctions.getAttackPercentage?.() || 0.12);
                const selection = this.findBestDynamicBotAttackTarget(tick, {
                    mode,
                    fixedPercent: safePercent,
                    forceBest: true
                });
                if (!selection || selection.target < 0) {
                    this.cancelBadAutomatedBotAttacks(tick);
                    continue;
                }
                const attackSnapshot = this.getBotAttackSnapshot(selection.target);
                if (attackSnapshot) {
                    const playerTroops = Number(attackSnapshot.playerTroops || 0);
                    attackSnapshot.attackPercent = Number(safePercent.toFixed(4));
                    attackSnapshot.attackTroops = Math.floor(playerTroops * safePercent);
                }
                const attackAccepted = this.attackPlayer(selection.target);
                if (!attackAccepted) {
                    this.cancelBadAutomatedBotAttacks(tick);
                    continue;
                }
                const attackEvent = this.recordBotAttackTelemetry(selection.target, {
                    snapshot: attackSnapshot,
                    mode,
                    kind: selection.forced ? "safe-forced" : "safe-slot",
                    autoAttackCount: this.autoAttackCount,
                    checkSlot,
                    cycleProgress: tickInCycle / 100,
                    fixedSafeAttackPercent: safePercent,
                    score: selection.score,
                    oneShotRatio: selection.oneShotRatio
                });
                this.trackAutomatedBotAttack(selection.target, attackSnapshot);
                this.scheduleBotAttackOutcomeCheck(attackEvent, selection.target);
                this.autoAttackRecentTargets.set(selection.target, tick);
                this.autoAttackLastTick = tick;
                this.autoAttackCount++;
                this.cancelBadAutomatedBotAttacks(tick);
            }
            return;
        }

        if (mode === "best") {
            const now = performance.now();
            if (now - this.autoAttackLastAttackTime < getBestAttackIntervalMs()) return;
            const target = this.findSimpleBestBotAttackTarget(tick);
            if (target < 0) return;
            const attackSnapshot = this.getBotAttackSnapshot(target);
            const attackAccepted = this.attackPlayer(target);
            if (!attackAccepted) return;
            const attackEvent = this.recordBotAttackTelemetry(target, {
                snapshot: attackSnapshot,
                mode,
                kind: "simple-best-interval",
                autoAttackCount: this.autoAttackCount,
                cycleProgress: tickInCycle / 100
            });
            this.scheduleBotAttackOutcomeCheck(attackEvent, target);
            this.autoAttackRecentTargets.set(target, tick);
            this.autoAttackLastTick = tick;
            this.autoAttackLastAttackTime = now;
            this.autoAttackCount++;
            return;
        }

        if (mode === "raw") {
            if (this.autoAttackCount >= 10) return;
            while (this.autoAttackCheckSlot < 22 && tickInCycle >= Math.round(this.autoAttackCheckSlot * 100 / 22)) {
                this.autoAttackCheckSlot++;
                if (this.autoAttackCount >= 10) return;
                if (!this.autoAttackInitializedPercent) {
                    window.__fx.keybindFunctions.setAbsolute(0.15);
                    window.__fx.keybindFunctions.repaintAttackPercentageBar();
                    this.autoAttackInitializedPercent = true;
                }
                const attackPercent = Number(window.__fx.keybindFunctions.getAttackPercentage?.() || 0.15);
                if (!this.autoAttackReservedAttackUsed) {
                    if (this.runWeakEncapsulatedBotAttack(tick, undefined, mode, "encapsulated")) {
                        this.autoAttackReservedAttackUsed = true;
                        continue;
                    }
                }
                const target = this.findBestLowDensityBorderingBot(tickInCycle / 100, mode, attackPercent, false);
                if (target < 0) continue;
                if (!this.isLiveLowDensityBotTarget(target, mode, false)) continue;
                const attackSnapshot = this.getBotAttackSnapshot(target);
                const attackAccepted = this.attackPlayer(target);
                if (!attackAccepted) continue;
                const attackEvent = this.recordBotAttackTelemetry(target, {
                    snapshot: attackSnapshot,
                    mode,
                    kind: "normal",
                    autoAttackCount: this.autoAttackCount,
                    checkSlot: this.autoAttackCheckSlot - 1,
                    cycleProgress: tickInCycle / 100
                });
                this.scheduleBotAttackOutcomeCheck(attackEvent, target);
                this.autoAttackRecentTargets.set(target, tick);
                this.autoAttackCount++;
            }
            return;
        }

        if (tickInCycle > 2 || this.autoAttackTimers.length) return;

        const schedule = mode === "raw"
            ? Array.from({ length: 22 }, (_, index) => index * 255)
            : (mode === "safe" || mode === "best")
                ? Array.from({ length: 15 }, (_, index) => 300 + index * 310)
                : Array.from({ length: 20 }, (_, index) => index * 280);
        const maxAttacks = mode === "safe" ? 4 : mode === "best" ? 7 : mode === "raw" ? 10 : 10;

        const firstAttackPercent = mode === "safe" ? 0.12 : mode === "best" ? 0.2 : mode === "raw" ? 0.15 : undefined;
        const attackPercent = this.autoAttackInitializedPercent
            ? undefined
            : firstAttackPercent;

        for (const delay of schedule) {
            const timer = setTimeout(() => {
                if (this.getAutoAttackMode() !== mode) return;
                if (this.autoAttackCount >= maxAttacks) return;
                const reservesEncapsulated = mode === "safe" || mode === "best";
                if (reservesEncapsulated && !this.autoAttackReservedAttackUsed) {
                    const reservedTarget = this.findFullsendEncapsulatedBot(attackPercent, mode);
                    if (reservedTarget >= 0) {
                        if (!this.isLiveLowDensityBotTarget(reservedTarget, mode, true)) return;
                        if (mode === "safe" || mode === "best") {
                            const rSel = window.__fx.openingAutomation.lastSafeReservedSelection;
                            if (rSel?.recommendedSendPercent) {
                                window.__fx.keybindFunctions.setAbsolute(rSel.recommendedSendPercent);
                                window.__fx.keybindFunctions.repaintAttackPercentageBar();
                                this.autoAttackInitializedPercent = true;
                            }
                        }
                        if (!this.autoAttackInitializedPercent) {
                            if (firstAttackPercent !== undefined) {
                                window.__fx.keybindFunctions.setAbsolute(firstAttackPercent);
                                window.__fx.keybindFunctions.repaintAttackPercentageBar();
                            }
                            this.autoAttackInitializedPercent = true;
                        }
                        const attackSnapshot = this.getBotAttackSnapshot(reservedTarget);
                        const attackAccepted = this.attackPlayer(reservedTarget);
                        if (!attackAccepted) return;
                        const attackEvent = this.recordBotAttackTelemetry(reservedTarget, {
                            snapshot: attackSnapshot,
                            mode,
                            kind: "reserved",
                            autoAttackCount: this.autoAttackCount,
                            scheduledDelay: delay,
                            cycleProgress: Math.min(0.99, (tickInCycle / 100) + (delay / 5600))
                        });
                        this.scheduleBotAttackOutcomeCheck(attackEvent, reservedTarget);
                        this.autoAttackRecentTargets.set(reservedTarget, performance.now());
                        if (mode === "safe" || mode === "best") {
                            this.recordSafeTelemetry({
                                type: "safe-attack",
                                kind: "reserved",
                                target: reservedTarget,
                                selection: window.__fx.openingAutomation.lastSafeReservedSelection || null
                            });
                            const _reserved = reservedTarget;
                            setTimeout(() => {
                                const land = window.__fx.openingAutomation.getTargetLand?.(_reserved) ?? -1;
                                const troops = window.__fx.openingAutomation.getTargetTroops?.(_reserved) ?? -1;
                                this.recordSafeTelemetry({ type: "safe-conquest-check", target: _reserved, conquered: land <= 0, remainingLand: land, remainingTroops: troops });
                            }, 6000);
                        }
                        this.autoAttackReservedAttackUsed = true;
                        this.autoAttackCount++;
                        return;
                    }
                    if (this.autoAttackCount >= maxAttacks - 1) return;
                }
                const cycleProgress = Math.min(0.99, (tickInCycle / 100) + (delay / 5600));
                const target = this.findBestLowDensityBorderingBot(cycleProgress, mode, attackPercent, mode === "safe" || mode === "best");
                if (target < 0) return;
                if (!this.isLiveLowDensityBotTarget(target, mode, false)) return;
                if (mode === "safe" || mode === "best") {
                    const nSel = window.__fx.openingAutomation.lastSafeNormalSelection;
                    if (nSel?.recommendedSendPercent) {
                        window.__fx.keybindFunctions.setAbsolute(nSel.recommendedSendPercent);
                        window.__fx.keybindFunctions.repaintAttackPercentageBar();
                        this.autoAttackInitializedPercent = true;
                    }
                }
                if (!this.autoAttackInitializedPercent) {
                    if (firstAttackPercent !== undefined) {
                        window.__fx.keybindFunctions.setAbsolute(firstAttackPercent);
                        window.__fx.keybindFunctions.repaintAttackPercentageBar();
                    }
                    this.autoAttackInitializedPercent = true;
                }
                const attackSnapshot = this.getBotAttackSnapshot(target);
                const attackAccepted = this.attackPlayer(target);
                if (!attackAccepted) return;
                const attackEvent = this.recordBotAttackTelemetry(target, {
                    snapshot: attackSnapshot,
                    mode,
                    kind: "normal",
                    autoAttackCount: this.autoAttackCount,
                    scheduledDelay: delay,
                    cycleProgress
                });
                this.scheduleBotAttackOutcomeCheck(attackEvent, target);
                this.autoAttackRecentTargets.set(target, performance.now());
                if (mode === "safe" || mode === "best") {
                    this.recordSafeTelemetry({
                        type: "safe-attack",
                        kind: "normal",
                        target,
                        selection: window.__fx.openingAutomation.lastSafeNormalSelection || null
                    });
                    const _target = target;
                    setTimeout(() => {
                        const land = window.__fx.openingAutomation.getTargetLand?.(_target) ?? -1;
                        const troops = window.__fx.openingAutomation.getTargetTroops?.(_target) ?? -1;
                        this.recordSafeTelemetry({ type: "safe-conquest-check", target: _target, conquered: land <= 0, remainingLand: land, remainingTroops: troops });
                    }, 6000);
                }
                this.autoAttackCount++;
            }, delay);
            this.autoAttackTimers.push(timer);
        }
    };
})();

export function OpeningAutomationInput(containerElement) {
    containerElement.className = "opening-automation-input";

    const header = document.createElement("p");
    header.innerText = "Opening Automation";

    const offsetLabel = document.createElement("label");
    offsetLabel.append("Tick offset ");
    const offsetInput = document.createElement("input");
    offsetInput.type = "number";
    offsetInput.step = "0.1";
    offsetInput.value = getSettings().openingAutomationTickOffset || "0";
    offsetInput.addEventListener("input", () => {
        getSettings().openingAutomationTickOffset = offsetInput.value;
    });
    offsetLabel.append(offsetInput);

    const textarea = document.createElement("textarea");
    textarea.spellcheck = false;
    textarea.value = getSettings().openingAutomationStrategy || JSON.stringify(DEFAULT_STRATEGY, null, 2);
    textarea.addEventListener("input", () => {
        getSettings().openingAutomationStrategy = textarea.value;
    });

    const validateButton = document.createElement("button");
    validateButton.innerText = "Validate opening";
    validateButton.addEventListener("click", () => {
        try {
            normalizeStrategy(JSON.parse(textarea.value), Number(offsetInput.value || 0));
            getSettings().openingAutomationStrategy = textarea.value;
            getSettings().openingAutomationTickOffset = offsetInput.value;
            alert("Opening strategy is valid");
        } catch (error) {
            alert("Opening strategy error:\n" + error.message);
        }
    });

    containerElement.append(header, offsetLabel, document.createElement("br"), textarea, document.createElement("br"), validateButton);

    this.update = function (newSettings) {
        offsetInput.value = newSettings.openingAutomationTickOffset || "0";
        textarea.value = newSettings.openingAutomationStrategy || JSON.stringify(DEFAULT_STRATEGY, null, 2);
    };
}

export function openingAutomationKeyHandler() {
    return false;
}

export default openingAutomation;
