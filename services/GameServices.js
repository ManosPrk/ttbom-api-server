const PlayerRepository = require('../repository/PlayerRepository');
const GameRepository = require('../repository/GameRepository');
const uuidv4 = require('uuid').v4;
const { buildGameInstance, buildPlayer } = require('../helpers/modelBuilders');
const { getRandomItemFromArray } = require('../Utilities');

const GameService = {
    savePlayer: (_player, playerId, isLeader = false) => {
        // const existingPlayer = PlayerRepository.getPlayerByName(_player);
        const newPlayer = buildPlayer(playerId, _player, isLeader);
        const player = PlayerRepository.addPlayer(newPlayer);
        return player;
    },
    //Save player to repository instead of playerId
    saveGameInstance: (gameId, player) => {
        const gameInstanceToAddToRepo = buildGameInstance(gameId);
        return GameRepository.addGameInstance(gameInstanceToAddToRepo);
    },
    subscribeToGameInstance: (data, player) => {
        if (!GameRepository.gameInstanceExists(data.gameId)) {
            return { errorMessage: "Game id doesnt exist!" };
        }
        GameRepository.addPlayerToGameInstance(data.gameId, player);
        const repoPlayers = GameRepository.getPlayersForGame(data.gameId);
        const players = repoPlayers.map((player) => {
            return { name: player.name, roundsLost: player.roundsLost }
        })
        return { message: `${player.name} joined the game!`, players };
    },
    isInstanceValid: (socketId) => {
        if (GameRepository.getGameInstanceByPlayerId(socketId)) {
            return true;
        }
        return false;
    },
    getRandomItem: (gameId, arrayName, removeFromArray = false) => {
        const game = GameRepository.getGameInstanceById(gameId);
        let item = getRandomItemFromArray(game[arrayName], removeFromArray);
        return item;
    },
    getPlayersModel: (gameId) => {
        const players = GameRepository.getPlayersForGame(gameId);
        const modelPlayers = players.map((player) => {
            return { name: player.name, roundsLost: player.roundsLost }
        })
        return modelPlayers;
    },
    startRound: (playerId) => {
        let game = GameRepository.getGameInstanceByPlayerId(playerId);
        if (!game || !GameRepository.isPlayerGameMaster(game.id, playerId)) {
            return { errorMessage: 'Wait for the Game master to start the game' }
        } else if (game.roundStarted) {
            return { errorMessage: 'You have already started the round!' }
        } else {
            game.playerWithBomb = GameRepository.getPlayerByIdForGame(game.id, playerId);
            game.roundStarted = true;
            game.roundEnded = false;
            return { message: 'Let the games begin!', gameMasterMessage: 'Game started!', game };
        }
    },
    endRound: (gameId) => {
        // gameEnded = true;
        game = GameRepository.getGameInstanceById(gameId);
        if (game.cards.length < 1) {
            game.gameOver = true;
        }
        const loser = GameRepository.getPlayerByIdForGame(game.id, game.playerWithBomb.id);
        loser.roundsLost++;
        game.roundStarted = false;
        game.roundEnded = true;
        return loser;
    },
    resetRound: (game) => {
        game.playerWithBomb = game.players[0];
        game.isDiceRolled = false;
        game.isCardDrawn = false;
        game.roundStarted = false;
        game.roundEnded = false;
    },
    disconnectPlayer: (playerId) => {
        const game = GameRepository.getGameInstanceByPlayerId(playerId);


        if (!game) {
            return;
        }
        const player = GameRepository.getPlayerByIdForGame(game.id, playerId);
        if (game.players.length === 1) {
            GameRepository.deleteGameInstance(game.id);
            return;
        } else if (player.isGameMaster && game.players.length > 1) {
            const nextPlayer = GameRepository.getNextPlayer(game.id, playerId);
            nextPlayer.isGameMaster = true;
            GameRepository.removePlayerFromGame(game.id, playerId);
            return { message: `${player.name} left the game`, players: instance.getPlayersModel(game.id), gameId: game.id };
        }
        GameRepository.removePlayerFromGame(game.id, playerId);
        const newGameMaster = GameRepository.getGameMaster(game.id);
        return { message: `${player.name} left the game`, players: instance.getPlayersModel(game.id), gameId: game.id, newGameMaster: newGameMaster };
    },
};

Object.freeze(GameService);
const instance = GameService;

module.exports = instance;