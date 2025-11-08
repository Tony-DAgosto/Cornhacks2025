// Game Constants and Configuration
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.5;
const INITIAL_JUMP_FORCE = -12;
const BOUNCE_FORCE = -20;
const MOVE_SPEED = 5;
// Player size (doubled from original to make the banana ninja larger)
const PLAYER_WIDTH = 60;
const PLAYER_HEIGHT = 80;

// Game State Management
let gameState = 'MENU'; // MENU, LEVEL_SELECT, PLAYING, PAUSED, GAME_OVER, WIN
let currentLevel = 0;
let maxLevelReached = parseInt(localStorage.getItem('maxLevelReached')) || 1;

// Initialize Canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Player sprite images (attempt to load left/right facing sprites)
const playerImgLeft = new Image();
playerImgLeft.src = 'assets/sprites/ninja_banana_left-nobg.png';
const playerImgRight = new Image();
playerImgRight.src = 'assets/sprites/ninja_banana_right-nobg.png';

// Game Classes
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = PLAYER_WIDTH;
        this.height = PLAYER_HEIGHT;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isJumping = false;
        this.lives = 3;
        this.score = 0;
        this.checkpointX = x;
        this.checkpointY = y;
        // Facing direction used to choose sprite ('left' or 'right')
        this.facing = 'right';
    }

    update() {
        // Apply gravity
        this.velocityY += GRAVITY;

        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Basic boundary collision
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

        // Ground collision
        if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
            this.velocityY = 0;
            this.isJumping = false;
        }
    }

    draw() {
        // Try to draw sprite image based on facing direction.
        // If images aren't available yet, fall back to the simple rectangle drawing.
        const imgLeftReady = playerImgLeft && playerImgLeft.complete && playerImgLeft.naturalWidth;
        const imgRightReady = playerImgRight && playerImgRight.complete && playerImgRight.naturalWidth;

        if (this.facing === 'left' && imgLeftReady) {
            ctx.drawImage(playerImgLeft, this.x, this.y, this.width, this.height);
        } else if (this.facing === 'right' && imgRightReady) {
            ctx.drawImage(playerImgRight, this.x, this.y, this.width, this.height);
        } else if (imgRightReady) {
            // default to right-facing if available
            ctx.drawImage(playerImgRight, this.x, this.y, this.width, this.height);
        } else {
            // Fallback: simple banana rectangle with headband
            ctx.fillStyle = '#FFE135';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = '#000000';
            ctx.fillRect(this.x, this.y + 10, this.width, 5);
        }
    }

    jump() {
        if (!this.isJumping) {
            this.velocityY = INITIAL_JUMP_FORCE;
            this.isJumping = true;
        }
    }

    respawn() {
        this.x = this.checkpointX;
        this.y = this.checkpointY;
        this.velocityX = 0;
        this.velocityY = 0;
    }
}

class Platform {
    constructor(x, y, width, height, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
    }

    draw() {
        switch(this.type) {
            case 'normal':
                ctx.fillStyle = '#8B4513'; // Brown for regular platforms
                break;
            case 'bounce':
                ctx.fillStyle = '#FFE135'; // Bright yellow for bounce pads
                break;
            case 'obstacle':
                ctx.fillStyle = '#FF0000'; // Red for obstacles
                break;
            case 'goal':
                ctx.fillStyle = '#00FF00'; // Green for goal
                break;
        }
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw spring coils for bounce pads to make them visually distinct
        if (this.type === 'bounce') {
            ctx.strokeStyle = '#CC8B00';
            ctx.lineWidth = 2;
            const coilCount = 3;
            const coilSpacing = this.height / (coilCount + 1);
            
            for (let i = 1; i <= coilCount; i++) {
                const y = this.y + (coilSpacing * i);
                // Draw wavy lines to represent springs
                ctx.beginPath();
                ctx.moveTo(this.x + 5, y);
                ctx.quadraticCurveTo(this.x + this.width / 2, y - 4, this.x + this.width - 5, y);
                ctx.stroke();
            }
        }
    }
}

class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 15;
        this.height = 15;
        this.collected = false;
    }

    draw() {
        if (!this.collected) {
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class LifeToken {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.collected = false;
    }

    draw() {
        if (!this.collected) {
            // Draw green heart-shaped token
            ctx.fillStyle = '#00FF00';
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw white star/plus in center to indicate extra life
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('+', this.x + this.width/2, this.y + this.height/2);
        }
    }
}

// Level Designs
const level1Data = {
    platforms: [
        // Ground
        new Platform(0, 550, 800, 50, 'normal'),
        // Tutorial platforms
        new Platform(100, 450, 100, 20, 'normal'),
        new Platform(250, 400, 100, 20, 'normal'),
        new Platform(400, 350, 100, 20, 'normal'),
        new Platform(550, 300, 100, 20, 'normal'),
        // Goal platform
        new Platform(650, 250, 50, 50, 'goal')
    ],
    coins: [
        new Coin(120, 420),
        new Coin(270, 370),
        new Coin(420, 320),
        new Coin(570, 270),
        new Coin(650, 220)
    ]
};

const level2Data = {
    platforms: [
        // Ground
        new Platform(0, 550, 800, 50, 'normal'),
        // Platforms with hazards
        new Platform(100, 450, 150, 20, 'normal'),
        new Platform(350, 400, 150, 20, 'normal'),
        new Platform(600, 350, 150, 20, 'normal'),
        new Platform(350, 300, 150, 20, 'normal'),
        new Platform(100, 250, 150, 20, 'normal'),
        // Hazards
        new Platform(350, 380, 30, 20, 'obstacle'),
        new Platform(600, 330, 30, 20, 'obstacle'),
        // Goal
        new Platform(100, 200, 50, 50, 'goal')
    ],
    coins: Array(10).fill(null).map((_, i) => {
        const x = 100 + (i * 70);
        const y = 400 - (Math.sin(i * 0.5) * 100);
        return new Coin(x, y);
    })
};

const level3Data = {
    platforms: [
        // Ground
        new Platform(0, 550, 800, 50, 'normal'),
        // Platforms requiring different jump heights
        new Platform(100, 480, 80, 20, 'normal'),
        new Platform(250, 450, 80, 20, 'normal'),
        new Platform(400, 400, 80, 20, 'normal'),
        new Platform(550, 320, 80, 20, 'normal'),
        new Platform(400, 240, 80, 20, 'normal'),
        new Platform(250, 180, 80, 20, 'normal'),
        // Goal
        new Platform(100, 120, 50, 50, 'goal')
    ],
    coins: Array(10).fill(null).map((_, i) => {
        const x = 150 + (i * 60);
        const y = 300 - (Math.cos(i * 0.7) * 150);
        return new Coin(x, y);
    })
};

const level4Data = {
    platforms: [
        // Ground
        new Platform(0, 550, 800, 50, 'normal'),
        // Platforms with bounce pads
        new Platform(100, 450, 120, 20, 'normal'),
        new Platform(300, 500, 120, 20, 'bounce'),
        new Platform(500, 400, 120, 20, 'normal'),
        new Platform(700, 500, 120, 20, 'bounce'),
        new Platform(500, 250, 120, 20, 'normal'),
        // Hazards
        new Platform(300, 380, 30, 20, 'obstacle'),
        new Platform(700, 330, 30, 20, 'obstacle'),
        // Goal
        new Platform(700, 200, 50, 50, 'goal')
    ],
    coins: Array(10).fill(null).map((_, i) => {
        const x = 100 + (i * 70);
        const y = 200 + (Math.sin(i * 0.8) * 150);
        return new Coin(x, y);
    })
};

const level5Data = {
    platforms: [
        // Ground
        new Platform(0, 550, 800, 50, 'normal'),
        // Complex platform arrangement
        new Platform(100, 480, 100, 20, 'normal'),
        new Platform(300, 450, 100, 20, 'bounce'),
        new Platform(500, 400, 100, 20, 'normal'),
        new Platform(700, 350, 100, 20, 'bounce'),
        new Platform(500, 300, 100, 20, 'normal'),
        new Platform(300, 250, 100, 20, 'normal'),
        new Platform(100, 200, 100, 20, 'bounce'),
        // Hazards
        new Platform(300, 430, 30, 20, 'obstacle'),
        new Platform(500, 380, 30, 20, 'obstacle'),
        new Platform(700, 330, 30, 20, 'obstacle'),
        new Platform(300, 230, 30, 20, 'obstacle'),
        // Goal
        new Platform(700, 150, 50, 50, 'goal')
    ],
    coins: Array(15).fill(null).map((_, i) => {
        const x = 100 + (i * 50);
        const y = 150 + (Math.sin(i * 0.5) * 200);
        return new Coin(x, y);
    })
};

const allLevels = [level1Data, level2Data, level3Data, level4Data, level5Data];
let levelData = allLevels[currentLevel];

// Levels 6-15 (10 new levels)
const level6Data = {
    platforms: [
        new Platform(0, 550, 800, 50, 'normal'),
        new Platform(100, 480, 80, 20, 'normal'),
        new Platform(250, 420, 80, 20, 'bounce'),
        new Platform(400, 360, 80, 20, 'normal'),
        new Platform(550, 420, 80, 20, 'bounce'),
        new Platform(700, 360, 80, 20, 'normal'),
        new Platform(400, 280, 80, 20, 'normal'),
        new Platform(300, 200, 30, 20, 'obstacle'),
        new Platform(500, 200, 30, 20, 'obstacle'),
        new Platform(700, 200, 50, 50, 'goal')
    ],
    coins: Array(12).fill(null).map((_, i) => new Coin(50 + i * 65, 150 + Math.sin(i * 0.4) * 150))
};

const level7Data = {
    platforms: [
        new Platform(0, 550, 800, 50, 'normal'),
        new Platform(100, 450, 100, 20, 'normal'),
        new Platform(300, 400, 100, 20, 'bounce'),
        new Platform(500, 350, 100, 20, 'normal'),
        new Platform(700, 300, 100, 20, 'bounce'),
        new Platform(500, 250, 100, 20, 'normal'),
        new Platform(300, 200, 100, 20, 'normal'),
        new Platform(250, 380, 30, 20, 'obstacle'),
        new Platform(450, 330, 30, 20, 'obstacle'),
        new Platform(650, 280, 30, 20, 'obstacle'),
        new Platform(700, 150, 50, 50, 'goal')
    ],
    coins: Array(15).fill(null).map((_, i) => new Coin(100 + i * 50, 200 + Math.cos(i * 0.5) * 200))
};

const level8Data = {
    platforms: [
        new Platform(0, 550, 800, 50, 'normal'),
        new Platform(50, 480, 80, 20, 'normal'),
        new Platform(150, 420, 80, 20, 'bounce'),
        new Platform(250, 370, 80, 20, 'normal'),
        new Platform(350, 420, 80, 20, 'bounce'),
        new Platform(450, 370, 80, 20, 'normal'),
        new Platform(550, 420, 80, 20, 'bounce'),
        new Platform(650, 370, 80, 20, 'normal'),
        new Platform(400, 250, 30, 20, 'obstacle'),
        new Platform(200, 250, 30, 20, 'obstacle'),
        new Platform(600, 250, 30, 20, 'obstacle'),
        new Platform(700, 200, 50, 50, 'goal')
    ],
    coins: Array(14).fill(null).map((_, i) => new Coin(40 + i * 55, 150 + Math.sin(i * 0.6) * 180)),
    lifeTokens: [
        new LifeToken(150, 380)  // On the bounce pad area
    ]
};

const level9Data = {
    platforms: [
        new Platform(0, 550, 800, 50, 'normal'),
        new Platform(80, 480, 70, 20, 'normal'),
        new Platform(200, 430, 70, 20, 'bounce'),
        new Platform(320, 380, 70, 20, 'normal'),
        new Platform(440, 430, 70, 20, 'bounce'),
        new Platform(560, 380, 70, 20, 'normal'),
        new Platform(680, 430, 70, 20, 'bounce'),
        new Platform(400, 300, 70, 20, 'normal'),
        new Platform(150, 350, 30, 20, 'obstacle'),
        new Platform(350, 350, 30, 20, 'obstacle'),
        new Platform(550, 350, 30, 20, 'obstacle'),
        new Platform(700, 200, 50, 50, 'goal')
    ],
    coins: Array(16).fill(null).map((_, i) => new Coin(30 + i * 50, 120 + Math.sin(i * 0.7) * 200))
};

const level10Data = {
    platforms: [
        new Platform(0, 550, 800, 50, 'normal'),
        new Platform(100, 480, 90, 20, 'normal'),
        new Platform(250, 430, 90, 20, 'bounce'),
        new Platform(400, 380, 90, 20, 'normal'),
        new Platform(550, 430, 90, 20, 'bounce'),
        new Platform(100, 330, 90, 20, 'normal'),
        new Platform(400, 280, 90, 20, 'bounce'),
        new Platform(700, 230, 90, 20, 'normal'),
        new Platform(300, 360, 30, 20, 'obstacle'),
        new Platform(600, 360, 30, 20, 'obstacle'),
        new Platform(200, 250, 30, 20, 'obstacle'),
        new Platform(700, 150, 50, 50, 'goal')
    ],
    coins: Array(18).fill(null).map((_, i) => new Coin(60 + i * 45, 100 + Math.sin(i * 0.5) * 250))
};

const level11Data = {
    platforms: [
        new Platform(0, 550, 800, 50, 'normal'),
        new Platform(100, 470, 100, 20, 'bounce'),
        new Platform(250, 410, 100, 20, 'normal'),
        new Platform(400, 470, 100, 20, 'bounce'),
        new Platform(550, 410, 100, 20, 'normal'),
        new Platform(700, 470, 100, 20, 'bounce'),
        new Platform(350, 340, 100, 20, 'normal'),
        new Platform(200, 280, 100, 20, 'bounce'),
        new Platform(600, 280, 100, 20, 'bounce'),
        new Platform(400, 200, 30, 20, 'obstacle'),
        new Platform(300, 200, 30, 20, 'obstacle'),
        new Platform(500, 200, 30, 20, 'obstacle'),
        new Platform(700, 150, 50, 50, 'goal')
    ],
    coins: Array(18).fill(null).map((_, i) => new Coin(50 + i * 48, 120 + Math.cos(i * 0.6) * 220))
};

const level12Data = {
    platforms: [
        new Platform(0, 550, 800, 50, 'normal'),
        new Platform(100, 460, 80, 20, 'bounce'),
        new Platform(220, 400, 80, 20, 'normal'),
        new Platform(340, 460, 80, 20, 'bounce'),
        new Platform(460, 400, 80, 20, 'normal'),
        new Platform(580, 460, 80, 20, 'bounce'),
        new Platform(700, 400, 80, 20, 'normal'),
        new Platform(400, 320, 80, 20, 'bounce'),
        new Platform(200, 280, 80, 20, 'normal'),
        new Platform(600, 280, 80, 20, 'normal'),
        new Platform(250, 360, 30, 20, 'obstacle'),
        new Platform(550, 360, 30, 20, 'obstacle'),
        new Platform(700, 150, 50, 50, 'goal')
    ],
    coins: Array(20).fill(null).map((_, i) => new Coin(40 + i * 40, 100 + Math.sin(i * 0.4) * 250)),
    lifeTokens: [
        new LifeToken(400, 280)
    ]
};

const level13Data = {
    platforms: [
        new Platform(0, 550, 800, 50, 'normal'),
        new Platform(80, 470, 100, 20, 'normal'),
        new Platform(200, 420, 100, 20, 'bounce'),
        new Platform(320, 370, 100, 20, 'normal'),
        new Platform(440, 420, 100, 20, 'bounce'),
        new Platform(560, 370, 100, 20, 'normal'),
        new Platform(680, 420, 100, 20, 'bounce'),
        new Platform(300, 290, 100, 20, 'normal'),
        new Platform(500, 290, 100, 20, 'normal'),
        new Platform(250, 350, 30, 20, 'obstacle'),
        new Platform(450, 350, 30, 20, 'obstacle'),
        new Platform(650, 350, 30, 20, 'obstacle'),
        new Platform(400, 210, 30, 20, 'obstacle'),
        new Platform(700, 150, 50, 50, 'goal')
    ],
    coins: Array(20).fill(null).map((_, i) => new Coin(30 + i * 42, 80 + Math.sin(i * 0.5) * 280))
};

const level14Data = {
    platforms: [
        new Platform(0, 550, 800, 50, 'normal'),
        new Platform(100, 460, 100, 20, 'bounce'),
        new Platform(250, 410, 100, 20, 'normal'),
        new Platform(400, 460, 100, 20, 'bounce'),
        new Platform(550, 410, 100, 20, 'normal'),
        new Platform(700, 460, 100, 20, 'bounce'),
        new Platform(150, 330, 100, 20, 'normal'),
        new Platform(400, 330, 100, 20, 'bounce'),
        new Platform(650, 330, 100, 20, 'normal'),
        new Platform(300, 260, 100, 20, 'bounce'),
        new Platform(500, 260, 100, 20, 'normal'),
        new Platform(200, 390, 30, 20, 'obstacle'),
        new Platform(500, 390, 30, 20, 'obstacle'),
        new Platform(250, 300, 30, 20, 'obstacle'),
        new Platform(600, 300, 30, 20, 'obstacle'),
        new Platform(700, 150, 50, 50, 'goal')
    ],
    coins: Array(22).fill(null).map((_, i) => new Coin(25 + i * 38, 50 + Math.cos(i * 0.5) * 300)),
    lifeTokens: [
        new LifeToken(300, 220)
    ]
};

const level15Data = {
    platforms: [
        new Platform(0, 550, 800, 50, 'normal'),
        new Platform(100, 460, 100, 20, 'bounce'),
        new Platform(220, 410, 100, 20, 'normal'),
        new Platform(340, 460, 100, 20, 'bounce'),
        new Platform(460, 410, 100, 20, 'normal'),
        new Platform(580, 460, 100, 20, 'bounce'),
        new Platform(700, 410, 100, 20, 'normal'),
        new Platform(180, 340, 100, 20, 'bounce'),
        new Platform(420, 340, 100, 20, 'bounce'),
        new Platform(660, 340, 100, 20, 'bounce'),
        new Platform(300, 260, 100, 20, 'normal'),
        new Platform(500, 260, 100, 20, 'normal'),
        new Platform(150, 430, 30, 20, 'obstacle'),
        new Platform(350, 430, 30, 20, 'obstacle'),
        new Platform(550, 430, 30, 20, 'obstacle'),
        new Platform(350, 310, 30, 20, 'obstacle'),
        new Platform(600, 310, 30, 20, 'obstacle'),
        new Platform(250, 230, 30, 20, 'obstacle'),
        new Platform(550, 230, 30, 20, 'obstacle'),
        new Platform(700, 150, 50, 50, 'goal')
    ],
    coins: Array(25).fill(null).map((_, i) => new Coin(20 + i * 35, 40 + Math.sin(i * 0.4) * 320)),
    lifeTokens: [
        new LifeToken(420, 300)
    ]
};

// Update allLevels to include all 15 levels
allLevels.push(level6Data, level7Data, level8Data, level9Data, level10Data, level11Data, level12Data, level13Data, level14Data, level15Data);

// Create player instance
const player = new Player(50, 500);

// Input Handling
const keys = {
    left: false,
    right: false,
    jump: false
};

document.addEventListener('keydown', (e) => {
    switch(e.key.toLowerCase()) {
        case 'a':
            keys.left = true;
            break;
        case 'd':
            keys.right = true;
            break;
        case 'w':
        case ' ':
            keys.jump = true;
            if (gameState === 'PLAYING' && !player.isJumping) {
                player.velocityY = INITIAL_JUMP_FORCE;
                player.isJumping = true;
            }
            break;
        case 'p':
        case 'escape':
            if (gameState === 'PLAYING') {
                gameState = 'PAUSED';
                document.getElementById('pauseMenu').classList.add('active');
            }
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.key.toLowerCase()) {
        case 'a':
            keys.left = false;
            break;
        case 'd':
            keys.right = false;
            break;
        case 'w':
        case ' ':
            keys.jump = false;
            // Variable jump height
            if (player.velocityY < 0) {
                player.velocityY *= 0.5;
            }
            break;
    }
});

// Collision Detection
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Game Loop
function update() {
    if (gameState !== 'PLAYING') return;

    // Player movement
    player.velocityX = 0;
    if (keys.left) {
        player.velocityX = -MOVE_SPEED;
        player.facing = 'left';
    }
    if (keys.right) {
        player.velocityX = MOVE_SPEED;
        player.facing = 'right';
    }

    player.update();

    // Platform collisions
    let onGround = false;
    levelData.platforms.forEach(platform => {
        if (checkCollision(player, platform)) {
            switch(platform.type) {
                case 'normal':
                    // Land on top of platform
                    if (player.velocityY > 0 && player.y + player.height - player.velocityY <= platform.y) {
                        player.y = platform.y - player.height;
                        player.velocityY = 0;
                        player.isJumping = false;
                        onGround = true;
                    }
                    break;
                case 'bounce':
                    // Bounce only when landing from above
                    if (player.velocityY > 0 && player.y + player.height - player.velocityY <= platform.y) {
                        player.y = platform.y - player.height;
                        player.velocityY = BOUNCE_FORCE;
                        player.isJumping = true;
                    }
                    break;
                case 'obstacle':
                    player.lives--;
                    document.getElementById('livesCount').textContent = player.lives;
                    if (player.lives <= 0) {
                        gameState = 'GAME_OVER';
                        document.getElementById('gameOverScreen').classList.add('active');
                        document.getElementById('finalScore').textContent = player.score;
                    } else {
                        player.respawn();
                    }
                    break;
                case 'goal':
                    onWin();
                    break;
            }
        }
    });

    // Coin collection
    levelData.coins.forEach(coin => {
        if (!coin.collected && checkCollision(player, coin)) {
            coin.collected = true;
            player.score += 10;
            document.getElementById('coinsCount').textContent = player.score;
        }
    });

    // Life token collection
    levelData.lifeTokens?.forEach(token => {
        if (!token.collected && checkCollision(player, token)) {
            token.collected = true;
            player.lives += 1;
            document.getElementById('livesCount').textContent = player.lives;
        }
    });
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw level elements
    levelData.platforms.forEach(platform => platform.draw());
    levelData.coins.forEach(coin => coin.draw());
    levelData.lifeTokens?.forEach(token => token.draw());

    // Draw player
    player.draw();
}

function gameLoop() {
    if (gameState === 'PLAYING') {
        update();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// Level Management Functions
function loadLevel(level) {
    levelData = level;
    resetLevel();
    gameState = 'PLAYING';
    document.getElementById('level-select-screen').classList.remove('active');
    document.getElementById('gameCanvas').classList.add('visible');
    document.getElementById('hud').classList.remove('hidden');
    // Update level display in HUD
    document.getElementById('currentLevel').textContent = currentLevel + 1;
}

function updateLevelSelectUI() {
    const levelGrid = document.getElementById('level-grid');
    levelGrid.innerHTML = ''; // Clear existing buttons
    
    for (let i = 1; i <= allLevels.length; i++) {
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        btn.textContent = i;
        btn.id = 'level-' + i;
        
        if (i <= maxLevelReached) {
            btn.disabled = false;
        } else {
            btn.disabled = true;
        }
        
        btn.addEventListener('click', () => {
            if (i <= maxLevelReached) {
                currentLevel = i - 1;
                loadLevel(allLevels[currentLevel]);
                document.getElementById('currentLevel').textContent = i;
            }
        });
        
        levelGrid.appendChild(btn);
    }
}

// Menu Button Event Listeners
document.getElementById('startGame').addEventListener('click', () => {
    gameState = 'LEVEL_SELECT';
    document.getElementById('mainMenu').classList.remove('active');
    document.getElementById('level-select-screen').classList.add('active');
    document.getElementById('hud').classList.add('hidden');
    updateLevelSelectUI();
});

document.getElementById('resumeGame').addEventListener('click', () => {
    gameState = 'PLAYING';
    document.getElementById('pauseMenu').classList.remove('active');
});

document.getElementById('restartLevel').addEventListener('click', () => {
    resetLevel();
    gameState = 'PLAYING';
    document.getElementById('pauseMenu').classList.remove('active');
});

document.getElementById('mainMenuBtn').addEventListener('click', () => {
    resetGame();
    gameState = 'MENU';
    document.getElementById('pauseMenu').classList.remove('active');
    document.getElementById('mainMenu').classList.add('active');
});

document.getElementById('retryLevel').addEventListener('click', () => {
    resetLevel();
    gameState = 'PLAYING';
    document.getElementById('gameOverScreen').classList.remove('active');
});

document.getElementById('gameOverMainMenu').addEventListener('click', () => {
    resetGame();
    gameState = 'MENU';
    document.getElementById('gameOverScreen').classList.remove('active');
    document.getElementById('mainMenu').classList.add('active');
});

// Win screen buttons
const nextLevelBtn = document.getElementById('nextLevel');
const selectLevelBtn = document.getElementById('selectLevel');
const winMainMenuBtn = document.getElementById('winMainMenu');

if (nextLevelBtn) {
    nextLevelBtn.addEventListener('click', () => {
        // If last level, go to level select
        if (currentLevel >= allLevels.length - 1) {
            gameState = 'LEVEL_SELECT';
            document.getElementById('winScreen').classList.remove('active');
            document.getElementById('level-select-screen').classList.add('active');
            document.getElementById('hud').classList.add('hidden');
            updateLevelSelectUI();
            return;
        }
        currentLevel += 1;
        document.getElementById('winScreen').classList.remove('active');
        loadLevel(allLevels[currentLevel]);
    });
}

if (selectLevelBtn) {
    selectLevelBtn.addEventListener('click', () => {
        gameState = 'LEVEL_SELECT';
        document.getElementById('winScreen').classList.remove('active');
        document.getElementById('level-select-screen').classList.add('active');
        document.getElementById('hud').classList.add('hidden');
        updateLevelSelectUI();
    });
}

if (winMainMenuBtn) winMainMenuBtn.addEventListener('click', () => {
    resetGame();
    gameState = 'MENU';
    document.getElementById('winScreen').classList.remove('active');
    document.getElementById('mainMenu').classList.add('active');
});

// Victory screen buttons
const playAgainVictoryBtn = document.getElementById('playAgainVictory');
const victoryMainMenuBtn = document.getElementById('victoryMainMenu');

if (playAgainVictoryBtn) {
    playAgainVictoryBtn.addEventListener('click', () => {
        resetGame();
        maxLevelReached = 1;
        localStorage.setItem('maxLevelReached', 1);
        gameState = 'LEVEL_SELECT';
        document.getElementById('victoryScreen').classList.remove('active');
        document.getElementById('level-select-screen').classList.add('active');
        updateLevelSelectUI();
    });
}

if (victoryMainMenuBtn) {
    victoryMainMenuBtn.addEventListener('click', () => {
        resetGame();
        gameState = 'MENU';
        document.getElementById('victoryScreen').classList.remove('active');
        document.getElementById('mainMenu').classList.add('active');
    });
}

function resetLevel() {
    // Reset level position and coins, but keep lives
    player.x = 50;
    player.y = 500;
    player.velocityX = 0;
    player.velocityY = 0;
    player.checkpointX = 50;
    player.checkpointY = 500;
    document.getElementById('coinsCount').textContent = player.score;
    levelData.coins.forEach(coin => coin.collected = false);
}

function resetGame() {
    // Full reset: reset everything including lives (for main menu/new game)
    player.x = 50;
    player.y = 500;
    player.velocityX = 0;
    player.velocityY = 0;
    player.lives = 3;
    player.score = 0;
    player.checkpointX = 50;
    player.checkpointY = 500;
    document.getElementById('livesCount').textContent = player.lives;
    document.getElementById('coinsCount').textContent = player.score;
    levelData.coins.forEach(coin => coin.collected = false);
}

document.getElementById('backToMain').addEventListener('click', () => {
    gameState = 'MENU';
    document.getElementById('level-select-screen').classList.remove('active');
    document.getElementById('mainMenu').classList.add('active');
    document.getElementById('hud').classList.remove('hidden');
});

// Update collision handling for bounce pads and level completion
function handleCollision(platform) {
    if (checkCollision(player, platform)) {
        switch(platform.type) {
            case 'normal':
            case 'checkpoint':
                if (player.velocityY > 0 && player.y + player.height - player.velocityY <= platform.y) {
                    player.y = platform.y - player.height;
                    player.velocityY = 0;
                    player.isJumping = false;
                }
                break;
            case 'bounce':
                if (player.velocityY > 0 && player.y + player.height - player.velocityY <= platform.y) {
                    player.velocityY = BOUNCE_FORCE;
                    player.isJumping = true;
                }
                break;
            case 'obstacle':
                player.lives--;
                document.getElementById('livesCount').textContent = player.lives;
                if (player.lives <= 0) {
                    gameState = 'GAME_OVER';
                    document.getElementById('gameOverScreen').classList.add('active');
                    document.getElementById('finalScore').textContent = player.score;
                } else {
                    player.respawn();
                }
                break;
            case 'checkpoint':
                player.checkpointX = platform.x;
                player.checkpointY = platform.y - player.height;
                break;
            case 'goal':
                if (currentLevel + 1 > maxLevelReached) {
                    maxLevelReached = currentLevel + 1;
                    localStorage.setItem('maxLevelReached', maxLevelReached);
                }
                gameState = 'LEVEL_SELECT';
                document.getElementById('winScreen').classList.remove('active');
                document.getElementById('level-select-screen').classList.add('active');
                updateLevelSelectUI();
                break;
        }
    }
}

// Initialize game (ensure DOM loaded)
function initGame() {
    // Show main menu on startup
    document.getElementById('mainMenu').classList.add('active');
    document.getElementById('level-select-screen').classList.remove('active');
    // Hide other overlays just in case
    ['pauseMenu','gameOverScreen','winScreen'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });
    // Hide canvas until gameplay starts
    document.getElementById('gameCanvas').classList.remove('visible');
    // Hide HUD on startup (will show when playing)
    document.getElementById('hud').classList.add('hidden');
    gameState = 'MENU';
    gameLoop();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}

// Handle win state and progression
function onWin() {
    gameState = 'WIN';
    // Update progression
    if (currentLevel + 1 > maxLevelReached) {
        maxLevelReached = currentLevel + 1;
        localStorage.setItem('maxLevelReached', maxLevelReached);
    }
    
    // Check if all levels are completed
    if (currentLevel >= allLevels.length - 1) {
        // Show victory screen
        gameState = 'VICTORY';
        document.getElementById('gameCanvas').classList.remove('visible');
        document.getElementById('victoryScreen').classList.add('active');
        document.getElementById('totalCoins').textContent = player.score;
    } else {
        // Show level complete screen
        const win = document.getElementById('winScreen');
        win.classList.add('active');
        document.getElementById('levelCompleted').textContent = currentLevel + 1;
        document.getElementById('winFinalScore').textContent = player.score;
        const nextBtn = document.getElementById('nextLevel');
        if (nextBtn) {
            nextBtn.style.display = 'block';
        }
    }
}