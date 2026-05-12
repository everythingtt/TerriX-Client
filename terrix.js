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
            }
        }
    };

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

    const GameInterface = {
        get G() { return window.G; },

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
            return G.ag.hB[this.myId] || 0;
        },

        getMyTerritory() {
            const G = this.G;
            if (!G || !G.ag) return 0;
            return G.ag.gx[this.myId] || 0;
        },

        getMyScore(playerId) {
            const G = this.G;
            if (!G || !G.aD || !G.aD.kA) return 0;
            return G.aD.kA(playerId ?? this.myId);
        },

        getPlayerTroops(id) {
            const G = this.G;
            if (!G || !G.ag) return 0;
            return G.ag.hB[id] || 0;
        },

        getPlayerTerritory(id) {
            const G = this.G;
            if (!G || !G.ag) return 0;
            return G.ag.gx[id] || 0;
        },

        isPlayerAlive(id) {
            const G = this.G;
            if (!G || !G.ag) return false;
            return (G.ag.n4[id] || 0) !== 0;
        },

        getPlayerName(id) {
            const G = this.G;
            if (!G || !G.ag) return 'Bot';
            return G.ag.za[id] || G.ag.a1n[id] || 'Bot';
        },

        getPlayerTeam(id) {
            const G = this.G;
            if (!G || !G.bi) return 0;
            return G.bi.f7[id] || 0;
        },

        areAllies(p1, p2) {
            const G = this.G;
            if (!G || !G.bu) return false;
            return G.bu.f2(p1, p2);
        },

        sameTeam(p1, p2) {
            return this.getPlayerTeam(p1) === this.getPlayerTeam(p2);
        },

        getBorderTiles(id) {
            const G = this.G;
            if (!G || !G.ag || !G.ag.gb) return [];
            return G.ag.gb[id] || [];
        },

        getAllTiles(id) {
            const G = this.G;
            if (!G || !G.ag || !G.ag.gq) return [];
            return G.ag.gq[id] || [];
        },

        getLandTiles(id) {
            const G = this.G;
            if (!G || !G.ag || !G.ag.fY) return [];
            return G.ag.fY[id] || [];
        },

        getPerimeterTiles(id) {
            const G = this.G;
            if (!G || !G.ag || !G.ag.gp) return [];
            return G.ag.gp[id] || [];
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
            if (!G || !G.ac) return { x: 0, y: 0 };
            return { x: G.ac.fH(encoded), y: G.ac.fJ(encoded) };
        },

        xyToTile(x, y) {
            const G = this.G;
            if (!G || !G.ac) return 0;
            return G.ac.fW(x, y);
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
            if (!G || !G.bA || !G.bA.hZ) return false;
            try {
                G.bA.hZ.hg(this.myId, intensity, targetId);
                return true;
            } catch(e) { return false; }
        },

        sendAttackTile(intensity, tile, targetId) {
            const G = this.G;
            if (!G || !G.bA || !G.bA.hZ) return false;
            try {
                G.bA.hZ.hc(this.myId, intensity, tile, targetId);
                return true;
            } catch(e) { return false; }
        },

        sendPeace() {
            const G = this.G;
            if (!G || !G.bA || !G.bA.hZ) return false;
            try {
                G.bA.hZ.pe(this.myId, 0);
                return true;
            } catch(e) { return false; }
        },

        retreat() {
            const G = this.G;
            if (!G || !G.bA || !G.bA.hZ) return false;
            try {
                G.bA.hZ.hu(this.myId);
                return true;
            } catch(e) { return false; }
        },

        surrender() {
            const G = this.G;
            if (!G || !G.bA || !G.bA.hZ) return false;
            try {
                G.bA.hZ.pn(this.myId);
                return true;
            } catch(e) { return false; }
        },

        setColor(colorId) {
            const G = this.G;
            if (!G || !G.bA || !G.bA.hZ) return false;
            try {
                G.bA.hZ.pj(this.myId, Math.max(0, Math.min(1023, colorId)));
                return true;
            } catch(e) { return false; }
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
                        troops: this.getPlayerTerritory(i),
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
            const score = this.getMyScore();
            const maxScore = this.getMyScore(this.myId);
            return score > (maxScore * TERRIX.config.godbot.peaceThreshold);
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

    function waitForHook() {
        if (window.G && window.G.aD && window.G.ag) {
            Logger.log('Game hook detected. Initializing...');
            TERRIX.hooked = true;
            init();
            return;
        }
        setTimeout(waitForHook, 200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(waitForHook, 500));
    } else {
        setTimeout(waitForHook, 500);
    }

    function init() {
        if (TERRIX.initialized) return;
        TERRIX.initialized = true;
        injectStyles();
        buildGUI();
        startLoops();
        Logger.log('TerriX ready. Click the toggle bar to open.');
    }

    function injectStyles() {
        const s = document.createElement('style');
        s.textContent = [
            '#tx-wrapper{position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;font-family:system-ui,sans-serif;pointer-events:none;}',
            '#tx-toggle{pointer-events:auto;position:fixed;top:0;left:50%;transform:translateX(-50%);padding:4px 24px;background:#0a1a0a;color:#0f0;border:1.5px solid #0f0;border-top:none;border-radius:0 0 8px 8px;cursor:pointer;font-weight:bold;font-size:11px;letter-spacing:2px;z-index:2147483647;}',
            '#tx-toggle:hover{background:#1a3a1a;}',
            '#tx-gui{pointer-events:auto;position:fixed;top:80px;left:50%;transform:translateX(-50%);width:740px;height:520px;background:rgba(5,5,10,0.97);border:1.5px solid #3a47ff;display:none;flex-direction:column;color:#eee;box-shadow:0 0 40px rgba(58,71,255,0.3),0 20px 60px rgba(0,0,0,0.8);border-radius:6px;overflow:hidden;}',
            '#tx-header{padding:10px 18px;background:rgba(15,15,25,1);display:flex;justify-content:space-between;align-items:center;cursor:move;border-bottom:1px solid #333;font-size:13px;font-weight:bold;}',
            '#tx-header .tx-ver{color:#3a47ff;font-size:10px;margin-left:8px;}',
            '#tx-close{cursor:pointer;color:#666;font-size:16px;padding:2px 6px;}',
            '#tx-close:hover{color:#f44;}',
            '#tx-body{display:flex;flex:1;overflow:hidden;}',
            '#tx-sidebar{width:140px;background:rgba(10,10,18,1);border-right:1px solid #222;padding:10px;display:flex;flex-direction:column;gap:6px;}',
            '#tx-main{flex:1;display:flex;flex-direction:column;overflow:hidden;}',
            '.tx-nav-btn{padding:7px 10px;background:rgba(40,40,60,0.8);border:1px solid #333;color:#aaa;cursor:pointer;font-size:11px;font-weight:bold;border-radius:4px;text-align:left;}',
            '.tx-nav-btn:hover{background:rgba(60,60,80,0.9);color:#ddd;}',
            '.tx-nav-btn.active{background:rgba(58,71,255,0.3);color:#fff;border-color:#3a47ff;}',
            '#tx-tab-editor{flex:1;display:flex;flex-direction:column;overflow:hidden;}',
            '#tx-tab-chart{flex:1;display:none;flex-direction:column;gap:4px;overflow-y:auto;padding:10px;}',
            '#tx-tab-scripts{flex:1;display:none;flex-direction:column;gap:4px;overflow-y:auto;padding:10px;}',
            '#tx-tab-config{flex:1;display:none;flex-direction:column;gap:4px;overflow-y:auto;padding:10px;}',
            '#tx-tab-esp{flex:1;display:none;overflow:hidden;}',
            '#tx-editor{flex:1;background:#0a0a0f;color:#0f0;border:none;padding:12px;font-family:Consolas,monospace;font-size:12px;resize:none;outline:none;line-height:1.5;}',
            '.tx-bar-row{display:flex;align-items:center;gap:8px;height:26px;width:100%;flex-shrink:0;}',
            '.tx-bar-rank{width:30px;font-size:11px;color:#666;font-weight:bold;text-align:right;}',
            '.tx-bar-name{width:120px;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#ccc;}',
            '.tx-bar-track{flex:1;background:#111;height:14px;border:1px solid #222;border-radius:2px;position:relative;overflow:hidden;}',
            '.tx-bar-fill{height:100%;width:0%;background:#3a47ff;transition:width 0.3s ease;border-right:2px solid rgba(255,255,255,0.3);}',
            '.tx-bar-val{position:absolute;right:4px;font-size:9px;color:#fff;line-height:14px;font-weight:bold;}',
            '.tx-me-row .tx-bar-name{color:#ffd700!important;font-weight:bold;}',
            '.tx-me-row .tx-bar-fill{background:#ffd700;}',
            '.tx-script-item{background:rgba(20,20,35,0.9);border:1px solid #333;padding:10px;display:flex;justify-content:space-between;align-items:center;border-radius:4px;}',
            '.tx-script-item:hover{border-color:#3a47ff;}',
            '.tx-btn{padding:6px 14px;background:rgba(40,40,60,0.9);border:1px solid #444;color:#ccc;cursor:pointer;font-size:11px;font-weight:bold;border-radius:4px;}',
            '.tx-btn:hover{background:rgba(60,60,80,0.9);color:#fff;}',
            '.tx-btn-primary{background:rgba(58,71,255,0.4);border-color:#3a47ff;color:#fff;}',
            '.tx-btn-primary:hover{background:rgba(58,71,255,0.6);}',
            '.tx-btn-danger{background:rgba(180,40,40,0.4);border-color:#844;color:#faa;}',
            '.tx-btn-danger:hover{background:rgba(180,40,40,0.6);}',
            '.tx-btn-success{background:rgba(40,140,40,0.4);border-color:#484;color:#afa;}',
            '.tx-btn-success:hover{background:rgba(40,140,40,0.6);}',
            '#tx-footer{padding:8px 16px;background:rgba(8,8,15,1);display:flex;justify-content:space-between;align-items:center;border-top:1px solid #222;}',
            '#tx-status{font-size:10px;color:#666;}',
            '#tx-status.tx-online{color:#0f0;}',
            '#tx-status.tx-offline{color:#f44;}',
            '.tx-section-title{font-size:12px;font-weight:bold;color:#3a47ff;margin:10px 0 6px 0;text-transform:uppercase;letter-spacing:1px;}',
            '.tx-config-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);}',
            '.tx-config-label{font-size:11px;color:#999;}',
            '.tx-config-input{background:#111;border:1px solid #333;color:#ddd;padding:3px 8px;font-size:11px;border-radius:3px;width:80px;text-align:right;}',
            '.tx-config-input:focus{border-color:#3a47ff;outline:none;}',
            '.tx-toggle-switch{position:relative;width:36px;height:18px;background:#222;border-radius:9px;cursor:pointer;border:1px solid #444;}',
            '.tx-toggle-switch.on{background:#1a5a1a;border-color:#0a0;}',
            '.tx-toggle-switch::after{content:"";position:absolute;top:1px;left:1px;width:14px;height:14px;background:#666;border-radius:50%;transition:all 0.2s;}',
            '.tx-toggle-switch.on::after{left:19px;background:#0f0;}',
            '#tx-minimap{position:fixed;z-index:2147483646;pointer-events:none;border:1px solid #3a47ff;border-radius:4px;overflow:hidden;box-shadow:0 0 10px rgba(0,0,0,0.5);}',
            '#tx-minimap canvas{display:block;}',
            '#tx-debug-log{position:fixed;bottom:0;left:0;width:400px;max-height:200px;z-index:2147483647;background:rgba(0,0,0,0.9);border:1px solid #333;color:#0f0;font-family:monospace;font-size:10px;overflow-y:auto;padding:6px;display:none;}',
            '.tx-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.9);color:#fff;padding:8px 16px;border-radius:4px;font-size:12px;z-index:2147483647;border:1px solid #3a47ff;transition:opacity 0.3s;}',
            '#tx-code-output{flex:0 0 100px;background:rgba(5,5,10,1);border-top:1px solid #222;padding:8px;font-family:monospace;font-size:10px;color:#888;overflow-y:auto;white-space:pre-wrap;}'
        ].join('');
        document.head.appendChild(s);
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
            });
        });

        document.getElementById('tx-btn-hook').addEventListener('click', function() {
            if (window.G) {
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
                fn(window.G, GameInterface, TERRIX, Logger);
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
        document.addEventListener('mouseup', () => { dragging = false; });

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
                    sel.style.width = '100px';
                    (item.options || []).forEach(opt => {
                        const o = document.createElement('option');
                        o.value = opt; o.textContent = opt;
                        if (opt === getNested(TERRIX.config, item.key)) o.selected = true;
                        sel.appendChild(o);
                    });
                    sel.addEventListener('change', () => {
                        setNested(TERRIX.config, item.key, sel.value);
                        saveConfig();
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
                '  for (let i = 0; i < ships.mG; i++) {',
                '    if ((ships.mK[i] >> 3) === myId) {',
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
                '/* Debug Dumper v3.0 */',
                'const G = window.G;',
                'if (!G) { Logger.error("No game hook"); return; }',
                'Logger.log("=== GAME STATE DUMP ===");',
                'for (const key of Object.keys(G)) {',
                '  const val = G[key];',
                '  if (typeof val === "object" && val !== null) {',
                '    const props = Object.keys(val);',
                '    Logger.log(key + ":", props.length, "props ->", props.slice(0, 20).join(","));',
                '  } else {',
                '    Logger.log(key + ":", typeof val, val);',
                '  }',
                '}',
                'Logger.log("=== END DUMP ===");'
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
                    fn(window.G, GameInterface, TERRIX, Logger);
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
    function updateLeaderboard() {
        const container = document.getElementById('tx-tab-chart');
        if (!container || container.style.display !== 'flex') return;
        const G = window.G;
        if (!G || !G.ag || !G.ag.gx || !G.aD) return;

        const players = [];
        const max = G.aD.f6 || 512;
        const myId = G.aD.et;
        for (let i = 0; i < max; i++) {
            if ((G.ag.n4[i] || 0) !== 0 && G.ag.gx[i] > 0) {
                const score = (G.ag.gx[i] * 10) + (G.ag.hB[i] / 50);
                players.push({ id: i, name: G.ag.za[i] || 'Bot', val: score, isMe: i === myId });
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
        const G = window.G;
        if (!G || !G.ag || !G.ag.gx || !G.bU) return;

        const W = canvas.width, H = canvas.height;
        const mapW = G.bU.fK, mapH = G.bU.fL;
        const scaleX = W / mapW, scaleY = H / mapH;

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, W, H);

        const max = G.aD.f6 || 512;
        const myId = G.aD.et;
        const cfg = TERRIX.config.minimap;

        for (let i = 0; i < max; i++) {
            if (i === myId || (G.ag.n4[i] || 0) === 0) continue;
            const tiles = G.ag.gq[i];
            if (!tiles || tiles.length === 0) continue;
            const isAlly = G.bu && G.bu.f2(myId, i);
            if (isAlly) ctx.fillStyle = 'rgba(0,100,255,0.4)';
            else ctx.fillStyle = 'rgba(200,50,50,0.4)';
            for (let j = 0; j < tiles.length; j += 4) {
                const xy = G.ac.fH ? G.ac.fH(tiles[j]) : (tiles[j] >> 2) % mapW;
                const yy = G.ac.fJ ? G.ac.fJ(tiles[j]) : Math.floor((tiles[j] >> 2) / mapW);
                ctx.fillRect(xy * scaleX, yy * scaleY, Math.max(1, scaleX), Math.max(1, scaleY));
            }
        }

        const myTiles = G.ag.gq[myId];
        if (myTiles && myTiles.length > 0) {
            ctx.fillStyle = 'rgba(0,255,0,0.6)';
            for (let j = 0; j < myTiles.length; j += 4) {
                const xy = G.ac.fH ? G.ac.fH(myTiles[j]) : (myTiles[j] >> 2) % mapW;
                const yy = G.ac.fJ ? G.ac.fJ(myTiles[j]) : Math.floor((myTiles[j] >> 2) / mapW);
                ctx.fillRect(xy * scaleX, yy * scaleY, Math.max(1, scaleX), Math.max(1, scaleY));
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

    if (TERRIX.hooked) {
        MultiTab.init();
    }

    window.TERRIX = TERRIX;
    window.GameInterface = GameInterface;
    window.Logger = Logger;
    window.MultiTab = MultiTab;
})();