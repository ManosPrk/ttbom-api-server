
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
    console.log(`a new user has connected with id ${socket.id}`)

    socket.on('createGameInstance', (data, ackCallback) => {
        if (GameRepository.getGameInstanceByPlayerId(data.clientId)) {
            ackCallback({ errorMessage: 'You already have an active game' })
        } if (data.gameId && !GameRepository.gameInstanceExists(data.gameId)) {
            const player = GameServices.savePlayer(data.name, uuidv4(), socket.id, true);
            const gameId = GameServices.saveGameInstance(data.gameId, player);
            ackCallback({
                successMessage: 'New game successfully created!',
                gameId,
                clientId: player.id
            });
        } else {
            ackCallback({ errorMessage: 'Game id already exists' });
        }
    });

    socket.on('join-game-instance', (data, ackCallback) => {
        if (GameRepository.gameInstanceExists(data.gameId)) {
            const player = GameServices.getPlayerToJoin(data, socket.id);
            const responseObject = GameServices.subscribeToGameInstance(data, player);
            if (responseObject.rejoinMessage) {
                io.in(data.gameId).emit('notifyPlayers', responseObject.rejoinMessage);
                ackCallback({ rejoinMessage: 'rejoing game....' });
            } else {
                io.in(data.gameId).emit('notifyPlayers', `${data.name} joined the game!`, responseObject.players);
                ackCallback({ message: `successfully added ${data.name} to game with id ${data.gameId}`, clientId: player.id });
            }
        } else {
            ackCallback({ errorMessage: 'Game ID doesnt exist' });
        }
    });

    socket.once('isValidGame', (clientId, ackCallback) => {
        const game = GameRepository.getGameInstanceByPlayerId(clientId);

        if (game) {
            ackCallback(GameServices.isInstanceValid(game.id));
        } else {
            ackCallback({ errorMessage: 'Client id is not valid' });
        }

    });

    socket.on('addClientToGameRoom', (clientId, ackCallback) => {
        const game = GameRepository.getGameInstanceByPlayerId(clientId);

        if (!game) {
            ackCallback({ errorMessage: 'client not registered' });
        } else {
            const player = GameRepository.getPlayerByIdForGame(game.id, clientId);
            player.socketId = socket.id;
            socket.join(game.id);
            ackCallback({ side: game.currentSide, card: game.currentCard, cardsLeft: game.getCardsLeft, isDiceRolled: game.isDiceRolled, isCardDrawn: game.isCardDrawn });
        }
    })

    socket.on('requestPlayersFromGame', (gameId, ackCallback) => {

        if (GameRepository.gameInstanceExists(gameId)) {
            const players = GameServices.getPlayersModel(gameId);
            ackCallback(players);
        } else {
            ackCallback({ errorMessage: 'Wrong game id' })
        }
    });

    socket.on('requestDiceSide', (clientId, ackCallback) => {
        const game = GameRepository.getGameInstanceByPlayerId(clientId);
        const side = GameServices.getRandomItem(game.id, clientId, 'diceSides');
        if (side.errorMessage) {
            ackCallback({ errorMessage: side.errorMessage })
        } else if (game.isDiceRolled) {
            ackCallback({ errorMessage: 'You have already rolled the dice' })
        } else {
            game.setCurrentSide(side);
            game.isDiceRolled = true;
            ackCallback({
                side: game.getCurrentSide()
            });
            socket.to(game.id).emit('updateDiceSide', { side });
        }

    });

    socket.on('requestCard', (clientId, ackCallback) => {
        const game = GameRepository.getGameInstanceByPlayerId(clientId);

        const card = GameServices.getRandomItem(game.id, clientId, 'cards', true);
        if (card.errorMessage) {
            ackCallback({ errorMessage: card.errorMessage });
        }
        else if (game.isCardDrawn) {
            ackCallback({ errorMessage: 'You already drew a card' })
        } else {
            game.isCardDrawn = true;
            game.setCurrentCard(card);
            game.setCardsLeft();
            ackCallback({ card: game.getCurrentCard(), cardsLeft: game.cardsLeft });
            socket.to(game.id).emit('updateCard', { card, cardsLeft: game.cardsLeft });
        }

    });

    socket.on('start-game', (playerId, ackCallback) => {
        const startGameResponse = GameServices.startGame(playerId);
        if (startGameResponse.errorMessage) {
            ackCallback({ errorMessage: 'Wait for the Game master to start the game' })
        } else {
            io.to(startGameResponse.game.playerWithBomb.socketId).emit('game-started', { gameMasterMessage: startGameResponse.gameMasterMessage });
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

    socket.on('pass-bomb', (playerId, ackCallback) => {

        let game = GameRepository
            .getGameInstanceByPlayerId(playerId);
        if (playerId === game.playerWithBomb.id) {
            const players = GameRepository.getPlayersForGame(game.id);
            let currentIdx = players.findIndex((player) => player.id === game.playerWithBomb.id);
            currentIdx++;
            const nextPlayer = currentIdx >= players.length
                ? players[0]
                : players[currentIdx];
            game.playerWithBomb = nextPlayer;
            io.to(`${nextPlayer.socketId}`).emit('change-player', `${nextPlayer.name}, Its your turn!`);
            ackCallback({ message: `Bomb passed to ${nextPlayer.name}` })
        } else {
            ackCallback({ errorMessage: 'Only the player with the bomb can pass it' })
        }
    });

    socket.once('getInstances', (ackCallback) => {
        ackCallback(GameRepository.getGameInstances(), PlayerRepository.getPlayers());
    });

    socket.on('disconnect', () => {
        console.log(`user with id ${socket.id} disconnected!`);
    })
});

const port = process.env.PORT || 1337;
io.listen(port);
console.log('listening on port ', port);