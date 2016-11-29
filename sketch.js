// Keep track of our socket connection
var socket;

function preload () {
  // Start a socket connection to the server
  // Some day we would run this server somewhere else
  socket = io.connect('http://localhost:8080');
  // We make a named event called 'mouse' and write an
  // anonymous callback function
  socket.on('mouseSend',
    // When we receive data
    function(data) {
      console.log("Got: " + data.x + " " + data.y);
      // Draw a blue circle
      fill(0,0,255);
      noStroke();
      ellipse(data.x,data.y,80,80);
    }
  );
  socket.on('dataPush',
    // When we receive data
    function(data) {
      console.log(data);
      ellipse(getRandomInt(0, 500),getRandomInt(0, 500),10,10);
    }
  );
}

var flocks = [];


function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(RGB, 255, 255, 255, 1);

  setInterval(function () {
    var flock = new Flock();
    flocks.push(flock);

    setTimeout(function () {
      setInterval(function () {
        for (var i = 0; i < random(1, 10); i++) {
          var b = new Boid(flock);
          flock.addBoid(b);
        }
      }, random(100, 1000));
    }, 500);

    setTimeout(function () {
      flock.destroy();
    }, 10000);
  }, 1000);
}

function draw() {
  background(51);
  flocks.forEach(function (flock) {
    flock.run();
  })
}

// Add a new boid into the System
// function mouseDragged() {
//   var boid = new Boid(mouseX, mouseY, 1, 1);
//   flock.addBoid(boid);
// }

// Node object
function Node(pos, size) {
  this.size = 0;
  this.maxSize = size;
  this.state = false;
  this.position = pos;
}

Node.prototype.create = function () {
  var that = this;

  var anim = setInterval(function() {
    that.size = that.size + 1;

    if (that.size === that.maxSize)
      clearInterval(anim);
  }, 1);
}

Node.prototype.destroy = function() {
  var that = this;

  var anim = setInterval(function() {
    that.size = that.size - 1;

    if (that.size === 0)
      clearInterval(anim);
  }, 1);
}

Node.prototype.render = function() {
  ellipse(this.position.x, this.position.y, this.size, this.size);
};

// Flock object
// Does very little, simply manages the array of all the boids

function Flock() {
  var that = this;

  this.source = createVector(random(120, windowWidth - 120), random(120, windowHeight - 120));
  this.destination = createVector(random(120, windowWidth - 120), random(120, windowHeight - 120));

  while (p5.Vector.dist(this.source, this.destination) < 500)
    this.destination = createVector(random(0, windowWidth), random(0, windowHeight));

  // An array for all the boids
  this.boids = []; // Initialize the array
  this.nodeSize = 30;
  this.state = 0;

  this.srcNode = new Node(this.source, this.nodeSize);
  this.destNode = new Node(this.destination, this.nodeSize);

  that.srcNode.create();
  setTimeout(function () {
    that.destNode.create();
    that.state = 1;
  }, 250);
}

Flock.prototype.destroy = function() {
  var that = this;

  setTimeout(function () {
    that.srcNode.destroy();
    setTimeout(function () {
      that.destNode.destroy();
      that.state = 0;
    }, 500); 
  }, 1000);
};

Flock.prototype.run = function() {
  if (this.state === 0) return;
  for (var i = 0; i < this.boids.length; i++) {
    this.boids[i].run(this.boids);  // Passing the entire list of boids to each boid individually
  }
  this.render();
}

Flock.prototype.render = function () {
  this.srcNode.render();
  this.destNode.render();
}

Flock.prototype.addBoid = function(b) {
  this.boids.push(b);
}

// The Nature of Code
// Daniel Shiffman
// http://natureofcode.com

// Boid class
// Methods for Separation, Cohesion, Alignment added

function Boid(flock) {
  this.parentFlock = flock;
  this.acceleration = createVector(0, 0);
  this.velocity = createVector(random(-3, 3), random(-3, 3));
  this.destination = createVector(flock.destination.x, flock.destination.y);
  this.position = createVector(flock.source.x, flock.source.y);
  this.r = 3.0;
  this.maxspeed = 10;    // Maximum speed
  this.maxforce = 0.05; // Maximum steering force
  this.life = 1;
}

Boid.prototype.run = function(boids) {
  if (this.life === -1) return;

  this.flock(boids);
  this.update();
  // this.borders();
  this.render();
}

Boid.prototype.applyForce = function(force) {
  // We could add mass here if we want A = F / M
  this.acceleration.add(force);
}

// We accumulate a new acceleration each time based on three rules
Boid.prototype.flock = function(boids) {
  var dist = p5.Vector.dist(this.destination, this.position);

  if (dist > 10 * this.parentFlock.nodeSize) {
    var sep = this.separate(boids);   // Separation
    sep.mult(1.5);
    this.applyForce(sep); 

    var ali = this.align(boids);      // Alignment
    ali.mult(0.75);
    this.applyForce(ali);
    
    var coh = this.cohesion(boids);   // Cohesion
    coh.mult(2.0);
    this.applyForce(coh);

    var dir = this.home(1.0);
    dir.mult(1.0);
    this.applyForce(dir);

    this.life = 1;
  }
  else {
    if (dist > 5 * this.parentFlock.nodeSize) {
      var sep = this.separate(boids);   // Separation
      sep.mult(1.25);
      this.applyForce(sep); 

      var ali = this.align(boids);      // Alignment
      ali.mult(1.0);
      this.applyForce(ali);
      
      var coh = this.cohesion(boids);   // Cohesion
      coh.mult(3.0);
      this.applyForce(coh);

      var dir = this.home(2.5);
      dir.mult(1.0);
      this.applyForce(dir);

      this.life = 1;
    } else if (dist > 0.25 * this.parentFlock.nodeSize) {
      var dir = this.home(5.0);
      dir.mult(1.0);
      this.applyForce(dir); 

      this.life = 0;
    }
    else {
      this.life = -1;
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
  fill(127);
  stroke(200);
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


