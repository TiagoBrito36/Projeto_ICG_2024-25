# Apocalypse: Last Stand 

A first-person combat arena game developed with Three.js for the Introduction to Computer Graphics course (2024-25).

![Game Screenshot](assets/images/background.png)

## Description

Last Stand: Apocalypse is a wave-based first-person shooter where players must survive increasingly difficult rounds of enemies in a post-apocalyptic setting. The game features various enemy types, weapon systems, environmental elements, and a complete progression system with multiple bosses.

## Technologies Used

- **Three.js** - 3D rendering engine
- **JavaScript** - Core programming language
- **HTML5 & CSS** - Structure and styling

## Features

- **First-person combat system** with multiple weapons:
  - Knife for melee attacks
  - Pistol with ammunition management
  - Consumable items (medkits, shield boosters)
  
- **Extensive enemy variety** with unique behaviors:
  - Basic enemies (standard movement and attacks)
  - Tank enemies (slower but more health)
  - Speeder enemies (fast movement with strafe capabilities)
  - Ranged enemies (attack from distance with projectiles)
  - Teleporter enemies (can teleport closer to player)
  - Exploder enemies (explode on death causing area damage)
  - Shielder enemies (have front-facing shields reducing damage)
  - Healer enemies (heal nearby enemies)
  - Elite enemies (enhanced versions with special abilities)
  - Multiple boss types with unique attack patterns:
    - The Guardian (standard boss with multiple attack patterns)
    - The Warden (heavy boss with shield wall and ground slam abilities)
    - The Phantom (elusive boss with clones and void zones)
    - The Mega Boss (final challenge with devastating abilities)

- **Round progression** with increasing difficulty
  - Multiple rounds with escalating enemy counts and types
  - Special boss rounds at key intervals
  - Victory screen upon completion
  
- **Complete game systems**:
  - Player health and shield mechanics
  - Ammunition management and reloading
  - Inventory system with 10 slots for items
  - Coin-based economy with shop system
  - Collision detection for all objects in the world
  - Particle effects for impacts, explosions and environment
  - Damage indicators when hit

- **Responsive UI**:
  - Dynamic HUD showing health, shield, ammo and coins
  - Inventory display system
  - Shop interface for purchasing items
  - Pause menu with game controls
  - Character customization options

- **Detailed environment**:
  - Apocalyptic road with damaged asphalt and markings
  - Dynamic mountain generation for terrain
  - Road blockades at map boundaries
  - Road lamps with realistic light effects:
    - Working lamps with steady light
    - Damaged lamps with flickering and spark effects
    - Broken lamps with physical damage details
  - Debris and environmental details

## How to Play

### Run Game

Access the game directly at:
[https://tiagobrito36.github.io/Projeto_ICG_2024-25/](https://tiagobrito36.github.io/Projeto_ICG_2024-25/)

### Controls

- **WASD** - Movement
- **Mouse** - Look around
- **Left Click** - Attack/Shoot
- **1-5** - Switch weapons/items
- **R** - Reload pistol
- **E** - Interact/Use item
- **Tab** - Open inventory
- **B** - Open shop (when available)
- **P** - Pause game
- **Esc** - Exit pointer lock
- **F11** - Toggle fullscreen
- **F** - Toggle FPS display

## Game Mechanics

- Survive waves of enemies across increasingly difficult rounds
- Defeat all enemies in a round to progress to the next
- Manage your ammunition, health and shield carefully
- Collect coins from defeated enemies to purchase items
- Use the shop between rounds to upgrade your equipment
- Adapt your strategy for different enemy types
- Boss battles require specific tactics to overcome

## Project Structure

- `index.html` - Main HTML file
- `main.js` - Game logic and Three.js implementation
- `styles.css` - Styling for UI elements
- `assets/` - Game assets including images and models

## Cheat Codes

For debugging and testing purposes, you can access the following cheats:
- Open the browser console (F12) and type:
  - `toggleInfiniteHealth()` - Activate god mode (infinite health)
  - `toggleInfiniteMoney()` - Unlimited coins
  - `skipToNextRound()` - Skip to the next round

## Academic Context

This project was developed for the Introduction to Computer Graphics course at University of Aveiro during the 2024-25 academic year. It demonstrates practical application of 3D graphics programming concepts including:

- 3D rendering techniques
- Camera manipulation
- Collision detection
- Animation systems
- Lighting effects (point lights, ambient lighting)
- Particle systems
- Materials and textures
- User interface integration with 3D environments

## Author

Tiago Brito

---

*This project is for educational purposes only.*


