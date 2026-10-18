/* =========================================================
   SUPABASE CONFIGURATION
   Replace these with your own Supabase project values.
   Never put a service_role or secret key in browser code.
   ========================================================= */
const SUPABASE_URL = "https://ucydyufnxgcsetjasskl.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";
const sb = (
  window.supabase &&
  !SUPABASE_URL.startsWith("PASTE") &&
  !SUPABASE_ANON_KEY.startsWith("PASTE")
)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let me = null;
let game = null;
let chan = null;
let pollTimer = null;
let finalShown = null;
let oppName = "Opponent";
let oppCached = null;

const $ = selector => document.querySelector(selector);

const WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

const THEMES = {
  Chocolate: {
    page: "#F5EBDD", card: "#FFF9F0", accent: "#80543D",
    text: "#38241D", muted: "#806B5A", border: "#D9C5AF",
    cell: "#F5EBDD"
  },
  Dark: {
    page: "#171717", card: "#262626", accent: "#C59A6B",
    text: "#F7F0E8", muted: "#C2B7AB", border: "#51463C",
    cell: "#202020"
  },
  Ocean: {
    page: "#EAF3FA", card: "#FFFFFF", accent: "#246B9E",
    text: "#17334A", muted: "#58758A", border: "#BED4E4",
    cell: "#EAF3FA"
  },
  Forest: {
    page: "#EAF1E8", card: "#FFFFFF", accent: "#386641",
    text: "#233B28", muted: "#647A68", border: "#C5D5C3",
    cell: "#EAF1E8"
  },
  Purple: {
    page: "#211A35", card: "#302644", accent: "#A78BFA",
    text: "#F5EEFF", muted: "#C5B8DD", border: "#594875",
    cell: "#261F3A"
  }
};

const store = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage may be disabled by the browser.
    }
  }
};

let board;
let turn;
let active;
let thinking;
let mode = "ai";
let sound = store.get("ttt-sound") !== "off";
let scores = { X: 0, O: 0, D: 0 };
let aiTimer;
let endTimer;
let toastTimer;
let audio;

const cells = [];

/* =========================================================
   BOARD SETUP
   ========================================================= */

for (let i = 0; i < 9; i++) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "cell";
  button.setAttribute("aria-label", `Cell ${i + 1}, empty`);
  button.addEventListener("click", () => play(i));

  $("#board").append(button);
  cells.push(button);
}

/* =========================================================
   SOUND AND STATUS
   ========================================================= */

function beep(freq, duration = 0.1) {
  if (!sound) return;

  try {
    audio = audio || new (
      window.AudioContext || window.webkitAudioContext
    )();

    if (audio.state === "suspended") {
      audio.resume();
    }

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.frequency.value = freq;
    gain.gain.setValueAtTime(0.08, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audio.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audio.destination);

    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  } catch {
    // Sound is optional; the game still works without it.
  }
}

function toast(message) {
  const element = $("#toast");

  element.textContent = message;
  element.hidden = false;

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    element.hidden = true;
  }, 2600);
}

function setStatus(message) {
  $("#status").textContent = message;
}

function turnText() {
  return mode === "ai"
    ? "Your turn — X"
    : `Player ${turn}’s turn`;
}

/* =========================================================
   GAME LOGIC
   ========================================================= */

function start() {
  clearTimeout(aiTimer);
  clearTimeout(endTimer);

  $("#modal").hidden = true;

  board = Array(9).fill("");
  turn = "X";
  active = true;
  thinking = false;

  cells.forEach((cell, index) => {
    cell.textContent = "";
    cell.disabled = false;
    cell.className = "cell";

    delete cell.dataset.mark;

    cell.setAttribute(
      "aria-label",
      `Cell ${index + 1}, empty`
    );
  });

  setStatus(turnText());
}

function result(position) {
  for (const [x, y, z] of WINS) {
    if (
      position[x] &&
      position[x] === position[y] &&
      position[y] === position[z]
    ) {
      return position[x];
    }
  }

  return position.every(Boolean) ? "draw" : null;
}

function play(index) {
  if (mode === "online") {
    onlineMove(index);
    return;
  }

  if (!active || thinking || board[index]) return;

  place(index, turn);
}

function place(index, mark) {
  board[index] = mark;

  const cell = cells[index];

  cell.textContent = mark;
  cell.dataset.mark = mark;
  cell.disabled = true;
  cell.setAttribute(
    "aria-label",
    `Cell ${index + 1}, ${mark}`
  );

  beep(mark === "X" ? 520 : 360);

  const gameResult = result(board);

  if (gameResult) {
    finish(gameResult);
    return;
  }

  turn = mark === "X" ? "O" : "X";

  if (mode === "ai" && turn === "O") {
    thinking = true;
    setStatus("Computer is thinking…");

    aiTimer = setTimeout(() => {
      thinking = false;
      place(bestMove(board), "O");
    }, 450);
  } else {
    setStatus(turnText());
  }
}

function finish(gameResult) {
  active = false;
  cells.forEach(cell => {
    cell.disabled = true;
  });

  let title;
  let message;

  if (gameResult === "draw") {
    scores.D++;
    title = "It’s a draw!";
    message = "A close match. Try again!";
    beep(280, 0.2);
  } else {
    scores[gameResult]++;

    const winningLine = WINS.find(([x, y, z]) =>
      board[x] === gameResult &&
      board[y] === gameResult &&
      board[z] === gameResult
    );

    if (winningLine) {
      winningLine.forEach(index => {
        cells[index].classList.add("win");
      });
    }

    if (mode === "ai") {
      title = gameResult === "X"
        ? "You win!"
        : "Computer wins!";

      message = gameResult === "X"
        ? "Great move. You played well!"
        : "Better luck next round!";
    } else {
      title = `Player ${gameResult} wins!`;
      message = "Great game, both of you!";
    }

    beep(gameResult === "X" ? 660 : 200, 0.25);
  }

  $("#sx").textContent = scores.X;
  $("#so").textContent = scores.O;
  $("#sd").textContent = scores.D;

  setStatus(title);
  saveResult(gameResult);

  endTimer = setTimeout(() => {
    $("#mTitle").textContent = title;
    $("#mText").textContent = message;
    $("#modal").hidden = false;
    $("#againBtn").focus();
  }, 600);
}

/* =========================================================
   COMPUTER AI - MINIMAX
   ========================================================= */

function minimax(position, isO, depth) {
  const gameResult = result(position);

  if (gameResult === "O") return 10 - depth;
  if (gameResult === "X") return depth - 10;
  if (gameResult === "draw") return 0;

  let best = isO ? -Infinity : Infinity;

  for (let i = 0; i < 9; i++) {
    if (position[i]) continue;

    position[i] = isO ? "O" : "X";

    const score = minimax(position, !isO, depth + 1);

    position[i] = "";

    best = isO
      ? Math.max(best, score)
      : Math.min(best, score);
  }

  return best;
}

function bestMove(position) {
  let best = -Infinity;
  let move = -1;

  for (let i = 0; i < 9; i++) {
    if (position[i]) continue;

    position[i] = "O";

    const score = minimax(position, false, 1);

    position[i] = "";

    if (score > best) {
      best = score;
      move = i;
    }
  }

  return move;
}

/* =========================================================
   GAME MODES
   ========================================================= */

function setMode(newMode) {
  if (newMode === "online" && (!me || me.guest)) {
    toast("Log in to play online.");
    return;
  }

  if (mode === "online" && newMode !== "online") {
    leaveCurrent();
  }

  mode = newMode;

  [
    ["aiBtn", "ai"],
    ["twoBtn", "two"],
    ["onlineBtn", "online"]
  ].forEach(([id, key]) => {
    const button = $("#" + id);

    button.classList.toggle("on", key === newMode);
    button.setAttribute(
      "aria-pressed",
      String(key === newMode)
    );
  });

  $("#scores").hidden = newMode === "online";

  if (newMode === "online") {
    showLobby();
  } else {
    $("#lobby").hidden = true;
    $("#gameArea").hidden = false;
    $("#newBtn").textContent = "New round";
    $("#againBtn").textContent = "Play again";
    start();
  }
}

$("#aiBtn").addEventListener("click", () => setMode("ai"));
$("#twoBtn").addEventListener("click", () => setMode("two"));
$("#onlineBtn").addEventListener("click", () => setMode("online"));

$("#newBtn").addEventListener("click", async () => {
  if (mode === "online") {
    if (
      game &&
      game.status === "playing" &&
      !confirm("Leave this game? You will forfeit.")
    ) {
      return;
    }

    await leaveToLobby();
    return;
  }

  start();
  beep(440);
});

$("#againBtn").addEventListener("click", async () => {
  if (mode === "online") {
    await leaveToLobby();
    return;
  }

  start();
  beep(500);
});

/* =========================================================
   DRAWERS: SETTINGS, HISTORY, FEEDBACK
   ========================================================= */

function openDrawer(drawer) {
  const drawers = [
    $("#drawer"),
    $("#histDrawer"),
    $("#fbDrawer")
  ];

  drawers.forEach(item => {
    const isOpen = item === drawer;

    item.classList.toggle("open", isOpen);
    item.setAttribute("aria-hidden", String(!isOpen));
  });

  $("#backdrop").hidden = !drawer;

  $("#menuBtn").setAttribute(
    "aria-expanded",
    String(drawer === $("#drawer"))
  );
}

$("#menuBtn").addEventListener("click", () => {
  openDrawer($("#drawer"));
});

$("#closeBtn").addEventListener("click", () => {
  openDrawer(null);
});

$("#closeHist").addEventListener("click", () => {
  openDrawer(null);
});

$("#closeFb").addEventListener("click", () => {
  openDrawer(null);
});

$("#backdrop").addEventListener("click", () => {
  openDrawer(null);
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    openDrawer(null);
  }
});

/* =========================================================
   COMMENTS AND SUGGESTIONS - SUPABASE
   ========================================================= */

$("#fbBtn").addEventListener("click", () => {
  openDrawer($("#fbDrawer"));
  $("#fbMsg").focus();
});

$("#fbMsg").addEventListener("input", () => {
  $("#fbCount").textContent =
    `${$("#fbMsg").value.length} / 500`;
});

async function sendFeedback() {
  const messageElement = $("#fbMsg");
  const statusElement = $("#fbStatus");
  const sendButton = $("#fbSend");

  const message = messageElement.value.trim();
  const type = $("#fbType").value;
  const name = $("#fbName").value.trim();

  if (message.length < 3) {
    statusElement.textContent =
      "Please write at least 3 characters before sending.";

    messageElement.focus();
    return;
  }

  if (message.length > 500) {
    statusElement.textContent =
      "Your message must be 500 characters or fewer.";
    return;
  }

  if (!sb) {
    statusElement.textContent =
      "Supabase is not configured. Add your project URL and anon key in script.js.";
    return;
  }

  sendButton.disabled = true;
  statusElement.textContent = "Sending your feedback…";

  try {
    const feedback = {
      type,
      name: name || null,
      message,

      // Save the user's ID when signed in.
      // Guest feedback has a null user_id.
      user_id: me && !me.guest ? me.id : null
    };

    const { error } = await sb
      .from("feedback")
      .insert(feedback);

    if (error) {
      throw error;
    }

    messageElement.value = "";
    $("#fbCount").textContent = "0 / 500";
    statusElement.textContent = "";

    openDrawer(null);
    toast("Thanks for your feedback!");

  } catch (error) {
    console.error("Feedback submission failed:", error);

    statusElement.textContent =
      "Could not send your message. Please check your connection and try again.";
  } finally {
    sendButton.disabled = false;
  }
}

$("#fbSend").addEventListener("click", sendFeedback);

/* =========================================================
   GAME HISTORY - SUPABASE
   ========================================================= */

async function saveResult(gameResult) {
  // Guests and online matches are not saved by this function.
  if (!sb || !me || me.guest || mode === "online") {
    return;
  }

  const resultName = mode === "ai"
    ? (
        gameResult === "draw"
          ? "Draw"
          : gameResult === "X"
            ? "Win"
            : "Loss"
      )
    : (
        gameResult === "draw"
          ? "Draw"
          : `${gameResult} wins`
      );

  try {
    const { error } = await sb
      .from("game_results")
      .insert({
        // Required by the user-specific RLS policy.
        user_id: me.id,
        mode: mode === "ai" ? "ai" : "local",
        result: resultName
      });

    if (error) {
      console.error("History save failed:", error);
      toast("Game finished, but saving history failed.");
      return;
    }

    if ($("#histDrawer").classList.contains("open")) {
      await loadHistory();
    }
  } catch (error) {
    console.error("History save failed:", error);
    toast("Could not save game history.");
  }
}

async function loadHistory() {
  const status = $("#histStatus");
  const list = $("#histList");

  list.replaceChildren();

  if (!sb || !me || me.guest) {
    status.textContent =
      "Log in to see and save your game history.";
    return;
  }

  status.textContent = "Loading history…";

  try {
    const { data, error } = await sb
      .from("game_results")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      status.textContent =
        "No saved games yet. Finish a game to see its result here.";
      return;
    }

    status.textContent =
      `${data.length} saved result(s)`;

    const labels = {
      ai: "vs Computer",
      local: "Same device",
      online: "Online"
    };

    data.forEach(record => {
      const item = document.createElement("li");
      const title = document.createElement("strong");
      const date = document.createElement("small");

      title.textContent =
        `${record.result} · ${labels[record.mode] || record.mode}` +
        (record.opponent ? ` vs ${record.opponent}` : "");

      date.textContent = record.created_at
        ? new Date(record.created_at).toLocaleString()
        : "Date unavailable";

      item.append(title, date);
      list.append(item);
    });

  } catch (error) {
    console.error("Could not load history:", error);
    status.textContent =
      "Could not load history. Check your Supabase settings and policies.";
  }
}

$("#histBtn").addEventListener("click", () => {
  openDrawer($("#histDrawer"));
  loadHistory();
});

$("#refreshHist").addEventListener("click", loadHistory);

/* =========================================================
   LOGIN AND ACCOUNT CREATION
   ========================================================= */

let authMode = "login";

function showScreen(screenName) {
  $("#auth").hidden = screenName !== "auth";
  $("#app").hidden = screenName !== "app";
  $("#menuBtn").hidden = screenName !== "app";
}

function setAuthMode(newMode) {
  authMode = newMode;

  $("#tabLogin").classList.toggle("on", newMode === "login");
  $("#tabSignup").classList.toggle("on", newMode === "signup");

  $("#userField").hidden = newMode !== "signup";

  $("#authGo").textContent =
    newMode === "login" ? "Log in" : "Create account";

  $("#password").autocomplete =
    newMode === "login" ? "current-password" : "new-password";

  $("#authMsg").textContent = "";
}

$("#tabLogin").addEventListener("click", () => {
  setAuthMode("login");
});

$("#tabSignup").addEventListener("click", () => {
  setAuthMode("signup");
});

async function submitAuth() {
  const message = $("#authMsg");
  const button = $("#authGo");

  const email = $("#email").value.trim();
  const password = $("#password").value;
  const username = $("#username").value.trim();

  if (!sb) {
    message.textContent =
      "Add your Supabase URL and anon key at the top of script.js first.";
    return;
  }

  if (!email || password.length < 6) {
    message.textContent =
      "Enter your email and a password of at least 6 characters.";
    return;
  }

  if (
    authMode === "signup" &&
    !/^[A-Za-z0-9_]{3,20}$/.test(username)
  ) {
    message.textContent =
      "Username must be 3–20 letters, numbers or underscores.";
    return;
  }

  button.disabled = true;
  message.textContent = "Please wait…";

  try {
    if (authMode === "signup") {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: { username }
        }
      });

      if (error) throw error;

      if (!data.session) {
        setAuthMode("login");
        message.textContent =
          "Account created. Check your email to confirm it, then log in.";
        return;
      }

      await enter(data.user);

    } else {
      const { data, error } = await sb.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      await enter(data.user);
    }

  } catch (error) {
    message.textContent =
      error.message || "Something went wrong.";
  } finally {
    button.disabled = false;
  }
}

$("#authGo").addEventListener("click", submitAuth);

$("#password").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    submitAuth();
  }
});

$("#guestBtn").addEventListener("click", () => {
  me = {
    guest: true,
    username: "Guest"
  };

  afterEnter();
});

async function enter(user) {
  let username =
    user.user_metadata && user.user_metadata.username;

  try {
    const { data } = await sb
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    if (data && data.username) {
      username = data.username;
    }
  } catch (error) {
    console.warn("Could not load profile username:", error);
  }

  me = {
    id: user.id,
    username: username || (user.email || "Player").split("@")[0],
    guest: false
  };

  afterEnter();
}

function afterEnter() {
  $("#logoutLabel").textContent = me.guest
    ? "Log in / create account"
    : `Log out (${me.username})`;

  showScreen("app");

  setMode(mode === "online" && me.guest ? "ai" : mode);
}

$("#logoutBtn").addEventListener("click", async () => {
  openDrawer(null);

  await leaveCurrent();

  if (sb && me && !me.guest) {
    await sb.auth.signOut();
  }

  me = null;
  $("#password").value = "";

  showScreen("auth");
});

async function boot() {
  if (!sb) {
    $("#authMsg").textContent =
      "Add your Supabase URL and anon key in script.js. You can still play as a guest.";

    showScreen("auth");
    return;
  }

  try {
    const { data, error } = await sb.auth.getSession();

    if (error) throw error;

    if (data.session) {
      await enter(data.session.user);
    } else {
      showScreen("auth");
    }
  } catch (error) {
    console.error("Could not check login session:", error);
    showScreen("auth");
  }
}

/* =========================================================
   ONLINE PLAY
   Requires the Supabase online-game tables and RPC functions
   from your existing project.
   ========================================================= */

function stopWatch() {
  if (chan && sb) {
    sb.removeChannel(chan);
    chan = null;
  }

  clearInterval(pollTimer);
  pollTimer = null;
}

function watch(currentGame) {
  stopWatch();

  chan = sb
    .channel("game-" + currentGame.id)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "games",
        filter: "id=eq." + currentGame.id
      },
      payload => applyGame(payload.new)
    )
    .subscribe();

  // Backup polling in case a live update is missed.
  pollTimer = setInterval(async () => {
    const { data, error } = await sb
      .from("games")
      .select("*")
      .eq("id", currentGame.id)
      .maybeSingle();

    if (!error && data) {
      applyGame(data);
    }
  }, 2500);
}

function showLobby() {
  clearTimeout(aiTimer);
  clearTimeout(endTimer);

  $("#modal").hidden = true;

  stopWatch();
  game = null;

  $("#gameArea").hidden = true;
  $("#lobby").hidden = false;

  $("#lobbyHi").textContent =
    `Signed in as ${me.username}. Play a friend anywhere in the world.`;

  $("#lobbyMsg").textContent = "";
  setStatus("Choose how to find an opponent");
}

async function leaveCurrent() {
  const currentGame = game;

  stopWatch();
  game = null;

  if (
    currentGame &&
    currentGame.status !== "finished" &&
    sb
  ) {
    try {
      await sb.rpc("leave_game", {
        p_id: currentGame.id
      });
    } catch (error) {
      console.warn("Could not leave online game:", error);
    }
  }
}

async function leaveToLobby() {
  await leaveCurrent();
  showLobby();
}

async function lobbyDo(call) {
  const message = $("#lobbyMsg");

  const buttons = [
    $("#createBtn"),
    $("#joinBtn"),
    $("#quickBtn")
  ];

  message.textContent = "Please wait…";
  buttons.forEach(button => {
    button.disabled = true;
  });

  try {
    const { data, error } = await call();

    if (error) throw error;

    enterGame(data);
  } catch (error) {
    message.textContent =
      error.message || "Something went wrong.";
  } finally {
    buttons.forEach(button => {
      button.disabled = false;
    });
  }
}

$("#createBtn").addEventListener("click", () => {
  lobbyDo(() =>
    sb.rpc("create_room", {
      p_public: false
    })
  );
});

$("#quickBtn").addEventListener("click", () => {
  lobbyDo(() => sb.rpc("quick_match"));
});

$("#joinBtn").addEventListener("click", () => {
  const code = $("#joinCode").value.trim().toUpperCase();

  if (code.length !== 4) {
    $("#lobbyMsg").textContent =
      "Enter the 4-character room code.";
    return;
  }

  lobbyDo(() =>
    sb.rpc("join_room", {
      p_code: code
    })
  );
});

function enterGame(currentGame) {
  $("#lobby").hidden = true;
  $("#gameArea").hidden = false;

  $("#newBtn").textContent = "Leave game";
  $("#againBtn").textContent = "Back to lobby";

  finalShown = null;
  oppCached = null;
  oppName = "Opponent";
  game = null;

  watch(currentGame);
  applyGame(currentGame);
}

async function applyGame(currentGame) {
  if (
    game &&
    game.id === currentGame.id &&
    currentGame.version < game.version
  ) {
    return;
  }

  game = currentGame;

  const mark = currentGame.x_id === me.id ? "X" : "O";
  const opponentId = mark === "X"
    ? currentGame.o_id
    : currentGame.x_id;

  if (opponentId && opponentId !== oppCached) {
    const { data, error } = await sb
      .from("profiles")
      .select("username")
      .eq("id", opponentId)
      .maybeSingle();

    if (!error) {
      oppName = (data && data.username) || "Opponent";
    } else {
      oppName = "Opponent";
    }

    oppCached = opponentId;

    if (!game || game.id !== currentGame.id) {
      return;
    }
  }

  board = currentGame.board
    .split("")
    .map(character => character === "-" ? "" : character);

  cells.forEach((cell, index) => {
    cell.className = "cell";
    cell.textContent = board[index];

    if (board[index]) {
      cell.dataset.mark = board[index];
    } else {
      delete cell.dataset.mark;
    }

    cell.disabled =
      Boolean(board[index]) ||
      currentGame.status !== "playing" ||
      currentGame.turn !== mark;

    cell.setAttribute(
      "aria-label",
      `Cell ${index + 1}, ${board[index] || "empty"}`
    );
  });

  if (currentGame.win_line) {
    currentGame.win_line.forEach(number => {
      if (cells[number - 1]) {
        cells[number - 1].classList.add("win");
      }
    });
  }

  if (currentGame.status === "waiting") {
    setStatus("Waiting for an opponent… Room code: " + currentGame.code);
  } else if (currentGame.status === "playing") {
    setStatus(
      currentGame.turn === mark
        ? `Your turn — ${mark} (vs ${oppName})`
        : `${oppName}’s turn…`
    );
  } else {
    finishOnline(currentGame, mark);
  }
}

function finishOnline(currentGame, mark) {
  const draw = currentGame.winner === "draw";
  const won = currentGame.winner === mark;

  const title = draw
    ? "It’s a draw!"
    : won
      ? "You win!"
      : `${oppName} wins!`;

  setStatus(title);

  if (finalShown === currentGame.id) return;

  finalShown = currentGame.id;

  beep(draw ? 280 : won ? 660 : 200, 0.25);

  endTimer = setTimeout(() => {
    $("#mTitle").textContent = title;

    $("#mText").textContent = draw
      ? "A close match."
      : won
        ? `Nice game against ${oppName}!`
        : "Better luck next round!";

    $("#modal").hidden = false;
    $("#againBtn").focus();
  }, 600);
}

async function onlineMove(index) {
  if (
    !game ||
    game.status !== "playing" ||
    board[index]
  ) {
    return;
  }

  const mark = game.x_id === me.id ? "X" : "O";

  if (game.turn !== mark) return;

  beep(mark === "X" ? 520 : 360);

  const { data, error } = await sb.rpc("make_move", {
    p_id: game.id,
    p_idx: index
  });

  if (error) {
    toast(error.message);
    return;
  }

  if (data) {
    applyGame(data);
  }
}

/* =========================================================
   SOUND SETTINGS
   ========================================================= */

function updateSound() {
  $("#soundLabel").textContent =
    "Sound effects: " + (sound ? "on" : "off");

  $("#sw").classList.toggle("on", sound);
}

$("#soundBtn").addEventListener("click", () => {
  sound = !sound;

  store.set("ttt-sound", sound ? "on" : "off");

  updateSound();
  beep(520);
});

/* =========================================================
   THEMES
   ========================================================= */

function luma(hex) {
  const number = parseInt(hex.slice(1), 16);

  return (
    0.299 * (number >> 16) +
    0.587 * ((number >> 8) & 255) +
    0.114 * (number & 255)
  );
}

function applyTheme(name) {
  const theme = THEMES[name];

  if (!theme) return;

  const root = document.documentElement;

  for (const key in theme) {
    root.style.setProperty("--" + key, theme[key]);
  }

  root.style.setProperty(
    "--on-accent",
    luma(theme.accent) > 150 ? "#20172E" : "#FFFFFF"
  );

  root.style.colorScheme =
    luma(theme.page) < 128 ? "dark" : "light";

  document.querySelectorAll(".theme").forEach(button => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.name === name)
    );
  });

  store.set("ttt-theme", name);
}

for (const name in THEMES) {
  const theme = THEMES[name];
  const button = document.createElement("button");

  button.type = "button";
  button.className = "theme";
  button.dataset.name = name;
  button.setAttribute("aria-pressed", "false");

  const swatches = document.createElement("i");

  [theme.page, theme.card, theme.accent].forEach(color => {
    const swatch = document.createElement("b");
    swatch.style.background = color;
    swatches.append(swatch);
  });

  const label = document.createElement("span");
  label.textContent = name;

  button.append(swatches, label);

  button.addEventListener("click", () => {
    applyTheme(name);
    toast(name + " theme applied");
  });

  $("#themes").append(button);
}

/* =========================================================
   START APPLICATION
   ========================================================= */

const savedTheme = store.get("ttt-theme");

if (savedTheme && THEMES[savedTheme]) {
  applyTheme(savedTheme);
}

updateSound();
start();
boot();
