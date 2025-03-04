// Game instance
let game;
let backgroundImg;
let trumpExplodeImg;
let zelenskyImg;
let backgroundMusic;
let trumpVoiceClips = [];
let assetsLoaded = false;
let gameInitialized = false;

function preload() {
  // Load the background image from local assets
  backgroundImg = loadImage('assets/images/trumpoffice.jpg');
  // Load the Trump explode image
  trumpExplodeImg = loadImage('assets/images/trumpexplode.png');
  // Load the Zelensky image
  zelenskyImg = loadImage('assets/images/zelensky.png');
  
  // We'll load audio after user interaction to avoid browser restrictions
  assetsLoaded = true;
}

// Asset creation functions
function createBackgroundImage() {
  // Return the loaded image
  return backgroundImg;
}

function createTrumpImage() {
  // Create a cartoon Trump image
  const img = createGraphics(200, 200);
  
  // Body (blue suit)
  img.fill(50, 60, 120);
  img.noStroke();
  img.rect(50, 100, 100, 100);
  
  // Head
  img.fill(255, 220, 180);
  img.ellipse(100, 70, 80, 80);
  
  // Hair
  img.fill(220, 180, 50);
  img.rect(70, 40, 60, 30);
  
  // Eyes
  img.fill(100, 150, 255);
  img.ellipse(85, 65, 15, 10);
  img.ellipse(115, 65, 15, 10);
  
  // Mouth
  img.fill(200, 100, 100);
  img.ellipse(100, 85, 30, 15);
  
  // Red tie
  img.fill(200, 50, 50);
  img.rect(90, 150, 20, 50);
  
  // Arms
  img.fill(50, 60, 120);
  img.rect(30, 120, 20, 60); // Left arm
  img.rect(150, 120, 20, 60); // Right arm
  
  return img;
}

function createZelenskyImage() {
  // Return the loaded image
  return zelenskyImg;
}

function createRedBubbleImage() {
  // Create a red speech bubble
  const img = createGraphics(100, 100);
  
  // Bubble
  img.fill(255, 100, 100);
  img.ellipse(50, 50, 80, 80);
  
  // Tail
  img.triangle(50, 90, 30, 110, 70, 110);
  
  return img;
}

function createBlueBubbleImage() {
  // Create a blue speech bubble
  const img = createGraphics(100, 100);
  
  // Bubble
  img.fill(100, 100, 255);
  img.ellipse(50, 50, 80, 80);
  
  // Tail
  img.triangle(50, 90, 30, 110, 70, 110);
  
  return img;
}

// p5.js setup function
function setup() {
  // Create a responsive canvas that fits the screen
  let canvasWidth = 800;
  let canvasHeight = 600;
  
  // For mobile devices, adjust the canvas size
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    // Use window dimensions but maintain aspect ratio
    const windowRatio = windowWidth / windowHeight;
    const gameRatio = canvasWidth / canvasHeight;
    
    if (windowRatio < gameRatio) {
      // Window is narrower than game ratio
      canvasWidth = windowWidth;
      canvasHeight = canvasWidth / gameRatio;
    } else {
      // Window is wider than game ratio
      canvasHeight = windowHeight;
      canvasWidth = canvasHeight * gameRatio;
    }
  }
  
  createCanvas(canvasWidth, canvasHeight);
  
  // Initialize game immediately instead of waiting for click
  initializeGame();
  
  // Add window resize handler
  window.addEventListener('resize', windowResized);
}

// Handle window resize
function windowResized() {
  if (game && game.isMobile) {
    // Recalculate canvas size
    let canvasWidth = 800;
    let canvasHeight = 600;
    
    // Use window dimensions but maintain aspect ratio
    const windowRatio = windowWidth / windowHeight;
    const gameRatio = canvasWidth / canvasHeight;
    
    if (windowRatio < gameRatio) {
      // Window is narrower than game ratio
      canvasWidth = windowWidth;
      canvasHeight = canvasWidth / gameRatio;
    } else {
      // Window is wider than game ratio
      canvasHeight = windowHeight;
      canvasWidth = canvasHeight * gameRatio;
    }
    
    // Resize the canvas
    resizeCanvas(canvasWidth, canvasHeight);
    
    // Update mobile control positions
    game.mobileControls.leftButton.y = canvasHeight - 80;
    game.mobileControls.rightButton.y = canvasHeight - 80;
    game.mobileControls.shootButton.x = canvasWidth - 60;
    game.mobileControls.shootButton.y = canvasHeight - 80;
  }
}

function loadAudioAssets() {
  return new Promise((resolve, reject) => {
    try {
      // Load background music
      backgroundMusic = loadSound('assets/audio/background_music.mp3', 
        () => console.log('Background music loaded'),
        (err) => console.error('Failed to load background music:', err)
      );
      
      // Load Trump voice clips
      trumpVoiceClips = [];
      let clipsLoaded = 0;
      const totalClips = 5;
      
      const clipLoadCallback = () => {
        clipsLoaded++;
        if (clipsLoaded === totalClips) {
          console.log('All Trump voice clips loaded successfully');
          resolve();
        }
      };
      
      const clipErrorCallback = (err) => {
        console.warn('Could not load Trump voice clip:', err);
        clipsLoaded++;
        if (clipsLoaded === totalClips) {
          console.log('Finished loading available Trump voice clips');
          resolve();
        }
      };
      
      trumpVoiceClips[0] = loadSound('assets/audio/trump_voice1.mp3', clipLoadCallback, clipErrorCallback);
      trumpVoiceClips[1] = loadSound('assets/audio/trump_voice2.mp3', clipLoadCallback, clipErrorCallback);
      trumpVoiceClips[2] = loadSound('assets/audio/trump_voice3.mp3', clipLoadCallback, clipErrorCallback);
      trumpVoiceClips[3] = loadSound('assets/audio/trump_voice4.mp3', clipLoadCallback, clipErrorCallback);
      trumpVoiceClips[4] = loadSound('assets/audio/trump_voice5.mp3', clipLoadCallback, clipErrorCallback);
    } catch (e) {
      console.warn('Could not load audio assets:', e);
      // Resolve anyway to continue game initialization
      resolve();
    }
  });
}

async function initializeGame() {
  // Only initialize once
  if (gameInitialized) return;
  
  console.log('Initializing game');
  
  // First ensure audio context is running
  try {
    if (getAudioContext().state !== 'running') {
      // We'll try to resume it, but we won't wait for it
      getAudioContext().resume().then(() => {
        console.log('AudioContext resumed successfully');
      }).catch(err => {
        console.error('Failed to resume AudioContext:', err);
      });
    }
  } catch (err) {
    console.error('Error with audio context:', err);
  }
  
  // Load audio assets in the background
  loadAudioAssets().then(() => {
    console.log('Audio assets loaded');
    
    // Set audio on game if it's already created
    if (game) {
      game.backgroundMusic = backgroundMusic;
      game.trumpVoiceClips = trumpVoiceClips;
      
      // Configure background music
      if (backgroundMusic) {
        backgroundMusic.setLoop(true);
        backgroundMusic.setVolume(0.5);
      }
    }
  }).catch(err => {
    console.error('Error loading audio assets:', err);
  });
  
  // Create assets
  const backgroundImg = createBackgroundImage();
  const trumpImg = createTrumpImage();
  const redBubbleImg = createRedBubbleImage();
  const blueBubbleImg = createBlueBubbleImage();
  
  // Create game instance
  game = new Game();
  
  // Set assets
  game.backgroundImg = backgroundImg;
  game.trumpImg = trumpImg;
  game.trumpExplodeImg = trumpExplodeImg;
  game.zelenskyImg = zelenskyImg;
  game.redBubbleImg = redBubbleImg;
  game.blueBubbleImg = blueBubbleImg;
  
  // Initialize game
  game.setup();
  
  // Check for challenge parameter in URL
  const urlParams = new URLSearchParams(window.location.search);
  const challengeScore = urlParams.get('challenge');
  
  if (challengeScore) {
    // Show challenge message
    game.challengeScore = parseInt(challengeScore);
    game.showMessage(`Challenge: Beat the score of ${game.challengeScore}!`, 5000);
  }
  
  gameInitialized = true;
}

// p5.js draw function
function draw() {
  // Performance optimization - limit frame rate if needed
  if (frameRate() < 30) {
    console.log('Low frame rate detected:', frameRate());
  }
  
  if (!gameInitialized) {
    // Show loading screen
    background(0);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(24);
    text('Loading game...', width/2, height/2);
    return;
  }
  
  try {
    // Update game with error handling
    game.update();
    
    // Draw game with error handling
    game.draw();
  } catch (err) {
    console.error('Error in game loop:', err);
    // Try to recover
    background(0);
    fill(255, 0, 0);
    textAlign(CENTER, CENTER);
    textSize(24);
    text('Game error occurred. Press R to restart.', width/2, height/2);
    
    // Allow restart on R key
    if (keyIsDown(82)) { // 'R' key
      location.reload();
    }
  }
}

// p5.js key event handlers
function keyPressed() {
  // Only process game input if game is initialized
  if (game) {
    if (keyCode === LEFT_ARROW) {
      game.player.isMovingLeft = true;
    } else if (keyCode === RIGHT_ARROW) {
      game.player.isMovingRight = true;
    } else if (keyCode === 82) { // 'R' key
      // Reload the page to restart the game
      location.reload();
    }
    
    try {
      game.keyPressed();
    } catch (err) {
      console.error('Error in keyPressed:', err);
    }
  }
}

function keyReleased() {
  // Only process game input if game is initialized
  if (game) {
    if (keyCode === LEFT_ARROW) {
      game.player.isMovingLeft = false;
    } else if (keyCode === RIGHT_ARROW) {
      game.player.isMovingRight = false;
    }
  }
}

// p5.js mouse event handler
function mousePressed() {
  // Only forward mouse events if game is initialized
  if (game) {
    try {
      game.mousePressed();
    } catch (err) {
      console.error('Error in mousePressed:', err);
    }
  }
}

// Touch event handlers for mobile controls
function touchStarted() {
  if (game && game.isMobile) {
    try {
      // Handle each touch
      for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        // Convert touch position to canvas coordinates
        const touchX = touch.x;
        const touchY = touch.y;
        game.handleTouchStart(touchX, touchY, touch.id);
      }
    } catch (err) {
      console.error('Error in touchStarted:', err);
    }
    return false; // Prevent default
  }
}

function touchEnded() {
  if (game && game.isMobile) {
    try {
      // Find touches that ended
      const currentTouchIds = touches.map(t => t.id);
      const activeTouchIds = Object.keys(game.mobileControls.activeTouches);
      
      // For each active touch, check if it's still in the current touches
      for (const id of activeTouchIds) {
        if (!currentTouchIds.includes(parseInt(id))) {
          game.handleTouchEnd(parseInt(id));
        }
      }
    } catch (err) {
      console.error('Error in touchEnded:', err);
    }
    return false; // Prevent default
  }
}

function touchMoved() {
  if (game && game.isMobile) {
    try {
      // Handle each touch
      for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        // Convert touch position to canvas coordinates
        const touchX = touch.x;
        const touchY = touch.y;
        game.handleTouchMove(touchX, touchY, touch.id);
      }
    } catch (err) {
      console.error('Error in touchMoved:', err);
    }
    return false; // Prevent default
  }
} 