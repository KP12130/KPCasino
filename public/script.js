// --- Firebase config ---
const firebaseConfig = {
  apiKey: "AIzaSyBOkMxLdedI5oZbtSZopClNDoQ0ADeOvos",
  authDomain: "kpcasino-12130.firebaseapp.com",
  projectId: "kpcasino-12130",
  storageBucket: "kpcasino-12130.firebasestorage.app",
  messagingSenderId: "490060637362",
  appId: "1:490060637362:web:8342e42f32f60d555495ab"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Elements ---
const loginScreen = document.getElementById("login-screen");
const gameScreen = document.getElementById("game-screen");
const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const registerBtn = document.getElementById("register-btn");
const loginMsg = document.getElementById("login-msg");
const balanceEl = document.getElementById("balance");
const logoutBtn = document.getElementById("logoutBtn");
const bombsEl = document.getElementById("bombs");
const bombUp = document.getElementById("bomb-up");
const bombDown = document.getElementById("bomb-down");
const betInput = document.getElementById("bet");
const startBtn = document.getElementById("startBtn");
const cashoutBtn = document.getElementById("cashoutBtn");
const gridEl = document.getElementById("grid");
const statusEl = document.getElementById("status");

// --- State ---
let userId = null;
let balance = 0;
let bombs = 5;
let bet = parseFloat(betInput.value);
let currentGame = false;

// --- Auth state listener ---
auth.onAuthStateChanged(async (user) => {
  if (user) {
    userId = user.uid;
    await loadUserData();
    showGameScreen();
  } else {
    loginScreen.style.display = "flex";
    gameScreen.style.display = "none";
    currentGame = false;
  }
});

// --- Login / Register ---
loginBtn.onclick = async () => {
  try {
    await auth.signInWithEmailAndPassword(emailInput.value, passInput.value);
  } catch (err) {
    loginMsg.innerText = err.message;
  }
};

registerBtn.onclick = async () => {
  try {
    const user = await auth.createUserWithEmailAndPassword(emailInput.value, passInput.value);
    userId = user.user.uid;
    await db.collection("users").doc(userId).set({ balance: 100 });
    balance = 100;
    showGameScreen();
  } catch (err) {
    loginMsg.innerText = err.message;
  }
};

// --- Logout ---
logoutBtn.onclick = async () => {
  await auth.signOut();
  currentGame = false;
};

// --- Load Firestore user data ---
async function loadUserData() {
  const doc = await db.collection("users").doc(userId).get();
  if (doc.exists) {
    balance = doc.data().balance || 100;
  } else {
    await db.collection("users").doc(userId).set({ balance: 100 });
    balance = 100;
  }
  updateBalance();
}

// --- Update UI ---
function updateBalance() { balanceEl.innerText = "Balance: " + balance.toFixed(2); }
function updateStatus(msg) { statusEl.innerText = msg; }

// --- Bomb buttons ---
bombUp.onclick = () => { if (bombs < 24) bombs++; bombsEl.innerText = bombs; }
bombDown.onclick = () => { if (bombs > 1) bombs--; bombsEl.innerText = bombs; }

// --- Bet input ---
betInput.onchange = () => { bet = parseFloat(betInput.value); }

// --- Show game screen ---
function showGameScreen() {
  loginScreen.style.display = "none";
  gameScreen.style.display = "flex";
}

// --- Start Game ---
startBtn.onclick = async () => {
  if (!userId) return alert("Login first!");
  if (currentGame) return alert("Finish current game!");

  try {
    const res = await fetch("/api/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, bet, bombs })
    });
    const data = await res.json();
    if (data.error) { alert(data.error); return; }

    balance = data.balance;
    updateBalance();
    createGrid();
    currentGame = true;
    updateStatus("Game started! Good luck!");
  } catch (err) {
    alert("Server error: " + err.message);
  }
};

// --- Create Grid ---
function createGrid() {
  gridEl.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    const row = document.createElement("tr");
    for (let j = 0; j < 5; j++) {
      const cell = document.createElement("td");
      cell.onclick = () => openTile(i, j, cell);
      row.appendChild(cell);
    }
    gridEl.appendChild(row);
  }
}

// --- Open Tile ---
async function openTile(row, col, cell) {
  if (!currentGame) return;

  try {
    const res = await fetch("/api/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, row, col })
    });
    const data = await res.json();
    if (data.error) { alert(data.error); return; }

    if (data.result === "bomb") {
      cell.classList.add("bomb");
      updateStatus(`💥 Game Over! Multiplier: ${data.multiplier.toFixed(2)}x`);
      currentGame = false;
    } else {
      cell.classList.add("safe");
      updateStatus(`Multiplier: ${data.multiplier.toFixed(2)}x | Profit: ${data.profit.toFixed(2)}`);
    }
  } catch (err) {
    alert("Server error: " + err.message);
  }
}

// --- Cashout ---
cashoutBtn.onclick = async () => {
  if (!currentGame) return alert("No active game");

  try {
    const res = await fetch("/api/cashout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    if (data.error) { alert(data.error); return; }

    balance = data.balance;
    updateBalance();
    currentGame = false;
    updateStatus("🎉 Cashed out!");
  } catch (err) {
    alert("Server error: " + err.message);
  }
};
