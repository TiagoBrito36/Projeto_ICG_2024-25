import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x3a1c1c);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('gameScene').appendChild(renderer.domElement);

// Menu scene setup
const menuScene = new THREE.Scene();
menuScene.background = new THREE.Color(0x3a1c1c);
const menuCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
menuCamera.position.set(0, 75, 150);
menuCamera.lookAt(0, 0, 0);
const menuRenderer = new THREE.WebGLRenderer({ 
    alpha: true,
    antialias: true 
});
menuRenderer.setClearColor(0x3a1c1c, 1);
menuRenderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('backgroundScene').appendChild(menuRenderer.domElement);

// Add this after your scene setup but before event listeners
let gameStarted = false;

// Initialize menu scene first
createMenuScene();

// Start animation loop
animate();

// Make sure gameScene is initially hidden
document.getElementById('gameScene').style.display = 'none';

// Then add your event listeners
document.getElementById('playButton').addEventListener('click', () => {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('characterMenu').style.display = 'block';
});

document.getElementById('controlsButton').addEventListener('click', () => {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('controlsMenu').style.display = 'block';
});

document.getElementById('backButton').addEventListener('click', () => {
    document.getElementById('controlsMenu').style.display = 'none';
    document.getElementById('menu').style.display = 'block';
});

window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    // Update game camera
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Update menu camera
    menuCamera.aspect = window.innerWidth / window.innerHeight;
    menuCamera.updateProjectionMatrix();
    menuRenderer.setSize(window.innerWidth, window.innerHeight);
}

// Replace the existing fullscreen handler
document.addEventListener('keydown', async (event) => {
    if (event.code === 'F11') {
        event.preventDefault();
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.error('Fullscreen error:', err);
        }
        // Wait for fullscreen change to complete
        setTimeout(onWindowResize, 100);
    }
});

// Add fullscreen change listener
document.addEventListener('fullscreenchange', () => {
    onWindowResize();
});

// Global variables
let playerColor = 0x00ff00;
let player;
let pitchObject;
let yawObject;
let isLocked = false;
let isCrouching = false;
let isJumping = false;
let jumpVelocity = 0;
const JUMP_FORCE = 0.15;
const GRAVITY = 0.006;
const NORMAL_HEIGHT = 2;
const CROUCH_HEIGHT = 1;
let mountains = [];

// Add color selection functionality
document.querySelectorAll('.color-btn').forEach(button => {
    button.addEventListener('click', () => {
        playerColor = parseInt(button.dataset.color);
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.style.border = '3px solid transparent';
        });
        button.style.border = '3px solid white';
    });
});

// Create floor and mountains for menu background
function createMenuScene() {
    // Add lights first
    const ambientLight = new THREE.AmbientLight(0x404040);
    menuScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    menuScene.add(directionalLight);

    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(187.5, 187.5);
    const floorMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x4a2f2f, 
        side: THREE.DoubleSide 
    });
    const menuFloor = new THREE.Mesh(floorGeometry, floorMaterial);
    menuFloor.rotation.x = -Math.PI / 2;
    menuScene.add(menuFloor);

    // Create mountains
    createMountainsForMenu();
}

function createMountainsForMenu() {
    const spacing = 12;
    const boundary = 87.5;
    const offsetDistance = 8;

    const mountainPositions = [];

    // Generate mountain positions
    for (let x = -boundary; x <= boundary; x += spacing) {
        mountainPositions.push([x, -boundary], [x, boundary]);
        mountainPositions.push([x, -boundary + offsetDistance], [x, boundary - offsetDistance]);
    }

    for (let z = -boundary; z <= boundary; z += spacing) {
        mountainPositions.push([-boundary, z], [boundary, z]);
        mountainPositions.push([-boundary + offsetDistance, z], [boundary - offsetDistance, z]);
    }

    // Create mountains
    mountainPositions.forEach(([x, z]) => {
        const height = 20 + (Math.random() - 0.5) * 15;
        const width = 8 + (Math.random() - 0.5) * 6;
        
        const mountainGeometry = new THREE.ConeGeometry(width, height, 4);
        const mountainMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x4d3319,
            flatShading: true 
        });
        
        const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
        mountain.position.set(x, height/2, z);
        mountain.rotation.y = Math.random() * Math.PI / 2;
        
        menuScene.add(mountain);
    });
}

function startGame() {
    // Create floor for game scene
    const floorGeometry = new THREE.PlaneGeometry(187.5, 187.5);
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x4a2f2f, side: THREE.DoubleSide });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Create player with normal height
    const playerGeometry = new THREE.BoxGeometry(1, NORMAL_HEIGHT, 1);
    const playerMaterial = new THREE.MeshBasicMaterial({ color: playerColor });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.y = NORMAL_HEIGHT/2;
    scene.add(player);

    // Clear mountains array
    mountains = [];

    // Create mountains for game scene
    const spacing = 12;
    const boundary = 87.5;
    const offsetDistance = 8;

    const mountainPositions = [];

    for (let x = -boundary; x <= boundary; x += spacing) {
        mountainPositions.push([x, -boundary]);
        mountainPositions.push([x, boundary]);
        mountainPositions.push([x, -boundary + offsetDistance]);
        mountainPositions.push([x, boundary - offsetDistance]);
    }

    for (let z = -boundary; z <= boundary; z += spacing) {
        mountainPositions.push([-boundary, z]);
        mountainPositions.push([boundary, z]);
        mountainPositions.push([-boundary + offsetDistance, z]);
        mountainPositions.push([boundary - offsetDistance, z]);
    }

    mountainPositions.forEach(([x, z]) => {
        const baseHeight = 20 + (Math.random() - 0.5) * 15;
        const baseWidth = 8 + (Math.random() - 0.5) * 6;
        
        const mountainGeometry = new THREE.ConeGeometry(baseWidth, baseHeight, 4);
        const mountainMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x4d3319,
            flatShading: true 
        });
        
        const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
        mountain.position.set(x, baseHeight / 2, z);
        mountain.rotation.y = Math.random() * Math.PI / 2;
        
        mountains.push(mountain);
        scene.add(mountain);
    });

    // Set up camera controls
    yawObject = new THREE.Object3D();
    pitchObject = new THREE.Object3D();
    yawObject.add(pitchObject);
    pitchObject.add(camera);
    player.add(yawObject);
    camera.position.y = 0.8;

    // Add lights to game scene
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Hide menus and show game
    document.getElementById('characterMenu').style.display = 'none';
    document.getElementById('backgroundScene').style.display = 'none';
    document.getElementById('gameScene').style.display = 'block';
    
    gameStarted = true;
}

// Add pointer lock setup
document.addEventListener('click', () => {
    if (gameStarted && !isLocked) {
        document.body.requestPointerLock();
    }
});

document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === document.body;
});

// Add mouse movement functionality
document.addEventListener('mousemove', (event) => {
    if (!gameStarted || !isLocked) return;
    
    const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
    
    const sensitivity = 0.002;
    yawObject.rotation.y -= movementX * sensitivity;
    pitchObject.rotation.x -= movementY * sensitivity;
    
    // Limit the pitch rotation to prevent over-rotation
    pitchObject.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitchObject.rotation.x));
});

// Update key controls to include shift and space
const keys = { w: false, a: false, s: false, d: false, shift: false, space: false };

// Update keydown/keyup listeners
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key in keys) keys[key] = true;
    if (e.code === 'ShiftLeft') keys.shift = true;
    if (e.code === 'Space') keys.space = true;
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key in keys) keys[key] = false;
    if (e.code === 'ShiftLeft') {
        keys.shift = false;
        if (isCrouching) {
            // Stand up
            player.geometry = new THREE.BoxGeometry(1, NORMAL_HEIGHT, 1);
            player.position.y = NORMAL_HEIGHT/2;
            isCrouching = false;
        }
    }
    if (e.code === 'Space') keys.space = false;
});

function updatePlayer() {
    if (!isLocked) return;

    // Store old position for collision detection
    const oldPosition = {
        x: player.position.x,
        z: player.position.z
    };

    // Base movement speed
    const normalSpeed = 0.2;
    const crouchSpeed = normalSpeed * 0.33;
    let currentSpeed = isCrouching ? crouchSpeed : normalSpeed;

    // Handle crouching
    if (keys.shift && !isCrouching) {
        player.geometry = new THREE.BoxGeometry(1, CROUCH_HEIGHT, 1);
        player.position.y = CROUCH_HEIGHT/2;
        isCrouching = true;
    }

    // Handle jumping
    if (keys.space && !isJumping) {
        jumpVelocity = JUMP_FORCE;
        isJumping = true;
    }

    // Apply gravity and jump velocity
    if (isJumping) {
        player.position.y += jumpVelocity;
        jumpVelocity -= GRAVITY;

        if (player.position.y <= (isCrouching ? CROUCH_HEIGHT/2 : NORMAL_HEIGHT/2)) {
            player.position.y = isCrouching ? CROUCH_HEIGHT/2 : NORMAL_HEIGHT/2;
            isJumping = false;
            jumpVelocity = 0;
        }
    }

    // Apply movement
    const direction = new THREE.Vector3();
    direction.z = Number(keys.w) - Number(keys.s);
    direction.x = Number(keys.a) - Number(keys.d);
    direction.normalize();

    if (keys.w || keys.s) {
        player.position.x -= direction.z * Math.sin(yawObject.rotation.y) * currentSpeed;
        player.position.z -= direction.z * Math.cos(yawObject.rotation.y) * currentSpeed;
    }
    if (keys.a || keys.d) {
        player.position.x -= direction.x * Math.cos(yawObject.rotation.y) * currentSpeed;
        player.position.z += direction.x * Math.sin(yawObject.rotation.y) * currentSpeed;
    }

    // Mountain collision detection with sliding
    const playerRadius = 0.5;
    let collision = false;

    for (const mountain of mountains) {
        const mountainPos = mountain.position;
        const mountainRadius = mountain.geometry.parameters.radius;
        
        // Calculate distance between player and mountain center
        const dx = player.position.x - mountainPos.x;
        const dz = player.position.z - mountainPos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // If colliding with mountain
        if (distance < (mountainRadius + playerRadius)) {
            collision = true;
            
            // Calculate normalized direction from mountain to player
            const nx = dx / distance;
            const nz = dz / distance;
            
            // Push player out just enough to not overlap
            const penetrationDepth = mountainRadius + playerRadius - distance;
            player.position.x = mountainPos.x + nx * (mountainRadius + playerRadius);
            player.position.z = mountainPos.z + nz * (mountainRadius + playerRadius);
            
            // Calculate movement direction
            const moveX = player.position.x - oldPosition.x;
            const moveZ = player.position.z - oldPosition.z;
            
            // Project movement onto collision surface (sliding)
            const dot = moveX * nx + moveZ * nz;
            const slideX = moveX - nx * dot;
            const slideZ = moveZ - nz * dot;
            
            // Apply sliding movement
            player.position.x = oldPosition.x + slideX;
            player.position.z = oldPosition.z + slideZ;
            break;
        }
    }
}

// Replace the existing animate function
function animate() {
    requestAnimationFrame(animate);
    
    if (!gameStarted) {
        // Menu scene animation
        const time = Date.now() * 0.0002; // Slower rotation
        const radius = 150;
        
        // Update camera position for rotation
        menuCamera.position.x = Math.cos(time) * radius;
        menuCamera.position.z = Math.sin(time) * radius;
        menuCamera.position.y = 75; // Fixed height
        menuCamera.lookAt(0, 0, 0);
        
        menuRenderer.render(menuScene, menuCamera);
    } else {
        if (player) {
            updatePlayer();
        }
        renderer.render(scene, camera);
    }
}

// Event listeners
document.getElementById('startGame').addEventListener('click', () => {
    gameStarted = true;
    document.getElementById('characterMenu').style.display = 'none';
    document.getElementById('backgroundScene').style.display = 'none';
    document.getElementById('gameScene').style.display = 'block';
    startGame();
});

// Initialize menu scene and start animation
createMenuScene();
animate();
