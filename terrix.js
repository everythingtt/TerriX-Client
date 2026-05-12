// ==UserScript==
// @name         TerriX Executor v3.0
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Ultimate Strategy Suite. Complete rewrite with neighbor-based AI, ESP, minimap, and multi-tab support.
// @author       Terri Exploits Inc.
// @match        *://territorial.io/*
// @match        *://everythingtt.github.io/TerriX-Client/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const TERRIX = {
        version: '3.0.0',
        initialized: false,
        hooked: false,
        loops: {},
        gui: null,
        config: {
            godbot: {
                enabled: false,
                expandRatio: 2.0,
                attackRatio: 4.0,
                peaceThreshold: 0.52,
                tickRate: 800,
                strategy: 'balanced',
                maxTargets: 3,
                retreatRatio: 0.3,
                focusWeakest: true,
                onlyAttackNeighbors: true,
                queueAttacks: true,
                queueDelay: 150
            },
            esp: {
                enabled: false,
                showTroops: true,
                showNames: true,
                showBorders: false,
                colorCode: true
            },
            minimap: {
                enabled: false,
                size: 180,
                position: 'bottom-right',
                opacity: 0.85,
                showTroops: true,
                showTargets: true
            },
            multitab: {
                enabled: false,
                proxyUrl: '',
                syncAttack: true
            },
            ui: {
                theme: 'terrix'
            }
        }
    };

    const THEMES = {
        terrix: {
            name: 'TerriX Dark',
            bg: 'rgba(5,5,10,0.97)',
            bgHeader: 'rgba(15,15,25,1)',
            bgSidebar: 'rgba(10,10,18,1)',
            bgMain: 'rgba(8,8,15,1)',
            bgFooter: 'rgba(8,8,15,1)',
            bgEditor: '#0a0a0f',
            bgOutput: 'rgba(5,5,10,1)',
            bgTabActive: 'rgba(58,71,255,0.3)',
            bgTabHover: 'rgba(60,60,80,0.9)',
            bgToggleBar: '#0a1a0a',
            bgBtn: 'rgba(40,40,60,0.9)',
            bgBtnPrimary: 'rgba(58,71,255,0.4)',
            bgBtnSuccess: 'rgba(40,140,40,0.4)',
            bgBtnDanger: 'rgba(180,40,40,0.4)',
            bgConfigInput: '#111',
            bgScriptItem: 'rgba(20,20,35,0.9)',
            bgBarTrack: '#111',
            bgBarFill: '#3a47ff',
            bgMeBarFill: '#ffd700',
            colorText: '#eee',
            colorTextDim: '#999',
            colorTextMuted: '#666',
            colorTextAccent: '#ccc',
            colorTextGreen: '#0f0',
            colorTextRed: '#f44',
            colorTextYellow: '#ffd700',
            colorBorder: '#3a47ff',
            colorBorderLight: '#333',
            colorBorderMuted: '#222',
            colorBorderBtn: '#444',
            colorBorderBtnPrimary: '#3a47ff',
            colorBorderBtnSuccess: '#484',
            colorBorderBtnDanger: '#844',
            colorBorderScript: '#333',
            colorToggleOn: '#0f0',
            colorToggleOff: '#666',
            colorToggleTrackOn: '#1a5a1a',
            colorNavActive: '#fff',
            colorNavInactive: '#aaa',
            toggleBarBorder: '#0f0',
            toggleBarText: '#0f0',
            toggleBarHover: '#1a3a1a',
            shadowGlow: 'rgba(58,71,255,0.3)',
            shadowBox: 'rgba(0,0,0,0.8)',
            editorText: '#0f0',
            outputText: '#888',
            outputBorder: '#222',
            footerBorder: '#222',
            statusOnline: '#0f0',
            statusOffline: '#f44',
            closeHover: '#f44',
            verColor: '#3a47ff',
            sectionTitle: '#3a47ff',
            scriptName: '#fff',
            scriptDesc: '#666',
            configLabel: '#999',
            configInputText: '#ddd',
            toastBg: 'rgba(0,0,0,0.9)',
            toastBorder: '#3a47ff',
            toastText: '#fff',
            minimapBorder: '#3a47ff',
            minimapShadow: 'rgba(0,0,0,0.5)',
            debugBg: 'rgba(0,0,0,0.9)',
            debugBorder: '#333',
            debugText: '#0f0',
            rankNum: '#666',
            meName: '#ffd700',
            barValText: '#fff',
            barRank: '#666',
            barName: '#ccc',
            barFill: '#3a47ff',
            meBarFill: '#ffd700',
            barTrack: '#111',
            barBorder: '#222',
            btnText: '#ccc',
            btnTextPrimary: '#fff',
            btnTextDanger: '#faa',
            btnTextSuccess: '#afa',
            btnHoverText: '#fff',
            btnHoverBg: 'rgba(60,60,80,0.9)',
            btnHoverPrimary: 'rgba(58,71,255,0.6)',
            btnHoverDanger: 'rgba(180,40,40,0.6)',
            btnHoverSuccess: 'rgba(40,140,40,0.6)',
            configInputBorder: '#333',
            configInputFocusBorder: '#3a47ff',
            toggleTrackOff: '#222',
            toggleTrackOn: '#1a5a1a',
            toggleBorderOff: '#444',
            toggleBorderOn: '#0a0',
            toggleKnobOff: '#666',
            toggleKnobOn: '#0f0',
            selectBg: '#111',
            selectText: '#ddd',
            selectBorder: '#333',
            selectWidth: '100px',
            selectInputWidth: '80px'
        },
        territorial: {
            name: 'Territorial.io',
            bg: 'rgba(0,0,0,0.88)',
            bgHeader: 'rgba(0,0,0,0.92)',
            bgSidebar: 'rgba(0,0,0,0.90)',
            bgMain: 'rgba(0,0,0,0.85)',
            bgFooter: 'rgba(0,0,0,0.92)',
            bgEditor: 'rgba(0,0,0,0.92)',
            bgOutput: 'rgba(0,0,0,0.92)',
            bgTabActive: 'rgba(70,50,0,0.85)',
            bgTabHover: 'rgba(60,60,60,0.85)',
            bgToggleBar: 'rgba(0,70,0,0.85)',
            bgBtn: 'rgba(60,0,60,0.85)',
            bgBtnPrimary: 'rgba(0,70,0,0.85)',
            bgBtnSuccess: 'rgba(0,70,0,0.85)',
            bgBtnDanger: 'rgba(100,0,0,0.85)',
            bgConfigInput: 'rgba(0,0,0,0.70)',
            bgScriptItem: 'rgba(0,0,0,0.80)',
            bgBarTrack: 'rgba(0,0,0,0.85)',
            bgBarFill: 'rgba(0,180,0,0.85)',
            bgMeBarFill: 'rgba(180,150,0,0.85)',
            colorText: 'rgb(255,255,255)',
            colorTextDim: 'rgb(180,180,180)',
            colorTextMuted: 'rgb(120,120,120)',
            colorTextAccent: 'rgb(225,225,255)',
            colorTextGreen: 'rgb(10,255,255)',
            colorTextRed: 'rgb(255,120,120)',
            colorTextYellow: 'rgb(255,200,50)',
            colorBorder: 'rgb(255,255,255)',
            colorBorderLight: 'rgba(255,255,255,0.5)',
            colorBorderMuted: 'rgba(255,255,255,0.25)',
            colorBorderBtn: 'rgb(255,255,255)',
            colorBorderBtnPrimary: 'rgb(255,255,255)',
            colorBorderBtnSuccess: 'rgb(255,255,255)',
            colorBorderBtnDanger: 'rgb(255,255,255)',
            colorBorderScript: 'rgba(255,255,255,0.4)',
            colorToggleOn: 'rgb(0,230,0)',
            colorToggleOff: 'rgb(100,100,100)',
            colorToggleTrackOn: 'rgba(0,100,0,0.6)',
            colorNavActive: 'rgb(255,255,255)',
            colorNavInactive: 'rgb(180,180,180)',
            toggleBarBorder: 'rgb(255,255,255)',
            toggleBarText: 'rgb(255,255,255)',
            toggleBarHover: 'rgba(0,100,0,0.85)',
            shadowGlow: 'rgba(0,0,0,0.6)',
            shadowBox: 'rgba(0,0,0,0.9)',
            editorText: 'rgb(10,255,255)',
            outputText: 'rgb(180,180,180)',
            outputBorder: 'rgba(255,255,255,0.3)',
            footerBorder: 'rgba(255,255,255,0.3)',
            statusOnline: 'rgb(0,230,0)',
            statusOffline: 'rgb(255,80,80)',
            closeHover: 'rgb(255,100,100)',
            verColor: 'rgb(10,255,255)',
            sectionTitle: 'rgb(255,255,255)',
            scriptName: 'rgb(255,255,255)',
            scriptDesc: 'rgb(150,150,150)',
            configLabel: 'rgb(200,200,200)',
            configInputText: 'rgb(255,255,255)',
            toastBg: 'rgba(0,0,0,0.92)',
            toastBorder: 'rgb(255,255,255)',
            toastText: 'rgb(255,255,255)',
            minimapBorder: 'rgb(255,255,255)',
            minimapShadow: 'rgba(0,0,0,0.7)',
            debugBg: 'rgba(0,0,0,0.95)',
            debugBorder: 'rgba(255,255,255,0.3)',
            debugText: 'rgb(10,255,255)',
            rankNum: 'rgb(150,150,150)',
            meName: 'rgb(255,200,50)',
            barValText: 'rgb(255,255,255)',
            barRank: 'rgb(150,150,150)',
            barName: 'rgb(225,225,255)',
            barFill: 'rgb(0,180,0)',
            meBarFill: 'rgb(180,150,0)',
            barTrack: 'rgba(0,0,0,0.85)',
            barBorder: 'rgba(255,255,255,0.3)',
            btnText: 'rgb(255,255,255)',
            btnTextPrimary: 'rgb(255,255,255)',
            btnTextDanger: 'rgb(255,255,255)',
            btnTextSuccess: 'rgb(255,255,255)',
            btnHoverText: 'rgb(255,255,255)',
            btnHoverBg: 'rgba(80,80,80,0.9)',
            btnHoverPrimary: 'rgba(0,100,0,0.9)',
            btnHoverDanger: 'rgba(140,0,0,0.9)',
            btnHoverSuccess: 'rgba(0,100,0,0.9)',
            configInputBorder: 'rgb(255,255,255)',
            configInputFocusBorder: 'rgb(10,255,255)',
            toggleTrackOff: 'rgba(50,50,50,0.8)',
            toggleTrackOn: 'rgba(0,100,0,0.5)',
            toggleBorderOff: 'rgba(255,255,255,0.4)',
            toggleBorderOn: 'rgb(0,230,0)',
            toggleKnobOff: 'rgb(150,150,150)',
            toggleKnobOn: 'rgb(0,255,0)',
            selectBg: 'rgba(0,0,0,0.70)',
            selectText: 'rgb(255,255,255)',
            selectBorder: 'rgb(255,255,255)',
            selectWidth: '120px',
            selectInputWidth: '80px'
        }
    };

    function getCurrentTheme() {
        const name = TERRIX.config.ui && TERRIX.config.ui.theme;
        return THEMES[name] || THEMES.terrix;
    }

    function loadConfig() {
        try {
            const saved = GM_getValue('terrix_config');
            if (saved) {
                const parsed = JSON.parse(saved);
                Object.assign(TERRIX.config, parsed);
            }
        } catch(e) {}
    }

    function saveConfig() {
        try {
            GM_setValue('terrix_config', JSON.stringify(TERRIX.config));
        } catch(e) {}
    }

    loadConfig();

    const _win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    const PropResolver = {
        _cache: {},

        resetCache() { this._cache = {}; },

        resolve(obj, candidates, preferType) {
            if (!obj) return null;
            const cacheKey = candidates.join(',');
            if (this._cache[cacheKey]) return this._cache[cacheKey];
            const props = Object.getOwnPropertyNames(obj);
            for (const c of candidates) {
                if (props.includes(c) && obj[c] != null) {
                    if (preferType && !(obj[c] instanceof preferType) && !Array.isArray(obj[c]) && typeof obj[c] !== preferType) continue;
                    this._cache[cacheKey] = c;
                    return c;
                }
            }
            return null;
        },

        resolveAgProp(candidates) {
            const G = _win.G;
            if (!G || !G.ag) return null;
            return this.resolve(G.ag, candidates);
        },

        resolveTypedArray(candidates) {
            return this.resolveAgProp(candidates);
        }
    };

    const GameInterface = {
        get G() { return _win.G; },

        get myId() {
            const G = this.G;
            return G && G.aD ? G.aD.et : -1;
        },

        get maxPlayers() {
            const G = this.G;
            return G && G.aD ? G.aD.f6 : 512;
        },

        getMyTroops() {
            const G = this.G;
            if (!G || !G.ag) return 0;
            const prop = PropResolver.resolveTypedArray(['hB','gx','h7','gt']) || 'hB';
            return G.ag[prop][this.myId] || 0;
        },

        getMyTerritory() {
            const G = this.G;
            if (!G || !G.ag) return 0;
            const prop = PropResolver.resolveTypedArray(['gx','hB','h7','gt','j2']) || 'gx';
            return G.ag[prop][this.myId] || 0;
        },

        getMyScore(playerId) {
            const G = this.G;
            if (!G) return 0;
            // kA is on ae (score/stats object), not on aD
            const scoreObj = G.ae || G.aD;
            if (!scoreObj || typeof scoreObj.kA !== 'function') return 0;
            try { return scoreObj.kA(playerId ?? this.myId) || 0; } catch(e) { return 0; }
        },

        getPlayerTroops(id) {
            const G = this.G;
            if (!G || !G.ag) return 0;
            const prop = PropResolver.resolveTypedArray(['hB','gx','h7','gt']) || 'hB';
            return G.ag[prop][id] || 0;
        },

        getPlayerTerritory(id) {
            const G = this.G;
            if (!G || !G.ag) return 0;
            const prop = PropResolver.resolveTypedArray(['gx','hB','h7','gt','j2']) || 'gx';
            return G.ag[prop][id] || 0;
        },

        isPlayerAlive(id) {
            const G = this.G;
            if (!G || !G.ag) return false;
            const prop = PropResolver.resolveTypedArray(['n4','a4W','a1h','n3','mz']) || 'n4';
            return (G.ag[prop][id] || 0) !== 0;
        },

        getPlayerName(id) {
            const G = this.G;
            if (!G || !G.ag) return 'Bot';
            const prop = PropResolver.resolveAgProp(['za','a1o','zb','zU','name','names']) || 'za';
            return G.ag[prop][id] || 'Bot';
        },

        getPlayerTeam(id) {
            const G = this.G;
            if (!G || !G.bi) return 0;
            return G.bi.f7[id] || 0;
        },

        areAllies(p1, p2) {
            const G = this.G;
            if (!G) return false;
            try {
                if (G.bu && typeof G.bu.hi === 'function') return G.bu.hi(p1, p2);
                if (G.bu && typeof G.bu.f2 === 'function') return !G.bu.f2(p1, p2);
                if (G.bi && G.bi.f7) return G.bi.f7[p1] === G.bi.f7[p2];
            } catch(e) {}
            return false;
        },

        sameTeam(p1, p2) {
            return this.getPlayerTeam(p1) === this.getPlayerTeam(p2);
        },

        getBorderTiles(id) {
            const G = this.G;
            if (!G || !G.ag) return [];
            const prop = PropResolver.resolveAgProp(['gb','gp','gq','fY']) || 'gb';
            return (G.ag[prop] && G.ag[prop][id]) || [];
        },

        getAllTiles(id) {
            const G = this.G;
            if (!G || !G.ag) return [];
            const prop = PropResolver.resolveAgProp(['gq','gb','gp','fY']) || 'gq';
            return (G.ag[prop] && G.ag[prop][id]) || [];
        },

        getLandTiles(id) {
            const G = this.G;
            if (!G || !G.ag) return [];
            const prop = PropResolver.resolveAgProp(['fY','gq','gb','gp']) || 'fY';
            return (G.ag[prop] && G.ag[prop][id]) || [];
        },

        getPerimeterTiles(id) {
            const G = this.G;
            if (!G || !G.ag) return [];
            const prop = PropResolver.resolveAgProp(['gp','gb','gq','fY']) || 'gp';
            return (G.ag[prop] && G.ag[prop][id]) || [];
        },

        getMapSize() {
            const G = this.G;
            if (!G || !G.bU) return { w: 2048, h: 2048 };
            return { w: G.bU.fK, h: G.bU.fL };
        },

        getTileOwner(encoded) {
            const G = this.G;
            if (!G || !G.ac) return -1;
            return G.ac.f1(encoded);
        },

        isNeutral(encoded) {
            const G = this.G;
            if (!G || !G.ac) return false;
            return G.ac.f0(encoded);
        },

        isWalkable(encoded) {
            const G = this.G;
            if (!G || !G.ac) return false;
            return G.ac.f4(encoded);
        },

        isBorderTile(encoded) {
            const G = this.G;
            if (!G || !G.ac) return false;
            return G.ac.gj(encoded);
        },

        isMountain(encoded) {
            const G = this.G;
            if (!G || !G.ac) return false;
            return G.ac.fE(encoded);
        },

        getNeighbors(encoded) {
            const G = this.G;
            if (!G || !G.ac || !G.ac.fB) return [];
            const fB = G.ac.fB;
            const result = [];
            for (let i = 0; i < 4; i++) {
                const n = encoded + fB[i];
                if (G.ac.iN ? G.ac.iN(n) : true) {
                    result.push(n);
                }
            }
            return result;
        },

        getDirectionOffsets() {
            const G = this.G;
            if (!G || !G.ac || !G.ac.fB) return [-1, 1, -2048, 2048];
            return Array.from(G.ac.fB);
        },

        tileToXY(encoded) {
            const G = this.G;
            if (!G) return { x: 0, y: 0 };
            const mapW = (G.bU && G.bU.fK) || 512;
            // Try ac.zC/ac.zD first (map tile access object)
            if (G.ac && typeof G.ac.zC === 'function') return { x: G.ac.zC(encoded), y: G.ac.zD(encoded) };
            // Try bO.fH/bO.fJ (map utility object)
            if (G.bO && typeof G.bO.fH === 'function') return { x: G.bO.fH(encoded), y: G.bO.fJ(encoded) };
            // Fallback: manual computation (encoded = tileId * 4, tileId = y * mapW + x)
            return { x: (encoded >> 2) % mapW, y: Math.floor((encoded >> 2) / mapW) };
        },

        xyToTile(x, y) {
            const G = this.G;
            if (!G) return 0;
            const mapW = (G.bU && G.bU.fK) || 512;
            // Try ac.yk first
            if (G.ac && typeof G.ac.yk === 'function') return G.ac.yk(x, y);
            // Try bO.fW
            if (G.bO && typeof G.bO.fW === 'function') return G.bO.fW(x, y);
            // Fallback: manual computation
            return (y * mapW + x) * 4;
        },

        tileToEncoded(tileId) {
            const G = this.G;
            if (!G || !G.ac) return tileId << 2;
            return G.ac.ez(tileId);
        },

        encodedToTile(encoded) {
            const G = this.G;
            if (!G || !G.ac) return encoded >> 2;
            return G.ac.ex(encoded);
        },

        sendAttack(intensity, targetId) {
            const G = this.G;
            if (!G) return false;
            try {
                const hZ = G.bA && G.bA.hZ;
                if (hZ && typeof hZ.hg === 'function') {
                    hZ.hg(this.myId, Math.floor(intensity), targetId);
                    return true;
                }
                if (G.b8 && typeof G.b8.hg === 'function') {
                    G.b8.hg(this.myId, Math.floor(intensity), targetId);
                    return true;
                }
            } catch(e) { Logger.error('sendAttack failed:', e.message); }
            return false;
        },

        sendAttackTile(intensity, tile, targetId) {
            const G = this.G;
            if (!G) return false;
            try {
                const hZ = G.bA && G.bA.hZ;
                if (hZ && typeof hZ.hc === 'function') {
                    hZ.hc(this.myId, Math.floor(intensity), tile, targetId);
                    return true;
                }
                if (G.b8 && typeof G.b8.hc === 'function') {
                    G.b8.hc(this.myId, Math.floor(intensity), tile, targetId);
                    return true;
                }
            } catch(e) { Logger.error('sendAttackTile failed:', e.message); }
            return false;
        },

        sendPeace() {
            const G = this.G;
            if (!G) return false;
            try {
                const hZ = G.bA && G.bA.hZ;
                if (hZ && typeof hZ.pe === 'function') { hZ.pe(this.myId, 0); return true; }
                if (G.b8 && typeof G.b8.pe === 'function') { G.b8.pe(this.myId, 0); return true; }
            } catch(e) {}
            return false;
        },

        retreat() {
            const G = this.G;
            if (!G) return false;
            try {
                const hZ = G.bA && G.bA.hZ;
                if (hZ && typeof hZ.hu === 'function') { hZ.hu(this.myId); return true; }
                if (G.b8 && typeof G.b8.hu === 'function') { G.b8.hu(this.myId); return true; }
            } catch(e) {}
            return false;
        },

        surrender() {
            const G = this.G;
            if (!G) return false;
            try {
                const hZ = G.bA && G.bA.hZ;
                if (hZ && typeof hZ.pn === 'function') { hZ.pn(this.myId); return true; }
                if (G.b8 && typeof G.b8.pn === 'function') { G.b8.pn(this.myId); return true; }
            } catch(e) {}
            return false;
        },

        setColor(colorId) {
            const G = this.G;
            if (!G || !G.bA || !G.bA.hZ) return false;
            try {
                // hZ.pi(player) where player id 513 = retreat; for color: hZ.pi(colorId)
                const hZ = G.bA.hZ;
                if (typeof hZ.pi === 'function') {
                    hZ.pi(Math.max(0, Math.min(1023, colorId)));
                    return true;
                }
            } catch(e) { return false; }
            return false;
        },

        isFFA() {
            const G = this.G;
            return G && G.aD ? G.aD.i3 : false;
        },

        isSinglePlayer() {
            const G = this.G;
            return G && G.aD ? G.aD.ko : false;
        },

        getAlivePlayers() {
            const alive = [];
            const max = this.maxPlayers;
            for (let i = 0; i < max; i++) {
                if (this.isPlayerAlive(i)) {
                    alive.push({
                        id: i,
                        name: this.getPlayerName(i),
                        troops: this.getPlayerTroops(i),
                        territory: this.getPlayerTerritory(i),
                        team: this.getPlayerTeam(i),
                        isMe: i === this.myId
                    });
                }
            }
            return alive;
        },

        canExpand() {
            const troops = this.getMyTroops();
            const territory = this.getMyTerritory();
            if (territory === 0) return troops > 10;
            return troops > (territory * TERRIX.config.godbot.expandRatio);
        },

        canAttack() {
            const troops = this.getMyTroops();
            const territory = this.getMyTerritory();
            if (territory === 0) return troops > 10;
            return troops > (territory * TERRIX.config.godbot.attackRatio);
        },

        shouldRetreat() {
            const troops = this.getMyTroops();
            const territory = this.getMyTerritory();
            if (territory === 0) return troops < 5;
            return troops < (territory * TERRIX.config.godbot.retreatRatio);
        },

        shouldPeace() {
            const G = this.G;
            if (!G) return false;
            const scoreObj = G.ae || G.aD;
            if (!scoreObj || typeof scoreObj.kA !== 'function') return false;
            try {
                const myScore = scoreObj.kA(this.myId);
                const maxScore = scoreObj.kA(); // no arg = global max
                return myScore > (maxScore * TERRIX.config.godbot.peaceThreshold);
            } catch(e) { return false; }
        }
    };

    const Logger = {
        prefix: '[TerriX]',
        log() {
            console.log(this.prefix, ...arguments);
        },
        warn() {
            console.warn(this.prefix, ...arguments);
        },
        error() {
            console.error(this.prefix, ...arguments);
        },
        debug() {
            if (TERRIX.config.debug) {
                console.log(this.prefix + '[DBG]', ...arguments);
            }
        }
    };

    Logger.log('TerriX v' + TERRIX.version + ' loaded.');

    function validateHook() {
        const G = _win.G;
        if (!G) return false;
        if (!G.aD) return false;
        if (!G.ag) return false;
        if (typeof G.aD.et !== 'number') return false;
        // Check that core typed arrays exist (tile arrays like gb/gp/gq/fY are null until ag.dh() runs)
        if (!(G.ag.gx instanceof Uint32Array)) return false;
        if (!(G.ag.hB instanceof Uint32Array)) return false;
        if (!(G.ag.n4 instanceof Uint8Array)) return false;
        return true;
    }

    function waitForHook(attempts) {
        attempts = attempts || 0;
        if (validateHook()) {
            Logger.log('Game hook validated. Initializing...');
            TERRIX.hooked = true;
            init();
            return;
        }
        if (attempts > 100) {
            Logger.error('Hook detection failed after 20s. Is this the TerriX Client?');
            injectStyles();
            buildErrorGUI();
            return;
        }
        setTimeout(() => waitForHook(attempts + 1), 200);
    }

    function onReady() {
        if (validateHook()) {
            Logger.log('Hook already present at DOMContentLoaded.');
            TERRIX.hooked = true;
            init();
            return;
        }
        waitForHook(0);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        onReady();
    }

    function init() {
        if (TERRIX.initialized) return;
        TERRIX.initialized = true;
        injectStyles();
        buildGUI();
        applyTheme();
        restoreGUIState();
        startLoops();
        setupKeyboardShortcuts();
        setupPageLifecycle();
        PropResolver.resetCache();
        lbPropCache = null;
        MultiTab.init();
        Logger.log('TerriX ready. Theme: ' + getCurrentTheme().name + '. Press the toggle bar or F2 to open.');
    }

    function restoreGUIState() {
        try {
            const state = JSON.parse(GM_getValue('terrix_gui_state', '{}'));
            const gui = document.getElementById('tx-gui');
            if (gui && state.left) {
                gui.style.left = state.left;
                gui.style.top = state.top;
                gui.style.transform = 'none';
            }
            if (state.activeTab) {
                const btn = document.querySelector('.tx-nav-btn[data-tab="' + state.activeTab + '"]');
                if (btn) btn.click();
            }
            if (state.editorContent) {
                const editor = document.getElementById('tx-editor');
                if (editor) editor.value = state.editorContent;
            }
        } catch(e) {}
    }

    function persistGUIState() {
        try {
            const gui = document.getElementById('tx-gui');
            const editor = document.getElementById('tx-editor');
            const activeBtn = document.querySelector('.tx-nav-btn.active');
            const state = {
                left: gui ? gui.style.left : '',
                top: gui ? gui.style.top : '',
                activeTab: activeBtn ? activeBtn.dataset.tab : 'editor',
                editorContent: editor ? editor.value : ''
            };
            GM_setValue('terrix_gui_state', JSON.stringify(state));
        } catch(e) {}
    }

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                const gui = document.getElementById('tx-gui');
                if (gui) gui.style.display = gui.style.display === 'flex' ? 'none' : 'flex';
            }
            if (e.ctrlKey && e.shiftKey && e.key === 'X') {
                e.preventDefault();
                const gui = document.getElementById('tx-gui');
                if (gui) gui.style.display = gui.style.display === 'flex' ? 'none' : 'flex';
            }
        });
    }

    function setupPageLifecycle() {
        _win.addEventListener('beforeunload', () => {
            persistGUIState();
            stopAllLoops();
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                Logger.log('Tab hidden — reducing polling.');
            } else {
                if (!validateHook()) {
                    Logger.warn('Hook lost while tab was hidden. Re-detecting...');
                    TERRIX.hooked = false;
                    TERRIX.initialized = false;
                    waitForHook(0);
                }
            }
        });

        let lastDomCount = 0;
        const domObserver = new MutationObserver(() => {
            const currentCount = document.querySelectorAll('*').length;
            if (Math.abs(currentCount - lastDomCount) > 100) {
                lastDomCount = currentCount;
                if (!validateHook() && TERRIX.initialized) {
                    Logger.warn('DOM changed significantly — checking hook...');
                    TERRIX.hooked = false;
                    TERRIX.initialized = false;
                    waitForHook(0);
                }
            }
        });
        setTimeout(() => {
            if (document.body) {
                domObserver.observe(document.body, { childList: true, subtree: true });
            }
        }, 2000);
    }

    function buildErrorGUI() {
        const T = getCurrentTheme();
        const wrapper = document.createElement('div');
        wrapper.id = 'tx-wrapper';
        wrapper.innerHTML = [
            '<div id="tx-toggle">TERRIX v3.0</div>',
            '<div id="tx-gui" style="display:flex;background:' + T.bg + ';border-color:' + T.colorBorder + ';color:' + T.colorText + ';box-shadow:0 0 40px ' + T.shadowGlow + ',0 20px 60px ' + T.shadowBox + ';">',
            '  <div id="tx-header" style="background:' + T.bgHeader + ';border-bottom-color:' + T.colorBorderLight + ';"><span>TERRIX <span class="tx-ver" style="color:' + T.verColor + ';">v3.0</span></span><span id="tx-close" style="color:' + T.colorTextMuted + ';">✕</span></div>',
            '  <div style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;padding:40px;">',
            '    <div style="font-size:48px;color:' + T.colorTextRed + ';">⚠</div>',
            '    <div style="color:' + T.colorTextRed + ';font-size:16px;font-weight:bold;">Game Hook Not Detected</div>',
            '    <div style="color:' + T.colorTextDim + ';font-size:12px;text-align:center;max-width:400px;">',
            '      This page does not have the TerriX hook. You must use the TerriX Client to run TerriX Executor.<br><br>',
            '      <a href="https://everythingtt.github.io/TerriX-Client/Territorial.io.html" style="color:' + T.colorBorderBtnPrimary + ';" target="_blank">Open TerriX Client →</a>',
            '    </div>',
            '    <button class="tx-btn tx-btn-primary" style="background:' + T.bgBtnPrimary + ';border-color:' + T.colorBorderBtnPrimary + ';color:' + T.btnTextPrimary + ';" onclick="location.reload()">Retry</button>',
            '  </div>',
            '</div>'
        ].join('');
        document.body.appendChild(wrapper);
        document.getElementById('tx-toggle').addEventListener('click', () => {
            const gui = document.getElementById('tx-gui');
            gui.style.display = gui.style.display === 'flex' ? 'none' : 'flex';
        });
        document.getElementById('tx-close').addEventListener('click', () => {
            document.getElementById('tx-gui').style.display = 'none';
        });
    }

    function injectStyles() {
        const T = getCurrentTheme();
        const s = document.createElement('style');
        s.id = 'tx-styles';
        s.textContent = [
            '#tx-wrapper{position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;font-family:system-ui,"Segoe UI",Arial,sans-serif;pointer-events:none;}',
            '#tx-toggle{pointer-events:auto;position:fixed;top:0;left:50%;transform:translateX(-50%);padding:4px 24px;background:' + T.bgToggleBar + ';color:' + T.toggleBarText + ';border:1.5px solid ' + T.toggleBarBorder + ';border-top:none;border-radius:0 0 8px 8px;cursor:pointer;font-weight:bold;font-size:11px;letter-spacing:2px;z-index:2147483647;}',
            '#tx-toggle:hover{background:' + T.toggleBarHover + ';}',
            '#tx-gui{pointer-events:auto;position:fixed;top:80px;left:50%;transform:translateX(-50%);width:740px;height:520px;background:' + T.bg + ';border:1.5px solid ' + T.colorBorder + ';display:none;flex-direction:column;color:' + T.colorText + ';box-shadow:0 0 40px ' + T.shadowGlow + ',0 20px 60px ' + T.shadowBox + ';border-radius:6px;overflow:hidden;}',
            '#tx-header{padding:10px 18px;background:' + T.bgHeader + ';display:flex;justify-content:space-between;align-items:center;cursor:move;border-bottom:1px solid ' + T.colorBorderLight + ';font-size:13px;font-weight:bold;}',
            '#tx-header .tx-ver{color:' + T.verColor + ';font-size:10px;margin-left:8px;}',
            '#tx-close{cursor:pointer;color:' + T.colorTextMuted + ';font-size:16px;padding:2px 6px;}',
            '#tx-close:hover{color:' + T.closeHover + ';}',
            '#tx-body{display:flex;flex:1;overflow:hidden;}',
            '#tx-sidebar{width:140px;background:' + T.bgSidebar + ';border-right:1px solid ' + T.colorBorderMuted + ';padding:10px;display:flex;flex-direction:column;gap:6px;}',
            '#tx-main{flex:1;display:flex;flex-direction:column;overflow:hidden;}',
            '.tx-nav-btn{padding:7px 10px;background:' + T.bgBtn + ';border:1px solid ' + T.colorBorderLight + ';color:' + T.colorNavInactive + ';cursor:pointer;font-size:11px;font-weight:bold;border-radius:4px;text-align:left;}',
            '.tx-nav-btn:hover{background:' + T.btnHoverBg + ';color:' + T.btnHoverText + ';}',
            '.tx-nav-btn.active{background:' + T.bgTabActive + ';color:' + T.colorNavActive + ';border-color:' + T.colorBorderBtnPrimary + ';}',
            '#tx-tab-editor{flex:1;display:flex;flex-direction:column;overflow:hidden;}',
            '#tx-tab-chart{flex:1;display:none;flex-direction:column;gap:4px;overflow-y:auto;padding:10px;}',
            '#tx-tab-scripts{flex:1;display:none;flex-direction:column;gap:4px;overflow-y:auto;padding:10px;}',
            '#tx-tab-config{flex:1;display:none;flex-direction:column;gap:4px;overflow-y:auto;padding:10px;}',
            '#tx-tab-esp{flex:1;display:none;overflow:hidden;}',
            '#tx-editor{flex:1;background:' + T.bgEditor + ';color:' + T.editorText + ';border:none;padding:12px;font-family:Consolas,monospace;font-size:12px;resize:none;outline:none;line-height:1.5;}',
            '.tx-bar-row{display:flex;align-items:center;gap:8px;height:26px;width:100%;flex-shrink:0;}',
            '.tx-bar-rank{width:30px;font-size:11px;color:' + T.barRank + ';font-weight:bold;text-align:right;}',
            '.tx-bar-name{width:120px;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:' + T.barName + ';}',
            '.tx-bar-track{flex:1;background:' + T.barTrack + ';height:14px;border:1px solid ' + T.barBorder + ';border-radius:2px;position:relative;overflow:hidden;}',
            '.tx-bar-fill{height:100%;width:0%;background:' + T.barFill + ';transition:width 0.3s ease;border-right:2px solid rgba(255,255,255,0.3);}',
            '.tx-bar-val{position:absolute;right:4px;font-size:9px;color:' + T.barValText + ';line-height:14px;font-weight:bold;}',
            '.tx-me-row .tx-bar-name{color:' + T.meName + '!important;font-weight:bold;}',
            '.tx-me-row .tx-bar-fill{background:' + T.meBarFill + ';}',
            '.tx-script-item{background:' + T.bgScriptItem + ';border:1px solid ' + T.colorBorderScript + ';padding:10px;display:flex;justify-content:space-between;align-items:center;border-radius:4px;}',
            '.tx-script-item:hover{border-color:' + T.colorBorderBtnPrimary + ';}',
            '.tx-btn{padding:6px 14px;background:' + T.bgBtn + ';border:1px solid ' + T.colorBorderBtn + ';color:' + T.btnText + ';cursor:pointer;font-size:11px;font-weight:bold;border-radius:4px;}',
            '.tx-btn:hover{background:' + T.btnHoverBg + ';color:' + T.btnHoverText + ';}',
            '.tx-btn-primary{background:' + T.bgBtnPrimary + ';border-color:' + T.colorBorderBtnPrimary + ';color:' + T.btnTextPrimary + ';}',
            '.tx-btn-primary:hover{background:' + T.btnHoverPrimary + ';}',
            '.tx-btn-danger{background:' + T.bgBtnDanger + ';border-color:' + T.colorBorderBtnDanger + ';color:' + T.btnTextDanger + ';}',
            '.tx-btn-danger:hover{background:' + T.btnHoverDanger + ';}',
            '.tx-btn-success{background:' + T.bgBtnSuccess + ';border-color:' + T.colorBorderBtnSuccess + ';color:' + T.btnTextSuccess + ';}',
            '.tx-btn-success:hover{background:' + T.btnHoverSuccess + ';}',
            '#tx-footer{padding:8px 16px;background:' + T.bgFooter + ';display:flex;justify-content:space-between;align-items:center;border-top:1px solid ' + T.footerBorder + ';}',
            '#tx-status{font-size:10px;color:' + T.colorTextMuted + ';}',
            '#tx-status.tx-online{color:' + T.statusOnline + ';}',
            '#tx-status.tx-offline{color:' + T.statusOffline + ';}',
            '.tx-section-title{font-size:12px;font-weight:bold;color:' + T.sectionTitle + ';margin:10px 0 6px 0;text-transform:uppercase;letter-spacing:1px;}',
            '.tx-config-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);}',
            '.tx-config-label{font-size:11px;color:' + T.configLabel + ';}',
            '.tx-config-input{background:' + T.bgConfigInput + ';border:1px solid ' + T.configInputBorder + ';color:' + T.configInputText + ';padding:3px 8px;font-size:11px;border-radius:3px;width:' + T.selectInputWidth + ';text-align:right;}',
            '.tx-config-input:focus{border-color:' + T.configInputFocusBorder + ';outline:none;}',
            '.tx-toggle-switch{position:relative;width:36px;height:18px;background:' + T.toggleTrackOff + ';border-radius:9px;cursor:pointer;border:1px solid ' + T.toggleBorderOff + ';}',
            '.tx-toggle-switch.on{background:' + T.toggleTrackOn + ';border-color:' + T.toggleBorderOn + ';}',
            '.tx-toggle-switch::after{content:"";position:absolute;top:1px;left:1px;width:14px;height:14px;background:' + T.toggleKnobOff + ';border-radius:50%;transition:all 0.2s;}',
            '.tx-toggle-switch.on::after{left:19px;background:' + T.toggleKnobOn + ';}',
            '#tx-minimap{position:fixed;z-index:2147483646;pointer-events:none;border:1px solid ' + T.minimapBorder + ';border-radius:4px;overflow:hidden;box-shadow:0 0 10px ' + T.minimapShadow + ';}',
            '#tx-minimap canvas{display:block;}',
            '#tx-debug-log{position:fixed;bottom:0;left:0;width:400px;max-height:200px;z-index:2147483647;background:' + T.debugBg + ';border:1px solid ' + T.debugBorder + ';color:' + T.debugText + ';font-family:monospace;font-size:10px;overflow-y:auto;padding:6px;display:none;}',
            '.tx-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:' + T.toastBg + ';color:' + T.toastText + ';padding:8px 16px;border-radius:4px;font-size:12px;z-index:2147483647;border:1px solid ' + T.toastBorder + ';transition:opacity 0.3s;}',
            '#tx-code-output{flex:0 0 100px;background:' + T.bgOutput + ';border-top:1px solid ' + T.outputBorder + ';padding:8px;font-family:monospace;font-size:10px;color:' + T.outputText + ';overflow-y:auto;white-space:pre-wrap;}'
        ].join('');
        document.head.appendChild(s);
    }

    function applyTheme() {
        const T = getCurrentTheme();
        const gui = document.getElementById('tx-gui');
        if (!gui) return;
        gui.style.background = T.bg;
        gui.style.borderColor = T.colorBorder;
        gui.style.color = T.colorText;
        gui.style.boxShadow = '0 0 40px ' + T.shadowGlow + ',0 20px 60px ' + T.shadowBox;

        const toggle = document.getElementById('tx-toggle');
        if (toggle) {
            toggle.style.background = T.bgToggleBar;
            toggle.style.color = T.toggleBarText;
            toggle.style.borderColor = T.toggleBarBorder;
        }

        const header = document.getElementById('tx-header');
        if (header) {
            header.style.background = T.bgHeader;
            header.style.borderBottomColor = T.colorBorderLight;
        }

        const sidebar = document.getElementById('tx-sidebar');
        if (sidebar) {
            sidebar.style.background = T.bgSidebar;
            sidebar.style.borderRightColor = T.colorBorderMuted;
        }

        const footer = document.getElementById('tx-footer');
        if (footer) {
            footer.style.background = T.bgFooter;
            footer.style.borderTopColor = T.footerBorder;
        }

        const editor = document.getElementById('tx-editor');
        if (editor) {
            editor.style.background = T.bgEditor;
            editor.style.color = T.editorText;
        }

        const output = document.getElementById('tx-code-output');
        if (output) {
            output.style.background = T.bgOutput;
            output.style.borderTopColor = T.outputBorder;
            output.style.color = T.outputText;
        }

        const minimap = document.getElementById('tx-minimap');
        if (minimap) {
            minimap.style.borderColor = T.minimapBorder;
            minimap.style.boxShadow = '0 0 10px ' + T.minimapShadow;
        }

        document.querySelectorAll('.tx-nav-btn').forEach(btn => {
            if (btn.classList.contains('active')) {
                btn.style.background = T.bgTabActive;
                btn.style.color = T.colorNavActive;
                btn.style.borderColor = T.colorBorderBtnPrimary;
            } else {
                btn.style.background = T.bgBtn;
                btn.style.color = T.colorNavInactive;
                btn.style.borderColor = T.colorBorderLight;
            }
        });

        document.querySelectorAll('.tx-section-title').forEach(el => {
            el.style.color = T.sectionTitle;
        });

        document.querySelectorAll('.tx-bar-track').forEach(el => {
            el.style.background = T.barTrack;
            el.style.borderColor = T.barBorder;
        });

        document.querySelectorAll('.tx-bar-fill').forEach(el => {
            if (!el.parentElement || !el.parentElement.parentElement || !el.parentElement.parentElement.classList.contains('tx-me-row')) {
                el.style.background = T.barFill;
            }
        });

        document.querySelectorAll('.tx-me-row .tx-bar-fill').forEach(el => {
            el.style.background = T.meBarFill;
        });

        document.querySelectorAll('.tx-bar-val').forEach(el => {
            el.style.color = T.barValText;
        });

        document.querySelectorAll('.tx-bar-rank').forEach(el => {
            el.style.color = T.barRank;
        });

        document.querySelectorAll('.tx-bar-name').forEach(el => {
            if (!el.parentElement || !el.parentElement.classList.contains('tx-me-row')) {
                el.style.color = T.barName;
            } else {
                el.style.color = T.meName;
            }
        });

        document.querySelectorAll('.tx-script-item').forEach(el => {
            el.style.background = T.bgScriptItem;
            el.style.borderColor = T.colorBorderScript;
        });

        document.querySelectorAll('.tx-config-label').forEach(el => {
            el.style.color = T.configLabel;
        });

        document.querySelectorAll('.tx-config-input').forEach(el => {
            el.style.background = T.bgConfigInput;
            el.style.borderColor = T.configInputBorder;
            el.style.color = T.configInputText;
        });

        document.querySelectorAll('.tx-toggle-switch').forEach(el => {
            if (el.classList.contains('on')) {
                el.style.background = T.toggleTrackOn;
                el.style.borderColor = T.toggleBorderOn;
            } else {
                el.style.background = T.toggleTrackOff;
                el.style.borderColor = T.toggleBorderOff;
            }
        });

        document.querySelectorAll('.tx-btn').forEach(btn => {
            if (btn.classList.contains('tx-btn-primary')) {
                btn.style.background = T.bgBtnPrimary;
                btn.style.borderColor = T.colorBorderBtnPrimary;
                btn.style.color = T.btnTextPrimary;
            } else if (btn.classList.contains('tx-btn-danger')) {
                btn.style.background = T.bgBtnDanger;
                btn.style.borderColor = T.colorBorderBtnDanger;
                btn.style.color = T.btnTextDanger;
            } else if (btn.classList.contains('tx-btn-success')) {
                btn.style.background = T.bgBtnSuccess;
                btn.style.borderColor = T.colorBorderBtnSuccess;
                btn.style.color = T.btnTextSuccess;
            } else {
                btn.style.background = T.bgBtn;
                btn.style.borderColor = T.colorBorderBtn;
                btn.style.color = T.btnText;
            }
        });

        const status = document.getElementById('tx-status');
        if (status) {
            if (status.classList.contains('tx-online')) {
                status.style.color = T.statusOnline;
            } else {
                status.style.color = T.statusOffline;
            }
        }

        const ver = document.querySelector('#tx-header .tx-ver');
        if (ver) ver.style.color = T.verColor;

        const close = document.getElementById('tx-close');
        if (close) close.style.color = T.colorTextMuted;

        const hookBtn = document.getElementById('tx-btn-hook');
        if (hookBtn) hookBtn.style.borderColor = T.colorBorderBtnDanger;

        Logger.log('Theme applied: ' + T.name);
    }

    function buildGUI() {
        const wrapper = document.createElement('div');
        wrapper.id = 'tx-wrapper';
        wrapper.innerHTML = [
            '<div id="tx-toggle">TERRIX v3.0</div>',
            '<div id="tx-gui">',
            '  <div id="tx-header">',
            '    <span>TERRIX <span class="tx-ver">v3.0 ULTIMATE</span></span>',
            '    <span id="tx-close">✕</span>',
            '  </div>',
            '  <div id="tx-body">',
            '    <div id="tx-sidebar">',
            '      <button class="tx-nav-btn active" data-tab="editor">EDITOR</button>',
            '      <button class="tx-nav-btn" data-tab="chart">LEADERBOARD</button>',
            '      <button class="tx-nav-btn" data-tab="scripts">SCRIPTS</button>',
            '      <button class="tx-nav-btn" data-tab="config">CONFIG</button>',
            '      <button class="tx-nav-btn" data-tab="esp">ESP VIEW</button>',
            '      <div style="flex:1"></div>',
            '      <button class="tx-nav-btn" id="tx-btn-hook" style="border-color:#664">HOOK</button>',
            '      <button class="tx-nav-btn" onclick="window.open(\'https://everythingtt.github.io/TerriX-Client/Territorial.io.html\')">CLIENT</button>',
            '    </div>',
            '    <div id="tx-main">',
            '      <div id="tx-tab-editor">',
            '        <textarea id="tx-editor" spellcheck="false">/* TerriX v3.0 Code Executor */\n/* Use GameInterface API: */\n/* GameInterface.myId, .getMyTroops(), .getMyTerritory() */\n/* GameInterface.sendAttack(intensity, targetId) */\n/* GameInterface.sendAttackTile(intensity, tile, targetId) */\n/* Full game state: window.G */</textarea>',
            '        <div id="tx-code-output"></div>',
            '      </div>',
            '      <div id="tx-tab-chart"></div>',
            '      <div id="tx-tab-scripts"></div>',
            '      <div id="tx-tab-config"></div>',
            '      <div id="tx-tab-esp"><canvas id="tx-esp-canvas" style="width:100%;height:100%;"></canvas></div>',
            '    </div>',
            '  </div>',
            '  <div id="tx-footer">',
            '    <button class="tx-btn tx-btn-success" id="tx-btn-execute">EXECUTE</button>',
            '    <span id="tx-status" class="tx-offline">OFFLINE</span>',
            '    <button class="tx-btn tx-btn-danger" id="tx-btn-stop">STOP ALL</button>',
            '  </div>',
            '</div>'
        ].join('');
        document.body.appendChild(wrapper);

        const gui = document.getElementById('tx-gui');
        document.getElementById('tx-toggle').addEventListener('click', () => {
            gui.style.display = gui.style.display === 'flex' ? 'none' : 'flex';
        });
        document.getElementById('tx-close').addEventListener('click', () => {
            gui.style.display = 'none';
        });

        document.querySelectorAll('.tx-nav-btn[data-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tx-nav-btn[data-tab]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.dataset.tab;
                ['editor','chart','scripts','config','esp'].forEach(t => {
                    const el = document.getElementById('tx-tab-' + t);
                    if (el) el.style.display = (t === tab) ? (t === 'editor' ? 'flex' : t === 'esp' ? 'block' : 'flex') : 'none';
                });
                persistGUIState();
            });
        });

        document.getElementById('tx-btn-hook').addEventListener('click', function() {
            if (_win.G) {
                this.textContent = 'HOOKED';
                this.style.borderColor = '#0f0';
                this.style.color = '#0f0';
                updateStatus('HOOKED', true);
                toast('Game hooked successfully');
            } else {
                toast('Error: Game not loaded. Use TerriX Client.');
            }
        });

        document.getElementById('tx-btn-execute').addEventListener('click', () => {
            const code = document.getElementById('tx-editor').value;
            const output = document.getElementById('tx-code-output');
            try {
                const fn = new Function('G', 'GI', 'TERRIX', 'Logger', code);
                fn(_win.G, GameInterface, TERRIX, Logger);
                output.textContent = '✓ Executed successfully';
                output.style.color = '#0f0';
            } catch(e) {
                output.textContent = '✗ ' + e.message;
                output.style.color = '#f44';
            }
        });

        document.getElementById('tx-btn-stop').addEventListener('click', () => {
            stopAllLoops();
            TERRIX.config.godbot.enabled = false;
            TERRIX.config.esp.enabled = false;
            TERRIX.config.minimap.enabled = false;
            saveConfig();
            toast('All loops stopped');
        });

        document.getElementById('tx-editor').addEventListener('input', () => {
            persistGUIState();
        });

        TERRIX.loops.autoSave = setInterval(() => {
            persistGUIState();
            saveConfig();
        }, 5000);

        let dragging = false, dragX, dragY;
        document.getElementById('tx-header').addEventListener('mousedown', (e) => {
            if (e.target.id === 'tx-close') return;
            dragging = true;
            dragX = e.clientX - gui.offsetLeft;
            dragY = e.clientY - gui.offsetTop;
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            gui.style.left = (e.clientX - dragX) + 'px';
            gui.style.top = (e.clientY - dragY) + 'px';
            gui.style.transform = 'none';
        });
        document.addEventListener('mouseup', () => { dragging = false; persistGUIState(); });

        buildScriptsTab();
        buildConfigTab();
        updateStatus('READY', true);
    }

    function updateStatus(text, online) {
        const el = document.getElementById('tx-status');
        if (!el) return;
        el.textContent = text;
        el.className = online ? 'tx-online' : 'tx-offline';
    }

    function toast(msg) {
        const el = document.createElement('div');
        el.className = 'tx-toast';
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2000);
    }

    function buildScriptsTab() {
        const container = document.getElementById('tx-tab-scripts');
        if (!container) return;
        const scripts = [
            { name: 'GodBot v3.0', desc: 'AI bot with neighbor scanning, retreat, queue', id: 'godbot' },
            { name: 'Threat Radar', desc: 'Flash warning when ships target you', id: 'radar' },
            { name: 'Auto-Expand', desc: 'Simple expansion into neutral land', id: 'expand' },
            { name: 'Rush Mode', desc: 'All-in attack on weakest neighbor', id: 'rush' },
            { name: 'Team Assist', desc: 'Auto-attack enemies near teammates', id: 'team' },
            { name: 'Debug Dumper', desc: 'Dump all G properties to console', id: 'debug' }
        ];
        scripts.forEach(s => {
            const div = document.createElement('div');
            div.className = 'tx-script-item';
            div.innerHTML = '<div><div style="color:#fff;font-weight:bold;font-size:12px;">' + s.name + '</div><div style="color:#666;font-size:10px;">' + s.desc + '</div></div><button class="tx-btn tx-btn-primary" data-script="' + s.id + '">LOAD</button>';
            container.appendChild(div);
        });
        container.querySelectorAll('[data-script]').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = getScriptCode(btn.dataset.script);
                if (code) {
                    document.getElementById('tx-editor').value = code;
                    document.querySelector('[data-tab="editor"]').click();
                    toast('Loaded: ' + btn.dataset.script);
                }
            });
        });
    }

    function buildConfigTab() {
        const container = document.getElementById('tx-tab-config');
        if (!container) return;
        container.innerHTML = '';

        const sections = [
            {
                title: 'UI THEME',
                items: [
                    { label: 'Theme', key: 'ui.theme', type: 'select', options: ['terrix', 'territorial'], labels: ['TerriX Dark', 'Territorial.io'] }
                ]
            },
            {
                title: 'GODBOT SETTINGS',
                items: [
                    { label: 'Enable GodBot', key: 'godbot.enabled', type: 'toggle' },
                    { label: 'Strategy', key: 'godbot.strategy', type: 'select', options: ['balanced', 'aggressive', 'defensive', 'rush'] },
                    { label: 'Expand Ratio', key: 'godbot.expandRatio', type: 'number' },
                    { label: 'Attack Ratio', key: 'godbot.attackRatio', type: 'number' },
                    { label: 'Retreat Ratio', key: 'godbot.retreatRatio', type: 'number' },
                    { label: 'Peace Threshold', key: 'godbot.peaceThreshold', type: 'number' },
                    { label: 'Tick Rate (ms)', key: 'godbot.tickRate', type: 'number' },
                    { label: 'Only Attack Neighbors', key: 'godbot.onlyAttackNeighbors', type: 'toggle' },
                    { label: 'Queue Attacks', key: 'godbot.queueAttacks', type: 'toggle' },
                    { label: 'Queue Delay (ms)', key: 'godbot.queueDelay', type: 'number' }
                ]
            },
            {
                title: 'ESP SETTINGS',
                items: [
                    { label: 'Enable ESP', key: 'esp.enabled', type: 'toggle' },
                    { label: 'Show Troops', key: 'esp.showTroops', type: 'toggle' },
                    { label: 'Show Names', key: 'esp.showNames', type: 'toggle' },
                    { label: 'Show Borders', key: 'esp.showBorders', type: 'toggle' },
                    { label: 'Color Code Teams', key: 'esp.colorCode', type: 'toggle' }
                ]
            },
            {
                title: 'MINIMAP',
                items: [
                    { label: 'Enable Minimap', key: 'minimap.enabled', type: 'toggle' },
                    { label: 'Size (px)', key: 'minimap.size', type: 'number' },
                    { label: 'Opacity', key: 'minimap.opacity', type: 'number' },
                    { label: 'Show Troops', key: 'minimap.showTroops', type: 'toggle' },
                    { label: 'Show Targets', key: 'minimap.showTargets', type: 'toggle' }
                ]
            }
        ];

        sections.forEach(sec => {
            const title = document.createElement('div');
            title.className = 'tx-section-title';
            title.textContent = sec.title;
            container.appendChild(title);

            sec.items.forEach(item => {
                const row = document.createElement('div');
                row.className = 'tx-config-row';
                const label = document.createElement('span');
                label.className = 'tx-config-label';
                label.textContent = item.label;
                row.appendChild(label);

                if (item.type === 'toggle') {
                    const sw = document.createElement('div');
                    sw.className = 'tx-toggle-switch' + (getNested(TERRIX.config, item.key) ? ' on' : '');
                    sw.addEventListener('click', () => {
                        const val = getNested(TERRIX.config, item.key);
                        setNested(TERRIX.config, item.key, !val);
                        sw.classList.toggle('on');
                        saveConfig();
                    });
                    row.appendChild(sw);
                } else if (item.type === 'number') {
                    const inp = document.createElement('input');
                    inp.className = 'tx-config-input';
                    inp.type = 'number';
                    inp.value = getNested(TERRIX.config, item.key);
                    inp.addEventListener('change', () => {
                        setNested(TERRIX.config, item.key, parseFloat(inp.value) || 0);
                        saveConfig();
                    });
                    row.appendChild(inp);
                } else if (item.type === 'select') {
                    const sel = document.createElement('select');
                    sel.className = 'tx-config-input';
                    sel.style.width = '120px';
                    (item.options || []).forEach((opt, idx) => {
                        const o = document.createElement('option');
                        o.value = opt;
                        o.textContent = (item.labels && item.labels[idx]) ? item.labels[idx] : opt;
                        if (opt === getNested(TERRIX.config, item.key)) o.selected = true;
                        sel.appendChild(o);
                    });
                    sel.addEventListener('change', () => {
                        setNested(TERRIX.config, item.key, sel.value);
                        saveConfig();
                        if (item.key === 'ui.theme') applyTheme();
                    });
                    row.appendChild(sel);
                }

                container.appendChild(row);
            });
        });
    }

    function getNested(obj, path) {
        return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
    }

    function setNested(obj, path, val) {
        const keys = path.split('.');
        const last = keys.pop();
        const target = keys.reduce((o, k) => { if (!o[k]) o[k] = {}; return o[k]; }, obj);
        target[last] = val;
    }

    function getScriptCode(id) {
        const scripts = {
            godbot: [
                '/* GodBot v3.0 — Ultimate AI */',
                'if (TERRIX.loops.godbot) { clearInterval(TERRIX.loops.godbot); TERRIX.loops.godbot = null; TERRIX.config.godbot.enabled = false; Logger.log("GodBot stopped"); return; }',
                'TERRIX.config.godbot.enabled = true;',
                'const cfg = TERRIX.config.godbot;',
                'const myId = GI.myId;',
                'if (myId < 0) { Logger.error("Not in game"); return; }',
                'Logger.log("GodBot v3.0 started — Strategy:", cfg.strategy);',
                'const attackQueue = [];',
                'let lastExpand = 0, lastAttack = 0;',
                'TERRIX.loops.godbot = setInterval(() => {',
                '  if (!GI.isPlayerAlive(myId)) return;',
                '  const myTroops = GI.getMyTroops();',
                '  const myTerritory = GI.getMyTerritory();',
                '  if (myTerritory === 0 && myTroops < 10) return;',
                '',
                '  if (cfg.strategy === "rush") {',
                '    const enemies = [];',
                '    for (let i = 0; i < GI.maxPlayers; i++) {',
                '      if (i !== myId && GI.isPlayerAlive(i) && !GI.areAllies(myId, i)) {',
                '        enemies.push({ id: i, territory: GI.getPlayerTerritory(i) });',
                '      }',
                '    }',
                '    enemies.sort((a, b) => a.territory - b.territory);',
                '    if (enemies.length > 0 && myTroops > 50) {',
                '      GI.sendAttack(Math.min(myTroops * 0.8, 1024), enemies[0].id);',
                '    }',
                '    return;',
                '  }',
                '',
                '  if (myTroops < myTerritory * cfg.retreatRatio) {',
                '    GI.retreat(); return;',
                '  }',
                '',
                '  if (cfg.onlyAttackNeighbors) {',
                '    const borderTiles = GI.getBorderTiles(myId);',
                '    const neighborEnemies = new Map();',
                '    for (const tile of borderTiles) {',
                '      const neighbors = GI.getNeighbors(tile);',
                '      for (const n of neighbors) {',
                '        const owner = GI.getTileOwner(n);',
                '        if (owner >= 0 && owner !== myId && !GI.areAllies(myId, owner) && GI.isPlayerAlive(owner)) {',
                '          if (!neighborEnemies.has(owner)) neighborEnemies.set(owner, { id: owner, territory: GI.getPlayerTerritory(owner), tiles: [] });',
                '          neighborEnemies.get(owner).tiles.push(n);',
                '        }',
                '      }',
                '    }',
                '    if (neighborEnemies.size > 0 && myTroops > myTerritory * cfg.attackRatio) {',
                '      const targets = Array.from(neighborEnemies.values()).sort((a, b) => a.territory - b.territory);',
                '      const now = Date.now();',
                '      for (const t of targets.slice(0, cfg.maxTargets)) {',
                '        if (cfg.queueAttacks) {',
                '          if (now - lastAttack >= cfg.queueDelay) {',
                '            const tile = t.tiles[Math.floor(Math.random() * t.tiles.length)];',
                '            GI.sendAttackTile(Math.min(myTroops / targets.length, 512), tile, t.id);',
                '            lastAttack = now;',
                '          }',
                '        } else {',
                '          GI.sendAttack(Math.min(myTroops / targets.length, 512), t.id);',
                '        }',
                '      }',
                '    }',
                '  } else {',
                '    const enemies = [];',
                '    for (let i = 0; i < GI.maxPlayers; i++) {',
                '      if (i !== myId && GI.isPlayerAlive(i) && !GI.areAllies(myId, i)) {',
                '        enemies.push({ id: i, territory: GI.getPlayerTerritory(i) });',
                '      }',
                '    }',
                '    enemies.sort((a, b) => a.territory - b.territory);',
                '    if (enemies.length > 0 && myTroops > myTerritory * cfg.attackRatio) {',
                '      GI.sendAttack(Math.min(myTroops * 0.5, 1024), enemies[0].id);',
                '    }',
                '  }',
                '',
                '  if (myTroops > myTerritory * cfg.expandRatio) {',
                '    const now = Date.now();',
                '    if (now - lastExpand > 2000) {',
                '      const borderTiles = GI.getBorderTiles(myId);',
                '      const neutralTiles = borderTiles.filter(t => GI.isNeutral(t) && GI.isWalkable(t));',
                '      if (neutralTiles.length > 0) {',
                '        const tile = neutralTiles[Math.floor(Math.random() * neutralTiles.length)];',
                '        GI.sendAttackTile(Math.min(myTroops * 0.3, 256), tile, -1);',
                '      }',
                '      lastExpand = now;',
                '    }',
                '  }',
                '',
                '  if (myTerritory > 100 && myTroops < myTerritory * 1.2) {',
                '    GI.retreat();',
                '  }',
                '}, cfg.tickRate);'
            ].join('\n'),

            radar: [
                '/* Threat Radar v3.0 */',
                'if (TERRIX.loops.radar) { clearInterval(TERRIX.loops.radar); TERRIX.loops.radar = null; Logger.log("Radar off"); return; }',
                'Logger.log("Threat Radar active");',
                'TERRIX.loops.radar = setInterval(() => {',
                '  const G = window.G;',
                '  if (!G || !G.bN || !G.bN.y || !G.aD) return;',
                '  const ships = G.bN.y;',
                '  const myId = G.aD.et;',
                '  // mK = ship count, mO[i] = (sourcePlayer<<3) + shipIdx, mZ[i] = encoded tile',
                '  for (let i = 0; i < ships.mK; i++) {',
                '    const targetPlayer = ships.mO[i] >> 3;',
                '    if (targetPlayer === myId) {',
                '      const hdr = document.getElementById("tx-header");',
                '      if (hdr) { hdr.style.background = "#f00"; setTimeout(() => hdr.style.background = "", 200); }',
                '      Logger.warn("Ship incoming!");',
                '    }',
                '  }',
                '}, 300);'
            ].join('\n'),

            expand: [
                '/* Auto-Expand v3.0 */',
                'if (TERRIX.loops.expand) { clearInterval(TERRIX.loops.expand); TERRIX.loops.expand = null; Logger.log("Auto-Expand off"); return; }',
                'Logger.log("Auto-Expand active");',
                'TERRIX.loops.expand = setInterval(() => {',
                '  if (!GI.isPlayerAlive(GI.myId)) return;',
                '  const myTroops = GI.getMyTroops();',
                '  const myTerritory = GI.getMyTerritory();',
                '  if (myTerritory > 0 && myTroops > myTerritory * 2.5) {',
                '    const borderTiles = GI.getBorderTiles(GI.myId);',
                '    const neutral = borderTiles.filter(t => GI.isNeutral(t) && GI.isWalkable(t));',
                '    if (neutral.length > 0) {',
                '      const tile = neutral[Math.floor(Math.random() * neutral.length)];',
                '      GI.sendAttackTile(Math.min(myTroops * 0.4, 300), tile, -1);',
                '    }',
                '  }',
                '}, 1500);'
            ].join('\n'),

            rush: [
                '/* Rush Mode v3.0 */',
                'if (TERRIX.loops.rush) { clearInterval(TERRIX.loops.rush); TERRIX.loops.rush = null; Logger.log("Rush off"); return; }',
                'Logger.log("RUSH MODE activated");',
                'TERRIX.loops.rush = setInterval(() => {',
                '  if (!GI.isPlayerAlive(GI.myId)) return;',
                '  const myTroops = GI.getMyTroops();',
                '  if (myTroops < 20) return;',
                '  let weakest = -1, minTerr = Infinity;',
                '  for (let i = 0; i < GI.maxPlayers; i++) {',
                '    if (i !== GI.myId && GI.isPlayerAlive(i) && !GI.areAllies(GI.myId, i)) {',
                '      const t = GI.getPlayerTerritory(i);',
                '      if (t < minTerr) { minTerr = t; weakest = i; }',
                '    }',
                '  }',
                '  if (weakest >= 0) {',
                '    GI.sendAttack(Math.min(myTroops * 0.9, 1024), weakest);',
                '  }',
                '}, 600);'
            ].join('\n'),

            team: [
                '/* Team Assist v3.0 */',
                'if (TERRIX.loops.team) { clearInterval(TERRIX.loops.team); TERRIX.loops.team = null; Logger.log("Team Assist off"); return; }',
                'Logger.log("Team Assist active");',
                'TERRIX.loops.team = setInterval(() => {',
                '  if (!GI.isPlayerAlive(GI.myId)) return;',
                '  const myTroops = GI.getMyTroops();',
                '  const myTerritory = GI.getMyTerritory();',
                '  if (myTroops < myTerritory * 3) return;',
                '  const borderTiles = GI.getBorderTiles(GI.myId);',
                '  const enemyCounts = new Map();',
                '  for (const tile of borderTiles) {',
                '    for (const n of GI.getNeighbors(tile)) {',
                '      const owner = GI.getTileOwner(n);',
                '      if (owner >= 0 && owner !== GI.myId && !GI.areAllies(GI.myId, owner)) {',
                '        enemyCounts.set(owner, (enemyCounts.get(owner) || 0) + 1);',
                '      }',
                '    }',
                '  }',
                '  const sorted = Array.from(enemyCounts.entries()).sort((a, b) => b[1] - a[1]);',
                '  if (sorted.length > 0) {',
                '    GI.sendAttack(Math.min(myTroops * 0.5, 512), sorted[0][0]);',
                '  }',
                '}, 1200);'
            ].join('\n'),

            debug: [
                '/* Debug Dumper v3.0 — Deep Inspection */',
                'const G = window.G;',
                'if (!G) { console.error("No game hook"); return; }',
                'console.log("=== TERRIX DEBUG DUMP ===");',
                'console.log("G keys:", Object.keys(G));',
                '',
                '// --- ag (player data) ---',
                'if (G.ag) {',
                '  const agProps = Object.getOwnPropertyNames(G.ag);',
                '  console.log("ag props:", agProps);',
                '  for (const p of agProps) {',
                '    const v = G.ag[p];',
                '    if (Array.isArray(v)) {',
                '      const nonNull = v.filter(x => x != null).length;',
                '      console.log("  ag." + p + " = Array(" + v.length + "), non-null:" + nonNull);',
                '    } else if (v instanceof Uint32Array) console.log("  ag." + p + " = Uint32Array(" + v.length + "), first5:", Array.from(v.subarray(0,5)));',
                '    else if (v instanceof Uint16Array) console.log("  ag." + p + " = Uint16Array(" + v.length + "), first5:", Array.from(v.subarray(0,5)));',
                '    else if (v instanceof Uint8Array) console.log("  ag." + p + " = Uint8Array(" + v.length + "), first5:", Array.from(v.subarray(0,5)));',
                '    else if (typeof v === "function") console.log("  ag." + p + " = function");',
                '    else console.log("  ag." + p + " =", typeof v, v);',
                '  }',
                '} else { console.log("G.ag is undefined!"); }',
                '',
                '// --- aD (game config) ---',
                'if (G.aD) {',
                '  console.log("aD.et =", G.aD.et, "| aD.f6 =", G.aD.f6, "| aD.ko =", G.aD.ko);',
                '  console.log("aD.i3(FFA) =", G.aD.i3, "| aD.km(mode) =", G.aD.km);',
                '  console.log("aD.kA type:", typeof G.aD.kA);',
                '}',
                '',
                '// --- ae (score/stats) ---',
                'if (G.ae) {',
                '  console.log("ae.kA type:", typeof G.ae.kA);',
                '  if (typeof G.ae.kA === "function") {',
                '    try { console.log("ae.kA(myId) =", G.ae.kA(G.aD.et), "| ae.kA() =", G.ae.kA()); } catch(e) {}',
                '  }',
                '}',
                '',
                '// --- ac (map tile access) ---',
                'if (G.ac) {',
                '  const acProps = Object.getOwnPropertyNames(G.ac);',
                '  console.log("ac props:", acProps.filter(p => typeof G.ac[p] === "function"));',
                '  console.log("ac.fB =", G.ac.fB);',
                '}',
                '',
                '// --- bA.hZ (command sender) ---',
                'if (G.bA && G.bA.hZ) {',
                '  const hZProps = Object.getOwnPropertyNames(G.bA.hZ);',
                '  console.log("hZ methods:", hZProps.filter(p => typeof G.bA.hZ[p] === "function"));',
                '}',
                '',
                '// --- bU (map size) ---',
                'if (G.bU) {',
                '  console.log("bU.fK(width) =", G.bU.fK, "| bU.fL(height) =", G.bU.fL);',
                '}',
                '',
                '// --- bN (ships) ---',
                'if (G.bN && G.bN.y) {',
                '  console.log("bN.y.mK(shipCount) =", G.bN.y.mK);',
                '}',
                '',
                '// --- My player data ---',
                'if (G.ag && G.aD && G.ag.gx) {',
                '  const myId = G.aD.et;',
                '  console.log("MY DATA: id=" + myId + " territory=" + G.ag.gx[myId] + " troops=" + G.ag.hB[myId] + " alive=" + G.ag.n4[myId]);',
                '  console.log("MY NAME:", G.ag.a1o ? G.ag.a1o[myId] : "N/A");',
                '}',
                'console.log("=== END DUMP ===");'
            ].join('\n')
        };
        return scripts[id] || null;
    }

    function startLoops() {
        TERRIX.loops.leaderboard = setInterval(updateLeaderboard, 800);
        TERRIX.loops.configSync = setInterval(() => {
            if (TERRIX.config.godbot.enabled && !TERRIX.loops.godbot) {
                const code = getScriptCode('godbot');
                if (code) {
                    const fn = new Function('G', 'GI', 'TERRIX', 'Logger', code);
                    fn(_win.G, GameInterface, TERRIX, Logger);
                }
            }
            if (TERRIX.config.minimap.enabled) {
                ensureMinimap();
            } else {
                removeMinimap();
            }
        }, 1000);
    }

    function stopAllLoops() {
        Object.keys(TERRIX.loops).forEach(key => {
            if (TERRIX.loops[key]) {
                clearInterval(TERRIX.loops[key]);
                TERRIX.loops[key] = null;
            }
        });
    }

    const lbNodes = {};
    let lbPropCache = null;

    function discoverAgProps() {
        const G = _win.G;
        if (!G || !G.ag) return null;
        const props = Object.getOwnPropertyNames(G.ag);
        const find = (candidates) => {
            for (const c of candidates) {
                if (props.includes(c) && G.ag[c] != null) return c;
            }
            return null;
        };
        const findTypedArray = (candidates, type) => {
            for (const c of candidates) {
                if (props.includes(c) && G.ag[c] instanceof type) return c;
            }
            return null;
        };
        return {
            territory: findTypedArray(['gx','h7','gt','j2'], Uint32Array),
            troops: findTypedArray(['hB','h7','gt'], Uint32Array),
            alive: findTypedArray(['n4','a1h','n3','mz'], Uint8Array) || find(['n4','a4W','a1h']),
            names: find(['a1o','za','zb','zU','name','names']),
            maxPlayers: (G.aD && G.aD.f6) || 512
        };
    }

    function updateLeaderboard() {
        const container = document.getElementById('tx-tab-chart');
        if (!container || container.style.display !== 'flex') return;
        const G = _win.G;
        if (!G || !G.ag || !G.aD) return;

        if (!lbPropCache) lbPropCache = discoverAgProps();
        if (!lbPropCache) return;

        const { territory, troops, alive, names, maxPlayers } = lbPropCache;
        if (!territory || !alive) return;

        const ag = G.ag;
        const myId = G.aD.et;
        const players = [];

        for (let i = 0; i < maxPlayers; i++) {
            if ((ag[alive][i] || 0) !== 0 && ag[territory][i] > 0) {
                const t = ag[territory][i];
                const tr = troops ? (ag[troops][i] || 0) : 0;
                const score = (t * 10) + (tr / 50);
                const name = names ? (ag[names][i] || 'Bot') : 'Bot';
                players.push({ id: i, name, val: score, isMe: i === myId });
            }
        }
        players.sort((a, b) => b.val - a.val);
        const top = players.slice(0, 20);
        const maxVal = top[0]?.val || 1;

        top.forEach((p, idx) => {
            if (!lbNodes[p.id]) {
                const r = document.createElement('div');
                r.className = 'tx-bar-row';
                r.innerHTML = '<div class="tx-bar-rank"></div><div class="tx-bar-name"></div><div class="tx-bar-track"><div class="tx-bar-fill"></div><span class="tx-bar-val"></span></div>';
                container.appendChild(r);
                lbNodes[p.id] = r;
            }
            const r = lbNodes[p.id];
            r.style.display = 'flex';
            r.style.order = idx;
            r.className = p.isMe ? 'tx-bar-row tx-me-row' : 'tx-bar-row';
            r.querySelector('.tx-bar-rank').textContent = '#' + (idx + 1);
            r.querySelector('.tx-bar-name').textContent = p.name;
            r.querySelector('.tx-bar-fill').style.width = (p.val / maxVal * 100) + '%';
            r.querySelector('.tx-bar-val').textContent = Math.floor(p.val).toLocaleString();
        });
        Object.keys(lbNodes).forEach(id => {
            if (!top.find(p => p.id == id)) lbNodes[id].style.display = 'none';
        });
    }

    function ensureMinimap() {
        let el = document.getElementById('tx-minimap');
        if (el) return;
        el = document.createElement('div');
        el.id = 'tx-minimap';
        const cfg = TERRIX.config.minimap;
        const size = cfg.size || 180;
        el.style.width = size + 'px';
        el.style.height = size + 'px';
        el.style.opacity = cfg.opacity || 0.85;
        const pos = cfg.position || 'bottom-right';
        if (pos === 'bottom-right') { el.style.bottom = '10px'; el.style.right = '10px'; }
        else if (pos === 'bottom-left') { el.style.bottom = '10px'; el.style.left = '10px'; }
        else if (pos === 'top-right') { el.style.top = '40px'; el.style.right = '10px'; }
        else if (pos === 'top-left') { el.style.top = '40px'; el.style.left = '10px'; }
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        el.appendChild(canvas);
        document.body.appendChild(el);
        TERRIX.loops.minimap = setInterval(renderMinimap, 200);
    }

    function removeMinimap() {
        const el = document.getElementById('tx-minimap');
        if (el) el.remove();
        if (TERRIX.loops.minimap) { clearInterval(TERRIX.loops.minimap); TERRIX.loops.minimap = null; }
    }

    function renderMinimap() {
        const el = document.getElementById('tx-minimap');
        if (!el) return;
        const canvas = el.querySelector('canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const G = _win.G;
        if (!G || !G.ag || !G.aD || !G.bU || !G.ac) return;

        const mapW = G.bU.fK, mapH = G.bU.fL;
        if (!mapW || !mapH) return;

        // Find the all-tiles property (gq, gb, gp, or fY) — must be an array of arrays
        const agProps = Object.getOwnPropertyNames(G.ag);
        let allTilesProp = null;
        for (const p of ['gq', 'fY', 'gb', 'gp']) {
            if (agProps.includes(p) && Array.isArray(G.ag[p]) && G.ag[p] !== null) {
                // Verify it looks like tile data (array of arrays)
                if (G.ag[p].length > 0 && Array.isArray(G.ag[p][0])) {
                    allTilesProp = p;
                    break;
                }
            }
        }
        if (!allTilesProp) return; // Tile data not initialized yet

        const aliveProp = agProps.includes('n4') ? 'n4' : agProps.includes('a4W') ? 'a4W' : null;
        if (!aliveProp) return;

        // Tile to XY conversion using ac.zC/ac.zD
        const ac = G.ac;
        const toX = typeof ac.zC === 'function' ? ac.zC : (e => (e >> 2) % mapW);
        const toY = typeof ac.zD === 'function' ? ac.zD : (e => Math.floor((e >> 2) / mapW));

        const W = canvas.width, H = canvas.height;
        const scaleX = W / mapW, scaleY = H / mapH;

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, W, H);

        const max = G.aD.f6 || 512;
        const myId = G.aD.et;

        for (let i = 0; i < max; i++) {
            if (i === myId || (G.ag[aliveProp] && G.ag[aliveProp][i] === 0)) continue;
            const tiles = G.ag[allTilesProp] && G.ag[allTilesProp][i];
            if (!tiles || !Array.isArray(tiles) || tiles.length === 0) continue;
            let isAlly = false;
            try {
                if (G.bu && typeof G.bu.hi === 'function') isAlly = G.bu.hi(myId, i);
                else if (G.bu && typeof G.bu.f2 === 'function') isAlly = !G.bu.f2(myId, i);
            } catch(e) {}
            ctx.fillStyle = isAlly ? 'rgba(0,100,255,0.4)' : 'rgba(200,50,50,0.4)';
            const step = Math.max(1, Math.floor(tiles.length / 200));
            for (let j = 0; j < tiles.length; j += step) {
                try {
                    const enc = tiles[j];
                    const xx = toX(enc);
                    const yy = toY(enc);
                    if (xx >= 0 && xx < mapW && yy >= 0 && yy < mapH) {
                        ctx.fillRect(xx * scaleX, yy * scaleY, Math.max(1, scaleX), Math.max(1, scaleY));
                    }
                } catch(e) {}
            }
        }

        // Draw my territory last (on top)
        const myTiles = G.ag[allTilesProp] && G.ag[allTilesProp][myId];
        if (myTiles && Array.isArray(myTiles) && myTiles.length > 0) {
            ctx.fillStyle = 'rgba(0,255,0,0.6)';
            const step = Math.max(1, Math.floor(myTiles.length / 200));
            for (let j = 0; j < myTiles.length; j += step) {
                try {
                    const enc = myTiles[j];
                    const xx = toX(enc);
                    const yy = toY(enc);
                    if (xx >= 0 && xx < mapW && yy >= 0 && yy < mapH) {
                        ctx.fillRect(xx * scaleX, yy * scaleY, Math.max(1, scaleX), Math.max(1, scaleY));
                    }
                } catch(e) {}
            }
        }

        ctx.strokeStyle = '#3a47ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, W, H);
    }

    const MultiTab = {
        channel: null,
        peers: new Map(),
        myPeerId: 'tx_' + Math.random().toString(36).substr(2, 8),

        init() {
            try {
                this.channel = new BroadcastChannel('terrix_multitab');
                this.channel.onmessage = (e) => this.handleMessage(e.data);
                this.send({ type: 'join', peerId: this.myPeerId, playerId: GameInterface.myId });
                Logger.log('Multi-tab sync active. Peer:', this.myPeerId);
            } catch(e) {
                Logger.warn('BroadcastChannel not supported');
            }
        },

        send(data) {
            if (this.channel) {
                data.sender = this.myPeerId;
                data.timestamp = Date.now();
                this.channel.postMessage(data);
            }
        },

        handleMessage(data) {
            if (data.sender === this.myPeerId) return;
            switch (data.type) {
                case 'join':
                    this.peers.set(data.peerId, { playerId: data.playerId, lastSeen: Date.now() });
                    this.send({ type: 'ack', peerId: this.myPeerId, playerId: GameInterface.myId });
                    Logger.log('Peer joined:', data.peerId, 'player:', data.playerId);
                    break;
                case 'ack':
                    this.peers.set(data.peerId, { playerId: data.playerId, lastSeen: Date.now() });
                    break;
                case 'attack':
                    if (TERRIX.config.multitab.syncAttack && data.targetId !== undefined) {
                        Logger.log('Peer attack synced:', data.targetId);
                    }
                    break;
                case 'retreat':
                    Logger.log('Peer retreat synced');
                    break;
                case 'peace':
                    Logger.log('Peer peace synced');
                    break;
            }
        },

        syncAttack(targetId, intensity) {
            this.send({ type: 'attack', targetId, intensity });
        },

        syncRetreat() {
            this.send({ type: 'retreat' });
        },

        syncPeace() {
            this.send({ type: 'peace' });
        },

        getPeerCount() {
            return this.peers.size;
        }
    };

    _win.TERRIX = TERRIX;
    _win.GameInterface = GameInterface;
    _win.Logger = Logger;
    _win.MultiTab = MultiTab;
})();