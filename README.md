# Bstein’s Adventure

Tiny mobile-friendly HTML5 platformer. No libraries, no assets. Works in any modern browser.
The explorer (Bran) is hunting for **Goldstein’s Penny**. Collect coins, dodge hazards, and reach the big shiny penny at the far right.

## Controls
Mobile: on-screen buttons at the bottom.  
Desktop: A/D or Arrow keys to move, Space/Up to jump.

## Local run
Just open `index.html` in a browser.

## How to put this on GitHub (and make it playable from a link)
1. Create a new public repo on GitHub called `bsteins-adventure`.
2. Upload these files at the repo root: `index.html`, `style.css`, `game.js`, `README.md`.
3. Commit.
4. Enable GitHub Pages: Settings → Pages → Build and deployment → Source: **Deploy from a branch**; Branch: **main**; Folder: **/** (root). Save.
5. After a minute, GitHub Pages gives you a URL like `https://<your-username>.github.io/bsteins-adventure/`. Open it on your phone.

## Notes
- Everything is canvas-based so performance is consistent on mobile and desktop.
- If you want to tweak level layout, open `game.js` and edit `buildLevel()`.
