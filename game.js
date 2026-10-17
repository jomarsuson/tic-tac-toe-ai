
/* =========================================
   CUSTOM APPEARANCE SETTINGS
========================================= */

(() => {
    const root = document.documentElement;

    const settingsButton = document.getElementById("settingsMenuBtn");
    const settingsPanel = document.getElementById("settingsPanel");
    const settingsOverlay = document.getElementById("settingsOverlay");
    const closeSettingsButton = document.getElementById("closeSettingsBtn");

    const backgroundInput = document.getElementById("backgroundColor");
    const boardInput = document.getElementById("boardColor");
    const accentInput = document.getElementById("accentColor");
    const xInput = document.getElementById("xColor");
    const oInput = document.getElementById("oColor");

    const saveButton = document.getElementById("saveAppearanceBtn");
    const resetButton = document.getElementById("resetAppearanceBtn");
    const appearanceStatus = document.getElementById("appearanceStatus");
    const themeButtons = document.querySelectorAll("[data-theme-preset]");

    if (
        !settingsButton || !settingsPanel || !settingsOverlay ||
        !backgroundInput || !boardInput || !accentInput ||
        !xInput || !oInput || !saveButton || !resetButton
    ) {
        console.warn("Appearance settings could not initialize.");
        return;
    }

    const defaultSettings = {
        preset: "chocolate",
        background: "#F6EFE6",
        board: "#F8F1E8",
        accent: "#C47A50",
        x: "#65432F",
        o: "#C47A50"
    };

    const presets = {
        chocolate: {
            background: "#F6EFE6",
            board: "#F8F1E8",
            accent: "#C47A50",
            x: "#65432F",
            o: "#C47A50",
            text: "#38251D",
            muted: "#88786B",
            surface: "#FFFCF8",
            border: "#E9DCCE",
            buttonText: "#FFFFFF"
        },
        midnight: {
            background: "#191923",
            board: "#292936",
            accent: "#9285FF",
            x: "#B8ADFF",
            o: "#FFB4D2",
            text: "#FFFFFF",
            muted: "#C0BDCE",
            surface: "#22222F",
            border: "#454454",
            buttonText: "#191923"
        },
        ocean: {
            background: "#EAF4FF",
            board: "#D9EAFB",
            accent: "#2879C7",
            x: "#175A9D",
            o: "#D65D45",
            text: "#173653",
            muted: "#58738B",
            surface: "#F9FCFF",
            border: "#C8DDF0",
            buttonText: "#FFFFFF"
        },
        forest: {
            background: "#EDF5EC",
            board: "#DCEBDD",
            accent: "#3D8158",
            x: "#276441",
            o: "#B66C37",
            text: "#203A2A",
            muted: "#637A69",
            surface: "#FAFCF8",
            border: "#D0E1D0",
            buttonText: "#FFFFFF"
        },
        purple: {
            background: "#21152E",
            board: "#332342",
            accent: "#C66BFF",
            x: "#E0A5FF",
            o: "#75E4FF",
            text: "#FFFFFF",
            muted: "#D0BDD9",
            surface: "#2A1C38",
            border: "#50385F",
            buttonText: "#21152E"
        }
    };

    let currentSettings = { ...defaultSettings };

    function validColor(value) {
        return /^#[0-9a-f]{6}$/i.test(value || "");
    }

    function setVariable(name, value) {
        root.style.setProperty(name, value);
    }

    function applySettings(settings) {
        const preset = presets[settings.preset] || presets.chocolate;

        const colors = {
            background: settings.background,
            board: settings.board,
            accent: settings.accent,
            x: settings.x,
            o: settings.o
        };

        Object.entries(colors).forEach(([key, value]) => {
            if (!validColor(value)) {
                colors[key] = defaultSettings[key];
            }
        });

        setVariable("--theme-bg", colors.background);
        setVariable("--theme-board", colors.board);
        setVariable("--theme-accent", colors.accent);
        setVariable("--theme-x", colors.x);
        setVariable("--theme-o", colors.o);
        setVariable("--theme-text", preset.text);
        setVariable("--theme-muted", preset.muted);
        setVariable("--theme-surface", preset.surface);
        setVariable("--theme-border", preset.border);
        setVariable("--theme-button-text", preset.buttonText);

        /* Update existing theme variables used throughout the CSS. */
        setVariable("--cream", colors.background);
        setVariable("--cream-dark", colors.board);
        setVariable("--surface", preset.surface);
        setVariable("--surface-hover", colors.board);
        setVariable("--chocolate", colors.x);
        setVariable("--chocolate-dark", preset.text);
        setVariable("--brown", colors.accent);
        setVariable("--caramel", colors.accent);
        setVariable("--text", preset.text);
        setVariable("--muted", preset.muted);
        setVariable("--border", preset.border);

        backgroundInput.value = colors.background;
        boardInput.value = colors.board;
        accentInput.value = colors.accent;
        xInput.value = colors.x;
        oInput.value = colors.o;

        const previewX = document.querySelector(".preview-x");
        const previewO = document.querySelector(".preview-o");

        if (previewX) previewX.style.color = colors.x;
        if (previewO) previewO.style.color = colors.o;

        themeButtons.forEach(button => {
            const selected = button.dataset.themePreset === settings.preset;
            button.classList.toggle("selected", selected);
            button.setAttribute("aria-pressed", String(selected));
        });

        /* Set the page color used by supported mobile browser UI. */
        const themeColor = document.querySelector('meta[name="theme-color"]');
        if (themeColor) themeColor.setAttribute("content", colors.background);

        /* Ensure all existing X and O marks follow custom colors. */
        document.querySelectorAll(".cell.cell-x").forEach(cell => {
            cell.style.color = colors.x;
        });
        document.querySelectorAll(".cell.cell-o").forEach(cell => {
            cell.style.color = colors.o;
        });
    }

    function readControls() {
        return {
            preset: currentSettings.preset,
            background: backgroundInput.value,
            board: boardInput.value,
            accent: accentInput.value,
            x: xInput.value,
            o: oInput.value
        };
    }

    function previewCustomColors() {
        currentSettings = {
            ...readControls(),
            preset: "chocolate"
        };

        /* Custom colors retain the selected preset's overall text style. */
        applySettings(currentSettings);

        themeButtons.forEach(button => {
            button.classList.remove("selected");
            button.setAttribute("aria-pressed", "false");
        });

        if (appearanceStatus) {
            appearanceStatus.textContent = "Previewing changes — save to keep them.";
        }
    }

    function openSettings() {
        settingsPanel.classList.add("open");
        settingsOverlay.classList.add("open");
        settingsPanel.setAttribute("aria-hidden", "false");
        settingsOverlay.setAttribute("aria-hidden", "false");
        settingsButton.setAttribute("aria-expanded", "true");
        closeSettingsButton.focus();
    }

    function closeSettings() {
        settingsPanel.classList.remove("open");
        settingsOverlay.classList.remove("open");
        settingsPanel.setAttribute("aria-hidden", "true");
        settingsOverlay.setAttribute("aria-hidden", "true");
        settingsButton.setAttribute("aria-expanded", "false");
        settingsButton.focus();
    }

    settingsButton.addEventListener("click", openSettings);
    closeSettingsButton.addEventListener("click", closeSettings);
    settingsOverlay.addEventListener("click", closeSettings);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && settingsPanel.classList.contains("open")) {
            closeSettings();
        }
    });

    themeButtons.forEach(button => {
        button.addEventListener("click", () => {
            const presetName = button.dataset.themePreset;
            const preset = presets[presetName];

            if (!preset) return;

            currentSettings = {
                preset: presetName,
                background: preset.background,
                board: preset.board,
                accent: preset.accent,
                x: preset.x,
                o: preset.o
            };

            applySettings(currentSettings);

            if (appearanceStatus) {
                appearanceStatus.textContent =
                    `${button.querySelector("span:last-child").textContent} preview`;
            }
        });
    });

    [
        backgroundInput,
        boardInput,
        accentInput,
        xInput,
        oInput
    ].forEach(input => {
        input.addEventListener("input", previewCustomColors);
        input.addEventListener("change", previewCustomColors);
    });

    saveButton.addEventListener("click", () => {
        currentSettings = readControls();

        try {
            localStorage.setItem(
                "ticTacToeAppearance",
                JSON.stringify(currentSettings)
            );

            applySettings(currentSettings);

            if (appearanceStatus) {
                appearanceStatus.textContent = "Appearance saved successfully!";
            }
        } catch (error) {
            console.error("Could not save appearance:", error);

            if (appearanceStatus) {
                appearanceStatus.textContent =
                    "Could not save settings in this browser.";
            }
        }
    });

    resetButton.addEventListener("click", () => {
        currentSettings = { ...defaultSettings };
        applySettings(currentSettings);

        try {
            localStorage.removeItem("ticTacToeAppearance");
        } catch (error) {
            console.warn("Could not clear saved appearance:", error);
        }

        if (appearanceStatus) {
            appearanceStatus.textContent = "Default Chocolate Cream restored.";
        }
    });

    try {
        const saved = localStorage.getItem("ticTacToeAppearance");

        if (saved) {
            const parsed = JSON.parse(saved);

            currentSettings = {
                ...defaultSettings,
                ...parsed
            };

            if (!presets[currentSettings.preset]) {
                currentSettings.preset = "chocolate";
            }

            applySettings(currentSettings);
        } else {
            applySettings(defaultSettings);
        }
    } catch (error) {
        console.warn("Could not load saved appearance:", error);
        applySettings(defaultSettings);
    }
})();
