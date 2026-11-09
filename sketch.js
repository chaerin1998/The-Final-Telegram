const CONFIG = {
  filePath: "recognized_text.txt",
  // filePath: "sentence.txt",
  maxLength: 50,
  maxSentences: 30,
  minSentences: 15,
  fontSizeRange: { min: 15, max: 30 },
  speedRange: { min: 0.5, max: 3 },
  amplitudeRange: { min: 10, max: 35 },
  lifespanRange: { min: 1500, max: 3500 },
  backgroundAlpha: 100,
  checkFileInterval: 3000,
  addSentenceInterval: 4000,
  cooldownFrames: 30,
  
  wave: {
    layers: 5,                  
    baseHue: 200,              
    amplitude: [15, 30],        
    frequency: [0.005, 0.015],  
    speed: [0.02, 0.08],       
    alpha: [30, 80]             
  },
  particles: {
    count: 300,                 
    size: [3, 10],              
    speed: [0.1, 0.5],          
    hueRange: 30                
  }
};

let sentences = [];
let sentencesFromFile = [];
let sentenceSize;
let reloadCooldown = 0;
let particles = [];
let newSentencesQueue = [];
let lastHighlightFrame = 0;
let highlightInterval = 600; 
let recentSentences = [];
const recentMax = 50;
let fonts = [];
let logo;


function preload() {

    logo = loadImage('logo.png');
    loadStrings(CONFIG.filePath, fileLoaded);
    futura = loadFont('futura.ttf');
    fonts[0] = loadFont('hw.ttf');
    fonts[1] = loadFont('hw1.ttf');
    fonts[2] = loadFont('hw2.ttf');
    fonts[3] = loadFont('hw3.ttf');
    fonts[4] = loadFont('hw4.ttf');
}

function fileLoaded(lines) {
  if (lines?.length > 0) {
    sentencesFromFile = lines.filter(line => line.trim() !== "");
    console.log("Loaded", sentencesFromFile.length, "sentences");
  } 
}


function setup() {
  createCanvas(window.innerWidth, window.innerHeight);
  smooth();
  colorMode(HSB, 360, 100, 100, 100);
  textAlign(LEFT, CENTER);
  sentenceSize = random(20, 30);
  
  for (let i = 0; i < 10; i++) addRandomSentence();
  
  for (let i = 0; i < CONFIG.particles.count; i++) {
    particles.push(new Particle());
  }
  
  setInterval(checkFileUpdate, CONFIG.checkFileInterval);
  setInterval(addRandomSentence, CONFIG.addSentenceInterval);
}

function draw() {

  drawBackground();
  instruction();
  textSize(30);

  if (reloadCooldown > 0) reloadCooldown--;

  for (let i = sentences.length - 1; i >= 0; i--) {
    sentences[i].update();
    sentences[i].display();
    if (sentences[i].isDead()) sentences.splice(i, 1);
  }

  if (sentences.length < CONFIG.minSentences && reloadCooldown === 0) {
    addRandomSentence();
    reloadCooldown = CONFIG.cooldownFrames;
  }
  if (frameCount - lastHighlightFrame > highlightInterval) {
    highlightRandomSentence();
    lastHighlightFrame = frameCount;
  }
}

//bg
function drawBackground() {
  noFill();
  for (let y = 0; y < height; y++) {
    let inter = map(y, 0, height, 0, 1);
    let hue = lerp(CONFIG.wave.baseHue - 10, CONFIG.wave.baseHue + 5, inter);
    let sat = lerp(80, 60, inter);
    let bri = lerp(10, 40, inter);
    stroke(hue, sat, bri);
    line(0, y, width, y);
  }
    
  drawParticles();
}

function drawParticles() {
  particles.forEach(p => {
    p.update();
    p.display();
  });
}

function highlightRandomSentence() {
  if (sentences.length === 0) return;
  let visibleSentences = sentences.filter(s => s.x < width && s.x > -200);

  if (visibleSentences.length === 0) return; 

  for (let s of sentences) {
    s.isHighlighted = false;
  }

  let randomIndex = floor(random(visibleSentences.length));
  let selected = visibleSentences[randomIndex];
  selected.isHighlighted = true;
  selected.highlightStart = frameCount;

  console.log("highlight:", selected.lines.join(" "));
}


class Particle {
  constructor() {
    this.reset(true); 
    this.size = random(...CONFIG.particles.size);
    this.hue = CONFIG.wave.baseHue + random(-CONFIG.particles.hueRange, CONFIG.particles.hueRange);
    this.baseSpeed = random(...CONFIG.particles.speed);
  }
  
  reset(initial = false) {
    this.x = random(width);
    
    if (initial) {
      this.y = random(600); 
    } else {
      this.y = height ;
    }
    
    this.speed = this.baseSpeed * random(0.8, 1.2);
    this.angle = random(-PI/8, PI/8); 
    this.life = random(300, 1000);
    this.maxLife = this.life;
    
    this.verticalSpeed = random(-1, -0.2);
    if (this.y > height/2) {
      this.verticalSpeed *= 0.3; 
    }
  }
  
  update() {
    let waveEffect = sin(this.x * 0.005 + frameCount * 0.01) * 5;
    this.x += cos(this.angle) * 0.2;
    this.y += this.verticalSpeed + waveEffect;
    
    this.life--;
    
    const shouldReset = 
      this.life <= 0 || 
      this.y < -this.size * 5 || 
      this.x < -this.size * 2 || 
      this.x > width + this.size * 2;
    
    if (shouldReset) {
      this.reset();
      if (random() < 0.1) this.y = -random(50); 
    }
  }
  
  display() {
    let alpha = map(this.life, 0, this.maxLife, 0, 70);
    noStroke();
    fill(this.hue, 60, 90, alpha);
    push();
    translate(this.x, this.y);
    rotate(frameCount * 0.01);
    ellipse(0, 0, this.size, this.size);
    pop();
  }
}

//text
function addRandomSentence() {
  if (sentences.length >= CONFIG.maxSentences) return;

  let selectedSentence;

  if (newSentencesQueue.length > 0) {
    selectedSentence = newSentencesQueue.shift();
  } else {
    let candidates = sentencesFromFile.filter(s => !recentSentences.includes(s));

    if (candidates.length === 0) {
      candidates = [...sentencesFromFile];
      recentSentences = [];
    }

    selectedSentence = random(candidates);
  }

  recentSentences.push(selectedSentence);
  if (recentSentences.length > recentMax) {
    recentSentences.shift(); 
  }

  let splitLines = splitSentence(selectedSentence, CONFIG.maxLength);
  sentences.push(new Sentence(splitLines));
}


function instruction() {
  let originalSize = sentenceSize;
  sentenceSize = 90;
  textSize(sentenceSize);
  let imgW = logo.width;
  let imgH = logo.height;
  let scaleFactor = 0.7;  
  imageMode(CENTER);
  image(logo, width / 2, height / 5, imgW * scaleFactor, imgH * scaleFactor);

}

function checkFileUpdate() {
  fetch(CONFIG.filePath + '?t=' + Date.now())
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.text();
    })
    .then(text => {
      const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line !== "");
      
        const newSentences = lines.filter(line => !sentencesFromFile.includes(line));
        if (newSentences.length > 0) {
          console.log("Found", newSentences.length, "new sentences");
        
          newSentencesQueue.push(...newSentences);
          sentencesFromFile = [...sentencesFromFile, ...newSentences];
        
          if (sentencesFromFile.length > CONFIG.maxSentences * 2) {
            sentencesFromFile = sentencesFromFile.slice(-CONFIG.maxSentences * 2);
          }
        }
    })
    .catch(error => {
      console.error("Error loading file:", error);
      if (sentencesFromFile.length === 0) useDefaultSentences();
    });
}

function splitSentence(sentence, maxChars) {
  let lines = [];
  let words = sentence.split(" ");
  let currentLine = "";

  for (let word of words) {
    if (currentLine.length + word.length + 1 <= maxChars) {
      currentLine += word + " ";
    } else {
      lines.push(currentLine.trim());
      currentLine = word + " ";
    }
  }

  if (currentLine.trim() !== "") {
    lines.push(currentLine.trim());
  }

  return lines;
}
function glow(glowColor, blurriness) {
  drawingContext.shadowColor = glowColor;
  drawingContext.shadowBlur = blurriness;
}

class Sentence {
  constructor(lines) {
    this.lines = lines;
    this.reset();
    this.fontSize = random(CONFIG.fontSizeRange.min, CONFIG.fontSizeRange.max);
    this.col = color(120, 30, 100);
    this.isHighlighted = false;
    this.highlightStart = 0;
    this.highlightDuration = 400; 
    this.glowIntensity = 0; 
    this.font = random(fonts);
  }

  reset() {
    this.x = random(width*0.8, width*1.3);
    this.yBase = random(height / 3, height - 80);
    this.angle = random(TWO_PI);
    this.speed = random(CONFIG.speedRange.min, CONFIG.speedRange.max);
    this.amplitude = random(CONFIG.amplitudeRange.min, CONFIG.amplitudeRange.max);
    this.lifespan = floor(random(CONFIG.lifespanRange.min, CONFIG.lifespanRange.max));
    this.createTime = frameCount;
    this.maxWidth = this.lines.reduce((m, l) => max(m, textWidth(l)), 0);
  }

  update() {
    this.angle += 0.03;
    this.x -= this.speed;

    let maxWidth = 0;
    textSize(this.fontSize);
    for (let line of this.lines) {
      maxWidth = max(maxWidth, textWidth(line));
    }

    if (this.x < -this.maxWidth * 1.5) {
      this.lifespan = 0; 
    }

    if (this.isHighlighted && frameCount - this.highlightStart > this.highlightDuration) {
      this.isHighlighted = false;
    }

    if (this.isHighlighted) {
      this.glowIntensity = min(this.glowIntensity + 0.1, 1);
    } else {
      this.glowIntensity = max(this.glowIntensity - 0.05, 0);
    }
  }

  display() {
    push();
    translate(this.x, this.yBase);
    textSize(this.fontSize);
    textAlign(LEFT, CENTER);
    textFont(this.font);
    // textFont(gothic);

    let progress = (frameCount - this.createTime) / this.lifespan;
    let alpha = 255 * (1 - progress * 2);

    if (this.glowIntensity > 0) {
      this.renderGlow(alpha);
    }

    for (let l = 0; l < this.lines.length; l++) {
      for (let j = 0; j < this.lines[l].length; j++) {
        let charOffset = map(j, 0, this.lines[l].length - 1, -PI, PI);
        let yOffset = sin(this.angle + charOffset) * this.amplitude;
        let scaleFactor = 1.0 + sin(this.angle + j * 0.3) * 0.1;
        if (this.isHighlighted ){
          stroke(255,0,100, alpha);
          strokeWeight(1);
        }
        fill(red(this.col), green(this.col), blue(this.col), alpha);
        push();
        translate(j * 24, yOffset + l * 30);
        scale(scaleFactor);
        rotate(sin(this.angle + j * 0.2) * 0.1);
        text(this.lines[l].charAt(j), 0, 0);
        pop();
      }
    }
    pop();
  }

  renderGlow(baseAlpha) {
    const glowSettings = [
      { size: 40, alpha: 50 }, 
      { size: 20, alpha: 70 }, 
      { size: 13,  alpha: 90 }  
    ];

    for (let layer of glowSettings) {
      drawingContext.shadowColor = `rgba(255, 255, 255, ${(layer.alpha * this.glowIntensity) / 100})`;
      drawingContext.shadowBlur = layer.size * this.glowIntensity;

      for (let l = 0; l < this.lines.length; l++) {
        for (let j = 0; j < this.lines[l].length; j++) {
          let charOffset = map(j, 0, this.lines[l].length - 1, -PI, PI);
          let yOffset = sin(this.angle + charOffset) * this.amplitude;

          push();
          translate(j * 24, yOffset + l * 30);
          fill(255,0,100, baseAlpha * 0.7 * this.glowIntensity);
          text(this.lines[l].charAt(j), 0, 0);
          pop();
        }
      }
    }
    drawingContext.shadowColor = 'transparent';
    drawingContext.shadowBlur = 0;
  }

  isDead() {
    return frameCount - this.createTime > this.lifespan;
  }
}