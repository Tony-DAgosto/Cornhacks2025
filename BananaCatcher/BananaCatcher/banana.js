// Banana Catcher - simple canvas game
(function(){
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const startBtn = document.getElementById('startBtn');

  const W = canvas.width; const H = canvas.height;

  // scale basket by 1.2x as requested
  const BASKET_WIDTH = 144; const BASKET_HEIGHT = 48;
  const BASKET_Y = H - 60;

  const GRAVITY = 0.35; // affects fruits falling
  // display size for all fruits (collision box will match this)
  const FRUIT_DISPLAY_SIZE = 56;
  const FRUIT_TYPES = [
    {name:'banana', color:'#ffeb3b', score:1},
    {name:'apple', color:'#ff5252', score:-1},
    {name:'orange', color:'#ff9800', score:-1},
    {name:'pear', color:'#8bc34a', score:-1}
  ];

  // preload fruit sprites (SVGs in assets/sprites). If images fail to load we fall back to shape drawing.
  // prefer PNG then fall back to SVG for each fruit (keeps folder self-contained)
  const FRUIT_SPRITES = {
    banana: ['./assets/sprites/banana.png', './assets/sprites/banana.svg'],
    apple: ['./assets/sprites/apple.png', './assets/sprites/apple.svg'],
    orange: ['./assets/sprites/orange.png', './assets/sprites/orange.svg'],
    pear: ['./assets/sprites/pear.png', './assets/sprites/pear.svg']
  };
  const fruitImages = {};

  // Load an array of sources, trying each until one succeeds (or none).
  function loadImageFallback(sources, cb){
    if(!sources || !sources.length) return cb(null);
    let idx = 0;
    const img = new Image();
    img.onload = () => cb(img);
    img.onerror = () => {
      idx++;
      if(idx >= sources.length) return cb(null);
      img.src = sources[idx];
    };
    img.src = sources[idx];
  }

  for(const key in FRUIT_SPRITES){
    loadImageFallback(FRUIT_SPRITES[key], (img) => {
      fruitImages[key] = img || null;
    });
  }

  // basket image (self-contained asset)
  const basketSpritePath = './assets/sprites/basket.png';
  const basketImg = new Image();
  basketImg.src = basketSpritePath;
  basketImg.onload = () => { /* ready */ };
  basketImg.onerror = () => { /* fallback to drawn basket */ };

  // background image for the game canvas
  const bgImg = new Image();
  bgImg.src = './assets/sprites/background.png';
  bgImg.onload = () => { /* ready */ };
  bgImg.onerror = () => { /* silently ignore */ };

  // game over image
  const gameOverImg = new Image();
  gameOverImg.src = './assets/sprites/game_over.png';
  gameOverImg.onload = () => { /* ready */ };
  gameOverImg.onerror = () => { /* ignore */ };

  let basket = {x: W/2 - BASKET_WIDTH/2, y: BASKET_Y, w: BASKET_WIDTH, h: BASKET_HEIGHT, vx:0, speed:6};
  let keys = {left:false,right:false};
  let fruits = [];
  let frames = 0;
  let running = false;
  let score = 0;
  const START_LIVES = 3;
  let lives = START_LIVES;
  const MAX_LIVES = 5;
  // track last time the player made a mistake (missed banana or caught bad fruit)
  // consecutive bananas caught without mistake (for life rewards)
  let consecutiveBananas = 0;
  let lastMistakeTime = performance.now();
  let gameOver = false;
  // difficulty increases slowly over time and with score
  let difficulty = 1.0;
  // slow difficulty climb — lowered so progression feels gentler
  const DIFFICULTY_RATE = 0.00006; // per frame (was 0.00012)
  const DIFFICULTY_MAX = 4.0;
  // basket base speed (will scale with difficulty)
  const BASE_BASKET_SPEED = 6;
  // DOM element for difficulty display
  const difficultyEl = document.getElementById('difficulty');
  // persistence helpers
  const DIFFICULTY_KEY = 'banana_lastDifficulty';
  // try to restore last difficulty from storage
  try{ const sv = parseFloat(localStorage.getItem(DIFFICULTY_KEY)); if(sv && !isNaN(sv)) difficulty = Math.max(1, Math.min(DIFFICULTY_MAX, sv)); }catch(e){}
  // ensure basket speed reflects restored difficulty at start
  try { basket.speed = BASE_BASKET_SPEED * (1 + (difficulty - 1) * 0.25); } catch(e) {}
  let lastSavedDifficulty = difficulty;
  let prevDifficulty = difficulty;

  // simple rectangle collision
  function rectsCollide(a,b){
    return !(b.x > a.x + a.w || b.x + b.w < a.x || b.y > a.y + a.h || b.y + b.h < a.y);
  }

  function spawnFruit(){
    const type = FRUIT_TYPES[Math.floor(Math.random()*FRUIT_TYPES.length)];
    // use fixed size for all fruits so visuals and collisions are consistent
    const size = FRUIT_DISPLAY_SIZE;
    const x = Math.random()*(W - size - 20) + 10;
    const y = -size - Math.random()*40;
    // drift increases slightly with difficulty
    const vx = (Math.random()-0.5)*(0.6 + difficulty*0.28);
    // base fall speed scales with difficulty and current score
    const vy = (1 + Math.random()*1.2) * (1 + (difficulty - 1) * 0.6 + Math.min(0.6, score * 0.01));
    // create fruit object but for bananas ensure reachability from prior banana(s)
    let newFruit = {x,y,w:size,h:size,vy,vx,type,caught:false};

    // helper: estimate frames until fruit reaches basket.y given initial vy and acceleration
    function estimateTimeToCatch(f){
      const a = GRAVITY * 0.2 * (1 + (difficulty - 1) * 0.8 + score*0.02);
      const deltaY = (basket.y - f.y);
      if (deltaY <= 0) return 0;
      const b = f.vy;
      const disc = b*b + 2*a*deltaY;
      if(disc <= 0 || a === 0) return Math.max(0.1, deltaY / Math.max(0.1, b));
      const t = (-b + Math.sqrt(disc)) / a;
      return t > 0 ? t : Math.max(0.1, (-b - Math.sqrt(disc)) / a);
    }

    if(type.name === 'banana'){
      const tNew = estimateTimeToCatch(newFruit);
      // find the banana with catch time immediately before tNew (if any)
      let prevBan = null; let prevT = -1;
      for(const f of fruits){
        if(f.type && f.type.name === 'banana'){
          const t = estimateTimeToCatch(f);
          if(t < tNew && t > prevT){ prevT = t; prevBan = f; }
        }
      }
      if(prevBan){
        // compute reachable horizontal distance between prevBan and newFruit
        const tDiff = Math.max(0.5, tNew - prevT); // at least some time
        const currentBasketSpeed = BASE_BASKET_SPEED * (1 + (difficulty - 1) * 0.25);
        const reachable = currentBasketSpeed * tDiff * 1.05; // small buffer
        const prevCenter = prevBan.x + prevBan.w/2;
        const newCenter = newFruit.x + newFruit.w/2;
        const dx = Math.abs(newCenter - prevCenter);
        if(dx > reachable){
          // move new fruit to be within reachable distance
          const sign = (newCenter > prevCenter) ? 1 : -1;
          const targetCenter = prevCenter + sign * reachable * 0.95;
          newFruit.x = Math.max(8, Math.min(W - newFruit.w - 8, targetCenter - newFruit.w/2));
        }
      }
    }

    fruits.push(newFruit);
  }

  function reset(){
    fruits = [];
    frames = 0;
    running = false;
    score = 0;
    lives = START_LIVES;
    lastMistakeTime = performance.now();
    consecutiveBananas = 0;
    gameOver = false;
  // ensure HUD and controls reflect reset state
  if(startBtn){ startBtn.style.display = 'inline-flex'; startBtn.textContent = 'Start'; }
    updateHUD();
    draw();
  }

  function updateHUD(){
    if(scoreEl) scoreEl.textContent = 'Score: ' + score;
    if(livesEl) livesEl.textContent = 'Lives: ' + lives;
  }

  function update(){
    if(!running) return;
    frames++;

  // life rewards changed: grant 1 life for every 7 consecutive bananas caught (handled when catching)

  // slowly increase difficulty while the game is running (slower growth)
  difficulty = Math.min(DIFFICULTY_MAX, difficulty + DIFFICULTY_RATE + Math.max(0, score) * 0.00001);
    // scale basket speed with difficulty
    basket.speed = BASE_BASKET_SPEED * (1 + (difficulty - 1) * 0.25);
    // update difficulty UI when it changes noticeably
    if(difficultyEl){
      difficultyEl.textContent = 'Difficulty: ' + difficulty.toFixed(2);
    }
    if(difficulty - prevDifficulty > 0.02){
      // flash bump
      if(difficultyEl) {
        difficultyEl.classList.add('bump');
        setTimeout(()=> difficultyEl.classList.remove('bump'), 260);
      }
      prevDifficulty = difficulty;
    }
    // persist occasionally when changed enough
    if(Math.abs(difficulty - lastSavedDifficulty) > 0.05 && typeof localStorage !== 'undefined'){
      try{ localStorage.setItem(DIFFICULTY_KEY, String(difficulty)); lastSavedDifficulty = difficulty; }catch(e){}
    }

    // spawn frequency: as difficulty and score increase, spawn more often
    const spawnFreq = Math.max(18, Math.floor(90 - difficulty * 30 - Math.min(60, score * 0.8)));
    if(frames % spawnFreq === 0){
      spawnFruit();
      // occasionally spawn a second fruit when difficulty is higher
      if(Math.random() < Math.min(0.25, (difficulty - 1) * 0.08)) spawnFruit();
    }

    // basket movement
    if(keys.left) basket.x -= basket.speed;
    if(keys.right) basket.x += basket.speed;
    // clamp
    basket.x = Math.max(8, Math.min(W - basket.w - 8, basket.x));

    // update fruits
    for(let i=fruits.length-1;i>=0;i--){
      const f = fruits[i];
  // gravity effect scales with difficulty and score to make drops faster
  f.vy += GRAVITY * 0.2 * (1 + (difficulty - 1) * 0.8 + score*0.02);
      f.y += f.vy;
      f.x += f.vx;

      // check collision with basket
      const fruitRect = {x:f.x,y:f.y,w:f.w,h:f.h};
      const basketRect = {x:basket.x,y:basket.y,w:basket.w,h:basket.h};
      if(rectsCollide(fruitRect,basketRect) && !f.caught){
        f.caught = true;
        if(f.type.name === 'banana'){
          score += f.type.score;
          // increment consecutive banana streak and award lives per 7 in a row
          consecutiveBananas++;
          while(consecutiveBananas >= 7 && lives < MAX_LIVES){
            consecutiveBananas -= 7;
            lives += 1;
            // visual bump on lives
            if(livesEl){ livesEl.classList.add('bump'); setTimeout(()=> livesEl.classList.remove('bump'), 300); }
          }
        } else {
          // catching a bad fruit is a mistake: penalize score and a life
          score += f.type.score; // negative
          lives -= 1;
          consecutiveBananas = 0; // reset streak
          // record mistake time for compatibility with older logic (unused now)
          lastMistakeTime = performance.now();
          updateHUD();
          if(lives <= 0){
            endGame();
            return;
          }
        }
        updateHUD();
        // remove with little pop
        fruits.splice(i,1);
        continue;
      }

      // if fruit falls off bottom
      if(f.y > H + 60){
        // if it's a banana, losing a life and reset streak
        if(f.type.name === 'banana'){
          lives -= 1;
          consecutiveBananas = 0;
          lastMistakeTime = performance.now();
          updateHUD();
          if(lives <= 0){
            endGame();
            return;
          }
        }
        fruits.splice(i,1);
      }
    }
  }

  function endGame(){
    running = false;
    // mark game over and show the start/restart button when the game ends
    gameOver = true;
  if(startBtn){ startBtn.style.display = 'inline-flex'; startBtn.textContent = 'Restart'; }
    // simple flash effect
    // TODO: show final score overlay
  }

  function draw(){
    // clear then draw background (scaled to cover)
    ctx.clearRect(0,0,W,H);
    if (bgImg && bgImg.complete && bgImg.naturalWidth && bgImg.naturalHeight) {
      const iw = bgImg.naturalWidth;
      const ih = bgImg.naturalHeight;
      // scale to cover the canvas
      const scale = Math.max(W / iw, H / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (W - dw) / 2;
      const dy = (H - dh) / 2;
      ctx.drawImage(bgImg, dx, dy, dw, dh);
    } else {
      // fallback: subtle solid background already provided by CSS/body; keep canvas transparent
    }

    // draw falling fruits
    for(const f of fruits){
      // try draw sprite if available
      const img = fruitImages[f.type.name];
      if(img && img.complete && img.naturalWidth && img.naturalHeight){
        // preserve image aspect ratio and center the image inside the fruit square
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        let dw = f.w, dh = f.h;
        const aspect = iw / ih;
        if (aspect > 1) {
          // image is wider than tall -> fit width
          dw = f.w;
          dh = f.w / aspect;
        } else {
          // image is taller (or square) -> fit height
          dh = f.h;
          dw = f.h * aspect;
        }
        const dx = f.x + (f.w - dw) / 2;
        const dy = f.y + (f.h - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
      } else {
        // fallback to simple circle-ish shape
        ctx.beginPath();
        ctx.fillStyle = f.type.color;
        ctx.ellipse(f.x + f.w/2, f.y + f.h/2, f.w/2, f.h/2, 0, 0, Math.PI*2);
        ctx.fill();
        // small stem
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(f.x + f.w*0.45, f.y + 2, 2, 6);
      }
    }

    // basket (image if available, otherwise drawn)
    if (basketImg && basketImg.complete && basketImg.naturalWidth) {
      // draw the basket image fitting the collision box
      ctx.drawImage(basketImg, basket.x, basket.y, basket.w, basket.h);
    } else {
      // fallback drawn basket
      ctx.fillStyle = '#6b4f2a';
      ctx.fillRect(basket.x, basket.y, basket.w, basket.h);
      // basket rim
      ctx.fillStyle = '#4a321d';
      ctx.fillRect(basket.x, basket.y-8, basket.w, 8);
    }

    // if game over, draw overlay and game over image
    if(gameOver){
      // dark overlay
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0,0,W,H);
      if(gameOverImg && gameOverImg.complete && gameOverImg.naturalWidth){
        const iw = gameOverImg.naturalWidth;
        const ih = gameOverImg.naturalHeight;
        // max width 70% of canvas, max height 40%
        const maxW = W * 0.7;
        const maxH = H * 0.45;
        const scale = Math.min(maxW / iw, maxH / ih, 1);
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = (W - dw) / 2;
        const dy = (H - dh) / 2 - 20; // slight upward offset
        ctx.drawImage(gameOverImg, dx, dy, dw, dh);
      } else {
        // fallback text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px system-ui, Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', W / 2, H / 2);
      }
    }
    // score/lives handled by DOM HUD
  }

  function loop(){
    update();
    draw();
    requestAnimationFrame(loop);
  }

  // input
  window.addEventListener('keydown', e => {
    if(e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.left = true;
    if(e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.right = true;
  });
  window.addEventListener('keyup', e => {
    if(e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.left = false;
    if(e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.right = false;
  });

  // start button
  startBtn.addEventListener('click', ()=>{
    if(!running){
      // reset difficulty when a new game starts
      difficulty = 1.0;
      prevDifficulty = difficulty;
      lastSavedDifficulty = difficulty;
      try{ localStorage.setItem(DIFFICULTY_KEY, String(difficulty)); }catch(e){}
      if(difficultyEl) difficultyEl.textContent = 'Difficulty: ' + difficulty.toFixed(2);
      // restart the game state and begin running
      reset();
      running = true;
      // hide the start button while running (remove status indicator)
      if(startBtn) startBtn.style.display = 'none';
    }
  });

  // resetDifficultyBtn removed from UI per user request; difficulty already resets on new game start.

  // init
  reset();
  loop();
})();
