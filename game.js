"use strict";

// Game elements
const cells = [...document.querySelectorAll(".cell")];
const statusText = document.getElementById("status");

const xScoreText = document.getElementById("xScore");
const oScoreText = document.getElementById("oScore");
const drawScoreText = document.getElementById("drawScore");

const xCard = document.getElementById("xCard");
const oCard = document.getElementById("oCard");
const drawCard = document.getElementById("drawCard");

const menuButton = document.getElementById("menuButton");
const closeMenuButton = document.getElementById("closeMenuButton");
const restartButton = document.getElementById("restartButton");
const resetScoreButton = document.getElementById("resetScoreButton");
const menuRestartButton = document.getElementById("menuRestartButton");
const menuResetButton = document.getElementById("menuResetButton");
const themeButton = document.getElementById("themeButton");

const overlay = document.getElementById("overlay");
const menuDrawer = document.getElementById("menuDrawer");
const feedbackDrawer = document.getElementById("feedbackDrawer");

const feedbackButton = document.getElementById("feedbackButton");
const closeFeedbackButton = document.getElementById("closeFeedbackButton");
const feedbackForm = document.getElementById("feedbackForm");
const feedbackName = document.getElementById("feedbackName");
const feedbackType = document.getElementById("feedbackType");
const feedbackMessage = document.getElementById("feedbackMessage");
const feedbackStatus = document.getElementById("feedbackStatus");
const feedbackList = document.getElementById("feedbackList");
const clearFeedbackButton = document.getElementById("clearFeedbackButton");

const winningCombinations = [
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

let scores = {
  X: 0,
  O: 0,
  draws: 0
};

// Safe local storage helper
function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Local storage may be unavailable in private browsing.
  }
}

// Restore scores
try {
  const savedScores = JSON.parse(
    readStorage("simpleTicTacToeScores", "null")
  );

  if (savedScores && typeof savedScores === "object") {
    scores.X = Number(savedScores.X) || 0;
    scores.O = Number(savedScores.O) || 0;
    scores.draws = Number(savedScores.draws) || 0;
  }
} catch {
  // Start with zero scores if stored data is invalid.
}

function saveScores() {
  writeStorage("simpleTicTacToeScores", JSON.stringify(scores));
}

function updateScores() {
  xScoreText.textContent = scores.X;
  oScoreText.textContent = scores.O;
  drawScoreText.textContent = scores.draws;
}

function updatePlayerHighlight() {
  xCard.classList.toggle("active", !gameOver && currentPlayer === "X");
  oCard.classList.toggle("active", !gameOver && currentPlayer === "O");
  drawCard.classList.toggle("active", false);
}

function setStatus(message) {
  statusText.textContent = message;
}

// Simple sound effects using the browser audio API
let audioContext = null;

function playSound(frequency = 440, duration = 0.09, type = "sine") {
  try {
    audioContext ||= new (
      window.AudioContext || window.webkitAudioContext
    )();

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(0.07, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    // Game still works if sound is unavailable.
  }
}

function playVictorySound() {
  playSound(523, 0.12);
  setTimeout(() => playSound(659, 0.12), 130);
  setTimeout(() => playSound(784, 0.2), 260);
}

// Handle a cell click
function handleCellClick(event) {
  const cell = event.currentTarget;
  const index = Number(cell.dataset.index);

  if (gameOver || board[index] !== "") {
    return;
  }

  board[index] = currentPlayer;

  cell.textContent = currentPlayer;
  cell.setAttribute("aria-label", `Cell ${index + 1}: ${currentPlayer}`);
  cell.classList.add("marked");
  cell.disabled = true;

  playSound(currentPlayer === "X" ? 460 : 540, 0.08);

  const winningLine = winningCombinations.find(combination =>
    combination.every(position => board[position] === currentPlayer)
  );

  if (winningLine) {
    finishGame(currentPlayer, winningLine);
    return;
  }

  if (board.every(value => value !== "")) {
    finishGame("draw");
    return;
  }

  currentPlayer = currentPlayer === "X" ? "O" : "X";

  setStatus(`Player ${currentPlayer}'s turn`);
  updatePlayerHighlight();
}

// Finish the round
function finishGame(result, winningLine = []) {
  gameOver = true;

  cells.forEach(cell => {
    cell.disabled = true;
  });

  if (result === "draw") {
    scores.draws++;
    setStatus("It's a draw! Good game.");
    drawCard.classList.add("active");
    playSound(300, 0.25, "triangle");
  } else {
    scores[result]++;

    winningLine.forEach(index => {
      cells[index].classList.add("winner");
    });

    setStatus(`🎉 Player ${result} wins!`);
    playVictorySound();
  }

  updateScores();
  updatePlayerHighlight();
  saveScores();
}

// Restart the current round
function restartRound() {
  board = Array(9).fill("");
  currentPlayer = "X";
  gameOver = false;

  cells.forEach((cell, index) => {
    cell.textContent = "";
    cell.disabled = false;
    cell.classList.remove("marked", "winner");
    cell.setAttribute("aria-label", `Cell ${index + 1}`);
  });

  setStatus("Player X's turn");
  updatePlayerHighlight();
  playSound(380, 0.08);
}

function resetScores() {
  const confirmed = window.confirm(
    "Are you sure you want to reset all scores?"
  );

  if (!confirmed) return;

  scores = {
    X: 0,
    O: 0,
    draws: 0
  };

  updateScores();
  saveScores();
  restartRound();
  closeDrawers();
  setStatus("Scores reset. Player X's turn.");
}

// Menu and drawer functions
function openDrawer(drawer) {
  closeDrawers();

  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeDrawers() {
  [menuDrawer, feedbackDrawer].forEach(drawer => {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  });

  overlay.classList.remove("open");
  document.body.style.overflow = "";
}

menuButton.addEventListener("click", () => {
  openDrawer(menuDrawer);
});

closeMenuButton.addEventListener("click", closeDrawers);

feedbackButton.addEventListener("click", () => {
  openDrawer(feedbackDrawer);
  renderFeedback();
});

closeFeedbackButton.addEventListener("click", closeDrawers);

overlay.addEventListener("click", closeDrawers);

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeDrawers();
  }
});

// Buttons
restartButton.addEventListener("click", restartRound);
menuRestartButton.addEventListener("click", () => {
  restartRound();
  closeDrawers();
});

resetScoreButton.addEventListener("click", resetScores);
menuResetButton.addEventListener("click", resetScores);

// Dark and light mode
const savedTheme = readStorage("simpleTicTacToeTheme", "dark");

if (savedTheme === "light") {
  document.body.classList.add("light-mode");
  themeButton.textContent = "☀ Toggle Dark Mode";
}

themeButton.addEventListener("click", () => {
  const isLight = document.body.classList.toggle("light-mode");

  writeStorage("simpleTicTacToeTheme", isLight ? "light" : "dark");

  themeButton.textContent = isLight
    ? "☀ Toggle Dark Mode"
    : "☾ Toggle Light Mode";

  playSound(500, 0.08);
});

// Comments and suggestions
// Feedback is stored only in this browser on this device.
const FEEDBACK_KEY = "simpleTicTacToeFeedback";

function getFeedback() {
  try {
    const feedback = JSON.parse(readStorage(FEEDBACK_KEY, "[]"));
    return Array.isArray(feedback) ? feedback : [];
  } catch {
    return [];
  }
}

function renderFeedback() {
  const entries = getFeedback();

  feedbackList.replaceChildren();

  if (entries.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty-feedback";
    emptyMessage.textContent = "No feedback saved yet.";
    feedbackList.appendChild(emptyMessage);

    feedbackStatus.textContent = "You haven't saved any feedback yet.";
    return;
  }

  feedbackStatus.textContent =
    `${entries.length} feedback message(s) saved on this device.`;

  entries.slice().reverse().forEach(entry => {
    const item = document.createElement("article");
    item.className = "feedback-entry";

    const title = document.createElement("strong");
    title.textContent = entry.name
      ? `${entry.type} — ${entry.name}`
      : entry.type;

    const message = document.createElement("p");
    message.textContent = entry.message;

    const date = document.createElement("small");
    date.textContent = new Date(entry.createdAt).toLocaleString();

    item.append(title, message, date);
    feedbackList.appendChild(item);
  });
}

feedbackForm.addEventListener("submit", event => {
  event.preventDefault();

  const name = feedbackName.value.trim();
  const type = feedbackType.value;
  const message = feedbackMessage.value.trim();

  if (!message) {
    feedbackStatus.textContent = "Please enter a comment or suggestion.";
    feedbackMessage.focus();
    return;
  }

  const entries = getFeedback();

  entries.push({
    name: name.slice(0, 50),
    type,
    message: message.slice(0, 1000),
    createdAt: new Date().toISOString()
  });

  const saved = writeStorage(FEEDBACK_KEY, JSON.stringify(entries));

  if (!saved) {
    feedbackStatus.textContent =
      "Unable to save feedback. Browser storage may be unavailable.";
    return;
  }

  feedbackForm.reset();
  renderFeedback();

  feedbackStatus.textContent =
    "Your feedback has been saved on this device.";

  playSound(660, 0.1);
});

clearFeedbackButton.addEventListener("click", () => {
  const entries = getFeedback();

  if (entries.length === 0) {
    feedbackStatus.textContent = "There is no saved feedback to clear.";
    return;
  }

  const confirmed = window.confirm(
    "Delete all saved comments and suggestions from this device?"
  );

  if (!confirmed) return;

  removeStorage(FEEDBACK_KEY);
  renderFeedback();

  feedbackStatus.textContent = "Saved feedback has been cleared.";
});

// Initialize the game
updateScores();
updatePlayerHighlight();
restartRound();
