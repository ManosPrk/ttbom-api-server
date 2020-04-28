const gameInstances = [];

const GameRepository = {
    getGameInstances: () => {
        return gameInstances;
    },
    getGameInstanceById: id => {
        return gameInstances.find((game) => game.id === id);
    },
    getGameInstanceByPlayerId: (playerId) => {
        return gameInstances.find((game) => game.players.some((player) => player.id === playerId))
    },
    addPlayerToGameInstance: (id, player) => {
        gameInstances
            .find((game) => game.id === id)
            .players
            .push(player);
    },
    addGameInstance: game => {
        return gameInstances[gameInstances.push(game) - 1].id;
    },
    deleteGameInstance: id => {
        const gameToDeleteId = gameInstances.findIndex((game) => game.id = id);
        gameInstances.splice(gameToDeleteId, 1);
    },
    gameInstanceExists: gameId => {
        return gameInstances.some((game) => game.id === gameId);
    },
    getPlayersForGame: (gameId) => {
        return gameInstances
            .find((game) => game.id === gameId)
            .players;
    },
    getPlayerByIdForGame: (gameId, playerId) => {
        return gameInstances
            .find((game) => game.id === gameId)
            .players
            .find((player) => player.id === playerId);
    },
    getPlayerByNameForGame: (gameId, playerName) => {
        return gameInstances
            .find((game) => game.id === gameId)
            .players
            .find((player) => player.name === playerName);
    },
    getNextPlayer: (gameId, playerId) => {
        const currentPlayerIndex = gameInstances
            .find((game) => game.id === gameId)
            .players
            .findIndex((player) => player.id === playerId);
        return gameInstances
            .find((game) => game.id === gameId)
            .players[currentPlayerIndex + 1]
    },
    removePlayerFromGame: (id, playerId) => {
        let game = gameInstances.find((game) => game.id === id);
        game.players = game
            .players
            .filter((player) => player.id !== playerId);
    },
    isPlayerGameMaster: (gameId, playerId) => {
        return gameInstances
            .find((game) => game.id === gameId)
            .players
            .find((player) => player.id === playerId)
            .isGameMaster;
    },
    playerIsInGame: (playerId) => {
        return gameInstances.some((game) => game.players.some((player) => player.id === playerId));
    },
};

Object.freeze(GameRepository);

module.exports = GameRepository;