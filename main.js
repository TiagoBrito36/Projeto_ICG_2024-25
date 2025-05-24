import * as THREE from 'three';

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

// Statistics tracking
const gameStats = {
    damageDealt: 0,
    damageTaken: 0,
    kills: {
        normal: 0,
        tank: 0,
        ranged: 0,
        boss: 0
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
    PISTOL: 1
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
    }
];

// Add pistol-related global variables
let pistolModel = null;
let pistolAmmo = 16;
let pistolMaxAmmo = 16;
let pistolReloading = false;
let bullets = [];

// Add these pistol position globals at the top with your other variables
const PISTOL_IDLE_POSITION = new THREE.Vector3(0.3, -0.3, -0.5);
const PISTOL_IDLE_ROTATION = new THREE.Euler(0, Math.PI, 0);
let pistolAnimationInProgress = false;
let pistolAnimationId = null;

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
            // Set icon for non-empty slots
            slot.textContent = getItemSymbol(item);
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
            slot.textContent = '';
            slot.classList.add('empty');
        }
    });
}

// Update the getItemSymbol function to use the correct pistol emoji
function getItemSymbol(item) {
    // If item is an object with type property
    const itemType = typeof item === 'object' && item !== null ? item.type : item;
    
    switch(itemType) {
        case WEAPON_TYPES.KNIFE: return '🔪'; 
        case WEAPON_TYPES.PISTOL: return '🔫';
        case ITEM_TYPES.BANDAGE: return '🩹';
        case ITEM_TYPES.MEDKIT: return '🧰';
        case ITEM_TYPES.MINI_SHIELD: return '🛡️';
        case ITEM_TYPES.BIG_SHIELD: return '🔷';
        default: return '?';
    }
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
            // Show item icon
            content.textContent = getItemSymbol(item);
            
            // If item is an object with count, add stack count
            if (typeof item === 'object' && item.count > 1) {
                const stackCount = document.createElement('span');
                stackCount.className = 'stack-count';
                stackCount.textContent = item.count;
                content.appendChild(stackCount);
            }
        } else {
            // Clear empty slots
            content.textContent = '';
        }
    });
}

// Function to handle item selection
function selectSlot(slot) {
    if (slot >= 0 && slot < 5) {
        selectedSlot = slot;
        updateItemBar();
        updateWeaponVisibility(); // Update weapon visibility when changing slots
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
    
    // Make blade bigger and more reflective
    const bladeGeometry = new THREE.BoxGeometry(0.04, 0.35, 0.1);
    const bladeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xe0e0e0,
        roughness: 0.1,
        metalness: 0.9,
        emissive: 0x333333
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.y = 0.25; // Position blade above handle
    
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
    
    // This is critical - add to camera, not pitchObject
    camera.add(knifeModel);
    console.log("Knife model created and added to camera");
    
    // Ensure visibility
    knifeModel.visible = (inventory[selectedSlot] === 0);
    return knifeModel;
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
    
    // Update ammo display container visibility
    const ammoContainer = document.getElementById('ammoContainer');
    if (ammoContainer) {
        // Hide/show the container, not just the display
        ammoContainer.style.display = (currentItem === WEAPON_TYPES.PISTOL) ? 'block' : 'none';
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
    if (keys.shift && !isJumping) {
        if (!isCrouching) {
            player.geometry = new THREE.BoxGeometry(1, CROUCH_HEIGHT, 1);
            player.position.y = CROUCH_HEIGHT/2;
            camera.position.y = 0.5;
            isCrouching = true;
        }
        currentSpeed = CROUCH_SPEED;
    } else if (isCrouching && !keys.shift) {
        player.geometry = new THREE.BoxGeometry(1, NORMAL_HEIGHT, 1);
        player.position.y = NORMAL_HEIGHT/2;
        camera.position.y = 0.8;
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
    
    // CRITICAL FIX: Calculate movement direction based on yawObject rotation (not camera quaternion)
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

// Add collision detection function
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
    
    // NEW: Check collisions with road blockades (as solid areas)
    const roadEndX = 110; // Same as in addRoadBlockades
    const roadWidth = 15;
    const blockadeDepth = 12; // How "deep" the blockade area is
    
    // East blockade area (positive X)
    if (Math.abs(x - roadEndX) < blockadeDepth && Math.abs(z) < roadWidth / 2 + 5) {
        return true; // Collision with east blockade area
    }
    
    // West blockade area (negative X)
    if (Math.abs(x + roadEndX) < blockadeDepth && Math.abs(z) < roadWidth / 2 + 5) {
        return true; // Collision with west blockade area
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
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x4a2f2f, side: THREE.DoubleSide });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    createApocalypticRoad();
    addRoadBlockades();

    // Create player with normal height
    const playerGeometry = new THREE.BoxGeometry(1, NORMAL_HEIGHT, 1);
    const playerMaterial = new THREE.MeshBasicMaterial({ color: playerColor });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.y = NORMAL_HEIGHT/2;
    scene.add(player);

    // Clear mountains array
    mountains = [];
    
    // Create mountains for game scene with precise edge alignment (same as menu scene)
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
            
            scene.add(mountain);
            mountains.push(mountain);
        }
    });


    pitchObject = new THREE.Object3D();
    yawObject = new THREE.Object3D();
    yawObject.add(pitchObject);
    pitchObject.add(camera);
    player.add(yawObject);
    camera.position.y = 0.8;

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
    inventory = [WEAPON_TYPES.KNIFE, WEAPON_TYPES.PISTOL, null, null, null];
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
    
    // Create a crashed bus/truck as the main blockade
    createAbandonedVehicle(0, 0, 0, 0, blockadeGroup); // Position relative to group
    
    // Add concrete barriers in a staggered formation
    createBarricade(0, 0, 0, 0, blockadeGroup); // Position relative to group
    
    // Add some debris and smaller elements
    createRoadDebrisCluster(0, 0, 0, 0, blockadeGroup); // Position relative to group
    
    // Add warning signs
    createRoadSigns(0, 0, 0, 0, blockadeGroup); // Position relative to group
    
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
            vehicleGroup.add(leftWindow);
            
            // Right side windows
            const rightWindow = new THREE.Mesh(
                new THREE.PlaneGeometry(1.2, 1),
                windowMaterial
            );
            rightWindow.position.set(-length/2 + 2 + i*1.6, height/2 + 0.2, -width/2 - 0.01);
            rightWindow.rotation.y = -Math.PI/2;
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
        vehicleGroup.add(leftWheel);
        
        // Right wheels
        const rightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        rightWheel.rotation.x = Math.PI/2;
        rightWheel.position.set(-length/2 + wheelSpacing * (i+1), 0.8, -width/2);
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

// Function to create pistol model
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
    
    // Create pistol handle
    const handleGeometry = new THREE.BoxGeometry(0.08, 0.25, 0.1);
    const handleMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.5,
        metalness: 0.3
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, -0.2, 0.05);
    
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
        damage: 20, // Takes 2 hits to kill normal enemy
        lifetime: 1000,
        spawnTime: performance.now()
    };
    
    scene.add(bullet);
    bullets.push(bullet);
    
    return bullet;
}

// Update bullets
function updateBullets() {
    const now = performance.now();
    
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // Move bullet
        bullet.position.addScaledVector(bullet.userData.direction, bullet.userData.speed);
        
        // Check lifetime
        if (now - bullet.userData.spawnTime > bullet.userData.lifetime) {
            scene.remove(bullet);
            bullets.splice(i, 1);
            continue;
        }
        
        // Check enemy hits
        for (let j = 0; j < activeEnemies.length; j++) {
            const enemy = activeEnemies[j];
            const distance = bullet.position.distanceTo(enemy.position);
            
            // If hit
            if (distance < enemy.geometry.parameters.width / 2 + 0.1) {
                // Apply damage
                damageEnemy(enemy, bullet.userData.damage);
                
                // Create hit effect
                createHitEffect(bullet.position);
                
                // Show hit marker
                showHitMarker();
                
                // Remove bullet
                scene.remove(bullet);
                bullets.splice(i, 1);
                break;
            }
        }
    }
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
    // Add lights first
    const ambientLight = new THREE.AmbientLight(0x404040);
    menuScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    menuScene.add(directionalLight);

    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(281.25, 281.25); // Increased from 187.5
    const floorMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x4a2f2f,  
        side: THREE.DoubleSide 
    });
    const menuFloor = new THREE.Mesh(floorGeometry, floorMaterial);
    menuFloor.rotation.x = -Math.PI / 2;
    menuScene.add(menuFloor);

    // Add apocalyptic road to menu scene
    createMenuApocalypticRoad();
    addRoadBlockades(menuScene);

    // Create mountains
    createMountainsForMenu();
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
    lampGroup.add(pole);
    
    // Create cross arm (horizontal part)
    const armGeometry = new THREE.CylinderGeometry(0.07, 0.07, 1.5, 8);
    const arm = new THREE.Mesh(armGeometry, poleMaterial);
    arm.rotation.x = Math.PI / 2; // Correctly orient horizontally
    arm.position.y = 4; // Top of pole
    
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
    
    // Position glass below lamp head
    glass.position.y = 3.8;
    glass.position.z = 1.3;
    lampGroup.add(glass);
    
    // Add light source if working or damaged
    if (state !== 'broken') {
        // Enhanced light settings for better visibility
        const lightColor = 0xffffaa; // Warmer yellow light
        
        // Create a more intense light
        const lightIntensity = state === 'working' ? 3.0 : 2.0; // Brighter for working lamps
        const lightDistance = 25; // Increased light range
        const light = new THREE.PointLight(lightColor, lightIntensity, lightDistance);
        
        // Position light below glass
        light.position.set(0, 3.8, 1.3);
        
        // Add a subtle glow effect for working lamps
        if (state === 'working') {
            const glowGeometry = new THREE.SphereGeometry(0.3, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffcc,
                transparent: true,
                opacity: 0.3,
                side: THREE.BackSide
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.copy(light.position);
            lampGroup.add(glow);
        }
        
        // Store reference to the light for flickering
        lampGroup.userData.light = light;
        lampGroup.userData.state = state;
        
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
function animateDamagedLamp(lampGroup) {
    const light = lampGroup.userData.light;
    if (!light) return;
    
    // Set up improved flicker parameters
    lampGroup.userData.flickerParams = {
        nextFlickerTime: performance.now(),
        intensity: 2.0, // Start with higher intensity
        baseIntensity: 2.0, // Higher base intensity
        maxIntensity: 3.5, // Maximum intensity during flickers
        minIntensity: 0.2, // Minimum intensity during flickers
        isFlickering: false,
        sparkDue: false,
        lastSparkTime: performance.now()
    };
    
    // Function to create spark effect
    function createSpark() {
        const sparkGeometry = new THREE.SphereGeometry(0.03, 8, 8);
        const sparkMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffcc,
            transparent: true,
            opacity: 0.9 // More visible sparks
        });
        
        const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
        spark.position.set(0, 3.8, 1.3); // Same position as light source
        
        // Random velocity for the spark
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.05,
            -Math.random() * 0.02 - 0.01,
            (Math.random() - 0.5) * 0.05
        );
        
        spark.userData = {
            velocity: velocity,
            lifetime: 500 + Math.random() * 300,
            created: performance.now()
        };
        
        lampGroup.add(spark);
        
        // Animate the spark
        function animateSpark() {
            const now = performance.now();
            const life = now - spark.userData.created;
            
            if (life > spark.userData.lifetime || !lampGroup.parent) {
                if (lampGroup.parent) lampGroup.remove(spark);
                return;
            }
            
            // Move the spark
            spark.position.x += spark.userData.velocity.x;
            spark.position.y += spark.userData.velocity.y;
            spark.position.z += spark.userData.velocity.z;
            
            // Apply gravity to velocity
            spark.userData.velocity.y -= 0.001;
            
            // Fade out
            const progress = life / spark.userData.lifetime;
            spark.material.opacity = 0.9 * (1 - progress);
            
            requestAnimationFrame(animateSpark);
        }
        
        requestAnimationFrame(animateSpark);
    }
    
    // Function to update the flicker
    function updateFlicker() {
        if (!lampGroup.parent) return; // Stop if lamp was removed
        
        const now = performance.now();
        const params = lampGroup.userData.flickerParams;
        
        // Check if it's time to flicker
        if (now >= params.nextFlickerTime) {
            if (params.isFlickering) {
                // End flicker period, return to base intensity
                light.intensity = params.baseIntensity;
                params.isFlickering = false;
                params.nextFlickerTime = now + Math.random() * 5000 + 2000; // 2-7 seconds until next flicker
            } else {
                // Start flicker period
                params.isFlickering = true;
                params.nextFlickerTime = now + Math.random() * 2000 + 500; // Flicker for 0.5-2.5 seconds
                
                // 50% chance to create sparks during this flicker period (increased from 30%)
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
            } else {
                light.intensity = params.baseIntensity;
            }
            
            // Create more frequent sparks during flicker events
            if (params.sparkDue && now - params.lastSparkTime > 200) { // Reduced from 300ms
                if (Math.random() < 0.3) { // Increased from 0.2
                    createSpark();
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
    
    // Create each shop item
    SHOP_ITEMS.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'shop-item';
        itemElement.innerHTML = `
            <div class="item-icon">${item.icon}</div>
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
        
        shopItemsContainer.appendChild(itemElement);
    });
    
    // Add event listeners to buy buttons with stopPropagation
    document.querySelectorAll('.buy-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Stop event from bubbling up to document
            const itemId = parseInt(e.target.dataset.itemId);
            purchaseItem(itemId);
        });
    });
    
    // Add click handler to the shop container itself
    const shop = document.getElementById('shop');
    shop.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent clicks inside shop from triggering pointer lock
    });
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
        
        // Add item to inventory
        if (addItem(item.id)) {
            // Update coin displays
            document.getElementById('shopCoins').textContent = infiniteMoneyCheat ? "INFINITE" : playerCoins;
            updateCoinDisplay();
            
            // Show notification
            showNotification(`Purchased ${item.name}!`, 2000);
            
            // Refresh shop items to update button states
            populateShopItems();
            
            // Important: Do NOT request pointer lock here!
        } else {
            // Inventory full, refund coins if not using infinite money
            if (!infiniteMoneyCheat) {
                playerCoins += item.price;
            }
            showNotification('Inventory is full!', 2000);
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
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.1
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
    
    // Limit the pitch rotation to prevent over-rotation
    pitchObject.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitchObject.rotation.x));
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
            updateEnemies();
            updateBullets();
        }
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
    // Remove any existing handler to avoid duplicate listeners
    document.getElementById('returnToMainButton').replaceWith(
        document.getElementById('returnToMainButton').cloneNode(true)
    );
    document.getElementById('returnToMainButton').addEventListener('click', returnToMainMenu);
    
    // Call the function
    returnToMainMenu();
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

// Function to start the game rounds
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
    
    // Show round information UI
    document.getElementById('roundInfo').style.display = 'block';
    
    // Start initial countdown
    startCountdown(10, () => {
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
    currentRound++;
    
    if (currentRound > totalRounds) {
        // Game completed
        showVictoryScreen();
        return;
    }
    
    // Update round display
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
    
    // Spawn enemies based on round configuration
    spawnEnemiesForRound(config);
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
    else if (enemyType === ENEMY_TYPES.BOSS) {
        return spawnFirstBoss(config);
    }
    
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
    
    // Position enemy at a random location on the edge of the map
    // UPDATED from 70 to match expanded map boundaries
    const spawnRadius = 100; // Increased from 70 to spawn closer to the expanded map edges
    const angle = Math.random() * Math.PI * 2;
    enemy.position.x = Math.cos(angle) * spawnRadius;
    enemy.position.z = Math.sin(angle) * spawnRadius;
    enemy.position.y = config.size.height / 2;
    
    // Add enemy metadata
    enemy.userData = {
        type: enemyType,
        health: config.health,
        maxHealth: config.health,
        speed: config.speed,
        damage: config.damage,
        attackRange: config.attackRange,
        lastAttackTime: 0,
        attackCooldown: config.attackCooldown
    };
    
    // Add special properties based on enemy type
    if (enemyType === ENEMY_TYPES.RANGED || enemyType === ENEMY_TYPES.TELEPORTER) {
        enemy.userData.projectileSpeed = config.projectileSpeed;
    }
    
    if (enemyType === ENEMY_TYPES.SPEEDER) {
        enemy.userData.circleStrafe = config.circleStrafe;
        enemy.userData.strafeDirection = Math.random() > 0.5 ? 1 : -1;
        enemy.userData.strafeAngle = 0;
    }
    
    if (enemyType === ENEMY_TYPES.EXPLODER) {
        enemy.userData.explodeOnDeath = config.explodeOnDeath;
        enemy.userData.pulseRate = config.pulseRate;
        
        // Start pulsing animation
        startPulsingAnimation(enemy);
    }
    
    if (enemyType === ENEMY_TYPES.SHIELDER) {
        enemy.userData.frontShield = config.frontShield;
        enemy.userData.shieldReduction = config.shieldReduction;
        
        // Create visual shield
        addShieldToEnemy(enemy);
    }
    
    if (enemyType === ENEMY_TYPES.TELEPORTER) {
        enemy.userData.teleportDistance = config.teleportDistance;
        enemy.userData.teleportCooldown = config.teleportCooldown;
        enemy.userData.lastTeleportTime = 0;
    }
    
    if (enemyType === ENEMY_TYPES.HEALER) {
        enemy.userData.healRange = config.healRange;
        enemy.userData.healAmount = config.healAmount;
        enemy.userData.healCooldown = config.healCooldown;
        enemy.userData.lastHealTime = 0;
        
        // Create heal aura visual
        addHealAuraToEnemy(enemy);
    }
    
    if (enemyType === ENEMY_TYPES.ELITE) {
        // Randomly select an elite type
        const eliteTypes = ['speed', 'damage', 'health', 'range'];
        enemy.userData.eliteType = eliteTypes[Math.floor(Math.random() * eliteTypes.length)];
        
        // Apply elite modifiers
        applyEliteModifiers(enemy);
        
        // Add special attack cooldown
        enemy.userData.specialAttackCooldown = config.specialAttackCooldown;
        enemy.userData.lastSpecialAttackTime = 0;
    }
    
    // Add enemy to the scene and tracking arrays
    scene.add(enemy);
    enemies.push(enemy);
    activeEnemies.push(enemy);
    
    return enemy;
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
function moveEnemy(enemy, direction, speed = null) {
    const moveSpeed = speed || enemy.userData.speed;
    const movement = direction.clone().multiplyScalar(moveSpeed);
    
    // Store original position for collision detection
    const originalX = enemy.position.x;
    const originalZ = enemy.position.z;
    
    // Apply movement
    enemy.position.x += movement.x;
    enemy.position.z += movement.z;
    
    // Boundary check - UPDATED to match expanded map size
    const boundary = 112.5; // Updated from 75 to match player boundary limits
    enemy.position.x = Math.max(-boundary, Math.min(boundary, enemy.position.x));
    enemy.position.z = Math.max(-boundary, Math.min(boundary, enemy.position.z));
    
    // Basic collision detection with player and other enemies
    if (checkEnemyCollisions(enemy, originalX, originalZ)) {
        enemy.position.x = originalX;
        enemy.position.z = originalZ;
    }
}

// Function to check enemy collisions
function checkEnemyCollisions(enemy, originalX, originalZ) {
    // Check collision with player
    const playerRadius = 0.5;
    const distToPlayer = Math.sqrt(
        Math.pow(enemy.position.x - player.position.x, 2) +
        Math.pow(enemy.position.z - player.position.z, 2)
    );
    
    if (distToPlayer < playerRadius + enemy.geometry.parameters.width / 2) {
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
        
        const enemyRadius = enemy.geometry.parameters.width / 2;
        
        if (distToLamp < (lamp.userData.collisionRadius + enemyRadius)) {
            return true; // Collision with lamp post
        }
    }
    
    // NEW: Check collisions with road blockade areas
    const roadEndX = 110; // Same as in addRoadBlockades
    const roadWidth = 15;
    const blockadeDepth = 12; // How "deep" the blockade area is
    const enemyRadius = enemy.geometry.parameters.width / 2;
    
    // East blockade area (positive X)
    if (Math.abs(enemy.position.x - roadEndX) < blockadeDepth && Math.abs(enemy.position.z) < roadWidth / 2 + 5) {
        return true; // Collision with east blockade area
    }
    
    // West blockade area (negative X)
    if (Math.abs(enemy.position.x + roadEndX) < blockadeDepth && Math.abs(enemy.position.z) < roadWidth / 2 + 5) {
        return true; // Collision with west blockade area
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

// Update the takeDamage function to prevent damage while paused
function takeDamage(amount) {
    // Skip damage if game is paused or infinite health is enabled
    if (isPaused || infiniteHealthCheat) {
        return;
    }
    
    // Regular damage handling continues unchanged
    if (shield > 0) {
        if (shield >= amount) {
            shield -= amount;
        } else {
            const remainingDamage = amount - shield;
            shield = 0;
            health -= remainingDamage;
        }
    } else {
        health -= amount;
    }
    
    shield = Math.max(0, shield);
    health = Math.max(0, health);
    updateHUD();
    gameStats.damageTaken += amount;
    
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
    // Update kill statistics
    switch (enemy.userData.type) {
        case ENEMY_TYPES.NORMAL:
            gameStats.kills.normal++;
            playerCoins += 1; // Add coins for normal enemy
            break;
        case ENEMY_TYPES.TANK:
            gameStats.kills.tank++;
            playerCoins += 5; // Add coins for tank enemy
            break;
        case ENEMY_TYPES.RANGED:
            gameStats.kills.ranged++;
            playerCoins += 3; // Add coins for ranged enemy
            break;
        case ENEMY_TYPES.BOSS:
            gameStats.kills.boss++;
            playerCoins += 10; // Add coins for boss enemy
            break;
    }

    // Make sure to update the coin display immediately
    updateCoinDisplay();
    
    // Make sure to log the coin value for debugging
    console.log("Player coins: " + playerCoins);
    
    // Remove from activeEnemies array
    const index = activeEnemies.indexOf(enemy);
    if (index !== -1) {
        activeEnemies.splice(index, 1);
    }
    
    // Also remove from master enemies array
    const masterIndex = enemies.indexOf(enemy);
    if (masterIndex !== -1) {
        enemies.splice(masterIndex, 1);
    }
    
    // Update enemies remaining count based on how many are left in the active array
    const remainingEnemies = activeEnemies.length;
    document.getElementById('enemiesRemaining').textContent = `Enemies: ${remainingEnemies}`;
    
    // Create defeat animation
    createEnemyDefeatAnimation(enemy);
    
    // Remove enemy from scene
    scene.remove(enemy);
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
            // Remove game over screen
            document.getElementById('gameOverScreen').remove();
            
            // Reset game state
            resetGame();
            document.getElementById('roundInfo').style.display = 'none';
            
            // Clean up UI elements
            cleanupGameUI();
            
            // Show main menu
            document.getElementById('menu').style.display = 'block';
            document.getElementById('backgroundScene').style.display = 'block';
            document.getElementById('gameScene').style.display = 'none';
            
            // Reset game started state
            gameStarted = false;
        });
    }, 2500);
}

// Function to show victory screen
function showVictoryScreen() {
    isGameOver = true;
        
    // Hide crosshair when showing victory screen
    hideCrosshair();
    
    // Hide HUD elements
    document.getElementById('hud').style.display = 'none';    
    // Update statistics on victory screen
    document.getElementById('damageDealt').textContent = `Damage Dealt: ${gameStats.damageDealt}`;
    document.getElementById('damageTaken').textContent = `Damage Taken: ${gameStats.damageTaken}`;
    document.getElementById('normalKills').textContent = `Normal: ${gameStats.kills.normal}`;
    document.getElementById('tankKills').textContent = `Tank: ${gameStats.kills.tank}`;
    document.getElementById('rangedKills').textContent = `Sniper: ${gameStats.kills.ranged}`;
    document.getElementById('bossKills').textContent = `Boss: ${gameStats.kills.boss}`;
    
    // Show victory screen
    document.getElementById('victoryScreen').style.display = 'flex';
    document.exitPointerLock();
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
    
    // Clear all arrays
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
    const meteorMaterial = new THREE.MeshBasicMaterial({
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
        gravity: 0.008, // Assuming this is the normal gravity
        moveSpeedMultiplier: 1.0
    };
    
    // Make gravity inconsistent
    GRAVITY = 0.004; // Half gravity during warp
    
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
    
    // Restore original movement settings
    if (window.originalMovementSettings) {
        GRAVITY = window.originalMovementSettings.gravity;
    }
    
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

// Replace the existing return button event listener for the victory screen
document.getElementById('returnToMenuButton').addEventListener('click', () => {
    // Hide victory screen
    document.getElementById('victoryScreen').style.display = 'none';
    
    // Reset game state
    resetGame();
    document.getElementById('roundInfo').style.display = 'none';
    
    // Clean up UI elements
    cleanupGameUI();
    
    // Show main menu and hide game scene
    document.getElementById('menu').style.display = 'block';
    document.getElementById('backgroundScene').style.display = 'block';
    document.getElementById('gameScene').style.display = 'none';
    
    // Reset game started state
    gameStarted = false;
    
    // Make sure cursor is visible
    document.body.style.cursor = 'auto';
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
    
    const ammoDisplay = document.createElement('div');
    ammoDisplay.id = 'ammoDisplay';
    ammoDisplay.style.color = 'white';
    ammoDisplay.style.fontSize = '24px';
    ammoDisplay.style.fontWeight = 'bold';
    ammoDisplay.textContent = `${pistolAmmo}/${pistolMaxAmmo}`;
    
    ammoContainer.appendChild(ammoDisplay);
    hud.appendChild(ammoContainer);
    
    // Set initial visibility based on selected weapon
    ammoContainer.style.display = (inventory[selectedSlot] === WEAPON_TYPES.PISTOL) ? 'block' : 'none';
}

// Update ammo display
function updateAmmoDisplay() {
    const ammoDisplay = document.getElementById('ammoDisplay');
    if (ammoDisplay) {
        ammoDisplay.textContent = `${pistolAmmo}/${pistolMaxAmmo}`;
        
        // Red when low on ammo
        if (pistolAmmo <= 3) {
            ammoDisplay.style.color = '#ff0000';
        } else {
            ammoDisplay.style.color = '#ffffff';
        }
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
