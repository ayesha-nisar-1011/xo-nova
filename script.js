const cells = [...document.querySelectorAll(".cell")];

const modeSelect = document.querySelector("#game-mode");
const turnIndicator = document.querySelector("#turn-indicator");
const gameMessage = document.querySelector("#game-message");
const newRoundButton = document.querySelector("#new-round-button");
const resetScoreButton = document.querySelector("#reset-score-button");
const installButton = document.querySelector("#install-button");

const scoreXElement = document.querySelector("#score-x");
const scoreOElement = document.querySelector("#score-o");
const scoreDrawElement = document.querySelector("#score-draw");
const playerOLabel = document.querySelector("#player-o-label");

const winPatterns = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

let board = Array(9).fill("");
let currentPlayer = "X";
let gameOver = false;
let computerThinking = false;
let computerTimer = null;

// ------------------------------
// SCOREBOARD AND SAVED SCORES
// ------------------------------

function loadScores() {
  try {
    const saved = JSON.parse(localStorage.getItem("xo-nova-scores"));

    if (
      saved &&
      Number.isSafeInteger(saved.X) &&
      Number.isSafeInteger(saved.O) &&
      Number.isSafeInteger(saved.draws) &&
      saved.X >= 0 &&
      saved.O >= 0 &&
      saved.draws >= 0
    ) {
      return saved;
    }
  } catch (error) {
    console.warn("Could not load scores:", error);
  }

  return { X: 0, O: 0, draws: 0 };
}

let scores = loadScores();

function saveScores() {
  try {
    localStorage.setItem("xo-nova-scores", JSON.stringify(scores));
  } catch (error) {
    console.warn("Could not save scores:", error);
  }
}

function updateScoreboard() {
  scoreXElement.textContent = scores.X;
  scoreOElement.textContent = scores.O;
  scoreDrawElement.textContent = scores.draws;
}

// ------------------------------
// TURN INDICATOR
// ------------------------------

function updateTurn() {
  if (gameOver) return;

  if (computerThinking) {
    turnIndicator.textContent = "Computer is thinking...";
  } else if (modeSelect.value === "computer" && currentPlayer === "O") {
    turnIndicator.textContent = "Computer's turn";
  } else {
    turnIndicator.textContent = `Player ${currentPlayer}'s turn`;
  }
}

// ------------------------------
// WINNER CHECK
// ------------------------------

function getWinner() {
  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;

    if (board[a] !== "" && board[a] === board[b] && board[a] === board[c]) {
      return {
        player: board[a],
        pattern,
      };
    }
  }

  return null;
}

// ------------------------------
// DISPLAY THE BOARD
// ------------------------------

function renderBoard() {
  cells.forEach((cell, index) => {
    const value = board[index];

    cell.textContent = value;

    cell.classList.toggle("mark-x", value === "X");
    cell.classList.toggle("mark-o", value === "O");

    const computerTurn =
      modeSelect.value === "computer" && currentPlayer === "O";

    cell.disabled =
      gameOver || computerThinking || value !== "" || computerTurn;

    cell.setAttribute(
      "aria-label",
      value ? `Square ${index + 1}: ${value}` : `Square ${index + 1}`,
    );
  });
}

// ------------------------------
// FINISH A ROUND
// ------------------------------

function finishRound(message, winner = null) {
  gameOver = true;
  computerThinking = false;

  if (computerTimer !== null) {
    clearTimeout(computerTimer);
    computerTimer = null;
  }

  if (winner) {
    scores[winner.player]++;

    winner.pattern.forEach((index) => {
      cells[index].classList.add("win");
    });
  } else if (board.every(Boolean)) {
    scores.draws++;
  }

  saveScores();
  updateScoreboard();
  renderBoard();

  turnIndicator.textContent = "Round finished";
  gameMessage.textContent = message;
}

// ------------------------------
// PLAYER MOVE
// ------------------------------

function playMove(index) {
  if (
    gameOver ||
    computerThinking ||
    board[index] !== "" ||
    (modeSelect.value === "computer" && currentPlayer === "O")
  ) {
    return;
  }

  board[index] = currentPlayer;

  const winner = getWinner();

  if (winner) {
    finishRound(`${winner.player} wins! 🎉`, winner);
    return;
  }

  if (board.every(Boolean)) {
    finishRound("It's a draw! 🤝");
    return;
  }

  currentPlayer = currentPlayer === "X" ? "O" : "X";

  renderBoard();
  updateTurn();

  if (modeSelect.value === "computer" && currentPlayer === "O") {
    computerThinking = true;
    renderBoard();
    updateTurn();

    computerTimer = setTimeout(makeComputerMove, 450);
  }
}

// ------------------------------
// COMPUTER STRATEGY
// ------------------------------

function findStrategicMove(player) {
  for (const pattern of winPatterns) {
    const values = pattern.map((index) => board[index]);

    const playerCount = values.filter((value) => value === player).length;

    const emptyCount = values.filter((value) => value === "").length;

    if (playerCount === 2 && emptyCount === 1) {
      return pattern[values.indexOf("")];
    }
  }

  return null;
}

function makeComputerMove() {
  computerTimer = null;

  if (gameOver || modeSelect.value !== "computer") {
    computerThinking = false;
    renderBoard();
    updateTurn();
    return;
  }

  const emptyCells = board
    .map((value, index) => (value === "" ? index : -1))
    .filter((index) => index !== -1);

  if (emptyCells.length === 0) {
    computerThinking = false;

    if (board.every(Boolean)) {
      finishRound("It's a draw! 🤝");
    } else {
      renderBoard();
      updateTurn();
    }

    return;
  }

  // First, try to win.
  let chosenMove = findStrategicMove("O");

  // Next, block X from winning.
  if (chosenMove === null) {
    chosenMove = findStrategicMove("X");
  }

  // Prefer the center square.
  if (chosenMove === null && emptyCells.includes(4)) {
    chosenMove = 4;
  }

  // Otherwise, choose an available corner.
  if (chosenMove === null) {
    const corners = [0, 2, 6, 8].filter((index) => emptyCells.includes(index));

    if (corners.length > 0) {
      chosenMove = corners[Math.floor(Math.random() * corners.length)];
    }
  }

  // Finally, choose any available square.
  if (chosenMove === null) {
    chosenMove = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }

  board[chosenMove] = "O";
  computerThinking = false;

  const winner = getWinner();

  if (winner) {
    finishRound("Computer wins! 🤖", winner);
    return;
  }

  if (board.every(Boolean)) {
    finishRound("It's a draw! 🤝");
    return;
  }

  currentPlayer = "X";

  renderBoard();
  updateTurn();
}

// ------------------------------
// NEW ROUND AND RESET SCORES
// ------------------------------

function startNewRound() {
  if (computerTimer !== null) {
    clearTimeout(computerTimer);
    computerTimer = null;
  }

  board = Array(9).fill("");
  currentPlayer = "X";
  gameOver = false;
  computerThinking = false;

  cells.forEach((cell) => {
    cell.classList.remove("win");
  });

  gameMessage.textContent = "Ready to play? Make your first move!";

  renderBoard();
  updateTurn();
}

function resetScores() {
  const confirmed = window.confirm(
    "Are you sure you want to reset all scores?",
  );

  if (!confirmed) return;

  scores = { X: 0, O: 0, draws: 0 };

  saveScores();
  updateScoreboard();
  startNewRound();
}

// ------------------------------
// GAME EVENT LISTENERS
// ------------------------------

cells.forEach((cell, index) => {
  cell.addEventListener("click", () => {
    playMove(index);
  });
});

newRoundButton.addEventListener("click", startNewRound);

resetScoreButton.addEventListener("click", resetScores);

modeSelect.addEventListener("change", () => {
  playerOLabel.textContent =
    modeSelect.value === "computer" ? "COMPUTER" : "PLAYER O";

  startNewRound();
});

// ------------------------------
// APP INSTALLATION
// ------------------------------

let installPrompt = null;

function updateInstallButton() {
  if (installPrompt) {
    installButton.hidden = false;
    installButton.textContent = "Install App";
    return;
  }

  // Keep the button available to explain manual installation.
  installButton.hidden = false;
  installButton.textContent = "How to Install";
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();

  installPrompt = event;
  updateInstallButton();
});

installButton.addEventListener("click", async () => {
  if (!installPrompt) {
    gameMessage.textContent =
      "To install XO Nova, open Chrome's three-dot menu and look " +
      "for Install app. If it is unavailable, check the browser's " +
      "installation requirements. On iPhone, use Safari's Share " +
      "menu and choose Add to Home Screen.";

    return;
  }

  const promptEvent = installPrompt;
  installPrompt = null;

  try {
    await promptEvent.prompt();

    const choice = await promptEvent.userChoice;

    if (choice.outcome === "accepted") {
      gameMessage.textContent = "Installation accepted! Enjoy XO Nova. 🎉";
    } else {
      gameMessage.textContent =
        "Installation was cancelled. You can try again later.";
    }
  } catch (error) {
    console.error("Installation prompt failed:", error);

    gameMessage.textContent =
      "The browser could not open the installation prompt. " +
      "Try the browser menu instead.";
  }

  updateInstallButton();
});

window.addEventListener("appinstalled", () => {
  installPrompt = null;
  installButton.textContent = "Installed";
  gameMessage.textContent = "XO Nova has been installed. Enjoy playing! 🎉";
});

// ------------------------------
// SERVICE WORKER
// ------------------------------

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}

// ------------------------------
// INITIAL SETUP
// ------------------------------

document.querySelector("#year").textContent = new Date().getFullYear();

updateScoreboard();
renderBoard();
updateTurn();
updateInstallButton();
