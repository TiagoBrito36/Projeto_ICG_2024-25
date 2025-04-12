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
    
    // If opening inventory, pause game mechanics but not the whole game
    if (isInventoryOpen) {
        document.exitPointerLock();
        // Initialize drag-drop if needed
        setupItemBarDragAndDrop();
    } else {
        // If closing, clear selection
        selectedInventorySlot = -1;
        document.querySelectorAll('.inventory-slot').forEach(slot => {
            slot.classList.remove('selected');
        });
        
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
            // Remove text content (icons)
            slot.textContent = '';
            slot.classList.remove('empty');
        } else {
            slot.textContent = '';
            slot.classList.add('empty');
        }
    });
}

// Helper function to get item symbol
function getItemSymbol(itemType) {
    switch(itemType) {
        case 0: return '🔪'; // Using a clearer knife emoji
        case 1: return '🛡️';
        case 2: return '🔋';
        case 3: return '🧪';
        case 4: return '🔍';
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

// Replace the useSelectedItem function with this corrected version
function useSelectedItem() {
    // Check if we have a knife model
    if (!knifeModel) return;
    
    // Get the currently selected item from inventory
    const item = inventory[selectedSlot];
    
    if (item === 0) { // 0 is the knife/weapon item type
        console.log('Using knife');
        // Play knife attack animation
        animateKnifeAttack();
    } else if (item !== null) {
        // Handle other item types by applying their effects
        applyItemEffect(item);
    }
}

// Replace the animateKnifeAttack function with this improved version
function animateKnifeAttack() {
    if (!knifeModel) return;
    
    // If an animation is already running, cancel it first
    if (knifeAnimationInProgress && knifeAnimationId) {
        cancelAnimationFrame(knifeAnimationId);
    }
    
    // Mark animation as in progress
    knifeAnimationInProgress = true;
    
    // Store the original rotation and position
    const originalRotation = {
        x: knifeModel.rotation.x,
        y: knifeModel.rotation.y,
        z: knifeModel.rotation.z
    };
    
    const originalPosition = {
        x: knifeModel.position.x,
        y: knifeModel.position.y,
        z: knifeModel.position.z
    };
    
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
            knifeModel.rotation.x = originalRotation.x + (maxRotation * progress);
            
            // Add slight forward movement
            knifeModel.position.z = originalPosition.z - (thrustDistance * progress);
            
            // Store animation ID for potential cancellation
            knifeAnimationId = requestAnimationFrame(animate);
        } else if (elapsed < attackDuration + returnDuration) {
            // Return motion (100% to 0%)
            const returnProgress = (elapsed - attackDuration) / returnDuration;
            
            // Smoothly return to original rotation
            knifeModel.rotation.x = originalRotation.x + (maxRotation * (1 - returnProgress));
            
            // Return to original position
            knifeModel.position.z = originalPosition.z - (thrustDistance * (1 - returnProgress));
            
            // Store animation ID for potential cancellation
            knifeAnimationId = requestAnimationFrame(animate);
        } else {
            // Ensure knife is fully reset to original position and rotation
            knifeModel.rotation.x = originalRotation.x;
            knifeModel.rotation.y = originalRotation.y;
            knifeModel.rotation.z = originalRotation.z;
            knifeModel.position.x = originalPosition.x;
            knifeModel.position.y = originalPosition.y;
            knifeModel.position.z = originalPosition.z;
            
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
    if (!knifeModel || !gameStarted) return;
    
    if (inventory[selectedSlot] === 0) {
        // Show knife when selected
        knifeModel.visible = true;
    } else {
        // Hide knife when not selected
        knifeModel.visible = false;
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

// Modify the startGame function to show HUD
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
    
    // Update health and shield values
    health = 100;
    shield = 0;
    updateHUD();
    
    // Initialize inventory and item bar with empty slots
    inventory = [null, null, null, null, null];
    inventoryItems = Array(10).fill(null);
    
    // Initialize the knife as first item
    inventory[0] = 0; // 0 is the knife/weapon item type
    selectedSlot = 0; // Select the knife by default
    
    // Update displays
    updateItemBar();
    initializeInventory();
    
    // Create the knife model AFTER camera is properly set up
    setTimeout(() => {
        createKnifeModel();
        console.log("Knife model creation triggered");
    }, 100);
    
    gameStarted = true;
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
        } else {
            document.getElementById('pauseMenu').style.display = 'none';
            // Show HUD elements when unpaused
            document.getElementById('hud').style.display = 'flex';
        }
    }
});

// Update the click event listener to handle both pointer lock and item usage
document.addEventListener('click', (event) => {
    if (gameStarted && !isPaused) {
        if (!isLocked) {
            // Request pointer lock if not already locked
            document.body.requestPointerLock();
        } else {
            // Use the selected item when locked and playing
            useSelectedItem();
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
});

// Replace the existing animate function
function animate() {
    requestAnimationFrame(animate);
    
    // FPS counter
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
    } else if (!isPaused) {
        if (player) {
            updatePlayer();
            updateWeaponVisibility(); // Make sure visibility is updated every frame
        }
        renderer.render(scene, camera);
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
});

// Add these event listeners after your other pause menu event listeners
document.getElementById('controlsButtonPause').addEventListener('click', () => {
    controlsAccessedFrom = 'pause';
    document.getElementById('pauseMenu').style.display = 'none';
    document.getElementById('controlsMenu').style.display = 'block';
    // Keep HUD hidden when in controls
    document.getElementById('hud').style.display = 'none';
});

// Initialize menu scene and start animation
createMenuScene();
animate();

// Add to controls menu
console.log('Type toggleFPS() in the console to show/hide FPS counter');
