// ==UserScript==
// @name         TerriX Executor v3.0
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Ultimate Strategy Suite. Complete rewrite with neighbor-based AI, ESP, minimap, and multi-tab support.
// @author       Terri Exploits Inc.
// @match        *://territorial.io/*
// @match        *://everythingtt.github.io/The-TerriX-Client/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Spoof device footprint from iframe proxy if present
    try {
        if (window.name && window.name.startsWith('{')) {
            const fp = JSON.parse(window.name);
            
            // MULTI-ACCOUNT ISOLATION: 
            // Clear storage specifically to prevent "Player Already In Lobby" cross-tab detection
            try {
                localStorage.clear();
                sessionStorage.clear();
            } catch(e) {}
            
            if (fp.ua) {
                Object.defineProperty(navigator, 'userAgent', { value: fp.ua });
                Object.defineProperty(navigator, 'hardwareConcurrency', { value: fp.cores });
                Object.defineProperty(navigator, 'deviceMemory', { value: fp.mem });
                Object.defineProperty(navigator, 'language', { value: fp.lang });
                Object.defineProperty(screen, 'width', { value: fp.width });
                Object.defineProperty(screen, 'height', { value: fp.height });
            }
        }
    } catch(e) {}
    
    const TERRIX = {
        version: '3.0.0',
        initialized: false,
        hooked: false,
        loops: {},
        gui: null,
        auth: { user: null, profile: null, purchased: [], supabase: null },
        config: {
            godbot: {
                enabled: false,
                expandRatio: 2.0,
                attackRatio: 3.0,
                retreatRatio: 0.3,
                tickRate: 600,
                strategy: 'balanced',
                maxTargets: 3,
                queueAttacks: true,
                queueDelay: 150,
                autoReinforce: true,
                smartExpand: true,
                snipeWindowStart: 85,
                snipeIntensity: 0.4,
                densityParityMin: 0.8,
                closeRange: 150,
                botAttackWindowEnd: 70
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
                size: 220,
                position: 'bottom-right',
                opacity: 0.9,
                showGrid: true,
                showViewport: true,
                showMountains: true,
                showPlayers: true
            },
            multitab: {
                enabled: false,
                proxyUrl: '',
                syncAttack: true
            },
            ui: {
                theme: 'terrix',
                lockPosition: false
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
            return G && G.aD ? G.aD.es : -1;
        },

        get maxPlayers() {
            const G = this.G;
            return G && G.aD ? G.aD.f5 : 512;
        },

        getMyTroops() {
            const G = this.G;
            if (!G || !G.ag) return 0;
            const prop = PropResolver.resolveTypedArray(['hB','gx','h7','gt', 'gw', 'yf', 'hA']) || 'gw';
            return G.ag[prop][this.myId] || 0;
        },

        getMyTerritory() {
            const G = this.G;
            if (!G || !G.ag) return 0;
            const prop = PropResolver.resolveTypedArray(['gx','hB','h7','gt','j2', 'gw', 'yf', 'hA']) || 'gw';
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
            const prop = PropResolver.resolveTypedArray(['hB','gx','h7','gt', 'gw', 'yf', 'hA']) || 'gw';
            return G.ag[prop][id] || 0;
        },

        getPlayerTerritory(id) {
            const G = this.G;
            if (!G || !G.ag) return 0;
            const prop = PropResolver.resolveTypedArray(['gx','hB','h7','gt','j2', 'gw', 'yf', 'hA']) || 'gw';
            return G.ag[prop][id] || 0;
        },

        isPlayerAlive(id) {
            const G = this.G;
            if (!G || !G.ag) return false;
            const prop = PropResolver.resolveTypedArray(['n4','a4W','a1h','n3','mz', 'a4V']) || 'n3';
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
            const prop = PropResolver.resolveAgProp(['gb','gp','gq','fY', 'ga', 'go']) || 'gp';
            return (G.ag[prop] && G.ag[prop][id]) || [];
        },

        getAllTiles(id) {
            const G = this.G;
            if (!G || !G.ag) return [];
            const prop = PropResolver.resolveAgProp(['gq','gb','gp','fY', 'ga', 'go']) || 'gq';
            return (G.ag[prop] && G.ag[prop][id]) || [];
        },

        getLandTiles(id) {
            const G = this.G;
            if (!G || !G.ag) return [];
            const prop = PropResolver.resolveAgProp(['fY','gq','gb','gp', 'ga', 'go']) || 'fY';
            return (G.ag[prop] && G.ag[prop][id]) || [];
        },

        getPerimeterTiles(id) {
            const G = this.G;
            if (!G || !G.ag) return [];
            const prop = PropResolver.resolveAgProp(['gp','gb','gq','fY', 'ga', 'go']) || 'gp';
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
                const maxScore = scoreObj.kA();
                return myScore > (maxScore * TERRIX.config.godbot.peaceThreshold);
            } catch(e) { return false; }
        },

        getGameState() {
            const G = this.G;
            if (!G || !G.aD) return -1;
            return G.aD.a18;
        },

        isPlaying() {
            return this.getGameState() === 1;
        },

        getLeaderboard() {
            const G = this.G;
            if (!G) return [];
            const scoreObj = G.ae || G.aD;
            if (!scoreObj || typeof scoreObj.kA !== 'function') return [];
            const players = [];
            const max = this.maxPlayers;
            for (let i = 0; i < max; i++) {
                if (this.isPlayerAlive(i)) {
                    try {
                        const score = scoreObj.kA(i) || 0;
                        players.push({ id: i, score, name: this.getPlayerName(i), troops: this.getPlayerTroops(i), territory: this.getPlayerTerritory(i), team: this.getPlayerTeam(i), isMe: i === this.myId });
                    } catch(e) {}
                }
            }
            players.sort((a, b) => b.score - a.score);
            return players;
        },

        getClosestEnemy(maxDist) {
            const G = this.G;
            if (!G || !G.bP || !G.bP.y || !G.ac) return null;
            const ships = G.bP.y;
            const myId = this.myId;
            const mapW = G.bU.fK;
            const mapW16 = mapW << 4;
            let closest = null;
            let closestDist = maxDist || Infinity;
            const myTiles = this.getBorderTiles(myId);
            if (myTiles.length === 0) return null;
            const myCenterTile = myTiles[Math.floor(myTiles.length / 2)];
            const myXY = this.tileToXY(myCenterTile);
            for (let i = 0; i < ships.mK; i++) {
                const owner = ships.mO[i] >> 3;
                if (owner === myId || !this.isPlayerAlive(owner) || this.areAllies(myId, owner)) continue;
                const iS = ships.mZ[i];
                if (!iS || iS <= 0) continue;
                const tileX = (iS % mapW16) / 16;
                const tileY = Math.floor(iS / mapW16) / 16;
                const dx = tileX - myXY.x;
                const dy = tileY - myXY.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = { id: owner, dist, x: tileX, y: tileY };
                }
            }
            return closest;
        },

        getThreats() {
            const G = this.G;
            if (!G || !G.bP || !G.bP.y) return [];
            const ships = G.bP.y;
            const myId = this.myId;
            const myBorder = new Set(this.getBorderTiles(myId));
            const threats = [];
            for (let i = 0; i < ships.mK; i++) {
                const target = ships.mO[i] >> 3;
                if (target !== myId) continue;
                const iS = ships.mZ[i];
                if (!iS || iS <= 0) continue;
                const srcPlayer = ships.mO[i] & 0x7;
                threats.push({ shipIdx: i, target, encoded: iS });
            }
            return threats;
        },

        getBorderWith(id) {
            const myBorder = this.getBorderTiles(this.myId);
            const theirBorder = this.getBorderTiles(id);
            if (myBorder.length === 0 || theirBorder.length === 0) return [];
            const theirSet = new Set(theirBorder);
            const contact = [];
            for (const t of myBorder) {
                const neighbors = this.getNeighbors(t);
                for (const n of neighbors) {
                    if (theirSet.has(n)) {
                        contact.push({ myTile: t, theirTile: n });
                    }
                }
            }
            return contact;
        },

        findBestAttackTile(targetId) {
            const contact = this.getBorderWith(targetId);
            if (contact.length === 0) return null;
            let best = null;
            let bestScore = -Infinity;
            for (const c of contact) {
                if (!this.isWalkable(c.myTile) || this.isMountain(c.myTile)) continue;
                const n = this.getNeighbors(c.myTile);
                let friendly = 0;
                for (const nb of n) {
                    if (this.getTileOwner(nb) === this.myId) friendly++;
                }
                const score = friendly * 10 + Math.random() * 5;
                if (score > bestScore) {
                    bestScore = score;
                    best = c.myTile;
                }
            }
            return best;
        },

        expandToNearest() {
            const borderTiles = this.getBorderTiles(this.myId);
            const neutral = borderTiles.filter(t => this.isNeutral(t) && this.isWalkable(t) && !this.isMountain(t));
            if (neutral.length === 0) return null;
            let best = null;
            let bestDist = Infinity;
            const G = this.G;
            if (G && G.bP && G.bP.y) {
                const ships = G.bP.y;
                const mapW16 = G.bU.fK << 4;
                for (let s = 0; s < ships.mK; s++) {
                    const owner = ships.mO[s] >> 3;
                    if (owner === this.myId || !this.isPlayerAlive(owner) || this.areAllies(this.myId, owner)) continue;
                    const iS = ships.mZ[s];
                    if (!iS || iS <= 0) continue;
                    const ex = (iS % mapW16) / 16;
                    const ey = Math.floor(iS / mapW16) / 16;
                    for (const t of neutral) {
                        const xy = this.tileToXY(t);
                        const dx = xy.x - ex;
                        const dy = xy.y - ey;
                        const dist = dx * dx + dy * dy;
                        if (dist < bestDist) {
                            bestDist = dist;
                            best = t;
                        }
                    }
                }
            }
            if (!best) best = neutral[Math.floor(Math.random() * neutral.length)];
            return best;
        },

        reinforceBorder(targetId) {
            const contact = this.getBorderWith(targetId);
            if (contact.length === 0) return null;
            const tiles = contact.map(c => c.myTile).filter(t => this.isWalkable(t) && !this.isMountain(t));
            if (tiles.length === 0) return null;
            return tiles[Math.floor(Math.random() * tiles.length)];
        },

        sendChat(msg) {
            const G = this.G;
            if (!G) return false;
            try {
                if (G.t && typeof G.t.send === 'function') { G.t.send(msg); return true; }
                if (G.bS && typeof G.bS.send === 'function') { G.bS.send(msg); return true; }
            } catch(e) {}
            return false;
        },

        getPlayerCenter(id) {
            const G = this.G;
            if (!G || !G.bQ) return null;
            const fo = G.bQ.fo;
            const fp = G.bQ.fp;
            if (!fo || !fp) return null;
            return { x: fo[id] || 0, y: fp[id] || 0 };
        },

        getShipCount() {
            const G = this.G;
            if (!G || !G.bP || !G.bP.y) return 0;
            return G.bP.y.mK | 0;
        },

        getMyShips() {
            const G = this.G;
            if (!G || !G.bP || !G.bP.y) return [];
            const ships = G.bP.y;
            const myId = this.myId;
            const result = [];
            const mapW16 = G.bU.fK << 4;
            for (let i = 0; i < ships.mK; i++) {
                const owner = ships.mO[i] >> 3;
                if (owner !== myId) continue;
                const iS = ships.mZ[i];
                if (!iS || iS <= 0) continue;
                result.push({ idx: i, x: (iS % mapW16) / 16, y: Math.floor(iS / mapW16) / 16, encoded: iS });
            }
            return result;
        },

        getCycleTick() {
            const G = this.G;
            if (!G || !G.bh) return 0;
            try { return G.bh.kQ() % 100; } catch(e) { return 0; }
        },

        getCycleProgress() {
            return this.getCycleTick() / 100;
        },

        getDensity(playerId) {
            const pId = playerId != null ? playerId : this.myId;
            const troops = this.getPlayerTroops(pId);
            const land = this.getPlayerTerritory(pId);
            if (land === 0) return 0;
            return troops / land;
        },

        getDistanceToPlayer(targetId) {
            const me = this.getPlayerCenter(this.myId);
            const them = this.getPlayerCenter(targetId);
            if (!me || !them) return 9999;
            const dx = me.x - them.x;
            const dy = me.y - them.y;
            return Math.sqrt(dx * dx + dy * dy);
        },

        predictResources(playerId, ticksInFuture) {
            const pId = playerId != null ? playerId : this.myId;
            const currentTroops = this.getPlayerTroops(pId);
            const land = this.getPlayerTerritory(pId);
            return currentTroops + (land * 0.2 * (ticksInFuture / 10));
        },

        predictDensityAtContact(targetId) {
            const myLand = this.getMyTerritory();
            const myTroops = this.getMyTroops();
            const theirLand = this.getPlayerTerritory(targetId);
            const theirTroops = this.getPlayerTroops(targetId);
            const dist = this.getDistanceToPlayer(targetId);
            const myGrowthRate = myLand * 0.02;
            const theirGrowthRate = theirLand * 0.02;
            const ticksToContact = dist / 3;
            const myFutureTroops = myTroops + myGrowthRate * ticksToContact;
            const theirFutureTroops = theirTroops + theirGrowthRate * ticksToContact;
            const myFutureDensity = myLand > 0 ? myFutureTroops / myLand : 0;
            const theirFutureDensity = theirLand > 0 ? theirFutureTroops / theirLand : 0;
            return { myDensity: myFutureDensity, theirDensity: theirFutureDensity, ticksToContact, myFutureTroops, theirFutureTroops };
        },

        isVulnerable() {
            const myDensity = this.getDensity(this.myId);
            const myId = this.myId;
            const G = this.G;
            if (!G) return false;
            const maxP = G.aD ? (G.aD.f5 || 512) : 512;
            for (let i = 0; i < maxP; i++) {
                if (i === myId || !this.isPlayerAlive(i) || this.areAllies(myId, i)) continue;
                if (this.getBorderWith(i).length > 0) {
                    const neighborDensity = this.getDensity(i);
                    if (neighborDensity > myDensity * 1.2) return true;
                }
            }
            return false;
        },

        getAlivePlayers() {
            const G = this.G;
            if (!G) return [];
            const maxP = G.aD ? (G.aD.f5 || 512) : 512;
            const players = [];
            for (let i = 0; i < maxP; i++) {
                if (this.isPlayerAlive(i)) {
                    players.push({ id: i, name: this.getPlayerName(i), troops: this.getPlayerTroops(i), territory: this.getPlayerTerritory(i), team: this.getPlayerTeam(i), isMe: i === this.myId, density: this.getDensity(i) });
                }
            }
            return players;
        },

        getTimeToContact(targetId) {
            const dist = this.getDistanceToPlayer(targetId);
            return Math.round(dist / 3);
        },

        shouldSnipe(targetId) {
            const myTroops = this.getMyTroops();
            const myLand = this.getMyTerritory();
            const targetTroops = this.getPlayerTroops(targetId);
            const targetLand = this.getPlayerTerritory(targetId);
            const myDensity = this.getDensity();
            const targetDensity = this.getDensity(targetId);
            const canSnipe = (myDensity >= targetDensity * 0.9) || (targetTroops < myTroops * 0.5);
            const isProfitable = targetLand > myLand * 0.1;
            return canSnipe && isProfitable;
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

    let lbPropCache = null;

    function validateHook() {
        const G = _win.G;
        if (!G || !G.aD || !G.ag || typeof G.aD.es !== 'number') return false;
        const props = Object.keys(G.ag);
        const u32s = props.filter(p => G.ag[p] instanceof Uint32Array && G.ag[p].length === G.aD.f5);
        const u8s = props.filter(p => G.ag[p] instanceof Uint8Array && G.ag[p].length === G.aD.f5);
        return u32s.length >= 2 && u8s.length >= 1;
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
        initMarket();
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
            '      <a href="https://everythingtt.github.io/The-TerriX-Client/Territorial.io.html" style="color:' + T.colorBorderBtnPrimary + ';" target="_blank">Open TerriX Client →</a>',
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
            '#tx-header.locked{cursor:default;}',
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
            '#tx-tab-market{flex:1;display:none;overflow:hidden;}',
            '#tx-tab-editor{flex:1;display:none;flex-direction:column;overflow:hidden;}',
            '#tx-editor-wrap{flex:1;display:flex;overflow:hidden;position:relative;}',
            '#tx-line-nums{width:36px;flex-shrink:0;background:' + T.bgEditor + '99;border-right:1px solid ' + T.outputBorder + ';color:' + T.colorTextMuted + ';font-family:Consolas,monospace;font-size:11px;line-height:1.5;padding:8px 4px 8px 0;text-align:right;overflow:hidden;user-select:none;}',
            '#tx-line-nums div{height:16.8px;}',
            '#tx-editor{flex:1;background:' + T.bgEditor + ';color:' + T.editorText + ';border:none;padding:8px 12px;font-family:Consolas,monospace;font-size:12px;resize:none;outline:none;line-height:1.5;tab-size:2;overflow:auto;}',
            '#tx-code-toolbar{display:flex;align-items:center;gap:6px;padding:4px 8px;background:' + T.bgEditor + 'cc;border-top:1px solid ' + T.outputBorder + ';flex-shrink:0;}',
            '#tx-cursor-pos{margin-left:auto;font-size:9px;color:' + T.colorTextMuted + ';font-family:monospace;}',
            '.tx-btn-sm{padding:3px 10px;font-size:10px;}',
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
            '#tx-minimap canvas{display:block;}',
            '#tx-debug-log{position:fixed;bottom:0;left:0;width:400px;max-height:200px;z-index:2147483647;background:' + T.debugBg + ';border:1px solid ' + T.debugBorder + ';color:' + T.debugText + ';font-family:monospace;font-size:10px;overflow-y:auto;padding:6px;display:none;}',
            '.tx-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:' + T.toastBg + ';color:' + T.toastText + ';padding:8px 16px;border-radius:4px;font-size:12px;z-index:2147483647;border:1px solid ' + T.toastBorder + ';transition:opacity 0.3s;}',
            '#tx-code-output{flex:0 0 120px;background:' + T.bgOutput + ';border-top:1px solid ' + T.outputBorder + ';padding:6px 8px;font-family:monospace;font-size:10px;color:' + T.outputText + ';overflow-y:auto;}',
            '.tx-log-line{padding:1px 0;border-bottom:1px solid ' + T.outputBorder + '40;word-break:break-all;}',
            '.tx-log-err{color:#f44;}'
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
            '  <div id="tx-header" style="justify-content:space-between; display:flex; align-items:center;">',
            '    <span>TERRIX <span class="tx-ver">v3.0 ULTIMATE</span></span>',
            '    <div style="display:flex; gap:10px; align-items:center;">',
            '      <div id="tx-header-user" style="font-size:10px; color:#aaa; cursor:pointer;">Guest</div>',
            '      <span id="tx-close">✕</span>',
            '    </div>',
            '  </div>',
            '  <div id="tx-body">',
            '    <div id="tx-sidebar">',
            '      <button class="tx-nav-btn active" data-tab="editor">EDITOR</button>',
            '      <button class="tx-nav-btn" data-tab="chart">LEADERBOARD</button>',
            '      <button class="tx-nav-btn" data-tab="scripts">SCRIPTS</button>',
            '      <button class="tx-nav-btn" data-tab="config">CONFIG</button>',
            '      <button class="tx-nav-btn" data-tab="esp">ESP VIEW</button>',
            '      <button class="tx-nav-btn" data-tab="market">MARKETPLACE</button>',
            '      <div style="flex:1"></div>',
            '      <button class="tx-nav-btn" id="tx-btn-hook" style="border-color:#664">HOOK</button>',
            '      <button class="tx-nav-btn" onclick="window.open(\'https://everythingtt.github.io/The-TerriX-Client/Territorial.io.html\')">CLIENT</button>',
            '    </div>',
            '    <div id="tx-main">',
            '      <div id="tx-tab-editor">',
            '        <div id="tx-editor-wrap">',
            '          <div id="tx-line-nums"></div>',
            '          <textarea id="tx-editor" spellcheck="false" wrap="off">/* TerriX v5.0 Code Executor */\n/* GI = GameInterface, G = game state, Logger = Logger */\n/* === CORE === */\n/* GI.myId, GI.getMyTroops(), GI.getMyTerritory() */\n/* GI.sendAttack(intensity, targetId) */\n/* GI.sendAttackTile(intensity, tile, targetId) */\n/* GI.getLeaderboard(), GI.getClosestEnemy() */\n/* GI.findBestAttackTile(targetId) */\n/* GI.expandToNearest(), GI.reinforceBorder(targetId) */\n/* === v5.0 STRATEGIC === */\n/* GI.getCycleTick() — 0-99 interest cycle position */\n/* GI.getDensity(id) — troops/land ratio */\n/* GI.getDistanceToPlayer(id) — pixel distance */\n/* GI.predictDensityAtContact(id) — future density */\n/* GI.getTimeToContact(id) — estimated ticks */\n/* GI.shouldSnipe(id) — late-cycle snipe check */\n/* GI.isVulnerable() — bordering strong neighbor */\n/* GI.getAlivePlayers() — array of player objects */\n/* Full game state: window.G */</textarea>',
            '        </div>',
            '        <div id="tx-code-toolbar">',
            '          <button class="tx-btn tx-btn-sm" id="tx-btn-format" title="Format code">FORMAT</button>',
            '          <button class="tx-btn tx-btn-sm" id="tx-btn-clear-editor" title="Clear editor">CLEAR</button>',
            '          <button class="tx-btn tx-btn-sm" id="tx-btn-snippet" title="Insert snippet">SNIPPET</button>',
            '          <label class="tx-btn tx-btn-sm" style="display:inline-flex;align-items:center;cursor:pointer;margin:0;">UPLOAD<input type="file" id="tx-btn-upload-script" style="display:none;"></label>',
            '          <span id="tx-cursor-pos">Ln 1, Col 1</span>',
            '        </div>',
            '        <div id="tx-code-output"></div>',
            '      </div>',
            '      <div id="tx-tab-chart"></div>',
            '      <div id="tx-tab-scripts"></div>',
            '      <div id="tx-tab-config"></div>',
            '      <div id="tx-tab-esp"><canvas id="tx-esp-canvas" style="width:100%;height:100%;"></canvas></div>',
            '      <div id="tx-tab-market" style="background:#111; padding:10px; flex-direction:column; gap:8px; overflow-y:auto; display:none;">',
            '        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding-bottom:8px;">',
            '          <h3 style="margin:0; font-size:14px; color:#fff;">TerriX Marketplace</h3>',
            '          <div id="tx-market-auth-status" style="font-size:10px; color:#888;">Not Logged In</div>',
            '        </div>',
            '        <div style="display:flex; gap:4px;">',
            '          <input type="text" id="tx-market-search" placeholder="Search scripts..." style="flex:1; background:#222; border:1px solid #444; color:#fff; padding:4px; font-size:11px;">',
            '        </div>',
            '        <div id="tx-market-grid" style="display:grid; grid-template-columns:1fr; gap:8px; max-height:430px; overflow-y:auto; padding-right:4px;">',
            '          <div style="color:#888; text-align:center; padding:20px;">Loading scripts...</div>',
            '        </div>',
            '      </div>',
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
                ['editor','chart','scripts','config','esp','market'].forEach(t => {
                    const el = document.getElementById('tx-tab-' + t);
                    if (el) el.style.display = (t === tab) ? (t === 'editor' ? 'flex' : (t === 'esp' || t === 'market') ? 'block' : 'flex') : 'none';
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

        const txEditor = document.getElementById('tx-editor');
        const txLineNums = document.getElementById('tx-line-nums');
        const txOutput = document.getElementById('tx-code-output');
        const txCursorPos = document.getElementById('tx-cursor-pos');

        function updateLineNums() {
            if (!txLineNums || !txEditor) return;
            const lines = txEditor.value.split('\n').length;
            txLineNums.innerHTML = '';
            for (let i = 1; i <= lines; i++) {
                const d = document.createElement('div');
                d.textContent = i;
                txLineNums.appendChild(d);
            }
        }

        function updateCursorPos() {
            if (!txCursorPos || !txEditor) return;
            const pos = txEditor.selectionStart;
            const text = txEditor.value.substring(0, pos);
            const lines = text.split('\n');
            const ln = lines.length;
            const col = lines[lines.length - 1].length + 1;
            txCursorPos.textContent = 'Ln ' + ln + ', Col ' + col;
        }

        function execCode(code) {
            // TerriX Executor Validation: check for valid key
            if (code.includes('/* KEY INJECTED: {{KEY}} */')) {
                txOutput.innerHTML = '<div class="tx-log-line tx-log-err">✗ Execution Failed: Item not purchased. No key found.</div>';
                txOutput.style.color = '#f44';
                return;
            }
            const keyMatch = code.match(/\/\* KEY INJECTED: (TX-[a-zA-Z0-9-]+) \*\//);
            if (!keyMatch) {
                // If no key system injection, allow it (maybe a free script)
            } else {
                Logger.log('Validated using key:', keyMatch[1]);
            }

            const logs = [];
            const cappedLog = function() {
                const msg = Array.from(arguments).join(' ');
                logs.push(msg);
                if (logs.length > 50) logs.shift();
            };
            const execLogger = {
                log: cappedLog, warn: cappedLog, error: cappedLog, debug: cappedLog,
                prefix: '[TerriX:Exec]'
            };
            try {
                const fn = new Function('G', 'GI', 'TERRIX', 'Logger', 'console', code);
                const result = fn(_win.G, GameInterface, TERRIX, execLogger, { log: cappedLog, warn: cappedLog, error: cappedLog });
                if (logs.length > 0) {
                    txOutput.innerHTML = logs.map(l => '<div class="tx-log-line">' + l.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>').join('');
                    txOutput.style.color = '#0f0';
                } else {
                    txOutput.innerHTML = '<div class="tx-log-line">✓ Executed successfully' + (result !== undefined ? ' → ' + String(result).substring(0, 200) : '') + '</div>';
                    txOutput.style.color = '#0f0';
                }
            } catch(e) {
                let errMsg = e.message || String(e);
                if (e.stack) {
                    const stackLines = e.stack.split('\n');
                    for (const sl of stackLines) {
                        if (sl.indexOf('>') !== -1 || sl.indexOf('Function') !== -1) {
                            const match = sl.match(/<anonymous>:(\d+):(\d+)/);
                            if (match) errMsg += ' [at line ' + (parseInt(match[1]) - 4) + ':' + match[2] + ']';
                            break;
                        }
                    }
                }
                txOutput.innerHTML = '<div class="tx-log-line tx-log-err">✗ ' + errMsg.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>';
                txOutput.style.color = '#f44';
            }
        }

        document.getElementById('tx-btn-execute').addEventListener('click', () => {
            const code = txEditor.value;
            if (!code.trim()) { txOutput.textContent = '⚠ No code to execute'; txOutput.style.color = '#fa0'; return; }
            execCode(code);
        });

        document.getElementById('tx-btn-stop').addEventListener('click', () => {
            stopAllLoops();
            TERRIX.config.godbot.enabled = false;
            TERRIX.config.esp.enabled = false;
            TERRIX.config.minimap.enabled = false;
            saveConfig();
            toast('All loops stopped');
        });

        document.getElementById('tx-btn-clear-editor').addEventListener('click', () => {
            txEditor.value = '';
            updateLineNums();
            txOutput.innerHTML = '';
            persistGUIState();
        });

        document.getElementById('tx-btn-upload-script').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (re) => {
                txEditor.value = re.target.result;
                updateLineNums();
                persistGUIState();
                toast('Script loaded: ' + file.name);
            };
            reader.readAsText(file);
        });

        document.getElementById('tx-btn-format').addEventListener('click', () => {
            const code = txEditor.value;
            let formatted = code.replace(/;/g, ';\n').replace(/{/g, ' {\n').replace(/}/g, '\n}\n');
            const lines = formatted.split('\n');
            let indent = 0;
            const result = [];
            for (let line of lines) {
                line = line.trim();
                if (!line) continue;
                if (line === '}') indent = Math.max(0, indent - 1);
                result.push('  '.repeat(indent) + line);
                if (line.endsWith('{')) indent++;
                if (line === '}') indent = Math.max(0, indent - 1);
            }
            txEditor.value = result.join('\n');
            updateLineNums();
            persistGUIState();
        });

        document.getElementById('tx-btn-snippet').addEventListener('click', () => {
            const snippets = [
                { label: 'Auto-Expand', code: '// Auto-Expand v5.0 — Cycle-aware expansion\nconst cycleTick = GI.getCycleTick();\nconst troops = GI.getMyTroops();\nconst territory = GI.getMyTerritory();\nconst density = GI.getDensity();\nLogger.log("Tick:", cycleTick, "Density:", density.toFixed(2));\nif (territory > 0 && troops > territory * 2) {\n  const tile = GI.expandToNearest();\n  if (tile) GI.sendAttackTile(troops * 0.3, tile, -1);\n}' },
                { label: 'Density Analysis', code: '// Density Analysis — Win Pressure check\nconst myDensity = GI.getDensity();\nconst players = GI.getAlivePlayers();\nconst enemies = players.filter(p => !p.isMe);\nLogger.log("My density:", myDensity.toFixed(2));\nfor (const e of enemies) {\n  const dist = GI.getDistanceToPlayer(e.id);\n  const ttc = GI.getTimeToContact(e.id);\n  const pred = GI.predictDensityAtContact(e.id);\n  Logger.log(e.name, "dist:", dist.toFixed(0),\n    "density:", e.density.toFixed(2),\n    "TTC:", ttc.toFixed(0),\n    "myFuture:", pred.myDensity.toFixed(2),\n    "theirFuture:", pred.theirDensity.toFixed(2));\n}\nLogger.log("Vulnerable:", GI.isVulnerable());' },
                { label: 'Cycle Snipe', code: '// Late-Cycle Snipe — Attack enemies before income tick\nconst cycleTick = GI.getCycleTick();\nif (cycleTick < 85) { Logger.log("Too early for snipe. Tick:", cycleTick); return; }\nconst enemies = GI.getAlivePlayers().filter(p => !p.isMe);\nfor (const e of enemies) {\n  if (!GI.shouldSnipe(e.id)) continue;\n  const tile = GI.findBestAttackTile(e.id);\n  if (!tile) continue;\n  const troops = GI.getMyTroops();\n  const intensity = Math.min(troops * 0.4, 1024);\n  GI.sendAttackTile(intensity, tile, e.id);\n  Logger.log("Snipe!", e.name, "tick:", cycleTick);\n  break;\n}' },
                { label: 'Threat Radar', code: '// Threat Radar — Find and log all threats\nconst threats = GI.getThreats();\nconst neighbors = GI.getBorderTiles(GI.myId);\nLogger.log("Incoming ships:", threats.length);\nLogger.log("Border tiles:", neighbors.length);\nconst closeEnemies = GI.getAlivePlayers().filter(p => {\n  if (p.isMe) return false;\n  return GI.getDistanceToPlayer(p.id) < 150;\n});\ncloseEnemies.forEach(e => {\n  Logger.log("CLOSE:", e.name, "dist:", GI.getDistanceToPlayer(e.id).toFixed(0));\n});' },
                { label: 'Leaderboard', code: '// Print Leaderboard\nconst lb = GI.getLeaderboard();\nlb.slice(0, 10).forEach((p, i) => {\n  Logger.log("#" + (i+1) + " " + p.name + " Score:" + p.score + " Territory:" + p.territory);\n});' },
                { label: 'Debug Dump v5', code: '// Debug Game State v5.0 — Full strategic dump\nLogger.log("=== TERRIX v5.0 DEBUG ===");\nLogger.log("myId:", GI.myId);\nLogger.log("troops:", GI.getMyTroops());\nLogger.log("territory:", GI.getMyTerritory());\nLogger.log("density:", GI.getDensity().toFixed(2));\nLogger.log("cycleTick:", GI.getCycleTick());\nLogger.log("cycleProgress:", (GI.getCycleProgress() * 100).toFixed(0) + "%");\nLogger.log("alive:", GI.isPlayerAlive(GI.myId));\nLogger.log("playing:", GI.isPlaying());\nLogger.log("vulnerable:", GI.isVulnerable());\nLogger.log("gameState:", GI.getGameState());\nLogger.log("mapSize:", JSON.stringify(GI.getMapSize()));\nLogger.log("alivePlayers:", GI.getAlivePlayers().length);\nLogger.log("ships:", GI.getShipCount());' }
            ];
            const labels = snippets.map(s => s.label);
            const choice = prompt('Choose snippet:\n' + labels.map((l, i) => (i+1) + '. ' + l).join('\n'));
            const idx = parseInt(choice) - 1;
            if (idx >= 0 && idx < snippets.length) {
                txEditor.value = snippets[idx].code;
                updateLineNums();
                persistGUIState();
            }
        });

        txEditor.addEventListener('input', () => {
            updateLineNums();
            updateCursorPos();
            persistGUIState();
        });
        txEditor.addEventListener('click', updateCursorPos);
        txEditor.addEventListener('keyup', updateCursorPos);
        txEditor.addEventListener('scroll', () => {
            if (txLineNums) txLineNums.scrollTop = txEditor.scrollTop;
        });

        updateLineNums();

        TERRIX.loops.autoSave = setInterval(() => {
            persistGUIState();
            saveConfig();
        }, 5000);

        if (TERRIX.config.ui.lockPosition) {
            const hdr = document.getElementById('tx-header');
            if (hdr) hdr.classList.add('locked');
        }

        let dragging = false, dragX, dragY;
        document.getElementById('tx-header').addEventListener('mousedown', (e) => {
            if (e.target.id === 'tx-close') return;
            if (TERRIX.config.ui.lockPosition) return;
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

        TERRIX.centerGUI = function() {
            gui.style.left = '50%';
            gui.style.top = '80px';
            gui.style.transform = 'translateX(-50%)';
            persistGUIState();
        };

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

    async function initMarket() {
        const SUPABASE_URL = 'https://yyoiojuhsoqeoyvqdzow.supabase.co';
        const SUPABASE_KEY = 'sb_publishable_R3otBb20oWkvfY2IX1r_0A_OsOx0W4G';
        
        const marketGrid = document.getElementById('tx-market-grid');
        const searchInput = document.getElementById('tx-market-search');
        const headerUser = document.getElementById('tx-header-user');
        const authStatus = document.getElementById('tx-market-auth-status');
        
        try {
            const sm = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
            TERRIX.auth.supabase = sm.createClient(SUPABASE_URL, SUPABASE_KEY);
            
            // Restore session
            const saved = localStorage.getItem('tx_user');
            if (saved) {
                const { u, p, profile } = JSON.parse(saved);
                if (profile) {
                    const ln = profile.linked_territorial_username || 'None';
                    headerUser.textContent = `${profile.username} (${ln})`;
                    headerUser.style.color = '#4a4';
                    authStatus.textContent = `User: ${profile.username} | Gold: ${profile.gold_balance}G | Linked: ${ln}`;
                    TERRIX.auth.user = { id: profile.id, user_metadata: { username: profile.username } };
                    TERRIX.auth.profile = profile;
                    renderMarket();
                }
                performLogin(u, p, true);
            }
            
            headerUser.addEventListener('click', () => {
                if (TERRIX.auth.user) {
                    if (confirm('Logout from TerriX Account?')) logoutUser();
                } else {
                    const u = prompt('TerriX Username:');
                    const p = prompt('TerriX Password:');
                    if (u && p) performLogin(u, p);
                }
            });

            async function performLogin(username, password, silent = false) {
                const { data: acc, error } = await TERRIX.auth.supabase.from('terrix_accounts').select('*').eq('username', username).maybeSingle();
                if (!acc) return !silent && alert('User not found');
                const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)).then(b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''));
                if (hash !== acc.password_hash) return !silent && alert('Invalid password');
                
                TERRIX.auth.user = { id: acc.id, user_metadata: { username: acc.username } };
                TERRIX.auth.profile = acc;
                localStorage.setItem('tx_user', JSON.stringify({ u: username, p: password, profile: acc }));
                
                const linkedName = acc.linked_territorial_username || 'None';
                headerUser.textContent = `${acc.username} (${linkedName})`;
                headerUser.style.color = '#4a4';
                authStatus.textContent = `User: ${acc.username} | Gold: ${acc.gold_balance}G | Linked: ${linkedName}`;
                
                const { data: pur } = await TERRIX.auth.supabase.from('purchases').select('item_id').eq('buyer_id', TERRIX.auth.user.id);
                TERRIX.auth.purchased = pur ? pur.map(p => p.item_id) : [];
                
                renderMarket();
                if (!silent) toast(`Welcome, ${acc.username}!`);
            }

            function logoutUser() {
                TERRIX.auth.user = null;
                TERRIX.auth.profile = null;
                TERRIX.auth.purchased = [];
                localStorage.removeItem('tx_user');
                headerUser.textContent = 'Guest';
                headerUser.style.color = '#aaa';
                authStatus.textContent = 'Not Logged In';
                renderMarket();
                toast('Logged out.');
            }

            await fetchMarket();
        } catch(e) {
            marketGrid.innerHTML = '<div style="color:red;padding:10px;">Marketplace Error.</div>';
            Logger.error('Marketplace init failed:', e);
        }
        
        searchInput.addEventListener('input', renderMarket);
        
        async function fetchMarket() {
            if (!TERRIX.auth.supabase) return;
            const { data } = await TERRIX.auth.supabase.from('marketplace_items').select('*').eq('is_approved', true).eq('category', 'exploits').order('created_at', { ascending: false });
            TERRIX.items = data || [];
            renderMarket();
        }
        
        function renderMarket() {
            if (!marketGrid) return;
            const query = (searchInput.value || '').toLowerCase();
            const filtered = (TERRIX.items || []).filter(i => i.title.toLowerCase().includes(query) || (i.description||'').toLowerCase().includes(query));
            
            if (filtered.length === 0) return marketGrid.innerHTML = '<div style="color:#444;padding:20px;text-align:center;font-size:10px;">No items found.</div>';
            
            marketGrid.innerHTML = '';
            filtered.forEach(item => {
                const div = document.createElement('div');
                div.style.cssText = 'background:#1a1a1a; border:1px solid #333; padding:8px; border-radius:4px; display:flex; flex-direction:column; gap:4px;';
                const hasPurchased = item.price_type === 'free' || TERRIX.auth.purchased.includes(item.id) || item.author_id === TERRIX.auth.user?.id;
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <h4 style="margin:0; color:#eee; font-size:11px;">${item.title.replace(/</g,'&lt;')}</h4>
                        <span style="color:${item.price_type==='free'?'#4a4':'#a82'}; font-size:8px; font-weight:bold;">${item.price_type==='free'?'FREE':item.price_type==='gold'?item.price+'G':'KEY'}</span>
                    </div>
                    <div style="font-size:9px; color:#888;">${(item.description||'').slice(0, 50)}...</div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
                        <span style="font-size:8px; color:#555;">by ${item.author_username}</span>
                        ${hasPurchased 
                            ? `<button class="tx-btn tx-market-load-btn" data-content="${encodeURIComponent(item.item_content||'')}" style="background:#262; padding:2px 6px; font-size:9px; border:none; cursor:pointer;">LOAD</button>` 
                            : `<button class="tx-btn tx-market-buy-btn" data-id="${item.id}" style="background:#444; padding:2px 6px; font-size:9px; border:none; cursor:pointer;" ${!TERRIX.auth.user ? 'disabled' : ''}>BUY</button>`
                        }
                    </div>
                `;
                marketGrid.appendChild(div);
            });
            
            marketGrid.querySelectorAll('.tx-market-load-btn').forEach(btn => btn.onclick = () => {
                document.getElementById('tx-editor').value = decodeURIComponent(btn.dataset.content);
                document.querySelector('.tx-nav-btn[data-tab="editor"]').click();
                toast('Script loaded.');
            });
            
            marketGrid.querySelectorAll('.tx-market-buy-btn').forEach(btn => btn.onclick = async () => {
                if (!TERRIX.auth.user) return;
                const item = TERRIX.items.find(i => i.id === btn.dataset.id);
                if (item && confirm(`Buy ${item.title} for ${item.price} Gold?`)) {
                    const { error } = await TERRIX.auth.supabase.rpc('purchase_item', { p_item_id: item.id, p_buyer_id: TERRIX.auth.user.id });
                    if (error) return alert('Failed: ' + error.message);
                    TERRIX.auth.purchased.push(item.id);
                    renderMarket();
                    alert('Success!');
                }
            });
        }
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
                title: 'GODBOT v5.0 SETTINGS',
                items: [
                    { label: 'Enable GodBot', key: 'godbot.enabled', type: 'toggle' },
                    { label: 'Strategy', key: 'godbot.strategy', type: 'select', options: ['balanced', 'aggressive', 'defensive', 'rush'], labels: ['Balanced', 'Aggressive', 'Defensive', 'Rush'] },
                    { label: 'Expand Ratio', key: 'godbot.expandRatio', type: 'number' },
                    { label: 'Attack Ratio', key: 'godbot.attackRatio', type: 'number' },
                    { label: 'Retreat Ratio', key: 'godbot.retreatRatio', type: 'number' },
                    { label: 'Max Targets', key: 'godbot.maxTargets', type: 'number' },
                    { label: 'Tick Rate (ms)', key: 'godbot.tickRate', type: 'number' },
                    { label: 'Queue Attacks', key: 'godbot.queueAttacks', type: 'toggle' },
                    { label: 'Queue Delay (ms)', key: 'godbot.queueDelay', type: 'number' },
                    { label: 'Auto Reinforce', key: 'godbot.autoReinforce', type: 'toggle' },
                    { label: 'Smart Expand', key: 'godbot.smartExpand', type: 'toggle' },
                    { label: 'Bot Attack Window End', key: 'godbot.botAttackWindowEnd', type: 'number' },
                    { label: 'Snipe Window Start', key: 'godbot.snipeWindowStart', type: 'number' },
                    { label: 'Snipe Intensity', key: 'godbot.snipeIntensity', type: 'number' },
                    { label: 'Density Parity Min', key: 'godbot.densityParityMin', type: 'number' },
                    { label: 'Close Range (px)', key: 'godbot.closeRange', type: 'number' }
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
                    { label: 'Show Grid', key: 'minimap.showGrid', type: 'toggle' },
                    { label: 'Show Viewport', key: 'minimap.showViewport', type: 'toggle' },
                    { label: 'Show Mountains', key: 'minimap.showMountains', type: 'toggle' },
                    { label: 'Show Players', key: 'minimap.showPlayers', type: 'toggle' }
                ]
            },
            {
                title: 'GUI POSITION',
                items: [
                    { label: 'Lock Position', key: 'ui.lockPosition', type: 'toggle' },
                    { label: 'Center GUI', key: '__center__', type: 'button' }
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
                        if (item.key === 'ui.lockPosition') {
                            const hdr = document.getElementById('tx-header');
                            if (hdr) hdr.classList.toggle('locked', !val);
                        }
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
                } else if (item.type === 'button') {
                    const btn = document.createElement('button');
                    btn.className = 'tx-config-input';
                    btn.style.width = '120px';
                    btn.style.cursor = 'pointer';
                    btn.style.background = 'rgba(58,71,255,0.2)';
                    btn.style.border = '1px solid rgba(58,71,255,0.5)';
                    btn.style.color = '#e8e8f0';
                    btn.style.padding = '4px 0';
                    btn.style.borderRadius = '4px';
                    btn.textContent = 'CENTER';
                    btn.addEventListener('click', () => {
                        if (TERRIX.centerGUI) TERRIX.centerGUI();
                        toast('GUI centered');
                    });
                    row.appendChild(btn);
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
                '/* GodBot v5.0 — Cycle-Aware Strategic Engine */',
                'if (TERRIX.loops.godbot) { clearInterval(TERRIX.loops.godbot); TERRIX.loops.godbot = null; TERRIX.config.godbot.enabled = false; Logger.log("GodBot stopped"); return; }',
                'TERRIX.config.godbot.enabled = true;',
                'const cfg = TERRIX.config.godbot;',
                'const myId = GI.myId;',
                'if (myId < 0) { Logger.error("Not in game"); return; }',
                'Logger.log("GodBot v5.0 started — Strategy:", cfg.strategy);',
                '',
                'let lastExpand = 0, lastAttack = 0, lastRetreat = 0, lastReinforce = 0;',
                'let openingPhase = true;',
                'let totalAttacks = 0, totalExpands = 0, totalSnipes = 0;',
                '',
                'function getEnemies() {',
                '  return GI.getAlivePlayers().filter(p => !p.isMe && !GI.areAllies(myId, p.id));',
                '}',
                '',
                'function getNeighbors() {',
                '  const borderTiles = GI.getBorderTiles(myId);',
                '  const map = new Map();',
                '  for (const tile of borderTiles) {',
                '    for (const n of GI.getNeighbors(tile)) {',
                '      const owner = GI.getTileOwner(n);',
                '      if (owner >= 0 && owner !== myId && !GI.areAllies(myId, owner) && GI.isPlayerAlive(owner)) {',
                '        if (!map.has(owner)) map.set(owner, { id: owner, territory: GI.getPlayerTerritory(owner), borderTiles: [], contactLen: 0, density: GI.getDensity(owner) });',
                '        const entry = map.get(owner);',
                '        entry.borderTiles.push(n);',
                '        entry.contactLen++;',
                '      }',
                '    }',
                '  }',
                '  return map;',
                '}',
                '',
                'function determineMode(closestDist, isBordering) {',
                '  if (isBordering) return "DEFEND";',
                '  if (closestDist < (cfg.closeRange || 150)) return "CAUTIOUS";',
                '  return "EXPAND";',
                '}',
                '',
                'function smartExpand(myTroops, myTerritory, mode) {',
                '  const now = Date.now();',
                '  const expandDelay = mode === "DEFEND" ? 5000 : mode === "CAUTIOUS" ? 3000 : 1500;',
                '  if (now - lastExpand < expandDelay) return;',
                '  const borderTiles = GI.getBorderTiles(myId);',
                '  const neutral = borderTiles.filter(t => GI.isNeutral(t) && GI.isWalkable(t) && !GI.isMountain(t));',
                '  if (neutral.length === 0) return;',
                '',
                '  let best = null;',
                '  let bestScore = -Infinity;',
                '  const enemies = getEnemies();',
                '  const closestEnemy = enemies.length > 0 ? enemies.sort((a,b) => GI.getDistanceToPlayer(a.id) - GI.getDistanceToPlayer(b.id))[0] : null;',
                '',
                '  for (const t of neutral) {',
                '    const xy = GI.tileToXY(t);',
                '    let score = 0;',
                '    const neighbors = GI.getNeighbors(t);',
                '    let friendly = 0, enemyN = 0;',
                '    for (const n of neighbors) {',
                '      const o = GI.getTileOwner(n);',
                '      if (o === myId) friendly++;',
                '      else if (o > 0 && o !== 512 && !GI.areAllies(myId, o)) enemyN++;',
                '    }',
                '    score = friendly * 15 - enemyN * 8;',
                '    if (closestEnemy) {',
                '      const ec = GI.getPlayerCenter(closestEnemy.id);',
                '      if (ec) {',
                '        const dx = xy.x - ec.x;',
                '        const dy = xy.y - ec.y;',
                '        const dist = Math.sqrt(dx*dx + dy*dy);',
                '        if (mode === "EXPAND") score += Math.max(0, 300 - dist) * 0.5;',
                '        else if (mode === "CAUTIOUS") score += Math.max(0, 150 - dist) * 0.3;',
                '      }',
                '    }',
                '    score += Math.random() * 10;',
                '    if (score > bestScore) { bestScore = score; best = t; }',
                '  }',
                '',
                '  if (best) {',
                '    let intensity;',
                '    if (openingPhase) {',
                '      intensity = Math.min(myTroops * 0.5, 300);',
                '    } else if (mode === "DEFEND") {',
                '      intensity = Math.min(myTroops * 0.1, 100);',
                '    } else if (mode === "CAUTIOUS") {',
                '      intensity = Math.min(myTroops * 0.15, 150);',
                '    } else {',
                '      intensity = Math.min(myTroops * 0.35, 256);',
                '    }',
                '    GI.sendAttackTile(intensity, best, -1);',
                '    lastExpand = now;',
                '    totalExpands++;',
                '  }',
                '}',
                '',
                'function smartAttack(myTroops, myTerritory, mode, cycleTick) {',
                '  const now = Date.now();',
                '  const neighbors = getNeighbors();',
                '  if (neighbors.size === 0) return;',
                '',
                '  const targets = Array.from(neighbors.values()).sort((a, b) => {',
                '    const aScore = a.territory / (a.contactLen || 1);',
                '    const bScore = b.territory / (b.contactLen || 1);',
                '    return aScore - bScore;',
                '  });',
                '',
                '  const maxT = Math.min(targets.length, cfg.maxTargets || 3);',
                '  for (let ti = 0; ti < maxT; ti++) {',
                '    const t = targets[ti];',
                '    if (myTroops < myTerritory * (cfg.attackRatio || 3)) break;',
                '',
                '    if (cfg.queueAttacks && now - lastAttack < (cfg.queueDelay || 150)) continue;',
                '',
                '    const prediction = GI.predictDensityAtContact(t.id);',
                '    const densityOk = prediction.myDensity >= prediction.theirDensity * cfg.densityParityMin;',
                '    if (!densityOk && mode !== "DEFEND") continue;',
                '',
                '    const bestTile = GI.findBestAttackTile(t.id);',
                '    if (!bestTile) continue;',
                '',
                '    let intensity;',
                '    if (mode === "DEFEND") {',
                '      intensity = Math.min(myTroops * 0.3, 512);',
                '    } else if (cfg.strategy === "aggressive" || cfg.strategy === "rush") {',
                '      intensity = Math.min(myTroops * 0.6, 1024);',
                '    } else {',
                '      intensity = Math.min(myTroops * 0.4 / maxT, 512);',
                '    }',
                '',
                '    GI.sendAttackTile(intensity, bestTile, t.id);',
                '    lastAttack = now;',
                '    totalAttacks++;',
                '    myTroops -= intensity;',
                '  }',
                '}',
                '',
                'function lateCycleSnipe(myTroops, myTerritory, cycleTick) {',
                '  if (cycleTick < cfg.snipeWindowStart) return;',
                '  const neighbors = getNeighbors();',
                '  if (neighbors.size === 0) return;',
                '',
                '  const targets = Array.from(neighbors.values());',
                '  for (const t of targets) {',
                '    if (!GI.shouldSnipe(t.id)) continue;',
                '    const prediction = GI.predictDensityAtContact(t.id);',
                '    const canSnipe = prediction.myDensity >= prediction.theirDensity * 0.8;',
                '    if (!canSnipe) continue;',
                '',
                '    const bestTile = GI.findBestAttackTile(t.id);',
                '    if (!bestTile) continue;',
                '',
                '    const intensity = Math.min(myTroops * cfg.snipeIntensity, 1024);',
                '    const minTroopsAfter = myTerritory * (cfg.retreatRatio || 0.3);',
                '    if (myTroops - intensity < minTroopsAfter) continue;',
                '',
                '    GI.sendAttackTile(intensity, bestTile, t.id);',
                '    totalSnipes++;',
                '    Logger.log("Snipe on", t.id, "at tick", cycleTick, "intensity:", Math.round(intensity));',
                '    return;',
                '  }',
                '}',
                '',
                'function reinforce(myTroops, myTerritory) {',
                '  const now = Date.now();',
                '  if (now - lastReinforce < 3000) return;',
                '  if (!GI.isVulnerable()) return;',
                '  const neighbors = getNeighbors();',
                '  for (const [eid, data] of neighbors) {',
                '    if (data.contactLen > 5 && myTroops > myTerritory * 1.5) {',
                '      const tile = GI.reinforceBorder(eid);',
                '      if (tile) {',
                '        GI.sendAttackTile(Math.min(myTroops * 0.2, 200), tile, eid);',
                '        lastReinforce = now;',
                '        return;',
                '      }',
                '    }',
                '  }',
                '}',
                '',
                'TERRIX.loops.godbot = setInterval(() => {',
                '  if (!GI.isPlayerAlive(myId)) return;',
                '  if (!GI.isPlaying()) { openingPhase = true; return; }',
                '',
                '  const cycleTick = GI.getCycleTick();',
                '  const myTroops = GI.getMyTroops();',
                '  const myTerritory = GI.getMyTerritory();',
                '  const myDensity = GI.getDensity();',
                '',
                '  if (myTerritory === 0 && myTroops < 10) return;',
                '',
                '  if (myTerritory > 20 && openingPhase) {',
                '    openingPhase = false;',
                '    Logger.log("GodBot: Opening complete. Land:", myTerritory, "Density:", myDensity.toFixed(2));',
                '  }',
                '',
                '  const enemies = getEnemies();',
                '  let closestDist = 9999;',
                '  let mainThreat = null;',
                '  for (const e of enemies) {',
                '    const d = GI.getDistanceToPlayer(e.id);',
                '    if (d < closestDist) { closestDist = d; mainThreat = e; }',
                '  }',
                '  const isBordering = mainThreat && GI.getBorderWith(mainThreat.id).length > 0;',
                '  const mode = determineMode(closestDist, isBordering);',
                '',
                '  if (myTroops < myTerritory * (cfg.retreatRatio || 0.3)) {',
                '    const now = Date.now();',
                '    if (now - lastRetreat > 5000) {',
                '      GI.retreat();',
                '      lastRetreat = now;',
                '    }',
                '    return;',
                '  }',
                '',
                '  reinforce(myTroops, myTerritory);',
                '',
                '  if (cycleTick < cfg.botAttackWindowEnd) {',
                '    if (mode === "EXPAND" && myTroops > myTerritory * (cfg.expandRatio || 2.0)) {',
                '      smartExpand(myTroops, myTerritory, mode);',
                '    } else if (mode === "CAUTIOUS" && myTroops > myTerritory * 3.5) {',
                '      smartExpand(myTroops, myTerritory, mode);',
                '    } else if (mode === "DEFEND" && myTroops > myTerritory * 5.0) {',
                '      smartExpand(myTroops, myTerritory, mode);',
                '    }',
                '  }',
                '',
                '  if (cycleTick > cfg.snipeWindowStart && cycleTick <= 99) {',
                '    lateCycleSnipe(myTroops, myTerritory, cycleTick);',
                '  }',
                '',
                '  if (cycleTick < 85) {',
                '    if (mode === "EXPAND" && myTroops > myTerritory * (cfg.attackRatio || 3)) {',
                '      smartAttack(myTroops, myTerritory, mode, cycleTick);',
                '    } else if (mode === "CAUTIOUS" && myTroops > myTerritory * 4) {',
                '      smartAttack(myTroops, myTerritory, mode, cycleTick);',
                '    } else if (mode === "DEFEND" && myTroops > myTerritory * 5) {',
                '      smartAttack(myTroops, myTerritory, mode, cycleTick);',
                '    }',
                '  }',
                '',
                '  if (myTerritory > 150 && myTroops < myTerritory * 1.1) {',
                '    const now = Date.now();',
                '    if (now - lastRetreat > 8000) {',
                '      GI.retreat();',
                '      lastRetreat = now;',
                '    }',
                '  }',
                '}, cfg.tickRate || 600);'
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
            territory: findTypedArray(['gx','h7','gt','j2', 'gw', 'yf', 'hA'], Uint32Array),
            troops: findTypedArray(['hB','h7','gt', 'gw', 'yf', 'hA'], Uint32Array),
            alive: findTypedArray(['n4','a1h','n3','mz', 'a4V'], Uint8Array) || find(['n4','a4W','a1h', 'n3']),
            names: find(['a1o','za','zb','zU','name','names', 'ga', 'go']),
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

    let _mmBufferCanvas = null;
    let _mmBufferCtx = null;
    let _mmLastDirty = false;
    let _mmLastMapSeed = -1;
    let _mmHoverPid = -1;
    let _mmMouseDown = false;

    function ensureMinimap() {
        let el = document.getElementById('tx-minimap');
        if (!el) {
            el = document.createElement('div');
            el.id = 'tx-minimap';
            const cfg = TERRIX.config.minimap;
            const size = cfg.size || 220;
            el.style.cssText = `
                width:${size}px;height:${size}px;position:fixed;z-index:2147483646;
                pointer-events:auto;border:1.5px solid ${getCurrentTheme().minimapBorder || '#3a47ff'};
                border-radius:4px;overflow:hidden;background:#060a14;
                box-shadow:0 0 15px rgba(0,0,0,0.5);
                ${cfg.position === 'bottom-right' ? 'bottom:10px;right:10px;' : 'bottom:10px;left:10px;'}
            `;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            el.appendChild(canvas);
            document.body.appendChild(el);

            _mmBufferCanvas = document.createElement('canvas');
            _mmBufferCanvas.width = size;
            _mmBufferCanvas.height = size;
            _mmBufferCtx = _mmBufferCanvas.getContext('2d', { alpha: false });

            el.addEventListener('mousemove', _mmOnMouseMove);
            el.addEventListener('mousedown', _mmOnMouseDown);
            el.addEventListener('mouseleave', _mmOnMouseLeave);
        }

        if (!TERRIX.loops.minimap) {
            TERRIX.loops.minimap = setInterval(renderMinimap, 100);
        }
    }

    function removeMinimap() {
        const el = document.getElementById('tx-minimap');
        if (el) {
            el.removeEventListener('mousemove', _mmOnMouseMove);
            el.removeEventListener('mousedown', _mmOnMouseDown);
            el.removeEventListener('mouseleave', _mmOnMouseLeave);
            el.remove();
        }
        if (TERRIX.loops.minimap) { clearInterval(TERRIX.loops.minimap); TERRIX.loops.minimap = null; }
        _mmBufferCanvas = null;
        _mmBufferCtx = null;
        _mmLastDirty = false;
        _mmLastMapSeed = -1;
    }

    function _mmOnMouseMove(e) {
        const el = document.getElementById('tx-minimap');
        if (!el) return;
        const G = _win.G;
        if (!G || !G.ac || !G.bi || !G.bU) return;
        const rect = el.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        const W = _mmBufferCanvas.width, H = _mmBufferCanvas.height;
        const mapW = G.bU.fK, mapH = G.bU.fL;
        const tileX = Math.floor((relX / W) * mapW);
        const tileY = Math.floor((relY / H) * mapH);
        if (tileX < 0 || tileY < 0 || tileX >= mapW || tileY >= mapH) { _mmHoverPid = -1; return; }
        const en = G.ac.yk(tileX, tileY);
        const pid = G.ac.f1(en);
        _mmHoverPid = (pid > 0 && pid < 512) ? pid : -1;
        if (_mmHoverPid > 0 && G.bi && G.bi.aBo) {
            const teamIdx = G.bi.aBo[_mmHoverPid];
            const ac6 = G.bi.ac6;
            const color = ac6 && ac6[teamIdx] ? ac6[teamIdx] : null;
            if (color) el.style.cursor = 'pointer';
            else el.style.cursor = 'default';
        } else {
            el.style.cursor = 'default';
        }
    }

    function _mmOnMouseDown(e) {
        if (e.button !== 0) return;
        _mmMouseDown = true;
        const el = document.getElementById('tx-minimap');
        if (!el) return;
        const G = _win.G;
        if (!G || !G.ac || !G.bU || !_win.aS) return;
        const rect = el.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        const W = _mmBufferCanvas.width, H = _mmBufferCanvas.height;
        const mapW = G.bU.fK, mapH = G.bU.fL;
        const tileX = (relX / W) * mapW;
        const tileY = (relY / H) * mapH;
        try {
            const aS = _win.aS;
            const h = _win.h;
            aS.nk(tileX, h.i / 2);
            aS.nl(tileY, h.j / 2);
            if (G.bh) G.bh.dp = true;
        } catch(err) {}
    }

    function _mmOnMouseLeave() {
        _mmHoverPid = -1;
        _mmMouseDown = false;
    }

    function _mmUpdateBuffer(G, W, H, mapW, mapH) {
        const ctx = _mmBufferCtx;
        const scaleX = W / mapW;
        const scaleY = H / mapH;
        const step = 3;

        if (G.bU.xe && G.bU.xe.width > 1) {
            ctx.drawImage(G.bU.xe, 0, 0, G.bU.xe.width, G.bU.xe.height, 0, 0, W, H);
        } else {
            ctx.fillStyle = "#060a14";
            ctx.fillRect(0, 0, W, H);
        }

        if (!G.aD || G.aD.a18 !== 1 || !G.ac || !G.bi) return;

        const ac = G.ac;
        const bi = G.bi;
        const f1 = ac.f1;
        const yk = ac.yk;
        const aBo = bi.aBo;
        const aWA = bi.aWA;
        const ac6 = bi.ac6;

        if (!f1 || !yk || !aBo) return;

        const colorCache = new Map();
        let lastOwner = -1;

        for (let y = 0; y < mapH; y += step) {
            lastOwner = -1;
            for (let x = 0; x < mapW; x += step) {
                const en = yk(x, y);
                const owner = f1(en);

                if (owner > 0 && owner < 512) {
                    let color = colorCache.get(owner);
                    if (!color) {
                        const team = aBo[owner];
                        if (team === undefined || team < 0) { lastOwner = -1; continue; }
                        color = (aWA && aWA[team]) ? aWA[team] : (ac6 && ac6[team]) ? ac6[team] : null;
                        if (!color) { lastOwner = -1; continue; }
                        colorCache.set(owner, color);
                    }

                    if (lastOwner !== -1 && lastOwner !== owner) {
                        ctx.fillStyle = 'rgba(0,0,0,0.45)';
                        ctx.fillRect(x * scaleX, y * scaleY, Math.max(1, scaleX), scaleY * step);
                    }
                    lastOwner = owner;

                    ctx.fillStyle = color;
                    ctx.fillRect(x * scaleX, y * scaleY, scaleX * step, scaleY * step);
                } else {
                    lastOwner = -1;
                }
            }
        }
    }

    function renderMinimap() {
        const G = _win.G;
        if (!G || !G.bU || !_mmBufferCanvas) return;

        const el = document.getElementById('tx-minimap');
        if (!el) return;
        const canvas = el.querySelector('canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const mapW = G.bU.fK, mapH = G.bU.fL;
        if (!mapW || !mapH) return;

        const W = _mmBufferCanvas.width, H = _mmBufferCanvas.height;
        const cfg = TERRIX.config.minimap;
        const scaleX = W / mapW;
        const scaleY = H / mapH;

        const isDirty = G.bh && G.bh.dp;
        const mapChanged = (G.bU.mapSeed !== _mmLastMapSeed);

        if (isDirty || mapChanged || !_mmLastDirty) {
            _mmLastMapSeed = G.bU.mapSeed;
            _mmLastDirty = true;
            _mmUpdateBuffer(G, W, H, mapW, mapH);
        }

        ctx.drawImage(_mmBufferCanvas, 0, 0);

        if (_mmHoverPid > 0 && G.ac && G.bi) {
            const aBo = G.bi.aBo;
            const aWA = G.bi.aWA;
            const ac6 = G.bi.ac6;
            const teamIdx = aBo ? aBo[_mmHoverPid] : _mmHoverPid;
            const baseColor = (aWA && aWA[teamIdx]) ? aWA[teamIdx] : (ac6 && ac6[teamIdx]) ? ac6[teamIdx] : null;
            if (baseColor) {
                const f1 = G.ac.f1;
                const yk = G.ac.yk;
                const step = 3;
                ctx.fillStyle = 'rgba(255,255,255,0.35)';
                for (let y = 0; y < mapH; y += step) {
                    for (let x = 0; x < mapW; x += step) {
                        const en = yk(x, y);
                        const owner = f1(en);
                        if (owner === _mmHoverPid) {
                            ctx.fillRect(x * scaleX, y * scaleY, scaleX * step, scaleY * step);
                        }
                    }
                }
            }
        }

        if (cfg.showPlayers !== false && G.bP && G.bP.y) {
            const bPy = G.bP.y;
            const shipCount = bPy.mK | 0;
            if (shipCount > 0 && bPy.mZ && bPy.mO) {
                const mZ = bPy.mZ;
                const mO = bPy.mO;
                const mapW16 = mapW << 4;
                const myId = G.aD ? (G.aD.et | 0) : -1;
                const maxP = G.aD ? (G.aD.f6 || 512) : 512;
                const drawn = new Uint8Array(maxP);

                for (let s = 0; s < shipCount; s++) {
                    const iS = mZ[s];
                    if (!iS || iS <= 0) continue;
                    const tileX = (iS % mapW16) / 16;
                    const tileY = Math.floor(iS / mapW16) / 16;
                    if (tileX < 0 || tileY < 0 || tileX >= mapW || tileY >= mapH) continue;
                    const playerId = mO[s] >> 3;
                    if (playerId < 0 || playerId >= maxP || drawn[playerId]) continue;
                    drawn[playerId] = 1;

                    const dotX = tileX * scaleX;
                    const dotY = tileY * scaleY;
                    const isMe = playerId === myId;
                    const teamIdx = G.bi.aBo ? G.bi.aBo[playerId] : playerId;
                    const dotColor = (G.bi.ac6 && G.bi.ac6[teamIdx]) ? G.bi.ac6[teamIdx] : (isMe ? "#00ff64" : "#ff4444");

                    ctx.beginPath();
                    ctx.arc(dotX, dotY, isMe ? 4 : 3, 0, Math.PI * 2);
                    ctx.fillStyle = dotColor;
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(dotX, dotY, (isMe ? 4 : 3) * 0.4, 0, Math.PI * 2);
                    ctx.fillStyle = "#ffffff";
                    ctx.fill();
                }
            }
        }

        if (cfg.showViewport !== false && _win.aS) {
            try {
                const aS = _win.aS;
                const camX = aS.zC();
                const camY = aS.zD();
                const h = _win.h;
                const iK = aS.a9n ? aS.a9n() : 1;
                const vpW = (h.i / iK) * scaleX;
                const vpH = (h.j / iK) * scaleY;
                const vpX = camX * scaleX;
                const vpY = camY * scaleY;

                ctx.strokeStyle = 'rgba(255,255,255,0.9)';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(vpX, vpY, Math.max(6, vpW), Math.max(6, vpH));
            } catch(e) {}
        }

        if (cfg.showGrid !== false) {
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 0.5;
            const gridStep = Math.max(1, Math.floor(mapW / 16));
            for (let x = 0; x < mapW; x += gridStep) {
                const px = x * scaleX;
                ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
            }
            for (let y = 0; y < mapH; y += gridStep) {
                const py = y * scaleY;
                ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
            }
        }

        const T = getCurrentTheme();
        ctx.strokeStyle = T.minimapBorder || '#3a47ff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(0, 0, W, H);

        if (G.ag && G.aD) {
            const agProps = Object.getOwnPropertyNames(G.ag);
            const aliveProp = agProps.includes('n4') ? 'n4' : agProps.includes('a4W') ? 'a4W' : null;
            if (aliveProp) {
                let aliveCount = 0;
                const maxP = G.aD.f6 || 512;
                for (let i = 0; i < maxP; i++) {
                    if (G.ag[aliveProp] && G.ag[aliveProp][i] !== 0) aliveCount++;
                }
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(2, 2, 56, 14);
                ctx.fillStyle = '#fff';
                ctx.font = '9px system-ui';
                ctx.fillText(aliveCount + ' players', 5, 12);
            }
        }
    }

    // Fallback: render minimap by reading tile arrays directly.
    // Used when bU.xe is not yet available.
    function renderMinimapFromTiles(ctx, G, mapW, mapH, W, H, cfg) {
        const ac = G.ac;
        const agProps = Object.getOwnPropertyNames(G.ag);

        const toX = typeof ac.zC === 'function' ? ac.zC : (e => (e >> 2) % mapW);
        const toY = typeof ac.zD === 'function' ? ac.zD : (e => Math.floor((e >> 2) / mapW));

        let allTilesProp = null;
        for (const p of ['gq', 'fY', 'gb', 'gp']) {
            if (agProps.includes(p) && Array.isArray(G.ag[p]) && G.ag[p] !== null) {
                if (G.ag[p].length > 0 && Array.isArray(G.ag[p][0])) { allTilesProp = p; break; }
            }
        }

        const aliveProp = agProps.includes('n4') ? 'n4' : agProps.includes('a4W') ? 'a4W' : null;
        const myId = G.aD ? G.aD.et : -1;
        const maxPlayers = G.aD ? (G.aD.f6 || 512) : 512;

        if (!_mmDebugOnce && TERRIX.Logger && TERRIX.Logger.log) {
            TERRIX.Logger.log("Minimap", "FALLBACK: allTilesProp=" + allTilesProp + " aliveProp=" + aliveProp + " agProps=" + agProps.slice(0,20).join(',') + " ac.zC=" + (ac && typeof ac.zC) + " ac.zD=" + (ac && typeof ac.zD));
        }

        // Clear to ocean
        ctx.fillStyle = '#060a14';
        ctx.fillRect(0, 0, W, H);

        if (!allTilesProp || !aliveProp) return;

        // Build a per-tile owner map into an ImageData buffer
        const imgData = ctx.createImageData(W, H);
        const data = imgData.data;

        // Ocean background
        for (let px = 0; px < data.length; px += 4) {
            data[px] = 6; data[px+1] = 10; data[px+2] = 20; data[px+3] = 255;
        }

        const scaleX = W / mapW, scaleY = H / mapH;

        const playerColors = {};
        const hashColor = (id) => {
            if (playerColors[id]) return playerColors[id];
            const hue = ((id * 137.508) % 360) / 360;
            const s = 0.7, l = 0.55;
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1; if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            playerColors[id] = {
                r: Math.round(hue2rgb(p, q, hue + 1/3) * 255),
                g: Math.round(hue2rgb(p, q, hue) * 255),
                b: Math.round(hue2rgb(p, q, hue - 1/3) * 255)
            };
            return playerColors[id];
        };

        for (let pid = 0; pid < maxPlayers; pid++) {
            if (G.ag[aliveProp] && G.ag[aliveProp][pid] === 0) continue;
            const tiles = G.ag[allTilesProp] && G.ag[allTilesProp][pid];
            if (!tiles || !Array.isArray(tiles) || tiles.length === 0) continue;

            const isMe = pid === myId;
            let isAlly = false;
            try {
                if (G.bu && typeof G.bu.hi === 'function') isAlly = G.bu.hi(myId, pid);
                else if (G.bu && typeof G.bu.f2 === 'function') isAlly = !G.bu.f2(myId, pid);
            } catch(e) {}

            let r, g, b, a;
            if (isMe) { r = 0; g = 255; b = 100; a = 220; }
            else if (isAlly) { r = 60; g = 140; b = 255; a = 180; }
            else {
                const col = hashColor(pid);
                r = col.r; g = col.g; b = col.b; a = 180;
            }

            for (let j = 0; j < tiles.length; j++) {
                try {
                    const enc = tiles[j];
                    const tileX = toX(enc);
                    const tileY = toY(enc);
                    if (tileX < 0 || tileX >= mapW || tileY < 0 || tileY >= mapH) continue;

                    const px = Math.floor(tileX * scaleX);
                    const py = Math.floor(tileY * scaleY);
                    const pxEnd = Math.min(Math.floor((tileX + 1) * scaleX) + 1, W);
                    const pyEnd = Math.min(Math.floor((tileY + 1) * scaleY) + 1, H);

                    for (let sy = py; sy < pyEnd; sy++) {
                        const rowOff = sy * W;
                        for (let sx = px; sx < pxEnd; sx++) {
                            const idx = (rowOff + sx) * 4;
                            data[idx] = r; data[idx+1] = g; data[idx+2] = b; data[idx+3] = a;
                        }
                    }
                } catch(e) {}
            }
        }

        // Render neutral/mountain tiles
        if (cfg.showMountains !== false && typeof ac.fE === 'function' && typeof ac.yk === 'function') {
            for (let y = 0; y < mapH; y += 4) {
                for (let x = 0; x < mapW; x += 4) {
                    try {
                        const enc = ac.yk(x, y);
                        if (ac.fE(enc)) {
                            const px = Math.floor(x * scaleX);
                            const py = Math.floor(y * scaleY);
                            const pxEnd = Math.min(Math.floor((x + 4) * scaleX) + 1, W);
                            const pyEnd = Math.min(Math.floor((y + 4) * scaleY) + 1, H);
                            for (let sy = py; sy < pyEnd; sy++) {
                                const rowOff = sy * W;
                                for (let sx = px; sx < pxEnd; sx++) {
                                    const idx = (rowOff + sx) * 4;
                                    data[idx] = 35; data[idx+1] = 35; data[idx+2] = 45; data[idx+3] = 200;
                                }
                            }
                        }
                    } catch(e) {}
                }
            }
        }

        ctx.putImageData(imgData, 0, 0);
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