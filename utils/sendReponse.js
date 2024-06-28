module.exports.sendOne = (res, ws) => {
  res = JSON.stringify(res);
  ws.send(res);
};

module.exports.sendAll = (res, players, clients) => {
  res = JSON.stringify(res);

  players.forEach((player) => {
    clients[player].socketConnection.send(res);
  });
};
