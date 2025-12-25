const socket = io();


// ================= AUDIO =================
const diceSound = document.getElementById("diceSound");
const moveSound = document.getElementById("moveSound");
const ladderSound = document.getElementById("ladderSound");
const snakeSound = document.getElementById("snakeSound");
const winSound = document.getElementById("winSound");

const gameOver = document.getElementById("gameOver");
const winnerText = document.getElementById("winnerText");
const replayBtn = document.getElementById("replayBtn");
const exitBtn = document.getElementById("exitBtn");

function playSound(audio) {
  if (!audio) return;
  const s = audio.cloneNode();
  s.volume = 1;
  s.play().catch(() => {});
}

// ================= ELEMENTS =================
const rollBtn = document.getElementById("rollBtn");
const dice = document.getElementById("dice");
const status = document.getElementById("status");
const playerNamesDiv = document.getElementById("playerNames");

const coins = [p1, p2, p3, p4, p5, p6];

// ================= STATE =================
let players = [];
let currentPlayer = 0;
let gameStarted = false;

// ================= COIN POSITION =================
function moveCoin(coin, pos, playerIndex = 0) {
  if (pos <= 0) return;

  const board = document.querySelector(".board-wrapper");
  const cell = board.clientWidth / 10;

  const index = pos - 1;
  const row = Math.floor(index / 10);
  let col = index % 10;

  if (row % 2 === 1) col = 9 - col;

  coin.classList.remove("outside");

  let left = col * cell + cell / 2 - coin.offsetWidth / 2;
  let bottom = row * cell + cell / 2 - coin.offsetHeight / 2;

  // 👇 offsets so coins never overlap
  const offsets = [
    [0, 0], [10, 0], [0, 10],
    [10, 10], [-10, 0], [0, -10]
  ];

  const [dx, dy] = offsets[playerIndex % offsets.length];
  coin.style.left = left + dx + "px";
  coin.style.bottom = bottom + dy + "px";
}

// ================= STEP MOVE =================
function animateStepMove(playerIndex, from, to, done) {
  let step = from;

  const timer = setInterval(() => {
    step++;
    moveCoin(coins[playerIndex], step, playerIndex);
    playSound(moveSound);

    if (step >= to) {
      clearInterval(timer);
      done && done();
    }
  }, 260);
}

// ================= PLAYER MODE =================
document.querySelectorAll(".mode-card").forEach(card => {
  card.onclick = () => {
    if (gameStarted) return;

    document.querySelectorAll(".mode-card").forEach(c => c.classList.remove("active"));
    card.classList.add("active");

    const count = Number(card.dataset.count);
    playerNamesDiv.innerHTML = "";

    for (let i = 0; i < count; i++) {
      const input = document.createElement("input");
      input.value = `Player ${i + 1}`;
      playerNamesDiv.appendChild(input);
    }
  };
});

// ================= ROLL BUTTON =================
rollBtn.onclick = () => {
  if (!gameStarted) {
    const inputs = [...playerNamesDiv.querySelectorAll("input")];
    const names = inputs.map(i => i.value || "Player");

    socket.emit("initGame", names);
    gameStarted = true;

    // 🔒 lock names
    inputs.forEach(i => i.disabled = true);
  }

  playSound(diceSound);

  rollBtn.disabled = true;
  status.innerText = "🎲 Rolling...";
  dice.classList.add("rolling");

  setTimeout(() => {
    dice.classList.remove("rolling");
    socket.emit("rollDice");
  }, 300);
};

// ================= SERVER EVENTS =================
socket.on("gameState", data => {
  players = data.players;
  currentPlayer = data.currentPlayer;

  players.forEach((p, i) => moveCoin(coins[i], p.pos, i));
  status.innerText = `${players[currentPlayer].name}'s Turn`;

  rollBtn.disabled = false;
});

socket.on("turnResult", d => {
  dice.src = `images/dice/dice${d.roll}.png`;

  // ❌ Exact roll required
  if (d.from === d.diceTarget) {
    status.innerText = "❌ Insufficient move! Exact roll needed.";
    rollBtn.disabled = false;
    return;
  }

  animateStepMove(d.currentPlayer, d.from, d.diceTarget, () => {

    const handleWinOrTurn = () => {
      // 🏆 WIN — AFTER VISUAL MOVE
      if (d.finalTarget === 100) {
  playSound(winSound);

  setTimeout(() => {
    winnerText.innerText = `🎉 ${players[d.currentPlayer].name} Wins!`;
    gameOver.classList.remove("hidden");
  }, 300);

  return; // ⛔ stop game
}


      finishTurn(d.nextPlayer);
    };

    // 🪜 / 🐍
    if (d.finalTarget !== d.diceTarget) {
      if (d.finalTarget > d.diceTarget) {
        playSound(ladderSound);
        status.innerText = "🪜 Ladder! Climbing up!";
      } else {
        playSound(snakeSound);
        status.innerText = "🐍 Snake! Sliding down!";
      }

      setTimeout(() => {
        moveCoin(coins[d.currentPlayer], d.finalTarget, d.currentPlayer);
        handleWinOrTurn();
      }, 350);
    } else {
      handleWinOrTurn();
    }
  });
});

// ================= TURN END =================
function finishTurn(nextPlayer) {
  currentPlayer = nextPlayer;
  status.innerText = `${players[currentPlayer].name}'s Turn`;
  rollBtn.disabled = false;
}

// 🔄 Replay
replayBtn.onclick = () => {
  location.reload();
};

// ❌ Exit
exitBtn.onclick = () => {
  window.close(); 
  // fallback if browser blocks close
  window.location.href = "about:blank";
};
