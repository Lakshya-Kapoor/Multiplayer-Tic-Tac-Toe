const { sendAll } = require("./sendReponse");

const isWinner = (grid) => {
  const pattern = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < pattern.length; i++) {
    if (
      grid[pattern[i][0]] &&
      grid[pattern[i][0]] == grid[pattern[i][1]] &&
      grid[pattern[i][1]] == grid[pattern[i][2]]
    )
      return true;
  }
  return false;
};

const clickCount = (grid) => {
  let count = 0;
  for (let i = 0; i < 9; i++) if (grid[i]) count++;
  return count;
};

const resetBoard = (board, players, clients) => {
  board.forEach((value, position) => {
    if (value) {
      let res = { type: "Update", position, value: "" };
      sendAll(res, players, clients);
      board[position] = null;
    }
  });
};

const turnX = (board, position, clientId, room) => {
  return (
    clickCount(board) % 2 == 0 &&
    clientId == room.players[0] &&
    board[position] == null
  );
};

const turnO = (board, position, clientId, room) => {
  return (
    clickCount(board) % 2 == 1 &&
    clientId == room.players[1] &&
    board[position] == null
  );
};

module.exports = {
  isWinner,
  clickCount,
  resetBoard,
  turnX,
  turnO,
};
