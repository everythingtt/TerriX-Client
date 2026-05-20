# TERRIX GRANDMASTER — Complete Game Analysis & Exploit Framework

## FILE: Territorial.io.html (5875 lines)

---

## 1. GAME ARCHITECTURE

### 1.1 Core Object Graph
```
window.G = {
  l, aD, ag, ae, bS, b8, bf, al, ad, t, bC, bg, bh, bi, bj, o, bp, bN, bn, bA, ac, bu, bU, bO, bP, bQ
}
```

### 1.2 Object Responsibilities

| Object | Type | Purpose |
|--------|------|---------|
| `G.aD` | c3 | Game config: es(myId), f5(maxPlayers), hH(isPlaying), kl(gameMode), kn(singlePlayer), gS(incomeMultiplier) |
| `G.ag` | ce | Game arrays: ga(tiles[]), go(borderTiles[]), gp(territory[]), gw(troops[]), hA(income[]), n3(alive[]), za(names[]), a4V(state[]) |
| `G.ac` | cV | Tile access: f0(getOwner), yj(encodeXY), ez(isWater), iM(isMountain), gi(isOccupied), fD(isBorder), fW(isNearBorder) |
| `G.bU` | dF | Map/canvas: fJ(width), fK(height), xe(pixelData), xd(canvas), xZ(ctx), mapSeed, eo(mapType) |
| `G.bh` | dV | Timer: kQ(getTick), dp(dirtyFlag), eW(elapsedMs), aCY(cycleLength=56ms) |
| `G.bi` | dN | Teams: aBo(player→team), aWA(teamColors), ac6(teamColorsAlt), kq(teamMapping) |
| `G.bP` | d9 | Ships: y.mK(count), y.mZ(positions), y.mO(owners), kX(hasBoat) |
| `G.bA` | d2 | Attack handler: hY.hf(send), hY.hZ(sendToTile), hY.hk(sendBoat), hY.hn(sendPercent) |
| `G.bO` | d9 | Map utility: fG(getX), fI(getY), fV(encode), ip(encodeXY), iq(decode), ib(distance) |
| `G.bu` | dZ | Alliance: f1(isAllied), f2(isNotAllied), aIn(borderWater), aIo(borderPlayer) |
| `G.ae` | cb | Player data: k9(getName), fX(borderTiles), hr(botDifficulty) |
| `G.al` | cX | Leaderboard: l4(players[]), kz(count) |
| `G.ao` | cn | AI: jG.k6(botTick), jE.jS(canAttack), jM.eb(botUpdate), j7(pathfinding) |
| `G.ap` | ci | Camera: zC(getCamX), zD(getCamY), a9n(getZoom), nk(setX), nl(setY) |
| `G.b0` | cl | Network: y.ec(isConnected), y.mK(shipCount), pT(sendPacket) |
| `G.bj` | dO | Contest: l2(getTarget), l3(setTarget), l0(getScore), kU(setTarget) |
| `G.bf` | dT | Score: gY(addScore), mz(highScores) |
| `G.bg` | dU | Fog of war |
| `G.t` | dH | Main loop: eb(tick), u(showDialog) |
| `G.vf` | Canvas2D | Main rendering context |

---

## 2. CRITICAL FUNCTIONS

### 2.1 Attack System
```
bA.hY.hf(ik, jc)     — Send troops from player ik to player jc
bA.hY.hZ(eu)          — Send troops to encoded tile position
bA.hY.hk(ik, eu)      — Send boat/ship to encoded position
bA.hY.hn(ik, nR)      — Send percentage attack (nR = percentage * 10)
bA.hY.ph(jc)          — Attack specific player (513 = all)
bA.hY.pl(pk)          — Place boat at position pk
bA.hY.hw(pn)          — Special attack
bA.hY.hb(ik,eu,jc)    — Alliance attack (through tile eu)
```

### 2.2 Territory System
```
gC(player)            — Process player turn (main territory logic)
gG()                  — Process single attack
gR()                  — Execute attack
gk()                  — Validate attack
gl()                  — Update territory after attack
gy()                  — Add tiles to player
gE()                  — Remove tiles from player
gN()                  — Calculate attack result
gQ()                  — Check if player can attack
```

### 2.3 Income System
```
hA[player]            — Income per cycle (= territory count * multiplier)
gw[player]            — Total troops
gS                    — Base income multiplier (default: 2)
aCY                   — Cycle length (56ms)
```

### 2.4 Tile Encoding
```
ac.yj(x, y)           — Encode: Math.floor((y * mapW + x) * 4)
ac.fG(eu)             — Get X: eu % mapW
ac.fI(eu)             — Get Y: Math.floor(eu / mapW)
ac.fV(x, y)           — Encode tile: y * mapW + x
ac.ip(x, y)           — Encode: (y * mapW + x) * 4
ac.iq(eu)             — Decode: { x: (eu>>2)%mapW, y: Math.floor((eu>>2)/mapW) }
ac.ey(eu)             — To encoded: eu << 2
ac.ew(em)             — From encoded: em >> 2
```

### 2.5 Rendering
```
z9()                  — Main render function
vf.drawImage(bU.xd, camX, camY)  — Draw terrain
vf.drawImage(zE, camX, camY)     — Draw tile ownership
a5l()                 — Initialize offscreen canvas (aDA = tile data)
```

---

## 3. GAME MODES

| Mode | kl Value | Description |
|------|----------|-------------|
| FFA | 0 | Free for all |
| Teams | 1 | Team vs Team |
| Battle Royale | 2 | Last team standing |
| 1v1 | 3 | One vs One |
| 2v2 | 4 | Two vs Two |
| 3v3 | 5 | Three vs Three |
| 4v4 | 6 | Four vs Four |
| Custom | 7 | Custom rules |
| Contest | 8 | Competitive |
| Zombie | 9 | Zombie mode |
| 1v1 BR | 10 | 1v1 Battle Royale |

---

## 4. BOT AI SYSTEM

### 4.1 Bot Difficulty Levels
```
hr[player] = 0: Easy (attack frequency 500ms, troops 980)
hr[player] = 1: Medium (attack frequency 450ms, troops 980/920)
hr[player] = 2: Hard (attack frequency 400ms, troops 825/750)
hr[player] = 3: Expert (attack frequency 300ms, troops 500/500)
hr[player] = 4: Master (attack frequency 80ms, troops 250+random)
hr[player] = 5: Grandmaster (attack frequency 50ms, troops 300+random)
hr[player] = 6: Player (human-controlled)
```

### 4.2 Bot Attack Logic
```
ao.jG.k6(player, hr)  — Bot tick (called every cycle)
ao.jE.jg(player)      — Find attack targets
ao.jE.jS(player, target) — Can attack target
ao.jE.jY(player)      — Execute bot attack
ao.jE.js(player)      — Find weakest target
ao.jE.jv(player)      — Find nearest target
ao.jE.k0()            — Find richest target
ao.jE.k4()            — Random target
```

### 4.3 Bot Attack Probability
```
kM = [0, 0, 5, 25, 50, 100, 0]  — Attack probability by difficulty
kO = [97, 94, 70, 40, 20, 0, 100]  — Defense probability by difficulty
```

---

## 5. NETWORK PROTOCOL

### 5.1 Packet Structure
```
Byte 0: Opcode
Byte 1-2: Player ID (10 bits) + Flags (6 bits)
Variable: Payload
```

### 5.2 Opcodes
```
0: Send tile attack (hZ)
1: Send player attack (hf)
2: Send boat attack (pa)
3: Send ship attack (hk)
4: Send percentage attack (hn)
5: Send player action (ph/pl)
6: Place boat (pl)
7: Special action (hw)
8: Pass turn (pp)
9: Surrender (qK)
10: Alliance attack (hb)
```

### 5.3 Send Functions
```
b0.pT.pU(eu)          — Send tile attack
b0.pT.pX(ik, jc)      — Send player attack
b0.pT.pb(ik, pZ)      — Send boat attack
b0.pT.pd(ik, pc)      — Send ship attack
b0.pT.pf(ik, nR)      — Send percentage attack
b0.pT.pi(jc)          — Send player action
b0.pT.pm(pk)          — Send boat placement
b0.pT.po(pn)          — Send special action
b0.pT.pq()            — Pass turn
b0.pT.pr(ik, eu, jc)  — Alliance attack
```

---

## 6. EXPLOIT VECTORS

### 6.1 Client-Side Exploits

| Exploit | Method | Impact |
|---------|--------|--------|
| Infinite Troops | Override `ag.gw[myId]` every tick | Unlimited army |
| Instant Attack | Remove attack cooldown (`pS = 999`) | Spam attacks |
| Speed Hack | Call `bh.eb` 5x per frame | 5x game speed |
| Wallhack | Disable fog of war | See entire map |
| Territory Expansion | Override `gy()` to add 10x tiles | Rapid expansion |
| Income Multiplier | Set `hA[myId] = tiles * 100` | 100x income |
| Bot Override | Redirect bot attacks | Bots fight each other |
| Packet Sniffer | Hook `WebSocket.send/receive` | See all traffic |
| Auto-Play AI | Timer-based attack logic | Automated gameplay |
| Mass Attack | Attack all enemies simultaneously | Overwhelm opponents |

### 6.2 Server-Side Exploits (via terrix-server.js)

| Exploit | Method | Impact |
|---------|--------|--------|
| Attack Coordination | Coordinate multi-account attacks | Guaranteed kills |
| Game State Prediction | Predict enemy movements | Counter-attack |
| Bot Intelligence | AI-driven strategy recommendations | Optimal play |
| Packet Replay | Record and replay attacks | Automated farming |
| Real-time Tracking | Track all player positions | Full map awareness |

### 6.3 Game Logic Exploits

| Exploit | Method | Impact |
|---------|--------|--------|
| Tile Encoding Manipulation | Directly modify `ag.ga` | Add/remove territory |
| Troop Count Manipulation | Modify `ag.gw` directly | Instant army |
| Income Manipulation | Modify `ag.hA` directly | Instant income |
| Camera Teleport | Set `aS.nk/nl` directly | Instant movement |
| Attack Validation Bypass | Override `bC.gU.hJ/hK` | Attack anyone |
| Alliance Check Bypass | Override `bu.f1` | Attack allies |
| Bot Difficulty Override | Set `aD.hr` | Control bot behavior |
| Game Mode Override | Set `aD.kl` | Change game rules |

---

## 7. RECOMMENDED FEATURES FOR TERRIX EXECUTOR

### 7.1 ESP & Vision
- [x] Minimap with territory overlay
- [x] ESP View (full map)
- [ ] Player name labels on game canvas
- [ ] Troop count display per player
- [ ] Territory border highlighting
- [ ] Attack line visualization
- [ ] Income/territory graph over time
- [ ] Fog of war removal

### 7.2 Automation
- [x] Auto-attack nearest enemy
- [x] Auto-defend (expand when low)
- [x] Auto-play AI (balanced strategy)
- [ ] Auto-boat placement
- [ ] Auto-alliance management
- [ ] Auto-surrender detection
- [ ] Auto-reconnect on disconnect

### 7.3 Combat
- [x] Mass attack (all enemies)
- [x] Instant attack (no cooldown)
- [x] Infinite troops
- [ ] Attack queue system
- [ ] Priority target selection
- [ ] Attack timing optimization
- [ ] Retreat logic

### 7.4 Intelligence
- [x] Player tracker (leaderboard)
- [x] Attack prediction
- [ ] Territory growth prediction
- [ ] Enemy strategy detection
- [ ] Weakest/strongest enemy identification
- [ ] Alliance recommendation
- [ ] Optimal expansion path

### 7.5 Client Modifications
- [x] Custom themes
- [x] GUI panel
- [ ] Custom keybindings
- [ ] Sound alerts for attacks
- [ ] Chat commands
- [ ] Replay system
- [ ] Screenshot capture

### 7.6 Network
- [x] Packet sniffer
- [ ] Packet injection
- [ ] Latency optimization
- [ ] Connection quality monitor
- [ ] Server selection
- [ ] Proxy support

---

## 8. GUARANTEED VICTORY STRATEGY

### Phase 1: Early Game (0-30 seconds)
1. Enable infinite troops exploit
2. Enable instant attack exploit
3. Auto-expand to neutral tiles
4. Build up territory quickly

### Phase 2: Mid Game (30-120 seconds)
1. Enable mass attack
2. Attack weakest enemies first
3. Use auto-play AI for micro-management
4. Monitor leaderboard for threats

### Phase 3: Late Game (120+ seconds)
1. Coordinate attacks on remaining players
2. Use territory expansion hack
3. Maintain infinite troops
4. Auto-defend against counter-attacks

### Key Metrics to Monitor
- `ag.gw[myId]` — Our troop count
- `ag.ga[myId].length` — Our territory size
- `ag.hA[myId]` — Our income
- `bh.kQ()` — Game tick (for timing)
- `ag.n3` — Alive players (for targeting)

---

## 9. ANTI-DETECTION MEASURES

1. **Randomize attack timing** — Don't attack at exact intervals
2. **Vary target selection** — Don't always attack the same player
3. **Limit exploit intensity** — Don't set troops to infinity, use reasonable values
4. **Mimic human behavior** — Add random delays and mistakes
5. **Clean up traces** — Remove console logs in production
6. **Obfuscate code** — Minify and obfuscate the exploit code

---

## 10. FILES CREATED

| File | Purpose |
|------|---------|
| `terrix-exploits.js` | Client-side exploit userscript |
| `terrix-server.js` | Server-backed exploit framework (Express.js) |
| `ANALYSIS.md` | This analysis document |

---

## 11. CONSOLE COMMANDS

After loading the exploit framework, use these in the browser console:

```javascript
// Teleport camera
terrix.teleport(500, 500);

// Attack all enemies
terrix.attackAll();

// Expand territory
terrix.expand();

// Show player stats
terrix.stats();

// Access game objects directly
window.G.ag.gw[window.G.aD.es] = 999999;  // Set troops
window.G.ag.hA[window.G.aD.es] = 99999;    // Set income
window.G.bA.hY.hf(myId, targetId);          // Attack player
window.G.bA.hY.hZ(encodedTile);             // Attack tile
```
