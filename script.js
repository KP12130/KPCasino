const balanceEl = document.getElementById("balance");
const bombsEl = document.getElementById("bombs");
const bombUp = document.getElementById("bomb-up");
const bombDown = document.getElementById("bomb-down");
const betInput = document.getElementById("bet");
const startBtn = document.getElementById("startBtn");
const cashoutBtn = document.getElementById("cashoutBtn");
const gridEl = document.getElementById("grid");
const statusEl = document.getElementById("status");

// --- State ---
let balance = parseFloat(localStorage.getItem("balance") || "100");
let bombs = 5;
let bet = parseFloat(betInput.value);
let grid = [];
let tilesOpened = [];
let multiplier = 1;
let currentGame = false;

updateBalance();
bombsEl.innerText = bombs;

// --- Bomb buttons ---
bombUp.onclick = () => { if (bombs < 24) bombs++; bombsEl.innerText = bombs; }
bombDown.onclick = () => { if (bombs > 1) bombs--; bombsEl.innerText = bombs; }

// --- Bet input ---
betInput.onchange = () => { bet = parseFloat(betInput.value); }

// --- Start Game ---
startBtn.onclick = () => {
  if (currentGame) return alert("Finish current game!");
  if (bet > balance) return alert("Insufficient balance!");
  balance -= bet;
  multiplier = 1;
  tilesOpened = [];
  currentGame = true;
  grid = generateGrid(5, bombs);
  createGrid();
  updateBalance();
  updateStatus("Game started! Good luck!");
};

// --- Generate grid ---
function generateGrid(size, bombCount){
  let g = Array(size).fill(0).map(()=>Array(size).fill(0));
  let count = 0;
  while(count < bombCount){
    let r = Math.floor(Math.random()*size);
    let c = Math.floor(Math.random()*size);
    if(g[r][c]===0){ g[r][c]=1; count++; }
  }
  return g;
}

// --- Create grid in DOM ---
function createGrid(){
  gridEl.innerHTML="";
  for(let i=0;i<5;i++){
    const row = document.createElement("tr");
    for(let j=0;j<5;j++){
      const cell = document.createElement("td");
      cell.onclick = () => openTile(i,j,cell);
      row.appendChild(cell);
    }
    gridEl.appendChild(row);
  }
}

// --- Open tile ---
function openTile(row,col,cell){
  if(!currentGame) return;
  if(tilesOpened.some(t=>t[0]===row && t[1]===col)) return;

  tilesOpened.push([row,col]);
  if(grid[row][col]===1){
    cell.classList.add("bomb");
    currentGame=false;
    updateStatus(`💥 Game Over! Multiplier: ${multiplier.toFixed(2)}x`);
  } else {
    cell.classList.add("safe");
    const N = 25;
    const M = bombs;
    const safeRevealed = tilesOpened.filter(t=>grid[t[0]][t[1]]===0).length;
    const safeTotal = N - M;
    const safeRemaining = Math.max(1, safeTotal - safeRevealed);
    const cellsRemaining = Math.max(1, N - tilesOpened.length);
    const pSafe = safeRemaining / cellsRemaining;
    const alpha = 0.6;
    const factor = Math.pow(1/Math.max(1e-9,pSafe), alpha);
    multiplier *= factor;
    updateStatus(`Multiplier: ${multiplier.toFixed(2)}x`);
  }
}

// --- Cashout ---
cashoutBtn.onclick = () => {
  if(!currentGame) return alert("No active game");
  balance += bet*multiplier;
  currentGame=false;
  updateBalance();
  saveBalance();
  updateStatus("🎉 Cashed out!");
};

// --- Helpers ---
function updateBalance(){ balanceEl.innerText = "Balance: " + balance.toFixed(2); }
function updateStatus(msg){ statusEl.innerText = msg; }
function saveBalance(){ localStorage.setItem("balance", balance); }
