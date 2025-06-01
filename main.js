import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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

// Add to global variables
let health = 100;
let shield = 0;
let showFPS = false;
let lastTime = performance.now();
let frameCount = 0;
let roadBlockades = [];
let roadLampObjects = [];


// Item system variables
let inventory = [null, null, null, null, null]; // 5 slots for items
let invetoryItems = Array(10).fill(null); // 10 additional inventory slots 
let selectedSlot = 0; // Currently selected slot (0-5)
let itemIcons = ['🗡️', '🛡️', '🔋', '🧪', '🔍']; // Example icons for items

// Inventory system variables
let inventoryItems = Array(10).fill(null); // 10 additional inventory slots
let selectedInventorySlot = -1; // -1 means no slot selected
let isInventoryOpen = false;

// Add this variable near your other state variables
let controlsAccessedFrom = 'main'; // 'main' or 'pause'

// Add these new global variables
let inAir = false;

// Add head bob effect for walking
let bobTimer = 0;

// Add this global variable to track animation state
let knifeAnimationInProgress = false;
let knifeAnimationId = null;

// Add these global variables for the round system
let currentRound = 0;
let totalRounds = 20;
let enemies = [];
let activeEnemies = [];
let isRoundActive = false;
let isGameOver = false;
let roundCountdown = 10;
let betweenRoundTime = 15;
let countdownInterval;
let abandonedCars = [];

// Statistics tracking
const gameStats = {
    damageDealt: 0,
    damageTaken: 0,
    kills: {
        normal: 0,
        tank: 0,
        ranged: 0,
        speeder: 0,
        exploder: 0,
        shielder: 0,
        teleporter: 0,
        healer: 0,
        elite: 0,
        boss: 0 // This will now track all boss types combined
    }
};

// Enemy types constants
const ENEMY_TYPES = {
    NORMAL: 'normal',
    TANK: 'tank',
    RANGED: 'ranged',
    SPEEDER: 'speeder',
    EXPLODER: 'exploder', 
    SHIELDER: 'shielder',
    TELEPORTER: 'teleporter',
    HEALER: 'healer',
    ELITE: 'elite',
    BOSS: 'boss', // Round 5 boss
    WARDEN_BOSS: 'warden_boss',   // Round 10 boss
    PHANTOM_BOSS: 'phantom_boss',  // Round 15 boss
    MEGA_BOSS: 'mega_boss'         // Round 20 boss
};

// First, add weapon type constants at the top of your file
const WEAPON_TYPES = {
    KNIFE: 0,
    PISTOL: 1,
    SHOTGUN: 2,
    ASSAULT_RIFLE: 3,
    SNIPER_RIFLE: 4,
    CROSSBOW: 5,
    MINIGUN: 6,
    ROCKET_LAUNCHER: 7,
};

const ITEM_TYPES = {
    BANDAGE: 10,
    MEDKIT: 11,
    MINI_SHIELD: 12,
    BIG_SHIELD: 13,
};

const MAX_STACK_SIZES = {
    [ITEM_TYPES.BANDAGE]: 15,
    [ITEM_TYPES.MEDKIT]: 3,
    [ITEM_TYPES.MINI_SHIELD]: 6,
    [ITEM_TYPES.BIG_SHIELD]: 3
};

const SHOP_ITEMS = [
    {
        id: ITEM_TYPES.BANDAGE,
        name: "Bandages",
        description: "Restores 15 health",
        price: 5,
        icon: '🩹'
    },
    {
        id: ITEM_TYPES.MEDKIT,
        name: "Medkit",
        description: "Restores 100 health",
        price: 15,
        icon: '🧰'
    },
    {
        id: ITEM_TYPES.MINI_SHIELD,
        name: "Mini Shield",
        description: "Adds 25 shield points",
        price: 8,
        icon: '🛡️'
    },
    {
        id: ITEM_TYPES.BIG_SHIELD,
        name: "Shield Potion",
        description: "Adds 50 shield points",
        price: 20,
        icon: '🔷'
    },
    {
        id: WEAPON_TYPES.PISTOL,
        name: "Pistol",
        description: "Standard sidearm with decent damage and rate of fire.",
        price: 15,
        icon: "🔫"
    },
    {
        id: WEAPON_TYPES.SHOTGUN,
        name: "Shotgun",
        description: "Powerful at close range with spread damage.",
        price: 50,
        icon: "🔫"
    },
    {
        id: WEAPON_TYPES.ASSAULT_RIFLE,
        name: "Assault Rifle",
        description: "Balanced weapon with rapid fire and moderate damage.",
        price: 30,
        icon: "🔫"
    },
    {
        id: WEAPON_TYPES.SNIPER_RIFLE,
        name: "Sniper Rifle",
        description: "Long-range precision with high damage. Right-click to scope.",
        price: 35,
        icon: "🔫"
    },
    {
        id: WEAPON_TYPES.CROSSBOW,
        name: "Crossbow",
        description: "Silent and deadly, with retrievable bolts.",
        price: 35,
        icon: "🏹"
    },
    {
        id: WEAPON_TYPES.MINIGUN,
        name: "Minigun",
        description: "Extremely high rate of fire, but watch for overheating.",
        price: 150,
        icon: "🔫"
    },
    {
        id: WEAPON_TYPES.ROCKET_LAUNCHER,
        name: "Rocket Launcher",
        description: "Explosive area damage. Be careful not to hit yourself!",
        price: 175,
        icon: "🚀"
    }
];

// Add pistol-related global variables
let pistolModel = null;
let pistolAmmo = 16;
let pistolMaxAmmo = 16;
let pistolReloading = false;
let bullets = [];
let shotgunModel = null;
let shotgunAmmo = 6;
let shotgunMaxAmmo = 6;
let shotgunReloading = false;
const SHOTGUN_IDLE_POSITION = new THREE.Vector3(0.35, -0.3, -0.5);
const SHOTGUN_IDLE_ROTATION = new THREE.Euler(0, Math.PI, 0);
let shotgunAnimationInProgress = false;
let shotgunAnimationId = null;
let assaultRifleModel = null;
let assaultRifleAmmo = 30;
let assaultRifleMaxAmmo = 30;
let assaultRifleReloading = false;
const ASSAULT_RIFLE_IDLE_POSITION = new THREE.Vector3(0.35, -0.35, -0.5);
const ASSAULT_RIFLE_IDLE_ROTATION = new THREE.Euler(0, Math.PI, 0);
let assaultRifleAnimationInProgress = false;
let assaultRifleAnimationId = null;
// Add these with your other weapon variables
let sniperRifleModel = null;
let sniperRifleAmmo = 1;
let sniperRifleMaxAmmo = 1;
let sniperRifleReloading = false;
const SNIPER_RIFLE_IDLE_POSITION = new THREE.Vector3(0.35, -0.35, -0.5);
const SNIPER_RIFLE_IDLE_ROTATION = new THREE.Euler(0, Math.PI, 0);
let sniperRifleAnimationInProgress = false;
let sniperRifleAnimationId = null;
let isScoped = false;
let normalFOV = 75; // Store the regular FOV
let crossbowModel = null;
let crossbowAmmo = 6;
let crossbowMaxAmmo = 6;
let crossbowReloading = false;
const CROSSBOW_IDLE_POSITION = new THREE.Vector3(0.35, -0.35, -0.5);
const CROSSBOW_IDLE_ROTATION = new THREE.Euler(0, Math.PI, 0);
let crossbowAnimationInProgress = false;
let crossbowAnimationId = null;

// Add these with your other weapon variables
let minigunModel = null;
let minigunAmmo = 100;
let minigunMaxAmmo = 100;
let minigunReloading = false;
const MINIGUN_IDLE_POSITION = new THREE.Vector3(0.35, -0.4, -0.5);
const MINIGUN_IDLE_ROTATION = new THREE.Euler(0, Math.PI, 0);
let minigunAnimationInProgress = false;
let minigunAnimationId = null;
let minigunBarrelRotation = 0;
let minigunSpinning = false;
let minigunSpinSpeed = 0;
let minigunSpinningSound = null;
let minigunSpinTimeout = null;
let minigunFireInterval = null;
let minigunHeatLevel = 0; // For overheating mechanic
let minigunFireSound = null;
let minigunSpinupSound = null;
let minigunSpindownSound = null;
let rocketLauncherModel = null;
let rocketLauncherAmmo = 1;
let rocketLauncherMaxAmmo = 1;
let rocketLauncherReloading = false;
const ROCKET_LAUNCHER_IDLE_POSITION = new THREE.Vector3(0.35, -0.4, -0.5);
const ROCKET_LAUNCHER_IDLE_ROTATION = new THREE.Euler(0, Math.PI, 0);
let rocketLauncherAnimationInProgress = false;
let rocketLauncherAnimationId = null;

// Add these pistol position globals at the top with your other variables
const PISTOL_IDLE_POSITION = new THREE.Vector3(0.3, -0.3, -0.5);
const PISTOL_IDLE_ROTATION = new THREE.Euler(0, Math.PI, 0);
let pistolAnimationInProgress = false;
let pistolAnimationId = null;
let enemySpawnTimeout = null;
let spawnQueueActive = false;
let lastEnemySpawnTime = 0;
let stuckDetectionInterval = null;

// Add the missing shuffleArray function
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
}

// Adjust enemy spawn delays to be more consistent and faster
const enemyConfigs = {
    // Existing enemy types
    [ENEMY_TYPES.NORMAL]: {
        health: 40,
        speed: 0.05,
        damage: 10,
        size: { width: 0.8, height: 1.8, depth: 0.8 },
        color: 0xff0000,
        attackRange: 2,
        attackCooldown: 1000,
        spawnDelay: 500
    },
    [ENEMY_TYPES.TANK]: {
        health: 150,
        speed: 0.025,
        damage: 25,
        size: { width: 1.6, height: 3.6, depth: 1.6 },
        color: 0x4444ff,
        attackRange: 2.5,
        attackCooldown: 2000,
        spawnDelay: 1500
    },
    [ENEMY_TYPES.RANGED]: {
        health: 60,
        speed: 0.05,
        damage: 10,
        size: { width: 0.8, height: 3.6, depth: 0.8 },
        color: 0xffff00,
        attackRange: 15,
        attackCooldown: 2000,
        projectileSpeed: 0.3,
        spawnDelay: 1000
    },
    
    // New enemy types
    [ENEMY_TYPES.SPEEDER]: {
        health: 30,
        speed: 0.1, // 2x normal speed
        damage: 8,
        size: { width: 0.6, height: 1.4, depth: 0.6 },
        color: 0x00ffff,
        attackRange: 1.8,
        attackCooldown: 800,
        spawnDelay: 800,
        circleStrafe: true // Special behavior flag
    },
    [ENEMY_TYPES.EXPLODER]: {
        health: 60,
        speed: 0.06,
        damage: 40, // High damage on explosion
        size: { width: 1.0, height: 1.6, depth: 1.0 },
        color: 0xff9900,
        attackRange: 3, // Explosion radius
        attackCooldown: 1000,
        spawnDelay: 1200,
        explodeOnDeath: true,
        pulseRate: 0.5 // For visual effects
    },
    [ENEMY_TYPES.SHIELDER]: {
        health: 80,
        speed: 0.03,
        damage: 15,
        size: { width: 1.2, height: 2.0, depth: 0.8 },
        color: 0x8844ff,
        attackRange: 2.2,
        attackCooldown: 1500,
        spawnDelay: 1800,
        frontShield: true,
        shieldReduction: 0.8 // Reduces incoming damage by 80% from front
    },
    [ENEMY_TYPES.TELEPORTER]: {
        health: 50,
        speed: 0.05,
        damage: 12,
        size: { width: 0.8, height: 1.8, depth: 0.8 },
        color: 0xff00ff,
        attackRange: 10,
        attackCooldown: 1800,
        spawnDelay: 1500,
        teleportDistance: 10,
        teleportCooldown: 5000,
        projectileSpeed: 0.4
    },
    [ENEMY_TYPES.HEALER]: {
        health: 40,
        speed: 0.03,
        damage: 0, // No direct damage
        size: { width: 0.8, height: 1.8, depth: 0.8 },
        color: 0x00ff44,
        attackRange: 0, // Doesn't attack player
        healRange: 8, // Range to heal allies
        healAmount: 1, // HP healed per tick
        healCooldown: 500,
        spawnDelay: 2000
    },
    [ENEMY_TYPES.ELITE]: {
        health: 120,
        speed: 0.06,
        damage: 18,
        size: { width: 1.2, height: 2.2, depth: 1.2 },
        color: 0xffcc00,
        attackRange: 3,
        attackCooldown: 1000,
        spawnDelay: 2500,
        specialAttackCooldown: 5000,
        eliteType: null // Assigned randomly on spawn
    },
    
    // Boss enemy types
    [ENEMY_TYPES.BOSS]: {
        health: 500,
        speed: 0.04,
        damage: 30,
        size: { width: 2.5, height: 4, depth: 2.5 },
        color: 0x660066,
        attackRange: 3,
        attackCooldown: 3000,
        specialAttackCooldown: 10000,
        spawnDelay: 3000
    },
    [ENEMY_TYPES.WARDEN_BOSS]: {
        health: 800,
        speed: 0.035,
        damage: 35,
        size: { width: 3, height: 4.5, depth: 3 },
        color: 0x990000,
        attackRange: 3.5,
        attackCooldown: 3500,
        spawnDelay: 0,
        
        // Special abilities
        shieldWallCooldown: 8000,  // Shield wall cooldown
        shieldWallDuration: 4000,  // How long shield wall lasts
        shieldActive: false,      // Whether shield is currently active
        
        groundSlamCooldown: 12000, // Ground slam cooldown
        groundSlamRange: 10,      // Ground slam effect range
        groundSlamDamage: 40,     // Ground slam damage
        
        summonCooldown: 20000,    // Summon minions cooldown
        summonCount: 3           // Number of minions to summon
    },
    [ENEMY_TYPES.PHANTOM_BOSS]: {
        health: 1200,
        speed: 0.06,
        damage: 30,
        size: { width: 2.5, height: 4, depth: 2.5 },
        color: 0x8800cc,
        attackRange: 4,
        attackCooldown: 3000,
        spawnDelay: 0,
        
        // Special abilities
        teleportCooldown: 5000,   // Teleport strike cooldown
        teleportRange: 15,        // How far it can teleport
        
        cloneCooldown: 15000,     // Shadow clone cooldown
        cloneCount: 4,            // Number of clones created
        cloneDuration: 10000,     // How long clones last
        
        voidZoneCooldown: 10000,  // Void zone cooldown
        voidZoneCount: 3,         // Number of void zones created
        voidZoneDuration: 7000,   // How long void zones last
        voidZoneDamage: 5,        // Damage per second from void zones
        
        phaseShiftCooldown: 25000, // Phase shift cooldown
        phaseDuration: 5000,       // How long the immune phase lasts
        phaseActive: false         // Whether currently phased
    },
    [ENEMY_TYPES.MEGA_BOSS]: {
        health: 2500,
        speed: 0.05, // Variable depending on phase
        damage: 40,
        size: { width: 4, height: 6, depth: 4 },
        color: 0x222222, // Color changes based on phase
        attackRange: 4,
        attackCooldown: 2500,
        spawnDelay: 0,
        
        // Phases
        currentPhase: 1,
        phaseThresholds: [0.66, 0.33], // At 66% and 33% health
        
        // Warden abilities
        shieldWallCooldown: 10000,
        shieldWallDuration: 3000,
        shieldActive: false,
        
        groundSlamCooldown: 15000,
        groundSlamRange: 12,
        groundSlamDamage: 45,
        
        summonCooldown: 25000,
        summonCount: 2,
        
        // Phantom abilities
        teleportCooldown: 6000,
        teleportRange: 15,
        
        cloneCooldown: 18000,
        cloneCount: 3,
        cloneDuration: 8000,
        
        voidZoneCooldown: 12000,
        voidZoneCount: 2,
        voidZoneDuration: 6000,
        voidZoneDamage: 8,
        
        // Ultimate abilities (Phase 3)
        deathRayCooldown: 30000,
        deathRayDamage: 60,
        deathRayDuration: 5000,
        
        meteorCooldown: 20000,
        meteorCount: 8,
        meteorDamage: 25,
        
        realityWarpCooldown: 45000,
        realityWarpDuration: 8000
    }
};

// Round configurations
const roundConfigs = [
    { // Round 1 - Tutorial
        normal: 8
    },
    { // Round 2 - Introducing Tanks
        normal: 10,
        tank: 2
    },
    { // Round 3 - Introducing Ranged
        normal: 12,
        tank: 2,
        ranged: 3
    },
    { // Round 4 - Introducing Speeders
        normal: 10,
        tank: 3,
        ranged: 3,
        speeder: 3
    },
    { // Round 5 - First Boss
        normal: 8,
        tank: 2,
        ranged: 2,
        speeder: 2,
        boss: 1
    },
    { // Round 6 - Introducing Exploders
        normal: 12,
        tank: 4,
        ranged: 4,
        speeder: 4,
        exploder: 3
    },
    { // Round 7 - Introducing Shielders
        normal: 12,
        tank: 4,
        ranged: 4,
        speeder: 5,
        exploder: 4,
        shielder: 3
    },
    { // Round 8 - Introducing Teleporters
        normal: 10,
        tank: 5,
        ranged: 5,
        exploder: 5,
        speeder: 6,
        shielder: 3,
        teleporter: 3
    },
    { // Round 9 - Mixed Challenge
        normal: 15,
        tank: 6,
        ranged: 6,
        exploder: 5,
        speeder: 6,
        shielder: 4,
        teleporter: 4
    },
    { // Round 10 - WARDEN BOSS ROUND
        normal: 8,
        tank: 3,
        ranged: 3,
        speeder: 3,
        shielder: 2,
        warden_boss: 1
    },
    { // Round 11 - Introducing Healers
        normal: 15,
        tank: 7,
        ranged: 7,
        exploder: 6,
        speeder: 7,
        shielder: 5,
        teleporter: 4,
        healer: 3
    },
    { // Round 12 - Introducing Elites
        normal: 15,
        tank: 8,
        ranged: 8,
        exploder: 7,
        speeder: 8,
        shielder: 5,
        teleporter: 5,
        healer: 3,
        elite: 2
    },
    { // Round 13 - Healer Focus
        normal: 12,
        tank: 8,
        ranged: 8,
        exploder: 8,
        speeder: 8,
        shielder: 6,
        teleporter: 5, 
        healer: 6,
        elite: 3
    },
    { // Round 14 - Elite Focus
        normal: 15,
        tank: 10,
        ranged: 10,
        exploder: 10,
        speeder: 10,
        shielder: 8,
        teleporter: 6,
        healer: 5,
        elite: 6
    },
    { // Round 15 - PHANTOM BOSS ROUND
        tank: 4,
        ranged: 4,
        exploder: 4,
        speeder: 4,
        shielder: 3,
        healer: 3,
        elite: 2,
        phantom_boss: 1
    },
    { // Round 16 - Increased Challenge
        normal: 18,
        tank: 12,
        ranged: 12,
        exploder: 12,
        speeder: 12,
        shielder: 10,
        teleporter: 8,
        healer: 7,
        elite: 5
    },
    { // Round 17 - Elite Healer Combo
        normal: 15,
        tank: 14,
        ranged: 14,
        exploder: 14,
        speeder: 14,
        shielder: 12,
        teleporter: 10,
        healer: 8,
        elite: 7
    },
    { // Round 18 - Near-Final Challenge
        normal: 20,
        tank: 15,
        ranged: 15,
        exploder: 15,
        speeder: 15,
        shielder: 15,
        teleporter: 12,
        healer: 10,
        elite: 8
    },
    { // Round 19 - Final Wave
        normal: 25,
        tank: 18,
        ranged: 18,
        exploder: 18,
        speeder: 18,
        shielder: 15,
        teleporter: 12,
        healer: 12,
        elite: 10
    },
    { // Round 20 - MEGA BOSS ROUND
        tank: 6,
        ranged: 6,
        exploder: 5,
        speeder: 5,
        shielder: 4,
        teleporter: 3,
        healer: 4,
        elite: 3,
        mega_boss: 1
    }
]

// Add these variables with your other global variables
let infiniteHealthCheat = false;
let originalHealthColor = null;

// Add this function to load and place the abandoned car model
function loadAbandonedCarModel(x = 20, z = 4, rotationY = Math.PI, targetScene = scene) {
    const loader = new GLTFLoader();
    
    // Load the abandoned car model
    loader.load(
        'assets/models/abandoned_car/scene.gltf',
        function(gltf) {
            const car = gltf.scene;
            
            // Scale the car appropriately
            car.scale.set(0.00675, 0.00675, 0.00675); // Adjust scale as needed
            
            // Position the car
            car.position.set(x, 0, z);
            car.rotation.y = rotationY;
            
            // Add collision data
            car.userData = {
                collisionWidth: 4,  // Width for collision detection
                collisionDepth: 8,  // Length for collision detection
                collisionRadius: 4, // Simple radius for simpler calculations
                isCar: true         // Flag to identify car objects
            };

            // Add shadow casting to all meshes in the model with more explicit options
            car.traverse(function(node) {
                if (node.isMesh) {
                    // Enable shadows with explicit properties
                    node.castShadow = true;
                    node.receiveShadow = true;
                    
                    // Improve material shadow handling if needed
                    if (node.material) {
                        // Ensure materials are properly set up for shadows
                        if (Array.isArray(node.material)) {
                            // Handle multi-material objects
                            node.material.forEach(mat => {
                                mat.needsUpdate = true;
                            });
                        } else {
                            // Single material
                            node.material.needsUpdate = true;
                        }
                    }
                }
            });
            
            // Add to appropriate scene
            targetScene.add(car);
            
            // Add to tracking array only if it's the game scene
            if (targetScene === scene) {
                abandonedCars.push(car);
                console.log("Car added with shadows enabled at position:", x, z);
            }
            
            // Force a shadow update after adding to scene
            if (renderer.shadowMap.enabled) {
                renderer.shadowMap.needsUpdate = true;
            }
        },
        function(xhr) {
            // Progress callback
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function(error) {
            // Error callback
            console.error('An error happened loading the car model:', error);
        }
    );
}

// Update the initializeInventory function
function initializeInventory() {
    const inventoryGrid = document.querySelector('.inventory-grid');
    inventoryGrid.innerHTML = '';
    
    // Create 10 inventory slots
    for (let i = 0; i < 10; i++) {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot empty';
        slot.dataset.slot = i;
        slot.draggable = true;
        inventoryGrid.appendChild(slot);
        
        // Add click handler for selection
        slot.addEventListener('click', () => {
            selectInventorySlot(i);
        });
        
        // Add drag handlers
        slot.addEventListener('dragstart', (e) => {
            if (inventoryItems[i] !== null) {
                e.dataTransfer.setData('text/plain', `inv-${i}`);
            } else {
                e.preventDefault();
            }
        });
        
        slot.addEventListener('dragover', (e) => {
            e.preventDefault(); // Allow drop
        });
        
        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            const data = e.dataTransfer.getData('text/plain');
            
            // Check if dragging from inventory or hotbar
            if (data.startsWith('inv-')) {
                const sourceSlot = parseInt(data.split('-')[1]);
                swapInventorySlots(sourceSlot, i);
            } else if (data.startsWith('bar-')) {
                const barSlot = parseInt(data.split('-')[1]);
                moveFromBarToInventory(barSlot, i);
            }
        });
    }
    
    // Add event listener for close button only
    document.getElementById('closeInventory').addEventListener('click', toggleInventory);
    
    // Add drag and drop to item bar slots
    setupItemBarDragAndDrop();
}

// Function to swap items between inventory slots
function swapInventorySlots(fromSlot, toSlot) {
    if (fromSlot === toSlot) return;
    
    const temp = inventoryItems[toSlot];
    inventoryItems[toSlot] = inventoryItems[fromSlot];
    inventoryItems[fromSlot] = temp;
    
    updateInventoryDisplay();
}

// Function to setup drag and drop for item bar
function setupItemBarDragAndDrop() {
    const slots = document.querySelectorAll('.item-slot');
    
    slots.forEach((slot, index) => {
        // Make slot draggable
        slot.draggable = true;
        
        slot.addEventListener('dragstart', (e) => {
            if (inventory[index] !== null) {
                e.dataTransfer.setData('text/plain', `bar-${index}`);
            } else {
                e.preventDefault();
            }
        });
        
        slot.addEventListener('dragover', (e) => {
            e.preventDefault(); // Allow drop
        });
        
        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            const data = e.dataTransfer.getData('text/plain');
            
            // Check if dragging from inventory or hotbar
            if (data.startsWith('inv-')) {
                const invSlot = parseInt(data.split('-')[1]);
                moveFromInventoryToBar(invSlot, index);
            } else if (data.startsWith('bar-')) {
                const barSlot = parseInt(data.split('-')[1]);
                swapBarSlots(barSlot, index);
            }
        });
    });
}

// Function to swap items between hotbar slots
function swapBarSlots(fromSlot, toSlot) {
    if (fromSlot === toSlot) return;
    
    const temp = inventory[toSlot];
    inventory[toSlot] = inventory[fromSlot];
    inventory[fromSlot] = temp;
    
    updateItemBar();
    updateWeaponVisibility();
}

function createRocketLauncherModel() {
    if (rocketLauncherModel) {
        camera.remove(rocketLauncherModel);
    }
    
    // Create rocket launcher group
    rocketLauncherModel = new THREE.Group();
    
    // Create main tube
    const tubeGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 16);
    const tubeMaterial = new THREE.MeshStandardMaterial({
        color: 0x4b5320,
        roughness: 0.4,
        metalness: 0.7
    });
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    tube.rotation.x = Math.PI/2; // FIX: Changed rotation from Z to X axis
    tube.castShadow = true;
    tube.receiveShadow = true;
    rocketLauncherModel.add(tube);
    
    // Create wider tube opening (front)
    const muzzleGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16);
    const muzzleMaterial = new THREE.MeshStandardMaterial({
        color: 0x3d5229,
        roughness: 0.5,
        metalness: 0.8
    });
    const muzzle = new THREE.Mesh(muzzleGeometry, muzzleMaterial);
    muzzle.rotation.x = Math.PI/2; // FIX: Changed rotation from Z to X axis
    muzzle.position.set(0, 0, 0.425); // FIX: Adjusted position to Z axis
    muzzle.castShadow = true;
    muzzle.receiveShadow = true;
    rocketLauncherModel.add(muzzle);
    
    // Create back of tube
    const backGeometry = new THREE.CylinderGeometry(0.11, 0.11, 0.05, 16);
    const backMaterial = new THREE.MeshStandardMaterial({
        color: 0x3d5229,
        roughness: 0.5,
        metalness: 0.8
    });
    const back = new THREE.Mesh(backGeometry, backMaterial);
    back.rotation.x = Math.PI/2; // FIX: Changed rotation from Z to X axis
    back.position.set(0, 0, -0.425); // FIX: Adjusted position to Z axis
    back.castShadow = true;
    back.receiveShadow = true;
    rocketLauncherModel.add(back);
    
    // Create handle/grip
    const handleGeometry = new THREE.BoxGeometry(0.1, 0.25, 0.08);
    const handleMaterial = new THREE.MeshStandardMaterial({
        color: 0x374a24,
        roughness: 0.7,
        metalness: 0.3
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(-0.1, -0.2, 0);
    handle.castShadow = true;
    handle.receiveShadow = true;
    rocketLauncherModel.add(handle);
    
    // Create rocket inside the tube if ammo > 0
    const rocketGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.3, 8);
    const rocketMaterial = new THREE.MeshStandardMaterial({
        color: 0xcc4400,
        roughness: 0.3,
        metalness: 0.5
    });
    const rocket = new THREE.Mesh(rocketGeometry, rocketMaterial);
    rocket.rotation.x = Math.PI/2; // FIX: Changed rotation from Z to X axis
    rocket.position.set(0, 0, 0.2); // FIX: Position visible in the tube, aligned with Z
    rocket.castShadow = true;
    rocket.receiveShadow = true;
    rocketLauncherModel.add(rocket);
    rocketLauncherModel.userData.loadedRocket = rocket;
    
    // Create sights on top
    const sightGeometry = new THREE.BoxGeometry(0.3, 0.08, 0.04);
    const sightMaterial = new THREE.MeshStandardMaterial({
        color: 0x4b5320,
        roughness: 0.6,
        metalness: 0.5
    });
    const sight = new THREE.Mesh(sightGeometry, sightMaterial);
    sight.position.set(0, 0.12, 0);
    sight.castShadow = true;
    sight.receiveShadow = true;
    rocketLauncherModel.add(sight);
    
    // Add a support under the tube
    const supportGeometry = new THREE.BoxGeometry(0.4, 0.08, 0.05);
    const supportMaterial = new THREE.MeshStandardMaterial({
        color: 0x5a6b34,
        roughness: 0.6,
        metalness: 0.5
    });
    const support = new THREE.Mesh(supportGeometry, supportMaterial);
    support.position.set(0.05, -0.1, 0);
    support.castShadow = true;
    support.receiveShadow = true;
    rocketLauncherModel.add(support);
    
    // Add warning markings
    const warningGeometry = new THREE.PlaneGeometry(0.3, 0.05);
    const warningMaterial = new THREE.MeshBasicMaterial({
        color: 0xffcc00,
        side: THREE.DoubleSide
    });
    const warning = new THREE.Mesh(warningGeometry, warningMaterial);
    warning.rotation.y = Math.PI/2;
    warning.position.set(0, 0, 0.075);
    rocketLauncherModel.add(warning);
    
    // Add a dedicated light for better visibility
    const weaponLight = new THREE.PointLight(0xffffff, 1.0, 1);
    weaponLight.position.set(0, 0.1, -0.2);
    rocketLauncherModel.add(weaponLight);
    
    // Position the rocket launcher in view
    rocketLauncherModel.position.copy(ROCKET_LAUNCHER_IDLE_POSITION);
    rocketLauncherModel.rotation.copy(ROCKET_LAUNCHER_IDLE_ROTATION);
    
    camera.add(rocketLauncherModel);
    console.log("Rocket launcher model created");
    
    // Update rocket visibility
    updateRocketLauncherDisplay();
    
    rocketLauncherModel.visible = (inventory[selectedSlot] === WEAPON_TYPES.ROCKET_LAUNCHER);
    return rocketLauncherModel;
}

// Function to update rocket visibility based on ammo
function updateRocketLauncherDisplay() {
    if (rocketLauncherModel && rocketLauncherModel.userData.loadedRocket) {
        rocketLauncherModel.userData.loadedRocket.visible = (rocketLauncherAmmo > 0);
    }
}

function fireRocketLauncher() {
    if (rocketLauncherReloading) return;
    
    if (rocketLauncherAmmo <= 0) {
        // Auto reload when empty
        animateRocketLauncherReload();
        return;
    }

    // Play rocket launcher firing sound
    soundManager.play('rocket_launcher_fire', 0.7);
    
    // Decrement ammo
    rocketLauncherAmmo--;
    updateAmmoDisplay();
    
    // Update rocket visibility
    updateRocketLauncherDisplay();
    
    // Play firing animation
    animateRocketLauncherFire();
    
    // Create rocket projectile
    createRocket();
    
    // Add screen shake for powerful weapon
    addScreenShake(0.4, 400);
    
    // Auto reload if empty
    if (rocketLauncherAmmo === 0) {
        setTimeout(animateRocketLauncherReload, 300);
    }
}

function createRocket() {
    console.log("Creating rocket projectile");
    
    // Create rocket body
    const rocketGroup = new THREE.Group();
    
    // Main body
    const bodyGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.3, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xcc4400,
        roughness: 0.3,
        metalness: 0.6,
        emissive: 0x441100,  // Added emissive for better visibility
        emissiveIntensity: 0.3
    });
    
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2; // Orient for forward flight
    rocketGroup.add(body);
    
    // Rocket tip
    const tipGeometry = new THREE.ConeGeometry(0.05, 0.1, 8);
    const tipMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.2,
        metalness: 0.8
    });
    
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.position.z = 0.2; // Position at front of rocket
    rocketGroup.add(tip);
    
    // Fins
    const finGeometry = new THREE.BoxGeometry(0.08, 0.02, 0.08);
    const finMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.5,
        metalness: 0.6
    });
    
    // Add four fins
    for (let i = 0; i < 4; i++) {
        const fin = new THREE.Mesh(finGeometry, finMaterial);
        const angle = (i / 4) * Math.PI * 2;
        fin.position.set(
            Math.cos(angle) * 0.06,
            Math.sin(angle) * 0.06,
            -0.08
        );
        fin.rotation.z = angle;
        body.add(fin);
    }
    
    // Get camera position and direction
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);
    
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    camera.getWorldDirection(cameraDirection);
    
    // Position rocket at launcher muzzle - FURTHER forward for better visibility
    rocketGroup.position.copy(cameraPosition).addScaledVector(cameraDirection, 4);
    
    // Orient rocket in flight direction
    rocketGroup.lookAt(cameraPosition.clone().add(cameraDirection.multiplyScalar(10)));
    
    // Add point light to make rocket more visible
    const rocketLight = new THREE.PointLight(0xff4400, 2, 3);
    rocketLight.position.set(0, 0, 0);
    rocketGroup.add(rocketLight);
    
    // IMPORTANT: Add rocket data BEFORE creating the thrust effect
    rocketGroup.userData = {
        direction: cameraDirection.clone(),
        speed: 0.8, // Slower than bullets for gameplay
        damage: 120, // High damage
        blastRadius: 5, // Large blast radius
        lifetime: 6000, // Longer lifetime
        spawnTime: performance.now(),
        isRocket: true
    };
    
    // Add thrust effect AFTER setting userData
    createRocketThrustEffect(rocketGroup);
    
    console.log("Adding rocket to scene at position:", rocketGroup.position);
    scene.add(rocketGroup);
    bullets.push(rocketGroup); // Use bullets array for tracking
    
    return rocketGroup;
}

// Create rocket thrust effect
function createRocketThrustEffect(rocketObject) {
    // Create particle emitter at back of rocket
    const emitParticles = () => {
        // Create fire particle
        const particleGeometry = new THREE.SphereGeometry(0.04 + Math.random() * 0.04, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(0.1, 0.7, 0.5 + Math.random() * 0.3), // Orange-yellow fire
            transparent: true,
            opacity: 0.7
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Position at back of rocket with slight randomization
        particle.position.copy(rocketObject.position);
        const backDirection = rocketObject.userData.direction.clone().negate();
        particle.position.addScaledVector(backDirection, 0.15);
        particle.position.x += (Math.random() - 0.5) * 0.05;
        particle.position.y += (Math.random() - 0.5) * 0.05;
        particle.position.z += (Math.random() - 0.5) * 0.05;
        
        // Add to scene
        scene.add(particle);
        
        // Animate particles
        const particleSpeed = 0.05 + Math.random() * 0.05;
        const startTime = performance.now();
        const lifetime = 200 + Math.random() * 200;
        
        function animateParticle() {
            const now = performance.now();
            const elapsed = now - startTime;
            
            if (elapsed > lifetime || !rocketObject.parent) {
                scene.remove(particle);
                return;
            }
            
            // Move particle backward from rocket
            particle.position.addScaledVector(backDirection, particleSpeed);
            
            // Fade out over lifetime
            const progress = elapsed / lifetime;
            particle.material.opacity = 0.7 * (1 - progress);
            
            // Shrink particle
            const scale = 1 - progress * 0.8;
            particle.scale.set(scale, scale, scale);
            
            requestAnimationFrame(animateParticle);
        }
        
        requestAnimationFrame(animateParticle);
    };
    
    // Create initial particles
    for (let i = 0; i < 5; i++) {
        emitParticles();
    }
    
    // Continue emitting particles
    const emitterInterval = setInterval(emitParticles, 30); // Emit new particle every 30ms
    
    // Store interval ID in userData for cleanup
    rocketObject.userData.thrustEmitter = emitterInterval;
    
    // Clear interval when rocket explodes or expires
    const clearCheck = setInterval(() => {
        if (!rocketObject.parent) {
            clearInterval(emitterInterval);
            clearInterval(clearCheck);
        }
    }, 1000);
}

function createRocketExplosion(position, radius, damage) {
    // Create explosion sphere
    const explosionGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const explosionMaterial = new THREE.MeshBasicMaterial({
        color: 0xff5500,
        transparent: true,
        opacity: 0.8
    });
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosion.position.copy(position);
    scene.add(explosion);
    
    // Create explosion light
    const light = new THREE.PointLight(0xff5500, 3, radius * 3);
    light.position.copy(position);
    scene.add(light);
    
    // Create shockwave ring
    const ringGeometry = new THREE.RingGeometry(0.3, 0.5, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xff7700,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.copy(position);
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);
    
    // Add powerful screen shake
    addScreenShake(0.8, 800);
    
    // Check for entities in blast radius
    checkBlastDamage(position, radius, damage);

    // Play explosion sound
    soundManager.play('rocket_explosion', 1.0);
    
    // Animate explosion
    const duration = 1000; // 1 second
    const startTime = performance.now();
    const maxSize = radius;
    
    function animateExplosion() {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
            // Remove explosion elements
            scene.remove(explosion);
            scene.remove(light);
            scene.remove(ring);
            return;
        }
        
        // Expand explosion
        const currentSize = Math.min(maxSize * progress, maxSize);
        explosion.scale.set(currentSize, currentSize, currentSize);
        
        // Expand ring faster than the sphere
        const ringSize = Math.min(maxSize * progress * 2, maxSize * 2);
        ring.scale.set(ringSize, ringSize, 1);
        
        // Fade out elements gradually
        if (progress > 0.5) {
            const fadeProgress = (progress - 0.5) * 2; // 0 to 1 in second half
            explosion.material.opacity = 0.8 * (1 - fadeProgress);
            ringMaterial.opacity = 0.7 * (1 - fadeProgress);
            light.intensity = 3 * (1 - fadeProgress);
        }
        
        requestAnimationFrame(animateExplosion);
    }
    
    requestAnimationFrame(animateExplosion);
}

function checkBlastDamage(position, radius, damage) {
    console.log(`Rocket explosion at ${position.x.toFixed(2)},${position.y.toFixed(2)},${position.z.toFixed(2)} with radius ${radius} and damage ${damage}`);
    
    // Check if player is within blast radius
    const distanceToPlayer = position.distanceTo(player.position);
    
    if (distanceToPlayer <= radius) {
        // Calculate damage falloff based on distance
        const falloff = 1 - (distanceToPlayer / radius);
        const actualDamage = Math.floor(damage * falloff);
        
        console.log(`Player hit by explosion! Distance: ${distanceToPlayer.toFixed(2)}, Damage: ${actualDamage}`);
        
        // Apply damage to player
        takeDamage(actualDamage);
        
        // Add screen shake effect when player is hit directly
        addScreenShake(0.3, 400);
        
        // Show hit marker when player is hit (self-damage indicator)
        showHitMarker();
    }
    
    // Check damage to enemies
    let enemiesHit = 0;
    
    // Process ALL enemies in the blast radius
    for (let i = 0; i < activeEnemies.length; i++) {
        const enemy = activeEnemies[i];
        if (!enemy || !enemy.position) continue;
        
        const distanceToEnemy = position.distanceTo(enemy.position);
        
        if (distanceToEnemy <= radius) {
            // Calculate damage falloff based on distance
            const falloff = 1 - (distanceToEnemy / radius);
            const actualDamage = Math.floor(damage * falloff);
            
            enemiesHit++;
            console.log(`Enemy #${i} hit by explosion! Distance: ${distanceToEnemy.toFixed(2)}, Damage: ${actualDamage}`);
            
            // IMPORTANT: Apply damage to each enemy in radius
            damageEnemy(enemy, actualDamage);
            
            // Create hit effect for visual feedback
            createHitEffect(enemy.position);
        }
    }
    
    // Show hit marker if any enemies were hit (in addition to player)
    if (enemiesHit > 0) {
        showHitMarker();
        console.log(`Total enemies hit by explosion: ${enemiesHit}`);
    }
}

function animateRocketLauncherFire() {
    if (!rocketLauncherModel || rocketLauncherReloading) return;
    
    // Force cancel any ongoing animation
    if (rocketLauncherAnimationInProgress) {
        cancelAnimationFrame(rocketLauncherAnimationId);
        // Reset position immediately
        rocketLauncherModel.position.copy(ROCKET_LAUNCHER_IDLE_POSITION);
        rocketLauncherModel.rotation.copy(ROCKET_LAUNCHER_IDLE_ROTATION);
    }
    
    // Mark animation as in progress
    rocketLauncherAnimationInProgress = true;
    
    // Animation constants - strong recoil
    const recoilDuration = 150; // milliseconds
    const returnDuration = 250; // milliseconds
    
    // Start time
    const startTime = performance.now();
    
    function animate() {
        const now = performance.now();
        const elapsed = now - startTime;
        
        if (elapsed < recoilDuration) {
            // Recoil motion - stronger than other weapons
            const progress = elapsed / recoilDuration;
            rocketLauncherModel.position.z = ROCKET_LAUNCHER_IDLE_POSITION.z + (0.25 * progress);
            rocketLauncherModel.position.y = ROCKET_LAUNCHER_IDLE_POSITION.y + (0.06 * progress);
            rocketLauncherModel.rotation.x = ROCKET_LAUNCHER_IDLE_ROTATION.x - (Math.PI / 15 * progress);
            rocketLauncherAnimationId = requestAnimationFrame(animate);
        } else if (elapsed < recoilDuration + returnDuration) {
            // Return motion
            const returnProgress = (elapsed - recoilDuration) / returnDuration;
            rocketLauncherModel.position.z = ROCKET_LAUNCHER_IDLE_POSITION.z + (0.25 * (1 - returnProgress));
            rocketLauncherModel.position.y = ROCKET_LAUNCHER_IDLE_POSITION.y + (0.06 * (1 - returnProgress));
            rocketLauncherModel.rotation.x = ROCKET_LAUNCHER_IDLE_ROTATION.x - (Math.PI / 15 * (1 - returnProgress));
            rocketLauncherAnimationId = requestAnimationFrame(animate);
        } else {
            // Reset to exact original values
            rocketLauncherModel.position.copy(ROCKET_LAUNCHER_IDLE_POSITION);
            rocketLauncherModel.rotation.copy(ROCKET_LAUNCHER_IDLE_ROTATION);
            
            // Clear animation state
            rocketLauncherAnimationInProgress = false;
            rocketLauncherAnimationId = null;
        }
    }
    
    rocketLauncherAnimationId = requestAnimationFrame(animate);
}

function animateRocketLauncherReload() {
    if (!rocketLauncherModel || rocketLauncherReloading) return;
    
    // Force cancel any ongoing animation
    if (rocketLauncherAnimationInProgress) {
        cancelAnimationFrame(rocketLauncherAnimationId);
        // Reset position immediately
        rocketLauncherModel.position.copy(ROCKET_LAUNCHER_IDLE_POSITION);
        rocketLauncherModel.rotation.copy(ROCKET_LAUNCHER_IDLE_ROTATION);
    }
    
    rocketLauncherReloading = true;
    rocketLauncherAnimationInProgress = true;
    showNotification("Reloading rocket launcher...", 3000);

    // Play rocket launcher reload sound
    soundManager.play('rocket_launcher_reload', 0.8);
    
    // Animation constants
    const totalDuration = 3000; // 3 seconds reload time
    const startTime = performance.now();
    
    function animate() {
        const now = performance.now();
        const elapsed = now - startTime;
        
        if (elapsed < totalDuration) {
            const progress = elapsed / totalDuration;
            
            // Reload animation in three phases
            if (progress < 0.3) {
                // First phase - lower weapon to load
                const phaseProgress = progress / 0.3;
                rocketLauncherModel.rotation.x = ROCKET_LAUNCHER_IDLE_ROTATION.x + (Math.PI / 8 * phaseProgress);
                rocketLauncherModel.position.y = ROCKET_LAUNCHER_IDLE_POSITION.y - (0.1 * phaseProgress);
            } else if (progress < 0.7) {
                // Second phase - loading new rocket
                const phaseProgress = (progress - 0.3) / 0.4;
                rocketLauncherModel.rotation.x = ROCKET_LAUNCHER_IDLE_ROTATION.x + Math.PI / 8;
                rocketLauncherModel.position.y = ROCKET_LAUNCHER_IDLE_POSITION.y - 0.1;
                
                // Rotate slightly to simulate inserting new rocket
                rocketLauncherModel.rotation.z = ROCKET_LAUNCHER_IDLE_ROTATION.z + (Math.PI / 12 * Math.sin(phaseProgress * Math.PI));
            } else {
                // Final phase - return to position
                const phaseProgress = (progress - 0.7) / 0.3;
                rocketLauncherModel.rotation.x = ROCKET_LAUNCHER_IDLE_ROTATION.x + (Math.PI / 8 * (1 - phaseProgress));
                rocketLauncherModel.position.y = ROCKET_LAUNCHER_IDLE_POSITION.y - (0.1 * (1 - phaseProgress));
                rocketLauncherModel.rotation.z = ROCKET_LAUNCHER_IDLE_ROTATION.z;
            }
            
            rocketLauncherAnimationId = requestAnimationFrame(animate);
        } else {
            // Reset to exact original values
            rocketLauncherModel.position.copy(ROCKET_LAUNCHER_IDLE_POSITION);
            rocketLauncherModel.rotation.copy(ROCKET_LAUNCHER_IDLE_ROTATION);
            
            // Reload complete
            rocketLauncherAmmo = rocketLauncherMaxAmmo;
            rocketLauncherReloading = false;
            updateAmmoDisplay();
            
            // Show loaded rocket again
            updateRocketLauncherDisplay();
            
            // Clear animation state
            rocketLauncherAnimationInProgress = false;
            rocketLauncherAnimationId = null;
        }
    }
    
    rocketLauncherAnimationId = requestAnimationFrame(animate);
}

function createCrossbowModel() {
    if (crossbowModel) {
        camera.remove(crossbowModel);
    }
    
    // Create crossbow group
    crossbowModel = new THREE.Group();
    
    // Create main body (handle and stock)
    const bodyGeometry = new THREE.BoxGeometry(0.08, 0.25, 0.7);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x5c2e00, // Wood color
        roughness: 0.7,
        metalness: 0.1
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    crossbowModel.add(body);
    
    // Create crossbow arms (horizontal bar)
    const armsGeometry = new THREE.BoxGeometry(0.6, 0.04, 0.04);
    const armsMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444, // Metal color
        roughness: 0.4,
        metalness: 0.8
    });
    const arms = new THREE.Mesh(armsGeometry, armsMaterial);
    arms.position.set(0, 0, 0.34); // Position at front end
    arms.castShadow = true;
    arms.receiveShadow = true;
    crossbowModel.add(arms);
    
    // Create bow string (curved)
    const stringCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.28, 0, 0.34),    // Left arm tip
        new THREE.Vector3(0, 0, 0.2),         // Control point (pulled back slightly)
        new THREE.Vector3(0.28, 0, 0.34)      // Right arm tip
    );
    
    const stringGeometry = new THREE.TubeGeometry(
        stringCurve,
        8,    // tubular segments
        0.005, // radius
        8,    // radial segments
        false  // closed
    );
    
    const stringMaterial = new THREE.MeshBasicMaterial({
        color: 0xeeeeee
    });
    
    const string = new THREE.Mesh(stringGeometry, stringMaterial);
    string.castShadow = true;
    crossbowModel.add(string);
    
    // Create arrow rail/guide
    const railGeometry = new THREE.BoxGeometry(0.04, 0.02, 0.6);
    const railMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.5,
        metalness: 0.6
    });
    const rail = new THREE.Mesh(railGeometry, railMaterial);
    rail.position.set(0, 0.02, 0.1); // Position along the body
    rail.castShadow = true;
    rail.receiveShadow = true;
    crossbowModel.add(rail);
    
    // Create loaded arrow (visible when ammo > 0)
    const arrowGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.6, 8);
    const arrowMaterial = new THREE.MeshStandardMaterial({
        color: 0x5c2e00, // Wood shaft
        roughness: 0.6,
        metalness: 0.2
    });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.rotation.x = Math.PI / 2; // Align horizontally
    arrow.position.set(0, 0.03, 0.1); // Position along the rail
    arrow.castShadow = true;
    arrow.receiveShadow = true;
    crossbowModel.userData.loadedArrow = arrow; // Store reference to toggle visibility
    crossbowModel.add(arrow);
    
    // Create arrow tip
    const tipGeometry = new THREE.ConeGeometry(0.02, 0.08, 8);
    const tipMaterial = new THREE.MeshStandardMaterial({
        color: 0x777777, // Metal tip
        roughness: 0.3,
        metalness: 0.9
    });
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.rotation.x = Math.PI / 2; // Align horizontally
    tip.position.set(0, 0, 0.32); // Position at the front of the arrow
    arrow.add(tip);
    
    // Create arrow fletching (feathers) - FIXING THE POSITION AND ROTATION HERE
    const fletchingGeometry = new THREE.BoxGeometry(0.04, 0.1, 0.01);
    const fletchingMaterial = new THREE.MeshStandardMaterial({
        color: 0xdd0000, // Red feathers
        roughness: 0.8,
        metalness: 0.1
    });
    
    // First fletching piece - vertical
    const fletching1 = new THREE.Mesh(fletchingGeometry, fletchingMaterial);
    fletching1.position.set(0, 0, -0.1); // Position at the back of the arrow
    fletching1.position.y = -0.1; // Position lower on the shaft
    fletching1.rotation.z = Math.PI / 2; // Make it straight up/down
    arrow.add(fletching1);
    
    // Second fletching piece - horizontal
    const fletching2 = new THREE.Mesh(fletchingGeometry, fletchingMaterial);
    fletching2.position.set(0, 0, -0.1); // Same position at back of arrow
    fletching2.position.y = -0.1; // Same lower position
    fletching2.rotation.x = Math.PI / 2; // Make it horizontal, crossing the first one
    arrow.add(fletching2);
    
    // Position the crossbow in view
    crossbowModel.position.copy(CROSSBOW_IDLE_POSITION);
    crossbowModel.rotation.copy(CROSSBOW_IDLE_ROTATION);
    
    // Add a dedicated light for better visibility
    const crossbowLight = new THREE.PointLight(0xffffff, 1.5, 1);
    crossbowLight.position.set(0, 0, -0.2);
    crossbowModel.add(crossbowLight);
    
    camera.add(crossbowModel);
    console.log("Crossbow model created");
    
    // Update loaded arrow visibility based on ammo
    updateCrossbowArrowVisibility();
    
    crossbowModel.visible = (inventory[selectedSlot] === WEAPON_TYPES.CROSSBOW);
    return crossbowModel;
}

// Function to update the visibility of the loaded arrow
function updateCrossbowArrowVisibility() {
    if (crossbowModel && crossbowModel.userData.loadedArrow) {
        crossbowModel.userData.loadedArrow.visible = (crossbowAmmo > 0);
    }
}

function fireCrossbow() {
    if (crossbowReloading) return;
    
    if (crossbowAmmo <= 0) {
        // Auto reload when empty
        animateCrossbowReload();
        return;
    }

    // Play crossbow firing sound
    soundManager.play('crossbow_fire', 0.7);
    
    // Decrement ammo
    crossbowAmmo--;
    updateAmmoDisplay();
    
    // Update arrow visibility
    updateCrossbowArrowVisibility();
    
    // Play firing animation
    animateCrossbowFire();
    
    // Create arrow projectile
    createCrossbowBolt();
    
    // Auto reload if empty
    if (crossbowAmmo === 0) {
        setTimeout(animateCrossbowReload, 300);
    }
}

function createCrossbowBolt() {
    // Create bolt group to hold all parts
    const bolt = new THREE.Group();
    
    // Create shaft geometry
    const shaftGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.5, 8);
    const shaftMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x5c2e00, // Wood color
        roughness: 0.6,
        metalness: 0.2
    });
    
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    // Rotate shaft to align with forward direction
    shaft.rotation.x = Math.PI / 2;
    bolt.add(shaft);
    
    // Add tip to arrow
    const tipGeometry = new THREE.ConeGeometry(0.02, 0.08, 8);
    const tipMaterial = new THREE.MeshStandardMaterial({
        color: 0x777777, // Metal color
        roughness: 0.3,
        metalness: 0.9
    });
    
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.rotation.x = Math.PI / 2;
    tip.position.z = -0.29; // Position at front of bolt
    bolt.add(tip);
    
    // Add fletching (feathers) - FIXING POSITION AND ROTATION HERE
    const fletchingGeometry = new THREE.BoxGeometry(0.04, 0.1, 0.01);
    const fletchingMaterial = new THREE.MeshStandardMaterial({
        color: 0xdd0000, // Red color
        roughness: 0.8,
        metalness: 0.1
    });
    
    // First fletching piece - straight vertical
    const fletching1 = new THREE.Mesh(fletchingGeometry, fletchingMaterial);
    fletching1.position.z = 0.24; // Position at back of bolt
    fletching1.position.y = -0.05; // Position LOWER on the bolt (changed from -0.02 to -0.05)
    fletching1.rotation.z = Math.PI / 2; // Make it straight up/down (changed from rotation.x to rotation.z)
    bolt.add(fletching1);
    
    // Second fletching piece - horizontal, crossing the vertical one
    const fletching2 = new THREE.Mesh(fletchingGeometry, fletchingMaterial);
    fletching2.position.z = 0.24; // Position at back of bolt
    fletching2.position.y = -0.05; // Position LOWER on the bolt (changed from -0.02 to -0.05)
    fletching2.rotation.x = Math.PI / 2; // Keep this rotation to make it horizontal
    bolt.add(fletching2);
    
    // Add shadow casting
    shaft.castShadow = true;
    tip.castShadow = true;
    fletching1.castShadow = true;
    fletching2.castShadow = true;
    
    // Get camera position and direction
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);
    
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    camera.getWorldDirection(cameraDirection);
    
    // Position bolt at crossbow
    bolt.position.copy(cameraPosition).addScaledVector(cameraDirection, 0.7);
    
    // Orient bolt to fly in camera direction
    bolt.lookAt(cameraPosition.clone().add(cameraDirection));
    
    // Add bolt data
    bolt.userData = {
        direction: cameraDirection.clone(),
        speed: 3.0, // Faster than bullets
        damage: 20, // High damage for 2-hit kills on normal enemies
        lifetime: 2000, // Longer lifetime
        spawnTime: performance.now(),
        isCrossbowBolt: true
    };
    
    scene.add(bolt);
    bullets.push(bolt); // Add to bullets array for tracking
    
    return bolt;
}

function animateCrossbowFire() {
    if (!crossbowModel || crossbowReloading) return;
    
    // Force cancel any ongoing animation
    if (crossbowAnimationInProgress) {
        cancelAnimationFrame(crossbowAnimationId);
        // Reset position immediately
        crossbowModel.position.copy(CROSSBOW_IDLE_POSITION);
        crossbowModel.rotation.copy(CROSSBOW_IDLE_ROTATION);
    }
    
    // Mark animation as in progress
    crossbowAnimationInProgress = true;
    
    // Animation constants for recoil
    const recoilDuration = 100; // milliseconds
    const returnDuration = 200; // milliseconds
    
    // Start time
    const startTime = performance.now();
    
    function animate() {
        const now = performance.now();
        const elapsed = now - startTime;
        
        if (elapsed < recoilDuration) {
            // Recoil motion
            const progress = elapsed / recoilDuration;
            crossbowModel.position.z = CROSSBOW_IDLE_POSITION.z + (0.15 * progress);
            crossbowModel.position.y = CROSSBOW_IDLE_POSITION.y + (0.04 * progress);
            crossbowModel.rotation.x = CROSSBOW_IDLE_ROTATION.x - (Math.PI / 20 * progress);
            crossbowAnimationId = requestAnimationFrame(animate);
        } else if (elapsed < recoilDuration + returnDuration) {
            // Return motion
            const returnProgress = (elapsed - recoilDuration) / returnDuration;
            crossbowModel.position.z = CROSSBOW_IDLE_POSITION.z + (0.15 * (1 - returnProgress));
            crossbowModel.position.y = CROSSBOW_IDLE_POSITION.y + (0.04 * (1 - returnProgress));
            crossbowModel.rotation.x = CROSSBOW_IDLE_ROTATION.x - (Math.PI / 20 * (1 - returnProgress));
            crossbowAnimationId = requestAnimationFrame(animate);
        } else {
            // Reset to exact original values
            crossbowModel.position.copy(CROSSBOW_IDLE_POSITION);
            crossbowModel.rotation.copy(CROSSBOW_IDLE_ROTATION);
            
            // Clear animation state
            crossbowAnimationInProgress = false;
            crossbowAnimationId = null;
        }
    }
    
    crossbowAnimationId = requestAnimationFrame(animate);
}

function animateCrossbowReload() {
    if (!crossbowModel || crossbowReloading) return;
    
    // Force cancel any ongoing animation
    if (crossbowAnimationInProgress) {
        cancelAnimationFrame(crossbowAnimationId);
        // Reset position immediately
        crossbowModel.position.copy(CROSSBOW_IDLE_POSITION);
        crossbowModel.rotation.copy(CROSSBOW_IDLE_ROTATION);
    }
    
    crossbowReloading = true;
    crossbowAnimationInProgress = true;
    showNotification("Reloading crossbow...", 1800);

    // Play crossbow reload sound
    soundManager.play('crossbow_reload', 0.8);
    
    // Animation constants
    const totalDuration = 1800; // 1.8 seconds reload time
    const startTime = performance.now();
    
    // Hide the loaded arrow during reload
    if (crossbowModel.userData.loadedArrow) {
        crossbowModel.userData.loadedArrow.visible = false;
    }
    
    function animate() {
        const now = performance.now();
        const elapsed = now - startTime;
        
        if (elapsed < totalDuration) {
            const progress = elapsed / totalDuration;
            
            // Reloading animation in three phases
            if (progress < 0.33) {
                // First phase - tilt down to load arrow
                const phaseProgress = progress / 0.33;
                crossbowModel.rotation.x = CROSSBOW_IDLE_ROTATION.x + (Math.PI / 10 * phaseProgress);
                crossbowModel.position.y = CROSSBOW_IDLE_POSITION.y - (0.05 * phaseProgress);
            } else if (progress < 0.66) {
                // Second phase - draw the string back
                const phaseProgress = (progress - 0.33) / 0.33;
                crossbowModel.rotation.x = CROSSBOW_IDLE_ROTATION.x + (Math.PI / 10);
                crossbowModel.position.y = CROSSBOW_IDLE_POSITION.y - 0.05;
                
                // Pulling motion
                crossbowModel.position.z = CROSSBOW_IDLE_POSITION.z - (0.1 * phaseProgress);
            } else {
                // Final phase - return to position
                const phaseProgress = (progress - 0.66) / 0.34;
                crossbowModel.rotation.x = CROSSBOW_IDLE_ROTATION.x + (Math.PI / 10 * (1 - phaseProgress));
                crossbowModel.position.y = CROSSBOW_IDLE_POSITION.y - (0.05 * (1 - phaseProgress));
                crossbowModel.position.z = CROSSBOW_IDLE_POSITION.z - (0.1 * (1 - phaseProgress));
            }
            
            crossbowAnimationId = requestAnimationFrame(animate);
        } else {
            // Reset to exact original values
            crossbowModel.position.copy(CROSSBOW_IDLE_POSITION);
            crossbowModel.rotation.copy(CROSSBOW_IDLE_ROTATION);
            
            // Reload complete
            crossbowAmmo = crossbowMaxAmmo;
            crossbowReloading = false;
            updateAmmoDisplay();
            
            // Show loaded arrow again
            updateCrossbowArrowVisibility();
            
            // Clear animation state
            crossbowAnimationInProgress = false;
            crossbowAnimationId = null;
        }
    }
    
    crossbowAnimationId = requestAnimationFrame(animate);
}

function createMinigunModel() {
    if (minigunModel) {
        camera.remove(minigunModel);
    }
    
    // Create minigun group
    minigunModel = new THREE.Group();
    
    // Create main body
    const bodyGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.6, 12);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.3,
        metalness: 0.8
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI/2; // Lay horizontally
    body.position.set(0, 0, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    minigunModel.add(body);
    
    // Create handle
    const handleGeometry = new THREE.BoxGeometry(0.08, 0.25, 0.1);
    const handleMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.5,
        metalness: 0.7
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, -0.2, -0.15);
    handle.castShadow = true;
    handle.receiveShadow = true;
    minigunModel.add(handle);
    
    // Create rotating barrel group
    const barrelGroup = new THREE.Group();
    barrelGroup.position.set(0, 0, 0.3);
    minigunModel.add(barrelGroup);
    minigunModel.userData.barrelGroup = barrelGroup;
    
    // Create multiple barrels in a circular pattern
    const barrelCount = 6;
    const barrelRadius = 0.08;
    const barrelLength = 0.8;
    const barrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, barrelLength, 8);
    const barrelMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        roughness: 0.2,
        metalness: 0.9
    });
    
    for (let i = 0; i < barrelCount; i++) {
        const angle = (i / barrelCount) * Math.PI * 2;
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.position.set(
            Math.cos(angle) * barrelRadius,
            Math.sin(angle) * barrelRadius,
            barrelLength/2
        );
        barrel.rotation.x = Math.PI/2; // Point forward
        barrel.castShadow = true;
        barrel.receiveShadow = true;
        barrelGroup.add(barrel);
    }
    
    // Create barrel housing
    const housingGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 12);
    const housingMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.3,
        metalness: 0.8
    });
    const housing = new THREE.Mesh(housingGeometry, housingMaterial);
    housing.rotation.x = Math.PI/2;
    housing.position.set(0, 0, 0.1);
    minigunModel.add(housing);
    
    // Create ammunition belt/box
    const ammoBoxGeometry = new THREE.BoxGeometry(0.2, 0.15, 0.25);
    const ammoBoxMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        roughness: 0.5,
        metalness: 0.7
    });
    const ammoBox = new THREE.Mesh(ammoBoxGeometry, ammoBoxMaterial);
    ammoBox.position.set(0.15, -0.1, -0.2);
    minigunModel.add(ammoBox);
    
    // Add a second grip at the front
    const frontGripGeometry = new THREE.BoxGeometry(0.05, 0.1, 0.05);
    const frontGrip = new THREE.Mesh(frontGripGeometry, handleMaterial);
    frontGrip.position.set(0, -0.1, 0.2);
    minigunModel.add(frontGrip);
    
    // Add heat indicators (will glow red when overheating)
    const heatIndicatorGeometry = new THREE.BoxGeometry(0.03, 0.03, 0.15);
    const heatIndicatorMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 0.5
    });
    const heatIndicator = new THREE.Mesh(heatIndicatorGeometry, heatIndicatorMaterial);
    heatIndicator.position.set(0.06, 0.1, -0.1);
    minigunModel.add(heatIndicator);
    minigunModel.userData.heatIndicator = heatIndicator;
    
    // Add a dedicated light for better visibility
    const minigunLight = new THREE.PointLight(0xffffff, 1.5, 1);
    minigunLight.position.set(0, 0, -0.2);
    minigunModel.add(minigunLight);
    
    // Position the minigun in view
    minigunModel.position.copy(MINIGUN_IDLE_POSITION);
    minigunModel.rotation.copy(MINIGUN_IDLE_ROTATION);
    
    camera.add(minigunModel);
    console.log("Minigun model created");
    
    minigunModel.visible = (inventory[selectedSlot] === WEAPON_TYPES.MINIGUN);
    return minigunModel;
}

function fireMinigun() {
    if (minigunReloading) return;
    
    // If not spinning yet, start spinning
    if (!minigunSpinning) {
        startMinigunSpin();
        return; // Don't fire until spinning
    }
    
    // Check ammo - FIXED RELOAD HANDLING
    if (minigunAmmo <= 0) {
        // Stop spinning and force reload when empty
        stopMinigunSpin();
        
        // Force clear any existing animation or reload state
        if (minigunAnimationInProgress) {
            cancelAnimationFrame(minigunAnimationId);
            minigunAnimationInProgress = false;
            minigunAnimationId = null;
        }
        
        // Make sure the reloading flag is properly reset
        minigunReloading = false;
        
        // Now trigger reload
        animateMinigunReload();
        return;
    }
    
    // Only fire when at full spin
    if (minigunSpinSpeed < 1) return;
    
    // Decrement ammo
    minigunAmmo--;
    updateAmmoDisplay();
    
    // Reduce heat increase from 0.02 to 0.01 to allow 100 shots before overheating
    minigunHeatLevel = Math.min(1, minigunHeatLevel + 0.01);
    updateMinigunHeat();
    
    // Play firing animation
    animateMinigunFire();
    
    // Create bullet with increasing spread based on heat
    createMinigunBullet();
    
    // Create muzzle flash effect for visual feedback
    createMuzzleFlash(camera);
    
    // Auto reload when empty
    if (minigunAmmo === 0) {
        setTimeout(() => {
            // Make sure we're not in the middle of another operation
            if (!minigunReloading && !minigunAnimationInProgress) {
                animateMinigunReload();
            }
        }, 300);
    }
}

function startMinigunSpin() {
    // Reset spin state to begin fresh spin-up
    minigunSpinning = true;
    minigunSpinSpeed = 0;
    
    // Clear any existing timeouts
    if (minigunSpinTimeout) {
        clearTimeout(minigunSpinTimeout);
        minigunSpinTimeout = null;
    }
    
    // Clear any existing firing intervals
    if (minigunFireInterval) {
        clearInterval(minigunFireInterval);
        minigunFireInterval = null;
    }
    
    // Stop any existing sounds
    if (minigunFireSound) {
        minigunFireSound.pause();
        minigunFireSound = null;
    }
    
    if (minigunSpindownSound) {
        minigunSpindownSound.pause();
        minigunSpindownSound = null;
    }
    
    // Play spin-up sound
    minigunSpinupSound = soundManager.sounds['minigun_spinup'].cloneNode();
    minigunSpinupSound.volume = 0.7;
    minigunSpinupSound.play().catch(e => console.log("Sound play prevented:", e));
    
    // Schedule firing to start after full spin-up
    setTimeout(() => {
        // Only start firing if still spinning AND mouse still down
        if (minigunSpinning && mouseIsDown) {
            // Start the firing loop sound once fully spun up
            minigunFireSound = soundManager.sounds['minigun_fire'].cloneNode();
            minigunFireSound.volume = 0.6;
            minigunFireSound.loop = true;
            minigunFireSound.play().catch(e => console.log("Sound play prevented:", e));
            
            minigunFireInterval = setInterval(() => {
                // Check if we're still allowed to fire
                if (mouseIsDown && minigunSpinning && !minigunReloading) {
                    fireMinigun();
                } else {
                    // If conditions no longer met, clear the interval
                    clearInterval(minigunFireInterval);
                    minigunFireInterval = null;
                    
                    // Stop the firing sound
                    if (minigunFireSound) {
                        minigunFireSound.pause();
                        minigunFireSound = null;
                    }
                }
            }, 70);
        }
    }, 1000); // 1 second spin-up time
}

function stopMinigunSpin() {
    // Stop firing immediately but keep spinning for a bit
    if (minigunFireInterval) {
        clearInterval(minigunFireInterval);
        minigunFireInterval = null;
    }
    
    // Stop the firing sound immediately
    if (minigunFireSound) {
        minigunFireSound.pause();
        minigunFireSound = null;
    }
    
    if (minigunSpinupSound) {
        minigunSpinupSound.pause();
        minigunSpinupSound = null;
    }
    
    // Clear any existing spin down timeout
    if (minigunSpinTimeout) {
        clearTimeout(minigunSpinTimeout);
        minigunSpinTimeout = null;
    }
    
    // Play spin down sound
    minigunSpindownSound = soundManager.sounds['minigun_spindown'].cloneNode();
    minigunSpindownSound.volume = 0.7;
    minigunSpindownSound.play().catch(e => console.log("Sound play prevented:", e));
    
    // Set a timeout to actually stop spinning after 1 second
    minigunSpinTimeout = setTimeout(() => {
        // Only now set spinning to false so it begins to decelerate
        minigunSpinning = false;
        
        // Start minigun cooldown for heat reduction
        startMinigunCooldown();
    }, 1000);
}

function startMinigunCooldown() {
    if (minigunHeatLevel <= 0) return;
    
    const cooldownInterval = setInterval(() => {
        if (!minigunModel) {
            clearInterval(cooldownInterval);
            return;
        }
        
        // Reduce heat
        minigunHeatLevel = Math.max(0, minigunHeatLevel - 0.05);
        updateMinigunHeat();
        
        // Clear interval when fully cooled
        if (minigunHeatLevel <= 0) {
            clearInterval(cooldownInterval);
        }
    }, 200);
}

function createMinigunBullet() {
    // Use smaller bullet geometry to reduce memory usage
    const bulletGeometry = new THREE.SphereGeometry(0.015, 6, 6);  // Smaller and simpler geometry
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Add shadow casting to bullet
    bullet.castShadow = true;
    
    // Get camera position and direction
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);
    
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    camera.getWorldDirection(cameraDirection);
    
    // Apply increasing spread based on heat level
    const spreadFactor = 0.02 * minigunHeatLevel;
    const randomSpreadX = (Math.random() - 0.5) * spreadFactor;
    const randomSpreadY = (Math.random() - 0.5) * spreadFactor;
    
    // Create a rotation matrix for the spread
    const rotationMatrix = new THREE.Matrix4().makeRotationY(randomSpreadX);
    rotationMatrix.multiply(new THREE.Matrix4().makeRotationX(randomSpreadY));
    
    // Apply rotation to direction
    const spreadDirection = cameraDirection.clone().applyMatrix4(rotationMatrix).normalize();
    
    // Position bullet at gun barrel with slight offset for current barrel position
    const barrelOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.1, 
        (Math.random() - 0.5) * 0.1,
        0
    );
    bullet.position.copy(cameraPosition).addScaledVector(cameraDirection, 0.8).add(barrelOffset);
    
    // Orient bullet
    bullet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), spreadDirection);
    
    // Add bullet data with SHORTER lifetime to reduce active bullets
    bullet.userData = {
        direction: spreadDirection,
        speed: 3.0, // Fast bullets
        damage: 8, // Lower damage per bullet but high rate of fire
        lifetime: 500, // REDUCED from 1000ms to 500ms lifetime
        spawnTime: performance.now()
    };
    
    scene.add(bullet);
    bullets.push(bullet);
    
    return bullet;
}

function animateMinigunFire() {
    if (!minigunModel) return;
    
    // Subtle recoil effect
    const kickbackAmount = 0.02;
    const returnSpeed = 0.1;
    
    // Apply recoil - move slightly back
    minigunModel.position.z += kickbackAmount;
    
    // Return to original position gradually
    setTimeout(() => {
        if (minigunModel) {
            minigunModel.position.z = THREE.MathUtils.lerp(
                minigunModel.position.z, 
                MINIGUN_IDLE_POSITION.z, 
                returnSpeed
            );
        }
    }, 30);
    
    // Add screen shake proportional to heat level
    addScreenShake(0.05 + minigunHeatLevel * 0.1, 50);
}

function animateMinigunReload() {
    if (!minigunModel) return;
    
    // If already reloading, don't start another reload animation
    if (minigunReloading) return;
    
    // Force stop spinning
    minigunSpinning = false;
    if (minigunFireInterval) {
        clearInterval(minigunFireInterval);
        minigunFireInterval = null;
    }
    
    // Set states properly
    minigunReloading = true;
    minigunAnimationInProgress = true;
    showNotification("Reloading minigun...", 3000);
    
    // Animation constants
    const totalDuration = 3000; // 3 seconds reload time
    const startTime = performance.now();
    
    function animate() {
        const now = performance.now();
        const elapsed = now - startTime;
        
        if (elapsed < totalDuration) {
            const progress = elapsed / totalDuration;
            
            // Reload animation
            if (progress < 0.3) {
                // First stage - tilt down
                const stageProgress = progress / 0.3;
                minigunModel.rotation.x = MINIGUN_IDLE_ROTATION.x + (Math.PI / 12 * stageProgress);
            } else if (progress < 0.6) {
                // Second stage - change ammo belt
                const stageProgress = (progress - 0.3) / 0.3;
                minigunModel.rotation.z = MINIGUN_IDLE_ROTATION.z - (Math.PI / 8 * Math.sin(stageProgress * Math.PI));
            } else {
                // Final stage - return to position
                const stageProgress = (progress - 0.6) / 0.4;
                minigunModel.rotation.x = MINIGUN_IDLE_ROTATION.x + (Math.PI / 12 * (1 - stageProgress));
                minigunModel.rotation.z = MINIGUN_IDLE_ROTATION.z;
            }
            
            minigunAnimationId = requestAnimationFrame(animate);
        } else {
            // Reset to exact original values
            minigunModel.position.copy(MINIGUN_IDLE_POSITION);
            minigunModel.rotation.copy(MINIGUN_IDLE_ROTATION);
            
            // Reload complete
            minigunAmmo = minigunMaxAmmo;
            minigunReloading = false;
            updateAmmoDisplay();
            
            // Clear animation state
            minigunAnimationInProgress = false;
            minigunAnimationId = null;
        }
    }
    
    minigunAnimationId = requestAnimationFrame(animate);
}

function createSniperRifleModel() {
    if (sniperRifleModel) {
        camera.remove(sniperRifleModel);
    }
    
    // Create sniper rifle group
    sniperRifleModel = new THREE.Group();
    
    // Create rifle body
    const bodyGeometry = new THREE.BoxGeometry(0.1, 0.15, 0.9);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.3,
        metalness: 0.8
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    sniperRifleModel.add(body);
    
    // Create rifle barrel (long)
    const barrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 16);
    const barrelMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        roughness: 0.2,
        metalness: 0.9
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, 0.6);
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    sniperRifleModel.add(barrel);
    
    // Create rifle handle/grip
    const handleGeometry = new THREE.BoxGeometry(0.08, 0.25, 0.1);
    const handleMaterial = new THREE.MeshStandardMaterial({
        color: 0x5c2e00, // Brown wooden stock
        roughness: 0.7,
        metalness: 0.1
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, -0.2, -0.2);
    handle.castShadow = true;
    handle.receiveShadow = true;
    sniperRifleModel.add(handle);
    
    // Create rifle stock
    const stockGeometry = new THREE.BoxGeometry(0.08, 0.15, 0.4);
    const stockMaterial = new THREE.MeshStandardMaterial({
        color: 0x5c2e00, // Brown wooden stock
        roughness: 0.7,
        metalness: 0.1
    });
    const stock = new THREE.Mesh(stockGeometry, stockMaterial);
    stock.position.set(0, -0.05, -0.4);
    stock.castShadow = true;
    stock.receiveShadow = true;
    sniperRifleModel.add(stock);
    
    // Create scope
    const scopeGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.25, 16);
    const scopeMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.5,
        metalness: 0.8
    });
    const scope = new THREE.Mesh(scopeGeometry, scopeMaterial);
    scope.position.set(0, 0.12, 0.1);
    scope.rotation.x = Math.PI / 2;
    scope.castShadow = true;
    scope.receiveShadow = true;
    sniperRifleModel.add(scope);
    
    // Create scope lens (front)
    const lensGeometry = new THREE.CircleGeometry(0.04, 16);
    const lensMaterial = new THREE.MeshStandardMaterial({
        color: 0x88ccff,
        roughness: 0.2,
        metalness: 0.9,
        emissive: 0x113355,
        emissiveIntensity: 0.3
    });
    const frontLens = new THREE.Mesh(lensGeometry, lensMaterial);
    frontLens.position.set(0, 0.12, 0.23);
    frontLens.rotation.y = Math.PI;
    sniperRifleModel.add(frontLens);
    
    // Position the rifle in view
    sniperRifleModel.position.copy(SNIPER_RIFLE_IDLE_POSITION);
    sniperRifleModel.rotation.copy(SNIPER_RIFLE_IDLE_ROTATION);
    
    // Add a dedicated light
    const rifleLight = new THREE.PointLight(0xffffff, 1.5, 1);
    rifleLight.position.set(0, 0, -0.2);
    sniperRifleModel.add(rifleLight);
    
    camera.add(sniperRifleModel);
    console.log("Sniper rifle model created");
    
    sniperRifleModel.visible = (inventory[selectedSlot] === WEAPON_TYPES.SNIPER_RIFLE);
    return sniperRifleModel;
}

function fireSniperRifle() {
    if (sniperRifleReloading) return;
    
    if (sniperRifleAmmo <= 0) {
        // Auto reload when empty
        animateSniperRifleReload();
        return;
    }

    // Play sniper rifle firing sound
    soundManager.play('sniper_rifle_fire', 0.8);
    
    // Decrement ammo
    sniperRifleAmmo--;
    updateAmmoDisplay();
    
    // Play firing animation
    animateSniperRiflefire();
    
    // Create bullet with high accuracy
    createSniperBullet();
    
    // Automatically begin reload after firing since it only has one shot
    setTimeout(animateSniperRifleReload, 300);
}

function createSniperBullet() {
    // Create bullet geometry
    const bulletGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Add shadow casting to bullet
    bullet.castShadow = true;
    
    // Get camera position and direction
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);
    
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    camera.getWorldDirection(cameraDirection);
    
    // Position bullet at gun barrel
    bullet.position.copy(cameraPosition).addScaledVector(cameraDirection, 1.0);
    
    // Orient bullet
    bullet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), cameraDirection);
    
    // Add bullet data - high damage, high speed, long range
    bullet.userData = {
        direction: cameraDirection.clone(),
        speed: 4.0,
        damage: 200,
        lifetime: 3000,
        spawnTime: performance.now(),
        isSniperBullet: true, // Mark as sniper bullet for special handling
        origin: cameraPosition.clone() // Store origin for raycasting
    };
    
    scene.add(bullet);
    bullets.push(bullet);
    
    // Add muzzle flash effect
    createMuzzleFlash(camera);
    
    // For sniper rifles, also perform immediate raycast for better hit detection
    performSniperRaycast(cameraPosition, cameraDirection, bullet.userData.damage);
    
    return bullet;
}

// New function for sniper raycasting
function performSniperRaycast(origin, direction, damage) {
    // Create a raycaster
    const raycaster = new THREE.Raycaster(origin, direction, 0, 1000);
    
    // Create an array of meshes to check against
    const targetMeshes = activeEnemies.map(enemy => {
        // Store reference to enemy in the mesh for identification
        enemy.userData.enemyReference = enemy;
        return enemy;
    });
    
    // Perform the raycast
    const intersects = raycaster.intersectObjects(targetMeshes);
    
    if (intersects.length > 0) {
        // Hit the first enemy in the path
        const hitResult = intersects[0];
        const hitEnemy = hitResult.object.userData.enemyReference;
        
        // Apply damage
        damageEnemy(hitEnemy, damage);
        
        // Create hit effect at the exact hit point
        createHitEffect(hitResult.point);
        
        // Show hit marker
        showHitMarker();
        
        return true; // Hit something
    }
    
    return false; // Didn't hit anything
}

function animateSniperRiflefire() {
    if (!sniperRifleModel || sniperRifleReloading) return;
    
    // Force cancel any ongoing animation
    if (sniperRifleAnimationInProgress) {
        cancelAnimationFrame(sniperRifleAnimationId);
        // Reset position immediately
        sniperRifleModel.position.copy(SNIPER_RIFLE_IDLE_POSITION);
        sniperRifleModel.rotation.copy(SNIPER_RIFLE_IDLE_ROTATION);
    }
    
    // Mark animation as in progress
    sniperRifleAnimationInProgress = true;
    
    // Animation constants - stronger recoil than other weapons
    const recoilDuration = 150; // milliseconds
    const returnDuration = 250; // milliseconds
    
    // Start time
    const startTime = performance.now();
    
    // Add screen shake for powerful rifle
    addScreenShake(0.3, 300);
    
    function animate() {
        const now = performance.now();
        const elapsed = now - startTime;
        
        if (elapsed < recoilDuration) {
            // Recoil motion - stronger than other weapons
            const progress = elapsed / recoilDuration;
            sniperRifleModel.position.z = SNIPER_RIFLE_IDLE_POSITION.z + (0.3 * progress);
            sniperRifleModel.position.y = SNIPER_RIFLE_IDLE_POSITION.y + (0.08 * progress);
            sniperRifleModel.rotation.x = SNIPER_RIFLE_IDLE_ROTATION.x - (Math.PI / 18 * progress);
            sniperRifleAnimationId = requestAnimationFrame(animate);
        } else if (elapsed < recoilDuration + returnDuration) {
            // Return motion
            const returnProgress = (elapsed - recoilDuration) / returnDuration;
            sniperRifleModel.position.z = SNIPER_RIFLE_IDLE_POSITION.z + (0.3 * (1 - returnProgress));
            sniperRifleModel.position.y = SNIPER_RIFLE_IDLE_POSITION.y + (0.08 * (1 - returnProgress));
            sniperRifleModel.rotation.x = SNIPER_RIFLE_IDLE_ROTATION.x - (Math.PI / 18 * (1 - returnProgress));
            sniperRifleAnimationId = requestAnimationFrame(animate);
        } else {
            // Reset to exact original values
            sniperRifleModel.position.copy(SNIPER_RIFLE_IDLE_POSITION);
            sniperRifleModel.rotation.copy(SNIPER_RIFLE_IDLE_ROTATION);
            
            // Clear animation state
            sniperRifleAnimationInProgress = false;
            sniperRifleAnimationId = null;
            
            // If scoped, exit scope view after firing
            if (isScoped) {
                toggleScope();
            }
        }
    }
    
    sniperRifleAnimationId = requestAnimationFrame(animate);
}

function animateSniperRifleReload() {
    if (!sniperRifleModel || sniperRifleReloading) return;
    
    // Force cancel any ongoing animation
    if (sniperRifleAnimationInProgress) {
        cancelAnimationFrame(sniperRifleAnimationId);
        // Reset position immediately
        sniperRifleModel.position.copy(SNIPER_RIFLE_IDLE_POSITION);
        sniperRifleModel.rotation.copy(SNIPER_RIFLE_IDLE_ROTATION);
    }
    
    sniperRifleReloading = true;
    sniperRifleAnimationInProgress = true;
    showNotification("Reloading sniper rifle...", 2500);

    // Play sniper rifle reload sound
    soundManager.play('sniper_rifle_reload', 0.8);
    
    // Exit scope view if reloading while scoped
    if (isScoped) {
        toggleScope();
    }
    
    // Animation constants
    const totalDuration = 2500; // 2.5 seconds reload time (longer for sniper)
    const startTime = performance.now();
    
    function animate() {
        const now = performance.now();
        const elapsed = now - startTime;
        
        if (elapsed < totalDuration) {
            const progress = elapsed / totalDuration;
            
            // Reload animation
            if (progress < 0.4) {
                // First stage - tilt down to access bolt
                const stageProgress = progress / 0.4;
                sniperRifleModel.rotation.x = SNIPER_RIFLE_IDLE_ROTATION.x + (Math.PI / 8 * stageProgress);
            } else if (progress < 0.6) {
                // Second stage - pull bolt back
                const stageProgress = (progress - 0.4) / 0.2;
                sniperRifleModel.rotation.x = SNIPER_RIFLE_IDLE_ROTATION.x + Math.PI / 8;
                sniperRifleModel.position.z = SNIPER_RIFLE_IDLE_POSITION.z - (0.15 * stageProgress);
            } else if (progress < 0.8) {
                // Third stage - push bolt forward
                const stageProgress = (progress - 0.6) / 0.2;
                sniperRifleModel.rotation.x = SNIPER_RIFLE_IDLE_ROTATION.x + Math.PI / 8;
                sniperRifleModel.position.z = SNIPER_RIFLE_IDLE_POSITION.z - (0.15 * (1 - stageProgress));
            } else {
                // Final stage - return to position
                const stageProgress = (progress - 0.8) / 0.2;
                sniperRifleModel.rotation.x = SNIPER_RIFLE_IDLE_ROTATION.x + (Math.PI / 8 * (1 - stageProgress));
            }
            
            sniperRifleAnimationId = requestAnimationFrame(animate);
        } else {
            // Reset to exact original values
            sniperRifleModel.position.copy(SNIPER_RIFLE_IDLE_POSITION);
            sniperRifleModel.rotation.copy(SNIPER_RIFLE_IDLE_ROTATION);
            
            // Reload complete
            sniperRifleAmmo = sniperRifleMaxAmmo;
            sniperRifleReloading = false;
            updateAmmoDisplay();
            
            // Clear animation state
            sniperRifleAnimationInProgress = false;
            sniperRifleAnimationId = null;
        }
    }
    
    sniperRifleAnimationId = requestAnimationFrame(animate);
}

function createMuzzleFlash(parentObject) {
    // Create a light for the muzzle flash
    const flashLight = new THREE.PointLight(0xffaa00, 3, 5);
    flashLight.position.set(0, 0, -1);
    parentObject.add(flashLight);
    
    // Create a visual mesh for the flash
    const flashGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.8
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.set(0, 0, -1);
    parentObject.add(flash);
    
    // Remove after a short duration
    setTimeout(() => {
        parentObject.remove(flashLight);
        parentObject.remove(flash);
    }, 100);
}

function toggleScope() {
    isScoped = !isScoped;
    
    if (isScoped) {
        // Save normal FOV if we haven't already
        if (!normalFOV) {
            normalFOV = camera.fov;
        }
        
        // Change FOV to zoom in
        camera.fov = 20; // Narrower FOV for zoom
        camera.updateProjectionMatrix();
        
        // Create or show scope overlay
        createScopeOverlay();
        
        // Hide sniper model while scoped
        if (sniperRifleModel) {
            sniperRifleModel.visible = false;
        }
        
        // Hide crosshair and replace with scope reticle
        hideCrosshair();
    } else {
        // Restore normal FOV
        camera.fov = normalFOV;
        camera.updateProjectionMatrix();
        
        // Remove scope overlay
        removeScopeOverlay();
        
        // Show sniper model again
        if (sniperRifleModel && inventory[selectedSlot] === WEAPON_TYPES.SNIPER_RIFLE) {
            sniperRifleModel.visible = true;
        }
        
        // Show crosshair again
        showCrosshair();
    }
}

// Create a scope overlay effect
function createScopeOverlay() {
    // Remove any existing scope overlay
    removeScopeOverlay();
    
    // Create the scope container
    const scopeContainer = document.createElement('div');
    scopeContainer.id = 'scopeOverlay';
    scopeContainer.style.position = 'absolute';
    scopeContainer.style.top = '0';
    scopeContainer.style.left = '0';
    scopeContainer.style.width = '100%';
    scopeContainer.style.height = '100%';
    scopeContainer.style.zIndex = '100';
    scopeContainer.style.pointerEvents = 'none';
    
    // Create black circle border
    const borderRadius = 40; // % of screen height
    const scopeBorder = document.createElement('div');
    scopeBorder.style.position = 'absolute';
    scopeBorder.style.top = '50%';
    scopeBorder.style.left = '50%';
    scopeBorder.style.width = `${borderRadius * 2}vh`;
    scopeBorder.style.height = `${borderRadius * 2}vh`;
    scopeBorder.style.borderRadius = '50%';
    scopeBorder.style.transform = 'translate(-50%, -50%)';
    scopeBorder.style.boxShadow = '0 0 0 100vmax rgba(0, 0, 0, 0.9)';
    scopeContainer.appendChild(scopeBorder);
    
    // Create crosshairs in the scope
    const reticleSize = 30; // % of scope size
    const reticle = document.createElement('div');
    reticle.style.position = 'absolute';
    reticle.style.top = '50%';
    reticle.style.left = '50%';
    reticle.style.width = `${reticleSize}%`;
    reticle.style.height = `${reticleSize}%`;
    reticle.style.transform = 'translate(-50%, -50%)';
    
    // Create horizontal line
    const horizontalLine = document.createElement('div');
    horizontalLine.style.position = 'absolute';
    horizontalLine.style.top = '50%';
    horizontalLine.style.left = '0';
    horizontalLine.style.width = '100%';
    horizontalLine.style.height = '2px';
    horizontalLine.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    horizontalLine.style.transform = 'translateY(-50%)';
    reticle.appendChild(horizontalLine);
    
    // Create vertical line
    const verticalLine = document.createElement('div');
    verticalLine.style.position = 'absolute';
    verticalLine.style.top = '0';
    verticalLine.style.left = '50%';
    verticalLine.style.width = '2px';
    verticalLine.style.height = '100%';
    verticalLine.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    verticalLine.style.transform = 'translateX(-50%)';
    reticle.appendChild(verticalLine);
    
    // Create center dot
    const centerDot = document.createElement('div');
    centerDot.style.position = 'absolute';
    centerDot.style.top = '50%';
    centerDot.style.left = '50%';
    centerDot.style.width = '6px';
    centerDot.style.height = '6px';
    centerDot.style.borderRadius = '50%';
    centerDot.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
    centerDot.style.transform = 'translate(-50%, -50%)';
    reticle.appendChild(centerDot);
    
    scopeBorder.appendChild(reticle);
    
    document.body.appendChild(scopeContainer);
}

function removeScopeOverlay() {
    const existingOverlay = document.getElementById('scopeOverlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
}

function createAssaultRifleModel() {
    if (assaultRifleModel) {
        camera.remove(assaultRifleModel);
    }
    
    // Create assault rifle group
    assaultRifleModel = new THREE.Group();
    
    // Create rifle body
    const bodyGeometry = new THREE.BoxGeometry(0.1, 0.15, 0.6);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.3,
        metalness: 0.8
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    assaultRifleModel.add(body);
    
    // Create rifle barrel (longer than pistol)
    const barrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 16);
    const barrelMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        roughness: 0.2,
        metalness: 0.9
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, 0.4);
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    assaultRifleModel.add(barrel);
    
    // Create rifle handle/grip
    const handleGeometry = new THREE.BoxGeometry(0.08, 0.25, 0.1);
    const handleMaterial = new THREE.MeshStandardMaterial({
        color: 0x5c2e00, // Brown wooden stock
        roughness: 0.7,
        metalness: 0.1
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, -0.2, -0.2);
    handle.castShadow = true;
    handle.receiveShadow = true;
    assaultRifleModel.add(handle);
    
    // Create rifle stock
    const stockGeometry = new THREE.BoxGeometry(0.08, 0.15, 0.25);
    const stockMaterial = new THREE.MeshStandardMaterial({
        color: 0x5c2e00, // Brown wooden stock
        roughness: 0.7,
        metalness: 0.1
    });
    const stock = new THREE.Mesh(stockGeometry, stockMaterial);
    stock.position.set(0, -0.05, -0.4);
    stock.castShadow = true;
    stock.receiveShadow = true;
    assaultRifleModel.add(stock);
    
    // Create magazine
    const magGeometry = new THREE.BoxGeometry(0.08, 0.2, 0.1);
    const magMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.5,
        metalness: 0.7
    });
    const magazine = new THREE.Mesh(magGeometry, magMaterial);
    magazine.position.set(0, -0.15, 0);
    magazine.castShadow = true;
    magazine.receiveShadow = true;
    assaultRifleModel.add(magazine);
    
    // Position the rifle in view using constants
    assaultRifleModel.position.copy(ASSAULT_RIFLE_IDLE_POSITION);
    assaultRifleModel.rotation.copy(ASSAULT_RIFLE_IDLE_ROTATION);
    
    // Add a dedicated light
    const rifleLight = new THREE.PointLight(0xffffff, 1.5, 1);
    rifleLight.position.set(0, 0, -0.2);
    assaultRifleModel.add(rifleLight);
    
    camera.add(assaultRifleModel);
    console.log("Assault rifle model created");
    
    assaultRifleModel.visible = (inventory[selectedSlot] === WEAPON_TYPES.ASSAULT_RIFLE);
    return assaultRifleModel;
}

function fireAssaultRifle() {
    if (assaultRifleReloading) return;
    
    if (assaultRifleAmmo <= 0) {
        // Auto reload when empty
        animateAssaultRifleReload();
        return;
    }

    // Play assault rifle firing sound
    soundManager.play('assault_rifle_fire', 0.6);
    
    // Decrement ammo
    assaultRifleAmmo--;
    updateAmmoDisplay();
    
    // Play firing animation
    animateAssaultRifleFire();
    
    // Create bullet with slight spread
    createAssaultRifleBullet();
    
    // Auto reload when empty
    if (assaultRifleAmmo === 0) {
        setTimeout(animateAssaultRifleReload, 300);
    }
}

function createAssaultRifleBullet() {
    // Create bullet geometry
    const bulletGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Add shadow casting to bullet
    bullet.castShadow = true;
    
    // Get camera position and direction
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);
    
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    camera.getWorldDirection(cameraDirection);
    
    // Apply slight random spread to direction
    const spreadFactor = 0.01;  // Lower value = more accurate
    const randomSpreadX = (Math.random() - 0.5) * spreadFactor;
    const randomSpreadY = (Math.random() - 0.5) * spreadFactor;
    
    // Create a rotation matrix for the spread
    const rotationMatrix = new THREE.Matrix4().makeRotationY(randomSpreadX);
    rotationMatrix.multiply(new THREE.Matrix4().makeRotationX(randomSpreadY));
    
    // Apply rotation to direction
    const spreadDirection = cameraDirection.clone().applyMatrix4(rotationMatrix).normalize();
    
    // Position bullet at gun barrel
    bullet.position.copy(cameraPosition).addScaledVector(cameraDirection, 0.7);
    
    // Orient bullet
    bullet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), spreadDirection);
    
    // Add bullet data
    bullet.userData = {
        direction: spreadDirection,
        speed: 2.5, // Faster than pistol bullets
        damage: 10, // Less damage per shot than pistol but fires faster
        lifetime: 1000,
        spawnTime: performance.now()
    };
    
    scene.add(bullet);
    bullets.push(bullet);
    
    return bullet;
}

function animateAssaultRifleFire() {
    if (!assaultRifleModel || assaultRifleReloading) return;
    
    // Force cancel any ongoing animation
    if (assaultRifleAnimationInProgress) {
        cancelAnimationFrame(assaultRifleAnimationId);
        // Reset position immediately
        assaultRifleModel.position.copy(ASSAULT_RIFLE_IDLE_POSITION);
        assaultRifleModel.rotation.copy(ASSAULT_RIFLE_IDLE_ROTATION);
    }
    
    // Mark animation as in progress
    assaultRifleAnimationInProgress = true;
    
    // Animation constants - shorter recoil for rapid fire
    const recoilDuration = 50; // milliseconds
    const returnDuration = 80; // milliseconds
    
    // Start time
    const startTime = performance.now();
    
    function animate() {
        const now = performance.now();
        const elapsed = now - startTime;
        
        if (elapsed < recoilDuration) {
            // Recoil motion
            const progress = elapsed / recoilDuration;
            assaultRifleModel.position.z = ASSAULT_RIFLE_IDLE_POSITION.z + (0.05 * progress);
            assaultRifleModel.position.y = ASSAULT_RIFLE_IDLE_POSITION.y + (0.02 * progress);
            assaultRifleModel.rotation.x = ASSAULT_RIFLE_IDLE_ROTATION.x - (Math.PI / 60 * progress);
            assaultRifleAnimationId = requestAnimationFrame(animate);
        } else if (elapsed < recoilDuration + returnDuration) {
            // Return motion
            const returnProgress = (elapsed - recoilDuration) / returnDuration;
            assaultRifleModel.position.z = ASSAULT_RIFLE_IDLE_POSITION.z + (0.05 * (1 - returnProgress));
            assaultRifleModel.position.y = ASSAULT_RIFLE_IDLE_POSITION.y + (0.02 * (1 - returnProgress));
            assaultRifleModel.rotation.x = ASSAULT_RIFLE_IDLE_ROTATION.x - (Math.PI / 60 * (1 - returnProgress));
            assaultRifleAnimationId = requestAnimationFrame(animate);
        } else {
            // Reset to exact original values
            assaultRifleModel.position.copy(ASSAULT_RIFLE_IDLE_POSITION);
            assaultRifleModel.rotation.copy(ASSAULT_RIFLE_IDLE_ROTATION);
            
            // Clear animation state
            assaultRifleAnimationInProgress = false;
            assaultRifleAnimationId = null;
        }
    }
    
    assaultRifleAnimationId = requestAnimationFrame(animate);
}

function animateAssaultRifleReload() {
    if (!assaultRifleModel || assaultRifleReloading) return;
    
    // Force cancel any ongoing animation
    if (assaultRifleAnimationInProgress) {
        cancelAnimationFrame(assaultRifleAnimationId);
        // Reset position immediately
        assaultRifleModel.position.copy(ASSAULT_RIFLE_IDLE_POSITION);
        assaultRifleModel.rotation.copy(ASSAULT_RIFLE_IDLE_ROTATION);
    }
    
    assaultRifleReloading = true;
    assaultRifleAnimationInProgress = true;
    showNotification("Reloading assault rifle...", 2000);

    // Play assault rifle reload sound
    soundManager.play('assault_rifle_reload', 0.8);
    
    // Animation constants
    const totalDuration = 2000; // 2 second reload time
    const startTime = performance.now();
    
    function animate() {
        const now = performance.now();
        const elapsed = now - startTime;
        
        if (elapsed < totalDuration) {
            const progress = elapsed / totalDuration;
            
            // Magazine change animation
            if (progress < 0.3) {
                // First stage - tilt down
                const stageProgress = progress / 0.3;
                assaultRifleModel.rotation.x = ASSAULT_RIFLE_IDLE_ROTATION.x + (Math.PI / 12 * stageProgress);
            } else if (progress < 0.6) {
                // Second stage - rotate to the side slightly
                const stageProgress = (progress - 0.3) / 0.3;
                assaultRifleModel.rotation.x = ASSAULT_RIFLE_IDLE_ROTATION.x + Math.PI / 12;
                assaultRifleModel.rotation.z = ASSAULT_RIFLE_IDLE_ROTATION.z - (Math.PI / 10 * stageProgress);
            } else {
                // Third stage - return to position
                const stageProgress = (progress - 0.6) / 0.4;
                assaultRifleModel.rotation.x = ASSAULT_RIFLE_IDLE_ROTATION.x + (Math.PI / 12 * (1 - stageProgress));
                assaultRifleModel.rotation.z = ASSAULT_RIFLE_IDLE_ROTATION.z - (Math.PI / 10 * (1 - stageProgress));
            }
            
            assaultRifleAnimationId = requestAnimationFrame(animate);
        } else {
            // Reset to exact original values
            assaultRifleModel.position.copy(ASSAULT_RIFLE_IDLE_POSITION);
            assaultRifleModel.rotation.copy(ASSAULT_RIFLE_IDLE_ROTATION);
            
            // Reload complete
            assaultRifleAmmo = assaultRifleMaxAmmo;
            assaultRifleReloading = false;
            updateAmmoDisplay();
            
            // Clear animation state
            assaultRifleAnimationInProgress = false;
            assaultRifleAnimationId = null;
        }
    }
    
    assaultRifleAnimationId = requestAnimationFrame(animate);
}

// Function to move item from inventory to bar
function moveFromInventoryToBar(invSlot, barSlot) {
    if (inventoryItems[invSlot] === null) return;
    
    const temp = inventory[barSlot];
    inventory[barSlot] = inventoryItems[invSlot];
    inventoryItems[invSlot] = temp;
    
    updateItemBar();
    updateInventoryDisplay();
    updateWeaponVisibility();
}

// Function to move item from bar to inventory
function moveFromBarToInventory(barSlot, invSlot) {
    if (inventory[barSlot] === null) return;
    
    const temp = inventoryItems[invSlot];
    inventoryItems[invSlot] = inventory[barSlot];
    inventory[barSlot] = temp;
    
    updateItemBar();
    updateInventoryDisplay();
}

// Updated toggleInventory function
function toggleInventory() {
    if (!gameStarted || isPaused) return;
    
    isInventoryOpen = !isInventoryOpen;
    document.getElementById('inventory').style.display = isInventoryOpen ? 'block' : 'none';
    
    // If opening inventory, pause game mechanics and hide crosshair
    if (isInventoryOpen) {
        // Force cursor to be visible EVERYWHERE, not just in the inventory
        document.body.style.cursor = 'auto';
        
        // Exit pointer lock to allow cursor movement
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        
        hideCrosshair(); // Hide crosshair when inventory is open
        
        // Initialize drag-drop if needed
        setupItemBarDragAndDrop();
        
        // Add click handler to the inventory itself to prevent pointer lock
        const inventory = document.getElementById('inventory');
        inventory.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent clicks inside inventory from triggering pointer lock
        });
    } else {
        // If closing, clear selection and show crosshair
        selectedInventorySlot = -1;
        document.querySelectorAll('.inventory-slot').forEach(slot => {
            slot.classList.remove('selected');
        });
        
        showCrosshair(); // Show crosshair when inventory is closed
        document.body.style.cursor = 'none';
        document.body.requestPointerLock();
    }
    
    updateInventoryDisplay();
}

// Function to update the inventory display
function updateInventoryDisplay() {
    const slots = document.querySelectorAll('.inventory-slot');
    
    inventoryItems.forEach((item, index) => {
        const slot = slots[index];
        
        if (item !== null) {
            // Get item symbol (HTML or emoji)
            const symbol = getItemSymbol(item);
            
            // Use innerHTML instead of textContent
            slot.innerHTML = symbol;
            slot.classList.remove('empty');
            
            // If item is an object with count, add stack count
            if (typeof item === 'object' && item.count > 1) {
                const stackCount = document.createElement('span');
                stackCount.className = 'stack-count';
                stackCount.textContent = item.count;
                slot.appendChild(stackCount);
            }
        } else {
            // Clear empty slots
            slot.innerHTML = '';
            slot.classList.add('empty');
        }
    });
}

// Update the getItemSymbol function to use the correct pistol emoji
function getItemSymbol(item) {
    // Handle stackable items (items with count)
    const itemType = typeof item === 'object' && item !== null ? item.type : item;
    
    // For custom image icons, return HTML string instead of DOM element
    if (itemType === WEAPON_TYPES.KNIFE) {
        return `<img src="assets/icons/weapons/knife.png" class="item-icon" style="width:30px;height:30px;display:block;margin:0 auto;position:relative;top:25%;transform:translateY(-50%);">`;
    }

    if (itemType === WEAPON_TYPES.PISTOL) {
        return `<img src="assets/icons/weapons/pistol.png" class="item-icon" style="width:30px;height:30px;display:block;margin:0 auto;position:relative;top:25%;left:5%;transform:translateY(-50%);">`;
    }
    
    if (itemType === WEAPON_TYPES.ASSAULT_RIFLE) {
        return `<img src="assets/icons/weapons/assault-rifle.png" class="item-icon" style="width:30px;height:30px;display:block;margin:0 auto;position:relative;top:25%;left:0%;transform:translateY(-50%);">`;
    }

    if (itemType === WEAPON_TYPES.SHOTGUN) {
        return `<img src="assets/icons/weapons/shotgun.png" class="item-icon" style="width:30px;height:30px;display:block;margin:0 auto;position:relative;top:25%;left:0%;transform:translateY(-50%);">`;
    }

    if (itemType === WEAPON_TYPES.SNIPER_RIFLE) {
        return `<img src="assets/icons/weapons/sniper-rifle.png" class="item-icon" style="width:30px;height:30px;display:block;margin:0 auto;position:relative;top:25%;left:0%;transform:translateY(-50%);">`;
    }

    if (itemType === WEAPON_TYPES.CROSSBOW) {
        return `<img src="assets/icons/weapons/crossbow.png" class="item-icon" style="width:30px;height:30px;display:block;margin:0 auto;position:relative;top:25%;left:0%;transform:translateY(-50%);">`;
    }

    if (itemType === WEAPON_TYPES.MINIGUN) {
        return `<img src="assets/icons/weapons/minigun.png" class="item-icon" style="width:30px;height:30px;display:block;margin:0 auto;position:relative;top:25%;left:0%;transform:translateY(-50%);">`;   
    }

    if (itemType === WEAPON_TYPES.ROCKET_LAUNCHER) {
        return `<img src="assets/icons/weapons/rocket-launcher.png" class="item-icon" style="width:30px;height:30px;display:block;margin:0 auto;position:relative;top:25%;left:0%;transform:translateY(-50%);">`;
    }

    if (itemType === ITEM_TYPES.BANDAGE) {
        return `<img src="assets/icons/items/bandage.png" class="item-icon" style="width:30px;height:30px;display:block;margin:0 auto;position:relative;top:25%;left:0%;transform:translateY(-50%);">`;
    }

    if (itemType === ITEM_TYPES.MEDKIT) {
        return `<img src="assets/icons/items/medkit.png" class="item-icon" style="width:30px;height:30px;display:block;margin:0 auto;position:relative;top:25%;left:0%;transform:translateY(-50%);">`;
    }

    if (itemType === ITEM_TYPES.MINI_SHIELD) {
        return `<img src="assets/icons/items/mini-shield.png" class="item-icon" style="width:30px;height:30px;display:block;margin:0 auto;position:relative;top:25%;left:0%;transform:translateY(-50%);">`;
    }

    if (itemType === ITEM_TYPES.BIG_SHIELD) {
        return `<img src="assets/icons/items/big-shield.png" class="item-icon" style="width:30px;height:30px;display:block;margin:0 auto;position:relative;top:25%;left:0%;transform:translateY(-50%);">`;
    }

    else{
        return '❓';
    }

}

// Basic sound system
const soundManager = {
    sounds: {},
    enabled: true,
    
    // Initialize with essential sounds
    init: function() {
        // Knife sounds
        this.loadSound('knife_swing', 'assets/sounds/weapons/knife-firing.mp3');
        this.loadSound('knife_select', 'assets/sounds/weapons/knife-reload.wav');
        
        // Pistol sounds
        this.loadSound('pistol_fire', 'assets/sounds/weapons/pistol-firing.wav');
        this.loadSound('pistol_reload', 'assets/sounds/weapons/pistol-reload.mp3');
        this.loadSound('pistol_select', 'assets/sounds/weapons/pistol-reload.mp3');
    
        // Shotgun sounds
        this.loadSound('shotgun_fire', 'assets/sounds/weapons/shotgun-firing.wav');
        this.loadSound('shotgun_reload', 'assets/sounds/weapons/shotgun-reload.wav');
        this.loadSound('shotgun_select', 'assets/sounds/weapons/shotgun-reload.wav');
    
        // Assault rifle sounds
        this.loadSound('assault_rifle_fire', 'assets/sounds/weapons/assault_rifle-firing.wav');
        this.loadSound('assault_rifle_reload', 'assets/sounds/weapons/assault_rifle-reload.wav');
        this.loadSound('assault_rifle_select', 'assets/sounds/weapons/assault_rifle-reload.wav');
    
        // Crossbow sounds
        this.loadSound('crossbow_fire', 'assets/sounds/weapons/crossbow-firing.wav');
        this.loadSound('crossbow_reload', 'assets/sounds/weapons/crossbow-reload.wav');
        this.loadSound('crossbow_select', 'assets/sounds/weapons/crossbow-reload.wav');

        // Rocket launcher sounds
        this.loadSound('rocket_launcher_fire', 'assets/sounds/weapons/rocket_launcher-firing.wav');
        this.loadSound('rocket_launcher_reload', 'assets/sounds/weapons/rocket_launcher-reload.wav');
        this.loadSound('rocket_launcher_select', 'assets/sounds/weapons/rocket_launcher-reload.wav');
        this.loadSound('rocket_explosion', 'assets/sounds/weapons/rocket_launcher-explosion.wav');

        // Minigun sounds
        this.loadSound('minigun_select', 'assets/sounds/weapons/minigun_select.mp3');
        this.loadSound('minigun_spinup', 'assets/sounds/weapons/minigun-startfiring.mp3');
        this.loadSound('minigun_fire', 'assets/sounds/weapons/minigun-firingloop.mp3');
        this.loadSound('minigun_spindown', 'assets/sounds/weapons/minigun-stopfiring.mp3');
        this.loadSound('minigun_overheat', 'assets/sounds/weapons/minigun_reload.mp3');

        // Sniper rifle sounds
        this.loadSound('sniper_rifle_fire', 'assets/sounds/weapons/sniper-firing.wav');
        this.loadSound('sniper_rifle_reload', 'assets/sounds/weapons/sniper-reload.wav');
        this.loadSound('sniper_rifle_select', 'assets/sounds/weapons/sniper-reload.wav');

        // PLayer sounds
        this.loadSound('player_hurt', 'assets/sounds/player/player-hurt.wav');
        this.loadSound('player_shield_hit', 'assets/sounds/player/player-hurt.wav'); 

        // Consumable sounds
        this.loadSound('bandage_use', 'assets/sounds/player/player-healing_bandages.wav');
        this.loadSound('medkit_use', 'assets/sounds/player/player-healing_medkit.mp3');
        this.loadSound('mini_shield_use', 'assets/sounds/player/player-healing_minis.flac');
        this.loadSound('big_shield_use', 'assets/sounds/player/player-healing_big.wav');

        // Enemy sounds 
        this.loadSound('enemy_death', 'assets/sounds/enemies/death.wav');
        this.loadSound('boss_death', 'assets/sounds/enemies/death.wav');
        this.loadSound('enemy_hit', 'assets/sounds/enemies/hit.wav');
        this.loadSound('boss_incoming', 'assets/sounds/enemies/boss.wav');    
        
        // UI sounds
        this.loadSound('button_click', 'assets/sounds/ui/button.wav');
    },
    
    // Load a sound
    loadSound: function(name, url) {
        this.sounds[name] = new Audio(url);
    },
    
    // Play a sound with optional volume
    play: function(name, volume = 1.0) {
        if (!this.enabled || !this.sounds[name]) return;
        
        const sound = this.sounds[name].cloneNode();
        sound.volume = volume;
        sound.play().catch(e => console.log("Sound play prevented:", e));
    }
};

function addButtonSounds() {
    // Get all buttons in the document
    const buttons = document.querySelectorAll('button');
    
    // Add click sound to each button
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            // Play the same button click sound for all buttons
            soundManager.play('button_click', 0.5);
        });
    });
    
    // Add sound for color selection buttons (they might not be captured by the button selector)
    const colorButtons = document.querySelectorAll('.color-btn');
    colorButtons.forEach(button => {
        button.addEventListener('click', () => {
            soundManager.play('button_click', 0.5);
        });
    });
}

// Function to select an inventory slot
function selectInventorySlot(slotIndex) {
    if (inventoryItems[slotIndex] === null) return;
    
    selectedInventorySlot = slotIndex;
    
    // Update UI to show selection
    document.querySelectorAll('.inventory-slot').forEach((slot, i) => {
        slot.classList.toggle('selected', i === slotIndex);
    });
    
    // Enable the use button
    document.getElementById('useInventoryItem').disabled = false;
}

// Function to use an item from the inventory
function useSelectedInventoryItem() {
    if (selectedInventorySlot === -1) return;
    
    const item = inventoryItems[selectedInventorySlot];
    if (item === null) return;
    
    // Handle stackable items
    if (typeof item === 'object' && item !== null) {
        const itemType = item.type;
        
        // Apply effect
        const consumed = applyItemEffect(itemType);
        
        if (consumed) {
            // Decrease stack count
            item.count--;
            
            // Remove item if count is 0
            if (item.count <= 0) {
                inventoryItems[selectedInventorySlot] = null;
            }
            
            // Update UI
            updateInventoryDisplay();
        }
    } else {
        // For non-stackable items, use the old behavior
        applyItemEffect(item);
        inventoryItems[selectedInventorySlot] = null;
    }
    
    // Clear selection
    selectedInventorySlot = -1;
    document.querySelectorAll('.inventory-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    document.getElementById('useInventoryItem').disabled = true;
}

// Function to transfer item from inventory to item bar
function transferToItemBar(inventorySlot) {
    const emptyBarSlot = inventory.indexOf(null);
    if (emptyBarSlot !== -1 && inventoryItems[inventorySlot] !== null) {
        inventory[emptyBarSlot] = inventoryItems[inventorySlot];
        inventoryItems[inventorySlot] = null;
        updateItemBar();
        updateInventoryDisplay();
        return true;
    }
    return false;
}

// Function to transfer item from item bar to inventory
function transferToInventory(barSlot) {
    const emptyInvSlot = inventoryItems.indexOf(null);
    if (emptyInvSlot !== -1 && inventory[barSlot] !== null) {
        inventoryItems[emptyInvSlot] = inventory[barSlot];
        inventory[barSlot] = null;
        updateItemBar();
        updateInventoryDisplay();
        return true;
    }
    return false;
}

function addItem(itemType) {
    // Check if the item is stackable
    const isStackable = MAX_STACK_SIZES.hasOwnProperty(itemType);
    const maxStackSize = isStackable ? MAX_STACK_SIZES[itemType] : 1;
    
    // First try to stack with existing items in hotbar
    if (isStackable) {
        for (let i = 0; i < inventory.length; i++) {
            const item = inventory[i];
            if (item && typeof item === 'object' && item.type === itemType) {
                if (item.count < maxStackSize) {
                    // Can add to this stack
                    item.count++;
                    updateItemBar();
                    return true;
                }
            }
        }
        
        // Then try stacking with inventory items
        for (let i = 0; i < inventoryItems.length; i++) {
            const item = inventoryItems[i];
            if (item && typeof item === 'object' && item.type === itemType) {
                if (item.count < maxStackSize) {
                    // Can add to this stack
                    item.count++;
                    updateInventoryDisplay();
                    return true;
                }
            }
        }
    }
    
    // If we can't stack, try to add to an empty slot in hotbar
    const emptySlot = inventory.findIndex(item => item === null);
    if (emptySlot !== -1) {
        inventory[emptySlot] = isStackable ? { type: itemType, count: 1 } : itemType;
        updateItemBar();
        return true;
    }
    
    // If hotbar is full, try to add to inventory
    const emptyInvSlot = inventoryItems.findIndex(item => item === null);
    if (emptyInvSlot !== -1) {
        inventoryItems[emptyInvSlot] = isStackable ? { type: itemType, count: 1 } : itemType;
        updateInventoryDisplay();
        return true;
    }
    
    // Both are full, can't add the item
    console.log("Inventory full!");
    return false;
}

// Centralized function for applying item effects
// Update the applyItemEffect function to include animations
function applyItemEffect(itemType) {
    switch(itemType) {
        case WEAPON_TYPES.KNIFE: // 0
            console.log('Using knife');
            if (knifeModel) {
                animateKnifeAttack();
            }
            break;
            
        case WEAPON_TYPES.PISTOL: // 1
            // Pistol is handled separately
            break;
            
        case ITEM_TYPES.BANDAGE: // 10
            // Bandages restore 15 health up to max of 75
            if (health < 75) {
                health = Math.min(health + 15, 75);
                updateHUD();
                showNotification("Bandage applied");
                playItemUseCompletionEffect(itemType);
                return true; // Item consumed
            } else {
                showNotification("Already at maximum bandage health");
                return false; // Item not consumed
            }
            
        case ITEM_TYPES.MEDKIT: // 11
            // Medkit restores to full health
            if (health < 100) {
                health = 100;
                updateHUD();
                showNotification("Medkit used");
                playItemUseCompletionEffect(itemType);
                return true; // Item consumed
            } else {
                showNotification("Already at full health");
                return false; // Item not consumed
            }
            
        case ITEM_TYPES.MINI_SHIELD: // 12
            // Mini shield adds 25 shield up to max of 50
            if (shield < 50) {
                shield = Math.min(shield + 25, 50);
                updateHUD();
                showNotification("Mini Shield used");
                playItemUseCompletionEffect(itemType);
                return true; // Item consumed
            } else {
                showNotification("Already at maximum mini shield");
                return false; // Item not consumed
            }
            
        case ITEM_TYPES.BIG_SHIELD: // 13
            // Big shield adds 50 shield up to max of 100
            if (shield < 100) {
                shield = Math.min(shield + 50, 100);
                updateHUD();
                showNotification("Shield Potion used");
                playItemUseCompletionEffect(itemType);
                return true; // Item consumed
            } else {
                showNotification("Already at full shield");
                return false; // Item not consumed
            }
            
        default:
            // Unrecognized item type
            console.log(`Unknown item type: ${itemType}`);
            return false; // Item not consumed
    }
    
    return true; // Default consumption for other items
}

// Function to update the item bar display
function updateItemBar() {
    const slots = document.querySelectorAll('.item-slot');
    
    // Remove selected class from all slots
    slots.forEach(slot => slot.classList.remove('selected'));
    
    // Add selected class to current slot
    slots[selectedSlot].classList.add('selected');
    
    // Update content of each slot based on inventory
    inventory.forEach((item, index) => {
        const content = slots[index].querySelector('.item-content');
        if (item !== null) {
            // Get item symbol (could be HTML string or emoji)
            const symbol = getItemSymbol(item);
            
            // Set inner HTML instead of textContent to support both HTML and emoji
            content.innerHTML = symbol;
            
            // If item is an object with count, add stack count
            if (typeof item === 'object' && item.count > 1) {
                const stackCount = document.createElement('span');
                stackCount.className = 'stack-count';
                stackCount.textContent = item.count;
                content.appendChild(stackCount);
            }
        } else {
            // Clear empty slots
            content.innerHTML = '';
        }
    });
}

// Function to handle item selection
function selectSlot(slot) {
    if (slot >= 0 && slot < 5) {
        selectedSlot = slot;
        updateItemBar();
        updateWeaponVisibility();
        updateAmmoDisplay(); // Make sure to update ammo display when changing weapons

        // Play knife selection sound if switching to knife
        if (inventory[selectedSlot] === WEAPON_TYPES.KNIFE) {
            soundManager.play('knife_select', 0.6);
        } else if (inventory[selectedSlot] === WEAPON_TYPES.PISTOL) {
            soundManager.play('pistol_select', 0.6);
        } else if (inventory[selectedSlot] === WEAPON_TYPES.SHOTGUN) {
            soundManager.play('shotgun_select', 0.6);
        } else if (inventory[selectedSlot] === WEAPON_TYPES.ASSAULT_RIFLE) {
            soundManager.play('assault_rifle_select', 0.6);
        } else if (inventory[selectedSlot] === WEAPON_TYPES.CROSSBOW) {
            soundManager.play('crossbow_select', 0.6);
        } else if (inventory[selectedSlot] === WEAPON_TYPES.ROCKET_LAUNCHER) {
            soundManager.play('rocket_launcher_select', 0.6);
        } else if (inventory[selectedSlot] === WEAPON_TYPES.MINIGUN) {
            soundManager.play('minigun_select', 0.6);
        } else if (inventory[selectedSlot] === WEAPON_TYPES.SNIPER_RIFLE) {
            soundManager.play('sniper_rifle_select', 0.6);
        }
    }
}

// Update the useSelectedItem function to work regardless of movement state
function useSelectedItem() {
    const item = inventory[selectedSlot];
    
    // Early exit if there's no item or already using an item
    if (item === null || usingItem) return;
    
    // Handle weapons (unchanged)
    if (item === WEAPON_TYPES.KNIFE) {
        if (!knifeModel) {
            createKnifeModel();
        }
        
        knifeModel.visible = true;
        animateKnifeAttack();
        checkEnemyHit();
        return;
    } 
    else if (item === WEAPON_TYPES.PISTOL) {
        if (!pistolModel) {
            createPistolModel();
        }
        
        pistolModel.visible = true;
        firePistol();
        return;
    }

    else if (item === WEAPON_TYPES.SHOTGUN) {
        if (!shotgunModel) {
            createShotgunModel();
        }
        
        shotgunModel.visible = true;
        fireShotgun();
        return;
    }

    else if (item === WEAPON_TYPES.ASSAULT_RIFLE) {
        if (!assaultRifleModel) {
            createAssaultRifleModel();
        }
        
        assaultRifleModel.visible = true;
        fireAssaultRifle();
        return;
    }
    
    else if (item === WEAPON_TYPES.SNIPER_RIFLE) {
        if (!sniperRifleModel) {
            createSniperRifleModel();
        }
        
        sniperRifleModel.visible = true && !isScoped; // Don't show rifle when scoped
        fireSniperRifle();
        return;
    }

    else if (item === WEAPON_TYPES.CROSSBOW) {
        if (!crossbowModel) {
            createCrossbowModel();
        }
        
        crossbowModel.visible = true;
        fireCrossbow();
        return;
    }

    else if (item === WEAPON_TYPES.MINIGUN) {
        if (!minigunModel) {
            createMinigunModel();
        }
        
        minigunModel.visible = true;
        fireMinigun();
        return;
    }

    else if (item === WEAPON_TYPES.ROCKET_LAUNCHER) {
        if (!rocketLauncherModel) {
            createRocketLauncherModel();
        }
        rocketLauncherModel.visible = true;
        fireRocketLauncher();
        return;
    }

    // Handle stackable consumable items
    if (typeof item === 'object' && item !== null) {
        const itemType = item.type;
        
        // Check if this item can be used (same checks as in applyItemEffect)
        let canUseItem = false;
        
        switch (itemType) {
            case ITEM_TYPES.BANDAGE:
                canUseItem = health < 75;
                break;
            case ITEM_TYPES.MEDKIT:
                canUseItem = health < 100;
                break;
            case ITEM_TYPES.MINI_SHIELD:
                canUseItem = shield < 50;
                break;
            case ITEM_TYPES.BIG_SHIELD:
                canUseItem = shield < 100;
                break;
        }
        
        if (!canUseItem) {
            // Show notification about why item can't be used
            switch (itemType) {
                case ITEM_TYPES.BANDAGE:
                case ITEM_TYPES.MEDKIT:
                    showNotification("Already at maximum health");
                    break;
                case ITEM_TYPES.MINI_SHIELD:
                case ITEM_TYPES.BIG_SHIELD:
                    showNotification("Already at maximum shield");
                    break;
            }
            return;
        }
        
        // Start item use with timer
        startItemUse(itemType);
    }
}

// Function to create a Fortnite-style circular timer
function createCircularTimer(duration) {
    // Remove any existing timer
    removeCircularTimer();
    
    // Create the SVG container
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'circularTimer';
    svg.setAttribute('width', '60');
    svg.setAttribute('height', '60');
    svg.style.position = 'absolute';
    svg.style.left = '50%';
    svg.style.bottom = '25%'; // Position above health bar
    svg.style.transform = 'translateX(-50%)';
    svg.style.zIndex = '1000';
    
    // Background circle
    const backgroundCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    backgroundCircle.setAttribute('cx', '30');
    backgroundCircle.setAttribute('cy', '30');
    backgroundCircle.setAttribute('r', '25');
    backgroundCircle.setAttribute('fill', 'rgba(0, 0, 0, 0.5)');
    backgroundCircle.setAttribute('stroke', '#ffffff');
    backgroundCircle.setAttribute('stroke-width', '2');
    svg.appendChild(backgroundCircle);
    
    // Progress circle
    const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    progressCircle.setAttribute('cx', '30');
    progressCircle.setAttribute('cy', '30');
    progressCircle.setAttribute('r', '25');
    progressCircle.setAttribute('fill', 'none');
    progressCircle.setAttribute('stroke', '#00aaff'); // Blue for shield, can change based on item
    progressCircle.setAttribute('stroke-width', '4');
    progressCircle.setAttribute('stroke-dasharray', `${2 * Math.PI * 25}`);
    progressCircle.setAttribute('stroke-dashoffset', `${2 * Math.PI * 25}`); // Start with full offset (empty)
    progressCircle.setAttribute('transform', 'rotate(-90, 30, 30)'); // Start from top
    progressCircle.style.transition = 'stroke-dashoffset linear'; // Make linear transition
    progressCircle.style.transitionDuration = `${duration}ms`; // Set duration
    svg.appendChild(progressCircle);
    
    // Add to DOM
    document.body.appendChild(svg);
    
    // Set progress circle color based on item type
    if (currentItemInUse === ITEM_TYPES.BANDAGE || currentItemInUse === ITEM_TYPES.MEDKIT) {
        progressCircle.setAttribute('stroke', '#00ff00'); // Green for healing items
    }
    
    // Start progress animation
    setTimeout(() => {
        progressCircle.setAttribute('stroke-dashoffset', '0'); // Animate to 0 offset (full)
    }, 10);
    
    return svg;
}

// Function to remove circular timer
function removeCircularTimer() {
    try {
        const timer = document.getElementById('circularTimer');
        if (timer && timer.parentNode) {
            timer.parentNode.removeChild(timer);
        }
    } catch (error) {
        console.error("Error removing circular timer:", error);
    }
}

// Function to complete item use
function completeItemUse() {
    if (!usingItem) return;
    
    try {
        const itemType = currentItemInUse;
        
        // Remove the held item model
        if (heldConsumableModel) {
            camera.remove(heldConsumableModel);
            heldConsumableModel = null;
        }
        
        // Stop any ongoing animation
        if (consumableAnimationId) {
            cancelAnimationFrame(consumableAnimationId);
            consumableAnimationId = null;
        }
        
        // Remove timer
        removeCircularTimer();
        
        // Apply item effect and create particles
        const consumed = applyItemEffect(itemType);
        playItemUseCompletionEffect(itemType);
        
        if (consumed) {
            // Get the item from inventory
            const item = inventory[selectedSlot];
            
            if (item && typeof item === 'object' && item.type === itemType) {
                // Decrease stack count
                item.count--;
                
                // Remove item if count is 0
                if (item.count <= 0) {
                    inventory[selectedSlot] = null;
                }
                
                // Update UI
                updateItemBar();
            }
        }
    } catch (error) {
        console.error("Error completing item use:", error);
    } finally {
        // Always reset state no matter what happens
        if (itemUseTimeout) {
            clearTimeout(itemUseTimeout);
            itemUseTimeout = null;
        }
        
        usingItem = false;
        currentItemInUse = null;
        consumableAnimationInProgress = false;
        
        // Update weapon visibility after finishing item use
        updateWeaponVisibility();
    }
}

function playItemUseCompletionEffect(itemType) {
    // Create particles at player position
    const particleCount = 20;
    const particleColor = itemType === ITEM_TYPES.BANDAGE || itemType === ITEM_TYPES.MEDKIT ? 
                        0x00ff00 : 0x00aaff;
                        
    // Position particles around the player's head
    const particleOrigin = new THREE.Vector3();
    camera.getWorldPosition(particleOrigin);
    
    for (let i = 0; i < particleCount; i++) {
        const size = 0.03 + Math.random() * 0.03;
        const geometry = new THREE.SphereGeometry(size, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: particleColor,
            transparent: true,
            opacity: 0.7
        });
        
        const particle = new THREE.Mesh(geometry, material);
        
        // Position randomly around player
        particle.position.set(
            particleOrigin.x + (Math.random() - 0.5) * 0.5,
            particleOrigin.y + (Math.random() - 0.5) * 0.5,
            particleOrigin.z + (Math.random() - 0.5) * 0.5
        );
        
        // Add to scene
        scene.add(particle);
        
        // Particle animation
        const particleVelocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.02,
            Math.random() * 0.03,
            (Math.random() - 0.5) * 0.02
        );
        
        const particleStartTime = performance.now();
        const particleLifetime = 800 + Math.random() * 500;
        
        function animateParticle() {
            const now = performance.now();
            const elapsed = now - particleStartTime;
            const progress = elapsed / particleLifetime;
            
            if (progress >= 1) {
                scene.remove(particle);
                return;
            }
            
            // Move particle and fade out
            particle.position.add(particleVelocity);
            particle.material.opacity = 0.7 * (1 - progress);
            
            requestAnimationFrame(animateParticle);
        }
        
        requestAnimationFrame(animateParticle);
    }
}

function stopItemUseAnimation() {
    try {
        if (heldConsumableModel) {
            camera.remove(heldConsumableModel);
            heldConsumableModel = null;
        }
        
        if (consumableAnimationId) {
            cancelAnimationFrame(consumableAnimationId);
            consumableAnimationId = null;
        }
        
        consumableAnimationInProgress = false;
    } catch (error) {
        console.error("Error stopping item animation:", error);
    }
}

// Function to get item name from type
function getItemName(itemType) {
    switch(itemType) {
        case ITEM_TYPES.BANDAGE: return "Bandage";
        case ITEM_TYPES.MEDKIT: return "Medkit";
        case ITEM_TYPES.MINI_SHIELD: return "Mini Shield";
        case ITEM_TYPES.BIG_SHIELD: return "Shield Potion";
        default: return "Item";
    }
}

// Function to start item use with circular timer
function startItemUse(itemType) {
    // Set using item state
    usingItem = true;
    currentItemInUse = itemType;
    itemUseStartTime = performance.now();

    if (itemType === ITEM_TYPES.BANDAGE) {
        soundManager.play('bandage_use', 0.7);
    }
    else if (itemType === ITEM_TYPES.MEDKIT) {
        soundManager.play('medkit_use', 0.7);
    }
    else if (itemType === ITEM_TYPES.MINI_SHIELD) {
        soundManager.play('mini_shield_use', 0.7);
    }
    else if (itemType === ITEM_TYPES.BIG_SHIELD) {
        soundManager.play('big_shield_use', 0.7); 
    }
    
    
    // Create the held consumable model
    createHeldConsumableModel(itemType);
    
    // Start the animation that will run for the full duration
    animateHeldConsumable(itemType);
    
    // Show notification
    const itemName = getItemName(itemType);
    showNotification(`Using ${itemName}...`);
    
    // Create circular progress timer
    createCircularTimer(ITEM_USE_DURATIONS[itemType]);
    
    // Clear any existing timeout to prevent multiple timers
    if (itemUseTimeout) {
        clearTimeout(itemUseTimeout);
    }
    
    // Set timeout for item use completion - must match animation duration exactly
    itemUseTimeout = setTimeout(() => {
        completeItemUse();
    }, ITEM_USE_DURATIONS[itemType]);
}


// Update the checkItemPickups function to include pickup animation
function checkItemPickups() {
    if (!player) return;
    
    // Get all meshes with pickup data
    const pickupItems = scene.children.filter(
        obj => obj.userData && obj.userData.pickupable
    );
    
    const pickupDistance = 2; // Distance for pickup
    
    for (let i = pickupItems.length - 1; i >= 0; i--) {
        const item = pickupItems[i];
        const distance = player.position.distanceTo(item.position);
        
        if (distance < pickupDistance) {
            const itemType = item.userData.itemType;
            
            // Start pickup animation
            playItemPickupAnimation(item, () => {
                // After animation completes, add to inventory
                if (addItem(itemType)) {
                    // Show what was picked up
                    showNotification(`Picked up ${getItemName(itemType)}`);
                }
            });
        }
    }
}

// Replace the animateKnifeAttack function with this enhanced version
function animateKnifeAttack() {
    if (!knifeModel) return;

    // Play knife swing sound
    soundManager.play('knife_swing', 0.7);
    
    // Force cancel any ongoing animation
    if (knifeAnimationInProgress) {
        cancelAnimationFrame(knifeAnimationId);
        
        // Important: Reset knife to original position immediately
        if (knifeModel.originalPosition && knifeModel.originalRotation) {
            knifeModel.position.copy(knifeModel.originalPosition);
            knifeModel.rotation.copy(knifeModel.originalRotation);
        }
    }
    
    // Mark animation as in progress
    knifeAnimationInProgress = true;
    
    // Store the original rotation and position for reference
    knifeModel.originalPosition = new THREE.Vector3(0.35, -0.35, -0.5);
    knifeModel.originalRotation = new THREE.Euler(0, 0, 0);
    
    // Animation constants
    const attackDuration = 200; // milliseconds
    const returnDuration = 150; // milliseconds
    const maxRotation = -Math.PI / 3; // 60 degrees forward
    const thrustDistance = 0.3; // Forward movement
    
    // Start animation time
    const startTime = performance.now();
    
    // Animation function
    function animate() {
        const now = performance.now();
        const elapsed = now - startTime;
        
        if (elapsed < attackDuration) {
            // Forward attack motion (0% to 100%)
            const progress = elapsed / attackDuration;
            
            // Apply forward rotation (around X axis)
            knifeModel.rotation.x = knifeModel.originalRotation.x + (maxRotation * progress);
            
            // Add slight forward movement
            knifeModel.position.z = knifeModel.originalPosition.z - (thrustDistance * progress);
            
            // Store animation ID for potential cancellation
            knifeAnimationId = requestAnimationFrame(animate);
        } else if (elapsed < attackDuration + returnDuration) {
            // Return motion (100% to 0%)
            const returnProgress = (elapsed - attackDuration) / returnDuration;
            
            // Smoothly return to original rotation
            knifeModel.rotation.x = knifeModel.originalRotation.x + (maxRotation * (1 - returnProgress));
            
            // Return to original position
            knifeModel.position.z = knifeModel.originalPosition.z - (thrustDistance * (1 - returnProgress));
            
            // Store animation ID for potential cancellation
            knifeAnimationId = requestAnimationFrame(animate);
        } else {
            // CRITICAL FIX: Always reset to exact original values
            knifeModel.position.copy(knifeModel.originalPosition);
            knifeModel.rotation.copy(knifeModel.originalRotation);
            
            // Clear animation state
            knifeAnimationInProgress = false;
            knifeAnimationId = null;
        }
    }
    
    // Start the animation
    knifeAnimationId = requestAnimationFrame(animate);
}

// Create a global variable to store the knife mesh
let knifeModel = null;

// Update the knife position in the createKnifeModel function
function createKnifeModel() {
    // First remove any existing knife model to prevent duplicates
    if (knifeModel) {
        camera.remove(knifeModel);
    }
    
    // Create a more visible knife with brighter materials
    const handleGeometry = new THREE.BoxGeometry(0.08, 0.2, 0.05);
    const handleMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x663300,
        roughness: 0.3, 
        metalness: 0.1
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.castShadow = true;
    handle.receiveShadow = true;
    
    // Make blade bigger and more reflective - fixed to properly show metallic finish
    const bladeGeometry = new THREE.BoxGeometry(0.04, 0.35, 0.1);
    const bladeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xf0f0f0,     // Brighter silver color
        roughness: 0.05,      // Reduced roughness for more reflectiveness
        metalness: 0.8,       // Slightly reduced metalness to prevent total blackness
        emissive: 0x222222,   // Add slight emissive to ensure visibility
        emissiveIntensity: 0.2, // Not too strong
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.y = 0.25; // Position blade above handle
    blade.castShadow = true;
    blade.receiveShadow = true;
    
    // Create knife group
    knifeModel = new THREE.Group();
    knifeModel.add(handle);
    knifeModel.add(blade);
    
    // Position closer to the camera and more to the right
    knifeModel.position.set(0.35, -0.35, -0.5);
    knifeModel.rotation.set(0, 0, 0);
    
    // Add a dedicated light to make the knife more visible
    const knifeLight = new THREE.PointLight(0xffffff, 1.5, 1);
    knifeLight.position.set(0, 0, -0.2);
    knifeModel.add(knifeLight);
    
    camera.add(knifeModel);
    console.log("Knife model created and added to camera");
    
    // Ensure visibility
    knifeModel.visible = (inventory[selectedSlot] === 0);
    return knifeModel;
}

function createPistolModel() {
    if (pistolModel) {
        camera.remove(pistolModel);
    }
    
    // Create pistol body
    const pistolBody = new THREE.BoxGeometry(0.1, 0.15, 0.3);
    const pistolMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.3,
        metalness: 0.8
    });
    const body = new THREE.Mesh(pistolBody, pistolMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    
    // Create pistol handle
    const handleGeometry = new THREE.BoxGeometry(0.08, 0.25, 0.1);
    const handleMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.5,
        metalness: 0.3
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, -0.2, 0.05);
    handle.castShadow = true;
    handle.receiveShadow = true;
    
    // Create barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 16);
    const barrelMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        roughness: 0.2,
        metalness: 0.9
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, 0.25);
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    
    // Create pistol group
    pistolModel = new THREE.Group();
    pistolModel.add(body);
    pistolModel.add(handle);
    pistolModel.add(barrel);
    
    // Position the pistol in view using the constants
    pistolModel.position.copy(PISTOL_IDLE_POSITION);
    pistolModel.rotation.copy(PISTOL_IDLE_ROTATION);
    
    // Add a dedicated light
    const pistolLight = new THREE.PointLight(0xffffff, 1.5, 1);
    pistolLight.position.set(0, 0, -0.2);
    pistolModel.add(pistolLight);
    
    camera.add(pistolModel);
    console.log("Pistol model created");
    
    pistolModel.visible = (inventory[selectedSlot] === WEAPON_TYPES.PISTOL);
    return pistolModel;
}

// Add this debug function to help position the knife
function adjustKnifePosition(x, y, z) {
    if (!knifeModel) return;
    knifeModel.position.set(x, y, z);
    console.log(`Knife position: ${x}, ${y}, ${z}`);
}

// Add this function to adjust knife rotation
function adjustKnifeRotation(x, y, z) {
    if (!knifeModel) return;
    knifeModel.rotation.set(x, y, z);
    console.log(`Knife rotation: ${x}, ${y}, ${z}`);
}

// You can call these from the console for fine-tuning:
// adjustKnifePosition(0.3, -0.2, -0.5)
// adjustKnifeRotation(0.2, Math.PI * 0.75, 0)

// Function to update weapon visibility based on selected item
function updateWeaponVisibility() {
    if (!gameStarted) return;
    
    // Get current selected item
    const currentItem = inventory[selectedSlot];
    
    // Handle knife visibility
    if (knifeModel) {
        knifeModel.visible = (currentItem === WEAPON_TYPES.KNIFE);
    }
    
    // Handle pistol visibility
    if (pistolModel) {
        pistolModel.visible = (currentItem === WEAPON_TYPES.PISTOL);
    }

    // Handle shotgun visibility
    if (shotgunModel) {
        shotgunModel.visible = (currentItem === WEAPON_TYPES.SHOTGUN);
    }

    if (assaultRifleModel) {
        assaultRifleModel.visible = (currentItem === WEAPON_TYPES.ASSAULT_RIFLE);
    }

    if (sniperRifleModel) {
        sniperRifleModel.visible = (currentItem === WEAPON_TYPES.SNIPER_RIFLE && !isScoped);
    }

     // Handle crossbow visibility
    if (crossbowModel) {
        crossbowModel.visible = (currentItem === WEAPON_TYPES.CROSSBOW);
        
        // Update arrow visibility based on ammo
        if (currentItem === WEAPON_TYPES.CROSSBOW) {
            updateCrossbowArrowVisibility();
        }
    }

    if (minigunModel) {
        minigunModel.visible = (currentItem === WEAPON_TYPES.MINIGUN);
    }

    if (rocketLauncherModel) {
        rocketLauncherModel.visible = (currentItem === WEAPON_TYPES.ROCKET_LAUNCHER);
    }

    // Update ammo display container visibility
    const ammoContainer = document.getElementById('ammoContainer');
    if (ammoContainer) {
        // Show ammo for pistol, shotgun, or assault rifle
        ammoContainer.style.display = (
            currentItem === WEAPON_TYPES.PISTOL || 
            currentItem === WEAPON_TYPES.SHOTGUN ||
            currentItem === WEAPON_TYPES.ASSAULT_RIFLE ||
            currentItem === WEAPON_TYPES.SNIPER_RIFLE ||
            currentItem === WEAPON_TYPES.CROSSBOW ||
            currentItem === WEAPON_TYPES.MINIGUN ||
            currentItem === WEAPON_TYPES.ROCKET_LAUNCHER
        ) ? 'block' : 'none';
    }
    
    // After updating visibility, ensure ammo display shows correct values
    updateAmmoDisplay();
    
    // Handle consumable item visibility
    if (currentItem !== null && typeof currentItem === 'object') {
        // This is a consumable item (has a type property)
        const itemType = currentItem.type;
        
        // Check if it's a consumable item type
        if ([ITEM_TYPES.BANDAGE, ITEM_TYPES.MEDKIT, 
             ITEM_TYPES.MINI_SHIELD, ITEM_TYPES.BIG_SHIELD].includes(itemType)) {
            
            // Create the held model if it doesn't exist or is a different type
            if (!heldConsumableModel || heldConsumableModel.userData.itemType !== itemType) {
                createHeldConsumableModel(itemType);
                
                // Store the item type in userData for future reference
                if (heldConsumableModel) {
                    heldConsumableModel.userData.itemType = itemType;
                }
            }
            
            // Show the consumable model
            if (heldConsumableModel) {
                heldConsumableModel.visible = true;
            }
        } else {
            // Hide consumable model for non-consumable items
            if (heldConsumableModel) {
                heldConsumableModel.visible = false;
            }
        }
    } else {
        // Hide consumable model for weapons or empty slots
        if (heldConsumableModel) {
            heldConsumableModel.visible = false;
        }
    }
}

// Replace the updatePlayer function
function updatePlayer() {
    if (!isLocked || isPaused) return;

    // Movement constants
    const NORMAL_SPEED = 0.25;
    const CROUCH_SPEED = 0.1;
    const JUMP_FORCE = 0.18;
    const GRAVITY = 0.008;
    const BOUNDARY_LIMIT = 112.5;
    
    // Handle player state (crouching)
    let currentSpeed = NORMAL_SPEED;
    
    // Apply reduced speed when crouching OR using items
    if ((keys.shift && !isJumping) || usingItem) {
        // Only change player geometry when shift is pressed (not when using items)
        if (!isCrouching && keys.shift && !isJumping) {
            player.geometry = new THREE.BoxGeometry(1, CROUCH_HEIGHT, 1);
            player.position.y = CROUCH_HEIGHT/2;
            player.userData.cameraHolder.position.y = CROUCH_HEIGHT * 0.8; // Lower camera holder
            isCrouching = true;
        }
        currentSpeed = CROUCH_SPEED;
    } else if (isCrouching && !keys.shift) {
        player.geometry = new THREE.BoxGeometry(1, NORMAL_HEIGHT, 1);
        player.position.y = NORMAL_HEIGHT/2;
        player.userData.cameraHolder.position.y = NORMAL_HEIGHT * 0.8; // Restore camera holder
        isCrouching = false;
    }   
    
    // Handle jumping
    if (keys.space && !isJumping && !inAir) {
        jumpVelocity = JUMP_FORCE;
        isJumping = true;
        inAir = true;
    }
    
    // Apply gravity and jumping physics
    if (isJumping || inAir) {
        player.position.y += jumpVelocity;
        jumpVelocity -= GRAVITY;
        
        // Check if landed
        const groundLevel = isCrouching ? CROUCH_HEIGHT/2 : NORMAL_HEIGHT/2;
        if (player.position.y <= groundLevel) {
            player.position.y = groundLevel;
            isJumping = false;
            inAir = false;
            jumpVelocity = 0;
        }
    }
    
    // Calculate movement direction based on yawObject rotation
    const angle = yawObject.rotation.y;
    
    // Calculate forward and right vectors using the yawObject angle
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    
    // Calculate movement direction
    const moveDirection = new THREE.Vector3(0, 0, 0);
    
    if (keys.w) moveDirection.add(forward);
    if (keys.s) moveDirection.sub(forward);
    if (keys.a) moveDirection.sub(right);
    if (keys.d) moveDirection.add(right);
    
    // Apply movement
    if (moveDirection.length() > 0) {
        moveDirection.normalize();
        
        // Store original position for collision detection
        const oldX = player.position.x;
        const oldZ = player.position.z;
        
        // Apply movement with speed
        const newX = oldX + moveDirection.x * currentSpeed;
        const newZ = oldZ + moveDirection.z * currentSpeed;
        
        // Check collisions for X and Z separately
        if (!checkCollisions(newX, oldZ)) {
            player.position.x = newX;
        }
        
        if (!checkCollisions(oldX, newZ)) {
            player.position.z = newZ;
        }
        
        // Apply world boundaries
        player.position.x = Math.max(-BOUNDARY_LIMIT, Math.min(BOUNDARY_LIMIT, player.position.x));
        player.position.z = Math.max(-BOUNDARY_LIMIT, Math.min(BOUNDARY_LIMIT, player.position.z));
    }
    
    // Subtle weapon movement when walking (no head bobbing)
    if (moveDirection.length() > 0 && knifeModel) {
        const moveTime = Date.now() * 0.003;
        const swayX = Math.sin(moveTime) * 0.004;
        const swayY = Math.cos(moveTime * 0.7) * 0.004;
        knifeModel.position.x = THREE.MathUtils.lerp(knifeModel.position.x, 0.35 + swayX, 0.1);
        knifeModel.position.y = THREE.MathUtils.lerp(knifeModel.position.y, -0.35 + swayY, 0.1);
    } else if (knifeModel) {
        knifeModel.position.x = THREE.MathUtils.lerp(knifeModel.position.x, 0.35, 0.1);
        knifeModel.position.y = THREE.MathUtils.lerp(knifeModel.position.y, -0.35, 0.1);
    }
}

// Replace the head bob function with a more subtle one (or remove it)
function applyHeadBob() {
    // Function intentionally left empty to disable head bobbing
    // If you want subtle head bobbing, add it back with smaller values
}

// Update weapon sway effect to be more subtle
function updateWeaponSway(isMoving) {
    if (!knifeModel) return;
    
    const swaySpeed = 0.05;
    const swayAmount = 0.005; // Reduced for subtlety
    
    if (isMoving) {
        // Calculate sway based on movement, but with reduced amplitude
        const swayX = Math.sin(Date.now() * 0.004) * swayAmount;
        const swayY = Math.cos(Date.now() * 0.003) * swayAmount;
        
        // Apply sway with smooth interpolation
        knifeModel.position.x += (0.35 + swayX - knifeModel.position.x) * swaySpeed;
        knifeModel.position.y += (-0.35 + swayY - knifeModel.position.y) * swaySpeed;
    } else {
        // Return to neutral position with smooth interpolation
        knifeModel.position.x += (0.35 - knifeModel.position.x) * swaySpeed;
        knifeModel.position.y += (-0.35 - knifeModel.position.y) * swaySpeed;
    }
}

function checkCollisions(x, z) {
    const playerRadius = 0.5; // Half of player width
    
    // Check collisions with mountains
    for (const mountain of mountains) {
        const dx = mountain.position.x - x;
        const dz = mountain.position.z - z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // Mountain base is approximately cone width
        if (distance < (mountain.geometry.parameters.radius + playerRadius)) {
            return true; // Collision detected
        }
    }
    
    // Check collisions with lamp posts
    for (const lamp of roadLampObjects) {
        const dx = lamp.position.x - x;
        const dz = lamp.position.z - z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < (lamp.userData.collisionRadius + playerRadius)) {
            return true; // Collision with lamp post
        }
    }
    
    // Check collisions with abandoned cars
    for (const car of abandonedCars) {
        if (!car || !car.userData)
            continue;
        
        // Create vectors for position calculations
        const playerPos = new THREE.Vector3(x, player.position.y, z);
        const carPos = car.position.clone();
        
        // Get car dimensions from userData
        const carWidth = car.userData.collisionWidth;
        const carDepth = car.userData.collisionDepth;
        
        if (!carWidth || !carDepth)
            continue;
        
        // Vector from car to player
        const toPlayer = new THREE.Vector3().subVectors(playerPos, carPos);
        
        // Create transformation matrix from car's rotation
        const rotationMatrix = new THREE.Matrix4().makeRotationY(-car.rotation.y);
        
        // Transform the toPlayer vector to car's local space
        toPlayer.applyMatrix4(rotationMatrix);
        
        // Now check AABB collision in car's local space
        const halfWidth = carWidth / 2;
        const halfDepth = carDepth / 2;
        
        // Check if collision occurs
        const isColliding = (
            Math.abs(toPlayer.x) < halfWidth + playerRadius &&
            Math.abs(toPlayer.z) < halfDepth + playerRadius
        );
        
        if (isColliding) {
            return true;
        }
    }
    
    // Check collisions with gas station elements
    const gasStations = scene.children.filter(obj => obj.userData && obj.userData.isGasStation);
    for (const station of gasStations) {
        if (!station.userData.collisionElements) continue;
        
        for (const element of station.userData.collisionElements) {
            // Get world position of collision element
            const worldPos = new THREE.Vector3();
            if (element.mesh) {
                element.mesh.getWorldPosition(worldPos);
            } else if (element.position) {
                worldPos.copy(element.position);
                worldPos.applyMatrix4(station.matrixWorld);
            } else {
                continue; // Skip if no position info
            }
            
            let collision = false;
            
            if (element.type === 'box') {
                // Box collision
                const dx = Math.abs(worldPos.x - x);
                const dz = Math.abs(worldPos.z - z);
                
                // Apply rotation if needed
                const stationAngle = station.rotation.y;
                const rotatedWidth = Math.abs(element.width * Math.cos(stationAngle)) + 
                                    Math.abs(element.depth * Math.sin(stationAngle));
                const rotatedDepth = Math.abs(element.width * Math.sin(stationAngle)) + 
                                    Math.abs(element.depth * Math.cos(stationAngle));
                
                collision = (
                    dx < rotatedWidth/2 + playerRadius &&
                    dz < rotatedDepth/2 + playerRadius
                );
            } 
            else if (element.type === 'cylinder') {
                // Cylinder collision (simplified as circle in XZ plane)
                const dx = worldPos.x - x;
                const dz = worldPos.z - z;
                const distance = Math.sqrt(dx*dx + dz*dz);
                
                collision = distance < element.radius + playerRadius;
            }
            
            if (collision) {
                return true;
            }
        }
    }
    
    // Check collisions with road blockades (as solid areas)
    const roadEndX = 110;
    const roadWidth = 15;
    const blockadeDepth = 12; // How "deep" the blockade area is
    
    // East blockade area (positive X)
    if (Math.abs(x - roadEndX) < blockadeDepth && Math.abs(z) < roadWidth / 2 + 5) {
        return true;
    }
    
    // West blockade area (negative X)
    if (Math.abs(x + roadEndX) < blockadeDepth && Math.abs(z) < roadWidth / 2 + 5) {
        return true;
    }
    
    // NEW: Check collisions with environmental objects (rock formations and trees)
    if (scene.userData.environmentalColliders) {
        for (const collider of scene.userData.environmentalColliders) {
            if (collider.type === 'circle') {
                const dx = collider.position.x - x;
                const dz = collider.position.z - z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance < (collider.radius + playerRadius)) {
                    return true; // Collision detected
                }
            } 
            else if (collider.type === 'cylinder') {
                const dx = collider.position.x - x;
                const dz = collider.position.z - z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance < (collider.radius + playerRadius)) {
                    return true; // Collision detected
                }
            }
        }
    }
    
    // No collision detected with any object
    return false;
}

// Update the shop interface when the game starts
function updateShopInterface() {
    // Create the shop header content
    const shopHeader = document.querySelector('.shop-header');
    if (shopHeader) {
        shopHeader.innerHTML = `
            <h3>Supply Store</h3>
            <button id="closeShop">×</button>
        `;
    }
    
    // Create the player coins area
    const playerCoinsDiv = document.querySelector('.player-coins');
    if (playerCoinsDiv) {
        playerCoinsDiv.innerHTML = `
            <span class="coin-icon">🪙</span>
            <span id="shopCoins">0</span>
        `;
    }
}

// Update your startGame function
function startGame() {
    // Create floor for game scene
    const floorGeometry = new THREE.PlaneGeometry(281.25, 281.25);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4a2f2f, 
        side: THREE.DoubleSide,
        receiveShadow: true // Enable shadows on floor
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true; // Make floor receive shadows
    scene.add(floor);

    // Add fog to the scene for atmosphere
    scene.fog = new THREE.FogExp2(0x87CEEB, 0.003);

    // Initialize the day-night cycle
    initDayNightSystem();
    
    // Create environment elements
    createApocalypticRoad();
    addRoadBlockades();
    addAbandonedGasStation();
    addEnvironmentalObjects();
    
    // Initialize sound system
    soundManager.init();
    addButtonSounds();

    // Enable shadows on player - UPDATED player creation with proper camera setup
    const playerGeometry = new THREE.BoxGeometry(1, NORMAL_HEIGHT, 1);
    const playerMaterial = new THREE.MeshStandardMaterial({ color: playerColor });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.y = NORMAL_HEIGHT/2;
    player.castShadow = true; // Enable player shadow casting
    player.receiveShadow = true; // Enable player shadow receiving
    scene.add(player);

    // Clear mountains array
    mountains = [];
    
    // Create mountains for game scene with precise edge alignment
    const spacing = 12;
    const boundary = 131.25;
    const rows = 3;
    
    const mountainPositions = [];
    
    // Road parameters - FIXED for precise edge alignment
    const roadWidth = 15;
    const roadHalfWidth = roadWidth / 2; // Exact road half-width without extra clearance
    
    // IMPORTANT: Define road direction - X-axis in this case (east-west)
    const roadDirection = 'x'; // Valid values: 'x' or 'z'

    // Generate mountain positions for multiple rows
    for (let row = 0; row < rows; row++) {
        const offsetDistance = 10 * row;
        
        // Generate mountains along the x-axis (top and bottom borders)
        for (let x = -boundary - 10; x <= boundary + 10; x += spacing) {
            // Skip mountains only if road runs along Z-axis (north-south) AND at the boundary opening
            const distanceFromCenterX = Math.abs(x);
            const isInRoadPathX = roadDirection === 'z' && distanceFromCenterX <= roadHalfWidth;
            
            // Only add mountain if not in the road path
            if (!isInRoadPathX) {
                // For mountains near the road edge, position them precisely at the edge
                let xOffset = 0;
                
                if (roadDirection === 'z' && Math.abs(distanceFromCenterX - roadHalfWidth) < 6) {
                    // This mountain is near the road edge, align it precisely
                } else {
                    // Normal random offset for mountains away from road
                }
                
                mountainPositions.push({
                    x: x + xOffset,
                    z: -boundary + offsetDistance,
                    scale: 1 - row * 0.15
                });
                
                mountainPositions.push({
                    x: x + xOffset,
                    z: boundary - offsetDistance,
                    scale: 1 - row * 0.15
                });
            }
        }
        
        // Generate mountains along the z-axis (left and right borders)
        for (let z = -boundary - 10; z <= boundary + 10; z += spacing) {
            // Skip mountains only if road runs along X-axis (east-west) AND at the boundary opening
            const distanceFromCenterZ = Math.abs(z);
            const isInRoadPathZ = roadDirection === 'x' && distanceFromCenterZ <= roadHalfWidth;
            
            // Only add mountain if not in the road path
            if (!isInRoadPathZ) {
                // For mountains near the road edge, position them precisely at the edge
                let zOffset = 0;
                
                if (roadDirection === 'x' && Math.abs(distanceFromCenterZ - roadHalfWidth) < 6) {
                    // This mountain is near the road edge, align it precisely
                } else {
                    // Normal random offset for mountains away from road
                }
                
                mountainPositions.push({
                    x: -boundary + offsetDistance,
                    z: z + zOffset,
                    scale: 1 - row * 0.15
                });
                
                mountainPositions.push({
                    x: boundary - offsetDistance,
                    z: z + zOffset,
                    scale: 1 - row * 0.15
                });
            }
        }
    }
    
    // IMPORTANT: Create mountains only ONCE with the final positions
    mountainPositions.forEach(pos => {
        const baseHeight = 20 + (Math.random() - 0.5) * 24;
        const baseWidth = 8 + (Math.random() - 0.5) * 9;
        
        // Apply position-specific scale
        const scaledHeight = baseHeight * pos.scale;
        const scaledWidth = baseWidth * pos.scale;
        
        // Check if this mountain would overlap the road
        const distanceFromCenterX = Math.abs(pos.x);
        const distanceFromCenterZ = Math.abs(pos.z);
        
        // More precise calculation - Consider mountain base radius relative to road edge
        const mountainRadius = scaledWidth / 2;
        
        // Make sure mountain doesn't overlap road but can touch its edge exactly
        const roadOverlapX = roadDirection === 'z' && distanceFromCenterX - mountainRadius < roadHalfWidth;
        const roadOverlapZ = roadDirection === 'x' && distanceFromCenterZ - mountainRadius < roadHalfWidth;
        
        // Only create mountain if it doesn't overlap the road
        if (!roadOverlapX && !roadOverlapZ) {
            const mountainGeometry = new THREE.ConeGeometry(scaledWidth, scaledHeight, 4);
            const mountainMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x4d3319,
                flatShading: true 
            });
            
            const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
            mountain.position.set(pos.x, scaledHeight/2, pos.z);
            mountain.rotation.y = Math.random() * Math.PI / 2;

            mountain.castShadow = true; // Enable shadows for mountains
            mountain.receiveShadow = true; // Enable shadows for mountains
            
            scene.add(mountain);
            mountains.push(mountain);
        }
    });

    // UPDATED camera setup to prevent clipping through player
    pitchObject = new THREE.Object3D();
    yawObject = new THREE.Object3D();
    yawObject.add(pitchObject);
    
    // Create a camera holder object at eye level rather than center of player
    const cameraHolder = new THREE.Object3D();
    cameraHolder.position.y = NORMAL_HEIGHT * 0.8; // Position at 80% of player height (eye level)
    player.add(cameraHolder);
    
    // Add yaw object to camera holder instead of directly to player
    cameraHolder.add(yawObject);
    pitchObject.add(camera);
    
    // Set camera position - it's now relative to the holder
    camera.position.y = 0; // No additional height needed since holder is at eye level
    camera.position.z = 0;
    
    // Store camera holder reference for crouch handling
    player.userData.cameraHolder = cameraHolder;

    // Add ambient light for better visibility
    const ambientLight = new THREE.AmbientLight(0x606060);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Hide menus and show game
    document.getElementById('characterMenu').style.display = 'none';
    document.getElementById('backgroundScene').style.display = 'none';
    document.getElementById('gameScene').style.display = 'block';

    // Reset coins
    playerCoins = 0;

    // Update interface elements
    updateShopInterface();

    createItemModels();
    
    // Show the HUD
    document.getElementById('hud').style.display = 'flex';
    
    // Reset health and shield
    health = 100;
    shield = 0;
    updateHUD();

    //Create coin display
    createCoinDisplay();
    updateCoinDisplay();
    
    // Add pistol to inventory alongside knife
    inventory = [WEAPON_TYPES.KNIFE, null, null, null, null];
    inventoryItems = Array(10).fill(null);
    
    // Reset pistol ammo
    pistolAmmo = pistolMaxAmmo;
    pistolReloading = false;
    
    // Create ammo display in HUD
    createAmmoDisplay();
    createCrosshair(); // Add this line
    
    // Create weapon models
    setTimeout(() => {
        createKnifeModel();
        createPistolModel();
        createShotgunModel();
        createAssaultRifleModel();
        createSniperRifleModel();
        createCrossbowModel();
        createMinigunModel();
        createRocketLauncherModel();
    }, 100);
    
    // Initialize the knife as first item
    selectedSlot = 0; // Select the knife by default
    
    // Update displays
    updateItemBar();
    initializeInventory();
    
    // Create crosshair
    createCrosshair();
    
    gameStarted = true;

    // Start the rounds
    startRounds();
}

// Function to add roadblocks at the boundaries where the road meets the map edge
function addRoadBlockades(targetScene = scene) {
    // Road ends coordinates - just inside the player boundary limits
    const roadEndX = 110; // Slightly inside the actual boundary of 112.5
    const roadWidth = 15;
    
    // Create roadblocks for both ends of the road (east and west)
    const eastBlockade = createRoadBlockade(roadEndX, 0, targetScene);  // East end (positive X)
    const westBlockade = createRoadBlockade(-roadEndX, Math.PI, targetScene); // West end (negative X) - rotated 180°
    
    // Store these blockade groups for later cleanup
    roadBlockades.push(eastBlockade, westBlockade);
}

// Function to create a road blockade consisting of multiple elements
function createRoadBlockade(xPos, rotation, targetScene) {
    // Create blockade group to hold all elements
    const blockadeGroup = new THREE.Group();
    blockadeGroup.position.set(xPos, 0, 0);
    blockadeGroup.rotation.y = rotation;
    targetScene.add(blockadeGroup);

    function applyShadowsToGroup(group) {
        group.traverse(function(node) {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
    }
    
    // Create a crashed bus/truck as the main blockade
    createAbandonedVehicle(0, 0, 0, 0, blockadeGroup); // Position relative to group
    
    // Add concrete barriers in a staggered formation
    createBarricade(0, 0, 0, 0, blockadeGroup); // Position relative to group
    
    // Add some debris and smaller elements
    createRoadDebrisCluster(0, 0, 0, 0, blockadeGroup); // Position relative to group
    
    // Add warning signs
    createRoadSigns(0, 0, 0, 0, blockadeGroup); // Position relative to group

    applyShadowsToGroup(blockadeGroup); // Apply shadows to all elements in the group
    
    return blockadeGroup; // Return the group for tracking
}

// Add this to your resetGame function or create a new function to clean up barriers
function clearRoadBlockades() {
    // Remove all road blockades from their parent scenes
    for (const blockade of roadBlockades) {
        if (blockade && blockade.parent) {
            blockade.parent.remove(blockade);
        }
    }
    
    // Clear the tracking array
    roadBlockades = [];
}

// Function to create an abandoned vehicle (truck or bus)
// Function to create an abandoned vehicle (truck or bus)
function createAbandonedVehicle(x, y, z, rotation, targetScene) {
    // Create vehicle group
    const vehicleGroup = new THREE.Group();
    
    // Randomly choose between a truck or a bus
    const isTruck = Math.random() > 0.5;
    
    // Vehicle body dimensions
    const length = isTruck ? 8 : 12;
    const width = 3;
    const height = isTruck ? 3.5 : 3;
    
    // Main body
    const bodyGeometry = new THREE.BoxGeometry(length, height, width);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: isTruck ? 0x683c11 : 0x3b6e9a, // Brown for truck, blue for bus
        roughness: 0.9,
        metalness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = height/2;
    body.castShadow = true;
    body.receiveShadow = true;
    vehicleGroup.add(body);
    
    // Cabin (for truck)
    if (isTruck) {
        const cabinGeometry = new THREE.BoxGeometry(3, 2.5, width);
        const cabinMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222, 
            roughness: 0.7,
            metalness: 0.4
        });
        const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        cabin.position.set(length/2 - 1.5, height/2 + 0.5, 0);
        cabin.castShadow = true;
        cabin.receiveShadow = true;
        vehicleGroup.add(cabin);
        
        // Windshield
        const windshieldGeometry = new THREE.PlaneGeometry(2, 1.5);
        const windshieldMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.3
        });
        const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
        windshield.position.set(length/2 - 0.5, height/2 + 1, width/2 + 0.01);
        windshield.rotation.y = Math.PI/2;
        windshield.castShadow = true;
        windshield.receiveShadow = true;
        vehicleGroup.add(windshield);
    }
    
    // Windows for bus
    if (!isTruck) {
        // Add row of windows along sides
        const windowMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            transparent: true,
            opacity: 0.4,
            metalness: 0.6
        });
        
        for (let i = 0; i < 6; i++) {
            // Left side windows
            const leftWindow = new THREE.Mesh(
                new THREE.PlaneGeometry(1.2, 1),
                windowMaterial
            );
            leftWindow.position.set(-length/2 + 2 + i*1.6, height/2 + 0.2, width/2 + 0.01);
            leftWindow.rotation.y = Math.PI/2;
            leftWindow.castShadow = true;
            leftWindow.receiveShadow = true;
            vehicleGroup.add(leftWindow);
            
            // Right side windows
            const rightWindow = new THREE.Mesh(
                new THREE.PlaneGeometry(1.2, 1),
                windowMaterial
            );
            rightWindow.position.set(-length/2 + 2 + i*1.6, height/2 + 0.2, -width/2 - 0.01);
            rightWindow.rotation.y = -Math.PI/2;
            rightWindow.castShadow = true;
            rightWindow.receiveShadow = true;
            vehicleGroup.add(rightWindow);
        }
    }
    
    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.6, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.9
    });
    
    // Create wheels based on vehicle type
    const wheelCount = isTruck ? 4 : 6;
    const wheelSpacing = length / (wheelCount/2 + 1);
    
    for (let i = 0; i < wheelCount/2; i++) {
        // Left wheels
        const leftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        leftWheel.rotation.x = Math.PI/2;
        leftWheel.position.set(-length/2 + wheelSpacing * (i+1), 0.8, width/2);
        leftWheel.castShadow = true;
        leftWheel.receiveShadow = true;
        vehicleGroup.add(leftWheel);
        
        // Right wheels
        const rightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        rightWheel.rotation.x = Math.PI/2;
        rightWheel.position.set(-length/2 + wheelSpacing * (i+1), 0.8, -width/2);
        rightWheel.castShadow = true;
        rightWheel.receiveShadow = true;
        vehicleGroup.add(rightWheel);
    }
    
    // Add damage/weathering effects
    addVehicleDamage(vehicleGroup, isTruck, length, width, height);
    
    // Position the vehicle and tilt it to look crashed
    vehicleGroup.position.set(x, y, z);
    vehicleGroup.rotation.y = rotation;
    
    // Set a random tilt to make it look crashed
    const tiltAxis = Math.random() > 0.5 ? 'x' : 'z';
    const tiltAmount = (Math.random() * 0.2) + 0.1; // 0.1 to 0.3 radians
    vehicleGroup.rotation[tiltAxis] = Math.random() > 0.5 ? tiltAmount : -tiltAmount;
    
    // Block road by placing across it
    vehicleGroup.rotation.y += Math.PI/4 * (Math.random() > 0.5 ? 1 : -1);
    
    // Set shadow properties for ALL meshes in the vehicle group including those added by addVehicleDamage
    vehicleGroup.traverse(function(node) {
        if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
        }
    });
    
    targetScene.add(vehicleGroup);
    return vehicleGroup;
}

// Function to add damage effects to vehicles
function addVehicleDamage(vehicleGroup, isTruck, length, width, height) {
    // Rust patches
    const rustMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 1.0,
        metalness: 0.1
    });
    
    // Add several rust patches
    for (let i = 0; i < 4; i++) {
        const rustSize = new THREE.Vector3(
            1 + Math.random() * 2,
            0.8 + Math.random() * 1,
            0.1
        );
        
        const rustGeometry = new THREE.BoxGeometry(rustSize.x, rustSize.y, rustSize.z);
        const rustPatch = new THREE.Mesh(rustGeometry, rustMaterial);
        
        // Position randomly on vehicle sides
        const side = Math.random() > 0.5 ? 1 : -1;
        rustPatch.position.set(
            (Math.random() - 0.5) * length,
            Math.random() * height/2,
            side * (width/2 + 0.05)
        );
        
        vehicleGroup.add(rustPatch);
    }
    
    // Broken parts for truck body
    if (isTruck) {
        // Add dents and damage
        const dentMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const dentGeometry = new THREE.SphereGeometry(1.2, 8, 8, 0, Math.PI);
        const dent = new THREE.Mesh(dentGeometry, dentMaterial);
        dent.position.set(-length/4, height/3, width/2);
        dent.rotation.y = Math.PI/2;
        vehicleGroup.add(dent);
    }
}

// Function to create concrete barriers and barricades
function createBarricade(x, y, z, rotation, targetScene) {
    const barricadeGroup = new THREE.Group();
    
    // Create several concrete barriers in a zigzag pattern
    const barrierCount = 3 + Math.floor(Math.random() * 3); // 3-5 barriers
    const roadWidth = 15;
    
    for (let i = 0; i < barrierCount; i++) {
        // Create a concrete jersey barrier
        const barrierGeometry = new THREE.BoxGeometry(2.5, 1.2, 0.6);
        const barrierMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc, // Concrete gray
            roughness: 0.9,
            metalness: 0.1
        });
        
        const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
        
        // Position barriers in a zigzag pattern across the road
        const offset = (i % 2 === 0) ? roadWidth/3 : -roadWidth/3;
        barrier.position.set(i * -2, 0.6, offset);
        
        // Rotate barriers slightly to look haphazard
        barrier.rotation.y = (Math.random() - 0.5) * 0.5;
        
        barricadeGroup.add(barrier);
        
        // Add warning stripes to barriers
        addWarningStripes(barrier);
    }
    
    // Add some metal barriers or caution tape between concrete blocks
    for (let i = 0; i < barrierCount - 1; i++) {
        if (Math.random() > 0.5) {
            // Create a metal barrier
            const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8);
            const poleMaterial = new THREE.MeshStandardMaterial({
                color: 0x888888,
                roughness: 0.7,
                metalness: 0.5
            });
            
            // First pole
            const pole1 = new THREE.Mesh(poleGeometry, poleMaterial);
            pole1.position.set(i * -2 - 1, 0.75, (i % 2 === 0) ? roadWidth/3 - 0.5 : -roadWidth/3 - 0.5);
            barricadeGroup.add(pole1);
            
            // Second pole
            const pole2 = new THREE.Mesh(poleGeometry, poleMaterial);
            pole2.position.set((i+1) * -2 + 1, 0.75, (i % 2 === 0) ? -roadWidth/3 + 0.5 : roadWidth/3 + 0.5);
            barricadeGroup.add(pole2);
            
            // Connect with caution tape
            createCautionTape(pole1.position, pole2.position, barricadeGroup);
        }
    }
    
    // Position and rotate the entire barricade
    barricadeGroup.position.set(x, y, z);
    barricadeGroup.rotation.y = rotation;
    
    targetScene.add(barricadeGroup);
    return barricadeGroup;
}

// Function to add warning stripes to barriers
function addWarningStripes(barrier) {
    // Add red and white warning stripes
    const stripeGeometry = new THREE.PlaneGeometry(2.4, 0.3);
    const redMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide
    });
    const whiteMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    
    // Create alternating stripes
    for (let i = 0; i < 3; i++) {
        const stripe = new THREE.Mesh(
            stripeGeometry, 
            i % 2 === 0 ? redMaterial : whiteMaterial
        );
        stripe.position.set(0, -0.3 + i * 0.3, 0.31);
        barrier.add(stripe);
    }
}

// Function to create caution tape between poles
function createCautionTape(start, end, parent) {
    // Calculate distance and direction
    const direction = new THREE.Vector3().subVectors(end, start);
    const distance = direction.length();
    
    // Create tape mesh
    const tapeGeometry = new THREE.PlaneGeometry(distance, 0.1);
    const tapeMaterial = new THREE.MeshBasicMaterial({
        color: 0xffcc00, // Caution yellow
        side: THREE.DoubleSide
    });
    
    const tape = new THREE.Mesh(tapeGeometry, tapeMaterial);
    
    // Position midway between poles
    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    tape.position.copy(midpoint);
    
    // Orient tape to face between poles
    tape.lookAt(end);
    tape.rotation.y += Math.PI/2;
    
    // Add to parent
    parent.add(tape);
    return tape;
}

// Function to create warning signs and traffic markers
function createRoadSigns(x, y, z, rotation, targetScene) {
    const signsGroup = new THREE.Group();
    
    // Create a few warning signs
    for (let i = -1; i <= 1; i += 2) {
        // Create sign post
        const postGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2, 8);
        const postMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.7,
            metalness: 0.5
        });
        
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.set(-2, 1, i * 5);
        signsGroup.add(post);
        
        // Create sign panel
        const panelGeometry = new THREE.PlaneGeometry(0.8, 0.8);
        
        // Choose between different sign types
        let panelMaterial;
        if (Math.random() > 0.5) {
            // Road closed sign (red and white)
            panelMaterial = new THREE.MeshStandardMaterial({
                color: 0xff0000,
                roughness: 0.7,
                metalness: 0.3,
                side: THREE.DoubleSide
            });
        } else {
            // Warning sign (yellow)
            panelMaterial = new THREE.MeshStandardMaterial({
                color: 0xffcc00,
                roughness: 0.7,
                metalness: 0.3,
                side: THREE.DoubleSide
            });
        }
        
        const panel = new THREE.Mesh(panelGeometry, panelMaterial);
        panel.position.set(0, 0.8, 0);
        panel.rotation.y = Math.PI/2;
        
        // Tilt the sign to look damaged
        panel.rotation.z = (Math.random() - 0.5) * 0.3;
        
        post.add(panel);
    }
    
    // Add traffic cones
    const coneCount = 4 + Math.floor(Math.random() * 4); // 4-7 cones
    
    for (let i = 0; i < coneCount; i++) {
        const cone = createTrafficCone();
        
        // Position cones randomly across the road
        cone.position.set(
            -4 - Math.random() * 2,
            0,
            (Math.random() - 0.5) * 10
        );
        
        // Knock some cones over
        if (Math.random() > 0.7) {
            const fallAxis = Math.random() > 0.5 ? 'x' : 'z';
            cone.rotation[fallAxis] = Math.PI/2 * (Math.random() > 0.5 ? 1 : -1);
            cone.position.y = 0.2;
        }
        
        signsGroup.add(cone);
    }
    
    // Position and rotate entire group
    signsGroup.position.set(x, y, z);
    signsGroup.rotation.y = rotation;
    
    targetScene.add(signsGroup);
    return signsGroup;
}

// Function to create a traffic cone
function createTrafficCone() {
    const coneGroup = new THREE.Group();
    
    // Create the cone body
    const coneGeometry = new THREE.CylinderGeometry(0.1, 0.3, 0.7, 16);
    const coneMaterial = new THREE.MeshStandardMaterial({
        color: 0xff6600, // Orange
        roughness: 0.9,
        metalness: 0.1
    });
    
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.y = 0.35;
    coneGroup.add(cone);
    
    // Add reflective strips
    const stripGeometry = new THREE.TorusGeometry(0.25, 0.03, 16, 32);
    const stripMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x888888,
        roughness: 0.5,
        metalness: 0.8
    });
    
    // Add two reflective strips
    const strip1 = new THREE.Mesh(stripGeometry, stripMaterial);
    strip1.position.y = 0.2;
    strip1.rotation.x = Math.PI/2;
    coneGroup.add(strip1);
    
    const strip2 = new THREE.Mesh(stripGeometry, stripMaterial);
    strip2.position.y = 0.4;
    strip2.rotation.x = Math.PI/2;
    strip2.scale.set(0.7, 0.7, 0.7); // Smaller top strip
    coneGroup.add(strip2);
    
    return coneGroup;
}

// Function to create road debris clusters
function createRoadDebrisCluster(x, y, z, rotation, targetScene) {
    const debrisGroup = new THREE.Group();
    
    // Create a pile of debris
    const debrisCount = 15 + Math.floor(Math.random() * 10);
    const debrisRadius = 7; // Spread radius
    
    for (let i = 0; i < debrisCount; i++) {
        // Decide debris type
        const debrisType = Math.floor(Math.random() * 4);
        let debris;
        
        switch (debrisType) {
            case 0: // Concrete chunk
                debris = new THREE.Mesh(
                    new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.3, 0),
                    new THREE.MeshStandardMaterial({
                        color: 0xaaaaaa,
                        roughness: 0.9
                    })
                );
                break;
                
            case 1: // Metal piece
                debris = new THREE.Mesh(
                    new THREE.BoxGeometry(
                        0.2 + Math.random() * 0.4,
                        0.05 + Math.random() * 0.1,
                        0.2 + Math.random() * 0.4
                    ),
                    new THREE.MeshStandardMaterial({
                        color: 0x888888,
                        roughness: 0.6,
                        metalness: 0.7
                    })
                );
                break;
                
            case 2: // Road asphalt chunk
                debris = new THREE.Mesh(
                    new THREE.BoxGeometry(
                        0.3 + Math.random() * 0.4,
                        0.1 + Math.random() * 0.2,
                        0.3 + Math.random() * 0.4
                    ),
                    new THREE.MeshStandardMaterial({
                        color: 0x333333,
                        roughness: 0.9
                    })
                );
                break;
                
            case 3: // Twisted metal rod
                debris = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.03, 0.03, 0.5 + Math.random() * 0.8, 6),
                    new THREE.MeshStandardMaterial({
                        color: 0x8B4513,
                        roughness: 0.7,
                        metalness: 0.5
                    })
                );
                break;
        }
        
        // Position randomly within debris field
        debris.position.set(
            -4 - Math.random() * 2, // Further back from the barrier
            Math.random() * 0.5,   // Height
            (Math.random() - 0.5) * debrisRadius // Spread across road width
        );
        
        // Random rotation
        debris.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );
        
        debrisGroup.add(debris);
    }
    
    // Position and rotate the entire debris group
    debrisGroup.position.set(x, y, z);
    debrisGroup.rotation.y = rotation;
    
    targetScene.add(debrisGroup);
    return debrisGroup;
}

// Improved pistol firing animation with forced reset
function animatePistolFire() {
    if (!pistolModel || pistolReloading) return;
    
    // Force cancel any ongoing animation to prevent conflicts
    if (pistolAnimationInProgress) {
        cancelAnimationFrame(pistolAnimationId);
        // Reset position immediately
        pistolModel.position.copy(PISTOL_IDLE_POSITION);
        pistolModel.rotation.copy(PISTOL_IDLE_ROTATION);
    }
    
    // Mark animation as in progress
    pistolAnimationInProgress = true;
    
    // Animation constants
    const recoilDuration = 100; // milliseconds
    const returnDuration = 150; // milliseconds
    
    // Start time
    const startTime = performance.now();
    
    function animate() {
        const now = performance.now();
        const elapsed = now - startTime;
        
        if (elapsed < recoilDuration) {
            // Recoil motion
            const progress = elapsed / recoilDuration;
            pistolModel.position.z = PISTOL_IDLE_POSITION.z + (0.1 * progress);
            pistolModel.position.y = PISTOL_IDLE_POSITION.y + (0.03 * progress);
            pistolModel.rotation.x = PISTOL_IDLE_ROTATION.x - (Math.PI / 36 * progress);
            pistolAnimationId = requestAnimationFrame(animate);
        } else if (elapsed < recoilDuration + returnDuration) {
            // Return motion
            const returnProgress = (elapsed - recoilDuration) / returnDuration;
            pistolModel.position.z = PISTOL_IDLE_POSITION.z + (0.1 * (1 - returnProgress));
            pistolModel.position.y = PISTOL_IDLE_POSITION.y + (0.03 * (1 - returnProgress));
            pistolModel.rotation.x = PISTOL_IDLE_ROTATION.x - (Math.PI / 36 * (1 - returnProgress));
            pistolAnimationId = requestAnimationFrame(animate);
        } else {
            // CRITICAL: Reset to exact original values
            pistolModel.position.copy(PISTOL_IDLE_POSITION);
            pistolModel.rotation.copy(PISTOL_IDLE_ROTATION);
            
            // Clear animation state
            pistolAnimationInProgress = false;
            pistolAnimationId = null;
        }
    }
    
    pistolAnimationId = requestAnimationFrame(animate);
}

// Improved pistol reload animation with forced reset
function animatePistolReload() {
    if (!pistolModel || pistolReloading) return;
    
    // Force cancel any ongoing animation to prevent conflicts
    if (pistolAnimationInProgress) {
        cancelAnimationFrame(pistolAnimationId);
        // Reset position immediately
        pistolModel.position.copy(PISTOL_IDLE_POSITION);
        pistolModel.rotation.copy(PISTOL_IDLE_ROTATION);
    }
    
    pistolReloading = true;
    pistolAnimationInProgress = true;
    showNotification("Reloading...", 1000);

    soundManager.play('pistol_reload', 0.8);
    
    // Animation constants
    const totalDuration = 1000; // 1 second reload time
    const startTime = performance.now();
    
    function animate() {
        const now = performance.now();
        const elapsed = now - startTime;
        
        if (elapsed < totalDuration) {
            const progress = elapsed / totalDuration;
            
            // Drop and rotate animation
            pistolModel.position.y = PISTOL_IDLE_POSITION.y - (0.2 * Math.sin(progress * Math.PI));
            pistolModel.rotation.z = PISTOL_IDLE_ROTATION.z + (Math.PI / 4 * Math.sin(progress * Math.PI));
            
            pistolAnimationId = requestAnimationFrame(animate);
        } else {
            // CRITICAL: Reset to exact original values
            pistolModel.position.copy(PISTOL_IDLE_POSITION);
            pistolModel.rotation.copy(PISTOL_IDLE_ROTATION);
            
            // Reload complete
            pistolAmmo = pistolMaxAmmo;
            pistolReloading = false;
            updateAmmoDisplay();
            
            // Clear animation state
            pistolAnimationInProgress = false;
            pistolAnimationId = null;
        }
    }
    
    pistolAnimationId = requestAnimationFrame(animate);
}

// Fire pistol
function firePistol() {
    if (pistolReloading) return;
    
    if (pistolAmmo <= 0) {
        // Auto reload when empty
        animatePistolReload();
        return;
    }

    // Play pistol firing sound
    soundManager.play('pistol_fire', 0.7);
    
    // Decrement ammo
    pistolAmmo--;
    updateAmmoDisplay();
    
    // Play firing animation
    animatePistolFire();
    
    // Create bullet
    createBullet();
    
    // Auto reload when empty
    if (pistolAmmo === 0) {
        setTimeout(animatePistolReload, 300);
    }
}

// Create and fire a bullet
function createBullet() {
    // Create bullet geometry
    const bulletGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Add shadow casting to bullet
    bullet.castShadow = true;
    
    // Get camera position and direction
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);
    
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    camera.getWorldDirection(cameraDirection);
    
    // Position bullet at gun barrel
    bullet.position.copy(cameraPosition).addScaledVector(cameraDirection, 0.6);
    
    // Orient bullet
    bullet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), cameraDirection);
    
    // Add bullet data
    bullet.userData = {
        direction: cameraDirection.clone(),
        speed: 2.0,
        damage: 14, // Changed from 20 to 14, now takes 3 hits to kill normal enemy
        lifetime: 1000,
        spawnTime: performance.now()
    };
    
    scene.add(bullet);
    bullets.push(bullet);
    
    return bullet;
}

// Update bullets and handle rocket explosions
function updateBullets() {
    const now = performance.now();
    
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // Skip if bullet was already removed
        if (!bullet.parent) continue;
        
        // Store previous position for collision check
        const previousPosition = bullet.position.clone();
        
        // Move bullet
        bullet.position.addScaledVector(bullet.userData.direction, bullet.userData.speed);
        
        // Check lifetime
        if (now - bullet.userData.spawnTime > bullet.userData.lifetime) {
            // Handle rocket explosion on timeout
            if (bullet.userData.isRocket) {
                createRocketExplosion(bullet.position, bullet.userData.blastRadius, bullet.userData.damage);
                
                // Clean up any ongoing thrust effects
                if (bullet.userData.thrustEmitter) {
                    clearInterval(bullet.userData.thrustEmitter);
                }
            }
            
            scene.remove(bullet);
            bullets.splice(i, 1);
            continue;
        }
        
        // For rockets only: check ground collision (y=0 is floor)
        if (bullet.userData.isRocket && bullet.position.y < 0.5) {
            // Rocket hit the ground
            createRocketExplosion(
                new THREE.Vector3(bullet.position.x, 0.5, bullet.position.z), 
                bullet.userData.blastRadius, 
                bullet.userData.damage
            );
            
            // Clean up thrust effects
            if (bullet.userData.thrustEmitter) {
                clearInterval(bullet.userData.thrustEmitter);
            }
            
            scene.remove(bullet);
            bullets.splice(i, 1);
            continue;
        }
        
        // Check enemy hits - use a larger collision box for rockets
        const collisionCheckRadius = bullet.userData.isRocket ? 1.5 : 0.5;
        let hitDetected = false;
        
        for (let j = 0; j < activeEnemies.length; j++) {
            const enemy = activeEnemies[j];
            if (!enemy || !enemy.position) continue;
            
            const distance = bullet.position.distanceTo(enemy.position);
            
            // Use larger collision radius for rockets and other projectiles
            const collisionRadius = enemy.geometry.parameters.width + collisionCheckRadius;
            
            // If hit
            if (distance < collisionRadius) {
                hitDetected = true;
                
                // Special handling for rockets - explode on impact
                if (bullet.userData.isRocket) {
                    console.log("Rocket hit enemy at distance:", distance);
                    
                    // Create explosion at the point of impact
                    createRocketExplosion(bullet.position, bullet.userData.blastRadius, bullet.userData.damage);
                    
                    // Clean up thrust effects
                    if (bullet.userData.thrustEmitter) {
                        clearInterval(bullet.userData.thrustEmitter);
                    }
                } else {
                    // Regular bullet damage
                    const damageAmount = bullet.userData.damage;
                    damageEnemy(enemy, damageAmount);
                    
                    // Create hit effect
                    createHitEffect(bullet.position);
                    
                    // Show hit marker
                    showHitMarker();
                }
                
                // Remove bullet
                scene.remove(bullet);
                bullets.splice(i, 1);
                break;
            }
        }
        
        if (hitDetected) continue;
        
        // For rockets only: check comprehensive environment collisions
        if (bullet.userData.isRocket) {
            if (checkRocketEnvironmentCollisions(bullet, i)) {
                continue; // Skip rest of loop if collision was found and handled
            }
        }
    }
}

// New comprehensive environment collision check function for rockets
function checkRocketEnvironmentCollisions(rocket, rocketIndex) {
    // ---------- 1. ABANDONED CARS ----------
    for (const car of abandonedCars) {
        if (!car || !car.userData) continue;
        
        // Get car dimensions from userData
        const carRadius = car.userData.collisionRadius;
        
        if (!carRadius) continue;
        
        // Calculate distance between rocket and car
        const distance = rocket.position.distanceTo(car.position);
        
        // Check if collision occurs
        if (distance < carRadius) {
            console.log("Rocket hit car at distance:", distance);
            handleRocketCollision(rocket, rocketIndex);
            return true;
        }
    }
    
    // ---------- 2. GAS STATION ELEMENTS ----------
    const gasStations = scene.children.filter(obj => obj.userData && obj.userData.isGasStation);
    for (const station of gasStations) {
        if (!station.userData.collisionElements) continue;
        
        for (const element of station.userData.collisionElements) {
            // Get world position of collision element
            const worldPos = new THREE.Vector3();
            if (element.mesh) {
                element.mesh.getWorldPosition(worldPos);
            } else if (element.position) {
                worldPos.copy(element.position);
                worldPos.applyMatrix4(station.matrixWorld);
            } else {
                continue; // Skip if no position info
            }
            
            let collision = false;
            
            if (element.type === 'box') {
                // Box collision
                const dx = Math.abs(worldPos.x - rocket.position.x);
                const dz = Math.abs(worldPos.z - rocket.position.z);
                
                // Apply rotation if needed
                const stationAngle = station.rotation.y;
                const rotatedWidth = Math.abs(element.width * Math.cos(stationAngle)) + 
                                    Math.abs(element.depth * Math.sin(stationAngle));
                const rotatedDepth = Math.abs(element.width * Math.sin(stationAngle)) + 
                                    Math.abs(element.depth * Math.cos(stationAngle));
                
                collision = (
                    dx < rotatedWidth/2 + 0.5 &&
                    dz < rotatedDepth/2 + 0.5
                );
            } 
            else if (element.type === 'cylinder') {
                // Cylinder collision (simplified as circle in XZ plane)
                const dx = worldPos.x - rocket.position.x;
                const dz = worldPos.z - rocket.position.z;
                const distance = Math.sqrt(dx*dx + dz*dz);
                
                collision = distance < element.radius + 0.5;
            }
            
            if (collision) {
                console.log("Rocket hit gas station element");
                handleRocketCollision(rocket, rocketIndex);
                return true;
            }
        }
    }
    
    // ---------- 3. ROAD LAMPS ----------
    for (const lamp of roadLampObjects) {
        if (!lamp || !lamp.userData || !lamp.userData.isLampPost) continue;
        
        const lampRadius = lamp.userData.collisionRadius || 0.5;
        const distance = rocket.position.distanceTo(lamp.position);
        
        if (distance < lampRadius) {
            console.log("Rocket hit lamp post at distance:", distance);
            handleRocketCollision(rocket, rocketIndex);
            return true;
        }
    }
    
    // ---------- 4. ENVIRONMENTAL OBJECTS (ROCKS AND DEAD TREES) ----------
    if (scene.userData.environmentalColliders) {
        for (const collider of scene.userData.environmentalColliders) {
            if (collider.type === 'circle' || collider.type === 'cylinder') {
                const dx = collider.position.x - rocket.position.x;
                const dz = collider.position.z - rocket.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance < collider.radius) {
                    console.log("Rocket hit environmental object (tree/rock)");
                    handleRocketCollision(rocket, rocketIndex);
                    return true;
                }
            }
        }
    }
    
    // ---------- 5. MOUNTAINS ----------
    for (const mountain of mountains) {
        const dx = mountain.position.x - rocket.position.x;
        const dz = mountain.position.z - rocket.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // Mountain base is approximately cone width
        if (distance < (mountain.geometry.parameters.radius + 0.5)) {
            // Check height to ensure we're hitting the mountain
            if (rocket.position.y < mountain.position.y + mountain.geometry.parameters.height) {
                console.log("Rocket hit mountain");
                handleRocketCollision(rocket, rocketIndex);
                return true;
            }
        }
    }
    
    // ---------- 6. ROAD BLOCKADES ----------
    for (const blockade of roadBlockades) {
        if (!blockade || !blockade.position) continue;
        
        // Use a reasonable collision radius for blockades
        const blockadeRadius = 6; // Generous detection radius
        const distance = rocket.position.distanceTo(blockade.position);
        
        if (distance < blockadeRadius) {
            console.log("Rocket hit road blockade");
            handleRocketCollision(rocket, rocketIndex);
            return true;
        }
    }
    
    // No collision detected
    return false;
}

// Helper function to handle rocket collision with environment
function handleRocketCollision(rocket, rocketIndex) {
    // Create explosion at the impact point
    createRocketExplosion(rocket.position, rocket.userData.blastRadius, rocket.userData.damage);
    
    // Clean up thrust effects
    if (rocket.userData.thrustEmitter) {
        clearInterval(rocket.userData.thrustEmitter);
    }
    
    // Remove the rocket
    scene.remove(rocket);
    bullets.splice(rocketIndex, 1);
}

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

// Update the main menu controls button
document.getElementById('controlsButton').addEventListener('click', () => {
    controlsAccessedFrom = 'main';
    document.getElementById('menu').style.display = 'none';
    document.getElementById('controlsMenu').style.display = 'block';
});

// Update the back button handler to restore round info opacity
document.getElementById('backButton').addEventListener('click', () => {
    document.getElementById('controlsMenu').style.display = 'none';
    
    // Restore round info opacity regardless of where we're returning to
    const roundInfo = document.getElementById('roundInfo');
    if (roundInfo) {
        roundInfo.style.opacity = '1';
        roundInfo.style.pointerEvents = 'auto'; // Re-enable interaction
    }
    
    // Return to the appropriate menu based on where we came from
    if (controlsAccessedFrom === 'main') {
        document.getElementById('menu').style.display = 'block';
        // Keep HUD hidden
    } else {
        document.getElementById('pauseMenu').style.display = 'block';
        // Keep HUD hidden for pause menu
        document.getElementById('hud').style.display = 'none';
    }
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

// Function to cancel item use
function cancelItemUse() {
    if (!usingItem) return;
    
    // Clear timeout
    if (itemUseTimeout) {
        clearTimeout(itemUseTimeout);
        itemUseTimeout = null;
    }
    
    // Stop animation
    if (consumableAnimationId) {
        cancelAnimationFrame(consumableAnimationId);
        consumableAnimationId = null;
    }
    
    // Remove held model
    if (heldConsumableModel) {
        camera.remove(heldConsumableModel);
        heldConsumableModel = null;
    }
    
    // Remove timer
    removeCircularTimer();
    
    // Reset state
    usingItem = false;
    currentItemInUse = null;
    consumableAnimationInProgress = false;
    
    // Show notification
    showNotification("Canceled item use");
    
    // Update weapon visibility
    updateWeaponVisibility();
}

// Replace the existing fullscreen handler
document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key in keys) keys[key] = true;
    if (event.code === 'ShiftLeft') keys.shift = true;
    if (event.code === 'Space') keys.space = true;
    if (event.code === 'KeyB' && gameStarted && !isPaused || isShopOpen) {
        toggleShop();
    } 
    
    // Item slot selection with number keys
     if (gameStarted && !isPaused) {
        if (event.key >= '1' && event.key <= '5') {
            const newSlot = parseInt(event.key) - 1;
            
            // Cancel item use if changing slots while using an item
            if (usingItem && newSlot !== selectedSlot) {
                cancelItemUse();
            }
            
            selectSlot(newSlot);
        }
    }
        
    
    // Toggle inventory with 'Tab' key ONLY
    if (gameStarted && !isPaused && event.code === 'Tab') {
        event.preventDefault(); // Prevent tab from changing focus
        toggleInventory();
    }
    
    // Existing code for F11, Escape, etc.
    if (event.code === 'F11') {
        event.preventDefault();
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
    if (event.code === 'Escape' && document.pointerLockElement) {
        document.exitPointerLock();
    }
    // Update the keydown event listener part that handles the pause toggle
    if (event.code === 'KeyP' && gameStarted) {
        isPaused = !isPaused;
        if (isPaused) {
            document.exitPointerLock();
            document.getElementById('pauseMenu').style.display = 'block';
            // Hide HUD elements when paused
            document.getElementById('hud').style.display = 'none';
            hideCrosshair(); // Hide crosshair when paused
        } else {
            document.getElementById('pauseMenu').style.display = 'none';
            // Show HUD elements when unpaused
            document.getElementById('hud').style.display = 'flex';
            showCrosshair(); // Show crosshair when unpaused
        }
    }
    
    // Add reload with R key
    if (event.code === 'KeyR' && gameStarted && !isPaused) {
        if (inventory[selectedSlot] === WEAPON_TYPES.PISTOL && pistolAmmo < pistolMaxAmmo && !pistolReloading) {
            animatePistolReload();
        }
        else if (inventory[selectedSlot] === WEAPON_TYPES.SHOTGUN && shotgunAmmo < shotgunMaxAmmo && !shotgunReloading) {
            animateShotgunReload();
        }
        else if (inventory[selectedSlot] === WEAPON_TYPES.ASSAULT_RIFLE && assaultRifleAmmo < assaultRifleMaxAmmo && !assaultRifleReloading) {
            animateAssaultRifleReload();
        }
        else if (inventory[selectedSlot] === WEAPON_TYPES.CROSSBOW && crossbowAmmo < crossbowMaxAmmo && !crossbowReloading) {
        animateCrossbowReload();
        }
    }
});

// Modify the click event handler to ensure knife can be used while moving
document.addEventListener('click', (event) => {
    if (gameStarted && !isPaused) {
        if (!isLocked) {
            // Request pointer lock if not already locked
            document.body.requestPointerLock();
        } else {
            // Use the selected item when locked and playing
            // This should work regardless of movement state
            useSelectedItem();
            updateAmmoDisplay();

            // Check for enemy hit if using knife
            if (inventory[selectedSlot] === 0) { // Knife is item type 0
                checkEnemyHit();
            }
        }
        if (isShopOpen || isInventoryOpen) {
        return;
        }

        if (gameStarted && !isLocked && !isPaused) {
        document.body.requestPointerLock();
        }
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
let isPaused = false;
let playerCoins = 0;
let isShopOpen = false;
let infiniteMoneyCheat = false;
let originalCoinColor = null;
let heldConsumableModel = null;
let consumableAnimationInProgress = false;
let consumableAnimationId = null;
let usingItem = false;
let currentItemInUse = null;
let itemUseStartTime = 0;
let itemUseTimeout = null
let mouseIsDown = false;

const HELD_ITEM_POSITION = new THREE.Vector3(0.3, -0.3, -0.5);
const HELD_ITEM_ROTATION = new THREE.Euler(0, Math.PI, 0);

// Update the color selection functionality
let selectedColor = null;
const startGameButton = document.getElementById('startGame');

document.querySelectorAll('.color-btn').forEach(button => {
    button.addEventListener('click', () => {
        selectedColor = parseInt(button.dataset.color);
        playerColor = selectedColor;
        
        // Update button classes
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        button.classList.add('selected');
        
        // Enable start game button
        startGameButton.disabled = false;
    });
});

// Update the start game event listener
document.getElementById('startGame').addEventListener('click', () => {
    if (!selectedColor) {
        alert('Please select a color first!');
        return;
    }
    
    gameStarted = true;
    document.getElementById('characterMenu').style.display = 'none';
    document.getElementById('backgroundScene').style.display = 'none';
    document.getElementById('gameScene').style.display = 'block';
    startGame();
    document.body.requestPointerLock();
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('closeShop').addEventListener('click', toggleShop);
});

// Create floor and mountains for menu background
function createMenuScene() {
    // Clear any existing objects in the menu scene
    while(menuScene.children.length > 0) { 
        menuScene.remove(menuScene.children[0]); 
    }
    
    // Enable shadows in renderer
    menuRenderer.shadowMap.enabled = true;
    menuRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Add lights first
    const ambientLight = new THREE.AmbientLight(0x404040);
    menuScene.add(ambientLight);

    // Add sun directional light with shadows (positioned at noon)
    const directionalLight = new THREE.DirectionalLight(0xffffcc, 1.0);
    directionalLight.position.set(0, 100, 0); // Sun at noon position (directly overhead)
    directionalLight.castShadow = true;
    
    // Configure shadow properties
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    menuScene.add(directionalLight);

    // Create visual object for sun (larger size)
    const sunGeometry = new THREE.SphereGeometry(20, 16, 16);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff80 });
    const sunObject = new THREE.Mesh(sunGeometry, sunMaterial);
    sunObject.position.set(0, 350, 0); // Position sun high in the sky (noon)
    menuScene.add(sunObject);
    
    // Create sky sphere
    const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x87CEEB, // Bright blue sky for noon
        side: THREE.BackSide,
        fog: false
    });
    const skySphere = new THREE.Mesh(skyGeometry, skyMaterial);
    menuScene.add(skySphere);

    // Add fog to the scene for atmosphere
    menuScene.fog = new THREE.FogExp2(0x87CEEB, 0.003);

    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(281.25, 281.25);
    const floorMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x4a2f2f,  
        side: THREE.DoubleSide 
    });
    const menuFloor = new THREE.Mesh(floorGeometry, floorMaterial);
    menuFloor.rotation.x = -Math.PI / 2;
    menuFloor.receiveShadow = true; // Enable floor to receive shadows
    menuScene.add(menuFloor);

    // Add apocalyptic road to menu scene
    createMenuApocalypticRoad();
    addRoadBlockades(menuScene);

    // Create mountains
    createMountainsForMenu();
    
    // Add abandoned cars to menu scene with different positions than the game scene
    addMenuAbandonedCars();
    
    // Add gas station to menu scene
    addMenuGasStation();
    
    // Add rock formations and dead trees to menu scene
    addEnvironmentalObjectsToMenu();
}

// New function to add environmental objects to menu scene
function addEnvironmentalObjectsToMenu() {
    // Add rock formations
    createRockFormations(menuScene);
    
    // Add dead trees
    createDeadTrees(menuScene);
}

// Function to add abandoned cars specific to the menu scene
function addMenuAbandonedCars() {
    // Load abandoned car models with specific positions for the menu scene
    loadAbandonedCarModel(15, -3, Math.PI * 0.8, menuScene);
    loadAbandonedCarModel(-25, 2, Math.PI * 0.3, menuScene);
    loadAbandonedCarModel(40, 5, Math.PI * 1.5, menuScene);
    loadAbandonedCarModel(-60, -4, Math.PI * 0.7, menuScene);
}

// Function to add gas station to menu scene
function addMenuGasStation() {
    // Create a group to hold all gas station elements
    const gasStationGroup = new THREE.Group();
    gasStationGroup.userData.isGasStation = true;
    
    // Position in the menu scene - MATCH the game scene position and rotation
    gasStationGroup.position.set(-15, 0, 20); // Same as game scene
    gasStationGroup.rotation.y = Math.PI; // Same as game scene

    // Initialize collision elements array
    gasStationGroup.userData.collisionElements = [];
    
    // Add the road surface beneath the gas station
    addGasStationRoadArea(gasStationGroup);

    // 1. Main building
    createMainBuilding(gasStationGroup);
    
    // 2. Gas pumps
    createGasPumps(gasStationGroup);
    
    // 3. Canopy (roof over pumps)
    createCanopy(gasStationGroup);
    
    // 4. Add debris and details
    addDebrisAndDetails(gasStationGroup);
    
    // 5. Add some lighting effects (broken flickering light)
    addBrokenLighting(gasStationGroup);

    gasStationGroup.traverse(function(node) {
        if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
        }
    });
    
    // Add to menu scene
    menuScene.add(gasStationGroup);
    
    return gasStationGroup;
}

// Function to add road lamps along the apocalyptic road
function addRoadLamps(roadLength, roadWidth, targetScene = scene) {
    const lampCount = 16; // Number of lamps to place
    const lampSpacing = roadLength / lampCount;
    const lampOffset = roadWidth / 2 + 1; // Place lamps just outside the road edge
    
    // Create lamps along both sides of the road
    for (let i = 0; i < lampCount; i++) {
        // Calculate lamp positions along the road
        const xPos = -roadLength/2 + i * lampSpacing + lampSpacing/2;
        
        // Left side lamp (negative Z) - faces toward the positive Z (toward the road)
        const leftLampState = decideLampState();
        createRoadLamp(xPos, 0, -lampOffset, leftLampState, targetScene, 'left');
        
        // Right side lamp (positive Z) - faces toward the negative Z (toward the road)
        const rightLampState = decideLampState();
        createRoadLamp(xPos, 0, lampOffset, rightLampState, targetScene, 'right');
    }
}

// Function to decide lamp state based on probabilities
function decideLampState() {
    const random = Math.random();
    if (random < 0.5) {
        // 50% chance to be completely broken
        return 'broken';
    } else if (random < 0.8) {
        // 30% chance to be working
        return 'working';
    } else {
        // 20% chance to be damaged/flickering
        return 'damaged';
    }
}

// Function to create a road lamp with specified state
function createRoadLamp(x, y, z, state, targetScene, side) {
    // Create lamp post group
    const lampGroup = new THREE.Group();
    
    // Create lamp post (vertical pole)
    const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 4.5, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.8,
        metalness: 0.5
    });
    
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = 2.25; // Half height
    
    // Add shadows to pole
    pole.castShadow = true;
    pole.receiveShadow = true;
    
    lampGroup.add(pole);
    
    // Create cross arm (horizontal part)
    const armGeometry = new THREE.CylinderGeometry(0.07, 0.07, 1.5, 8);
    const arm = new THREE.Mesh(armGeometry, poleMaterial);
    arm.rotation.x = Math.PI / 2; // Correctly orient horizontally
    arm.position.y = 4; // Top of pole
    
    // Add shadows to arm
    arm.castShadow = true;
    arm.receiveShadow = true;
    
    // All lamps will have arms extending in the same local direction
    // The entire lampGroup will be rotated later to make them face the road
    arm.position.z = 0.65;
    lampGroup.add(arm);
    
    // Create lamp head
    const lampHeadGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.3, 8);
    const lampHeadMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.5,
        metalness: 0.8
    });
    
    const lampHead = new THREE.Mesh(lampHeadGeometry, lampHeadMaterial);
    // Rotate to point downward correctly
    lampHead.rotation.x = Math.PI / 2;
    lampHead.position.y = 4;
    
    // Add shadows to lamp head
    lampHead.castShadow = true;
    lampHead.receiveShadow = true;
    
    // Position lamp head at the end of the arm
    lampHead.position.z = 1.3;
    lampGroup.add(lampHead);
    
    // Create glass cover
    const glassGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.2, 8);
    
    // Glass color based on state
    const glassColor = state === 'broken' ? 0x333333 : 0xffffcc;
    
    const glassMaterial = new THREE.MeshStandardMaterial({
        color: glassColor,
        roughness: 0.2,
        metalness: 0.8,
        transparent: true,
        opacity: state === 'broken' ? 0.3 : 0.7
    });
    
    const glass = new THREE.Mesh(glassGeometry, glassMaterial);
    glass.rotation.x = Math.PI / 2; // Correctly orient
    
    // Add shadows to glass
    glass.castShadow = true;
    glass.receiveShadow = true;
    
    // Position glass below lamp head
    glass.position.y = 3.8;
    glass.position.z = 1.3;
    lampGroup.add(glass);
    
    // Add light source if working or damaged
    if (state !== 'broken') {
        // Enhanced light settings for better visibility
        const lightColor = 0xffffaa; // Warmer yellow light
        
        // Create a spotlight instead of point light
        const lightIntensity = state === 'working' ? 5.0 : 3.0; // Brighter for working lamps
        const lightDistance = 30; // Increased light range
        
        // Create spotlight with wider cone effect
        const light = new THREE.SpotLight(
            lightColor,
            lightIntensity,
            lightDistance, 
            Math.PI / 4, // Wider 45-degree cone (changed from Math.PI/5)
            0.8, // Higher penumbra for softer edge (changed from 0.6)
            1.0 // Lower decay for more distance (changed from 1.5)
        );
        
        // Position light at the lamp head
        light.position.set(0, 3.8, 1.3);
        
        // Create and position target for spotlight - MOVED FARTHER
        const targetObject = new THREE.Object3D();
        targetObject.position.set(0, 0, 12); // Target point farther on the ground
        lampGroup.add(targetObject); // Add to lamp group so it moves with the lamp
        light.target = targetObject; // Set as the spotlight target
        
        // Improve shadow quality
        light.castShadow = true;
        light.shadow.mapSize.width = 1024; // Increased from 512
        light.shadow.mapSize.height = 1024; // Increased from 512
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = lightDistance;
        light.shadow.bias = -0.0005; // Add shadow bias to reduce artifacts
        
        // Add a subtle glow effect for working lamps
        if (state === 'working') {
            const glowGeometry = new THREE.SphereGeometry(0.4, 16, 16); // Increased size
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffcc,
                transparent: true,
                opacity: 0.4, // Increased from 0.3
                side: THREE.BackSide
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.copy(light.position);
            lampGroup.add(glow);
        }
        
        // Store reference to the light for flickering
        lampGroup.userData.light = light;
        lampGroup.userData.state = state;
        lampGroup.userData.lightTarget = targetObject;
        lampGroup.userData.initialIntensity = lightIntensity; // Store initial intensity
        
        // Start with lights off - they'll be turned on later based on time
        light.intensity = 0;
        
        // Add the light
        lampGroup.add(light);
        
        // Add flickering animation for damaged lamps
        if (state === 'damaged') {
            animateDamagedLamp(lampGroup);
        }
    } else {
        // For broken lamps, add damage details
        addBrokenLampDetails(lampGroup, side);
    }
    
    // Add random damage appearance to all lamps
    addDamageDetails(lampGroup, state);
    
    // Position the lamp
    lampGroup.position.set(x, y, z);
    
    // FIXED: Rotate the entire lamp group to face the road properly based on side
    // Left side lamps need to face +Z (toward road)
    // Right side lamps need to face -Z (toward road)
    if (side === 'left') {
        // No rotation needed for left side - they should face +Z by default
    } else {
        // For right side, rotate 180 degrees to face -Z
        lampGroup.rotation.y = Math.PI;
    }
    
    // Add collision data to the lamp group
    lampGroup.userData.isLampPost = true;
    lampGroup.userData.collisionRadius = 0.5; // Radius for collision detection
    
    // Add lamp to global array for collision detection
    roadLampObjects.push(lampGroup);
    
    // Additional slight random rotation for variety (reduced amount)
    lampGroup.rotation.y += (Math.random() - 0.5) * 0.1; // Reduced from 0.2 to 0.1
    
    // Add to scene
    targetScene.add(lampGroup);
    return lampGroup;
}

// Function to add damaged appearance details
function addDamageDetails(lampGroup, state) {
    // Apply more damage for broken and damaged lamps
    const severity = state === 'broken' ? 1 : (state === 'damaged' ? 0.7 : 0.3);
    
    // Add rust patches
    const rustCount = Math.floor(3 * severity) + 1;
    for (let i = 0; i < rustCount; i++) {
        const rustGeometry = new THREE.BoxGeometry(
            0.05 + Math.random() * 0.1,
            0.05 + Math.random() * 0.15,
            0.05 + Math.random() * 0.1
        );
        
        const rustMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // Rust brown
            roughness: 1.0,
            metalness: 0.3
        });
        
        const rust = new THREE.Mesh(rustGeometry, rustMaterial);
        
        // Position on the pole at a random height and angle
        const angle = Math.random() * Math.PI * 2;
        const height = Math.random() * 4;
        
        rust.position.set(
            Math.cos(angle) * 0.1,
            height,
            Math.sin(angle) * 0.1
        );
        
        lampGroup.add(rust);
    }
    
    // Tilt the pole slightly if damaged or broken
    if (state !== 'working') {
        const tiltAngle = (Math.random() - 0.5) * 0.1 * severity;
        lampGroup.rotation.z = tiltAngle;
    }

    lampGroup.traverse(function(node) {
        if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
        }
    });

    if (state !== 'broken' && lampGroup.userData.light) {
        lampGroup.userData.light.castShadow = true;
        
        // Improve shadow quality for lamp lights
        lampGroup.userData.light.shadow.mapSize.width = 512;
        lampGroup.userData.light.shadow.mapSize.height = 512;
        lampGroup.userData.light.shadow.camera.near = 0.5;
        lampGroup.userData.light.shadow.camera.far = 30;
        lampGroup.userData.light.shadow.bias = -0.0005;
    }
    
    // For really broken ones, bend the arm
    if (state === 'broken' && Math.random() > 0.5) {
        const arm = lampGroup.children[1]; // The arm is the second child
        arm.rotation.y = (Math.random() - 0.5) * 0.5;
    }
}

// Function to add details specific to broken lamps
function addBrokenLampDetails(lampGroup, side) {
    // Add broken glass effect - shattered glass pieces
    if (Math.random() > 0.5) {
        const glassShardCount = Math.floor(Math.random() * 4) + 2;
        
        for (let i = 0; i < glassShardCount; i++) {
            const shardGeometry = new THREE.BoxGeometry(
                0.03 + Math.random() * 0.05,
                0.01,
                0.03 + Math.random() * 0.05
            );
            
            const shardMaterial = new THREE.MeshStandardMaterial({
                color: 0xeeeeee,
                transparent: true,
                opacity: 0.7
            });
            
            const shard = new THREE.Mesh(shardGeometry, shardMaterial);
            
            // Position shards below the lamp head
            // Now we ALWAYS use positive z-position in local lamp coordinates
            // since we're rotating the entire lamp group to face the road
            shard.position.set(
                (Math.random() - 0.5) * 0.3,
                3.7 - Math.random() * 0.2,
                1.3 + (Math.random() - 0.5) * 0.3  // Always use 1.3 instead of varying by side
            );
            
            // Random rotation
            shard.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            
            lampGroup.add(shard);
        }
    }
    
    // Make the lamp head tilted/damaged
    const lampHead = lampGroup.children[2]; // The lamp head is the third child
    lampHead.rotation.z = (Math.random() - 0.5) * 0.5; // Add a random tilt
    
    // Sometimes remove the glass completely
    if (Math.random() > 0.7) {
        const glass = lampGroup.children[3]; // The glass is the fourth child
        glass.visible = false;
    }
}

// Function to animate damaged/flickering lamps
// Function to animate damaged/flickering lamps
function animateDamagedLamp(lampGroup) {
    const light = lampGroup.userData.light;
    if (!light) return;
    
    // Set up improved flicker parameters
    lampGroup.userData.flickerParams = {
        nextFlickerTime: performance.now(),
        intensity: 0, // Start with lights off (will be updated based on round)
        baseIntensity: lampGroup.userData.initialIntensity, // Use stored initial intensity
        maxIntensity: lampGroup.userData.initialIntensity * 1.2, // 20% brighter during flickers
        minIntensity: 0.1, // Almost off during flickers
        isFlickering: false,
        sparkDue: false,
        lastSparkTime: performance.now()
    };
    
    // Function to update the flicker
    function updateFlicker() {
        if (!lampGroup.parent) return; // Stop if lamp was removed
        
        const now = performance.now();
        const params = lampGroup.userData.flickerParams;
        
        // Only flicker if after round 10 (check global currentRound)
        const shouldBeActive = currentRound > 10;
        
        if (!shouldBeActive) {
            light.intensity = 0;
            // Check again later
            requestAnimationFrame(updateFlicker);
            return;
        }
        
        // Rest of the function remains unchanged
        // Check if it's time to flicker
        if (now >= params.nextFlickerTime) {
            if (params.isFlickering) {
                // End flicker period, return to base intensity
                light.intensity = params.baseIntensity;
                params.isFlickering = false;
                
                // Reset spotlight angle
                light.angle = Math.PI / 4; // Reset to normal angle
                
                params.nextFlickerTime = now + Math.random() * 5000 + 2000; // 2-7 seconds until next flicker
            } else {
                // Start flicker period
                params.isFlickering = true;
                params.nextFlickerTime = now + Math.random() * 2000 + 500; // Flicker for 0.5-2.5 seconds
                
                // 50% chance to create sparks during this flicker period
                params.sparkDue = Math.random() < 0.5;
                params.lastSparkTime = now;
            }
        }
        
        // During flicker periods, vary the light intensity more dramatically
        if (params.isFlickering) {
            // More dramatic light flicker
            if (Math.random() < 0.5) {
                // Random intensity between min and max
                light.intensity = params.minIntensity + Math.random() * (params.maxIntensity - params.minIntensity);
                
                // Also occasionally change the light cone angle to simulate electrical problems
                if (Math.random() < 0.2) {
                    light.angle = Math.PI / 4 * (0.7 + Math.random() * 0.6); // Vary between 70-130% of normal angle
                }
            } else {
                light.intensity = params.baseIntensity;
            }
            
            // Create more frequent sparks during flicker events
            if (params.sparkDue && now - params.lastSparkTime > 200) {
                if (Math.random() < 0.3) {
                    createSpark(lampGroup);
                    params.lastSparkTime = now;
                }
            }
        }
        
        // Continue animation
        requestAnimationFrame(updateFlicker);
    }
    
    // Start the flicker animation
    updateFlicker();
}

// Function to add rock formations and dead trees around the map
function addEnvironmentalObjects() {
    // Add rock formations
    createRockFormations();
    
    // Add dead trees
    createDeadTrees();
}

// Day-Night Cycle System Variables
let gameTime = {
    hour: 12, // Start at noon (12:00)
    minute: 0,
    timeString: "12:00",
    isNight: false
};

// Lighting objects
let sunLight, moonLight, skyLight;
let sunObject, moonObject;
let skySphere;

// Initialize day-night cycle system
function initDayNightSystem() {
    // Enable shadows in renderer
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Create sun directional light
    sunLight = new THREE.DirectionalLight(0xffffcc, 1.0);
    sunLight.position.set(0, 100, 0);
    sunLight.castShadow = true;
    
    // Configure shadow properties
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    
    // Create moon light (dimmer than sun)
    moonLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    moonLight.position.set(0, 100, 0);
    moonLight.castShadow = true;
    
    // Configure moon shadow properties (same as sun)
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    moonLight.shadow.camera.near = 0.5;
    moonLight.shadow.camera.far = 500;
    moonLight.shadow.camera.left = -100;
    moonLight.shadow.camera.right = 100;
    moonLight.shadow.camera.top = 100;
    moonLight.shadow.camera.bottom = -100;
    
    // Add ambient light (sky light)
    skyLight = new THREE.AmbientLight(0x555555, 0.5);
    
    // Create visual objects for sun and moon (LARGER SIZE)
    const sunGeometry = new THREE.SphereGeometry(20, 16, 16); // Increased from 10
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff80 });
    sunObject = new THREE.Mesh(sunGeometry, sunMaterial);
    
    const moonGeometry = new THREE.SphereGeometry(16, 16, 16); // Increased from 8
    const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xdddddd });
    moonObject = new THREE.Mesh(moonGeometry, moonMaterial);
    
    // Create sky sphere
    const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x87CEEB, 
        side: THREE.BackSide,
        fog: false
    });
    skySphere = new THREE.Mesh(skyGeometry, skyMaterial);
    
    // Add everything to scene
    scene.add(sunLight);
    scene.add(moonLight);
    scene.add(skyLight);
    scene.add(sunObject);
    scene.add(moonObject);
    scene.add(skySphere);
    
    // Initialize positions
    updateDayNightCycle(1); // Set initial state for round 1
}

function updateDayNightCycle(round) {
    // Calculate time based on round (12:00 at round 1, 00:00 at round 20)
    const minutesPerRound = 36; // (12 hours * 60 minutes) / 20 rounds = 36 minutes per round
    const totalMinutes = (round - 1) * minutesPerRound;
    
    // Time ranges from 12:00 (noon) to 00:00 (midnight)
    gameTime.hour = Math.floor((12 + totalMinutes / 60) % 24);
    gameTime.minute = Math.floor(totalMinutes % 60);
    gameTime.timeString = `${String(gameTime.hour).padStart(2, '0')}:${String(gameTime.minute).padStart(2, '0')}`;
    gameTime.isNight = gameTime.hour >= 18 || gameTime.hour < 6;
    
    // Calculate sun position - visible only during rounds 1-10 (daylight hours)
    if (round <= 10) {
        // Sun progress from high noon (round 1) to sunset (round 10)
        const sunProgress = (round - 1) / 9;
        const sunAngle = Math.PI * (0.5 - sunProgress);
        
        // Position sun
        const sunDistance = 350;
        sunObject.position.x = Math.cos(sunAngle) * sunDistance;
        sunObject.position.y = Math.sin(sunAngle) * sunDistance;
        sunObject.position.z = 0;
        
        // Make sun visible
        sunObject.visible = true;
        
        // Set sun light intensity based on height
        const sunHeight = Math.sin(sunAngle);
        sunLight.intensity = Math.max(0, Math.min(1, sunHeight * 1.5));
        sunLight.position.copy(sunObject.position.clone().normalize().multiplyScalar(150));
    } else {
        // After round 10, sun is below horizon and not visible
        sunObject.visible = false;
        sunLight.intensity = 0;
    }
    
    // Calculate moon position - starts rising at round 10, peaks at round 20
    if (round >= 10) {
        // Moon progress from moonrise (round 10) to high moon (round 20)
        const moonProgress = Math.min(1, (round - 10) / 10);
        
        // FIX: Change angle calculation so moon starts at horizon (0°) at round 10
        // and rises to zenith (90°) at round 20
        const moonAngle = Math.PI * moonProgress / 2; // 0 to π/2
        
        // Position moon - use cosine and sine differently to make moon rise from horizon
        const moonDistance = 350;
        moonObject.position.x = -Math.cos(moonAngle) * moonDistance;
        moonObject.position.y = Math.sin(moonAngle) * moonDistance;
        moonObject.position.z = 0;
        
        // Make moon visible
        moonObject.visible = true;
        
        // Set moon light intensity based on height
        const moonHeight = Math.sin(moonAngle);
        moonLight.intensity = Math.max(0, Math.min(0.3, moonHeight * 0.6));
        moonLight.position.copy(moonObject.position.clone().normalize().multiplyScalar(150));
    } else {
        // Before round 10, moon is below horizon
        moonObject.visible = false;
        moonLight.intensity = 0;
    }
    
    // Special case for round 10 - both sun and moon are at opposite horizons
    if (round === 10) {
        // Sun at western horizon (setting)
        sunObject.position.x = 350;
        sunObject.position.y = 0;
        sunObject.visible = true;
        sunLight.intensity = 0.2;
        
        // Moon at eastern horizon (rising)
        moonObject.position.x = -350;
        moonObject.position.y = 0;
        moonObject.visible = true;
        moonLight.intensity = 0.1;
    }
    
    // Update sky color based on sun and moon positions
    updateSkyColor(
        round <= 10 ? Math.sin(Math.PI * (0.5 - (round - 1) / 9)) : -0.5, // Sun height
        round >= 10 ? Math.sin(Math.PI * ((round - 10) / 10)) : -0.5       // Moon height
    );
    
    // Update lamps based on time
    updateLamps(
        round <= 10 ? Math.sin(Math.PI * (0.5 - (round - 1) / 9)) : -0.5,
        round >= 10 ? Math.sin(Math.PI * ((round - 10) / 10)) : -0.5
    );
}

// Function to update sky color based on sun position
function updateSkyColor(sunHeight, moonHeight) {
    let skyColor = new THREE.Color();
    
    // Day sky (blue)
    const dayColor = new THREE.Color(0x87CEEB);
    
    // Sunset/sunrise sky (orange)
    const sunsetColor = new THREE.Color(0xFF7F50);
    
    // Night sky (dark blue)
    const nightColor = new THREE.Color(0x0A1020);
    
    if (sunHeight > 0.2) {
        // Daytime
        skyColor.copy(dayColor);
    } else if (sunHeight > -0.2) {
        // Sunset/sunrise - blend between day and sunset colors
        const t = (sunHeight + 0.2) / 0.4;
        skyColor.lerpColors(sunsetColor, dayColor, t);
    } else if (sunHeight > -0.4) {
        // Dusk/dawn - blend between night and sunset colors
        const t = (sunHeight + 0.4) / 0.2;
        skyColor.lerpColors(nightColor, sunsetColor, t);
    } else {
        // Night - adjust based on moon height for subtle lighting changes
        skyColor.copy(nightColor);
        
        // If moon is high, add a slight blue tint
        if (moonHeight > 0) {
            const moonFactor = Math.min(0.3, moonHeight * 0.5);
            skyColor.lerp(new THREE.Color(0x3A4A6A), moonFactor);
        }
    }
    
    // Apply sky color
    skySphere.material.color.copy(skyColor);
    
    // Adjust fog and ambient light to match sky color
    scene.fog.color.copy(skyColor);
    
    // Adjust ambient light to be dimmer at night
    if (sunHeight > 0) {
        // Day - brighter ambient light
        skyLight.intensity = 0.5 + sunHeight * 0.3;
        skyLight.color.set(0x8899aa);
    } else {
        // Night - dimmer and bluer ambient light
        skyLight.intensity = 0.2 + moonHeight * 0.1;
        skyLight.color.set(0x334455);
    }
}

// Function to update street lamps based on time
function updateLamps(sunHeight, moonHeight) {
    // Only turn lamps on after round 10 (starting from round 11)
    // This is when it becomes night in the game
    const shouldLampsBeOn = currentRound > 10;
    
    for (const lamp of roadLampObjects) {
        if (!lamp.userData || !lamp.userData.state) continue;
        
        const lampState = lamp.userData.state;
        const light = lamp.userData.light;
        
        if (!light) continue;
        
        // Handle lamp based on state and round
        if (lampState === 'working') {
            // Working lamps turn on only after round 10
            light.intensity = shouldLampsBeOn ? lamp.userData.initialIntensity : 0;
            
            // Update lamp glow visibility
            updateLampGlow(lamp, shouldLampsBeOn, sunHeight);
        } 
        else if (lampState === 'damaged') {
            if (shouldLampsBeOn) {
                // Keep existing flicker animation active for damaged lamps
                // The flicker animation will handle intensity changes
                if (lamp.userData.flickerParams) {
                    lamp.userData.flickerParams.baseIntensity = lamp.userData.initialIntensity;
                }
            } else {
                // Force off during daytime/early rounds
                light.intensity = 0;
            }
        } 
        else {
            // Broken lamps always off
            light.intensity = 0;
        }
    }
}

// Function to update lamp glow effect
function updateLampGlow(lamp, isDark, sunHeight) {
    // Find the existing glow mesh if any
    let glow = lamp.userData.glowMesh;
    
    if (isDark) {
        // Create or show glow effect
        if (!glow) {
            // Create a sphere slightly larger than the lamp glass
            const glowGeometry = new THREE.SphereGeometry(0.3, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffcc,
                transparent: true,
                opacity: 0.3,
                side: THREE.BackSide
            });
            
            glow = new THREE.Mesh(glowGeometry, glowMaterial);
            
            // Position at the lamp head
            const glass = lamp.children[3]; // Assuming glass is the 4th child
            if (glass) {
                // Position glow at the glass position
                glow.position.copy(glass.position);
            } else {
                // Fallback position
                glow.position.y = 3.8;
                glow.position.z = 1.3;
            }
            
            lamp.add(glow);
            lamp.userData.glowMesh = glow;
        } else {
            glow.visible = true;
            
            // Adjust glow intensity based on how dark it is
            const darknessFactor = Math.min(1, Math.max(0, -sunHeight * 2));
            glow.material.opacity = 0.2 + darknessFactor * 0.1;
        }
    } else if (glow) {
        // Hide glow during the day
        glow.visible = false;
    }
}

function createRockFormations(targetScene = scene) {
    // Fixed positions for rock formations - away from the road
    const rockPositions = [
        {x: -80, z: -50},  // Northwest area
        {x: -60, z: 70},   // Northeast area
        {x: 70, z: 60},    // Southeast area
        {x: 90, z: -30},   // Southwest area
        {x: -40, z: -80},  // Far north
        {x: 50, z: -70},   // Far south
        {x: -90, z: 20},   // Far west
        {x: 80, z: 10},    // Far east
        {x: -20, z: 90},   // Northern edge
        {x: 30, z: -90}    // Southern edge
    ];
    
    rockPositions.forEach((pos) => {
        createRockFormation(pos.x, pos.z, targetScene);
    });
}

// Function to create rock formations at fixed positions
function createRockFormation(x, z, targetScene = scene) {
    // Create a group for the rock formation
    const rockGroup = new THREE.Group();
    
    // Create 3-7 rocks of varying sizes for each formation
    const rockCount = 3 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < rockCount; i++) {
        // Randomize rock appearance
        const rockType = Math.floor(Math.random() * 3);
        let rockGeometry;
        
        switch(rockType) {
            case 0:
                rockGeometry = new THREE.DodecahedronGeometry(1 + Math.random() * 0.5, 1);
                break;
            case 1:
                rockGeometry = new THREE.OctahedronGeometry(0.8 + Math.random() * 0.6, 1);
                break;
            case 2:
                rockGeometry = new THREE.TetrahedronGeometry(0.9 + Math.random() * 0.7, 1);
                break;
        }
        
        // Random gray color
        const grayShade = 0.3 + Math.random() * 0.3;
        const rockMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(grayShade, grayShade, grayShade),
            roughness: 0.8 + Math.random() * 0.2,
            metalness: 0.1
        });
        
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        
        // Position rocks within the formation
        const offsetX = (Math.random() - 0.5) * 4;
        const offsetZ = (Math.random() - 0.5) * 4;
        const scale = 0.8 + Math.random() * 1.2;
        
        rock.position.set(offsetX, scale * 0.5, offsetZ);
        rock.scale.set(scale, scale, scale);
        
        // Random rotation for natural look
        rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        // Add shadow casting to rocks
        rock.castShadow = true;
        rock.receiveShadow = true;
        
        rockGroup.add(rock);
    }
    
    // Position the entire rock formation
    rockGroup.position.set(x, 0, z);
    
    // Add to target scene
    targetScene.add(rockGroup);
    
    // Add collision data only for the game scene, not the menu scene
    if (targetScene === scene) {
        // Add collision data to avoid enemies and player walking through rocks
        // Create a single collision area for the whole formation
        const collisionRadius = 5; // Radius for collision detection
        if (!scene.userData.environmentalColliders) {
            scene.userData.environmentalColliders = [];
        }
        
        scene.userData.environmentalColliders.push({
            type: 'circle',
            position: new THREE.Vector3(x, 0, z),
            radius: collisionRadius
        });
    }
    
    return rockGroup;
}
// Function to create dead trees at fixed positions
function createDeadTrees(targetScene = scene) {
    // Fixed positions for dead trees - away from the road
    const treePositions = [
        {x: -70, z: -20},  // Northwest area
        {x: -50, z: 50},   // Northeast area
        {x: 60, z: 40},    // Southeast area
        {x: 70, z: -50},   // Southwest area
        {x: -30, z: -70},  // Far north
        {x: 40, z: -80},   // Far south
        {x: -80, z: 40},   // Far west
        {x: 90, z: 30},    // Far east
        {x: -40, z: 80},   // Northern edge
        {x: 20, z: -90}    // Southern edge
    ];
    
    treePositions.forEach((pos) => {
        createDeadTree(pos.x, pos.z, targetScene);
    });
}

// Function to create a single dead tree
function createDeadTree(x, z, targetScene = scene) {
    // Create tree group
    const treeGroup = new THREE.Group();
    
    // Create trunk
    const trunkHeight = 5 + Math.random() * 3;
    const trunkRadius = 0.4 + Math.random() * 0.3;
    const trunkGeometry = new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, trunkHeight, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({
        color: 0x3d2817, // Dark brown
        roughness: 0.9,
        metalness: 0.1
    });
    
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    
    // Add slight lean to the trunk for a dead tree look
    trunk.rotation.x = (Math.random() - 0.5) * 0.2;
    trunk.rotation.z = (Math.random() - 0.5) * 0.2;
    
    // Add shadows to trunk
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    
    treeGroup.add(trunk);
    
    // Add 2-4 main branches
    const branchCount = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < branchCount; i++) {
        const branchHeight = trunkHeight * (0.4 + Math.random() * 0.3);
        const branchRadius = trunkRadius * (0.5 + Math.random() * 0.3);
        const branchGeometry = new THREE.CylinderGeometry(
            branchRadius * 0.5, branchRadius, branchHeight, 6
        );
        
        const branch = new THREE.Mesh(branchGeometry, trunkMaterial);
        
        // Position along the trunk
        const branchY = trunkHeight * (0.5 + Math.random() * 0.4);
        branch.position.y = branchY;
        
        // Rotate branch outward from trunk
        const angle = (i / branchCount) * Math.PI * 2;
        const tilt = Math.PI / 3 + Math.random() * Math.PI / 6; // ~60-90 degrees
        
        branch.rotation.set(
            Math.cos(angle) * tilt,
            0,
            Math.sin(angle) * tilt
        );
        
        // Move branch outward from center
        branch.position.x = Math.cos(angle) * (trunkRadius * 0.8);
        branch.position.z = Math.sin(angle) * (trunkRadius * 0.8);
        
        // Add shadows to branches
        branch.castShadow = true;
        branch.receiveShadow = true;
        
        treeGroup.add(branch);
    }
    
    // Position tree
    treeGroup.position.set(x, 0, z);
    
    // Add to target scene
    targetScene.add(treeGroup);
    
    // Add collision data only for the game scene, not the menu scene
    if (targetScene === scene) {
        // Add collision data
        if (!scene.userData.environmentalColliders) {
            scene.userData.environmentalColliders = [];
        }
        
        scene.userData.environmentalColliders.push({
            type: 'cylinder',
            position: new THREE.Vector3(x, 0, z),
            radius: trunkRadius * 1.5
        });
    }
    
    return treeGroup;
}

// Function to create apocalyptic road for menu scene
function createMenuApocalypticRoad() {
    // Road dimensions - spans the entire map width
    const roadLength = 281.25; // Same as map width
    const roadWidth = 15; // Width of the road
    
    // Create the main road surface
    const roadGeometry = new THREE.PlaneGeometry(roadLength, roadWidth);
    const roadMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333, // Dark gray for asphalt
        roughness: 0.8,
        metalness: 0.2
    });
    
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2; // Lay flat like the floor
    road.position.y = 0.05; // Slightly above the ground to prevent z-fighting
    menuScene.add(road);
    
    // Add potholes to the road
    addMenuPotholes(roadLength, roadWidth);
    
    // Add road markings (faded center line)
    addMenuRoadMarkings(roadLength);
    
    // Add debris along the road edges
    addMenuRoadDebris(roadLength, roadWidth);
    
    // Add road lamps along the road
    addRoadLamps(roadLength, roadWidth, menuScene); // Pass menuScene as target scene
}

// Function to add potholes and cracks to the menu scene road
function addMenuPotholes(roadLength, roadWidth) {
    // Add potholes
    const potholeCount = 12;
    
    for (let i = 0; i < potholeCount; i++) {
        // Create pothole
        const potholeRadius = 0.8 + Math.random() * 1.5;
        const potholeGeometry = new THREE.CircleGeometry(potholeRadius, 12);
        const potholeMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a, // Very dark gray
            roughness: 1.0,
            metalness: 0.0
        });
        
        const pothole = new THREE.Mesh(potholeGeometry, potholeMaterial);
        pothole.rotation.x = -Math.PI / 2;
        
        // Position along road
        const xPos = (Math.random() - 0.5) * roadLength * 0.95;
        const zPos = (Math.random() - 0.5) * roadWidth * 0.8; // Keep within road width
        pothole.position.set(xPos, 0.06, zPos);
        
        menuScene.add(pothole);
    }
    
    // Add cracks to road
    const crackCount = 15;
    
    for (let i = 0; i < crackCount; i++) {
        // Create a crack using box geometries
        const crackLength = 2 + Math.random() * 5;
        const crackWidth = 0.1 + Math.random() * 0.2;
        
        const crackGeometry = new THREE.BoxGeometry(crackLength, 0.02, crackWidth);
        const crackMaterial = new THREE.MeshBasicMaterial({
            color: 0x111111,
            transparent: false
        });
        
        const crack = new THREE.Mesh(crackGeometry, crackMaterial);
        
        // Position and rotation
        const xPos = (Math.random() - 0.5) * roadLength * 0.9;
        const zPos = (Math.random() - 0.5) * roadWidth * 0.8;
        const rotation = Math.random() * Math.PI;
        
        crack.position.set(xPos, 0.07, zPos); // Slightly above road
        crack.rotation.y = rotation;
        
        menuScene.add(crack);
    }
}

// Function to add faded road markings to menu scene
function addMenuRoadMarkings(roadLength) {
    // Create dashed center line (faded and broken)
    const dashCount = 40;
    const dashLength = 3;
    const dashWidth = 0.2;
    
    for (let i = 0; i < dashCount; i++) {
        // Only create some dashes (to look broken)
        if (Math.random() > 0.35) {
            // Create a dash
            const dashGeometry = new THREE.PlaneGeometry(dashLength, dashWidth);
            const dashMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xCCCCCC, // Light gray for faded paint
                transparent: true,
                opacity: 0.2 + Math.random() * 0.3 // Varying opacity for worn look
            });
            
            const dash = new THREE.Mesh(dashGeometry, dashMaterial);
            dash.rotation.x = -Math.PI / 2; // Lay flat
            
            // Position dash along the road
            const xPos = -roadLength/2 + roadLength * (i / dashCount) + roadLength/(dashCount*2);
            dash.position.set(xPos, 0.08, 0); // Slightly above road
            
            menuScene.add(dash);
        }
    }
}

// Function to add debris along road edges in menu scene
function addMenuRoadDebris(roadLength, roadWidth) {
    const debrisCount = 30; // Debris for apocalyptic feel
    const edgeOffset = roadWidth / 2; // Distance from center to edge of road
    
    for (let i = 0; i < debrisCount; i++) {
        // Position along road length
        const xPos = (Math.random() - 0.5) * roadLength * 0.95;
        
        // Position near road edges (either left or right side)
        const side = Math.random() > 0.5 ? 1 : -1;
        const zPos = side * (edgeOffset + 0.2 + Math.random() * 2); // Slightly outside road
        
        // Create debris - rock or rubble piece
        const debrisSize = 0.1 + Math.random() * 0.4;
        let debrisGeometry;
        
        // Different shapes for variety
        if (Math.random() < 0.6) {
            debrisGeometry = new THREE.DodecahedronGeometry(debrisSize, 0); // Rock-like
        } else {
            debrisGeometry = new THREE.BoxGeometry(
                debrisSize * 1.5, 
                debrisSize * 0.5, 
                debrisSize * 1.2
            ); // Chunk of concrete
        }
        
        const debrisMaterial = new THREE.MeshStandardMaterial({
            color: Math.random() > 0.5 ? 0x555555 : 0x3a3a3a, // Gray variations
            roughness: 0.9,
            metalness: 0.1
        });
        
        const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
        debris.position.set(xPos, debrisSize * 0.5, zPos); // Place on ground
        debris.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        
        menuScene.add(debris);
    }
}

// Update the toggleShop function to populate shop items
function toggleShop() {
    if (!gameStarted || isPaused) return;
    
    isShopOpen = !isShopOpen;
    document.getElementById('shop').style.display = isShopOpen ? 'block' : 'none';

    // Toggle the coin container visibility when shop opens/closes
    const coinContainer = document.getElementById('coinContainer');
    if (coinContainer) {
        coinContainer.style.display = isShopOpen ? 'none' : 'flex';
    }
    
    // If opening shop, pause game mechanics and hide crosshair
    if (isShopOpen) {
        // Force cursor to be visible
        document.body.style.cursor = 'auto';
        
        // Exit pointer lock to allow cursor movement
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        
        hideCrosshair();
        
        // Update the coin display in the shop
        document.getElementById('shopCoins').textContent = infiniteMoneyCheat ? "INFINITE" : playerCoins;
        
        // Populate shop items
        populateShopItems();
        
        // Add event listener to the close button right after creating/showing the shop
        const closeButton = document.getElementById('closeShop');
        if (closeButton) {
            // Remove existing listeners first to prevent duplicates
            closeButton.replaceWith(closeButton.cloneNode(true));
            document.getElementById('closeShop').addEventListener('click', toggleShop);
        }
    } else {
        // If closing, show crosshair and lock pointer
        showCrosshair();
        document.body.style.cursor = 'none';
        document.body.requestPointerLock();
    }
}

// Function to populate the shop with items
function populateShopItems() {
    const shopItemsContainer = document.querySelector('.shop-items');
    shopItemsContainer.innerHTML = ''; // Clear existing items
    
    // Create consumables section with header
    const consumablesHeader = document.createElement('div');
    consumablesHeader.className = 'shop-category-header';
    consumablesHeader.innerHTML = '<h3>Health & Shields</h3>';
    shopItemsContainer.appendChild(consumablesHeader);
    
    // Add consumable items
    SHOP_ITEMS.forEach(item => {
        // Check if this is a consumable item
        if (item.id >= ITEM_TYPES.BANDAGE && item.id <= ITEM_TYPES.BIG_SHIELD) {
            addItemToShop(item, shopItemsContainer);
        }
    });
    
    // Create weapons section with header and separator
    const separator = document.createElement('div');
    separator.className = 'shop-separator';
    shopItemsContainer.appendChild(separator);
    
    const weaponsHeader = document.createElement('div');
    weaponsHeader.className = 'shop-category-header';
    weaponsHeader.innerHTML = '<h3>Weapons</h3>';
    shopItemsContainer.appendChild(weaponsHeader);
    
    // Add weapon items
    SHOP_ITEMS.forEach(item => {
        // Check if this is a weapon item
        if (item.id >= WEAPON_TYPES.PISTOL && item.id <= WEAPON_TYPES.ROCKET_LAUNCHER) {
            addItemToShop(item, shopItemsContainer);
        }
    });
    
    // Add click handler to the shop container itself
    const shop = document.getElementById('shop');
    shop.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent clicks inside shop from triggering pointer lock
    });
}

// Helper function to add an item to the shop
function addItemToShop(item, container) {
    const itemElement = document.createElement('div');
    itemElement.className = 'shop-item';
    
    // Get the image path based on the item type
    const imagePath = getItemIconPath(item.id);
    
    itemElement.innerHTML = `
        <div class="item-icon">
            <img src="${imagePath}" alt="${item.name}" class="shop-item-image">
        </div>
        <div class="item-details">
            <div class="item-name">${item.name}</div>
            <div class="item-description">${item.description}</div>
        </div>
        <div class="item-price">
            <span class="coin-icon">🪙</span>
            <span>${item.price}</span>
        </div>
        <button class="buy-button" data-item-id="${item.id}" ${!infiniteMoneyCheat && playerCoins < item.price ? 'disabled' : ''}>Buy</button>
    `;
    
    container.appendChild(itemElement);
    
    // Add event listener to the buy button
    const buyButton = itemElement.querySelector('.buy-button');
    buyButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Stop event from bubbling up
        const itemId = parseInt(e.target.dataset.itemId);
        purchaseItem(itemId);
    });
}

function getItemIconPath(itemId) {
    // Determine the correct path based on item ID
    if (itemId >= WEAPON_TYPES.PISTOL && itemId <= WEAPON_TYPES.ROCKET_LAUNCHER) {
        // Weapon items
        switch(itemId) {
            case WEAPON_TYPES.PISTOL:
                return "assets/icons/weapons/pistol.png";
            case WEAPON_TYPES.SHOTGUN:
                return "assets/icons/weapons/shotgun.png";
            case WEAPON_TYPES.ASSAULT_RIFLE:
                return "assets/icons/weapons/assault-rifle.png";
            case WEAPON_TYPES.SNIPER_RIFLE:
                return "assets/icons/weapons/sniper-rifle.png";
            case WEAPON_TYPES.CROSSBOW:
                return "assets/icons/weapons/crossbow.png";
            case WEAPON_TYPES.MINIGUN:
                return "assets/icons/weapons/minigun.png";
            case WEAPON_TYPES.ROCKET_LAUNCHER:
                return "assets/icons/weapons/rocket-launcher.png";
        }
    } else {
        // Consumable items
        switch(itemId) {
            case ITEM_TYPES.BANDAGE:
                return "assets/icons/items/bandage.png";
            case ITEM_TYPES.MEDKIT:
                return "assets/icons/items/medkit.png";
            case ITEM_TYPES.MINI_SHIELD:
                return "assets/icons/items/mini-shield.png";
            case ITEM_TYPES.BIG_SHIELD:
                return "assets/icons/items/big-shield.png";
        }
    }
    
    // Default icon if no match found
    return "assets/icons/items/unknown.png";
}

// Function to handle item purchase
function purchaseItem(itemId) {
    const item = SHOP_ITEMS.find(item => item.id === itemId);
    
    if (!item) {
        console.error('Item not found');
        return;
    }
    
    // Check if player has enough coins or infinite money is active
    if (infiniteMoneyCheat || playerCoins >= item.price) {
        // Only deduct coins if infinite money is NOT active
        if (!infiniteMoneyCheat) {
            playerCoins -= item.price;
        }
        
        // For weapon items, we need special handling
        if (itemId >= WEAPON_TYPES.PISTOL && itemId <= WEAPON_TYPES.ROCKET_LAUNCHER) {
            // Add weapon to inventory
            if (addItem(itemId)) {
                // Update coin displays
                document.getElementById('shopCoins').textContent = infiniteMoneyCheat ? "INFINITE" : playerCoins;
                updateCoinDisplay();
                
                // Show notification
                showNotification(`Purchased ${item.name}!`, 2000);
                
                // Refresh shop items to update button states
                populateShopItems();
                
                // Important: Update weapon state as needed
                switch(itemId) {
                    case WEAPON_TYPES.PISTOL:
                        pistolAmmo = pistolMaxAmmo;
                        break;
                    case WEAPON_TYPES.SHOTGUN:
                        shotgunAmmo = shotgunMaxAmmo;
                        break;
                    case WEAPON_TYPES.ASSAULT_RIFLE:
                        assaultRifleAmmo = assaultRifleMaxAmmo;
                        break;
                    case WEAPON_TYPES.SNIPER_RIFLE:
                        sniperRifleAmmo = sniperRifleMaxAmmo;
                        break;
                    case WEAPON_TYPES.CROSSBOW:
                        crossbowAmmo = crossbowMaxAmmo;
                        break;
                    case WEAPON_TYPES.MINIGUN:
                        minigunAmmo = minigunMaxAmmo;
                        break;
                    case WEAPON_TYPES.ROCKET_LAUNCHER:
                        rocketLauncherAmmo = rocketLauncherMaxAmmo;
                        break;
                }
                
                updateAmmoDisplay();
            } else {
                // Inventory full, refund coins if not using infinite money
                if (!infiniteMoneyCheat) {
                    playerCoins += item.price;
                }
                showNotification('Inventory is full!', 2000);
            }
        } else {
            // Handle consumable items (existing logic)
            if (addItem(item.id)) {
                // Update coin displays
                document.getElementById('shopCoins').textContent = infiniteMoneyCheat ? "INFINITE" : playerCoins;
                updateCoinDisplay();
                
                // Show notification
                showNotification(`Purchased ${item.name}!`, 2000);
                
                // Refresh shop items to update button states
                populateShopItems();
            } else {
                // Inventory full, refund coins if not using infinite money
                if (!infiniteMoneyCheat) {
                    playerCoins += item.price;
                }
                showNotification('Inventory is full!', 2000);
            }
        }
    } else {
        showNotification('Not enough coins!', 2000);
    }
}


// Function to create detailed health and shield item models
function createItemModels() {
    // Store the models in this object for reuse
    window.itemModels = {
        bandage: createBandageModel(),
        medkit: createMedkitModel(),
        miniShield: createMiniShieldModel(),
        bigShield: createBigShieldModel()
    };
}

// Model for bandages (white bandage roll)
function createBandageModel() {
    const group = new THREE.Group();
    
    // Main bandage roll (white cylinder)
    const rollGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.15, 16);
    const rollMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffcc99,
        roughness: 0.9,
        metalness: 0.0
    });
    const roll = new THREE.Mesh(rollGeometry, rollMaterial);
    roll.rotation.z = Math.PI/2; // Lay on its side
    
    // Add some details to make it look like a bandage
    const stripe1 = createStripe();
    stripe1.position.y = 0.03;
    
    const stripe2 = createStripe();
    stripe2.position.y = -0.03;
    
    group.add(roll);
    group.add(stripe1);
    group.add(stripe2);
    
    return group;
    
    // Helper function for bandage stripes
    function createStripe() {
        const stripeGeometry = new THREE.BoxGeometry(0.17, 0.01, 0.08);
        const stripeMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
        return new THREE.Mesh(stripeGeometry, stripeMaterial);
    }
}

// Model for medkit (red box with white cross)
function createMedkitModel() {
    const group = new THREE.Group();
    
    // Main box (red)
    const boxGeometry = new THREE.BoxGeometry(0.4, 0.25, 0.4);
    const boxMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xdd0000,
        roughness: 0.3,
        metalness: 0.1
    });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    
    // White cross - horizontal part
    const hCrossGeometry = new THREE.BoxGeometry(0.28, 0.05, 0.05);
    const crossMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const hCross = new THREE.Mesh(hCrossGeometry, crossMaterial);
    hCross.position.y = 0.15; // Place on top of the box
    
    // White cross - vertical part
    const vCrossGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.28);
    const vCross = new THREE.Mesh(vCrossGeometry, crossMaterial);
    vCross.position.y = 0.15; // Place on top of the box
    
    group.add(box);
    group.add(hCross);
    group.add(vCross);
    
    return group;
}

// Model for mini shield potion (small blue bottle)
function createMiniShieldModel() {
    const group = new THREE.Group();
    
    // Bottle body (blue cylinder)
    const bottleGeometry = new THREE.CylinderGeometry(0.1, 0.12, 0.25, 16);
    const bottleMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00aaff,
        transparent: true,
        opacity: 0.8,
        roughness: 0.1,
        metalness: 0.8
    });
    const bottle = new THREE.Mesh(bottleGeometry, bottleMaterial);
    
    // Bottle neck
    const neckGeometry = new THREE.CylinderGeometry(0.05, 0.07, 0.06, 16);
    const neckMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x0088cc,
        transparent: true,
        opacity: 0.9,
        roughness: 0.1,
        metalness: 0.5 
    });
    const neck = new THREE.Mesh(neckGeometry, neckMaterial);
    neck.position.y = 0.15;
    
    // Bottle cap
    const capGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16);
    const capMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x0055aa,
        roughness: 0.2,
        metalness: 0.7
    });
    const cap = new THREE.Mesh(capGeometry, capMaterial);
    cap.position.y = 0.2;
    
    // Add glow effect for shield potions
    const glowGeometry = new THREE.SphereGeometry(0.18, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    
    group.add(bottle);
    group.add(neck);
    group.add(cap);
    group.add(glow);
    
    return group;
}

// Model for big shield potion (large blue bottle)
function createBigShieldModel() {
    const group = new THREE.Group();
    
    // Bottle body (larger blue cylinder)
    const bottleGeometry = new THREE.CylinderGeometry(0.15, 0.18, 0.4, 16);
    const bottleMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x0055ff,
        transparent: true,
        opacity: 0.8,
        roughness: 0.1,
        metalness: 0.8
    });
    const bottle = new THREE.Mesh(bottleGeometry, bottleMaterial);
    
    // Bottle neck
    const neckGeometry = new THREE.CylinderGeometry(0.07, 0.1, 0.08, 16);
    const neckMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x0044cc,
        transparent: true,
        opacity: 0.9,
        roughness: 0.1,
        metalness: 0.5
    });
    const neck = new THREE.Mesh(neckGeometry, neckMaterial);
    neck.position.y = 0.24;
    
    // Bottle cap
    const capGeometry = new THREE.CylinderGeometry(0.07, 0.07, 0.05, 16);
    const capMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x003399,
        roughness: 0.2,
        metalness: 0.7
    });
    const cap = new THREE.Mesh(capGeometry, capMaterial);
    cap.position.y = 0.3;
    
    // Add stronger glow effect for big shield potions
    const glowGeometry = new THREE.SphereGeometry(0.28, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x0055ff,
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    
    group.add(bottle);
    group.add(neck);
    group.add(cap);
    group.add(glow);
    
    return group;
}

// Update the createConsumableItem function to use detailed models
function createConsumableItem(itemType, position) {
    // If models haven't been created yet, create them
    if (!window.itemModels) {
        createItemModels();
    }
    
    let itemModel;
    
    // Select the appropriate model based on item type
    switch(itemType) {
        case ITEM_TYPES.BANDAGE:
            itemModel = window.itemModels.bandage.clone();
            break;
            
        case ITEM_TYPES.MEDKIT:
            itemModel = window.itemModels.medkit.clone();
            break;
            
        case ITEM_TYPES.MINI_SHIELD:
            itemModel = window.itemModels.miniShield.clone();
            break;
            
        case ITEM_TYPES.BIG_SHIELD:
            itemModel = window.itemModels.bigShield.clone();
            break;
            
        default:
            console.error("Unknown item type for consumable");
            return null;
    }
    
    // Position the item
    itemModel.position.copy(position);
    
    // Add metadata
    itemModel.userData = {
        type: "consumable",
        itemType: itemType,
        pickupable: true,
        originalY: position.y,
        animationId: null,
        rotationSpeed: 0.01 + Math.random() * 0.01,
        hoverSpeed: 0.5 + Math.random() * 0.5
    };
    
    // Start hover and rotation animation
    animateItem(itemModel);
    
    // Add to scene
    scene.add(itemModel);
    
    return itemModel;
}

// Function to animate item hover and rotation
function animateItem(item) {
    // Cancel any existing animation
    if (item.userData.animationId) {
        cancelAnimationFrame(item.userData.animationId);
    }
    
    // Animation function
    function animate() {
        // Rotation animation
        item.rotation.y += item.userData.rotationSpeed;
        
        // Bobbing animation
        const time = Date.now() * 0.001 * item.userData.hoverSpeed;
        item.position.y = item.userData.originalY + Math.sin(time) * 0.1;
        
        // Continue animation
        item.userData.animationId = requestAnimationFrame(animate);
    }
    
    // Start animation loop
    item.userData.animationId = requestAnimationFrame(animate);
}

// Add pickup animation before item is added to inventory
function playItemPickupAnimation(item, onComplete) {
    // Cancel hover animation
    if (item.userData.animationId) {
        cancelAnimationFrame(item.userData.animationId);
        item.userData.animationId = null;
    }
    
    // Animation parameters
    const duration = 500; // milliseconds
    const startPosition = item.position.clone();
    const endPosition = player.position.clone();
    endPosition.y = player.position.y + 1; // Float to eye level
    
    const startScale = new THREE.Vector3(1, 1, 1);
    const endScale = new THREE.Vector3(0.2, 0.2, 0.2);
    
    const startRotationSpeed = item.userData.rotationSpeed;
    const endRotationSpeed = startRotationSpeed * 5;
    
    const startTime = performance.now();
    
    // Pickup sound effect
    // playSound('itemPickup');
    
    // Animation function
    function animate() {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Use easing function for smoother motion
        const easedProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease out
        
        // Update position - item moves toward player
        item.position.lerpVectors(startPosition, endPosition, easedProgress);
        
        // Update scale - item shrinks as it approaches player
        item.scale.lerpVectors(startScale, endScale, easedProgress);
        
        // Increase rotation speed
        item.userData.rotationSpeed = startRotationSpeed + (endRotationSpeed - startRotationSpeed) * easedProgress;
        item.rotation.y += item.userData.rotationSpeed;
        
        // Continue animation until complete
        if (progress < 1) {
            item.userData.animationId = requestAnimationFrame(animate);
        } else {
            // Animation complete
            scene.remove(item);
            if (onComplete) onComplete();
        }
    }
    
    // Start animation
    item.userData.animationId = requestAnimationFrame(animate);
}

// Function to play item use animations
function playItemUseAnimation(itemType) {
    // Create an animation in front of the player/camera
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);
    
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    
    // Position where the item will appear
    const itemPosition = cameraPosition.clone().add(
        cameraDirection.clone().multiplyScalar(0.5)
    );
    
    // Create model based on item type
    let itemModel;
    
    switch(itemType) {
        case ITEM_TYPES.BANDAGE:
            itemModel = window.itemModels.bandage.clone();
            break;
        case ITEM_TYPES.MEDKIT:
            itemModel = window.itemModels.medkit.clone();
            break;
        case ITEM_TYPES.MINI_SHIELD:
            itemModel = window.itemModels.miniShield.clone();
            break;
        case ITEM_TYPES.BIG_SHIELD:
            itemModel = window.itemModels.bigShield.clone();
            break;
        default:
            return; // Unknown item type
    }
    
    // Position the model
    itemModel.position.copy(itemPosition);
    itemModel.scale.set(0.5, 0.5, 0.5); // Make it a bit smaller than world items
    
    // Look at camera (reverse direction)
    itemModel.lookAt(cameraPosition);
    
    // Add to scene
    scene.add(itemModel);
    
    // Animation parameters
    const duration = 1000; // 1 second animation
    const startScale = new THREE.Vector3(0.5, 0.5, 0.5);
    const endScale = new THREE.Vector3(0, 0, 0); // Shrink to nothing
    const startRotation = itemModel.rotation.clone();
    const startTime = performance.now();
    
    // Play appropriate sound effect
    switch(itemType) {
        case ITEM_TYPES.BANDAGE:
            // playSound('bandageUse');
            break;
        case ITEM_TYPES.MEDKIT:
            // playSound('medkitUse');
            break;
        case ITEM_TYPES.MINI_SHIELD:
        case ITEM_TYPES.BIG_SHIELD:
            // playSound('shieldUse');
            break;
    }
    
    // Use animation differs based on item type
    function animate() {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Use different animations based on item type
        switch(itemType) {
            case ITEM_TYPES.BANDAGE:
            case ITEM_TYPES.MEDKIT:
                // Health items rise up and fade out
                itemModel.position.y += 0.005;
                itemModel.scale.lerpVectors(startScale, endScale, progress);
                itemModel.rotation.y = startRotation.y + progress * Math.PI * 2;
                break;
                
            case ITEM_TYPES.MINI_SHIELD:
            case ITEM_TYPES.BIG_SHIELD:
                // Shield potions tilt like drinking and then disappear
                if (progress < 0.7) {
                    // Tilt up as if drinking
                    itemModel.rotation.x = startRotation.x - progress * Math.PI/2;
                } else {
                    // Then shrink away
                    const shrinkProgress = (progress - 0.7) / 0.3; // Normalized from 0 to 1
                    itemModel.scale.lerpVectors(startScale, endScale, shrinkProgress);
                }
                break;
        }
        
        // Add particles based on item type
        if (progress > 0.3 && Math.random() > 0.7) {
            const particleGeometry = new THREE.SphereGeometry(0.02, 8, 8);
            let particleMaterial;
            
            // Different particles for different items
            if (itemType === ITEM_TYPES.BANDAGE || itemType === ITEM_TYPES.MEDKIT) {
                // Green healing particles
                particleMaterial = new THREE.MeshBasicMaterial({
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.7
                });
            } else {
                // Blue shield particles
                particleMaterial = new THREE.MeshBasicMaterial({
                    color: 0x00aaff,
                    transparent: true,
                    opacity: 0.7
                });
            }
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Position particle around the item
            particle.position.copy(itemModel.position);
            particle.position.x += (Math.random() - 0.5) * 0.2;
            particle.position.y += (Math.random() - 0.5) * 0.2;
            particle.position.z += (Math.random() - 0.5) * 0.2;
            
            // Add to scene
            scene.add(particle);
            
            // Particle animation
            const particleVelocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.01,
                Math.random() * 0.02,
                (Math.random() - 0.5) * 0.01
            );
            
            const particleStartTime = performance.now();
            const particleLifetime = 500 + Math.random() * 500;
            
            function animateParticle() {
                const particleNow = performance.now();
                const particleElapsed = particleNow - particleStartTime;
                const particleProgress = particleElapsed / particleLifetime;
                
                if (particleProgress >= 1) {
                    scene.remove(particle);
                    return;
                }
                
                // Move particle up and fade out
                particle.position.add(particleVelocity);
                particle.material.opacity = 0.7 * (1 - particleProgress);
                
                requestAnimationFrame(animateParticle);
            }
            
            requestAnimationFrame(animateParticle);
        }
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Remove the item when animation completes
            scene.remove(itemModel);
        }
    }
    
    requestAnimationFrame(animate);
}

// Function to create and display held consumable item models
function createHeldConsumableModel(itemType) {
    // Remove any existing held consumable
    if (heldConsumableModel) {
        camera.remove(heldConsumableModel);
        heldConsumableModel = null;
    }
    
    // If models haven't been initialized, do that first
    if (!window.itemModels) {
        createItemModels();
    }
    
    // Create appropriate model based on item type
    switch(itemType) {
        case ITEM_TYPES.BANDAGE:
            heldConsumableModel = window.itemModels.bandage.clone();
            break;
        case ITEM_TYPES.MEDKIT:
            heldConsumableModel = window.itemModels.medkit.clone();
            break;
        case ITEM_TYPES.MINI_SHIELD:
            heldConsumableModel = window.itemModels.miniShield.clone();
            break;
        case ITEM_TYPES.BIG_SHIELD:
            heldConsumableModel = window.itemModels.bigShield.clone();
            break;
        default:
            return null; // Not a consumable item
    }
    
    // Position and scale the model for first-person view
    heldConsumableModel.position.copy(HELD_ITEM_POSITION);
    heldConsumableModel.rotation.copy(HELD_ITEM_ROTATION);
    
    // Adjust specific positioning based on item type
    switch(itemType) {
        case ITEM_TYPES.BANDAGE:
            // Adjust bandage position and rotation
            heldConsumableModel.position.set(0.3, -0.35, -0.5);
            heldConsumableModel.rotation.set(0, Math.PI, 0);
            heldConsumableModel.scale.set(1.2, 1.2, 1.2);
            break;
            
        case ITEM_TYPES.MEDKIT:
            // Adjust medkit position and rotation
            heldConsumableModel.position.set(0.35, -0.4, -0.5);
            heldConsumableModel.rotation.set(0, Math.PI, 0);
            heldConsumableModel.scale.set(0.8, 0.8, 0.8);
            break;
            
        case ITEM_TYPES.MINI_SHIELD:
            // Adjust mini shield position and rotation
            heldConsumableModel.position.set(0.3, -0.4, -0.5);
            heldConsumableModel.rotation.set(0, Math.PI, 0);
            heldConsumableModel.scale.set(1.2, 1.2, 1.2);
            break;
            
        case ITEM_TYPES.BIG_SHIELD:
            // Adjust big shield position and rotation
            heldConsumableModel.position.set(0.3, -0.35, -0.5);
            heldConsumableModel.rotation.set(0, Math.PI, 0);
            heldConsumableModel.scale.set(0.8, 0.8, 0.8);
            break;
    }
    
    // Add a dedicated light to make the item more visible
    const itemLight = new THREE.PointLight(0xffffff, 1.0, 1);
    itemLight.position.set(0, 0.5, -0.2);
    heldConsumableModel.add(itemLight);
    
    // Add to camera
    camera.add(heldConsumableModel);
    console.log(`Created held model for ${getItemName(itemType)}`);
    
    return heldConsumableModel;
}

// Function to animate the held consumable item
function animateHeldConsumable(itemType) {
    if (!heldConsumableModel) return;
    
    // Store original position and rotation
    const originalPosition = heldConsumableModel.position.clone();
    const originalRotation = heldConsumableModel.rotation.clone();
    
    // Get full animation duration based on item type
    const fullDuration = ITEM_USE_DURATIONS[itemType];
    const startTime = performance.now();
    
    function animate() {
        if (!usingItem || !heldConsumableModel) {
            // Animation was canceled
            return;
        }
        
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / fullDuration, 1);
        
        // Different animations based on item type
        if (itemType === ITEM_TYPES.BANDAGE || itemType === ITEM_TYPES.MEDKIT) {
            // Health items move up slightly and then down out of view
            if (progress < 0.4) {
                // Move up slightly (first 40% of animation)
                heldConsumableModel.position.y = originalPosition.y + 0.1 * (progress / 0.4);
            } else {
                // Move down out of view (remaining 60%)
                const downProgress = (progress - 0.4) / 0.6;
                heldConsumableModel.position.y = originalPosition.y + 0.1 - (0.6 * downProgress);
            }
            
            // Add gentle rotation throughout
            heldConsumableModel.rotation.z = originalRotation.z + Math.sin(progress * Math.PI * 2) * 0.1;
            
        } else {
            // Shield potions tilt BACKWARD toward player (changed direction)
            // Start vertical (0) and tilt backward (positive X rotation)
            heldConsumableModel.rotation.x = originalRotation.x + progress * Math.PI/3;
            
            // Move slightly up toward mouth
            heldConsumableModel.position.y = originalPosition.y + 0.15 * progress;
            
            // Move slightly closer to player as it tilts
            heldConsumableModel.position.z = originalPosition.z + 0.1 * progress;
        }
        
        if (progress < 1 && usingItem) {
            consumableAnimationId = requestAnimationFrame(animate);
        } else if (progress >= 1) {
            // Animation complete - position will be reset when item use completes
            consumableAnimationId = null;
        }
    }
    
    consumableAnimationId = requestAnimationFrame(animate);
}

function createMountainsForMenu() {
    const spacing = 12;
    const boundary = 131.25;
    const rows = 3;
    
    const mountainPositions = [];
    
    // Road parameters - FIXED for precise edge alignment
    const roadWidth = 15;
    const roadHalfWidth = roadWidth / 2; // Exact road half-width
    
    // IMPORTANT: Define road direction (same as in game scene)
    const roadDirection = 'x'; // Valid values: 'x' or 'z'

    // Generate mountain positions for multiple rows
    for (let row = 0; row < rows; row++) {
        const offsetDistance = 10 * row;
        
        // Generate positions along x-axis (top and bottom)
        for (let x = -boundary - 10; x <= boundary + 10; x += spacing) {
            // Skip mountains only if road runs along Z-axis AND at the boundary opening
            const distanceFromCenterX = Math.abs(x);
            const isInRoadPathX = roadDirection === 'z' && distanceFromCenterX <= roadHalfWidth;
            
            if (!isInRoadPathX) {
                // For mountains near the road edge, position them precisely at the edge
                let xOffset = 0;
                
                if (roadDirection === 'z' && Math.abs(distanceFromCenterX - roadHalfWidth) < 6) {
                    // This mountain is near the road edge, align it precisely
                    xOffset = distanceFromCenterX < roadHalfWidth ? 
                              roadHalfWidth - distanceFromCenterX : // Push to the edge if inside
                              (Math.random() - 0.5) * Math.min(3, Math.abs(distanceFromCenterX - roadHalfWidth)); // Small random if outside
                } else {
                    // Normal random offset for mountains away from road
                    xOffset = (Math.random() - 0.5) * Math.min(6, Math.max(0, distanceFromCenterX - roadHalfWidth));
                }
                
                mountainPositions.push({
                    x: x + xOffset,
                    z: -boundary + offsetDistance,
                    scale: 1 - row * 0.15
                });
                
                mountainPositions.push({
                    x: x + xOffset,
                    z: boundary - offsetDistance,
                    scale: 1 - row * 0.15
                });
            }
        }
        
        // Generate positions along z-axis (left and right)
        for (let z = -boundary - 10; z <= boundary + 10; z += spacing) {
            // Skip mountains only if road runs along X-axis AND at the boundary opening
            const distanceFromCenterZ = Math.abs(z);
            const isInRoadPathZ = roadDirection === 'x' && distanceFromCenterZ <= roadHalfWidth;
            
            if (!isInRoadPathZ) {
                // For mountains near the road edge, position them precisely at the edge
                let zOffset = 0;
                
                if (roadDirection === 'x' && Math.abs(distanceFromCenterZ - roadHalfWidth) < 6) {
                    // This mountain is near the road edge, align it precisely
                    zOffset = distanceFromCenterZ < roadHalfWidth ? 
                             roadHalfWidth - distanceFromCenterZ : // Push to the edge if inside
                             (Math.random() - 0.5) * Math.min(3, Math.abs(distanceFromCenterZ - roadHalfWidth)); // Small random if outside
                } else {
                    // Normal random offset for mountains away from road
                    zOffset = (Math.random() - 0.5) * Math.min(6, Math.max(0, distanceFromCenterZ - roadHalfWidth));
                }
                
                mountainPositions.push({
                    x: -boundary + offsetDistance,
                    z: z + zOffset,
                    scale: 1 - row * 0.15
                });
                
                mountainPositions.push({
                    x: boundary - offsetDistance,
                    z: z + zOffset,
                    scale: 1 - row * 0.15
                });
            }
        }
    }

    // Create mountains with refined road edge alignment
    mountainPositions.forEach(pos => {
        const height = 20 + (Math.random() - 0.5) * 24;
        const width = 8 + (Math.random() - 0.5) * 9;
        
        // Apply position-specific scale
        const scaledHeight = height * pos.scale;
        const scaledWidth = width * pos.scale;
        
        // Check if this mountain would overlap the road
        const distanceFromCenterX = Math.abs(pos.x);
        const distanceFromCenterZ = Math.abs(pos.z);
        
        // More precise calculation - Consider mountain base radius relative to road edge
        const mountainRadius = scaledWidth / 2;
        
        // Make sure mountain doesn't overlap road but can touch its edge exactly
        const roadOverlapX = roadDirection === 'z' && distanceFromCenterX - mountainRadius < roadHalfWidth;
        const roadOverlapZ = roadDirection === 'x' && distanceFromCenterZ - mountainRadius < roadHalfWidth;
        
        // Only create mountain if it doesn't overlap the road
        if (!roadOverlapX && !roadOverlapZ) {
            const mountainGeometry = new THREE.ConeGeometry(scaledWidth, scaledHeight, 4);
            const mountainMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x4d3319,
                flatShading: true 
            });
            
            const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
            mountain.position.set(pos.x, scaledHeight/2, pos.z);
            mountain.rotation.y = Math.random() * Math.PI / 2;

            mountain.castShadow = true;
            mountain.receiveShadow = true;
            
            menuScene.add(mountain);
        }
    });
}

// Function to create an apocalyptic road across the map
function createApocalypticRoad() {
    // Road dimensions - spans the entire map width
    const roadLength = 281.25; // Same as map width
    const roadWidth = 15; // Width of the road
    
    // Create the main road surface
    const roadGeometry = new THREE.PlaneGeometry(roadLength, roadWidth);
    const roadMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333, // Dark gray for asphalt
        roughness: 0.8,
        metalness: 0.2
    });
    
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2; // Lay flat like the floor
    road.position.y = 0.05; // Slightly above the ground to prevent z-fighting
    scene.add(road);
    
    // Add potholes to the road
    addPotholes(roadLength, roadWidth);
    
    // Add road markings (faded center line)
    addRoadMarkings(roadLength);
    
    // Add debris along the road edges
    addRoadDebris(roadLength, roadWidth);
    
    // Add road lamps along the road
    addRoadLamps(roadLength, roadWidth);

    // Add abandoned car models to the road
    loadAbandonedCarModel(20, 4, Math.PI);              // First car (original position)
    loadAbandonedCarModel(-35, -2.5, Math.PI * 0.2);    // Second car
    loadAbandonedCarModel(60, 5.5, Math.PI * 1.8);      // Third car
    loadAbandonedCarModel(-80, 3, Math.PI * 0.5);       // Fourth car
}

// Function to add potholes and cracks to the road
function addPotholes(roadLength, roadWidth) {
    // Add potholes
    const potholeCount = 12;
    
    for (let i = 0; i < potholeCount; i++) {
        // Create pothole
        const potholeRadius = 0.8 + Math.random() * 1.5;
        const potholeGeometry = new THREE.CircleGeometry(potholeRadius, 12);
        const potholeMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a, // Very dark gray
            roughness: 1.0,
            metalness: 0.0
        });
        
        const pothole = new THREE.Mesh(potholeGeometry, potholeMaterial);
        pothole.rotation.x = -Math.PI / 2;
        
        // Position along road
        const xPos = (Math.random() - 0.5) * roadLength * 0.95;
        const zPos = (Math.random() - 0.5) * roadWidth * 0.8; // Keep within road width
        pothole.position.set(xPos, 0.06, zPos);
        
        scene.add(pothole);
    }
    
    // Add cracks to road
    const crackCount = 15;
    
    for (let i = 0; i < crackCount; i++) {
        // Create a crack using box geometries
        const crackLength = 2 + Math.random() * 5;
        const crackWidth = 0.1 + Math.random() * 0.2;
        
        const crackGeometry = new THREE.BoxGeometry(crackLength, 0.02, crackWidth);
        const crackMaterial = new THREE.MeshBasicMaterial({
            color: 0x111111,
            transparent: false
        });
        
        const crack = new THREE.Mesh(crackGeometry, crackMaterial);
        
        // Position and rotation
        const xPos = (Math.random() - 0.5) * roadLength * 0.9;
        const zPos = (Math.random() - 0.5) * roadWidth * 0.8;
        const rotation = Math.random() * Math.PI;
        
        crack.position.set(xPos, 0.07, zPos); // Slightly above road
        crack.rotation.y = rotation;
        
        scene.add(crack);
    }
}

document.addEventListener('contextmenu', (event) => {
    // Prevent default right-click menu
    event.preventDefault();
    event.stopPropagation();
    
    // Only toggle scope if we have the sniper rifle selected and not reloading
    if (gameStarted && !isPaused && !isInventoryOpen && !isShopOpen &&
        inventory[selectedSlot] === WEAPON_TYPES.SNIPER_RIFLE && !sniperRifleReloading) {
        toggleScope();
        console.log("Scope toggled:", isScoped); // Debug log
    }
    
    return false; // Ensure we block the context menu
});

// Function to add faded road markings
function addRoadMarkings(roadLength) {
    // Create dashed center line (faded and broken)
    const dashCount = 40;
    const dashLength = 3;
    const dashWidth = 0.2;
    
    for (let i = 0; i < dashCount; i++) {
        // Only create some dashes (to look broken)
        if (Math.random() > 0.35) {
            // Create a dash
            const dashGeometry = new THREE.PlaneGeometry(dashLength, dashWidth);
            const dashMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xCCCCCC, // Light gray for faded paint
                transparent: true,
                opacity: 0.2 + Math.random() * 0.3 // Varying opacity for worn look
            });
            
            const dash = new THREE.Mesh(dashGeometry, dashMaterial);
            dash.rotation.x = -Math.PI / 2; // Lay flat
            
            // Position dash along the road
            const xPos = -roadLength/2 + roadLength * (i / dashCount) + roadLength/(dashCount*2);
            dash.position.set(xPos, 0.08, 0); // Slightly above road
            
            scene.add(dash);
        }
    }
}

// Function to add debris along road edges
function addRoadDebris(roadLength, roadWidth) {
    const debrisCount = 30; // Debris for apocalyptic feel
    const edgeOffset = roadWidth / 2; // Distance from center to edge of road
    
    for (let i = 0; i < debrisCount; i++) {
        // Position along road length
        const xPos = (Math.random() - 0.5) * roadLength * 0.95;
        
        // Position near road edges (either left or right side)
        const side = Math.random() > 0.5 ? 1 : -1;
        const zPos = side * (edgeOffset + 0.2 + Math.random() * 2); // Slightly outside road
        
        // Create debris - rock or rubble piece
        const debrisSize = 0.1 + Math.random() * 0.4;
        let debrisGeometry;
        
        // Different shapes for variety
        if (Math.random() < 0.6) {
            debrisGeometry = new THREE.DodecahedronGeometry(debrisSize, 0); // Rock-like
        } else {
            debrisGeometry = new THREE.BoxGeometry(
                debrisSize * 1.5, 
                debrisSize * 0.5, 
                debrisSize * 1.2
            ); // Chunk of concrete
        }
        
        const debrisMaterial = new THREE.MeshStandardMaterial({
            color: Math.random() > 0.5 ? 0x555555 : 0x3a3a3a, // Gray variations
            roughness: 0.9,
            metalness: 0.1
        });
        
        const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
        debris.position.set(xPos, debrisSize * 0.5, zPos); // Place on ground
        debris.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        
        scene.add(debris);
    }
}

// Add this function to update the HUD
function updateHUD() {
    document.getElementById('healthBar').style.width = `${health}%`;
    document.getElementById('healthText').textContent = Math.ceil(health);
    document.getElementById('shieldBar').style.width = `${shield}%`;
    document.getElementById('shieldText').textContent = Math.ceil(shield);
}

function updateCoinDisplay() {
    const coinDisplay = document.getElementById('coinDisplay');
    if (coinDisplay) {
        coinDisplay.textContent = infiniteMoneyCheat ? "INFINITE" : playerCoins;
    }
}

// Add pointer lock setup
document.addEventListener('click', () => {
    if (gameStarted && !isLocked && !isPaused) {
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
    
    // More restrictive pitch limits to prevent camera clipping
    const maxPitchUp = Math.PI/3; // 60 degrees up (reduced from 90)
    const maxPitchDown = Math.PI/3; // 60 degrees down (reduced from 90)
    pitchObject.rotation.x = Math.max(-maxPitchDown, Math.min(maxPitchUp, pitchObject.rotation.x));
});

document.addEventListener('mousedown', (event) => {
    if (event.button === 0) { // Left mouse button
        mouseIsDown = true; // Track mouse down state
        if (gameStarted && !isPaused && isLocked && 
            inventory[selectedSlot] === WEAPON_TYPES.MINIGUN) {
            // Start minigun spinning
            startMinigunSpin();
        }
    }
});

document.addEventListener('mouseup', (event) => {
    if (event.button === 0) { // Left mouse button
        mouseIsDown = false; // Track mouse up state
        if (gameStarted && !isPaused && isLocked && 
            inventory[selectedSlot] === WEAPON_TYPES.MINIGUN) {
            // Stop minigun spinning with same conditions as mousedown
            stopMinigunSpin();
        }
    }
});

// Update key controls to include shift and space
const keys = { w: false, a: false, s: false, d: false, shift: false, space: false };

// Update keydown/keyup listeners
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
}); // Added missing closing parenthesis here

// Update the animate function to properly handle paused state
function animate() {
    requestAnimationFrame(animate);
    
    // FPS counter logic - this can run regardless of pause state
    if (showFPS) {
        frameCount++;
        const currentTime = performance.now();
        const elapsed = currentTime - lastTime;
        
        if (elapsed >= 1000) {
            const fps = Math.round((frameCount * 1000) / elapsed);
            document.getElementById('fps').textContent = fps;
            frameCount = 0;
            lastTime = currentTime;
        }
    }
    
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
    } else if (gameStarted) {
        // Always render the scene, even when paused
        renderer.render(scene, camera);
        
        // Only update game mechanics if not paused and not game over
        if (!isPaused && !isGameOver && player) {
            updatePlayer();
            updateWeaponVisibility();
            
            // Handle minigun spinning and heat mechanics
            if (minigunModel) {
                // Update minigun barrel rotation
                updateMinigunSpin();
                
                // Cool down minigun if not actively firing
                if (minigunHeatLevel > 0 && !minigunSpinning) {
                    minigunHeatLevel = Math.max(0, minigunHeatLevel - 0.01);
                    updateMinigunHeat();
                }
            }
            
            updateEnemies();
            updateBullets();
            
            // Update day-night cycle if enabled
            if (typeof updateDayNightCycle === 'function') {
                updateDayNightCycle(currentRound);
            }
        }
    }
}

// Function that updates minigun barrel spin animation
function updateMinigunSpin() {
    if (!minigunModel) return;
    
    // Get barrel group
    const barrelGroup = minigunModel.userData.barrelGroup;
    if (!barrelGroup) return;
    
    if (minigunSpinning) {
        // Accelerate spin speed
        minigunSpinSpeed = Math.min(1, minigunSpinSpeed + 0.02);
    } else {
        // Decelerate spin speed - make this much faster (0.1 instead of 0.01)
        minigunSpinSpeed = Math.max(0, minigunSpinSpeed - 0.1);
        
        // If we're close to stopping, just stop completely
        if (minigunSpinSpeed < 0.01) {
            minigunSpinSpeed = 0;
        }
    }
    
    // Rotate barrels based on current spin speed
    if (minigunSpinSpeed > 0) {
        minigunBarrelRotation += minigunSpinSpeed * 0.4;
        barrelGroup.rotation.z = minigunBarrelRotation;
    }
}

// Function that updates minigun heat indicator
function updateMinigunHeat() {
    if (!minigunModel || !minigunModel.userData.heatIndicator) return;
    
    const heatIndicator = minigunModel.userData.heatIndicator;
    
    // Change color based on heat (green → yellow → red)
    if (minigunHeatLevel < 0.5) {
        // Green to yellow
        const t = minigunHeatLevel * 2; // 0 to 1
        heatIndicator.material.color.setRGB(t, 1, 0); 
        heatIndicator.material.emissive.setRGB(t * 0.5, 0.5, 0);
    } else {
        // Yellow to red
        const t = (minigunHeatLevel - 0.5) * 2; // 0 to 1
        heatIndicator.material.color.setRGB(1, 1 - t, 0);
        heatIndicator.material.emissive.setRGB(0.5, (1 - t) * 0.5, 0);
    }
    
    // If overheated, force stop firing
    if (minigunHeatLevel >= 1) {
        // Play overheat sound
        soundManager.play('minigun_overheat', 0.8);
        
        showNotification("Minigun overheated!");
        stopMinigunSpin();
        
        // Disable firing until cooled down
        minigunReloading = true;
        
        // Cool down over time
        setTimeout(() => {
            // Reset heat properly
            minigunHeatLevel = 0;
            updateMinigunHeat();
            
            // IMPORTANT: Make sure to reset reloading flag so gun can be used again
            minigunReloading = false;
            
            // NEW CODE: Check if ammo is empty and reload if needed
            if (minigunAmmo === 0 && !minigunAnimationInProgress) {
                showNotification("Minigun cooled down - reloading");
                // Small delay to ensure animations don't conflict
                setTimeout(() => {
                    animateMinigunReload();
                }, 200);
            } else {
                showNotification("Minigun cooled down");
            }
        }, 3000);
    }
}

// Add console command
window.toggleFPS = function() {
    showFPS = !showFPS;
    document.getElementById('fpsCounter').style.display = showFPS ? 'block' : 'none';
    console.log(`FPS counter ${showFPS ? 'enabled' : 'disabled'}`);
};

// Add pause menu event listeners
document.getElementById('resumeButton').addEventListener('click', () => {
    isPaused = false;
    document.getElementById('pauseMenu').style.display = 'none';
    // Show HUD elements when resuming
    document.getElementById('hud').style.display = 'flex';
    showCrosshair(); // Show crosshair when resuming
    document.body.requestPointerLock();
});

// Update the return to main menu button handler
document.getElementById('returnToMainButton').addEventListener('click', () => {
    // Simply reload the entire page instead of trying to clean up resources
    window.location.reload();
});

// Consolidated function to handle return to main menu with loading screen
function returnToMainMenu() {
    // Show loading screen immediately to prevent UI freeze appearance
    const loadingScreen = document.createElement('div');
    loadingScreen.id = 'menuLoadingScreen';
    loadingScreen.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    // Add loading text
    const loadingText = document.createElement('div');
    loadingText.textContent = 'Returning to main menu...';
    loadingText.style.cssText = `
        color: white;
        font-size: 24px;
        margin-bottom: 20px;
    `;
    
    // Add loading spinner
    const spinner = document.createElement('div');
    spinner.style.cssText = `
        width: 50px;
        height: 50px;
        border: 5px solid #333;
        border-top: 5px solid #ff5500;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    `;
    
    // Add spinner animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    
    document.head.appendChild(style);
    loadingScreen.appendChild(loadingText);
    loadingScreen.appendChild(spinner);
    document.body.appendChild(loadingScreen);
    
    // Use setTimeout to allow the loading screen to render before heavy operations
    setTimeout(() => {
        // First stage - hide UI elements and reset game state
        isPaused = false;
        gameStarted = false;
        
        // Hide game elements first
        document.getElementById('pauseMenu').style.display = 'none';
        document.getElementById('gameScene').style.display = 'none';
        document.getElementById('roundInfo').style.display = 'none';
        document.getElementById('victoryScreen').style.display = 'none';
        document.getElementById('hud').style.display = 'none';
        
        // Force cursor to be visible
        document.body.style.cursor = 'auto';
        
        // Reset color selection and UI
        selectedColor = null;
        playerColor = 0x00ff00;
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.getElementById('startGame').disabled = true;
        
        // Use another timeout for the next batch of heavy operations
        setTimeout(() => {
            // Clean up game objects in batches
            cleanupGameObjectsBatch(() => {
                // After cleanup is complete, show menu and remove loading screen
                document.getElementById('menu').style.display = 'block';
                document.getElementById('backgroundScene').style.display = 'block';
                
                // Remove loading screen
                document.getElementById('menuLoadingScreen').remove();
            });
        }, 50);
    }, 50);
}

// Function to clean up game objects in batches to avoid UI freeze
function cleanupGameObjectsBatch(onComplete) {
    // Step 1: Clean up enemies (can be a large number)
    cleanupEnemies(() => {
        // Step 2: Clean up projectiles and bullets
        cleanupProjectilesAndBullets(() => {
            // Step 3: Reset player and camera
            cleanupPlayerAndCamera(() => {
                // Step 4: Clean up environment
                cleanupEnvironment(() => {
                    // Step 5: Reset game state variables
                    resetGameState();
                    
                    // Step 6: Recreate menu scene
                    createMenuScene();
                    
                    // All done
                    if (onComplete) onComplete();
                });
            });
        });
    });
}

// Cleanup functions split into smaller tasks

function cleanupEnemies(callback) {
    // Process in smaller batches if there are many enemies
    const batchSize = 20;
    let index = 0;
    
    function processBatch() {
        const endIndex = Math.min(index + batchSize, enemies.length);
        
        for (let i = index; i < endIndex; i++) {
            if (enemies[i] && enemies[i].parent) {
                scene.remove(enemies[i]);
            }
        }
        
        index = endIndex;
        
        if (index < enemies.length) {
            setTimeout(processBatch, 0); // Continue with next batch in next tick
        } else {
            // All enemies processed
            enemies = [];
            activeEnemies = [];
            
            // Go to next step
            if (callback) callback();
        }
    }
    
    processBatch();
}

function cleanupProjectilesAndBullets(callback) {
    // Clean up projectiles
    for (const projectile of projectiles) {
        if (projectile && projectile.parent) {
            scene.remove(projectile);
        }
    }
    projectiles.length = 0;
    
    // Clean up bullets
    for (const bullet of bullets) {
        if (bullet && bullet.parent) {
            scene.remove(bullet);
        }
    }
    bullets.length = 0;
    
    // Go to next step
    setTimeout(callback, 0);
}

function cleanupPlayerAndCamera(callback) {
    // Remove player from scene if it exists
    if (player) {
        // Make sure to remove weapon models from camera first
        if (knifeModel) {
            camera.remove(knifeModel);
            knifeModel = null;
        }
        if (pistolModel) {
            camera.remove(pistolModel);
            pistolModel = null;
        }
        if (heldConsumableModel) {
            camera.remove(heldConsumableModel);
            heldConsumableModel = null;
        }
        scene.remove(player);
        player = null; 

        if (minigunFireSound) {
            minigunFireSound.pause();
            minigunFireSound = null;
        }

        if (minigunSpinupSound) {
            minigunSpinupSound.pause();
            minigunSpinupSound = null;
        }

        if (minigunSpindownSound) {
            minigunSpindownSound.pause();
            minigunSpindownSound = null;
        }
    }
    
    // Clean up UI elements
    cleanupGameUI();
    
    // Go to next step
    setTimeout(callback, 0);
}

function cleanupEnvironment(callback) {
    // Clear mountains
    mountains.forEach(mountain => scene.remove(mountain));
    mountains = [];
    
    // Clear road blockades
    clearRoadBlockades();
    
    // Clear lamp objects
    roadLampObjects = [];
    
    // Go to next step
    setTimeout(callback, 0);
}

function resetGameState() {
    // Reset game state
    isRoundActive = false;
    isGameOver = false;
    currentRound = 0;
    
    // Reset player stats
    health = 100;
    shield = 0;
    playerCoins = 0;
    
    // Reset weapon stats
    pistolAmmo = pistolMaxAmmo;
    pistolReloading = false;
    
    // Clear any running countdown
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    
    // Make sure coin system is reset
    infiniteMoneyCheat = false;
    if (originalCoinColor) {
        const coinDisplay = document.getElementById('coinDisplay');
        if (coinDisplay) {
            coinDisplay.style.color = originalCoinColor;
        }
    }
}

// Add these event listeners after your other pause menu event listeners
document.getElementById('controlsButtonPause').addEventListener('click', () => {
    controlsAccessedFrom = 'pause';
    document.getElementById('pauseMenu').style.display = 'none';
    document.getElementById('controlsMenu').style.display = 'block';
    
    // Keep HUD hidden when in controls
    document.getElementById('hud').style.display = 'none';
    
    // Fade the round information
    const roundInfo = document.getElementById('roundInfo');
    if (roundInfo) {
        roundInfo.style.opacity = '0.2';
        roundInfo.style.pointerEvents = 'none'; // Prevent interaction with the round info
    }
});

// Add this function to help debug knife issues
function debugKnife() {
    console.log({
        knifeExists: !!knifeModel,
        knifeVisible: knifeModel ? knifeModel.visible : false,
        animationInProgress: knifeAnimationInProgress,
        selectedItem: inventory[selectedSlot],
        selectedSlot: selectedSlot,
        isMoving: keys.w || keys.a || keys.s || keys.d
    });
}

// You can call this from the console with: debugKnife()
window.debugKnife = debugKnife;

// Initialize menu scene and start animation
createMenuScene();
animate();

// Add to controls menu
console.log('Type toggleFPS() in the console to show/hide FPS counter');

// Update the startRounds function to hide the enemy counter initially
function startRounds() {
    // Reset game state
    currentRound = 0;
    enemies = [];
    activeEnemies = [];
    isRoundActive = false;
    isGameOver = false;
    
    // Reset statistics
    gameStats.damageDealt = 0;
    gameStats.damageTaken = 0;
    gameStats.kills.normal = 0;
    gameStats.kills.tank = 0;
    gameStats.kills.ranged = 0;
    gameStats.kills.boss = 0;
    
    // Show round information UI but hide enemy counter until round starts
    document.getElementById('roundInfo').style.display = 'block';
    
    // Hide the enemy counter initially
    const enemiesRemainingElement = document.getElementById('enemiesRemaining');
    if (enemiesRemainingElement) {
        enemiesRemainingElement.style.display = 'none';
    }
    
    // Start initial countdown
    startCountdown(10, () => {
        // Show enemy counter when first round starts
        if (enemiesRemainingElement) {
            enemiesRemainingElement.style.display = 'block';
        }
        startNextRound();
    });
}

// Function to start countdown
function startCountdown(seconds, callback) {
    roundCountdown = seconds;
    
    // Update UI
    const countdownElement = document.getElementById('countdown');
    countdownElement.textContent = roundCountdown;
    countdownElement.style.display = 'block';
    
    // Clear any existing interval
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    // Start new countdown
    countdownInterval = setInterval(() => {
        roundCountdown--;
        
        if (roundCountdown <= 0) {
            clearInterval(countdownInterval);
            countdownElement.style.display = 'none';
            
            if (callback) {
                callback();
            }
        } else {
            countdownElement.textContent = roundCountdown;
        }
    }, 1000);
}

// Function to start the next round
function startNextRound() {
    // Increment round counter
    currentRound++;
    
    // Check if we've reached the end of all rounds
    if (currentRound > totalRounds) {
        // Game completed - show victory screen
        showVictoryScreen();
        return;
    }
    
    // Update day-night cycle for the new round
    updateDayNightCycle(currentRound);
    
    // Update round display in UI
    document.getElementById('roundDisplay').textContent = `Round ${currentRound}/${totalRounds}`;
    
    // Get current round configuration
    const config = roundConfigs[currentRound - 1];
    
    // Calculate total enemies for this round
    let totalEnemies = 0;
    for (const enemyType in config) {
        if (config.hasOwnProperty(enemyType)) {
            totalEnemies += config[enemyType];
        }
    }
    
    // Update enemies remaining display with the total count immediately
    document.getElementById('enemiesRemaining').textContent = `Enemies: ${totalEnemies}`;
    
    // Start round
    isRoundActive = true;
    
    // Start stuck detection to prevent rounds from getting stuck
    startRoundStuckDetection();
    
    // Show round start notification
    showNotification(`Round ${currentRound} Started!`, 3000);
    
    // Reset spawn queue active flag
    spawnQueueActive = false;
    
    // Reset last enemy spawn time
    lastEnemySpawnTime = performance.now();
    
    // Award coins for completing previous round (except first round)
    if (currentRound > 1) {
        const coinsAwarded = Math.floor(10 + (currentRound - 1) * 5);
        playerCoins += coinsAwarded;
        updateCoinDisplay();
        showNotification(`+${coinsAwarded} coins awarded!`, 2000);
    }
    
    // Spawn enemies based on round configuration
    spawnEnemiesForRound(config);
    
    // Special handling for boss rounds
    if (currentRound === 5) {
        showNotification("WARNING: Boss approaching...", 5000);
        soundManager.play('boss_incoming', 0.8); // Play boss incoming sound
    } else if (currentRound === 10) {
        showNotification("WARNING: The Warden approaches...", 5000);
        soundManager.play('boss_incoming', 0.8); // Play boss incoming sound
    } else if (currentRound === 15) {
        showNotification("WARNING: The Phantom materializes...", 5000);
        soundManager.play('boss_incoming', 0.8); // Play boss incoming sound
    } else if (currentRound === 20) {
        showNotification("WARNING: The Mega Boss has arrived...", 5000);
        soundManager.play('boss_incoming', 0.8); // Play boss incoming sound
    }
}

// Function to handle enemy spawning for a round
function spawnEnemiesForRound(config) {
    let spawnQueue = [];
    
    // Add all enemy types from the config to the spawn queue
    for (const enemyType in config) {
        if (config.hasOwnProperty(enemyType) && config[enemyType] > 0) {
            // Translate from config key to ENEMY_TYPES constant
            let enemyTypeKey = enemyType.toUpperCase();
            
            // Special handling for boss types
            if (enemyType === 'warden_boss') {
                for (let i = 0; i < config[enemyType]; i++) {
                    spawnQueue.push(ENEMY_TYPES.WARDEN_BOSS);
                }
            } 
            else if (enemyType === 'phantom_boss') {
                for (let i = 0; i < config[enemyType]; i++) {
                    spawnQueue.push(ENEMY_TYPES.PHANTOM_BOSS);
                }
            }
            else if (enemyType === 'mega_boss') {
                for (let i = 0; i < config[enemyType]; i++) {
                    spawnQueue.push(ENEMY_TYPES.MEGA_BOSS);
                }
            }
            else if (ENEMY_TYPES[enemyTypeKey]) {
                for (let i = 0; i < config[enemyType]; i++) {
                    spawnQueue.push(ENEMY_TYPES[enemyTypeKey]);
                }
            }
        }
    }
    
    // Bosses should spawn last
    const bosses = spawnQueue.filter(type => 
        type === ENEMY_TYPES.WARDEN_BOSS || 
        type === ENEMY_TYPES.PHANTOM_BOSS || 
        type === ENEMY_TYPES.MEGA_BOSS || 
        type === ENEMY_TYPES.BOSS
    );
    
    // Regular enemies spawn first (shuffled)
    const regularEnemies = spawnQueue.filter(type => 
        type !== ENEMY_TYPES.WARDEN_BOSS && 
        type !== ENEMY_TYPES.PHANTOM_BOSS && 
        type !== ENEMY_TYPES.MEGA_BOSS && 
        type !== ENEMY_TYPES.BOSS
    );
    
    // Shuffle only the regular enemies
    const shuffledRegularEnemies = shuffleArray(regularEnemies);
    
    // Combine: regular enemies first, then bosses
    const finalSpawnQueue = [...shuffledRegularEnemies, ...bosses];
    
    // Start spawning enemies from queue
    spawnEnemiesFromQueue(finalSpawnQueue);
}

// Function to spawn enemies from queue with delays
function spawnEnemiesFromQueue(queue) {
    if (queue.length === 0 || isGameOver) return;
    
    const enemyType = queue.shift();
    const config = enemyConfigs[enemyType];
    
    // Spawn the enemy
    spawnEnemy(enemyType);
    
    // Schedule next spawn
    setTimeout(() => {
        spawnEnemiesFromQueue(queue);
    }, config.spawnDelay);
}

// Add a stuck detection mechanism when a round starts
function startRoundStuckDetection() {
    // Clear any existing interval
    if (stuckDetectionInterval) {
        clearInterval(stuckDetectionInterval);
    }
    
    // Check every 10 seconds if spawning is stuck
    stuckDetectionInterval = setInterval(() => {
        // If spawning is active but hasn't happened in over 30 seconds
        if (spawnQueueActive && (performance.now() - lastEnemySpawnTime > 30000)) {
            console.warn("Enemy spawning appears stuck - resetting spawn system");
            
            // Clear the spawn timeout to ensure it doesn't fire later
            if (enemySpawnTimeout) {
                clearTimeout(enemySpawnTimeout);
                enemySpawnTimeout = null;
            }
            
            // Flag as no longer active
            spawnQueueActive = false;
            
            // If no enemies are active, force end round
            if (activeEnemies.length === 0) {
                showNotification("Fixed stuck round - proceeding to next round", 3000);
                endRound();
            }
        }
        
        // Also check if round is active but no enemies in 30 seconds (another stuck case)
        if (isRoundActive && activeEnemies.length === 0 && !spawnQueueActive) {
            showNotification("No enemies detected - proceeding to next round", 3000);
            endRound();
        }
    }, 10000);
}

// Function to create the First Boss (Round 5) with unique abilities
function spawnFirstBoss(config) {
    // Create base mesh with distinct appearance
    const geometry = new THREE.BoxGeometry(
        config.size.width,
        config.size.height,
        config.size.depth
    );
    
    const material = new THREE.MeshPhongMaterial({ 
        color: 0xcc3300, // Distinctive red-orange color
        emissive: 0x330000,
        shininess: 30,
    });
    
    const boss = new THREE.Mesh(geometry, material);
    
    // Position boss at center of map, but further back
    // UPDATED to match expanded map size
    const spawnRadius = 90; // Increased from 50
    const angle = Math.random() * Math.PI * 2;
    boss.position.x = Math.cos(angle) * spawnRadius;
    boss.position.z = Math.sin(angle) * spawnRadius;
    boss.position.y = config.size.height / 2;
    
    // Add boss metadata with unique abilities
    boss.userData = {
        type: ENEMY_TYPES.BOSS,
        health: config.health,
        maxHealth: config.health,
        speed: config.speed,
        damage: config.damage,
        attackRange: config.attackRange,
        lastAttackTime: 0,
        attackCooldown: config.attackCooldown,
        material: material,
        
        // Fire ring ability (close-range defense)
        fireRingCooldown: 8000,
        fireRingDuration: 3000,
        fireRingDamage: 15,
        fireRingRadius: 4,
        lastFireRingTime: 0,
        activeFireRing: null,
        
        // Charge attack (gap closer)
        chargeCooldown: 10000,
        chargeDuration: 1500,
        chargeDamage: 25,
        lastChargeTime: 0,
        isCharging: false,
        chargeDirection: null,
        chargeStartTime: 0,
        
        // Energy bolts (ranged attack)
        boltCount: 3,
        boltDamage: 15,
        boltSpeed: 0.2,
        boltSpread: Math.PI / 12 // 15 degrees spread
    };
    
    // Add boss to scene and tracking arrays
    scene.add(boss);
    enemies.push(boss);
    activeEnemies.push(boss);
    
    // Create a dramatic entrance effect
    createBossEntranceEffect(boss);
    
    // Show boss introduction message
    showNotification("The Guardian has appeared!", 5000);
    
    return boss;
}

// Boss ability: Fire Ring
function bossActivateFireRing(boss) {
    // Create fire ring visual effect
    const ringGeometry = new THREE.RingGeometry(boss.userData.fireRingRadius - 0.5, boss.userData.fireRingRadius, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2; // Lay flat
    ring.position.copy(boss.position);
    ring.position.y = 0.2; // Just above ground
    scene.add(ring);
    
    // Create fire particles
    const particles = [];
    const particleCount = 40;
    
    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(
                0.05 + Math.random() * 0.05, // Orange-red hue
                0.7 + Math.random() * 0.3,  // High saturation
                0.5 + Math.random() * 0.3   // Medium-high lightness
            ),
            transparent: true,
            opacity: 0.8
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Position around circle
        const angle = (i / particleCount) * Math.PI * 2;
        const radius = boss.userData.fireRingRadius;
        
        particle.position.set(
            boss.position.x + Math.cos(angle) * radius,
            boss.position.y + Math.random() * 1.5,
            boss.position.z + Math.sin(angle) * radius
        );
        
        // Random velocity - rising and circling
        particle.userData = {
            angle: angle,
            radius: radius,
            centerX: boss.position.x,
            centerZ: boss.position.z,
            rotateSpeed: (Math.random() - 0.5) * 0.02,
            riseSpeed: 0.05 + Math.random() * 0.05
        };
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Store ring and particles for damage checks and cleanup
    boss.userData.activeFireRing = {
        ring: ring,
        particles: particles,
        createTime: performance.now(),
        damageInterval: null
    };
    
    // Show notification
    showNotification("Fire Ring activated!", 2000);
    
    // Set boss emissive to glow during fire ring
    boss.material.emissive.setHex(0x661100);
    
    // Create damage interval
    boss.userData.activeFireRing.damageInterval = setInterval(() => {
        // Check if player is inside the fire ring
        const distanceToPlayer = boss.position.distanceTo(player.position);
        
        if (distanceToPlayer <= boss.userData.fireRingRadius) {
            takeDamage(boss.userData.fireRingDamage / 2); // Damage per tick
            createFireDamageEffect(player.position);
        }
    }, 500); // Check every half second
    
    // Animate fire particles
    function animateFireParticles() {
        if (!boss.userData.activeFireRing) return;
        
        const now = performance.now();
        const elapsedTime = now - boss.userData.activeFireRing.createTime;
        
        // Check if duration expired
        if (elapsedTime >= boss.userData.fireRingDuration) {
            // Clean up ring and particles
            scene.remove(ring);
            
            for (const particle of particles) {
                if (particle.parent) scene.remove(particle);
            }
            
            // Stop damage interval
            clearInterval(boss.userData.activeFireRing.damageInterval);
            
            // Reset boss emissive
            boss.material.emissive.setHex(0x000000);
            
            // Clear reference
            boss.userData.activeFireRing = null;
            
            return;
        }
        
        // Update particles
        for (const particle of particles) {
            // Update rotation around center
            particle.userData.angle += particle.userData.rotateSpeed;
            particle.position.x = particle.userData.centerX + Math.cos(particle.userData.angle) * particle.userData.radius;
            particle.position.z = particle.userData.centerZ + Math.sin(particle.userData.angle) * particle.userData.radius;
            
            // Rise upward
            particle.position.y += particle.userData.riseSpeed;
            
            // Reset height when too high
            if (particle.position.y > boss.position.y + 3) {
                particle.position.y = boss.position.y + 0.1;
            }
            
            // Flicker opacity
            particle.material.opacity = 0.5 + 0.4 * Math.sin(now * 0.01 + particle.userData.angle);
        }
        
        // Continue animation
        requestAnimationFrame(animateFireParticles);
    }
    
    // Start animation
    animateFireParticles();
}

function createShotgunModel() {
    if (shotgunModel) {
        camera.remove(shotgunModel);
    }
    
    // Create shotgun group
    shotgunModel = new THREE.Group();
    
    // Create shotgun barrel (longer than pistol)
    const barrelGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.7, 16);
    const barrelMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        roughness: 0.2,
        metalness: 0.9
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, 0.2);
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    shotgunModel.add(barrel);
    
    // Create shotgun body
    const bodyGeometry = new THREE.BoxGeometry(0.12, 0.15, 0.4);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.3,
        metalness: 0.8
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.set(0, -0.08, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    shotgunModel.add(body);
    
    // Create shotgun handle/stock
    const handleGeometry = new THREE.BoxGeometry(0.08, 0.25, 0.1);
    const handleMaterial = new THREE.MeshStandardMaterial({
        color: 0x5c2e00, // Brown wooden stock
        roughness: 0.7,
        metalness: 0.1
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, -0.25, -0.15);
    handle.castShadow = true;
    handle.receiveShadow = true;
    shotgunModel.add(handle);
    
    // Add a simple pump mechanism
    const pumpGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.25);
    const pumpMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.5,
        metalness: 0.7
    });
    const pump = new THREE.Mesh(pumpGeometry, pumpMaterial);
    pump.position.set(0, -0.05, 0.05);
    pump.castShadow = true;
    pump.receiveShadow = true;
    shotgunModel.add(pump);
    
    // Position the shotgun in view using constants
    shotgunModel.position.copy(SHOTGUN_IDLE_POSITION);
    shotgunModel.rotation.copy(SHOTGUN_IDLE_ROTATION);
    
    // Add a dedicated light
    const shotgunLight = new THREE.PointLight(0xffffff, 1.5, 1);
    shotgunLight.position.set(0, 0, -0.2);
    shotgunModel.add(shotgunLight);
    
    camera.add(shotgunModel);
    console.log("Shotgun model created");
    
    shotgunModel.visible = (inventory[selectedSlot] === WEAPON_TYPES.SHOTGUN);
    return shotgunModel;
}

function fireShotgun() {
    if (shotgunReloading) return;
    
    if (shotgunAmmo <= 0) {
        // Auto reload when empty
        animateShotgunReload();
        return;
    }
    
    // Play shotgun firing sound
    soundManager.play('shotgun_fire', 0.7);

    // Decrement ammo
    shotgunAmmo--;
    updateAmmoDisplay();
    
    // Play firing animation
    animateShotgunFire();
    
    // Create shotgun pellets
    const pelletCount = 8;
    const spreadAngle = Math.PI / 10;
    
    for (let i = 0; i < pelletCount; i++) {
        createShotgunPellet(spreadAngle);
    }
    
    // Auto reload when empty
    if (shotgunAmmo === 0) {
        setTimeout(animateShotgunReload, 300);
    }
}

// Fix for shotgun pellet damage
function createShotgunPellet(spreadAngle) {
    // Create bullet geometry (smaller than regular bullets)
    const bulletGeometry = new THREE.SphereGeometry(0.02, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Add shadow casting to bullet
    bullet.castShadow = true;
    
    // Get camera position and direction
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);
    
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    camera.getWorldDirection(cameraDirection);
    
    // Apply random spread to direction
    const randomSpreadX = (Math.random() - 0.5) * spreadAngle;
    const randomSpreadY = (Math.random() - 0.5) * spreadAngle;
    
    // Create a rotation matrix for the spread
    const rotationMatrix = new THREE.Matrix4().makeRotationY(randomSpreadX);
    rotationMatrix.multiply(new THREE.Matrix4().makeRotationX(randomSpreadY));
    
    // Apply rotation to direction
    const spreadDirection = cameraDirection.clone().applyMatrix4(rotationMatrix).normalize();
    
    // Position bullet at gun barrel
    bullet.position.copy(cameraPosition).addScaledVector(cameraDirection, 0.6);
    
    // Orient bullet
    bullet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), spreadDirection);
    
    // Fixed damage values for shotgun pellets
    const pelletDamage = 10;
    
    // Add bullet data with REDUCED lifetime for shorter range
    bullet.userData = {
        direction: spreadDirection,
        speed: 2.0,
        damage: pelletDamage, // Each pellet does less damage than a pistol bullet
        lifetime: 300, // REDUCED from 500ms to 300ms for shorter range
        spawnTime: performance.now(),
        initialDamage: pelletDamage, // Store initial damage for falloff calculation
        maxEffectiveRange: 8 // Maximum effective range in units before damage drops
    };
    
    scene.add(bullet);
    bullets.push(bullet);
    
    return bullet;
}

function animateShotgunFire() {
    if (!shotgunModel || shotgunReloading) return;
    
    // Force cancel any ongoing animation to prevent conflicts
    if (shotgunAnimationInProgress) {
        cancelAnimationFrame(shotgunAnimationId);
        // Reset position immediately
        shotgunModel.position.copy(SHOTGUN_IDLE_POSITION);
        shotgunModel.rotation.copy(SHOTGUN_IDLE_ROTATION);
    }
    
    // Mark animation as in progress
    shotgunAnimationInProgress = true;
    
    // Animation constants - stronger recoil than pistol
    const recoilDuration = 100; // milliseconds
    const returnDuration = 200; // milliseconds
    
    // Start time
    const startTime = performance.now();
    
    function animate() {
        const now = performance.now();
        const elapsed = now - startTime;
        
        if (elapsed < recoilDuration) {
            // Recoil motion - stronger than pistol
            const progress = elapsed / recoilDuration;
            shotgunModel.position.z = SHOTGUN_IDLE_POSITION.z + (0.2 * progress);
            shotgunModel.position.y = SHOTGUN_IDLE_POSITION.y + (0.05 * progress);
            shotgunModel.rotation.x = SHOTGUN_IDLE_ROTATION.x - (Math.PI / 24 * progress);
            shotgunAnimationId = requestAnimationFrame(animate);
        } else if (elapsed < recoilDuration + returnDuration) {
            // Return motion
            const returnProgress = (elapsed - recoilDuration) / returnDuration;
            shotgunModel.position.z = SHOTGUN_IDLE_POSITION.z + (0.2 * (1 - returnProgress));
            shotgunModel.position.y = SHOTGUN_IDLE_POSITION.y + (0.05 * (1 - returnProgress));
            shotgunModel.rotation.x = SHOTGUN_IDLE_ROTATION.x - (Math.PI / 24 * (1 - returnProgress));
            shotgunAnimationId = requestAnimationFrame(animate);
        } else {
            // CRITICAL: Reset to exact original values
            shotgunModel.position.copy(SHOTGUN_IDLE_POSITION);
            shotgunModel.rotation.copy(SHOTGUN_IDLE_ROTATION);
            
            // Clear animation state
            shotgunAnimationInProgress = false;
            shotgunAnimationId = null;
        }
    }
    
    shotgunAnimationId = requestAnimationFrame(animate);
}

function animateShotgunReload() {
    if (!shotgunModel || shotgunReloading) return;
    
    // Force cancel any ongoing animation to prevent conflicts
    if (shotgunAnimationInProgress) {
        cancelAnimationFrame(shotgunAnimationId);
        // Reset position immediately
        shotgunModel.position.copy(SHOTGUN_IDLE_POSITION);
        shotgunModel.rotation.copy(SHOTGUN_IDLE_ROTATION);
    }
    
    shotgunReloading = true;
    shotgunAnimationInProgress = true;
    showNotification("Reloading shotgun...", 1200);

    // Play shotgun reload sound
    soundManager.play('shotgun_reload', 0.8);
    
    // Animation constants - longer reload time than pistol
    const totalDuration = 1200; // 1.2 seconds reload time
    const startTime = performance.now();
    
    function animate() {
        const now = performance.now();
        const elapsed = now - startTime;
        
        if (elapsed < totalDuration) {
            const progress = elapsed / totalDuration;
            
            // Pump action animation
            if (progress < 0.25) {
                // Pull back pump
                const pumpProgress = progress * 4; // Scale to 0-1 range
                shotgunModel.position.z = SHOTGUN_IDLE_POSITION.z - (0.1 * pumpProgress);
            } else if (progress < 0.5) {
                // Push forward pump
                const pumpProgress = (progress - 0.25) * 4; // Scale to 0-1 range
                shotgunModel.position.z = SHOTGUN_IDLE_POSITION.z - (0.1 * (1 - pumpProgress));
            } else {
                // Loading shells animation - tilt slightly
                const loadProgress = (progress - 0.5) * 2; // Scale to 0-1 range
                shotgunModel.rotation.z = SHOTGUN_IDLE_ROTATION.z + (Math.PI / 16 * Math.sin(loadProgress * Math.PI));
            }
            
            shotgunAnimationId = requestAnimationFrame(animate);
        } else {
            // CRITICAL: Reset to exact original values
            shotgunModel.position.copy(SHOTGUN_IDLE_POSITION);
            shotgunModel.rotation.copy(SHOTGUN_IDLE_ROTATION);
            
            // Reload complete
            shotgunAmmo = shotgunMaxAmmo;
            shotgunReloading = false;
            updateAmmoDisplay();
            
            // Clear animation state
            shotgunAnimationInProgress = false;
            shotgunAnimationId = null;
        }
    }
    
    shotgunAnimationId = requestAnimationFrame(animate);
}

// Boss ability: Charge Attack
function bossChargeAttack(boss, directionToPlayer) {
    // Show warning before charging
    showNotification("The Guardian prepares to charge!", 1500);
    
    // Flash boss before charging
    const flashCount = 3;
    const flashInterval = 300;
    
    function flashBoss(count) {
        if (count <= 0 || !boss.parent) return;
        
        // Toggle emissive
        if (count % 2 === 0) {
            boss.material.emissive.setHex(0xff0000);
        } else {
            boss.material.emissive.setHex(0x000000);
        }
        
        // Continue flashing
        setTimeout(() => flashBoss(count - 1), flashInterval);
    }
    
    flashBoss(flashCount * 2);
    
    // Delay the charge to give player time to react
    setTimeout(() => {
        if (!boss.parent) return; // Boss might have been defeated already
        
        // Set charging state
        boss.userData.isCharging = true;
        boss.userData.chargeDirection = directionToPlayer.clone();
        boss.userData.chargeStartTime = performance.now();
        
        // Set emissive to indicate charging
        boss.material.emissive.setHex(0xff0000);
        
        // Create charge effect - trail behind boss
        createChargeEffect(boss);
    }, flashInterval * flashCount * 2);
}

// Function to create visual charge effect
function createChargeEffect(boss) {
    // Create trail particles
    const createParticle = () => {
        if (!boss.parent || !boss.userData.isCharging) return;
        
        const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff3300,
            transparent: true,
            opacity: 0.7
        });
        
        const particle = new THREE.Mesh(geometry, material);
        
        // Position at boss location with slight offset
        particle.position.copy(boss.position);
        particle.position.x += (Math.random() - 0.5) * 1;
        particle.position.z += (Math.random() - 0.5) * 1;
        
        scene.add(particle);
        
        // Fade out and remove
        let opacity = 0.7;
        
        function fadeOut() {
            if (opacity <= 0) {
                scene.remove(particle);
                return;
            }
            
            opacity -= 0.05;
            particle.material.opacity = opacity;
            
            requestAnimationFrame(fadeOut);
        }
        
        fadeOut();
    };
    
    // Create particles at intervals during charge
    const particleInterval = setInterval(() => {
        if (!boss.parent || !boss.userData.isCharging) {
            clearInterval(particleInterval);
            return;
        }
        
        createParticle();
    }, 50); // Create particle every 50ms
    
    // Clear interval after charge completes
    setTimeout(() => {
        clearInterval(particleInterval);
    }, boss.userData.chargeDuration);
    
    // Check for collision with player during charge
    const collisionInterval = setInterval(() => {
        if (!boss.parent || !boss.userData.isCharging) {
            clearInterval(collisionInterval);
            return;
        }
        
        const distanceToPlayer = boss.position.distanceTo(player.position);
        const collisionRadius = boss.geometry.parameters.width / 2 + 0.5;
        
        if (distanceToPlayer <= collisionRadius) {
            // Collision with player during charge
            takeDamage(boss.userData.chargeDamage);
            addScreenShake(0.4, 300);
            
            // Create impact effect
            createExplosion(player.position, 1, 0); // Visual only, damage already applied
        }
    }, 100);
    
    // Clear interval after charge completes
    setTimeout(() => {
        clearInterval(collisionInterval);
    }, boss.userData.chargeDuration);
}

// Boss ability: Fire Energy Bolts
function bossFireEnergyBolts(boss) {
    // Calculate direction to player
    const directionToPlayer = new THREE.Vector3()
        .subVectors(player.position, boss.position)
        .normalize();
    
    // Fire multiple bolts with spread
    const boltCount = boss.userData.boltCount;
    const spread = boss.userData.boltSpread;
    
    // Create main bolt (directly at player)
    createEnergyBolt(boss, directionToPlayer, 0xff3300);
    
    // Create side bolts with spread
    for (let i = 1; i <= Math.floor(boltCount / 2); i++) {
        // Calculate angles for spread
        const leftAngle = i * spread;
        const rightAngle = -i * spread;
        
        // Create rotated directions
        const leftDirection = directionToPlayer.clone();
        const leftRotation = new THREE.Matrix4().makeRotationY(leftAngle);
        leftDirection.applyMatrix4(leftRotation);
        
        const rightDirection = directionToPlayer.clone();
        const rightRotation = new THREE.Matrix4().makeRotationY(rightAngle);
        rightDirection.applyMatrix4(rightRotation);
        
        // Create bolts
        createEnergyBolt(boss, leftDirection, 0xff5500);
        createEnergyBolt(boss, rightDirection, 0xff5500);
    }
    
    // Add attack glow effect
    const glow = new THREE.PointLight(0xff3300, 2, 5);
    glow.position.copy(boss.position);
    glow.position.y += boss.geometry.parameters.height / 2;
    scene.add(glow);
    
    // Remove glow after short duration
    setTimeout(() => {
        scene.remove(glow);
    }, 500);
}

// Function to create a single energy bolt projectile
function createEnergyBolt(boss, direction, color) {
    // Create energy bolt mesh
    const boltGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const boltMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.8
    });
    
    const bolt = new THREE.Mesh(boltGeometry, boltMaterial);
    
    // Position at boss
    bolt.position.copy(boss.position);
    bolt.position.y = boss.position.y + boss.geometry.parameters.height * 0.6;
    
    // Add metadata for movement and damage
    bolt.userData = {
        direction: direction.clone(),
        speed: boss.userData.boltSpeed,
        damage: boss.userData.boltDamage,
        lifetime: 8000,
        spawnTime: performance.now(),
        isEnergyBolt: true
    };
    
    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(0.6, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    bolt.add(glow);
    
    // Add bolt to scene and projectiles array
    scene.add(bolt);
    projectiles.push(bolt);
    
    // Animate bolt glow
    animateBoltGlow(bolt);
    
    return bolt;
}

// Function to animate energy bolt glow
function animateBoltGlow(bolt) {
    const startTime = performance.now();
    
    function animate() {
        if (!bolt.parent) return;
        
        const now = performance.now();
        const elapsed = now - startTime;
        
        // Pulsing effect
        const scale = 1 + 0.2 * Math.sin(elapsed * 0.01);
        bolt.children[0].scale.set(scale, scale, scale);
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// Function to create fire damage effect on player
function createFireDamageEffect(position) {
    // Create fire particles
    for (let i = 0; i < 10; i++) {
        const size = 0.05 + Math.random() * 0.1;
        const geometry = new THREE.SphereGeometry(size, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(
                0.05 + Math.random() * 0.05, // Fire color
                0.7,
                0.5 + Math.random() * 0.3
            ),
            transparent: true,
            opacity: 0.7
        });
        
        const particle = new THREE.Mesh(geometry, material);
        
        // Position around player
        particle.position.set(
            position.x + (Math.random() - 0.5) * 0.5,
            position.y + Math.random() * 1.5,
            position.z + (Math.random() - 0.5) * 0.5
        );
        
        // Add velocity
        particle.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                0.05 + Math.random() * 0.05,
                (Math.random() - 0.5) * 0.02
            ),
            lifetime: 500,
            spawnTime: performance.now()
        };
        
        scene.add(particle);
        
        // Animate and remove
        function animateParticle() {
            const now = performance.now();
            const elapsed = now - particle.userData.spawnTime;
            
            if (elapsed > particle.userData.lifetime) {
                scene.remove(particle);
                return;
            }
            
            // Move particle
            particle.position.add(particle.userData.velocity);
            
            // Fade out
            const progress = elapsed / particle.userData.lifetime;
            particle.material.opacity = 0.7 * (1 - progress);
            
            requestAnimationFrame(animateParticle);
        }
        
        requestAnimationFrame(animateParticle);
    }
}

// Function to spawn a single enemy
function spawnEnemy(enemyType) {
    const config = enemyConfigs[enemyType];
    
    // Special creation for boss enemies
    if (enemyType === ENEMY_TYPES.WARDEN_BOSS) {
        return spawnWardenBoss(config);
    } 
    else if (enemyType === ENEMY_TYPES.PHANTOM_BOSS) {
        return spawnPhantomBoss(config);
    }
    else if (enemyType === ENEMY_TYPES.MEGA_BOSS) {
        return spawnMegaBoss(config);
    }
    else {
        // Create enemy mesh for standard enemy types
        const geometry = new THREE.BoxGeometry(
            config.size.width,
            config.size.height,
            config.size.depth
        );
        const material = new THREE.MeshPhongMaterial({ 
            color: config.color,
            emissive: 0x000000
        });
        const enemy = new THREE.Mesh(geometry, material);
        
        // NEW: Use improved spawn position logic to avoid spawning inside obstacles
        const spawnPosition = getValidEnemySpawnPosition(config.size.width);
        enemy.position.copy(spawnPosition);
        enemy.position.y = config.size.height / 2;
        
        // Add shadow properties
        enemy.castShadow = true;
        enemy.receiveShadow = true;
        
        // Add enemy metadata
        enemy.userData = {
            type: enemyType,
            health: config.health,
            maxHealth: config.health,
            speed: config.speed,
            damage: config.damage,
            attackRange: config.attackRange,
            lastAttackTime: 0,
            attackCooldown: config.attackCooldown,
            stuckCounter: 0, // NEW: Add counter for detecting stuck enemies
            lastPosition: enemy.position.clone() // NEW: Track position for stuck detection
        };
        
        // Add type-specific properties as before...
        
        // Add enemy to the scene and tracking arrays
        scene.add(enemy);
        enemies.push(enemy);
        activeEnemies.push(enemy);
        
        return enemy;
    }
}

// NEW: Function to get a valid spawn position that avoids obstacles
function getValidEnemySpawnPosition(enemyWidth) {
    const spawnRadius = 100; // Consistent with existing spawn radius
    let attempts = 0;
    let position;
    
    // Try up to 10 times to find a valid position
    do {
        attempts++;
        const angle = Math.random() * Math.PI * 2;
        position = new THREE.Vector3(
            Math.cos(angle) * spawnRadius,
            0,
            Math.sin(angle) * spawnRadius
        );
    } while (isPositionInsideObstacle(position, enemyWidth) && attempts < 10);
    
    // If we couldn't find a valid position after 10 attempts, just use the last attempt
    // but increase the radius to hopefully avoid obstacles
    if (attempts >= 10) {
        const angle = Math.random() * Math.PI * 2;
        position = new THREE.Vector3(
            Math.cos(angle) * (spawnRadius + 10),
            0,
            Math.sin(angle) * (spawnRadius + 10)
        );
    }
    
    return position;
}

// NEW: Function to check if a position is inside any obstacle
function isPositionInsideObstacle(position, entityWidth) {
    // Check distance from road blockades
    for (const blockade of roadBlockades) {
        if (!blockade || !blockade.position) continue;
        
        // Use a generous collision buffer
        const blockadeRadius = 12; // Large enough to cover most blockade elements
        const distance = position.distanceTo(blockade.position);
        
        if (distance < blockadeRadius + entityWidth) {
            return true; // Inside or too close to a blockade
        }
    }
    
    // Check other types of obstacles (abandoned cars, gas station, etc.)
    // Abandoned cars
    for (const car of abandonedCars) {
        if (!car || !car.userData) continue;
        
        const carRadius = car.userData.collisionRadius || 4;
        const distance = position.distanceTo(car.position);
        
        if (distance < carRadius + entityWidth) {
            return true; // Too close to a car
        }
    }
    
    // Environment objects (rocks, trees)
    if (scene.userData.environmentalColliders) {
        for (const collider of scene.userData.environmentalColliders) {
            if (collider.type === 'circle' || collider.type === 'cylinder') {
                const distance = position.distanceTo(collider.position);
                if (distance < collider.radius + entityWidth) {
                    return true; // Too close to an environmental object
                }
            }
        }
    }
    
    return false; // Position is valid
}

// Function to update enemies
function updateEnemies() {
    if (!isRoundActive || isGameOver) return;
    
    const now = performance.now();
    
    for (let i = activeEnemies.length - 1; i >= 0; i--) {
        const enemy = activeEnemies[i];
        
        // Skip if enemy was removed
        if (!enemy.userData) continue;
        
        // Calculate direction to player
        const directionToPlayer = new THREE.Vector3();
        directionToPlayer.subVectors(player.position, enemy.position);
        directionToPlayer.y = 0; // Keep enemies at ground level
        const distanceToPlayer = directionToPlayer.length();
        directionToPlayer.normalize();
        
        // Update enemy based on type
        switch (enemy.userData.type) {
            case ENEMY_TYPES.NORMAL:
            case ENEMY_TYPES.TANK:
                // Basic enemy behavior - approach and attack
                handleBasicEnemy(enemy, directionToPlayer, distanceToPlayer, now);
                break;
                
            case ENEMY_TYPES.RANGED:
                // Ranged enemy behavior
                handleRangedEnemy(enemy, directionToPlayer, distanceToPlayer, now);
                break;
                
            case ENEMY_TYPES.SPEEDER:
                // Speeder enemy circle-strafes around player
                handleSpeederEnemy(enemy, directionToPlayer, distanceToPlayer, now);
                break;
                
            case ENEMY_TYPES.EXPLODER:
                // Exploder rushes at player and explodes
                handleExploderEnemy(enemy, directionToPlayer, distanceToPlayer, now);
                break;
                
            case ENEMY_TYPES.SHIELDER:
                // Shielder protects with frontal shield
                handleShielderEnemy(enemy, directionToPlayer, distanceToPlayer, now);
                break;
                
            case ENEMY_TYPES.TELEPORTER:
                // Teleporter attacks from different positions
                handleTeleporterEnemy(enemy, directionToPlayer, distanceToPlayer, now);
                break;
                
            case ENEMY_TYPES.HEALER:
                // Healer stays back and heals allies
                handleHealerEnemy(enemy, now);
                break;
                
            case ENEMY_TYPES.ELITE:
                // Elite has enhanced abilities
                handleEliteEnemy(enemy, directionToPlayer, distanceToPlayer, now);
                break;
                
            case ENEMY_TYPES.BOSS:
                // Standard boss behavior
                handleBossEnemy(enemy, directionToPlayer, distanceToPlayer, now);
                break;
                
            case ENEMY_TYPES.WARDEN_BOSS:
                // Round 10 boss - The Warden
                handleWardenBoss(enemy, directionToPlayer, distanceToPlayer, now);
                break;
                
            case ENEMY_TYPES.PHANTOM_BOSS:
                // Round 15 boss - The Phantom
                handlePhantomBoss(enemy, directionToPlayer, distanceToPlayer, now);
                break;
                
            case ENEMY_TYPES.MEGA_BOSS:
                // Round 20 boss - The Overlord
                handleMegaBoss(enemy, directionToPlayer, distanceToPlayer, now);
                break;
        }
        
        // Make enemy face player (except for shielders who always face player)
        if (enemy.userData.type !== ENEMY_TYPES.SHIELDER) {
            enemy.lookAt(player.position);
        }
    }
    
    // Update projectiles
    updateProjectiles();
    
    // Check if round is complete
    if (activeEnemies.length === 0 && isRoundActive) {
        endRound();
    }
}

// Add new handler functions for each enemy type
function handleBasicEnemy(enemy, directionToPlayer, distanceToPlayer, now) {
    // Move towards player if not in attack range
    if (distanceToPlayer > enemy.userData.attackRange) {
        moveEnemy(enemy, directionToPlayer);
    } else {
        // Attack player if cooldown expired
        if (now - enemy.userData.lastAttackTime >= enemy.userData.attackCooldown) {
            attackPlayer(enemy);
            enemy.userData.lastAttackTime = now;
        }
    }
}

function handleRangedEnemy(enemy, directionToPlayer, distanceToPlayer, now) {
    // Keep distance from player
    const optimalRange = enemy.userData.attackRange * 0.7;
    
    if (distanceToPlayer < optimalRange - 2) {
        // Too close, move away
        moveEnemy(enemy, directionToPlayer.clone().negate());
    } else if (distanceToPlayer > optimalRange + 2) {
        // Too far, move closer
        moveEnemy(enemy, directionToPlayer);
    } else {
        // In range, attack if cooldown expired
        if (now - enemy.userData.lastAttackTime >= enemy.userData.attackCooldown) {
            fireProjectile(enemy, directionToPlayer);
            enemy.userData.lastAttackTime = now;
        }
    }
}

function handleSpeederEnemy(enemy, directionToPlayer, distanceToPlayer, now) {
    // Circle strafe around player
    if (distanceToPlayer > enemy.userData.attackRange * 1.5) {
        // Too far, approach player
        moveEnemy(enemy, directionToPlayer);
    } else if (distanceToPlayer < enemy.userData.attackRange * 0.8) {
        // Too close, back up
        moveEnemy(enemy, directionToPlayer.clone().negate());
    } else {
        // At good distance, circle around player
        const strafeDirection = new THREE.Vector3(
            -directionToPlayer.z * enemy.userData.strafeDirection,
            0,
            directionToPlayer.x * enemy.userData.strafeDirection
        ).normalize();
        
        moveEnemy(enemy, strafeDirection);
        
        // Attack if in range and cooldown expired
        if (distanceToPlayer <= enemy.userData.attackRange &&
            now - enemy.userData.lastAttackTime >= enemy.userData.attackCooldown) {
            attackPlayer(enemy);
            enemy.userData.lastAttackTime = now;
            
            // Occasionally change strafe direction
            if (Math.random() < 0.1) {
                enemy.userData.strafeDirection *= -1;
            }
        }
    }
}

function handleExploderEnemy(enemy, directionToPlayer, distanceToPlayer, now) {
    // Rush directly at player to explode
    moveEnemy(enemy, directionToPlayer);
    
    // If close enough, explode
    if (distanceToPlayer < enemy.userData.attackRange) {
        // Create explosion effect
        createExplosion(enemy.position, enemy.userData.attackRange, enemy.userData.damage);
        
        // Remove exploder after explosion
        defeatEnemy(enemy);
    }
}

function handleShielderEnemy(enemy, directionToPlayer, distanceToPlayer, now) {
    // Always face player to block with shield
    enemy.lookAt(player.position);
    
    // Move towards player if not in attack range
    if (distanceToPlayer > enemy.userData.attackRange) {
        moveEnemy(enemy, directionToPlayer);
    } else {
        // Attack player if cooldown expired
        if (now - enemy.userData.lastAttackTime >= enemy.userData.attackCooldown) {
            attackPlayer(enemy);
            enemy.userData.lastAttackTime = now;
        }
    }
}

function handleTeleporterEnemy(enemy, directionToPlayer, distanceToPlayer, now) {
    // Check if it's time to teleport
    if (now - enemy.userData.lastTeleportTime >= enemy.userData.teleportCooldown &&
        (distanceToPlayer < enemy.userData.attackRange * 0.7 || distanceToPlayer > enemy.userData.attackRange * 1.5)) {
        
        // Teleport to a better position
        teleportEnemy(enemy);
        enemy.userData.lastTeleportTime = now;
    } else {
        // Stay at medium range if possible
        const optimalRange = enemy.userData.attackRange;
        
        if (distanceToPlayer < optimalRange - 2) {
            // Too close, move away
            moveEnemy(enemy, directionToPlayer.clone().negate());
        } else if (distanceToPlayer > optimalRange + 2) {
            // Too far, move closer
            moveEnemy(enemy, directionToPlayer);
        }
    }
    
    // Attack if in good range and cooldown expired
    if (distanceToPlayer <= enemy.userData.attackRange &&
        now - enemy.userData.lastAttackTime >= enemy.userData.attackCooldown) {
        fireProjectile(enemy, directionToPlayer);
        enemy.userData.lastAttackTime = now;
    }
}

function handleHealerEnemy(enemy, now) {
    // Increase heal range for better utility
    const healSearchRange = enemy.userData.healRange * 1.5;
    
    // Find allies that need healing, prioritizing by health percentage
    let targetAlly = null;
    let lowestHealthPercentage = 1.0; // Start with 100% health
    let closestDistance = Infinity;
    
    for (const ally of activeEnemies) {
        // Skip self
        if (ally === enemy) continue;
        
        // Skip fully healed allies
        if (ally.userData.health >= ally.userData.maxHealth) continue;
        
        const distance = enemy.position.distanceTo(ally.position);
        
        // Only consider allies within heal search range
        if (distance < healSearchRange) {
            // Calculate health percentage
            const healthPercentage = ally.userData.health / ally.userData.maxHealth;
            
            // If this ally has lower health percentage than our current target
            // OR it's the same percentage but closer, select this ally
            if (healthPercentage < lowestHealthPercentage || 
                (Math.abs(healthPercentage - lowestHealthPercentage) < 0.05 && distance < closestDistance)) {
                targetAlly = ally;
                lowestHealthPercentage = healthPercentage;
                closestDistance = distance;
            }
        }
    }
    
    if (targetAlly) {
        // Move towards damaged ally - move faster than normal
        const directionToAlly = new THREE.Vector3()
            .subVectors(targetAlly.position, enemy.position)
            .normalize();
        
        // 20% faster movement when heading to heal allies
        moveEnemy(enemy, directionToAlly, enemy.userData.speed * 1.2);
        
        // Visual effect to show healing intent - green line between healer and target
        createHealTargetingLine(enemy, targetAlly);
        
        // Heal ally if close enough and cooldown expired
        if (closestDistance < enemy.userData.healRange * 0.6 &&
            now - enemy.userData.lastHealTime >= enemy.userData.healCooldown) {
            healAlly(enemy, targetAlly);
            enemy.userData.lastHealTime = now;
        }
    } else {
        // No damaged allies found, follow nearest ally
        let nearestAlly = null;
        let nearestDistance = Infinity;
        
        for (const ally of activeEnemies) {
            if (ally === enemy) continue;
            
            const distance = enemy.position.distanceTo(ally.position);
            if (distance < nearestDistance && distance > 3) {
                nearestAlly = ally;
                nearestDistance = distance;
            }
        }
        
        // If found a nearby ally, follow them at a small distance
        if (nearestAlly) {
            const directionToAlly = new THREE.Vector3()
                .subVectors(nearestAlly.position, enemy.position)
                .normalize();
            
            // If too close, maintain distance
            if (nearestDistance < 4) {
                moveEnemy(enemy, directionToAlly.negate(), enemy.userData.speed * 0.5);
            } 
            // If too far, catch up
            else if (nearestDistance > 8) {
                moveEnemy(enemy, directionToAlly, enemy.userData.speed * 1.1);
            }
            // Otherwise move with them but slightly slower
            else {
                moveEnemy(enemy, directionToAlly, enemy.userData.speed * 0.8);
            }
        } else {
            // No allies found or too close to player, avoid player
            const distanceToPlayer = enemy.position.distanceTo(player.position);
            
            if (distanceToPlayer < enemy.userData.healRange * 0.7) {
                // Too close to player, move away
                const directionToPlayer = new THREE.Vector3()
                    .subVectors(player.position, enemy.position)
                    .normalize();
                moveEnemy(enemy, directionToPlayer.negate());
            } else {
                // Move randomly
                const randomAngle = Math.random() * Math.PI * 2;
                const randomDirection = new THREE.Vector3(
                    Math.cos(randomAngle),
                    0,
                    Math.sin(randomAngle)
                );
                moveEnemy(enemy, randomDirection);
            }
        }
    }
}

// Add this new function to create a visual targeting line between healer and target
function createHealTargetingLine(healer, target) {
    // Remove any existing targeting line
    if (healer.userData.targetingLine && healer.userData.targetingLine.parent) {
        scene.remove(healer.userData.targetingLine);
    }
    
    // Create line geometry between healer and target
    const points = [
        new THREE.Vector3(0, 1, 0), // Start at healer, offset from ground
        new THREE.Vector3(0, 1, 0)  // Will be updated to target position
    ];
    
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00ff44, // Green healing color
        transparent: true,
        opacity: 0.4
    });
    
    const line = new THREE.Line(lineGeometry, lineMaterial);
    
    // Position the line at the healer and orient it toward the target
    line.position.copy(healer.position);
    
    // Calculate the direction and distance to target
    const direction = new THREE.Vector3().subVectors(target.position, healer.position);
    const distance = direction.length();
    
    // Set the second point to the target position (in local coordinates)
    lineGeometry.attributes.position.array[3] = direction.x;
    lineGeometry.attributes.position.array[4] = direction.y;
    lineGeometry.attributes.position.array[5] = direction.z;
    lineGeometry.attributes.position.needsUpdate = true;
    
    // Add the line to the scene
    scene.add(line);
    
    // Store the line for future reference/removal
    healer.userData.targetingLine = line;
    
    // Automatically remove the line after a short duration
    setTimeout(() => {
        if (line.parent) {
            scene.remove(line);
        }
        if (healer.userData.targetingLine === line) {
            healer.userData.targetingLine = null;
        }
    }, 200); // 200ms is enough to create a trail effect as the healer moves
}

function handleEliteEnemy(enemy, directionToPlayer, distanceToPlayer, now) {
    // Basic movement behavior - get in range
    if (distanceToPlayer > enemy.userData.attackRange) {
        moveEnemy(enemy, directionToPlayer);
    } else {
        // Attack player if cooldown expired
        if (now - enemy.userData.lastAttackTime >= enemy.userData.attackCooldown) {
            attackPlayer(enemy);
            enemy.userData.lastAttackTime = now;
        }
    }
    
    // Use special ability based on elite type if cooldown expired
    if (now - enemy.userData.lastSpecialAttackTime >= enemy.userData.specialAttackCooldown) {
        switch (enemy.userData.eliteType) {
            case 'speed':
                // Speed burst for short duration
                useEliteSpeedBurst(enemy);
                break;
                
            case 'damage':
                // Heavy attack
                useEliteHeavyAttack(enemy, directionToPlayer);
                break;
                
            case 'health':
                // Heal self and nearby allies
                useEliteHeal(enemy);
                break;
                
            case 'range':
                // Multiple projectile barrage
                useEliteBarrage(enemy, directionToPlayer);
                break;
        }
        
        enemy.userData.lastSpecialAttackTime = now;
    }
}

function handleBossEnemy(enemy, directionToPlayer, distanceToPlayer, now) {
    // Maintain a medium-range distance from the player
    const optimalRange = enemy.userData.attackRange * 1.2;
    
    // Move toward optimal range if not charging
    if (!enemy.userData.isCharging) {
        if (distanceToPlayer > optimalRange + 2) {
            // Too far, move closer
            moveEnemy(enemy, directionToPlayer);
        } else if (distanceToPlayer < optimalRange - 2) {
            // Too close, back up
            moveEnemy(enemy, directionToPlayer.clone().negate(), enemy.userData.speed * 0.8);
        }
    }
    
    // Regular attack if within range and cooldown expired
    if (distanceToPlayer <= enemy.userData.attackRange && 
        now - enemy.userData.lastAttackTime >= enemy.userData.attackCooldown &&
        !enemy.userData.isCharging) {
        // Fire energy bolts
        bossFireEnergyBolts(enemy);
        enemy.userData.lastAttackTime = now;
    }
    
    // Activate fire ring if player gets too close
    if (distanceToPlayer < enemy.userData.attackRange * 0.7 && 
        now - enemy.userData.lastFireRingTime >= enemy.userData.fireRingCooldown) {
        bossActivateFireRing(enemy);
        enemy.userData.lastFireRingTime = now;
    }
    
    // Charge attack if cooldown expired
    if (now - enemy.userData.lastChargeTime >= enemy.userData.chargeCooldown &&
        !enemy.userData.isCharging) {
        bossChargeAttack(enemy, directionToPlayer);
        enemy.userData.lastChargeTime = now;
    }
    
    // Update charge movement if currently charging
    if (enemy.userData.isCharging && enemy.userData.chargeDirection) {
        // Move in charge direction at higher speed
        moveEnemy(enemy, enemy.userData.chargeDirection, enemy.userData.speed * 2.5);
        
        // Check if charge duration has expired
        if (now - enemy.userData.chargeStartTime >= enemy.userData.chargeDuration) {
            // End charge and add brief recovery period
            enemy.userData.isCharging = false;
            enemy.userData.material.emissive.setHex(0x000000);
        }
    }
}

function handleWardenBoss(enemy, directionToPlayer, distanceToPlayer, now) {
    // Only move if shield is not active
    if (!enemy.userData.shieldActive) {
        if (distanceToPlayer > enemy.userData.attackRange) {
            moveEnemy(enemy, directionToPlayer);
        } else {
            // Regular attack if cooldown expired
            if (now - enemy.userData.lastAttackTime >= enemy.userData.attackCooldown) {
                attackPlayer(enemy);
                enemy.userData.lastAttackTime = now;
            }
        }
    }
    
    // Shield wall ability
    if (now - enemy.userData.lastShieldWallTime >= enemy.userData.shieldWallCooldown &&
        !enemy.userData.shieldActive) {
        
        // Activate shield wall
        activateWardenShield(enemy);
        enemy.userData.lastShieldWallTime = now;
    }
    
    // Ground slam ability
    if (now - enemy.userData.lastGroundSlamTime >= enemy.userData.groundSlamCooldown &&
        distanceToPlayer < enemy.userData.groundSlamRange) {
        
        wardenGroundSlam(enemy);
        enemy.userData.lastGroundSlamTime = now;
    }
    
    // Summon minions ability
    if (now - enemy.userData.lastSummonTime >= enemy.userData.summonCooldown) {
        wardenSummonMinions(enemy);
        enemy.userData.lastSummonTime = now;
    }
}

function handlePhantomBoss(enemy, directionToPlayer, distanceToPlayer, now) {
    // Only move and attack if not phased
    if (!enemy.userData.phaseActive) {
        // Stay at medium range
        const optimalRange = enemy.userData.attackRange * 0.7;
        
        if (distanceToPlayer < optimalRange - 2) {
            // Too close, move away
            moveEnemy(enemy, directionToPlayer.clone().negate());
        } else if (distanceToPlayer > optimalRange + 2) {
            // Too far, move closer
            moveEnemy(enemy, directionToPlayer);
        }
        
        // Regular attack if in range and cooldown expired
        if (distanceToPlayer <= enemy.userData.attackRange &&
            now - enemy.userData.lastAttackTime >= enemy.userData.attackCooldown) {
            
            firePhantomProjectile(enemy, directionToPlayer);
            enemy.userData.lastAttackTime = now;
        }
    }
    
    // Teleport ability
    if (now - enemy.userData.lastTeleportTime >= enemy.userData.teleportCooldown) {
        phantomTeleportStrike(enemy);
        enemy.userData.lastTeleportTime = now;
    }
    
    // Clone ability
    if (now - enemy.userData.lastCloneTime >= enemy.userData.cloneCooldown &&
        enemy.userData.activeClones.length === 0) {
        
        phantomCreateClones(enemy);
        enemy.userData.lastCloneTime = now;
    }
    
    // Void zone ability
    if (now - enemy.userData.lastVoidZoneTime >= enemy.userData.voidZoneCooldown) {
        phantomCreateVoidZones(enemy);
        enemy.userData.lastVoidZoneTime = now;
    }
    
    // Phase shift ability
    if (now - enemy.userData.lastPhaseShiftTime >= enemy.userData.phaseShiftCooldown &&
        enemy.userData.health < enemy.userData.maxHealth * 0.5 && // Only below 50% health
        !enemy.userData.phaseActive) {
        
        phantomPhaseShift(enemy);
        enemy.userData.lastPhaseShiftTime = now;
    }
}

function handleMegaBoss(enemy, directionToPlayer, distanceToPlayer, now) {
    // Check for phase transitions based on health
    checkMegaBossPhaseTransition(enemy);
    
    // Movement behavior based on current phase
    const phase = enemy.userData.currentPhase;
    
    // Phase 1: Warden-like behavior
    if (phase === 1) {
        // Only move if shield is not active
        if (!enemy.userData.shieldActive) {
            if (distanceToPlayer > enemy.userData.attackRange) {
                moveEnemy(enemy, directionToPlayer);
            } else {
                // Regular attack if cooldown expired
                if (now - enemy.userData.lastAttackTime >= enemy.userData.attackCooldown) {
                    attackPlayer(enemy);
                    enemy.userData.lastAttackTime = now;
                }
            }
        }
        
        // Shield wall ability
        if (now - enemy.userData.lastShieldWallTime >= enemy.userData.shieldWallCooldown &&
            !enemy.userData.shieldActive) {
            
            activateWardenShield(enemy);
            enemy.userData.lastShieldWallTime = now;
        }
        
        // Ground slam ability
        if (now - enemy.userData.lastGroundSlamTime >= enemy.userData.groundSlamCooldown &&
            distanceToPlayer < enemy.userData.groundSlamRange) {
            
            wardenGroundSlam(enemy);
            enemy.userData.lastGroundSlamTime = now;
        }
        
        // Summon minions ability
        if (now - enemy.userData.lastSummonTime >= enemy.userData.summonCooldown) {
            wardenSummonMinions(enemy);
            enemy.userData.lastSummonTime = now;
        }
    }
    // Phase 2: Phantom-like behavior
    else if (phase === 2) {
        // Stay at medium range
        const optimalRange = enemy.userData.attackRange * 0.7;
        
        if (!enemy.userData.phaseActive) {
            if (distanceToPlayer < optimalRange - 2) {
                // Too close, move away
                moveEnemy(enemy, directionToPlayer.clone().negate());
            } else if (distanceToPlayer > optimalRange + 2) {
                // Too far, move closer
                moveEnemy(enemy, directionToPlayer);
            }
            
            // Regular attack if in range and cooldown expired
            if (distanceToPlayer <= enemy.userData.attackRange &&
                now - enemy.userData.lastAttackTime >= enemy.userData.attackCooldown) {
                
                firePhantomProjectile(enemy, directionToPlayer);
                enemy.userData.lastAttackTime = now;
            }
        }
        
        // Teleport ability
        if (now - enemy.userData.lastTeleportTime >= enemy.userData.teleportCooldown) {
            phantomTeleportStrike(enemy);
            enemy.userData.lastTeleportTime = now;
        }
        
        // Clone ability
        if (now - enemy.userData.lastCloneTime >= enemy.userData.cloneCooldown &&
            enemy.userData.activeClones.length === 0) {
            
            phantomCreateClones(enemy);
            enemy.userData.lastCloneTime = now;
        }
        
        // Void zone ability
        if (now - enemy.userData.lastVoidZoneTime >= enemy.userData.voidZoneCooldown) {
            phantomCreateVoidZones(enemy);
            enemy.userData.lastVoidZoneTime = now;
        }
    }
    // Phase 3: Ultimate phase - all abilities plus ultimates
    else if (phase === 3) {
        // More aggressive movement - always approach player
        if (!enemy.userData.shieldActive && !enemy.userData.phaseActive && !enemy.userData.deathRayActive) {
            moveEnemy(enemy, directionToPlayer);
            
            // Regular attack if in range and cooldown expired
            if (distanceToPlayer <= enemy.userData.attackRange &&
                now - enemy.userData.lastAttackTime >= enemy.userData.attackCooldown) {
                
                attackPlayer(enemy); // Higher damage in phase 3
                enemy.userData.lastAttackTime = now;
            }
        }
        
        // Mix of abilities from both previous bosses
        
        // Shield wall (Warden)
        if (now - enemy.userData.lastShieldWallTime >= enemy.userData.shieldWallCooldown &&
            !enemy.userData.shieldActive) {
            
            activateWardenShield(enemy);
            enemy.userData.lastShieldWallTime = now;
        }
        
        // Ground slam (Warden)
        if (now - enemy.userData.lastGroundSlamTime >= enemy.userData.groundSlamCooldown &&
            distanceToPlayer < enemy.userData.groundSlamRange) {
            
            wardenGroundSlam(enemy);
            enemy.userData.lastGroundSlamTime = now;
        }
        
        // Teleport ability (Phantom)
        if (now - enemy.userData.lastTeleportTime >= enemy.userData.teleportCooldown) {
            phantomTeleportStrike(enemy);
            enemy.userData.lastTeleportTime = now;
        }
        
        // Ultimate abilities
        
        // Death Ray
        if (now - enemy.userData.lastDeathRayTime >= enemy.userData.deathRayCooldown &&
            !enemy.userData.deathRayActive) {
            
            megaBossDeathRay(enemy);
            enemy.userData.lastDeathRayTime = now;
        }
        
        // Meteor Strike
        if (now - enemy.userData.lastMeteorTime >= enemy.userData.meteorCooldown) {
            megaBossMeteorStrike(enemy);
            enemy.userData.lastMeteorTime = now;
        }
        
        // Reality Warp
        if (now - enemy.userData.lastRealityWarpTime >= enemy.userData.realityWarpCooldown &&
            !enemy.userData.realityWarpActive) {
            
            megaBossRealityWarp(enemy);
            enemy.userData.lastRealityWarpTime = now;
        }
    }
}

function addShieldToEnemy(enemy) {
    // Create shield mesh
    const shieldGeometry = new THREE.PlaneGeometry(
        enemy.geometry.parameters.width * 1.5,
        enemy.geometry.parameters.height * 1.2
    );
    
    const shieldMaterial = new THREE.MeshPhongMaterial({
        color: 0x0088ff,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    
    const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
    shield.position.set(0, 0, -enemy.geometry.parameters.depth * 0.6);
    
    // Add shield to enemy
    enemy.add(shield);
    enemy.userData.shieldMesh = shield;
}

function addHealAuraToEnemy(enemy) {
    // Create heal aura (ring on the ground)
    const auraGeometry = new THREE.RingGeometry(0.5, 0.8, 16);
    const auraMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff44,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    
    const aura = new THREE.Mesh(auraGeometry, auraMaterial);
    aura.rotation.x = -Math.PI / 2; // Lay flat on ground
    aura.position.y = -enemy.geometry.parameters.height / 2 + 0.1; // Just above ground
    
    enemy.add(aura);
    enemy.userData.healAura = aura;
    
    // Animate the aura
    animateHealAura(aura);
}

function animateHealAura(aura) {
    const startScale = aura.scale.clone();
    
    function pulse() {
        if (!aura.parent) return; // Stop if enemy is destroyed
        
        const time = performance.now() * 0.001;
        const scale = 1 + Math.sin(time * 2) * 0.2;
        
        aura.scale.set(
            startScale.x * scale,
            startScale.y * scale,
            startScale.z
        );
        
        requestAnimationFrame(pulse);
    }
    
    pulse();
}

function startPulsingAnimation(enemy) {
    const originalColor = enemy.material.color.clone();
    const pulseColor = new THREE.Color(0xffaa00);
    
    function pulse() {
        if (!enemy.parent) return; // Stop if enemy is destroyed
        
        const time = performance.now() * 0.001;
        const intensity = (Math.sin(time * enemy.userData.pulseRate) + 1) * 0.5; // 0 to 1
        
        // Interpolate between original and pulse color
        enemy.material.color.copy(originalColor).lerp(pulseColor, intensity);
        enemy.material.emissive.copy(new THREE.Color(0x000000)).lerp(new THREE.Color(0x330000), intensity);
        
        requestAnimationFrame(pulse);
    }
    
    pulse();
}

function applyEliteModifiers(enemy) {
    // Apply bonuses based on elite type
    switch(enemy.userData.eliteType) {
        case 'speed':
            enemy.userData.speed *= 1.3; // 30% faster
            enemy.userData.attackCooldown *= 0.8; // 20% faster attacks
            enemy.material.color.setHex(0x00ddff); // Cyan color
            break;
            
        case 'damage':
            enemy.userData.damage *= 1.5; // 50% more damage
            enemy.userData.attackRange *= 1.2; // 20% more range
            enemy.material.color.setHex(0xff3333); // Red color
            break;
            
        case 'health':
            enemy.userData.health *= 2; // Double health
            enemy.userData.maxHealth = enemy.userData.health;
            enemy.material.color.setHex(0x33ff33); // Green color
            break;
            
        case 'range':
            enemy.userData.attackRange *= 1.8; // 80% more range
            enemy.userData.projectileSpeed = 0.4; // Add projectile capability
            enemy.material.color.setHex(0xffcc00); // Gold color
            break;
    }
    
    // Add glow effect for all elites
    addGlowEffect(enemy, enemy.material.color.getHex());
    
    // Make elite bigger
    enemy.scale.multiplyScalar(1.2);
}

function addGlowEffect(enemy, color) {
    // Create a slightly larger wireframe mesh with emissive material
    const glowGeometry = new THREE.BoxGeometry(
        enemy.geometry.parameters.width * 1.1,
        enemy.geometry.parameters.height * 1.1,
        enemy.geometry.parameters.depth * 1.1
    );
    
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: color,
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    enemy.add(glow);
    
    // Animate the glow effect
    animateGlow(glow);
}

function animateGlow(glow) {
    function pulse() {
        if (!glow.parent) return; // Stop if enemy is destroyed
        
        const time = performance.now() * 0.001;
        const scale = 1 + Math.sin(time * 2) * 0.05;
        
        glow.scale.set(scale, scale, scale);
        glow.material.opacity = 0.2 + Math.sin(time * 3) * 0.1;
        
        requestAnimationFrame(pulse);
    }
    
    pulse();
}

function teleportEnemy(enemy) {
    // Calculate new position
    const angle = Math.random() * Math.PI * 2;
    const distance = enemy.userData.teleportDistance;
    
    const newPosition = new THREE.Vector3(
        player.position.x + Math.cos(angle) * distance,
        enemy.position.y,
        player.position.z + Math.sin(angle) * distance
    );
    
    // Create teleport effect at current position
    createTeleportEffect(enemy.position);
    
    // Move enemy to new position
    enemy.position.copy(newPosition);
    
    // Create teleport effect at new position
    createTeleportEffect(enemy.position);
}

function createTeleportEffect(position) {
    // Create particle burst
    const particles = [];
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const material = new THREE.MeshBasicMaterial({
            color: 0x8800ff,
            transparent: true,
            opacity: 0.8
        });
        
        const particle = new THREE.Mesh(geometry, material);
        particle.position.copy(position);
        
        // Random velocity
        particle.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.15,
                (Math.random() * 0.1) + 0.05,
                (Math.random() - 0.5) * 0.15
            ),
            lifetime: 500,
            spawnTime: performance.now()
        };
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Animate particles
    function animateParticles() {
        const now = performance.now();
        let allDone = true;
        
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            const elapsed = now - particle.userData.spawnTime;
            
            if (elapsed > particle.userData.lifetime) {
                scene.remove(particle);
                particles.splice(i, 1);
                continue;
            }
            
            // Still have active particles
            allDone = false;
            
            // Update position
            particle.position.add(particle.userData.velocity);
            
            // Fade out
            const progress = elapsed / particle.userData.lifetime;
            particle.material.opacity = 0.8 * (1 - progress);
        }
        
        if (!allDone) {
            requestAnimationFrame(animateParticles);
        }
    }
    
    // Start the animation
    requestAnimationFrame(animateParticles);
}       

// Elite enemy special abilities
function useEliteSpeedBurst(enemy) {
    // Store original speed
    const originalSpeed = enemy.userData.speed;
    
    // Double speed for 3 seconds
    enemy.userData.speed *= 2;
    
    // Visual effect - trail
    createTrailEffect(enemy);
    
    // Reset speed after duration
    setTimeout(() => {
        if (enemy.parent) { // Check if enemy still exists
            enemy.userData.speed = originalSpeed;
        }
    }, 3000);
}

function useEliteHeavyAttack(enemy, direction) {
    // Heavy attack that does more damage in an area
    const attackRadius = enemy.userData.attackRange * 1.5;
    const attackDamage = enemy.userData.damage * 2;
    
    // Check if player is in range
    const distanceToPlayer = enemy.position.distanceTo(player.position);
    
    if (distanceToPlayer <= attackRadius) {
        // Apply damage
        takeDamage(attackDamage);
        
        // Visual effect
        createShockwave(enemy.position, attackRadius);
    }
}

function useEliteHeal(enemy) {
    // Heal self
    const healAmount = enemy.userData.maxHealth * 0.3; // 30% of max health
    enemy.userData.health = Math.min(enemy.userData.health + healAmount, enemy.userData.maxHealth);
    
    // Heal nearby allies
    const healRadius = 10;
    
    for (const ally of activeEnemies) {
        // Skip self
        if (ally === enemy) continue;
        
        // Check if ally is in range
        const distanceToAlly = enemy.position.distanceTo(ally.position);
        
        if (distanceToAlly <= healRadius) {
            // Heal ally by 20% of their max health
            ally.userData.health = Math.min(
                ally.userData.health + ally.userData.maxHealth * 0.2,
                ally.userData.maxHealth
            );
            
            // Create healing particles between enemies
            createHealingBeam(enemy.position, ally.position);
        }
    }
    
    // Visual effect around elite
    createHealPulse(enemy);
}

function useEliteBarrage(enemy, direction) {
    // Fire multiple projectiles in a spread pattern
    const projectileCount = 5;
    const spreadAngle = Math.PI / 6; // 30 degrees spread
    
    // Center direction
    fireProjectile(enemy, direction);
    
    // Additional projectiles with spread
    for (let i = 1; i <= projectileCount / 2; i++) {
        // Calculate angles for spread
        const leftAngle = i * (spreadAngle / (projectileCount / 2));
        const rightAngle = -i * (spreadAngle / (projectileCount / 2));
        
        // Create rotated directions
        const leftDirection = direction.clone();
        const leftRotation = new THREE.Matrix4().makeRotationY(leftAngle);
        leftDirection.applyMatrix4(leftRotation);
        
        const rightDirection = direction.clone();
        const rightRotation = new THREE.Matrix4().makeRotationY(rightAngle);
        rightDirection.applyMatrix4(rightRotation);
        
        // Fire projectiles
        fireProjectile(enemy, leftDirection);
        fireProjectile(enemy, rightDirection);
    }
}

// Create trail effect for speeder enemies
function createTrailEffect(enemy) {
    // Create trail particles that follow the enemy
    const trailInterval = setInterval(() => {
        if (!enemy.parent) {
            // Enemy no longer exists, stop creating trail
            clearInterval(trailInterval);
            return;
        }
        
        // Create trail particle
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: enemy.material.color,
            transparent: true,
            opacity: 0.7
        });
        
        const particle = new THREE.Mesh(geometry, material);
        
        // Position at enemy location
        particle.position.copy(enemy.position);
        particle.position.y += 1; // Slightly above ground
        
        // Add metadata for animation
        particle.userData = {
            lifetime: 500,
            spawnTime: performance.now()
        };
        
        scene.add(particle);
        
        // Animate particle
        function animateTrailParticle() {
            const now = performance.now();
            const elapsed = now - particle.userData.spawnTime;
            
            if (elapsed > particle.userData.lifetime) {
                scene.remove(particle);
                return;
            }
            
            // Fade out
            const progress = elapsed / particle.userData.lifetime;
            particle.material.opacity = 0.7 * (1 - progress);
            particle.scale.multiplyScalar(0.98); // Shrink gradually
            
            requestAnimationFrame(animateTrailParticle);
        }
        
        animateTrailParticle();
        
    }, 50); // Create trail particles every 50ms
    
    // Store the interval ID for cleanup
    enemy.userData.trailInterval = trailInterval;
}

// Healer enemy functions
function healAlly(healer, ally) {
    // Apply healing
    const healAmount = healer.userData.healAmount;
    ally.userData.health = Math.min(ally.userData.health + healAmount, ally.userData.maxHealth);
    
    // Create healing beam visual
    createHealingBeam(healer.position, ally.position);
}

function createHealingBeam(source, target) {
    // Create a beam between healer and target
    const direction = new THREE.Vector3().subVectors(target, source);
    const distance = direction.length();
    direction.normalize();
    
    // Create beam geometry
    const beamGeometry = new THREE.CylinderGeometry(0.05, 0.05, distance, 8);
    const beamMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff44,
        transparent: true,
        opacity: 0.6
    });
    
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    
    // Position and orient beam
    beam.position.copy(source.clone().add(target).multiplyScalar(0.5));
    beam.position.y += 1; // Raise slightly above ground
    
    // Orient beam to connect the points
    beam.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction
    );
    
    // Add to scene
    scene.add(beam);
    
    // Animate and remove
    const startTime = performance.now();
    const duration = 500; // 0.5 second
    
    function animateBeam() {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
            scene.remove(beam);
            return;
        }
        
        // Pulse effect
        const pulse = 1 + 0.2 * Math.sin(progress * Math.PI * 6);
        beam.scale.x = beam.scale.z = pulse;
        
        // Fade out at the end
        if (progress > 0.7) {
            beam.material.opacity = 0.6 * (1 - (progress - 0.7) / 0.3);
        }
        
        requestAnimationFrame(animateBeam);
    }
    
    requestAnimationFrame(animateBeam);
}

function createHealPulse(enemy) {
    // Create ring pulse effect
    const ringGeometry = new THREE.RingGeometry(0.5, 0.8, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff44,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2; // Lay flat
    ring.position.copy(enemy.position);
    ring.position.y = 0.1; // Just above ground
    
    scene.add(ring);
    
    // Animate expanding ring
    const startTime = performance.now();
    const duration = 1000; // 1 second
    const maxRadius = 10;
    
    function animatePulse() {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
            scene.remove(ring);
            return;
        }
        
        // Expand ring
        const scale = 1 + progress * (maxRadius - 1);
        ring.scale.set(scale, scale, scale);
        
        // Fade out gradually
        ring.material.opacity = 0.7 * (1 - progress);
        
        requestAnimationFrame(animatePulse);
    }
    
    requestAnimationFrame(animatePulse);
}

// Warden Boss abilities
function activateWardenShield(boss) {
    boss.userData.shieldActive = true;
    
    // Create shield visual if it doesn't exist
    if (!boss.userData.shieldMesh) {
        const shieldGeometry = new THREE.SphereGeometry(
            Math.max(boss.geometry.parameters.width, boss.geometry.parameters.height) * 0.7,
            32, 32, 0, Math.PI * 2, 0, Math.PI
        );
        
        const shieldMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3300,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        
        const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
        boss.add(shield);
        boss.userData.shieldMesh = shield;
    } else {
        boss.userData.shieldMesh.visible = true;
    }
    
    // Create shield activation effect
    createShieldActivationEffect(boss);
    
    // Show notification
    showNotification("The Warden activates a protective shield!", 3000);
    
    // Deactivate shield after duration
    setTimeout(() => {
        if (boss.parent) { // Check if boss still exists
            boss.userData.shieldActive = false;
            if (boss.userData.shieldMesh) {
                boss.userData.shieldMesh.visible = false;
            }
            
            // Show notification
            showNotification("The Warden's shield has fallen!", 3000);
        }
    }, boss.userData.shieldWallDuration);
}

function wardenGroundSlam(boss) {
    // Create ground slam effect
    const slamRange = boss.userData.groundSlamRange;
    const slamDamage = boss.userData.groundSlamDamage;
    
    // Visual warning before slam
    createSlamWarning(boss.position, slamRange);
    
    // Delay actual slam effect
    setTimeout(() => {
        if (!boss.parent) return; // Boss no longer exists
        
        createShockwave(boss.position, slamRange);
        
        // Check if player is in range
        const distanceToPlayer = boss.position.distanceTo(player.position);
        
        if (distanceToPlayer <= slamRange) {
            takeDamage(slamDamage);
            
            // Add screen shake effect
            addScreenShake(0.5, 500);
        }
        
        // Show notification
        showNotification("Ground Slam!", 1500);
        
    }, 1500); // 1.5 second warning
}

function wardenSummonMinions(boss) {
    const minionCount = boss.userData.summonCount;
    
    // Create summon effect
    createSummonEffect(boss.position);
    
    // Show notification
    showNotification("The Warden summons reinforcements!", 3000);
    
    // Spawn minions over time
    for (let i = 0; i < minionCount; i++) {
        setTimeout(() => {
            if (!boss.parent) return; // Boss no longer exists
            
            // Spawn position near boss
            const angle = (i / minionCount) * Math.PI * 2;
            const spawnPos = new THREE.Vector3(
                boss.position.x + Math.cos(angle) * 5,
                boss.position.y,
                boss.position.z + Math.sin(angle) * 5
            );
            
            // Create teleport effect
            createTeleportEffect(spawnPos);
            
            // Randomly choose between normal and speeder enemies
            const enemyType = Math.random() > 0.5 ? 
                ENEMY_TYPES.NORMAL : ENEMY_TYPES.SPEEDER;
            
            // Create enemy at this position
            setTimeout(() => {
                const enemy = spawnEnemy(enemyType);
                enemy.position.copy(spawnPos);
            }, 500);
            
        }, i * 800); // Stagger spawns
    }
}

// Phantom Boss abilities
function phantomTeleportStrike(boss) {
    // Store original position for effect
    const originalPosition = boss.position.clone();
    
    // Calculate position behind player
    const playerDirection = new THREE.Vector3(0, 0, -1);
    camera.getWorldDirection(playerDirection);
    playerDirection.negate(); // Behind player
    
    const teleportDistance = 3; // Closer than normal teleport
    const targetPosition = player.position.clone().add(
        playerDirection.multiplyScalar(teleportDistance)
    );
    
    // Create teleport effect at original position
    createTeleportEffect(originalPosition);
    
    // Hide boss briefly
    boss.visible = false;
    
    // Teleport after a short delay
    setTimeout(() => {
        if (!boss.parent) return; // Boss no longer exists
        
        // Move boss to new position
        boss.position.copy(targetPosition);
        
        // Make boss visible again
        boss.visible = true;
        
        // Create teleport effect at new position
        createTeleportEffect(boss.position);
        
        // Strike immediately
        attackPlayer(boss);
        
        // Show notification
        showNotification("Teleport Strike!", 1500);
        
    }, 500); // 0.5 second delay
}

function phantomCreateClones(boss) {
    const cloneCount = boss.userData.cloneCount;
    boss.userData.activeClones = [];
    
    // Create teleport effect
    createTeleportEffect(boss.position);
    
    // Show notification
    showNotification("The Phantom creates shadow clones!", 3000);
    
    // Create clones
    for (let i = 0; i < cloneCount; i++) {
        // Calculate position in a circle around the boss
        const angle = (i / cloneCount) * Math.PI * 2;
        const distance = 8; // Distance from boss
        
        const clonePosition = new THREE.Vector3(
            boss.position.x + Math.cos(angle) * distance,
            boss.position.y,
            boss.position.z + Math.sin(angle) * distance
        );
        
        // Create clone with similar appearance but weaker
        const cloneGeometry = new THREE.BoxGeometry(
            boss.geometry.parameters.width * 0.9,
            boss.geometry.parameters.height * 0.9,
            boss.geometry.parameters.depth * 0.9
        );
        
        const cloneMaterial = new THREE.MeshPhongMaterial({
            color: boss.material.color,
            emissive: boss.material.emissive,
            transparent: true,
            opacity: 0.7
        });
        
        const clone = new THREE.Mesh(cloneGeometry, cloneMaterial);
        clone.position.copy(clonePosition);
        
        // Add clone metadata
        clone.userData = {
            isPhantomClone: true,
            health: boss.userData.health * 0.2, // Much weaker
            damage: boss.userData.damage * 0.5, // Half damage
            speed: boss.userData.speed * 1.2, // Slightly faster
            originalBoss: boss
        };
        
        // Add clone to scene
        scene.add(clone);
        createTeleportEffect(clonePosition);
        
        // Track clone
        boss.userData.activeClones.push(clone);
        
        // Make clone look at player
        clone.lookAt(player.position);
    }
    
    // Remove clones after duration
    setTimeout(() => {
        if (!boss.parent) return; // Boss no longer exists
        
        // Remove all remaining clones
        for (const clone of boss.userData.activeClones) {
            if (clone.parent) {
                createTeleportEffect(clone.position);
                scene.remove(clone);
            }
        }
        
        boss.userData.activeClones = [];
        
    }, boss.userData.cloneDuration);
}

function phantomCreateVoidZones(boss) {
    const zoneCount = boss.userData.voidZoneCount;
    const zoneDuration = boss.userData.voidZoneDuration;
    const zoneDamage = boss.userData.voidZoneDamage;
    
    // Show notification
    showNotification("Void Zones forming!", 3000);
    
    // Create void zones around the player
    for (let i = 0; i < zoneCount; i++) {
        // Calculate positions in a circle around the player
        const angle = (i / zoneCount) * Math.PI * 2;
        const distance = 8; // Distance from player
        
        const zonePosition = new THREE.Vector3(
            player.position.x + Math.cos(angle) * distance,
            0.1, // Just above ground
            player.position.z + Math.sin(angle) * distance
        );
        
        // Create void zone visual
        createVoidZone(zonePosition, zoneDamage, zoneDuration);
    }
}

function createVoidZone(position, damage, duration) {
    // Create void zone mesh
    const zoneGeometry = new THREE.CircleGeometry(5, 32);
    const zoneMaterial = new THREE.MeshBasicMaterial({
        color: 0x440088,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    
    const zone = new THREE.Mesh(zoneGeometry, zoneMaterial);
    zone.rotation.x = -Math.PI / 2; // Lay flat
    zone.position.copy(position);
    
    // Add zone metadata
    zone.userData = {
        isVoidZone: true,
        damage: damage,
        damageInterval: 500, // Damage every 0.5 seconds
        lastDamageTime: 0,
        createTime: performance.now(),
        duration: duration
    };
    
    scene.add(zone);
    
    // Create formation effect
    createVoidZoneFormation(position, zone);
    
    // Start damage check interval
    const damageInterval = setInterval(() => {
        if (!zone.parent) {
            clearInterval(damageInterval);
            return;
        }
        
        // Check if player is in the zone
        const distanceToPlayer = new THREE.Vector2(
            zone.position.x, zone.position.z
        ).distanceTo(new THREE.Vector2(
            player.position.x, player.position.z
        ));
        
        if (distanceToPlayer <= 5) { // Zone radius
            takeDamage(zone.userData.damage);
            createVoidDamageEffect(player.position);
        }
        
    }, zone.userData.damageInterval);
    
    // Remove zone after duration
    setTimeout(() => {
        if (zone.parent) {
            clearInterval(damageInterval);
            fadeOutAndRemove(zone);
        }
    }, duration);
    
    return zone;
}

function firePhantomProjectile(boss, direction) {
    // Create phantom projectile with different appearance
    const projectileGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const projectileMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x8800cc,
        transparent: true,
        opacity: 0.7
    });
    
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    
    // Position the projectile at the boss
    projectile.position.copy(boss.position);
    projectile.position.y = boss.position.y + boss.geometry.parameters.height * 0.6;
    
    // Store projectile metadata
    projectile.userData = {
        direction: direction.clone(),
        speed: 0.5, // Faster than normal projectiles
        damage: boss.userData.damage,
        lifetime: 10000, // 10 seconds lifetime
        spawnTime: performance.now(),
        
        // Additional properties for phantom projectiles
        isPhantomProjectile: true,
        pulsateSpeed: 0.1 + Math.random() * 0.1
    };
    
    // Add glow effect to projectile
    const glowGeometry = new THREE.SphereGeometry(0.6, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x8800cc,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    projectile.add(glow);
    
    // Start pulsing animation
    animatePhantomProjectile(projectile);
    
    // Add projectile to scene and tracking array
    scene.add(projectile);
    projectiles.push(projectile);
}

function animatePhantomProjectile(projectile) {
    const startTime = performance.now();
    
    function animate() {
        if (!projectile.parent) return; // Projectile was removed
        
        const now = performance.now();
        const elapsed = now - startTime;
        
        // Pulsing size effect
        const scale = 1 + 0.3 * Math.sin(elapsed * projectile.userData.pulsateSpeed);
        projectile.scale.set(scale, scale, scale);
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

function phantomPhaseShift(boss) {
    boss.userData.phaseActive = true;
    
    // Visual effect - change material to more transparent
    const originalOpacity = boss.material.opacity;
    boss.material.opacity = 0.3;
    
    // Add glowing effect
    addGlowEffect(boss, 0x8800cc);
    
    // Show notification
    showNotification("The Phantom shifts between dimensions!", 3000);
    
    // End phase shift after duration
    setTimeout(() => {
        if (!boss.parent) return; // Boss no longer exists
        
        boss.userData.phaseActive = false;
        boss.material.opacity = originalOpacity;
        
        // Show notification
        showNotification("The Phantom has fully materialized again!", 3000);
        
    }, boss.userData.phaseDuration);
}

// Mega Boss abilities
function checkMegaBossPhaseTransition(boss) {
    const healthPercentage = boss.userData.health / boss.userData.maxHealth;
    const currentPhase = boss.userData.currentPhase;
    
    // Phase transitions at 66% and 33% health
    if (healthPercentage <= boss.userData.phaseThresholds[0] && currentPhase === 1) {
        // Transition to Phase 2
        boss.userData.currentPhase = 2;
        megaBossPhaseTransition(boss, 2);
    }
    else if (healthPercentage <= boss.userData.phaseThresholds[1] && currentPhase === 2) {
        // Transition to Phase 3
        boss.userData.currentPhase = 3;
        megaBossPhaseTransition(boss, 3);
    }
}

function megaBossPhaseTransition(boss, newPhase) {
    // Create phase transition effect
    createPhaseTransitionEffect(boss);
    
    // Update boss appearance
    boss.material.color.setHex(boss.userData.phaseColors[newPhase - 1]);
    
    // Show notification
    showNotification(`THE OVERLORD ENTERS PHASE ${newPhase}!`, 5000);
    
    // Add screen shake
    addScreenShake(1.0, 1000);
    
    // Phase-specific changes
    switch(newPhase) {
        case 2:
            // Speed increase
            boss.userData.speed *= 1.2;
            break;
            
        case 3:
            // Speed increase
            boss.userData.speed *= 1.3;
            // Damage increase
            boss.userData.damage *= 1.5;
            break;
    }
}

function megaBossDeathRay(boss) {
    boss.userData.deathRayActive = true;
    
    // Create charging effect first
    createDeathRayChargingEffect(boss);
    
    // Show warning notification
    showNotification("THE OVERLORD IS CHARGING A DEATH RAY!", 3000);
    
    // After charging, fire the ray
    setTimeout(() => {
        if (!boss.parent) return; // Boss no longer exists
        
        // Create death ray effect
        createDeathRayBeam(boss);
        
        // Show notification
        showNotification("DEATH RAY FIRED!", 2000);
        
        // Apply damage in a line
        applyDeathRayDamage(boss);
        
        // End death ray after duration
        setTimeout(() => {
            if (boss.parent) {
                boss.userData.deathRayActive = false;
            }
        }, boss.userData.deathRayDuration);
        
    }, 2000); // 2 second charge time
}

function megaBossMeteorStrike(boss) {
    // Show notification
    showNotification("METEOR STRIKE INCOMING!", 3000);
    
    // Calculate positions around player
    const meteorCount = boss.userData.meteorCount;
    const meteorDamage = boss.userData.meteorDamage;
    const radius = 20; // Area of effect
    
    // Create meteor warning indicators first
    const targetPositions = [];
    
    for (let i = 0; i < meteorCount; i++) {
        // Random position within radius of player
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * radius;
        
        const targetPos = new THREE.Vector3(
            player.position.x + Math.cos(angle) * distance,
            0,
            player.position.z + Math.sin(angle) * distance
        );
        
        targetPositions.push(targetPos);
        
        // Create warning indicator
        createMeteorWarning(targetPos);
    }
    
    // After delay, create actual meteors
    setTimeout(() => {
        targetPositions.forEach((pos, i) => {
            // Stagger meteor impacts slightly
            setTimeout(() => {
                createMeteorImpact(pos, meteorDamage);
            }, i * 200);
        });
    }, 2000); // 2 second warning
}

function megaBossRealityWarp(boss) {
    boss.userData.realityWarpActive = true;
    
    // Show notification
    showNotification("REALITY DISTORTION FIELD ACTIVATED!", 5000);
    
    // Visual effects for reality warp
    createRealityWarpEffect();
    
    // Apply warp effects to player movement
    applyRealityWarpEffects();
    
    // End reality warp after duration
    setTimeout(() => {
        if (boss.parent) {
            boss.userData.realityWarpActive = false;
            
            // Reset any applied effects
            resetRealityWarpEffects();
            
            // Show notification
            showNotification("Reality stabilizing...", 3000);
        }
    }, boss.userData.realityWarpDuration);
}

// Special effect functions
function createBossEntranceEffect(boss) {
    // Create lightning strikes around the boss
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            if (!boss.parent) return;
            
            // Calculate random position near boss
            const angle = Math.random() * Math.PI * 2;
            const distance = 3 + Math.random() * 7;
            
            const strikePos = new THREE.Vector3(
                boss.position.x + Math.cos(angle) * distance,
                0,
                boss.position.z + Math.sin(angle) * distance
            );
            
            // Create lightning effect
            createLightningStrike(strikePos, 10);
            
        }, i * 300); // Stagger lightning strikes
    }
    
    // Create shockwave
    setTimeout(() => {
        if (!boss.parent) return;
        
        createShockwave(boss.position, 15);
        addScreenShake(0.7, 1000);
        
    }, 1500);
}

function createExplosion(position, radius, damage) {
    // Create explosion mesh
    const explosionGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const explosionMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.8
    });
    
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosion.position.copy(position);
    scene.add(explosion);
    
    // Animate explosion
    const duration = 500; // 0.5 seconds
    const startTime = performance.now();
    
    // Create light for explosion
    const light = new THREE.PointLight(0xff6600, 2, radius * 2);
    light.position.copy(position);
    scene.add(light);
    
    // Add screen shake
    addScreenShake(0.5, 500);
    
    // Check if player is in explosion radius
    const distanceToPlayer = position.distanceTo(player.position);
    if (distanceToPlayer <= radius) {
        // Calculate damage based on distance (more damage closer to center)
        const damageFactor = 1 - (distanceToPlayer / radius);
        const actualDamage = Math.max(1, Math.round(damage * damageFactor));
        takeDamage(actualDamage);
    }
    
    function animateExplosion() {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Expand explosion
        const currentRadius = radius * progress;
        explosion.scale.set(currentRadius, currentRadius, currentRadius);
        
        // Fade out explosion and light
        explosion.material.opacity = 0.8 * (1 - progress);
        light.intensity = 2 * (1 - progress);
        
        if (progress < 1) {
            requestAnimationFrame(animateExplosion);
        } else {
            // Remove explosion and light
            scene.remove(explosion);
            scene.remove(light);
        }
    }
    
    animateExplosion();
}

// Helper functions for visual effects
function addScreenShake(intensity, duration) {
    // Store original camera position
    const originalPosition = camera.position.clone();
    
    // Start time
    const startTime = performance.now();
    
    // Animation function
    function shakeCamera() {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = elapsed / duration;
        
        if (progress < 1) {
            // Calculate shake amount (reduces over time)
            const shakeAmount = intensity * (1 - progress);
            
            // Apply random offset to camera
            camera.position.set(
                originalPosition.x + (Math.random() - 0.5) * shakeAmount,
                originalPosition.y + (Math.random() - 0.5) * shakeAmount,
                originalPosition.z + (Math.random() - 0.5) * shakeAmount
            );
            
            requestAnimationFrame(shakeCamera);
        } else {
            // Reset to original position
            camera.position.copy(originalPosition);
        }
    }
    
    requestAnimationFrame(shakeCamera);
}

function createShockwave(position, radius) {
    // Create ring mesh
    const waveGeometry = new THREE.RingGeometry(0.1, 0.5, 32);
    const waveMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    
    const wave = new THREE.Mesh(waveGeometry, waveMaterial);
    wave.position.copy(position);
    wave.position.y = 0.1; // Just above ground
    wave.rotation.x = -Math.PI / 2; // Lay flat
    
    scene.add(wave);
    
    // Animate shockwave
    const duration = 1000; // 1 second
    const startTime = performance.now();
    
    function animateWave() {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Scale wave based on progress
        const currentRadius = radius * progress;
        wave.scale.set(currentRadius, currentRadius, 1);
        
        // Fade out as it expands
        wave.material.opacity = 0.7 * (1 - progress);
        
        if (progress < 1) {
            requestAnimationFrame(animateWave);
        } else {
            scene.remove(wave);
        }
    }
    
    requestAnimationFrame(animateWave);
}

function createLightningStrike(position, height) {
    // Create lightning mesh (line segments for jagged effect)
    const points = [];
    const segments = 10;
    
    // Generate jagged line points
    for (let i = 0; i <= segments; i++) {
        const y = height * (i / segments);
        const xOffset = (i === 0 || i === segments) ? 0 : (Math.random() - 0.5) * 2;
        const zOffset = (i === 0 || i === segments) ? 0 : (Math.random() - 0.5) * 2;
        
        points.push(new THREE.Vector3(xOffset, y, zOffset));
    }
    
    // Create lightning geometry
    const lightningGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lightningMaterial = new THREE.LineBasicMaterial({
        color: 0xaaccff,
        linewidth: 3
    });
    
    const lightning = new THREE.Line(lightningGeometry, lightningMaterial);
    lightning.position.copy(position);
    
    scene.add(lightning);
    
    // Create light flash
    const light = new THREE.PointLight(0xaaccff, 2, 20);
    light.position.copy(position);
    light.position.y = height / 2;
    scene.add(light);
    
    // Animate lightning
    const duration = 300; // 0.3 seconds
    const startTime = performance.now();
    
    function animateLightning() {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = elapsed / duration;
        
        if (progress < 1) {
            // Flash light intensity
            light.intensity = 2 * (1 - progress);
            
            requestAnimationFrame(animateLightning);
        } else {
            scene.remove(lightning);
            scene.remove(light);
        }
    }
    
    requestAnimationFrame(animateLightning);
}

// Additional helper functions that might be needed
function fadeOutAndRemove(object) {
    const duration = 500; // 0.5 seconds
    const startTime = performance.now();
    const startOpacity = object.material.opacity;
    
    function animate() {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        if (progress < 1) {
            // Fade out
            object.material.opacity = startOpacity * (1 - progress);
            requestAnimationFrame(animate);
        } else {
            // Remove object
            if (object.parent) {
                scene.remove(object);
            }
        }
    }
    
    requestAnimationFrame(animate);
}

// Function to create a summoning visual effect
function createSummonEffect(position) {
    // Create a ring pulse effect for the summon
    const ringGeometry = new THREE.RingGeometry(0.5, 1, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.copy(position);
    ring.position.y = 0.1; // Just above ground
    ring.rotation.x = -Math.PI / 2; // Lay flat on ground
    
    scene.add(ring);
    
    // Create vertical energy beam
    const beamGeometry = new THREE.CylinderGeometry(0.5, 0.5, 15, 16);
    const beamMaterial = new THREE.MeshBasicMaterial({
        color: 0xff5500,
        transparent: true,
        opacity: 0.6
    });
    
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.copy(position);
    beam.position.y += 7.5; // Position beam above ground
    
    scene.add(beam);
    
    // Add pulsing light
    const light = new THREE.PointLight(0xff3300, 2, 10);
    light.position.copy(position);
    light.position.y += 1;
    scene.add(light);
    
    // Animate the summon effect
    const duration = 2000; // 2 seconds
    const startTime = performance.now();
    
    function animateSummonEffect() {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Expand ring
        const ringScale = 1 + progress * 8;
        ring.scale.set(ringScale, ringScale, 1);
        
        // Fade out ring and beam as they expand
        ring.material.opacity = 0.8 * (1 - progress);
        beam.material.opacity = 0.6 * (1 - progress);
        
        // Pulse light intensity
        light.intensity = 2 * (1 - progress) * (0.7 + 0.3 * Math.sin(progress * Math.PI * 8));
        
        if (progress < 1) {
            requestAnimationFrame(animateSummonEffect);
        } else {
            // Remove objects when animation is complete
            scene.remove(ring);
            scene.remove(beam);
            scene.remove(light);
        }
    }
    
    requestAnimationFrame(animateSummonEffect);
}

// Function to create the Warden Boss (Round 10)
function spawnWardenBoss(config) {
    // Create base mesh
    const geometry = new THREE.BoxGeometry(
        config.size.width,
        config.size.height,
        config.size.depth
    );
    
    const material = new THREE.MeshPhongMaterial({ 
        color: config.color,
        emissive: 0x330000,
        shininess: 30,
    });
    
    const boss = new THREE.Mesh(geometry, material);
    
    // Position boss at center of map, but further back
    // UPDATED spawn radius to match expanded map
    const spawnRadius = 100; // Increased from 60
    const angle = Math.random() * Math.PI * 2;
    boss.position.x = Math.cos(angle) * spawnRadius;
    boss.position.z = Math.sin(angle) * spawnRadius;
    boss.position.y = config.size.height / 2;
    
    // Add boss metadata
    boss.userData = {
        type: ENEMY_TYPES.WARDEN_BOSS,
        health: config.health,
        maxHealth: config.health,
        speed: config.speed,
        damage: config.damage,
        attackRange: config.attackRange,
        lastAttackTime: 0,
        attackCooldown: config.attackCooldown,
        
        // Shield wall ability
        shieldWallCooldown: config.shieldWallCooldown,
        shieldWallDuration: config.shieldWallDuration,
        lastShieldWallTime: 0,
        shieldActive: false,
        shieldMesh: null,
        
        // Ground slam ability
        groundSlamCooldown: config.groundSlamCooldown,
        groundSlamRange: config.groundSlamRange,
        groundSlamDamage: config.groundSlamDamage,
        lastGroundSlamTime: 0,
        
        // Summon ability
        summonCooldown: config.summonCooldown,
        summonCount: config.summonCount,
        lastSummonTime: 0
    };
    
    // Add boss to scene and tracking arrays
    scene.add(boss);
    enemies.push(boss);
    activeEnemies.push(boss);
    
    // Show boss introduction message
    showNotification("The Warden has appeared!", 5000);
    
    return boss;
}

// Function to create the Phantom Boss (Round 15)
function spawnPhantomBoss(config) {
    // Create base mesh with more ethereal/translucent appearance
    const geometry = new THREE.BoxGeometry(
        config.size.width,
        config.size.height,
        config.size.depth
    );
    
    const material = new THREE.MeshPhongMaterial({ 
        color: config.color,
        emissive: 0x220033,
        transparent: true,
        opacity: 0.8,
        shininess: 50
    });
    
    const boss = new THREE.Mesh(geometry, material);
    
    // Position boss
    const spawnRadius = 90;
    const angle = Math.random() * Math.PI * 2;
    boss.position.x = Math.cos(angle) * spawnRadius;
    boss.position.z = Math.sin(angle) * spawnRadius;
    boss.position.y = config.size.height / 2;
    
    // Add boss metadata
    boss.userData = {
        type: ENEMY_TYPES.PHANTOM_BOSS,
        health: config.health,
        maxHealth: config.health,
        speed: config.speed,
        damage: config.damage,
        attackRange: config.attackRange,
        lastAttackTime: 0,
        attackCooldown: config.attackCooldown,
        
        // Teleport ability
        teleportCooldown: config.teleportCooldown,
        teleportRange: config.teleportRange,
        lastTeleportTime: 0,
        
        // Clone ability
        cloneCooldown: config.cloneCooldown,
        cloneCount: config.cloneCount,
        cloneDuration: config.cloneDuration,
        lastCloneTime: 0,
        activeClones: [],
        
        // Void zone ability
        voidZoneCooldown: config.voidZoneCooldown,
        voidZoneCount: config.voidZoneCount,
        voidZoneDuration: config.voidZoneDuration,
        voidZoneDamage: config.voidZoneDamage,
        lastVoidZoneTime: 0,
        activeVoidZones: [],
        
        // Phase shift ability
        phaseShiftCooldown: config.phaseShiftCooldown,
        phaseDuration: config.phaseDuration,
        lastPhaseShiftTime: 0,
        phaseActive: false
    };
    
    // Add purple glow effect
    addGlowEffect(boss, 0x8800cc);
    
    // Add boss to scene and tracking arrays
    scene.add(boss);
    enemies.push(boss);
    activeEnemies.push(boss);
    
    // Show boss introduction message
    showNotification("The Phantom has manifested!", 5000);
    
    return boss;
}

// Function to create the Mega Boss (Round 20)
function spawnMegaBoss(config) {
    // Create base mesh with imposing appearance
    const geometry = new THREE.BoxGeometry(
        config.size.width,
        config.size.height,
        config.size.depth
    );
    
    // Initial phase 1 material (similar to Warden boss)
    const material = new THREE.MeshPhongMaterial({ 
        color: 0x880000, // Start with Warden colors
        emissive: 0x330000,
        shininess: 40
    });
    
    const boss = new THREE.Mesh(geometry, material);
    
    // Position boss in center of the map
    boss.position.set(0, config.size.height / 2, 0);
    
    // Add boss metadata including all abilities
    boss.userData = {
        type: ENEMY_TYPES.MEGA_BOSS,
        health: config.health,
        maxHealth: config.health,
        speed: config.speed,
        damage: config.damage,
        attackRange: config.attackRange,
        lastAttackTime: 0,
        attackCooldown: config.attackCooldown,
        
        // Phase tracking
        currentPhase: 1,
        phaseThresholds: config.phaseThresholds,
        phaseColors: [0x880000, 0x8800cc, 0xcc0088], // Color for each phase
        
        // Phase 1: Warden abilities
        shieldWallCooldown: config.shieldWallCooldown,
        shieldWallDuration: config.shieldWallDuration,
        lastShieldWallTime: 0,
        shieldActive: false,
        shieldMesh: null,
        
        groundSlamCooldown: config.groundSlamCooldown,
        groundSlamRange: config.groundSlamRange,
        groundSlamDamage: config.groundSlamDamage,
        lastGroundSlamTime: 0,
        
        summonCooldown: config.summonCooldown,
        summonCount: config.summonCount,
        lastSummonTime: 0,
        
        // Phase 2: Phantom abilities
        teleportCooldown: config.teleportCooldown,
        teleportRange: config.teleportRange,
        lastTeleportTime: 0,
        
        cloneCooldown: config.cloneCooldown,
        cloneCount: config.cloneCount,
        cloneDuration: config.cloneDuration,
        lastCloneTime: 0,
        activeClones: [],
        
        voidZoneCooldown: config.voidZoneCooldown,
        voidZoneCount: config.voidZoneCount,
        voidZoneDuration: config.voidZoneDuration,
        voidZoneDamage: config.voidZoneDamage,
        lastVoidZoneTime: 0,
        activeVoidZones: [],
        
        // Phase 3: Ultimate abilities
        deathRayCooldown: config.deathRayCooldown,
        deathRayDamage: config.deathRayDamage,
        deathRayDuration: config.deathRayDuration,
        lastDeathRayTime: 0,
        deathRayActive: false,
        
        meteorCooldown: config.meteorCooldown,
        meteorCount: config.meteorCount,
        meteorDamage: config.meteorDamage,
        lastMeteorTime: 0,
        
        realityWarpCooldown: config.realityWarpCooldown,
        realityWarpDuration: config.realityWarpDuration,
        lastRealityWarpTime: 0,
        realityWarpActive: false
    };
    
    // Add initial glow effect matching phase 1
    addGlowEffect(boss, 0x880000);
    
    // Add boss to scene and tracking arrays
    scene.add(boss);
    enemies.push(boss);
    activeEnemies.push(boss);
    
    // Create a dramatic entrance effect
    createBossEntranceEffect(boss);
    
    // Show boss introduction message
    showNotification("THE OVERLORD HAS ARRIVED!", 6000);
    
    return boss;
}

// Function to move enemy
function moveEnemy(enemy, direction, overrideSpeed) {
    const speed = overrideSpeed || enemy.userData.speed;
    
    // Store original position for collision detection
    const originalPosition = enemy.position.clone();
    
    // Move in the specified direction
    const movement = direction.clone().multiplyScalar(speed);
    
    // Try direct movement
    const newPosition = originalPosition.clone().add(movement);
    
    // NEW: Check if new position would put enemy inside an obstacle
    if (!isPositionInsideObstacle(newPosition, enemy.geometry.parameters.width/2)) {
        // Safe to move directly
        enemy.position.copy(newPosition);
        // Reset stuck counter on successful movement
        enemy.userData.stuckCounter = 0;
    } else {
        // NEW: Try alternative directions to navigate around obstacle
        // Try left, right, and various angles until we find a valid path
        const alternateDirections = [
            // 45 degrees left
            new THREE.Vector3().copy(direction).applyAxisAngle(new THREE.Vector3(0,1,0), Math.PI/4).normalize(),
            // 45 degrees right
            new THREE.Vector3().copy(direction).applyAxisAngle(new THREE.Vector3(0,1,0), -Math.PI/4).normalize(),
            // 90 degrees left
            new THREE.Vector3().copy(direction).applyAxisAngle(new THREE.Vector3(0,1,0), Math.PI/2).normalize(),
            // 90 degrees right
            new THREE.Vector3().copy(direction).applyAxisAngle(new THREE.Vector3(0,1,0), -Math.PI/2).normalize()
        ];
        
        let foundValidPath = false;
        
        for (const altDirection of alternateDirections) {
            const altMovement = altDirection.clone().multiplyScalar(speed);
            const altPosition = originalPosition.clone().add(altMovement);
            
            if (!isPositionInsideObstacle(altPosition, enemy.geometry.parameters.width/2)) {
                // Found a valid path, take it
                enemy.position.copy(altPosition);
                foundValidPath = true;
                
                // Reset stuck counter on successful movement
                enemy.userData.stuckCounter = 0;
                break;
            }
        }
        
        // If we still couldn't find a valid path, detect if enemy is stuck
        if (!foundValidPath) {
            enemy.userData.stuckCounter = (enemy.userData.stuckCounter || 0) + 1;
            
            // If enemy has been stuck for multiple frames, try more drastic measures
            if (enemy.userData.stuckCounter > 30) { // After ~1 second of being stuck
                // Try teleporting slightly away from current position toward player
                const toPlayer = new THREE.Vector3().subVectors(player.position, enemy.position).normalize();
                
                // Try moving outward and ahead
                const jumpDistance = 3 + (enemy.userData.stuckCounter > 60 ? 3 : 0); // Jump further if really stuck
                const jumpPosition = enemy.position.clone().add(toPlayer.multiplyScalar(jumpDistance));
                
                // Final safety check on jump position
                if (!isPositionInsideObstacle(jumpPosition, enemy.geometry.parameters.width/2)) {
                    enemy.position.copy(jumpPosition);
                    enemy.userData.stuckCounter = 0;
                }
            }
        }
    }
    
    // Update last position for future stuck detection
    enemy.userData.lastPosition = enemy.position.clone();
    
    // Keep enemies at ground level
    enemy.position.y = enemy.geometry.parameters.height / 2;
}

// Function to add road surface beneath the gas station in createAbandonedGasStation
function addGasStationRoadArea(parent) {
    // Create a road surface that matches the main road but sized for the gas station
    const stationRoadGeometry = new THREE.PlaneGeometry(40, 30); // Width, depth for the gas station area
    const stationRoadMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333, // Same dark gray as the main road
        roughness: 0.8,
        metalness: 0.2
    });
    
    const stationRoad = new THREE.Mesh(stationRoadGeometry, stationRoadMaterial);
    stationRoad.rotation.x = -Math.PI / 2; // Lay flat like the floor
    stationRoad.position.y = 0.06; // Slightly above ground to prevent z-fighting
    stationRoad.position.z = 0; // Center with the gas station
    stationRoad.position.x = 0; // Center with the gas station
    
    // Add cracks and details to match the main road
    addStationRoadDetails(stationRoad);
    
    parent.add(stationRoad);
    return stationRoad;
}

// Function to add details to the gas station road surface
function addStationRoadDetails(roadSurface) {
    // Add a few cracks
    for (let i = 0; i < 4; i++) {
        const crackLength = 1 + Math.random() * 3;
        const crackWidth = 0.1 + Math.random() * 0.1;
        
        const crackGeometry = new THREE.BoxGeometry(crackLength, 0.02, crackWidth);
        const crackMaterial = new THREE.MeshBasicMaterial({
            color: 0x111111,
            transparent: false
        });
        
        const crack = new THREE.Mesh(crackGeometry, crackMaterial);
        
        // Position and rotation on the surface
        crack.position.set(
            (Math.random() - 0.5) * 15,
            0.01, // Just above the road surface
            (Math.random() - 0.5) * 25
        );
        crack.rotation.y = Math.random() * Math.PI;
        
        roadSurface.add(crack);
    }
    
    // Add oil stains
    for (let i = 0; i < 3; i++) {
        const stainRadius = 0.5 + Math.random() * 1;
        const stainGeometry = new THREE.CircleGeometry(stainRadius, 16);
        const stainMaterial = new THREE.MeshBasicMaterial({
            color: 0x111111,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        
        const stain = new THREE.Mesh(stainGeometry, stainMaterial);
        stain.rotation.x = -Math.PI / 2; // Lay flat
        stain.position.set(
            (Math.random() - 0.5) * 12,
            0.01, // Just above the road surface
            (Math.random() - 0.5) * 20
        );
        
        roadSurface.add(stain);
    }
}

// Update the createAbandonedGasStation function to add the road surface first
function createAbandonedGasStation() {
    // Create a group to hold all gas station elements
    const gasStationGroup = new THREE.Group();
    gasStationGroup.userData.isGasStation = true;
    
    // Position in the middle of the road
    gasStationGroup.position.set(-15, 0, 20); // Center of the map, can be adjusted
    gasStationGroup.rotation.y = Math.PI; // Rotate to face the road

    // Initialize collision elements array BEFORE creating components
    gasStationGroup.userData.collisionElements = [];
    
    // Add the road surface beneath the gas station
    addGasStationRoadArea(gasStationGroup);

    // 1. Main building
    createMainBuilding(gasStationGroup);
    
    // 2. Gas pumps
    createGasPumps(gasStationGroup);
    
    // 3. Canopy (roof over pumps)
    createCanopy(gasStationGroup);
    
    // 4. Add debris and destruction details
    addDebrisAndDetails(gasStationGroup);
    
    // 5. Add some lighting effects (broken flickering light)
    addBrokenLighting(gasStationGroup);
    
    gasStationGroup.traverse(function(node) {
        if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
        }
    });

    // Add to scene
    scene.add(gasStationGroup);
    
    // Return the group for any further manipulations
    return gasStationGroup;
}

// Create the main building of the gas station
function createMainBuilding(parent) {
    // Main building structure
    const buildingWidth = 12;
    const buildingDepth = 8;
    const buildingHeight = 4;
    
    const buildingGeometry = new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth);
    const buildingMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.8,
        metalness: 0.2
    });
    
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.set(-8, buildingHeight/2, 0); // Positioned beside the road
    
    // Add shadows to building
    building.castShadow = true;
    building.receiveShadow = true;
    
    parent.add(building);
    
    // Store collision data
    parent.userData.collisionElements.push({
        type: 'box',
        width: buildingWidth,
        height: buildingHeight,
        depth: buildingDepth,
        position: building.position.clone(),
        mesh: building
    });
    
    // Add broken windows
    createBrokenWindows(building, buildingWidth, buildingHeight, buildingDepth);
    
    // Add door
    createDoor(building, buildingWidth, buildingHeight, buildingDepth);
    
    // Add sign on top
    createStationSign(building, buildingWidth, buildingHeight, buildingDepth);
    
    return building;
}

// Create broken windows for the building
function createBrokenWindows(building, width, height, depth) {
    // Front windows (broken)
    const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        roughness: 0.1,
        metalness: 0.8,
        transparent: true,
        opacity: 0.5
    });
    
    // Create several broken window frames
    for (let i = 0; i < 3; i++) {
        const windowWidth = 1.5;
        const windowHeight = 1.2;
        const windowGeometry = new THREE.PlaneGeometry(windowWidth, windowHeight);
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        
        // Position along front face with spacing
        window.position.set(
            0,
            0,
            depth/2 + 0.01 // Slightly in front of the wall
        );
        
        // Vary the x-position for each window
        window.position.x = -width/2 + 2 + i * 3;
        window.position.y = 0.2;
        
        building.add(window);
        
        // Add broken glass shards
        createBrokenGlass(building, window.position.clone());
    }
}

// Create shattered glass pieces
function createBrokenGlass(parent, position) {
    const shardCount = 5 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < shardCount; i++) {
        // Create triangular or irregular glass shards
        const shardGeometry = new THREE.ConeGeometry(0.2, 0.4, 3);
        const shardMaterial = new THREE.MeshStandardMaterial({
            color: 0xaaddff,
            transparent: true,
            opacity: 0.3,
            roughness: 0.1,
            metalness: 0.9
        });
        
        const shard = new THREE.Mesh(shardGeometry, shardMaterial);
        
        // Position around the window
        shard.position.copy(position);
        shard.position.y -= 1.5 + Math.random() * 0.5; // On the ground
        shard.position.x += (Math.random() - 0.5) * 1.5;
        shard.position.z += 0.5 + Math.random() * 0.5; // In front of the window
        
        // Random rotation
        shard.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        parent.add(shard);
    }
}

// Create door for the building
function createDoor(building, width, height, depth) {
    const doorWidth = 1.8;
    const doorHeight = 2.2;
    
    // Door frame
    const doorFrameGeometry = new THREE.BoxGeometry(doorWidth + 0.2, doorHeight + 0.2, 0.2);
    const doorFrameMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const doorFrame = new THREE.Mesh(doorFrameGeometry, doorFrameMaterial);
    doorFrame.position.set(width/2 - 3, -height/2 + doorHeight/2, depth/2 + 0.01);
    building.add(doorFrame);
    
    // Door (hanging off hinges)
    const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, 0.1);
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 0, 0.1);
    // Rotate door to look broken/open
    door.rotation.y = Math.PI / 4;
    door.rotation.x = Math.PI / 60;
    doorFrame.add(door);
}

// Create gas station sign on top of the building
function createStationSign(building, width, height, depth) {
    const signWidth = width * 0.8;
    const signHeight = 2;
    const signDepth = 0.5;
    
    // Sign base
    const signGeometry = new THREE.BoxGeometry(signWidth, signHeight, signDepth);
    const signMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x990000,  // Faded red
        roughness: 0.7
    });
    
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(0, height/2 + signHeight/2 + 0.1, 0);
    building.add(sign);
    
    // Add text "GAS" to the sign
    const textMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffdd, 
        roughness: 0.4,
        metalness: 0.5,
        emissive: 0x111100
    });

    // Create simple text using boxes
    createLetterG(sign, textMaterial);
    createLetterA(sign, textMaterial);
    createLetterS(sign, textMaterial);
}

// Helper functions to create letters for the sign
function createLetterG(parent, material) {
    const thickness = 0.15;
    const width = 0.8;
    const height = 1;
    
    const group = new THREE.Group();
    
    // Vertical line
    const v1 = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, height, thickness),
        material
    );
    v1.position.set(-width/2, 0, 0.3);
    group.add(v1);
    
    // Top horizontal
    const h1 = new THREE.Mesh(
        new THREE.BoxGeometry(width, thickness, thickness),
        material
    );
    h1.position.set(0, height/2, 0.3);
    group.add(h1);
    
    // Bottom horizontal
    const h2 = new THREE.Mesh(
        new THREE.BoxGeometry(width, thickness, thickness),
        material
    );
    h2.position.set(0, -height/2, 0.3);
    group.add(h2);
    
    // Right vertical (partial)
    const v2 = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, height/2, thickness),
        material
    );
    v2.position.set(width/2, -height/4, 0.3);
    group.add(v2);
    
    // Middle horizontal (partial)
    const h3 = new THREE.Mesh(
        new THREE.BoxGeometry(width/2, thickness, thickness),
        material
    );
    h3.position.set(width/4, 0, 0.3);
    group.add(h3);

    // Position the letter
    group.position.set(-1.2, 0, 0);
    parent.add(group);
}

function createLetterA(parent, material) {
    const thickness = 0.15;
    const width = 0.8;
    const height = 1;
    
    const group = new THREE.Group();
    
    // Left diagonal
    const d1 = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, height*1.2, thickness),
        material
    );
    d1.position.set(-width/3, 0, 0.3);
    d1.rotation.z = -Math.PI/8;
    group.add(d1);
    
    // Right diagonal
    const d2 = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, height*1.2, thickness),
        material
    );
    d2.position.set(width/3, 0, 0.3);
    d2.rotation.z = Math.PI/8;
    group.add(d2);
    
    // Middle horizontal
    const h1 = new THREE.Mesh(
        new THREE.BoxGeometry(width*0.6, thickness, thickness),
        material
    );
    h1.position.set(0, -height*0.1, 0.3);
    group.add(h1);
    
    // Position the letter
    group.position.set(0, 0, 0);
    parent.add(group);
}

function createLetterS(parent, material) {
    const thickness = 0.15;
    const width = 0.8;
    const height = 1;
    
    const group = new THREE.Group();
    
    // Top horizontal
    const h1 = new THREE.Mesh(
        new THREE.BoxGeometry(width, thickness, thickness),
        material
    );
    h1.position.set(0, height/2, 0.3);
    group.add(h1);
    
    // Middle horizontal
    const h2 = new THREE.Mesh(
        new THREE.BoxGeometry(width, thickness, thickness),
        material
    );
    h2.position.set(0, 0, 0.3);
    group.add(h2);
    
    // Bottom horizontal
    const h3 = new THREE.Mesh(
        new THREE.BoxGeometry(width, thickness, thickness),
        material
    );
    h3.position.set(0, -height/2, 0.3);
    group.add(h3);
    
    // Top vertical (partial)
    const v1 = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, height/2, thickness),
        material
    );
    v1.position.set(-width/2, height/4, 0.3);
    group.add(v1);
    
    // Bottom vertical (partial)
    const v2 = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, height/2, thickness),
        material
    );
    v2.position.set(width/2, -height/4, 0.3);
    group.add(v2);
    
    // Position the letter
    group.position.set(1.2, 0, 0);
    parent.add(group);
}

// Create gas pumps
function createGasPumps(parent) {
    // Create a row of damaged/rusty gas pumps with better spacing
    const pumpCount = 4;
    const pumpSpacing = 4; // Increase spacing to avoid overlap
    
    for (let i = 0; i < pumpCount; i++) {
        const pumpX = 6;
        const pumpZ = -7 + i * pumpSpacing; // Increased spacing
        
        const pump = createGasPump();
        pump.position.set(pumpX, 0, pumpZ); // Ensure y=0
        
        // Random rotation to look damaged - reduce rotation amount
        pump.rotation.y = Math.random() * 0.1 - 0.05;
        pump.rotation.z = Math.random() * 0.05 - 0.025;
        
        parent.add(pump);
        
        // Add collision data for each pump
        parent.userData.collisionElements.push({
            type: 'box',
            width: 1,
            height: 2,
            depth: 1,
            position: new THREE.Vector3(pumpX, 1, pumpZ),
            mesh: pump
        });
    }
}

// Create a single gas pump
function createGasPump() {
    const pumpGroup = new THREE.Group();
    
    // Pump base
    const baseGeometry = new THREE.BoxGeometry(1, 0.4, 1);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        roughness: 0.9,
        metalness: 0.2
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.2;
    
    // Add shadows to base
    base.castShadow = true;
    base.receiveShadow = true;
    
    pumpGroup.add(base);
    
    // Pump body
    const bodyGeometry = new THREE.BoxGeometry(0.8, 1.8, 0.8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x882222, // Rusty red
        roughness: 0.7,
        metalness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.3;
    
    // Add shadows to body
    body.castShadow = true;
    body.receiveShadow = true;
    
    pumpGroup.add(body);
    
    // Pump display (broken)
    const displayGeometry = new THREE.BoxGeometry(0.7, 0.5, 0.1);
    const displayMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.3,
        metalness: 0.5
    });
    const display = new THREE.Mesh(displayGeometry, displayMaterial);
    display.position.y = 1.7;
    display.position.z = 0.45;
    display.rotation.x = Math.PI * 0.1; // Tilted slightly
    
    // Add shadows to display
    display.castShadow = true;
    display.receiveShadow = true;
    
    pumpGroup.add(display);
    
    // Pump handle
    const handleGroup = new THREE.Group();
    
    const handleBaseGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
    const handleMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.5,
        metalness: 0.6
    });
    const handleBase = new THREE.Mesh(handleBaseGeometry, handleMaterial);
    handleBase.rotation.x = Math.PI / 2;
    
    // Add shadows to handle base
    handleBase.castShadow = true;
    handleBase.receiveShadow = true;
    
    handleGroup.add(handleBase);
    
    const nozzleGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.4, 8);
    const nozzle = new THREE.Mesh(nozzleGeometry, handleMaterial);
    nozzle.position.z = 0.3;
    nozzle.rotation.x = Math.PI / 2;
    
    // Add shadows to nozzle
    nozzle.castShadow = true;
    nozzle.receiveShadow = true;
    
    handleGroup.add(nozzle);
    
    // Position the handle hanging off
    handleGroup.position.set(0.5, 1.2, 0.4);
    pumpGroup.add(handleGroup);
    
    // Add hoses (using curved tube)
    const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.4, 1.2, 0.4),
        new THREE.Vector3(0.5, 1.0, 0.5),
        new THREE.Vector3(0.4, 0.7, 0.6),
        new THREE.Vector3(0.3, 0.4, 0.5)
    ]);
    
    const hoseGeometry = new THREE.TubeGeometry(curve, 20, 0.05, 8, false);
    const hoseMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.9,
        metalness: 0.1
    });
    const hose = new THREE.Mesh(hoseGeometry, hoseMaterial);
    
    // Add shadows to hose
    hose.castShadow = true;
    hose.receiveShadow = true;
    
    pumpGroup.add(hose);
    
    // Add damage details - rusty spots
    addRustySpots(body);
    
    return pumpGroup;
}

// Update canopy positioning to align with pumps
function createCanopy(parent) {
    // Canopy dimensions - adjusted to properly cover the pumps
    const canopyWidth = 10;
    const canopyDepth = 18; // Covers all pumps
    const canopyHeight = 5;
    const canopyThickness = 0.3;
    
    // Create the main canopy roof
    const canopyGeometry = new THREE.BoxGeometry(canopyWidth, canopyThickness, canopyDepth);
    const canopyMaterial = new THREE.MeshStandardMaterial({
        color: 0x777777,
        roughness: 0.8,
        metalness: 0.2
    });
    
    const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
    
    // Add shadows to canopy
    canopy.castShadow = true;
    canopy.receiveShadow = true;
    
    // FIXED POSITION: Move to side where pumps are located
    // Position the canopy directly over the pumps (-4,0,-1) was the center of pump row
    canopy.position.set(6, canopyHeight, -1);
    canopy.rotation.z = Math.PI; // Lay flat
    
    // Add support columns for the canopy
    const columnGeometry = new THREE.CylinderGeometry(0.2, 0.2, canopyHeight, 8);
    const columnMaterial = new THREE.MeshStandardMaterial({
        color: 0x555555,
        roughness: 0.7,
        metalness: 0.3
    });
    
    // Add columns at the corners of the canopy
    const columnPositions = [
        [-canopyWidth/2 + 0.5, 0, -canopyDepth/2 + 0.5],
        [canopyWidth/2 - 0.5, 0, -canopyDepth/2 + 0.5],
        [-canopyWidth/2 + 0.5, 0, canopyDepth/2 - 0.5],
        [canopyWidth/2 - 0.5, 0, canopyDepth/2 - 0.5]
    ];
    
    columnPositions.forEach(pos => {
        const column = new THREE.Mesh(columnGeometry, columnMaterial);
        column.position.set(pos[0], canopyHeight/2, pos[1]);
        
        // Add shadows to columns
        column.castShadow = true;
        column.receiveShadow = true;
        
        canopy.add(column);
    });
    
    // Add damage to canopy
    addDamageToCanopy(canopy, canopyWidth, canopyDepth);
    
    parent.add(canopy);
}

// Add damage to canopy
function addDamageToCanopy(canopy, width, depth) {
    // Create holes in the canopy
    const holeCount = 3;
    
    for (let i = 0; i < holeCount; i++) {
        const holeGeometry = new THREE.CircleGeometry(0.5 + Math.random() * 0.7, 16);
        const holeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const hole = new THREE.Mesh(holeGeometry, holeMaterial);
        
        hole.position.set(
            (Math.random() - 0.5) * width * 0.7,
            0.16, // Just above the canopy
            (Math.random() - 0.5) * depth * 0.7
        );
        
        hole.rotation.x = -Math.PI / 2; // Face downward
        canopy.add(hole);
    }
    
    // Add bent/damaged edges
    const edgeGeometry = new THREE.BoxGeometry(width * 0.3, 0.2, 0.3);
    const edgeMaterial = new THREE.MeshStandardMaterial({
        color: 0x777777,
        roughness: 0.8,
        metalness: 0.2
    });
    
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.position.set(width * 0.3, -0.1, depth/2);
    edge.rotation.x = 0.6; // Bent downward
    canopy.add(edge);
}

// Add rusty spots to objects
function addRustySpots(mesh) {
    const spotCount = 5;
    
    for (let i = 0; i < spotCount; i++) {
        const spotSize = 0.1 + Math.random() * 0.2;
        const spotGeometry = new THREE.CircleGeometry(spotSize, 8);
        const spotMaterial = new THREE.MeshBasicMaterial({
            color: 0x8B4513, // Rust color
            side: THREE.DoubleSide
        });
        
        const spot = new THREE.Mesh(spotGeometry, spotMaterial);
        
        // Random position on each face of the box
        const face = Math.floor(Math.random() * 6);
        let pos = new THREE.Vector3();
        let rot = new THREE.Euler();
        
        switch(face) {
            case 0: // Front
                pos.set(0, 0, 0.41);
                rot.set(0, 0, 0);
                break;
            case 1: // Back
                pos.set(0, 0, -0.41);
                rot.set(0, Math.PI, 0);
                break;
            case 2: // Left
                pos.set(-0.41, 0, 0);
                rot.set(0, -Math.PI/2, 0);
                break;
            case 3: // Right
                pos.set(0.41, 0, 0);
                rot.set(0, Math.PI/2, 0);
                break;
            case 4: // Top
                pos.set(0, 0.41, 0);
                rot.set(-Math.PI/2, 0, 0);
                break;
            case 5: // Bottom
                pos.set(0, -0.41, 0);
                rot.set(Math.PI/2, 0, 0);
                break;
        }
        
        // Randomize position within face
        pos.x += (Math.random() - 0.5) * 0.6;
        pos.y += (Math.random() - 0.5) * 0.6;
        
        spot.position.copy(pos);
        spot.rotation.copy(rot);
        
        mesh.add(spot);
    }
}

// Add scattered debris and details around the gas station
function addDebrisAndDetails(parent) {
    // 1. Add tires with fixed positions
    const tirePositions = [
        { x: -8, z: -5 },   // Behind the building
        { x: -6, z: 6 },    // Side of the building
        { x: -12, z: -1 }   // Further from building
    ];
    
    tirePositions.forEach((pos, i) => {
        const tire = createTire();
        tire.position.set(pos.x, 0.4, pos.z);
        
        // Add some rotation variety, but keep positions fixed
        tire.rotation.set(
            Math.PI * (i * 0.3),
            Math.PI * (i * 0.7),
            Math.PI * (i * 0.5)
        );
        
        parent.add(tire);
    });
    
    // 2. Add oil barrels with fixed positions
    const barrelPositions = [
        { x: -12, z: -6, standing: true },    // Against the wall
        { x: -8, z: -8, standing: false },    // Knocked over
        { x: -10, z: 5, standing: true },     // Corner of station
        { x: -4, z: 8, standing: false }      // Out front
    ];
    
    barrelPositions.forEach((pos) => {
        const barrel = createOilBarrel();
        barrel.position.set(pos.x, pos.standing ? 0.75 : 0.3, pos.z);
        
        // Set barrel rotation based on whether it's standing or knocked over
        if (!pos.standing) {
            barrel.rotation.x = Math.PI/2;
        }
        
        parent.add(barrel);
        
        // Add collision data for each barrel
        parent.userData.collisionElements.push({
            type: 'cylinder',
            radius: 0.5,
            height: 1.5,
            position: barrel.position.clone(),
            mesh: barrel
        });
    });
    
    // 3. Add fallen sign - no changes needed, it has a fixed position
    const fallenSign = createFallenSign();
    fallenSign.position.set(-12, 0.3, -3);
    fallenSign.rotation.set(0, Math.PI/4, Math.PI/2);
    parent.add(fallenSign);
}

// Create a tire model
function createTire() {
    const tireGroup = new THREE.Group();
    
    // Tire outer
    const tireGeometry = new THREE.TorusGeometry(0.5, 0.25, 16, 32);
    const tireMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.9,
        metalness: 0.1
    });
    const tire = new THREE.Mesh(tireGeometry, tireMaterial);
    
    // Add shadows to tire
    tire.castShadow = true;
    tire.receiveShadow = true;
    
    tireGroup.add(tire);
    
    // Tire inner rim
    const rimGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
    const rimMaterial = new THREE.MeshStandardMaterial({
        color: 0x777777,
        roughness: 0.6,
        metalness: 0.5
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = Math.PI/2;
    
    // Add shadows to rim
    rim.castShadow = true;
    rim.receiveShadow = true;
    
    tireGroup.add(rim);
    
    return tireGroup;
}

// Create an oil barrel
function createOilBarrel() {
    const barrelGroup = new THREE.Group();
    
    // Barrel body
    const barrelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 16);
    
    // Randomly choose color for variety
    const barrelColors = [0xff0000, 0x0000ff, 0xffbb00];
    const barrelColor = barrelColors[Math.floor(Math.random() * barrelColors.length)];
    
    const barrelMaterial = new THREE.MeshStandardMaterial({
        color: barrelColor,
        roughness: 0.7,
        metalness: 0.3
    });
    
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    
    // Add shadows to barrel
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    
    barrelGroup.add(barrel);
    
    // Add rusty spots and damage
    addRustySpots(barrel);
    
    // Add ridges to barrel
    const ridgeGeometry = new THREE.TorusGeometry(0.5, 0.05, 8, 32);
    const ridgeMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.5,
        metalness: 0.5
    });
    
    // Top ridge
    const topRidge = new THREE.Mesh(ridgeGeometry, ridgeMaterial);
    topRidge.position.y = 0.7;
    topRidge.rotation.x = Math.PI/2;
    
    // Add shadows to top ridge
    topRidge.castShadow = true;
    topRidge.receiveShadow = true;
    
    barrelGroup.add(topRidge);
    
    // Bottom ridge
    const bottomRidge = new THREE.Mesh(ridgeGeometry, ridgeMaterial);
    bottomRidge.position.y = -0.7;
    bottomRidge.rotation.x = Math.PI/2;
    
    // Add shadows to bottom ridge
    bottomRidge.castShadow = true;
    bottomRidge.receiveShadow = true;
    
    barrelGroup.add(bottomRidge);
    
    return barrelGroup;
}

// Create a fallen gas price sign
function createFallenSign() {
    const signGroup = new THREE.Group();
    
    // Sign board
    const signGeometry = new THREE.BoxGeometry(4, 3, 0.2);
    const signMaterial = new THREE.MeshStandardMaterial({
        color: 0xdddddd,
        roughness: 0.7,
        metalness: 0.1
    });
    
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    
    // Add shadows to sign
    sign.castShadow = true;
    sign.receiveShadow = true;
    
    signGroup.add(sign);
    
    // Add price panels
    const panelGeometry = new THREE.PlaneGeometry(0.8, 0.6);
    const panelMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.DoubleSide
    });
    
    // Create a few price panels
    for (let i = 0; i < 2; i++) {
        const panel = new THREE.Mesh(panelGeometry, panelMaterial);
        panel.position.set(-0.9 + i * 1.8, 0.5, 0.11);
        
        // Don't add shadows to emissive panels
        
        signGroup.add(panel);
        
        // Add price in red
        const priceMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            side: THREE.DoubleSide
        });
        
        // Create price digits randomly
        const price = (6 + Math.random() * 4).toFixed(2);
        createPriceText(panel, price, priceMaterial);
    }
    
    return signGroup;
}

// Create price text for the gas sign
function createPriceText(parent, price, material) {
    // This is a simplified version - just add a red plane with a random price
    const textGeometry = new THREE.PlaneGeometry(0.6, 0.4);
    const textMesh = new THREE.Mesh(textGeometry, material);
    textMesh.position.z = 0.01;
    parent.add(textMesh);
}

// Add broken lighting effects
function addBrokenLighting(parent) {
    // Create a flickering light on the canopy
    const flickerLight = new THREE.PointLight(0xffffaa, 0.8, 10);
    flickerLight.position.set(-4, 4.9, 0);
    parent.add(flickerLight);
    
    // Add broken light fixture
    const fixtureGeometry = new THREE.BoxGeometry(0.4, 0.1, 0.4);
    const fixtureMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.5,
        metalness: 0.7
    });
    
    const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial);
    fixture.position.copy(flickerLight.position);
    fixture.position.y -= 0.05;
    parent.add(fixture);
    
    // Animate the flickering
    const flickerParams = {
        baseIntensity: 0.8,
        flickerSpeed: 0.2,
        flickerIntensity: 0.5
    };
    
    function animateFlicker() {
        if (!fixture.parent) return; // Stop if removed from scene
        
        const time = Date.now() * 0.001;
        
        // Random flickering effect
        const flicker = Math.sin(time * flickerParams.flickerSpeed * 10) * flickerParams.flickerIntensity;
        flickerLight.intensity = flickerParams.baseIntensity + flicker;
        
        // Occasionally turn off completely
        if (Math.random() > 0.997) {
            flickerLight.intensity = 0;
            setTimeout(() => {
                // Turn back on after a short time
                if (flickerLight.parent) flickerLight.intensity = flickerParams.baseIntensity;
            }, 100 + Math.random() * 300);
        }
        
        requestAnimationFrame(animateFlicker);
    }
    
    animateFlicker();
}

// Similarly, update enemy collision detection
function updateCheckEnemyCollisions() {
    const originalCheckEnemyCollisions = checkEnemyCollisions;
    
    checkEnemyCollisions = function(enemy, originalX, originalZ) {
        // Check original collisions first
        if (originalCheckEnemyCollisions(enemy, originalX, originalZ)) {
            return true;
        }
        
        // Check collision with gas station elements
        const gasStations = scene.children.filter(obj => obj.userData && obj.userData.isGasStation);
        const enemyRadius = enemy.geometry.parameters.width / 2;
        
        for (const station of gasStations) {
            if (!station.userData.collisionElements) continue;
            
            for (const element of station.userData.collisionElements) {
                let collision = false;
                
                if (element.type === 'box') {
                    // Box collision
                    const dx = Math.abs(element.position.x - enemy.position.x);
                    const dz = Math.abs(element.position.z - enemy.position.z);
                    
                    collision = (
                        dx < element.width/2 + enemyRadius &&
                        dz < element.depth/2 + enemyRadius
                    );
                } 
                else if (element.type === 'cylinder') {
                    // Cylinder collision (simplified as circle in XZ plane)
                    const dx = element.position.x - enemy.position.x;
                    const dz = element.position.z - enemy.position.z;
                    const distance = Math.sqrt(dx*dx + dz*dz);
                    
                    collision = distance < element.radius + enemyRadius;
                }
                
                if (collision) {
                    return true;
                }
            }
        }
        
        return false;
    };
}

// Function to add the gas station to the game in the main.js file
function addAbandonedGasStation() {
    // Create the gas station
    const gasStation = createAbandonedGasStation();
    
    return gasStation;
}

function applyObstacleAvoidance(enemy, initialDirection, movement, moveSpeed) {
    // Get enemy dimensions for better calculations
    const enemyWidth = enemy.geometry.parameters.width;
    
    // Store original position for collision checks
    const originalX = enemy.position.x;
    const originalZ = enemy.position.z;
    
    // Check if enemy has been stuck for too long and needs a major direction change
    if (!enemy.userData.stuckCounter) {
        enemy.userData.stuckCounter = 0;
    }
    
    // Try multiple alternative directions if the enemy is stuck
    const angles = [
        Math.PI / 4,     // 45° right
        -Math.PI / 4,    // 45° left
        Math.PI / 2,     // 90° right
        -Math.PI / 2,    // 90° left
        3 * Math.PI / 4, // 135° right
        -3 * Math.PI / 4 // 135° left
    ];
    
    // If we have a lastSuccessfulDirection and not stuck too long, prioritize it
    if (enemy.userData.lastSuccessfulDirection && enemy.userData.stuckCounter < 10) {
        // Try a slight variation of the last successful direction first
        const variationAngle = (Math.random() - 0.5) * Math.PI / 4; // ±22.5°
        const variation = new THREE.Matrix4().makeRotationY(variationAngle);
        
        const variationDirection = enemy.userData.lastSuccessfulDirection.clone()
            .applyMatrix4(variation)
            .normalize();
        
        // Try this direction
        enemy.position.x = originalX + variationDirection.x * moveSpeed;
        enemy.position.z = originalZ + variationDirection.z * moveSpeed;
        
        // If no collision, we found a good path
        if (!checkEnemyCollisions(enemy, originalX, originalZ)) {
            enemy.userData.stuckCounter = 0;
            return;
        }
        
        // Reset position for next attempt
        enemy.position.x = originalX;
        enemy.position.z = originalZ;
    }
    
    // Try each angle until we find a clear path
    for (const angle of angles) {
        // Create a rotation matrix for the current angle
        const rotation = new THREE.Matrix4().makeRotationY(angle);
        
        // Apply rotation to the initial direction
        const newDirection = initialDirection.clone().applyMatrix4(rotation).normalize();
        
        // Try moving in the new direction
        enemy.position.x = originalX + newDirection.x * moveSpeed;
        enemy.position.z = originalZ + newDirection.z * moveSpeed;
        
        // Check if this direction is clear
        if (!checkEnemyCollisions(enemy, originalX, originalZ)) {
            // Found a clear path, update the last successful direction
            enemy.userData.lastSuccessfulDirection = newDirection.clone();
            enemy.userData.stuckCounter = 0;
            return;
        }
        
        // Reset position for next attempt
        enemy.position.x = originalX;
        enemy.position.z = originalZ;
    }
    
    // If all standard angles failed, try a random direction
    const randomAngle = Math.random() * Math.PI * 2;
    const randomDirection = new THREE.Vector3(
        Math.cos(randomAngle),
        0,
        Math.sin(randomAngle)
    );
    
    enemy.position.x = originalX + randomDirection.x * moveSpeed;
    enemy.position.z = originalZ + randomDirection.z * moveSpeed;
    
    // Check if random direction works
    if (!checkEnemyCollisions(enemy, originalX, originalZ)) {
        enemy.userData.lastSuccessfulDirection = randomDirection.clone();
        enemy.userData.stuckCounter = 0;
    } else {
        // Still stuck, increment counter
        enemy.userData.stuckCounter++;
        
        // Reset to original position
        enemy.position.x = originalX;
        enemy.position.z = originalZ;
        
        // If stuck too long, teleport slightly to break free (last resort)
        if (enemy.userData.stuckCounter > 20) {
            const teleportRadius = enemyWidth * 2;
            const teleportAngle = Math.random() * Math.PI * 2;
            
            enemy.position.x = originalX + Math.cos(teleportAngle) * teleportRadius;
            enemy.position.z = originalZ + Math.sin(teleportAngle) * teleportRadius;
            
            // If the teleport would cause a collision, don't do it
            if (checkEnemyCollisions(enemy, originalX, originalZ)) {
                enemy.position.x = originalX;
                enemy.position.z = originalZ;
            } else {
                enemy.userData.stuckCounter = 0;
            }
        }
    }
}

// Add this method to enhance obstacle detection
function detectNearbyObstacles(enemy, range) {
    const obstacles = [];
    const enemyPos = new THREE.Vector3(enemy.position.x, 0, enemy.position.z);
    
    // Check cars
    for (const car of abandonedCars) {
        if (!car || !car.userData) continue;
        
        const carPos = new THREE.Vector3(car.position.x, 0, car.position.z);
        const distance = enemyPos.distanceTo(carPos);
        
        if (distance < range + car.userData.collisionRadius) {
            obstacles.push({
                object: car,
                position: carPos,
                radius: car.userData.collisionRadius,
                distance: distance
            });
        }
    }
    
    // Check road lamps
    for (const lamp of roadLampObjects) {
        const lampPos = new THREE.Vector3(lamp.position.x, 0, lamp.position.z);
        const distance = enemyPos.distanceTo(lampPos);
        
        if (distance < range + lamp.userData.collisionRadius) {
            obstacles.push({
                object: lamp,
                position: lampPos,
                radius: lamp.userData.collisionRadius,
                distance: distance
            });
        }
    }
    
    // Check other enemies
    for (const otherEnemy of activeEnemies) {
        if (otherEnemy === enemy) continue;
        
        const otherPos = new THREE.Vector3(otherEnemy.position.x, 0, otherEnemy.position.z);
        const distance = enemyPos.distanceTo(otherPos);
        const otherRadius = otherEnemy.geometry.parameters.width / 2;
        
        if (distance < range + otherRadius) {
            obstacles.push({
                object: otherEnemy,
                position: otherPos,
                radius: otherRadius,
                distance: distance
            });
        }
    }
    
    // Sort obstacles by distance
    obstacles.sort((a, b) => a.distance - b.distance);
    
    return obstacles;
}

// Function to check enemy collisions
function checkEnemyCollisions(enemy, originalX, originalZ) {
    // Check collision with player
    const playerRadius = 0.5;
    const enemyRadius = enemy.geometry.parameters.width / 2;
    const distToPlayer = Math.sqrt(
        Math.pow(enemy.position.x - player.position.x, 2) +
        Math.pow(enemy.position.z - player.position.z, 2)
    );
    
    if (distToPlayer < playerRadius + enemyRadius) {
        return true;
    }
    
    // Check collision with other enemies
    for (const otherEnemy of activeEnemies) {
        if (otherEnemy === enemy) continue;
        
        const distToEnemy = Math.sqrt(
            Math.pow(enemy.position.x - otherEnemy.position.x, 2) +
            Math.pow(enemy.position.z - otherEnemy.position.z, 2)
        );
        
        const combinedRadius = 
            enemy.geometry.parameters.width / 2 + 
            otherEnemy.geometry.parameters.width / 2;
        
        if (distToEnemy < combinedRadius * 0.8) {
            return true;
        }
    }
    
    // Check collisions with lamp posts
    for (const lamp of roadLampObjects) {
        const distToLamp = Math.sqrt(
            Math.pow(enemy.position.x - lamp.position.x, 2) +
            Math.pow(enemy.position.z - lamp.position.z, 2)
        );
        
        if (distToLamp < (lamp.userData.collisionRadius + enemyRadius)) {
            return true; // Collision with lamp post
        }
    }
    
    // NEW: Check collisions with abandoned cars
    for (const car of abandonedCars) {
        if (!car || !car.userData) continue;
        
        // Create vectors for position calculations
        const enemyPos = new THREE.Vector3(enemy.position.x, enemy.position.y, enemy.position.z);
        const carPos = car.position.clone();
        
        // Get car dimensions from userData
        const carWidth = car.userData.collisionWidth;
        const carDepth = car.userData.collisionDepth;
        
        if (!carWidth || !carDepth) continue;
        
        // Vector from car to enemy
        const toEnemy = new THREE.Vector3().subVectors(enemyPos, carPos);
        
        // Transform to car's local space
        toEnemy.applyAxisAngle(new THREE.Vector3(0, 1, 0), -car.rotation.y);
        
        // Check AABB collision in car's local space
        const halfWidth = carWidth / 2;
        const halfDepth = carDepth / 2;
        
        if (
            Math.abs(toEnemy.x) < halfWidth + enemyRadius &&
            Math.abs(toEnemy.z) < halfDepth + enemyRadius
        ) {
            return true; // Collision with car
        }
    }
    
    // Check collisions with road blockade areas
    const roadEndX = 110;
    const roadWidth = 15;
    const blockadeDepth = 12;
    
    // East blockade area (positive X)
    if (Math.abs(enemy.position.x - roadEndX) < blockadeDepth && 
        Math.abs(enemy.position.z) < roadWidth / 2 + 5) {
        return true; // Collision with east blockade area
    }
    
    // West blockade area (negative X)
    if (Math.abs(enemy.position.x + roadEndX) < blockadeDepth && 
        Math.abs(enemy.position.z) < roadWidth / 2 + 5) {
        return true; // Collision with west blockade area
    }
    
    // NEW: Check collision with environmental objects (rock formations and trees)
    if (scene.userData.environmentalColliders) {
        for (const collider of scene.userData.environmentalColliders) {
            if (collider.type === 'circle') {
                const dx = collider.position.x - enemy.position.x;
                const dz = collider.position.z - enemy.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance < (collider.radius + enemyRadius)) {
                    return true; // Collision detected
                }
            } 
            else if (collider.type === 'cylinder') {
                const dx = collider.position.x - enemy.position.x;
                const dz = collider.position.z - enemy.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance < (collider.radius + enemyRadius)) {
                    return true; // Collision detected
                }
            }
        }
    }
    
    return false; // No collision detected
}

// Projectile system
const projectiles = [];

// Function to fire a projectile
function fireProjectile(enemy, direction) {
    const projectileGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const projectileMaterial = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    
    // Position the projectile at the enemy
    projectile.position.copy(enemy.position);
    projectile.position.y = enemy.position.y + enemy.geometry.parameters.height * 0.6;
    
    // Store projectile metadata
    projectile.userData = {
        direction: direction.clone(),
        speed: enemy.userData.projectileSpeed,
        damage: enemy.userData.damage,
        lifetime: 5000, // 5 seconds lifetime
        spawnTime: performance.now()
    };
    
    // Add projectile to scene and tracking array
    scene.add(projectile);
    projectiles.push(projectile);
}

// Function to update projectiles
function updateProjectiles() {
    const now = performance.now();
    
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        
        // Move projectile
        projectile.position.x += projectile.userData.direction.x * projectile.userData.speed;
        projectile.position.z += projectile.userData.direction.z * projectile.userData.speed;
        
        // Check for collision with player
        const distToPlayer = Math.sqrt(
            Math.pow(projectile.position.x - player.position.x, 2) +
            Math.pow(projectile.position.z - player.position.z, 2)
        );
        
        if (distToPlayer < 0.7) { // Player hit
            // Apply damage to player
            takeDamage(projectile.userData.damage);
            
            // Remove projectile
            scene.remove(projectile);
            projectiles.splice(i, 1);
            continue;
        }
        
        // Check if projectile has exceeded lifetime
        if (now - projectile.userData.spawnTime > projectile.userData.lifetime) {
            scene.remove(projectile);
            projectiles.splice(i, 1);
            continue;
        }
        
        // Check if projectile is out of bounds
        const boundary = 80;
        if (
            Math.abs(projectile.position.x) > boundary ||
            Math.abs(projectile.position.z) > boundary
        ) {
            scene.remove(projectile);
            projectiles.splice(i, 1);
        }
    }
}

// Function for boss special attack (shockwave)
function bossSpecialAttack(boss) {
    // Create a visual effect for the shockwave
    const waveGeometry = new THREE.RingGeometry(0, 1, 32);
    const waveMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff00ff, 
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide 
    });
    const wave = new THREE.Mesh(waveGeometry, waveMaterial);
    
    wave.position.copy(boss.position);
    wave.position.y = 0.1;
    wave.rotation.x = -Math.PI / 2; // Lay flat on ground
    
    scene.add(wave);
    
    // Animate the shockwave
    const maxRadius = 15;
    const duration = 2000; // 2 seconds
    const startTime = performance.now();
    
    // Play shockwave sound
    // playSound('bossSpecialAttack');
    
    // Warning message
    showNotification("BOSS SHOCKWAVE INCOMING!", 2000);
    
    function animateShockwave() {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Scale the wave based on progress
        const currentRadius = progress * maxRadius;
        wave.scale.set(currentRadius, currentRadius, 1);
        
        // Fade out as it expands
        wave.material.opacity = 0.7 * (1 - progress);
        
        // Check if the player is hit by the expanding wave
        const distToPlayer = Math.sqrt(
            Math.pow(wave.position.x - player.position.x, 2) +
            Math.pow(wave.position.z - player.position.z, 2)
        );
        
        // Check if player is within the current radius
        if (distToPlayer < currentRadius && distToPlayer > currentRadius - 1) {
            // Apply damage to player
            takeDamage(boss.userData.damage * 1.5);
        }
        
        if (progress < 1) {
            requestAnimationFrame(animateShockwave);
        } else {
            scene.remove(wave);
        }
    }
    
    animateShockwave();
}

const ITEM_USE_DURATIONS = {
    [ITEM_TYPES.BANDAGE]: 3500,     // 3.5 seconds for bandages
    [ITEM_TYPES.MEDKIT]: 9000,      // 9 seconds for medkit
    [ITEM_TYPES.MINI_SHIELD]: 2000, // 2 seconds for mini shield
    [ITEM_TYPES.BIG_SHIELD]: 4000   // 4 seconds for big shield
};

// Function to attack player
function attackPlayer(enemy) {
    // Play attack animation or visual effect
    
    // Apply damage to player
    takeDamage(enemy.userData.damage);
}

// Function to toggle infinite money cheat
function toggleInfiniteMoney() {
    infiniteMoneyCheat = !infiniteMoneyCheat;
    const status = infiniteMoneyCheat ? "ACTIVATED" : "DEACTIVATED";
    
    // Store original coin display color if activating
    const coinDisplay = document.getElementById('coinDisplay');
    if (infiniteMoneyCheat && !originalCoinColor && coinDisplay) {
        originalCoinColor = coinDisplay.style.color;
        // Change coin display to green when cheat is active
        coinDisplay.style.color = '#ffcc00';
        
        // Set to special text instead of a number
        playerCoins = infiniteMoneyCheat ? 9999 : playerCoins;
        coinDisplay.textContent = "INFINITE";
        
        // Also update shop display if shop is open
        const shopCoins = document.getElementById('shopCoins');
        if (shopCoins) {
            shopCoins.textContent = "INFINITE";
            shopCoins.style.color = '#ffcc00';
        }
    } else if (!infiniteMoneyCheat && originalCoinColor) {
        // Restore original color when deactivating
        if (coinDisplay) {
            coinDisplay.style.color = originalCoinColor;
            coinDisplay.textContent = playerCoins;
        }
        
        // Restore shop coins color and value too
        const shopCoins = document.getElementById('shopCoins');
        if (shopCoins) {
            shopCoins.textContent = playerCoins;
            shopCoins.style.color = 'gold';
        }
    }
    
    // Display fancy console message
    console.log(`%c💰 INFINITE MONEY ${status} 💰`, 
                'background: #000; color: #ffcc00; font-size: 18px; padding: 5px; border-radius: 5px;');
    
    // Show in-game notification
    showNotification(`Infinite Money: ${status}`, 3000);
    
    // Update all displays
    updateCoinDisplay();
    
    return infiniteMoneyCheat;
}


// Make the function available in the console
window.toggleInfiniteMoney = toggleInfiniteMoney;

// Add a hint in the console
console.log("%c💰 CHEAT CODE AVAILABLE: Type toggleInfiniteMoney() in the console for unlimited coins", 
           "background: #222; color: #ffcc00; font-size: 14px; padding: 5px; border-radius: 5px;");

// Function to toggle infinite health cheat
function toggleInfiniteHealth() {
    infiniteHealthCheat = !infiniteHealthCheat;
    const status = infiniteHealthCheat ? "ACTIVATED" : "DEACTIVATED";
    
    // Store original health bar color if activating
    if (infiniteHealthCheat && !originalHealthColor) {
        const healthBar = document.getElementById('healthBar');
        originalHealthColor = healthBar.style.backgroundColor;
        // Change health bar to gold when cheat is active
        healthBar.style.backgroundColor = '#ffcc00';
        // Restore health to full
        health = 100;
        updateHUD();
    } else if (!infiniteHealthCheat && originalHealthColor) {
        // Restore original color when deactivating
        const healthBar = document.getElementById('healthBar');
        healthBar.style.backgroundColor = originalHealthColor;
    }
    
    // Display fancy console message
    console.log(`%c✨ INFINITE HEALTH ${status} ✨`, 
                'background: #000; color: #ffcc00; font-size: 18px; padding: 5px; border-radius: 5px;');
    
    // Show in-game notification
    showNotification(`God Mode: ${status}`, 3000);
    
    return infiniteHealthCheat;
}

// Update the takeDamage function to use a single hurt sound
function takeDamage(amount) {
    // Skip if invulnerable cheat is active
    if (infiniteHealthCheat) return;

    // Add screen shake effect based on damage amount
    const shakeIntensity = Math.min(0.8, amount * 0.02);
    addScreenShake(shakeIntensity, 300);

    // Calculate shield damage and remaining damage
    let remainingDamage = amount;
    let shieldDamage = 0;
    
    if (shield > 0) {
        // Play shield hit sound
        soundManager.play('player_shield_hit', 0.7);
        
        // Calculate how much damage shield can absorb
        shieldDamage = Math.min(shield, remainingDamage);
        shield -= shieldDamage;
        remainingDamage -= shieldDamage;
    }

    // Apply remaining damage to health if any
    if (remainingDamage > 0) {
        // Play player hurt sound
        soundManager.play('player_hurt', 0.7);

        // Apply damage but ensure health doesn't go below 0
        health = Math.max(0, health - remainingDamage);
        
        // Track damage taken in game stats
        gameStats.damageTaken += remainingDamage;
    }
    
    // Update HUD
    updateHUD();
    
    // Check for game over
    if (health <= 0) {
        handlePlayerDeath();
    }
}

// Make the function globally available for console access
window.toggleInfiniteHealth = toggleInfiniteHealth;

// Add a hint in the console when the game starts
console.log("%c🎮 CHEAT CODE AVAILABLE: Type toggleInfiniteHealth() in the console for God Mode", 
           "background: #222; color: #ffcc00; font-size: 14px; padding: 5px; border-radius: 5px;");

// Function to handle player taking damage to enemy
function damageEnemy(enemy, damage) {
    if (!enemy || !enemy.userData) return;
    
    enemy.userData.health -= damage;
    
    // Track damage dealt
    gameStats.damageDealt += damage;

    soundManager.play('enemy_hit', 0.4);
    
    // Check if enemy is defeated
    if (enemy.userData.health <= 0) {
        defeatEnemy(enemy);
    } else {
        // Flash effect for hit feedback with safety checks
        if (enemy.material && enemy.material.emissive && typeof enemy.material.emissive.setHex === 'function') {
            enemy.material.emissive.setHex(0xff0000);
            setTimeout(() => {
                if (enemy.material && enemy.material.emissive) {
                    enemy.material.emissive.setHex(0x000000);
                }
            }, 100);
        }
    }
}

function createShield(position, radius, color = 0xff3300, duration = 3000) {
    // Create shield geometry
    const shieldGeometry = new THREE.SphereGeometry(radius, 32, 32);
    const shieldMaterial = new THREE.MeshPhongMaterial({
        color: color,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
    });
    
    const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
    shield.position.copy(position);
    scene.add(shield);
    
    // Add visual effect for shield creation
    if (typeof createShieldActivationEffect === 'function') {
        createShieldActivationEffect(position);
    }
    
    // Remove shield after duration
    if (duration > 0) {
        setTimeout(() => {
            if (shield.parent) {
                scene.remove(shield);
            }
        }, duration);
    }
    
    return shield;
}

// Function to handle enemy defeat
function defeatEnemy(enemy) {

    if (enemy.userData.type === ENEMY_TYPES.BOSS || 
        enemy.userData.type === ENEMY_TYPES.WARDEN_BOSS || 
        enemy.userData.type === ENEMY_TYPES.PHANTOM_BOSS || 
        enemy.userData.type === ENEMY_TYPES.MEGA_BOSS) {
        // Play boss death sound with higher volume
        soundManager.play('boss_death', 0.8);
    } else {
        // Play regular enemy death sound
        soundManager.play('enemy_death', 0.5);
    }

    // Add coins for defeating the enemy
    const baseCoins = 1;
    let coinReward = baseCoins;
    let enemyType = enemy.userData.type;
    
    // Set reward based on enemy type
    switch (enemyType) {
        case ENEMY_TYPES.NORMAL:
            coinReward = 1;
            gameStats.kills.normal++;
            break;
        case ENEMY_TYPES.TANK:
            coinReward = 3;
            gameStats.kills.tank++;
            break;
        case ENEMY_TYPES.RANGED:
            coinReward = 2;
            gameStats.kills.ranged++;
            break;
        case ENEMY_TYPES.SPEEDER:
            coinReward = 2;
            gameStats.kills.speeder++;
            break;
        case ENEMY_TYPES.EXPLODER:
            coinReward = 3;
            gameStats.kills.exploder++;
            break;
        case ENEMY_TYPES.SHIELDER:
            coinReward = 4;
            gameStats.kills.shielder++;
            break;
        case ENEMY_TYPES.TELEPORTER:
            coinReward = 4;
            gameStats.kills.teleporter++;
            break;
        case ENEMY_TYPES.HEALER:
            coinReward = 5;
            gameStats.kills.healer++;
            break;
        case ENEMY_TYPES.ELITE:
            coinReward = 6;
            gameStats.kills.elite++;
            break;
        // All boss types aggregated under 'boss' category
        case ENEMY_TYPES.BOSS:
        case ENEMY_TYPES.WARDEN_BOSS:
        case ENEMY_TYPES.PHANTOM_BOSS:
        case ENEMY_TYPES.MEGA_BOSS:
            coinReward = 25;
            gameStats.kills.boss++;
            break;
    }
    
    // Add coin reward
    if (!infiniteMoneyCheat) {
        playerCoins += coinReward;
        updateCoinDisplay();
    }
    
    // Update the enemy counter display
    const enemiesRemainingElement = document.getElementById('enemiesRemaining');
    if (enemiesRemainingElement) {
        // Get current count from display text
        const currentText = enemiesRemainingElement.textContent;
        const currentCount = parseInt(currentText.replace('Enemies: ', ''));
        
        // Calculate new count
        const newCount = Math.max(0, currentCount - 1);
        
        // Update the display
        enemiesRemainingElement.textContent = `Enemies: ${newCount}`;
    }
    
    // Remove enemy from active arrays
    const index = activeEnemies.indexOf(enemy);
    if (index !== -1) {
        activeEnemies.splice(index, 1);
    }
    
    // Create defeat animation
    createEnemyDefeatAnimation(enemy);
    
    // Remove enemy from scene
    scene.remove(enemy);
    
    // Check if round is complete
    if (activeEnemies.length === 0 && !spawnQueueActive) {
        endRound();
    }
}

// Function to create enemy defeat animation
function createEnemyDefeatAnimation(enemy) {
    // Create explosion effect
    const particles = [];
    const particleCount = 15;
    
    for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const material = new THREE.MeshBasicMaterial({
            color: enemy.material.color,
            transparent: true,
            opacity: 0.8
        });
        
        const particle = new THREE.Mesh(geometry, material);
        particle.position.copy(enemy.position);
        
        // Random velocity
        particle.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.2 + 0.1,
                (Math.random() - 0.5) * 0.2
            ),
            gravity: 0.01,
            lifetime: 1000,
            spawnTime: performance.now()
        };
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Animate particles
    function animateParticles() {
        const now = performance.now();
        let allDone = true;
        
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            const elapsed = now - particle.userData.spawnTime;
            
            if (elapsed > particle.userData.lifetime) {
                scene.remove(particle);
                particles.splice(i, 1);
                continue;
            }
            
            // Still have active particles
            allDone = false;
            
            // Update position
            particle.position.x += particle.userData.velocity.x;
            particle.position.y += particle.userData.velocity.y;
            particle.position.z += particle.userData.velocity.z;
            
            // Fade out
            const progress = elapsed / particle.userData.lifetime;
            particle.material.opacity = 0.8 * (1 - progress);
        }
        
        if (!allDone) {
            requestAnimationFrame(animateParticles);
        }
    }
    
    animateParticles();
}

// Function to end a round
function endRound() {
    isRoundActive = false;
    
    // Calculate time until next round with 60 second cap
    const baseWait = betweenRoundTime + (currentRound - 1) * 5;
    const betweenRoundWait = Math.min(60, baseWait); // Cap at 60 seconds maximum
    
    // Show next round message
    if (currentRound < totalRounds) {
        showNotification(`Round ${currentRound} Complete!\nNext round starting in ${betweenRoundWait} seconds...`);
        
        // Start countdown to next round
        startCountdown(betweenRoundWait, () => {
            startNextRound();
        });
    } else {
        // Last round completed
        showVictoryScreen();
    }
}

// Add this function near your other UI functions
function showNotification(message, duration = 3000) {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.position = 'fixed';
        notification.style.top = '20%';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        notification.style.color = 'white';
        notification.style.padding = '15px 20px';
        notification.style.borderRadius = '5px';
        notification.style.fontSize = '18px';
        notification.style.textAlign = 'center';
        notification.style.zIndex = '1001';
        notification.style.pointerEvents = 'none';
        notification.style.transition = 'opacity 0.3s';
        notification.style.whiteSpace = 'pre-line';
        document.body.appendChild(notification);
    }
    
    // Set message and show notification
    notification.textContent = message;
    notification.style.opacity = '1';
    
    // Hide after duration
    setTimeout(() => {
        notification.style.opacity = '0';
    }, duration);
}

// Update the handlePlayerDeath function to close shop and inventory
function handlePlayerDeath() {
    isGameOver = true;
    
    // Close shop if it's open
    if (isShopOpen) {
        isShopOpen = false;
        document.getElementById('shop').style.display = 'none';
    }
    
    // Close inventory if it's open
    if (isInventoryOpen) {
        isInventoryOpen = false;
        document.getElementById('inventory').style.display = 'none';
    }
    
    // Make sure to exit pointer lock
    if (document.pointerLockElement) {
        document.exitPointerLock();
    }
    
    // Hide HUD elements and crosshair
    document.getElementById('hud').style.display = 'none';
    hideCrosshair(); 
    
    // Show game over message
    showNotification("You have been defeated!", 2500);
    
    // Add 2.5 second delay before showing the game over menu
    setTimeout(() => {
        // Create game over screen
        const gameOverScreen = document.createElement('div');
        gameOverScreen.id = 'gameOverScreen';
        gameOverScreen.style.position = 'absolute';
        gameOverScreen.style.top = '0';
        gameOverScreen.style.left = '0';
        gameOverScreen.style.width = '100%';
        gameOverScreen.style.height = '100%';
        gameOverScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        gameOverScreen.style.display = 'flex';
        gameOverScreen.style.justifyContent = 'center';
        gameOverScreen.style.alignItems = 'center';
        gameOverScreen.style.zIndex = '2000';
        gameOverScreen.style.pointerEvents = 'auto';
        
        // Inner container
        gameOverScreen.innerHTML = `
            <div style="background-color: #3a1c1c; padding: 30px; border-radius: 10px; text-align: center; pointer-events: auto;">
                <h1 style="font-size: 36px; margin-bottom: 20px; color: #ff0000;">GAME OVER</h1>
                <button id="gameOverReturnButton" style="padding: 12px 24px; background-color: #880000; color: white; border: none; border-radius: 5px; font-size: 18px; cursor: pointer;">Return to Main Menu</button>
            </div>
        `;
        
        document.body.appendChild(gameOverScreen);
        
        // Force mouse cursor to be visible
        document.body.style.cursor = 'auto';
        
        // Add event listener to the return button
        document.getElementById('gameOverReturnButton').addEventListener('click', () => {
            window.location.reload(); // This acts exactly like pressing F5
        });
    }, 2500);
}

// Function to show victory screen
function showVictoryScreen() {
    // Show victory screen
    document.getElementById('victoryScreen').style.display = 'flex';
    
    // Update stats display
    document.getElementById('damageDealt').textContent = `Damage Dealt: ${gameStats.damageDealt}`;
    document.getElementById('damageTaken').textContent = `Damage Taken: ${gameStats.damageTaken}`;
    
    // Clear existing enemy stats first
    const enemyStatsContainer = document.getElementById('enemiesDefeated');
    
    // Keep the container title but remove old stats
    const containerTitle = enemyStatsContainer.querySelector('div');
    enemyStatsContainer.innerHTML = '';
    enemyStatsContainer.appendChild(containerTitle);
    
    // Add all standard enemy types
    addEnemyStat(enemyStatsContainer, 'Normal', gameStats.kills.normal);
    addEnemyStat(enemyStatsContainer, 'Tank', gameStats.kills.tank);
    addEnemyStat(enemyStatsContainer, 'Ranged', gameStats.kills.ranged);
    addEnemyStat(enemyStatsContainer, 'Speeder', gameStats.kills.speeder);
    addEnemyStat(enemyStatsContainer, 'Exploder', gameStats.kills.exploder);
    addEnemyStat(enemyStatsContainer, 'Shielder', gameStats.kills.shielder);
    addEnemyStat(enemyStatsContainer, 'Teleporter', gameStats.kills.teleporter);
    addEnemyStat(enemyStatsContainer, 'Healer', gameStats.kills.healer);
    addEnemyStat(enemyStatsContainer, 'Elite', gameStats.kills.elite);
    addEnemyStat(enemyStatsContainer, 'Bosses', gameStats.kills.boss);
    
    // Disable pointer lock if active
    if (document.pointerLockElement) {
        document.exitPointerLock();
    }
    
    // Play victory sound or animation if implemented
    playVictorySound();
}

// Helper function to add enemy stat to container
function addEnemyStat(container, label, count) {
    const statDiv = document.createElement('div');
    statDiv.className = 'enemy-stat';
    statDiv.textContent = `${label}: ${count}`;
    container.appendChild(statDiv);
}

// Improve the cleanupGameUI function to handle all menus
function cleanupGameUI() {
    // Remove crosshair
    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
        crosshair.remove();
    }
    
    // Remove ammo display
    const ammoContainer = document.getElementById('ammoContainer');
    if (ammoContainer) {
        ammoContainer.remove();
    }
    
    // Also remove coin container
    const coinContainer = document.getElementById('coinContainer');
    if (coinContainer) {
        coinContainer.remove();
    }
    
    // Make sure shop is closed and hidden
    isShopOpen = false;
    document.getElementById('shop').style.display = 'none';
    
    // Make sure inventory is closed and hidden
    isInventoryOpen = false;
    document.getElementById('inventory').style.display = 'none';
    
    // IMPORTANT FIX: Hide the main HUD container
    const hud = document.getElementById('hud');
    if (hud) {
        hud.style.display = 'none';
    }
}

// Function to reset game state
function resetGame() {
    // Clean up ALL enemies (not just activeEnemies)
    for (let i = 0; i < enemies.length; i++) {
        if (enemies[i] && enemies[i].parent) {
            scene.remove(enemies[i]);
        }
    }
    
    // Clean up projectiles
    for (const projectile of projectiles) {
        if (projectile && projectile.parent) {
            scene.remove(projectile);
        }
    }
    
    // Clean up bullets
    for (const bullet of bullets) {
        if (bullet && bullet.parent) {
            scene.remove(bullet);
        }
    }

    // Clear abandoned cars
    for (const car of abandonedCars) {
        if (car.parent) {
            scene.remove(car);
        }
    }
    
    // Clear all arrays
    abandonedCars = [];
    enemies = [];
    activeEnemies = [];
    projectiles.length = 0;
    bullets.length = 0;
    roadLampObjects = [];

    // Clear mountains
    mountains.forEach(mountain => scene.remove(mountain));
    mountains = [];
    
    // Remove player from scene if it exists
    if (player) {
        // Make sure to remove weapon models from camera first
        if (knifeModel) {
            camera.remove(knifeModel);
            knifeModel = null;
        }
        if (pistolModel) {
            camera.remove(pistolModel);
            pistolModel = null;
        }
        if (heldConsumableModel) {
            camera.remove(heldConsumableModel);
            heldConsumableModel = null;
        }
        scene.remove(player);
        player = null; 
    }
    
    // Clean up UI elements
    cleanupGameUI();

    clearRoadBlockades();
    
    // Reset game state
    isRoundActive = false;
    isGameOver = false;
    currentRound = 0;
    
    // Reset player stats
    health = 100;
    shield = 0;
    playerCoins = 0;
    
    // Reset weapon stats
    pistolAmmo = pistolMaxAmmo;
    pistolReloading = false;
    
    // Clear any running countdown
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    
    // Make sure coin system is reset
    infiniteMoneyCheat = false;
    if (originalCoinColor) {
        const coinDisplay = document.getElementById('coinDisplay');
        if (coinDisplay) {
            coinDisplay.style.color = originalCoinColor;
        }
    }
}

// Function to create a visual formation effect for void zones
function createVoidZoneFormation(position, zoneObject) {
    // Create particles that converge to form the void zone
    const particleCount = 30;
    const particles = [];
    
    // Create a light for the formation effect
    const formationLight = new THREE.PointLight(0x8800ff, 2, 10);
    formationLight.position.copy(position);
    formationLight.position.y += 2;
    scene.add(formationLight);
    
    // Create particles around the void zone
    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0x8800ff,
            transparent: true,
            opacity: 0.7
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Position particles in a circle around the target position
        const angle = (i / particleCount) * Math.PI * 2;
        const radius = 8 + Math.random() * 4; // Random radius between 8-12
        
        particle.position.set(
            position.x + Math.cos(angle) * radius,
            position.y + Math.random() * 5,
            position.z + Math.sin(angle) * radius
        );
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Animate particles converging to form the void zone
    const formationDuration = 1500; // 1.5 seconds
    const startTime = performance.now();
    
    function animateFormation() {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / formationDuration, 1);
        
        // Move particles toward center and fade out
        for (const particle of particles) {
            if (!particle.parent) continue;
            
            // Calculate direction to center
            const direction = new THREE.Vector3()
                .subVectors(position, particle.position)
                .normalize();
            
            // Move particle toward center
            particle.position.add(direction.multiplyScalar(0.2));
            
            // Shrink particle as it approaches center
            const scale = 1 - progress * 0.8;
            particle.scale.set(scale, scale, scale);
            
            // Fade out at the end
            if (progress > 0.7) {
                particle.material.opacity = 0.7 * (1 - (progress - 0.7) / 0.3);
            }
        }
        
        // Pulse light
        if (formationLight.parent) {
            formationLight.intensity = 2 * (1 - progress) * (0.7 + 0.3 * Math.sin(progress * Math.PI * 10));
        }
        
        // Grow the void zone
        if (zoneObject && zoneObject.parent) {
            zoneObject.scale.set(progress, 1, progress);
            zoneObject.material.opacity = progress * 0.5;
        }
        
        if (progress < 1) {
            requestAnimationFrame(animateFormation);
        } else {
            // Clean up particles and light when done
            particles.forEach(particle => {
                if (particle.parent) scene.remove(particle);
            });
            
            if (formationLight.parent) scene.remove(formationLight);
        }
    }
    
    requestAnimationFrame(animateFormation);
}

// Function to create phase transition effect when Mega Boss changes phase
function createPhaseTransitionEffect(boss) {
    // Create expanding ring effect
    const ringGeometry = new THREE.RingGeometry(0.5, 1, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: boss.material.color.clone(),
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2; // Lay flat
    ring.position.copy(boss.position);
    ring.position.y = 0.1; // Just above ground
    scene.add(ring);
    
    // Create vertical energy beam
    const beamGeometry = new THREE.CylinderGeometry(1, 1, 20, 16);
    const beamMaterial = new THREE.MeshBasicMaterial({
        color: boss.material.color.clone(),
        transparent: true,
        opacity: 0.5
    });
    
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.copy(boss.position);
    beam.position.y += 10; // Position beam above boss
    scene.add(beam);
    
    // Create particles for explosion effect
    const particles = [];
    const particleCount = 40;
    
    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: boss.material.color.clone(),
            transparent: true,
            opacity: 0.8
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Position at boss
        particle.position.copy(boss.position);
        
        // Random velocity outward
        const angle = Math.random() * Math.PI * 2;
        const height = Math.random() * 2;
        const speed = 0.05 + Math.random() * 0.1;
        
        particle.userData = {
            velocity: new THREE.Vector3(
                Math.cos(angle) * speed,
                height * 0.05,
                Math.sin(angle) * speed
            ),
            lifetime: 1000 + Math.random() * 1000,
            spawnTime: performance.now()
        };
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Create intense light at boss position
    const light = new THREE.PointLight(boss.material.color.clone(), 3, 20);
    light.position.copy(boss.position);
    light.position.y += 2;
    scene.add(light);
    
    // Animate the phase transition effect
    const duration = 2000; // 2 seconds
    const startTime = performance.now();
    
    function animatePhaseTransition() {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Expand ring
        const ringScale = 1 + progress * 15;
        ring.scale.set(ringScale, ringScale, 1);
        
        // Animate beam
        beam.scale.y = 1 + Math.sin(progress * Math.PI) * 0.5;
        beam.material.opacity = 0.5 * (1 - progress);
        
        // Pulse light
        light.intensity = 3 * (1 - progress) * (0.7 + 0.3 * Math.sin(progress * Math.PI * 10));
        
        // Fade out ring
        ring.material.opacity = 0.7 * (1 - progress);
        
        // Update particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            if (!particle.parent) continue;
            
            const particleElapsed = now - particle.userData.spawnTime;
            
            if (particleElapsed > particle.userData.lifetime) {
                scene.remove(particle);
                particles.splice(i, 1);
                continue;
            }
            
            // Update position
            particle.position.add(particle.userData.velocity);
            
            // Fade out
            const particleProgress = particleElapsed / particle.userData.lifetime;
            particle.material.opacity = 0.8 * (1 - particleProgress);
        }
        
        if (progress < 1) {
            requestAnimationFrame(animatePhaseTransition);
        } else {
            // Clean up
            scene.remove(ring);
            scene.remove(beam);
            scene.remove(light);
            
            // Remove any remaining particles
            particles.forEach(particle => {
                if (particle.parent) scene.remove(particle);
            });
        }
    }
    
    requestAnimationFrame(animatePhaseTransition);
}

// Function to create warning visual for ground slam
function createSlamWarning(position, radius) {
    // Create warning ring on ground
    const ringGeometry = new THREE.RingGeometry(radius - 0.5, radius, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2; // Lay flat
    ring.position.copy(position);
    ring.position.y = 0.1; // Just above ground
    scene.add(ring);
    
    // Create inner circle showing affected area
    const circleGeometry = new THREE.CircleGeometry(radius - 0.5, 32);
    const circleMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    
    const circle = new THREE.Mesh(circleGeometry, circleMaterial);
    circle.rotation.x = -Math.PI / 2; // Lay flat
    circle.position.copy(position);
    circle.position.y = 0.11; // Slightly above ring
    scene.add(circle);
    
    // Animate warning
    const duration = 1500; // Should match the delay in wardenGroundSlam
    const startTime = performance.now();
    const pulseCount = 3; // Number of pulses during warning
    
    function animateWarning() {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
            scene.remove(ring);
            scene.remove(circle);
            return;
        }
        
        // Pulse the opacity
        const pulseProgress = (progress * pulseCount) % 1;
        const pulseOpacity = 0.3 + 0.7 * Math.sin(pulseProgress * Math.PI);
        
        ring.material.opacity = pulseOpacity;
        circle.material.opacity = pulseOpacity * 0.5;
        
        // Gradually increase color intensity
        const intensity = progress;
        ring.material.color.setRGB(1, 0.3 * (1 - intensity), 0);
        circle.material.color.setRGB(1, 0.3 * (1 - intensity), 0);
        
        requestAnimationFrame(animateWarning);
    }
    
    requestAnimationFrame(animateWarning);
}

// Function to create charging effect for death ray
function createDeathRayChargingEffect(boss) {
    // Create glowing orb at boss position
    const orbGeometry = new THREE.SphereGeometry(1, 16, 16);
    const orbMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.7
    });
    
    const orb = new THREE.Mesh(orbGeometry, orbMaterial);
    orb.position.copy(boss.position);
    orb.position.y += boss.geometry.parameters.height * 0.6; // At upper part of boss
    scene.add(orb);
    
    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(1.5, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(orb.position);
    scene.add(glow);
    
    // Create light
    const light = new THREE.PointLight(0xff0000, 2, 10);
    light.position.copy(orb.position);
    scene.add(light);
    
    // Create particles converging toward the orb
    const particles = [];
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.8
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Random position around boss
        const angle = Math.random() * Math.PI * 2;
        const heightOffset = Math.random() * boss.geometry.parameters.height;
        const radius = 3 + Math.random() * 4;
        
        particle.position.set(
            boss.position.x + Math.cos(angle) * radius,
            boss.position.y + heightOffset,
            boss.position.z + Math.sin(angle) * radius
        );
        
        // Store target position (the orb)
        particle.userData = {
            target: orb.position.clone(),
            speed: 0.01 + Math.random() * 0.02,
            startTime: performance.now(),
            lifetime: 2000, // Should match charge time
            spawnDelay: Math.random() * 1000 // Stagger spawning
        };
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Store handles for cleanup
    boss.userData.deathRayChargingEffects = {
        orb,
        glow,
        light,
        particles
    };
    
    // Animate charging effect
    const duration = 2000; // 2 seconds (should match the delay in the calling function)
    const startTime = performance.now();
    
    function animateCharging() {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Grow the orb
        const scale = 1 + progress;
        orb.scale.set(scale, scale, scale);
        
        // Pulse the glow
        const pulseScale = 1 + 0.3 * Math.sin(progress * Math.PI * 10);
        glow.scale.set(scale * pulseScale, scale * pulseScale, scale * pulseScale);
        
        // Increase light intensity
        light.intensity = 2 + 3 * progress;
        
        // Update particles
        for (const particle of particles) {
            // Check if particle should be visible yet
            if (now - startTime < particle.userData.spawnDelay) continue;
            
            // Direction to target
            const direction = new THREE.Vector3().subVectors(particle.userData.target, particle.position);
            const distance = direction.length();
            
            // Move faster as charging progresses
            const speedMultiplier = 1 + progress * 3;
            
            if (distance > 0.1) {
                // Move toward orb
                particle.position.add(direction.normalize().multiplyScalar(particle.userData.speed * speedMultiplier));
            } else {
                // Reached the orb, reset to a new position
                const newAngle = Math.random() * Math.PI * 2;
                const newRadius = 5 + Math.random() * 5;
                
                particle.position.set(
                    boss.position.x + Math.cos(newAngle) * newRadius,
                    boss.position.y + Math.random() * boss.geometry.parameters.height,
                    boss.position.z + Math.sin(newAngle) * newRadius
                );
            }
        }
        
        if (progress < 1) {
            requestAnimationFrame(animateCharging);
        }
        // Don't remove the effects after charging completes - they'll be used by the death ray
    }
    
    requestAnimationFrame(animateCharging);
}

// Function to create the death ray beam effect
function createDeathRayBeam(boss) {
    // Use the charging effects if they exist
    const chargingEffects = boss.userData.deathRayChargingEffects;
    if (!chargingEffects) return;
    
    // Get orb position as the source of the beam
    const sourcePosition = chargingEffects.orb.position.clone();
    
    // Calculate target direction (toward player with slight tracking)
    const targetDirection = new THREE.Vector3().subVectors(player.position, sourcePosition).normalize();
    
    // Create beam geometry (long cylinder)
    const beamGeometry = new THREE.CylinderGeometry(0.5, 0.5, 100, 16);
    const beamMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.7
    });
    
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    
    // Position and orient beam to point from source to target direction
    beam.position.copy(sourcePosition);
    
    // Move the beam forward in the direction of the target
    beam.position.add(targetDirection.clone().multiplyScalar(50));
    
    // Rotate the beam to align with the direction
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), targetDirection);
    
    scene.add(beam);
    
    // Create core beam (smaller, brighter)
    const coreGeometry = new THREE.CylinderGeometry(0.2, 0.2, 100, 16);
    const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffaa,
        transparent: true,
        opacity: 0.9
    });
    
    const coreBeam = new THREE.Mesh(coreGeometry, coreMaterial);
    coreBeam.position.copy(beam.position);
    coreBeam.quaternion.copy(beam.quaternion);
    scene.add(coreBeam);
    
    // Create impact flare at end of beam
    const flareGeometry = new THREE.SphereGeometry(1, 16, 16);
    const flareMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.7
    });
    
    const flare = new THREE.Mesh(flareGeometry, flareMaterial);
    // Position flare at the beam's end toward the player direction
    flare.position.copy(sourcePosition.clone().add(targetDirection.clone().multiplyScalar(100)));
    scene.add(flare);
    
    // Create intense light at the source
    const sourceLight = new THREE.PointLight(0xff0000, 3, 15);
    sourceLight.position.copy(sourcePosition);
    scene.add(sourceLight);
    
    // Create light at the impact point
    const impactLight = new THREE.PointLight(0xff5500, 2, 10);
    impactLight.position.copy(flare.position);
    scene.add(impactLight);
    
    // Store handles for animation and cleanup
    boss.userData.deathRayBeamEffects = {
        beam,
        coreBeam,
        flare,
        sourceLight,
        impactLight,
        targetDirection,
        sourcePosition
    };
    
    // Animate the beam
    const duration = boss.userData.deathRayDuration || 5000;
    const startTime = performance.now();
    
    function animateDeathRay() {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1 || !boss.parent) {
            // Clean up effects
            scene.remove(beam);
            scene.remove(coreBeam);
            scene.remove(flare);
            scene.remove(sourceLight);
            scene.remove(impactLight);
            
            // Clean up charging effects
            if (chargingEffects) {
                scene.remove(chargingEffects.orb);
                scene.remove(chargingEffects.glow);
                scene.remove(chargingEffects.light);
                
                chargingEffects.particles.forEach(particle => {
                    if (particle.parent) scene.remove(particle);
                });
                
                delete boss.userData.deathRayChargingEffects;
                delete boss.userData.deathRayBeamEffects;
            }
            
            boss.userData.deathRayActive = false;
            return;
        }
        
        // Update beam direction to slowly track player
        const currentDirection = boss.userData.deathRayBeamEffects.targetDirection;
        const newDirection = new THREE.Vector3().subVectors(player.position, sourcePosition).normalize();
        
        // Limit tracking speed (lerp factor)
        const trackingSpeed = 0.02;
        currentDirection.lerp(newDirection, trackingSpeed);
        
        // Update beam position and orientation
        beam.position.copy(sourcePosition);
        beam.position.add(currentDirection.clone().multiplyScalar(50));
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), currentDirection);
        
        // Update core beam to match
        coreBeam.position.copy(beam.position);
        coreBeam.quaternion.copy(beam.quaternion);
        
        // Update flare position
        flare.position.copy(sourcePosition.clone().add(currentDirection.clone().multiplyScalar(100)));
        impactLight.position.copy(flare.position);
        
        // Pulse effects
        const pulseIntensity = 0.8 + 0.2 * Math.sin(elapsed * 0.01);
        sourceLight.intensity = 3 * pulseIntensity;
        impactLight.intensity = 2 * pulseIntensity;
        
        // Animate core beam for energy flow effect
        const flowOffset = (elapsed * 0.005) % 1;
        coreMaterial.opacity = 0.7 + 0.3 * Math.sin(flowOffset * Math.PI * 10);
        
        requestAnimationFrame(animateDeathRay);
    }
    
    requestAnimationFrame(animateDeathRay);
}

// Function to apply damage from death ray
function applyDeathRayDamage(boss) {
    if (!boss.userData.deathRayBeamEffects) return;
    
    // Get beam direction and source
    const sourcePosition = boss.userData.deathRayBeamEffects.sourcePosition;
    const direction = boss.userData.deathRayBeamEffects.targetDirection;
    
    // Create a damage interval
    const damageInterval = setInterval(() => {
        if (!boss.parent || !boss.userData.deathRayActive) {
            clearInterval(damageInterval);
            return;
        }
        
        // Check if player is in the beam's path
        // Calculate vector from source to player
        const toPlayer = new THREE.Vector3().subVectors(player.position, sourcePosition);
        
        // Project this vector onto the beam direction
        const projectionLength = toPlayer.dot(direction);
        
        // Shortest distance from player to beam line
        const projection = direction.clone().multiplyScalar(projectionLength);
        const closestPoint = sourcePosition.clone().add(projection);
        const distanceToBeam = player.position.distanceTo(closestPoint);
        
        // Check if player is close enough to the beam to take damage
        const beamRadius = 2; // Effective damage radius of beam
        
        if (distanceToBeam < beamRadius && projectionLength > 0) {
            // Apply damage to player
            takeDamage(boss.userData.deathRayDamage / 10); // Damage per tick
            
            // Visual effect for player taking damage
            createHitEffect(player.position);
        }
        
    }, 100); // Check damage every 100ms
    
    // Store interval for cleanup
    boss.userData.deathRayDamageInterval = damageInterval;
    
    // Clean up interval when beam ends
    setTimeout(() => {
        clearInterval(damageInterval);
    }, boss.userData.deathRayDuration);
}

// Function to create a warning indicator for meteor strikes
function createMeteorWarning(position) {
    // Create a red circle on the ground
    const circleGeometry = new THREE.CircleGeometry(2, 32);
    const circleMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    
    const circle = new THREE.Mesh(circleGeometry, circleMaterial);
    circle.rotation.x = -Math.PI / 2; // Lay flat
    circle.position.copy(position);
    circle.position.y = 0.1; // Just above ground
    scene.add(circle);
    
    // Create target rings
    const ringGeometry = new THREE.RingGeometry(1.8, 2, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xff5500,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2; // Lay flat
    ring.position.copy(position);
    ring.position.y = 0.12; // Just above circle
    scene.add(ring);
    
    // Animate warning
    const duration = 2000; // 2 seconds (should match delay in parent function)
    const startTime = performance.now();
    
    function animateWarning() {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
            scene.remove(circle);
            scene.remove(ring);
            return;
        }
        
        // Pulse opacity
        const pulseOpacity = 0.3 + 0.7 * Math.sin(progress * Math.PI * 5);
        circle.material.opacity = pulseOpacity * 0.5;
        ring.material.opacity = pulseOpacity * 0.7;
        
        // Shrink ring as time progresses (closing in effect)
        const ringScale = 1.5 - 0.5 * progress;
        ring.scale.set(ringScale, ringScale, 1);
        
        // Increase color intensity
        const intensity = progress;
        circle.material.color.setRGB(1, 0.3 * (1 - intensity), 0);
        ring.material.color.setRGB(1, 0.2 * (1 - intensity), 0);
        
        requestAnimationFrame(animateWarning);
    }
    
    requestAnimationFrame(animateWarning);
}

// Function to create meteor impact effect
function createMeteorImpact(position, damage) {
    // Create meteor object
    const meteorGeometry = new THREE.SphereGeometry(1, 16, 16);
    const meteorMaterial = new THREE.MeshStandardMaterial({
        color: 0xff3300,
        emissive: 0xff0000,
        emissiveIntensity: 1
    });
    
    const meteor = new THREE.Mesh(meteorGeometry, meteorMaterial);
    
    // Start position high in the sky
    meteor.position.set(
        position.x,
        position.y + 50, // Start high above
        position.z
    );
    
    scene.add(meteor);
    
    // Add trail effect
    const trail = [];
    
    // Create light
    const light = new THREE.PointLight(0xff5500, 2, 10);
    light.position.copy(meteor.position);
    scene.add(light);
    
    // Animate meteor falling
    const fallDuration = 1000; // 1 second
    const startTime = performance.now();
    
    function animateMeteorFall() {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / fallDuration, 1);
        
        if (progress >= 1) {
            // Create explosion at impact
            createExplosion(position, 3, damage);
            
            // Check if player is within damage radius
            const distanceToPlayer = position.distanceTo(player.position);
            if (distanceToPlayer < 3) {
                takeDamage(damage * (1 - distanceToPlayer/3)); // Scale damage by distance
            }
            
            // Add screen shake
            addScreenShake(0.5, 500);
            
            // Remove meteor and light
            scene.remove(meteor);
            scene.remove(light);
            
            // Clean up trail particles
            trail.forEach(particle => {
                if (particle.parent) scene.remove(particle);
            });
            
            return;
        }
        
        // Update meteor position (cubic ease-in for acceleration)
        const cubicProgress = progress * progress * progress;
        meteor.position.y = 50 + (position.y - 50) * cubicProgress;
        
        // Add trail particles occasionally
        if (Math.random() > 0.6) {
            const trailGeometry = new THREE.SphereGeometry(0.3, 8, 8);
            const trailMaterial = new THREE.MeshBasicMaterial({
                color: 0xff3300,
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(trailGeometry, trailMaterial);
            particle.position.copy(meteor.position);
            particle.userData = {
                lifetime: 500,
                spawnTime: now
            };
            
            scene.add(particle);
            trail.push(particle);
        }
        
        // Update trail particles
        for (let i = trail.length - 1; i >= 0; i--) {
            const particle = trail[i];
            const particleElapsed = now - particle.userData.spawnTime;
            
            if (particleElapsed > particle.userData.lifetime) {
                scene.remove(particle);
                trail.splice(i, 1);
                continue;
            }
            
            // Fade out
            const particleProgress = particleElapsed / particle.userData.lifetime;
            particle.material.opacity = 0.8 * (1 - particleProgress);
            
            // Shrink
            const scale = 1 - particleProgress;
            particle.scale.set(scale, scale, scale);
        }
        
        // Update light position
        light.position.copy(meteor.position);
        
        requestAnimationFrame(animateMeteorFall);
    }
    
    requestAnimationFrame(animateMeteorFall);
}

// Function to create reality warp effect
function createRealityWarpEffect() {
    // We'll use a full-screen effect for this
    const warpOverlay = document.createElement('div');
    warpOverlay.id = 'realityWarp';
    warpOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle, transparent 20%, rgba(255, 0, 255, 0.1) 70%, rgba(255, 0, 255, 0.3) 100%);
        pointer-events: none;
        z-index: 1000;
        animation: warpPulse 4s infinite alternate;
        mix-blend-mode: screen;
    `;
    
    // Add keyframe animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes warpPulse {
            0% { opacity: 0.3; filter: hue-rotate(0deg); }
            50% { opacity: 0.6; filter: hue-rotate(180deg); }
            100% { opacity: 0.3; filter: hue-rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(warpOverlay);
    
    // Create distortion ripples in the 3D scene
    const ripples = [];
    const rippleCount = 3;
    
    for (let i = 0; i < rippleCount; i++) {
        const rippleGeometry = new THREE.RingGeometry(2, 3, 32);
        const rippleMaterial = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        
        const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial);
        ripple.rotation.x = -Math.PI / 2; // Lay flat
        ripple.position.copy(player.position);
        ripple.position.y = 0.1; // Just above ground
        
        // Random initial scale and speed
        ripple.userData = {
            initialScale: 1 + i * 2,
            pulseSpeed: 0.3 + i * 0.2
        };
        
        scene.add(ripple);
        ripples.push(ripple);
    }
    
    // Add floating particles for ethereal effect
    const particles = [];
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(Math.random(), 1, 0.5),
            transparent: true,
            opacity: 0.7
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Position randomly around player
        const radius = 10 + Math.random() * 10;
        const angle = Math.random() * Math.PI * 2;
        
        particle.position.set(
            player.position.x + Math.cos(angle) * radius,
            player.position.y + Math.random() * 5,
            player.position.z + Math.sin(angle) * radius
        );
        
        // Set random movement parameters
        particle.userData = {
            speed: 0.02 + Math.random() * 0.02,
            angle: Math.random() * Math.PI * 2,
            verticalSpeed: 0.01 + Math.random() * 0.01,
            verticalDir: Math.random() > 0.5 ? 1 : -1,
            pulseSpeed: 0.5 + Math.random()
        };
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Store handles for animation and cleanup
    window.realityWarpEffects = {
        overlay: warpOverlay,
        ripples,
        particles,
        active: true
    };
    
    // Animate the reality warp effect
    function animateRealityWarp() {
        if (!window.realityWarpEffects || !window.realityWarpEffects.active) return;
        
        const now = performance.now() * 0.001; // Convert to seconds
        
        // Update ripples - they follow the player
        for (const ripple of ripples) {
            if (!ripple.parent) continue;
            
            // Update position to follow player
            ripple.position.x = player.position.x;
            ripple.position.z = player.position.z;
            
            // Pulse scale
            const pulseScale = ripple.userData.initialScale + Math.sin(now * ripple.userData.pulseSpeed) * 1;
            ripple.scale.set(pulseScale, pulseScale, 1);
            
            // Cycle colors
            const hue = (now * 0.1) % 1;
            ripple.material.color.setHSL(hue, 1, 0.5);
        }
        
        // Update particles
        for (const particle of particles) {
            if (!particle.parent) continue;
            
            // Update angle for circular movement
            particle.userData.angle += particle.userData.speed;
            
            // Calculate center (relative to player)
            const centerX = player.position.x;
            const centerZ = player.position.z;
            
            // Radius from center
            const dx = particle.position.x - centerX;
            const dz = particle.position.z - centerZ;
            const radius = Math.sqrt(dx * dx + dz * dz);
            
            // Update position for circular motion
            particle.position.x = centerX + Math.cos(particle.userData.angle) * radius;
            particle.position.z = centerZ + Math.sin(particle.userData.angle) * radius;
            
            // Vertical oscillation
            particle.position.y += particle.userData.verticalSpeed * particle.userData.verticalDir;
            
            // Reverse vertical direction if too high or too low
            if (particle.position.y > 8 || particle.position.y < 0.1) {
                particle.userData.verticalDir *= -1;
            }
            
            // Pulse scale and color
            const time = now * particle.userData.pulseSpeed;
            const scale = 1 + 0.5 * Math.sin(time);
            particle.scale.set(scale, scale, scale);
            
            // Cycle colors
            const hue = (time * 0.1) % 1;
            particle.material.color.setHSL(hue, 1, 0.5);
        }
        
        requestAnimationFrame(animateRealityWarp);
    }
    
    animateRealityWarp();
}

// Function to apply gameplay effects during reality warp
function applyRealityWarpEffects() {
    // Store original movement settings
    window.originalMovementSettings = {
        gravity: GRAVITY, // Assuming this is the normal gravity
        moveSpeedMultiplier: 1.0
    };
    
    // Make gravity inconsistent
    window.temporaryGravity = GRAVITY / 2;

    window.useTemporaryGravity = true; 
    
    // Apply screen distortion via CSS filter
    document.getElementById('gameScene').style.filter = "hue-rotate(0deg)";
    document.getElementById('gameScene').style.animation = "hueRotate 5s infinite linear";
    
    // Add style for hue rotation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes hueRotate {
            0% { filter: hue-rotate(0deg) blur(0px); }
            50% { filter: hue-rotate(180deg) blur(1px); }
            100% { filter: hue-rotate(360deg) blur(0px); }
        }
    `;
    document.head.appendChild(style);
    
    // Add inverted controls randomly
    window.realityWarpInterval = setInterval(() => {
        // 20% chance to invert controls each second
        if (Math.random() > 0.8) {
            invertControls();
            
            // Show notification
            showNotification("Reality Shifting: Controls Inverted!", 1000);
            
            // Return to normal after 1-3 seconds
            setTimeout(resetControls, 1000 + Math.random() * 2000);
        }
    }, 2000);
}

// Function to invert controls
function invertControls() {
    // Save original key states
    window.originalKeys = {};
    for (let key in keys) {
        window.originalKeys[key] = key;
    }
    
    // Swap WASD
    const temp = keys.w;
    keys.w = keys.s;
    keys.s = temp;
    
    const tempAD = keys.a;
    keys.a = keys.d;
    keys.d = tempAD;
}

// Function to reset controls
function resetControls() {
    // If original keys saved, restore them
    if (window.originalKeys) {
        for (let key in window.originalKeys) {
            keys[key] = window.originalKeys[key];
        }
    }
}

// Function to reset reality warp effects
function resetRealityWarpEffects() {
    // Remove overlay
    if (window.realityWarpEffects) {
        // Remove overlay
        if (window.realityWarpEffects.overlay && window.realityWarpEffects.overlay.parentNode) {
            window.realityWarpEffects.overlay.parentNode.removeChild(window.realityWarpEffects.overlay);
        }
        
        // Stop tracking ripples and particles
        window.realityWarpEffects.ripples.forEach(ripple => {
            if (ripple.parent) scene.remove(ripple);
        });
        
        window.realityWarpEffects.particles.forEach(particle => {
            if (particle.parent) scene.remove(particle);
        });
        
        // Mark as inactive
        window.realityWarpEffects.active = false;
    }
    
    // Clear interval
    if (window.realityWarpInterval) {
        clearInterval(window.realityWarpInterval);
        window.realityWarpInterval = null;
    }
    
    // Disable temporary gravity instead of modifying GRAVITY constant
    window.useTemporaryGravity = false;
    
    // Reset controls
    resetControls();
    
    // Remove screen effects
    document.getElementById('gameScene').style.filter = "none";
    document.getElementById('gameScene').style.animation = "none";
}

// Function to create visual effect for void zone damage
function createVoidDamageEffect(position) {
    // Create purple particle burst at player position
    const particles = [];
    const particleCount = 15;
    
    for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.SphereGeometry(0.05 + Math.random() * 0.1, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0x8800ff,
            transparent: true,
            opacity: 0.8
        });
        
        const particle = new THREE.Mesh(geometry, material);
        
        // Position at player but slightly random
        particle.position.copy(position);
        particle.position.x += (Math.random() - 0.5) * 0.5;
        particle.position.y += 1 + Math.random() * 0.5; // Above ground
        particle.position.z += (Math.random() - 0.5) * 0.5;
        
        // Random velocity
        particle.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.05,
                Math.random() * 0.1,
                (Math.random() - 0.5) * 0.05
            ),
            lifetime: 500 + Math.random() * 200,
            spawnTime: performance.now()
        };
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Animate particles
    function animateParticles() {
        const now = performance.now();
        let allDone = true;
        
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            const elapsed = now - particle.userData.spawnTime;
            
            if (elapsed > particle.userData.lifetime) {
                scene.remove(particle);
                particles.splice(i, 1);
                continue;
            }
            
            // Still have active particles
            allDone = false;
            
            // Move particle
            particle.position.add(particle.userData.velocity);
            
            // Fade out
            const progress = elapsed / particle.userData.lifetime;
            particle.material.opacity = 0.8 * (1 - progress);
            
            // Shrink
            const scale = 1 - progress * 0.7;
            particle.scale.set(scale, scale, scale);
        }
        
        if (!allDone) {
            requestAnimationFrame(animateParticles);
        }
    }
    
    requestAnimationFrame(animateParticles);
}

// Function to create a visual effect when the shield is activated
function createShieldActivationEffect(boss) {
    // Create expanding ring effect
    const ringGeometry = new THREE.RingGeometry(0.5, 1, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2; // Lay flat
    ring.position.copy(boss.position);
    ring.position.y = 0.1; // Just above ground
    scene.add(ring);
    
    // Create particles for additional effect
    const particles = [];
    const particleCount = 30;
    
    // Create a pulse light
    const pulseLight = new THREE.PointLight(0xff3300, 2, 15);
    pulseLight.position.copy(boss.position);
    pulseLight.position.y += 2;
    scene.add(pulseLight);
    
    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3300,
            transparent: true,
            opacity: 0.7
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Position particles around the boss
        const angle = (i / particleCount) * Math.PI * 2;
        const radius = boss.geometry.parameters.width;
        
        particle.position.set(
            boss.position.x + Math.cos(angle) * radius,
            boss.position.y + Math.random() * boss.geometry.parameters.height,
            boss.position.z + Math.sin(angle) * radius
        );
        
        // Set velocity - particles move outward
        particle.userData = {
            velocity: new THREE.Vector3(
                Math.cos(angle) * 0.1,
                Math.random() * 0.05,
                Math.sin(angle) * 0.1
            ),
            lifetime: 800 + Math.random() * 400,
            spawnTime: performance.now()
        };
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Animate the shield activation effect
    const duration = 1500; // 1.5 seconds
    const startTime = performance.now();
    
    function animateShieldEffect() {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Expand ring
        const currentScale = 1 + progress * 10;
        ring.scale.set(currentScale, currentScale, 1);
        
        // Fade out ring
        ring.material.opacity = 0.7 * (1 - progress);
        
        // Pulse light
        if (pulseLight.parent) {
            pulseLight.intensity = 2 * (1 - progress) * (0.7 + 0.3 * Math.sin(progress * Math.PI * 10));
        }
        
        // Update particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            const particleElapsed = now - particle.userData.spawnTime;
            
            if (particleElapsed > particle.userData.lifetime) {
                scene.remove(particle);
                particles.splice(i, 1);
                continue;
            }
            
            // Move particle
            particle.position.add(particle.userData.velocity);
            
            // Fade out
            const particleProgress = particleElapsed / particle.userData.lifetime;
            particle.material.opacity = 0.7 * (1 - particleProgress);
        }
        
        if (progress < 1) {
            requestAnimationFrame(animateShieldEffect);
        } else {
            // Clean up
            scene.remove(ring);
            scene.remove(pulseLight);
            
            // Remove any remaining particles
            particles.forEach(particle => {
                if (particle.parent) {
                    scene.remove(particle);
                }
            });
        }
    }
    
    requestAnimationFrame(animateShieldEffect);
}


// Function to create the coin display in the HUD
function createCoinDisplay() {
    const hud = document.getElementById('hud');
    
    // IMPORTANT: Remove any existing coin container first
    const existingCoinContainer = document.getElementById('coinContainer');
    if (existingCoinContainer) {
        existingCoinContainer.remove();
    }
    
    // Create coin container
    const coinContainer = document.createElement('div');
    coinContainer.id = 'coinContainer';
    coinContainer.style.position = 'absolute';
    coinContainer.style.bottom = '80px'; 
    coinContainer.style.right = '20px';
    coinContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    coinContainer.style.padding = '8px 12px';
    coinContainer.style.borderRadius = '5px';
    coinContainer.style.display = 'flex';
    coinContainer.style.alignItems = 'center';
    coinContainer.style.gap = '5px';
    
    // Create coin icon
    const coinIcon = document.createElement('span');
    coinIcon.textContent = '🪙';
    coinIcon.style.fontSize = '20px';
    
    // Create coin counter
    const coinDisplay = document.createElement('span');
    coinDisplay.id = 'coinDisplay';
    coinDisplay.style.color = 'gold';
    coinDisplay.style.fontSize = '18px';
    coinDisplay.style.fontWeight = 'bold';
    coinDisplay.textContent = playerCoins.toString();
    
    // Assemble the container
    coinContainer.appendChild(coinIcon);
    coinContainer.appendChild(coinDisplay);
    
    hud.appendChild(coinContainer);
}

// Improved knife hit detection function
function checkEnemyHit() {
    // Get camera position and direction
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);
    
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    camera.getWorldDirection(cameraDirection);
    
    // Set knife parameters
    const knifeReach = 3; // How far the knife can reach
    const knifeDamage = 20; // 20 damage per hit
    
    // Create array to track which enemies were hit (to avoid double hits)
    const hitEnemies = new Set();
    
    // 1. First check for close-range enemies (no raycast needed)
    for (const enemy of activeEnemies) {
        // Calculate distance from player to enemy
        const distanceToEnemy = player.position.distanceTo(enemy.position);
        
        // Enemy size data
        const enemyWidth = enemy.geometry.parameters.width;
        const enemyDepth = enemy.geometry.parameters.depth;
        
        // Calculate effective collision radius
        const enemyRadius = Math.max(enemyWidth, enemyDepth) / 2;
        
        // If enemy is within very close range (touch distance + knife length)
        if (distanceToEnemy < (1.5 + enemyRadius)) {
            // Check if player is facing the enemy (dot product)
            const directionToEnemy = new THREE.Vector3()
                .subVectors(enemy.position, player.position)
                .normalize();
            
            // Calculate dot product (1 = same direction, -1 = opposite)
            const dotProduct = cameraDirection.dot(directionToEnemy);
            
            // If player is somewhat facing the enemy (within a 120 degree cone)
            if (dotProduct > 0.5) {
                damageEnemy(enemy, knifeDamage);
                createHitEffect(enemy.position);
                showHitMarker();
                hitEnemies.add(enemy.id);
                
                console.log("Close range hit! Distance:", distanceToEnemy);
            }
        }
    }
    
    // 2. Use raycasting for more distant enemies
    // Create multiple raycasts in a small spread pattern
    const rayCount = 5; // Number of rays to cast
    const spreadAngle = Math.PI / 36; // 5 degrees spread
    
    // Create the main raycaster
    const mainRaycaster = new THREE.Raycaster(cameraPosition, cameraDirection, 0, knifeReach);
    
    // Check the main raycast
    const mainIntersects = mainRaycaster.intersectObjects(activeEnemies);
    if (mainIntersects.length > 0) {
        const enemy = mainIntersects[0].object;
        if (!hitEnemies.has(enemy.id)) {
            damageEnemy(enemy, knifeDamage);
            createHitEffect(mainIntersects[0].point);
            showHitMarker();
            hitEnemies.add(enemy.id);
            
            console.log("Main ray hit! Distance:", mainIntersects[0].distance);
        }
    }
    
    // Create additional rays with slight spread
    for (let i = 0; i < rayCount - 1; i++) {
        // Calculate angle offset
        const angle = spreadAngle * (i % 2 === 0 ? 1 : -1) * Math.ceil((i + 1) / 2);
        
        // Create rotated direction
        const spreadDirection = cameraDirection.clone();
        
        // Rotate the direction around the Y axis
        const rotationMatrix = new THREE.Matrix4().makeRotationY(angle);
        spreadDirection.applyMatrix4(rotationMatrix);
        
        // Create raycaster with the new direction
        const spreadRaycaster = new THREE.Raycaster(cameraPosition, spreadDirection, 0, knifeReach);
        
        // Check for intersections
        const spreadIntersects = spreadRaycaster.intersectObjects(activeEnemies);
        if (spreadIntersects.length > 0) {
            const enemy = spreadIntersects[0].object;
            if (!hitEnemies.has(enemy.id)) {
                damageEnemy(enemy, knifeDamage);
                createHitEffect(spreadIntersects[0].point);
                showHitMarker();
                hitEnemies.add(enemy.id);
                
                console.log("Spread ray hit! Angle:", angle, "Distance:", spreadIntersects[0].distance);
            }
        }
    }
    
    return hitEnemies.size > 0; // Return true if any enemies were hit
}

// Function to create a hit effect at the impact point
function createHitEffect(position) {
    // Create a small particle burst
    const particles = [];
    const particleCount = 5;
    
    for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.8
        });
        
        const particle = new THREE.Mesh(geometry, material);
        particle.position.copy(position);
        
        // Random velocity
        particle.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1
            ),
            lifetime: 300,
            spawnTime: performance.now()
        };
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Animate particles
    function animateHitParticles() {
        const now = performance.now();
        let allDone = true;
        
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            const elapsed = now - particle.userData.spawnTime;
            
            if (elapsed > particle.userData.lifetime) {
                scene.remove(particle);
                particles.splice(i, 1);
                continue;
            }
            
            // Still have active particles
            allDone = false;
            
            // Update position
            particle.position.x += particle.userData.velocity.x;
            particle.position.y += particle.userData.velocity.y;
            particle.position.z += particle.userData.velocity.z;
            
            // Fade out
            const progress = elapsed / particle.userData.lifetime;
            particle.material.opacity = 0.8 * (1 - progress);
        }
        
        if (!allDone) {
            requestAnimationFrame(animateHitParticles);
        }
    }
    
    animateHitParticles();
}

// Updated showHitMarker function to remove check mark
function showHitMarker() {
    // Create hit marker if it doesn't exist
    let hitMarker = document.getElementById('hitMarker');
    if (!hitMarker) {
        hitMarker = document.createElement('div');
        hitMarker.id = 'hitMarker';
        document.body.appendChild(hitMarker);
        
        // Add style for hit marker
        const style = document.createElement('style');
        style.textContent = `
            #hitMarker {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 16px;
                height: 16px;
                border: 2px solid #ff3333;
                border-radius: 50%;
                opacity: 0;
                transition: opacity 0.1s;
                z-index: 1000;
                pointer-events: none;
            }
            
            #hitMarker.show {
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
        
        // Remove the check mark text entirely
        hitMarker.textContent = '';
    }
    
    // Show hit marker briefly
    hitMarker.classList.add('show');
    setTimeout(() => {
        hitMarker.classList.remove('show');
    }, 100);
}

// Update the returnToMenuButton event listener
document.getElementById('returnToMenuButton').addEventListener('click', () => {
    // Simply reload the entire page instead of trying to clean up resources
    window.location.reload();
});

// Add an event listener for the return to menu button
document.getElementById('returnToMenuButton').addEventListener('click', () => {
    document.getElementById('victoryScreen').style.display = 'none';
    resetGame();
    document.getElementById('roundInfo').style.display = 'none';
    cleanupGameUI();
    document.getElementById('menu').style.display = 'block';
});

// Add this to your HTML
function createAmmoDisplay() {
    const hud = document.getElementById('hud');
    
    // Remove any existing ammo display
    const existingAmmoContainer = document.getElementById('ammoContainer');
    if (existingAmmoContainer) {
        existingAmmoContainer.remove();
    }
    
    const ammoContainer = document.createElement('div');
    ammoContainer.id = 'ammoContainer';
    ammoContainer.style.position = 'absolute';
    ammoContainer.style.bottom = '20px';
    ammoContainer.style.right = '20px';
    ammoContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    ammoContainer.style.padding = '10px';
    ammoContainer.style.borderRadius = '5px';
    
    // THIS LINE NEEDS TO CHANGE - use ammoCount instead of ammoDisplay
    const ammoDisplay = document.createElement('div');
    ammoDisplay.id = 'ammoCount'; // <-- CHANGE HERE from 'ammoDisplay' to 'ammoCount'
    ammoDisplay.style.color = 'white';
    ammoDisplay.style.fontSize = '24px';
    ammoDisplay.style.fontWeight = 'bold';
    
    // Initialize based on currently selected weapon
    const currentItem = inventory[selectedSlot];
    if (currentItem === WEAPON_TYPES.PISTOL) {
        ammoDisplay.textContent = `${pistolAmmo}/${pistolMaxAmmo}`;
    } else if (currentItem === WEAPON_TYPES.SHOTGUN) {
        ammoDisplay.textContent = `${shotgunAmmo}/${shotgunMaxAmmo}`;
    } else if (currentItem === WEAPON_TYPES.ASSAULT_RIFLE) {
        ammoDisplay.textContent = `${assaultRifleAmmo}/${assaultRifleMaxAmmo}`;
    }
    
    ammoContainer.appendChild(ammoDisplay);
    hud.appendChild(ammoContainer);
    
    // Set initial visibility based on selected weapon type
    ammoContainer.style.display = (currentItem === WEAPON_TYPES.PISTOL || 
                                  currentItem === WEAPON_TYPES.SHOTGUN || 
                                  currentItem === WEAPON_TYPES.ASSAULT_RIFLE) ? 'block' : 'none';
}

// Function to update ammo display based on current weapon
function updateAmmoDisplay() {
    const ammoDisplay = document.getElementById('ammoCount');
    const ammoContainer = document.getElementById('ammoContainer');
    
    if (!ammoDisplay) return;
    
    // Check which weapon is currently selected
    const currentItem = inventory[selectedSlot];
    
    // Update ammo count based on weapon type
    if (currentItem === WEAPON_TYPES.PISTOL) {
        ammoDisplay.textContent = `${pistolAmmo}/${pistolMaxAmmo}`;
    } 
    else if (currentItem === WEAPON_TYPES.SHOTGUN) {
        ammoDisplay.textContent = `${shotgunAmmo}/${shotgunMaxAmmo}`;
    } 
    else if (currentItem === WEAPON_TYPES.ASSAULT_RIFLE) {
        ammoDisplay.textContent = `${assaultRifleAmmo}/${assaultRifleMaxAmmo}`;
    }
    else if (currentItem === WEAPON_TYPES.SNIPER_RIFLE) {
        ammoDisplay.textContent = `${sniperRifleAmmo}/${sniperRifleMaxAmmo}`;
    }
    else if (currentItem === WEAPON_TYPES.CROSSBOW) {
        ammoDisplay.textContent = `${crossbowAmmo}/${crossbowMaxAmmo}`;
    }
    else if (currentItem === WEAPON_TYPES.MINIGUN) {
        ammoDisplay.textContent = `${minigunAmmo}/${minigunMaxAmmo}`;
    }
    else if (currentItem === WEAPON_TYPES.ROCKET_LAUNCHER) {
        ammoDisplay.textContent = `${rocketLauncherAmmo}/${rocketLauncherMaxAmmo}`;
    }
    else {
        // No ammo display for other items
        if (ammoContainer) {
            ammoContainer.style.display = 'none';
        }
        return;
    }
    
    // Show ammo container if it's a weapon with ammo
    if (ammoContainer) {
        ammoContainer.style.display = 'block';
    }
}

// Improved crosshair function that attaches to the body instead of the HUD
function createCrosshair() {
    // Remove any existing crosshair first
    const existingCrosshair = document.getElementById('crosshair');
    if (existingCrosshair) {
        existingCrosshair.remove();
    }
    
    // Create new crosshair directly on the body element
    const crosshair = document.createElement('div');
    crosshair.id = 'crosshair';
    
    // Apply styling with !important to override any conflicting styles
    crosshair.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        width: 12px !important;
        height: 12px !important;
        border: 2px solid rgba(255, 255, 255, 0.7) !important;
        border-radius: 50% !important;
        pointer-events: none !important;
        z-index: 10000 !important; /* Very high z-index to be above everything */
    `;
    
    // Add a center dot
    const centerDot = document.createElement('div');
    centerDot.style.cssText = `
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        width: 2px !important;
        height: 2px !important;
        background-color: white !important;
        border-radius: 50% !important;
    `;
    
    crosshair.appendChild(centerDot);
    document.body.appendChild(crosshair); // Attach to body instead of HUD
}

// Add these functions to control crosshair visibility
function showCrosshair() {
    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
        crosshair.style.display = 'block';
    }
}

function hideCrosshair() {
    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
        crosshair.style.display = 'none';
    }
}

// Função de splash screen modificada
function createSplashScreen() {
    // Criar o div da tela de carregamento
    const splashScreen = document.createElement('div');
    splashScreen.id = 'splashScreen';
    splashScreen.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: url('assets/images/background.png') center center no-repeat;
        background-size: cover;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        padding-top: 120px;
    `;
    
    // Criar o container da barra de progresso
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
        width: 40%;
        height: 25px;
        background-color: rgba(0, 0, 0, 0.5);
        border-radius: 15px;
        overflow: hidden;
        border: 2px solid #ffffff;
        margin-bottom: 15px;
    `;
    
    // Criar a barra de progresso
    const progressBar = document.createElement('div');
    progressBar.id = 'loadingBar';
    progressBar.style.cssText = `
        width: 0%;
        height: 100%;
        background-color: #aa0000;
        transition: width 0.5s;
    `;
    
    // Criar o texto de carregamento
    const loadingText = document.createElement('div');
    loadingText.id = 'loadingText';
    loadingText.style.cssText = `
        color: #ffffff;
        font-size: 18px;
        text-shadow: 1px 1px 2px #000000;
    `;
    loadingText.textContent = "Loading... 0%";
    
    // Montar a estrutura
    progressContainer.appendChild(progressBar);
    splashScreen.appendChild(progressContainer);
    splashScreen.appendChild(loadingText);
    
    document.body.appendChild(splashScreen);
    
    return { splashScreen, progressBar, loadingText };
}

// Função para simular o carregamento
function simulateLoading() {
    // Esconder todos os outros elementos primeiro
    document.getElementById('menu').style.display = 'none';
    document.getElementById('backgroundScene').style.display = 'none';
    document.getElementById('gameScene').style.display = 'none';
    
    // Criar e mostrar a tela de carregamento
    const { splashScreen, progressBar, loadingText } = createSplashScreen();
    
    // Simular o progresso de carregamento
    let progress = 0;
    const loadingInterval = setInterval(() => {
        progress += Math.random() * 5 + 2; // Valor aleatório entre 2-7% por vez
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadingInterval);
            
            // Esperar mais 500ms antes de mostrar o menu principal
            setTimeout(() => {
                // Remover a tela de carregamento
                document.body.removeChild(splashScreen);
                
                // Mostrar o menu principal
                document.getElementById('menu').style.display = 'block';
                document.getElementById('backgroundScene').style.display = 'block';
            }, 500);
        }
        
        // Atualizar a barra de progresso
        progressBar.style.width = `${progress}%`;
        loadingText.textContent = `Loading... ${Math.floor(progress)}%`;
    }, 200); // Atualizar a cada 200ms
}

// Iniciar a simulação de carregamento quando a página carrega
window.addEventListener('DOMContentLoaded', () => {
    // Iniciar a simulação de carregamento
    simulateLoading();
});

// Update all menu buttons to use page reload
document.addEventListener('DOMContentLoaded', () => {
    // Pause menu - already using reload but making sure it's consistent
    const pauseMenuBackButton = document.getElementById('returnToMainButton');
    if (pauseMenuBackButton) {
        pauseMenuBackButton.addEventListener('click', () => {
            window.location.reload();
        });
    }
    
    // Defeat screen button
    const defeatBackButton = document.getElementById('defeatReturnButton');
    if (defeatBackButton) {
        defeatBackButton.addEventListener('click', () => {
            window.location.reload();
        });
    }
    
    // Victory screen button
    const victoryBackButton = document.getElementById('victoryReturnButton');
    if (victoryBackButton) {
        victoryBackButton.addEventListener('click', () => {
            window.location.reload();
        });
    }

    soundManager.init();
    addButtonSounds();
});

// Function to jump to a specific round
function jumpToRound(roundNumber) {
    // Validate input
    if (typeof roundNumber !== 'number' || roundNumber < 1 || roundNumber > totalRounds) {
        console.log(`Invalid round number. Please enter a number between 1 and ${totalRounds}.`);
        return false;
    }
    
    // Must have a game in progress
    if (!gameStarted) {
        console.log('Cannot jump rounds - game not started.');
        return false;
    }
    
    // Clean up existing round state
    isRoundActive = false;
    
    // Clean up existing enemies
    for (let i = activeEnemies.length - 1; i >= 0; i--) {
        const enemy = activeEnemies[i];
        scene.remove(enemy);
    }
    
    // Clear enemy arrays
    enemies = [];
    activeEnemies = [];
    
    // Clear projectiles
    for (const projectile of projectiles) {
        scene.remove(projectile);
    }
    projectiles.length = 0;
    
    // Clear bullets
    for (const bullet of bullets) {
        scene.remove(bullet);
    }
    bullets = [];
    
    // Set current round
    currentRound = roundNumber - 1; // Subtract 1 because startNextRound increments it
    
    // Show notification
    showNotification(`CHEAT ACTIVATED: Jumping to Round ${roundNumber}`, 3000);
    
    console.log(`%c🎮 JUMPING TO ROUND ${roundNumber}`, 
            'background: #222; color: #ffcc00; font-size: 14px; padding: 5px; border-radius: 5px;');
    
    // Stop any existing countdown
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    // Hide countdown display
    document.getElementById('countdown').style.display = 'none';
    
    // Start the new round
    startNextRound();
    
    return true;
}

// Make the function available in the console
window.jumpToRound = jumpToRound;

// Add a hint in the console when the game starts
console.log("%c🎮 CHEAT CODE AVAILABLE: Type jumpToRound(number) to skip to a specific round", 
           "background: #222; color: #ffcc00; font-size: 14px; padding: 5px; border-radius: 5px;");

// Add a function to disable debug mode
function disableDebugMode() {
    if (!window.inDebugMode) {
        console.log("Debug mode is not active");
        return;
    }
    
    // Restore original startNextRound function
    if (window.originalStartNextRound) {
        startNextRound = window.originalStartNextRound;
        window.originalStartNextRound = null;
    }
    
    // Reset round display
    currentRound = 0;
    document.getElementById('roundDisplay').textContent = `Round ${currentRound}/${totalRounds}`;
    
    // Show notification
    showNotification("Debug mode disabled", 3000);
    
    console.log("%c🛠️ DEBUG MODE DISABLED", 
                "background: #222; color: #00ffcc; font-size: 18px; padding: 10px; border-radius: 5px;");
    
    // Clear debug mode flag
    window.inDebugMode = false;
    
    // Start normal round progression
    startRounds();
}

// Make disableDebugMode available globally
window.disableDebugMode = disableDebugMode;


function spawnDebugEnemy(type = 'normal', count = 1, formation = 'circle') {
    if (!window.inDebugMode) {
        console.log("Not in debug mode. Use enableDebugMode() first.");
        return;
    }
    
    let enemyType;
    
    // Map string type to ENEMY_TYPES constant
    switch (type.toLowerCase()) {
        case 'normal':
            enemyType = ENEMY_TYPES.NORMAL;
            break;
        case 'tank':
            enemyType = ENEMY_TYPES.TANK;
            break;
        case 'ranged':
            enemyType = ENEMY_TYPES.RANGED;
            break;
        case 'speeder':
            enemyType = ENEMY_TYPES.SPEEDER;
            break;
        case 'exploder':
            enemyType = ENEMY_TYPES.EXPLODER;
            break;
        case 'shielder':
            enemyType = ENEMY_TYPES.SHIELDER;
            break;
        case 'teleporter':
            enemyType = ENEMY_TYPES.TELEPORTER;
            break;
        case 'healer':
            enemyType = ENEMY_TYPES.HEALER;
            break;
        case 'elite':
            enemyType = ENEMY_TYPES.ELITE;
            break;
        case 'boss':
            enemyType = ENEMY_TYPES.BOSS;
            break;
        case 'warden':
            enemyType = ENEMY_TYPES.WARDEN_BOSS;
            break;
        case 'phantom':
            enemyType = ENEMY_TYPES.PHANTOM_BOSS;
            break;
        case 'mega':
            enemyType = ENEMY_TYPES.MEGA_BOSS;
            break;
        default:
            console.log("Unknown enemy type. Using normal enemy.");
            enemyType = ENEMY_TYPES.NORMAL;
    }
    
    // Check if this is a boss type enemy
    const isBoss = (
        enemyType === ENEMY_TYPES.BOSS ||
        enemyType === ENEMY_TYPES.WARDEN_BOSS ||
        enemyType === ENEMY_TYPES.PHANTOM_BOSS ||
        enemyType === ENEMY_TYPES.MEGA_BOSS
    );
    
    // Spawn the requested enemies
    const radius = 20; // Spawn radius from player
    
    for (let i = 0; i < count; i++) {
        let spawnPos;
        
        // If it's a boss, always spawn at 0,0,0
        if (isBoss) {
            spawnPos = new THREE.Vector3(0, 0, 0);
            console.log("Boss type detected - forcing spawn at center position (0,0,0)");
        } else {
            // Different formation types for non-boss enemies
            switch (formation.toLowerCase()) {
                case 'circle':
                    // Evenly distribute around the player in a circle
                    const angle = (i / count) * Math.PI * 2;
                    spawnPos = new THREE.Vector3(
                        player.position.x + Math.cos(angle) * radius,
                        0,
                        player.position.z + Math.sin(angle) * radius
                    );
                    break;
                    
                case 'line':
                    // Line formation from left to right
                    spawnPos = new THREE.Vector3(
                        player.position.x - radius/2 + i * (radius/count),
                        0,
                        player.position.z + radius
                    );
                    break;
                    
                case 'random':
                default:
                    // Random positions around the player
                    const randomAngle = Math.random() * Math.PI * 2;
                    const randomRadius = radius * (0.8 + Math.random() * 0.4);
                    spawnPos = new THREE.Vector3(
                        player.position.x + Math.cos(randomAngle) * randomRadius,
                        0,
                        player.position.z + Math.sin(randomAngle) * randomRadius
                    );
            }
        }
        
        // THIS WAS MISSING: Actually create the enemy
        const enemy = spawnEnemy(enemyType);
        
        // Override position (ensures it won't spawn in obstacles)
        if (enemy) {
            enemy.position.copy(spawnPos);
            enemy.position.y = enemy.geometry.parameters.height / 2;

            // IMPORTANT: Initialize any missing AI properties for debug mode
            if (enemy.userData) {
                // Force initialize lastAttackTime to enable attacks
                enemy.userData.lastAttackTime = 0;
                
                // Add these critical properties that might be missing
                if (!enemy.userData.speed) {
                    enemy.userData.speed = 0.1; // Default speed if missing
                }
                
                if (enemyType === ENEMY_TYPES.SPEEDER && !enemy.userData.strafeDirection) {
                    enemy.userData.strafeDirection = 1; // For speeder enemies
                }
                
                if (enemyType === ENEMY_TYPES.TELEPORTER && !enemy.userData.teleportDistance) {
                    enemy.userData.teleportDistance = 15;
                    enemy.userData.teleportCooldown = 5000;
                    enemy.userData.lastTeleportTime = 0;
                }
                
                if (enemyType === ENEMY_TYPES.HEALER) {
                    if (!enemy.userData.healRange) enemy.userData.healRange = 10;
                    if (!enemy.userData.healCooldown) enemy.userData.healCooldown = 3000;
                    if (!enemy.userData.lastHealTime) enemy.userData.lastHealTime = 0;
                    if (!enemy.userData.healAmount) enemy.userData.healAmount = 20;
                }
                
                if (enemyType === ENEMY_TYPES.ELITE && !enemy.userData.eliteType) {
                    // Assign random elite type if missing
                    const eliteTypes = ['speed', 'damage', 'health', 'range'];
                    enemy.userData.eliteType = eliteTypes[Math.floor(Math.random() * eliteTypes.length)];
                    enemy.userData.specialAttackCooldown = 8000;
                    enemy.userData.lastSpecialAttackTime = 0;
                }
                
                // Initialize boss-specific properties if not already set
                if (isBoss) {
                    // Make sure phase is set for mega boss
                    if (enemyType === ENEMY_TYPES.MEGA_BOSS && !enemy.userData.currentPhase) {
                        enemy.userData.currentPhase = 1;
                    }
                    
                    // Initialize all timing properties for bosses
                    const now = performance.now();
                    if (enemy.userData.lastFireRingTime === undefined) enemy.userData.lastFireRingTime = now;
                    if (enemy.userData.lastChargeTime === undefined) enemy.userData.lastChargeTime = now;
                    if (enemy.userData.lastShieldWallTime === undefined) enemy.userData.lastShieldWallTime = now;
                    if (enemy.userData.lastGroundSlamTime === undefined) enemy.userData.lastGroundSlamTime = now;
                    if (enemy.userData.lastSummonTime === undefined) enemy.userData.lastSummonTime = now;
                    if (enemy.userData.lastTeleportTime === undefined) enemy.userData.lastTeleportTime = now;
                    if (enemy.userData.lastCloneTime === undefined) enemy.userData.lastCloneTime = now;
                    if (enemy.userData.lastVoidZoneTime === undefined) enemy.userData.lastVoidZoneTime = now;
                    if (enemy.userData.lastPhaseShiftTime === undefined) enemy.userData.lastPhaseShiftTime = now;
                    if (enemy.userData.lastDeathRayTime === undefined) enemy.userData.lastDeathRayTime = now;
                    if (enemy.userData.lastMeteorTime === undefined) enemy.userData.lastMeteorTime = now;
                    if (enemy.userData.lastRealityWarpTime === undefined) enemy.userData.lastRealityWarpTime = now;
                    
                    // Initialize arrays if needed
                    if (enemyType === ENEMY_TYPES.PHANTOM_BOSS) {
                        if (!enemy.userData.activeClones) enemy.userData.activeClones = [];
                    }
                    
                    // Additional properties that might be missing
                    if (enemyType === ENEMY_TYPES.MEGA_BOSS) {
                        if (!enemy.userData.phaseThresholds) {
                            enemy.userData.phaseThresholds = [0.66, 0.33]; // Phase transition thresholds
                        }
                        if (!enemy.userData.phaseColors) {
                            enemy.userData.phaseColors = [0x880000, 0x8800cc, 0xcc0088];
                        }
                    }
                }
            }
        }
    }
    
    // Update enemy count display
    document.getElementById('enemiesRemaining').textContent = `Enemies: ${activeEnemies.length}`;
    
    console.log(`Spawned ${count} ${type} enemies in ${formation} formation`);
    return activeEnemies.length;
}

// Make spawnDebugEnemy available as spawnEnemy in debug mode
window.spawnEnemy = function(type = 'normal', count = 1, formation = 'circle') {
    // Call the existing debug spawn function
    return spawnDebugEnemy(type, count, formation);
};

// Updated debug mode for presentation purposes
function enableDebugMode() {
    // Clear any existing enemies and projectiles
    for (let i = activeEnemies.length - 1; i >= 0; i--) {
        scene.remove(activeEnemies[i]);
    }
    enemies = [];
    activeEnemies = [];
    projectiles.length = 0;
    bullets.length = 0;
    
    // Enable infinite health and money
    toggleInfiniteHealth();
    toggleInfiniteMoney();
    
    // IMPORTANT FIX: Cancel any existing countdown timers
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    
    // IMPORTANT FIX: Cancel any other game timers
    if (stuckDetectionInterval) {
        clearInterval(stuckDetectionInterval);
        stuckDetectionInterval = null;
    }
    
    // Hide countdown display
    const countdownElement = document.getElementById('countdown');
    if (countdownElement) {
        countdownElement.style.display = 'none';
    }
    
    // Make sure game is in active state
    isRoundActive = true;
    isGameOver = false;
    spawnQueueActive = false;
    isPaused = false; // IMPORTANT: Ensure game is not paused for enemies to move
    
    // Set current round to "Debug Round"
    currentRound = 999;
    document.getElementById('roundDisplay').textContent = "Debug Mode";
    document.getElementById('enemiesRemaining').textContent = "Enemies: 0";
    
    // IMPORTANT FIX: Override startNextRound to do nothing during debug mode
    const originalStartNextRound = startNextRound;
    startNextRound = function() {
        console.log("Attempted to start next round during debug mode - prevented");
        return;
    };
    
    // IMPORTANT FIX: Store the original function to restore when debug mode is disabled
    window.originalStartNextRound = originalStartNextRound;
    
    // Show notification
    showNotification("DEBUG MODE ACTIVATED\nUse spawnEnemy() in console", 5000);
    
    console.log("%c🛠️ DEBUG MODE ACTIVATED", 
                "background: #222; color: #00ffcc; font-size: 18px; padding: 10px; border-radius: 5px;");
    console.log("%c📋 Available commands:", 
                "color: #00ffcc; font-size: 14px;");
    console.log("%c• spawnEnemy(type, count, formation) - Spawn enemies", 
                "color: #fff; font-size: 14px;");
    console.log("%c• Available types: 'normal', 'tank', 'ranged', 'speeder', 'exploder', 'shielder', 'teleporter', 'healer', 'elite', 'boss', 'warden', 'phantom', 'mega'", 
                "color: #aaa; font-size: 12px;");
    console.log("%c• Example: spawnEnemy('boss', 1, 'circle')", 
                "color: #fff; font-size: 14px;");
    console.log("%c• Use disableDebugMode() to exit debug mode", 
                "color: #fff; font-size: 14px;");
                
    // Set a flag to indicate we're in debug mode
    window.inDebugMode = true;
}

// Make enableDebugMode available globally
window.enableDebugMode = enableDebugMode;

// Add a hint in the console when the game starts
console.log("%c🛠️ DEBUG MODE AVAILABLE: Type enableDebugMode() in the console to activate presentation mode", 
           "background: #222; color: #00ffcc; font-size: 14px; padding: 5px; border-radius: 5px;");
