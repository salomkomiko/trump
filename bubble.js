class Bubble {
  constructor(x, y, size, speed, type, img) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.speed = speed;
    this.type = type; // 'red' or 'blue'
    this.img = img;
    
    // For collision detection
    this.radius = size / 2;
    
    // Visual effects
    this.rotation = random(-0.05, 0.05); // Reduced rotation
    this.scale = 1;
    this.scaleDirection = random([-1, 1]);
    this.scaleSpeed = random(0.001, 0.003);
    
    // Select a random phrase
    if (this.type === 'red') {
      this.phrases = [
        "Oh look, you're all dressed up.",
        "You're not in a very good position.",
        "You're gambling with World War III.",
        "What if a bomb drops on your head?",
        "They respect me.",
        "Great television.",
        "Resign and send somebody over.",
        "MAGA",
        "Fake News",
        "Build the Wall",
        "Drain the Swamp",
        "You're fired!",
        "Sad!",
        "Tremendous",
        "Believe me",
        "China",
        "Witch Hunt",
        "Covfefe",
        "Bigly",
        "Wrong",
        "Loser",
        "We'll see what happens",
        "Not good",
        "Disaster",
        "Bad hombres",
        "Such a nasty woman"
      ];
    } else {
      this.phrases = [
        "Don't take the bait.",
        "Freedom!",
        "Democracy!",
        "Unity!",
        "Peace!",
        "Justice!",
        "Truth!",
        "Resist!",
        "Courage!",
        "Strength!",
        "Hope!",
        "Victory!",
        "Solidarity!"
      ];
    }
    
    // Choose a phrase based on bubble size
    if (this.size < 50) {
      // For very small bubbles, use only short phrases
      const shortPhrases = this.phrases.filter(phrase => phrase.length <= 8);
      this.phrase = shortPhrases[floor(random(shortPhrases.length))];
    } else {
      // For larger bubbles, any phrase is fine
      this.phrase = this.phrases[floor(random(this.phrases.length))];
    }
    
    // Adjust bubble size based on text length for longer phrases
    // More aggressive sizing algorithm
    if (this.phrase.length > 10) {
      // Calculate a size multiplier based on phrase length
      const lengthFactor = map(this.phrase.length, 10, 30, 1, 1.8);
      
      // Apply the multiplier to increase bubble size
      this.size = this.size * lengthFactor;
      
      // Ensure minimum size for longer phrases
      if (this.phrase.length > 15) {
        this.size = max(this.size, 100);
      }
      
      // Update radius for collision detection
      this.radius = this.size / 2;
    }
  }
  
  update() {
    // Red bubbles fall down, blue bubbles go up
    if (this.type === 'red') {
      this.y += this.speed;
      // Add slight horizontal movement
      this.x += sin(frameCount * 0.05 + this.y * 0.1) * 0.5;
    } else {
      this.y -= this.speed;
      // Straight path for blue bubbles
    }
    
    // Update visual effects
    this.scale += this.scaleDirection * this.scaleSpeed;
    if (this.scale > 1.1 || this.scale < 0.9) {
      this.scaleDirection *= -1;
    }
  }
  
  draw() {
    push();
    translate(this.x, this.y);
    rotate(this.rotation);
    scale(this.scale);
    
    imageMode(CENTER);
    image(this.img, 0, 0, this.size, this.size);
    
    // Calculate appropriate text size based on phrase length and bubble size
    // More aggressive text sizing algorithm
    const baseTextSize = this.size / 6;
    const textSizeFactor = map(this.phrase.length, 5, 30, 1, 0.5, true); // More reduction for longer phrases
    const finalTextSize = min(baseTextSize * textSizeFactor, 20); // Cap maximum text size
    
    // Make text larger and bolder for better visibility
    textStyle(BOLD);
    textSize(finalTextSize);
    textAlign(CENTER, CENTER);
    
    // Calculate text width to ensure it fits
    const textW = textWidth(this.phrase);
    const maxWidth = this.size * 0.75; // Reduced maximum width for safer text fitting
    
    // If text is still too wide, reduce text size further
    if (textW > maxWidth) {
      // Scale down text if it's too wide
      const scaleFactor = maxWidth / textW;
      textSize(finalTextSize * scaleFactor);
    }
    
    // Draw stronger text shadow for better readability
    fill(0, 0, 0, 200);
    text(this.phrase, 2, 2); // Increased shadow offset
    text(this.phrase, 1, 1);
    
    // Draw main text
    if (this.type === 'red') {
      fill(255, 255, 255); // White text for red bubbles
    } else {
      fill(255, 255, 255); // White text for blue bubbles
    }
    
    // Draw the text with a slight stroke for better visibility
    strokeWeight(1);
    stroke(0, 0, 0, 150);
    text(this.phrase, 0, 0);
    noStroke();
    
    pop();
  }
  
  // Check collision with another object (player or bubble)
  checkCollision(other) {
    if (other instanceof Player) {
      // Collision with player (rectangle)
      const bounds = other.getBounds();
      
      // Simple circle-rectangle collision
      const closestX = constrain(this.x, bounds.left, bounds.right);
      const closestY = constrain(this.y, bounds.top, bounds.bottom);
      
      const distanceX = this.x - closestX;
      const distanceY = this.y - closestY;
      
      const distanceSquared = distanceX * distanceX + distanceY * distanceY;
      
      return distanceSquared < (this.radius * this.radius);
    } else {
      // Collision with another bubble (circle)
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const distance = sqrt(dx * dx + dy * dy);
      
      return distance < (this.radius + other.radius);
    }
  }
} 