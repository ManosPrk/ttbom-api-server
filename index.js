
const uuidv4 = require('uuid').v4;
const express = require('express');
const http = require('http');
const { getRandomSecs } = require('./Utilities');
const GameRepository = require('./repository/GameRepository');
const PlayerRepository = require('./repository/PlayerRepository');
const GameServices = require('./services/GameServices');

const app = express();
const server = http.createServer(app);

const io = require("socket.io")(server, {
    handlePreflightRequest: (req, res) => {
        const headers = {
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Origin": req.headers.origin, //or the specific origin you want to give access to,
            "Access-Control-Allow-Credentials": true
        };
        res.writeHead(200, headers);
        res.end();
    }
});

io.on('connection', (socket) => {

    socket.on('create-game-instance', (data, ackCallback) => {
        if (data.gameId && !GameRepository.gameInstanceExists(data.gameId)) {
            const gameId = GameServices.saveGameInstance(data.gameId);

            ackCallback({
                successMessage: 'New game successfully created!',
                gameId
            });
        } else {
            ackCallback({ errorMessage: 'Game id already exists' });
        }
    });

    socket.on('join-game-instance', (data, ackCallback) => {
        if (!GameRepository.gameInstanceExists(data.gameId)) {
            ackCallback({ errorMessage: "Game instance doesnt exist!" });
        } else {
            ackCallback({ successMessage: 'Joining game!' });
        }
    });

    socket.once('is-valid-game', (gameId, ackCallback) => {
        const game = GameRepository.gameInstanceExists(gameId);

        if (game) {
            ackCallback(GameServices.isInstanceValid(game.id));
        } else {
            ackCallback({ errorMessage: 'Game id is not valid' });
        }

    });

    socket.on('add-client-to-game-room', (data, ackCallback) => {
        const game = GameRepository.getGameInstanceById(data.gameId);
        if (!game) {
            ackCallback({ errorMessage: 'Game id doesnt exist' });
        } else {
            let player;
            const game = GameRepository.getGameInstanceById(data.gameId);
            if (game.players.length === 0) {
                player = GameServices.savePlayer(data.name, socket.id, true);
            } else {
                player = GameServices.savePlayer(data.name, socket.id);
            }
            GameRepository.addPlayerToGameInstance(data.gameId, player);
            socket.join(game.id);
            socket.to(data.gameId).emit('notify-players', `${data.name} joined the game!`, GameServices.getPlayersModel(game.id));
            ackCallback({ side: game.currentSide, card: game.currentCard, cardsLeft: game.getCardsLeft, isDiceRolled: game.isDiceRolled, isCardDrawn: game.isCardDrawn });
        }
    })

    socket.on('request-players-from-game', (gameId, ackCallback) => {
        if (GameRepository.gameInstanceExists(gameId)) {
            const players = GameServices.getPlayersModel(gameId);
            ackCallback(players);
        } else {
            ackCallback({ errorMessage: 'Wrong game id' })
        }
    });

    socket.on('request-dice-side', (ackCallback) => {
        const game = GameRepository.getGameInstanceByPlayerId(socket.id);
        const player = GameRepository.getPlayerByIdForGame(game.id, socket.id);
        const side = GameServices.getRandomItem(game.id, 'diceSides');
        if (game.isDiceRolled) {
            ackCallback({ errorMessage: 'You have already rolled the dice' })

        } else if (GameRepository.isPlayerGameMaster(game.id, player.id)) {
            game.setCurrentSide(side);
            game.isDiceRolled = true;
            ackCallback({
                side: game.getCurrentSide()
            });
            socket.to(game.id).emit('update-dice-side', { side });

        } else {
            ackCallback({ errorMessage: "Only the GameMaster can roll the dice" })
        }

    });

    socket.on('request-card', (ackCallback) => {
        const game = GameRepository.getGameInstanceByPlayerId(socket.id);
        const player = GameRepository.getPlayerByIdForGame(game.id, socket.id);
        if (game.isCardDrawn) {
            ackCallback({ errorMessage: "You have already drew a card" })
        } else if (GameRepository.isPlayerGameMaster(game.id, player.id)) {
            const card = GameServices.getRandomItem(game.id, 'cards', true);
            game.isCardDrawn = true;
            game.setCurrentCard(card);
            game.setCardsLeft();
            ackCallback({ card: game.getCurrentCard(), cardsLeft: game.cardsLeft });
            socket.to(game.id).emit('update-card', { card, cardsLeft: game.cardsLeft });
        } else {
            ackCallback({ errorMessage: "Only the GameMaster can draw a card" })
        }

    });

    socket.on('start-game', (ackCallback) => {
        const startGameResponse = GameServices.startGame(socket.id);
        if (startGameResponse.errorMessage) {
            ackCallback({ errorMessage: 'Wait for the Game master to start the game' })
        } else {
            io.to(socket.id).emit('game-started', { gameMasterMessage: startGameResponse.gameMasterMessage });
            socket.to(startGameResponse.game.id).emit('game-started', { message: startGameResponse.message });
            setTimeout(() => {
                const loser = GameServices.gameEnded(startGameResponse.game.id);
                io.in(game.id).emit('game-ended', {
                    loser: { name: loser.name, roundsLost: loser.roundsLost },
                    updatedPlayers: GameServices.getPlayersModel(startGameResponse.game.id)
                });
                GameServices.resetGame(game);
            }, 5 * 1000);
        }
    });

    socket.on('pass-bomb', (ackCallback) => {

        let game = GameRepository
            .getGameInstanceByPlayerId(socket.id);
        if (game.playerWithBomb.id === socket.id) {
            const players = GameRepository.getPlayersForGame(game.id);
            let currentIdx = players.findIndex((player) => player.id === game.playerWithBomb.id);
            currentIdx++;
            const nextPlayer = currentIdx >= players.length
                ? players[0]
                : players[currentIdx];
            game.playerWithBomb = nextPlayer;
            io.to(`${nextPlayer.id}`).emit('change-player', `${nextPlayer.name}, Its your turn!`);
            ackCallback({ message: `Bomb passed to ${nextPlayer.name}` })
        } else {
            ackCallback({ errorMessage: 'Only the player with the bomb can pass it' })
        }
    });

    socket.once('get-instances', (ackCallback) => {
        ackCallback(GameRepository.getGameInstances(), PlayerRepository.getPlayers());
    });

    socket.on('disconnect', () => {
        const game = GameRepository.getGameInstanceByPlayerId(socket.id);
        if (game) {
            const { gameId, message, players } = GameServices.disconnectPlayer(game, socket.id);
            socket.in(gameId).emit('player-disconnect', { message, players });
        }
        console.log(`user with id ${socket.id} disconnected!`);
    })
});

const port = process.env.PORT || 1337;
io.listen(port);
console.log('listening on port ', port);