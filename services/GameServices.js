const PlayerRepository = require('../repository/PlayerRepository');
const GameRepository = require('../repository/GameRepository');
const uuidv4 = require('uuid').v4;
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
    getPlayerToJoin: (data, socketId) => {
        if (data.clientId) {
            if (GameRepository.playerIsInGame(data.clientId)) {
                return GameRepository.getPlayerByIdForGame(data.gameId, data.clientId);
            } else {
                return instance.savePlayer(data.name, data.clientId, socketId);
            }
        } else {
            return instance.savePlayer(data.name, uuidv4(), socketId);
        }
    },
    subscribeToGameInstance: (data, player) => {
        console.log(player);
        if (GameRepository.playerIsInGame(player.id)) {
            return { rejoinMessage: `${player.name} rejoined the game!` };
        }
        GameRepository.addPlayerToGameInstance(data.gameId, player);
        const game = GameRepository.getGameInstanceById(data.gameId);
        const repoPlayers = GameRepository.getPlayersForGame(game.id);
        const players = repoPlayers.map((player) => {
            return { name: player.name, roundsLost: player.roundsLost }
        })
        return { message: `${player.name} joined the game!`, players };
    },
    isInstanceValid: (gameId) => {
        if (GameRepository.getGameInstanceById(gameId)) {
            return true;
        }
        return false;
    },
    getRandomItem: (gameId, playerId, arrayName, removeFromArray = false) => {
        const game = GameRepository.getGameInstanceById(gameId);
        if (game) {
            if (GameRepository.isPlayerGameMaster(gameId, playerId)) {
                let item = getRandomItemFromArray(game[arrayName], removeFromArray);
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
    },
    startGame: (playerId) => {
        let game = GameRepository.getGameInstanceByPlayerId(playerId);
        if (!game || !GameRepository.isPlayerGameMaster(game.id, playerId)) {
            return { errorMessage: 'Wait for the Game master to start the game' }
        } else if (game.roundStarted) {
            return { errorMessage: 'You have already started the round!' }
        } else {
            game.playerWithBomb = GameRepository.getPlayerByIdForGame(game.id, playerId);
            game.roundStarted = true;
            return { message: 'Let the games begin!', gameMasterMessage: 'Game started!', game };
        }
    },
    gameEnded: (gameId) => {
        // gameEnded = true;
        game = GameRepository.getGameInstanceById(gameId);
        const loser = GameRepository.getPlayerByIdForGame(game.id, game.playerWithBomb.id);
        loser.roundsLost++;
        return loser;
    },
    resetGame: (game) => {
        game.playerWithBomb = game.players[0];
        game.isDiceRolled = false;
        game.isCardDrawn = false;
        game.roundStarted = false;
    },
};

Object.freeze(GameService);
const instance = GameService;

module.exports = instance;