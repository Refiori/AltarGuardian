# Altar Guardian - Design Document

## 🎮 Game Concept
Survival strategy where the player defends a magical Altar from the Void for 30 days.

## 🛠 Technical Stack
- **Frontend**: HTML5, CSS3, JavaScript.
- **Current Graphics**: SVG (to be upgraded to Three.js / Low-poly 3D).
- **Perspective**: Isometric (top-down side view, like Clash of Clans).
- **Version Control**: GitHub.

## 📈 Development Roadmap (10 Stages)

### Stage 1: Real Resources (COMPLETED)
- Supply consumption per guard.
- Guard strength penalty during hunger.
- Mana cost for shield and spells.

### Stage 2: Meaningful Choice (COMPLETED)
- Action costs (Mana/Supplies).
- Diminishing returns for repeated actions.

### Stage 3: Wave Warning (IN PROGRESS)
- Morning forecast of the coming night's power.
- Conscious preparation instead of guessing.

### Stage 4: Matter & Upgrades
- Spend fragments on:
    - Turrets and Towers.
    - Wall reinforcements.
    - New active abilities.
- Visual appearance of buildings on the scene.

### Stage 5: Enemy Types & Bosses
- Enemy classes: Runners (fast), Armored (tanky), Flying (bypass some defenses).
- Bosses on days 10, 20, 30.
- Requirement for specific upgrades to counter specific enemies.

### Stage 6: Night Orders
- Active commands during battle: "Boost Shield", "Summon Guards", "Focused Attack".
- Mana consumption for active spells.

### Stage 7: Random Events
- Dynamic events: Merchant, Fire, Meteorite, Plague.
- Impact on resources and guard morale.

### Stage 8: Persistence & Difficulty
- Auto-save system.
- High-score table.
- Difficulty levels (Easy, Normal, Hardcore).

### Stage 9: Audio & Music
- Day/Night ambient music.
- Combat sound effects (lightning, impact, victory).

### Stage 10: Living Guards
- Individual guard profiles: Names, Classes, Leveling.
- Permanent death and loss of experience.

## 🎨 Visual Overhaul (The 3D Transition)
- **Engine**: Transition from SVG $\rightarrow$ Three.js.
- **Style**: Low-poly, neon accents, dark atmospheric environment.
- **Camera**: Isometric Orthographic.
- **VFX**: Energy domes, particle-based magic, physical wall destruction.
