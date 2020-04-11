// const io = require('socket.io')();
const uuidv4 = require('uuid').v4;
const express = require('express');
const http = require('http');
const { getRandomSecs } = require('./Utilities');
const GameRepository = require('./repository/GameRepository');
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


io.origins("*:*")

io.on('connection', (socket) => {
    console.log(`a new user has connected with id ${socket.id}`)

    socket.on('subscribeToPlayers', (_player) => {
        GameServices.savePlayer(_player);
        socket.emit('addMessage', 'player subscribed');
    });

    socket.on('createGameInstance', (data, ackCallback) => {

        const player = GameServices.savePlayer(data.name, socket.id, true);
        //use length of repository as Id for testing purposes
        const gameId = GameServices.saveGameInstance(uuidv4(), player);
        ackCallback({
            successMessage: 'New game successfully created!',
            gameId
        });
        socket.join(gameId);
    });

    socket.once('isValidGame', (gameId, ackCallback) => {
        const isValid = GameServices.isInstanceValid(gameId);
        ackCallback(isValid);
    });

    socket.on('subcribeToGameInstanceNewPlayer', (data, ackCallback) => {
        const newPlayer = GameServices.savePlayer(data.name, socket.id);
        const responseObject = GameServices.subscribeToGameInstance(data, newPlayer);
        console.log(responseObject);
        console.log(GameRepository.getGameInstances());
        if (responseObject.errorMessage) {
            io.in(data.gameId).emit('notifyPlayers', responseObject.errorMessage);
            ackCallback(responseObject.errorMessage);
        }
        socket.join(data.gameId);
        io.in(data.gameId).emit('notifyPlayers', `${data.name} joined the game!`, responseObject.players);
        ackCallback(`successfully added ${data.name} to game with id ${data.gameId}`);
    });

    socket.on('requestPlayersFromGame', (gameId, ackCallback) => {
        const players = GameRepository.getPlayersForGame(gameId);
        ackCallback(players);
    });

    socket.on('requestDiceSide', (gameId, ackCallback) => {
        const side = GameServices.getRandomItem(gameId, socket.id, 'diceSides');
        ackCallback({ side });
        socket.to(gameId).emit('updateDiceSide', { side });
    });

    socket.on('requestCard', (gameId, ackCallback) => {
        const card = GameServices.getRandomItem(gameId, socket.id, 'cards');
        console.log(card);
        const cardsLeft = GameRepository.getGameInstanceById(gameId).cards.length;
        ackCallback({ card, cardsLeft });
        socket.to(gameId).emit('updateCard', { card, cardsLeft });
    });

    socket.on('start-game', (gameId, playerId, ackCallback) => {
        let game = GameRepository.getGameInstanceById(gameId);
        game.playerWithBomb = GameRepository.getPlayerByIdForGame(gameId, playerId);
        let remainingTime = getRandomSecs();
        ackCallback('game started!');
        socket.to(gameId).emit('game-started', 'Let the games begin!');
        // console.log(remainingTime);
        setTimeout(() => {
            // gameEnded = true;
            game = GameRepository.getGameInstanceById(gameId);
            console.log(game.playerWithBomb);
            io.in(gameId).emit('game-ended', `${game.playerWithBomb.name} lost this round!`);

        }, remainingTime * 1000);
    });

    socket.on('pass-bomb', (gameId, playerId) => {

        let game = GameRepository
            .getGameInstanceById(gameId)
        if (playerId === game.playerWithBomb.id) {
            const players = GameRepository.getPlayersForGame(gameId);
            let currentIdx = players.findIndex((player) => player.id === game.playerWithBomb.id);
            currentIdx++;
            const nextPlayer = currentIdx >= players.length
                ? players[0]
                : players[currentIdx];
            game.playerWithBomb = nextPlayer;

            io.to(`${nextPlayer.id}`).emit('change-player', `${nextPlayer.name}, Its your turn!`);

        }
    });

    socket.on('disconnect', () => {
        console.log(`user with id ${socket.id} disconnected!`);
    })
});

const port = 1337;
io.listen(port);
console.log('listening on port ', port);