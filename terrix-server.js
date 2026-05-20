/**
 * TERRIX SERVER-BACKED EXPLOIT FRAMEWORK
 * ========================================
 * 
 * Express.js server that provides:
 * 1. Real-time game state relay between clients
 * 2. Coordinated multi-account attacks
 * 3. Game state prediction and analysis
 * 4. Bot coordination for team modes
 * 5. Packet replay and manipulation
 * 
 * Usage: node terrix-server.js
 * Then connect from game: ws://localhost:3000
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ============================================================
// GAME STATE TRACKER
// ============================================================
class GameState {
    constructor() {
        this.players = new Map();
        this.territory = new Map();
        this.attacks = [];
        this.tick = 0;
        this.mapSeed = 0;
        this.mapWidth = 0;
        this.mapHeight = 0;
    }

    updatePlayer(id, data) {
        this.players.set(id, {
            id,
            name: data.name || `Player ${id}`,
            troops: data.troops || 0,
            tiles: data.tiles || 0,
            income: data.income || 0,
            x: data.x || 0,
            y: data.y || 0,
            team: data.team || -1,
            alive: data.alive !== false,
            lastUpdate: Date.now()
        });
    }

    removePlayer(id) {
        this.players.delete(id);
    }

    getLeaderboard() {
        return Array.from(this.players.values())
            .filter(p => p.alive)
            .sort((a, b) => b.troops - a.troops);
    }

    getWeakestEnemy(myId, myTeam) {
        return Array.from(this.players.values())
            .filter(p => p.alive && p.id !== myId && p.team !== myTeam)
            .sort((a, b) => a.troops - b.troops)[0];
    }

    getStrongestEnemy(myId, myTeam) {
        return Array.from(this.players.values())
            .filter(p => p.alive && p.id !== myId && p.team !== myTeam)
            .sort((a, b) => b.troops - a.troops)[0];
    }

    getNearbyEnemies(myId, myTeam, x, y, radius) {
        return Array.from(this.players.values())
            .filter(p => {
                if (!p.alive || p.id === myId || p.team === myTeam) return false;
                const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
                return dist <= radius;
            })
            .sort((a, b) => {
                const distA = Math.sqrt((a.x - x) ** 2 + (a.y - y) ** 2);
                const distB = Math.sqrt((b.x - x) ** 2 + (b.y - y) ** 2);
                return distA - distB;
            });
    }

    predictAttackOutcome(attackerId, defenderId) {
        const attacker = this.players.get(attackerId);
        const defender = this.players.get(defenderId);
        if (!attacker || !defender) return null;

        const attackPower = attacker.troops;
        const defensePower = defender.troops + defender.income * 2;
        
        return {
            canWin: attackPower > defensePower,
            attackPower,
            defensePower,
            ratio: attackPower / Math.max(1, defensePower),
            recommendedTroops: Math.ceil(defensePower * 1.5)
        };
    }
}

// ============================================================
// CLIENT MANAGER
// ============================================================
class ClientManager {
    constructor() {
        this.clients = new Map();
        this.rooms = new Map();
    }

    addClient(ws, info = {}) {
        const id = crypto.randomBytes(8).toString('hex');
        this.clients.set(id, {
            ws,
            id,
            room: null,
            playerId: info.playerId || null,
            gameState: info.gameState || null,
            lastPing: Date.now()
        });
        return id;
    }

    removeClient(id) {
        const client = this.clients.get(id);
        if (client && client.room) {
            this.leaveRoom(id, client.room);
        }
        this.clients.delete(id);
    }

    joinRoom(clientId, roomId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }

        // Leave current room
        if (client.room) {
            this.leaveRoom(clientId, client.room);
        }

        this.rooms.get(roomId).add(clientId);
        client.room = roomId;
    }

    leaveRoom(clientId, roomId) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.delete(clientId);
            if (room.size === 0) {
                this.rooms.delete(roomId);
            }
        }
    }

    broadcastToRoom(roomId, message, excludeId = null) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const data = JSON.stringify(message);
        for (const clientId of room) {
            if (clientId === excludeId) continue;
            const client = this.clients.get(clientId);
            if (client && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(data);
            }
        }
    }

    sendTo(clientId, message) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    }
}

// ============================================================
// ATTACK COORDINATOR
// ============================================================
class AttackCoordinator {
    constructor(gameState, clientManager) {
        this.gameState = gameState;
        this.clientManager = clientManager;
        this.pendingAttacks = new Map();
    }

    coordinateAttack(targetId, attackerIds) {
        const target = this.gameState.players.get(targetId);
        if (!target) return { error: 'Target not found' };

        const totalTroops = attackerIds.reduce((sum, id) => {
            const player = this.gameState.players.get(id);
            return sum + (player ? player.troops : 0);
        }, 0);

        const outcome = this.gameState.predictAttackOutcome(attackerIds[0], targetId);
        
        return {
            target: targetId,
            targetName: target.name,
            targetTroops: target.troops,
            attackers: attackerIds.length,
            totalTroops,
            canWin: outcome ? outcome.canWin : false,
            recommendedTroops: outcome ? outcome.recommendedTroops : 0,
            timestamp: Date.now()
        };
    }

    scheduleAttack(attackerId, targetId, delay = 0) {
        const attackId = crypto.randomBytes(4).toString('hex');
        this.pendingAttacks.set(attackId, {
            attackerId,
            targetId,
            scheduledTime: Date.now() + delay,
            executed: false
        });
        return attackId;
    }

    executePendingAttacks() {
        const now = Date.now();
        for (const [attackId, attack] of this.pendingAttacks) {
            if (!attack.executed && now >= attack.scheduledTime) {
                attack.executed = true;
                // Send attack command to client
                this.clientManager.broadcastToRoom('attacks', {
                    type: 'executeAttack',
                    attackId,
                    attackerId: attack.attackerId,
                    targetId: attack.targetId
                });
            }
        }
    }

    cancelAttack(attackId) {
        this.pendingAttacks.delete(attackId);
    }
}

// ============================================================
// BOT INTELLIGENCE
// ============================================================
class BotIntelligence {
    constructor(gameState) {
        this.gameState = gameState;
        this.strategies = new Map();
    }

    setStrategy(playerId, strategy) {
        this.strategies.set(playerId, strategy);
    }

    getRecommendedAction(playerId) {
        const player = this.gameState.players.get(playerId);
        if (!player || !player.alive) return null;

        const strategy = this.strategies.get(playerId) || 'balanced';
        const enemies = this.gameState.getNearbyEnemies(playerId, player.team, player.x, player.y, 50);
        const weakest = this.gameState.getWeakestEnemy(playerId, player.team);

        switch (strategy) {
            case 'aggressive':
                // Always attack the weakest enemy
                if (weakest && player.troops > weakest.troops * 1.5) {
                    return { action: 'attack', target: weakest.id, reason: 'Weakest enemy' };
                }
                break;

            case 'defensive':
                // Only attack if we have 3x more troops
                if (weakest && player.troops > weakest.troops * 3) {
                    return { action: 'attack', target: weakest.id, reason: 'Overwhelming force' };
                }
                // Otherwise expand to neutral
                return { action: 'expand', target: 'neutral', reason: 'Building forces' };

            case 'opportunist':
                // Attack nearby weak enemies
                const nearbyWeak = enemies.find(e => player.troops > e.troops * 2);
                if (nearbyWeak) {
                    return { action: 'attack', target: nearbyWeak.id, reason: 'Nearby weak enemy' };
                }
                break;

            case 'balanced':
            default:
                if (player.troops > 1000 && weakest) {
                    return { action: 'attack', target: weakest.id, reason: 'Sufficient forces' };
                } else if (player.troops < 500) {
                    return { action: 'expand', target: 'neutral', reason: 'Building forces' };
                }
                break;
        }

        return { action: 'wait', reason: 'No good targets' };
    }

    getAllRecommendations() {
        const recommendations = [];
        for (const [playerId] of this.gameState.players) {
            const rec = this.getRecommendedAction(playerId);
            if (rec) {
                recommendations.push({ playerId, ...rec });
            }
        }
        return recommendations;
    }
}

// ============================================================
// WEBSOCKET HANDLER
// ============================================================
const gameState = new GameState();
const clientManager = new ClientManager();
const attackCoordinator = new AttackCoordinator(gameState, clientManager);
const botIntelligence = new BotIntelligence(gameState);

wss.on('connection', (ws) => {
    const clientId = clientManager.addClient(ws);
    console.log(`Client connected: ${clientId}`);

    // Send welcome message
    clientManager.sendTo(clientId, {
        type: 'welcome',
        clientId,
        serverTime: Date.now(),
        connectedClients: clientManager.clients.size
    });

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            handleMessage(clientId, message);
        } catch (e) {
            console.error('Invalid message:', e);
        }
    });

    ws.on('close', () => {
        console.log(`Client disconnected: ${clientId}`);
        clientManager.removeClient(clientId);
        broadcastPlayerCount();
    });

    ws.on('error', (err) => {
        console.error(`Client error ${clientId}:`, err);
    });
});

function handleMessage(clientId, message) {
    const client = clientManager.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
        case 'joinRoom':
            clientManager.joinRoom(clientId, message.roomId || 'default');
            clientManager.sendTo(clientId, {
                type: 'roomJoined',
                roomId: message.roomId || 'default'
            });
            break;

        case 'updateState':
            // Client is sending their game state
            if (message.playerId !== undefined) {
                gameState.updatePlayer(message.playerId, message.data || {});
                client.playerId = message.playerId;
            }
            break;

        case 'requestAttack':
            // Client wants to coordinate an attack
            const result = attackCoordinator.coordinateAttack(message.targetId, message.attackerIds || [client.playerId]);
            clientManager.sendTo(clientId, {
                type: 'attackCoordination',
                result
            });
            break;

        case 'scheduleAttack':
            const attackId = attackCoordinator.scheduleAttack(
                message.attackerId || client.playerId,
                message.targetId,
                message.delay || 0
            );
            clientManager.sendTo(clientId, {
                type: 'attackScheduled',
                attackId
            });
            break;

        case 'getLeaderboard':
            clientManager.sendTo(clientId, {
                type: 'leaderboard',
                data: gameState.getLeaderboard()
            });
            break;

        case 'getRecommendations':
            const recs = botIntelligence.getAllRecommendations();
            clientManager.sendTo(clientId, {
                type: 'recommendations',
                data: recs
            });
            break;

        case 'setStrategy':
            if (message.playerId && message.strategy) {
                botIntelligence.setStrategy(message.playerId, message.strategy);
            }
            break;

        case 'broadcast':
            // Broadcast message to room
            if (client.room) {
                clientManager.broadcastToRoom(client.room, {
                    type: 'broadcast',
                    from: clientId,
                    data: message.data
                }, clientId);
            }
            break;

        case 'ping':
            clientManager.sendTo(clientId, {
                type: 'pong',
                serverTime: Date.now(),
                clientTime: message.time
            });
            break;

        default:
            console.log('Unknown message type:', message.type);
    }
}

function broadcastPlayerCount() {
    const count = clientManager.clients.size;
    for (const [id, client] of clientManager.clients) {
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify({
                type: 'playerCount',
                count
            }));
        }
    }
}

// ============================================================
// API ENDPOINTS
// ============================================================
app.use(express.json());

// Get current game state
app.get('/api/state', (req, res) => {
    res.json({
        players: Array.from(gameState.players.values()),
        leaderboard: gameState.getLeaderboard(),
        tick: gameState.tick,
        connectedClients: clientManager.clients.size
    });
});

// Get player info
app.get('/api/player/:id', (req, res) => {
    const player = gameState.players.get(parseInt(req.params.id));
    if (!player) {
        return res.status(404).json({ error: 'Player not found' });
    }
    res.json(player);
});

// Get attack prediction
app.get('/api/predict/:attacker/:defender', (req, res) => {
    const attackerId = parseInt(req.params.attacker);
    const defenderId = parseInt(req.params.defender);
    const prediction = gameState.predictAttackOutcome(attackerId, defenderId);
    res.json(prediction || { error: 'Cannot predict' });
});

// Get bot recommendations
app.get('/api/recommendations', (req, res) => {
    res.json(botIntelligence.getAllRecommendations());
});

// Coordinate an attack
app.post('/api/attack', (req, res) => {
    const { targetId, attackerIds } = req.body;
    const result = attackCoordinator.coordinateAttack(targetId, attackerIds);
    res.json(result);
});

// Serve static files
app.use(express.static('public'));

// ============================================================
// MAIN LOOP
// ============================================================
setInterval(() => {
    // Execute pending attacks
    attackCoordinator.executePendingAttacks();

    // Clean up stale players (no update in 30 seconds)
    const now = Date.now();
    for (const [id, player] of gameState.players) {
        if (now - player.lastUpdate > 30000) {
            gameState.removePlayer(id);
        }
    }
}, 100);

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           TERRIX GRANDMASTER SERVER v1.0                     ║
║                                                              ║
║  Server running on port ${PORT}                                ║
║  WebSocket: ws://localhost:${PORT}                             ║
║  API: http://localhost:${PORT}/api/state                       ║
║                                                              ║
║  Endpoints:                                                  ║
║  GET  /api/state           - Full game state                 ║
║  GET  /api/player/:id      - Player info                     ║
║  GET  /api/predict/:a/:d   - Attack prediction               ║
║  GET  /api/recommendations - Bot recommendations             ║
║  POST /api/attack          - Coordinate attack               ║
║                                                              ║
║  WebSocket Messages:                                         ║
║  joinRoom, updateState, requestAttack, scheduleAttack        ║
║  getLeaderboard, getRecommendations, setStrategy             ║
╚══════════════════════════════════════════════════════════════╝
    `);
});
