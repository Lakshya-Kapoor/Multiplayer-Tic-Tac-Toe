const roomId = document.querySelector("#room-id").textContent;

const ws = new WebSocket("wss://tic-tac-toe-live.onrender.com");

ws.onopen = () => {
  let message = { type: "Join", roomId };
  message = JSON.stringify(message);
  ws.send(message);
};

ws.onmessage = (event) => {
  message = event.data;
  message = JSON.parse(message);
  console.log(message);
  switch (message.type) {
    case "Error": {
      alert(message.errorMsg);
      break;
    }
    case "Update": {
      let tile = document.getElementById(message.position);
      tile.textContent = message.value;
      break;
    }
    case "Result": {
      alert(message.resultMsg);
    }
  }
};

let tiles = document.querySelectorAll(".tile");

tiles.forEach((tile) => {
  tile.addEventListener("click", () => {
    if (tile.textContent) return;
    let message = { type: "Play", roomId };
    message.position = Number(tile.id);
    message = JSON.stringify(message);
    ws.send(message);
  });
});

const resetBtn = document.querySelector(".reset-btn");

function reset() {
  let message = { type: "New", roomId };
  message = JSON.stringify(message);
  ws.send(message);
}
