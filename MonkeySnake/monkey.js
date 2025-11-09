// Monkey Snake - a snake-like game with a monkey who eats bananas
(function(){
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const startBtn = document.getElementById('startBtn');

  // use a 15x15 grid and compute tile size from the canvas so it scales
  const COLS = 15;
  const ROWS = 15;
  const TILE = Math.floor(canvas.width / COLS);

  let dir = {x:1,y:0};
  // queued direction change to apply on next movement tick (prevents multiple turns in one step)
  let nextDir = null;
  let monkey = {x: Math.floor(COLS/2), y: Math.floor(ROWS/2)};
  let tail = [];
  let tailLen = 3;
  let banana = null;
  let running = false;
  // timing: use millisecond-based movement ticks for consistent speed across refresh rates
  let lastMoveTime = 0;
  // milliseconds between each movement step; higher = slower (tweakable)
  const MOVE_MS = 120;
  let score = 0;
  let gameOverState = false;

  // try PNG monkey first and fallback to SVG if PNG not available
  const monkeyImg = new Image();
  monkeyImg.src = './assets/sprites/monkey.png';
  monkeyImg.onerror = () => { monkeyImg.src = './assets/sprites/monkey.svg'; };
  // prefer PNG banana if available inside this folder
  const bananaImg = new Image(); bananaImg.src = './assets/sprites/banana.png';
    // game over image
    const gameOverImg = new Image();
    gameOverImg.src = './assets/sprites/game_over.png';
  // background image for the playfield
  const bgImg = new Image(); bgImg.src = './assets/sprites/background.png';
  // if the game over image loads after the end, redraw overlay
  gameOverImg.onload = () => {
    if (gameOverState) drawGameOverOverlay();
  };

  function randPos(){
    return {x: Math.floor(Math.random()*COLS), y: Math.floor(Math.random()*ROWS)};
  }

  function placeBanana(){
    let p = randPos();
    // avoid placing on tail or head
    while((p.x === monkey.x && p.y === monkey.y) || tail.some(s=>s.x===p.x && s.y===p.y)){
      p = randPos();
    }
    banana = p;
  }

  function reset(){
    dir = {x:1,y:0};
    monkey = {x: Math.floor(COLS/2), y: Math.floor(ROWS/2)};
    tail = [];
    tailLen = 3;
    score = 0;
    running = false;
    startBtn.style.display = 'inline-flex';
    startBtn.textContent = 'Start';
    updateHUD();
    placeBanana();
    draw();
  }

  function updateHUD(){ if(scoreEl) scoreEl.textContent = 'Score: ' + score; }

  function step(){
    if(!running) return;
    const now = performance.now();
    // only advance movement when enough ms have elapsed
    if (now - lastMoveTime < MOVE_MS) return;
    lastMoveTime = now;
    // apply a queued direction change (only one per movement) to avoid rapid multi-turn issues
    if(nextDir){ dir = nextDir; nextDir = null; }
    // move
    tail.unshift({x: monkey.x, y: monkey.y});
    monkey.x += dir.x; monkey.y += dir.y;
    // wrap? no — hitting wall ends game
    if(monkey.x < 0 || monkey.x >= COLS || monkey.y < 0 || monkey.y >= ROWS){
      return endGame();
    }
  // check self collision
    if(tail.some(seg=>seg.x===monkey.x && seg.y===monkey.y)) return endGame();

    // keep tail length
    while(tail.length > tailLen) tail.pop();

    // eat banana
    if(banana && monkey.x === banana.x && monkey.y === banana.y){
      tailLen += 1;
      score += 1;
      placeBanana();
      updateHUD();
    }
  }

  function endGame(){
    running = false;
    gameOverState = true;
    startBtn.style.display = 'inline-flex';
    startBtn.textContent = 'Restart';
    // draw overlay (image may not be loaded yet)
    drawGameOverOverlay();
  }

  function drawGameOverOverlay(){
    draw();
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    if (gameOverImg && gameOverImg.complete && gameOverImg.naturalWidth) {
      const iw = gameOverImg.naturalWidth;
      const ih = gameOverImg.naturalHeight;
      const maxW = canvas.width * 0.7;
      const maxH = canvas.height * 0.45;
      const scale = Math.min(maxW / iw, maxH / ih, 1);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (canvas.width - dw) / 2;
      const dy = (canvas.height - dh) / 2 - 20;
      ctx.drawImage(gameOverImg, dx, dy, dw, dh);
    } else {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 28px system-ui, Arial'; ctx.textAlign='center';
      ctx.fillText('Game Over', canvas.width/2, canvas.height/2 - 10);
      ctx.font = '16px system-ui, Arial'; ctx.fillText('Score: ' + score, canvas.width/2, canvas.height/2 + 20);
    }
  }

  function draw(){
    // clear
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // draw background image if available, otherwise fallback to solid fill
    if (bgImg && bgImg.complete && bgImg.naturalWidth) {
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#7ec0a7'; ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    // overlay a subtle 15x15 grid so the player can see tiles
  ctx.save();
  // solid black grid lines; slightly thinner per request
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
    for (let x = 0; x <= COLS; x++) {
      const px = x * TILE + 0.5; // 0.5 to make 1px crisp
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      const py = y * TILE + 0.5;
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(canvas.width, py); ctx.stroke();
    }
    ctx.restore();
    // draw banana
    if(banana){
      if(bananaImg && bananaImg.complete){
        ctx.drawImage(bananaImg, banana.x*TILE + 2, banana.y*TILE + 2, TILE-4, TILE-4);
      } else {
        ctx.fillStyle = '#ffd54a'; ctx.fillRect(banana.x*TILE+3, banana.y*TILE+3, TILE-6, TILE-6);
      }
    }
    // draw tail
    for(let i=tail.length-1;i>=0;i--){
      const s = tail[i];
      ctx.fillStyle = '#8d5524'; ctx.fillRect(s.x*TILE+2, s.y*TILE+2, TILE-4, TILE-4);
    }
    // draw monkey head
    if(monkeyImg && monkeyImg.complete){
      ctx.drawImage(monkeyImg, monkey.x*TILE+1, monkey.y*TILE+1, TILE-2, TILE-2);
    } else {
      ctx.fillStyle='#5b3a21'; ctx.fillRect(monkey.x*TILE+2, monkey.y*TILE+2, TILE-4, TILE-4);
    }

    // If the game is over, draw the persistent overlay so it remains visible
    if (gameOverState) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0,0,canvas.width,canvas.height);
      if (gameOverImg && gameOverImg.complete && gameOverImg.naturalWidth) {
        const iw = gameOverImg.naturalWidth;
        const ih = gameOverImg.naturalHeight;
        const maxW = canvas.width * 0.7;
        const maxH = canvas.height * 0.45;
        const scale = Math.min(maxW / iw, maxH / ih, 1);
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = (canvas.width - dw) / 2;
        const dy = (canvas.height - dh) / 2 - 20;
        ctx.drawImage(gameOverImg, dx, dy, dw, dh);
      } else {
        ctx.fillStyle = '#fff'; ctx.font = 'bold 28px system-ui, Arial'; ctx.textAlign='center';
        ctx.fillText('Game Over', canvas.width/2, canvas.height/2 - 10);
        ctx.font = '16px system-ui, Arial'; ctx.fillText('Score: ' + score, canvas.width/2, canvas.height/2 + 20);
      }
    }
  }

  function loop(){ step(); draw(); requestAnimationFrame(loop); }

  // unified keyboard handler: support arrows + WASD and prevent scrolling
  window.addEventListener('keydown', e => {
    const k = e.key;
    const isArrowOrWASD = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(k);
    if(!isArrowOrWASD) return;
    // prevent the browser from scrolling when arrow keys are used
    e.preventDefault();
    // map key to candidate direction
    let candidate = null;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') candidate = {x:0, y:-1};
    else if (k === 'ArrowDown' || k === 's' || k === 'S') candidate = {x:0, y:1};
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') candidate = {x:-1, y:0};
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') candidate = {x:1, y:0};

    if(!candidate) return;
    // ignore attempts to reverse direction directly
    if (candidate.x === -dir.x && candidate.y === -dir.y) return;
    // queue the direction to be applied on the next movement tick; only queue one change
    if (nextDir === null) nextDir = candidate;
  });

  startBtn.addEventListener('click', ()=>{
    if(!running){
      // start game
      running = true;
      gameOverState = false;
      startBtn.style.display = 'none';
      // reset state
      tail = [];
      tailLen = 3;
      dir = {x:1,y:0};
      monkey = {x: Math.floor(COLS/2), y: Math.floor(ROWS/2)};
      // initialize timing anchor so the first move happens after MOVE_MS
      lastMoveTime = performance.now();
      score = 0; updateHUD();
      placeBanana();
    }
  });

  // (input handled by the unified handler above)

  // initialization
  placeBanana();
  reset();
  loop();
})();
