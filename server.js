const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet'); // Adicionar helmet

const app = express();
const server = http.createServer(app);

// Configurar o helmet com uma política de CSP
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "https://*.onrender.com"], // Permitir scripts locais e do Render
                connectSrc: ["'self'", "wss://*.onrender.com", "ws://localhost:8080"], // Permitir WebSocket
                styleSrc: ["'self'", "'unsafe-inline'"], // Permitir estilos inline
                upgradeInsecureRequests: [], // Permitir conexões WebSocket
            },
        },
    })
);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    pingTimeout: 60000, // 60 segundos
    pingInterval: 25000 // 25 segundos
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

    socket.on('gameAction', (data) => {
        const rooms = Array.from(socket.rooms);
        const roomId = rooms.find(room => room !== socket.id);
        if (roomId) {
            console.log(`Jogador ${socket.id} limpou ${data.linesCleared} linhas na sala ${roomId}`);
            // Enviar o evento opponentAction para os outros jogadores na sala
            socket.to(roomId).emit('opponentAction', { linesCleared: data.linesCleared });
        }
    });

    socket.on('disconnect', () => {
        console.log('Jogador desconectado:', socket.id);
        const rooms = Array.from(socket.rooms);
        const roomId = rooms.find(room => room !== socket.id);
        if (roomId) {
            socket.to(roomId).emit('playerLeft');
        }
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});