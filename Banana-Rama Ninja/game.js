// Game Constants and Configuration
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.25;
const FALLING_SPEED = 0.5; // Controls how fast player falls when in mid-air
const RISING_SPEED = 0.5; // Controls how fast player decelerates when jumping up (same as falling speed)
const INITIAL_JUMP_FORCE = -13.5; // Adjusted for proper jump height with normal gravity
const BOUNCE_FORCE = -18; // Adjusted proportionally to maintain same bounce height
const MOVE_SPEED = 5;
// Player size (doubled from original to make the banana ninja larger)
const PLAYER_WIDTH = 60;
const PLAYER_HEIGHT = 80;

// Debug Settings
const SHOW_COLLISION_BOXES = false; // Set to true to show red collision boxes for testing

// Game State Management
let gameState = 'MENU'; // MENU, LEVEL_SELECT, PLAYING, PAUSED, GAME_OVER, WIN
let currentLevel = 0;
let maxLevelReached = parseInt(localStorage.getItem('maxLevelReached')) || 1;

// Timer System
let gameStartTime = null;
let totalGameTime = 0;
let isTimerRunning = false;
let pausedTime = 0;
let pauseStartTime = null;

// User Management System
let currentPlayerName = localStorage.getItem('playerName') || null;

// Leaderboard System
let leaderboardData = JSON.parse(localStorage.getItem('leaderboardData')) || {
    bestTime: [],
    highestCoins: []
};

// Initialize Canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Player sprite images (ground and jumping sprites)
const playerImgLeft = new Image();
playerImgLeft.src = 'assets/sprites/ninja_banana_left_nobg.png';
const playerImgRight = new Image();
playerImgRight.src = 'assets/sprites/ninja_banana_right_nobg.png';
const playerImgLeftJump = new Image();
playerImgLeftJump.src = 'assets/sprites/ninja_banana_jumping_left.png';
const playerImgRightJump = new Image();
playerImgRightJump.src = 'assets/sprites/ninja_banana_jumping_right.png';

// Platform sprite images
const bouncePadImg = new Image();
bouncePadImg.src = 'assets/sprites/bounce_pad.png';
const grassyGroundImg = new Image();
grassyGroundImg.src = 'assets/sprites/grassy_ground.png';
const standardPlatformImg = new Image();
standardPlatformImg.src = 'assets/sprites/standard_platform.png';
const floatingGoalImg = new Image();
floatingGoalImg.src = 'assets/sprites/floating_goal.png';

// Coin sprite images
const bananaCoinImg = new Image();
bananaCoinImg.src = 'assets/sprites/banana_coin.png';

// Obstacle sprite images
const spikesImg = new Image();
spikesImg.src = 'assets/sprites/spikes.png';

// Background images
const prettySkyBgImg = new Image();
prettySkyBgImg.src = 'assets/sprites/pretty_sky_bg.png';

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
        // Apply gravity - use same rate for both upward and downward motion
        if (this.velocityY >= 0) {
            // When falling, use FALLING_SPEED for controlled descent
            this.velocityY += FALLING_SPEED;
        } else {
            // When jumping up, use RISING_SPEED (same as falling speed)
            this.velocityY += RISING_SPEED;
        }

        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Basic boundary collision
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

        // Ground collision (fallback for canvas bottom)
        if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
            this.velocityY = 0;
            this.isJumping = false;
        }
    }

    draw() {
        // Check if sprite images are ready
        const imgLeftReady = playerImgLeft && playerImgLeft.complete && playerImgLeft.naturalWidth;
        const imgRightReady = playerImgRight && playerImgRight.complete && playerImgRight.naturalWidth;
        const imgLeftJumpReady = playerImgLeftJump && playerImgLeftJump.complete && playerImgLeftJump.naturalWidth;
        const imgRightJumpReady = playerImgRightJump && playerImgRightJump.complete && playerImgRightJump.naturalWidth;

        // Choose the appropriate sprite based on facing direction and jumping state
        let spriteToUse = null;
        
        if (this.isJumping || this.velocityY !== 0) {
            // Player is in the air - use jumping sprites
            if (this.facing === 'left' && imgLeftJumpReady) {
                spriteToUse = playerImgLeftJump;
            } else if (this.facing === 'right' && imgRightJumpReady) {
                spriteToUse = playerImgRightJump;
            } else if (imgRightJumpReady) {
                // Default to right jumping if available
                spriteToUse = playerImgRightJump;
            }
        } else {
            // Player is on the ground - use regular sprites
            if (this.facing === 'left' && imgLeftReady) {
                spriteToUse = playerImgLeft;
            } else if (this.facing === 'right' && imgRightReady) {
                spriteToUse = playerImgRight;
            } else if (imgRightReady) {
                // Default to right facing if available
                spriteToUse = playerImgRight;
            }
        }

        // Draw the chosen sprite or fallback to rectangle
        if (spriteToUse) {
            ctx.drawImage(spriteToUse, this.x, this.y, this.width, this.height);
        } else {
            // Fallback: simple banana rectangle with headband
            ctx.fillStyle = '#FFE135';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = '#000000';
            ctx.fillRect(this.x, this.y + 10, this.width, 5);
        }

        // Draw collision box for debugging
        drawCollisionBox(this.x, this.y, this.width, this.height);
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
        // Hitbox offset - adjusts where collision occurs relative to visual appearance
        // Positive values move hitbox down from visual top, negative values move it up
        this.hitboxOffset = (type === 'normal' && y === 550) ? 25 : 0; // Ground platforms have 25px offset
    }
    
    // Get the actual collision boundaries
    getHitbox() {
        return {
            x: this.x,
            y: this.y + this.hitboxOffset + 6, // Lower hitbox by 6px total
            width: this.width,
            height: this.height - this.hitboxOffset - 6 // Reduce height by 6px to maintain bottom position
        };
    }

    draw() {
        if (this.type === 'bounce') {
            // Use bounce pad sprite if available, otherwise fallback to yellow rectangle
            if (bouncePadImg && bouncePadImg.complete && bouncePadImg.naturalWidth) {
                ctx.drawImage(bouncePadImg, this.x, this.y, this.width - 5, this.height + 30);
            } else {
                // Fallback: yellow rectangle with spring coils
                ctx.fillStyle = '#FFE135';
                ctx.fillRect(this.x, this.y, this.width, this.height);
                ctx.strokeStyle = '#CC8B00';
                ctx.lineWidth = 2;
                const coilCount = 3;
                const coilSpacing = this.height / (coilCount + 1);
                
                for (let i = 1; i <= coilCount; i++) {
                    const y = this.y + (coilSpacing * i);
                    ctx.beginPath();
                    ctx.moveTo(this.x + 5, y);
                    ctx.quadraticCurveTo(this.x + this.width / 2, y - 4, this.x + this.width - 5, y);
                    ctx.stroke();
                }
            }
        } else if (this.type === 'normal') {
            // Only use grassy ground sprite for actual ground platforms (y=550)
            if (this.y === 550 && grassyGroundImg && grassyGroundImg.complete && grassyGroundImg.naturalWidth) {
                const tileWidth = grassyGroundImg.naturalWidth;
                const tileHeight = grassyGroundImg.naturalHeight;
                
                // Calculate how many tiles we need horizontally
                const tilesX = Math.ceil(this.width / tileWidth);
                const tilesY = Math.ceil(this.height / tileHeight);
                
                // Draw tiled pattern
                for (let i = 0; i < tilesX; i++) {
                    for (let j = 0; j < tilesY; j++) {
                        const tileX = this.x + (i * tileWidth);
                        const tileY = this.y + (j * tileHeight);
                        
                        // Calculate the width and height of this tile (might be clipped at edges)
                        const drawWidth = Math.min(tileWidth, this.x + this.width - tileX);
                        const drawHeight = Math.min(tileHeight, this.y + this.height - tileY);
                        
                        // Only draw if the tile is within bounds
                        if (drawWidth > 0 && drawHeight > 0) {
                            ctx.drawImage(grassyGroundImg, 0, 0, drawWidth, drawHeight, tileX, tileY, drawWidth, drawHeight);
                        }
                    }
                }
            } else {
                // Regular platforms (jumping platforms) - use standard platform sprite
                if (standardPlatformImg && standardPlatformImg.complete && standardPlatformImg.naturalWidth) {
                    // Stretch the entire platform image to fit the platform dimensions
                    ctx.drawImage(standardPlatformImg, this.x, this.y, this.width, this.height);
                } else {
                    // Fallback: solid green color
                    ctx.fillStyle = '#4CAF50';
                    ctx.fillRect(this.x, this.y, this.width, this.height);
                }
            }
        } else {
            // Draw other platform types normally
            switch(this.type) {
                case 'obstacle':
                    // Use spikes sprite for obstacles
                    if (spikesImg && spikesImg.complete && spikesImg.naturalWidth) {
                        // Stretch the spikes image to fit the obstacle dimensions
                        ctx.drawImage(spikesImg, this.x, this.y, this.width, this.height);
                    } else {
                        // Fallback: red rectangle
                        ctx.fillStyle = '#FF0000';
                        ctx.fillRect(this.x, this.y, this.width, this.height);
                    }
                    break;
                case 'goal':
                    // Use floating flag sprite for goal platforms
                    if (floatingGoalImg && floatingGoalImg.complete && floatingGoalImg.naturalWidth) {
                        // Stretch the flag image to fit the goal platform dimensions
                        ctx.drawImage(floatingGoalImg, this.x, this.y, this.width, this.height);
                    } else {
                        // Fallback: green rectangle
                        ctx.fillStyle = '#00FF00';
                        ctx.fillRect(this.x, this.y, this.width, this.height);
                    }
                    break;
            }
        }

        // Draw collision box for debugging (shows actual hitbox, not visual bounds)
        const hitbox = this.getHitbox();
        drawCollisionBox(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
    }
}

class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.collected = false;
    }

    draw() {
        if (!this.collected) {
            // Use banana coin sprite if available, otherwise fallback to gold circle
            if (bananaCoinImg && bananaCoinImg.complete && bananaCoinImg.naturalWidth) {
                ctx.drawImage(bananaCoinImg, this.x, this.y, this.width + 10, this.height + 10);
            } else {
                // Fallback: gold circle
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw collision box for debugging
            drawCollisionBox(this.x, this.y, this.width + 5, this.height + 5);
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

            // Draw collision box for debugging
            drawCollisionBox(this.x, this.y, this.width, this.height);
        }
    }
}

// Level Designs
const level1Data = {
    platforms: [
        // Ground
        new Platform(0, 550, 800, 50, 'normal'),
        // Tutorial platforms
        new Platform(100, 450, 100, 30, 'normal'),
        new Platform(250, 400, 100, 30, 'normal'),
        new Platform(400, 350, 100, 30, 'normal'),
        new Platform(550, 300, 100, 30, 'normal'),
        // Goal platform
        new Platform(650, 100, 100, 150, 'goal')
    ],
    coins: [
        new Coin(120, 420),
        new Coin(270, 370),
        new Coin(420, 320),
        new Coin(570, 270),
        new Coin(600, 280) // Moved away from goal platform
    ]
};

const level2Data = {
    platforms: [
        // Ground
        new Platform(0, 550, 800, 50, 'normal'),
        // Platforms with hazards
        new Platform(100, 450, 150, 30, 'normal'),
        new Platform(350, 400, 150, 30, 'normal'),
        new Platform(600, 350, 150, 30, 'normal'),
        new Platform(350, 300, 150, 30, 'normal'),
        new Platform(100, 250, 150, 30, 'normal'),
        // Hazards
        new Platform(375, 385, 30, 20, 'obstacle'), // Moved 25px right from edge, up 15px above platform
        new Platform(625, 335, 30, 20, 'obstacle'), // Moved 25px right from edge, up 15px above platform
        // Goal
        new Platform(100, 50, 100, 150, 'goal')
    ],
    coins: [
        new Coin(220, 420), // Safe positions away from obstacles and goals
        new Coin(170, 380),
        new Coin(280, 350),
        new Coin(450, 380),
        new Coin(520, 340),
        new Coin(670, 320),
        new Coin(180, 270),
        new Coin(420, 280),
        new Coin(550, 280),
        new Coin(720, 300)
    ]
};

const level3Data = {
    platforms: [
        // Ground
        new Platform(0, 550, 800, 50, 'normal'),
        // Platforms requiring different jump heights
        new Platform(100, 480, 80, 30, 'normal'),
        new Platform(250, 450, 80, 30, 'normal'),
        new Platform(400, 400, 80, 30, 'normal'),
        new Platform(550, 320, 80, 30, 'normal'),
        new Platform(400, 240, 80, 30, 'normal'),
        new Platform(250, 180, 80, 30, 'normal'),
        // Goal
        new Platform(75, 20, 100, 150, 'goal')
    ],
    coins: [
        new Coin(120, 450), // Safe positions on or near platforms
        new Coin(270, 420),
        new Coin(420, 370),
        new Coin(570, 290),
        new Coin(420, 210),
        new Coin(270, 150),
        new Coin(200, 250),
        new Coin(500, 350),
        new Coin(320, 300),
        new Coin(180, 350)
    ]
};

const level4Data = {
    platforms: [
        // Ground
        new Platform(0, 550, 800, 50, 'normal'),
        // Platforms with bounce pads
        new Platform(100, 450, 120, 30, 'normal'),
        new Platform(300, 500, 120, 20, 'bounce'),
        new Platform(500, 400, 120, 30, 'normal'),
        new Platform(700, 500, 120, 20, 'bounce'),
        new Platform(500, 250, 120, 30, 'normal'),
        // Hazards
        new Platform(325, 385, 30, 20, 'obstacle'), // Moved 25px right from edge, up 15px above platform
        new Platform(725, 335, 30, 20, 'obstacle'), // Moved 25px right from edge, up 15px above platform
        // Goal
        new Platform(675, 50, 100, 150, 'goal')
    ],
    coins: [
        new Coin(120, 420), // Safe positions away from obstacles and goal
        new Coin(180, 280),
        new Coin(260, 200),
        new Coin(350, 300),
        new Coin(420, 350),
        new Coin(520, 370),
        new Coin(580, 220),
        new Coin(620, 300),
        new Coin(550, 180),
        new Coin(450, 150)
    ]
};

const level5Data = {
    platforms: [
        // Ground
        new Platform(0, 550, 800, 50, 'normal'),
        // Complex platform arrangement
        new Platform(100, 480, 100, 30, 'normal'),
        new Platform(300, 450, 100, 20, 'bounce'),
        new Platform(500, 400, 100, 30, 'normal'),
        new Platform(700, 350, 100, 20, 'bounce'),
        new Platform(500, 300, 100, 30, 'normal'),
        new Platform(300, 250, 100, 30, 'normal'),
        new Platform(100, 200, 100, 20, 'bounce'),
        // Hazards
        new Platform(420, 435, 30, 20, 'obstacle'), // Moved away from bounce pad, floating above normal platform
        new Platform(525, 385, 30, 20, 'obstacle'), // Moved 25px right from edge, up 15px above platform
        new Platform(620, 335, 30, 20, 'obstacle'), // Moved away from bounce pad, floating above normal platform
        new Platform(325, 235, 30, 20, 'obstacle'), // Moved 25px right from edge, up 15px above platform
        // Goal
        new Platform(675, 0, 100, 150, 'goal')
    ],
    coins: [
        new Coin(120, 450), // Safe positions away from obstacles and goal
        new Coin(180, 350),
        new Coin(250, 220),
        new Coin(350, 420),
        new Coin(420, 270),
        new Coin(520, 370),
        new Coin(570, 220),
        new Coin(620, 280),
        new Coin(150, 170),
        new Coin(320, 180),
        new Coin(520, 180),
        new Coin(420, 350),
        new Coin(580, 350),
        new Coin(180, 280),
        new Coin(450, 200)
    ]
};

const allLevels = [level1Data, level2Data, level3Data, level4Data, level5Data];
let levelData = allLevels[currentLevel];

// Levels 6-15 (10 new levels)
const level6Data = {
    platforms: [
        new Platform(0, 550, 800, 50, 'normal'),
        new Platform(100, 480, 80, 30, 'normal'),
        new Platform(250, 420, 80, 20, 'bounce'),
        new Platform(400, 360, 80, 30, 'normal'),
        new Platform(550, 420, 80, 20, 'bounce'),
        new Platform(700, 360, 80, 30, 'normal'),
        new Platform(400, 280, 80, 30, 'normal'),
        new Platform(300, 200, 30, 20, 'obstacle'),
        new Platform(500, 200, 30, 20, 'obstacle'),
        new Platform(675, 50, 100, 150, 'goal')
    ],
    coins: [
        new Coin(120, 450), // Safe positions away from spikes
        new Coin(270, 390),
        new Coin(180, 320),
        new Coin(420, 330),
        new Coin(570, 390),
        new Coin(720, 330),
        new Coin(420, 250),
        new Coin(150, 250),
        new Coin(600, 250),
        new Coin(80, 400),
        new Coin(350, 450),
        new Coin(650, 450)
    ]
};

const level7Data = {
    platforms: [
        new Platform(0, 550, 800, 50, 'normal'),
        new Platform(100, 450, 100, 30, 'normal'),
        new Platform(300, 400, 100, 20, 'bounce'),
        new Platform(500, 350, 100, 30, 'normal'),
        new Platform(700, 300, 100, 20, 'bounce'),
        new Platform(500, 250, 100, 30, 'normal'),
        new Platform(300, 200, 100, 30, 'normal'),
        new Platform(250, 380, 30, 20, 'obstacle'),
        new Platform(450, 330, 30, 20, 'obstacle'),
        new Platform(650, 280, 30, 20, 'obstacle'),
        new Platform(675, 0, 100, 150, 'goal')
    ],
    coins: Array(15).fill(null).map((_, i) => new Coin(100 + i * 50, 200 + Math.cos(i * 0.5) * 200))
};

const level8Data = {
    platforms: [
        new Platform(0, 550, 800, 50, 'normal'),
        new Platform(50, 480, 80, 30, 'normal'),
        new Platform(150, 420, 80, 20, 'bounce'),
        new Platform(250, 370, 80, 30, 'normal'),
        new Platform(350, 420, 80, 20, 'bounce'),
        new Platform(450, 370, 80, 30, 'normal'),
        new Platform(550, 420, 80, 20, 'bounce'),
        new Platform(650, 370, 80, 30, 'normal'),
        new Platform(400, 250, 30, 20, 'obstacle'),
        new Platform(200, 250, 30, 20, 'obstacle'),
        new Platform(600, 250, 30, 20, 'obstacle'),
        new Platform(675, 50, 100, 150, 'goal')
    ],
    coins: Array(14).fill(null).map((_, i) => new Coin(40 + i * 55, 150 + Math.sin(i * 0.6) * 180)),
    lifeTokens: [
        new LifeToken(150, 380)  // On the bounce pad area
    ]
};

const level9Data = {
    platforms: [
        new Platform(0, 550, 800, 50, 'normal'),
        new Platform(80, 480, 70, 30, 'normal'),
        new Platform(200, 430, 70, 20, 'bounce'),
        new Platform(320, 380, 70, 30, 'normal'),
        new Platform(440, 430, 70, 20, 'bounce'),
        new Platform(560, 380, 70, 30, 'normal'),
        new Platform(680, 430, 70, 20, 'bounce'),
        new Platform(400, 300, 70, 30, 'normal'),
        new Platform(150, 350, 30, 20, 'obstacle'),
        new Platform(350, 350, 30, 20, 'obstacle'),
        new Platform(550, 350, 30, 20, 'obstacle'),
        new Platform(675, 50, 100, 150, 'goal')
    ],
    coins: Array(16).fill(null).map((_, i) => new Coin(30 + i * 50, 120 + Math.sin(i * 0.7) * 200))
};

const level10Data = {
    platforms: [
        new Platform(0, 550, 800, 50, 'normal'),
        new Platform(100, 480, 90, 30, 'normal'),
        new Platform(250, 430, 90, 20, 'bounce'),
        new Platform(400, 380, 90, 30, 'normal'),
        new Platform(550, 430, 90, 20, 'bounce'),
        new Platform(100, 330, 90, 30, 'normal'),
        new Platform(400, 280, 90, 20, 'bounce'),
        new Platform(700, 230, 90, 30, 'normal'),
        new Platform(300, 360, 30, 20, 'obstacle'),
        new Platform(600, 360, 30, 20, 'obstacle'),
        new Platform(200, 250, 30, 20, 'obstacle'),
        new Platform(675, 0, 100, 150, 'goal')
    ],
    coins: Array(18).fill(null).map((_, i) => new Coin(60 + i * 45, 100 + Math.sin(i * 0.5) * 250))
};

const level11Data = {
    platforms: [
        new Platform(0, 550, 800, 50, 'normal'),
        new Platform(100, 470, 100, 20, 'bounce'),
        new Platform(250, 410, 100, 30, 'normal'),
        new Platform(400, 470, 100, 20, 'bounce'),
        new Platform(550, 410, 100, 30, 'normal'),
        new Platform(700, 470, 100, 20, 'bounce'),
        new Platform(350, 340, 100, 30, 'normal'),
        new Platform(200, 280, 100, 20, 'bounce'),
        new Platform(600, 280, 100, 20, 'bounce'),
        new Platform(400, 200, 30, 20, 'obstacle'),
        new Platform(300, 200, 30, 20, 'obstacle'),
        new Platform(500, 200, 30, 20, 'obstacle'),
        new Platform(675, 0, 100, 150, 'goal')
    ],
    coins: Array(18).fill(null).map((_, i) => new Coin(50 + i * 48, 120 + Math.cos(i * 0.6) * 220))
};

const level12Data = {
    platforms: [
        new Platform(0, 550, 800, 50, 'normal'),
        new Platform(100, 460, 80, 20, 'bounce'),
        new Platform(220, 400, 80, 30, 'normal'),
        new Platform(340, 460, 80, 20, 'bounce'),
        new Platform(460, 400, 80, 30, 'normal'),
        new Platform(580, 460, 80, 20, 'bounce'),
        new Platform(700, 400, 80, 30, 'normal'),
        new Platform(400, 320, 80, 20, 'bounce'),
        new Platform(200, 280, 80, 30, 'normal'),
        new Platform(600, 280, 80, 30, 'normal'),
        new Platform(250, 360, 30, 20, 'obstacle'),
        new Platform(550, 360, 30, 20, 'obstacle'),
        new Platform(675, 0, 100, 150, 'goal')
    ],
    coins: Array(20).fill(null).map((_, i) => new Coin(40 + i * 40, 100 + Math.sin(i * 0.4) * 250)),
    lifeTokens: [
        new LifeToken(400, 280)
    ]
};

const level13Data = {
    platforms: [
        new Platform(0, 550, 800, 50, 'normal'),
        new Platform(80, 470, 100, 30, 'normal'),
        new Platform(200, 420, 100, 20, 'bounce'),
        new Platform(320, 370, 100, 30, 'normal'),
        new Platform(440, 420, 100, 20, 'bounce'),
        new Platform(560, 370, 100, 30, 'normal'),
        new Platform(680, 420, 100, 20, 'bounce'),
        new Platform(300, 290, 100, 30, 'normal'),
        new Platform(500, 290, 100, 30, 'normal'),
        new Platform(275, 355, 30, 20, 'obstacle'), // Moved 25px right from edge, up 15px above platform
        new Platform(450, 350, 30, 20, 'obstacle'),
        new Platform(650, 350, 30, 20, 'obstacle'),
        new Platform(400, 210, 30, 20, 'obstacle'),
        new Platform(675, 0, 100, 150, 'goal')
    ],
    coins: Array(20).fill(null).map((_, i) => new Coin(30 + i * 42, 80 + Math.sin(i * 0.5) * 280))
};

const level14Data = {
    platforms: [
        new Platform(0, 550, 800, 50, 'normal'),
        new Platform(100, 460, 100, 20, 'bounce'),
        new Platform(250, 410, 100, 30, 'normal'),
        new Platform(400, 460, 100, 20, 'bounce'),
        new Platform(550, 410, 100, 30, 'normal'),
        new Platform(700, 460, 100, 20, 'bounce'),
        new Platform(150, 330, 100, 30, 'normal'),
        new Platform(400, 330, 100, 20, 'bounce'),
        new Platform(650, 330, 100, 30, 'normal'),
        new Platform(300, 260, 100, 20, 'bounce'),
        new Platform(500, 260, 100, 30, 'normal'),
        new Platform(200, 390, 30, 20, 'obstacle'),
        new Platform(525, 395, 30, 20, 'obstacle'), // Moved 25px right from edge, up 15px above platform
        new Platform(250, 300, 30, 20, 'obstacle'),
        new Platform(600, 300, 30, 20, 'obstacle'),
        new Platform(675, 0, 100, 150, 'goal')
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
        new Platform(220, 410, 100, 30, 'normal'),
        new Platform(340, 460, 100, 20, 'bounce'),
        new Platform(460, 410, 100, 30, 'normal'),
        new Platform(580, 460, 100, 20, 'bounce'),
        new Platform(700, 410, 100, 30, 'normal'),
        new Platform(180, 340, 100, 20, 'bounce'),
        new Platform(420, 340, 100, 20, 'bounce'),
        new Platform(660, 340, 100, 20, 'bounce'),
        new Platform(300, 260, 100, 30, 'normal'),
        new Platform(500, 260, 100, 30, 'normal'),
        new Platform(150, 430, 30, 20, 'obstacle'),
        new Platform(350, 430, 30, 20, 'obstacle'),
        new Platform(575, 435, 30, 20, 'obstacle'), // Moved 25px right from edge, up 15px above platform
        new Platform(350, 310, 30, 20, 'obstacle'),
        new Platform(600, 310, 30, 20, 'obstacle'),
        new Platform(250, 230, 30, 20, 'obstacle'),
        new Platform(550, 230, 30, 20, 'obstacle'),
        new Platform(675, 0, 100, 150, 'goal')
    ],
    coins: Array(25).fill(null).map((_, i) => new Coin(20 + i * 35, 40 + Math.sin(i * 0.4) * 320)),
    lifeTokens: [
        new LifeToken(420, 300)
    ]
};

// Update allLevels to include all 15 levels
allLevels.push(level6Data, level7Data, level8Data, level9Data, level10Data, level11Data, level12Data, level13Data, level14Data, level15Data);

// Create player instance (spawn on top of ground hitbox at y=575, so player y = 575 - 80 = 495)
const player = new Player(50, 495);

// Input Handling
const keys = {
    left: false,
    right: false,
    jump: false
};

document.addEventListener('keydown', (e) => {
    switch(e.key.toLowerCase()) {
        case 'a':
        case 'arrowleft':
            keys.left = true;
            break;
        case 'd':
        case 'arrowright':
            keys.right = true;
            break;
        case 'w':
        case 'arrowup':
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
                pauseTimer();
                document.getElementById('pauseMenu').classList.add('active');
            }
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.key.toLowerCase()) {
        case 'a':
        case 'arrowleft':
            keys.left = false;
            break;
        case 'd':
        case 'arrowright':
            keys.right = false;
            break;
        case 'w':
        case 'arrowup':
        case ' ':
            keys.jump = false;
            // Variable jump height
            if (player.velocityY < 0) {
                player.velocityY *= 0.5;
            }
            break;
    }
});

// Debug Helper Function
function drawCollisionBox(x, y, width, height) {
    if (SHOW_COLLISION_BOXES) {
        ctx.strokeStyle = '#FF0000'; // Red color
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
    }
}

// Timer Helper Functions
function startTimer() {
    if (!isTimerRunning) {
        gameStartTime = Date.now();
        isTimerRunning = true;
    }
}

function stopTimer() {
    if (isTimerRunning && gameStartTime) {
        let finalTime = Date.now() - gameStartTime - pausedTime;
        if (pauseStartTime) {
            finalTime -= Date.now() - pauseStartTime;
        }
        totalGameTime = finalTime / 1000; // Convert to seconds
        isTimerRunning = false;
    }
}

function resetTimer() {
    gameStartTime = null;
    totalGameTime = 0;
    isTimerRunning = false;
    pausedTime = 0;
    pauseStartTime = null;
    updateTimerDisplay(); // Update display to show 0:00.00
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 100);
    return `${minutes}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}

function pauseTimer() {
    if (isTimerRunning && !pauseStartTime) {
        pauseStartTime = Date.now();
    }
}

function resumeTimer() {
    if (pauseStartTime) {
        pausedTime += Date.now() - pauseStartTime;
        pauseStartTime = null;
    }
}

function getCurrentElapsedTime() {
    if (isTimerRunning && gameStartTime) {
        let elapsed = Date.now() - gameStartTime - pausedTime;
        if (pauseStartTime) {
            elapsed -= Date.now() - pauseStartTime;
        }
        return elapsed / 1000; // Convert to seconds
    }
    return totalGameTime;
}

function updateTimerDisplay() {
    const timerElement = document.getElementById('timerDisplay');
    if (timerElement) {
        const currentTime = getCurrentElapsedTime();
        timerElement.textContent = formatTime(currentTime);
    }
}

// User Management Functions
function promptForPlayerName(isFirstTime = true) {
    const message = isFirstTime 
        ? 'Welcome to Banana-Rama Ninja! 🥷🍌\n\nPlease enter your ninja name for the leaderboard:'
        : 'Enter your new ninja name:';
    
    let name = prompt(message);
    
    // Validate name input
    while (!name || name.trim().length === 0 || name.trim().length > 20) {
        if (name === null) {
            // User cancelled - use default name if first time
            if (isFirstTime) {
                name = 'Anonymous Ninja';
                break;
            } else {
                return; // Don't change name if user cancels on name change
            }
        } else {
            name = prompt('Please enter a valid name (1-20 characters):');
        }
    }
    
    currentPlayerName = name.trim();
    localStorage.setItem('playerName', currentPlayerName);
    updatePlayerNameDisplay();
    
    if (!isFirstTime) {
        alert(`Your ninja name has been changed to "${currentPlayerName}"! 🥷`);
    }
}

function updatePlayerNameDisplay() {
    const playerNameElement = document.getElementById('playerName');
    if (playerNameElement && currentPlayerName) {
        playerNameElement.textContent = currentPlayerName;
    }
}

// Leaderboard Management Functions
function addScoreToLeaderboard(playerName, completionTime, totalCoins) {
    // Check if this is an ultimate ninja achievement
    const isUltimateNinja = completionTime < 180 && totalCoins >= 150;
    
    // Add to best time leaderboard
    leaderboardData.bestTime.push({
        name: playerName,
        time: completionTime,
        coins: totalCoins,
        date: new Date().toLocaleDateString(),
        isUltimateNinja: isUltimateNinja
    });
    
    // Add to highest coins leaderboard
    leaderboardData.highestCoins.push({
        name: playerName,
        time: completionTime,
        coins: totalCoins,
        date: new Date().toLocaleDateString(),
        isUltimateNinja: isUltimateNinja
    });
    
    // Sort and keep top 10 for each category
    leaderboardData.bestTime.sort((a, b) => a.time - b.time);
    leaderboardData.highestCoins.sort((a, b) => b.coins - a.coins);
    
    // Keep only top 10 entries
    leaderboardData.bestTime = leaderboardData.bestTime.slice(0, 10);
    leaderboardData.highestCoins = leaderboardData.highestCoins.slice(0, 10);
    
    // Save to localStorage
    localStorage.setItem('leaderboardData', JSON.stringify(leaderboardData));
}

function resetLeaderboard() {
    leaderboardData = {
        bestTime: [],
        highestCoins: []
    };
    localStorage.removeItem('leaderboardData');
}

// Leaderboard UI Functions
function showLeaderboard() {
    document.getElementById('leaderboardScreen').classList.add('active');
    document.getElementById('currentPlayerDisplay').textContent = currentPlayerName || 'Anonymous Ninja';
    displayLeaderboardEntries('time'); // Default to time filter
}

function hideLeaderboard() {
    document.getElementById('leaderboardScreen').classList.remove('active');
}

function displayLeaderboardEntries(filterType) {
    const tableElement = document.getElementById('leaderboardTable');
    const timeBtn = document.getElementById('filterByTime');
    const coinsBtn = document.getElementById('filterByCoins');
    
    // Update active filter button
    timeBtn.classList.toggle('active', filterType === 'time');
    coinsBtn.classList.toggle('active', filterType === 'coins');
    
    // Get appropriate data
    const data = filterType === 'time' ? leaderboardData.bestTime : leaderboardData.highestCoins;
    
    if (data.length === 0) {
        tableElement.innerHTML = `
            <div class="no-scores">
                <p>🍌 No scores yet! 🍌</p>
                <p>Complete the game to set your first record!</p>
            </div>
        `;
        return;
    }
    
    // Create table header
    const headerText = filterType === 'time' ? 'Best Completion Times' : 'Highest Coin Scores';
    const primaryStat = filterType === 'time' ? 'Time' : 'Coins';
    const secondaryStat = filterType === 'time' ? 'Coins' : 'Time';
    
    let tableHTML = `
        <div class="leaderboard-header">
            <h3>${headerText}</h3>
        </div>
        <div class="leaderboard-table">
            <div class="table-header">
                <span class="rank-col">Rank</span>
                <span class="name-col">Ninja Name</span>
                <span class="stat-col">${primaryStat}</span>
                <span class="stat-col">${secondaryStat}</span>
                <span class="ninja-col">Ultimate</span>
                <span class="date-col">Date</span>
            </div>
    `;
    
    // Add data rows
    data.forEach((entry, index) => {
        const rank = index + 1;
        const rankEmoji = getRankEmoji(rank);
        const primaryValue = filterType === 'time' ? formatTime(entry.time) : entry.coins.toLocaleString();
        const secondaryValue = filterType === 'time' ? entry.coins.toLocaleString() : formatTime(entry.time);
        const isCurrentPlayer = entry.name === currentPlayerName;
        const ultimateStatus = entry.isUltimateNinja ? '🥷⭐' : '';
        
        tableHTML += `
            <div class="table-row ${isCurrentPlayer ? 'current-player' : ''} ${entry.isUltimateNinja ? 'ultimate-ninja' : ''}">
                <span class="rank-col">${rankEmoji} ${rank}</span>
                <span class="name-col">${entry.name}</span>
                <span class="stat-col">${primaryValue}</span>
                <span class="stat-col">${secondaryValue}</span>
                <span class="ninja-col">${ultimateStatus}</span>
                <span class="date-col">${entry.date}</span>
            </div>
        `;
    });
    
    tableHTML += '</div>';
    tableElement.innerHTML = tableHTML;
}

function getRankEmoji(rank) {
    switch(rank) {
        case 1: return '🥇';
        case 2: return '🥈';
        case 3: return '🥉';
        default: return '🏅';
    }
}

function showLevelAnnouncement(levelNumber) {
    const announcement = document.getElementById('levelAnnouncement');
    if (announcement) {
        announcement.textContent = `Level ${levelNumber}`;
        announcement.style.opacity = '1';
        
        // Fade out after 3 seconds
        setTimeout(() => {
            announcement.style.opacity = '0';
        }, 3000);
    }
}

function showLifeLostPopup() {
    // Create life lost popup element
    const popup = document.createElement('div');
    popup.className = 'life-lost-popup';
    popup.innerHTML = '-1 Life ❤️';
    
    // Position popup in center of screen
    popup.style.cssText = `
        position: fixed;
        left: 50%;
        top: 40%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #ff4757, #ff3742);
        color: white;
        padding: 20px 40px;
        border-radius: 25px;
        font-weight: bold;
        font-size: 32px;
        text-shadow: 0 4px 8px rgba(0, 0, 0, 0.7);
        box-shadow: 0 8px 25px rgba(255, 71, 87, 0.8);
        border: 3px solid #ff6b7a;
        z-index: 2000;
        pointer-events: none;
        animation: lifeLostAnimation 2s ease-out forwards;
        font-family: Arial, sans-serif;
        text-align: center;
        min-width: 200px;
    `;
    
    // Add to body for fixed positioning
    document.body.appendChild(popup);
    
    // Remove popup after animation completes
    setTimeout(() => {
        if (popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
    }, 2000);
}

function showLifeGainedPopup() {
    // Create life gained popup element
    const popup = document.createElement('div');
    popup.className = 'life-gained-popup';
    popup.innerHTML = '+1 Life 💚';
    
    // Position popup in center of screen
    popup.style.cssText = `
        position: fixed;
        left: 50%;
        top: 40%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #2ed573, #1e824c);
        color: white;
        padding: 20px 40px;
        border-radius: 25px;
        font-weight: bold;
        font-size: 32px;
        text-shadow: 0 4px 8px rgba(0, 0, 0, 0.7);
        box-shadow: 0 8px 25px rgba(46, 213, 115, 0.8);
        border: 3px solid #26de81;
        z-index: 2000;
        pointer-events: none;
        animation: lifeGainedAnimation 2s ease-out forwards;
        font-family: Arial, sans-serif;
        text-align: center;
        min-width: 200px;
    `;
    
    // Add to body for fixed positioning
    document.body.appendChild(popup);
    
    // Remove popup after animation completes
    setTimeout(() => {
        if (popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
    }, 2000);
}

function checkUltimateAchievement() {
    const completedInUnder3Minutes = totalGameTime < 180; // 3 minutes = 180 seconds
    const collectedOver100Coins = player.score >= 150; // 150 coins = 150 points
    
    if (completedInUnder3Minutes && collectedOver100Coins) {
        // Unlock hidden levels and show achievement message
        localStorage.setItem('ultimateNinjaUnlocked', 'true');
        
        // Show special achievement message
        const achievementMsg = document.createElement('div');
        achievementMsg.id = 'ultimateAchievement';
        achievementMsg.innerHTML = `
            <h2>🏆 ULTIMATE BANANA-RAMA NINJA! 🏆</h2>
            <p>Incredible! You've completed all levels in under 3 minutes with over 150 coins!</p>
            <p>A surprise is waiting for you in the level select menu...</p>
        `;
        achievementMsg.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #FFD700, #FFA500);
            color: #000;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            z-index: 1000;
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
            border: 3px solid #FFD700;
            font-family: Arial, sans-serif;
        `;
        
        document.body.appendChild(achievementMsg);
        
        // Auto-remove achievement message after 5 seconds
        setTimeout(() => {
            if (achievementMsg.parentNode) {
                achievementMsg.parentNode.removeChild(achievementMsg);
            }
        }, 5000);
    }
}

function showHiddenLevelsMenu() {
    // Create hidden levels overlay
    const hiddenMenu = document.createElement('div');
    hiddenMenu.id = 'hiddenLevelsMenu';
    hiddenMenu.innerHTML = `
        <div class="hidden-menu-content">
            <h2>🌟 SECRET BANANA REALMS 🌟</h2>
            <p>You've unlocked the legendary hidden levels!</p>
            <div class="hidden-levels-grid">
                <button class="hidden-level-btn" data-level="16">Gravity Chaos</button>
                <button class="hidden-level-btn" data-level="17">Mirror World</button>
                <button class="hidden-level-btn" data-level="18">Speed Run Hell</button>
                <button class="hidden-level-btn" data-level="19">Coin Paradise</button>
                <button class="hidden-level-btn" data-level="20">The Final Trial</button>
            </div>
            <button id="closeHiddenMenu" class="close-btn">Close</button>
        </div>
    `;
    
    hiddenMenu.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    document.body.appendChild(hiddenMenu);
    
    // Add styles for the hidden menu
    if (!document.getElementById('hiddenMenuCSS')) {
        const style = document.createElement('style');
        style.id = 'hiddenMenuCSS';
        style.textContent = `
            .hidden-menu-content {
                background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
                color: #FFD700;
                padding: 40px;
                border-radius: 20px;
                text-align: center;
                box-shadow: 0 0 50px rgba(255, 215, 0, 0.3);
                border: 3px solid #FFD700;
                max-width: 500px;
                animation: slideIn 0.5s ease-out;
            }
            
            .hidden-menu-content h2 {
                margin-bottom: 20px;
                text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
            }
            
            .hidden-levels-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 15px;
                margin: 30px 0;
            }
            
            .hidden-level-btn {
                background: linear-gradient(135deg, #FFD700, #FFA500);
                color: #000;
                border: none;
                padding: 15px 25px;
                border-radius: 10px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
            }
            
            .hidden-level-btn:hover {
                background: linear-gradient(135deg, #FFA500, #FFD700);
                transform: translateY(-3px);
                box-shadow: 0 6px 20px rgba(255, 215, 0, 0.5);
            }
            
            .hidden-level-btn:disabled {
                background: #666;
                color: #999;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }
            
            .close-btn {
                background: #666;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 20px;
            }
            
            .close-btn:hover {
                background: #888;
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add event listeners
    document.getElementById('closeHiddenMenu').addEventListener('click', () => {
        document.body.removeChild(hiddenMenu);
    });
    
    // Add click listeners for hidden level buttons
    document.querySelectorAll('.hidden-level-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const levelNum = parseInt(btn.dataset.level);
            alert(`Hidden Level ${levelNum - 15}: "${btn.textContent}" - Coming Soon!\n\nThese legendary levels are still being crafted by the banana ninja masters...`);
        });
    });
    
    // Close menu when clicking outside
    hiddenMenu.addEventListener('click', (e) => {
        if (e.target === hiddenMenu) {
            document.body.removeChild(hiddenMenu);
        }
    });
}

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
        const platformHitbox = platform.getHitbox();
        if (checkCollision(player, platformHitbox)) {
            switch(platform.type) {
                case 'normal':
                    // Land on top of platform only (allow movement through sides)
                    if (player.velocityY >= 0 && 
                        player.y < platformHitbox.y && 
                        player.y + player.height > platformHitbox.y && 
                        player.y + player.height < platformHitbox.y + platformHitbox.height) {
                        player.y = platformHitbox.y - player.height;
                        player.velocityY = 0;
                        player.isJumping = false;
                        onGround = true;
                    }
                    break;
                case 'bounce':
                    // Bounce only when landing from above (allow movement through sides)
                    if (player.velocityY >= 0 && 
                        player.y < platformHitbox.y && 
                        player.y + player.height > platformHitbox.y && 
                        player.y + player.height < platformHitbox.y + platformHitbox.height) {
                        player.y = platformHitbox.y - player.height;
                        player.velocityY = BOUNCE_FORCE;
                        player.isJumping = true;
                    }
                    break;
                case 'obstacle':
                    player.lives--;
                    document.getElementById('livesCount').textContent = player.lives;
                    
                    // Show life lost popup
                    showLifeLostPopup();
                    
                    // Add visual feedback for low lives
                    const livesElement = document.getElementById('lives');
                    if (player.lives <= 1) {
                        livesElement.classList.add('low-lives');
                    } else {
                        livesElement.classList.remove('low-lives');
                    }
                    if (player.lives <= 0) {
                        gameState = 'GAME_OVER';
                        document.getElementById('gameOverScreen').classList.add('active');
                        document.getElementById('finalScore').textContent = player.score;
                        // Change button text to indicate full game restart
                        document.getElementById('retryLevel').textContent = 'Restart Game';
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
            player.score += 1;
            document.getElementById('coinsCount').textContent = player.score;
            
            // Add visual feedback for collecting coin
            const coinsElement = document.getElementById('coins');
            coinsElement.classList.add('collect-glow');
            setTimeout(() => {
                coinsElement.classList.remove('collect-glow');
            }, 300);
        }
    });

    // Life token collection
    levelData.lifeTokens?.forEach(token => {
        if (!token.collected && checkCollision(player, token)) {
            token.collected = true;
            player.lives += 1;
            document.getElementById('livesCount').textContent = player.lives;
            
            // Show life gained popup
            showLifeGainedPopup();
            
            // Remove low-lives warning if applicable
            const livesElement = document.getElementById('lives');
            if (player.lives > 1) {
                livesElement.classList.remove('low-lives');
            }
        }
    });
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    if (prettySkyBgImg && prettySkyBgImg.complete && prettySkyBgImg.naturalWidth) {
        // Draw the sky background image stretched to fill the entire canvas
        ctx.drawImage(prettySkyBgImg, 0, 0, canvas.width, canvas.height);
    } else {
        // Fallback to solid sky blue color
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw level elements (coins first, then platforms so spikes appear above coins)
    levelData.coins.forEach(coin => coin.draw());
    levelData.lifeTokens?.forEach(token => token.draw());
    levelData.platforms.forEach(platform => platform.draw());

    // Draw player
    player.draw();
    
    // Update timer display
    updateTimerDisplay();
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
    
    // Start timer when loading level 1 for the first time
    if (currentLevel === 0 && !isTimerRunning) {
        startTimer();
        // Show level 1 announcement when starting the game
        setTimeout(() => showLevelAnnouncement(1), 500);
    }
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
    
    // Add hidden levels button if ultimate ninja is unlocked
    const ultimateUnlocked = localStorage.getItem('ultimateNinjaUnlocked') === 'true';
    const existingButton = document.getElementById('hiddenLevelsButton');
    const backToMainBtn = document.getElementById('backToMain');
    
    if (ultimateUnlocked && !existingButton && backToMainBtn) {
        // Create the secret levels button
        const secretButton = document.createElement('button');
        secretButton.id = 'hiddenLevelsButton';
        secretButton.innerHTML = '🌟 Secret Levels 🌟';
        secretButton.className = 'secret-levels-btn';
        
        // Create a container for both buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'bottom-buttons-container';
        buttonContainer.style.cssText = `
            position: absolute;
            bottom: 40px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 60px;
            align-items: center;
        `;
        
        // Clone the back button and style both buttons
        const newBackButton = backToMainBtn.cloneNode(true);
        newBackButton.id = 'backToMainNew';
        
        // Style the secret button
        secretButton.style.cssText = `
            background: linear-gradient(135deg, #FFD700, #FFA500);
            color: #000;
            border: none;
            padding: 15px 25px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
            animation: pulseGlow 2s infinite;
            min-width: 160px;
        `;
        
        // Style the back button to match
        newBackButton.style.cssText = `
            background: linear-gradient(135deg, #666, #555);
            color: white;
            border: none;
            padding: 15px 25px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            min-width: 160px;
        `;
        
        // Add hover effects via CSS
        if (!document.getElementById('bottomButtonsCSS')) {
            const style = document.createElement('style');
            style.id = 'bottomButtonsCSS';
            style.textContent = `
                .secret-levels-btn:hover {
                    background: linear-gradient(135deg, #FFA500, #FFD700) !important;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(255, 215, 0, 0.6) !important;
                }
                
                #backToMainNew:hover {
                    background: linear-gradient(135deg, #777, #666) !important;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4) !important;
                }
                
                @keyframes pulseGlow {
                    0%, 100% { box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4); }
                    50% { box-shadow: 0 6px 25px rgba(255, 215, 0, 0.8); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Add event listeners
        secretButton.addEventListener('click', showHiddenLevelsMenu);
        newBackButton.addEventListener('click', () => {
            gameState = 'MENU';
            document.getElementById('level-select-screen').classList.remove('active');
            document.getElementById('mainMenu').classList.add('active');
            document.getElementById('hud').classList.remove('hidden');
        });
        
        // Add buttons to container
        buttonContainer.appendChild(newBackButton);
        buttonContainer.appendChild(secretButton);
        
        // Hide original back button and add new container
        backToMainBtn.style.display = 'none';
        document.getElementById('level-select-screen').appendChild(buttonContainer);
        
    } else if (!ultimateUnlocked && existingButton) {
        // Remove secret button and restore original back button
        const container = document.querySelector('.bottom-buttons-container');
        if (container) {
            container.remove();
            backToMainBtn.style.display = 'block';
        }
    }
}

// Menu Button Event Listeners
document.getElementById('startGame').addEventListener('click', () => {
    currentLevel = 0; // Start at level 1 (index 0)
    document.getElementById('mainMenu').classList.remove('active');
    loadLevel(allLevels[currentLevel]);
});

document.getElementById('resumeGame').addEventListener('click', () => {
    gameState = 'PLAYING';
    resumeTimer();
    document.getElementById('pauseMenu').classList.remove('active');
});

document.getElementById('restartLevel').addEventListener('click', () => {
    resetLevel();
    gameState = 'PLAYING';
    resumeTimer();
    document.getElementById('pauseMenu').classList.remove('active');
});

document.getElementById('levelSelectBtn').addEventListener('click', () => {
    gameState = 'LEVEL_SELECT';
    resumeTimer(); // Resume timer when leaving pause menu
    document.getElementById('pauseMenu').classList.remove('active');
    document.getElementById('level-select-screen').classList.add('active');
    document.getElementById('gameCanvas').classList.remove('visible');
    document.getElementById('hud').classList.add('hidden');
    updateLevelSelectUI();
});

document.getElementById('resetProgress').addEventListener('click', () => {
    // Show confirmation dialog
    const confirmed = confirm('Are you sure you want to reset ALL progress? This will:\n\n• Reset all unlocked levels back to level 1 only\n• Remove the ULTIMATE banana-rama ninja achievement\n• Hide the secret levels button\n• Clear all leaderboard scores\n• Reset your current game\n\nThis action cannot be undone!');
    
    if (confirmed) {
        // Clear all localStorage data
        localStorage.removeItem('maxLevelReached');
        localStorage.removeItem('ultimateNinjaUnlocked');
        
        // Reset leaderboard
        resetLeaderboard();
        
        // Reset game variables
        maxLevelReached = 1;
        currentLevel = 0;
        
        // Reset game state
        resetGame();
        resetTimer();
        
        // Go back to main menu
        gameState = 'MENU';
        document.getElementById('pauseMenu').classList.remove('active');
        document.getElementById('mainMenu').classList.add('active');
        
        // Show confirmation message
        setTimeout(() => {
            alert('Progress has been reset! You are back to the beginning of your ninja journey. 🥷🍌');
        }, 500);
    }
});

// Leaderboard Event Listeners
document.getElementById('leaderboardBtn').addEventListener('click', () => {
    showLeaderboard();
});

document.getElementById('closeLeaderboard').addEventListener('click', () => {
    hideLeaderboard();
});

document.getElementById('filterByTime').addEventListener('click', () => {
    displayLeaderboardEntries('time');
});

document.getElementById('filterByCoins').addEventListener('click', () => {
    displayLeaderboardEntries('coins');
});

document.getElementById('changePlayerName').addEventListener('click', () => {
    promptForPlayerName(false);
    document.getElementById('currentPlayerDisplay').textContent = currentPlayerName || 'Anonymous Ninja';
});

document.getElementById('retryLevel').addEventListener('click', () => {
    // Reset entire game progression - start from level 1 with no other levels unlocked
    maxLevelReached = 1;
    currentLevel = 0;
    localStorage.setItem('maxLevelReached', 1);
    resetGame();
    resetTimer();
    loadLevel(allLevels[0]); // Load level 1
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
        resetTimer();
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
    player.y = 495; // Ground hitbox is at y=575, so player spawns at 575 - 80 = 495
    player.velocityX = 0;
    player.velocityY = 0;
    player.checkpointX = 50;
    player.checkpointY = 495;
    document.getElementById('coinsCount').textContent = player.score;
    levelData.coins.forEach(coin => coin.collected = false);
}

function resetGame() {
    // Full reset: reset everything including lives (for main menu/new game)
    player.x = 50;
    player.y = 495; // Ground hitbox is at y=575, so player spawns at 575 - 80 = 495
    player.velocityX = 0;
    player.velocityY = 0;
    player.lives = 3;
    player.score = 0;
    player.checkpointX = 50;
    player.checkpointY = 495;
    document.getElementById('livesCount').textContent = player.lives;
    document.getElementById('coinsCount').textContent = player.score;
    levelData.coins.forEach(coin => coin.collected = false);
    
    // Reset timer
    resetTimer();
}

document.getElementById('backToMain').addEventListener('click', () => {
    gameState = 'MENU';
    document.getElementById('level-select-screen').classList.remove('active');
    document.getElementById('mainMenu').classList.add('active');
    document.getElementById('hud').classList.remove('hidden');
});

document.getElementById('levelSelectLeaderboardBtn').addEventListener('click', () => {
    showLeaderboard();
});

// Update collision handling for bounce pads and level completion
function handleCollision(platform) {
    const platformHitbox = platform.getHitbox();
    if (checkCollision(player, platformHitbox)) {
        switch(platform.type) {
            case 'normal':
            case 'checkpoint':
                if (player.velocityY >= 0 && 
                    player.y < platformHitbox.y && 
                    player.y + player.height > platformHitbox.y && 
                    player.y + player.height < platformHitbox.y + platformHitbox.height) {
                    player.y = platformHitbox.y - player.height;
                    player.velocityY = 0;
                    player.isJumping = false;
                }
                break;
            case 'bounce':
                if (player.velocityY >= 0 && 
                    player.y < platformHitbox.y && 
                    player.y + player.height > platformHitbox.y && 
                    player.y + player.height < platformHitbox.y + platformHitbox.height) {
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
                    // Change button text to indicate full game restart
                    document.getElementById('retryLevel').textContent = 'Restart Game';
                } else {
                    player.respawn();
                }
                break;
            case 'checkpoint':
                player.checkpointX = platform.x;
                player.checkpointY = platformHitbox.y - player.height;
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
    // Check if player name exists, if not prompt for it
    if (!currentPlayerName) {
        // Slight delay to ensure UI is loaded
        setTimeout(() => {
            promptForPlayerName(true);
        }, 500);
    } else {
        updatePlayerNameDisplay();
    }
    
    // Show main menu on startup
    document.getElementById('mainMenu').classList.add('active');
    document.getElementById('level-select-screen').classList.remove('active');
    // Hide other overlays just in case
    ['pauseMenu','gameOverScreen','winScreen','leaderboardScreen'].forEach(id => {
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
    
    // Add visual feedback for level completion
    const levelElement = document.getElementById('level-display');
    levelElement.classList.add('level-complete');
    setTimeout(() => {
        levelElement.classList.remove('level-complete');
    }, 500);
    
    // Update progression
    if (currentLevel + 1 > maxLevelReached) {
        maxLevelReached = currentLevel + 1;
        localStorage.setItem('maxLevelReached', maxLevelReached);
    }
    
    // Check if all levels are completed
    if (currentLevel >= allLevels.length - 1) {
        // Stop timer and show victory screen with completion time
        stopTimer();
        gameState = 'VICTORY';
        document.getElementById('gameCanvas').classList.remove('visible');
        document.getElementById('victoryScreen').classList.add('active');
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('totalCoins').textContent = player.score;
        
        // Display completion time
        const completionTimeElement = document.getElementById('completionTime');
        if (completionTimeElement) {
            completionTimeElement.textContent = formatTime(totalGameTime);
        }
        
        // Record score to leaderboard
        if (currentPlayerName) {
            addScoreToLeaderboard(currentPlayerName, totalGameTime, player.score);
        }
        
        // Check for ULTIMATE banana-rama ninja achievement
        checkUltimateAchievement();
    } else {
        // Brief pause before advancing to next level for smooth transition
        setTimeout(() => {
            currentLevel += 1;
            loadLevel(allLevels[currentLevel]);
            showLevelAnnouncement(currentLevel + 1);
        }, 250); // 0.25 second pause before advancing
    }
}
