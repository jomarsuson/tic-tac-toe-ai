"use strict";

// -------------------- GAME SETUP --------------------

const cells = [...document.querySelectorAll(".cell")];
const statusText = document.getElementById("status");

const aiModeBtn = document.getElementById("aiMode");
const twoModeBtn = document.getElementById("twoMode");
const restartBtn = document.getElementById("restartBtn");
const resetScoreBtn = document.getElementById("resetScoreBtn");

const xScoreText = document.getElementById("xScore");
const oScoreText = document.getElementById("oScore");
const drawScoreText = document.getElementById("drawScore");

const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

let board = Array(9).fill("");
let currentPlayer = "X";
let gameOver = false;
let gameMode = "ai";
let scores = { X: 0, O: 0, draws: 0 };
let aiTimer = null;

function getWinner() {
  for (const line of winningLines) {
    const [a, b, c] = line;

    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { player: board[a], line };
    }
  }

  return null;
}

function renderBoard() {
  cells.forEach((cell, index) => {
    cell.textContent = board[index];
    cell.disabled = gameOver || board[index] !== "";

    cell.classList.toggle("marked", board[index] !== "");
    cell.classList.remove("winner");

    cell.setAttribute(
      "aria-label",
      `Cell ${index + 1}, ${board[index] || "empty"}`
    );
  });
}

function updateScores() {
  xScoreText.textContent = scores.X;
  oScoreText.textContent = scores.O;
  drawScoreText.textContent = scores.draws;
}

function updateStatus(message, isWin = false) {
  statusText.textContent = message;
  statusText.classList.toggle("win", isWin);
}

function finishGame() {
  const result = getWinner();

  if (result) {
    gameOver = true;
    scores[result.player]++;

    renderBoard();

    result.line.forEach(index => {
      cells[index].classList.add("winner");
    });

    updateStatus(`🎉 Player ${result.player} wins!`, true);
    updateScores();
    return true;
  }

  if (board.every(cell => cell !== "")) {
    gameOver = true;
    scores.draws++;

    renderBoard();
    updateStatus("It's a draw! Good game.", false);
    updateScores();
    return true;
  }

  return false;
}

// -------------------- PLAYER MOVES --------------------

function makeMove(index) {
  if (gameOver || board[index] !== "") return;

  if (gameMode === "ai" && currentPlayer === "O") return;

  board[index] = currentPlayer;
  cells[index].textContent = currentPlayer;
  cells[index].classList.add("marked");

  if (finishGame()) return;

  currentPlayer = currentPlayer === "X" ? "O" : "X";
  renderBoard();

  if (gameMode === "ai" && currentPlayer === "O") {
    updateStatus("Computer is thinking...");
    aiTimer = setTimeout(makeAIMove, 350);
  } else {
    updateStatus(`Player ${currentPlayer}'s turn`);
  }
}

function makeAIMove() {
  aiTimer = null;

  if (gameOver || gameMode !== "ai") return;

  const move = findBestMove();

  if (move === -1) return;

  board[move] = "O";

  if (finishGame()) return;

  currentPlayer = "X";
  renderBoard();
  updateStatus("Your turn — X");
}

// -------------------- SIMPLE MINIMAX AI --------------------

function findBestMove() {
  let bestScore = -Infinity;
  let bestMove = -1;

  for (let i = 0; i < board.length; i++) {
    if (board[i] !== "") continue;

    board[i] = "O";
    const score = minimax(board, 0, false);
    board[i] = "";

    if (score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }

  return bestMove;
}

function minimax(position, depth, isMaximizing) {
  const result = getWinner();

  if (result?.player === "O") return 10 - depth;
  if (result?.player === "X") return depth;
  if (position.every(cell => cell !== "")) return 0;

  if (isMaximizing) {
    let best = -Infinity;

    for (let i = 0; i < position.length; i++) {
      if (position[i] !== "") continue;

      position[i] = "O";
      best = Math.max(best, minimax(position, depth + 1, false));
      position[i] = "";
    }

    return best;
  }

  let best = Infinity;

  for (let i = 0; i < position.length; i++) {
    if (position[i] !== "") continue;

    position[i] = "X";
    best = Math.min(best, minimax(position, depth + 1, true));
    position[i] = "";
  }

  return best;
}

// -------------------- START / RESTART --------------------

function startRound() {
  clearTimeout(aiTimer);
  aiTimer = null;

  board = Array(9).fill("");
  currentPlayer = "X";
  gameOver = false;

  cells.forEach(cell => {
    cell.classList.remove("winner", "marked");
  });

  renderBoard();
  updateStatus("Player X's turn");
}

function setMode(mode) {
  gameMode = mode;

  aiModeBtn.classList.toggle("active", mode === "ai");
  twoModeBtn.classList.toggle("active", mode === "two");

  aiModeBtn.setAttribute("aria-pressed", mode === "ai");
  twoModeBtn.setAttribute("aria-pressed", mode === "two");

  startRound();
}

cells.forEach((cell, index) => {
  cell.addEventListener("click", () => makeMove(index));
});

aiModeBtn.addEventListener("click", () => setMode("ai"));
twoModeBtn.addEventListener("click", () => setMode("two"));
restartBtn.addEventListener("click", startRound);

resetScoreBtn.addEventListener("click", () => {
  scores = { X: 0, O: 0, draws: 0 };
  updateScores();
  startRound();
});

// -------------------- SUGGESTIONS & COMMENTS --------------------

const feedbackForm = document.getElementById("feedbackForm");
const feedbackName = document.getElementById("feedbackName");
const feedbackType = document.getElementById("feedbackType");
const feedbackMessage = document.getElementById("feedbackMessage");
const charCount = document.getElementById("charCount");
const feedbackStatus = document.getElementById("feedbackStatus");
const feedbackList = document.getElementById("feedbackList");
const clearFeedbackBtn = document.getElementById("clearFeedbackBtn");

const STORAGE_KEY = "ticTacToeFeedbackV1";

function loadFeedback() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

let feedbackEntries = loadFeedback();

function saveFeedback() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(feedbackEntries));
    return true;
  } catch {
    feedbackStatus.textContent =
      "Could not save feedback in this browser. Check browser storage settings.";
    return false;
  }
}

function renderFeedback() {
  feedbackList.replaceChildren();

  clearFeedbackBtn.hidden = feedbackEntries.length === 0;

  if (feedbackEntries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-message";
    empty.textContent = "No feedback submitted yet.";
    feedbackList.appendChild(empty);
    return;
  }

  feedbackEntries.forEach(entry => {
    const item = document.createElement("li");
    item.className = "feedback-item";

    const heading = document.createElement("strong");
    heading.textContent = `${entry.type} — ${entry.name || "Anonymous"}`;

    const message = document.createElement("p");
    message.textContent = entry.message;

    const date = document.createElement("div");
    date.className = "feedback-meta";
    date.textContent = entry.date;

    item.append(heading, message, date);
    feedbackList.appendChild(item);
  });
}

feedbackMessage.addEventListener("input", () => {
  charCount.textContent = `${feedbackMessage.value.length} / 500`;
});

feedbackForm.addEventListener("submit", event => {
  event.preventDefault();

  const message = feedbackMessage.value.trim();

  if (!message) {
    feedbackStatus.textContent = "Please enter a message first.";
    feedbackMessage.focus();
    return;
  }

  const entry = {
    name: feedbackName.value.trim().slice(0, 40),
    type: feedbackType.value,
    message: message.slice(0, 500),
    date: new Date().toLocaleString()
  };

  feedbackEntries.unshift(entry);

  // Keep the newest 50 entries.
  feedbackEntries = feedbackEntries.slice(0, 50);

  if (!saveFeedback()) {
    feedbackEntries.shift();
    return;
  }

  renderFeedback();
  feedbackForm.reset();
  charCount.textContent = "0 / 500";
  feedbackStatus.textContent = "Thank you! Your feedback was saved on this device.";
});

clearFeedbackBtn.addEventListener("click", () => {
  const confirmed = confirm("Clear all saved feedback from this browser?");

  if (!confirmed) return;

  const previousEntries = feedbackEntries;
  feedbackEntries = [];

  if (!saveFeedback()) {
    feedbackEntries = previousEntries;
    return;
  }

  renderFeedback();
  feedbackStatus.textContent = "Saved feedback cleared.";
});

// -------------------- INITIALIZE --------------------

updateScores();
renderBoard();
renderFeedback();
updateStatus("Player X's turn");
