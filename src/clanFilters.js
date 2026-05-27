import { getVar } from "./gameInterface.js";

export const leaderboardFilter = new (function() {
    this.playersToInclude = [];
    this.tabLabels = ["ALL", "CLAN", "RIVAL"];
    this.filteredLeaderboard = [];
    this.rivalLeaderboard = [];
    this.rivalHasChanged = true;
    this.tabBarOffset = 0;
    this.windowWidth = 0;
    this.verticalClickThreshold = 1000;
    this.hoveringOverTabs = false;
    this.scrollToTop = () => {};
    this.repaintLeaderboard = () => {};
    this.setUpdateFlag = () => {};
    this.parseClanFromPlayerName = () => null;

    this.selectedTab = 0;
    this.tabHovering = -1;
    this.enabled = false;
    this.rivalEnabled = false;

    this.drawTabs = function(canvas, totalWidth, verticalOffset, colorForSelectedTab) {
        canvas.textBaseline = "middle";
        canvas.textAlign = "center";
        const tabWidth = totalWidth / this.tabLabels.length;
        const textOffsetY = verticalOffset + this.tabBarOffset / 2;
        this.tabLabels.forEach((label, index) => {
            if (index !== 0) canvas.fillRect(tabWidth * index, verticalOffset, 1, this.tabBarOffset);
            if (this.selectedTab === index) {
                canvas.fillStyle = colorForSelectedTab;
                canvas.fillRect(tabWidth * index, verticalOffset, tabWidth, this.tabBarOffset);
                canvas.fillStyle = "rgb(255,255,255)";
            }
            if (this.tabHovering === index) {
                canvas.fillStyle = "rgba(255,255,255,0.3)";
                canvas.fillRect(tabWidth * index, verticalOffset, tabWidth, this.tabBarOffset);
                canvas.fillStyle = "rgb(255,255,255)";
            }
            canvas.fillText(label, tabWidth * index + tabWidth / 2, textOffsetY);
        });
    };

    this.setHovering = (isHovering, xRelative) => {
        let repaintNeeded = false;
        if (isHovering) {
            const tab = Math.floor(xRelative / (this.windowWidth / this.tabLabels.length));
            if (this.tabHovering !== tab) {
                this.tabHovering = tab;
                repaintNeeded = true;
            }
        }
        if (isHovering !== this.hoveringOverTabs) {
            this.hoveringOverTabs = isHovering;
            if (!isHovering) this.tabHovering = -1;
            repaintNeeded = true;
        }
        if (repaintNeeded) this.repaintLeaderboard();
        return isHovering;
    };

    this.handleMouseDown = (xRelative) => {
        const tab = Math.floor(xRelative / (this.windowWidth / this.tabLabels.length));
        if (this.selectedTab !== tab) {
            this.selectedTab = tab;
            if (this.selectedTab === 0) this.clearFilter();
            else if (this.selectedTab === 1) {
                this.filterByOwnClan();
                this.setUpdateFlag();
            } else if (this.selectedTab === 2) {
                this.showRivals();
                this.setUpdateFlag();
            }
            this.repaintLeaderboard();
        }
        return true;
    };

    this.filterByOwnClan = () => {
        this.playersToInclude = [];
        const playerId = getVar("playerId");
        const ownClan = this.parseClanFromPlayerName(getVar("rawPlayerNames")[playerId]);
        if (ownClan === null) {
            this.clearFilter();
            return;
        }
        getVar("rawPlayerNames").forEach((name, id) => {
            if (id === playerId || this.parseClanFromPlayerName(name) === ownClan) this.playersToInclude.push(id);
        });
        this.enabled = true;
        this.rivalEnabled = false;
        this.scrollToTop();
    };

    this.showRivals = () => {
        this.enabled = false;
        this.rivalEnabled = true;
        this.updateRivalLeaderboard();
        this.scrollToTop();
    };

    this.updateRivalLeaderboard = () => {
        if (!this.rivalHasChanged) return this.rivalLeaderboard;
        const names = getVar("rawPlayerNames") || [];
        const territories = getVar("playerTerritories") || [];
        const gHumans = Number(getVar("gHumans") || 0);
        const clanTotals = new Map();
        for (let id = 0; id < gHumans; id++) {
            const tag = this.parseClanFromPlayerName(names[id]);
            if (!tag || tag.length > 7) continue;
            const land = Number(territories[id] || 0);
            if (land <= 0) continue;
            const record = clanTotals.get(tag) || { tag, land: 0, representativePlayerId: id, representativeLand: 0 };
            record.land += land;
            if (land > record.representativeLand) {
                record.representativeLand = land;
                record.representativePlayerId = id;
            }
            clanTotals.set(tag, record);
        }
        this.rivalLeaderboard = Array.from(clanTotals.values())
            .sort((a, b) => b.land - a.land || a.tag.localeCompare(b.tag));
        this.rivalHasChanged = false;
        return this.rivalLeaderboard;
    };

    this.drawRivalRows = (canvas, position, visibleRows, font, getColorForPlayer) => {
        const rows = this.updateRivalLeaderboard();
        canvas.font = font;
        const width = canvas.canvas?.width || this.windowWidth || 1;
        const height = canvas.canvas?.height || 1;
        const topPadding = 0.025 * width;
        const titleHeight = 0.16 * width;
        const rowHeight = (height - this.tabBarOffset - titleHeight - 2 * topPadding) / Math.max(1, visibleRows);
        const baseY = topPadding + titleHeight;
        const rankX = Math.floor(0.04 * width);
        const nameX = Math.floor(0.18 * width);
        const landX = width - rankX;
        for (let row = 0; row < visibleRows; row++) {
            const entry = rows[position + row];
            if (!entry) continue;
            const y = Math.floor(baseY + (row + 0.5) * rowHeight);
            canvas.fillStyle = typeof getColorForPlayer === "function"
                ? getColorForPlayer(entry.representativePlayerId)
                : "rgb(255,255,255)";
            canvas.textAlign = "left";
            canvas.fillText(`${position + row + 1}.`, rankX, y);
            canvas.fillText(`[${entry.tag}]`, nameX, y);
            canvas.textAlign = "right";
            canvas.fillText(entry.land, landX, y);
        }
    };

    this.clearFilter = () => {
        this.enabled = false;
        this.rivalEnabled = false;
    };

    this.reset = () => {
        this.enabled = false;
        this.rivalEnabled = false;
        this.selectedTab = 0;
        clanFilter.refresh();
    };
});

export const clanFilter = new (function() {
    this.inOwnClan = new Array(512);
    this.inOwnClan.fill(false);
    this.refresh = () => {
        const gHumans = getVar("gHumans");
        const ownClan = leaderboardFilter.parseClanFromPlayerName(getVar("rawPlayerNames")[getVar("playerId")]);
        if (ownClan === null) this.inOwnClan.fill(false);
        else getVar("rawPlayerNames").forEach((name, id) => {
            this.inOwnClan[id] = id < gHumans && leaderboardFilter.parseClanFromPlayerName(name) === ownClan;
        });
    };
});
