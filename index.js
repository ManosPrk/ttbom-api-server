
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
    console.log(`Client with ${socket.id} connected!`)

    socket.on('add-new-game', (newGameId, playerName) => {
        if (newGameId && !GameRepository.gameInstanceExists(newGameId)) {
            const player = GameServices.savePlayer(playerName, socket.id, true);
            const gameId = GameServices.saveGameInstance(newGameId);
            const game = GameRepository.getGameInstanceById(gameId);
            GameRepository.addPlayerToGameInstance(game.id, player);
            io.to(socket.id).emit('new-game-created', {
                createGameMessage: 'New game successfully created!',
                gameId,
                playerName: player.name,
                players: GameServices.getPlayersModel(gameId)
            });
        } else {
            io.to(socket.id).emit('new-game-created', { errorMessage: 'Game id already exists' });
        }
    });

    socket.on('join-game', (newGameId, playerName) => {
        if (!GameRepository.gameInstanceExists(newGameId)) {
            io.to(socket.id).emit('joined-game', { errorMessage: "Game instance doesnt exist!" });
        } else {
            const player = GameServices.savePlayer(playerName, socket.id);
            const game = GameRepository.getGameInstanceById(newGameId);
            GameRepository.addPlayerToGameInstance(game.id, player);
            io.to(socket.id).emit('joined-game', {
                joinedGameMessage: 'Joining game!',
                gameId: game.id,
                playerName: player.name,
                players: GameServices.getPlayersModel(game.id),
            });
        }
    });

    socket.on('is-valid-game', (ackCallback) => {
        const isValid = GameServices.isInstanceValid(socket.id);
        ackCallback(isValid);
    });

    socket.on('game-exists', (gameId, ackCallback) => {
        const gameExists = GameRepository.gameInstanceExists(gameId);
        ackCallback(gameExists);
    });

    socket.on('add-client-to-game-room', (data) => {
        const game = GameRepository.getGameInstanceById(data.gameId);
        if (!game) {
            io.to(socket.id).emit('update-game-data', { errorMessage: 'Game id doesnt exist' });
        } else {
            const game = GameRepository.getGameInstanceById(data.gameId);
            socket.join(data.gameId);
            socket.to(data.gameId).emit('notify-players', { notifyPlayersMessage: `${data.name} joined the game!`, players: GameServices.getPlayersModel(game.id) });
            io.to(socket.id).emit('update-game-data', {
                side: game.currentSide,
                card: game.currentCard,
                cardsLeft: game.getCardsLeft,
                isDiceRolled: game.isDiceRolled,
                isCardDrawn: game.isCardDrawn
            });
        }
    })

    socket.on('request-players-from-game', () => {
        const game = GameRepository.getGameInstanceById(socket.id);
        if (game) {
            const players = GameServices.getPlayersModel(game.id);
            io.to(socket.id).emit('update-players', players);
        } else {
            io.to(socket.id).emit('update-players', { errorMessage: 'You are not subscribed in a game' })
        }
    });

    socket.on('request-dice-side', () => {
        const game = GameRepository.getGameInstanceByPlayerId(socket.id);
        if (game) {
            const player = GameRepository.getPlayerByIdForGame(game.id, socket.id);
            const side = GameServices.getRandomItem(game.id, 'diceSides');
            if (game.isDiceRolled) {
                io.to(socket.id).emit('update-dice-side', { errorMessage: 'You have already rolled the dice' })

            } else if (GameRepository.isPlayerGameMaster(game.id, player.id)) {
                game.setCurrentSide(side);
                game.isDiceRolled = true;
                io.in(game.id).emit('update-dice-side', { side: game.getCurrentSide() });

            } else {
                io.to(socket.id).emit('update-dice-side', { errorMessage: "Only the GameMaster can roll the dice" });
            }
        }
    });

    socket.on('request-card', () => {
        const game = GameRepository.getGameInstanceByPlayerId(socket.id);
        if (game) {
            const player = GameRepository.getPlayerByIdForGame(game.id, socket.id);
            if (game.isCardDrawn) {
                io.to(socket.id).emit('update-card', { errorMessage: "You have already drawn a card" })
            } else if (GameRepository.isPlayerGameMaster(game.id, player.id)) {
                const card = GameServices.getRandomItem(game.id, 'cards', true);
                game.isCardDrawn = true;
                game.setCurrentCard(card);
                game.setCardsLeft();
                io.in(game.id).emit('update-card', { card: game.getCurrentCard(), cardsLeft: game.cardsLeft });
            } else {
                io.to(socket.id).emit('update-card', { errorMessage: "Only the GameMaster can draw a card" })
            }
        }
    });

    socket.on('start-round', () => {
        try {
            const startGameResponse = GameServices.startRound(socket.id);
            if (startGameResponse.errorMessage) {
                console.log(startGameResponse.errorMessage)
            } else {
                socket.to(startGameResponse.game.id).emit('round-started',
                    {
                        gameStartedMessage: startGameResponse.message,
                        roundStarted: startGameResponse.game.roundStarted
                    });
                io.to(socket.id).emit('change-player',
                    {
                        changePlayerMessage: startGameResponse.gameMasterMessage,
                        roundStarted: startGameResponse.game.roundStarted
                    });
                setTimeout(() => {
                    //check if round ended aswell
                    const loser = GameServices.endRound(startGameResponse.game.id);
                    const game = GameRepository.getGameInstanceByPlayerId(socket.id);
                    io.in(game.id).emit('round-ended', {
                        loser: { name: loser.name, roundsLost: loser.roundsLost },
                        players: GameServices.getPlayersModel(game.id),
                        roundStarted: game.roundStarted,
                        roundEnded: game.roundEnded,
                        gameOver: game.gameOver,
                    });
                }, getRandomSecs() * 1000);
            }
        } catch (err) {
            console.log(err);
        }
    });

    socket.on('reset-round', (gameId) => {
        if (GameRepository.isPlayerGameMaster(gameId, socket.id)) {
            const game = GameRepository.getGameInstanceById(gameId);
            GameServices.resetRound(game);
            io.in(game.id).emit('round-resetted', {
                roundStarted: game.roundStarted,
                roundEnded: game.roundEnded,
                gameOver: game.gameOver,
            })
        }
    })

    socket.on('pass-bomb', () => {
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
            io.to(`${nextPlayer.id}`).emit('change-player', { changePlayerMessage: `${nextPlayer.name}, Its your turn!` });
            io.to(socket.id).emit('player-changed', { bombPassedMessage: `Bomb passed to ${nextPlayer.name}` });
        } else {
            io.to(socket.id).emit('player-changed', { errorMessage: 'Only the player with the bomb can pass it' })
        }
    });

    socket.on('get-instances', (ackCallback) => {
        console.log('test')
        ackCallback(GameRepository.getGameInstances());
    });

    socket.on('player-disconnecting', () => {
        const notifyPlayersObject = GameServices.disconnectPlayer(socket.id);
        if (notifyPlayersObject) {
            const { gameId, players, message } = notifyPlayersObject;
            socket.leave(gameId);
            io.in(gameId).emit('player-disconnected', { playerDisconnectedMessage: message, players });
            if (notifyPlayersObject.newGameMaster) {
                io.to(notifyPlayersObject.newGameMaster.id).emit('game-master-changed', { gameMasterChangedMessage: `${notifyPlayersObject.newGameMaster.name} you are the game master now!` });
            }
        }
        io.to(socket.id).emit('reset-game-state');
    })

    socket.on('disconnect', () => {
        console.log(`user with id ${socket.id} disconnected!`);
        const notifyPlayersObject = GameServices.disconnectPlayer(socket.id);
        if (notifyPlayersObject) {
            const { gameId, players, message } = notifyPlayersObject;
            socket.leave(gameId);
            io.in(gameId).emit('player-disconnected', { playerDisconnectedMessage: message, players });
            if (notifyPlayersObject.newGameMaster) {
                io.to(notifyPlayersObject.newGameMaster.id).emit('game-master-changed', { gameMasterChangedMessage: `${notifyPlayersObject.newGameMaster.name} you are the game master now!` });
            }
        }
    })
});

const port = process.env.PORT || 1337;
io.listen(port);
console.log('listening on port ', port);