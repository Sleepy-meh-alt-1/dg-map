# DG Helper

This is an Alt1 Toolkit plugin for the RuneScape Dungeoneering skill that enhances the in-game dungeon map with real-time overlays.

The plugin reads the dungeon map and chatbox messages directly from the game and builds a virtual representation of the floor. Using this data it tries to identify visited rooms, locked rooms, key doors and potential critical paths.

## Features
### Key door highligting

One of the main features is dynamic key door highlighting:

![Key Door Example](./images/key%20example.png)

- Green key doors mean you already own the required key
- Red key doors mean the key is still missing

This allows players to instantly identify which paths are currently accessible without constantly checking their key list.

### Critical path highligting

This plugin can also mark likely critical paths through the dungeon. The critical path system works by examining skill doors and dungeon resources to determine whether a path is likely required for progression or can safely be ignored.

The calculations are based on a maxed player account and currently only work if:
- You are the red player icon on the dungeon map
- You are standing inside the room containing the detected skill door or resource

Too bad Jagex kind of nerfed the whole concept of critical paths with the Daemonheim Drift update by shifting XP rewards more towards full exploration instead of efficient pathing and boss rushing. Still, seeing which paths are likely important is still pretty useful for navigation, routing and general dungeon awareness.

![Crit Path Skill Door Example](./images/Crit%20path%20skill%20door%20example.png)![Crit Path Resource Example](./images/crit%20path%20resource%20example.png)

### Floor stats

IDK, some stats you'll probably never look at because you're already 3 rooms ahead speedrunning the floor. Originally started as a fun challenge to see if unreachable rooms could actually be derived purely from reading the in-game map and mainly used to debug stuff. Somehow it turned into projected completion times, dead-ends, branches and other stuff.

![DG Stats Example](./images/dg%20stats%20example.png)

### Custom colors
Also yes, all overlay colors are customizable because apparently everyone has very strong opinions about what shade of red means "missing key".

## Notes

The in-game Dungeoneering map is transparent... which is great for aesthetics and terrible for screen reading. Since this plugin relies entirely on image detection, the map background can heavily affect accuracy depending on what is moving behind it. NPCs, particles, animations and random visual noise can all interfere with detection. 

# Installation

Alt1 Installation link:
alt1://addapp/https://sleepy-meh-alt-1.github.io/dg-map/appconfig.json

# ⚠️ Disclaimer

This tool was built purely for **fun and personal use**.

- There is **no guarantee of accuracy**
- If something breaks, there is **no guarantee it will be fixed**, though I may try if I have time
- Yes, I used AI to help with parts of the codebase.

Use at **your own risk**.
