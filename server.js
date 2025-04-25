const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('Novo jogador conectado:', socket.id);

    // Criar uma nova sala
    socket.on('createRoom', () => {
        const roomId = 'room_' + Date.now();
        socket.join(roomId);
        console.log('Nova sala criada:', roomId);
        socket.emit('roomCreated', roomId);
    });

    // Entrar em uma sala existente
    socket.on('joinRoom', (roomId) => {
        const room = io.sockets.adapter.rooms.get(roomId);
        if (room && room.size < 2) {
            socket.join(roomId);
            console.log('Jogador entrou na sala:', roomId);
            socket.emit('roomJoined', roomId);
            io.to(roomId).emit('chatMessage', 'Um jogador entrou na sala!');
        } else {
            socket.emit('chatMessage', 'Sala cheia ou não encontrada!');
        }
    });

    // Enviar mensagens no chat
    socket.on('chatMessage', (message) => {
        const rooms = Array.from(socket.rooms);
        const roomId = rooms.find(room => room !== socket.id); // Encontrar a sala do jogador
        if (roomId) {
            io.to(roomId).emit('chatMessage', message);
        }
    });

    socket.on('disconnect', () => {
        console.log('Jogador desconectado:', socket.id);
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});