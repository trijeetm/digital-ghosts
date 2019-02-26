// Keep track of our socket connection
var socket;
var flocks = new Map();
var nodes = new Map();

function preload () {
  socket = io.connect('http://localhost:8080');

  fontRM_B = loadFont('assets/roboto-mono/RobotoMono-Bold.ttf');

  // for a 60 second performance
  // setTimeout(function () {
  //   socket.disconnect();
  //
  //   flocks.forEach(function (flock) {
  //     setTimeout(function () {
  //       flock.destroy();
  //     }, random (100, 1000));
  //   })
  // }, 90000)
}

// Processing setup loop
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 100, 100, 100, 1);

  socket.on('newPacket',
    function(data) {
      console.warn(data);
      var packetData = JSON.parse(data);

      // if ((packetData.src != "udon.local")) return;

      var srcNode = retrieveNode(packetData.src);
      var dstNode = retrieveNode(packetData.dst);

      srcNode.launchBoid(dstNode.position);
      srcNode.flock.triggerBlip();

      srcNode.rekindle();
      dstNode.rekindle();

    }
  );
}

// Processing draw loop
function draw() {
  background(0);
  nodes.forEach(function (node) {
    node.render();
  })
}

// Returns node matching id, creates one if non-existent
function retrieveNode(id) {
  var node = nodes.get(id);

  if (!node) {
    // create new node (at random position on canvas)
    var n = new Node(id, 10.0, color(random(0, 100), random(20, 40), 100, 1));
    n.create();
    // add to nodes map
    nodes.set(id, n);
    node = n;

    var f = new Flock(node.id, node.position, node.col);
    node.flock = f;
  }

  return node;
}

// Node object
function Node(id, size, col, label) {
  this.id = id;
  this.size = 0;
  this.maxSize = size;
  this.state = false;
  this.col = col;
  this.position = createVector(random(40, windowWidth - 40), random(40, windowHeight - 40));
  this.flock = {};

  this.flockLimit = 1000;
  this.baseLife = 10000;
  this.life = this.baseLife;
}

Node.prototype.create = function () {
  var that = this;

  var anim = setInterval(function() {
    that.size = that.size + 0.5;

    if (that.size >= that.maxSize) {
      that.size = that.maxSize;
      clearInterval(anim);
    }
  }, 1);
}

Node.prototype.destroy = function() {
  var that = this;

  var anim = setInterval(function() {
    that.size = that.size - 0.5;

    if (that.size <= 0){
      that.size = 0.0;
      clearInterval(anim);
    }
  }, 1);
}

Node.prototype.decay = function () {
  if (this.life >= 0) this.life--;
  else this.destroy();
};

Node.prototype.rekindle = function () {
  if (this.life == -1) this.create();
  this.life = this.baseLife;
};

Node.prototype.render = function() {
  this.decay();

  // render label
  if (this.life != -1) {
    textAlign(CENTER);
    textFont(fontRM_B);
    fill(255);
    textSize(10);
    if (random(0, 100) < 5) {
      fill(255 - random(-0, 255));
      // textSize(10 + random(0, 4));
      text(this.id, this.position.x, this.position.y + 16);
    }
    else {
      text(this.id, this.position.x, this.position.y + 16);
    }
  }

  // render flocks
  this.flock.run();

  // render nodes
  fill(this.col);
  stroke(100, 0, 100, 0);
  // stroke(100, 0, 100, 0.5);
  ellipse(this.position.x, this.position.y, this.size, this.size);
};

Node.prototype.launchBoid = function (dest) {
  if (this.flock.boids.size < this.flockLimit) {
    var b = new Boid(this.flock, dest);
    this.flock.addBoid(b);
  }
};

// Flock object
function Flock(id, srcPos, col) {
  var self = this;

  this.id = id;

  this.source = srcPos;
  this.destination = srcPos

  while (p5.Vector.dist(this.source, this.destination) < windowHeight / 2)
    this.destination = createVector(random(0, windowWidth), random(0, windowHeight));

  // An array for all the boids
  // this.boids = []; // Initialize the array
  // A set for all the boids
  this.boids = new Set();
  this.state = 0;
  this.col = col;

// noise
  this.noise = new p5.Noise();

  var panLvl = 0;
  if (this.source.x < windowWidth / 2)
    panLvl = random(-1, -0.8);
  else
    panLvl = random(0.8, 1);
  this.noise.pan(panLvl);

  this.noiseFilter = new p5.BandPass();
  this.noiseFilter.res(50);
  var f = midiToFreq(24 + (random(0, 7) * 12));
  this.noiseFilter.freq(f);

  this.noise.disconnect();
  this.noise.connect(this.noiseFilter);

  // this.rev = new p5.Reverb();
  // this.rev.process(this.noiseFilter, 3, 2);

  this.noise.amp(0);
  this.noise.start();
  this.noise.amp(0.75, 0.1);

  setTimeout(function () {
    self.noise.amp(0.05, 5);
  }, 500);
}

Flock.prototype.triggerBlip = function() {
  var self = this;
  this.noise.amp(1, 0.1);

  setTimeout(function () {
    self.noise.amp(0.05, 1);
  }, 500);
};

Flock.prototype.destroy = function() {
  var self = this;

  this.noise.amp(0, 1);

  setTimeout(function () {
    self.srcNode.destroy();
    setTimeout(function () {
      self.destNode.destroy();
      self.state = 0;
    }, 500);
  }, 1000);
};

Flock.prototype.run = function() {
  var that = this;

  this.boids.forEach(function (b) {
      b.run(that.boids);
  });

  this.render();
}

Flock.prototype.render = function () {
  return;
}

Flock.prototype.addBoid = function(b) {
  this.boids.add(b);
}

// The Nature of Code
// Daniel Shiffman
// http://natureofcode.com

// Boid class
// Methods for Separation, Cohesion, Alignment added

function Boid(flock, dest) {
  this.parentFlock = flock;
  this.acceleration = createVector(0, 0);
  this.velocity = createVector(random(-3, 3), random(-3, 3));
  this.destination = dest;
  this.position = createVector(flock.source.x, flock.source.y);
  this.r = random(1.0, 5.0);
  // this.r = 1.0;
  this.maxspeed = 20;    // Maximum speed
  this.maxforce = 0.2; // Maximum steering force
  this.life = 1;

  var c = flock.col;
  this.col = color(hue(c), saturation(c) * 2, 100, 0.75);
  this.opacity = 0.75;

  // this.blip = new Blip();
}

Boid.prototype.run = function(boids) {
  if (this.life === -1) {
    this.parentFlock.boids.delete(this);
    return;
  };

  this.flock(boids);
  this.update();
  // this.borders();
  this.render();
}

Boid.prototype.applyForce = function(force) {
  // We could add mass here if we want A = F / M
  this.acceleration.add(force.div(this.r));
}

// We accumulate a new acceleration each time based on three rules
Boid.prototype.flock = function(boids) {
  var dist = p5.Vector.dist(this.destination, this.position);

  if (dist > 600) {
    var sep = this.separate(boids);   // Separation
    sep.mult(1.5);
    this.applyForce(sep);

    var ali = this.align(boids);      // Alignment
    ali.mult(0.75);
    this.applyForce(ali);

    var coh = this.cohesion(boids);   // Cohesion
    coh.mult(3.0);
    this.applyForce(coh);

    var dir = this.home(3.0);
    dir.mult(1.0);
    this.applyForce(dir);

    this.life = 1;
  }
  else {
    if (dist > 300) {
      var sep = this.separate(boids);   // Separation
      sep.mult(1.25);
      this.applyForce(sep);

      var ali = this.align(boids);      // Alignment
      ali.mult(1.0);
      this.applyForce(ali);

      var coh = this.cohesion(boids);   // Cohesion
      coh.mult(4.0);
      this.applyForce(coh);

      var dir = this.home(4.0);
      dir.mult(1.0);
      this.applyForce(dir);

      this.life = 1;
    } else if (dist > 25) {
      var dir = this.home(10.0);
      dir.mult(3.0);
      this.applyForce(dir);
    }
    else {
      this.life = -1;
    }

    if (dist < 50) {
      this.opacity = dist * (0.75 / 50);
    }
  }
}

// Method to update location
Boid.prototype.update = function() {
  // Update velocity
  this.velocity.add(this.acceleration);
  // Limit speed
  this.velocity.limit(this.maxspeed);
  this.position.add(this.velocity);
  // Reset accelertion to 0 each cycle
  this.acceleration.mult(0);
}

Boid.prototype.home = function(steerFactor) {
  var direction = p5.Vector.sub(this.destination, this.position);
  direction.normalize();
  direction.mult(this.maxspeed);
  var steer = p5.Vector.sub(direction, this.velocity);
  steer.limit(this.maxforce);  // Limit to maximum steering force
  steer.mult(steerFactor);
  return steer;
};

// A method that calculates and applies a steering force towards a target
// STEER = DESIRED MINUS VELOCITY
Boid.prototype.seek = function(target) {
  var desired = p5.Vector.sub(target,this.position);  // A vector pointing from the location to the target
  // Normalize desired and scale to maximum speed
  desired.normalize();
  desired.mult(this.maxspeed);
  // Steering = Desired minus Velocity
  var steer = p5.Vector.sub(desired,this.velocity);
  steer.limit(this.maxforce);  // Limit to maximum steering force
  return steer;
}

Boid.prototype.render = function() {
  // Draw a triangle rotated in the direction of velocity
  var theta = this.velocity.heading() + radians(90);
  fill(color(hue(this.col), saturation(this.col), brightness(this.col), this.opacity));
  // fill(this.col);
  stroke(100, 0, 100, 0);
  // stroke(100, 0, 100, 0.75);
  push();
  translate(this.position.x,this.position.y);
  rotate(theta);
  beginShape();
  vertex(0, -this.r*2);
  vertex(-this.r, this.r*2);
  vertex(this.r, this.r*2);
  endShape(CLOSE);
  pop();
}

// Wraparound
Boid.prototype.borders = function() {
  if (this.position.x < -this.r)  this.position.x = width +this.r;
  if (this.position.y < -this.r)  this.position.y = height+this.r;
  if (this.position.x > width +this.r) this.position.x = -this.r;
  if (this.position.y > height+this.r) this.position.y = -this.r;
}

// Separation
// Method checks for nearby boids and steers away
Boid.prototype.separate = function(boids) {
  var desiredseparation = 25.0;
  var steer = createVector(0,0);
  var count = 0;
  // For every boid in the system, check if it's too close
  for (var i = 0; i < boids.length; i++) {
    var d = p5.Vector.dist(this.position,boids[i].position);
    // If the distance is greater than 0 and less than an arbitrary amount (0 when you are yourself)
    if ((d > 0) && (d < desiredseparation)) {
      // Calculate vector pointing away from neighbor
      var diff = p5.Vector.sub(this.position,boids[i].position);
      diff.normalize();
      diff.div(d);        // Weight by distance
      steer.add(diff);
      count++;            // Keep track of how many
    }
  }
  // Average -- divide by how many
  if (count > 0) {
    steer.div(count);
  }

  // As long as the vector is greater than 0
  if (steer.mag() > 0) {
    // Implement Reynolds: Steering = Desired - Velocity
    steer.normalize();
    steer.mult(this.maxspeed);
    steer.sub(this.velocity);
    steer.limit(this.maxforce);
  }
  return steer;
}

// Alignment
// For every nearby boid in the system, calculate the average velocity
Boid.prototype.align = function(boids) {
  var neighbordist = 50;
  var sum = createVector(0,0);
  var count = 0;
  for (var i = 0; i < boids.length; i++) {
    var d = p5.Vector.dist(this.position,boids[i].position);
    if ((d > 0) && (d < neighbordist)) {
      sum.add(boids[i].velocity);
      count++;
    }
  }
  if (count > 0) {
    sum.div(count);
    sum.normalize();
    sum.mult(this.maxspeed);
    var steer = p5.Vector.sub(sum,this.velocity);
    steer.limit(this.maxforce);
    return steer;
  } else {
    return createVector(0,0);
  }
}

// Cohesion
// For the average location (i.e. center) of all nearby boids, calculate steering vector towards that location
Boid.prototype.cohesion = function(boids) {
  var neighbordist = 50;
  var sum = createVector(0, 0);   // Start with empty vector to accumulate all locations
  var count = 0;
  for (var i = 0; i < boids.length; i++) {
    var d = p5.Vector.dist(this.position,boids[i].position);
    if ((d > 0) && (d < neighbordist)) {
      sum.add(boids[i].position); // Add location
      count++;
    }
  }
  if (count > 0) {
    sum.div(count);
    return this.seek(sum);  // Steer towards the location
  } else {
    return createVector(0,0);
  }
}
