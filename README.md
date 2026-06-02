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
- If a room contains multiple doors requiring the same skill, the plugin currently cannot reliably determine which detected icon belongs to which specific door.
  
Too bad Jagex kind of nerfed the whole concept of critical paths with the Daemonheim Drift update by shifting XP rewards more towards full exploration instead of efficient pathing and boss rushing. Still, seeing which paths are likely important is still pretty useful for navigation, routing and general dungeon awareness.

![Crit Path Skill Door Example](./images/Crit%20path%20skill%20door%20example.png)![Crit Path Resource Example](./images/crit%20path%20resource%20example.png)

### Floor stats

IDK, some stats you'll probably never look at because you're already 3 rooms ahead speedrunning the floor. Originally started as a fun challenge to see if unreachable rooms could actually be derived purely from reading the in-game map and mainly used to debug stuff. Somehow it turned into projected completion times, dead-ends, branches and other stuff.

![DG Stats Example](./images/dg%20stats%20example.png)

### Custom colors
Also yes, all overlay colors are customizable because apparently everyone has very strong opinions about what shade of red means "missing key".

### Goal timer

For the truly sweaty Dungeoneering players, the plugin allows you to set a target completion time. If the floor timer exceeds your configured goal, the plugin will display an Alt1 tooltip to let you know you've missed your target. Whether this serves as motivation or emotional damage is left up to the user. This feature is disabled by default. Setting the goal time to `0:00` disables the timer entirely.

### Player tracking

In a busy 5-player dungeon it can sometimes be surprisingly difficult to quickly spot your own location on the map amongst all the colored player icons. The plugin can help by tracking players and displaying a better overlay directly on the dungeon map. By default, your player is identified based on party join order. If this detection is incorrect for any reason, you can manually select yourself by hovering over your name in the party interface and pressing the configured Alt1 keybind.

https://github.com/user-attachments/assets/7fbc223d-f875-4512-ad06-7f9f307e7b03

### Gatestone highlighting

The personal gatestone and group gatestone icons are annoyingly similar on the minimap. To help with this, the plugin can highlight your personal gatestone, making it much easier to tell at a glance which one is yours and which one belongs to the group.

A before and after example

<img width="238" height="58" alt="image" src="https://github.com/user-attachments/assets/cf13a700-6592-4169-8c7d-609ee98fe02d" />

## Notes and Recommended Settings

The in-game Dungeoneering map is transparent... which is great for aesthetics and terrible for screen reading. Since this plugin relies entirely on image detection, the map background can heavily affect accuracy depending on what is moving behind it. NPCs, particles, animations and random visual noise can all interfere with detection. 

Excessive false positives can reduce performance and cause unnecessary scans. You can visualize this using the **Show Scan Overlay** setting. The magenta overlay is primarily a debugging tool and should normally only appear briefly when entering a newly discovered room. If you see magenta overlays appearing all over the map, the plugin is likely detecting false positives caused by whatever is behind the transparent map.

Possible solutions include:
- Moving the Dungeoneering map outside of the game view.
- Placing an unused interface behind the map to provide a more consistent background.
- Switching Alt1 to DirectX capture mode if you are using OpenGL.
- Accepting that screen reading is cursed and living with the efficiency loss.

The plugin was built with these setting

- Font size: 12
- Local timestamps: ON
- Interface scaling: 100%

Other configurations may still work, but since the plugin relies heavily on screen reading and OCR, changing font rendering or scaling can affect detection accuracy.

# Installation

Alt1 Installation link:
alt1://addapp/https://sleepy-meh-alt-1.github.io/dg-map/appconfig.json

## Special Thanks & Collaboration

Huge thanks to everyone in the [AHelp Discord](https://discord.com/channels/382696689812766720/1273017803225698398/1508754943866175568) for the beta testing, bug reports, feature suggestions and general willingness to break the code in creative ways. A lot of the fixes, optimizations and quality-of-life improvements in this plugin came directly from community feedback and troubleshooting.

Special thanks to **Farmer Hampe** for jumping into the project and contributing features, massive code cleanup/refactoring, and some very significant performance improvements. Several of the optimizations came from questioning my original "scan everything and hope for the best" approach and replacing it with something considerably smarter.

If you encounter bugs, have feature suggestions, performance findings, or just want to provide feedback, please do so in the [**#dungeoneering**](https://discord.com/channels/382696689812766720/1273017803225698398) channel of the **AHelp Discord**. The project is still evolving and community feedback has been invaluable so far.

# ⚠️ Disclaimer

This tool was built purely for **fun and personal use**.

- There is **no guarantee of accuracy**
- If something breaks, there is **no guarantee it will be fixed**, though I may try if I have time
- Yes, I used AI to help with parts of the codebase.

Use at **your own risk**.
