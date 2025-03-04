class Game {
  constructor() {
    // Game state
    this.state = 'start'; // start, play, gameOver, leaderboard, submitScore
    
    // Game settings
    this.width = 800;
    this.height = 600;
    this.difficulty = 1;
    this.difficultyIncreaseRate = 0.05;
    this.maxDifficulty = 5;
    
    // Mobile controls
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.mobileControls = {
      leftButton: { x: 60, y: this.height - 80, radius: 40 },
      rightButton: { x: 160, y: this.height - 80, radius: 40 },
      shootButton: { x: this.width - 60, y: this.height - 80, radius: 40 },
      buttonsVisible: true,
      touchStartX: 0,
      touchStartY: 0,
      activeTouches: {},
      autoShootEnabled: true,
      lastShootTime: 0,
      shootInterval: 500 // milliseconds between auto-shots
    };
    
    // Meltdown bar
    this.meltdownMax = 100;
    this.meltdown = this.meltdownMax;
    this.meltdownDrainRate = 0.2;
    this.meltdownFillAmount = 15; // Starting fill amount (higher)
    this.meltdownFillDecayRate = 0.02; // How quickly the fill amount decreases
    this.meltdownMinFillAmount = 2; // Minimum fill amount
    this.meltdownDamage = 15;
    
    // Audio settings
    this.isMusicPlaying = false;
    this.lastMusicIntensity = 1;
    this.musicIntensityUpdateCounter = 0;
    
    // Scoring
    this.score = 0;
    this.scoreMultiplier = 1;
    this.scoreMultiplierIncreaseRate = 0.01;
    
    // Game time tracking
    this.gameTime = 0; // Time in seconds
    
    // Game over effect timing
    this.gameOverTime = 0;
    this.shakeEffectDuration = 5; // 5 seconds of shaking
    
    // Bubble generation
    this.redBubbles = [];
    this.blueBubbles = [];
    this.redBubbleSpawnRate = 60; // frames
    this.redBubbleSpawnCounter = 0;
    this.minRedBubbleSpawnRate = 15; // Minimum frames between spawns
    
    // Power-ups
    this.powerUps = [];
    this.powerUpTypes = [
      {
        name: 'executiveOrder',
        color: [255, 215, 0], // Gold
        effect: 'Clears all red bubbles',
        action: () => this.clearAllRedBubbles(),
        spawnChance: 0.001, // 0.1% chance per frame
        size: 40,
        duration: null // Instant effect
      },
      {
        name: 'diplomaticImmunity',
        color: [0, 191, 255], // Deep Sky Blue
        effect: 'Temporary invincibility',
        action: () => this.activateInvincibility(),
        spawnChance: 0.0005, // 0.05% chance per frame
        size: 40,
        duration: 5 // 5 seconds
      },
      {
        name: 'mediaBlitz',
        color: [255, 105, 180], // Hot Pink
        effect: 'Double score for a limited time',
        action: () => this.activateScoreBoost(),
        spawnChance: 0.0008, // 0.08% chance per frame
        size: 40,
        duration: 10 // 10 seconds
      }
    ];
    
    // Active power-up effects
    this.activePowerUps = {
      invincibility: {
        active: false,
        endTime: 0
      },
      scoreBoost: {
        active: false,
        endTime: 0,
        multiplier: 2
      }
    };
    
    // Visual effects
    this.particles = [];
    this.scorePopups = [];
    
    // Assets
    this.backgroundImg = null;
    this.trumpImg = null;
    this.zelenskyImg = null;
    this.redBubbleImg = null;
    this.blueBubbleImg = null;
    this.trumpExplodeImg = null;
    
    // Audio
    this.backgroundMusic = null;
    this.trumpVoiceClips = [];
    
    // Player
    this.player = null;
    
    // Leaderboard
    this.leaderboardData = [];
    this.isLeaderboardLoading = false;
    this.leaderboardError = null;
    this.playerName = '';
    this.playerEmail = '';
    this.isSubmittingScore = false;
    this.submitScoreError = null;
    this.isHighScore = false;
    this.leaderboardQualified = false;
    this.activeField = 'name'; // Added for input field tracking
  }
  
  // We don't need to preload assets as they are generated in sketch.js
  // This method is kept for compatibility but doesn't do anything
  preload() {
    // Assets are created programmatically in sketch.js
  }
  
  setup() {
    createCanvas(this.width, this.height);
    this.player = new Player(this.width / 2, this.height - 100, this.zelenskyImg);
  }
  
  update() {
    if (this.state === 'play') {
      // Update game time
      this.gameTime += 1/60; // Assuming 60 FPS
      
      // Handle auto-shooting for mobile
      if (this.isMobile && this.mobileControls.autoShootEnabled) {
        const currentTime = Date.now();
        if (currentTime - this.mobileControls.lastShootTime >= this.mobileControls.shootInterval) {
          this.shootBlueBubble();
          this.mobileControls.lastShootTime = currentTime;
        }
      }
      
      // Update player
      this.player.update();
      
      // Update meltdown fill amount (decreases over time)
      this.meltdownFillAmount = max(
        this.meltdownMinFillAmount,
        15 - (this.gameTime * this.meltdownFillDecayRate * this.difficulty)
      );
      
      // Update score multiplier
      this.scoreMultiplier = 1 + (this.gameTime * this.scoreMultiplierIncreaseRate);
      
      // Apply score boost if active
      if (this.activePowerUps.scoreBoost.active) {
        if (Date.now() > this.activePowerUps.scoreBoost.endTime) {
          this.activePowerUps.scoreBoost.active = false;
        } else {
          this.scoreMultiplier *= this.activePowerUps.scoreBoost.multiplier;
        }
      }
      
      // Update background music intensity based on meltdown level
      this.updateMusicIntensity();
      
      // Spawn red bubbles
      this.redBubbleSpawnCounter++;
      const currentSpawnRate = max(
        this.minRedBubbleSpawnRate,
        this.redBubbleSpawnRate / this.difficulty
      );
      
      if (this.redBubbleSpawnCounter >= currentSpawnRate) {
        this.spawnRedBubble();
        this.redBubbleSpawnCounter = 0;
      }
      
      // Randomly spawn power-ups
      this.trySpawnPowerUp();
      
      // Update power-ups
      for (let i = this.powerUps.length - 1; i >= 0; i--) {
        this.powerUps[i].update();
        
        // Check if power-up hit the player
        if (this.powerUps[i].checkCollision(this.player)) {
          // Activate power-up effect
          this.activatePowerUp(this.powerUps[i].type);
          
          // Create particles
          this.createParticles(
            this.powerUps[i].x, 
            this.powerUps[i].y, 
            'powerUp', 
            15,
            this.powerUps[i].color
          );
          
          // Remove power-up
          this.powerUps.splice(i, 1);
          continue;
        }
        
        // Remove if out of bounds
        if (this.powerUps[i].y > this.height) {
          this.powerUps.splice(i, 1);
        }
      }
      
      // Update red bubbles
      for (let i = this.redBubbles.length - 1; i >= 0; i--) {
        this.redBubbles[i].update();
        
        // Check if red bubble hit the player
        if (this.redBubbles[i].checkCollision(this.player)) {
          // Only take damage if not invincible
          if (!this.activePowerUps.invincibility.active) {
            this.meltdown -= this.meltdownDamage;
          }
          
          this.createParticles(this.redBubbles[i].x, this.redBubbles[i].y, 'red', 10);
          this.redBubbles.splice(i, 1);
          continue;
        }
        
        // Remove if out of bounds
        if (this.redBubbles[i].y > this.height) {
          this.redBubbles.splice(i, 1);
        }
      }
      
      // Update blue bubbles
      for (let i = this.blueBubbles.length - 1; i >= 0; i--) {
        this.blueBubbles[i].update();
        
        // Check collision with red bubbles
        let hitBubble = false;
        for (let j = this.redBubbles.length - 1; j >= 0; j--) {
          if (this.blueBubbles[i].checkCollision(this.redBubbles[j])) {
            // Add to meltdown bar (decreasing over time)
            this.meltdown += this.meltdownFillAmount;
            if (this.meltdown > this.meltdownMax) {
              this.meltdown = this.meltdownMax;
            }
            
            // Add to score
            const bubbleScore = floor(100 * this.scoreMultiplier);
            this.score += bubbleScore;
            
            // Create score popup
            this.createScorePopup(this.redBubbles[j].x, this.redBubbles[j].y, bubbleScore);
            
            // Create particles - American flag colors for Trump's bubbles
            this.createParticles(this.redBubbles[j].x, this.redBubbles[j].y, null, 15, 'american');
            
            // Create particles - Ukrainian flag colors for Zelensky's bubbles
            this.createParticles(this.blueBubbles[i].x, this.blueBubbles[i].y, null, 10, 'ukrainian');
            
            // Play random Trump voice clip with 20% chance
            if (random() < 0.2 && this.trumpVoiceClips && this.trumpVoiceClips.length > 0) {
              const randomClip = floor(random(this.trumpVoiceClips.length));
              this.playTrumpVoice(randomClip);
            }
            
            this.redBubbles.splice(j, 1);
            hitBubble = true;
            break;
          }
        }
        
        if (hitBubble) {
          this.blueBubbles.splice(i, 1);
          continue;
        }
        
        // Remove if out of bounds
        if (this.blueBubbles[i].y < 0) {
          this.blueBubbles.splice(i, 1);
        }
      }
      
      // Update particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        this.particles[i].update();
        if (this.particles[i].alpha <= 0) {
          this.particles.splice(i, 1);
        }
      }
      
      // Update score popups
      for (let i = this.scorePopups.length - 1; i >= 0; i--) {
        this.scorePopups[i].update();
        if (this.scorePopups[i].alpha <= 0) {
          this.scorePopups.splice(i, 1);
        }
      }
      
      // Check invincibility status
      if (this.activePowerUps.invincibility.active) {
        if (Date.now() > this.activePowerUps.invincibility.endTime) {
          this.activePowerUps.invincibility.active = false;
        }
      }
      
      // Drain meltdown bar over time
      this.meltdown -= this.meltdownDrainRate * this.difficulty;
      
      // Increase difficulty over time
      this.difficulty += this.difficultyIncreaseRate / 60; // Increase per second
      if (this.difficulty > this.maxDifficulty) {
        this.difficulty = this.maxDifficulty;
      }
      
      // Check game over condition
      if (this.meltdown <= 0) {
        this.meltdown = 0;
        this.state = 'gameOver';
        this.gameOverTime = 0; // Reset game over timer
        
        // Check if score qualifies for leaderboard
        this.checkLeaderboardQualification();
      }
      
      // Check if challenge score was beaten
      if (this.challengeScore && this.score > this.challengeScore && !this.challengeBeaten) {
        this.challengeBeaten = true;
        this.showMessage('Challenge completed! You beat the score!', 3000);
      }
    } else if (this.state === 'gameOver') {
      // Update game over timer
      this.gameOverTime += 1/60; // Assuming 60 FPS
    }
  }
  
  draw() {
    // Draw background
    image(this.backgroundImg, 0, 0, this.width, this.height);
    
    if (this.state === 'start') {
      this.drawStartScreen();
    } else if (this.state === 'play') {
      // Draw game elements
      this.player.draw();
      
      // Draw power-ups
      for (const powerUp of this.powerUps) {
        powerUp.draw();
      }
      
      // Draw bubbles
      for (const bubble of this.redBubbles) {
        bubble.draw();
      }
      
      for (const bubble of this.blueBubbles) {
        bubble.draw();
      }
      
      // Draw particles
      for (const particle of this.particles) {
        particle.draw();
      }
      
      // Draw score popups
      for (const popup of this.scorePopups) {
        popup.draw();
      }
      
      // Draw active power-up effects
      this.drawActivePowerUps();
      
      // Draw meltdown bar
      this.drawMeltdownBar();
      
      // Draw score
      this.drawScore();
      
      // Draw difficulty indicator
      this.drawDifficulty();
      
      // Draw challenge score indicator if applicable
      if (this.challengeScore) {
        this.drawChallengeIndicator();
      }
      
      // Draw mobile controls
      this.drawMobileControls();
    } else if (this.state === 'gameOver') {
      this.drawGameOverScreen();
    } else if (this.state === 'leaderboard') {
      this.drawLeaderboardScreen();
    } else if (this.state === 'submitScore') {
      this.drawSubmitScoreScreen();
    }
    
    // Draw temporary message if exists
    if (this.tempMessage && Date.now() < this.tempMessage.endTime) {
      this.drawTempMessage();
    }
  }
  
  drawStartScreen() {
    fill(0, 0, 0, 150);
    rect(0, 0, this.width, this.height);
    
    fill(255);
    textSize(40);
    textAlign(CENTER, CENTER);
    text('Diplomatic Disaster', this.width / 2, this.height / 3);
    text('Trump vs Zelensky', this.width / 2, this.height / 3 + 50);
    
    textSize(20);
    
    if (this.isMobile) {
      // Mobile instructions
      text('Use on-screen buttons to move and shoot', this.width / 2, this.height / 2 + 30);
      text('Toggle auto-shoot with the button in the corner', this.width / 2, this.height / 2 + 60);
    } else {
      // Desktop instructions
      text('Use LEFT and RIGHT arrows to move', this.width / 2, this.height / 2 + 30);
      text('Press SPACE to shoot blue speech bubbles', this.width / 2, this.height / 2 + 60);
    }
    
    text('Destroy red bubbles to fill the meltdown bar', this.width / 2, this.height / 2 + 90);
    
    textSize(24);
    if (this.isMobile) {
      text('Tap anywhere to start', this.width / 2, this.height * 3/4);
    } else {
      text('Press ENTER to start', this.width / 2, this.height * 3/4);
    }
  }
  
  drawGameOverScreen() {
    // Check if we're still in the shaking period
    const isShaking = this.gameOverTime < this.shakeEffectDuration;
    const shouldShowLeaderboard = this.gameOverTime >= 1.5 && this.leaderboardQualified;
    
    if (isShaking) {
      // Make the entire background shake
      push();
      translate(random(-10, 10), random(-10, 10));
      
      // Draw background with shaking effect
      image(this.backgroundImg, 0, 0, this.width, this.height);
      
      pop();
      
      // Create explosion particles
      if (frameCount % 5 === 0) {
        // Add particles around the screen for dramatic effect
        this.createParticles(random(this.width), random(this.height), 'explosion', 5);
      }
      
      // Automatically transition to submit score screen after 1.5 seconds if qualified
      if (shouldShowLeaderboard) {
        this.state = 'submitScore';
        this.activeField = 'name'; // Set initial active field
        this.playerName = '';
        this.playerEmail = '';
        return;
      }
    } else {
      // Draw stable background after shaking period
      image(this.backgroundImg, 0, 0, this.width, this.height);
    }
    
    // Semi-transparent overlay
    fill(0, 0, 0, 150);
    rect(0, 0, this.width, this.height);
    
    // Game over text
    fill(255, 50, 50);
    textSize(40);
    textAlign(CENTER, CENTER);
    text('You\'re a loser, get out of my office!', this.width / 2, this.height / 3);
    
    fill(255);
    textSize(30);
    text(`Final Score: ${this.score}`, this.width / 2, this.height / 2);
    
    textSize(24);
    text('Press ENTER to play again', this.width / 2, this.height * 3/4);
    
    // Remove the "Press L to submit" text since we'll auto-transition
    if (!this.leaderboardQualified) {
      textSize(20);
      text('Press V to view leaderboard', this.width / 2, this.height * 3/4 + 40);
    }
    
    // Social Media Sharing Buttons
    this.drawSocialButtons(this.width / 2, this.height * 3/4 + 80);
  }
  
  drawLeaderboardScreen() {
    // Draw background
    background(0, 0, 0, 200);
    
    // Draw title
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(40);
    text('Leaderboard', this.width / 2, 70);
    
    // Draw column headers
    textSize(24);
    textAlign(CENTER, CENTER);
    fill(200, 200, 200);
    text('Rank', 100, 140);
    text('Player', 230, 140);
    text('Score', 525, 140); // Adjusted position for better alignment
    
    // Draw separator line
    stroke(150);
    line(80, 160, this.width - 80, 160);
    noStroke();
    
    // Calculate how many entries we can display while leaving space for the ESC text
    const entryHeight = 40;
    const bottomMargin = 100; // Space at bottom for ESC text and buttons
    const maxEntries = Math.min(
      this.leaderboardData.length,
      Math.floor((this.height - 180 - bottomMargin) / entryHeight)
    );
    
    // Draw leaderboard entries
    for (let i = 0; i < maxEntries; i++) {
      const entry = this.leaderboardData[i];
      const y = 180 + (i * entryHeight);
      
      // Highlight the player's entry
      if (entry.player_name === this.playerName && entry.score === this.score) {
        fill(50, 150, 50, 100);
        rect(80, y - 15, this.width - 160, 30, 5);
      }
      
      // Draw rank
      textAlign(CENTER, CENTER);
      if (i === 0) {
        fill(255, 215, 0); // Gold for 1st place
      } else if (i === 1) {
        fill(192, 192, 192); // Silver for 2nd place
      } else if (i === 2) {
        fill(205, 127, 50); // Bronze for 3rd place
      } else {
        fill(255);
      }
      text(i + 1, 100, y);
      
      // Draw player name
      textAlign(LEFT, CENTER);
      fill(255);
      text(entry.player_name, 150, y);
      
      // Draw score with right alignment
      textAlign(RIGHT, CENTER);
      text(entry.score, 550, y); // Adjusted position for better alignment
    }
    
    // Draw social sharing buttons
    this.drawSocialButtons(this.width / 2, this.height - 70);
    
    // Draw "Press ESC to play again" text
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(20);
    text('Press ESC to play again', this.width / 2, this.height - 30);
  }
  
  drawSubmitScoreScreen() {
    // Semi-transparent overlay
    fill(0, 0, 0, 200);
    rect(0, 0, this.width, this.height);
    
    // Title
    fill(255, 255, 100);
    textSize(40);
    textAlign(CENTER, CENTER);
    text('You made it to the leaderboard!', this.width / 2, 80);
    
    fill(255);
    textSize(30);
    text(`Your Score: ${this.score}`, this.width / 2, 140);
    
    // Form
    textSize(24);
    textAlign(LEFT, CENTER);
    text('Name:', 200, 220);
    text('Email:', 200, 280);
    
    // Input boxes with highlight for active field
    if (this.activeField === 'name') {
      fill(70, 70, 100); // Highlight active field
    } else {
      fill(50);
    }
    rect(300, 200, 300, 40, 5);
    
    if (this.activeField === 'email') {
      fill(70, 70, 100); // Highlight active field
    } else {
      fill(50);
    }
    rect(300, 260, 300, 40, 5);
    
    // Input values
    fill(255);
    textAlign(LEFT, CENTER);
    text(this.playerName, 310, 220);
    text(this.playerEmail, 310, 280);
    
    // Cursor for active field
    if (frameCount % 60 < 30) {
      const cursorX = this.activeField === 'name' ? 310 + textWidth(this.playerName) : 310 + textWidth(this.playerEmail);
      const cursorY = this.activeField === 'name' ? 220 : 280;
      text('|', cursorX, cursorY);
    }
    
    // Newsletter text
    fill(180, 180, 180);
    textSize(14);
    textAlign(CENTER, CENTER);
    text("You'll register to Manu's newsletter", this.width / 2, 310);
    
    // Submit button
    fill(100, 200, 100);
    rect(this.width / 2 - 100, 340, 200, 50, 10);
    fill(0);
    textAlign(CENTER, CENTER);
    text('Submit', this.width / 2, 365);
    
    // Instructions
    fill(200, 200, 200);
    textSize(18);
    textAlign(CENTER, CENTER);
    text('Press TAB to switch fields, ENTER to submit', this.width / 2, 420);
    
    // Error message if any
    if (this.submitScoreError) {
      fill(255, 100, 100);
      textSize(18);
      text(this.submitScoreError, this.width / 2, 460);
    }
    
    // Loading indicator
    if (this.isSubmittingScore) {
      fill(0, 0, 0, 200);
      rect(0, 0, this.width, this.height);
      fill(255);
      textSize(24);
      text('Submitting score...', this.width / 2, this.height / 2);
    }
    
    // Back button
    fill(255);
    textSize(20);
    text('Press ESC to play again', this.width / 2, this.height - 80);
  }
  
  drawMeltdownBar() {
    // Draw bar background
    fill(100);
    rect(20, 20, 200, 30, 5);
    
    // Draw bar fill
    const fillWidth = map(this.meltdown, 0, this.meltdownMax, 0, 200);
    const barColor = map(this.meltdown, 0, this.meltdownMax, 255, 0);
    fill(barColor, 0, 255 - barColor);
    rect(20, 20, fillWidth, 30, 5);
    
    // Draw label
    fill(255);
    textSize(16);
    textAlign(CENTER, CENTER);
    text('MELTDOWN', 120, 35);
  }
  
  drawScore() {
    fill(255);
    textSize(20);
    textAlign(RIGHT, TOP);
    text(`Score: ${this.score}`, this.width - 20, 20);
    
    textSize(14);
    text(`Multiplier: ${this.scoreMultiplier.toFixed(1)}x`, this.width - 20, 45);
    
    textSize(14);
    text(`Meltdown Fill: ${this.meltdownFillAmount.toFixed(1)}`, this.width - 20, 65);
  }
  
  drawDifficulty() {
    fill(255);
    textSize(16);
    textAlign(LEFT, CENTER);
    text(`Difficulty: ${this.difficulty.toFixed(1)}`, 20, 70);
    text(`Time: ${this.gameTime.toFixed(0)}s`, 20, 90);
  }
  
  spawnRedBubble() {
    const x = random(50, this.width - 50);
    const speed = random(2, 4) * this.difficulty;
    const size = random(60, 100);
    this.redBubbles.push(new Bubble(x, 0, size, speed, 'red', this.redBubbleImg));
  }
  
  shootBlueBubble() {
    if (this.state === 'play') {
      const x = this.player.x;
      const y = this.player.y - 30;
      const speed = 8;
      const size = 40;
      this.blueBubbles.push(new Bubble(x, y, size, speed, 'blue', this.blueBubbleImg));
    }
  }
  
  createParticles(x, y, type, count, customColor = null) {
    for (let i = 0; i < count; i++) {
      let color;
      if (customColor) {
        color = customColor;
      } else if (type === 'red') {
        color = [255, 100, 100];
      } else if (type === 'blue') {
        color = [100, 100, 255];
      } else if (type === 'explosion') {
        color = [255, random(100, 200), 0];
      } else if (type === 'powerUp') {
        color = [255, 215, 0]; // Default gold for power-ups
      } else if (type === 'american') {
        const colors = [
          [255, 0, 0],   // Red
          [255, 255, 255], // White
          [0, 0, 255]    // Blue
        ];
        color = colors[floor(random(3))];
      } else if (type === 'ukrainian') {
        const colors = [
          [0, 87, 183],  // Blue
          [255, 215, 0]  // Yellow
        ];
        color = colors[floor(random(2))];
      }
      
      this.particles.push(new Particle(x, y, color, type));
    }
  }
  
  createScorePopup(x, y, score) {
    this.scorePopups.push(new ScorePopup(x, y, score));
  }
  
  keyPressed() {
    if (keyCode === ENTER) {
      if (this.state === 'start') {
        this.resetGame();
        this.state = 'play';
        
        // Start background music when game starts
        this.startBackgroundMusic();
      } else if (this.state === 'gameOver') {
        this.resetGame();
        this.state = 'play';
        
        // Restart background music
        this.startBackgroundMusic();
      } else if (this.state === 'submitScore') {
        this.submitScore();
      }
    }
    
    if (keyCode === 32) { // Space bar
      this.shootBlueBubble();
    }
    
    if (keyCode === 76) { // L key
      if (this.state === 'gameOver' && this.leaderboardQualified) {
        this.state = 'submitScore';
        this.activeField = 'name'; // Set initial active field
        this.playerName = '';
        this.playerEmail = '';
      }
    }
    
    if (keyCode === 86) { // V key
      if (this.state === 'gameOver') {
        this.loadLeaderboard();
        this.state = 'leaderboard';
      }
    }
    
    if (keyCode === 27) { // ESC key
      if (this.state === 'leaderboard' || this.state === 'submitScore') {
        this.resetGame();
        this.state = 'play';
      }
    }
    
    if (keyCode === 9) { // TAB key
      if (this.state === 'submitScore') {
        // Toggle between name and email fields
        this.activeField = this.activeField === 'name' ? 'email' : 'name';
        return false; // Prevent default tab behavior
      }
    }
    
    // Handle typing in input fields
    if (this.state === 'submitScore') {
      // Handle period (.) character specifically - keyCode 190
      if (keyCode === 190) {
        if (this.activeField === 'email') {
          this.playerEmail += '.';
        }
        return;
      }
      
      // Handle all other printable characters
      if ((keyCode >= 32 && keyCode <= 126) || keyCode === 190) { // Printable characters including period
        if (this.activeField === 'name') {
          this.playerName += key;
        } else {
          this.playerEmail += key;
        }
      } else if (keyCode === 8) { // Backspace
        if (this.activeField === 'name') {
          this.playerName = this.playerName.slice(0, -1);
        } else {
          this.playerEmail = this.playerEmail.slice(0, -1);
        }
      }
    }
  }
  
  mousePressed() {
    // Handle mouse clicks based on game state
    if (this.state === 'start') {
      this.resetGame();
      this.state = 'play';
      
      // Start background music when game starts
      this.startBackgroundMusic();
    } else if (this.state === 'gameOver') {
      // For mobile, allow tapping anywhere to restart
      if (this.isMobile) {
        this.resetGame();
        this.state = 'play';
        
        // Restart background music
        this.startBackgroundMusic();
      } else {
        // Check if the player clicked on the "View Leaderboard" text
        if (mouseY > this.height - 120 && mouseY < this.height - 80) {
          this.loadLeaderboard();
          this.state = 'leaderboard';
        }
      }
    } else if (this.state === 'leaderboard') {
      // For mobile, allow tapping anywhere to go back to the game
      if (this.isMobile && mouseY > this.height - 60) {
        this.resetGame();
        this.state = 'play';
      }
      
      // Check if any social button was clicked
      for (let i = 0; i < this.socialButtons.length; i++) {
        const button = this.socialButtons[i];
        if (this.isMouseOverButton(button)) {
          if (button.action === 'twitter') {
            this.shareOnTwitter();
          } else if (button.action === 'facebook') {
            this.shareOnFacebook();
          } else if (button.action === 'challenge') {
            this.challengeFriend();
          }
        }
      }
    } else if (this.state === 'submitScore') {
      // Check if name field was clicked
      if (mouseX >= 300 && mouseX <= 600 && mouseY >= 200 && mouseY <= 240) {
        this.activeField = 'name';
      }
      // Check if email field was clicked
      else if (mouseX >= 300 && mouseX <= 600 && mouseY >= 260 && mouseY <= 300) {
        this.activeField = 'email';
      }
      // Check if submit button was clicked
      else if (mouseX >= this.width / 2 - 100 && mouseX <= this.width / 2 + 100 && 
               mouseY >= 340 && mouseY <= 390) {
        this.submitScore();
      }
      // For mobile, allow tapping the "Press ESC to play again" text
      else if (this.isMobile && mouseY > this.height - 100 && mouseY < this.height - 60) {
        this.resetGame();
        this.state = 'play';
      }
    }
  }
  
  isMouseOverButton(button) {
    return mouseX >= button.x && 
           mouseX <= button.x + button.width && 
           mouseY >= button.y && 
           mouseY <= button.y + button.height;
  }
  
  resetGame() {
    this.meltdown = this.meltdownMax;
    this.difficulty = 1;
    this.redBubbles = [];
    this.blueBubbles = [];
    this.particles = [];
    this.scorePopups = [];
    this.powerUps = [];
    this.player.x = this.width / 2;
    this.score = 0;
    this.gameTime = 0;
    this.meltdownFillAmount = 15;
    this.scoreMultiplier = 1;
    this.leaderboardQualified = false;
    this.challengeBeaten = false;
    
    // Reset active power-ups
    this.activePowerUps.invincibility.active = false;
    this.activePowerUps.scoreBoost.active = false;
  }
  
  async checkLeaderboardQualification() {
    try {
      // Use the global gameLeaderboard object
      this.leaderboardQualified = await window.gameLeaderboard.checkLeaderboardQualification(this.score);
    } catch (err) {
      console.error('Error checking leaderboard qualification:', err);
      this.leaderboardQualified = false;
    }
  }
  
  async loadLeaderboard() {
    this.isLeaderboardLoading = true;
    this.leaderboardError = null;
    
    try {
      // Use the global gameLeaderboard object
      this.leaderboardData = await window.gameLeaderboard.getTopScores();
      this.isLeaderboardLoading = false;
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      this.leaderboardError = err.message;
      this.isLeaderboardLoading = false;
    }
  }
  
  async submitScore() {
    // Validate inputs
    if (!this.playerName.trim()) {
      this.submitScoreError = 'Please enter your name';
      return;
    }
    
    // Validate email format (must include @ and .)
    if (!this.playerEmail.trim() || !this.playerEmail.includes('@') || !this.playerEmail.includes('.')) {
      this.submitScoreError = 'Please enter a valid email (must include @ and .)';
      return;
    }
    
    this.isSubmittingScore = true;
    this.submitScoreError = null;
    
    try {
      console.log('Game: Submitting score...', {
        name: this.playerName,
        email: this.playerEmail,
        score: this.score
      });
      
      // Check if gameLeaderboard exists
      if (!window.gameLeaderboard) {
        console.error('Game: gameLeaderboard is not defined');
        this.submitScoreError = 'Leaderboard system is not available. Please try again later.';
        this.isSubmittingScore = false;
        return;
      }
      
      // Use the global gameLeaderboard object
      const success = await window.gameLeaderboard.submitScore(this.playerName, this.playerEmail, this.score);
      
      if (success) {
        console.log('Game: Score submitted successfully');
        // Load the leaderboard to show the player their score
        await this.loadLeaderboard();
        this.state = 'leaderboard';
      } else {
        console.error('Game: Failed to submit score');
        this.submitScoreError = 'Failed to submit score. Try again later.';
      }
      
      this.isSubmittingScore = false;
    } catch (err) {
      console.error('Game: Error submitting score:', err);
      console.error('Game: Error message:', err.message);
      console.error('Game: Error stack:', err.stack);
      this.submitScoreError = `Error: ${err.message}`;
      this.isSubmittingScore = false;
    }
  }
  
  // New method to draw social media sharing buttons
  drawSocialButtons(x, y) {
    const buttonWidth = 100;
    const buttonHeight = 40;
    const buttonSpacing = 20;
    const totalWidth = (buttonWidth * 3) + (buttonSpacing * 2);
    const startX = x - (totalWidth / 2);
    
    // Twitter button
    const twitterButton = {
      x: startX,
      y: y - buttonHeight / 2,
      width: buttonWidth,
      height: buttonHeight,
      text: 'Tweet',
      action: 'twitter',
      color: [29, 161, 242], // Twitter blue
      hoverColor: [0, 132, 213],
      icon: '🐦'
    };
    
    // Facebook button
    const facebookButton = {
      x: startX + buttonWidth + buttonSpacing,
      y: y - buttonHeight / 2,
      width: buttonWidth,
      height: buttonHeight,
      text: 'Share',
      action: 'facebook',
      color: [59, 89, 152], // Facebook blue
      hoverColor: [40, 70, 133],
      icon: '👍'
    };
    
    // Challenge button
    const challengeButton = {
      x: startX + (buttonWidth + buttonSpacing) * 2,
      y: y - buttonHeight / 2,
      width: buttonWidth,
      height: buttonHeight,
      text: 'Challenge',
      action: 'challenge',
      color: [76, 175, 80], // Green
      hoverColor: [56, 155, 60],
      icon: '🏆'
    };
    
    this.socialButtons = [twitterButton, facebookButton, challengeButton];
    
    // Draw buttons
    for (const button of this.socialButtons) {
      // Check if mouse is over button
      const isHover = this.isMouseOverButton(button);
      
      // Draw button background with rounded corners
      fill(isHover ? button.hoverColor : button.color);
      stroke(255);
      strokeWeight(2);
      rect(button.x, button.y, button.width, button.height, 10);
      noStroke();
      
      // Draw button text
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(16);
      text(button.icon + ' ' + button.text, button.x + button.width / 2, button.y + button.height / 2);
    }
  }
  
  // Social media sharing methods
  shareOnTwitter() {
    const text = `I scored ${this.score} points in Diplomatic Disaster: Trump vs Zelensky! Can you beat my score?`;
    const url = window.location.href;
    const hashtags = 'DiplomaticDisaster,TrumpGame';
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${encodeURIComponent(hashtags)}`;
    
    window.open(twitterUrl, '_blank');
  }
  
  shareOnFacebook() {
    const url = window.location.href;
    
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    
    window.open(facebookUrl, '_blank');
  }
  
  challengeFriend() {
    // Generate a challenge URL with the score as a parameter
    const baseUrl = window.location.href.split('?')[0]; // Remove any existing query params
    const challengeUrl = `${baseUrl}?challenge=${this.score}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(challengeUrl).then(() => {
      // Show a temporary message
      this.showMessage('Challenge link copied to clipboard!');
    }).catch(err => {
      console.error('Could not copy text: ', err);
      // Fallback: show the URL and ask user to copy manually
      prompt('Copy this link to challenge a friend:', challengeUrl);
    });
  }
  
  // Method to show temporary messages
  showMessage(message, duration = 2000) {
    this.tempMessage = {
      text: message,
      endTime: Date.now() + duration
    };
  }
  
  // Method to draw temporary messages
  drawTempMessage() {
    // Semi-transparent background
    fill(0, 0, 0, 200);
    rect(this.width/2 - 200, this.height/2 - 50, 400, 100, 10);
    
    // Message text
    fill(255);
    textSize(20);
    textAlign(CENTER, CENTER);
    text(this.tempMessage.text, this.width/2, this.height/2);
  }
  
  // Draw active power-up indicators
  drawActivePowerUps() {
    let y = 120;
    const x = 20;
    const height = 25;
    const width = 180;
    
    // Invincibility indicator
    if (this.activePowerUps.invincibility.active) {
      const timeLeft = (this.activePowerUps.invincibility.endTime - Date.now()) / 1000;
      const percentage = timeLeft / 5; // 5 seconds is the full duration
      
      fill(0, 191, 255, 100);
      rect(x, y, width, height, 5);
      
      fill(0, 191, 255);
      rect(x, y, width * percentage, height, 5);
      
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(14);
      text('Diplomatic Immunity', x + width/2, y + height/2);
      
      y += height + 5;
    }
    
    // Score boost indicator
    if (this.activePowerUps.scoreBoost.active) {
      const timeLeft = (this.activePowerUps.scoreBoost.endTime - Date.now()) / 1000;
      const percentage = timeLeft / 10; // 10 seconds is the full duration
      
      fill(255, 105, 180, 100);
      rect(x, y, width, height, 5);
      
      fill(255, 105, 180);
      rect(x, y, width * percentage, height, 5);
      
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(14);
      text('Media Blitz (2x Score)', x + width/2, y + height/2);
    }
  }
  
  // Draw challenge score indicator
  drawChallengeIndicator() {
    const x = this.width - 20;
    const y = 85;
    
    fill(this.challengeBeaten ? [76, 175, 80] : [255, 255, 255]);
    textAlign(RIGHT, TOP);
    textSize(14);
    text(`Challenge: ${this.challengeScore}`, x, y);
    
    if (this.challengeBeaten) {
      text('✓ Completed!', x, y + 20);
    }
  }
  
  // Try to spawn a power-up based on random chance
  trySpawnPowerUp() {
    for (const powerUpType of this.powerUpTypes) {
      if (random() < powerUpType.spawnChance) {
        this.spawnPowerUp(powerUpType);
        break; // Only spawn one power-up per frame at most
      }
    }
  }
  
  // Spawn a power-up
  spawnPowerUp(type) {
    const x = random(50, this.width - 50);
    const speed = random(1, 3);
    this.powerUps.push(new PowerUp(x, 0, type.size, speed, type));
  }
  
  // Activate a power-up effect
  activatePowerUp(type) {
    // Find the power-up type
    const powerUpType = this.powerUpTypes.find(p => p.name === type.name);
    
    if (powerUpType) {
      // Execute the power-up action
      powerUpType.action();
      
      // Show a message
      this.showMessage(`Power-up: ${powerUpType.effect}!`, 2000);
    }
  }
  
  // Power-up effects
  clearAllRedBubbles() {
    // Create explosion particles for each red bubble
    for (const bubble of this.redBubbles) {
      this.createParticles(bubble.x, bubble.y, 'red', 10);
      
      // Add score for each bubble
      const bubbleScore = floor(50 * this.scoreMultiplier);
      this.score += bubbleScore;
      
      // Create score popup
      this.createScorePopup(bubble.x, bubble.y, bubbleScore);
    }
    
    // Clear all red bubbles
    this.redBubbles = [];
    
    // Add to meltdown bar
    this.meltdown += 20;
    if (this.meltdown > this.meltdownMax) {
      this.meltdown = this.meltdownMax;
    }
  }
  
  activateInvincibility() {
    this.activePowerUps.invincibility.active = true;
    this.activePowerUps.invincibility.endTime = Date.now() + 5000; // 5 seconds
  }
  
  activateScoreBoost() {
    this.activePowerUps.scoreBoost.active = true;
    this.activePowerUps.scoreBoost.endTime = Date.now() + 10000; // 10 seconds
  }
  
  // Audio methods
  startBackgroundMusic() {
    if (this.backgroundMusic && !this.isMusicPlaying) {
      try {
        this.backgroundMusic.play();
        this.isMusicPlaying = true;
        
        // Set initial playback rate
        this.updateMusicIntensity(true);
      } catch (err) {
        console.error('Error playing background music:', err);
      }
    }
  }
  
  stopBackgroundMusic() {
    if (this.backgroundMusic && this.isMusicPlaying) {
      try {
        this.backgroundMusic.stop();
        this.isMusicPlaying = false;
      } catch (err) {
        console.error('Error stopping background music:', err);
      }
    }
  }
  
  updateMusicIntensity(force = false) {
    // Only update every 30 frames to avoid too frequent changes
    this.musicIntensityUpdateCounter++;
    if (!force && this.musicIntensityUpdateCounter < 30) {
      return;
    }
    
    this.musicIntensityUpdateCounter = 0;
    
    if (this.backgroundMusic && this.isMusicPlaying) {
      try {
        // Calculate intensity based on meltdown level (lower meltdown = higher intensity)
        const meltdownPercentage = this.meltdown / this.meltdownMax;
        const intensity = map(meltdownPercentage, 0, 1, 1.5, 0.8);
        
        // Only update if the change is significant
        if (force || abs(intensity - this.lastMusicIntensity) > 0.05) {
          this.backgroundMusic.rate(intensity);
          this.lastMusicIntensity = intensity;
          
          // Also adjust volume based on intensity
          const volume = map(intensity, 0.8, 1.5, 0.4, 0.7);
          this.backgroundMusic.setVolume(volume);
        }
      } catch (err) {
        console.error('Error updating music intensity:', err);
      }
    }
  }
  
  playTrumpVoice(index) {
    // Don't try to play if we don't have clips or audio context isn't running
    if (!this.trumpVoiceClips || this.trumpVoiceClips.length === 0) {
      return;
    }
    
    try {
      // Check if audio context is running
      if (getAudioContext().state !== 'running') {
        console.log('Audio context not running, skipping voice clip');
        return;
      }
      
      // Make sure index is valid
      const validIndex = constrain(index || floor(random(this.trumpVoiceClips.length)), 0, this.trumpVoiceClips.length - 1);
      
      // Check if the clip is loaded and valid
      const clip = this.trumpVoiceClips[validIndex];
      if (!clip || typeof clip.isPlaying !== 'function' || typeof clip.play !== 'function') {
        console.warn('Invalid voice clip at index', validIndex);
        return;
      }
      
      // Only play if not already playing another clip
      let isAnyPlaying = false;
      for (const c of this.trumpVoiceClips) {
        if (c && typeof c.isPlaying === 'function' && c.isPlaying()) {
          isAnyPlaying = true;
          break;
        }
      }
      
      if (!isAnyPlaying) {
        // Set a reasonable volume
        if (typeof clip.setVolume === 'function') {
          clip.setVolume(0.7);
        }
        
        // Play the clip
        clip.play();
      }
    } catch (err) {
      console.error('Error playing Trump voice clip:', err);
    }
  }
  
  // Mobile control methods
  drawMobileControls() {
    if (!this.isMobile || !this.mobileControls.buttonsVisible || this.state !== 'play') {
      return;
    }
    
    // Draw left arrow button
    this.drawMobileButton(
      this.mobileControls.leftButton.x, 
      this.mobileControls.leftButton.y, 
      this.mobileControls.leftButton.radius,
      this.player.isMovingLeft ? [50, 150, 255, 180] : [50, 150, 255, 120],
      '←'
    );
    
    // Draw right arrow button
    this.drawMobileButton(
      this.mobileControls.rightButton.x, 
      this.mobileControls.rightButton.y, 
      this.mobileControls.rightButton.radius,
      this.player.isMovingRight ? [50, 150, 255, 180] : [50, 150, 255, 120],
      '→'
    );
    
    // Draw shoot button
    this.drawMobileButton(
      this.mobileControls.shootButton.x, 
      this.mobileControls.shootButton.y, 
      this.mobileControls.shootButton.radius,
      [255, 100, 100, 150],
      '🔥'
    );
    
    // Draw auto-shoot toggle button
    const autoShootX = this.width - 60;
    const autoShootY = this.height - 160;
    const autoShootRadius = 30;
    
    // Store the button position for touch detection
    this.mobileControls.autoShootToggle = {
      x: autoShootX,
      y: autoShootY,
      radius: autoShootRadius
    };
    
    // Draw auto-shoot toggle button
    this.drawMobileButton(
      autoShootX,
      autoShootY,
      autoShootRadius,
      this.mobileControls.autoShootEnabled ? [50, 200, 50, 180] : [200, 50, 50, 180],
      this.mobileControls.autoShootEnabled ? '🔄' : '⏸️'
    );
    
    // Draw auto-shoot label
    push();
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(14);
    text('Auto', autoShootX, autoShootY - autoShootRadius - 10);
    pop();
  }
  
  drawMobileButton(x, y, radius, color, symbol) {
    push();
    // Draw button background
    noStroke();
    fill(color);
    ellipse(x, y, radius * 2, radius * 2);
    
    // Draw button border
    stroke(255);
    strokeWeight(2);
    noFill();
    ellipse(x, y, radius * 2, radius * 2);
    
    // Draw button symbol
    noStroke();
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(radius);
    text(symbol, x, y);
    pop();
  }
  
  handleTouchStart(touchX, touchY, id) {
    if (this.state !== 'play') return;
    
    // Check if touch is on left button
    if (this.isPointInCircle(touchX, touchY, this.mobileControls.leftButton)) {
      this.player.isMovingLeft = true;
      this.mobileControls.activeTouches[id] = 'left';
    }
    // Check if touch is on right button
    else if (this.isPointInCircle(touchX, touchY, this.mobileControls.rightButton)) {
      this.player.isMovingRight = true;
      this.mobileControls.activeTouches[id] = 'right';
    }
    // Check if touch is on shoot button
    else if (this.isPointInCircle(touchX, touchY, this.mobileControls.shootButton)) {
      this.shootBlueBubble();
      this.mobileControls.activeTouches[id] = 'shoot';
    }
    // Check if touch is on auto-shoot toggle button
    else if (this.mobileControls.autoShootToggle && 
             this.isPointInCircle(touchX, touchY, this.mobileControls.autoShootToggle)) {
      // Toggle auto-shoot
      this.mobileControls.autoShootEnabled = !this.mobileControls.autoShootEnabled;
      
      // Show a message
      if (this.mobileControls.autoShootEnabled) {
        this.showMessage('Auto-shoot enabled', 1500);
      } else {
        this.showMessage('Auto-shoot disabled', 1500);
      }
    }
  }
  
  handleTouchEnd(id) {
    if (this.state !== 'play') return;
    
    // Check which button was released
    const touchType = this.mobileControls.activeTouches[id];
    if (touchType === 'left') {
      this.player.isMovingLeft = false;
    } else if (touchType === 'right') {
      this.player.isMovingRight = false;
    }
    
    // Remove from active touches
    delete this.mobileControls.activeTouches[id];
  }
  
  handleTouchMove(touchX, touchY, id) {
    if (this.state !== 'play') return;
    
    // If this touch was previously on a control button
    const touchType = this.mobileControls.activeTouches[id];
    
    if (touchType === 'left') {
      // Check if still on left button
      if (!this.isPointInCircle(touchX, touchY, this.mobileControls.leftButton)) {
        this.player.isMovingLeft = false;
        delete this.mobileControls.activeTouches[id];
      }
    } else if (touchType === 'right') {
      // Check if still on right button
      if (!this.isPointInCircle(touchX, touchY, this.mobileControls.rightButton)) {
        this.player.isMovingRight = false;
        delete this.mobileControls.activeTouches[id];
      }
    } else if (touchType === 'shoot') {
      // For shoot button, we don't need to do anything on move
      // as shooting is handled on touch start
    } else {
      // If this touch wasn't on a button before, check if it is now
      this.handleTouchStart(touchX, touchY, id);
    }
  }
  
  isPointInCircle(x, y, circle) {
    const distX = x - circle.x;
    const distY = y - circle.y;
    return (distX * distX + distY * distY) <= (circle.radius * circle.radius);
  }
}

// Particle class for visual effects
class Particle {
  constructor(x, y, color, type = 'normal') {
    this.x = x;
    this.y = y;
    this.type = type; // 'normal', 'american', 'ukrainian'
    
    if (type === 'american') {
      // Red, white, or blue for American flag
      const colors = [
        [255, 0, 0],   // Red
        [255, 255, 255], // White
        [0, 0, 255]    // Blue
      ];
      this.color = colors[floor(random(3))];
    } else if (type === 'ukrainian') {
      // Blue or yellow for Ukrainian flag
      const colors = [
        [0, 87, 183],  // Blue
        [255, 215, 0]  // Yellow
      ];
      this.color = colors[floor(random(2))];
    } else {
      // Use provided color
      this.color = color;
    }
    
    this.size = random(3, 8);
    this.speed = random(1, 3);
    this.angle = random(TWO_PI);
    this.alpha = 255;
    this.fadeSpeed = random(5, 10);
    
    // Add some variation to particle behavior
    if (type === 'american' || type === 'ukrainian') {
      this.speed = random(2, 4); // Faster for flag particles
      this.size = random(4, 10); // Larger for flag particles
      this.fadeSpeed = random(3, 7); // Slower fade for flag particles
    }
  }
  
  update() {
    this.x += cos(this.angle) * this.speed;
    this.y += sin(this.angle) * this.speed;
    this.alpha -= this.fadeSpeed;
    
    // Special behavior for flag particles
    if (this.type === 'american' || this.type === 'ukrainian') {
      // Add some waviness to the movement
      this.angle += random(-0.1, 0.1);
    }
  }
  
  draw() {
    noStroke();
    fill(this.color[0], this.color[1], this.color[2], this.alpha);
    
    if (this.type === 'american' || this.type === 'ukrainian') {
      // Draw star-shaped particles for flags
      push();
      translate(this.x, this.y);
      rotate(frameCount * 0.05);
      
      beginShape();
      for (let i = 0; i < 5; i++) {
        const angle = TWO_PI / 5 * i - HALF_PI;
        const x1 = cos(angle) * this.size;
        const y1 = sin(angle) * this.size;
        vertex(x1, y1);
        
        const angleInner = TWO_PI / 5 * (i + 0.5) - HALF_PI;
        const x2 = cos(angleInner) * (this.size * 0.4);
        const y2 = sin(angleInner) * (this.size * 0.4);
        vertex(x2, y2);
      }
      endShape(CLOSE);
      
      pop();
    } else {
      // Regular circular particles
      ellipse(this.x, this.y, this.size, this.size);
    }
  }
}

// Score popup class
class ScorePopup {
  constructor(x, y, score) {
    this.x = x;
    this.y = y;
    this.score = score;
    this.alpha = 255;
    this.fadeSpeed = 5;
    this.ySpeed = -1.5;
  }
  
  update() {
    this.y += this.ySpeed;
    this.alpha -= this.fadeSpeed;
  }
  
  draw() {
    textAlign(CENTER, CENTER);
    textSize(16);
    fill(255, 255, 100, this.alpha);
    text(`+${this.score}`, this.x, this.y);
  }
}

// Power-up class
class PowerUp {
  constructor(x, y, size, speed, type) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.speed = speed;
    this.type = type;
    this.color = type.color;
    
    // For collision detection
    this.radius = size / 2;
    
    // Visual effects
    this.rotation = 0;
    this.rotationSpeed = random(-0.05, 0.05);
    this.scale = 1;
    this.scaleDirection = random([-1, 1]);
    this.scaleSpeed = random(0.005, 0.01);
    this.pulseAmount = 0;
    
    // Icon based on power-up type
    this.icon = this.getIcon();
  }
  
  update() {
    // Fall down
    this.y += this.speed;
    
    // Add slight horizontal movement
    this.x += sin(frameCount * 0.05 + this.y * 0.1) * 0.8;
    
    // Update visual effects
    this.rotation += this.rotationSpeed;
    this.scale += this.scaleDirection * this.scaleSpeed;
    if (this.scale > 1.2 || this.scale < 0.8) {
      this.scaleDirection *= -1;
    }
    
    // Pulsing effect
    this.pulseAmount = sin(frameCount * 0.1) * 0.2 + 0.8;
  }
  
  draw() {
    push();
    translate(this.x, this.y);
    rotate(this.rotation);
    scale(this.scale);
    
    // Draw power-up background (circle with glow)
    noStroke();
    
    // Draw outer glow
    for (let i = 5; i > 0; i--) {
      const alpha = map(i, 5, 0, 50, 150);
      fill(this.color[0], this.color[1], this.color[2], alpha);
      ellipse(0, 0, this.size + i * 3, this.size + i * 3);
    }
    
    // Draw main circle
    fill(this.color[0], this.color[1], this.color[2], 200);
    ellipse(0, 0, this.size, this.size);
    
    // Draw icon
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(this.size * 0.6);
    text(this.icon, 0, 0);
    
    pop();
  }
  
  // Get icon based on power-up type
  getIcon() {
    switch (this.type.name) {
      case 'executiveOrder':
        return '📜';
      case 'diplomaticImmunity':
        return '🛡️';
      case 'mediaBlitz':
        return '📱';
      default:
        return '⭐';
    }
  }
  
  // Check collision with player
  checkCollision(player) {
    const bounds = player.getBounds();
    
    // Simple circle-rectangle collision
    const closestX = constrain(this.x, bounds.left, bounds.right);
    const closestY = constrain(this.y, bounds.top, bounds.bottom);
    
    const distanceX = this.x - closestX;
    const distanceY = this.y - closestY;
    
    const distanceSquared = distanceX * distanceX + distanceY * distanceY;
    
    return distanceSquared < (this.radius * this.radius);
  }
} 