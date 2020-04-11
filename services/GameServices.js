const PlayerRepository = require('../repository/PlayerRepository');
const GameRepository = require('../repository/GameRepository');
const { buildGameInstance, buildPlayer } = require('../helpers/modelBuilders');
const { getRandomItemFromArray } = require('../Utilities');

const GameService = {
    savePlayer: (_player, socketId, isLeader = false) => {
        // const existingPlayer = PlayerRepository.getPlayerByName(_player);
        const newPlayer = buildPlayer(socketId, _player, isLeader);
        const player = PlayerRepository.addPlayer(newPlayer);
        return player;
    },
    //Save player to repository instead of playerId
    saveGameInstance: (gameId, player) => {
        const gameInstanceToAddToRepo = buildGameInstance(gameId, player);
        return GameRepository.addGameInstance(gameInstanceToAddToRepo);
    },
    subscribeToGameInstance: (data, player) => {
        GameRepository.addPlayerToGameInstance(data.gameId, player);
        const game = GameRepository.getGameInstanceById(data.gameId);
        if (!game) {
            return { errorMessage: 'Game doesnt exist' };
        }
        const players = GameRepository.getPlayersForGame(game.id);
        return { message: `${player.name} joined the game!`, players };
    }
    ,
    isInstanceValid: (gameId) => {
        if (GameRepository.getGameInstanceById(gameId)) {
            return true;
        }
        return false;
    },
    getRandomItem: (gameId, playerId, arrayName) => {
        console.log(gameId);
        const game = GameRepository.getGameInstanceById(gameId);
        console.log('gameservice line 36', game)
        if (game) {
            let item = getRandomItemFromArray(game[arrayName]);
            const player = GameRepository.getPlayerByIdForGame(gameId, playerId);
            if (!player) {
                return { errorMessage: 'Only the gamemaster can roll the dice' };
            }
            if (player.isLeader) {
                return item;
            }
        }
        else {
            return { errorMessage: 'could not find associated game with id:' + gameId }
        }
    },
};

Object.freeze(GameService);

module.exports = GameService;