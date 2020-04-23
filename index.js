// const io = require('socket.io')();
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

    socket.on('test1', (id, ackCallback) => {
        ackCallback(id);
    })

    socket.on('subscribeToPlayers', (_player) => {
        GameServices.savePlayer(_player);
        socket.emit('addMessage', 'player subscribed');
    });

    socket.on('createGameInstance', (data, ackCallback) => {
        if (data.gameId && !GameRepository.gameInstanceExists(data.gameId)) {
            const player = GameServices.savePlayer(data.name, uuidv4(), socket.id, true);
            //use length of repository as Id for testing purposes
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

    socket.once('isValidGame', (gameId, ackCallback) => {
        const isValid = GameServices.isInstanceValid(gameId);
        ackCallback(isValid);
    });

    socket.on('addClientToGameRoom', (clientId, ackCallback) => {
        const game = GameRepository.getGameInstanceByPlayerId(clientId);
        const player = GameRepository.getPlayerByIdForGame(game.id, clientId);
        player.socketId = socket.id;
        socket.join(game.id);
        ackCallback(clientId);
    })


    socket.on('subcribeToGameInstanceNewPlayer', (data, ackCallback) => {
        const newPlayer = GameServices.savePlayer(data.name, uuidv4(), socket.id);
        if (GameRepository.gameInstanceExists(data.gameId)) {
            const responseObject = GameServices.subscribeToGameInstance(data, newPlayer);
            if (responseObject.errorMessage) {
                io.in(data.gameId).emit('notifyPlayers', responseObject.errorMessage);
                ackCallback(responseObject.errorMessage);
            }
            io.in(data.gameId).emit('notifyPlayers', `${data.name} joined the game!`, responseObject.players);
            ackCallback({ message: `successfully added ${data.name} to game with id ${data.gameId}`, clientId: newPlayer.id });
        } else {
            ackCallback({ errorMessage: 'Wrong game id' });
        }
    });

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

        console.log(GameRepository.isPlayerGameMaster(game.id, clientId));
        const side = GameServices.getRandomItem(game.id, clientId, 'diceSides');
        if (side.errorMessage) {
            ackCallback({ errorMessage: side.errorMessage })
        } else {
            ackCallback({ side });
            socket.to(game.id).emit('updateDiceSide', { side });
        }
    });

    socket.on('requestCard', (clientId, ackCallback) => {
        const game = GameRepository.getGameInstanceByPlayerId(clientId);
        const card = GameServices.getRandomItem(game.id, clientId, 'cards');
        if (card.errorMessage) {
            ackCallback({ errorMessage: card.errorMessage });
        }
        else {
            const cardsLeft = GameRepository.getGameInstanceById(game.id).cards.length;
            ackCallback({ card, cardsLeft });
            socket.to(game.id).emit('updateCard', { card, cardsLeft });
        }
    });

    socket.on('start-game', (playerId, ackCallback) => {
        let game = GameRepository.getGameInstanceByPlayerId(playerId);
        if (!game || !GameRepository.isPlayerGameMaster) {
            ackCallback({ errorMessage: 'Wait for the Game master to start the game' })
        } else {
            game.playerWithBomb = GameRepository.getPlayerByIdForGame(game.id, playerId);
            let remainingTime = getRandomSecs();
            ackCallback({ message: 'game started!' });
            socket.to(game.id).emit('game-started', 'Let the games begin!');
            // console.log(remainingTime);
            setTimeout(() => {
                // gameEnded = true;
                game = GameRepository.getGameInstanceById(game.id);
                const loser = GameRepository.getPlayerByIdForGame(game.id, game.playerWithBomb.id);
                loser.roundsLost++;
                io.in(game.id).emit('game-ended', loser.name);
                game.playerWithBomb = game.players[0];
            }, remainingTime * 1000);
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
            io.to(`${nextPlayer.id}`).emit('change-player', `${nextPlayer.name}, Its your turn!`);
            ackCallback({ message: 'bomb passed' })
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