// ---------------------------
//  POEM DATA (long versions)
// ---------------------------
const POEMS = {
  road: {
    title: "The Road Not Taken",
    text: `
Two roads diverged in a yellow wood,
And sorry I could not travel both,
And be one traveler, long I stood,
And looked down one as far as I could,
To where it bent in the undergrowth.

Then took the other, as just as fair,
And having perhaps the better claim,
Because it was grassy and wanted wear;
Though as for that the passing there
Had worn them really about the same.

And both that morning equally lay
In leaves no step had trodden black.
Oh, I kept the first for another day!
Yet knowing how way leads on to way,
I doubted if I should ever come back.

I shall be telling this with a sigh
Somewhere ages and ages hence:
Two roads diverged in a wood, and I—
I took the one less traveled by,
And that has made all the difference.
`
  },

  dreams: {
    title: "Dreams — Langston Hughes",
    text: `
Hold fast to dreams,
For if dreams die,
Life is a broken-winged bird
That cannot fly.

Hold fast to dreams,
For when dreams go,
Life is a barren field
Frozen with snow.
`
  },

  hope: {
    title: "Hope is the Thing with Feathers",
    text: `
Hope is the thing with feathers
That perches in the soul,
And sings the tune without the words,
And never stops at all.

And sweetest in the gale is heard;
And sore must be the storm
That could abash the little bird
That kept so many warm.

I've heard it in the chillest land,
And on the strangest sea;
Yet, never, in extremity,
It asked a crumb of me.
`
  },

  invictus: {
    title: "Invictus (Full)",
    text: `
Out of the night that covers me,
Black as the pit from pole to pole,
I thank whatever gods may be
For my unconquerable soul.

In the fell clutch of circumstance
I have not winced nor cried aloud.
Under the bludgeonings of chance
My head is bloody, but unbowed.

Beyond this place of wrath and tears
Looms but the Horror of the shade,
And yet the menace of the years
Finds, and shall find, me unafraid.

It matters not how strait the gate,
How charged with punishments the scroll,
I am the master of my fate:
I am the captain of my soul.
`
  }
};

// ---------------------------
//  DOM REFERENCES
// ---------------------------
const navButtons = document.querySelectorAll(".nav-btn");
const views = document.querySelectorAll(".view");

const poemSelect = document.getElementById("poem-select");
const startTypingBtn = document.getElementById("start-typing-btn");

const poemBox = document.getElementById("poem-box");
const typingInput = document.getElementById("typing-input");
const typingTitle = document.getElementById("typing-poem-title");

const statWpm = document.getElementById("stat-wpm");
const statAcc = document.getElementById("stat-accuracy");
const statMistakes = document.getElementById("stat-mistakes");
const statTime = document.getElementById("stat-time");

const resultsBody = document.getElementById("results-body");

const restartBtn = document.getElementById("restart-btn");
const submitBtn = document.getElementById("submit-btn");

// ---------------------------
//  BACKEND API URL
// ---------------------------
const API_URL = "http://127.0.0.1:8000";

// ---------------------------
//  STATE: Typing + Results
// ---------------------------
let currentPoemKey = "road";
let wordList = [];
let wordStates = []; // true / false / null
let currentIndex = 0;
let mistakes = 0;
let startTime = null;
let timerId = null;
let sessionDuration = 0;
let sessionFinished = false;

// pagination state for results
let currentPage = 1;
const pageSize = 10;
let totalPages = 1;
let paginationInitialized = false;

// ---------------------------
//  NAVIGATION
// ---------------------------
navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.target;
    views.forEach((v) => v.classList.remove("active"));
    document.getElementById(targetId).classList.add("active");

    if (targetId === "results-section") {
      loadResultsFromBackend(currentPage);
    }
  });
});

// ---------------------------
//  LOAD POEM
// ---------------------------
function loadPoem(key) {
  currentPoemKey = key;
  const poemData = POEMS[key];

  typingTitle.textContent = poemData.title;

  const raw = poemData.text.trim().replace(/\s+/g, " ");
  wordList = raw.split(" ");
  wordStates = new Array(wordList.length).fill(null);
  currentIndex = 0;
  mistakes = 0;
  startTime = null;
  sessionDuration = 0;
  sessionFinished = false;

  clearInterval(timerId);
  timerId = null;

  typingInput.value = "";
  updateStats();
  renderPoem();
}

function renderPoem() {
  poemBox.innerHTML = "";
  wordList.forEach((word, idx) => {
    const span = document.createElement("span");
    span.textContent = word;
    span.classList.add("word");

    if (idx < currentIndex) {
      if (wordStates[idx] === true) span.classList.add("correct");
      if (wordStates[idx] === false) span.classList.add("wrong");
    } else if (idx === currentIndex) {
      span.classList.add("active");
    }

    poemBox.appendChild(span);
    poemBox.appendChild(document.createTextNode(" "));
  });

  const active = poemBox.querySelector(".word.active");
  if (active) {
    const boxRect = poemBox.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    if (activeRect.bottom > boxRect.bottom - 10) {
      poemBox.scrollTop += activeRect.bottom - boxRect.bottom + 10;
    }
  }
}

// ---------------------------
//  TYPING LOGIC
// ---------------------------
typingInput.addEventListener("keydown", (e) => {
  if (e.key === " ") {
    e.preventDefault();
    handleWord();
  }
});

function handleWord() {
  if (sessionFinished) return;

  const typed = typingInput.value.trim();
  if (!typed) return;

  if (!startTime) {
    startTime = Date.now();
    timerId = setInterval(updateTime, 500);
  }

  const target = wordList[currentIndex] || "";
  const isCorrect = typed === target;

  wordStates[currentIndex] = isCorrect;

  if (!isCorrect) {
    mistakes++;
    typingInput.classList.add("shake");
    setTimeout(() => typingInput.classList.remove("shake"), 150);
  }

  currentIndex++;
  typingInput.value = "";

  renderPoem();
  updateStats();
  maybeFinishSession();
}

// ---------------------------
//  STATS
// ---------------------------
function updateTime() {
  if (!startTime) return;
  sessionDuration = Math.floor((Date.now() - startTime) / 1000);
  statTime.textContent = sessionDuration + "s";
}

function updateStats() {
  const correctCount = wordStates.filter((s) => s === true).length;
  const totalTyped = wordStates.filter((s) => s !== null).length;

  if (!startTime || totalTyped === 0) {
    statWpm.textContent = "0";
    statAcc.textContent = "0%";
    statMistakes.textContent = mistakes;
    statTime.textContent = "0s";
    return;
  }

  const minutes = (Date.now() - startTime) / 60000;
  const wpm = Math.round(correctCount / (minutes || (1 / 60000)));
  const accuracy = Math.round((correctCount / totalTyped) * 100);

  statWpm.textContent = wpm;
  statAcc.textContent = accuracy + "%";
  statMistakes.textContent = mistakes;
}

// ---------------------------
//  SESSION END HANDLING
// ---------------------------
function maybeFinishSession() {
  if (currentIndex >= wordList.length) {
    endSession(false);
  }
}

function endSession(openResults) {
  if (sessionFinished) {
    if (openResults) {
      showResultsView();
    }
    return;
  }

  sessionFinished = true;
  clearInterval(timerId);
  timerId = null;
  updateStats();
  saveResultToBackend().then(() => {
    if (openResults) {
      showResultsView();
    }
  });
}

function showResultsView() {
  views.forEach((v) => v.classList.remove("active"));
  document.getElementById("results-section").classList.add("active");
  loadResultsFromBackend(1);
}

// ---------------------------
//  SAVE RESULT TO BACKEND
// ---------------------------
async function saveResultToBackend() {
  const correctCount = wordStates.filter((s) => s === true).length;
  const totalTyped = wordStates.filter((s) => s !== null).length;

  if (totalTyped === 0) {
    return;
  }

  const minutes = startTime ? (Date.now() - startTime) / 60000 : 1;
  const wpm = Math.round(correctCount / (minutes || (1 / 60000)));
  const accuracy = totalTyped ? Math.round((correctCount / totalTyped) * 100) : 0;

  const payload = {
    poem: POEMS[currentPoemKey].title,
    wpm,
    accuracy,
    mistakes,
    duration_sec: sessionDuration
  };

  try {
    await fetch(`${API_URL}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.warn("Backend offline, could not save session.", e);
  }
}

// ---------------------------
//  LOAD RESULTS (WITH PAGINATION)
// ---------------------------
async function loadResultsFromBackend(page = 1) {
  currentPage = page;

  try {
    const res = await fetch(`${API_URL}/sessions?page=${page}&size=${pageSize}`);
    const data = await res.json();

    const items = Array.isArray(data) ? data : data.items || [];
    totalPages = data.total_pages || 1;

    resultsBody.innerHTML = "";

    items.forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.poem}</td>
        <td>${row.wpm}</td>
        <td>${row.accuracy}%</td>
        <td>${row.mistakes}</td>
        <td>${row.duration_sec}s</td>
      `;
      resultsBody.appendChild(tr);
    });

    initPaginationControls();
    updatePaginationUI();
  } catch (e) {
    console.warn("Could not load results from backend", e);
  }
}

function initPaginationControls() {
  if (paginationInitialized) return;

  const table = document.querySelector(".results-table");
  if (!table || !table.parentElement) return;

  const wrapper = table.parentElement;

  const div = document.createElement("div");
  div.className = "pagination-controls";
  div.innerHTML = `
    <button id="prev-page" class="ghost-btn">Prev</button>
    <span id="page-info" class="page-info">Page 1</span>
    <button id="next-page" class="ghost-btn">Next</button>
  `;
  wrapper.appendChild(div);

  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");

  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      loadResultsFromBackend(currentPage - 1);
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentPage < totalPages) {
      loadResultsFromBackend(currentPage + 1);
    }
  });

  paginationInitialized = true;
}

function updatePaginationUI() {
  const pageInfo = document.getElementById("page-info");
  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");

  if (!pageInfo || !prevBtn || !nextBtn) return;

  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
}

// ---------------------------
//  BUTTON HANDLERS
// ---------------------------
startTypingBtn.addEventListener("click", () => {
  loadPoem(poemSelect.value);
  views.forEach((v) => v.classList.remove("active"));
  document.getElementById("typing-section").classList.add("active");
  typingInput.focus();
});

poemSelect.addEventListener("change", () => {
  loadPoem(poemSelect.value);
});

restartBtn.addEventListener("click", () => {
  loadPoem(currentPoemKey);
  typingInput.focus();
});

submitBtn.addEventListener("click", () => {
  const totalTyped = wordStates.filter((s) => s !== null).length;
  if (totalTyped === 0) {
    alert("Type at least one word before submitting.");
    return;
  }
  endSession(true);
});

// ---------------------------
//  INIT
// ---------------------------
loadPoem("road");
