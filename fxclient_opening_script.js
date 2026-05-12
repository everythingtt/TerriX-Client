__fx.openingAutomation.attackPlayer=(target)=> {
                if (${dict.game}.${dict.gIsReplay} || !bC.gV.hK(1) || !bC.gV.hL(${dict.game}.${dict.playerId})) return false;
                if (target < 0 || target >= ${dict.game}.${dict.gLobbyMaxJoin}) return false;
                if (${dict.playerData}.${dict.playerTerritories}[target] <= 0) return false;
                if (!bu.f2(target, ${dict.game}.${dict.playerId}) || !bu.hi(${dict.game}.${dict.playerId}, target)) return false;
                bA.hZ.hg(aR.hd(), target);
                return true;
            };