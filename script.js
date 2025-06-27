const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const gameOverModal = document.getElementById('game-over-modal');
const finalScoreEl = document.getElementById('final-score');
const highestScoreEl = document.getElementById('highest-score');
const playAgainBtn = document.getElementById('play-again-btn');
const newHighScoreText = document.getElementById('new-high-score-text');

// Asset loading
const playerImg = new Image();
playerImg.src = 'assets/astronaut.svg';

const rockImg = new Image();
rockImg.src = 'assets/rock.svg';

const starImg = new Image();
starImg.src = 'assets/star.svg';

// Game constants
const playerWidth = 40;
const playerHeight = 40;
const playerSpeed = 300; // Increased and now in pixels per second
const rockWidth = 30;
const rockHeight = 30;
const starWidth = 20;
const starHeight = 20;
const ROCK_BASE_SPEED = 150; // pixels per second

// Hitbox adjustments - using circles for better collision on rotating objects
const playerRadius = 14; // Tighter radius
const rockRadius = 10;   // Tighter radius
const starRadius = 8;    // Radius for stars

// Game state
let score = 0;
let highScore = localStorage.getItem('nautaGotchiHighScore') || 0;
let gameOver = false;
let survivalTime = 0;
let debugMode = false;

const player = {
    x: canvas.width / 2 - playerWidth / 2,
    y: canvas.height - playerHeight - 10,
    width: playerWidth,
    height: playerHeight,
    speed: playerSpeed,
    dx: 0
};

const keys = {
    ArrowRight: false,
    ArrowLeft: false
};

let rocks = [];
let stars = [];

// Game difficulty settings
let rockSpeedMultiplier = 1.0;
let rockSpawnRate = 1; // rocks per second

// --- DRAW FUNCTIONS ---

function drawPlayer() {
    ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
    if (debugMode) {
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, playerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function drawRocks() {
    rocks.forEach(rock => {
        ctx.save();
        ctx.translate(rock.x + rock.width / 2, rock.y + rock.height / 2);
        ctx.rotate(rock.rotation);
        ctx.drawImage(rockImg, -rock.width / 2, -rock.height / 2, rock.width, rock.height);
        ctx.restore();

        if (debugMode) {
            ctx.beginPath();
            ctx.arc(rock.x + rock.width / 2, rock.y + rock.height / 2, rockRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });
}

function drawStars() {
    stars.forEach(star => {
        ctx.drawImage(starImg, star.x, star.y, star.width, star.height);
        if (debugMode) {
            ctx.beginPath();
            ctx.arc(star.x + star.width / 2, star.y + star.height / 2, starRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });
}

// --- MOVEMENT & LOGIC ---

function movePlayer(deltaTime) {
    // Check key states on every frame for responsive movement
    player.dx = 0;
    if (keys.ArrowRight) {
        player.dx += player.speed;
    }
    if (keys.ArrowLeft) {
        player.dx -= player.speed;
    }

    player.x += player.dx * deltaTime;

    // Wall detection
    if (player.x < 0) {
        player.x = 0;
    }
    if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
    }
}

function updateRocks(deltaTime) {
    rocks.forEach((rock, index) => {
        rock.y += rock.speed * rockSpeedMultiplier * deltaTime;
        rock.rotation += rock.rotationSpeed * deltaTime;

        if (rock.y > canvas.height) {
            rocks.splice(index, 1);
        }

        // Circle-based collision detection for pixel-perfect feel
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;

        const rockCenterX = rock.x + rock.width / 2;
        const rockCenterY = rock.y + rock.height / 2;

        const dx = playerCenterX - rockCenterX;
        const dy = playerCenterY - rockCenterY;
        const distanceSquared = dx * dx + dy * dy;

        const radiiSum = playerRadius + rockRadius;
        
        if (distanceSquared < radiiSum * radiiSum) {
            endGame();
        }
    });
}

function updateStars(deltaTime) {
    stars.forEach((star, index) => {
        star.y += star.speed * deltaTime;
        if (star.y > canvas.height) {
            stars.splice(index, 1);
        }

        // Circle-based collision for stars
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;

        const starCenterX = star.x + star.width / 2;
        const starCenterY = star.y + star.height / 2;

        const dx = playerCenterX - starCenterX;
        const dy = playerCenterY - starCenterY;
        const distanceSquared = dx * dx + dy * dy;

        const radiiSum = playerRadius + starRadius;

        if (distanceSquared < radiiSum * radiiSum) {
            stars.splice(index, 1);
            score += 2;
        }
    });
}


function spawnRock() {
    const x = Math.random() * (canvas.width - rockWidth);
    rocks.push({ 
        x, 
        y: -rockHeight, 
        width: rockWidth, 
        height: rockHeight, 
        speed: ROCK_BASE_SPEED,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 4 // Radians per second
    });
}

function spawnStar() {
    const x = Math.random() * (canvas.width - starWidth);
    const speed = 180; // in pixels per second
    stars.push({ x, y: -starHeight, width: starWidth, height: starHeight, speed });
}


function updateDifficulty(deltaTime) {
    survivalTime += deltaTime; 

    if (survivalTime > 60) {
        rockSpeedMultiplier = 1.8 + (Math.min(survivalTime - 60, 30) / 30) * 0.2; // 1.8 -> 2.0
        rockSpawnRate = 5 + Math.floor((survivalTime - 60) / 15); // 5 -> 6
    } else if (survivalTime > 45) {
        rockSpeedMultiplier = 1.6;
        rockSpawnRate = 4;
    } else if (survivalTime > 30) {
        rockSpeedMultiplier = 1.4;
        rockSpawnRate = 3;
    } else if (survivalTime > 15) {
        rockSpeedMultiplier = 1.2;
        rockSpawnRate = 2;
    }
}

// --- GAME LOOP ---

let lastTime;
let rockSpawnTimer = 0;
let starSpawnTimer = 0;
let scoreTimer = 0;

function update(timestamp) {
    if (gameOver) return;

    if (lastTime === undefined) {
        lastTime = timestamp;
    }
    const deltaTime = (timestamp - lastTime) / 1000 || 0;
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawPlayer();
    drawRocks();
    drawStars();

    movePlayer(deltaTime);
    updateRocks(deltaTime);
    updateStars(deltaTime);
    updateDifficulty(deltaTime);
    
    // Update score
    scoreTimer += deltaTime;
    if (scoreTimer >= 1) {
        score++;
        scoreTimer = 0;
    }
    scoreEl.textContent = score;

    // Spawn rocks based on spawn rate
    rockSpawnTimer += deltaTime;
    if (rockSpawnTimer > 1 / rockSpawnRate) {
        spawnRock();
        rockSpawnTimer = 0;
    }
    
    // Spawn stars randomly (e.g., once every 5 seconds on average)
    starSpawnTimer += deltaTime;
    if (starSpawnTimer > 5 && Math.random() < 0.02) {
        spawnStar();
        starSpawnTimer = 0;
    }

    requestAnimationFrame(update);
}

function resetGame() {
    score = 0;
    survivalTime = 0;
    player.x = canvas.width / 2 - playerWidth / 2;
    player.dx = 0;
    rocks = [];
    stars = [];
    rockSpeedMultiplier = 1.0;
    rockSpawnRate = 1;
    lastTime = undefined;

    scoreEl.textContent = score;
    gameOverModal.style.display = 'none';
    newHighScoreText.style.display = 'none';

    gameOver = false;
    requestAnimationFrame(update);
}

function endGame() {
    gameOver = true;
    newHighScoreText.style.display = 'none';

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('nautaGotchiHighScore', highScore);
        highScoreEl.textContent = highScore;
        newHighScoreText.style.display = 'block';
    }
    
    finalScoreEl.textContent = score;
    highestScoreEl.textContent = highScore;
    gameOverModal.style.display = 'flex';
}

function keyDown(e) {
    if (gameOver) return;
    if (e.key === 'ArrowRight' || e.key === 'd') {
        keys.ArrowRight = true;
    } else if (e.key === 'ArrowLeft' || e.key === 'a') {
        keys.ArrowLeft = true;
    } else if (e.key === 'h' || e.key === 'H') {
        debugMode = !debugMode; // Toggle debug mode
    }
}

function keyUp(e) {
    if (e.key === 'ArrowRight' || e.key === 'd') {
        keys.ArrowRight = false;
    } else if (e.key === 'ArrowLeft' || e.key === 'a') {
        keys.ArrowLeft = false;
    }
}

// Event Listeners
document.addEventListener('keydown', keyDown);
document.addEventListener('keyup', keyUp);
playAgainBtn.addEventListener('click', resetGame);

// Initialize high score display
highScoreEl.textContent = highScore;

// Start game
requestAnimationFrame(update);
