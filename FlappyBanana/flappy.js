// Flappy Banana - simple Flappy Bird clone
// Uses a placeholder sprite at assets/sprites/flappy_banana.svg

const canvas = document.getElementById('flappyCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width; const H = canvas.height;

// Game constants
// Reduced physics/game pace to make gameplay slower and easier
const GRAVITY = 0.18; // slower fall
// Flap velocity governs how strong each flap is; reduce magnitude for gentler jumps
const FLAP_VELOCITY = -5.0;
// Base bird size (collision box and visual size). Reduced slightly to make the game easier.
const BIRD_WIDTH = 76; // slightly smaller than previous 96
const BIRD_HEIGHT = 58; // slightly smaller than previous 72
const PIPE_WIDTH = 60;
// Variables (adjustable via UI) so you can fine-tune spacing/speed/gap for the larger sprite
let PIPE_GAP = 180; // vertical gap between pipes (px) — slightly larger for easier gameplay
let PIPE_SPACING = 160; // spacing (frames) between spawns (larger = less frequent)
let PIPE_SPEED = 2.2; // horizontal speed (px/frame) - slower world movement
// Ground height in pixels (used for spawn limits and drawing)
const GROUND_HEIGHT = 60;

// Assets
// Prefer PNG sprite if present; fall back to SVG placeholder.
const bananaImg = new Image();
bananaImg.crossOrigin = 'anonymous';
bananaImg.onload = () => console.log('Loaded banana sprite:', bananaImg.src);
bananaImg.onerror = () => {
  // If PNG failed to load, try the SVG fallback (already present in repo)
  if (bananaImg.src && bananaImg.src.endsWith('.png')) {
    console.warn('banana PNG not found, falling back to SVG placeholder');
    bananaImg.src = 'assets/sprites/flappy_banana.svg';
  } else {
    console.warn('banana sprite failed to load:', bananaImg.src);
  }
};
// Start by attempting to load the PNG version
bananaImg.src = 'assets/sprites/flappy_banana.png';

// Dead-state sprite (used when the banana dies)
const bananaDeadImg = new Image();
bananaDeadImg.crossOrigin = 'anonymous';
bananaDeadImg.onload = () => console.log('Loaded dead banana sprite:', bananaDeadImg.src);
bananaDeadImg.onerror = () => console.warn('dead banana sprite failed to load:', bananaDeadImg.src);
bananaDeadImg.src = 'assets/sprites/flappy_banana_dead.png';

// Ground image
const grassyImg = new Image();
grassyImg.crossOrigin = 'anonymous';
grassyImg.onload = () => console.log('Loaded grassy ground:', grassyImg.src);
grassyImg.onerror = () => console.warn('grassy ground failed to load:', grassyImg.src);
grassyImg.src = 'assets/sprites/grassy_ground.png';

// Tree trunk images to replace pipes
const trunkTopImg = new Image();
trunkTopImg.crossOrigin = 'anonymous';
trunkTopImg.onload = () => console.log('Loaded trunk top:', trunkTopImg.src);
trunkTopImg.onerror = () => console.warn('trunk top failed to load:', trunkTopImg.src);
trunkTopImg.src = 'assets/sprites/tree_trunk_top.png';

const trunkBottomImg = new Image();
trunkBottomImg.crossOrigin = 'anonymous';
trunkBottomImg.onload = () => console.log('Loaded trunk bottom:', trunkBottomImg.src);
trunkBottomImg.onerror = () => console.warn('trunk bottom failed to load:', trunkBottomImg.src);
trunkBottomImg.src = 'assets/sprites/tree_trunk_bottom.png';

// Game over image
const gameOverImg = new Image();
gameOverImg.crossOrigin = 'anonymous';
gameOverImg.onload = () => console.log('Loaded game over image:', gameOverImg.src);
gameOverImg.onerror = () => console.warn('game over image failed to load:', gameOverImg.src);
gameOverImg.src = 'assets/sprites/game_over.png';

// Bird state
let bird = {
  x: 80,
  y: H/2 - BIRD_HEIGHT/2,
  w: BIRD_WIDTH,
  h: BIRD_HEIGHT,
  vy: 0,
  rotation: 0
};

// Pipes: array of {x, topHeight}
let pipes = [];
let frames = 0;
let score = 0;
let best = parseInt(localStorage.getItem('flappy_best')) || 0;
let running = false;
let gameOver = false;
let deathAnim = false; // while true, animate death fall/rotation
// Ground scrolling offset for parallax (px)
let groundOffset = 0;

const scoreEl = document.getElementById('score');
const stateEl = document.getElementById('state');
// scoreboard in the header replaces the old start button
const scoreBoard = document.getElementById('scoreBoard');
const bestEl = document.getElementById('best');

function resetGame(){
  bird.x = 80; bird.y = H/2 - bird.h/2; bird.vy = 0; bird.rotation = 0;
  pipes = [];
  frames = 0; score = 0; running = true; gameOver = false;
  deathAnim = false;
  if (stateEl) stateEl.textContent = 'State: Playing';
  if (scoreEl) scoreEl.textContent = `Score: ${score}`;
  if (bestEl) bestEl.textContent = `Best: ${best}`;
}

function spawnPipe(){
  // random top pipe height (min 40, max H - gap - ground - margin)
  const margin = 80;
  const maxTop = Math.max(40, H - PIPE_GAP - GROUND_HEIGHT - margin);
  const topH = 40 + Math.random() * (maxTop - 40);
  pipes.push({x: W + 20, top: Math.floor(topH)});
}

function update(){
  // Allow bird death animation to continue even when running is false
  if (!running && !(gameOver && deathAnim)) return;

  frames++;

  // Spawn pipes periodically (PIPE_SPACING is frames between spawns)
  if (running && frames % Math.max(1, Math.floor(PIPE_SPACING)) === 0) {
    spawnPipe();
  }

  // Bird physics (during normal play)
  if (!(gameOver && deathAnim)) {
    bird.vy += GRAVITY;
    bird.y += bird.vy;
    bird.rotation = Math.min(Math.PI/4, Math.max(-Math.PI/6, bird.vy * 0.06));
  }

  // If death animation is active, continue a short rotation/fall even though pipes stop
  if (gameOver && deathAnim) {
    bird.vy += GRAVITY * 0.9; // slightly different fall for aesthetic
    bird.y += bird.vy;
    bird.rotation += 0.12; // rotate while falling
    // stop the animation at the ground
    if (bird.y + bird.h >= H - GROUND_HEIGHT) {
      bird.y = H - GROUND_HEIGHT - bird.h;
      deathAnim = false; // animation finished
    }
  }

  // Move pipes
  // Move pipes only when running
  if (running) {
    for (let i = pipes.length - 1; i >= 0; i--) {
      pipes[i].x -= PIPE_SPEED;

      // Score when pipe passes bird
      if (!pipes[i].scored && pipes[i].x + PIPE_WIDTH < bird.x) {
        pipes[i].scored = true;
        score++;
        if (scoreEl) scoreEl.textContent = `Score: ${score}`;
        if (score > best) { best = score; localStorage.setItem('flappy_best', best); if (bestEl) bestEl.textContent = `Best: ${best}`; }
      }

      // remove off-screen pipes
      if (pipes[i].x + PIPE_WIDTH < -50) pipes.splice(i,1);
    }
  }

  // advance ground scroll so it moves exactly with the trunks/pipes (same speed)
  if (running) {
    groundOffset = (groundOffset + PIPE_SPEED) % 100000;
  }

  // Collision detection (bird vs ground/ceiling)
  if (!(gameOver && deathAnim)) {
    if (bird.y + bird.h >= H - GROUND_HEIGHT || bird.y <= 0) {
      endGame();
    }
  }

  // Bird vs pipes
    for (let p of pipes) {
    const topRect = {x: p.x, y:0, width: PIPE_WIDTH, height: p.top};
    const bottomRect = {x: p.x, y: p.top + PIPE_GAP, width: PIPE_WIDTH, height: H - (p.top + PIPE_GAP) - GROUND_HEIGHT};
    const birdRect = {x: bird.x, y: bird.y, width: bird.w, height: bird.h};
    if (!(gameOver && deathAnim) && (rectCollision(birdRect, topRect) || rectCollision(birdRect, bottomRect))) {
      endGame();
    }
  }
}

function rectCollision(a,b){
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function endGame(){
  // Stop spawning/moving pipes, mark as game over and start a short death animation
  running = false;
  gameOver = true;
  deathAnim = true;
  // give the bird a little nudge downward to start the fall
  bird.vy = 3;
  bird.rotation = 0.2;
  if (stateEl) stateEl.textContent = 'State: Game Over';
}

function draw(){
  // clear
  ctx.clearRect(0,0,W,H);

  // background is provided by the canvas CSS using pretty_sky_bg.png

  // draw pipes
  ctx.fillStyle = '#2f855a';
  for (let p of pipes) {
    // top trunk (draw image if available, otherwise fill)
    const topH = p.top;
    if (trunkTopImg && trunkTopImg.complete && trunkTopImg.naturalWidth && topH > 0) {
      // draw the top trunk stretched to the required height
      ctx.drawImage(trunkTopImg, p.x, 0, PIPE_WIDTH, topH);
    } else {
      ctx.fillRect(p.x, 0, PIPE_WIDTH, topH);
    }

    // bottom trunk (should extend up to the top of the grass so there's no gap)
    const bottomY = p.top + PIPE_GAP;
    // Draw the bottom trunk all the way to the bottom of the canvas so it visually continues
    // under the grass (the grass is drawn later on top). Collision still uses GROUND_HEIGHT.
    const bottomH = Math.max(0, H - bottomY);
    if (bottomH > 0) {
      if (trunkBottomImg && trunkBottomImg.complete && trunkBottomImg.naturalWidth) {
        // draw bottom trunk behind the grass (grass drawn later)
        ctx.drawImage(trunkBottomImg, p.x, bottomY, PIPE_WIDTH, bottomH);
      } else {
        ctx.fillRect(p.x, bottomY, PIPE_WIDTH, bottomH);
      }
    }
  }

  // draw bird (banana sprite or fallback)
  // Choose the appropriate image: dead image when gameOver and it loaded, otherwise the normal banana
  const useDead = gameOver && bananaDeadImg && bananaDeadImg.complete && bananaDeadImg.naturalWidth;
  const imgToDraw = useDead ? bananaDeadImg : bananaImg;

  // Draw the bird exactly at its physics position so visuals match collisions.
  if (imgToDraw && imgToDraw.complete && imgToDraw.naturalWidth) {
    ctx.save();
    // draw with rotation around the bird's center (physics-based)
    ctx.translate(bird.x + bird.w/2, bird.y + bird.h/2);
    ctx.rotate(bird.rotation);
    ctx.drawImage(imgToDraw, -bird.w/2, -bird.h/2, bird.w, bird.h);
    ctx.restore();
  } else {
    // fallback: yellow ellipse matching the bird size
    const rw = bird.w / 2;
    const rh = bird.h / 2;
    ctx.fillStyle = '#FFE135';
    ctx.beginPath();
    ctx.ellipse(bird.x + bird.w/2, bird.y + bird.h/2, rw, rh, 0, 0, Math.PI*2);
    ctx.fill();
  }

  // If game over, show overlay
  if (gameOver) {
    // dim
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0,0,W,H);
    // draw game over image centered if available
    if (gameOverImg && gameOverImg.complete && gameOverImg.naturalWidth) {
      // scale image to fit nicely — max width 70% of canvas, preserve aspect
      const maxW = W * 0.7;
      const scale = Math.min(1, maxW / gameOverImg.naturalWidth);
      const imgW = gameOverImg.naturalWidth * scale;
      const imgH = gameOverImg.naturalHeight * scale;
      ctx.drawImage(gameOverImg, (W - imgW)/2, (H - imgH)/2 - 20, imgW, imgH);
    } else {
      ctx.fillStyle = '#fff';
      ctx.font = '28px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over', W/2, H/2 - 20);
      ctx.font = '18px Arial';
      ctx.fillText(`Score: ${score}  •  Best: ${best}`, W/2, H/2 + 12);
      ctx.fillText('Press Start or Space / Click to play again', W/2, H/2 + 44);
    }
  }

  // draw ground image as a horizontally-tiled, non-distorted strip and scroll it for motion
  if (grassyImg && grassyImg.complete && grassyImg.naturalWidth && grassyImg.naturalHeight) {
    // compute tile width so the image is scaled to GROUND_HEIGHT without distortion
    const tileScale = GROUND_HEIGHT / grassyImg.naturalHeight;
    const tileW = Math.round(grassyImg.naturalWidth * tileScale);

    // start drawing at negative offset so it scrolls smoothly
    let startX = - (groundOffset % tileW);
    // draw enough tiles to cover the canvas width
    for (let x = startX; x < W; x += tileW) {
      ctx.drawImage(grassyImg, x, H - GROUND_HEIGHT, tileW, GROUND_HEIGHT);
    }
  } else {
    // fallback: colored ground band
    ctx.fillStyle = '#6b8e23';
    ctx.fillRect(0, H - GROUND_HEIGHT, W, GROUND_HEIGHT);
  }
}

function loop(){
  update();
  draw();
  requestAnimationFrame(loop);
}

// Input handling
function flap(){
  if (!running) {
    resetGame();
    return;
  }
  bird.vy = FLAP_VELOCITY;
}

window.addEventListener('keydown', (e)=>{
  if (e.code === 'Space') { e.preventDefault(); flap(); }
});
canvas.addEventListener('click', ()=>flap());
if (scoreBoard) {
  // clicking the scoreboard acts as the restart control
  scoreBoard.addEventListener('click', ()=>{ resetGame(); });
}

// start idle loop
if (stateEl) stateEl.textContent = 'State: Ready';
if (scoreEl) scoreEl.textContent = `Score: ${score}`;
if (bestEl) bestEl.textContent = `Best: ${best}`;
loop();

// Wire up tuning UI controls (live)
const gapRange = document.getElementById('gapRange');
const speedRange = document.getElementById('speedRange');
const spacingRange = document.getElementById('spacingRange');
const gapVal = document.getElementById('gapVal');
const speedVal = document.getElementById('speedVal');
const spacingVal = document.getElementById('spacingVal');

if (gapRange && speedRange && spacingRange) {
  // initialize UI values
  gapRange.value = PIPE_GAP; gapVal.textContent = PIPE_GAP;
  speedRange.value = PIPE_SPEED; speedVal.textContent = PIPE_SPEED;
  spacingRange.value = PIPE_SPACING; spacingVal.textContent = PIPE_SPACING;

  gapRange.addEventListener('input', (e)=>{
    PIPE_GAP = parseInt(e.target.value,10);
    gapVal.textContent = PIPE_GAP;
  });
  speedRange.addEventListener('input', (e)=>{
    PIPE_SPEED = parseFloat(e.target.value);
    speedVal.textContent = PIPE_SPEED;
  });
  spacingRange.addEventListener('input', (e)=>{
    PIPE_SPACING = parseInt(e.target.value,10);
    spacingVal.textContent = PIPE_SPACING;
  });
}
