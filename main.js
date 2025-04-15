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

// Item system variables
let inventory = [null, null, null, null, null]; // 5 slots for items
let selectedSlot = 0; // Currently selected slot (0-4)
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
let totalRounds = 5;
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
    BOSS: 'boss'
};

// First, add weapon type constants at the top of your file
const WEAPON_TYPES = {
    KNIFE: 0,
    PISTOL: 1
};

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
    [ENEMY_TYPES.NORMAL]: {
        health: 40,
        speed: 0.05,
        damage: 10,
        size: { width: 0.8, height: 1.8, depth: 0.8 },
        color: 0xff0000,
        attackRange: 2,
        attackCooldown: 1000,
        spawnDelay: 500 // Reduced from 500
    },
    [ENEMY_TYPES.TANK]: {
        health: 150,
        speed: 0.025,
        damage: 25,
        size: { width: 1.6, height: 3.6, depth: 1.6 },
        color: 0x990000,
        attackRange: 2.5,
        attackCooldown: 2000,
        spawnDelay: 1500 // Reduced from 1500
    },
    [ENEMY_TYPES.RANGED]: {
        health: 60,
        speed: 0.05,
        damage: 10,
        size: { width: 0.8, height: 3.6, depth: 0.8 },
        color: 0xff6600,
        attackRange: 15,
        attackCooldown: 2000,
        projectileSpeed: 0.3,
        spawnDelay: 1000 // Reduced from 1000
    },
    [ENEMY_TYPES.BOSS]: {
        health: 500,
        speed: 0.04,
        damage: 30,
        size: { width: 2.5, height: 4, depth: 2.5 },
        color: 0x660066,
        attackRange: 3,
        attackCooldown: 3000,
        specialAttackCooldown: 10000,
        spawnDelay: 3000 // Reduced from 3000
    }
};

// Round configurations
const roundConfigs = [
    { // Round 1
        normal: 10,
        tank: 0,
        ranged: 0,
        boss: 0
    },
    { // Round 2
        normal: 20,
        tank: 0,
        ranged: 0,
        boss: 0
    },
    { // Round 3
        normal: 25,
        tank: 2,
        ranged: 0,
        boss: 0
    },
    { // Round 4
        normal: 25,
        tank: 2,
        ranged: 5,
        boss: 0
    },
    { // Round 5
        normal: 22,
        tank: 5,
        ranged: 10,
        boss: 1
    }
];

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
        document.exitPointerLock();
        hideCrosshair(); // Hide crosshair when inventory is open
        // Initialize drag-drop if needed
        setupItemBarDragAndDrop();
    } else {
        // If closing, clear selection and show crosshair
        selectedInventorySlot = -1;
        document.querySelectorAll('.inventory-slot').forEach(slot => {
            slot.classList.remove('selected');
        });
        
        showCrosshair(); // Show crosshair when inventory is closed
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
        } else {
            // Clear empty slots
            slot.textContent = '';
            slot.classList.add('empty');
        }
    });
}

// Update the getItemSymbol function to use the correct pistol emoji
function getItemSymbol(itemType) {
    switch(itemType) {
        case WEAPON_TYPES.KNIFE: return '🔪'; // Knife emoji
        case WEAPON_TYPES.PISTOL: return '🔫'; // Gun emoji (changed from shield)
        case 2: return '🔋'; // Energy
        case 3: return '🧪'; // Potion
        case 4: return '🔍'; // Special item
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
    
    const itemType = inventoryItems[selectedInventorySlot];
    if (itemType === null) return;
    
    // Apply item effect
    applyItemEffect(itemType);
    
    // Remove item from inventory
    inventoryItems[selectedInventorySlot] = null;
    
    // Update inventory display
    updateInventoryDisplay();
    
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

// Modified addItem function to handle inventory overflow
function addItem(itemType) {
    // First try to add to the hotbar
    const emptySlot = inventory.indexOf(null);
    if (emptySlot !== -1) {
        inventory[emptySlot] = itemType;
        updateItemBar();
        return true;
    }
    
    // If hotbar is full, try to add to inventory
    const emptyInvSlot = inventoryItems.indexOf(null);
    if (emptyInvSlot !== -1) {
        inventoryItems[emptyInvSlot] = itemType;
        updateInventoryDisplay();
        return true;
    }
    
    // Both are full, can't add the item
    console.log("Inventory full!");
    return false;
}

// Centralized function for applying item effects
function applyItemEffect(itemType) {
    switch(itemType) {
        case 0: // Knife/Weapon
            console.log('Using knife');
            // Add a slashing animation
            if (knifeModel) {
                animateKnifeAttack();
            }
            break;
            
        case 1: // Shield
            if (shield < 100) {
                shield = Math.min(shield + 25, 100);
                updateHUD();
                console.log('Shield boosted');
            }
            break;
            
        case 2: // Energy
            // Apply energy effect
            console.log('Energy used');
            break;
        case 3: // Potion
            if (health < 100) {
                health = Math.min(health + 25, 100);
                updateHUD();
                console.log('Health restored');
            }
            break;
        case 4: // Special item
            // Apply special effect
            console.log('Special item used');
            break;
    }
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
    
    if (item === WEAPON_TYPES.KNIFE) {
        if (!knifeModel) {
            createKnifeModel();
        }
        
        knifeModel.visible = true;
        animateKnifeAttack();
        checkEnemyHit();
    } 
    else if (item === WEAPON_TYPES.PISTOL) {
        if (!pistolModel) {
            createPistolModel();
        }
        
        pistolModel.visible = true;
        firePistol();
    }
    else if (item !== null) {
        applyItemEffect(item);
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
    
    // Handle knife visibility
    if (knifeModel) {
        knifeModel.visible = (inventory[selectedSlot] === WEAPON_TYPES.KNIFE);
    }
    
    // Handle pistol visibility
    if (pistolModel) {
        pistolModel.visible = (inventory[selectedSlot] === WEAPON_TYPES.PISTOL);
    }
    
    // Update ammo display container visibility
    const ammoContainer = document.getElementById('ammoContainer');
    if (ammoContainer) {
        // Hide/show the container, not just the display
        ammoContainer.style.display = (inventory[selectedSlot] === WEAPON_TYPES.PISTOL) ? 'block' : 'none';
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
    const BOUNDARY_LIMIT = 75;
    
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
    
    return false; // No collision
}

// Update your startGame function
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
        scene.add(mountain);
        mountains.push(mountain);
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
    
    // Show the HUD
    document.getElementById('hud').style.display = 'flex';
    
    // Reset health and shield
    health = 100;
    shield = 0;
    updateHUD();
    
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

// Update the back button handler
document.getElementById('backButton').addEventListener('click', () => {
    document.getElementById('controlsMenu').style.display = 'none';
    
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

// Replace the existing fullscreen handler
document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key in keys) keys[key] = true;
    if (event.code === 'ShiftLeft') keys.shift = true;
    if (event.code === 'Space') keys.space = true;
    
    // Item slot selection with number keys
    if (gameStarted && !isPaused) {
        if (event.key >= '1' && event.key <= '5') {
            selectSlot(parseInt(event.key) - 1);
        }
        
        // Note: Removed the E key binding for item usage here
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

// Add this function to update the HUD
function updateHUD() {
    document.getElementById('healthBar').style.width = `${health}%`;
    document.getElementById('healthText').textContent = Math.ceil(health);
    document.getElementById('shieldBar').style.width = `${shield}%`;
    document.getElementById('shieldText').textContent = Math.ceil(shield);
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

document.getElementById('returnToMainButton').addEventListener('click', () => {
    // Reset game state
    isPaused = false;
    gameStarted = false;
    
    // Reset color selection
    selectedColor = null;
    playerColor = 0x00ff00;
    
    // Reset color buttons
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Disable start game button
    document.getElementById('startGame').disabled = true;
    
    // Hide game elements
    document.getElementById('pauseMenu').style.display = 'none';
    document.getElementById('gameScene').style.display = 'none';
    
    // Clean up UI elements
    cleanupGameUI();
    
    // Show menu elements
    document.getElementById('menu').style.display = 'block';
    document.getElementById('backgroundScene').style.display = 'block';
    
    // Reset player and camera
    if (player) {
        scene.remove(player);
        player = null;
    }
    
    // Clear mountains
    mountains.forEach(mountain => scene.remove(mountain));
    mountains = [];
    
    // Hide HUD
    document.getElementById('hud').style.display = 'none';
    
    // Reset stats
    health = 100;
    shield = 0;
    
    // FIXED: Clear countdown and hide round information
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    document.getElementById('roundInfo').style.display = 'none';
    document.getElementById('countdown').style.display = 'none';
});

// Add these event listeners after your other pause menu event listeners
document.getElementById('controlsButtonPause').addEventListener('click', () => {
    controlsAccessedFrom = 'pause';
    document.getElementById('pauseMenu').style.display = 'none';
    document.getElementById('controlsMenu').style.display = 'block';
    // Keep HUD hidden when in controls
    document.getElementById('hud').style.display = 'none';
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
    const totalEnemies = config.normal + config.tank + config.ranged + config.boss;
    document.getElementById('enemiesRemaining').textContent = `Enemies: ${totalEnemies}`;
    
    // Start round
    isRoundActive = true;
    
    // Spawn enemies based on round configuration
    spawnEnemiesForRound(config);
}

// Function to handle enemy spawning for a round
function spawnEnemiesForRound(config) {
    let spawnQueue = [];
    
    // Add normal enemies to spawn queue
    for (let i = 0; i < config.normal; i++) {
        spawnQueue.push(ENEMY_TYPES.NORMAL);
    }
    
    // Add tank enemies to spawn queue
    for (let i = 0; i < config.tank; i++) {
        spawnQueue.push(ENEMY_TYPES.TANK);
    }
    
    // Add ranged enemies to spawn queue
    for (let i = 0; i < config.ranged; i++) {
        spawnQueue.push(ENEMY_TYPES.RANGED);
    }
    
    // Add boss enemies to spawn queue
    for (let i = 0; i < config.boss; i++) {
        spawnQueue.push(ENEMY_TYPES.BOSS);
    }
    
    // Shuffle spawn queue for randomness
    spawnQueue = shuffleArray(spawnQueue);
    
    // Start spawning enemies from queue
    spawnEnemiesFromQueue(spawnQueue);
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

// Function to spawn a single enemy
function spawnEnemy(enemyType) {
    const config = enemyConfigs[enemyType];
    
    // Create enemy mesh
    const geometry = new THREE.BoxGeometry(
        config.size.width,
        config.size.height,
        config.size.depth
    );
    const material = new THREE.MeshPhongMaterial({ color: config.color });
    const enemy = new THREE.Mesh(geometry, material);
    
    // Position enemy at a random location on the edge of the map
    const spawnRadius = 70;
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
    if (enemyType === ENEMY_TYPES.RANGED) {
        enemy.userData.projectileSpeed = config.projectileSpeed;
    }
    
    if (enemyType === ENEMY_TYPES.BOSS) {
        enemy.userData.specialAttackCooldown = config.specialAttackCooldown;
        enemy.userData.lastSpecialAttackTime = 0;
    }
    
    // Add enemy to the scene and tracking arrays
    scene.add(enemy);
    enemies.push(enemy);
    activeEnemies.push(enemy);
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
        
        // Enemy behavior based on type
        switch (enemy.userData.type) {
            case ENEMY_TYPES.NORMAL:
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
                break;
                
            case ENEMY_TYPES.TANK:
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
                break;
                
            case ENEMY_TYPES.RANGED:
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
                break;
                
            case ENEMY_TYPES.BOSS:
                // Move towards player if not in attack range
                if (distanceToPlayer > enemy.userData.attackRange) {
                    moveEnemy(enemy, directionToPlayer);
                } else {
                    // Regular attack if cooldown expired
                    if (now - enemy.userData.lastAttackTime >= enemy.userData.attackCooldown) {
                        attackPlayer(enemy);
                        enemy.userData.lastAttackTime = now;
                    }
                    
                    // Special attack if cooldown expired
                    if (now - enemy.userData.lastSpecialAttackTime >= enemy.userData.specialAttackCooldown) {
                        bossSpecialAttack(enemy);
                        enemy.userData.lastSpecialAttackTime = now;
                    }
                }
                break;
        }
        
        // Make enemy face player
        enemy.lookAt(player.position);
    }
    
    // Update projectiles
    updateProjectiles();
    
    // Check if round is complete
    if (activeEnemies.length === 0 && isRoundActive) {
        endRound();
    }
}

// Function to move enemy
function moveEnemy(enemy, direction) {
    const speed = enemy.userData.speed;
    const movement = direction.clone().multiplyScalar(speed);
    
    // Store original position for collision detection
    const originalX = enemy.position.x;
    const originalZ = enemy.position.z;
    
    // Apply movement
    enemy.position.x += movement.x;
    enemy.position.z += movement.z;
    
    // Boundary check
    const boundary = 75;
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
    
    return false;
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

// Function to attack player
function attackPlayer(enemy) {
    // Play attack animation or visual effect
    
    // Apply damage to player
    takeDamage(enemy.userData.damage);
}

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
        // Flash effect for hit feedback
        enemy.material.emissive.setHex(0xff0000);
        setTimeout(() => {
            if (enemy.material) {
                enemy.material.emissive.setHex(0x000000);
            }
        }, 100);
    }
}

// Function to handle enemy defeat
function defeatEnemy(enemy) {
    // Update kill statistics
    switch (enemy.userData.type) {
        case ENEMY_TYPES.NORMAL:
            gameStats.kills.normal++;
            break;
        case ENEMY_TYPES.TANK:
            gameStats.kills.tank++;
            break;
        case ENEMY_TYPES.RANGED:
            gameStats.kills.ranged++;
            break;
        case ENEMY_TYPES.BOSS:
            gameStats.kills.boss++;
            break;
    }
    
    // Remove from activeEnemies array
    const index = activeEnemies.indexOf(enemy);
    if (index !== -1) {
        activeEnemies.splice(index, 1);
    }
    
    // Update enemies remaining count
    document.getElementById('enemiesRemaining').textContent = `Enemies: ${activeEnemies.length}`;
    
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
    
    // Calculate time until next round
    const betweenRoundWait = betweenRoundTime + (currentRound - 1) * 5;
    
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

// Updated handlePlayerDeath function to hide crosshair
function handlePlayerDeath() {
    isGameOver = true;
    
    // Make sure to exit pointer lock
    if (document.pointerLockElement) {
        document.exitPointerLock();
    }
    
    // Hide HUD elements and crosshair
    document.getElementById('hud').style.display = 'none';
    hideCrosshair(); // Add this line to hide crosshair
    
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

// Add this function to properly remove UI elements when returning to menu
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
}

// Function to reset game state
function resetGame() {
    // Clean up enemies
    for (const enemy of enemies) {
        scene.remove(enemy);
    }
    
    // Clean up projectiles
    for (const projectile of projectiles) {
        scene.remove(projectile);
    }
    
    // Clean up bullets
    for (const bullet of bullets) {
        scene.remove(bullet);
    }
    bullets = [];
    
    // Remove player from scene if it exists
    if (player) {
        // Make sure to remove weapon models from camera first to prevent memory leaks
        if (knifeModel) {
            camera.remove(knifeModel);
            knifeModel = null;
        }
        if (pistolModel) {
            camera.remove(pistolModel);
            pistolModel = null;
        }
        scene.remove(player);
        player = null; // Clear the reference so a new player can be created
    }
    
    // Clean up UI elements
    cleanupGameUI();
    
    // Reset game state
    enemies = [];
    activeEnemies = [];
    projectiles.length = 0;
    isRoundActive = false;
    isGameOver = false;
    currentRound = 0;
    
    // Reset player stats
    health = 100;
    shield = 0;
    
    // Reset weapon stats
    pistolAmmo = pistolMaxAmmo;
    pistolReloading = false;
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
