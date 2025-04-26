let hasOpponent = false; // Variável para rastrear se há um oponente

document.addEventListener('DOMContentLoaded', () => {
    const socket = io({
        transports: ['websocket'], // Forçar uso de WebSocket
        reconnectionAttempts: 5, // Tentar reconectar 5 vezes
        reconnectionDelay: 1000 // Atraso de 1 segundo entre tentativas
    });
    console.log('Tentando conectar ao Socket.IO');

    socket.on('connect', () => {
        console.log('Conectado ao servidor via Socket.IO');
    });

    socket.on('connect_error', (error) => {
        console.log('Erro ao conectar ao Socket.IO:', error.message);
    });

    socket.on('reconnect_attempt', (attempt) => {
        console.log('Tentativa de reconexão:', attempt);
    });

    socket.on('reconnect_failed', () => {
        console.log('Falha ao reconectar ao Socket.IO');
    });

    document.getElementById('createRoom').addEventListener('click', () => {
        console.log('Botão Criar Sala clicado');
        socket.emit('createRoom', (response) => {
            if (!response) {
                console.log('Falha ao enviar evento createRoom');
            }
        });
        console.log('Evento createRoom enviado');
    });

    socket.on('roomCreated', (roomId) => {
        console.log('Sala criada, ID:', roomId);
        alert('Sala criada! ID: ' + roomId);
        document.getElementById('roomIdInput').value = roomId;
    });

    const playerCanvas = document.getElementById('playerCanvas');
    const opponentCanvas = document.getElementById('opponentCanvas');
    const playerCtx = playerCanvas.getContext('2d');
    const opponentCtx = opponentCanvas.getContext('2d');
    const chatMessages = document.getElementById('chatMessages');

    // Configurações do jogo
    const ROWS = 20;
    const COLS = 10;
    const BLOCK_SIZE = 32;
    const tetrominos = {
        'I': [[1,1,1,1]],
        'O': [[1,1],[1,1]],
        'T': [[0,1,0],[1,1,1]],
        'S': [[0,1,1],[1,1,0]],
        'Z': [[1,1,0],[0,1,1]],
        'J': [[1,0,0],[1,1,1]],
        'L': [[0,0,1],[1,1,1]]
    };
    const tetrominoColors = {
        'I': 'cyan',
        'O': 'yellow',
        'T': 'purple',
        'S': 'green',
        'Z': 'red',
        'J': 'blue',
        'L': 'orange'
    };
    let playerBoard = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    let opponentBoard = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    let currentTetromino = null;
    let tetrominoRow = 0;
    let tetrominoCol = 0;
    let gameLoop = null;
    let gameOver = false;

    // Gerar uma sequência de tetrominos
    const tetrominoSequence = [];
    function generateSequence() {
        const sequence = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
        while (tetrominoSequence.length < 5) {
            const rand = sequence[Math.floor(Math.random() * sequence.length)];
            tetrominoSequence.push(rand);
        }
    }

    function getNextTetromino() {
        if (tetrominoSequence.length === 0) generateSequence();
        const shape = tetrominoSequence.shift();
        return { shape, matrix: tetrominos[shape], color: tetrominoColors[shape] };
    }

    // Desenhar o tabuleiro
    function drawBoard(ctx, board) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                if (board[row][col]) {
                    ctx.fillStyle = board[row][col];
                    ctx.fillRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                    ctx.strokeStyle = 'white';
                    ctx.strokeRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                }
            }
        }
    }

    // Desenhar o tetromino atual
    function drawTetromino() {
        if (!currentTetromino) return;
        playerCtx.fillStyle = currentTetromino.color;
        for (let row = 0; row < currentTetromino.matrix.length; row++) {
            for (let col = 0; col < currentTetromino.matrix[row].length; col++) {
                if (currentTetromino.matrix[row][col]) {
                    playerCtx.fillRect((tetrominoCol + col) * BLOCK_SIZE, (tetrominoRow + row) * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                    playerCtx.strokeStyle = 'white';
                    playerCtx.strokeRect((tetrominoCol + col) * BLOCK_SIZE, (tetrominoRow + row) * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                }
            }
        }
    }

    // Verificar se o movimento é válido
    function isValidMove(matrix, row, col) {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c]) {
                    const newRow = row + r;
                    const newCol = col + c;
                    if (newRow >= ROWS || newCol < 0 || newCol >= COLS || (newRow >= 0 && playerBoard[newRow][newCol])) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    // Colocar o tetromino no tabuleiro
    function placeTetromino() {
        for (let row = 0; row < currentTetromino.matrix.length; row++) {
            for (let col = 0; col < currentTetromino.matrix[row].length; col++) {
                if (currentTetromino.matrix[row][col]) {
                    const boardRow = tetrominoRow + row;
                    const boardCol = tetrominoCol + col;
                    if (boardRow < 0) {
                        gameOver = true;
                        return;
                    }
                    playerBoard[boardRow][boardCol] = currentTetromino.color;
                }
            }
        }
        checkLines();
        currentTetromino = getNextTetromino();
        tetrominoRow = 0;
        tetrominoCol = Math.floor(COLS / 2) - Math.floor(currentTetromino.matrix[0].length / 2);
        if (!isValidMove(currentTetromino.matrix, tetrominoRow, tetrominoCol)) {
            gameOver = true;
        }
    }

    // Verificar e remover linhas completas
    function checkLines() {
        let linesCleared = 0;
        for (let row = ROWS - 1; row >= 0; row--) {
            if (playerBoard[row].every(cell => cell)) {
                playerBoard.splice(row, 1);
                playerBoard.unshift(Array(COLS).fill(0));
                linesCleared++;
                row++;
            }
        }
        if (linesCleared > 0) {
            socket.emit('gameAction', { linesCleared });
        }
    }

    // Adicionar linhas de "lixo" (garbage lines)
    function addGarbageLines(count) {
        for (let i = 0; i < count; i++) {
            playerBoard.shift();
            const garbageRow = Array(COLS).fill('gray');
            const hole = Math.floor(Math.random() * COLS);
            garbageRow[hole] = 0;
            playerBoard.push(garbageRow);
        }
    }

    // Rotacionar o tetromino
    function rotateTetromino() {
        const matrix = currentTetromino.matrix;
        const N = matrix.length;
        const rotated = Array(N).fill().map(() => Array(N).fill(0));
        for (let row = 0; row < N; row++) {
            for (let col = 0; col < N; col++) {
                rotated[col][N - 1 - row] = matrix[row][col];
            }
        }
        if (isValidMove(rotated, tetrominoRow, tetrominoCol)) {
            currentTetromino.matrix = rotated;
        }
    }

    // Iniciar o jogo
    function startGame() {
        playerBoard = Array(ROWS).fill().map(() => Array(COLS).fill(0));
        opponentBoard = Array(ROWS).fill().map(() => Array(COLS).fill(0));
        currentTetromino = getNextTetromino();
        tetrominoRow = 0;
        tetrominoCol = Math.floor(COLS / 2) - Math.floor(currentTetromino.matrix[0].length / 2);
        gameOver = false;

        if (gameLoop) clearInterval(gameLoop);
        gameLoop = setInterval(() => {
            if (gameOver) {
                clearInterval(gameLoop);
                alert('Game Over!');
                return;
            }
            drawBoard(playerCtx, playerBoard);
            drawBoard(opponentCtx, opponentBoard);
            drawTetromino();
            if (!isValidMove(currentTetromino.matrix, tetrominoRow + 1, tetrominoCol)) {
                placeTetromino();
            } else {
                tetrominoRow++;
            }
        }, 1000);
    }

    // Controles do teclado
    document.addEventListener('keydown', (e) => {
        if (gameOver) return;
        switch (e.key) {
            case 'ArrowLeft':
                if (isValidMove(currentTetromino.matrix, tetrominoRow, tetrominoCol - 1)) {
                    tetrominoCol--;
                }
                break;
            case 'ArrowRight':
                if (isValidMove(currentTetromino.matrix, tetrominoRow, tetrominoCol + 1)) {
                    tetrominoCol++;
                }
                break;
            case 'ArrowDown':
                if (isValidMove(currentTetromino.matrix, tetrominoRow + 1, tetrominoCol)) {
                    tetrominoRow++;
                }
                break;
            case 'ArrowUp':
                rotateTetromino();
                break;
            case ' ':
                while (isValidMove(currentTetromino.matrix, tetrominoRow + 1, tetrominoCol)) {
                    tetrominoRow++;
                }
                placeTetromino();
                break;
        }
    });

    // Comunicação com o servidor
    document.getElementById('joinRoom').addEventListener('click', () => {
        const roomId = document.getElementById('roomIdInput').value;
        console.log('Tentando entrar na sala:', roomId);
        socket.emit('joinRoom', roomId);
    });

    socket.on('roomJoined', (roomId) => {
        console.log('Entrou na sala:', roomId);
        document.getElementById('gameArea').style.display = 'flex'; // Mostrar a área do jogo
        hasOpponent = false; // Inicialmente, assume que não há oponente
        startGame();
    });

    socket.on('roomFull', () => {
        console.log('Sala cheia ou não encontrada!');
        alert('Sala cheia ou não encontrada!');
    });

    socket.on('startGame', () => {
        console.log('Iniciando o jogo...');
        startGame();
    });

    socket.on('opponentAction', (data) => {
        console.log('Evento opponentAction recebido:', data); // Log para depuração
        if (hasOpponent && data.linesCleared) {
            console.log('Recebendo linhas de lixo:', data.linesCleared);
            addGarbageLines(data.linesCleared);
        } else {
            console.log('Ignorando linhas de lixo: nenhum oponente presente ou dados inválidos');
        }
    });

    socket.on('playerLeft', () => {
        console.log('O oponente saiu da partida!');
        alert('O oponente saiu da partida!');
        gameOver = true;
        clearInterval(gameLoop);
        opponentBoard = Array(ROWS).fill().map(() => Array(COLS).fill(0));
        hasOpponent = false;
    });

    // Chat
    document.getElementById('sendChat').addEventListener('click', () => {
        sendChatMessage();
    });

    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });

    function sendChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        if (message) {
            console.log('Enviando mensagem de chat:', message);
            socket.emit('chatMessage', { sender: socket.id, message });
            input.value = '';
        }
    }

    socket.on('chatMessage', (data) => {
        console.log('Mensagem de chat recebida:', data);
        const messageElement = document.createElement('div');
        messageElement.textContent = `${data.sender}: ${data.message}`;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        // Verificar se a mensagem indica que outro jogador entrou
        if (data === 'Um jogador entrou na sala!') {
            hasOpponent = true;
            console.log('Outro jogador entrou na sala, hasOpponent agora é true');
        }
    });
});