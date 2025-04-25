// Conectar ao servidor via Socket.IO
const socket = io();

// Manipular o botão "Criar Sala"
document.getElementById('createRoom').addEventListener('click', () => {
    console.log('Botão Criar Sala clicado');
    socket.emit('createRoom');
});

// Receber o ID da sala criada
socket.on('roomCreated', (roomId) => {
    console.log('Sala criada, ID:', roomId);
    alert('Sala criada! ID: ' + roomId);
});

// Manipular o botão "Entrar na Sala"
document.getElementById('joinRoom').addEventListener('click', () => {
    const roomId = document.getElementById('roomIdInput').value;
    if (roomId) {
        console.log('Tentando entrar na sala:', roomId);
        socket.emit('joinRoom', roomId);
    } else {
        alert('Digite o ID da sala!');
    }
});

// Confirmar entrada na sala e iniciar o jogo
socket.on('roomJoined', (roomId) => {
    console.log('Entrou na sala:', roomId);
    document.getElementById('roomControls').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';
    startGame();
});

// Manipular o envio de mensagens no chat
document.getElementById('sendMessage').addEventListener('click', () => {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value;
    if (message) {
        socket.emit('chatMessage', message);
        messageInput.value = '';
    }
});

// Receber mensagens do chat
socket.on('chatMessage', (message) => {
    const chatArea = document.createElement('p');
    chatArea.textContent = message;
    document.getElementById('chatArea').appendChild(chatArea);
});

// Função placeholder para iniciar o jogo (você pode expandir isso depois)
function startGame() {
    console.log('Jogo iniciado');
    // Aqui você adicionará a lógica para iniciar o Tetris
}