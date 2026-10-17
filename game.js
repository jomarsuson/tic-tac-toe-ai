
/* APPEARANCE SETTINGS */

const themePresets = {
    chocolate: {
        name: "Chocolate Cream",
        bg: "#F6EFE6",
        surface: "#FFFCF8",
        board: "#E9D8C5",
        accent: "#C47A50",
        x: "#65432F",
        o: "#C47A50",
        text: "#33251E",
        muted: "#88786B",
        border: "#E5D6C6"
    },
    midnight: {
        name: "Midnight Dark",
        bg: "#111827",
        surface: "#1F2937",
        board: "#273449",
        accent: "#60A5FA",
        x: "#93C5FD",
        o: "#F9A8D4",
        text: "#F3F4F6",
        muted: "#A8B2C3",
        border: "#374151"
    },
    ocean: {
        name: "Ocean Blue",
        bg: "#EAF6FC",
        surface: "#FFFFFF",
        board: "#CBE8F5",
        accent: "#087EA4",
        x: "#075985",
        o: "#0891B2",
        text: "#123044",
        muted: "#58788B",
        border: "#C8E0EC"
    },
    forest: {
        name: "Forest Green",
        bg: "#EDF4EA",
        surface: "#FFFFFF",
        board: "#D4E5CF",
        accent: "#398052",
        x: "#245C38",
        o: "#76A85C",
        text: "#20392A",
        muted: "#687E6B",
        border: "#D0DFCC"
    },
    purple: {
        name: "Purple Neon",
        bg: "#171329",
        surface: "#241D3A",
        board: "#33274E",
        accent: "#A78BFA",
        x: "#C4B5FD",
        o: "#F0ABFC",
        text: "#F5F3FF",
        muted: "#B6ACD0",
        border: "#45365F"
    }
};

const appearanceKey = "ticTacToeAppearanceV2";

let appearance = {
    preset: "chocolate",
    ...themePresets.chocolate
};

const cssVariables = {
    bg: "--bg",
    surface: "--surface",
    board: "--board",
    accent: "--accent",
    x: "--x",
    o: "--o",
    text: "--text",
    muted: "--muted",
    border: "--border"
};

function applyAppearance() {
    const root = document.documentElement;

    Object.entries(cssVariables).forEach(([key, variable]) => {
        root.style.setProperty(variable, appearance[key]);
    });

    document.querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", appearance.bg);

    updatePreview();
    updateThemeCards();
    updateColorInputs();
    renderBoard();
}

function updatePreview() {
    const previewBoard = document.getElementById("previewBoard");
    if (!previewBoard) return;

    previewBoard.style.background = appearance.board;

    previewBoard.querySelectorAll(".preview-cell").forEach(cell => {
        const symbol = cell.dataset.preview || "";

        cell.textContent = symbol;
        cell.style.background = appearance.surface;
        cell.style.color = symbol === "X"
            ? appearance.x
            : symbol === "O"
                ? appearance.o
                : appearance.text;
    });
}

function updateThemeCards() {
    document.querySelectorAll(".theme-card").forEach(card => {
        const selected = card.dataset.theme === appearance.preset;
        card.classList.toggle("active", selected);
        card.setAttribute("aria-pressed", String(selected));
    });
}

function updateColorInputs() {
    const values = {
        colorBg: appearance.bg,
        colorBoard: appearance.board,
        colorAccent: appearance.accent,
        colorX: appearance.x,
        colorO: appearance.o
    };

    Object.entries(values).forEach(([id, value]) => {
        const input = document.getElementById(id);
        if (input) input.value = value;
    });
}

function buildThemeCards() {
    const grid = document.getElementById("themeGrid");

    Object.entries(themePresets).forEach(([key, theme]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "theme-card";
        button.dataset.theme = key;
        button.setAttribute("aria-pressed", "false");

        const swatches = document.createElement("div");
        swatches.className = "swatches";

        [theme.bg, theme.surface, theme.board, theme.accent, theme.x]
            .forEach(color => {
                const swatch = document.createElement("span");
                swatch.style.backgroundColor = color;
                swatches.appendChild(swatch);
            });

        const title = document.createElement("strong");
        title.textContent = theme.name;

        const description = document.createElement("small");
        description.textContent = "Tap to preview";

        button.append(swatches, title, description);

        button.addEventListener("click", () => {
            appearance = { preset: key, ...theme };
            applyAppearance();
            setSettingsMessage("Theme preview updated.");
        });

        grid.appendChild(button);
    });
}

function setSettingsMessage(message) {
    document.getElementById("settingsMessage").textContent = message;
}

[
    ["colorBg", "bg"],
    ["colorBoard", "board"],
    ["colorAccent", "accent"],
    ["colorX", "x"],
    ["colorO", "o"]
].forEach(([id, key]) => {
    document.getElementById(id).addEventListener("input", event => {
        appearance[key] = event.target.value;
        appearance.preset = "custom";
        applyAppearance();
        setSettingsMessage("Custom color preview updated.");
    });
});

document.getElementById("saveTheme").addEventListener("click", () => {
    try {
        localStorage.setItem(appearanceKey, JSON.stringify(appearance));
        setSettingsMessage("Appearance saved successfully!");
    } catch {
        setSettingsMessage("Unable to save settings in this browser.");
    }
});

document.getElementById("resetTheme").addEventListener("click", () => {
    appearance = { preset: "chocolate", ...themePresets.chocolate };
    applyAppearance();

    try {
        localStorage.setItem(appearanceKey, JSON.stringify(appearance));
        setSettingsMessage("Default theme restored.");
    } catch {
        setSettingsMessage("Default theme preview restored.");
    }
});

function loadAppearance() {
    try {
        const saved = localStorage.getItem(appearanceKey);
        if (!saved) return;

        const parsed = JSON.parse(saved);
        const preset = themePresets[parsed.preset]
            ? parsed.preset
            : "chocolate";

        appearance = {
            ...themePresets[preset],
            ...parsed,
            preset: parsed.preset || preset
        };
    } catch {
        appearance = { preset: "chocolate", ...themePresets.chocolate };
    }
}

/* DRAWERS */

function openDrawer(name) {
    closeDrawers();

    document.getElementById(name + "Overlay").classList.add("open");
    document.getElementById(name + "Drawer").classList.add("open");
    document.getElementById(name + "Drawer").setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closeDrawers() {
    ["settings", "history"].forEach(name => {
        document.getElementById(name + "Overlay").classList.remove("open");
        document.getElementById(name + "Drawer").classList.remove("open");
        document.getElementById(name + "Drawer").setAttribute("aria-hidden", "true");
    });

    document.body.style.overflow = "";
}

document.getElementById("settingsBtn").addEventListener("click", () => {
    openDrawer("settings");
});

document.getElementById("historyBtn").addEventListener("click", () => {
    openDrawer("history");
});

document.getElementById("closeSettings").addEventListener("click", closeDrawers);
document.getElementById("closeHistory").addEventListener("click", closeDrawers);
document.getElementById("settingsOverlay").addEventListener("click", closeDrawers);
document.getElementById("historyOverlay").addEventListener("click", closeDrawers);

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeDrawers();
});

buildThemeCards();
loadAppearance();
applyAppearance();

/* GAME LOGIC */

const API_URL = "https://tic-tac-toe-backend-1vkx.onrender.com";

const cells = [...document.querySelectorAll(".cell")];
const statusText = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

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
let active = false;
let thinking = false;
let resultSaved = false;
let mode = "ai";
let currentPlayer = "X";
let aiTimer = null;
let soundEnabled = true;
let audioContext = null;

function playSound(frequency = 500, duration = 0.08) {
    if (!soundEnabled) return;

    try {
        audioContext ||= new (
            window.AudioContext || window.webkitAudioContext
        )();

        if (audioContext.state === "suspended") audioContext.resume();

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
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
    } catch (error) {
        console.warn("Sound is unavailable.", error);
    }
}

function findWinner(position) {
    for (const line of winningLines) {
        const [a, b, c] = line;

        if (
            position[a] &&
            position[a] === position[b] &&
            position[b] === position[c]
        ) {
            return { symbol: position[a], line };
        }
    }

    return null;
}

function renderBoard(winningLine = []) {
    cells.forEach((cell, index) => {
        const symbol = board[index];

        cell.textContent = symbol;
        cell.classList.toggle("x", symbol === "X");
        cell.classList.toggle("o", symbol === "O");
        cell.classList.toggle("winner", winningLine.includes(index));

        cell.disabled = !active || thinking || symbol !== "";

        cell.setAttribute(
            "aria-label",
            `Cell ${index + 1}${symbol ? ": " + symbol : ", empty"}`
        );
    });

    document.getElementById("playerXBox").classList.toggle(
        "active-player",
        active && currentPlayer === "X"
    );

    document.getElementById("playerOBox").classList.toggle(
        "active-player",
        active && currentPlayer === "O"
    );
}

function updateModeButtons() {
    document.querySelectorAll(".mode-btn").forEach(button => {
        const selected = button.dataset.mode === mode;

        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
    });

    document.getElementById("playerXLabel").textContent =
        mode === "ai" ? "YOU" : "PLAYER 1";

    document.getElementById("playerOLabel").textContent =
        mode === "ai" ? "AI" : "PLAYER 2";
}

function selectMode(nextMode) {
    if (nextMode !== "ai" && nextMode !== "two") return;

    mode = nextMode;
    clearTimeout(aiTimer);
    updateModeButtons();
    startGame();
}

document.querySelectorAll(".mode-btn").forEach(button => {
    button.addEventListener("click", () => {
        selectMode(button.dataset.mode);
    });
});

function startGame() {
    clearTimeout(aiTimer);

    board = Array(9).fill("");
    active = true;
    thinking = false;
    resultSaved = false;
    currentPlayer = "X";

    startBtn.textContent = "Game Started";

    statusText.textContent = mode === "ai"
        ? "Your turn! Play as X."
        : "Player 1's turn (X).";

    renderBoard();
}

function endGame(message, result, winningLine = []) {
    active = false;
    thinking = false;
    statusText.textContent = message;
    renderBoard(winningLine);

    if (result) saveGameResult(result);
}

async function saveGameResult(result) {
    if (resultSaved) return;
    resultSaved = true;

    try {
        const response = await fetch(`${API_URL}/api/save-game`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ result })
        });

        if (!response.ok) {
            throw new Error(`Save failed: ${response.status}`);
        }
    } catch (error) {
        console.error("Unable to save game result:", error);
    }

    loadGameHistory();
}

function checkGameOver() {
    const winner = findWinner(board);

    if (winner) {
        let result;

        if (mode === "ai") {
            result = winner.symbol === "X" ? "Player Wins" : "AI Wins";
        } else {
            result = winner.symbol === "X" ? "Player 1 Wins" : "Player 2 Wins";
        }

        playSound(750, 0.22);

        endGame(
            `${result}! 🎉`,
            result,
            winner.line
        );

        return true;
    }

    if (board.every(Boolean)) {
        playSound(330, 0.25);
        endGame("It's a draw!", "Draw");
        return true;
    }

    return false;
}

function minimax(position, maximizing, depth = 0) {
    const winner = findWinner(position);

    if (winner?.symbol === "O") return 10 - depth;
    if (winner?.symbol === "X") return depth - 10;
    if (position.every(Boolean)) return 0;

    if (maximizing) {
        let best = -Infinity;

        for (let i = 0; i < 9; i++) {
            if (!position[i]) {
                position[i] = "O";
                best = Math.max(
                    best,
                    minimax(position, false, depth + 1)
                );
                position[i] = "";
            }
        }

        return best;
    }

    let best = Infinity;

    for (let i = 0; i < 9; i++) {
        if (!position[i]) {
            position[i] = "X";
            best = Math.min(
                best,
                minimax(position, true, depth + 1)
            );
            position[i] = "";
        }
    }

    return best;
}

function getBestMove() {
    let bestScore = -Infinity;
    let bestMove = -1;

    for (let i = 0; i < 9; i++) {
        if (!board[i]) {
            board[i] = "O";
            const score = minimax(board, false);
            board[i] = "";

            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }
    }

    return bestMove;
}

function aiMove() {
    if (!active || mode !== "ai") return;

    thinking = true;
    statusText.textContent = "AI is thinking...";
    renderBoard();

    aiTimer = setTimeout(() => {
        if (!active || mode !== "ai") return;

        const move = getBestMove();

        if (move !== -1) board[move] = "O";

        thinking = false;
        playSound(420, 0.1);

        if (checkGameOver()) return;

        currentPlayer = "X";
        statusText.textContent = "Your turn! Play as X.";
        renderBoard();
    }, 450);
}

function handleCellClick(index) {
    if (!active || thinking || board[index]) return;

    board[index] = currentPlayer;
    playSound(currentPlayer === "X" ? 560 : 440, 0.08);

    if (checkGameOver()) return;

    if (mode === "ai") {
        currentPlayer = "O";
        aiMove();
    } else {
        currentPlayer = currentPlayer === "X" ? "O" : "X";

        statusText.textContent = currentPlayer === "X"
            ? "Player 1's turn (X)."
            : "Player 2's turn (O).";

        renderBoard();
    }
}

cells.forEach((cell, index) => {
    cell.addEventListener("click", () => handleCellClick(index));
});

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

/* GAME HISTORY */

async function loadGameHistory() {
    const list = document.getElementById("historyList");

    list.replaceChildren();

    const loading = document.createElement("div");
    loading.className = "history-empty";
    loading.textContent = "Loading history...";
    list.appendChild(loading);

    try {
        const response = await fetch(`${API_URL}/api/game-history`);

        if (!response.ok) {
            throw new Error(`History request failed: ${response.status}`);
        }

        const data = await response.json();

        const games = Array.isArray(data)
            ? data
            : Array.isArray(data.history)
                ? data.history
                : Array.isArray(data.data)
                    ? data.data
                    : [];

        list.replaceChildren();

        if (!games.length) {
            const empty = document.createElement("div");
            empty.className = "history-empty";
            empty.textContent = "No games recorded yet.";
            list.appendChild(empty);
            return;
        }

        games.forEach(game => {
            const item = document.createElement("div");
            item.className = "history-item";

            const result = document.createElement("div");
            result.className = "history-result";
            result.textContent = game.result || "Game completed";

            const date = document.createElement("div");
            date.className = "history-date";

            const dateValue = game.created_at
                ? new Date(game.created_at)
                : null;

            date.textContent =
                dateValue && !Number.isNaN(dateValue.getTime())
                    ? dateValue.toLocaleString()
                    : "";

            item.append(result, date);
            list.appendChild(item);
        });
    } catch (error) {
        console.error("Unable to load game history:", error);

        list.replaceChildren();

        const errorMessage = document.createElement("div");
        errorMessage.className = "history-empty";
        errorMessage.textContent = "Unable to load history. Try Refresh.";
        list.appendChild(errorMessage);
    }
}

document.getElementById("refreshHistory").addEventListener(
    "click",
    loadGameHistory
);

/* INITIALIZE */

updateModeButtons();
renderBoard();
loadGameHistory();
