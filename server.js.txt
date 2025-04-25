const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const rooms = {};

io.on('connection', (socket) => {
    console.log('Usuário conectado:', socket.id);

    socket.on('createRoom', () => {
        const roomId = `room_${Date.now()}`;
        rooms[roomId] = { players: [socket.id], gameState: null };
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
    });

    socket.on('joinRoom', (roomId) => {
        if (rooms[roomId] && rooms[roomId].players.length < 2) {
            rooms[roomId].players.push(socket.id);
            socket.join(roomId);
            io.to(roomId).emit('startGame');
        } else {
            socket.emit('roomError', 'Sala cheia ou inexistente');
        }
    });

    socket.on('gameState', (roomId, gameState) => {
        if (rooms[roomId]) {
            rooms[roomId].gameState = gameState;
            socket.to(roomId).emit('opponentState', gameState);
        }
    });

    socket.on('sendChat', (roomId, message) => {
        io.to(roomId).emit('receiveChat', message);
    });

    socket.on('disconnect', () => {
        console.log('Usuário desconectado:', socket.id);
        for (const roomId in rooms) {
            const room = rooms[roomId];
            const playerIndex = room.players.indexOf(socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                if (room.players.length === 0) {
                    delete rooms[roomId];
                } else {
                    io.to(roomId).emit('opponentDisconnected');
                }
            }
        }
    });
});

http.listen(8080, () => {
    console.log('Servidor rodando na porta 8080');
});