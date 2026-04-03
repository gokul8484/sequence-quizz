const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = "gokuldevi";

app.use(express.static(path.join(__dirname, "public")));
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/admin", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
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
  phase: "lobby", // lobby | question | reveal | leaderboard | ended
  players: new Map(), // socket.id => { username, score, connected }
  usernameToSocket: new Map(),
  currentQuestionIndex: 0,
  timeLeft: 20,
  timerRunning: false,
  timerInterval: null,
  answers: new Map(), // socket.id => optionIndex
  correctOrder: [], // socket ids by order of correct answers
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
    .filter((p) => p.connected)
    .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username))
    .map((p) => ({ username: p.username, score: p.score }));
}

function getPublicQuestion() {
  const q = QUESTIONS[gameState.currentQuestionIndex];
  if (!q) return null;
  return {
    id: q.id,
    text: q.text,
    options: q.options,
    totalQuestions: QUESTIONS.length,
    index: gameState.currentQuestionIndex,
  };
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

  const q = QUESTIONS[gameState.currentQuestionIndex];
  if (!q) return;

  const parsed = Number(optionIndex);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 3) return;

  gameState.answers.set(socketId, parsed);
  gameState.optionCounts[parsed] += 1;

  if (parsed === q.correctIndex) {
    const rank = gameState.correctOrder.length;
    const points = Math.max(0, 2000 - rank * 50);
    gameState.correctOrder.push(socketId);
    const p = gameState.players.get(socketId);
    if (p) {
      p.score += points;
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
      for (const p of gameState.players.values()) {
        p.score = 0;
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
  console.log("Open /admin.html for admin controls and / for players.");
});
