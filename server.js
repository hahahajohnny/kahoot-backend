const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

const rooms = {}; 

app.get('/', (req, res) => {
  res.send('Kahoot 後端伺服器正在雲端順利運作中！');
});

io.on('connection', (socket) => {
  console.log('新使用者連線:', socket.id);

  socket.on('createRoom', (pin) => {
    rooms[pin] = { hostId: socket.id, players: [], currentQuestion: 0 };
    socket.join(pin);
    console.log(`房間 ${pin} 已創建`);
  });

  socket.on('joinRoom', ({ pin, nickname }) => {
    if (rooms[pin]) {
      const player = { id: socket.id, nickname: nickname, score: 0 };
      rooms[pin].players.push(player);
      socket.join(pin);
      
      io.to(rooms[pin].hostId).emit('playerJoined', rooms[pin].players);
      socket.emit('joinSuccess', { status: 'success' });
    } else {
      socket.emit('joinError', '找不到這個房間的 PIN 碼！');
    }
  });

  socket.on('nextQuestion', ({ pin, questionIndex }) => {
    if (rooms[pin]) {
      rooms[pin].currentQuestion = questionIndex;
      socket.to(pin).emit('showOptions', { questionIndex });
    }
  });

  socket.on('submitAnswer', ({ pin, answer }) => {
    const hostId = rooms[pin]?.hostId;
    if (hostId) {
      io.to(hostId).emit('answerReceived', { playerId: socket.id, answer });
    }
  });

  socket.on('disconnect', () => {
    console.log('使用者斷開連線:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`伺服器已在 Port ${PORT} 啟動...`);
});
