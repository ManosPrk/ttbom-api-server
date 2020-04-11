const gameInstances = [];

const GameRepository = {
    getGameInstances: () => {
        return gameInstances;
    },
    getGameInstanceById: id => {
        return gameInstances.find((game) => game.id === id);
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
    removePlayerFromGame: (id, playerId) => {
        const newPlayers = gameInstances
            .find((game) => game.id === id)
            .players
            .filter((player) => player.id !== playerId);
        gameInstances.player = newPlayers;
    },
};

Object.freeze(GameRepository);

module.exports = GameRepository;