const GameInstance = require('../entities/GameInstance');
const Player = require('../entities/Player');

module.exports = {
    buildGameInstance: (id, players) => {
        if (!id || !players) {
            return {
                error:
                {
                    message: `Could not build game, missing value(s): ${!id ? 'id' : ''} ${!players.length < 1 ? 'players' : ''}`,
                }
            }
        }

        return new GameInstance(id, players);
    },

    buildPlayer: (id, name, isLeader = false, roundsLost = 0) => {
        if (!id || !name) {
            return {
                error:
                {
                    message: `Could not build player, missing value(s): ${!id ? 'id' : ''} ${!name ? 'name' : ''}`,
                }
            }
        }

        return new Player(id, name, isLeader, roundsLost);
    }
}

