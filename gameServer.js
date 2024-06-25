const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");
const { isWinner, clickCount } = require("./utils/gameFunctions");
const { sendOne, sendAll } = require("./utils/sendReponse");

const PORT = 3000;
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = {};
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
  clients[clientId] = ws;

  ws.on("message", (message) => {
    // Join: {type: string, roomId: string}
    // New: {type: string, roomId: string}
    // Play: {type: string, position: number, roomId: string}

    message = JSON.parse(message);
    const { type, roomId, position } = message;
    const room = rooms[roomId];

    switch (type) {
      case "Join": {
        room.players.push(clientId);
        break;
      }

      case "Play": {
        if (room.players.length < 2) {
          let res = { type: "Error", errorMsg: "Not enough players" };
          sendOne(res, ws);
        } else {
          if (isWinner(room.grid)) {
            let winner = clickCount(room.grid) % 2 == 1 ? "X" : "O";
            let res = {
              type: "Result",
              resultMsg: `${winner} is the winner`,
            };
            sendOne(res, ws);
            break;
          } else if (
            clickCount(room.grid) % 2 == 0 &&
            clientId == room.players[0] &&
            room.grid[position] == null
          ) {
            room.grid[position] = "X";
            let res = { type: "Update", position, value: "X" };
            sendAll(res, room.players, clients);
          } else if (
            clickCount(room.grid) % 2 == 1 &&
            clientId == room.players[1] &&
            room.grid[position] == null
          ) {
            room.grid[position] = "O";
            let res = { type: "Update", position, value: "O" };
            sendAll(res, room.players, clients);
          } else {
            let res = { type: "Error", errorMsg: "Not your turn" };
            sendOne(res, ws);
            break;
          }

          if (isWinner(room.grid)) {
            let winner = clickCount(room.grid) % 2 == 1 ? "X" : "O";
            let res = {
              type: "Result",
              resultMsg: `${winner} is the winner`,
            };
            setTimeout(() => {
              sendAll(res, room.players, clients);
            }, 100);
          }

          if (clickCount(room.grid) == 9) {
            let res = { type: "Result", resultMsg: `It's a draw` };
            setTimeout(() => {
              sendAll(res, room.players, clients);
            }, 100);
          }
        }
        break;
      }

      case "New": {
        console.log("New message:", message);

        if (!(isWinner(room.grid) || clickCount(room.grid) == 9)) {
          let res = { type: "Error", errorMsg: "First finish this game" };
          sendOne(res, ws);
        } else {
          room.players = room.players.reverse();
          room.grid.forEach((value, position) => {
            if (value) {
              let res = { type: "Update", position, value: "" };
              sendAll(res, room.players, clients);

              room.grid[position] = null;
            }
          });
        }
      }
    }
  });

  ws.on("close", () => {
    for (let roomId in rooms) {
      rooms[roomId].players = rooms[roomId].players.filter((player) => player != clientId);
      rooms[roomId].grid.forEach((value, position) => {
        if (value) {
          let res = { type: "Update", position, value: "" };
          res = JSON.stringify(res);
          rooms[roomId].players.forEach((player) => {
            clients[player].send(res);
          });
          rooms[roomId].grid[position] = null;
        }
      });
      rooms[roomId].players.forEach((player) => {
        let res = { type: "Error", errorMsg: "Opponent left the game" };
        res = JSON.stringify(res);
        setTimeout(() => {
          clients[player].send(res);
        }, 100);
      });

      // Empty room is deleted in five minutes
      /* This has a semantic error that needs fixing */
      setTimeout(() => {
        if (rooms[roomId].players.length == 0) {
          delete rooms[roomId];
        }
      }, 1000 * 60 * 5);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is listening on PORT: ${PORT}`);
});
