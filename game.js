const API_URL = "https://tic-tac-toe-backend-1vkx.onrender.com";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

/* Null-safe listener: a missing element can never stop the rest of the script */
const on = (selector, eventName, handler) => {
  const el = document.querySelector(selector);
  if (el) el.addEventListener(eventName, handler);
  else console.warn("Element not found:", selector);
};

/* Safe storage (won't crash in private mode or when storage is blocked) */
const store = {
  get: key => { try { return localStorage.getItem(key); } catch { return null; } },
  set: (key, value) => { try { localStorage.setItem(key, value); } catch { /* ignore */ } },
  remove: key => { try { localStorage.removeItem(key); } catch { /* ignore */ } }
};

const cells = $$(".cell");
const statusText = $("#status") || document.createElement("p");
const settingsDrawer = $("#settingsDrawer");
const historyDrawer = $("#historyDrawer");
const backdrop = $("#drawerBackdrop");

let board = Array(9).fill("");
let gameActive = false;
let aiThinking = false;
let resultSaved = false;
let mode = "ai";
let soundOn = store.get("tttSound") !== "false";
let scores = { player: 0, ai: 0, draws: 0 };
let audioContext = null;
let toastTimer;
let aiTimer = null;
let overlayTimer = null;

const wins = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

const themes = {
  chocolate: {
    page: "#F5EBDD", card: "#FFF9F0",
    accent: "#80543D", text: "#38241D",
    muted: "#806B5A", border: "#D9C5AF", cell: "#F5EBDD"
  },
  dark: {
    page: "#171717", card: "#262626",
    accent: "#C59A6B", text: "#F7F0E8",
    muted: "#C2B7AB", border: "#51463C", cell: "#202020"
  },
  ocean: {
    page: "#EAF3FA", card: "#FFFFFF",
    accent: "#246B9E", text: "#17334A",
    muted: "#58758A", border: "#BED4E4", cell: "#EAF3FA"
  },
  forest: {
    page: "#EAF1E8", card: "#FFFFFF",
    accent: "#386641", text: "#233B28",
    muted: "#647A68", border: "#C5D5C3", cell: "#EAF1E8"
  },
  purple: {
    page: "#211A35", card: "#302644",
    accent: "#A78BFA", text: "#F5EEFF",
    muted: "#C5B8DD", border: "#594875", cell: "#261F3A"
  }
};

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function setStatus(message) {
  statusText.textContent = message;
}

function playSound(frequency = 440, duration = 0.09) {
  if (!soundOn) return;

  try {
    audioContext ||= new (
      window.AudioContext || window.webkitAudioContext
    )();

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.08, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    // Sound is optional if the browser does not support audio.
  }
}

function setMode(newMode) {
  mode = newMode;
  $("#aiModeBtn").classList.toggle("active", mode === "ai");
  $("#twoPlayerBtn").classList.toggle("active", mode === "two");
  startGame();
}

function startGame() {
  // Cancel anything still pending from the previous round
  clearTimeout(aiTimer);
  clearTimeout(overlayTimer);

  $("#victoryOverlay")?.remove();
  cells.forEach(cell => cell.classList.remove("winning-cell"));

  board = Array(9).fill("");
  gameActive = true;
  aiThinking = false;
  resultSaved = false;

  cells.forEach((cell, index) => {
    cell.textContent = "";
    cell.disabled = false;
    delete cell.dataset.mark;
    cell.setAttribute("aria-label", `Cell ${index + 1}, empty`);
  });

  setStatus(mode === "ai" ? "Your turn — X" : "Player X's turn");
}

function checkWinner(position) {
  for (const [a, b, c] of wins) {
    if (
      position[a] &&
      position[a] === position[b] &&
      position[b] === position[c]
    ) {
      return position[a];
    }
  }

  return position.every(Boolean) ? "draw" : null;
}

function getWinningLine(position) {
  return wins.find(([a, b, c]) =>
    position[a] &&
    position[a] === position[b] &&
    position[b] === position[c]
  ) || [];
}

function showVictoryEffect(result) {
  $("#victoryOverlay")?.remove();

  const title = result === "draw"
    ? "IT'S A DRAW!"
    : result === "X"
      ? (mode === "ai" ? "YOU WIN!" : "PLAYER X WINS!")
      : (mode === "ai" ? "AI WINS!" : "PLAYER O WINS!");

  const overlay = document.createElement("div");
  overlay.id = "victoryOverlay";
  overlay.className =
    `victory-overlay ${result === "draw" ? "is-draw" : "is-win"}`;

  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", title);

  const panel = document.createElement("div");
  panel.className = "victory-panel";

  const heading = document.createElement("h2");
  heading.textContent = title;

  const message = document.createElement("p");
  message.textContent = result === "draw"
    ? "A close match. Try again!"
    : mode === "two"
      ? "Great game, both of you!"
      : result === "X"
        ? "Great move. You played well!"
        : "Better luck next round!";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "victory-play-again";
  button.textContent = "PLAY AGAIN";

  button.addEventListener("click", () => {
    overlay.remove();
    startGame();
    playSound(500, 0.12);
  });

  panel.append(heading, message, button);
  overlay.append(panel);
  document.body.append(overlay);

  if (result !== "draw") {
    for (let i = 0; i < 48; i++) {
      const bit = document.createElement("span");
      bit.className = "confetti-piece";
      bit.style.left = `${Math.random() * 100}%`;
      bit.style.animationDelay = `${Math.random() * 0.7}s`;
      bit.style.setProperty(
        "--confetti-rotate",
        `${Math.random() * 720 - 360}deg`
      );
      overlay.append(bit);
    }
  }

  button.focus();
}

function updateCell(index, mark) {
  board[index] = mark;
  cells[index].textContent = mark;
  cells[index].dataset.mark = mark;
  cells[index].setAttribute("aria-label", `Cell ${index + 1}, ${mark}`);
  cells[index].disabled = true;
  playSound(mark === "X" ? 520 : 360);
}

function handleCellClick(event) {
  const index = Number(event.currentTarget.dataset.index);

  if (!gameActive || aiThinking || board[index]) return;

  if (mode === "ai") {
    updateCell(index, "X");

    if (finishIfOver()) return;

    aiThinking = true;
    cells.forEach(cell => {
      cell.disabled = true;
    });

    setStatus("AI is thinking...");

    aiTimer = setTimeout(() => {
      if (!gameActive) return;

      const move = getBestMove(board);

      if (move !== -1) {
        updateCell(move, "O");
      }

      aiThinking = false;
      cells.forEach((cell, i) => {
        cell.disabled = !gameActive || Boolean(board[i]);
      });

      if (!finishIfOver()) {
        setStatus("Your turn — X");
      }
    }, 450);
  } else {
    const mark = board.filter(Boolean).length % 2 === 0 ? "X" : "O";
    updateCell(index, mark);

    if (!finishIfOver()) {
      setStatus(mark === "X" ? "Player O's turn" : "Player X's turn");
    }
  }
}

function minimax(position, maximizing, depth = 0) {
  const result = checkWinner(position);

  if (result === "O") return 10 - depth;
  if (result === "X") return depth - 10;
  if (result === "draw") return 0;

  if (maximizing) {
    let best = -Infinity;

    for (let i = 0; i < 9; i++) {
      if (position[i]) continue;

      position[i] = "O";
      best = Math.max(best, minimax(position, false, depth + 1));
      position[i] = "";
    }

    return best;
  }

  let best = Infinity;

  for (let i = 0; i < 9; i++) {
    if (position[i]) continue;

    position[i] = "X";
    best = Math.min(best, minimax(position, true, depth + 1));
    position[i] = "";
  }

  return best;
}

function getBestMove(position) {
  let bestScore = -Infinity;
  let bestMove = -1;

  for (let i = 0; i < 9; i++) {
    if (position[i]) continue;

    position[i] = "O";
    const score = minimax(position, false);
    position[i] = "";

    if (score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }

  return bestMove;
}

function finishIfOver() {
  const result = checkWinner(board);
  if (!result) return false;

  gameActive = false;
  aiThinking = false;
  cells.forEach(cell => cell.disabled = true);

  if (result === "draw") {
    scores.draws++;
    setStatus("It's a draw!");
    playSound(280, 0.2);
  } else if (result === "X") {
    scores.player++;
    setStatus(mode === "ai" ? "You win!" : "Player X wins!");
    playSound(660, 0.2);
    getWinningLine(board).forEach(index =>
      cells[index]?.classList.add("winning-cell")
    );
  } else {
    scores.ai++;
    setStatus(mode === "ai" ? "AI wins!" : "Player O wins!");
    playSound(200, 0.2);
    getWinningLine(board).forEach(index =>
      cells[index]?.classList.add("winning-cell")
    );
  }

  $("#playerWins").textContent = scores.player;
  $("#aiWins").textContent = scores.ai;
  $("#draws").textContent = scores.draws;

  saveGameResult(result);
  overlayTimer = setTimeout(() => showVictoryEffect(result), 300);
  return true;
}

/* Backend requests with a timeout (free hosting can take a while to wake up) */

async function fetchWithTimeout(url, options = {}, ms = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function saveGameResult(result) {
  if (resultSaved) return;
  resultSaved = true;

  let resultName;

  if (result === "draw") {
    resultName = "Draw";
  } else if (mode === "two") {
    resultName = result === "X" ? "Player X Wins" : "Player O Wins";
  } else {
    resultName = result === "X" ? "Player Wins" : "AI Wins";
  }

  try {
    const response = await fetchWithTimeout(`${API_URL}/api/save-game`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result: resultName })
    });

    if (!response.ok) throw new Error("Could not save game");

    if (historyDrawer.classList.contains("open")) loadGameHistory();
  } catch (error) {
    console.error("Game history save failed:", error);
    showToast("Game finished, but saving history failed.");
  }
}

/* Settings drawers */

function openDrawer(drawer) {
  closeDrawers();
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  backdrop.classList.add("open");

  if (drawer === settingsDrawer) {
    $("#menuBtn").setAttribute("aria-expanded", "true");
  }
}

function closeDrawers() {
  [settingsDrawer, historyDrawer].forEach(drawer => {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  });

  backdrop.classList.remove("open");
  $("#menuBtn").setAttribute("aria-expanded", "false");
}

on("#menuBtn", "click", () => openDrawer(settingsDrawer));
on("#closeMenuBtn", "click", closeDrawers);
on("#closeHistoryBtn", "click", closeDrawers);
backdrop.addEventListener("click", closeDrawers);

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeDrawers();
});

on("#historyMenuBtn", "click", () => {
  openDrawer(historyDrawer);
  loadGameHistory();
});

on("#aiModeBtn", "click", () => setMode("ai"));
on("#twoPlayerBtn", "click", () => setMode("two"));

on("#startBtn", "click", () => {
  startGame();
  playSound(500, 0.12);
});

on("#restartBtn", "click", () => {
  startGame();
  playSound(380, 0.1);
});

cells.forEach(cell => {
  cell.addEventListener("click", handleCellClick);
});

/* Sound settings */

function updateSoundUI() {
  $("#soundIcon").textContent = soundOn ? "🔊" : "🔇";
  $("#soundStatus").textContent = soundOn ? "Sound is on" : "Sound is off";
  $("#soundSwitch").classList.toggle("on", soundOn);
}

on("#soundBtn", "click", () => {
  soundOn = !soundOn;
  store.set("tttSound", String(soundOn));
  updateSoundUI();

  if (soundOn) playSound(520, 0.1);
});

/* Themes and custom colors */

function luma(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
}

function applyTheme(colors) {
  const root = document.documentElement;

  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });

  // Keep button text readable and native controls matched to the theme
  root.style.setProperty("--on-accent", luma(colors.accent) > 150 ? "#20172E" : "#FFFFFF");
  root.style.colorScheme = luma(colors.page) < 128 ? "dark" : "light";
}

function setTheme(name, { silent = false } = {}) {
  const colors = themes[name];
  if (!colors) return;

  applyTheme(colors);
  store.set("tttTheme", name);
  store.set("tttCustomColors", JSON.stringify(colors));

  $$(".theme-option").forEach(button => {
    const selected = button.dataset.theme === name;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  $("#backgroundColor").value = colors.page;
  $("#accentColor").value = colors.accent;
  $("#cardColor").value = colors.card;

  if (!silent) {
    showToast(`${name.charAt(0).toUpperCase() + name.slice(1)} theme applied`);
  }
}

function applyCustomColors() {
  let previous;

  try {
    previous = JSON.parse(store.get("tttCustomColors") || "null");
  } catch {
    previous = null;
  }

  const page = $("#backgroundColor").value;
  const dark = luma(page) < 128;

  const colors = {
    ...(previous || themes.chocolate),
    page,
    accent: $("#accentColor").value,
    card: $("#cardColor").value,
    cell: page,
    // Pick readable text for the chosen background
    text: dark ? "#F7F0E8" : "#38241D",
    muted: dark ? "#C2B7AB" : "#806B5A"
  };

  applyTheme(colors);
  store.set("tttTheme", "custom");
  store.set("tttCustomColors", JSON.stringify(colors));

  $$(".theme-option").forEach(button => {
    button.classList.remove("selected");
    button.setAttribute("aria-pressed", "false");
  });
}

$$(".theme-option").forEach(button => {
  button.addEventListener("click", () => setTheme(button.dataset.theme));
});

["backgroundColor", "accentColor", "cardColor"].forEach(id => {
  on(`#${id}`, "input", applyCustomColors);
});

on("#resetThemeBtn", "click", () => setTheme("chocolate"));

/* Game history */

async function loadGameHistory() {
  const list = $("#historyList");
  const historyStatus = $("#historyStatus");

  historyStatus.textContent = "Loading history...";
  list.replaceChildren();

  try {
    const response = await fetchWithTimeout(`${API_URL}/api/game-history`);
    if (!response.ok) throw new Error("History request failed");

    const data = await response.json();
    const records = Array.isArray(data)
      ? data
      : Array.isArray(data.history)
        ? data.history
        : Array.isArray(data.data)
          ? data.data
          : [];

    if (!records.length) {
      historyStatus.textContent =
        "No saved games yet. Play a game to see results here.";
      return;
    }

    historyStatus.textContent = `${records.length} saved result(s)`;

    records.forEach(record => {
      const item = document.createElement("li");
      const title = document.createElement("strong");
      const details = document.createElement("small");

      title.textContent = record.result || "Game result";

      details.textContent = record.created_at
        ? new Date(record.created_at).toLocaleString()
        : "Date unavailable";

      item.append(title, details);
      list.append(item);
    });
  } catch (error) {
    console.error("History loading failed:", error);
    historyStatus.textContent =
      error.name === "AbortError"
        ? "The server took too long to respond. Try again in a moment."
        : "Could not load history. Check your backend connection.";
  }
}

on("#refreshHistoryBtn", "click", loadGameHistory);

/* Restore saved preferences */

function restorePreferences() {
  const savedTheme = store.get("tttTheme") || "chocolate";
  const savedColors = store.get("tttCustomColors");

  if (savedTheme === "custom" && savedColors) {
    try {
      const colors = JSON.parse(savedColors);
      applyTheme(colors);

      $("#backgroundColor").value = colors.page;
      $("#accentColor").value = colors.accent;
      $("#cardColor").value = colors.card;
    } catch {
      setTheme("chocolate", { silent: true });
    }
  } else {
    setTheme(themes[savedTheme] ? savedTheme : "chocolate", { silent: true });
  }

  store.remove("tttCustomLayout"); // clear any layout saved by the old editor
  updateSoundUI();
}

restorePreferences();
startGame();
