const PlayerRepository = require('../repository/PlayerRepository');
const GameRepository = require('../repository/GameRepository');
const { buildGameInstance, buildPlayer } = require('../helpers/modelBuilders');
const { getRandomItemFromArray } = require('../Utilities');

const GameService = {
    savePlayer: (_player, playerId, socketId, isLeader = false) => {
        // const existingPlayer = PlayerRepository.getPlayerByName(_player);
        const newPlayer = buildPlayer(playerId, _player, socketId, isLeader);
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
        const repoPlayers = GameRepository.getPlayersForGame(game.id);
        const players = repoPlayers.map((player) => {
            return { name: player.name, roundsLost: player.roundsLost }
        })
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
        const game = GameRepository.getGameInstanceById(gameId);
        if (game) {
            if (GameRepository.isPlayerGameMaster(gameId, playerId)) {
                let item = getRandomItemFromArray(game[arrayName]);
                return item;
            } else {
                return { errorMessage: 'Only the gamemaster can roll the dice' };
            }
        }
        else {
            return { errorMessage: 'could not find associated game with id:' + gameId }
        }
    },
    getPlayersModel: (gameId) => {
        const players = GameRepository.getPlayersForGame(gameId);
        const modelPlayers = players.map((player) => {
            return { name: player.name, roundsLost: player.roundsLost }
        })
        return modelPlayers;
    }
};

Object.freeze(GameService);

module.exports = GameService;