# DG Helper

This is an Alt1 Toolkit plugin for RuneScape Dungeoneering that enhances the in-game dungeon map with real-time overlays.

The plugin reads the dungeon map directly from the game and builds a virtual representation of the floor. Using this data it can identify visited rooms, locked rooms, key doors and potential critical path.

One of the main features is dynamic key door highlighting:
- Green key doors mean you already own the required key
- Red key doors mean the key is still missing

This allows players to instantly identify which paths are currently accessible without constantly checking their key list.

DG Helper can also mark likely critical paths through the dungeon. The critical path system works by examining skill doors and dungeon resources to determine whether a path is likely required for progression or can safely be ignored. The calculations are based on a maxed player account and only works if you are the red player icon on the map. 

## Notes

The in-game Dungeoneering map is transparent... which is great for aesthetics and terrible for screen reading. Since this plugin relies entirely on image detection, the map background can heavily affect accuracy depending on what is moving behind it. NPCs, particles, animations and random visual noise can all interfere with detection. For best results: Put an unused interface, for example the familiar interface, behind the dungeon map to create a stable background.


# Installation

Alt1 Installation link:
alt1://addapp/

# ⚠️ Disclaimer

This tool was built purely for **fun and personal use**.

- There is **no guarantee of accuracy**
- If something breaks, there is **no guarantee it will be fixed**, though I may try if I have time

Use at **your own risk**.