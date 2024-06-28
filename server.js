if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const http = require("http");
const session = require("express-session");
const path = require("path");
const flash = require("connect-flash");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");

const server = http.createServer(app);
const PORT = 8080;

async function main() {
  // await mongoose.connect(process.env.MONGO_URL);
  await mongoose.connect("mongodb://127.0.0.1:27017/tic-tac-toe");
}

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

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
    // store: MongoStore.create({
    //   mongoUrl: process.env.MONGO_URL,
    //   crypto: { secret: process.env.SESSION_SECRET },
    //   touchAfter: 24 * 3600,
    // }),
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

// Joining room
app.get("/room/:id", async (req, res) => {
  const roomId = req.params.id;
  const data = await fetch("http://localhost:3000/rooms");
  const rooms = await data.json();

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

// Creating room
app.post("/home", async (req, res) => {
  const { roomId } = req.body;
  const data = await fetch("http://localhost:3000/rooms");
  const rooms = await data.json();

  if (rooms[roomId]) {
    req.flash("error", `room "${roomId}" already exists`);
    res.redirect("/");
  } else {
    await fetch(`http://localhost:3000/rooms/${roomId}`);
    res.redirect(`/room/${roomId}`);
  }
});

server.listen(PORT, () => {
  console.log(`Server is listening on PORT: ${PORT}`);
});
