const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(express.static('public'));

app.get('/', (req, res) => {
    console.log('Requisição GET / recebida');
    res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
    console.log('Novo jogador conectado:', socket.id);

    socket.on('createRoom', () => {
        console.log('Evento createRoom recebido');
        const roomId = 'room_' + Date.now();
        socket.join(roomId);
        console.log('Nova sala criada:', roomId);
        socket.emit('roomCreated', roomId);
    });

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

    socket.on('chatMessage', (message) => {
        const rooms = Array.from(socket.rooms);
        const roomId = rooms.find(room => room !== socket.id);
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