const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const syncStatusEl = document.getElementById("sync-status");
const modeGateEl = document.getElementById("mode-gate");
const modePromptEl = document.getElementById("mode-prompt");
const singleModeBtn = document.getElementById("single-mode-btn");
const multiModeBtn = document.getElementById("multi-mode-btn");
const modalBackdropEl = document.getElementById("modal-backdrop");
const modeModalEl = document.getElementById("mode-modal");
const modalSingleBtn = document.getElementById("modal-single-btn");
const modalMultiBtn = document.getElementById("modal-multi-btn");
const singleCardEl = document.getElementById("single-card");
const difficultyEasyBtn = document.getElementById("difficulty-easy-btn");
const difficultyMediumBtn = document.getElementById("difficulty-medium-btn");
const difficultyHardBtn = document.getElementById("difficulty-hard-btn");
const soundToggleBtn = document.getElementById("sound-toggle-btn");
const roomModalEl = document.getElementById("room-modal");
const roomModalTitleEl = document.getElementById("room-modal-title");
const roomModalTextEl = document.getElementById("room-modal-text");
const roomModalCopyBtn = document.getElementById("room-modal-copy-btn");
const roomModalCloseBtn = document.getElementById("room-modal-close-btn");
const resultModalEl = document.getElementById("result-modal");
const resultModalTextEl = document.getElementById("result-modal-text");
const resultNewGameBtn = document.getElementById("result-new-game-btn");
const resultCloseBtn = document.getElementById("result-close-btn");
const multiplayerCardEl = document.getElementById("multiplayer-card");
const accountNameEl = document.getElementById("account-name");
const roomMetaEl = document.getElementById("room-meta");
const createRoomBtn = document.getElementById("create-room-btn");
const joinRoomBtn = document.getElementById("join-room-btn");
const leaveRoomBtn = document.getElementById("leave-room-btn");
const roomCodeInput = document.getElementById("room-code-input");
const movesBodyEl = document.getElementById("moves-body");
const undoBtn = document.getElementById("undo-btn");
const resetBtn = document.getElementById("reset-btn");
const topFilesEl = document.getElementById("top-files");
const bottomFilesEl = document.getElementById("bottom-files");
const leftRanksEl = document.getElementById("left-ranks");
const rightRanksEl = document.getElementById("right-ranks");

const IS_NATIVE_HOST = /(?:\?|&)native=1(?:&|$)/.test(window.location.search) && Boolean(window.NativeAuth);

const PIECE_UNICODE = {
  wp: "\u2659",
  wn: "\u2658",
  wb: "\u2657",
  wr: "\u2656",
  wq: "\u2655",
  wk: "\u2654",
  bp: "\u265F",
  bn: "\u265E",
  bb: "\u265D",
  br: "\u265C",
  bq: "\u265B",
  bk: "\u265A",
};

const FILES = "abcdefgh";
const RANKS = "87654321";

const game = createInitialGame();
let selected = null;
let legalMovesFromSelected = [];
let db = null;
let currentUser = null;
let currentRoomId = null;
let roomUnsubscribe = null;
let ignoreRemoteOnce = false;
let botTimer = null;
let lastResultModalKey = "";
let roomModalCode = "";
let isOnline = navigator.onLine;

const IS_FIREBASE_READY = Boolean(window.firebase && window.FIREBASE_CONFIG && IS_NATIVE_HOST);

initializeBoardLabels();
setupRealtime();
render();

boardEl.addEventListener("click", onBoardClick);
undoBtn.addEventListener("click", undoMove);
resetBtn.addEventListener("click", () => {
  const prevMode = game.mode;
  const prevBotColor = game.botColor;
  const prevBotDifficulty = game.botDifficulty;
  const prevSoundEnabled = game.soundEnabled;
  Object.assign(game, createInitialGame());
  game.mode = prevMode;
  game.botColor = prevBotColor;
  game.botDifficulty = prevBotDifficulty;
  game.soundEnabled = prevSoundEnabled;
  lastResultModalKey = "";
  if (currentRoomId) {
    game.isMultiplayer = true;
    game.roomId = currentRoomId;
  }
  selected = null;
  legalMovesFromSelected = [];
  scheduleBotMoveIfNeeded();
  pushRoomState();
  render();
});
createRoomBtn.addEventListener("click", createRoom);
joinRoomBtn.addEventListener("click", () => joinRoom(roomCodeInput.value.trim()));
leaveRoomBtn.addEventListener("click", leaveRoom);
singleModeBtn.addEventListener("click", chooseSinglePlayer);
multiModeBtn.addEventListener("click", chooseMultiplayer);
modalSingleBtn.addEventListener("click", chooseSinglePlayer);
modalMultiBtn.addEventListener("click", chooseMultiplayer);
roomModalCloseBtn.addEventListener("click", closeAllModals);
resultCloseBtn.addEventListener("click", closeAllModals);
modalBackdropEl.addEventListener("click", closeAllModals);
roomModalCopyBtn.addEventListener("click", copyRoomCode);
  resultNewGameBtn.addEventListener("click", () => {
    closeAllModals();
    resetBtn.click();
  });
difficultyEasyBtn.addEventListener("click", () => setBotDifficulty("easy"));
difficultyMediumBtn.addEventListener("click", () => setBotDifficulty("medium"));
difficultyHardBtn.addEventListener("click", () => setBotDifficulty("hard"));
soundToggleBtn.addEventListener("click", toggleSound);
window.addEventListener("online", () => {
  isOnline = true;
  setSyncStatus();
});
window.addEventListener("offline", () => {
  isOnline = false;
  syncStatusEl.textContent = "Offline. Reconnect to continue multiplayer sync.";
});

function createInitialGame() {
  return {
    board: createInitialBoard(),
    turn: "w",
    moveHistory: [],
    pastStates: [],
    castlingRights: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    gameOver: false,
    result: "",
    mode: null,
    botColor: "b",
    botDifficulty: "medium",
    soundEnabled: true,
    isMultiplayer: false,
    roomId: null,
    myColor: null,
  };
}

function createInitialBoard() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  board[0] = ["br", "bn", "bb", "bq", "bk", "bb", "bn", "br"];
  board[1] = Array(8).fill("bp");
  board[6] = Array(8).fill("wp");
  board[7] = ["wr", "wn", "wb", "wq", "wk", "wb", "wn", "wr"];
  return board;
}

function closeAllModals() {
  modalBackdropEl.hidden = true;
  modeModalEl.hidden = true;
  roomModalEl.hidden = true;
  resultModalEl.hidden = true;
}

function openModeModal() {
  closeAllModals();
  modalBackdropEl.hidden = false;
  modeModalEl.hidden = false;
}

function openRoomModal(title, text, code = "") {
  roomModalCode = code;
  roomModalTitleEl.textContent = title;
  roomModalTextEl.textContent = text;
  roomModalCopyBtn.style.display = code ? "inline-block" : "none";
  closeAllModals();
  modalBackdropEl.hidden = false;
  roomModalEl.hidden = false;
}

function openResultModal(resultText) {
  resultModalTextEl.textContent = resultText;
  closeAllModals();
  modalBackdropEl.hidden = false;
  resultModalEl.hidden = false;
}

async function copyRoomCode() {
  if (!roomModalCode) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(roomModalCode);
      roomModalTextEl.textContent = `Room code copied: ${roomModalCode}`;
    } else {
      roomCodeInput.value = roomModalCode;
      roomCodeInput.focus();
      roomCodeInput.select();
      roomModalTextEl.textContent = `Code selected: ${roomModalCode}`;
    }
  } catch (_) {
    roomCodeInput.value = roomModalCode;
    roomCodeInput.focus();
    roomCodeInput.select();
    roomModalTextEl.textContent = `Copy failed. Code selected: ${roomModalCode}`;
  }
}

function setBotDifficulty(level) {
  game.botDifficulty = level;
  updateDifficultyButtons();
}

function updateDifficultyButtons() {
  const level = game.botDifficulty;
  difficultyEasyBtn.className = `btn ${level === "easy" ? "btn-primary" : "btn-muted"}`;
  difficultyMediumBtn.className = `btn ${level === "medium" ? "btn-primary" : "btn-muted"}`;
  difficultyHardBtn.className = `btn ${level === "hard" ? "btn-primary" : "btn-muted"}`;
}

function toggleSound() {
  game.soundEnabled = !game.soundEnabled;
  soundToggleBtn.textContent = `Sound: ${game.soundEnabled ? "On" : "Off"}`;
}

function playMoveSound(capture = false) {
  if (!game.soundEnabled) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = capture ? 320 : 520;
  gain.gain.value = 0.02;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.07);
}

function chooseSinglePlayer() {
  if (!currentUser) return;
  closeAllModals();
  leaveRoom();
  Object.assign(game, createInitialGame());
  game.mode = "single";
  game.botColor = "b";
  lastResultModalKey = "";
  selected = null;
  legalMovesFromSelected = [];
  refreshModeUI();
  render();
}

function chooseMultiplayer() {
  if (!currentUser) return;
  closeAllModals();
  leaveRoom();
  Object.assign(game, createInitialGame());
  game.mode = "multi";
  lastResultModalKey = "";
  selected = null;
  legalMovesFromSelected = [];
  refreshModeUI();
  render();
}

function refreshModeUI() {
  const signedIn = Boolean(currentUser);
  const modeChosen = Boolean(game.mode);
  modeGateEl.style.display = "none";
  singleCardEl.classList.add("is-hidden");
  multiplayerCardEl.classList.add("is-hidden");

  if (!signedIn) {
    game.mode = null;
    modePromptEl.textContent = "Sign in first to continue.";
    closeAllModals();
    return;
  }

  if (!modeChosen) {
    modePromptEl.textContent = "Choose how you want to play.";
    openModeModal();
    return;
  }

  if (game.mode === "single") {
    singleCardEl.classList.remove("is-hidden");
  }

  if (game.mode === "multi") {
    multiplayerCardEl.classList.remove("is-hidden");
  }

  if (game.mode === "single") {
    syncStatusEl.textContent = "Single-player mode (you are White, bot is Black).";
  } else if (!currentRoomId) {
    syncStatusEl.textContent = "Multiplayer mode. Create or join a room.";
  }

  updateDifficultyButtons();
  soundToggleBtn.textContent = `Sound: ${game.soundEnabled ? "On" : "Off"}`;
}

function setupRealtime() {
  if (!IS_NATIVE_HOST) {
    syncStatusEl.textContent = "This build is Android-only.";
    setAuthButtons();
    refreshModeUI();
    return;
  }

  const displayName = window.NativeAuth.getDisplayName?.() || "Player";
  const email = window.NativeAuth.getEmail?.() || "";
  currentUser = { uid: email || displayName, displayName, email };
  accountNameEl.textContent = email ? `${displayName} (${email})` : displayName;

  if (!IS_FIREBASE_READY) {
    syncStatusEl.textContent = "Signed in on device. Local mode (add firebase-config.js for online play)";
    setAuthButtons();
    refreshModeUI();
    return;
  }

  firebase.initializeApp(window.FIREBASE_CONFIG);
  db = firebase.firestore();

  setAuthButtons();
  setSyncStatus();
  refreshModeUI();
}

function setAuthButtons() {
  const signedIn = Boolean(currentUser);
  singleModeBtn.disabled = !signedIn;
  multiModeBtn.disabled = !signedIn;
  createRoomBtn.disabled = !signedIn || game.mode !== "multi";
  joinRoomBtn.disabled = !signedIn || game.mode !== "multi";
  leaveRoomBtn.disabled = !currentRoomId || game.mode !== "multi";
}

function setSyncStatus() {
  if (!isOnline) {
    syncStatusEl.textContent = "Offline. Reconnect to continue multiplayer sync.";
    return;
  }
  if (!IS_FIREBASE_READY) return;
  if (!currentUser) {
    syncStatusEl.textContent = "Online disabled (sign in required)";
    return;
  }
  if (!currentRoomId) {
    syncStatusEl.textContent = "Signed in. Not in a room.";
    return;
  }
  const color = game.myColor === "w" ? "White" : "Black";
  syncStatusEl.textContent = `Connected room ${currentRoomId} as ${color}`;
}

function generateRoomId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function createRoom() {
  if (!isOnline) {
    syncStatusEl.textContent = "You are offline. Connect internet to create a room.";
    return;
  }
  if (game.mode !== "multi") {
    syncStatusEl.textContent = "Choose Multiplayer mode first.";
    return;
  }
  if (!db || !currentUser) return;
  leaveRoom();

  let roomId = "";
  let ref = null;
  let foundUniqueCode = false;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    roomId = generateRoomId();
    ref = db.collection("rooms").doc(roomId);
    const existing = await ref.get();
    if (!existing.exists) {
      foundUniqueCode = true;
      break;
    }
  }

  if (!ref || !foundUniqueCode) {
    syncStatusEl.textContent = "Could not create room. Please try again.";
    return;
  }

  const fresh = createInitialGame();
  fresh.mode = "multi";
  fresh.isMultiplayer = true;
  fresh.roomId = roomId;
  fresh.myColor = "w";
  Object.assign(game, fresh);

  try {
    await ref.set({
      roomId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      hostUid: currentUser.uid,
      hostName: currentUser.displayName || currentUser.email || "Host",
      players: {
        w: { uid: currentUser.uid, name: currentUser.displayName || currentUser.email || "White" },
        b: null,
      },
      gameState: exportGameState(),
    });
  } catch (err) {
    syncStatusEl.textContent = `Create room failed: ${err.message || "Unknown error"}`;
    return;
  }

  subscribeRoom(roomId, "w");
  roomCodeInput.value = roomId;
  roomMetaEl.textContent = `Room created. Share this code: ${roomId}`;
  syncStatusEl.textContent = `Room ${roomId} ready. Waiting for opponent.`;
  openRoomModal("Room Created", `Share this code with your friend: ${roomId}`, roomId);
}

async function joinRoom(roomId) {
  if (!isOnline) {
    syncStatusEl.textContent = "You are offline. Connect internet to join a room.";
    return;
  }
  if (game.mode !== "multi") {
    syncStatusEl.textContent = "Choose Multiplayer mode first.";
    return;
  }
  const code = String(roomId || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  if (!db || !currentUser || !code) {
    syncStatusEl.textContent = "Enter a valid room code.";
    return;
  }
  leaveRoom();

  const ref = db.collection("rooms").doc(code);
  let snap;
  try {
    snap = await ref.get();
  } catch (err) {
    syncStatusEl.textContent = `Join failed: ${err.message || "Network error"}`;
    return;
  }
  if (!snap.exists) {
    syncStatusEl.textContent = "Room not found.";
    return;
  }

  const data = snap.data();
  const whiteUid = data.players?.w?.uid;
  const blackUid = data.players?.b?.uid;

  let myColor = null;
  if (whiteUid === currentUser.uid) myColor = "w";
  if (blackUid === currentUser.uid) myColor = "b";

  if (!myColor) {
    if (!data.players?.b) {
      myColor = "b";
      try {
        await ref.update({
          "players.b": {
            uid: currentUser.uid,
            name: currentUser.displayName || currentUser.email || "Black",
          },
        });
      } catch (err) {
        syncStatusEl.textContent = `Join failed: ${err.message || "Could not claim seat"}`;
        return;
      }
    } else {
      syncStatusEl.textContent = "Room is full.";
      return;
    }
  }

  subscribeRoom(code, myColor);
  roomCodeInput.value = code;
  syncStatusEl.textContent = `Joined room ${code}.`;
  openRoomModal("Joined Room", `You are connected to room: ${code}`, code);
}

function leaveRoom() {
  if (roomUnsubscribe) {
    roomUnsubscribe();
    roomUnsubscribe = null;
  }
  currentRoomId = null;
  game.isMultiplayer = false;
  game.roomId = null;
  game.myColor = null;
  roomMetaEl.textContent = "No room connected.";
  setAuthButtons();
  setSyncStatus();
  refreshModeUI();
}

function subscribeRoom(roomId, myColor) {
  if (!db) return;
  const ref = db.collection("rooms").doc(roomId);
  currentRoomId = roomId;
  game.mode = "multi";
  game.isMultiplayer = true;
  game.roomId = roomId;
  game.myColor = myColor;

  roomUnsubscribe = ref.onSnapshot((snap) => {
    if (!snap.exists) {
      syncStatusEl.textContent = "Room closed.";
      leaveRoom();
      render();
      return;
    }
    const data = snap.data();
    const remote = data.gameState;
    roomMetaEl.textContent = `Room: ${roomId} | White: ${data.players?.w?.name || "-"} | Black: ${
      data.players?.b?.name || "Waiting..."
    }`;

    if (remote && !ignoreRemoteOnce) {
      importGameState(remote);
    }
    ignoreRemoteOnce = false;
    setAuthButtons();
    setSyncStatus();
    render();
  });
}

function exportGameState() {
  return {
    board: game.board.map((row) => row.slice()),
    turn: game.turn,
    moveHistory: game.moveHistory.slice(),
    castlingRights: { ...game.castlingRights },
    enPassant: game.enPassant ? { ...game.enPassant } : null,
    halfmoveClock: game.halfmoveClock,
    fullmoveNumber: game.fullmoveNumber,
    gameOver: game.gameOver,
    result: game.result,
  };
}

function importGameState(state) {
  game.board = state.board.map((row) => row.slice());
  game.turn = state.turn;
  game.moveHistory = state.moveHistory.slice();
  game.castlingRights = { ...state.castlingRights };
  game.enPassant = state.enPassant ? { ...state.enPassant } : null;
  game.halfmoveClock = state.halfmoveClock;
  game.fullmoveNumber = state.fullmoveNumber;
  game.gameOver = state.gameOver;
  game.result = state.result;
  selected = null;
  legalMovesFromSelected = [];
}

async function pushRoomState() {
  if (!isOnline || !db || !currentRoomId || !currentUser) return;
  ignoreRemoteOnce = true;
  await db.collection("rooms").doc(currentRoomId).update({
    gameState: exportGameState(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

function initializeBoardLabels() {
  topFilesEl.innerHTML = "";
  bottomFilesEl.innerHTML = "";
  leftRanksEl.innerHTML = "";
  rightRanksEl.innerHTML = "";

  for (const file of FILES) {
    topFilesEl.appendChild(makeLabel(file));
    bottomFilesEl.appendChild(makeLabel(file));
  }
  for (const rank of RANKS) {
    leftRanksEl.appendChild(makeLabel(rank));
    rightRanksEl.appendChild(makeLabel(rank));
  }
}

function makeLabel(text) {
  const el = document.createElement("span");
  el.textContent = text;
  return el;
}

function render() {
  boardEl.innerHTML = "";
  const allLegalMoves = generateLegalMoves(game);

  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const square = document.createElement("button");
      square.type = "button";
      square.className = `square ${(r + c) % 2 === 0 ? "light" : "dark"}`;
      square.dataset.row = String(r);
      square.dataset.col = String(c);

      const piece = game.board[r][c];
            if (piece) {
        const pieceEl = document.createElement("span");
          pieceEl.className = "piece " + (piece[0] === "w" ? "white" : "black");
        pieceEl.textContent = PIECE_UNICODE[piece];
        square.appendChild(pieceEl);
      }

      if (selected && selected.row === r && selected.col === c) {
        square.classList.add("selected");
      }

      const matchingMove = legalMovesFromSelected.find((m) => m.toRow === r && m.toCol === c);
      if (matchingMove) {
        if (matchingMove.isCapture || matchingMove.isEnPassant) {
          square.classList.add("capture");
        } else {
          square.classList.add("move");
        }
      }

      boardEl.appendChild(square);
    }
  }

  updateStatus(allLegalMoves);
  renderMoveHistory();
}

function renderMoveHistory() {
  movesBodyEl.innerHTML = "";
  for (let i = 0; i < game.moveHistory.length; i += 2) {
    const tr = document.createElement("tr");
    const moveNoTd = document.createElement("td");
    const whiteTd = document.createElement("td");
    const blackTd = document.createElement("td");

    moveNoTd.textContent = String(Math.floor(i / 2) + 1);
    const white = game.moveHistory[i] ?? "";
    const black = game.moveHistory[i + 1] ?? "";

    whiteTd.textContent = white;
    blackTd.textContent = black;

    tr.appendChild(moveNoTd);
    tr.appendChild(whiteTd);
    tr.appendChild(blackTd);
    movesBodyEl.appendChild(tr);
  }
}

function updateStatus(legalMoves) {
  if (!currentUser) {
    statusEl.textContent = "Sign in to start playing.";
    return;
  }

  if (!game.mode) {
    statusEl.textContent = "Choose Single Player or Multiplayer.";
    return;
  }

  if (game.gameOver) {
    statusEl.textContent = game.result;
    const key = `${game.result}|${game.moveHistory.length}`;
    if (lastResultModalKey !== key) {
      lastResultModalKey = key;
      openResultModal(game.result);
    }
    return;
  }

  const side = game.turn === "w" ? "White" : "Black";
  const inCheck = isKingInCheck(game, game.turn);

  if (legalMoves.length === 0) {
    game.gameOver = true;
    if (inCheck) {
      game.result = `${side} is checkmated. ${game.turn === "w" ? "Black" : "White"} wins.`;
    } else {
      game.result = "Stalemate.";
    }
    statusEl.textContent = game.result;
    const key = `${game.result}|${game.moveHistory.length}`;
    if (lastResultModalKey !== key) {
      lastResultModalKey = key;
      openResultModal(game.result);
    }
    return;
  }

  if (game.mode === "single" && game.turn === game.botColor) {
    statusEl.textContent = inCheck ? "Bot is thinking (check)." : "Bot is thinking.";
    return;
  }

  statusEl.textContent = inCheck ? `${side} to move (check)` : `${side} to move`;
}

function onBoardClick(event) {
  const target = event.target.closest(".square");
  if (!target || game.gameOver) {
    return;
  }

  if (!currentUser) {
    syncStatusEl.textContent = "Please sign in first.";
    return;
  }

  if (!game.mode) {
    syncStatusEl.textContent = "Choose Single Player or Multiplayer first.";
    return;
  }

  if (game.isMultiplayer) {
    if (!game.myColor) return;
    if (game.turn !== game.myColor) return;
  }

  if (game.mode === "single" && game.turn === game.botColor) {
    return;
  }

  const row = Number(target.dataset.row);
  const col = Number(target.dataset.col);
  const piece = game.board[row][col];

  if (selected) {
    const chosenMove = legalMovesFromSelected.find((m) => m.toRow === row && m.toCol === col);
    if (chosenMove) {
      performMove(chosenMove);
      selected = null;
      legalMovesFromSelected = [];
      render();
      return;
    }
  }

  if (piece && piece[0] === game.turn) {
    selected = { row, col };
    legalMovesFromSelected = generateLegalMoves(game).filter(
      (m) => m.fromRow === row && m.fromCol === col
    );
  } else {
    selected = null;
    legalMovesFromSelected = [];
  }

  render();
}

function performMove(move) {
  game.pastStates.push(cloneGameState(game));

  const piece = game.board[move.fromRow][move.fromCol];
  const target = game.board[move.toRow][move.toCol];

  game.board[move.toRow][move.toCol] = piece;
  game.board[move.fromRow][move.fromCol] = null;

  if (move.isEnPassant) {
    const capRow = move.toRow + (piece[0] === "w" ? 1 : -1);
    game.board[capRow][move.toCol] = null;
  }

  if (move.promotion) {
    game.board[move.toRow][move.toCol] = piece[0] + move.promotion;
  }

  if (move.castle === "K") {
    const row = piece[0] === "w" ? 7 : 0;
    game.board[row][5] = game.board[row][7];
    game.board[row][7] = null;
  } else if (move.castle === "Q") {
    const row = piece[0] === "w" ? 7 : 0;
    game.board[row][3] = game.board[row][0];
    game.board[row][0] = null;
  }

  updateCastlingRights(piece, move.fromRow, move.fromCol, move.toRow, move.toCol, target);
  game.enPassant = null;
  if (piece[1] === "p" && Math.abs(move.toRow - move.fromRow) === 2) {
    game.enPassant = { row: (move.fromRow + move.toRow) / 2, col: move.fromCol };
  }

  const isCapture = target !== null || move.isEnPassant;
  if (piece[1] === "p" || isCapture) {
    game.halfmoveClock = 0;
  } else {
    game.halfmoveClock += 1;
  }

  const notation = toAlgebraic(game, move, piece, target, isCapture);
  game.moveHistory.push(notation);
  playMoveSound(isCapture);

  if (game.turn === "b") {
    game.fullmoveNumber += 1;
  }
  game.turn = game.turn === "w" ? "b" : "w";

  if (game.isMultiplayer && currentRoomId) {
    pushRoomState().catch((err) => {
      syncStatusEl.textContent = `Sync failed: ${err.message}`;
    });
  }

  scheduleBotMoveIfNeeded();
}

function scheduleBotMoveIfNeeded() {
  if (botTimer) {
    clearTimeout(botTimer);
    botTimer = null;
  }

  if (game.mode !== "single" || game.gameOver || game.turn !== game.botColor) {
    return;
  }

  botTimer = setTimeout(() => {
    const legalMoves = generateLegalMoves(game);
    if (legalMoves.length === 0) {
      render();
      return;
    }

    const move = pickBotMove(legalMoves);
    performMove(move);
    selected = null;
    legalMovesFromSelected = [];
    render();
  }, 350);
}

function pickBotMove(legalMoves) {
  if (game.botDifficulty === "easy") {
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  const checks = [];
  const captures = [];
  const quiet = [];

  for (const move of legalMoves) {
    const clone = cloneGameState(game);
    applyMoveForAnalysis(clone, move);
    clone.turn = opposite(game.turn);
    const givesCheck = isKingInCheck(clone, clone.turn);

    if (givesCheck) checks.push(move);
    else if (move.isCapture || move.isEnPassant) captures.push(move);
    else quiet.push(move);
  }

  if (game.botDifficulty === "medium") {
    const pool = checks.length > 0 ? checks : captures.length > 0 ? captures : quiet;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Hard mode: prefer checks, then highest-value captures.
  if (checks.length > 0) {
    return checks[Math.floor(Math.random() * checks.length)];
  }

  if (captures.length > 0) {
    const value = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 99 };
    let best = captures[0];
    let bestScore = -1;
    for (const move of captures) {
      const target = game.board[move.toRow][move.toCol];
      const score = target ? value[target[1]] || 0 : 1;
      if (score > bestScore) {
        best = move;
        bestScore = score;
      }
    }
    return best;
  }

  return quiet[Math.floor(Math.random() * quiet.length)];
}

function undoMove() {
  if (game.isMultiplayer) {
    syncStatusEl.textContent = "Undo is disabled in multiplayer.";
    return;
  }
  if (game.pastStates.length === 0) {
    return;
  }
  const previous = game.pastStates.pop();
  Object.assign(game, previous);
  selected = null;
  legalMovesFromSelected = [];
  render();
}

function cloneGameState(state) {
  return {
    board: state.board.map((row) => row.slice()),
    turn: state.turn,
    moveHistory: state.moveHistory.slice(),
    pastStates: state.pastStates.slice(),
    castlingRights: { ...state.castlingRights },
    enPassant: state.enPassant ? { ...state.enPassant } : null,
    halfmoveClock: state.halfmoveClock,
    fullmoveNumber: state.fullmoveNumber,
    gameOver: state.gameOver,
    result: state.result,
    mode: state.mode,
    botColor: state.botColor,
    botDifficulty: state.botDifficulty,
    soundEnabled: state.soundEnabled,
    isMultiplayer: state.isMultiplayer,
    roomId: state.roomId,
    myColor: state.myColor,
  };
}

function updateCastlingRights(piece, fromRow, fromCol, toRow, toCol, captured) {
  if (piece === "wk") {
    game.castlingRights.wK = false;
    game.castlingRights.wQ = false;
  }
  if (piece === "bk") {
    game.castlingRights.bK = false;
    game.castlingRights.bQ = false;
  }

  if (piece === "wr" && fromRow === 7 && fromCol === 0) game.castlingRights.wQ = false;
  if (piece === "wr" && fromRow === 7 && fromCol === 7) game.castlingRights.wK = false;
  if (piece === "br" && fromRow === 0 && fromCol === 0) game.castlingRights.bQ = false;
  if (piece === "br" && fromRow === 0 && fromCol === 7) game.castlingRights.bK = false;

  if (captured === "wr" && toRow === 7 && toCol === 0) game.castlingRights.wQ = false;
  if (captured === "wr" && toRow === 7 && toCol === 7) game.castlingRights.wK = false;
  if (captured === "br" && toRow === 0 && toCol === 0) game.castlingRights.bQ = false;
  if (captured === "br" && toRow === 0 && toCol === 7) game.castlingRights.bK = false;
}

function generateLegalMoves(state) {
  const pseudo = generatePseudoMoves(state, state.turn);
  return pseudo.filter((move) => {
    const clone = cloneGameState(state);
    applyMoveForAnalysis(clone, move);
    return !isKingInCheck(clone, state.turn);
  });
}

function applyMoveForAnalysis(state, move) {
  const piece = state.board[move.fromRow][move.fromCol];
  state.board[move.toRow][move.toCol] = piece;
  state.board[move.fromRow][move.fromCol] = null;

  if (move.isEnPassant) {
    const capRow = move.toRow + (piece[0] === "w" ? 1 : -1);
    state.board[capRow][move.toCol] = null;
  }

  if (move.promotion) {
    state.board[move.toRow][move.toCol] = piece[0] + move.promotion;
  }

  if (move.castle === "K") {
    const row = piece[0] === "w" ? 7 : 0;
    state.board[row][5] = state.board[row][7];
    state.board[row][7] = null;
  } else if (move.castle === "Q") {
    const row = piece[0] === "w" ? 7 : 0;
    state.board[row][3] = state.board[row][0];
    state.board[row][0] = null;
  }
}

function generatePseudoMoves(state, color) {
  const moves = [];
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = state.board[row][col];
      if (!piece || piece[0] !== color) continue;

      switch (piece[1]) {
        case "p":
          addPawnMoves(state, moves, row, col, color);
          break;
        case "n":
          addKnightMoves(state, moves, row, col, color);
          break;
        case "b":
          addSlidingMoves(state, moves, row, col, color, [
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1],
          ]);
          break;
        case "r":
          addSlidingMoves(state, moves, row, col, color, [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ]);
          break;
        case "q":
          addSlidingMoves(state, moves, row, col, color, [
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1],
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ]);
          break;
        case "k":
          addKingMoves(state, moves, row, col, color);
          break;
        default:
          break;
      }
    }
  }
  return moves;
}

function addPawnMoves(state, moves, row, col, color) {
  const dir = color === "w" ? -1 : 1;
  const startRow = color === "w" ? 6 : 1;
  const promotionRow = color === "w" ? 0 : 7;

  const oneStep = row + dir;
  if (isInside(oneStep, col) && !state.board[oneStep][col]) {
    if (oneStep === promotionRow) {
      moves.push({ fromRow: row, fromCol: col, toRow: oneStep, toCol: col, promotion: "q" });
    } else {
      moves.push({ fromRow: row, fromCol: col, toRow: oneStep, toCol: col });
    }

    const twoStep = row + dir * 2;
    if (row === startRow && !state.board[twoStep][col]) {
      moves.push({ fromRow: row, fromCol: col, toRow: twoStep, toCol: col });
    }
  }

  for (const dc of [-1, 1]) {
    const captureCol = col + dc;
    if (!isInside(oneStep, captureCol)) continue;

    const target = state.board[oneStep][captureCol];
    if (target && target[0] !== color) {
      if (oneStep === promotionRow) {
        moves.push({
          fromRow: row,
          fromCol: col,
          toRow: oneStep,
          toCol: captureCol,
          promotion: "q",
          isCapture: true,
        });
      } else {
        moves.push({
          fromRow: row,
          fromCol: col,
          toRow: oneStep,
          toCol: captureCol,
          isCapture: true,
        });
      }
    }

    if (state.enPassant && state.enPassant.row === oneStep && state.enPassant.col === captureCol) {
      moves.push({
        fromRow: row,
        fromCol: col,
        toRow: oneStep,
        toCol: captureCol,
        isEnPassant: true,
        isCapture: true,
      });
    }
  }
}

function addKnightMoves(state, moves, row, col, color) {
  const jumps = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ];

  for (const [dr, dc] of jumps) {
    const nr = row + dr;
    const nc = col + dc;
    if (!isInside(nr, nc)) continue;
    const target = state.board[nr][nc];
    if (!target || target[0] !== color) {
      moves.push({
        fromRow: row,
        fromCol: col,
        toRow: nr,
        toCol: nc,
        isCapture: Boolean(target),
      });
    }
  }
}

function addSlidingMoves(state, moves, row, col, color, directions) {
  for (const [dr, dc] of directions) {
    let nr = row + dr;
    let nc = col + dc;
    while (isInside(nr, nc)) {
      const target = state.board[nr][nc];
      if (!target) {
        moves.push({ fromRow: row, fromCol: col, toRow: nr, toCol: nc });
      } else {
        if (target[0] !== color) {
          moves.push({
            fromRow: row,
            fromCol: col,
            toRow: nr,
            toCol: nc,
            isCapture: true,
          });
        }
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
}

function addKingMoves(state, moves, row, col, color) {
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (!isInside(nr, nc)) continue;
      const target = state.board[nr][nc];
      if (!target || target[0] !== color) {
        moves.push({
          fromRow: row,
          fromCol: col,
          toRow: nr,
          toCol: nc,
          isCapture: Boolean(target),
        });
      }
    }
  }

  const rowHome = color === "w" ? 7 : 0;
  if (row !== rowHome || col !== 4) return;
  if (isKingInCheck(state, color)) return;

  if (canCastleKingSide(state, color)) {
    moves.push({ fromRow: rowHome, fromCol: 4, toRow: rowHome, toCol: 6, castle: "K" });
  }
  if (canCastleQueenSide(state, color)) {
    moves.push({ fromRow: rowHome, fromCol: 4, toRow: rowHome, toCol: 2, castle: "Q" });
  }
}

function canCastleKingSide(state, color) {
  if (color === "w" && !state.castlingRights.wK) return false;
  if (color === "b" && !state.castlingRights.bK) return false;
  const row = color === "w" ? 7 : 0;
  if (state.board[row][5] || state.board[row][6]) return false;
  if (state.board[row][7] !== color + "r") return false;
  if (isSquareAttacked(state, row, 5, opposite(color))) return false;
  if (isSquareAttacked(state, row, 6, opposite(color))) return false;
  return true;
}

function canCastleQueenSide(state, color) {
  if (color === "w" && !state.castlingRights.wQ) return false;
  if (color === "b" && !state.castlingRights.bQ) return false;
  const row = color === "w" ? 7 : 0;
  if (state.board[row][1] || state.board[row][2] || state.board[row][3]) return false;
  if (state.board[row][0] !== color + "r") return false;
  if (isSquareAttacked(state, row, 3, opposite(color))) return false;
  if (isSquareAttacked(state, row, 2, opposite(color))) return false;
  return true;
}

function isKingInCheck(state, color) {
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      if (state.board[r][c] === color + "k") {
        return isSquareAttacked(state, r, c, opposite(color));
      }
    }
  }
  return false;
}

function isSquareAttacked(state, row, col, byColor) {
  const pawnDir = byColor === "w" ? -1 : 1;
  for (const dc of [-1, 1]) {
    const pr = row - pawnDir;
    const pc = col + dc;
    if (isInside(pr, pc) && state.board[pr][pc] === byColor + "p") return true;
  }

  const knightJumps = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ];
  for (const [dr, dc] of knightJumps) {
    const nr = row + dr;
    const nc = col + dc;
    if (isInside(nr, nc) && state.board[nr][nc] === byColor + "n") return true;
  }

  const kingOffsets = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];
  for (const [dr, dc] of kingOffsets) {
    const nr = row + dr;
    const nc = col + dc;
    if (isInside(nr, nc) && state.board[nr][nc] === byColor + "k") return true;
  }

  if (rayAttack(state, row, col, byColor, "b")) return true;
  if (rayAttack(state, row, col, byColor, "r")) return true;
  return false;
}

function rayAttack(state, row, col, byColor, pieceType) {
  const dirs =
    pieceType === "b"
      ? [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ]
      : [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ];

  for (const [dr, dc] of dirs) {
    let nr = row + dr;
    let nc = col + dc;
    while (isInside(nr, nc)) {
      const target = state.board[nr][nc];
      if (target) {
        if (target[0] === byColor && (target[1] === pieceType || target[1] === "q")) {
          return true;
        }
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  return false;
}

function opposite(color) {
  return color === "w" ? "b" : "w";
}

function isInside(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function toSquare(row, col) {
  return FILES[col] + String(8 - row);
}

function toAlgebraic(state, move, piece, captured, isCapture) {
  if (move.castle === "K") return "O-O";
  if (move.castle === "Q") return "O-O-O";

  const pieceLetter = piece[1] === "p" ? "" : piece[1].toUpperCase();
  let text = pieceLetter;

  if (piece[1] === "p" && isCapture) {
    text += FILES[move.fromCol];
  }
  if (isCapture) {
    text += "x";
  }
  text += toSquare(move.toRow, move.toCol);
  if (move.promotion) {
    text += "=Q";
  }

  const clone = cloneGameState(state);
  clone.turn = opposite(state.turn);
  const opponentMoves = generateLegalMoves(clone);
  const opponentInCheck = isKingInCheck(clone, clone.turn);
  if (opponentMoves.length === 0 && opponentInCheck) {
    text += "#";
  } else if (opponentInCheck) {
    text += "+";
  }

  return text;
}


