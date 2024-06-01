if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const WebSocket = require("ws");
const http = require("http");
const session = require("express-session");
const path = require("path");
const flash = require("connect-flash");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const { isWinner, clickCount } = require("./gameLogic");

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = 8080;

async function main() {
  await mongoose.connect(process.env.MONGO_URL);
}

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

// Room setup
const rooms = {};
const clients = {};

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "/public")));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URL,
      crypto: { secret: process.env.SESSION_SECRET },
      touchAfter: 24 * 3600,
    }),
  })
);
app.use(flash());

// Middleware for flashing messages
app.use((req, res, next) => {
  res.locals.errorMsg = req.flash("error");
  next();
});

app.get("/", (req, res) => {
  res.render("home.ejs");
});

// Joining room id
app.get("/room/:id", (req, res) => {
  const roomId = req.params.id;
  if (!rooms[roomId]) {
    req.flash("error", `room "${roomId}" doesn't exist`);
    res.redirect("/");
  } else if (rooms[roomId].players.length == 2) {
    req.flash("error", `room "${roomId}" is full`);
    res.redirect("/");
  } else {
    res.render("room.ejs", { roomId });
  }
});

// Creating room id
app.post("/home", (req, res) => {
  const { roomId } = req.body;
  if (rooms[roomId]) {
    req.flash("error", `room "${roomId}" already exists`);
    res.redirect("/");
  } else {
    rooms[roomId] = { players: [], grid: new Array(9).fill(null) };
    res.redirect(`/room/${roomId}`);
  }
});

// Game logic
wss.on("connection", (ws) => {
  let clientId = uuidv4();
  clients[clientId] = ws;

  ws.on("message", (message) => {
    message = JSON.parse(message);
    switch (message.type) {
      case "Join": {
        rooms[message.roomId].players.push(clientId);
        break;
      }

      case "Play": {
        const { roomId, position } = message;
        if (rooms[roomId].players.length < 2) {
          let reply = { type: "Error", errorMsg: "Not enough players" };
          reply = JSON.stringify(reply);
          ws.send(reply);
        } else {
          if (isWinner(rooms[roomId].grid)) {
            let winner = clickCount(rooms[roomId].grid) % 2 == 1 ? "X" : "O";
            let reply = {
              type: "Result",
              resultMsg: `${winner} is the winner`,
            };
            reply = JSON.stringify(reply);
            ws.send(reply);
            break;
          } else if (
            clickCount(rooms[roomId].grid) % 2 == 0 &&
            clientId == rooms[roomId].players[0] &&
            rooms[roomId].grid[position] == null
          ) {
            rooms[roomId].grid[position] = "X";
            let reply = { type: "Update", position, value: "X" };
            reply = JSON.stringify(reply);

            rooms[roomId].players.forEach((playerId) => {
              clients[playerId].send(reply);
            });
          } else if (
            clickCount(rooms[roomId].grid) % 2 == 1 &&
            clientId == rooms[roomId].players[1] &&
            rooms[roomId].grid[position] == null
          ) {
            rooms[roomId].grid[position] = "O";
            let reply = { type: "Update", position, value: "O" };
            reply = JSON.stringify(reply);
            rooms[roomId].players.forEach((playerId) => {
              clients[playerId].send(reply);
            });
          } else {
            let reply = { type: "Error", errorMsg: "Not your turn" };
            reply = JSON.stringify(reply);
            ws.send(reply);
            break;
          }

          if (isWinner(rooms[roomId].grid)) {
            let winner = clickCount(rooms[roomId].grid) % 2 == 1 ? "X" : "O";
            let reply = {
              type: "Result",
              resultMsg: `${winner} is the winner`,
            };
            reply = JSON.stringify(reply);
            setTimeout(() => {
              rooms[roomId].players.forEach((playerId) => {
                clients[playerId].send(reply);
              });
            }, 100);
          }

          if (clickCount(rooms[roomId].grid) == 9) {
            let reply = { type: "Result", resultMsg: `It's a draw` };
            reply = JSON.stringify(reply);
            setTimeout(() => {
              rooms[roomId].players.forEach((playerId) => {
                clients[playerId].send(reply);
              });
            }, 100);
          }
        }
        break;
      }

      case "New": {
        const { roomId } = message;

        if (
          !(isWinner(rooms[roomId].grid) || clickCount(rooms[roomId].grid) == 9)
        ) {
          let reply = { type: "Error", errorMsg: "First finish this game" };
          reply = JSON.stringify(reply);
          ws.send(reply);
        } else {
          rooms[roomId].players = rooms[roomId].players.reverse();
          rooms[roomId].grid.forEach((value, position) => {
            if (value) {
              let reply = { type: "Update", position, value: "" };
              reply = JSON.stringify(reply);
              rooms[roomId].players.forEach((playerId) => {
                clients[playerId].send(reply);
              });
              rooms[roomId].grid[position] = null;
            }
          });
        }
      }
    }
  });

  ws.on("close", () => {
    for (let roomId in rooms) {
      rooms[roomId].players = rooms[roomId].players.filter(
        (playerId) => playerId != clientId
      );
      rooms[roomId].grid.forEach((value, position) => {
        if (value) {
          let reply = { type: "Update", position, value: "" };
          reply = JSON.stringify(reply);
          rooms[roomId].players.forEach((playerId) => {
            clients[playerId].send(reply);
          });
          rooms[roomId].grid[position] = null;
        }
      });
      rooms[roomId].players.forEach((playerId) => {
        let reply = { type: "Error", errorMsg: "Opponent left the game" };
        reply = JSON.stringify(reply);
        setTimeout(() => {
          clients[playerId].send(reply);
        }, 100);
      });

      // Empty room is deleted in five minutes
      if (rooms[roomId].players.length == 0) {
        setTimeout(() => {
          delete rooms[roomId];
        }, 1000 * 60 * 5);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is listening on port: ${PORT}`);
});
