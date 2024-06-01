# Multiplayer Tic-Tac-Toe

## Introduction

This is a clean and minimal real-time multiplayer version of Tic-Tac-Toe game. Users can create rooms on the server and share the room-id with people to play against on another. You can find the hosted website [here](https://tic-tac-toe-live.onrender.com/).

## Journey

- **Primary Motivation:** Explore real-time communication techniques.

- **Initial Assumption**: Believed real-time communication could be achieved using HTTP alone.

- **Problems encountered:**

  - How can different users directly interact with each other?
  - How is a common game state maintained between users?

- **Required Solution:**

  - Server must be able to send data without client initiated requests
  - Connection should be persistent

- **Learning Outcome:**

  - Realized HTTP polling is very inefficient
  - Discovered the WebSocket protocol for persistent, full duplex connection

## Tech Stack

- **Front end:**

  1. EJS (template engine)
  2. CSS
  3. JS

- **Back end:**

  1. Node.js
  2. Express.js (For http connection)
  3. ws (For websocket connection)

- **Hosting:** Render
