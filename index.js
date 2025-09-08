import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

// --- ES6 modul módra, __dirname helyett ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static folder beállítása
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"public","index.html"));
});

const PORT = 3000;

function loadUsers(){
  if(fs.existsSync("users.json")) return JSON.parse(fs.readFileSync("users.json"));
  return {};
}

function saveUsers(users){ fs.writeFileSync("users.json", JSON.stringify(users, null, 2)); }

app.get("/api/balance/:userId", (req,res)=>{
  const userId = req.params.userId;
  let users = loadUsers();
  if(!users[userId]) users[userId] = { balance:100, currentGame:null };
  saveUsers(users);
  res.json({ balance: users[userId].balance });
});

app.post("/api/start", (req,res)=>{
  const { userId, bet, bombs } = req.body;
  let users = loadUsers();
  if(!users[userId]) users[userId] = { balance:100, currentGame:null };

  if(users[userId].currentGame) return res.status(400).json({ error:"Game already in progress" });
  if(users[userId].balance < bet) return res.status(400).json({ error:"Insufficient balance" });

  users[userId].balance -= bet;

  const gridSize = 5;
  let grid = Array(gridSize).fill(0).map(()=>Array(gridSize).fill(0));
  let bombCount = 0;
  while(bombCount < bombs){
    const r=Math.floor(Math.random()*gridSize);
    const c=Math.floor(Math.random()*gridSize);
    if(grid[r][c]===0){ grid[r][c]=1; bombCount++; }
  }

  users[userId].currentGame = {
    bet, bombs, grid, tilesOpened:[], multiplier:1.0, profit:0
  };

  saveUsers(users);
  res.json({ balance: users[userId].balance });
});

app.post("/api/open", (req,res)=>{
  const { userId, row, col } = req.body;
  let users = loadUsers();
  if(!users[userId] || !users[userId].currentGame) return res.status(400).json({ error:"No active game" });

  const game = users[userId].currentGame;
  if(game.tilesOpened.some(t=>t[0]===row && t[1]===col)) return res.status(400).json({ error:"Tile already opened" });

  game.tilesOpened.push([row,col]);

  if(game.grid[row][col]===1){
    users[userId].currentGame = null;
    saveUsers(users);
    return res.json({ result:"bomb", multiplier:game.multiplier, profit:0 });
  } else {
    // --- Python style multiplier calculation ---
    const N = game.grid.length * game.grid[0].length;
    const M = game.bombs;
    const safeRevealed = game.tilesOpened.filter(([r,c])=>game.grid[r][c]===0).length;
    const safeTotal = N - M;
    const safeRemaining = Math.max(1, safeTotal - safeRevealed);
    const cellsRemaining = Math.max(1, N - game.tilesOpened.length);
    const pSafe = safeRemaining / cellsRemaining;
    const alpha = 0.6;
    const factor = Math.pow(1 / Math.max(1e-9, pSafe), alpha);

    game.multiplier *= factor;
    game.profit = (game.multiplier - 1) * game.bet;

    saveUsers(users);
    return res.json({ result:"safe", multiplier:game.multiplier, profit:game.profit });
  }
});

app.post("/api/cashout", (req,res)=>{
  const { userId } = req.body;
  let users = loadUsers();
  if(!users[userId] || !users[userId].currentGame) return res.status(400).json({ error:"No active game" });

  const game = users[userId].currentGame;
  users[userId].balance += game.bet + game.profit;
  users[userId].currentGame = null;
  saveUsers(users);
  res.json({ balance: users[userId].balance });
});

app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));

