# Banana-Rama Ninja Game

A fun 2D platformer game created for Cornhacks 2025 where you play as a ninja banana collecting coins and avoiding obstacles!

## Quick Start Guide

### Method 1: Direct File Opening
1. Simply double-click the `index.html` file in the project folder
2. The game will open in your default web browser

### Method 2: Using Local Server (Recommended)

#### Using Python HTTP Server
1. Open a terminal/command prompt
2. Navigate to the game directory:
```bash
cd "c:\Users\Tony D'Agosto\OneDrive\Desktop\VSCode\Cornhacks2025-1"
```
3. Start the Python HTTP server:
   - If you have Python 3:
     ```bash
     python -m http.server 8000
     ```
   - If you have Python 2:
     ```bash
     python -m SimpleHTTPServer 8000
     ```
4. Open your web browser and go to:
   ```
   http://localhost:8000
   ```

#### Using VS Code Live Server
1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"
4. The game will automatically open in your default browser

## Game Controls
- **A** - Move Left
- **D** - Move Right
- **W** or **Spacebar** - Jump
- **P** or **Escape** - Pause Game

## Game Features
- Collect banana coins for points
- Avoid red obstacles
- Use yellow checkpoint platforms to save your progress
- Reach the green goal platform to win
- 3 lives to complete the level
- Pause menu and game state system

## Browser Compatibility
- Chrome (Recommended)
- Firefox
- Edge
- Safari

## Troubleshooting
If you encounter any issues:
1. Make sure all three files (`index.html`, `style.css`, and `game.js`) are in the same directory
2. Try using a local server instead of opening the file directly
3. Clear your browser cache if you make changes to the files
4. Check the browser's console (F12) for any error messages

## Development
This game is structured to be easily extensible. You can:
- Add new levels by modifying the `levelData` object in `game.js`
- Create new obstacles by adding to the platforms array
- Modify game physics by adjusting the constants at the top of `game.js`