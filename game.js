const API_URL = "https://tic-tac-toe-backend-1vkx.onrender.com";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const canvas = $("#layoutCanvas");
const cells = $$(".cell");
const statusText = $("#status");
const settingsDrawer = $("#settingsDrawer");
const historyDrawer = $("#historyDrawer");
const backdrop = $("#drawerBackdrop");
const editToolbar = $("#editToolbar");

let board = Array(9).fill("");
let gameActive = false;
let aiThinking = false;
let resultSaved = false;
let mode = "ai";
let soundOn = localStorage.getItem("tttSound") !== "false";
let scores = { player: 0, ai: 0, draws: 0 };
let audioContext = null;
let toastTimer;

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
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();

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
  board = Array(9).fill("");
  gameActive = true;
  aiThinking = false;
  resultSaved = false;

  cells.forEach((cell, index) => {
    cell.textContent = "";
    cell.disabled = false;
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

function updateCell(index, mark) {
  board[index] = mark;
  cells[index].textContent = mark;
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
    cells.forEach((cell, i) => {
      cell.disabled = Boolean(board[i]) || true;
    });

    setStatus("AI is thinking...");

    setTimeout(() => {
      if (!gameActive) return;

      const move = getBestMove(board);

      if (move !== -1) {
        updateCell(move, "O");
      }

      aiThinking = false;
      cells.forEach((cell, i) => {
        cell.disabled = !gameActive || Boolean(board[i]);
      });

      if (!finishIfOver()) setStatus("Your turn — X");
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
  } else {
    scores.ai++;
    setStatus(mode === "ai" ? "AI wins!" : "Player O wins!");
    playSound(200, 0.2);
  }

  $("#playerWins").textContent = scores.player;
  $("#aiWins").textContent = scores.ai;
  $("#draws").textContent = scores.draws;

  saveGameResult(result);
  return true;
}

async function saveGameResult(result) {
  if (resultSaved) return;
  resultSaved = true;

  const resultName = result === "draw"
    ? "Draw"
    : result === "X"
      ? "Player Wins"
      : "AI Wins";

  try {
    const response = await fetch(`${API_URL}/api/save-game`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result: resultName })
    });

    if (!response.ok) {
      throw new Error("Could not save game");
    }

    loadGameHistory();
  } catch (error) {
    console.error("Game history save failed:", error);
    showToast("Game finished, but saving history failed.");
  }
}

// Settings drawer

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

$("#menuBtn").addEventListener("click", () => openDrawer(settingsDrawer));
$("#closeMenuBtn").addEventListener("click", closeDrawers);
$("#closeHistoryBtn").addEventListener("click", closeDrawers);
backdrop.addEventListener("click", closeDrawers);

$("#gameSettingsBtn").addEventListener("click", () => {
  closeDrawers();
  document.querySelector(".mode-section").scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
});

$("#historyMenuBtn").addEventListener("click", () => {
  openDrawer(historyDrawer);
  loadGameHistory();
});

$("#aiModeBtn").addEventListener("click", () => setMode("ai"));
$("#twoPlayerBtn").addEventListener("click", () => setMode("two"));

$("#startBtn").addEventListener("click", () => {
  startGame();
  playSound(500);
});

$("#restartBtn").addEventListener("click", () => {
  startGame();
  playSound(420);
});

cells.forEach(cell => cell.addEventListener("click", handleCellClick));

$("#soundBtn").addEventListener("click", () => {
  soundOn = !soundOn;
  localStorage.setItem("tttSound", String(soundOn));
  updateSoundUI();

  if (soundOn) playSound();
  showToast(soundOn ? "Sound enabled" : "Sound muted");
});

function updateSoundUI() {
  $("#soundStatus").textContent = soundOn ? "Sound is on" : "Sound is off";
  $("#soundIcon").textContent = soundOn ? "🔊" : "🔇";
  $("#soundSwitch").classList.toggle("on", soundOn);
}

$("#backBtn").addEventListener("click", () => {
  if (canvas.classList.contains("editing")) {
    exitLayoutEditor();
  } else if (settingsDrawer.classList.contains("open") ||
             historyDrawer.classList.contains("open")) {
    closeDrawers();
  } else {
    showToast("You're on the main game screen.");
  }
});

// Themes and custom colors

function applyTheme(colors) {
  const root = document.documentElement;

  root.style.setProperty("--page", colors.page);
  root.style.setProperty("--card", colors.card);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--text", colors.text);
  root.style.setProperty("--muted", colors.muted);
  root.style.setProperty("--border", colors.border);
  root.style.setProperty("--cell", colors.cell);
}

function setTheme(name) {
  const colors = themes[name];
  if (!colors) return;

  applyTheme(colors);

  localStorage.setItem("tttTheme", name);
  localStorage.setItem("tttCustomColors", JSON.stringify(colors));

  $$(".theme-option").forEach(button => {
    button.classList.toggle("selected", button.dataset.theme === name);
  });

  $("#backgroundColor").value = colors.page;
  $("#accentColor").value = colors.accent;
  $("#cardColor").value = colors.card;

  showToast(`${$(`.theme-option[data-theme="${name}"]`).querySelectorAll("span")[1].textContent} theme applied`);
}

function applyCustomColors() {
  const previous = JSON.parse(
    localStorage.getItem("tttCustomColors") || JSON.stringify(themes.chocolate)
  );

  const colors = {
    ...previous,
    page: $("#backgroundColor").value,
    accent: $("#accentColor").value,
    card: $("#cardColor").value,
    cell: $("#backgroundColor").value
  };

  applyTheme(colors);
  localStorage.setItem("tttTheme", "custom");
  localStorage.setItem("tttCustomColors", JSON.stringify(colors));

  $$(".theme-option").forEach(button => button.classList.remove("selected"));
}

$$(".theme-option").forEach(button => {
  button.addEventListener("click", () => setTheme(button.dataset.theme));
});

["backgroundColor", "accentColor", "cardColor"].forEach(id => {
  $(`#${id}`).addEventListener("input", applyCustomColors);
});

$("#resetThemeBtn").addEventListener("click", () => {
  setTheme("chocolate");
});

// Game history

async function loadGameHistory() {
  const list = $("#historyList");
  const historyStatus = $("#historyStatus");

  historyStatus.textContent = "Loading history...";
  list.replaceChildren();

  try {
    const response = await fetch(`${API_URL}/api/game-history`);

    if (!response.ok) {
      throw new Error("History request failed");
    }

    const data = await response.json();
    const records = Array.isArray(data)
      ? data
      : Array.isArray(data.history)
        ? data.history
        : Array.isArray(data.data)
          ? data.data
          : [];

    if (!records.length) {
      historyStatus.textContent = "No saved games yet. Play a game to see results here.";
      return;
    }

    historyStatus.textContent = `${records.length} saved result(s)`;

    records.forEach(record => {
      const item = document.createElement("li");
      const title = document.createElement("strong");
      const details = document.createElement("small");

      title.textContent = record.result || "Game result";

      const dateValue = record.created_at
        ? new Date(record.created_at).toLocaleString()
        : "Date unavailable";

      details.textContent = dateValue;
      item.append(title, details);
      list.append(item);
    });
  } catch (error) {
    console.error("History loading failed:", error);
    historyStatus.textContent = "Could not load history. Check your backend connection.";
  }
}

$("#refreshHistoryBtn").addEventListener("click", loadGameHistory);

// Drag-and-drop layout editor

const defaultLayout = {
  mode:     { x: 5, y: 2,  w: 90, h: 19 },
  status:   { x: 5, y: 23, w: 90, h: 8 },
  board:    { x: 20, y: 33, w: 60, h: 45 },
  controls: { x: 20, y: 80, w: 60, h: 10 },
  score:    { x: 10, y: 91, w: 80, h: 9 }
};

let layout = null;
let dragState = null;
let layoutSaved = false;

function readCurrentLayout() {
  const canvasRect = canvas.getBoundingClientRect();
  const result = {};

  $$(".design-item").forEach(item => {
    const rect = item.getBoundingClientRect();

    result[item.dataset.layout] = {
      x: ((rect.left - canvasRect.left) / canvasRect.width) * 100,
      y: ((rect.top - canvasRect.top) / canvasRect.height) * 100,
      w: (rect.width / canvasRect.width) * 100,
      h: (rect.height / canvasRect.height) * 100
    };
  });

  return result;
}

function applyLayoutPositions() {
  if (!layout) return;

  canvas.classList.add("custom-layout");

  $$(".design-item").forEach(item => {
    const pos = layout[item.dataset.layout];
    if (!pos) return;

    item.style.left = `${pos.x}%`;
    item.style.top = `${pos.y}%`;
    item.style.width = `${pos.w}%`;
    item.style.height = `${pos.h}%`;
  });
}

function enterLayoutEditor() {
  closeDrawers();

  if (!canvas.classList.contains("custom-layout")) {
    layout = readCurrentLayout();
  } else {
    layout = JSON.parse(JSON.stringify(layout || defaultLayout));
  }

  canvas.classList.add("custom-layout", "editing");
  document.body.classList.add("editing-layout");
  editToolbar.hidden = false;

  applyLayoutPositions();

  $$(".design-item").forEach(item => {
    if (!item.querySelector(".resize-handle")) {
      const handle = document.createElement("button");
      handle.className = "resize-handle";
      handle.type = "button";
      handle.setAttribute("aria-label", `Resize ${item.dataset.layout}`);
      handle.addEventListener("pointerdown", event => {
        beginDrag(event, item, true);
      });
      item.append(handle);
    }

    item.addEventListener("pointerdown", item._layoutPointerDown ||= event => {
      if (event.target.closest(".resize-handle")) return;
      if (event.target.closest("button, input, select")) {
        if (event.target.closest(".cell")) return;
        if (!event.target.closest(".mode-section")) return;
      }
      beginDrag(event, item, false);
    });
  });

  showToast("Layout editor enabled. Drag a section to move it.");
}

function beginDrag(event, item, resizing) {
  if (!canvas.classList.contains("editing")) return;

  event.preventDefault();
  event.stopPropagation();

  const canvasRect = canvas.getBoundingClientRect();
  const rect = item.getBoundingClientRect();

  dragState = {
    item,
    resizing,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    x: rect.left - canvasRect.left,
    y: rect.top - canvasRect.top,
    w: rect.width,
    h: rect.height,
    canvasWidth: canvasRect.width,
    canvasHeight: canvasRect.height
  };

  item.classList.add("dragging");
  item.setPointerCapture?.(event.pointerId);
}

document.addEventListener("pointermove", event => {
  if (!dragState || event.pointerId !== dragState.pointerId) return;

  const d = dragState;
  const dx = event.clientX - d.startX;
  const dy = event.clientY - d.startY;
  const canvasRect = canvas.getBoundingClientRect();

  if (d.resizing) {
    const maxW = canvasRect.width - d.x;
    const maxH = canvasRect.height - d.y;

    const width = Math.max(100, Math.min(maxW, d.w + dx));
    const height = Math.max(70, Math.min(maxH, d.h + dy));

    d.item.style.width = `${(width / canvasRect.width) * 100}%`;
    d.item.style.height = `${(height / canvasRect.height) * 100}%`;
  } else {
    const x = Math.max(0, Math.min(
      canvasRect.width - d.w,
      d.x + dx
    ));

    const y = Math.max(0, Math.min(
      canvasRect.height - d.h,
      d.y + dy
    ));

    d.item.style.left = `${(x / canvasRect.width) * 100}%`;
    d.item.style.top = `${(y / canvasRect.height) * 100}%`;
  }
});

function finishDrag() {
  if (!dragState) return;
  dragState.item.classList.remove("dragging");
  dragState = null;
}

document.addEventListener("pointerup", finishDrag);
document.addEventListener("pointercancel", finishDrag);

function saveLayout() {
  layout = {};

  $$(".design-item").forEach(item => {
    layout[item.dataset.layout] = {
      x: parseFloat(item.style.left) || 0,
      y: parseFloat(item.style.top) || 0,
      w: parseFloat(item.style.width) || 100,
      h: parseFloat(item.style.height) || 10
    };
  });

  localStorage.setItem("tttCustomLayout", JSON.stringify(layout));
  layoutSaved = true;
  showToast("Your layout has been saved!");
}

function exitLayoutEditor() {
  canvas.classList.remove("editing");
  document.body.classList.remove("editing-layout");
  editToolbar.hidden = true;

  $$(".resize-handle").forEach(handle => handle.remove());
  $$(".design-item").forEach(item => {
    item.classList.remove("dragging");
  });

  if (!layoutSaved) {
    const stored = localStorage.getItem("tttCustomLayout");
    if (stored) {
      try {
        layout = JSON.parse(stored);
        applyLayoutPositions();
      } catch {
        canvas.classList.remove("custom-layout");
      }
    } else {
      canvas.classList.remove("custom-layout");
      $$(".design-item").forEach(item => {
        item.removeAttribute("style");
      });
    }
  }

  layoutSaved = false;
}

function resetLayout() {
  localStorage.removeItem("tttCustomLayout");
  layout = null;
  layoutSaved = false;

  canvas.classList.remove("custom-layout", "editing");
  document.body.classList.remove("editing-layout");
  editToolbar.hidden = true;

  $$(".resize-handle").forEach(handle => handle.remove());
  $$(".design-item").forEach(item => item.removeAttribute("style"));

  showToast("Default layout restored.");
}

$("#customizeLayoutBtn").addEventListener("click", enterLayoutEditor);
$("#saveLayoutBtn").addEventListener("click", saveLayout);
$("#doneLayoutBtn").addEventListener("click", exitLayoutEditor);
$("#resetLayoutBtn").addEventListener("click", resetLayout);

// Restore saved preferences

function restorePreferences() {
  const savedTheme = localStorage.getItem("tttTheme") || "chocolate";
  const savedColors = localStorage.getItem("tttCustomColors");

  if (savedTheme === "custom" && savedColors) {
    try {
      const colors = JSON.parse(savedColors);
      applyTheme(colors);

      $("#backgroundColor").value = colors.page;
      $("#accentColor").value = colors.accent;
      $("#cardColor").value = colors.card;
    } catch {
      setTheme("chocolate");
    }
  } else {
    setTheme(themes[savedTheme] ? savedTheme : "chocolate");
  }

  const savedLayout = localStorage.getItem("tttCustomLayout");

  if (savedLayout) {
    try {
      layout = JSON.parse(savedLayout);
      applyLayoutPositions();
    } catch {
      localStorage.removeItem("tttCustomLayout");
      layout = null;
    }
  }

  updateSoundUI();
}

restorePreferences();
startGame();
