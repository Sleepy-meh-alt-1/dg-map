A1lib.identifyApp("appconfig.json");

const reader = new Chatbox.default();
const appColor = A1lib.mixColor(255, 199, 0);
const timestampRegex = /\[\d{2}:\d{2}:\d{2}\]/g;

let chatInterval = null;
let dungeonStartTime = null;
let inFloor = false;
let myKeys;
let GRID_WIDTH = 8, GRID_HEIGHT = 8, grid, mapWidth = 280;

let failedGoal = false;

const RED = 0xffff0000
const GREEN = 0xff33aa33
const ORANGE = 0xffff8800

window.setTimeout(() => {
  reader.readargs = {
    colors: [
      A1lib.mixColor(255, 255, 255),
      A1lib.mixColor(0, 255, 0),
      A1lib.mixColor(30, 255, 0),
      A1lib.mixColor(45, 186, 20),
      A1lib.mixColor(255, 203, 5),
      A1lib.mixColor(30, 255, 0),

      // Key colors
      A1lib.mixColor(51, 102, 255), // blue
      A1lib.mixColor(220, 20, 60), // crimson
      A1lib.mixColor(254, 222, 0), // gold
      A1lib.mixColor(0, 255, 0), // green
      A1lib.mixColor(255, 102, 0), // orange
      A1lib.mixColor(102, 0, 255), // purple
      A1lib.mixColor(191, 191, 191), // silver
      A1lib.mixColor(255, 255, 0), // yellow
    ],
    backwards: true,
  };

  reader.find();

  const findChat = setInterval(() => {
    if (reader.pos === null) reader.find();
    else {
      clearInterval(findChat);
      reader.pos.mainbox = reader.pos.boxes[0];
      showSelectedChat(reader.pos);

      document.getElementById("debugChatStatus").innerText = "Chat: Found";
      chatInterval = setInterval(() => {
        readChatbox();
      }, 200);
    }
  }, 1000);
}, 0);

function showSelectedChat(chat) {
  try {
    alt1.overLayRect(
      appColor,
      chat.mainbox.rect.x,
      chat.mainbox.rect.y,
      chat.mainbox.rect.width,
      chat.mainbox.rect.height,
      2000,
      5
    );
  } catch { }
}

function readChatbox() {
  const opts = reader.read() || [];
  let chatStr = "";
  let chatArr;

  if (opts.length) {
    for (let line in opts) {
      if (!opts[line].text.match(timestampRegex) && line == "0") continue;
      if (opts[line].text.match(timestampRegex)) {
        if (line > 0) chatStr += "\n";
        chatStr += opts[line].text + " ";
        continue;
      }
      chatStr += opts[line].text;
    }
  }

  if (chatStr.trim()) chatArr = chatStr.trim().split("\n");

  if (chatArr) {
    for (let line of chatArr) {
      const chatLine = line.trim();
      if (chatLine && !isInHistory(chatLine)) {
        checkLine(chatLine);
      }
    }
    updateChatHistory(chatArr);
  }
}

function isInHistory(chatLine) {
  if (!sessionStorage.chatHistory) return false;
  return sessionStorage.chatHistory.split("\n").includes(chatLine);
}

function updateChatHistory(chatArr) {
  if (!sessionStorage.chatHistory) {
    sessionStorage.chatHistory = chatArr.join("\n");
    return;
  }
  let history = sessionStorage.chatHistory.split("\n");
  while (history.length > 100) history.shift();
  chatArr.forEach(line => history.push(line.trim()));
  sessionStorage.chatHistory = history.join("\n");
}

function sleep(ms) {
  return new Promise(resolve =>
    setTimeout(resolve, ms)
  );
}
const lastLines = [];
async function checkLine(line) {

  // console.log(line)
  lastLines.unshift(line);

  if (lastLines.length > 11) {
    lastLines.pop();
  }

  document.getElementById("debugChatStatus").innerText = lastLines.join("\n");
  if (line.includes("Welcome to Daemonheim") || line.includes("Dungeon Size") || (!inFloor && line.includes('This ties you to your allies'))) {
    inFloor = true
    dungeonStartTime = Date.now();

    myKeys = new Set();
    await sleep(1000)
    buildGrid();
    failedGoal = false;
    alt1.clearTooltip();
    return;
  }

  if (line.includes("You leave the party.")) {
    myKeys = new Set();
    inFloor = false
    grid = []
    failedGoal = false;
    alt1.clearTooltip();
    return;
  }

  const keyMatch = line.match(/Your party (found|used) a key: (\w+) (\w+) key/i);
  if (keyMatch) {
    const action = keyMatch[1].toLowerCase();
    const color = keyMatch[2].toLowerCase();
    const shape = keyMatch[3].toLowerCase();

    const keyName = `${color} ${shape} key`;

    console.log(action, keyName)

    if (action === "found")
      myKeys.add(keyName);
    else if (action === "used")
      myKeys.delete(keyName);

    return;
  }

  const critMatch = line.match(/level (\d+) (\w+)/i);
  if (critMatch) {
    const level = Number(critMatch[1]);
    const skill = critMatch[2].toLowerCase();
    const iconData = SKILL_ICONS.find(s => s.name.toLowerCase() === skill);

    const skillRoom = scanAdjacentSkillDoors(iconData)[0]
    if (skillRoom) {
      if (level >= iconData.max_level - 10 && level <= iconData.max_level) {
        grid[skillRoom.room.row][skillRoom.room.col].crit = true
      }
      else {
        grid[skillRoom.room.row][skillRoom.room.col].crit = false
      }
    }
    return;
  }


  // [18:58:56] Your perfect juju dungeoneering potion and Daemonheim skill door unlock boost your attempt +6 to open this level 105 Prayer door without the level requirements.
  // TODO
  const tierMatch = line.match(/\(Tier (\d+)\)/i);
  if (tierMatch) {
    const tier = Number(tierMatch[1]);

    const playerRoom = scanPlayerRoom()

    if (playerRoom) {
      if (tier > 8) {
        if (grid[playerRoom.row][playerRoom.col].crit !== false) {
          grid[playerRoom.row][playerRoom.col].crit = true;
        }
      }
      else {
        grid[playerRoom.row][playerRoom.col].crit = false;
      }
    }
    return;
  }
}

function buildGrid() {

  const rsBind = alt1.bindRegion(0, 0, alt1.rsWidth, alt1.rsHeight);
  const matches = JSON.parse(alt1.bindFindSubImg(rsBind, ANCHOR_ICON.icon, ANCHOR_ICON.width, 0, 0, alt1.rsWidth, alt1.rsHeight));
  const location = matches[0];

  if (!location) {
    buildGrid();
    return;
  }

  const mapX = location.x - mapWidth + 28;
  const mapY = location.y + 7;
  const roomSize = 29;
  const gap = 3;

  alt1.overLayText("MAP", 0xffffffff, 20, Math.floor(mapX + mapWidth / 2) - 40, mapY - 40, 3000);

  grid = [];

  for (let row = 0; row < GRID_HEIGHT; row++) {

    const rowArray = [];

    for (let col = 0; col < GRID_WIDTH; col++) {

      const x = mapX + col * (roomSize + gap);
      const y = mapY + row * (roomSize + gap);

      rowArray.push({
        row, col,
        x, y,
        x2: x + roomSize, y2: y + roomSize,
        width: roomSize, height: roomSize,
        color: null, key: null, skill: null, state: null, crit: null,
        up: false, right: false, down: false, left: false,
        player: false
      });

      //alt1.overLayRect(0xff00ff00, x, y, roomSize, roomSize, 1000, 2);
    }

    grid.push(rowArray);
  }
  scanDungeonMapFull();
}

let knownRooms, indexedRooms, unknownAdjacents;

function scanDungeonMapFull() {
  const start = performance.now();
  console.log('scanDungeonMapFull', grid);


  if (!grid || grid.length === 0) {
    return;
  }

  indexedRooms = {};
  knownRooms = new Set();
  unknownAdjacents = new Set();

  for (let row = 0; row < GRID_HEIGHT; row++) {
    for (let col = 0; col < GRID_WIDTH; col++) {
      const room = grid[row][col];
      setRoomState(room);
      indexedRooms[room.id] = room;


      //DEBUG
      alt1.overLayRect(room.color, room.x, room.y, room.width, room.height, 3000, 1)
    }
  }

  showStats()

  const end = performance.now();

  document.getElementById("statScanTime").innerText = Math.round(end - start);

  setTimeout(scanDungeonMapPartial, 1000);
}

function scanDungeonMapPartial() {
  const start = performance.now();
  console.log('scanDungeonMapPartial');

  if (!knownRooms || knownRooms.size === 0)
    return setTimeout(scanDungeonMapFull, 1000);

  for (let roomId of knownRooms) {
    const room = indexedRooms[roomId];

    if (room.state !== 'visited')
      setRoomState(room);

    //DEBUG
    // alt1.overLayRect(room.color, room.x, room.y, room.width, room.height, 2000, 1)

    if (SHOW_KEY_OVERLAY && room.state == 'key') {
      alt1.overLayRect(room.color, room.x, room.y, room.width, room.height, 2000, 1)
    }

    if (SHOW_CRIT_OVERLAY && room.crit != null) {
      alt1.overLayRect(room.crit ? COLOR_CRIT_TRUE : COLOR_CRIT_FALSE, room.x, room.y, room.width, room.height, 2000, 1);
    }
  }

  for (let roomId of unknownAdjacents) {
    const room = indexedRooms[roomId];
    setRoomState(room);

    alt1.overLayRect(0xffff00ff, room.x, room.y, room.width, room.height, 600, 1)

    if (room.state !== "unknown") {
      knownRooms.add(room.id);
    }
  }

  showStats()

  const end = performance.now();

  document.getElementById("statScanTime").innerText = Math.round(end - start);

  setTimeout(scanDungeonMapPartial, 50);
}

function setRoomState(room) {
  room.id = `${room.row}:${room.col}`;

  const img = A1lib.capture(room.x, room.y, room.width, room.height);
  const bind = alt1.bindRegion(room.x, room.y, room.width, room.height);

  // Only sample bottom right corner, avoid icons
  const sampleSize = 7;
  const buffer = 2;

  const startX = img.width - buffer - sampleSize;
  const startY = buffer;

  let total = 0;
  let count = 0;

  // DEBUG
  //alt1.overLayRect(ORANGE, room.x + startX, room.y + startY, sampleSize, sampleSize, 400, 1)


  for (let y = startY; y < startY + sampleSize; y++) {
    for (let x = startX; x < startX + sampleSize; x++) {

      const idx = (y * img.width + x) * 4;

      const r = img.data[idx];
      const g = img.data[idx + 1];
      const b = img.data[idx + 2];

      total += (r + g + b) / 3;

      count++;
    }
  }

  const avgBrightness = total / count;


  // Based on avg brightness, determine the state of the room
  room.color = ORANGE
  room.state = "locked"

  // If it's really dark, set to unknown
  if (avgBrightness < UNKNOWN_THRESHOLD) {
    room.color = RED
    room.state = "unknown"
  }

  // If it's really bright, set to visited
  if (avgBrightness > VISITED_THRESHOLD) {
    room.color = GREEN
    room.state = "visited"

    // Check if the player is here, do I need this? Would also need to update the player icon to match diff colors
    // const matches = JSON.parse(alt1.bindFindSubImg(bind, PLAYER_ICON.icon, PLAYER_ICON.width, 0, 0, room.width, room.height));

    // if (matches.length > 0) {
    //   for (let row = 0; row < GRID_HEIGHT; row++) {
    //     for (let col = 0; col < GRID_WIDTH; col++) {
    //       grid[row][col].player = false;
    //     }
    //   }
    //   room.player = true
    // }
  }

  // if the room is locked, check if it's a key door


  if (room.state === "locked") {
    for (const key of KEY_ICONS) {
      const matches = JSON.parse(alt1.bindFindSubImg(bind, key.icon, key.width, 0, 0, room.width, room.height));

      // if we have the key, set the color to green, oterwise set to red
      if (matches.length > 0) {
        room.state = "key"

        if (myKeys.has(key.name.toLowerCase())) {
          room.color = COLOR_KEY_YES
        }
        else {
          room.color = COLOR_KEY_NO
        }
      }
    }
  }


  if (room.state === "unknown") {
    knownRooms.delete(room.id);
  }
  else {
    knownRooms.add(room.id);
    unknownAdjacents.delete(room.id);
  }

  // alt1.overLayRect(0xffff0000, room.x - 2, room.y - 2, room.width + 2 * 2, room.height + 2 * 2, 600, 1)
  if (room.state === "visited") {

    roomWithCorridors = A1lib.capture(room.x - 2, room.y - 2, room.width + 2 * 2, room.height + 2 * 2);
    room.up = scanEdge(roomWithCorridors, "top");
    room.right = scanEdge(roomWithCorridors, "right");
    room.down = scanEdge(roomWithCorridors, "bottom");
    room.left = scanEdge(roomWithCorridors, "left");


    if (room.up) alt1.overLayRect(0xffff00ff, room.x + Math.round(room.width / 2) - 2, room.y - 4, 4, 4, 600, 2)
    if (room.right) alt1.overLayRect(0xffff00ff, room.x + room.width + 2, room.y + Math.round(room.height / 2) - 2, 4, 4, 600, 2)
    if (room.down) alt1.overLayRect(0xffff00ff, room.x + Math.round(room.width / 2) - 2, room.y + room.height + 2, 4, 4, 600, 2)
    if (room.left) alt1.overLayRect(0xffff00ff, room.x - 4, room.y + Math.round(room.height / 2) - 2, 4, 4, 600, 2)

    if (room.up) {
      const adjacentRoom = indexedRooms[`${room.row - 1}:${room.col}`];
      if (adjacentRoom?.state === "unknown") {
        unknownAdjacents.add(adjacentRoom.id);
        console.log('Found adjacent of', room.id, 'up at', adjacentRoom.id)
      }
    }

    if (room.right) {
      const adjacentRoom = indexedRooms[`${room.row}:${room.col + 1}`];
      if (adjacentRoom?.state === "unknown") {
        unknownAdjacents.add(adjacentRoom.id);
        console.log('Found adjacent of', room.id, 'right at', adjacentRoom.id)
      }
    }

    if (room.down) {
      const adjacentRoom = indexedRooms[`${room.row + 1}:${room.col}`];
      if (adjacentRoom?.state === "unknown") {
        unknownAdjacents.add(adjacentRoom.id);
        console.log('Found adjacent of', room.id, 'down at', adjacentRoom.id)
      }
    }

    if (room.left) {
      const adjacentRoom = indexedRooms[`${room.row}:${room.col - 1}`];
      if (adjacentRoom?.state === "unknown") {
        unknownAdjacents.add(adjacentRoom.id);
        console.log('Found adjacent of', room.id, 'left at', adjacentRoom.id)
      }
    }
  }
}

function scanPlayerRoom() {
  if (!knownRooms || knownRooms.size === 0)
    return null;

  const start = performance.now();
  let playerRoom;
  for (const roomId of [...knownRooms].reverse()) {
    const room = indexedRooms[roomId];
    const bind = alt1.bindRegion(room.x, room.y, room.width, room.height);
    const matches = JSON.parse(alt1.bindFindSubImg(bind, PLAYER_ICON.icon, PLAYER_ICON.width, 0, 0, room.width, room.height));
    if (matches.length > 0) {
      playerRoom = room;
      break;
    }
  }
  const end = performance.now();

  console.log('Player', playerRoom ? `found at ${playerRoom.id}` : 'not found', 'in', Math.round(end - start), 'ms');
  return playerRoom;
}

// MAYBE DELETE
function scanEdge(img, side) {
  const centerX = Math.floor(img.width / 2);
  const centerY = Math.floor(img.height / 2);
  const scanRadius = 4;
  let brightPixels = 0;

  for (let i = -scanRadius; i <= scanRadius; i++) {
    let x;
    let y;

    switch (side) {
      case "top":
        x = centerX + i;
        y = 0;
        break;
      case "right":
        x = img.width - 1;
        y = centerY + i;
        break;
      case "bottom":
        x = centerX + i;
        y = img.height - 1;
        break;
      case "left":
        x = 0;
        y = centerY + i;
        break;
    }

    const idx = (y * img.width + x) * 4;

    const r = img.data[idx];
    const g = img.data[idx + 1];
    const b = img.data[idx + 2];

    const brightness =
      (r + g + b) / 3;

    if (brightness > 25) {
      brightPixels++;
    }
  }

  return brightPixels >= 2;
}

function showStats() {
  let visited = 0;
  let unknown = 0;
  let locked = 0;
  let keys = 0;

  let deadEnds = 0;
  let branches = 0;

  let unreachable = getUnreachableRooms()

  let rpm = "-";

  for (let row = 0; row < GRID_HEIGHT; row++) {
    for (let col = 0; col < GRID_WIDTH; col++) {
      const room = grid[row][col];

      // count states
      switch (room.state) {
        case "visited":
          visited++;
          break;
        case "unknown":
          unknown++;
          break;
        case "locked":
          locked++;
          break;
        case "key":
          keys++;
          break;
      }

      // count exits
      const exits = (room.up ? 1 : 0) + (room.right ? 1 : 0) + (room.down ? 1 : 0) + (room.left ? 1 : 0);

      if (room.state === "visited") {
        if (exits === 1) {
          deadEnds++;
        }

        if (exits >= 3) {
          branches++;
        }
      }
    }
  }


  const total = visited + unknown + locked + keys;

  const completion = total > 0 ? Math.round((visited / total) * 100) : 0;

  const goalMinutes = Number(document.getElementById("goalMinutes").value);
  const goalSeconds = Number(document.getElementById("goalSeconds").value);

  const TARGET_TIME_SECONDS = goalMinutes * 60 + goalSeconds;

  let elapsed = "-";
  let projected = "-";
  let pace = "-";

  if (dungeonStartTime) {
    const seconds = Math.floor((Date.now() - dungeonStartTime) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    elapsed = `${mins}:${secs.toString().padStart(2, "0")}`;
    const minutes = seconds / 60;

    if (minutes > 0) {
      rpm = (visited / minutes).toFixed(2);
    }
  }


  if (dungeonStartTime && completion > 0) {

    const elapsedSeconds = Math.floor((Date.now() - dungeonStartTime) / 1000);

    const mins = Math.floor(elapsedSeconds / 60);

    const secs = elapsedSeconds % 60;

    elapsed = `${mins}:${secs.toString().padStart(2, "0")}`;

    const projectedTotal = elapsedSeconds / (completion / 100);

    const projectedMins = Math.floor(projectedTotal / 60);

    const projectedSecs = Math.floor(projectedTotal % 60);

    projected = `${projectedMins}:${projectedSecs.toString().padStart(2, "0")}`;

    if (!failedGoal && elapsedSeconds > TARGET_TIME_SECONDS && TARGET_TIME_SECONDS > 0) {
      failedGoal = true;
      alt1.setTooltip("Too slow");
    }
  }

  document.getElementById("statVisited").innerText = visited;
  document.getElementById("statUnknown").innerText = unknown;
  document.getElementById("statLocked").innerText = keys + " keys + " + locked + " locked";
  document.getElementById("statUnreachable").innerText = unreachable;

  document.getElementById("statDeadEnds").innerText = deadEnds;
  document.getElementById("statBranches").innerText = branches;

  document.getElementById("statCompletion").innerText = completion;
  document.getElementById("statTime").innerText = elapsed;
  document.getElementById("statProjected").innerText = projected;
  document.getElementById("statRPM").innerText = rpm;

}



function getUnreachableRooms() {

  const fakeGrid = structuredClone(grid);

  const directions = [
    [-1, 0],
    [0, 1],
    [1, 0],
    [0, -1]
  ];

  let changed = true;

  while (changed) {

    changed = false;
    const toLock = [];

    for (let row = 0; row < GRID_HEIGHT; row++) {
      for (let col = 0; col < GRID_WIDTH; col++) {

        const room = fakeGrid[row][col];

        // locked/key become visited
        if (
          room.state === "locked" ||
          room.state === "key"
        ) {

          room.state = "visited";

          // spread into neighbors
          for (const [dr, dc] of directions) {

            const nr = row + dr;
            const nc = col + dc;

            if (
              nr < 0 ||
              nr >= GRID_HEIGHT ||
              nc < 0 ||
              nc >= GRID_WIDTH
            ) {
              continue;
            }

            const neighbor =
              fakeGrid[nr][nc];

            if (!neighbor) {
              continue;
            }

            // unknown becomes locked
            if (
              neighbor.state === "unknown"
            ) {

              toLock.push(neighbor);
            }
          }
        }
      }
    }

    for (const room of toLock) {
      room.state = "locked";
      changed = true;
    }
  }


  let unreachable = 0;
  for (let row = 0; row < GRID_HEIGHT; row++) {
    for (let col = 0; col < GRID_WIDTH; col++) {
      const room = fakeGrid[row][col];

      if (room.state === "unknown") {
        unreachable++;
        grid[row][col].state = "unreachable"

        // debug overlay
        //alt1.overLayRect(0xffff00ff, room.x, room.y, room.width, room.height, 200, 1);

      }
    }
  }

  return unreachable;
}


function scanAdjacentSkillDoors(skill) {


  console.log(skill)
  const playerRoom = scanPlayerRoom();
  console.log(playerRoom)
  // alt1.overLayRect(0xff0000ff, playerRoom.x, playerRoom.y, playerRoom.width, playerRoom.height, 1000, 2);

  if (!playerRoom) {
    return [];
  }

  const matchesFound = [];

  const directions = [
    ["up", -1, 0],
    ["right", 0, 1],
    ["down", 1, 0],
    ["left", 0, -1]
  ];

  for (const [dir, dr, dc] of directions) {

    const row = playerRoom.row + dr;
    const col = playerRoom.col + dc;

    // bounds checks
    if (row < 0 || row >= GRID_HEIGHT || col < 0 || col >= GRID_WIDTH) {
      continue;
    }

    const room = grid[row][col];

    if (!room) {
      continue;
    }

    const bind = alt1.bindRegion(room.x, room.y, room.width, room.height);
    const matches = JSON.parse(alt1.bindFindSubImg(bind, skill.icon, skill.width, 0, 0, room.width, room.height));

    if (matches.length > 0) {

      room.skill = skill.name;
      matchesFound.push({ direction: dir, room, match: matches[0] });
    }
  }

  return matchesFound;
}


/*
GUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII
*/

// Radio buttons to select floor size
document.querySelectorAll('input[name="floorSize"]').forEach(radio => {

  radio.addEventListener("change", () => {
    // TODO CHECK MAP WIDTH VALUES FOR SMALL AND MEDIUM FLOORS
    if (radio.value === "small") { GRID_WIDTH = 4; GRID_HEIGHT = 4; mapWidth = 152 }
    if (radio.value === "medium") { GRID_WIDTH = 4; GRID_HEIGHT = 8; mapWidth = 152 }
    if (radio.value === "large") { GRID_WIDTH = 8; GRID_HEIGHT = 8; mapWidth = 280 }
  });
});

// Brightness debug

let UNKNOWN_THRESHOLD = 37;
let VISITED_THRESHOLD = 62;

const unknownSlider = document.getElementById("unknownSlider");
const visitedSlider = document.getElementById("visitedSlider");

unknownSlider.addEventListener("input", () => {
  UNKNOWN_THRESHOLD = Number(unknownSlider.value);
  document.getElementById("unknownValue").innerText = UNKNOWN_THRESHOLD;
});

visitedSlider.addEventListener("input", () => {
  VISITED_THRESHOLD = Number(visitedSlider.value);
  document.getElementById("visitedValue").innerText = VISITED_THRESHOLD;
});

function hexToAlt1Color(hex) {
  hex = hex.replace("#", "");

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return (
    (255 << 24) |
    (r << 16) |
    (g << 8) |
    b
  );
}

// COLOR SETTINGS SETTINGS
let COLOR_KEY_YES = hexToAlt1Color("#33aa33");
let COLOR_KEY_NO = hexToAlt1Color("#ff0000");

let COLOR_CRIT_TRUE = hexToAlt1Color("#ffd700");
let COLOR_CRIT_FALSE = hexToAlt1Color("#00bfff");

let SHOW_KEY_OVERLAY = true
let SHOW_CRIT_OVERLAY = true;

document.getElementById("colorKeyYes").addEventListener("input", e => COLOR_KEY_YES = hexToAlt1Color(e.target.value));
document.getElementById("colorKeyNo").addEventListener("input", e => COLOR_KEY_NO = hexToAlt1Color(e.target.value));

document.getElementById("colorCritTrue").addEventListener("input", e => COLOR_CRIT_TRUE = hexToAlt1Color(e.target.value));
document.getElementById("colorCritFalse").addEventListener("input", e => COLOR_CRIT_FALSE = hexToAlt1Color(e.target.value));

document.getElementById("showKeyOverlay").addEventListener("change", e => SHOW_KEY_OVERLAY = e.target.checked);
document.getElementById("showCritOverlay").addEventListener("change", e => SHOW_CRIT_OVERLAY = e.target.checked);
