//STATE//

let hasStarted = false; // UI state (blur / overlay)
let isRunning = false;  // typing + timer

let typingData = null;
let difficulty = "hard";
let mode = "timed";

let currentPassage = null;
let chars = [];
let currentIndex = 0;

let timeLeft = 60;
let timer = null;
let hasEnded = false;
let startTime = null;
let totalCorrectKeystrokes = 0;
let totalIncorrectKeystrokes = 0;


//DOM ELEMENTS//
const testTextEl = document.getElementById("test-text");

const timeEl = document.getElementById("time");
const wpmEl = document.getElementById("wpm");
const accuracyEl = document.getElementById("accuracy");
const statsEl = document.querySelector(".stats");

const startOverlay = document.querySelector(".start-btn-overlay");
const contentBlurred = document.querySelector(".content-blurred");
const startBtn = document.querySelector(".start-btn");
const textContainer = document.querySelector(".text-container");
const restartBtn = document.querySelector(".restart-btn");

const difficultySelect = document.getElementById("difficulty-select");
const modeSelect = document.getElementById("mode-select");
const dropdowns = document.querySelectorAll(".dropdown");


//LOAD DATA//

function initAfterDataLoad() {
  loadPassage();
  syncDifficultyUI();
  syncModeUI();
}

function getInlineData() {
  if (window.TYPING_DATA) return window.TYPING_DATA;
  const inlineEl = document.getElementById("typing-data");
  if (!inlineEl) return null;
  try {
    return JSON.parse(inlineEl.textContent.trim());
  } catch (err) {
    console.error("Error parsing inline data:", err);
    return null;
  }
}

const inlineData = getInlineData();
if (inlineData) {
  typingData = inlineData;
  initAfterDataLoad();
} else {
  fetch("data.json")
    .then(res => res.json())
    .then(data => {
      typingData = data;
      initAfterDataLoad();
    })
    .catch(err => console.error("Error loading data.json:", err));
}


//PASSAGE LOADING//

function loadPassage(force = false) {
  if (!typingData || (hasStarted && !force)) return;

  const passages = typingData[difficulty];
  if (!passages) return;

  currentPassage =
    passages[Math.floor(Math.random() * passages.length)];

  testTextEl.innerHTML = currentPassage.text
    .split("")
    .map(char => `<span class="char">${char}</span>`)
    .join("");

  chars = testTextEl.querySelectorAll(".char");
  currentIndex = 0;

  if (chars[0]) {
    chars[0].classList.add("current");
  }
}

// START / END TEST//

testTextEl.addEventListener("focus", startTest);

function startTest() {
  if (isRunning) return;

  hasStarted = true;
  isRunning = true;
  hasEnded = false;

  startOverlay.classList.add("hidden");
  contentBlurred.classList.add("started");
  if (statsEl) statsEl.classList.add("started");
  accuracyEl.classList.add("perfect");
  if (textContainer) textContainer.classList.add("started");

  timeLeft = 60;
  startTime = Date.now();
  totalCorrectKeystrokes = 0;
  totalIncorrectKeystrokes = 0;
  updateTimeDisplay();

  if (mode === "timed") {
    timer = setInterval(() => {
      timeLeft--;
      updateTimeDisplay();

      if (timeLeft <= 0) endTest();
    }, 1000);
  } else {
    timer = setInterval(() => {
      updateTimeDisplay();
    }, 1000);
  }
}

function resetTest() {
  clearInterval(timer);
  isRunning = false;
  hasEnded = false;
  startTime = null;
  totalCorrectKeystrokes = 0;
  totalIncorrectKeystrokes = 0;
  timeLeft = 60;
  updateTimeDisplay();
  wpmEl.innerText = "0";
  accuracyEl.innerText = "100%";
  accuracyEl.classList.add("perfect");

  chars.forEach(char => {
    char.classList.remove("correct", "incorrect", "current");
  });

  currentIndex = 0;
  loadPassage(true);
}


function endTest() {
  if (!isRunning || hasEnded) return;
  hasEnded = true;
  clearInterval(timer);
  isRunning = false;
  saveResults();
  window.location.href = "results.html";
}



//TYPING HANDLER//

document.addEventListener("keydown", e => {
  if (!hasStarted) startTest();
  if (!isRunning) return;
  if (e.key === "Backspace") {
    e.preventDefault();
    if (currentIndex === 0) return;

    const currentChar = chars[currentIndex];
    if (currentChar) currentChar.classList.remove("current");

    currentIndex--;
    const prevChar = chars[currentIndex];
    if (!prevChar) return;

    prevChar.classList.remove("correct", "incorrect");
    prevChar.classList.add("current");
    updateStats();
    return;
  }

  if (e.key.length !== 1) return;

  const currentChar = chars[currentIndex];
  if (!currentChar) return;

  if (e.key === currentChar.textContent) {
    currentChar.classList.add("correct");
    totalCorrectKeystrokes++;
  } else {
    currentChar.classList.add("incorrect");
    totalIncorrectKeystrokes++;
  }

  currentChar.classList.remove("current");
  currentIndex++;

  if (chars[currentIndex]) {
    chars[currentIndex].classList.add("current");
  }

  if (currentIndex >= chars.length) {
    endTest();
    return;
  }

  updateStats();
});

//STATS//

function updateStats() {
  const typed = totalCorrectKeystrokes + totalIncorrectKeystrokes;
  const correct = totalCorrectKeystrokes;

  const accuracy = typed
    ? Math.round((correct / typed) * 100)
    : 100;

  const elapsedSeconds = mode === "timed"
    ? Math.max(60 - timeLeft, 1)
    : Math.max(getElapsedSeconds(), 1);

  const wpm =
    Math.round(((typed / 5) / elapsedSeconds) * 60) || 0;

  accuracyEl.innerText = `${accuracy}%`;
  wpmEl.innerText = wpm;

  if (accuracy === 100) {
    accuracyEl.classList.add("perfect");
  } else {
    accuracyEl.classList.remove("perfect");
  }
}

function updateTimeDisplay() {
  if (!timeEl) return;
  if (mode === "passage") {
    timeEl.innerText = `${getElapsedSeconds()}s`;
    return;
  }
  timeEl.innerText = `${timeLeft}s`;
}

function getElapsedSeconds() {
  if (!startTime) return 0;
  return Math.floor((Date.now() - startTime) / 1000);
}

function saveResults() {
  const typed = totalCorrectKeystrokes + totalIncorrectKeystrokes;
  const correct = totalCorrectKeystrokes;
  const incorrect = totalIncorrectKeystrokes;
  const accuracy = typed ? Math.round((correct / typed) * 100) : 100;
  const elapsed = Math.max(60 - timeLeft, 1);
  const wpm = Math.round(((correct / 5) / elapsed) * 60) || 0;

  const results = {
    wpm,
    accuracy,
    correct,
    incorrect
  };

  localStorage.setItem("typingResults", JSON.stringify(results));
}


//CHIP + DROPDOWN SYNc//

function syncDifficultyUI() {
  document
    .querySelectorAll('[aria-label="Difficulty"] .chip')
    .forEach(chip => {
      const value = chip.dataset.value || chip.textContent.toLowerCase();
      const active = value === difficulty;
      chip.classList.toggle("active", active);
      chip.setAttribute("aria-pressed", active);
    });

  if (difficultySelect) difficultySelect.value = difficulty;

  setDropdownValue("difficulty", difficulty);
}

function syncModeUI() {
  document
    .querySelectorAll('[aria-label="Mode"] .chip')
    .forEach(chip => {
      const value = chip.textContent.toLowerCase().includes("timed")
        ? "timed"
        : "passage";

      const active = value === mode;
      chip.classList.toggle("active", active);
      chip.setAttribute("aria-pressed", active);
    });

  if (modeSelect) modeSelect.value = mode;

  setDropdownValue("mode", mode);
  updateTimeDisplay();
}


//CHIP EVENTS//


document.querySelectorAll('[role="group"]').forEach(group => {
  group.addEventListener("click", e => {
    if (!e.target.classList.contains("chip")) return;

    const value = e.target.textContent.toLowerCase();

    if (group.getAttribute("aria-label") === "Difficulty") {
      difficulty = value;
      loadPassage();
      syncDifficultyUI();
    }

    if (group.getAttribute("aria-label") === "Mode") {
      mode = value.includes("timed") ? "timed" : "passage";
      syncModeUI();
    }
  });
});


//DROPDOWN EVENTS//


difficultySelect.addEventListener("change", e => {
  difficulty = e.target.value;
  loadPassage();
  syncDifficultyUI();
});

modeSelect.addEventListener("change", e => {
  mode = e.target.value;
  syncModeUI();
  updateTimeDisplay();

  if (mode === "passage") {
    clearInterval(timer);
    timer = null;
    if (isRunning) {
      timer = setInterval(() => {
        updateTimeDisplay();
      }, 1000);
    }
  } else if (isRunning && !timer) {
    timer = setInterval(() => {
      timeLeft--;
      updateTimeDisplay();

      if (timeLeft <= 0) endTest();
    }, 1000);
  }
});


//CUSTOM MOBILE DROPDOWNS//

function setDropdownValue(type, value) {
  const dropdown = document.querySelector(`.dropdown[data-type="${type}"]`);
  if (!dropdown) return;

  const toggle = dropdown.querySelector(".dropdown-toggle");
  const options = dropdown.querySelectorAll(".dropdown-option");

  options.forEach(option => {
    const isSelected = option.dataset.value === value;
    option.classList.toggle("selected", isSelected);
    option.setAttribute("aria-selected", isSelected);
    if (isSelected && toggle) {
      toggle.textContent = option.textContent.trim();
    }
  });
}

dropdowns.forEach(dropdown => {
  const toggle = dropdown.querySelector(".dropdown-toggle");
  const options = dropdown.querySelectorAll(".dropdown-option");
  const type = dropdown.dataset.type;

  if (!toggle) return;

  toggle.addEventListener("click", e => {
    e.stopPropagation();
    dropdowns.forEach(d => {
      if (d !== dropdown) d.classList.remove("open");
    });
    dropdown.classList.toggle("open");
    toggle.setAttribute("aria-expanded", dropdown.classList.contains("open"));
  });

  options.forEach(option => {
    option.addEventListener("click", e => {
      e.stopPropagation();
      const value = option.dataset.value;
      dropdown.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");

      if (type === "difficulty") {
        difficulty = value;
        loadPassage();
        syncDifficultyUI();
      } else if (type === "mode") {
        mode = value;
        syncModeUI();
      }
    });
  });
});

document.addEventListener("click", e => {
  if (!e.target.closest(".dropdown")) {
    dropdowns.forEach(d => {
      d.classList.remove("open");
      const toggle = d.querySelector(".dropdown-toggle");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    });
  }
});


//UI EVENTS//


startBtn.addEventListener("click", startTest);
restartBtn.addEventListener("click", () => {
  resetTest();
  startTest();
});

document.addEventListener("keydown", e => {
  if (e.key === " ") e.preventDefault();
});
