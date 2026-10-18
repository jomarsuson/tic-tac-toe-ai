/* Supabase stores game results and comments. The publishable key is safe to put in
   front-end code; row-level security decides what it is allowed to do. */
const SUPABASE_URL = "https://ucydyufnxgcsetjasskl.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";

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
const feedbackDrawer = $("#feedbackDrawer");
const backdrop = $("#drawerBackdrop");

let board = Array(9).fill("");
let gameActive = false;
let aiThinking = false;
let resultSaved = false;
let roundId = null;
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

function renderScores() {
  $("#playerWins").textContent = scores.player;
  $("#aiWins").textContent = scores.ai;
  $("#draws").textContent = scores.draws;
}

function setMode(newMode) {
  if (newMode !== mode) {
    scores = { player: 0, ai: 0, draws: 0 };
    renderScores();
  }

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
  roundId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

  renderScores();

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

/* Game history
   Every finished game is written to a log on this device the moment it ends, so it
   always appears in the history instantly and survives a refresh. Each result is also
   saved once to the Supabase "game_results" table. The result's id is that table's
   primary key, so a retry can never create a duplicate row. */

const HISTORY_KEY = "tttHistory";
const HISTORY_LIMIT = 100;
let syncPromise = null;
let lastSyncFailed = false;
let syncToastShown = false;

function loadStoredHistory() {
  try {
    const log = JSON.parse(store.get(HISTORY_KEY) || "[]");
    return Array.isArray(log) ? log : [];
  } catch {
    return [];
  }
}

let historyLog = loadStoredHistory();

function persistHistory() {
  historyLog = historyLog.slice(-HISTORY_LIMIT);
  store.set(HISTORY_KEY, JSON.stringify(historyLog));
}

function getDeviceId() {
  let id = store.get("tttDeviceId");

  if (!id) {
    id = window.crypto?.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    store.set("tttDeviceId", id);
  }

  return id;
}

const deviceId = getDeviceId();

function supabaseReady() {
  return Boolean(SUPABASE_ANON_KEY) && !SUPABASE_ANON_KEY.startsWith("YOUR_");
}

/* Adds one row to a Supabase table and returns the HTTP response */
async function supabaseInsert(table, row) {
  if (!supabaseReady()) {
    console.warn("SUPABASE_ANON_KEY in game.js is still the placeholder. Paste your real publishable key.");
    const error = new Error("Supabase key is not set");
    error.setup = true;
    throw error;
  }

  return fetchWithTimeout(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Prefer: "return=minimal"
    },
    body: JSON.stringify(row)
  }, 60000);
}

function resultLabel(result) {
  if (result === "draw") return "Draw";
  if (mode === "two") return result === "X" ? "Player X Wins" : "Player O Wins";
  return result === "X" ? "Player Wins" : "AI Wins";
}

function saveGameResult(result) {
  if (resultSaved) return;      // one record per round, no matter how often this is called
  resultSaved = true;

  if (!historyLog.some(entry => entry.id === roundId)) {
    historyLog.push({
      id: roundId,
      result: resultLabel(result),
      created_at: new Date().toISOString(),
      synced: false
    });
    persistHistory();
  }

  renderHistory();              // show the new result immediately, no refresh needed
  syncHistory().then(() => renderHistory());
}

/* Uploads every unsynced result once. Overlapping calls share one run. */
function syncHistory({ quiet = false } = {}) {
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    const tried = new Set();
    let failed = false;
    let entry;

    while ((entry = historyLog.find(item => !item.synced && !tried.has(item.id)))) {
      tried.add(entry.id);

      try {
        const response = await supabaseInsert("game_results", {
          id: entry.id,
          device_id: deviceId,
          result: entry.result,
          created_at: entry.created_at
        });

        // 409 means this id is already stored, which is exactly what we want
        if (!response.ok && response.status !== 409) {
          if ([401, 403, 404].includes(response.status)) {
            console.warn("Game history: Supabase refused the result. Check the key in game.js and that supabase-setup.sql was run.");
          }
          throw new Error(`Could not save game (${response.status})`);
        }

        entry.synced = true;
        persistHistory();
      } catch (error) {
        console.error("Game history upload failed:", error);
        failed = true;
        break;
      }
    }

    lastSyncFailed = failed;

    if (failed && !quiet && !syncToastShown) {
      syncToastShown = true;
      showToast("Result saved on this device. It will upload to the server later.");
    }

    return failed;
  })().finally(() => { syncPromise = null; });

  return syncPromise;
}

/* Settings drawers */

const drawers = [settingsDrawer, historyDrawer, feedbackDrawer].filter(Boolean);
let lastFocus = null;

function openDrawer(drawer) {
  const alreadyOpen = drawers.some(d => d.classList.contains("open"));
  if (!alreadyOpen) lastFocus = document.activeElement;

  closeDrawers({ restoreFocus: false });
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  backdrop.classList.add("open");

  if (drawer === settingsDrawer) {
    $("#menuBtn").setAttribute("aria-expanded", "true");
  }

  // Move keyboard focus into the drawer
  drawer.querySelector(".icon-btn")?.focus();
}

function closeDrawers({ restoreFocus = true } = {}) {
  const wasOpen = drawers.some(d => d.classList.contains("open"));

  drawers.forEach(drawer => {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  });

  backdrop.classList.remove("open");
  $("#menuBtn").setAttribute("aria-expanded", "false");

  // Return focus to whatever opened the drawer
  if (restoreFocus && wasOpen && lastFocus?.focus) lastFocus.focus();
}

on("#menuBtn", "click", () => openDrawer(settingsDrawer));
on("#closeMenuBtn", "click", closeDrawers);
on("#closeHistoryBtn", "click", closeDrawers);
on("#closeFeedbackBtn", "click", closeDrawers);
backdrop.addEventListener("click", closeDrawers);

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeDrawers();
});

on("#historyMenuBtn", "click", () => {
  openDrawer(historyDrawer);
  loadGameHistory();
});

on("#feedbackMenuBtn", "click", () => {
  openDrawer(feedbackDrawer);
  flushFeedbackQueue();
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

function renderHistory() {
  const list = $("#historyList");
  const historyStatus = $("#historyStatus");
  if (!list || !historyStatus) return;

  const records = [...historyLog].reverse();
  list.replaceChildren();

  if (!records.length) {
    historyStatus.textContent = "No saved games yet. Play a game to see results here.";
    return;
  }

  const pending = records.filter(record => !record.synced).length;
  let summary = `${records.length} saved result(s)`;

  if (pending) {
    summary += ` · ${pending} waiting to upload`;
    if (lastSyncFailed) summary += ". Couldn't reach the server yet.";
  }

  historyStatus.textContent = summary;

  records.forEach(record => {
    const item = document.createElement("li");
    const title = document.createElement("strong");
    const details = document.createElement("small");

    title.textContent = record.result || "Game result";

    const when = record.created_at
      ? new Date(record.created_at).toLocaleString()
      : "Date unavailable";
    details.textContent = record.synced ? when : `${when} · waiting to upload`;

    item.append(title, details);
    list.append(item);
  });
}

async function loadGameHistory() {
  renderHistory();                                   // results appear instantly

  if (historyLog.some(entry => !entry.synced)) {
    $("#historyStatus").textContent += " Uploading…";
    await syncHistory({ quiet: true });              // retry anything not yet uploaded
    renderHistory();
  }
}

on("#refreshHistoryBtn", "click", loadGameHistory);

/* Comments & suggestions: a single text box, no options */

const FEEDBACK_COOLDOWN_MS = 30000;
const FEEDBACK_QUEUE_KEY = "tttFeedbackQueue";
const feedbackForm = $("#feedbackForm");
const feedbackMessage = $("#feedbackMessage");
const feedbackStatus = $("#feedbackStatus");
const sendFeedbackBtn = $("#sendFeedbackBtn");
let lastFeedbackAt = Number(store.get("tttFeedbackLast")) || 0;
let flushingFeedback = false;

function setFeedbackStatus(message, kind = "") {
  feedbackStatus.textContent = message;
  feedbackStatus.className = `feedback-status ${kind}`.trim();
}

function readFeedbackQueue() {
  try {
    const queue = JSON.parse(store.get(FEEDBACK_QUEUE_KEY) || "[]");
    return Array.isArray(queue) ? queue : [];
  } catch {
    return [];
  }
}

function writeFeedbackQueue(queue) {
  if (queue.length) store.set(FEEDBACK_QUEUE_KEY, JSON.stringify(queue.slice(-20)));
  else store.remove(FEEDBACK_QUEUE_KEY);
}

/* Returns normally when the server accepted OR permanently rejected the message
   (retrying a rejected one would never help). Throws when it should be retried. */
async function postFeedback(entry) {
  const response = await supabaseInsert("suggestions", { message: entry.message });

  if ([400, 413, 422].includes(response.status)) return;

  if (!response.ok) {
    const error = new Error(`Feedback request failed (${response.status})`);
    // 401/403 = wrong key or missing insert policy, 404 = the suggestions table doesn't exist yet
    error.setup = [401, 403, 404].includes(response.status);
    if (error.setup) {
      console.warn("Comments box: Supabase refused the message. Check the key in game.js and that supabase-setup.sql was run.");
    }
    throw error;
  }
}

/* Messages that couldn't be delivered earlier are retried when the box is opened */
async function flushFeedbackQueue() {
  if (flushingFeedback) return;
  const queue = readFeedbackQueue();
  if (!queue.length) return;

  flushingFeedback = true;
  const remaining = [];

  for (const entry of queue) {
    try {
      await postFeedback(entry);
    } catch {
      remaining.push(entry);
    }
  }

  writeFeedbackQueue(remaining);
  flushingFeedback = false;
}

feedbackMessage?.addEventListener("input", () => {
  $("#feedbackCount").textContent = `${feedbackMessage.value.length} / 500`;
  feedbackMessage.removeAttribute("aria-invalid");
});

feedbackForm?.addEventListener("submit", async event => {
  event.preventDefault();

  // Hidden spam-trap field: a human never fills it in
  if ($("#feedbackWebsite").value) {
    feedbackForm.reset();
    return;
  }

  const message = feedbackMessage.value.trim();

  if (message.length < 5) {
    feedbackMessage.setAttribute("aria-invalid", "true");
    setFeedbackStatus("Please write a few words before submitting.", "error");
    feedbackMessage.focus();
    return;
  }

  const waitMs = FEEDBACK_COOLDOWN_MS - (Date.now() - lastFeedbackAt);
  if (waitMs > 0) {
    setFeedbackStatus(`Please wait ${Math.ceil(waitMs / 1000)} seconds before sending another message.`, "error");
    return;
  }

  const entry = { message };

  sendFeedbackBtn.disabled = true;
  setFeedbackStatus("Submitting… the server may take a moment to wake up.");

  try {
    await postFeedback(entry);
    setFeedbackStatus("Thank you! Your comment or suggestion was submitted successfully.", "ok");
    showToast("Submitted. Thank you!");
  } catch (error) {
    console.error("Feedback send failed:", error);
    writeFeedbackQueue([...readFeedbackQueue(), entry]);
    setFeedbackStatus(
      error.setup
        ? "Comments can't be received right now. Your message is saved on this device and will be sent once this is fixed."
        : "Couldn't reach the server. Your message is saved on this device and will be sent the next time you open this box.",
      "error"
    );
  } finally {
    lastFeedbackAt = Date.now();
    store.set("tttFeedbackLast", String(lastFeedbackAt));
    sendFeedbackBtn.disabled = false;
  }

  feedbackMessage.value = "";
  $("#feedbackCount").textContent = "0 / 500";
});

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
syncHistory({ quiet: true });   // upload any results left over from a previous visit
