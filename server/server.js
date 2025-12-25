const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static(__dirname + "/../client"));

const snakes = {
  27: 5, 40: 3, 43: 18, 54: 31,
  66: 45, 76: 58, 89: 53, 99: 41
};

const ladders = {
  4: 25, 13: 46, 33: 49, 42: 63,
  50: 69, 62: 81, 74: 92
};

let players = [];
let currentPlayer = 0;

io.on("connection", socket => {

  socket.on("initGame", names => {
    players = names.map(n => ({ name: n, pos: 0 }));
    currentPlayer = 0;
    io.emit("gameState", { players, currentPlayer });
  });

  socket.on("rollDice", () => {
    if (!players.length) return;

    const roll = Math.floor(Math.random() * 6) + 1;
    const player = players[currentPlayer];

    const from = player.pos;
    const diceTarget = from + roll;

    if (diceTarget > 100) {
      io.emit("turnResult", {
        roll,
        from,
        diceTarget: from,
        finalTarget: from,
        currentPlayer,
        nextPlayer: (currentPlayer + 1) % players.length
      });
      currentPlayer = (currentPlayer + 1) % players.length;
      return;
    }

    let finalTarget = diceTarget;
    if (ladders[diceTarget]) finalTarget = ladders[diceTarget];
    else if (snakes[diceTarget]) finalTarget = snakes[diceTarget];

    player.pos = finalTarget;

    io.emit("turnResult", {
      roll,
      from,
      diceTarget,
      finalTarget,
      currentPlayer,
      nextPlayer: (currentPlayer + 1) % players.length,
      winner: finalTarget === 100 ? player.name : null
    });

    if (finalTarget === 100) {
  io.emit("turnResult", {
    roll,
    from,
    diceTarget,
    finalTarget,
    currentPlayer,
    nextPlayer: null,        // 👈 NO NEXT TURN
    winner: player.name     // 👈 send winner info ONLY
  });

  players = [];
  currentPlayer = 0;
  return;
}


    currentPlayer = (currentPlayer + 1) % players.length;
  });
});

http.listen(4000, () => {
  console.log("✅ Server running at http://localhost:4000");
});
