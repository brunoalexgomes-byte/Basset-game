// game.js
// Pixel "runner" game featuring a red basset hound.
// Features added per request:
// 1) Jumping + ear animation while jumping
// 2) Obstacles to avoid
// 3) Treats to collect

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Scale up visually while keeping low-res pixel look
const SCALE = 3;
canvas.style.width = `${canvas.width * SCALE}px`;
canvas.style.height = `${canvas.height * SCALE}px`;

// ----------------------------
// 1) Game constants
// ----------------------------
const GROUND_Y = 160;          // y position of "ground" line (pixels)
const GRAVITY = 1200;          // pixels/s^2
const JUMP_VY = -420;          // pixels/s (negative goes up)
const SCROLL_SPEED = 140;      // pixels/s (obstacles and treats move left)

// Spawn behavior
const OBSTACLE_SPAWN_MIN = 0.9; // seconds
const OBSTACLE_SPAWN_MAX = 1.7;
const TREAT_SPAWN_MIN = 0.6;
const TREAT_SPAWN_MAX = 1.4;

// ----------------------------
// 2) Player (basset hound)
// ----------------------------
const player = {
  x: 40,
  y: GROUND_Y - 18,   // top-left of sprite
  w: 20,
  h: 14,
  vy: 0,
  onGround: true
};

// ----------------------------
// 3) Obstacles & treats storage
// ----------------------------
let obstacles = [];
let treats = [];
let score = 0;
let gameOver = false;

// Timers for spawns
let obstacleTimer = randRange(OBSTACLE_SPAWN_MIN, OBSTACLE_SPAWN_MAX);
let treatTimer = randRange(TREAT_SPAWN_MIN, TREAT_SPAWN_MAX);

// Input
const keys = new Set();
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if ([" ", "arrowup", "w"].includes(k)) {
    e.preventDefault();
    keys.add(k);
  }
  if (k === "r") {
    // Quick restart
    resetGame();
  }
});

window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

// ----------------------------
// 4) Main loop
// ----------------------------
let last = performance.now();
requestAnimationFrame(loop);

function loop(now) {
  const dt = (now - last) / 1000;
  last = now;

  update(dt, now / 1000);
  render(now / 1000);

  requestAnimationFrame(loop);
}

// ----------------------------
// 5) Update (physics + spawns)
// ----------------------------
function update(dt, timeSec) {
  if (gameOver) return;

  // Jump input (only if on ground)
  if ((keys.has(" ") || keys.has("arrowup") || keys.has("w")) && player.onGround) {
    player.vy = JUMP_VY;
    player.onGround = false;
  }

  // Apply gravity & integrate
  player.vy += GRAVITY * dt;
  player.y += player.vy * dt;

  // Ground collision
  const groundTop = GROUND_Y - player.h;
  if (player.y >= groundTop) {
    player.y = groundTop;
    player.vy = 0;
    player.onGround = true;
  }

  // Spawn obstacles
  obstacleTimer -= dt;
  if (obstacleTimer <= 0) {
    spawnObstacle();
    obstacleTimer = randRange(OBSTACLE_SPAWN_MIN, OBSTACLE_SPAWN_MAX);
  }

  // Spawn treats
  treatTimer -= dt;
  if (treatTimer <= 0) {
    spawnTreat();
    treatTimer = randRange(TREAT_SPAWN_MIN, TREAT_SPAWN_MAX);
  }

  // Move obstacles/treats left and remove offscreen
  for (const o of obstacles) o.x -= SCROLL_SPEED * dt;
  for (const t of treats) t.x -= SCROLL_SPEED * dt;

  obstacles = obstacles.filter(o => o.x + o.w > -5);
  treats = treats.filter(t => t.x + t.w > -5);

  // Collisions: player vs obstacle => game over
  for (const o of obstacles) {
    if (rectsOverlap(player, o)) {
      gameOver = true;
      return;
    }
  }

  // Collisions: player vs treat => +score, remove treat
  for (let i = treats.length - 1; i >= 0; i--) {
    if (rectsOverlap(player, treats[i])) {
      score += 1;
      treats.splice(i, 1);
    }
  }
}

// ----------------------------
// 6) Render (draw everything)
// ----------------------------
function render(timeSec) {
  // Background
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle stars
  ctx.fillStyle = "#1f1f1f";
  for (let i = 0; i < 55; i++) {
    ctx.fillRect((i * 43) % canvas.width, (i * 67) % 110, 1, 1);
  }

  // Ground
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(0, GROUND_Y, canvas.width, 2);

  // Treats
  for (const t of treats) drawTreat(t.x, t.y);

  // Obstacles
  for (const o of obstacles) drawObstacle(o.x, o.y, o.w, o.h);

  // Player (basset hound) with ear animation while airborne
  drawBassetHound(player.x, player.y, timeSec, !player.onGround);

  // HUD
  ctx.fillStyle = "#bbb";
  ctx.font = "10px system-ui, sans-serif";
  ctx.fillText(`Treats: ${score}`, 8, 14);
  ctx.fillText(`Jump: Space/W/↑`, 8, 28);

  if (gameOver) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText("Game Over!", 110, 85);
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillText("Press R to restart", 110, 102);
  }
}

// ----------------------------
// 7) Spawning
// ----------------------------
function spawnObstacle() {
  // Simple obstacle: a "crate" or "cone" on the ground
  const type = Math.random() < 0.5 ? "crate" : "cone";
  let w, h;
  if (type === "crate") { w = 12; h = 12; }
  else { w = 10; h = 16; }

  obstacles.push({
    x: canvas.width + 10,
    y: GROUND_Y - h,
    w,
    h,
    type
  });
}

function spawnTreat() {
  // Treat floats slightly above ground or mid-air
  const w = 6, h = 6;

  // Choose one of a few heights to make jumping meaningful
  const heights = [
    GROUND_Y - h - 2,     // near ground
    GROUND_Y - h - 18,    // low jump
    GROUND_Y - h - 34     // higher jump
  ];
  const y = heights[randInt(0, heights.length - 1)];

  treats.push({
    x: canvas.width + 10,
    y,
    w,
    h
  });
}

// ----------------------------
// 8) Drawing functions
// ----------------------------
function drawObstacle(x, y, w, h) {
  // Two obstacle styles depending on size/type
  ctx.fillStyle = "#7b5a2e";
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
  ctx.fillStyle = "#5a3f1f";
  ctx.fillRect(Math.round(x), Math.round(y), w, 2);
  ctx.fillStyle = "#3b2a15";
  ctx.fillRect(Math.round(x + 2), Math.round(y + 4), w - 4, 2);
}

function drawTreat(x, y) {
  // A little "biscuit" treat
  const px = Math.round(x);
  const py = Math.round(y);

  ctx.fillStyle = "#d8b26a";
  ctx.fillRect(px, py, 6, 6);
  ctx.fillStyle = "#b78f4d";
  ctx.fillRect(px, py, 6, 1); // top shading
  ctx.fillStyle = "#8a6a33";
  ctx.fillRect(px + 2, py + 2, 2, 2); // center dot
}

// Basset hound pixel sprite
// - When jumping, ears "flap" by oscillating their vertical offset.
function drawBassetHound(x, y, timeSec, isJumping) {
  const body = "#a9442e";   // red-brown
  const dark = "#6b2c1a";   // shading
  const ear = "#5a1f12";    // ear color
  const white = "#f5f5f5";  // snout/chest
  const eye = "#000000";

  const px = Math.round(x);
  const py = Math.round(y);

  // Ear flap animation while jumping
  // A small vertical wiggle + tiny phase shift so it feels like flopping
  let earWiggle = 0;
  if (isJumping) {
    earWiggle = Math.round(Math.sin(timeSec * 18) * 2); // -2..+2 pixels
  }

  // Body (long and low)
  ctx.fillStyle = body;
  ctx.fillRect(px + 3, py + 6, 12, 5);

  // Back shading
  ctx.fillStyle = dark;
  ctx.fillRect(px + 3, py + 6, 12, 1);

  // Head
  ctx.fillStyle = body;
  ctx.fillRect(px + 14, py + 4, 5, 5);

  // Snout
  ctx.fillStyle = white;
  ctx.fillRect(px + 17, py + 7, 2, 2);

  // Eye
  ctx.fillStyle = eye;
  ctx.fillRect(px + 16, py + 6, 1, 1);

  // Chest highlight
  ctx.fillStyle = white;
  ctx.fillRect(px + 12, py + 9, 2, 2);

  // Ears (long floppy) - animated while jumping
  ctx.fillStyle = ear;
  ctx.fillRect(px + 14, py + 9 + earWiggle, 2, 5);
  ctx.fillRect(px + 13, py + 9 + Math.round(earWiggle * 0.7), 1, 4);

  // Legs (short)
  ctx.fillStyle = dark;
  ctx.fillRect(px + 5, py + 11, 2, 3);
  ctx.fillRect(px + 10, py + 11, 2, 3);

  // Tail
  ctx.fillStyle = dark;
  ctx.fillRect(px + 1, py + 8, 2, 1);

  // Nose dot
  ctx.fillStyle = "#222";
  ctx.fillRect(px + 19, py + 8, 1, 1);
}

// ----------------------------
// 9) Restart / helpers
// ----------------------------
function resetGame() {
  obstacles = [];
  treats = [];
  score = 0;
  gameOver = false;

  player.y = GROUND_Y - player.h;
  player.vy = 0;
  player.onGround = true;

  obstacleTimer = randRange(OBSTACLE_SPAWN_MIN, OBSTACLE_SPAWN_MAX);
  treatTimer = randRange(TREAT_SPAWN_MIN, TREAT_SPAWN_MAX);
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function randInt(lo, hi) {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function randRange(lo, hi) {
  return Math.random() * (hi - lo) + lo;
}
