const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");
const {
  isWinner,
  clickCount,
  resetBoard,
  turnX,
  turnO,
} = require("./utils/gameFunctions");
const { sendOne, sendAll } = require("./utils/sendReponse");

const PORT = 3000;
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Rooms in which players play
const rooms = {};
// Stores the websocket instance with the clientId
const clients = {};

// All the exisiting rooms
app.get("/rooms", (req, res) => {
  const response = JSON.stringify(rooms);
  res.send(response);
});

// Creating a new room
app.get("/rooms/:roomId", (req, res) => {
  const { roomId } = req.params;
  rooms[roomId] = { players: [], grid: new Array(9).fill(null) };
  res.send("ok");
});

// Game logic
wss.on("connection", (ws) => {
  let clientId = uuidv4();
  clients[clientId] = { socketConnection: ws, roomId: null };

  ws.on("message", (message) => {
    // Join: {type: string, roomId: string}
    // New: {type: string, roomId: string}
    // Play: {type: string, position: number, roomId: string}

    message = JSON.parse(message);
    const { type, roomId, position } = message;
    const room = rooms[roomId];
    const board = room.grid;

    switch (type) {
      case "Join": {
        clients[clientId].roomId = roomId;
        room.players.push(clientId);
        break;
      }

      case "Play": {
        // When the room is not full
        if (room.players.length < 2) {
          let res = { type: "Error", errorMsg: "Not enough players" };
          sendOne(res, ws);
        }
        // When room is full
        else {
          // Checks if the game is already won
          if (isWinner(board)) {
            let winner = clickCount(board) % 2 == 1 ? "X" : "O";
            let res = {
              type: "Result",
              resultMsg: `${winner} is the winner`,
            };
            sendOne(res, ws);
            break;
          }
          // Updates the board when X is played
          else if (turnX(board, position, clientId, room)) {
            board[position] = "X";
            let res = { type: "Update", position, value: "X" };
            sendAll(res, room.players, clients);
          }
          // Updates the board when O is played
          else if (turnO(board, position, clientId, room)) {
            board[position] = "O";
            let res = { type: "Update", position, value: "O" };
            sendAll(res, room.players, clients);
          }
          // Alerts if someone plays out of turn
          else {
            let res = { type: "Error", errorMsg: "Not your turn" };
            sendOne(res, ws);
            break;
          }
          // Checks if there is a winner
          if (isWinner(board)) {
            let winner = clickCount(board) % 2 == 1 ? "X" : "O";
            let res = {
              type: "Result",
              resultMsg: `${winner} is the winner`,
            };
            setTimeout(() => {
              sendAll(res, room.players, clients);
            }, 100);
          }
          // Checks if there is a draw
          if (clickCount(board) == 9) {
            let res = { type: "Result", resultMsg: `It's a draw` };
            setTimeout(() => {
              sendAll(res, room.players, clients);
            }, 100);
          }
        }
        break;
      }

      case "New": {
        // If game is not yet over
        if (!(isWinner(board) || clickCount(board) == 9)) {
          let res = { type: "Error", errorMsg: "First finish this game" };
          sendOne(res, ws);
        }
        // Game is reset
        else {
          room.players = room.players.reverse();
          resetBoard(board, room.players, clients);
        }
      }
    }
  });

  ws.on("close", () => {
    let { roomId } = clients[clientId];

    rooms[roomId].players = rooms[roomId].players.filter(
      (player) => player != clientId
    );

    resetBoard(rooms[roomId].grid, rooms[roomId].players, clients);

    let res = { type: "Error", errorMsg: "Opponent left the game" };
    sendAll(res, rooms[roomId].players, clients);

    // Empty room is deleted in five minutes
    /* This has a semantic error that needs fixing */
    setTimeout(() => {
      if (rooms[roomId].players.length == 0) {
        delete rooms[roomId];
      }
    }, 1000 * 60 * 5);
  });
});

server.listen(PORT, () => {
  console.log(`Server is listening on PORT: ${PORT}`);
});
