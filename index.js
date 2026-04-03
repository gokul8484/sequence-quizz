const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = "gokuldevi";

const SHARED_STYLES = `
  :root {
    --bg: #0f172a;
    --card: #111827;
    --muted: #9ca3af;
    --text: #f9fafb;
    --accent: #0ea5e9;
    --ok: #22c55e;
    --bad: #ef4444;
    --border: #1f2937;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    color: var(--text);
    background: radial-gradient(circle at top, #1e293b 0%, #0f172a 60%);
    min-height: 100vh;
  }

  .container {
    width: min(900px, 92vw);
    margin: 30px auto;
  }

  .card {
    background: rgba(17, 24, 39, 0.92);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 18px;
    margin-bottom: 16px;
  }

  h1, h2, h3 { margin-top: 0; }

  .muted { color: var(--muted); }

  .row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
  }

  input, button {
    font-size: 1rem;
    border-radius: 10px;
    border: 1px solid #334155;
    padding: 10px 12px;
  }

  input {
    background: #0b1220;
    color: var(--text);
  }

  button {
    background: #0b1220;
    color: var(--text);
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    border-color: var(--accent);
  }

  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  button.primary {
    background: #0c4a6e;
    border-color: #0ea5e9;
  }

  button.warn {
    background: #7f1d1d;
    border-color: #ef4444;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(160px, 1fr));
    gap: 10px;
  }

  .option.correct {
    border-color: var(--ok);
    background: rgba(34, 197, 94, 0.14);
  }

  .option.wrong {
    border-color: var(--bad);
    background: rgba(239, 68, 68, 0.12);
  }

  .badge {
    background: #1e293b;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 0.9rem;
    border: 1px solid #334155;
  }

  .hidden { display: none; }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    text-align: left;
    padding: 10px;
    border-bottom: 1px solid #263041;
  }

  .chart-row {
    margin: 10px 0;
  }

  .bar-wrap {
    background: #0b1220;
    border: 1px solid #334155;
    border-radius: 999px;
    overflow: hidden;
  }

  .bar {
    height: 24px;
    width: 0;
    background: linear-gradient(90deg, #0284c7, #06b6d4);
    transition: width 300ms ease;
  }

  @media (max-width: 640px) {
    .grid { grid-template-columns: 1fr; }
  }
`;

function renderLayout(title, body, script) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>${SHARED_STYLES}</style>
</head>
<body>
  ${body}
  <script src="/socket.io/socket.io.js"></script>
  <script>${script}</script>
</body>
</html>`;
}

const playerPage = renderLayout(
  "Quiz Player",
  `
  <div class="container">
    <div class="card" id="joinCard">
      <h1>Join Quiz</h1>
      <p class="muted">Enter a unique username to join.</p>
      <p><a href="/admin" target="_blank" rel="noopener noreferrer">Open Admin Dashboard</a></p>
      <div class="row">
        <input id="usernameInput" placeholder="username" maxlength="24" />
        <button class="primary" id="joinBtn">Join</button>
      </div>
      <p id="joinMsg" class="muted"></p>
    </div>

    <div class="card hidden" id="playerCard">
      <div class="row">
        <span class="badge" id="phaseBadge">Phase: lobby</span>
        <span class="badge" id="timerBadge">Time: 20s</span>
        <span class="badge" id="scoreBadge">Score: 0</span>
      </div>
      <h2 id="questionText">Waiting for admin to start...</h2>
      <div class="grid" id="optionsGrid"></div>
      <p id="statusMsg" class="muted"></p>
    </div>

    <div class="card hidden" id="revealCard">
      <h2>Round Results</h2>
      <p id="correctAnswerText"></p>
      <div id="chart"></div>
    </div>

    <div class="card hidden" id="leaderboardCard">
      <h2>Leaderboard</h2>
      <table>
        <thead>
          <tr><th>#</th><th>Username</th><th>Score</th></tr>
        </thead>
        <tbody id="leaderboardBody"></tbody>
      </table>
      <p class="muted">Showing for 5 seconds between questions.</p>
    </div>
  </div>
  `,
  `
  const socket = io();

  const joinCard = document.getElementById("joinCard");
  const playerCard = document.getElementById("playerCard");
  const revealCard = document.getElementById("revealCard");
  const leaderboardCard = document.getElementById("leaderboardCard");

  const usernameInput = document.getElementById("usernameInput");
  const joinBtn = document.getElementById("joinBtn");
  const joinMsg = document.getElementById("joinMsg");

  const phaseBadge = document.getElementById("phaseBadge");
  const timerBadge = document.getElementById("timerBadge");
  const scoreBadge = document.getElementById("scoreBadge");
  const questionText = document.getElementById("questionText");
  const optionsGrid = document.getElementById("optionsGrid");
  const statusMsg = document.getElementById("statusMsg");

  const correctAnswerText = document.getElementById("correctAnswerText");
  const chart = document.getElementById("chart");
  const leaderboardBody = document.getElementById("leaderboardBody");

  let joined = false;
  let currentQuestion = null;

  joinBtn.addEventListener("click", () => {
    const username = usernameInput.value.trim();
    if (!username) {
      joinMsg.textContent = "Please enter a username.";
      return;
    }
    socket.emit("player:join", { username });
  });

  socket.on("player:join:result", (res) => {
    if (!res.ok) {
      joinMsg.textContent = res.message;
      return;
    }
    joined = true;
    joinCard.classList.add("hidden");
    playerCard.classList.remove("hidden");
    joinMsg.textContent = "";
  });

  function renderLeaderboard(list) {
    leaderboardBody.innerHTML = "";
    list.forEach((item, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = \`<td>\${i + 1}</td><td>\${item.username}</td><td>\${item.score}</td>\`;
      leaderboardBody.appendChild(tr);
    });
  }

  function renderOptions(state) {
    optionsGrid.innerHTML = "";
    if (!state.question) return;

    state.question.options.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.className = "option";
      btn.textContent = \`\${String.fromCharCode(65 + idx)}. \${opt}\`;

      const disabled = !state.timerRunning || state.hasAnswered || state.phase !== "question";
      btn.disabled = disabled;

      if (state.phase === "reveal" && state.revealData) {
        if (idx === state.revealData.correctIndex) btn.classList.add("correct");
        if (state.selectedOption === idx && idx !== state.revealData.correctIndex) {
          btn.classList.add("wrong");
        }
      }

      btn.addEventListener("click", () => {
        socket.emit("player:answer", { optionIndex: idx });
      });

      optionsGrid.appendChild(btn);
    });
  }

  function renderChart(revealData) {
    chart.innerHTML = "";
    const total = revealData.optionCounts.reduce((a, b) => a + b, 0);

    revealData.optionCounts.forEach((count, idx) => {
      const percent = total === 0 ? 0 : Math.round((count / total) * 100);
      const row = document.createElement("div");
      row.className = "chart-row";
      row.innerHTML = \`
        <div>\${String.fromCharCode(65 + idx)}: \${count}</div>
        <div class="bar-wrap"><div class="bar" style="width:\${percent}%"></div></div>
      \`;
      chart.appendChild(row);
    });
  }

  socket.on("player:state", (state) => {
    if (!joined) return;

    phaseBadge.textContent = \`Phase: \${state.phase}\`;
    timerBadge.textContent = \`Time: \${state.timeLeft}s\`;
    scoreBadge.textContent = \`Score: \${state.score}\`;

    playerCard.classList.remove("hidden");
    revealCard.classList.add("hidden");
    leaderboardCard.classList.add("hidden");

    if (state.phase === "question" && state.question) {
      currentQuestion = state.question;
      questionText.textContent = currentQuestion.text;
      statusMsg.textContent = state.hasAnswered
        ? "Answer locked. Waiting for timer to end."
        : state.timerRunning
        ? "Choose one option. You cannot change it later."
        : "Timer paused by admin.";
      renderOptions(state);
      return;
    }

    if (state.phase === "reveal" && state.revealData) {
      questionText.textContent = currentQuestion ? currentQuestion.text : "Question";
      renderOptions(state);
      revealCard.classList.remove("hidden");
      const correct = String.fromCharCode(65 + state.revealData.correctIndex);
      correctAnswerText.textContent = \`Correct answer: \${correct}\`;
      renderChart(state.revealData);
      statusMsg.textContent = "";
      return;
    }

    if (state.phase === "leaderboard" || state.phase === "ended") {
      leaderboardCard.classList.remove("hidden");
      renderLeaderboard(state.leaderboard || []);
      questionText.textContent = state.phase === "ended" ? "Quiz complete." : "Leaderboard";
      optionsGrid.innerHTML = "";
      statusMsg.textContent = state.phase === "ended" ? "Thanks for playing." : "";
      return;
    }

    questionText.textContent = "Waiting for admin to start...";
    optionsGrid.innerHTML = "";
    statusMsg.textContent = "";
  });
  `
);

const adminPage = renderLayout(
  "Quiz Admin",
  `
  <div class="container">
    <div class="card" id="loginCard">
      <h1>Admin Login</h1>
      <div class="row">
        <input id="passwordInput" type="password" placeholder="Admin password" />
        <button class="primary" id="loginBtn">Login</button>
      </div>
      <p class="muted" id="loginMsg"></p>
    </div>

    <div class="card hidden" id="controlsCard">
      <h1>Admin Dashboard</h1>
      <div class="row">
        <span class="badge" id="phaseBadge">Phase: lobby</span>
        <span class="badge" id="playersBadge">Players: 0</span>
        <span class="badge" id="timerBadge">Time: 20s</span>
      </div>
      <div class="row" style="margin-top: 12px;">
        <button class="primary" id="startBtn">Start</button>
        <button id="pauseBtn">Pause</button>
        <button id="resumeBtn">Resume</button>
        <button class="warn" id="skipBtn">Skip Leaderboard</button>
      </div>
    </div>

    <div class="card">
      <h2>Live Leaderboard</h2>
      <table>
        <thead>
          <tr><th>#</th><th>Username</th><th>Score</th></tr>
        </thead>
        <tbody id="leaderboardBody"></tbody>
      </table>
    </div>
  </div>
  `,
  `
  const socket = io();

  const loginCard = document.getElementById("loginCard");
  const controlsCard = document.getElementById("controlsCard");
  const passwordInput = document.getElementById("passwordInput");
  const loginBtn = document.getElementById("loginBtn");
  const loginMsg = document.getElementById("loginMsg");

  const phaseBadge = document.getElementById("phaseBadge");
  const playersBadge = document.getElementById("playersBadge");
  const timerBadge = document.getElementById("timerBadge");

  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resumeBtn = document.getElementById("resumeBtn");
  const skipBtn = document.getElementById("skipBtn");
  const leaderboardBody = document.getElementById("leaderboardBody");

  let isAuthenticated = false;

  function updateAuthUI() {
    if (isAuthenticated) {
      loginCard.classList.add("hidden");
      controlsCard.classList.remove("hidden");
    } else {
      loginCard.classList.remove("hidden");
      controlsCard.classList.add("hidden");
    }
  }

  updateAuthUI();

  loginBtn.addEventListener("click", () => {
    const password = passwordInput.value;
    socket.emit("admin:login", { password });
  });

  startBtn.addEventListener("click", () => {
    if (!isAuthenticated) return;
    socket.emit("admin:start");
  });

  pauseBtn.addEventListener("click", () => {
    if (!isAuthenticated) return;
    socket.emit("admin:pause");
  });

  resumeBtn.addEventListener("click", () => {
    if (!isAuthenticated) return;
    socket.emit("admin:resume");
  });

  skipBtn.addEventListener("click", () => {
    if (!isAuthenticated) return;
    socket.emit("admin:skipLeaderboard");
  });

  function renderLeaderboard(list) {
    leaderboardBody.innerHTML = "";
    list.forEach((item, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = \`<td>\${i + 1}</td><td>\${item.username}</td><td>\${item.score}</td>\`;
      leaderboardBody.appendChild(tr);
    });
  }

  socket.on("admin:state", (state) => {
    phaseBadge.textContent = \`Phase: \${state.phase}\`;
    playersBadge.textContent = \`Players: \${state.joinedPlayers}\`;
    timerBadge.textContent = \`Time: \${state.timeLeft}s\`;

    skipBtn.disabled = state.phase !== "leaderboard";
    pauseBtn.disabled = !(state.phase === "question" && state.timerRunning);
    resumeBtn.disabled = !(state.phase === "question" && !state.timerRunning && state.timeLeft > 0);

    renderLeaderboard(state.leaderboard || []);
  });

  socket.on("admin:login:result", (res) => {
    if (!res.ok) {
      isAuthenticated = false;
      updateAuthUI();
      loginMsg.textContent = res.message || "Login failed.";
      return;
    }

    isAuthenticated = true;
    loginMsg.textContent = "";
    passwordInput.value = "";
    updateAuthUI();
  });

  socket.on("admin:auth:required", (res) => {
    isAuthenticated = false;
    updateAuthUI();
    loginMsg.textContent = (res && res.message) || "Admin authentication required.";
  });
  `
);

app.get("/", (_req, res) => {
  res.type("html").send(playerPage);
});

app.get("/admin", (_req, res) => {
  res.type("html").send(adminPage);
});

const QUESTIONS = [
  {
    id: 1,
    text: "Which of the following is not a function of an operating system?",
    options: ["Process management", "Memory management", "Database management", "File system management"],
    correctIndex: 2,
  },
  {
    id: 2,
    text: "A process is:",
    options: ["A program in execution", "A program in storage", "A compiled file", "A system call"],
    correctIndex: 0,
  },
  {
    id: 3,
    text: "Which scheduling algorithm may cause starvation?",
    options: ["FCFS", "Round Robin", "SJF", "FIFO"],
    correctIndex: 2,
  },
  {
    id: 4,
    text: "Context switching occurs when:",
    options: ["CPU switches from one process to another", "Process terminates", "System boots", "File is opened"],
    correctIndex: 0,
  },
  {
    id: 5,
    text: "Time quantum is used in:",
    options: ["FCFS", "SJF", "Round Robin", "Priority Scheduling"],
    correctIndex: 2,
  },
  {
    id: 6,
    text: "Which is a preemptive scheduling algorithm?",
    options: ["FCFS", "SJF (non-preemptive)", "Round Robin", "FIFO"],
    correctIndex: 2,
  },
  {
    id: 7,
    text: "Deadlock occurs when:",
    options: ["Processes compete for CPU", "Processes wait indefinitely for resources", "CPU is idle", "Memory is full"],
    correctIndex: 1,
  },
  {
    id: 8,
    text: "Which is NOT a deadlock condition?",
    options: ["Mutual exclusion", "Hold and wait", "Preemption", "Circular wait"],
    correctIndex: 2,
  },
  {
    id: 9,
    text: "Paging helps to:",
    options: ["Eliminate external fragmentation", "Increase CPU speed", "Reduce processes", "Delete memory"],
    correctIndex: 0,
  },
  {
    id: 10,
    text: "A page fault occurs when:",
    options: ["Page is not in memory", "CPU fails", "Disk crashes", "File is deleted"],
    correctIndex: 0,
  },
  {
    id: 11,
    text: "Virtual memory is:",
    options: ["Physical RAM", "Secondary storage used as RAM", "Cache memory", "CPU register"],
    correctIndex: 1,
  },
  {
    id: 12,
    text: "Thrashing occurs when:",
    options: ["CPU is overloaded", "Too many page faults occur", "Disk fails", "Files are corrupted"],
    correctIndex: 1,
  },
  {
    id: 13,
    text: "Which of the following is used for process synchronization?",
    options: ["Compiler", "Semaphore", "Loader", "Assembler"],
    correctIndex: 1,
  },
  {
    id: 14,
    text: "Binary semaphore is also known as:",
    options: ["Mutex", "Monitor", "Thread", "Process"],
    correctIndex: 0,
  },
  {
    id: 15,
    text: "Critical section is:",
    options: ["Part of code accessing shared resources", "Error section", "Memory space", "CPU register"],
    correctIndex: 0,
  },
  {
    id: 16,
    text: "Race condition occurs when:",
    options: ["Processes run fast", "Output depends on execution order", "CPU crashes", "Memory leaks"],
    correctIndex: 1,
  },
  {
    id: 17,
    text: "Which memory is fastest?",
    options: ["RAM", "Cache", "Hard disk", "Virtual memory"],
    correctIndex: 1,
  },
  {
    id: 18,
    text: "File system manages:",
    options: ["CPU", "Files and directories", "Memory only", "Processes only"],
    correctIndex: 1,
  },
  {
    id: 19,
    text: "Absolute path starts from:",
    options: ["Current directory", "Root directory", "Parent directory", "File"],
    correctIndex: 1,
  },
  {
    id: 20,
    text: "System call is:",
    options: ["Request to OS services", "Program error", "CPU instruction", "File"],
    correctIndex: 0,
  },
  {
    id: 21,
    text: "Which of the following is not a scheduling criteria?",
    options: ["Turnaround time", "Waiting time", "Compilation time", "Response time"],
    correctIndex: 2,
  },
  {
    id: 22,
    text: "A thread is:",
    options: ["Lightweight process", "Heavy process", "File", "Memory unit"],
    correctIndex: 0,
  },
  {
    id: 23,
    text: "Which algorithm uses priority?",
    options: ["Priority Scheduling", "FCFS", "FIFO", "SJF only"],
    correctIndex: 0,
  },
  {
    id: 24,
    text: "Internal fragmentation occurs in:",
    options: ["Paging", "Segmentation", "Both", "None"],
    correctIndex: 0,
  },
  {
    id: 25,
    text: "External fragmentation occurs in:",
    options: ["Paging", "Segmentation", "Cache", "Registers"],
    correctIndex: 1,
  },
  {
    id: 26,
    text: "Banker's Algorithm is used for:",
    options: ["Scheduling", "Deadlock avoidance", "Memory allocation", "File handling"],
    correctIndex: 1,
  },
  {
    id: 27,
    text: "Which is not a file access method?",
    options: ["Sequential", "Direct", "Indexed", "Compiled"],
    correctIndex: 3,
  },
  {
    id: 28,
    text: "Multiprogramming increases:",
    options: ["CPU utilization", "Disk size", "Memory size", "File count"],
    correctIndex: 0,
  },
  {
    id: 29,
    text: "Which is a kernel function?",
    options: ["Text editing", "Process scheduling", "Gaming", "Browsing"],
    correctIndex: 1,
  },
  {
    id: 30,
    text: "Which OS component interacts directly with hardware?",
    options: ["Shell", "Kernel", "Application", "User"],
    correctIndex: 1,
  },
];

const gameState = {
  phase: "lobby",
  players: new Map(),
  usernameToSocket: new Map(),
  currentQuestionIndex: 0,
  timeLeft: 20,
  timerRunning: false,
  timerInterval: null,
  answers: new Map(),
  correctOrder: [],
  optionCounts: [0, 0, 0, 0],
  adminSocketId: null,
  adminSockets: new Set(),
  leaderboardTimeout: null,
};

function getSanitizedStateForPlayer(socketId) {
  const q = QUESTIONS[gameState.currentQuestionIndex] || null;
  const player = gameState.players.get(socketId);

  return {
    phase: gameState.phase,
    questionIndex: gameState.currentQuestionIndex,
    totalQuestions: QUESTIONS.length,
    timeLeft: gameState.timeLeft,
    timerRunning: gameState.timerRunning,
    question:
      gameState.phase === "question" && q
        ? {
            id: q.id,
            text: q.text,
            options: q.options,
          }
        : null,
    score: player ? player.score : 0,
    hasAnswered: gameState.answers.has(socketId),
    selectedOption: gameState.answers.get(socketId),
    revealData:
      gameState.phase === "reveal"
        ? {
            correctIndex: q ? q.correctIndex : null,
            optionCounts: [...gameState.optionCounts],
          }
        : null,
    leaderboard:
      gameState.phase === "leaderboard" || gameState.phase === "ended"
        ? buildLeaderboard()
        : [],
    joinedPlayers: gameState.usernameToSocket.size,
  };
}

function buildLeaderboard() {
  return [...gameState.players.values()]
    .filter((player) => player.connected)
    .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username))
    .map((player) => ({ username: player.username, score: player.score }));
}

function broadcastAdminState() {
  io.emit("admin:state", {
    phase: gameState.phase,
    joinedPlayers: gameState.usernameToSocket.size,
    timerRunning: gameState.timerRunning,
    timeLeft: gameState.timeLeft,
    currentQuestionIndex: gameState.currentQuestionIndex,
    totalQuestions: QUESTIONS.length,
    leaderboard: buildLeaderboard(),
  });
}

function broadcastPlayerState() {
  for (const [socketId] of gameState.players.entries()) {
    io.to(socketId).emit("player:state", getSanitizedStateForPlayer(socketId));
  }
}

function clearTimer() {
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;
  }
  gameState.timerRunning = false;
}

function clearLeaderboardTimeout() {
  if (gameState.leaderboardTimeout) {
    clearTimeout(gameState.leaderboardTimeout);
    gameState.leaderboardTimeout = null;
  }
}

function setPhase(phase) {
  gameState.phase = phase;
  broadcastAdminState();
  broadcastPlayerState();
}

function resetQuestionRound() {
  gameState.timeLeft = 20;
  gameState.answers.clear();
  gameState.correctOrder = [];
  gameState.optionCounts = [0, 0, 0, 0];
}

function startQuestion() {
  if (gameState.currentQuestionIndex >= QUESTIONS.length) {
    setPhase("ended");
    return;
  }

  clearLeaderboardTimeout();
  resetQuestionRound();
  setPhase("question");
  resumeTimer();
}

function finalizeRound() {
  clearTimer();
  setPhase("reveal");

  setTimeout(() => {
    if (gameState.phase !== "reveal") return;
    showLeaderboard();
  }, 5000);
}

function showLeaderboard() {
  clearTimer();
  clearLeaderboardTimeout();
  setPhase("leaderboard");

  gameState.leaderboardTimeout = setTimeout(() => {
    gameState.currentQuestionIndex += 1;
    if (gameState.currentQuestionIndex >= QUESTIONS.length) {
      setPhase("ended");
      return;
    }
    startQuestion();
  }, 5000);
}

function startTimerInterval() {
  clearTimer();
  gameState.timerRunning = true;
  gameState.timerInterval = setInterval(() => {
    if (!gameState.timerRunning) return;

    gameState.timeLeft -= 1;

    if (gameState.timeLeft <= 0) {
      gameState.timeLeft = 0;
      broadcastAdminState();
      broadcastPlayerState();
      finalizeRound();
      return;
    }

    broadcastAdminState();
    broadcastPlayerState();
  }, 1000);

  broadcastAdminState();
  broadcastPlayerState();
}

function resumeTimer() {
  if (gameState.phase !== "question") return;
  if (gameState.timeLeft <= 0) return;
  if (gameState.timerRunning) return;
  startTimerInterval();
}

function pauseTimer() {
  if (gameState.phase !== "question") return;
  clearTimer();
  broadcastAdminState();
  broadcastPlayerState();
}

function registerAnswer(socketId, optionIndex) {
  if (gameState.phase !== "question") return;
  if (!gameState.timerRunning) return;
  if (gameState.answers.has(socketId)) return;

  const question = QUESTIONS[gameState.currentQuestionIndex];
  if (!question) return;

  const parsed = Number(optionIndex);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 3) return;

  gameState.answers.set(socketId, parsed);
  gameState.optionCounts[parsed] += 1;

  if (parsed === question.correctIndex) {
    const rank = gameState.correctOrder.length;
    const points = Math.max(0, 2000 - rank * 50);
    gameState.correctOrder.push(socketId);
    const player = gameState.players.get(socketId);
    if (player) {
      player.score += points;
    }
  }

  broadcastAdminState();
  broadcastPlayerState();
}

io.on("connection", (socket) => {
  socket.emit("server:hello", { ok: true });

  function isAdminAuthenticated() {
    return gameState.adminSockets.has(socket.id);
  }

  function requireAdminAuth() {
    if (isAdminAuthenticated()) return true;
    socket.emit("admin:auth:required", {
      ok: false,
      message: "Admin authentication required.",
    });
    return false;
  }

  socket.on("player:join", ({ username }) => {
    const clean = String(username || "").trim().toLowerCase();
    if (!clean) {
      socket.emit("player:join:result", {
        ok: false,
        message: "Username is required.",
      });
      return;
    }

    if (gameState.usernameToSocket.has(clean)) {
      socket.emit("player:join:result", {
        ok: false,
        message: "Username already taken.",
      });
      return;
    }

    const player = { username: clean, score: 0, connected: true };
    gameState.players.set(socket.id, player);
    gameState.usernameToSocket.set(clean, socket.id);

    socket.emit("player:join:result", { ok: true, username: clean });
    socket.emit("player:state", getSanitizedStateForPlayer(socket.id));
    broadcastAdminState();
    broadcastPlayerState();
  });

  socket.on("admin:login", ({ password }) => {
    const provided = String(password || "");
    if (provided !== ADMIN_PASSWORD) {
      socket.emit("admin:login:result", {
        ok: false,
        message: "Incorrect admin password.",
      });
      return;
    }

    gameState.adminSockets.add(socket.id);
    gameState.adminSocketId = socket.id;
    socket.emit("admin:login:result", { ok: true });
    broadcastAdminState();
  });

  socket.on("admin:start", () => {
    if (!requireAdminAuth()) return;
    if (gameState.phase === "question") return;
    if (gameState.phase === "ended") {
      gameState.currentQuestionIndex = 0;
      for (const player of gameState.players.values()) {
        player.score = 0;
      }
    }
    startQuestion();
  });

  socket.on("admin:pause", () => {
    if (!requireAdminAuth()) return;
    pauseTimer();
  });

  socket.on("admin:resume", () => {
    if (!requireAdminAuth()) return;
    resumeTimer();
  });

  socket.on("admin:skipLeaderboard", () => {
    if (!requireAdminAuth()) return;
    if (gameState.phase !== "leaderboard") return;
    clearLeaderboardTimeout();
    gameState.currentQuestionIndex += 1;
    if (gameState.currentQuestionIndex >= QUESTIONS.length) {
      setPhase("ended");
      return;
    }
    startQuestion();
  });

  socket.on("player:answer", ({ optionIndex }) => {
    registerAnswer(socket.id, optionIndex);
  });

  socket.on("disconnect", () => {
    const player = gameState.players.get(socket.id);
    if (player) {
      gameState.usernameToSocket.delete(player.username);
      gameState.players.delete(socket.id);
      gameState.answers.delete(socket.id);
    }

    gameState.adminSockets.delete(socket.id);
    if (gameState.adminSocketId === socket.id) {
      gameState.adminSocketId = null;
    }

    broadcastAdminState();
    broadcastPlayerState();
  });
});

server.listen(PORT, () => {
  console.log(`Quiz app running on http://localhost:${PORT}`);
  console.log("Open /admin for admin controls and / for players.");
});
