const GameInstance = require('../entities/GameInstance');
const Player = require('../entities/Player');

module.exports = {
    buildGameInstance: (id) => {
        if (!id) {
            return {
                error:
                {
                    message: `Could not build game, missing value(s): ${!id ? 'id' : ''}`,
                }
            }
        }

        return new GameInstance(id);
    },

    buildPlayer: (id, name, isGameMaster = false, roundsLost = 0) => {
        if (!id || !name) {
            return {
                error:
                {
                    message: `Could not build player, missing value(s): ${!id ? 'id' : ''} ${!name ? 'name' : ''}`,
                }
            }
        }

        return new Player(id, name, isGameMaster, roundsLost);
    }
}

