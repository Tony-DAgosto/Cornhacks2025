class Game {
    constructor() {
        this.resources = 50;
        this.lives = 5; // player lives
        this.grid = [];
        this.selectedBananaType = null;
        this.gameLoop = null;
        this.monkeys = [];
        this.projectiles = [];
        this.coins = [];
        this.lastCoinSpawn = Date.now();
        this.currentWave = 0;
        this.totalWaves = 10;
        this.monkeysInWave = 0;
        this.monkeysToSpawn = 0;
        this.waveInProgress = false;
        this.lastMonkeySpawn = Date.now();
        this.spawnInterval = 3000; // Time between monkey spawns in ms
        // Monkey type definitions (sprite name, stat multipliers, spawn weights)
        this.monkeyTypes = [
            { name: 'Chimp', sprite: 'chimp.png', speedMultiplier: 1.0, healthMultiplier: 1.0, baseWeight: 60, growth: 0.2, healthRamp: 5 },
            { name: 'Lemur', sprite: 'lemur.png', speedMultiplier: 1.6, healthMultiplier: 0.6, baseWeight: 25, growth: 0.15, healthRamp: 3 },
            { name: 'Gorilla', sprite: 'gorilla.png', speedMultiplier: 0.6, healthMultiplier: 2.2, baseWeight: 15, growth: 0.25, healthRamp: 9 }
        ];
        this.init();
    }

    init() {
        // Initialize the grid and UI, but don't start game loop yet
        this.createGrid();
        this.createBananaSelection();
        this.updateResources();
        this.updateLives();
    }

    createGrid() {
        const gridEl = document.getElementById('gameGrid');
        // create 5 rows x 9 cols grid
        for (let r = 0; r < 5; r++) {
            this.grid[r] = [];
            for (let c = 0; c < 9; c++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = r;
                cell.dataset.col = c;
                
                // Alternate between light and dark patches
                // If row + column is even, use light patch, if odd use dark patch
                const isLight = (r + c) % 2 === 0;
                cell.style.backgroundImage = `url('./Other Miscellaneous Sprites/${isLight ? 'light_patch.png' : 'dark_patch.png'}')`;
                cell.style.backgroundSize = 'cover';
                cell.style.backgroundPosition = 'center';
                cell.style.position = 'relative';
                cell.addEventListener('click', () => this.handleCellClick(r, c));
                cell.addEventListener('dragover', (e) => {
                    e.preventDefault(); // Allow drop
                    if (this.selectedBananaType && this.resources >= this.selectedBananaType.cost && !this.grid[r][c].banana) {
                        e.dataTransfer.dropEffect = 'copy';
                        cell.classList.add('drag-over');
                    }
                });
                cell.addEventListener('dragleave', () => {
                    cell.classList.remove('drag-over');
                });
                cell.addEventListener('drop', (e) => {
                    e.preventDefault();
                    cell.classList.remove('drag-over');
                    const bananaDragged = e.dataTransfer.getData('text/plain');
                    if (this.selectedBananaType && this.selectedBananaType.name === bananaDragged &&
                        this.resources >= this.selectedBananaType.cost && !this.grid[r][c].banana) {
                        this.placeBanana(r, c);
                    }
                    this.clearSelection();
                });
                gridEl.appendChild(cell);
                this.grid[r][c] = { element: cell, banana: null, monkey: null };
            }
        }
    }

    createBananaSelection() {
        const bananaSelection = document.querySelector('.banana-selection');
        bananaSelection.innerHTML = '';
        const bananaTypes = [
            { name: 'Banana Shooter', cost: 20, sprite: 'banana_shooter.png', type: 'regular' },
            { name: 'Triple Banana', cost: 50, sprite: 'triple_banana_shooter.png', type: 'triple' },
            { name: 'Frozen Banana', cost: 30, sprite: 'frozen_banana.png', type: 'frozen' },
            // Rotten Banana: does a small immediate hit and applies damage-over-time
            { name: 'Rotten Banana', cost: 20, sprite: 'rotten_banana.png', type: 'rotten' },
            // Banana Peel: causes the first monkey that steps on the tile to slip and die; banana removed after slip
            { name: 'Banana Peel', cost: 10, sprite: 'banana_peel.png', type: 'peel' }
        ];

        bananaTypes.forEach(type => {
            const bananaButton = document.createElement('div');
            bananaButton.className = 'banana-type';
            bananaButton.dataset.type = type.name;
            bananaButton.draggable = true;
            bananaButton.addEventListener('dragstart', (e) => {
                // select this banana type
                this.selectBananaType(type);
                e.dataTransfer.setData('text/plain', type.name);
                e.dataTransfer.effectAllowed = 'copy';

                // Prefer using the existing image inside the banana button as the drag image.
                const sourceImg = bananaButton.querySelector('img.banana-img');
                if (sourceImg) {
                    if (sourceImg.complete && sourceImg.naturalWidth) {
                        const offsetX = Math.floor((sourceImg.width || 48) / 2);
                        const offsetY = Math.floor((sourceImg.height || 48) / 2);
                        try { e.dataTransfer.setDragImage(sourceImg, offsetX, offsetY); } catch (err) { }
                    } else {
                        // If image not yet loaded (rare), use a one-time load handler
                        const onLoad = () => {
                            try { e.dataTransfer.setDragImage(sourceImg, Math.floor(sourceImg.width / 2) || 24, Math.floor(sourceImg.height / 2) || 24); } catch (err) { }
                            sourceImg.removeEventListener('load', onLoad);
                        };
                        sourceImg.addEventListener('load', onLoad);
                    }
                }
            });
            bananaButton.addEventListener('dragend', () => {
                document.querySelectorAll('.grid-cell').forEach(cell => {
                    cell.classList.remove('drag-over');
                });
            });

            const img = document.createElement('img');
            img.className = 'banana-img';
            img.alt = type.name;
            // Use the banana type's sprite so each button shows the correct image
            img.src = `Banana Sprites/${type.sprite}`;

            // Info (name + cost)
            const info = document.createElement('div');
            info.className = 'banana-info';
            const nameEl = document.createElement('div');
            nameEl.className = 'banana-name';
            nameEl.textContent = type.name;
            const costEl = document.createElement('div');
            costEl.className = 'banana-cost';
            costEl.textContent = `${type.cost}`;

            info.appendChild(nameEl);
            info.appendChild(costEl);

            bananaButton.appendChild(img);
            bananaButton.appendChild(info);

            bananaButton.addEventListener('click', () => this.selectBananaType(type));
            bananaSelection.appendChild(bananaButton);
        });
    }

    selectBananaType(type) {
        // Toggle selection: if same type clicked, clear selection
        if (this.selectedBananaType && this.selectedBananaType.name === type.name) {
            this.clearSelection();
            return;
        }

        this.selectedBananaType = type;
        // update UI
        document.querySelectorAll('.banana-type').forEach(btn => {
            if (btn.dataset.type === type.name) btn.classList.add('selected');
            else btn.classList.remove('selected');
        });
    }

    clearSelection() {
        this.selectedBananaType = null;
        document.querySelectorAll('.banana-type').forEach(btn => btn.classList.remove('selected'));
    }

    handleCellClick(row, col) {
        // If a banana type is selected attempt placement; afterwards clear selection.
        if (this.selectedBananaType) {
            if (this.resources >= this.selectedBananaType.cost && !this.grid[row][col].banana) {
                this.placeBanana(row, col);
            }
            // Regardless of whether placement succeeded, clear selection when user clicks a grid square
            this.clearSelection();
            return;
        }
        // No selection: clicking a grid cell simply does nothing (could be used for other interactions later)
    }

    placeBanana(row, col) {
        this.resources -= this.selectedBananaType.cost;
        
        // Create banana shooter element
        const bananaShooter = document.createElement('div');
        bananaShooter.className = 'banana-shooter';
        bananaShooter.style.backgroundImage = `url(./Banana\\ Sprites/${this.selectedBananaType.sprite})`;
        bananaShooter.style.backgroundSize = 'contain';
        bananaShooter.style.backgroundRepeat = 'no-repeat';
        bananaShooter.style.backgroundPosition = 'center';
        bananaShooter.style.width = '100%';
        bananaShooter.style.height = '100%';
        bananaShooter.style.position = 'absolute';
        bananaShooter.style.left = '0';
        bananaShooter.style.top = '0';
        
        this.grid[row][col].element.appendChild(bananaShooter);
        this.grid[row][col].banana = {
            type: this.selectedBananaType,
            health: 100,
            element: bananaShooter,
            lastShot: 0
        };
        
        this.updateResources();
    }

    spawnMonkey() {
        const row = Math.floor(Math.random() * 5);

        // Choose monkey type with weights adjusted by current wave (stronger types become more likely later)
        const weights = this.monkeyTypes.map(t => Math.max(0, t.baseWeight + (this.currentWave - 1) * t.growth));
        const totalWeight = weights.reduce((s, w) => s + w, 0);
        let rnd = Math.random() * totalWeight;
        let chosenIndex = 0;
        for (let i = 0; i < weights.length; i++) {
            if (rnd < weights[i]) { chosenIndex = i; break; }
            rnd -= weights[i];
        }
        const type = this.monkeyTypes[chosenIndex];

        const monkeyElement = document.createElement('div');
        monkeyElement.className = 'monkey';
        monkeyElement.style.backgroundImage = `url(./Monkey\\ Sprites/${type.sprite})`;
        monkeyElement.style.backgroundSize = 'contain';
        monkeyElement.style.backgroundRepeat = 'no-repeat';
        monkeyElement.style.width = '100%';
        monkeyElement.style.height = '100%';
        monkeyElement.style.position = 'absolute';
        monkeyElement.style.transition = 'left 0.1s linear';
        monkeyElement.style.zIndex = '2';

        // Base stats scaled by type multipliers and current wave
        const baseSpeed = 0.05; // cells per tick
        const speed = baseSpeed * type.speedMultiplier * (1 + (this.currentWave - 1) * 0.06);
    const baseHealth = 100;
    // Increase monkey health multiplicatively by 20% each wave (1.2x per wave)
    const waveMultiplier = Math.pow(1.2, Math.max(0, this.currentWave - 1));
    const health = Math.round(baseHealth * type.healthMultiplier * waveMultiplier);

        const monkey = {
            row: row,
            col: 8,
            health: health,
            speed: speed,
            element: monkeyElement,
            position: 8, // Exact position for smooth movement
            kind: type.name.toLowerCase()
        };

        this.grid[row][8].element.appendChild(monkeyElement);
        this.grid[row][8].monkey = monkey;
        this.monkeys.push(monkey);
    }

    updateGame() {
        // Move monkeys
        this.monkeys = this.monkeys.filter(monkey => {
            // Update position
            monkey.position -= monkey.speed;
            const newCol = Math.floor(monkey.position);
            
            // Remove monkey if it reaches the left edge
            if (newCol < 0) {
                // Monkey made it through: cost one life and remove monkey
                monkey.element.remove();
                // Clear any reference in grid (old col)
                if (this.grid[monkey.row] && this.grid[monkey.row][monkey.col]) {
                    this.grid[monkey.row][monkey.col].monkey = null;
                }
                this.lives -= 1;
                this.updateLives();
                // Check game over
                if (this.lives <= 0) {
                    this.gameOver();
                }
                return false;
            }
            
            // Update grid position if monkey moves to new cell
            if (newCol !== monkey.col) {
                this.grid[monkey.row][monkey.col].monkey = null;
                this.grid[monkey.row][newCol].monkey = monkey;
                this.grid[monkey.row][newCol].element.appendChild(monkey.element);
                monkey.col = newCol;
            }
            
            // Update visual position
            const percentageAcrossCell = (monkey.position - newCol) * 100;
            monkey.element.style.left = `${percentageAcrossCell}%`;
            // Check for banana peel: if banana exists in this cell and is a peel, monkey slips (slowed) and takes small damage; banana removed
            try {
                const cellBanana = this.grid[monkey.row][monkey.col].banana;
                if (cellBanana && cellBanana.type && cellBanana.type.type === 'peel') {
                    // Remove banana visual and clear banana reference so only one monkey is affected here
                    if (cellBanana.element && cellBanana.element.remove) cellBanana.element.remove();
                    this.grid[monkey.row][monkey.col].banana = null;

                    // Apply slow effect for 2 seconds, small immediate damage, and push back 0.5 tiles
                    const originalSpeed = monkey.speed;
                    try {
                        // increase slow strength by 50% -> from 30% speed to 15% speed
                        monkey.speed = originalSpeed * 0.15; // slow to 15% speed
                        // visual cue for slip
                        monkey.element.style.filter = 'opacity(70%)';
                    } catch (e) {}

                    // small damage from slip
                    const slipDamage = 8;
                    monkey.health -= slipDamage;

                    // Push monkey back by 0.5 tiles (to the right); clamp to grid bounds
                    try {
                        monkey.position = Math.min(8, monkey.position + 0.5);
                        const newColAfterPush = Math.floor(monkey.position);
                        if (newColAfterPush !== monkey.col) {
                            // Clear old cell reference
                            if (this.grid[monkey.row] && this.grid[monkey.row][monkey.col]) {
                                this.grid[monkey.row][monkey.col].monkey = null;
                            }
                            // Move DOM element into the new cell so it visually appears pushed back
                            if (this.grid[monkey.row] && this.grid[monkey.row][newColAfterPush]) {
                                this.grid[monkey.row][newColAfterPush].element.appendChild(monkey.element);
                                this.grid[monkey.row][newColAfterPush].monkey = monkey;
                            }
                            monkey.col = newColAfterPush;
                        }
                    } catch (e) {}

                    // Restore speed after 2 seconds if monkey still exists
                    setTimeout(() => {
                        if (monkey && this.monkeys.includes(monkey)) {
                            monkey.speed = originalSpeed;
                            try { monkey.element.style.filter = ''; } catch (e) {}
                        }
                    }, 2000);

                    // If monkey dies from the slip damage, remove it now
                    if (monkey.health <= 0) {
                        monkey.element.remove();
                        if (this.grid[monkey.row] && this.grid[monkey.row][monkey.col]) {
                            this.grid[monkey.row][monkey.col].monkey = null;
                        }
                        return false;
                    }
                }
            } catch (e) {
                // defensive: if grid indexing fails, ignore and continue
            }

            // Process damage-over-time (DOT) if present
            if (monkey.dot) {
                const now = Date.now();
                // Apply ticks when it's time
                if (now >= monkey.dot.nextTick) {
                    monkey.health -= monkey.dot.tickDamage;
                    monkey.dot.nextTick += monkey.dot.tickInterval;
                    // If monkey dies from DOT, remove it now
                    if (monkey.health <= 0) {
                        monkey.element.remove();
                        // Clear any reference in grid
                        if (this.grid[monkey.row] && this.grid[monkey.row][monkey.col]) {
                            this.grid[monkey.row][monkey.col].monkey = null;
                        }
                        return false;
                    }
                }

                // End DOT when duration expired
                if (Date.now() >= monkey.dot.endTime) {
                    delete monkey.dot;
                    // restore visual filter if not frozen (frozen overwrites separately)
                    try { monkey.element.style.filter = ''; } catch (e) {}
                }
            }
            
            return true;
        });
    }

    startWave() {
        this.currentWave++;
        // Update the header wave counter as soon as wave increments
        this.updateWaveUI();
        if (this.currentWave > this.totalWaves) {
            this.victory();
            return;
        }

        this.waveInProgress = true;
        this.monkeysInWave = 0;
        this.monkeysToSpawn = Math.floor(5 + (this.currentWave * 2)); // Increases by 2 each wave
        this.spawnInterval = Math.max(1000, 3000 - (this.currentWave * 200)); // Gets faster each wave
        this.lastMonkeySpawn = Date.now();

        // Show wave start message
        const waveMsg = document.createElement('div');
        waveMsg.className = 'wave-message';
        waveMsg.textContent = `Wave ${this.currentWave} Starting!`;
        waveMsg.style.position = 'fixed';
        waveMsg.style.top = '50%';
        waveMsg.style.left = '50%';
        waveMsg.style.transform = 'translate(-50%, -50%)';
        waveMsg.style.fontSize = '2em';
        waveMsg.style.color = 'white';
        waveMsg.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        waveMsg.style.zIndex = '1000';
        document.body.appendChild(waveMsg);
        setTimeout(() => waveMsg.remove(), 2000);
    }

    checkWaveComplete() {
        if (this.waveInProgress && this.monkeysInWave >= this.monkeysToSpawn && this.monkeys.length === 0) {
            this.waveInProgress = false;
            // Add bonus resources between waves
            this.resources += 25 + (this.currentWave * 5);
            this.updateResources();
            
            // Start next wave after delay
            setTimeout(() => this.startWave(), 5000);
        }
    }

    victory() {
        // stop loop
        if (this.gameLoop) clearInterval(this.gameLoop);
        
        const overlay = document.createElement('div');
        overlay.className = 'victory-overlay';
        overlay.style.position = 'fixed';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0,0,0,0.6)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '9999';

        const box = document.createElement('div');
        box.style.background = 'white';
        box.style.padding = '20px 30px';
        box.style.borderRadius = '8px';
        box.style.textAlign = 'center';

        const h = document.createElement('h2');
        h.textContent = 'Victory!';
        const p = document.createElement('p');
        p.textContent = 'You have defeated all 10 waves!';
        const btn = document.createElement('button');
        btn.textContent = 'Play Again';
        btn.style.marginTop = '12px';
        btn.addEventListener('click', () => location.reload());

        box.appendChild(h);
        box.appendChild(p);
        box.appendChild(btn);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    }

    showStartScreen() {
        // Create start screen overlay
        const startScreen = document.createElement('div');
        startScreen.id = 'startScreen';
        startScreen.className = 'start-screen';
        
        // Add background image from /Other Miscellaneous Sprites/banana_monkey_background.jpg
        startScreen.style.backgroundImage = "url('./Other\\ Miscellaneous\\ Sprites/banana_monkey_background.jpg')";
        startScreen.style.backgroundSize = 'cover';
        startScreen.style.backgroundPosition = 'center';
        
        // Add play button
        const playButton = document.createElement('button');
        playButton.id = 'playButton';
        playButton.className = 'play-button';
        playButton.textContent = 'Play Game';
        
        startScreen.appendChild(playButton);
        document.body.appendChild(startScreen);
        
        // Wire up play button
        playButton.addEventListener('click', () => this.startGame());
    }

    startGame() {
        // Hide start screen
        const startScreen = document.getElementById('startScreen');
        if (startScreen) {
            startScreen.style.display = 'none';
        }
        
        // Start the game loop
        this.startGameLoop();
    }

    startGameLoop() {
        let lastUpdate = Date.now();
        this.startWave(); // Start first wave
        
        this.gameLoop = setInterval(() => {
            const currentTime = Date.now();
            const deltaTime = (currentTime - lastUpdate) / 1000;
            lastUpdate = currentTime;
            
            this.updateGame();
            this.updateProjectiles(deltaTime);
            
            // Spawn monkeys based on wave system
            if (this.waveInProgress && this.monkeysInWave < this.monkeysToSpawn && 
                currentTime - this.lastMonkeySpawn >= this.spawnInterval) {
                this.spawnMonkey();
                this.monkeysInWave++;
                this.lastMonkeySpawn = currentTime;
            }
            
            // Check if wave is complete
            this.checkWaveComplete();
            
            // Spawn coins periodically
            if (currentTime - this.lastCoinSpawn >= 4000) { // Every 4 seconds
                this.spawnCoin();
                this.lastCoinSpawn = currentTime;
            }
            
            // Remove coins that have been around too long (30 seconds)
            this.coins = this.coins.filter(coin => {
                if (currentTime - coin.spawnTime >= 30000) {
                    coin.element.remove();
                    return false;
                }
                return true;
            });
            
            // Check for shooting
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 9; col++) {
                    const cell = this.grid[row][col];
                    if (cell.banana) {
                        const currentTime = Date.now();
                        // Peel is a placeable trap and should not fire projectiles
                        if (cell.banana.type && cell.banana.type.type === 'peel') continue;
                        const cooldown = cell.banana.type.type === 'triple' ? 3000 : 2000; // Longer cooldown for triple
                        if (currentTime - cell.banana.lastShot >= cooldown) {
                            // Find closest monkey in the row
                            // Choose the closest monkey ahead of this banana in the same row.
                            // Use precise `position` (float) to find the nearest one, not array order.
                            const rowMonkeys = this.monkeys.filter(monkey => monkey.row === row && monkey.position > col);
                            const targetMonkey = rowMonkeys.length > 0
                                ? rowMonkeys.reduce((best, m) => (m.position < best.position ? m : best))
                                : null;
                            if (targetMonkey) {
                                if (cell.banana.type.type === 'triple') {
                                    // Shoot three projectiles in quick succession
                                    const shootTriple = () => {
                                        const projectile = this.createProjectile(
                                            { ...cell.banana, row, col },
                                            targetMonkey
                                        );
                                        this.projectiles.push(projectile);
                                    };
                                    // First shot immediately
                                    shootTriple();
                                    // Second shot after 100ms
                                    setTimeout(shootTriple, 100);
                                    // Third shot after 200ms
                                    setTimeout(shootTriple, 200);
                                } else {
                                    const projectile = this.createProjectile(
                                        { ...cell.banana, row, col },
                                        targetMonkey
                                    );
                                    this.projectiles.push(projectile);
                                }
                                cell.banana.lastShot = currentTime;
                            }
                        }
                    }
                }
            }
        }, 100);
    }

    

    updateLives() {
        const el = document.getElementById('lives');
        if (el) el.textContent = this.lives;
    }

    gameOver() {
        // stop loop
        if (this.gameLoop) clearInterval(this.gameLoop);
        
        // Create game over screen with the game_over.png image
        const overlay = document.createElement('div');
        overlay.className = 'game-over-screen';
        
        // Add the game over image
        const gameOverImage = document.createElement('img');
        gameOverImage.src = './Other Miscellaneous Sprites/game_over.png';
        gameOverImage.className = 'game-over-image';
        
        // Add restart button below the image
        const restartButton = document.createElement('button');
        restartButton.className = 'play-button';
        restartButton.textContent = 'Play Again';
        restartButton.style.position = 'absolute';
        restartButton.style.bottom = '20%';
        restartButton.addEventListener('click', () => location.reload());
        
        overlay.appendChild(gameOverImage);
        overlay.appendChild(restartButton);
        document.body.appendChild(overlay);
    }

    updateResources() {
        document.getElementById('resources').textContent = this.resources;
    }

    updateWaveUI() {
        const el = document.getElementById('waveCounter');
        if (el) el.textContent = `${this.currentWave}/${this.totalWaves}`;
    }
    

    spawnCoin() {
        // Try to pick an empty cell (avoid bananas/monkeys). Try up to N times.
        const maxAttempts = 12;
        let row = null;
        let col = null;
        for (let i = 0; i < maxAttempts; i++) {
            const r = Math.floor(Math.random() * 5);
            const c = Math.floor(Math.random() * 9);
            if (!this.grid[r][c].banana && !this.grid[r][c].monkey) {
                row = r; col = c; break;
            }
        }
        if (row === null) return; // couldn't find an empty cell

        const cell = this.grid[row][col].element;
        const cellRect = cell.getBoundingClientRect();
        const coinSize = 48;

        const coinElement = document.createElement('div');
        coinElement.className = 'coin';
        coinElement.style.backgroundImage = 'url("Other Miscellaneous Sprites/banana_coin.png")';
        coinElement.style.backgroundSize = 'contain';
        coinElement.style.backgroundRepeat = 'no-repeat';
        coinElement.style.width = coinSize + 'px';
        coinElement.style.height = coinSize + 'px';
        coinElement.style.position = 'absolute';
        coinElement.style.willChange = 'top';

        // horizontal near cell center with a small random offset
        const viewportLeft = window.scrollX || window.pageXOffset || 0;
        const startLeft = viewportLeft + cellRect.left + (cellRect.width - coinSize) / 2 + (Math.random() - 0.5) * 24;
        coinElement.style.left = startLeft + 'px';

        // Start well above the viewport so it visibly falls into place
        const startTop = -coinSize - 40;
        coinElement.style.top = startTop + 'px';
        coinElement.style.zIndex = 1000;
        coinElement.style.transition = 'top 0.64s cubic-bezier(0.2,0.8,0.2,1), transform 0.12s';
        coinElement.style.cursor = 'pointer';
        coinElement.style.pointerEvents = 'auto';

        document.body.appendChild(coinElement);

        // animate to center-ish of target cell (use double rAF for reliability)
        const targetTop = cellRect.top + (cellRect.height - coinSize) / 2 + (window.scrollY || window.pageYOffset || 0);
        requestAnimationFrame(() => requestAnimationFrame(() => {
            coinElement.style.top = targetTop + 'px';
        }));

        const coin = { row, col, element: coinElement, spawnTime: Date.now(), landed: false };
        this.coins.push(coin);

        const onTransitionEnd = (e) => {
            if (e.propertyName === 'top') {
                coin.landed = true;
                // snap into the cell DOM so it stays aligned when the grid moves
                cell.appendChild(coinElement);
                coinElement.style.position = 'absolute';
                coinElement.style.left = '25%';
                coinElement.style.top = '25%';
                coinElement.style.width = '50%';
                coinElement.style.height = '50%';
                coinElement.style.transition = 'transform 0.12s';
                coinElement.removeEventListener('transitionend', onTransitionEnd);
            }
        };
        coinElement.addEventListener('transitionend', onTransitionEnd);

        // Click to collect only after landed
        coinElement.addEventListener('click', () => {
            if (coin.landed) {
                this.collectCoin(coin);
                this.clearSelection();
            }
        });
    }

    collectCoin(coin) {
        const coinIndex = this.coins.indexOf(coin);
        if (coinIndex > -1) {
            this.coins.splice(coinIndex, 1);
            coin.element.remove();
            this.resources += 10;
            this.updateResources();
        }
    }

    createProjectile(banana, targetMonkey) {
        const projectile = document.createElement('div');
        projectile.className = 'projectile';
        projectile.style.position = 'absolute';
        const size = 28;
        projectile.style.width = size + 'px';
        projectile.style.height = size + 'px';
        projectile.style.zIndex = '3';
        projectile.style.pointerEvents = 'none';

        // Choose projectile image based on banana type
        if (banana.type.type === 'frozen') {
            projectile.style.backgroundImage = `url('./Other Miscellaneous Sprites/frozen_projectile.png')`;
        } else if (banana.type.type === 'rotten') {
            // Rotten uses its own projectile image
            projectile.style.backgroundImage = `url('./Other Miscellaneous Sprites/rotten_projectile.png')`;
            // slightly smaller visual for rotten projectile
            projectile.style.width = (size * 0.75) + 'px';
            projectile.style.height = (size * 0.75) + 'px';
        } else {
            // regular and triple use banana projectile image (use banana_shooter sprite as projectile)
            projectile.style.backgroundImage = `url('./Other Miscellaneous Sprites/banana_projectile.png')`;
            projectile.style.width = (size * 0.8) + 'px';
            projectile.style.height = (size * 0.8) + 'px';
        }
        projectile.style.backgroundSize = 'contain';
        projectile.style.backgroundRepeat = 'no-repeat';
        projectile.style.backgroundPosition = 'center';

        const startCell = this.grid[banana.row][banana.col].element;
        const startRect = startCell.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset || 0;
        const scrollY = window.scrollY || window.pageYOffset || 0;
        const startLeft = startRect.left + (startRect.width - size) / 2 + scrollX;
        const startTop = startRect.top + (startRect.height - size) / 2 + scrollY;

        projectile.style.left = startLeft + 'px';
        projectile.style.top = startTop + 'px';

        document.body.appendChild(projectile);

        return {
            element: projectile,
            startX: startLeft,
            startY: startTop,
            targetMonkey: targetMonkey,
            speed: banana.type.type === 'triple' ? 350 : 300,
            // Rotten deals half the regular banana damage immediately
            damage: banana.type.type === 'triple' ? 20 : (banana.type.type === 'rotten' ? 15 : 30),
            effect: banana.type.type
        };
    }

    updateProjectiles(deltaTime) {
        this.projectiles = this.projectiles.filter(projectile => {
            // If target no longer exists, remove projectile
            if (!projectile.targetMonkey || !this.monkeys.includes(projectile.targetMonkey)) {
                projectile.element.remove();
                return false;
            }

            const currentRect = projectile.element.getBoundingClientRect();
            const targetRect = projectile.targetMonkey.element.getBoundingClientRect();

            // Move projectile straight to the right at its speed (pixels per second)
            const moveX = projectile.speed * deltaTime;
            const newX = currentRect.left + moveX;
            // Keep same vertical position
            const newY = currentRect.top;

            projectile.element.style.left = newX + 'px';
            projectile.element.style.top = newY + 'px';

            // Check intersection with target's bounding box for collision
            const projRect = projectile.element.getBoundingClientRect();
            const intersects = !(projRect.right < targetRect.left || projRect.left > targetRect.right || projRect.bottom < targetRect.top || projRect.top > targetRect.bottom);

            if (intersects) {
                // Apply damage/effects
                projectile.targetMonkey.health -= projectile.damage;

                if (projectile.effect === 'frozen' && projectile.targetMonkey.speed > 0) {
                    const originalSpeed = projectile.targetMonkey.speed;
                    projectile.targetMonkey.speed = 0;
                    projectile.targetMonkey.element.style.filter = 'brightness(150%) saturate(80%)';
                    setTimeout(() => {
                        if (projectile.targetMonkey && this.monkeys.includes(projectile.targetMonkey)) {
                            projectile.targetMonkey.speed = originalSpeed;
                            projectile.targetMonkey.element.style.filter = '';
                        }
                    }, 2000);
                } else if (projectile.effect === 'triple') {
                    projectile.targetMonkey.health -= 10; // Additional damage for triple burst
                } else if (projectile.effect === 'rotten') {
                    // Apply damage-over-time: small ticks over a duration
                    const now = Date.now();
                    const dotDuration = 5000; // 5 seconds
                    const tickInterval = 1000; // 1s per tick
                    const tickDamage = 3; // damage per tick (total DOT = 15)

                    if (!projectile.targetMonkey.dot) {
                        projectile.targetMonkey.dot = {
                            endTime: now + dotDuration,
                            tickInterval: tickInterval,
                            nextTick: now + tickInterval,
                            tickDamage: tickDamage
                        };
                    } else {
                        // Refresh/extend DOT on re-hit
                        projectile.targetMonkey.dot.endTime = now + dotDuration;
                        projectile.targetMonkey.dot.nextTick = now + tickInterval;
                    }
                    // Visual tint to indicate rotten damage-over-time
                    try { projectile.targetMonkey.element.style.filter = 'hue-rotate(-30deg) saturate(0.8)'; } catch (e) {}
                }

                if (projectile.targetMonkey.health <= 0) {
                    const monkeyIndex = this.monkeys.indexOf(projectile.targetMonkey);
                    if (monkeyIndex > -1) {
                        this.monkeys.splice(monkeyIndex, 1);
                        projectile.targetMonkey.element.remove();
                    }
                }

                projectile.element.remove();
                return false;
            }

            // Remove projectile if it goes off the right edge of the viewport
            if (projRect.left > (window.innerWidth || document.documentElement.clientWidth) + 100) {
                projectile.element.remove();
                return false;
            }

            return true;
        });
    }
}

// Initialize the game when the page loads, but wait for Play button click
window.addEventListener('load', () => {
    const game = new Game();
    
    // Wire up the play button to start the game
    const playButton = document.getElementById('playButton');
    const startScreen = document.getElementById('startScreen');
    
    if (playButton && startScreen) {
        playButton.addEventListener('click', () => {
            startScreen.style.display = 'none';
            game.startGameLoop();
        });
    } else {
        // Fallback: start immediately if elements aren't found
        game.startGameLoop();
    }
});
