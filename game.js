// Bstein’s Adventure — a tiny Pitfall-like platformer for mobile + desktop.
// No external assets, pure canvas. Author: Cloud.
//
// Controls:
//  - Mobile: on-screen buttons at bottom (left, right, jump)
//  - Desktop: Arrow keys or A/D to move, Space/Up to jump
//
// Goal: Collect coins and reach Goldstein’s Penny at the far right.
// The level is a simple series of platforms; physics is basic for clarity.

(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const scoreEl = document.getElementById('score');
  const msgEl = document.getElementById('msg');

  // Responsive canvas
  function resize() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);

  // Game constants
  const GRAVITY = 0.9;
  const MOVE_SPEED = 4.0;
  const JUMP_VEL = -14;
  const FRICTION = 0.85;
  const MAX_FALL = 24;

  // Camera
  const camera = { x: 0, y: 0 };
  const viewW = () => canvas.clientWidth;
  const viewH = () => canvas.clientHeight;

  // Player
  const player = {
    x: 60, y: 0, w: 28, h: 36,
    vx: 0, vy: 0,
    grounded: false,
    facing: 1,
    coins: 0,
    won: false,
    dead: false
  };

  // Input
  const keys = { left: false, right: false, jump: false };
  function key(e, down) {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') keys.left = down;
    if (k === 'arrowright' || k === 'd') keys.right = down;
    if (k === ' ' || k === 'arrowup' || k === 'w') { 
      if (down) tryJump();
      e.preventDefault();
    }
  }
  window.addEventListener('keydown', e => key(e, true));
  window.addEventListener('keyup', e => key(e, false));

  // Touch controls
  function bindTouch(id, onDown, onUp) {
    const el = document.getElementById(id);
    const down = e => { e.preventDefault(); onDown(true); };
    const up = e => { e.preventDefault(); onUp(false); };
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up, { passive: false });
    el.addEventListener('touchcancel', up, { passive: false });
    el.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);
  }
  bindTouch('left', v => keys.left = v, v => keys.left = v);
  bindTouch('right', v => keys.right = v, v => keys.right = v);
  bindTouch('jump', v => { if (v) tryJump(); }, () => {});

  function tryJump() {
    if (player.grounded && !player.dead && !player.won) {
      player.vy = JUMP_VEL;
      player.grounded = false;
    }
  }

  // Level data: platforms, coins, hazards, goal
  // Simple hand-made layout in screen coordinates; camera follows player.
  // Platforms are rectangles. Coins/hazards are circles.
  const platforms = [];
  const coins = [];
  const hazards = [];
  let goal = null;

  function addPlatform(x, y, w, h) { platforms.push({ x, y, w, h }); }
  function addCoin(x, y) { coins.push({ x, y, r: 8, taken: false }); }
  function addHazard(x, y, r=12) { hazards.push({ x, y, r }); }
  function setGoal(x, y) { goal = { x, y, r: 14, taken: false }; }

  // Build a simple multi-screen level
  function buildLevel() {
    platforms.length = 0; coins.length = 0; hazards.length = 0;
    const groundY = 420;

    // Ground stretches
    for (let i=0;i<10;i++) addPlatform(i*640, groundY, 540, 24); // gaps between

    // Floating platforms and decorations
    addPlatform(200, 340, 120, 16);
    addPlatform(360, 300, 100, 16);
    addPlatform(520, 260, 120, 16);
    addPlatform(760, 360, 120, 16);
    addPlatform(980, 320, 120, 16);
    addPlatform(1240, 280, 160, 16);
    addPlatform(1500, 360, 120, 16);
    addPlatform(1700, 320, 120, 16);
    addPlatform(1900, 280, 160, 16);
    addPlatform(2160, 240, 160, 16);
    addPlatform(2440, 300, 120, 16);
    addPlatform(2680, 260, 160, 16);
    addPlatform(2960, 220, 160, 16);
    addPlatform(3240, 260, 160, 16);
    addPlatform(3480, 320, 120, 16);

    // Coins scattered
    const coinSpots = [
      [220, 310],[380,270],[540,230],
      [800,330],[1000,290],[1280,250],
      [1520,330],[1720,290],[1940,250],
      [2180,210],[2460,270],[2700,230],
      [2980,190],[3260,230],[3500,290]
    ];
    coinSpots.forEach(([x,y]) => addCoin(x,y));

    // Hazards (pits or spikes)
    addHazard(640-40, groundY+8, 14);
    addHazard(1280-40, groundY+8, 14);
    addHazard(1920-40, groundY+8, 14);
    addHazard(2560-40, groundY+8, 14);
    addHazard(3200-40, groundY+8, 14);

    // Goal: Goldstein’s Penny far right
    setGoal(3720, 290);

    // Reset player
    player.x = 60; player.y = 0; player.vx=0; player.vy=0; player.grounded=false;
    player.coins = 0; player.won = false; player.dead = false;
  }

  // Collision helpers
  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

  // Physics + game update
  function update() {
    // Input
    if (keys.left)  { player.vx -= 0.7; player.facing = -1; }
    if (keys.right) { player.vx += 0.7; player.facing =  1; }
    if (!keys.left && !keys.right) player.vx *= FRICTION;
    player.vx = clamp(player.vx, -MOVE_SPEED, MOVE_SPEED);

    // Gravity
    player.vy += GRAVITY;
    player.vy = clamp(player.vy, -999, MAX_FALL);

    // Apply velocity
    player.x += player.vx;
    player.y += player.vy;

    // Collide with platforms
    player.grounded = false;
    for (const p of platforms) {
      if (rectsOverlap(player, p)) {
        // Resolve vertical first
        const prevBottom = player.y - player.vy + player.h;
        const prevTop = player.y - player.vy;
        if (prevBottom <= p.y && player.vy > 0) {
          // landed
          player.y = p.y - player.h;
          player.vy = 0;
          player.grounded = true;
        } else if (prevTop >= p.y + p.h && player.vy < 0) {
          // hit ceiling
          player.y = p.y + p.h;
          player.vy = 0;
        } else {
          // horizontal resolve
          if (player.vx > 0) player.x = p.x - player.w;
          else if (player.vx < 0) player.x = p.x + p.w;
          player.vx = 0;
        }
      }
    }

    // Coins
    for (const c of coins) {
      if (!c.taken) {
        const dx = (player.x + player.w/2) - c.x;
        const dy = (player.y + player.h/2) - c.y;
        if (dx*dx + dy*dy < (c.r+14)*(c.r+14)) {
          c.taken = true;
          player.coins += 1;
        }
      }
    }

    // Hazards
    for (const h of hazards) {
      const dx = (player.x + player.w/2) - h.x;
      const dy = (player.y + player.h/2) - h.y;
      if (dx*dx + dy*dy < (h.r+12)*(h.r+12)) {
        // death -> respawn
        player.dead = true;
      }
    }
    if (player.y > 1000) player.dead = true; // fell off

    if (player.dead) {
      msgEl.textContent = 'Ouch. Tap to respawn.';
    }

    // Goal
    if (!player.won && goal) {
      const dx = (player.x + player.w/2) - goal.x;
      const dy = (player.y + player.h/2) - goal.y;
      if (dx*dx + dy*dy < (goal.r+14)*(goal.r+14)) {
        player.won = true;
        msgEl.textContent = 'You found Goldstein’s Penny!';
      }
    }

    // Camera follows
    camera.x = clamp(player.x + player.w/2 - viewW()/2, 0, 4000);
    camera.y = 0;

    // HUD
    scoreEl.textContent = `Coins: ${player.coins}`;
    if (!player.won && !player.dead) msgEl.textContent = 'Find Goldstein’s Penny →';
  }

  // Restart on click if dead or won
  canvas.addEventListener('pointerdown', () => {
    if (player.dead || player.won) {
      buildLevel();
    }
  });

  // Draw
  function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // parallax background
    drawParallax();

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Platforms
    for (const p of platforms) {
      ctx.fillStyle = '#2b3340';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#3c4758';
      ctx.fillRect(p.x, p.y, p.w, 4);
    }

    // Coins
    for (const c of coins) {
      if (c.taken) continue;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI*2);
      ctx.fillStyle = '#f6d354';
      ctx.fill();
      ctx.strokeStyle = '#b99431';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Hazards
    for (const s of hazards) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = '#a33a3a';
      ctx.fill();
    }

    // Goal: Goldstein’s Penny (bigger, shiny)
    if (goal) {
      ctx.beginPath();
      ctx.arc(goal.x, goal.y, goal.r, 0, Math.PI*2);
      ctx.fillStyle = '#ffd970';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#c7a03d';
      ctx.stroke();
      // spark
      ctx.beginPath();
      ctx.moveTo(goal.x-4, goal.y);
      ctx.lineTo(goal.x+4, goal.y);
      ctx.moveTo(goal.x, goal.y-4);
      ctx.lineTo(goal.x, goal.y+4);
      ctx.strokeStyle = '#fff2a8';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Player (Bran the explorer)
    drawPlayer();

    ctx.restore();
  }

  function drawPlayer() {
    const { x, y, w, h, facing } = player;
    // body
    ctx.fillStyle = '#9cc0ff';
    ctx.fillRect(x, y, w, h);
    // head
    ctx.fillStyle = '#f0d0b0';
    ctx.fillRect(x + w/2 - 10, y - 16, 20, 16);
    // hat
    ctx.fillStyle = '#3b2f1e';
    ctx.fillRect(x + w/2 - 12, y - 22, 24, 6);
    ctx.fillRect(x + w/2 - 8, y - 28, 16, 6);
    // face hint
    ctx.fillStyle = '#222';
    ctx.fillRect(x + (facing>0? w-10:2), y - 12, 4, 4);
  }

  function drawParallax() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    // sky
    ctx.fillStyle = '#141820';
    ctx.fillRect(0, 0, w, h);
    // distant layers
    const ox = -camera.x * 0.3;
    ctx.fillStyle = '#1b2230';
    for (let i=0;i<8;i++) {
      const base = i*300 + (ox % 300);
      ctx.fillRect(base, h-160, 200, 40);
      ctx.fillRect(base+100, h-200, 180, 36);
    }
    ctx.fillStyle = '#222b3b';
    for (let i=0;i<8;i++) {
      const base = i*260 + (ox * 0.8 % 260);
      ctx.fillRect(base, h-120, 180, 30);
    }
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  // Init
  buildLevel();
  resize();
  loop();
})();
