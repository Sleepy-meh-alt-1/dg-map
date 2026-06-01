A1lib.identifyApp("appconfig.json");

const reader = new Chatbox.default();
const appColor = A1lib.mixColor(255, 199, 0);
const timestampRegex = /\[\d{2}:\d{2}:\d{2}\]/g;

let chatInterval = null;
let scanPlayerRoomTimeout = null;
let buildGridTimeout = null;

const timeouts = {
  scanInterface: null,
  scanDungeonMap: null,
  scanPlayerRoom: null,
  buildGrid: null,
  highlightCorridors: null,
}

let teamMembersSinceUs = [];
let playerIndex = 0;
let dungeonStartTime = null;
let inFloor = false;
let myKeys;
let GRID_WIDTH = 8, GRID_HEIGHT = 8, grid, mapWidth = 280, mapHeight = 280;
let mapX, mapY;

let failedGoal = false;

let partyListRowBounds = [];
let partyListCaptures = [];

const OVERLAYS = {
  default: 'default',
  members: 'members',
  rooms: 'rooms',
  player: 'player',
  corridors: 'corridors',
}
const currentOverlay = OVERLAYS.default;
const renderedOverlays = new Set();

const RED = 0xffff0000
const GREEN = 0xff33aa33
const ORANGE = 0xffff8800

const TEAM_MEMBER_COLORS = [
  // [210, 53, 0], // [187,60,25], //
  // [2, 133, 129], // [0, 137, 133], //
  // [73, 109, 30],
  // [128, 130, 37],
  // [97, 113, 83],

  // Icon colors
  // [114, 39, 16],
  // [50, 124, 122],
  // [76, 116, 31],
  // [136, 139, 39],
  // [46, 53, 42],

  [186, 52, 6],
  [8, 123, 118],
  [68, 116, 7],
  [130, 134, 6],
  [100, 120, 87],
]

function clearAllOverlays() {
  for (let name of renderedOverlays) {
    clearOverlay(name);
  }
}

function clearOverlay(name) {
  renderedOverlays.delete(name);
  alt1.overLayClearGroup(name);
  alt1.overLayRefreshGroup(name);
}

function overlay(name, draw, reset = true) {
  const prevOverlay = currentOverlay;
  renderedOverlays.add(name);
  alt1.overLaySetGroup(name);
  alt1.overLayFreezeGroup(name);
  if (reset) alt1.overLayClearGroup(name);
  draw();
  alt1.overLayRefreshGroup(name);
  alt1.overLaySetGroup(prevOverlay);
}

window.setTimeout(() => {
  reader.readargs = {
    colors: [
      A1lib.mixColor(255, 255, 255),
      A1lib.mixColor(0, 255, 0),
      A1lib.mixColor(30, 255, 0),
      A1lib.mixColor(45, 186, 20),
      A1lib.mixColor(255, 203, 5),
      A1lib.mixColor(30, 255, 0),

      A1lib.mixColor(210, 183, 109), // light brown (floor start config)

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
  clearAllOverlays();
  alt1.overLaySetGroup(OVERLAYS.default);

  A1lib.on('alt1pressed', handleAlt1Pressed);

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

  scanInterface();
  // scanAnchor();

}, 0);

let partyListOverlayVisibleUntil = 0;

function handleAlt1Pressed(event) {
  console.log('alt1pressed', event)

  if (!inFloor && findAnchor())
    startFloor();

  const { x, y } = event;

  if (x >= mapX && x <= mapX + mapWidth && y >= mapY && y <= mapY + mapHeight) {
    console.log('Map clicked at', x, y);
    for (let i = 0; i < PLAYER_ICONS.length; i++) {
      const icon = PLAYER_ICONS[i];
      const bind = alt1.bindRegion(x - 10, y - 10, 20, 20);
      const matches = JSON.parse(alt1.bindFindSubImg(bind, icon.icon, icon.width, 0, 0, 20, 20));
      if (matches.length > 0) {
        console.log('Selected player index', i);
        playerIndex = i;
      }
      break;
    }
  }
  else if (partyListOverlayVisibleUntil > Date.now() || findDgIcon()) {
    clearOverlay(OVERLAYS.members);
    partyListOverlayVisibleUntil = Date.now();

    for (let i = 0; i < partyListRowBounds.length; i++) {
      const bounds = partyListRowBounds[i];
      if (x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height) {
        playerIndex = i;
        console.log('Player index set to', i);

        overlay(OVERLAYS.members, () => {
          alt1.overLayImage(bounds.x, bounds.y, partyListCaptures[i], bounds.width, 1000)
          alt1.overLayRect(
            A1lib.mixColor(...TEAM_MEMBER_COLORS[i]),
            bounds.x,
            bounds.y,
            bounds.width,
            bounds.height,
            1000,
            playerIndex === i ? 3 : 1
          );
        });
        partyListOverlayVisibleUntil = Date.now() + 1000;
        break;
      }
    }
  }
  else {
    overlay(OVERLAYS.members, () => {
      for (let i = 0; i < partyListRowBounds.length; i++) {
        const bounds = partyListRowBounds[i];
        alt1.overLayImage(bounds.x, bounds.y, partyListCaptures[i], bounds.width, 5000)
        alt1.overLayRect(
          A1lib.mixColor(...TEAM_MEMBER_COLORS[i]),
          bounds.x,
          bounds.y,
          bounds.width,
          bounds.height,
          5000,
          playerIndex === i ? 3 : 1
        );
      }
    });
    partyListOverlayVisibleUntil = Date.now() + 5000;
  }

}

function clearTimeouts() {
  for (let key in timeouts) {
    clearTimeout(timeouts[key]);
    timeouts[key] = null;
  }
}

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

const lastLines = [];
async function checkLine(line) {

  // console.log(line)
  lastLines.unshift(line);

  if (lastLines.length > 11) {
    lastLines.pop();
  }
  document.getElementById("debugChatStatus").innerText = lastLines.join("\n");


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


  const partySizeMatch = line.match(/Party Size:.*(\d):\d/);
  if (partySizeMatch) {
    startFloor();

    if (!partySizeMatch)
      return;

    const size = parseInt(partySizeMatch[1], 10);
    playerIndex = size - teamMembersSinceUs.length;
    console.log(size, playerIndex);
    for (let i = 0; i < size; i++) {
      const color = TEAM_MEMBER_COLORS[i];
      const displayName = i < playerIndex ?
        `Unknown${i + 1}` :
        teamMembersSinceUs[i - playerIndex] || 'Unknown';
      console.log(`%c ${displayName} `, `color: white; background-color: rgb(${color[0]}, ${color[1]}, ${color[2]}); padding: 2px 10px; border-radius: 5px;`);
    }

    teamMembersSinceUs = [];
    return;
  }

  if (line.includes("You leave the party.")) {
    stopFloor();
    return;
  }

  if (!inFloor) {
    const partyStarterMatch = line.match(/You have been set as the party leader/);
    if (partyStarterMatch) {
      console.log("You are the party leader");
      teamMembersSinceUs = ['Us'];
      return;
    }

    const teamMemberJoinedMatch = line.match(/(\[\d{2}:\d{2}:\d{2}\] )?(.*?) has joined the party/);
    if (teamMemberJoinedMatch) {
      const playerName = teamMemberJoinedMatch[2].trim();
      console.log(`'${playerName}' joined the party`);
      teamMembersSinceUs.push(
        teamMembersSinceUs.length ?
          playerName :
          `Us (${playerName})`
      );
      return;
    }
  }
}

function startFloor() {
  clearTimeouts();
  inFloor = true
  dungeonStartTime = Date.now();
  playerIndex = playerIndex || 0;
  myKeys = new Set();
  failedGoal = false;
  buildGrid();
  if (SHOW_PLAYER_HIGHLIGHT)
    scanPlayerRoom();
  scanInterface();
  alt1.clearTooltip();
}

function stopFloor() {
  clearTimeouts();
  scanInterface();
  inFloor = false
  myKeys = new Set();
  grid = []
  failedGoal = false;
  alt1.clearTooltip();
}

// function scanAnchor() {
//   clearTimeout(timeouts.scanAnchor);
//   const location = findAnchor();
//   if (!location) {
//     timeouts.scanAnchor = setTimeout(scanAnchor, 600);
//     console.log('Anchor not found, retrying scanAnchor');
//     return;
//   }

//   startFloor();
// }

function findAnchor() {
  const rsBind = alt1.bindRegion(0, 0, alt1.rsWidth, alt1.rsHeight);
  const matches = JSON.parse(alt1.bindFindSubImg(rsBind, ANCHOR_ICON.icon, ANCHOR_ICON.width, 0, 0, alt1.rsWidth, alt1.rsHeight));
  return matches[0];
}

function buildGrid() {
  const location = findAnchor();

  if (!location) {
    timeouts.buildGrid = setTimeout(buildGrid, 600);
    return;
  }

  // const mapX = location.x - mapWidth + 28;
  // const mapY = location.y + 7;
  mapX = location.x - mapWidth + ANCHOR_ICON.width;
  mapY = location.y;
  const offsetX = 13;
  const offsetY = 14;

  const roomSize = 29;
  const gap = 3;

  // alt1.overLayText("MAP", 0xffffffff, 20, Math.floor(mapX + mapWidth / 2) - 40, mapY - 40, 3000);
  // alt1.overLayRect(0xffff0000, mapX, mapY, mapWidth, mapWidth, 5000, 1);
  // alt1.overLayRect(0xffff0000, mapX + mapPadding, mapY + mapPadding, mapWidth - 2 * mapPadding, mapWidth - 2 * mapPadding, 5000, 1);

  grid = [];

  for (let row = 0; row < GRID_HEIGHT; row++) {

    const rowArray = [];

    for (let col = 0; col < GRID_WIDTH; col++) {

      const x = mapX + offsetX + col * (roomSize + gap);
      const y = mapY + offsetY + row * (roomSize + gap);

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

let knownRooms, indexedRooms, unknownAdjacents, unknownRescans;

function scanDungeonMapFull() {
  clearTimeout(timeouts.scanDungeonMap);
  const start = performance.now();
  console.log('scanDungeonMapFull', grid);


  if (!grid || grid.length === 0) {
    return;
  }

  indexedRooms = {};
  knownRooms = new Set();
  unknownAdjacents = new Set();
  unknownRescans = new Set();

  for (let row = 0; row < GRID_HEIGHT; row++) {
    for (let col = 0; col < GRID_WIDTH; col++) {
      const room = grid[row][col];
      setRoomState(room);
      indexedRooms[room.id] = room;

      //DEBUG
      // alt1.overLayRect(room.color, room.x, room.y, room.width, room.height, 3000, 1)
    }
  }

  showStats()

  const end = performance.now();

  document.getElementById("statScanTime").innerText = Math.round(end - start);

  timeouts.scanDungeonMap = setTimeout(scanDungeonMapPartial, 1000);
}

function highlightCorridors() {
  clearTimeout(timeouts.highlightCorridors);

  if (inFloor && grid && grid.length > 0) {
    overlay(OVERLAYS.corridors, () => {
      for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
          const room = grid[row][col];
          if (room.up)    alt1.overLayRect(0xffff00ff, room.x + Math.round(room.width / 2) - 2, room.y - 4, 4, 4, 5000, 2)
          if (room.down)  alt1.overLayRect(0xffff00ff, room.x + Math.round(room.width / 2) - 2, room.y + room.height + 2, 4, 4, 5000, 2)
          if (room.right) alt1.overLayRect(0xffff00ff, room.x + room.width + 2, room.y + Math.round(room.height / 2) - 2, 4, 4, 5000, 2)
          if (room.left)  alt1.overLayRect(0xffff00ff, room.x - 4, room.y + Math.round(room.height / 2) - 2, 4, 4, 5000, 2)
        }
      }
    });
  }

  timeouts.highlightCorridors = setTimeout(highlightCorridors, 5000);
}
timeouts.highlightCorridors = setTimeout(highlightCorridors, 5000);

function scanDungeonMapPartial() {
  clearTimeout(timeouts.scanDungeonMap);
  const start = performance.now();
  // console.log('scanDungeonMapPartial');

  if (!knownRooms || knownRooms.size === 0) {
    timeouts.scanDungeonMap = setTimeout(scanDungeonMapFull, 1000);
    return;
  }

  overlay(OVERLAYS.rooms, () => {
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

    for (let roomId of unknownRescans) {
      const room = indexedRooms[roomId];
      setRoomState(room);

      alt1.overLayRect(0xffff00ff, room.x, room.y, room.width, room.height, 600, 1)

      if (room.state !== "unknown") {
        knownRooms.add(room.id);
      }
    }
  });

  showStats()

  const end = performance.now();

  document.getElementById("statScanTime").innerText = Math.round(end - start);

  timeouts.scanDungeonMap = setTimeout(scanDungeonMapPartial, 50);
}
window.grid = grid;
window.indexedRooms = indexedRooms;

// const debugLockedRoomCaptures = new Set();
// function exportDebugLockedRoomCaptures() {
//   const imageStrings = [];
//   for (let capture of debugLockedRoomCaptures) {
//     // const img = A1lib.decodeImageString(capture);
//     const canvas = document.createElement('canvas');
//     canvas.width = 29;
//     canvas.height = 29;
//     const ctx = canvas.getContext('2d');
//     const imageData = ctx.createImageData(29, 29);
//     A1lib.decodeImageString(capture, imageData, 0, 0, 29, 29);
//     ctx.putImageData(imageData, 0, 0);
//     imageStrings.push(canvas.toDataURL());
//   }
//   const html = '<html><body>' +
//     imageStrings.map(src => `<img src="${src}" />`).join('') +
//     '</body></html>'

//   return html;
// }
// window.exportDebugLockedRoomCaptures = exportDebugLockedRoomCaptures;

function setRoomState(room) {
  room.id = `${room.row}:${room.col}`;
  // alt1.overLayRect(0xff0000ff, room.x, room.y, room.width, room.height, 1000, 1)

  const img = A1lib.capture(room.x, room.y, room.width, room.height);
  const bind = alt1.bindRegion(room.x, room.y, room.width, room.height);

  // Only sample top right corner, avoid icons
  const sampleSize = 7;
  const buffer = 2;

  const startX = img.width - buffer - sampleSize;
  const startY = buffer;

  let total = 0;
  let count = 0;

  // DEBUG
  //alt1.overLayRect(ORANGE, room.x + startX, room.y + startY, sampleSize, sampleSize, 400, 1)

  // overlay('debug', () => {
  //   alt1.overLayRect(0xffff0000, room.x + startX, room.y + startY, sampleSize, sampleSize, 1000, 1)
  // }, false);

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


  const prevState = room.state;
  // Based on avg brightness, determine the state of the room
  room.color = ORANGE
  room.state = "locked"

  // If it's really dark, set to unknown
  if (avgBrightness < UNKNOWN_THRESHOLD) {
    if (prevState && prevState !== "unknown") {
      // console.log('Room', room.id, 'state changed to unknown from', prevState);
      unknownRescans.add(room.id);
    }
    room.color = RED
    room.state = "unknown"
  }
  else {
    unknownRescans.delete(room.id);
  }

  // If it's really bright, set to visited
  if (avgBrightness > VISITED_THRESHOLD) {
    room.color = GREEN
    room.state = "visited"
  }

  // if the room is locked, check if it's a key door
  if (room.state === "locked") {

    // debugLockedRoomCaptures.add(
    //   A1lib.encodeImageString(img, 0, 0, img.width, img.height)
    // )
    for (const key of KEY_ICONS) {
      const matches = JSON.parse(alt1.bindFindSubImg(bind, key.icon, key.width, 0, 0, room.width, room.height));
      const match = matches[0];

      // if we have the key, set the color to green, oterwise set to red
      if (match) {
        room.state = "key"
        room.color = myKeys.has(key.name.toLowerCase()) ?
          COLOR_KEY_YES :
          COLOR_KEY_NO

        break;
      }
    }

    // If we still haven't found a key, check for highlighted keys
    if (room.state !== "key") {
      for (const key of KEY_HL_ICONS) {
        if (!key.icon) continue;

        const matches = JSON.parse(alt1.bindFindSubImg(bind, key.icon, key.width, 0, 0, room.width, room.height));
        const match = matches[0];

        if (match) {
          room.state = "key"

          myKeys.add(key.name.toLowerCase());
          room.color = COLOR_KEY_YES
          break;
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


    if (SHOW_CORRIDOR_HIGHLIGHT && (room.up || room.right || room.down || room.left))
      highlightCorridors(room);

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
let playerScanCounter = -1;
function scanPlayerRoom() {
  let ready = true;
  if (!knownRooms || knownRooms.size === 0) {
    console.log('Player room scan failed, rooms not indexed yet');
    ready = false;
  }

  if (!playerIndex && playerIndex !== 0) {
    console.log('Player room scan failed, player index not set');
    ready = false;
  }

  clearTimeout(scanPlayerRoomTimeout);
  if (!ready) {
    if (SHOW_PLAYER_HIGHLIGHT)
      timeouts.scanPlayerRoom = setTimeout(scanPlayerRoom, 500);
    return;
  }


  playerScanCounter = (playerScanCounter + 1) % 3;
  const start = performance.now();
  let playerRoom;
  // console.log(playerIndex, PLAYER_ICONS[playerIndex], knownRooms);

  for (const roomId of [...knownRooms].reverse()) {
    const room = indexedRooms[roomId];
    const bind = alt1.bindRegion(room.x, room.y, room.width, room.height);
    const matches = JSON.parse(alt1.bindFindSubImg(bind, PLAYER_ICONS[playerIndex].icon, PLAYER_ICONS[playerIndex].width, 0, 0, room.width, room.height));
    const match = matches[0];
    if (match) {
      playerRoom = room;
      const col = TEAM_MEMBER_COLORS[playerIndex];
      const hexArgb = (0xff << 24) | (col[0] << 16) | (col[1] << 8) | col[2];
      // alt1.overLayRect(hexArgb, room.x + match.x - 3, room.y + match.y - 1, 11, 11, 300, 1);
      // alt1.overLayRect(0xffffffff, room.x + 2, room.y + 2, room.width - 4, room.height - 4, 150, 4);
      overlay(OVERLAYS.player, () => {
        // const offset = playerScanCounter === 0 ? 5 : 2;
        // alt1.overLayRect(hexArgb, room.x + offset, room.y + offset, room.width - offset * 2, room.height - offset * 2, 5000, 3);

        const offset = 2 + playerScanCounter * 2;
        alt1.overLayRect(hexArgb, room.x + offset, room.y + offset, room.width - offset * 2, room.height - offset * 2, 5000, 3);


        // if (playerScanCounter === 0)
        //   alt1.overLayRect(hexArgb, room.x + 5, room.y + 5, room.width - 10, room.height - 10, 5000, 3);
        //   // alt1.overLayRect(hexArgb, room.x + 7, room.y + 7, room.width - 14, room.height - 14, 150, 2);
        // else
        //   alt1.overLayRect(hexArgb, room.x + 2, room.y + 2, room.width - 4, room.height - 4, 5000, 3);
      });
      break;
    }
  }
  const end = performance.now();

  if (SHOW_PLAYER_HIGHLIGHT)
    timeouts.scanPlayerRoom = setTimeout(scanPlayerRoom, 250);

  // console.log(PLAYER_ICONS[playerIndex].name, playerRoom ? `found at ${playerRoom.id}` : 'not found', `in <${Math.ceil((end - start) / 100) * 100} ms`);
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

function findDgIcon() {
  const rsBind = alt1.bindRegion(0, 0, alt1.rsWidth, alt1.rsHeight);
  const matches = JSON.parse(alt1.bindFindSubImg(rsBind, DG_ICON.icon, DG_ICON.width, 0, 0, alt1.rsWidth, alt1.rsHeight));
  return matches[0];
}

function scanInterface() {
  clearTimeout(timeouts.scanInterface);
  const start = performance.now();

  const dgIcon = findDgIcon();
  if (!dgIcon) {
    timeouts.scanInterface = setTimeout(scanInterface, 600);
    // console.log('DG icon not found, retrying scanInterface');
    return;
  }


  // alt1.overLayRect(0xff0000ff, dgIcon.x, dgIcon.y, DG_ICON.width, DG_ICON.height, 1000, 2);

  // alt1.overLayRect(
  //   0xff0000ff,
  //   dgIcon.x + DG_ICON.width,
  //   dgIcon.y + DG_ICON.height - DG_INTERFACE_ROW_END.height,
  //   alt1.rsWidth - (dgIcon.x + DG_ICON.width),
  //   DG_INTERFACE_ROW_END.height,
  //   1000, 2
  // );
  const rowHeight = 22;
  const rowX = dgIcon.x;
  const firstRowLineY = dgIcon.y + DG_ICON.height - DG_INTERFACE_ROW_END.height;

  const rowLineBind = alt1.bindRegion(rowX, firstRowLineY, alt1.rsWidth - rowX, DG_INTERFACE_ROW_END.height);
  const rowLineMatches = JSON.parse(alt1.bindFindSubImg(rowLineBind, DG_INTERFACE_ROW_END.icon, DG_INTERFACE_ROW_END.width, 0, 0, alt1.rsWidth - rowX, DG_INTERFACE_ROW_END.height));
  const rowEnd = rowLineMatches[0];

  if (rowEnd) {
    const rowWidth = rowEnd.x > 160 ? 160 : rowEnd.x;
    const cropX = rowX + Math.floor((rowEnd.x - rowWidth) / 2);

    partyListRowBounds = [];
    partyListCaptures = [];
    overlay(OVERLAYS.members, () => {
      for (let i = 0; i < 5; i++) {
        const rowY = firstRowLineY + rowHeight * i + DG_INTERFACE_ROW_END.height - rowHeight;
        const color = TEAM_MEMBER_COLORS[i];
        alt1.overLayRect(
          A1lib.mixColor(...color),
          cropX,
          rowY,
          rowWidth,
          rowHeight - DG_INTERFACE_ROW_END.height,
          1000, 1
        );

        partyListRowBounds.push({
          x: cropX,
          y: rowY,
          width: rowWidth,
          height: rowHeight - DG_INTERFACE_ROW_END.height
        });

        const img = A1lib.capture(cropX, rowY, rowWidth, rowHeight - DG_INTERFACE_ROW_END.height);
        const imgStr = A1lib.encodeImageString(img, 0, 0, img.width, img.height);
        partyListCaptures.push(imgStr);

        // for (const font of Object.keys(Alt1Fonts)) {
        //   const text = OCR.findReadLine(img, Alt1Fonts[font], [color], Math.floor(rowWidth / 2), Math.floor(rowHeight / 2));
        //   console.log(text.text, font, text);
        // }
      }
    });
  }

  const end = performance.now();

  console.log(`scanInterface finished in ${end - start} ms`, dgIcon);
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
    if (radio.value === "small") { GRID_WIDTH = 4; GRID_HEIGHT = 4; mapWidth = 152; mapHeight = 152 }
    if (radio.value === "medium") { GRID_WIDTH = 4; GRID_HEIGHT = 8; mapWidth = 152; mapHeight = 280 }
    if (radio.value === "large") { GRID_WIDTH = 8; GRID_HEIGHT = 8; mapWidth = 280; mapHeight = 280 }
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
let SHOW_PLAYER_HIGHLIGHT = true;
let SHOW_CORRIDOR_HIGHLIGHT = true;


document.getElementById("colorKeyYes").addEventListener("input", e => COLOR_KEY_YES = hexToAlt1Color(e.target.value));
document.getElementById("colorKeyNo").addEventListener("input", e => COLOR_KEY_NO = hexToAlt1Color(e.target.value));

document.getElementById("colorCritTrue").addEventListener("input", e => COLOR_CRIT_TRUE = hexToAlt1Color(e.target.value));
document.getElementById("colorCritFalse").addEventListener("input", e => COLOR_CRIT_FALSE = hexToAlt1Color(e.target.value));

document.getElementById("showKeyOverlay").addEventListener("change", e => SHOW_KEY_OVERLAY = e.target.checked);
document.getElementById("showCritOverlay").addEventListener("change", e => SHOW_CRIT_OVERLAY = e.target.checked);


document.querySelectorAll(".panel .panel-toggle").forEach(button => {
  const panel = button.closest(".panel");
  const key = panel.dataset.panelKey && `panel_${panel.dataset.panelKey}_collapsed`;
  const open = key ? localStorage.getItem(key) !== "true" : true;

  const togglePanel = (isOpen) => {
    if (isOpen) {
      panel.classList.add("open");
      button.innerText = "–";
      if (key) localStorage.removeItem(key);
    }
    else {
      panel.classList.remove("open");
      button.innerText = "+";
      if (key) localStorage.setItem(key, "true");
    }
  };

  togglePanel(open);

  button.addEventListener("click", () => {
    togglePanel(!panel.classList.contains("open"));
  });
});


document.getElementById("highlightMyLocation").addEventListener("change", e => {
  SHOW_PLAYER_HIGHLIGHT = e.target.checked;
  if (SHOW_PLAYER_HIGHLIGHT) {
    scanPlayerRoom();
  }
  else {
    clearTimeout(timeouts.scanPlayerRoom);
    clearOverlay(OVERLAYS.player);
  }
});


document.getElementById("highlightCorridors").addEventListener("change", e => {
  SHOW_CORRIDOR_HIGHLIGHT = e.target.checked;
  if (SHOW_CORRIDOR_HIGHLIGHT) {
    highlightCorridors();
  }
  else {
    clearTimeout(timeouts.highlightCorridors);
    clearOverlay(OVERLAYS.corridors);
  }
});


window.addEventListener('beforeunload', () => {
  clearAllOverlays();
});
