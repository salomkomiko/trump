class Player {
  constructor(x, y, img) {
    this.x = x;
    this.y = y;
    this.img = img;
    this.width = 80;
    this.height = 120;
    this.speed = 8;
    this.isMovingLeft = false;
    this.isMovingRight = false;
  }
  
  update() {
    // Handle movement
    if (this.isMovingLeft) {
      this.x -= this.speed;
    }
    if (this.isMovingRight) {
      this.x += this.speed;
    }
    
    // Keep player within bounds
    if (this.x < this.width / 2) {
      this.x = this.width / 2;
    }
    if (this.x > width - this.width / 2) {
      this.x = width - this.width / 2;
    }
  }
  
  draw() {
    imageMode(CENTER);
    image(this.img, this.x, this.y, this.width, this.height);
    imageMode(CORNER);
  }
  
  // Collision detection helper
  getBounds() {
    return {
      left: this.x - this.width / 2,
      right: this.x + this.width / 2,
      top: this.y - this.height / 2,
      bottom: this.y + this.height / 2
    };
  }
} 