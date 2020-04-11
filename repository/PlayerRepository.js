const players = [];

const PlayerRepository = {
    getPlayerById: id => {
        return players.find((player) => player.id === id);
    },
    getPlayerByName: name => {
        return players.find((player) => player.name === name);
    },
    addPlayer: player => {
        const newPlayerIndex = players.push(player) - 1;
        return players[newPlayerIndex];
    },
};

Object.freeze(PlayerRepository);

module.exports = PlayerRepository;